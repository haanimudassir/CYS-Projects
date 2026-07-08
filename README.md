# FMA Project: Behavioural Analysis of a Keylogger

## Project Overview

This project implements a Windows keylogger for **educational analysis purposes** as part of a Fundamentals of Malware Analysis course. It is designed to be studied in an **isolated virtual machine environment** to understand how real-world keyloggers operate.

## Project Components

| Component | File | Description |
|-----------|------|-------------|
| **Hook DLL** | `src/keylogger_dll.cpp` | Core keystroke capture via `SetWindowsHookEx` with `WH_KEYBOARD_LL` |
| **Loader** | `src/keylogger_loader.cpp` | Installation, persistence (Registry + Startup + Task), evasion, DLL loading |
| **Propagator** | `src/usb_propagator.cpp` | USB drive monitoring + autorun.inf propagation |

## Key Techniques Implemented

### ✅ Malware Payload
- `SetWindowsHookEx(WH_KEYBOARD_LL)` — global low-level keyboard hook
- `ToAsciiEx` — accurate virtual key code to character conversion
- `GetForegroundWindow` — context-aware window title logging
- Timestamped log entries with active window tracking

### ✅ Evasion Techniques
- **Anti-debugging**: `IsDebuggerPresent()`, PEB `BeingDebugged` flag check
- **Sandbox detection**: Screen resolution, RAM size, uptime checks
- **Process blacklist**: Scans for `procmon`, `wireshark`, `ida`, `x64dbg`, etc.
- **String obfuscation**: XOR-encoded strings to evade static analysis
- **Console hiding**: `-mwindows` linker flag + `ShowWindow(SW_HIDE)`
- **Timed execution**: Random 30-90 second startup delay
- **Hidden installation**: Files stored in `%APPDATA%\Microsoft\Windows\TaskBars\`
- **Process masquerading**: Binary named `sihost.exe` (mimics legitimate Windows process)

### ✅ Persistence (Triple Redundancy)
1. **Registry Run Key**: `HKCU\...\Run` → "WindowsUpdateHelper"
2. **Startup Folder**: `%APPDATA%\...\Startup\WindowsExplorer.lnk`
3. **Scheduled Task**: "MicrosoftEdgeUpdate" — runs at user logon

### ✅ Propagation
- USB drive monitoring thread (3-second polling interval)
- Copies payload + DLL to removable drives
- Creates `autorun.inf` for auto-execution
- Uses randomized payload names ("USB_Driver_Installer.exe", etc.)
- All files hidden with system + hidden attributes

## Build Instructions (Kali Linux)

### Prerequisites
```bash
sudo apt update
sudo apt install -y mingw-w64 g++-mingw-w64-x86-64-posix wine
