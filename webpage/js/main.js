import { initCanvas, getBoundaries } from './modules/CanvasManager.js';
import { spawnClass } from './modules/ClassFactory.js';
import { createConnection, updateLinesForNote, disableConnectionMode, assocBtn } from './modules/AssociationManager.js';
import { enableGyro, gyroToggle, disableGyro } from './modules/PhysicsEngine.js';
import { initInputHandlers } from './modules/InputHandler.js';
import { handleStart, handleMove, handleEnd, handleAssociationClick } from './modules/InputHandler.js';
import { state, clearGlobalSelection, selectItem } from './modules/StateManager.js';

// Set up the whole UI, creating a general interface
$(document).ready(function() {

    const {svgContainer, linesLayer, classLayer} = initCanvas();
   
    const toggleBtn = $('#toggle-btn');
    const closeBtn = $('#close-btn');
    const classSpawner = $('#class-spawner');
    const deleteBtn = $('#delete-btn');

    classSpawner.on('click', (_ => spawnClass(svgContainer, classLayer)));
    
    function toggleMenu() {
        const sidebar = $('#model-element-wrapper');
        sidebar.toggle('hidden'); 
        $('#toggle-btn').toggle('hidden');

        let steps = 0;
        const interval = setInterval(() => {
            repositionElements();
            steps++;
            if (steps > 20) clearInterval(interval);
        }, 20);
    }

    toggleBtn.on('click', toggleMenu);
    toggleBtn.toggle('hidden');
    closeBtn.on('click', toggleMenu);

    assocBtn.on('click', () => {
        state.connectionMode = !state.connectionMode;
        if (state.connectionMode) {
            assocBtn.addClass('btn-active-mode');
            svgContainer.classList.add('cursor-crosshair');
            clearGlobalSelection(); 
        } else {
            disableConnectionMode();
        }
    });

    deleteBtn.on('click', () => {
        if (!state.currentSelection) {
            alert("Please select a Class, Association, or Attribute first.");
            return;
        }
        if (state.currentSelection.type === 'class') deleteClass(state.currentSelection.id);
        else if (state.currentSelection.type === 'assoc') deleteAssociation(state.currentSelection.obj);
        else if (state.currentSelection.type === 'attr') deleteAttribute(state.currentSelection.element);
        clearGlobalSelection();
    });

    gyroToggle.on('change', function() {
        if (this.checked) {
            enableGyro(svgContainer);
        } else {
            disableGyro();
        }
    });

    function repositionElements() {
        const bounds = getBoundaries(svgContainer);
        const allForeignObjects = document.querySelectorAll('foreignObject');
        allForeignObjects.forEach(fo => {
            let x = parseFloat(fo.getAttribute('x'));
            let y = parseFloat(fo.getAttribute('y'));
            const w = parseFloat(fo.getAttribute('width'));
            const h = parseFloat(fo.getAttribute('height'));

            if (x + w > bounds.right) x = bounds.right - w;
            if (x < 0) x = 0;
            if (y + h > bounds.bottom) y = bounds.bottom - h;
            if (y < 0) y = 0;

            fo.setAttribute('x', x);
            fo.setAttribute('y', y);
            updateLinesForNote(fo.id);
        });
    }

    window.addEventListener('resize', repositionElements);

    svgContainer.addEventListener('click', (evt) => {
        const group = evt.target.closest('g.association-group');
        if (group) {
            const assoc = state.associations.find(a => a.groupElem === group);
            if (assoc) {
                selectItem('assoc', assoc.id, group, assoc); 
                evt.stopPropagation();
            }
        }
    });

    $(document).on('click', '.attribute-item', function(e) {
        e.stopPropagation();
        selectItem('attr', null, this);
    });

    function deleteClass(classId) {
        const el = document.getElementById(classId);
        if (!el) return;
        for (let i = state.associations.length - 1; i >= 0; i--) {
            if (state.associations[i].from === classId || state.associations[i].to === classId) deleteAssociation(state.associations[i]);
        }
        el.remove();
    }
    function deleteAssociation(assoc) {
        if (assoc.groupElem) assoc.groupElem.remove();
        state.associations = state.associations.filter(a => a.id !== assoc.id);
    }

    function deleteAttribute(attrElement) { $(attrElement).remove(); }
    
    $(document).on('click', '.add-attr-btn', function() { $(this).siblings('.attribute-list').append($('<li class="attribute-item editable-text">- newAttr: type</li>')); });

    $(document).on('dblclick', '.editable-text', function(e) {
        e.stopPropagation();
        const $el = $(this);
        if ($el.find('input').length > 0) return;
        const currentText = $el.text();
        const input = $('<input type="text" class="edit-input" />').val(currentText);
        if ($el.hasClass('header-text') || $el.parent().hasClass('class-header')) input.addClass('header-edit');
        $el.html(input);
        input.focus();
        function save() { let val = input.val(); $el.text(val.trim() === "" ? "Untitled" : val); }
        input.on('blur', save);
        input.on('keypress', function(e) { if (e.which === 13) save(); });
        input.on('mousedown touchstart', function(ev) { ev.stopPropagation(); });
    });

    $(document).on('dblclick', '.assoc-text', function(e) {
        e.stopPropagation();
        const textEl = this, currentText = textEl.textContent, assoc = state.associations.find(a => a.textElem === textEl);
        const rect = textEl.getBoundingClientRect();
        const input = document.createElement("input");
        input.value = currentText;
        input.style.position = "absolute";
        input.style.left = (rect.left + window.scrollX - 10) + "px";
        input.style.top = (rect.top + window.scrollY - 2) + "px";
        input.style.width = (rect.width + 20) + "px";
        input.style.height = (rect.height + 4) + "px";
        input.style.fontSize = "11px";
        input.style.textAlign = "center";
        input.style.zIndex = "1000";
        input.style.outline = "2px solid #007bff";
        document.body.appendChild(input);
        input.focus(); input.select();
        textEl.style.visibility = "hidden";
        let isSaving = false;
        function save() {
            if (isSaving) return; isSaving = true;
            let newVal = input.value;
            textEl.textContent = newVal.trim() === "" ? "associates" : newVal;
            textEl.style.visibility = "visible";
            if(input.parentNode) input.parentNode.removeChild(input);
            if (assoc) updateLinesForNote(assoc.from);
        }
        input.addEventListener("blur", save);
        input.addEventListener("keydown", (ev) => { if(ev.key === "Enter") input.blur(); });
    });
    
    initInputHandlers(svgContainer, classLayer, linesLayer); 
});
