import { state } from './StateManager.js';
import { updateLinesForNote } from './AssociationManager.js';
import { getBoundaries, svgContainer } from './CanvasManager.js';
import { isDragging, selectedElement } from './InputHandler.js';

let gyroEnabled = false;
let gravity = { x: 0, y: 0 };
let physicsInterval = null;
export const gyroToggle = $('#gyro-toggle');


/**
 * Enables Gravity Mode if the device supports it.
 * If the device does not support Gravity Mode (e.g. no Gyroscope detected),
 * it will alert the user and disable the toggle button.
 * If the device supports Gravity Mode but requires permission (e.g. iOS 13+),
 * it will request permission and enable Gravity Mode if permission is granted.
 * If the device supports Gravity Mode and does not require permission (e.g. Android),
 * it will enable Gravity Mode immediately.
 * @param {SVGSVGElement} svgContainer - The SVG container element to be
 *   affected by Gravity Mode.
 */
export function enableGyro(svgContainer) {
    if (!window.DeviceOrientationEvent) {
        alert("This device does not support Gravity Mode (No Gyroscope detected).");
        gyroToggle.prop('checked', false);
        return;
    }

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
        detectSensorAndStart(svgContainer);
    }
}

/**
 * Main loop for Gravity Mode.
 * Updates the position of the currently selected class note based on the
 *   current gravity values and the bounds of the SVG container.
 * If the currently selected note is not a class note, does nothing.
 * If the device does not support Gravity Mode or permission is denied,
 * does nothing.
 * @param {SVGSVGElement} svgContainer - The SVG container element to be
 *   affected by Gravity Mode.
 */
function physicsLoop(svgContainer) {
    if (!gyroEnabled) return;

    if ((Math.abs(gravity.x) > 0.1 || Math.abs(gravity.y) > 0.1) && 
        state.currentSelection && 
        state.currentSelection.type === 'class') {

        const fo = document.getElementById(state.currentSelection.id);
        
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

    physicsInterval = requestAnimationFrame(_ => physicsLoop(svgContainer));
}

/**
 * Detects whether the device has a Gyroscope sensor and enables Gravity Mode
 * if it does. If the device does not have a Gyroscope sensor, it will
 * alert the user and disable the toggle button.
 * @param {SVGSVGElement} svgContainer - The SVG container element to be
 *   affected by Gravity Mode.
 */
export function detectSensorAndStart(svgContainer) {
    let sensorDetected = false;

    function tempHandler(e) {
        if (e.gamma !== null || e.beta !== null) {
            sensorDetected = true;
            window.removeEventListener('deviceorientation', tempHandler);
            startPhysics(svgContainer);
        }
    }

    window.addEventListener('deviceorientation', tempHandler);

    setTimeout(() => {
        if (!sensorDetected) {
            window.removeEventListener('deviceorientation', tempHandler);
            alert("No Gyroscope detected on this device.");
            gyroToggle.prop('checked', false);
        }
    }, 1000);
}

/**
 * Enables Gravity Mode by adding an event listener to the 'deviceorientation' event
 * and starting the main physics loop.
 * @param {SVGSVGElement} svgContainer - The SVG container element to be affected by Gravity Mode.
 */
export function startPhysics(svgContainer) {
    gyroEnabled = true;
    window.addEventListener('deviceorientation', handleOrientation);
    physicsInterval = requestAnimationFrame(physicsLoop(svgContainer));
}

/**
 * Disables Gravity Mode by removing the event listener from the 'deviceorientation' event
 * and stopping the main physics loop. Also resets the gravity vector to zero.
 */
export function disableGyro() {
    gyroEnabled = false;
    window.removeEventListener('deviceorientation', handleOrientation);
    if (physicsInterval) cancelAnimationFrame(physicsInterval);
    gravity = { x: 0, y: 0 };
}

/**
 * Handles the 'deviceorientation' event and updates the gravity vector accordingly.
 * It also contains a deadzone (5 degrees) to prevent small movements from affecting the note.
 * The gravity values are also multiplied by a speed factor (0.15) to control the speed of the note.
 * @param {Object} event - The 'deviceorientation' event object containing the gamma and beta values.
 */
function handleOrientation(event) {
    let x = event.gamma; 
    let y = event.beta;
    
    if (x === null || y === null) return;

    if (Math.abs(x) < 5) x = 0;
    if (Math.abs(y) < 5) y = 0;

    gravity.x = x * 0.15;
    gravity.y = y * 0.15;
}