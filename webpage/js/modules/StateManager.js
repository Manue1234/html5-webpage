export const state = {
    associations: [],
    // There can be up to one element globally selected on the svg, which will be visually represented
    currentSelection: null,
    linkSelection: null,
    connectionMode: false
};

/**
 * Clears the currently selected item, removing any highlighting or
 * styling associated with selection. This function is called whenever
 * a new item is selected, or when the user clicks away from a
 * currently selected item.
 * @type {function}
 */
export function clearGlobalSelection() {
    if (state.currentSelection) {
        if (state.currentSelection.type === 'class') document.getElementById(state.currentSelection.id)?.classList.remove('selected-class');
        else if (state.currentSelection.type === 'assoc') state.currentSelection.element.classList.remove('selected-connection');
        else if (state.currentSelection.type === 'attr') state.currentSelection.element.classList.remove('selected-attribute');
    }
    state.currentSelection = null;
}

/**
 * Selects an item in the state, highlighting it visually and
 * updating the state.currentSelection object.
 * @param {string} type - The type of the item being selected.
 *      Can be one of 'class', 'assoc', or 'attr'.
 * @param {string} id - The ID of the item being selected.
 * @param {HTMLElement} element - The DOM element associated with the
 *      item being selected.
 * @param {Object} [obj=null] - An optional object containing additional
 *      information about the selected item.
 */
export function selectItem(type, id, element, obj = null) {
    clearGlobalSelection(); 
    state.currentSelection = { type, id, element, obj };
    if (type === 'class') element.classList.add('selected-class');
    else if (type === 'assoc') element.classList.add('selected-connection');
    else if (type === 'attr') element.classList.add('selected-attribute');
}