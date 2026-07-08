#include <windows.h>

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow) {
    // Hide console
    HWND consoleWnd = GetConsoleWindow();
    if (consoleWnd) ShowWindow(consoleWnd, SW_HIDE);
    
    // Load and start the DLL
    HMODULE hDll = LoadLibraryA("test_dll.dll");
    if (hDll) {
        void (*startHook)() = (void(*)())GetProcAddress(hDll, "StartHook");
        if (startHook) {
            startHook();  // This blocks
        }
        FreeLibrary(hDll);
    }
    return 0;
}
