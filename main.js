const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const usb = require('usb');

const VID = 0x3564;

const aiModes = {
  stop: Buffer.from('16020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', 'hex'),
  normal: Buffer.from('16020200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', 'hex'),
  upperbody: Buffer.from('16020201000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', 'hex'),
  closeup: Buffer.from('16020202000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', 'hex'),
  headless: Buffer.from('16020203000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', 'hex'),
  lowerbody: Buffer.from('16020204000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', 'hex'),
  desk: Buffer.from('16020500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', 'hex'),
  whiteboard: Buffer.from('16020400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', 'hex'),
  hand: Buffer.from('16020300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', 'hex'),
  group: Buffer.from('16020100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', 'hex'),
};

function createWindow () {
  // Load saved window bounds or use defaults
  const savedBounds = global.sharedObject?.windowBounds || { width: 1200, height: 800 };

  const win = new BrowserWindow({
    width: savedBounds.width,
    height: savedBounds.height,
    x: savedBounds.x,
    y: savedBounds.y,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Save window bounds when they change
  win.on('resize', () => {
    saveWindowBounds(win);
  });

  win.on('move', () => {
    saveWindowBounds(win);
  });

  win.loadFile('index.html');

  return win;
}

function saveWindowBounds(win) {
  if (!global.sharedObject) {
    global.sharedObject = {};
  }
  global.sharedObject.windowBounds = win.getBounds();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.on('list-devices', (event) => {
  const devices = usb.getDeviceList();
  const deviceList = devices.map(d => {
    try {
      return {
        vendorId: d.deviceDescriptor.idVendor,
        productId: d.deviceDescriptor.idProduct,
        manufacturer: d.manufacturer,
        product: d.product,
      };
    } catch (e) {
      // Ignore devices that can't be read
      return null;
    }
  }).filter(d => d);
  console.log(deviceList);
  event.reply('device-list', deviceList);
});

ipcMain.on('scan-obsbot-devices', (event) => {
  const devices = usb.getDeviceList();
  const obsbotDevices = devices.filter(d => d.deviceDescriptor.idVendor === VID);

  const deviceInfo = obsbotDevices.map(device => {
    const pid = device.deviceDescriptor.idProduct;
    const info = {
      pid: `0x${pid.toString(16)}`,
      deviceClass: device.deviceDescriptor.bDeviceClass,
      deviceSubClass: device.deviceDescriptor.bDeviceSubClass,
      deviceProtocol: device.deviceDescriptor.bDeviceProtocol,
      interfaces: [],
      endpoints: [],
      canOpen: false
    };

    try {
      device.open();
      info.canOpen = true;
      info.interfaces = device.interfaces.map(iface => {
        const ifaceInfo = {
          number: iface.interfaceNumber,
          class: iface.descriptor.bInterfaceClass,
          subclass: iface.descriptor.bInterfaceSubClass,
          protocol: iface.descriptor.bInterfaceProtocol,
          canClaim: false,
          kernelDriverActive: false,
          endpoints: []
        };

        // Get endpoint information
        if (iface.endpoints) {
          ifaceInfo.endpoints = iface.endpoints.map(ep => ({
            address: ep.address,
            direction: ep.direction,
            transferType: ep.transferType,
            maxPacketSize: ep.maxPacketSize
          }));
        }

        try {
          ifaceInfo.kernelDriverActive = iface.isKernelDriverActive();
          iface.claim();
          ifaceInfo.canClaim = true;
          iface.release(true);
        } catch (e) {
          // Can't claim this interface
        }

        return ifaceInfo;
      });

      device.close();
    } catch (e) {
      console.error('Error scanning device:', e);
    }

    return info;
  });

  console.log('Detailed OBSBOT Device Scan:', JSON.stringify(deviceInfo, null, 2));
  event.reply('obsbot-scan-results', deviceInfo);
});

// Remove the get-obsbot-pid-from-device-id handler since we no longer need it

ipcMain.on('set-ai-mode', (event, data) => {
  const { mode, deviceId, pid } = data;

  if (!pid) {
    console.error('No PID provided for selected camera');
    event.reply('ai-mode-complete', { mode, success: false, error: 'No PID provided' });
    return;
  }

  const device = usb.findByIds(VID, pid);
  if (!device) {
    console.error('OBSBOT device not found with PID:', `0x${pid.toString(16)}`);
    event.reply('ai-mode-complete', { mode, success: false, error: 'Device not found' });
    return;
  }

  try {
    device.open();
    device.setAutoDetachKernelDriver(true);

    const iface = device.interfaces[0];
    iface.claim();

    device.controlTransfer(0x21, 0x01, 0x0600, 0x0200, aiModes[mode], (error) => {
      if (error) {
        console.error('Control transfer error:', error);
      } else {
        console.log(`Successfully sent ${mode} command to device PID: 0x${pid.toString(16)}`);
      }

      // Add stability delay
      setTimeout(() => {
        iface.release(true, (err) => {
          if (err) {
            console.error('Interface release error:', err);
          }
          device.close();
          // Notify renderer that command is complete
          event.reply('ai-mode-complete', { mode, success: !error });
        });
      }, 1000);
    });
  } catch (e) {
    console.error('Error setting AI mode:', e);
    try {
      device.close();
    } catch (closeError) {
      // Ignore
    }
    event.reply('ai-mode-complete', { mode, success: false, error: e.message });
  }
});