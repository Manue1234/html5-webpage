import { svgNS, linesLayer, svgContainer } from './CanvasManager.js';
import { state } from './StateManager.js';

export const assocBtn = $('#association-spawner');

/**
 * Creates a visual connection between two notes.
 * If the connection already exists, it does nothing.
 * If the two notes are the same, it does nothing.
 * If successful it adds the connection to the state and draws it on the linesLayer and disables connection mode.
 * @param {string} noteId1 - The ID of the first note
 * @param {string} noteId2 - The ID of the second note
 * @param {SVGElement} linesLayer - The layer where the connection should be drawn
 */
export function createConnection(noteId1, noteId2, svgContainer, linesLayer) {
    // Prevent self-association and duplication for simplicity of the model
    if (noteId1 === noteId2) return;
    const exists = state.associations.some(c => (c.from === noteId1 && c.to === noteId2) || (c.from === noteId2 && c.to === noteId1));
    if (exists) return;

    // Set a unique ID for extensibility
    const id = 'conn_' + Date.now();
    const group = document.createElementNS(svgNS, "g");
    group.classList.add('association-group');
    group.style.cursor = 'pointer';
    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("stroke", "#333");
    line.setAttribute("stroke-width", "1.5");
    const textBg = document.createElementNS(svgNS, "rect");
    textBg.setAttribute("fill", "white");
    textBg.setAttribute("rx", "2");
    const text = document.createElementNS(svgNS, "text");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("alignment-baseline", "middle");
    text.setAttribute("font-size", "11");
    text.setAttribute("fill", "#333");
    text.textContent = "associates";
    text.classList.add('assoc-text');

    group.appendChild(line);
    group.appendChild(textBg);
    group.appendChild(text);
    linesLayer.appendChild(group);
    state.associations.push({ id, from: noteId1, to: noteId2, lineElem: line, textElem: text, bgElem: textBg, groupElem: group });
    updateLinesForNote(noteId1);
    disableConnectionMode(svgContainer);
}


/**
 * Updates the position of all connections related to the given noteId.
 * This function is called when a note is moved or when a new connection is created.
 * It updates the positions of the connection lines and the text backgrounds by
 * calculating the midpoint of the connection and the bounding box of the text.
 * @param {string} noteId - The ID of the note whose connections should be updated
 */
export function updateLinesForNote(noteId) {
    const relatedConnections = state.associations.filter(c => c.from === noteId || c.to === noteId);
    relatedConnections.forEach(conn => {
        const fromEl = document.getElementById(conn.from);
        const toEl = document.getElementById(conn.to);
        if (!fromEl || !toEl) return;
        const start = getCenter(fromEl), end = getCenter(toEl);
        conn.lineElem.setAttribute("x1", start.x);
        conn.lineElem.setAttribute("y1", start.y);
        conn.lineElem.setAttribute("x2", end.x);
        conn.lineElem.setAttribute("y2", end.y);
        const midX = (start.x + end.x) / 2, midY = (start.y + end.y) / 2;
        conn.textElem.setAttribute("x", midX);
        conn.textElem.setAttribute("y", midY);
        const bbox = conn.textElem.getBBox();
        conn.bgElem.setAttribute("x", bbox.x - 2);
        conn.bgElem.setAttribute("y", bbox.y - 1);
        conn.bgElem.setAttribute("width", bbox.width + 4);
        conn.bgElem.setAttribute("height", bbox.height + 2);
    });
}

/**
 * Returns the center coordinates of the given element.
 * @param {Element} el - The element for which the center coordinates should be calculated
 * @returns {Object} - An object with x and y properties, representing the center coordinates of the element
 */
function getCenter(el) {
    const x = parseFloat(el.getAttribute('x')), y = parseFloat(el.getAttribute('y'));
    const w = parseFloat(el.getAttribute('width')), h = parseFloat(el.getAttribute('height'));
    return { x: x + (w / 2), y: y + (h / 2) };
}

/**
 * Disables connection mode and resets the state.
 * This function is called when the user clicks on the association button again
 * or when the user clicks on a note while connection mode is active.
 * It resets the state by removing the active-mode class from the association button,
 * removing the crosshair cursor from the SVG container and resetting the link selection.
 */
export function disableConnectionMode(svgContainer) {
    state.connectionMode = false;
    assocBtn.removeClass('btn-active-mode');
    svgContainer.classList.remove('cursor-crosshair');
    if (state.linkSelection) {
        state.linkSelection.classList.remove('selected-for-link');
        state.linkSelection = null;
    }
}