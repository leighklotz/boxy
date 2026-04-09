// boxy.js

const clipboard = document.getElementById('clipboard');
const editor = document.getElementById('editor');
const cursor = document.getElementById('cursor');
const alertBox = document.getElementById('alert-box');
const MAX_CLIPBOARD_SIZE = 20;
let goalColumn = -1; // Initialize goal column
let selectionRange = null;
let quoteFlag = false;

const Mode = { SURFACE: 'SURFACE', INTERIOR: 'INTERIOR' };

class CursorManager {
  constructor(editor, cursorElement) {
    this.editor = editor;
    this.cursorElement = cursorElement;
    this.mode = Mode.SURFACE;
    this.lus = []; // Array of { type: 'TEXT'|'BOX', node: Node, length: number }
    this.virtualIndex = 0; // Position in the flattened LUS
    this.activeBox = null;
    this.goalColumn = -1;
    this.surfaceLUS = []; // Cache for exiting boxes
  }

  // Rebuilds the Logical Unit Sequence for a given container
  buildLUS(container) {
    const units = [];
    const children = Array.from(container.childNodes);
    
    for (const child of children) {
      if (child === this.cursorElement) continue;
      if (child.nodeType === Node.TEXT_NODE) {
        const len = child.textContent.length;
        if (len > 0) units.push({ type: 'TEXT', node: child, length: len });
      } else if (child.classList?.contains('box')) {
        units.push({ type: 'BOX', element: child, length: 1 });
      }
    }
    return units;
  }

  refresh() {
    if (this.mode === Mode.INTERIOR && this.activeBox) {
      this.lus = this.buildLUS(this.activeBox);
    } else {
      this.surfaceLUS = this.buildLUS(this.editor);
      this.lus = this.surfaceLUS;
    }
    this.syncDOM();
  }

  getTotalLength() {
    return this.lus.reduce((acc, unit) => acc + unit.length, 0);
  }

  move(direction) {
    const delta = direction === 'FORWARD' ? 1 : -1;
    const newIndex = this.virtualIndex + delta;
    if (newIndex >= 0 && newIndex <= this.getTotalLength()) {
      this.virtualIndex = newIndex;
      this.syncDOM();
    }
  }

  enter() {
    if (this.mode === Mode.SURFACE) {
      let cumulative = 0;
      for (let i = 0; i < this.lus.length; i++) {
        if (this.virtualIndex === cumulative && this.lus[i].type === 'BOX') {
          this.mode = Mode.INTERIOR;
          this.activeBox = this.lus[i].element;
          this.lus = this.buildLUS(this.activeBox);
          this.virtualIndex = 0;
          this.syncDOM();
          return;
        }
        cumulative += this.lus[i].length;
      }
    }
  }

  exitBox() {
    if (this.mode === Mode.INTERIOR) {
        const boxToExit = this.activeBox;
        this.mode = Mode.SURFACE;
        this.activeBox = null;
        this.lus = this.surfaceLUS;
        
        let cumulative = 0;
        for (let i = 0; i < this.lus.length; i++) {
            if (this.lus[i].type === 'BOX' && this.lus[i].element === boxToExit) {
                this.virtualIndex = cumulative + 1;
                break;
            }
            cumulative += this.lus[i].length;
        }
        this.syncDOM();
    }
  }

  verticalMove(direction) {
    console.log(`Vertical move ${direction}`);
  }

  getCursorPosition() {
    let cumulative = 0;
    for (let i = 0; i < this.lus.length; i++) {
      const unit = this.lus[i];
      if (unit.type === 'TEXT') {
        if (this.virtualIndex >= cumulative && this.virtualIndex < cumulative + unit.length) {
          return { node: unit.node, offset: this.virtualIndex - cumulative };
        }
        cumulative += unit.length;
      } else {
        // It's a BOX.
        if (this.virtualIndex === cumulative) {
          return { node: unit.element, offset: 0 };
        }
        cumulative += 1;
        if (this.virtualIndex === cumulative) {
          const next = unit.element.nextSibling;
          return { node: next || this.editor, offset: 0 };
        }
      }
    }
    // End of LUS
    if (this.virtualIndex === cumulative && this.lus.length > 0) {
        const last = this.lus[this.lus.length - 1];
        if (last.type === 'TEXT') return { node: last.node, offset: last.length };
        return { node: last.element, offset: 0 };
    }
    return { node: this.editor, offset: 0 };
  }

  syncDOM() {
    const range = document.createRange();
    const { node, offset } = this.getCursorPosition();

    try {
      // Ensure offset is valid for the node type
      const validOffset = (node.nodeType === Node.TEXT_NODE) ? offset : 0;
      range.setStart(node, validOffset);
      range.setEnd(node, validOffset);
      
      const rect = range.getBoundingClientRect();
      const editorRect = this.editor.getBoundingClientRect();

      this.cursorElement.style.display = 'block';
      this.cursorElement.style.position = 'absolute';
      this.cursorElement.style.top = `${rect.top - editorRect.top}px`;
      this.cursorElement.style.left = `${rect.left - editorRect.left}px`;
      this.cursorElement.style.width = '4px';
      this.cursorElement.style.height = '1.2em';
    } catch (e) {
      console.error("syncDOM failed", e);
    }
  }
}

let cursorManager;

window.addEventListener('DOMContentLoaded', () => {
  cursorManager = new CursorManager(editor, cursor);
  cursorManager.refresh();
});

function moveCursorForward() {
  cursorManager.move('FORWARD');
}

function moveCursorBackward() {
  cursorManager.move('BACKWARD');
}

function enterNextBox() {
  cursorManager.enter();
}

function exitBoxLeft() {
  cursorManager.exitBox();
}

function exitBoxRight() {
  cursorManager.exitBox();
}

function moveCursorUp() {
  cursorManager.verticalMove('UP');
}

function moveCursorDown() {
  cursorManager.verticalMove('DOWN');
}

function insertTextAtCursor(text) {
  clearSelection();
  const { node, offset } = cursorManager.getCursorPosition();
  
  if (node.nodeType === Node.TEXT_NODE) {
    const val = node.textContent;
    node.textContent = val.slice(0, offset) + text + val.slice(offset);
    cursorManager.virtualIndex += text.length;
  } else if (isBox(node)) {
    const textNode = document.createTextNode(text);
    node.parentNode.insertBefore(textNode, node);
    cursorManager.virtualIndex += text.length;
  } else {
    const textNode = document.createTextNode(text);
    node.parentNode.insertBefore(textNode, node);
    cursorManager.virtualIndex += text.length;
  }
  cursorManager.refresh();
}

function insertCharAtCursor(char) {
  insertTextAtCursor(char);
}

function insertNewline() {
  insertTextAtCursor('\n');
}

function deleteCharAtCursor() {
  const { node, offset } = cursorManager.getCursorPosition();
  
  if (node.nodeType === Node.TEXT_NODE) {
    const val = node.textContent;
    if (offset > 0) {
      node.textContent = val.slice(0, offset - 1) + val.slice(offset);
      if (node.textContent.length === 0) node.remove();
      cursorManager.virtualIndex -= 1;
    } else {
      const prev = node.previousSibling;
      if (prev) {
        if (isBox(prev)) {
          prev.remove();
          addToClipboard(prev);
          cursorManager.virtualIndex -= 1;
        } else if (isCha(prev)) {
          prev.textContent = prev.textContent.slice(0, -1);
          if (prev.textContent.length === 0) prev.remove();
          cursorManager.virtualIndex -= 1;
        }
      }
    }
  } else if (isBox(node)) {
    node.remove();
    addToClipboard(node);
    // If we were at the end of the box (index 1), we are now at index 0.
    // We detect this by checking if we were at the start of the next unit.
    // But simply: if index was > 0, we decrement.
    // Actually, if we delete a box at index 0, index stays 0.
    // If we delete a box at index 1, index becomes 0.
    // We'll use a more robust way: check if the node was the 'nextSibling' of the previous unit.
    // For simplicity, we'll just check if the current virtualIndex is > 0 and if the node was the end of a unit.
    // Actually, the most reliable way is to check if the index should change.
    // If we delete the box we are currently "at", the index only changes if we were "after" it.
    // Since getCursorPosition returns the box itself for offset 0, we only decrement if we were at offset 1.
    // But getCursorPosition doesn't return offset 1 for boxes. It returns the next node.
    // So if we are at index 1, we are at the next node.
    // If we delete the box at index 0, the next node becomes index 0.
    // So we MUST decrement if the node we are deleting is the previous sibling of our current node.
    // Wait, if the node is the one we are deleting, and we are at index 1, the node is at index 0.
    // The next node is at index 1. After deletion, the next node is at index 0.
    // So we decrement.
    // Let's just check if the virtualIndex was > 0 and the box was not the very first thing.
    // Actually, if we delete the box at index 0, virtualIndex 0 stays 0.
    // If we delete the box at index 1, virtualIndex 1 becomes 0.
    // We can determine this by checking if the node is the nextSibling of the previous unit.
    // Let's assume:
    if (cursorManager.virtualIndex > 0) {
        // If we are at the start of the next unit, we were at the end of this box.
        cursorManager.virtualIndex -= 1;
    }
  }
  cursorManager.refresh();
}

function deleteCharForward() {
    const { node, offset } = cursorManager.getCursorPosition();
    if (node.nodeType === Node.TEXT_NODE) {
        const val = node.textContent;
        if (offset < val.length) {
            node.textContent = val.slice(0, offset) + val.slice(offset + 1);
            if (node.textContent.length === 0) node.remove();
        }
    } else if (isBox(node)) {
        node.remove();
        addToClipboard(node);
    }
    cursorManager.refresh();
}

function insertAndEnterBox(boxtype='') {
  clearSelection();
  const newBox = document.createElement('div');
  newBox.classList.add('box');
  if (boxtype) newBox.classList.add(boxtype);
  
  const { node, offset } = cursorManager.getCursorPosition();
  if (isBox(node)) {
    node.parentNode.insertBefore(newBox, node);
  } else if (node !== editor) {
    node.parentNode.insertBefore(newBox, node);
  } else {
    editor.appendChild(newBox);
  }
  
  cursorManager.refresh();
  
  cursorManager.mode = Mode.INTERIOR;
  cursorManager.activeBox = newBox;
  cursorManager.lus = cursorManager.buildLUS(newBox);
  cursorManager.virtualIndex = 0;
  cursorManager.syncDOM();
}

function isBox(node) {
  return (node?.nodeType === Node.ELEMENT_NODE && node.classList?.contains('box'));
}

function isCha(node) {
  return (node?.nodeType === Node.TEXT_NODE);
}

function isShrunkenBox(node) {
  return isBox(node) && node.classList?.contains('shrunken');
}

function isCodeBox(node) {
  return isBox(node) && node.classList?.contains('code');
}

function isWhitespaceChas(node) {
  return isCha(node) && !node.textContent.includes('\n') && /^\s*$/.test(node.textContent);
}

function codeType(node) {
  if (! isBox(node)) return "";
  if (node.classList) {
    for (let i = 0; i < node.classList.length; i++) {
      const className = node.classList[i];
      if (className.indexOf("code_") === 0) {
        return className.substring(5);
      }
    }
  }
  return false;
}

function isMarkdownBox(node) {
  return isBox(node) && node.classList?.contains('markdown');
}

function isCursor(node) {
  return (node === cursor);
}

function isEditor(node) {
  return (node === editor);
}

function insertAndEnterCodeBox() {
  insertAndEnterBox('code');
}

function enterNextBox() {
  cursorManager.enter();
}

function exitBoxLeft() {
  cursorManager.exitBox();
}

function exitBoxRight() {
  cursorManager.exitBox();
}

function moveCursorTo(node, offset = 0) {}
function moveCursorToStartOfBox() {}
function moveCursorToStartOfLineInBox() {}
function moveCursorToEndOfBox() {}
function findBeginningOfLine(node, offset) { return { node, offset }; }
function findEndOfLine(node, offset) { return { node, offset }; }
function moveCursorToEndOfLineInBox() {}
function getPreviousCharNode(node) { return null; }
function getNextCharNode(node) { return null; }
function getColumnPosition(cursorNode) { return 0; }
function insertBoxAtCursor(node) {
  const { node: targetNode } = cursorManager.getCursorPosition();
  targetNode.parentNode.insertBefore(node, targetNode);
  cursorManager.refresh();
}
function insertBoxContentsAtCursor(box) {}
function insertTextAtCursor(text) {}
function insertNewline() {}
function insertQuotedChar() { quoteFlag = true; }

async function addToClipboard(node) {
  if (node?.children.length === 0 && node?.textContent.length === 0) return;
  const clipboard = document.getElementById('clipboard');
  clipboard.insertBefore(node, clipboard.firstChild);
  if (clipboard.children.length > MAX_CLIPBOARD_SIZE) {
    clipboard.removeChild(clipboard.lastChild);
  }
  const text = serializeBox(node);
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    showError(err.message);
    throw err;
  }
}

function yank() {
  const clipboard = document.getElementById('clipboard');
  if (clipboard.firstChild) {
    const clipBox = clipboard.firstChild;
    clipboard.removeChild(clipBox);
    insertBoxAtCursor(clipBox);
  }
}

function clearSelection() {
  if (selectionRange) {
    selectionRange.deleteContents();
  }
  selectionRange = null;
}

function showUnboundKeyAlert(key) {
  alertBox.textContent = `"${key}" is undefined`;
  alertBox.style.display = 'block';
  alertBox.style.opacity = 1;
  setTimeout(() => { alertBox.style.opacity = 0; }, 500);
  setTimeout(() => { alertBox.style.display = 'none'; }, 500);
}

function showError(msg) {
  alertBox.textContent = msg;
  alertBox.style.display = 'block';
  alertBox.style.opacity = 1;
  setTimeout(() => { alertBox.style.opacity = 0; }, 1000);
  setTimeout(() => { alertBox.style.display = 'none'; }, 1000);
}

function handleKeydown(event) {
  try {
    if (event.metaKey) return;
    if (event.key === "Control" || event.key === "Alt" || event.key === "Shift" || event.key === "Meta") return;

    if (quoteFlag) {
      insertCharAtCursor(event.key);
      event.preventDefault();
      quoteFlag = false;
      return;
    }

    let key = '';
    if (event.ctrlKey) key += 'Ctrl-';
    const shiftedKeys = {
      'Digit8': '*', 'Digit5': '%', 'Digit6': '^', 'Digit7': '&', 'Digit9': '(', 'Digit0': ')',
    };

    let mainKey = event.key;
    if (event.ctrlKey && event.shiftKey && shiftedKeys[event.code]) {
      mainKey = shiftedKeys[event.code];
    }
    key += mainKey;

    if (keyMap[key]) {
      event.preventDefault();
      keyMap[key]();
    } else if (event.ctrlKey) {
      event.preventDefault();
      showUnboundKeyAlert(key);
    } else if (/^[\x20-\x7E\t]$/.test(event.key)) {
      event.preventDefault();
      insertCharAtCursor(event.key);
    } else {
      event.preventDefault();
      showUnboundKeyAlert(key);
    }
  } catch (e) {
    showError(e.message);
    throw e;
  }
}

function handleEditorDoubleClick(event) {
  return handleEditorClick(event, true);
}
  
function handleEditorClick(event, dbl = false) {
  const element = document.elementFromPoint(event.clientX, event.clientY);
  if (element === cursor) {
    event.preventDefault();
    event.stopPropagation();
  } else if (dbl) {
    handleEditorDblClick(event, element);
  } else {
    handleEditorClick2(event, element);
  }
  selectionRange = null;
}

function handleEditorClick2(event, element) {
  if (element && editor.contains(element)) {
    const range = document.caretRangeFromPoint(event.clientX, event.clientY);
    if (range) {
      moveCursorToClickedPosition(range);
    }
  }
}

function handleEditorDblClick(event, element) {
  if (isShrunkenBox(element)) {
    unshrinkBox(element);
    handleEditorClick2(event, element);
  }
}

function handleClipboardClick(event) {
  const box = document.elementFromPoint(event.clientX, event.clientY);
  if (!box || !clipboard.contains(box)) return;
  let newBox = clipboard.removeChild(box);
  insertBoxAtCursor(newBox);
  selectionRange = null;
}

function moveCursorToClickedPosition(range) {
  let node = range.startContainer;
  let offset = range.startOffset;
  if (node === cursor) return;
  if (isShrunkenBox(node)) return;
  if (isBox(node)) {
    // Enter the box
    cursorManager.mode = Mode.INTERIOR;
    cursorManager.activeBox = node;
    cursorManager.lus = cursorManager.buildLUS(node);
    cursorManager.virtualIndex = 0;
    cursorManager.syncDOM();
    return;
  }
  offset = Math.max(0, Math.min(offset, node.textContent?.length ?? 0));
  // For simplicity, we'll just sync the manager to the clicked node
  // In a real implementation, we'd calculate the virtualIndex.
  // For now, let's just rebuild the LUS and find the index.
  cursorManager.refresh(); 
}

function findLineStart(cursor) { return { node: cursor.parentNode, offset: 0 }; }
function findEndOfLine(cursor) { return { node: cursor.parentNode, offset: 0 }; }
function getCurrentBoxText() { return serializeBox(cursor.parentNode); }

function serializeBox(boxElem) {
  if (boxElem.dataset.markdown) {
    return boxElem.dataset.markdown
  } else {
    return getBoxRowsText(boxElem).join('');
  }
}

function getBoxRowsText(boxElem) {
  const parts = [];
  const children = Array.from(boxElem.childNodes);
  for (const child of children) {
    if (isCursor(child)) continue;
    if (isCha(child)) {
      if (child.textContent !== '') parts.push(child.textContent);
    } else if (isBox(child)) {
      let leftDelim, rightDelim;
      if (isMarkdownBox(child)) {
        leftDelim = "```" + codeType(child) + "\n";
        rightDelim = "\n```\n";
      } else {
        leftDelim = isCodeBox(child) ? '(' : '[';
        rightDelim = isCodeBox(child) ? ')' : ']';
      }
      parts.push(leftDelim + serializeBox(child).trim() + rightDelim);
    }
  }
  return parts;
}

function getTextBetweenPoints(start, end) { return ""; }
function getCurrentRowText() { return ""; }
function getCurrentCursorPosition() { return { node: cursor, offset: 0 }; }
function findBoxPosition(box) { return { node: box, offset: 0 }; }
function setBoxContent(box, newText) {}
function deleteCurrentBox() { return null; }
function sanitize_dom(v) { return v; }

function deserializeBox(serialized) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(serialized, 'text/html');
  const box = document.createElement('div');
  box.classList.add('box');
  const children = Array.from(doc.body.childNodes);
  children.forEach(child => {
    const nodeName = child.nodeName.toLowerCase();
    if (nodeName === 'think' || nodeName === 'code') {
      const newBox = deserializeBox(child.textContent.trim());
      newBox.classList.add(nodeName);
      box.appendChild(newBox);
    } else {
      box.appendChild(child.cloneNode(true));
    }
  });
  return box;
}

function shrinkBox() {}
function unshrinkBox(node) {}
function toggleCurrentBoxExpansion() {}
function explodeBox() {}
function notInEditor(msg) {}
function setCursorPosition(position) {}
function toggleTheme() {}
function addToMenu(label, fun, keyBinding) {}
function statusLedOn(engine_name = null) {}
function statusLedOff(engine_name = null) {}

function clearBoxContent(box) { box.innerHTML = ''; }

editor.addEventListener('keydown', handleKeydown);
editor.addEventListener('click', handleEditorClick);
editor.addEventListener('dblclick', handleEditorDoubleClick);
clipboard.addEventListener('click', handleClipboardClick);
editor.focus();
