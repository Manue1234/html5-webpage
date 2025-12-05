const svgNS = 'http://www.w3.org/2000/svg';

$(document).ready(function() {

    // --- 1. Setup SVG ---
    const svgContainer = document.createElementNS(svgNS, 'svg');
    svgContainer.id = 'svg-container';
    svgContainer.setAttribute('width', '100%');
    svgContainer.setAttribute('height', '100%');
    document.body.insertBefore(svgContainer, document.body.firstChild);

    // --- 2. Definitions ---
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

    // --- 3. Layers ---
    let linesLayer = document.createElementNS(svgNS, 'g');
    linesLayer.setAttribute('id', 'lines-layer');
    svgContainer.appendChild(linesLayer);

    let classLayer = document.createElementNS(svgNS, 'g');
    classLayer.setAttribute('id', 'class-layer');
    svgContainer.appendChild(classLayer);

    // --- 4. Variables ---
    const toggleBtn = $('#toggle-btn');
    const closeBtn = $('#close-btn');
    const assocBtn = $('#association-spawner');
    const classSpawner = $('#class-spawner');
    const deleteBtn = $('#delete-btn');
    const gyroToggle = $('#gyro-toggle'); // NEW: Gyro Switch
    
    let associations = [];
    let linkSelection = null; 
    let selectedElement = null; 
    let offset = { x: 0, y: 0 };
    
    let connectionMode = false;
    let isDragging = false;
    let startMousePos = { x: 0, y: 0 };
    let currentSelection = null; 

    // --- GYRO VARIABLES ---
    let gyroEnabled = false;
    let gravity = { x: 0, y: 0 };
    let physicsInterval = null;

    // --- 5. UI Handlers ---

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
    closeBtn.on('click', toggleMenu);

    assocBtn.on('click', () => {
        connectionMode = !connectionMode;
        if (connectionMode) {
            assocBtn.addClass('btn-active-mode');
            svgContainer.classList.add('cursor-crosshair');
            clearGlobalSelection(); 
        } else {
            disableConnectionMode();
        }
    });

    function disableConnectionMode() {
        connectionMode = false;
        assocBtn.removeClass('btn-active-mode');
        svgContainer.classList.remove('cursor-crosshair');
        if (linkSelection) {
            linkSelection.classList.remove('selected-for-link');
            linkSelection = null;
        }
    }

    deleteBtn.on('click', () => {
        if (!currentSelection) {
            alert("Please select a Class, Association, or Attribute first.");
            return;
        }
        if (currentSelection.type === 'class') deleteClass(currentSelection.id);
        else if (currentSelection.type === 'assoc') deleteAssociation(currentSelection.obj);
        else if (currentSelection.type === 'attr') deleteAttribute(currentSelection.element);
        clearGlobalSelection();
    });

    // --- 6. GYROSCOPE LOGIC (New) ---

    gyroToggle.on('change', function() {
        if (this.checked) {
            enableGyro();
        } else {
            disableGyro();
        }
    });

    function enableGyro() {
        // iOS 13+ requires permission
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission()
                .then(response => {
                    if (response === 'granted') {
                        startPhysics();
                    } else {
                        alert("Permission denied. Gravity mode won't work.");
                        gyroToggle.prop('checked', false);
                    }
                })
                .catch(console.error);
        } else {
            // Non-iOS or older devices
            startPhysics();
        }
    }

    function startPhysics() {
        gyroEnabled = true;
        window.addEventListener('deviceorientation', handleOrientation);
        // Start the physics loop (60fps)
        physicsInterval = requestAnimationFrame(physicsLoop);
    }

    function disableGyro() {
        gyroEnabled = false;
        window.removeEventListener('deviceorientation', handleOrientation);
        if (physicsInterval) cancelAnimationFrame(physicsInterval);
        gravity = { x: 0, y: 0 }; // Reset gravity
    }

    function handleOrientation(event) {
        // Gamma: Left/Right tilt (-90 to 90)
        // Beta: Front/Back tilt (-180 to 180)
        let x = event.gamma; 
        let y = event.beta;

        // Deadzone (ignore small tilts)
        if (Math.abs(x) < 5) x = 0;
        if (Math.abs(y) < 5) y = 0;

        // Limit speed
        gravity.x = x * 0.15; // Speed factor
        gravity.y = y * 0.15;
    }

    function physicsLoop() {
        if (!gyroEnabled) return;

        if (Math.abs(gravity.x) > 0.1 || Math.abs(gravity.y) > 0.1) {
            const bounds = getBoundaries();
            const allForeignObjects = document.querySelectorAll('foreignObject');

            allForeignObjects.forEach(fo => {
                // IMPORTANT: If user is currently dragging this specific box, skip gravity
                if (selectedElement && selectedElement.id === fo.id && isDragging) return;

                let x = parseFloat(fo.getAttribute('x'));
                let y = parseFloat(fo.getAttribute('y'));
                const w = parseFloat(fo.getAttribute('width'));
                const h = parseFloat(fo.getAttribute('height'));

                // Apply Gravity
                x += gravity.x;
                y += gravity.y;

                // Clamp X
                if (x + w > bounds.right) x = bounds.right - w;
                if (x < 0) x = 0;

                // Clamp Y
                if (y + h > bounds.bottom) y = bounds.bottom - h;
                if (y < 0) y = 0;

                fo.setAttribute('x', x);
                fo.setAttribute('y', y);
                updateLinesForNote(fo.id);
            });
        }

        physicsInterval = requestAnimationFrame(physicsLoop);
    }

    // --- 7. Boundaries & Reposition Logic ---

    function getBoundaries() {
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

    function repositionElements() {
        const bounds = getBoundaries();
        
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

    // --- 8. Input Handlers ---

    function getPointerPosition(evt) {
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

    function handleStart(evt) {
        if (evt.target.tagName.toLowerCase() === 'input') return;
        if (evt.target === svgContainer || evt.target === linesLayer || evt.target === classLayer) {
            clearGlobalSelection();
            return;
        }

        const dragHandle = evt.target.closest('.drag-handle');
        if (dragHandle) {
            const classElement = dragHandle.closest('foreignObject');
            
            if (evt.shiftKey || connectionMode) {
                if(evt.type === 'touchstart') evt.preventDefault(); 
                if (!linkSelection) {
                    linkSelection = classElement;
                    classElement.classList.add('selected-for-link');
                } else {
                    if (linkSelection !== classElement) {
                        createConnection(linkSelection.id, classElement.id);
                        if (connectionMode) disableConnectionMode(); 
                    }
                    if (linkSelection) linkSelection.classList.remove('selected-for-link');
                    linkSelection = null;
                }
                return; 
            }

            selectedElement = classElement;
            isDragging = false; 
            const pos = getPointerPosition(evt);
            startMousePos = { x: pos.rawX, y: pos.rawY };
            offset.x = pos.x - parseFloat(selectedElement.getAttribute('x'));
            offset.y = pos.y - parseFloat(selectedElement.getAttribute('y'));
        }
    }

    function handleMove(evt) {
        if (selectedElement) {
            evt.preventDefault(); 
            const pos = getPointerPosition(evt);
            if (!isDragging) {
                const dx = Math.abs(pos.rawX - startMousePos.x);
                const dy = Math.abs(pos.rawY - startMousePos.y);
                if (dx < 5 && dy < 5) return;
                isDragging = true;
                classLayer.appendChild(selectedElement); 
            }

            let newX = pos.x - offset.x;
            let newY = pos.y - offset.y;
            
            const bounds = getBoundaries();
            const boxW = parseFloat(selectedElement.getAttribute('width'));
            const boxH = parseFloat(selectedElement.getAttribute('height'));

            if (newX < 0) newX = 0;
            if (newX + boxW > bounds.right) newX = bounds.right - boxW;
            if (newY < 0) newY = 0;
            if (newY + boxH > bounds.bottom) newY = bounds.bottom - boxH;

            selectedElement.setAttribute('x', newX);
            selectedElement.setAttribute('y', newY);
            updateLinesForNote(selectedElement.id);
        }
    }

    function handleEnd(evt) {
        if (selectedElement && !isDragging) selectItem('class', selectedElement.id, selectedElement);
        selectedElement = null;
        isDragging = false;
    }

    // Attach Unified Listeners
    svgContainer.addEventListener('mousedown', handleStart);
    svgContainer.addEventListener('touchstart', handleStart, { passive: false });
    svgContainer.addEventListener('mousemove', handleMove);
    svgContainer.addEventListener('touchmove', handleMove, { passive: false });
    svgContainer.addEventListener('mouseup', handleEnd);
    svgContainer.addEventListener('mouseleave', handleEnd);
    svgContainer.addEventListener('touchend', handleEnd);
    svgContainer.addEventListener('touchcancel', handleEnd);

    // --- Helpers ---
    function clearGlobalSelection() {
        if (currentSelection) {
            if (currentSelection.type === 'class') document.getElementById(currentSelection.id)?.classList.remove('selected-class');
            else if (currentSelection.type === 'assoc') currentSelection.element.classList.remove('selected-connection');
            else if (currentSelection.type === 'attr') currentSelection.element.classList.remove('selected-attribute');
        }
        currentSelection = null;
    }

    function selectItem(type, id, element, obj = null) {
        clearGlobalSelection(); 
        currentSelection = { type, id, element, obj };
        if (type === 'class') element.classList.add('selected-class');
        else if (type === 'assoc') element.classList.add('selected-connection');
        else if (type === 'attr') element.classList.add('selected-attribute');
    }

    svgContainer.addEventListener('click', (evt) => {
        const group = evt.target.closest('g.association-group');
        if (group) {
            const assoc = associations.find(a => a.groupElem === group);
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

    classSpawner.on('click', () => {
        const fo = document.createElementNS(svgNS, 'foreignObject');
        fo.setAttribute('id', 'class_' + Date.now());
        const bounds = getBoundaries();
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
    });

    function createConnection(noteId1, noteId2) {
        if (noteId1 === noteId2) return;
        const exists = associations.some(c => (c.from === noteId1 && c.to === noteId2) || (c.from === noteId2 && c.to === noteId1));
        if (exists) return;
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
        associations.push({ id, from: noteId1, to: noteId2, lineElem: line, textElem: text, bgElem: textBg, groupElem: group });
        updateLinesForNote(noteId1);
    }

    function updateLinesForNote(noteId) {
        const relatedConnections = associations.filter(c => c.from === noteId || c.to === noteId);
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
    function getCenter(el) {
        const x = parseFloat(el.getAttribute('x')), y = parseFloat(el.getAttribute('y'));
        const w = parseFloat(el.getAttribute('width')), h = parseFloat(el.getAttribute('height'));
        return { x: x + (w / 2), y: y + (h / 2) };
    }
    function deleteClass(classId) {
        const el = document.getElementById(classId);
        if (!el) return;
        for (let i = associations.length - 1; i >= 0; i--) {
            if (associations[i].from === classId || associations[i].to === classId) deleteAssociation(associations[i]);
        }
        el.remove();
    }
    function deleteAssociation(assoc) {
        if (assoc.groupElem) assoc.groupElem.remove();
        associations = associations.filter(a => a.id !== assoc.id);
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
        const textEl = this, currentText = textEl.textContent, assoc = associations.find(a => a.textElem === textEl);
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
});