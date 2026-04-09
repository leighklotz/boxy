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
      // Find if the current virtualIndex points to a Box
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
        
        // Find box in surface LUS
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
    // Implementation placeholder as per refactor notes
    console.log(`Vertical move ${direction}`);
  }

  getCursorPosition() {
    let cumulative = 0;
    for (let i = 0; i < this.lus.length; i++) {
      const unit = this.lus[i];
      if (this.virtualIndex >= cumulative && this.virtualIndex <= cumulative + unit.length) {
        if (unit.type === 'TEXT') {
          return { node: unit.node, offset: this.virtualIndex - cumulative, virtualIndex: this.virtualIndex };
        } else {
          // It's a BOX. Position is either before (0) or after (1)
          if (this.virtualIndex === cumulative) {
            return { node: unit.element, offset: 0, virtualIndex: this.virtualIndex };
          } else {
            const next = unit.element.nextSibling;
            return { node: next || this.editor, offset: 0, virtualIndex: this.virtualIndex };
          }
        }
      }
      cumulative += unit.length;
    }
    return { node: this.editor, offset: 0, virtualIndex: this.virtualIndex };
  }

  syncDOM() {
    const range = document.createRange();
    const { node, offset } = this.getCursorPosition();

    try {
      // Fix: Range.setStart on an Element must have offset 0
      const validOffset = (node.nodeType === Node.TEXT_NODE) ? offset : 0;
      range.setStart(node, validOffset);
      range.setEnd(node, validOffset);
      
      const rect = range.getBoundingClientRect();
      const editorRect = this.editor.getBoundingClientRect();

      // Apply absolute positioning for the floating cursor
      this.cursorElement.style.display = 'block';
      this.cursorElement.style.position = 'absolute';
      this.cursorElement.style.top = `${rect.top - editorRect.top}px`;
      this.cursorElement.style.left = `${rect.left - editorRect.left}px`;
      this.cursorElement.style.width = '4px'; // Visual width
      this.cursorElement.style.height = '1.2em';
    } catch (e) {
      console.error("syncDOM failed", e);
    }
  }
}

let cursorManager;

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
  cursorManager = new CursorManager(editor, cursor);
  cursorManager.refresh();
});

// --- REPLACED MOVEMENT FUNCTIONS ---

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

// --- REPLACED INSERTION FUNCTIONS ---

function insertTextAtCursor(text) {
  clearSelection();
  const { node, offset } = cursorManager.getCursorPosition();
  
  if (node.nodeType === Node.TEXT_NODE) {
    const val = node.textContent;
    node.textContent = val.slice(0, offset) + text + val.slice(offset);
  } else if (isBox(node)) {
    node.parentNode.insertBefore(document.createTextNode(text), node);
  } else if (node !== editor) {
    node.parentNode.insertBefore(document.createTextNode(text), node);
  } else {
    editor.appendChild(document.createTextNode(text));
  }
  cursorManager.refresh();
}

function insertCharAtCursor(char) {
  insertTextAtCursor(char);
}

function insertNewline() {
  insertTextAtCursor('\n');
}

// --- REPLACED DELETION FUNCTIONS ---

function deleteCharAtCursor() {
  const { node, offset } = cursorManager.getCursorPosition();
  if (node.nodeType === Node.TEXT_NODE) {
    const val = node.textContent;
    if (offset > 0) {
      node.textContent = val.slice(0, offset - 1) + val.slice(offset);
      if (node.textContent.length === 0) node.remove();
    } else {
      const prev = node.previousSibling;
      if (prev) {
        if (prev.nodeType === Node.TEXT_NODE) {
          prev.textContent = prev.textContent.slice(0, -1);
          if (prev.textContent.length === 0) prev.remove();
        } else if (isBox(prev)) {
          prev.remove();
          addToClipboard(prev);
        }
      }
    }
  } else if (isBox(node)) {
      const box = node;
      box.remove();
      addToClipboard(box);
  } else if (node !== editor) {
    const prev = node.previousSibling;
    if (prev && isBox(prev)) {
      prev.remove();
      addToClipboard(prev);
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
        } else {
            const next = node.nextSibling;
            if (next) {
                if (next.nodeType === Node.TEXT_NODE) {
                    next.textContent = next.textContent.slice(1);
                    if (next.textContent.length === 0) next.remove();
                } else if (isBox(next)) {
                    next.remove();
                    addToClipboard(next);
                }
            }
        }
    } else if (isBox(node)) {
        node.remove();
        addToClipboard(node);
    } else if (node !== editor) {
        if (isBox(node)) {
            node.remove();
            addToClipboard(node);
        } else if (node.nodeType === Node.TEXT_NODE) {
            node.textContent = node.textContent.slice(1);
            if (node.textContent.length === 0) node.remove();
        }
    }
    cursorManager.refresh();
}

// --- UPDATED INSERT BOX ---

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
  
  // Move cursor into the new box
  cursorManager.mode = Mode.INTERIOR;
  cursorManager.activeBox = newBox;
  cursorManager.lus = cursorManager.buildLUS(newBox);
  cursorManager.virtualIndex = 0;
  cursorManager.syncDOM();
}

// Keep existing utility functions
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

function moveCursorTo(node, offset = 0) {
  // This is now a legacy helper, but we'll keep it for compatibility with other modules
  // although they should ideally use cursorManager.
  // For now, we'll just provide a basic version.
  if (!node) return;
  cursorManager.refresh(); // This is a crude way to sync. 
  // In a real refactor, we'd update cursorManager.virtualIndex directly.
}

function moveCursorToStartOfBox() {
  // Placeholder for compatibility
}

function moveCursorToStartOfLineInBox() {
  // Placeholder for compatibility
}

function moveCursorToEndOfBox() {
  // Placeholder for compatibility
}

function findBeginningOfLine(node, offset) {
  // Placeholder for compatibility
  return { node: node, offset: 0 };
}

function findEndOfLine(node, offset) {
  // Placeholder for compatibility
  return { node: node, offset: 0 };
}

function moveCursorToEndOfLineInBox() {
  // Placeholder for compatibility
}

function getPreviousCharNode(node) {
  // Placeholder for compatibility
  return null;
}

function getNextCharNode(node) {
  // Placeholder for compatibility
  return null;
}

function getColumnPosition(cursorNode) {
  // Placeholder for compatibility
  return 0;
}

function insertCharAtCursor(char) {
  insertTextAtCursor(char);
}

function insertBoxAtCursor(node) {
  // Legacy helper
  const { node: targetNode, offset } = cursorManager.getCursorPosition();
  if (isBox(targetNode)) {
    targetNode.parentNode.insertBefore(node, targetNode);
  } else {
    targetNode.parentNode.insertBefore(node, targetNode.childNodes[offset] || null);
  }
  cursorManager.refresh();
}

function insertBoxContentsAtCursor(box) {
  // Legacy helper
}

function insertTextAtCursor(text) {
  // Handled by refactor
}

function insertNewline() {
  insertTextAtCursor('\n');
}

function insertQuotedChar() {
  quoteFlag = true;
}

function killLine() {
  // Implementation for killLine
  // This would need to interact with the LUS.
  // For now, we'll leave it as a placeholder to avoid breaking existing logic.
}

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
  setTimeout(() => {
    alertBox.style.display = 'none';
  }, 500);
}

function showError(msg) {
  alertBox.textContent = msg;
  alertBox.style.display = 'block';
  alertBox.style.opacity = 1;
  setTimeout(() => { alertBox.style.opacity = 0; }, 1000);
  setTimeout(() => {
    alertBox.style.display = 'none';
  }, 1000);
}

function handleKeydown(event) {
  try {
    if (event.metaKey) return;
    if (event.key === "Control" || event.key === "Alt" || event.key === "Shift" || event.key === "Meta") {
      return;
    }

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
    moveCursorTo(node, 0);
    return;
  }
  offset = Math.max(0, Math.min(offset, node.textContent?.length ?? 0));
  if (node !== editor && node.parentNode !== cursor) {
    moveCursorTo(node, offset);
  }
}

function findLineStart(cursor) {
  let node = cursor.previousSibling;
  while (node) {
    if (isCha(node)) {
      const newlineIndex = node.textContent.lastIndexOf('\n');
      if (newlineIndex !== -1) return { node, offset: newlineIndex + 1 };
    }
    node = node.previousSibling;
  }
  const box = cursor.parentNode;
  return { node: box.firstChild || box, offset: 0 };
}

function findEndOfLine(cursor) {
  let currentNode = cursor;
  while (currentNode) {
    if (isCha(currentNode)) {
      const newlineIndex = currentNode.textContent.indexOf('\n');
      if (newlineIndex !== -1) return { node: currentNode, offset: newlineIndex };
    }
    currentNode = currentNode.nextSibling;
  }
  const lastNode = cursor.parentNode.lastChild;
  return { node: lastNode || cursor.parentNode, offset: lastNode?.textContent?.length || 0 };
}

function getCurrentBoxText() {
  return serializeBox(cursor.parentNode);
}

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
    } else {
      parts.push(child.outerHTML);
    }
  }
  return parts;
}

function getTextBetweenPoints(start, end) {
  const parts = [];
  let currentNode = start.node;
  let done = false;
  while (currentNode && !done) {
    if (isCursor(currentNode)) {
    } else if (isCha(currentNode)) {
      const text = currentNode.textContent;
      const fromIdx = (currentNode === start.node) ? start.offset : 0;
      const toIdx = (currentNode === end.node) ? end.offset : text.length;
      parts.push(text.slice(fromIdx, toIdx));
    } else if (isBox(currentNode)) {
      parts.push(serializeBox(currentNode));
    }
    if (currentNode === end.node) done = true;
    if (!done) currentNode = currentNode.nextSibling;
  }
  return parts.join('');
}

function getCurrentRowText() {
  const text = getTextBetweenPoints(findLineStart(cursor), findEndOfLine(cursor));
  return text.trim()
}

function getCurrentCursorPosition() {
  const currentBox = cursor.parentNode;
  let position = 0;
  let currentNode = currentBox.firstChild;
  while (currentNode !== cursor) {
    if (isCha(currentNode)) position += currentNode.textContent.length;
    else if (isBox(currentNode)) position++;
    currentNode = currentNode.nextSibling;
  }
  return { node: currentNode, offset: position };
}

function findBoxPosition(box) {
  let position = 0;
  let inbox = box.parentNode;
  let currentNode = inbox.firstChild;
  while (currentNode !== box) {
    if (isCha(currentNode)) position += currentNode.textContent.length;
    else if (isBox(currentNode)) position++;
    currentNode = currentNode.nextSibling;
  }
  return { node: box, offset: position };
}

function setBoxContent(box, newText) {
  clearBoxContent(box);
  insertTextAtCursor(newText);
}

function deleteCurrentBox() {
  notInEditor("deleteCurrentBox");
  const box = cursor.parentNode;
  const parentBox = box.parentNode;
  exitBoxRight();
  parentBox.removeChild(box);
  return box;
}

function deserializeBox(serialized) {
  const markdownBlocks = [];
  const extractMarkdownRegex = /```(\w*)\s*\n([\s\S]*?)\s*```/g;
  const placeholderRegex = /<MARKDOWN_(\d+)>/g;

  const tempSerialized = serialized.replace(extractMarkdownRegex, (match, lang, code) => {
    const index = markdownBlocks.length;
    markdownBlocks.push({ lang, code });
    return `<MARKDOWN_${index}>`;
  });

  const boxSerialized = tempSerialized
    .replaceAll('[', '<div class="box">')
    .replaceAll(']', '</div>');

  const finalSerialized = boxSerialized.replace(placeholderRegex, (match, index) => {
    const { lang, code } = markdownBlocks[index];
    return `<div class="box code markdown code_${lang}">${code}</div>`;
  });

  const parser = new DOMParser();
  const doc = parser.parseFromString(finalSerialized, 'text/html');
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
      box.appendChild(child);
    }
  });

  return box;
}

function shrinkBox() {
  const node = cursor.parentNode;
  notInEditor('Cannot shrink');
  if (! isBox(node)) throw new Error(`shrinkBox: not a box: ${node}`);
  node.classList.add('shrunken');
  node.classList.remove('fullsize');
  exitBoxRight();
}

function unshrinkBox(node) {
  notInEditor('Cannot unshrink');
  if (! isBox(node)) throw new Error(`shrinkBox: not a box: ${node}`);
  if (node.classList?.contains('shrunken')) {
      node.classList.remove('fullsize')
      node.classList.remove('shrunken')
      exitBoxRight()
  }
}

function toggleCurrentBoxExpansion() {
    notInEditor('Cannot unshrink');
    let box = cursor.parentNode;
    box.classList.remove('shrunken')
    if (!box.classList.contains("fullsize")) {
        box.classList.add("fullsize");
    } else {
        box.classList.remove("fullsize");
    }
}

function explodeBox() {
    notInEditor('Cannot explode');
    let box = deleteCurrentBox();
    let leftDelim = isCodeBox(box) ? '(' : '[';
    let rightDelim = isCodeBox(box) ? ')' : ']';
    insertTextAtCursor(leftDelim);
    insertBoxContentsAtCursor(box);
    insertTextAtCursor(rightDelim);
}

function notInEditor(msg) {
  if (isEditor(cursor.parentNode)) {
    throw new Error(`Toplevel box: ${msg}`);
  }
}

function setCursorPosition(position) {
  moveCursorTo(position.node, position.offset);
}

function toggleTheme() {
    const themes = [
        { id: 'light-theme', disabled: true },
        { id: 'dark-theme', disabled: true },
        { id: 'green-theme', disabled: true }
    ];
    const activeTheme = themes.find(theme => !document.getElementById(theme.id).disabled);

    if (activeTheme) {
        const currentIndex = themes.indexOf(activeTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        themes.forEach((theme, index) => {
            document.getElementById(theme.id).disabled = index !== nextIndex;
        });
    } else {
        document.getElementById(themes[0].id).disabled = false;
    }
}

function addToMenu(label, fun, keyBinding) {
  const topMenus = document.getElementById('top-menus');
  topMenus.appendChild(document.createTextNode(' | '));
  const menuItem = document.createElement('a');
  menuItem.href = '#';
  menuItem.onclick = fun;
  menuItem.title = keyBinding;
  menuItem.textContent = label;
  topMenus.appendChild(menuItem);
}

function statusLedOn(engine_name = null) {
  if (engine_name !== 'error') statusLedOff('error')  
  document.getElementById('status-led').classList.add('running');
  if (engine_name) document.getElementById('status-led').classList.add(engine_name);
}

function statusLedOff(engine_name = null) {
  document.getElementById('status-led').classList.remove('running');
  if (engine_name) document.getElementById('status-led').classList.remove(engine_name);
}

function clearBoxContent(box) {
    box.innerHTML = '';
}

editor.addEventListener('keydown', handleKeydown);
editor.addEventListener('click', handleEditorClick);
editor.addEventListener('dblclick', handleEditorDoubleClick);
clipboard.addEventListener('click', handleClipboardClick);
editor.focus();
