#!/bin/bash
echo 'SUBSYSTEM=="usb", ATTR{idVendor}=="3564", MODE="0666"' | sudo tee /etc/udev/rules.d/50-obsbot.rules
sudo udevadm control --reload-rules
sudo udevadm trigger
echo "Udev rules for OBSBOT camera have been set up."
