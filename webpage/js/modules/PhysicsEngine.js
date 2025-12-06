import { state } from './StateManager.js';
import { updateLinesForNote } from './AssociationManager.js';
import { getBoundaries, svgContainer } from './CanvasManager.js';
import { isDragging, selectedElement } from './InputHandler.js';

let gyroEnabled = false;
let gravity = { x: 0, y: 0 };
let physicsInterval = null;
export const gyroToggle = $('#gyro-toggle');


export function enableGyro(svgContainer) {
    // 1. Basic API Check
    if (!window.DeviceOrientationEvent) {
        alert("This device does not support Gravity Mode (No Gyroscope detected).");
        gyroToggle.prop('checked', false);
        return;
    }

    // 2. iOS 13+ Check (Requires Permission)
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(response => {
                if (response === 'granted') {
                    startPhysics(svgContainer);
                } else {
                    alert("Permission denied. Gravity mode won't work.");
                    gyroToggle.prop('checked', false);
                }
            })
            .catch(console.error);
    } else {
        // 3. Android/Desktop Check (Verify hardware exists)
        detectSensorAndStart(svgContainer);
    }
}

function physicsLoop(svgContainer) {
    if (!gyroEnabled) return;

    if ((Math.abs(gravity.x) > 0.1 || Math.abs(gravity.y) > 0.1) && 
        state.currentSelection && 
        state.currentSelection.type === 'class') {

        const fo = document.getElementById(state.currentSelection.id);
        
        // Safety check: Element exists AND we are not currently drag-dropping it
        if (fo && !(selectedElement && selectedElement.id === fo.id && isDragging)) {
            
            const bounds = getBoundaries(svgContainer);
            let x = parseFloat(fo.getAttribute('x'));
            let y = parseFloat(fo.getAttribute('y'));
            const w = parseFloat(fo.getAttribute('width'));
            const h = parseFloat(fo.getAttribute('height'));

            x += gravity.x;
            y += gravity.y;

            if (x + w > bounds.right) x = bounds.right - w;
            if (x < 0) x = 0;
            if (y + h > bounds.bottom) y = bounds.bottom - h;
            if (y < 0) y = 0;

            fo.setAttribute('x', x);
            fo.setAttribute('y', y);
            updateLinesForNote(fo.id);
        }
    }

    physicsInterval = requestAnimationFrame(physicsLoop(svgContainer));
}
export function detectSensorAndStart(svgContainer) {
    let sensorDetected = false;

    function tempHandler(e) {
        // If we receive valid numbers (not null), we have a sensor
        if (e.gamma !== null || e.beta !== null) {
            sensorDetected = true;
            window.removeEventListener('deviceorientation', tempHandler);
            startPhysics(svgContainer);
        }
    }

    // Listen for the first event
    window.addEventListener('deviceorientation', tempHandler);

    // Timeout: If no valid event comes in 1 second, assume no sensor (e.g. Desktop)
    setTimeout(() => {
        if (!sensorDetected) {
            window.removeEventListener('deviceorientation', tempHandler);
            alert("No Gyroscope detected on this device.");
            gyroToggle.prop('checked', false);
        }
    }, 1000);
}

export function startPhysics(svgContainer) {
    gyroEnabled = true;
    window.addEventListener('deviceorientation', handleOrientation);
    physicsInterval = requestAnimationFrame(physicsLoop(svgContainer));
}

export function disableGyro() {
    gyroEnabled = false;
    window.removeEventListener('deviceorientation', handleOrientation);
    if (physicsInterval) cancelAnimationFrame(physicsInterval);
    gravity = { x: 0, y: 0 };
}