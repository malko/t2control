const controls = document.getElementById('controls');
const videoOverlay = document.getElementById('video-overlay');
const lastFrameCanvas = document.getElementById('last-frame-canvas');

let cameraDevices = []; // Store camera device information
let devicePidMapping = new Map(); // Store device ID to PID mapping

controls.addEventListener('click', (event) => {
    if (event.target.tagName === 'BUTTON') {
        const mode = event.target.id;
        const selectedDeviceId = videoSourceSelect.value;

        if (!selectedDeviceId) {
            console.error('No camera selected');
            return;
        }

        // Get the PID for the selected device
        const pid = devicePidMapping.get(selectedDeviceId);
        if (!pid) {
            console.error('No PID found for selected device');
            return;
        }

        // Capture last frame before sending command
        captureLastFrame();
        // Show overlay before sending command
        showApplyingOverlay();
        window.electronAPI.setAiMode(mode, selectedDeviceId, pid);
    }
});

function captureLastFrame() {
    if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
        const canvas = lastFrameCanvas;
        const ctx = canvas.getContext('2d');

        // Set canvas dimensions to match video
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;

        // Draw current video frame to canvas
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

        // Show the canvas
        canvas.classList.remove('hidden');
    }
}

function showApplyingOverlay() {
    videoOverlay.classList.remove('hidden');
}

function hideApplyingOverlay() {
    videoOverlay.classList.add('hidden');
    // Hide the last frame canvas when overlay is hidden
    lastFrameCanvas.classList.add('hidden');
}

// Automatically restart video after AI mode command
window.electronAPI.onAiModeComplete((result) => {
    console.log(`AI mode command completed:`, result);
    if (result.success) {
        // Wait a moment for the device to stabilize, then restart video
        setTimeout(() => {
            if (localStorage.getItem('videoActive') === 'true') {
                console.log('Auto-restarting video after AI mode change...');
                startVideo(); // Use regular startVideo since we're showing the captured frame
            }
            // Hide overlay after video restart
            setTimeout(() => {
                hideApplyingOverlay();
            }, 500); // Small delay to ensure video is stable
        }, 1500); // 1.5 second delay to allow device to fully recover
    } else {
        // Hide overlay immediately if command failed
        hideApplyingOverlay();
    }
});

// Add scan devices functionality
const scanDevicesButton = document.getElementById('scan-devices');
const scanResultsDiv = document.getElementById('scan-results');

scanDevicesButton.addEventListener('click', () => {
    scanResultsDiv.innerHTML = 'Scanning OBSBOT devices...';
    window.electronAPI.scanObsbotDevices();
});

window.electronAPI.onObsbotScanResults((deviceInfo) => {
    scanResultsDiv.innerHTML = '<pre>' + JSON.stringify(deviceInfo, null, 2) + '</pre>';
});

const videoElement = document.getElementById('video');
const videoSourceSelect = document.getElementById('video-source');
const startVideoButton = document.getElementById('start-video');
const stopVideoButton = document.getElementById('stop-video');
const refreshCamerasButton = document.getElementById('refresh-cameras');

let currentStream;

function stopVideo() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }
    videoElement.srcObject = null;
    localStorage.setItem('videoActive', 'false');
}

function startVideoSilently() {
    // This version doesn't immediately stop the current stream
    // allowing the overlay to show the last frame
    const videoSource = videoSourceSelect.value;
    if (!videoSource) return;

    const constraints = {
        video: { deviceId: { exact: videoSource } }
    };

    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            // Only stop the old stream after the new one is ready
            if (currentStream) {
                currentStream.getTracks().forEach(track => track.stop());
            }
            videoElement.srcObject = stream;
            currentStream = stream;
            localStorage.setItem('videoActive', 'true');
            localStorage.setItem('selectedVideoDevice', videoSource);
        })
        .catch(error => {
            console.error('Error accessing media devices.', error);
            // Hide overlay if video start fails
            hideApplyingOverlay();
        });
}

function startVideo() {
    stopVideo(); // Stop any existing stream first
    const videoSource = videoSourceSelect.value;
    if (!videoSource) return;

    const constraints = {
        video: { deviceId: { exact: videoSource } }
    };

    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            videoElement.srcObject = stream;
            currentStream = stream;
            localStorage.setItem('videoActive', 'true');
            localStorage.setItem('selectedVideoDevice', videoSource);
        })
        .catch(error => {
            console.error('Error accessing media devices.', error);
            // Hide overlay if video start fails
            hideApplyingOverlay();
        });
}

async function getConnectedDevices(type) {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === type);
}

async function refreshCameraList() {
    const videoSources = await getConnectedDevices('videoinput');
    const savedDeviceId = localStorage.getItem('selectedVideoDevice');

    // Filter for OBSBOT cameras only
    const obsbotCameras = videoSources.filter(source =>
        source.label.toLowerCase().includes('obsbot') ||
        source.label.toLowerCase().includes('3564')
    );

    // Store camera devices for later reference
    cameraDevices = obsbotCameras;
    devicePidMapping.clear();

    videoSourceSelect.innerHTML = '';

    if (obsbotCameras.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.text = 'No OBSBOT cameras found';
        option.disabled = true;
        videoSourceSelect.appendChild(option);
        startVideoButton.disabled = true;
    } else {
        startVideoButton.disabled = false;
        obsbotCameras.forEach((source, index) => {
            const option = document.createElement('option');
            option.value = source.deviceId;

            // Extract PID from device label (format: "OBSBOT Tiny SE StreamCamera (3564:feff)")
            const pidMatch = source.label.match(/\(3564:([a-f0-9]+)\)/i);
            if (pidMatch) {
                const pid = parseInt(pidMatch[1], 16);
                devicePidMapping.set(source.deviceId, pid);
                option.text = source.label;
            } else {
                option.text = source.label || `OBSBOT Camera ${index + 1}`;
            }

            videoSourceSelect.appendChild(option);
        });

        if (savedDeviceId && obsbotCameras.find(cam => cam.deviceId === savedDeviceId)) {
            videoSourceSelect.value = savedDeviceId;
        }
    }
}

async function initialize() {
    await refreshCameraList();

    videoSourceSelect.addEventListener('change', () => {
        localStorage.setItem('selectedVideoDevice', videoSourceSelect.value);
        // If video is already playing, switch to the new camera
        if (localStorage.getItem('videoActive') === 'true') {
            startVideo();
        }
    });

    startVideoButton.addEventListener('click', startVideo);
    stopVideoButton.addEventListener('click', stopVideo);
    refreshCamerasButton.addEventListener('click', refreshCameraList);

    if (localStorage.getItem('videoActive') === 'true' && videoSourceSelect.value) {
        startVideo();
    }
}

initialize();
initialize();
