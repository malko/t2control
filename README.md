# OBSBOT T2 Control

> ⚠️ This project won't be maintained anymore as it is now replaced with another one using the sdk provided by obsbot and will offer more control for your camera. It is a complete rewrite from scracth so you should take a look at [OBSNIX](https://github.com/malko/obsnix-gui) instead ! 

A desktop application for controlling OBSBOT cameras (Tiny SE, Tiny 2, etc.) AI tracking modes via USB. Built with Electron and Node.js.

![OBSBOT T2 Control Interface](screenshot.png)

## Features

- **AI Mode Control**: Switch between different AI tracking modes:
  - Stop AI
  - Normal tracking
  - Upper body focus
  - Close up
  - Headless mode
  - Lower body focus
  - Desk mode
  - Whiteboard mode
  - Hand tracking
  - Group mode

- **Live Video Preview**: Real-time camera feed with automatic reconnection
- **Seamless Operation**: Visual overlay during mode changes with last frame preservation
- **Multi-Camera Support**: Automatic detection of OBSBOT cameras with dynamic PID resolution
- **Persistent Settings**: Remembers window size, position, and selected camera
- **Device Diagnostics**: Built-in USB device scanner for troubleshooting

## Supported Cameras

- OBSBOT Tiny SE
- OBSBOT Tiny 2
- Other OBSBOT cameras using the same USB control protocol

## Requirements

- **Operating System**: Linux (tested on Ubuntu/Debian)
- **Node.js**: Version 16 or higher
- **USB Access**: Proper permissions to access USB devices

## Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd t2control
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up USB permissions** (Linux only):
   ```bash
   sudo ./setup_udev.sh
   ```
   This script creates udev rules that allow non-root access to OBSBOT USB devices.

4. **Start the application**:
   ```bash
   npm start
   ```

## USB Permissions Setup

The `setup_udev.sh` script is crucial for proper operation on Linux systems. It:

- Creates a udev rule for OBSBOT devices (Vendor ID: 3564)
- Allows users in the `plugdev` group to access OBSBOT cameras
- Automatically reloads udev rules and triggers device detection

**What the script does:**
```bash
# Creates /etc/udev/rules.d/99-obsbot.rules with:
SUBSYSTEM=="usb", ATTRS{idVendor}=="3564", MODE="0666", GROUP="plugdev"

# Reloads udev rules and triggers device events
sudo udevadm control --reload-rules
sudo udevadm trigger
```

**Manual setup** (if script doesn't work):
```bash
echo 'SUBSYSTEM=="usb", ATTRS{idVendor}=="3564", MODE="0666", GROUP="plugdev"' | sudo tee /etc/udev/rules.d/99-obsbot.rules
sudo udevadm control --reload-rules
sudo udevadm trigger
```

## Usage

1. **Connect your OBSBOT camera** via USB
2. **Launch the application**
3. **Select your camera** from the dropdown (only OBSBOT cameras will be listed)
4. **Click "Display Video"** to start the camera feed
5. **Use AI Control buttons** to change tracking modes

### Interface Overview

- **Video Section**: Live camera preview with device selection and controls
- **AI Control**: Grid of buttons for different tracking modes
- **Device Diagnostics**: Collapsible section for USB device troubleshooting

### Notes

- The video stream will briefly pause when changing AI modes (this is normal)
- The last frame is preserved during mode changes for visual continuity
- Use the refresh button (🔄) if you connect a camera after launching the app

## Troubleshooting

### Camera Not Detected

1. **Check USB connection**: Ensure the camera is properly connected
2. **Verify permissions**: Run the setup_udev.sh script
3. **Check device recognition**:
   ```bash
   lsusb | grep 3564
   ```
4. **Use diagnostics**: Open "Device Diagnostics" in the app and click "Scan OBSBOT Devices"

### Commands Not Working

- **Check logs**: Open Developer Tools (Ctrl+Shift+I) and look for errors
- **Verify camera model**: Some older models may not support all commands
- **Try different interface**: Use the diagnostic scanner to check USB interfaces

### Permission Errors

If you see `LIBUSB_ERROR_ACCESS`, the USB permissions are not set correctly:
```bash
sudo ./setup_udev.sh
# Disconnect and reconnect the camera
```

## Development

### Project Structure

