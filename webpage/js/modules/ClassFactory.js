import { svgNS, classLayer, svgContainer } from './CanvasManager.js';
import { getBoundaries } from './CanvasManager.js';

/**
 * Spawns a new class element in the SVG container.
 * The class element is placed at a random position within the SVG container.
 * The class element contains a header with the text "NewClass" and a list of attributes.
 * The user can add new attributes to the class element by clicking the "+ Add Attribute" button.
 * @param {SVGElement} svgContainer - The SVG element to spawn the class element in.
 * @param {SVGElement} classLayer - The SVG element to append the class element to.
 */
export function spawnClass(svgContainer, classLayer) {
    const fo = document.createElementNS(svgNS, 'foreignObject');
    fo.setAttribute('id', 'class_' + Date.now());
    const bounds = getBoundaries(svgContainer);
    const boxW = 150, boxH = 120;
    fo.setAttribute('x', Math.floor(Math.random() * (bounds.right - boxW)));
    fo.setAttribute('y', Math.floor(Math.random() * (bounds.bottom - boxH)));
    fo.setAttribute('width', boxW);
    fo.setAttribute('height', boxH);
    fo.classList.add('draggable');

    const containerDiv = document.createElement("div");
    containerDiv.className = "note-container";
    containerDiv.innerHTML = `
        <div class="drag-handle class-header"><span class="editable-text header-text" data-type="header">NewClass</span></div>
        <div class="class-content">
            <ul class="attribute-list"><li class="attribute-item editable-text">- attribute: type</li></ul>
            <button class="add-attr-btn">+ Add Attribute</button>
        </div>`;
    fo.appendChild(containerDiv);
    classLayer.appendChild(fo);
}