
// 1. IMPORTS: We need tools from other parts of the app
import { state, selectItem, clearGlobalSelection } from './StateManager.js';
import { svgContainer, classLayer, linesLayer, getPointerPosition, getBoundaries } from './CanvasManager.js';
import { createConnection, updateLinesForNote} from './AssociationManager.js';

// Local variables for drag logic
export let isDragging = false;
let startMousePos = { x: 0, y: 0 };
let offset = { x: 0, y: 0 };
export let selectedElement = null; // The DOM element currently being acted upon

/**
 * Initializes unified event listeners for mouse and touch events
 * @param {HTMLElement} svgContainer - The SVG container element
 * @param {HTMLElement} classLayer - The SVG group element containing all Class elements
 * @param {HTMLElement} linesLayer - The SVG group element containing all Association lines
 */
export function initInputHandlers(svgContainer, classLayer, linesLayer) {

    // Attach Unified Listeners
    svgContainer.addEventListener('mousedown', (x => handleStart(x, svgContainer, linesLayer)));
    svgContainer.addEventListener('touchstart', (x => handleStart(x, svgContainer, linesLayer)), { passive: false });
    svgContainer.addEventListener('mousemove', (x => handleMove(x, svgContainer, classLayer)));
    svgContainer.addEventListener('touchmove', (x => handleMove(x, svgContainer, classLayer)), { passive: false });
    svgContainer.addEventListener('mouseup', handleEnd);
    svgContainer.addEventListener('mouseleave', handleEnd);
    svgContainer.addEventListener('touchend', handleEnd);
    svgContainer.addEventListener('touchcancel', handleEnd);

   // Association Click
    svgContainer.addEventListener('click', handleAssociationClick);

    // Attribute Click (Using jQuery for delegation if you want, or vanilla JS)
    // We can use vanilla delegation on the container
    svgContainer.addEventListener('click', (e) => {
        if(e.target.classList.contains('attribute-item')) {
            e.stopPropagation();
            selectItem('attr', null, e.target);
        }
    });
}

/**
 * Handles the start of a drag event (mousedown/touchstart)
 * @param {Event} evt - The event object
 * @param {HTMLElement} svgContainer - The SVG container element
 * @param {HTMLElement} linesLayer - The SVG group element containing all Association lines
 * @returns {void}
 * @description
 * This function starts the dragging process and handles the connection mode logic.
 * If the user is currently in connection mode, it will create a connection between the two clicked elements.
 * If not in connection mode, it will start the dragging process.
 */
export function handleStart(evt, svgContainer, linesLayer) {
    // 1. Ignore inputs (allow editing text)
    if (evt.target.tagName.toLowerCase() === 'input') return;

    // 2. Background Click (Deselect)
    if (evt.target === svgContainer || evt.target === linesLayer || evt.target === classLayer) {
        clearGlobalSelection();
        return;
    }

    // 3. Check for Drag Handle
    const dragHandle = evt.target.closest('.drag-handle');
    
    if (dragHandle) {
        const classElement = dragHandle.closest('foreignObject');
        
        // A. Connection Mode Logic
        if (evt.shiftKey || state.connectionMode) {
            if(evt.type === 'touchstart') evt.preventDefault(); // Stop zoom/scroll
            
            if (!state.linkSelection) {
                // First click
                state.linkSelection = classElement;
                classElement.classList.add('selected-for-link');
            } else {
                // Second click
                if (state.linkSelection !== classElement) {
                    createConnection(state.linkSelection.id, classElement.id, svgContainer, linesLayer);
                    
                    // If we want to auto-turn off mode:
                    // state.connectionMode = false; 
                    // update UI button state here if needed
                }
                // Cleanup
                state.linkSelection.classList.remove('selected-for-link');
                state.linkSelection = null;
            }
            return; // Stop here, do not drag
        }

        // B. Start Dragging
        selectedElement = classElement;
        isDragging = false; 
        
        const pos = getPointerPosition(evt, svgContainer);
        startMousePos = { x: pos.rawX, y: pos.rawY };
        
        // Calculate offset so box doesn't jump to mouse center
        offset.x = pos.x - parseFloat(selectedElement.getAttribute('x'));
        offset.y = pos.y - parseFloat(selectedElement.getAttribute('y'));
    }
}

/**
 * Handles the user dragging a class box around the canvas.
 * @param {Event} evt - The event that triggered the function.
 * @param {SVGElement} svgContainer - The SVG container element.
 * @param {SVGElement} classLayer - The SVG layer that contains the class boxes.
 * 
 * This function first checks if the user is dragging a class box.
 * If so, it prevents mobile scrolling and checks if the user has moved the box by at least 5px.
 * If they have, it brings the box to the front of the layer and updates the box's position.
 * It then clamps the box's position to within the bounds of the canvas.
 * Finally, it updates the lines that connect the class box to its attributes.
 */
export function handleMove(evt, svgContainer, classLayer) {
    if (selectedElement) {
        // Stop mobile scrolling
        evt.preventDefault(); 
        
        const pos = getPointerPosition(evt, svgContainer);

        // Threshold Check (Wait for 5px movement)
        if (!isDragging) {
            const dx = Math.abs(pos.rawX - startMousePos.x);
            const dy = Math.abs(pos.rawY - startMousePos.y);
            if (dx < 5 && dy < 5) return;
            isDragging = true;
            // Bring to front
            classLayer.appendChild(selectedElement); 
        }

        // Calculate new X/Y
        let newX = pos.x - offset.x;
        let newY = pos.y - offset.y;
        
        // Get Boundaries from CanvasManager
        const bounds = getBoundaries(svgContainer);
        const boxW = parseFloat(selectedElement.getAttribute('width'));
        const boxH = parseFloat(selectedElement.getAttribute('height'));

        // Clamp logic
        if (newX < 0) newX = 0;
        if (newX + boxW > bounds.right) newX = bounds.right - boxW;
        if (newY < 0) newY = 0;
        if (newY + boxH > bounds.bottom) newY = bounds.bottom - boxH;

        // Apply
        selectedElement.setAttribute('x', newX);
        selectedElement.setAttribute('y', newY);
        
        // Update Lines
        updateLinesForNote(selectedElement.id);
    }
}

/**
 * Handles the user releasing the mouse button after a drag or click.
 * If the user didn't actually drag the box, it treats it as a Selection.
 * Resets the input handler state variables.
 * @param {Event} evt - The event that triggered the function.
 */
export function handleEnd(evt) {
    // If we clicked (MouseUp) but didn't actually drag, treat it as a Selection
    if (selectedElement && !isDragging) {
        selectItem('class', selectedElement.id, selectedElement);
    }
    
    // Reset
    selectedElement = null;
    isDragging = false;
}

/**
 * Handles a click event on an Association group element.
 * If the group element is found, it will find the corresponding association object
 * in the state and select it.
 * @param {Event} evt - The event object that triggered the function
 * @returns {void}
 * @description
 * This function finds the Association object in the state and selects it.
 * It stops event propagation to prevent further actions.
 */
export function handleAssociationClick(evt) {
    const group = evt.target.closest('g.association-group');
    if (group) {
        // We need to find the association object. 
        // Since we don't have direct access to the array here, 
        // we might need to export a finder function from AssociationManager
        // or iterate state.associations
        
        const assoc = state.associations.find(a => a.groupElem === group);
        if (assoc) {
            selectItem('assoc', assoc.id, group, assoc); 
            evt.stopPropagation();
        }
    }
}