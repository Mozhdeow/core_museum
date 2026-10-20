export function museumKeyboardOwned(target: EventTarget | null) {
    return document.querySelector('dialog[open], [role="dialog"]') !== null ||
        (target instanceof HTMLElement && Boolean(target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="slider"],[role="listbox"],[role="menu"]')))
}
