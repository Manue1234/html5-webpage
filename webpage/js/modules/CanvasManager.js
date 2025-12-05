export const svgNS = 'http://www.w3.org/2000/svg';
export let svgContainer;
export let linesLayer;
export let classLayer;

/**
 * Initializes the SVG canvas and creates the necessary layers.
 *
 * @returns {Object} An object containing the svg container, lines layer, and class layer.
 */
export function initCanvas() {
    const svgContainer = document.createElementNS(svgNS, 'svg');
    svgContainer.id = 'svg-container';
    svgContainer.setAttribute('width', '100%');
    svgContainer.setAttribute('height', '100%');
    document.body.insertBefore(svgContainer, document.body.firstChild);

    const defs = document.createElementNS(svgNS, 'defs');
    const marker = document.createElementNS(svgNS, 'marker');
    marker.setAttribute('id', 'arrowhead');
    marker.setAttribute('markerWidth', '10');
    marker.setAttribute('markerHeight', '7');
    marker.setAttribute('refX', '0');
    marker.setAttribute('refY', '3.5');
    marker.setAttribute('orient', 'auto');
    const polygon = document.createElementNS(svgNS, 'polygon');
    polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
    polygon.setAttribute('fill', '#333');
    marker.appendChild(polygon);
    defs.appendChild(marker);
    svgContainer.appendChild(defs);

    let linesLayer = document.createElementNS(svgNS, 'g');
    linesLayer.setAttribute('id', 'lines-layer');
    svgContainer.appendChild(linesLayer);

    let classLayer = document.createElementNS(svgNS, 'g');
    classLayer.setAttribute('id', 'class-layer');
    svgContainer.appendChild(classLayer);

    return { svgContainer, linesLayer, classLayer };
}

/**
 * Retrieves the position of the pointer (mouse or touch) in the SVG canvas' coordinate system.
 *
 * @param {Event} evt - The event object containing information about the pointer position.
 * @param {SVGElement} svgContainer - The SVG element containing the canvas.
 *
 * @returns {Object} An object containing the pointer position in both the SVG canvas' and the screen's coordinate systems.
 * @property {number} x - The x-coordinate of the pointer position in the SVG canvas.
 * @property {number} y - The y-coordinate of the pointer position in the SVG canvas.
 * @property {number} rawX - The x-coordinate of the pointer position in the screen's coordinate system.
 * @property {number} rawY - The y-coordinate of the pointer position in the screen's coordinate system.
 */
export function getPointerPosition(evt, svgContainer) {
    const CTM = svgContainer.getScreenCTM();
    if (!CTM) return { x: 0, y: 0 };
    
    let clientX, clientY;
    if (evt.touches && evt.touches.length > 0) {
        clientX = evt.touches[0].clientX;
        clientY = evt.touches[0].clientY;
    } else if (evt.changedTouches && evt.changedTouches.length > 0) {
        clientX = evt.changedTouches[0].clientX;
        clientY = evt.changedTouches[0].clientY;
    } else {
        clientX = evt.clientX;
        clientY = evt.clientY;
    }

    return {
        x: (clientX - CTM.e) / CTM.a,
        y: (clientY - CTM.f) / CTM.d,
        rawX: clientX, rawY: clientY
    };
}

/**
 * Retrieves the boundaries of the SVG canvas after taking into account any
 * visible sidebars (desktop right sidebar or mobile bottom sidebar).
 *
 * @param {SVGElement} svgContainer - The SVG element containing the canvas.
 *
 * @returns {Object} An object containing the boundaries of the SVG canvas.
 * @property {number} right - The right boundary of the SVG canvas in its coordinate system.
 * @property {number} bottom - The bottom boundary of the SVG canvas in its coordinate system.
 */
export function getBoundaries(svgContainer) {
    const svgWidth = svgContainer.clientWidth;
    const svgHeight = svgContainer.clientHeight;
    
    let bRight = svgWidth;
    let bBottom = svgHeight;

    const sidebarWrapper = document.getElementById('model-element-wrapper');
    
    if (sidebarWrapper && !sidebarWrapper.classList.contains('hidden')) {
        const rect = sidebarWrapper.getBoundingClientRect();
        // Desktop (Right Sidebar)
        if (rect.height > svgHeight / 2) {
            if (rect.left > 0 && rect.left < svgWidth) {
                bRight = rect.left;
            }
        } 
        // Mobile (Bottom Sidebar)
        else {
            if (rect.top > 0 && rect.top < svgHeight) {
                bBottom = rect.top;
            }
        }
    }
    return { right: bRight, bottom: bBottom };
}