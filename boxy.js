// boxy.js

const clipboard = document.getElementById('clipboard');
const editor = document.getElementById('editor');
const cursor = document.getElementById('cursor');
const alertBox = document.getElementById('alert-box');
const MAX_CLIPBOARD_SIZE = 20;
let goalColumn = -1; // Initialize goal column
let selectionRange = null;

let quoteFlag = false;

function resetGoalColumn() {
  goalColumn = -1;
}

function placeCursorBeforeNode(node) {
  if (!node || !node.parentNode) return;
  cursor.remove();
  node.parentNode.insertBefore(cursor, node);
}

function placeCursorAfterNode(node) {
  if (!node || !node.parentNode) return;
  cursor.remove();
  node.parentNode.insertBefore(cursor, node.nextSibling);
}

function moveCursorToDomPoint(container, offset) {
  if (!container) return;

  if (container.nodeType === Node.TEXT_NODE) {
    moveCursorTo(container, offset);
    return;
  }

  if (container.nodeType === Node.ELEMENT_NODE) {
    cursor.remove();
    container.insertBefore(cursor, container.childNodes[offset] || null);
  }
}

function getBoxLength(box) {
  let length = 0;

  for (const child of box.childNodes) {
    if (isCursor(child)) {
      continue;
    } else if (isCha(child)) {
      length += child.textContent.length;
    } else if (isBox(child)) {
      length += 1;
    }
  }

  return length;
}

function getCursorOffsetInBox(box = cursor.parentNode) {
  return findCursorPositionInBox(box).offset;
}

function moveCursorToOffsetInBox(box, offset) {
  const targetOffset = Math.max(0, Math.min(offset, getBoxLength(box)));
  let remaining = targetOffset;

  for (const child of box.childNodes) {
    if (isCursor(child)) {
      continue;
    }

    if (isCha(child)) {
      const length = child.textContent.length;
      if (remaining <= length) {
        moveCursorTo(child, remaining);
        return;
      }
      remaining -= length;
      continue;
    }

    if (isBox(child)) {
      if (remaining === 0) {
        placeCursorBeforeNode(child);
        return;
      }
      if (remaining === 1) {
        placeCursorAfterNode(child);
        return;
      }
      remaining -= 1;
    }
  }

  cursor.remove();
  box.appendChild(cursor);
}

function getDomBoundaryForOffset(box, offset) {
  const targetOffset = Math.max(0, Math.min(offset, getBoxLength(box)));
  let remaining = targetOffset;
  let childIndex = 0;

  for (const child of box.childNodes) {
    if (isCursor(child)) {
      childIndex += 1;
      continue;
    }

    if (isCha(child)) {
      const length = child.textContent.length;
      if (remaining <= length) {
        return { container: child, offset: remaining };
      }
      remaining -= length;
      childIndex += 1;
      continue;
    }

    if (isBox(child)) {
      if (remaining === 0) {
        return { container: box, offset: childIndex };
      }
      if (remaining === 1) {
        return { container: box, offset: childIndex + 1 };
      }
      remaining -= 1;
    }

    childIndex += 1;
  }

  return { container: box, offset: box.childNodes.length };
}

function getLogicalRows(box = cursor.parentNode) {
  const rows = [];
  let rowStart = 0;
  let rowLength = 0;
  let position = 0;

  for (const child of box.childNodes) {
    if (isCursor(child)) {
      continue;
    }

    if (isCha(child)) {
      for (const ch of child.textContent) {
        if (ch === '\n') {
          rows.push({ start: rowStart, length: rowLength });
          position += 1;
          rowStart = position;
          rowLength = 0;
        } else {
          position += 1;
          rowLength += 1;
        }
      }
      continue;
    }

    if (isBox(child)) {
      position += 1;
      rowLength += 1;
    }
  }

  rows.push({ start: rowStart, length: rowLength });
  return rows;
}

function getRowIndexForOffset(rows, offset) {
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (offset >= row.start && offset <= row.start + row.length) {
      return i;
    }
  }

  return rows.length - 1;
}

function getCurrentRowInfo(box = cursor.parentNode) {
  const rows = getLogicalRows(box);
  const offset = getCursorOffsetInBox(box);
  const rowIndex = getRowIndexForOffset(rows, offset);
  const row = rows[rowIndex];
  return { box, rows, rowIndex, row, offset, column: offset - row.start };
}

function getPointForOffset(box, offset) {
  const targetOffset = Math.max(0, Math.min(offset, getBoxLength(box)));
  let remaining = targetOffset;
  let lastNonCursorNode = box;

  for (const child of box.childNodes) {
    if (isCursor(child)) {
      continue;
    }

    lastNonCursorNode = child;

    if (isCha(child)) {
      const length = child.textContent.length;
      if (remaining <= length) {
        return { node: child, offset: remaining };
      }
      remaining -= length;
      continue;
    }

    if (isBox(child)) {
      if (remaining <= 1) {
        return { node: child, offset: 0 };
      }
      remaining -= 1;
    }
  }

  if (isCha(lastNonCursorNode)) {
    return { node: lastNonCursorNode, offset: lastNonCursorNode.textContent.length };
  }

  if (isBox(lastNonCursorNode)) {
    return { node: lastNonCursorNode, offset: 0 };
  }

  return { node: box, offset: 0 };
}

function isWhitespaceOnlyTextNode(node) {
  return isCha(node) && !node.textContent.includes('\n') && node.textContent.trim() === '';
}

function findBoxToEnter(direction) {
  let node = direction === 'forward' ? cursor.nextSibling : cursor.previousSibling;

  while (node) {
    if (isCursor(node)) {
      node = direction === 'forward' ? node.nextSibling : node.previousSibling;
      continue;
    }

    if (isBox(node)) {
      return isShrunkenBox(node) ? null : node;
    }

    if (!isWhitespaceOnlyTextNode(node)) {
      return null;
    }

    node = direction === 'forward' ? node.nextSibling : node.previousSibling;
  }

  return null;
}

function isLiteralDelimiterContext() {
  return isCodeBox(cursor.parentNode) || isMarkdownBox(cursor.parentNode);
}

function wrapFragmentInBox(fragment, kind = 'fragment') {
  const box = document.createElement('div');
  box.classList.add('box');
  box.dataset.clipboardKind = kind;
  box.appendChild(fragment);
  box.querySelectorAll?.('#cursor').forEach((node) => node.remove());
  return box;
}

function insertClipboardItemAtCursor(item) {
  if (!item) return;

  const kind = item.dataset.clipboardKind || 'fragment';
  if (kind === 'box') {
    insertBoxAtCursor(item);
  } else {
    insertBoxContentsAtCursor(item);
  }
}

function updateSelectionRange() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    selectionRange = null;
    return;
  }

  const range = selection.getRangeAt(0);
  const anchor = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
    ? range.commonAncestorContainer.parentNode
    : range.commonAncestorContainer;

  if (anchor && editor.contains(anchor)) {
    selectionRange = range.cloneRange();
  } else {
    selectionRange = null;
  }
}

function deleteSelectionRange(range) {
  if (!range) return;

  range.deleteContents();
  const selection = window.getSelection();
  selection?.removeAllRanges();
  moveCursorToDomPoint(range.startContainer, range.startOffset);
  selectionRange = null;

  if (isBox(cursor.parentNode)) {
    cursor.parentNode.normalize();
  }
}

function copyCurrentSelectionOrBox(removeSelection = false) {
  if (selectionRange) {
    const range = selectionRange.cloneRange();
    const fragment = removeSelection ? range.extractContents() : range.cloneContents();
    const clipBox = wrapFragmentInBox(fragment, 'fragment');
    addToClipboard(clipBox, 'fragment');

    if (removeSelection) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      moveCursorToDomPoint(range.startContainer, range.startOffset);
      selectionRange = null;
      cursor.parentNode.normalize?.();
      resetGoalColumn();
    }
    return;
  }

  if (isEditor(cursor.parentNode)) {
    return;
  }

  const currentBox = cursor.parentNode;
  if (removeSelection) {
    const removedBox = deleteCurrentBox();
    addToClipboard(removedBox, 'box');
  } else {
    const clonedBox = currentBox.cloneNode(true);
    clonedBox.dataset.clipboardKind = 'box';
    clonedBox.querySelectorAll?.('#cursor').forEach((node) => node.remove());
    addToClipboard(clonedBox, 'box');
  }
}

function copySelectionOrCurrentBox() {
  copyCurrentSelectionOrBox(false);
}

function cutSelectionOrCurrentBox() {
  copyCurrentSelectionOrBox(true);
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

// isWhitespaceChas checks if a node's text content is only whitespace and does not contain newline
function isWhitespaceChas(node) {
  return isCha(node) && !node.textContent.includes('\n') && /^\s*$/.test(node.textContent);
}

// parse out code_* class
function codeType(node) {
  if (! isBox(node)) return "";

  if (node.classList) {
    for (let i = 0; i < node.classList.length; i++) {
      const className = node.classList[i];
      if (className.indexOf("code_") === 0) {
        return className.substring(5); // may be empty string
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

// EDITOR SPI: Insert a box at the cursor position and enter it
function insertAndEnterCodeBox() {
  insertAndEnterBox(boxtype='code');
}

function insertAndEnterBox(boxtype='') {
  clearSelection();
  resetGoalColumn();
  const newBox = document.createElement('div');
  newBox.classList.add('box');
  if (boxtype) newBox.classList.add(boxtype);
  cursor.parentNode.insertBefore(newBox, cursor);
  moveCursorTo(newBox, 0);
}

// EDITOR SPI: Enter the box immediately after the cursor
//             hack: if at EOL, enter previous box
function enterNextBox() {
  resetGoalColumn();
  const nextBox = findBoxToEnter('forward') || findBoxToEnter('backward');
  if (nextBox) {
    moveCursorTo(nextBox, 0);
  }
}

// EDITOR SPI: Move the cursor out of the current box to the left and position it before the box
function exitBoxLeft() {
  const box = cursor.parentNode;
  if (box !== editor) {
    resetGoalColumn();
    placeCursorBeforeNode(box);
    console.log('Cursor moved before the current box.');
  }
}

// EDITOR SPI: Move the cursor out of the current box to the right and position it after the box
function exitBoxRight() {
  const parentBox = cursor.parentNode;
  if (parentBox !== editor) {
    resetGoalColumn();
    placeCursorAfterNode(parentBox);
    console.log('Cursor moved after the current box.');
  }
}

// EDITOR SPI: Move cursor to specified node and offset
function moveCursorTo(node, offset = 0) {
  if (!node) {
    console.error('Invalid node, cannot move cursor.');
    return;
  }

  // todo: figure out why moveCursorTo moves cursor to beginning of box/line if
  //       node===cursor, when it should do nothing.
  // Workaround here:
  if (node === cursor) {
    console.log("moveCursorTo: cursor is node, skipping");
    return;
  }

  if (isShrunkenBox(node)) {
    // todo: need to check if it is inside a shrunken box, not just toplevel
    console.log(`Cannot enter shrunken box ${node}`)
    return;
  }

  // Handle valid text nodes
  if (node.nodeType === Node.TEXT_NODE) {
    if (offset >= node.textContent.length) {
      // Move to the next sibling or append cursor if at the end of the text node
      if (node.nextSibling) {
        cursor.remove();
        node.parentNode.insertBefore(cursor, node.nextSibling);
      } else {
        cursor.remove();
        node.parentNode.appendChild(cursor);
      }
    } else {
      // Split the text node and insert the cursor
      const splitNode = node.splitText(offset);
      cursor.remove();
      node.parentNode.insertBefore(cursor, splitNode);
    }
    return;
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    if (offset < node.childNodes.length) {
      // Insert cursor before the specified child node
      const targetNode = node.childNodes[offset];
      if (targetNode !== cursor) {
        cursor.remove();
        node.insertBefore(cursor, targetNode);
      }
    } else {
      // Append cursor if offset is beyond child nodes
      if (node !== cursor) {
        cursor.remove();
        node.appendChild(cursor);
      }
    }
    return;
  }

  // Fallback: insert cursor at the parent of the node if valid
  if (node.parentNode && node !== cursor) {
    cursor.remove();
    node.parentNode.insertBefore(cursor, node);
  } else {
    console.error('Node has no valid parent or is the cursor itself, cannot move cursor.');
  }
}


// EDITOR SPI: Move cursor to start of box
function moveCursorToStartOfBox() {
  console.log('Attempting to move to the start of the current box.');
  resetGoalColumn();
  moveCursorToOffsetInBox(cursor.parentNode, 0);
}

// EDITOR SPI: Move cursor to the beginning of the current line
function moveCursorToStartOfLineInBox() {
  console.log('Moving cursor to start of line.');
  resetGoalColumn();
  const { box, row } = getCurrentRowInfo();
  moveCursorToOffsetInBox(box, row.start);
}

// EDITOR SPI: Move cursor to end of box
function moveCursorToEndOfBox() {
  console.log('Attempting to move to the end of the current box.');
  resetGoalColumn();
  const currentBox = cursor.parentNode;
  moveCursorToOffsetInBox(currentBox, getBoxLength(currentBox));
}

function findBeginningOfLine(node, offset) {
  const box = isCursor(node) ? node.parentNode : cursor.parentNode;
  const { row } = getCurrentRowInfo(box);
  return getPointForOffset(box, row.start);
}

function findEndOfLine(node, offset) {
  const box = isCursor(node) ? node.parentNode : cursor.parentNode;
  const { row } = getCurrentRowInfo(box);
  return getPointForOffset(box, row.start + row.length);
}

// EDITOR SPI: Move cursor to end of line in box
function moveCursorToEndOfLineInBox() {
  console.log('Attempting to move to the end of the current row.');
  resetGoalColumn();
  const { box, row } = getCurrentRowInfo();
  moveCursorToOffsetInBox(box, row.start + row.length);
}

// EDITOR SPI: Move cursor forward
function moveCursorForward() {
  console.log('Moving cursor forward.');
  const currentBox = cursor.parentNode;
  const currentOffset = getCursorOffsetInBox(currentBox);
  const targetOffset = Math.min(currentOffset + 1, getBoxLength(currentBox));
  resetGoalColumn();
  moveCursorToOffsetInBox(currentBox, targetOffset);
}

function getPreviousCharNode(node) {
  const currentBox = node.parentNode;
  const currentOffset = getCursorOffsetInBox(currentBox);
  if (currentOffset === 0) {
    return null;
  }
  return getPointForOffset(currentBox, currentOffset - 1);
}

function getNextCharNode(node) {
  const currentBox = node.parentNode;
  const currentOffset = getCursorOffsetInBox(currentBox);
  if (currentOffset >= getBoxLength(currentBox)) {
    return null;
  }
  return getPointForOffset(currentBox, currentOffset + 1);
}

// EDITOR SPI: Move cursor backward
function moveCursorBackward() {
  console.log('Moving cursor backward.');
  const currentBox = cursor.parentNode;
  const currentOffset = getCursorOffsetInBox(currentBox);
  const targetOffset = Math.max(currentOffset - 1, 0);
  resetGoalColumn();
  moveCursorToOffsetInBox(currentBox, targetOffset);
}

// EDITOR SPI: move cursor up within the current box, maintaining goal column
function moveCursorUp() {
  console.log('Attempting to move up.');
  const { box, rows, rowIndex, column } = getCurrentRowInfo();

  if (goalColumn === -1) {
    goalColumn = column;
  }

  if (rowIndex === 0) {
    console.log('No previous line found, staying at the current line.');
    return;
  }

  const targetRow = rows[rowIndex - 1];
  const targetOffset = targetRow.start + Math.min(goalColumn, targetRow.length);
  moveCursorToOffsetInBox(box, targetOffset);
}

// EDITOR SPI: move cursor down within the current box, maintaining goal column
function moveCursorDown() {
  console.log('Attempting to move down.');
  const { box, rows, rowIndex, column } = getCurrentRowInfo();

  if (goalColumn === -1) {
    goalColumn = column;
  }

  if (rowIndex >= rows.length - 1) {
    console.log('No next line found, staying at the current line.');
    return;
  }

  const targetRow = rows[rowIndex + 1];
  const targetOffset = targetRow.start + Math.min(goalColumn, targetRow.length);
  moveCursorToOffsetInBox(box, targetOffset);
}

// Get the current column position of the cursor
function getColumnPosition(cursorNode) {
  return getCurrentRowInfo(cursorNode.parentNode).column;
}

// EDITOR SPI: Insert character at the cursor position
function insertCharAtCursor(char) {
  clearSelection();
  let prevNode = cursor.previousSibling;
  if (isCha(prevNode)) {
    prevNode.textContent += char;
  } else {
    const textNode = document.createTextNode(char);
    cursor.parentNode.insertBefore(textNode, cursor);
  }
}

// EDITOR SPI: Insert box at the cursor position
function insertBoxAtCursor(node) {
  clearSelection();
  cursor.parentNode.insertBefore(node, cursor);
}

// EDITOR SPI: Insert box contents at the cursor position
function insertBoxContentsAtCursor(box) {
  clearSelection();
  const children = Array.from(box.childNodes);
  for (const currentNode of children) {
    if (isCursor(currentNode)) {
      continue;
    } else if (isCha(currentNode)) {
      insertTextAtCursor(currentNode.textContent);
    } else if (isBox(currentNode)) {
      insertBoxAtCursor(currentNode);
    } else {
      cursor.parentNode.insertBefore(currentNode, cursor);
    }
  }
}

// EDITOR SPI: Insert box at the cursor position
function insertTextAtCursor(text) {
  clearSelection();
  let prevNode = cursor.previousSibling;
  if (isCha(prevNode)) {
    prevNode.textContent += text;
  } else {
    const textNode = document.createTextNode(text);
    cursor.parentNode.insertBefore(textNode, cursor);
  }
}

// EDITOR SPI: Insert a newline at the cursor position
function insertNewline() {
  clearSelection();
  const textNode = document.createTextNode('\n');
  cursor.parentNode.insertBefore(textNode, cursor);
}

// EDITOR SPI: Insert quoted character at cursor position
function insertQuotedChar() {
  quoteFlag = true;
}

// EDITOR SPI: Delete character at the cursor position (Backspace)
function deleteCharAtCursor() {
  console.log('Attempting to delete character.');
  
  let prevNode = cursor.previousSibling;
  if (! prevNode) return;

  // Remove any empty text nodes before processing
  while (isCha(prevNode) && prevNode.textContent.length === 0) {
    console.log('Removing empty text node.');
    prevNode.remove();
    prevNode = cursor.previousSibling;
  }

  // If previous node is a text node, delete the last character in it
  if (isCha(prevNode)) {
    const textLen = prevNode.textContent.length;
    if (textLen > 0) {
      console.log(`Deleting character at position ${textLen - 1}.`);
      prevNode.textContent = prevNode.textContent.slice(0, -1);
      
      // If the text node becomes empty, remove it and move the cursor before it
      if (prevNode.textContent.length === 0) {
        console.log('Previous text node is now empty, removing it.');
        prevNode.remove();
      }
    } else {
      console.log('Previous text node is already empty.');
    }
  } else if (isBox(prevNode)) {
    // If box node, remove it and prepend to clipboard
    console.log('Deleting box node and clipping.');
    prevNode.remove();
    addToClipboard(prevNode);
  } else if (prevNode) {
    // If the previous node is not a text node or a box node, remove it entirely
    console.log('Deleting non-text node.');
    prevNode.remove();
  } else {
    console.log('No previous node to delete.');
  }
}

// EDITOR SPI: Delete rest of line and put in clipboard.
//             Leave newline at end of row unless cursor is before newline.
function killLine() {
  const { box, rows, rowIndex, row, offset } = getCurrentRowInfo();
  const rowEnd = row.start + row.length;

  if (offset === rowEnd && rowIndex < rows.length - 1) {
    deleteCharForward();
    return;
  }

  if (offset >= rowEnd) {
    return;
  }

  const start = getDomBoundaryForOffset(box, offset);
  const end = getDomBoundaryForOffset(box, rowEnd);
  const range = document.createRange();
  range.setStart(start.container, start.offset);
  range.setEnd(end.container, end.offset);

  const fragment = range.extractContents();
  if (!fragment.childNodes.length) {
    return;
  }

  addToClipboard(wrapFragmentInBox(fragment, 'fragment'), 'fragment');
  box.normalize();
  moveCursorToOffsetInBox(box, offset);
  resetGoalColumn();
}

async function addToClipboard(node, kind = 'fragment') {
  if (node) {
    node.dataset.clipboardKind = kind;
  }
  if (node?.children.length === 0 && node?.textContent.length === 0) return;

  const clipboard = document.getElementById('clipboard');
  clipboard.insertBefore(node, clipboard.firstChild);

  if (clipboard.children.length > MAX_CLIPBOARD_SIZE) {
    console.log(`Removing item from clipboard: ${clipboard.lastChild}`);
    clipboard.removeChild(clipboard.lastChild);
  }

  const text = serializeBox(node);
  try {
    // todo: make async better
    await navigator.clipboard.writeText(text);
  } catch (err) {
    showError(err.message);
    throw err;
  }

}

// EDITOR SPI: Pop clipboard and insert at cursor
function yank() {
  const clipboard = document.getElementById('clipboard');
  if (clipboard.firstChild) {
    const clipBox = clipboard.firstChild;
    clipboard.removeChild(clipBox);
    insertClipboardItemAtCursor(clipBox);
    resetGoalColumn();
  }
}

// EDITOR SPI: Delete character forward (Ctrl-d), including newline at EOL
//             If it was a box, prepend to clipboard
function deleteCharForward(){
  let node = cursor.nextSibling;
  if (! node) return;

  // If the next node is a text node
  if (isCha(node)) {
    if (node.textContent.length > 0) {
      // If the text node starts with a newline, remove it and join lines
      if (node.textContent.startsWith('\n')) {
        node.textContent = node.textContent.slice(1); // Remove the newline
      } else {
        // Delete one character forward
        node.textContent = node.textContent.slice(1);
      }
    } 
    // If the text node becomes empty, remove it
    if (node.textContent.length === 0) {
      node.remove();
    }
  } else if (isBox(node)) {
    // If box node, remove it and prepend to clipboard
    console.log('Deleting box node and clipping.');
    node.remove();
    addToClipboard(node);
  } else {
    // If non-text node, remove it
    node.remove();
  }
}

// EDITOR SPI: Clear the current selection
function clearSelection() {
  if (selectionRange) {
    deleteSelectionRange(selectionRange.cloneRange());
  }
  selectionRange = null;
}

// Function to display an alert for unbound keys
function showUnboundKeyAlert(key) {
  alertBox.textContent = `"${key}" is undefined`;
  alertBox.style.display = 'block';
  alertBox.style.opacity = 1;
  setTimeout(() => { alertBox.style.opacity = 0; }, 500);
  setTimeout(() => {
    alertBox.style.display = 'none';
  }, 500);
}

// Function to display a general Error alert
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

    if (event.key === 'Control' || event.key === 'Alt' || event.key === 'Shift' || event.key === 'Meta') {
      return;
    }

    if (quoteFlag) {
      insertCharAtCursor(event.key);
      event.preventDefault();
      quoteFlag = false;
      resetGoalColumn();
      return;
    }

    if (!event.ctrlKey && isLiteralDelimiterContext() && ['[', ']', '(', ')'].includes(event.key)) {
      event.preventDefault();
      insertCharAtCursor(event.key);
      resetGoalColumn();
      return;
    }

    let key = '';

    if (event.ctrlKey) key += 'Ctrl-';
    const shiftedKeys = {
      'Digit8': '*',
      'Digit5': '%',
      'Digit6': '^',
      'Digit7': '&',
      'Digit9': '(',
      'Digit0': ')',
    };

    let mainKey = event.key;
    if (event.ctrlKey && event.shiftKey && shiftedKeys[event.code]) {
      mainKey = shiftedKeys[event.code];
    }
    key += mainKey;
    console.log('Pressed key:', key);

    if (keyMap[key]) {
      event.preventDefault();
      keyMap[key]();
    } else if (event.ctrlKey) {
      event.preventDefault();
      console.log(`Unbound Ctrl combination: ${key}`);
      showUnboundKeyAlert(key);
    } else if (/^[\x20-\x7E\t]$/.test(event.key)) {
      event.preventDefault();
      insertCharAtCursor(event.key);
      resetGoalColumn();
    } else {
      event.preventDefault();
      console.log(`Unbound key: ${key}`);
      showUnboundKeyAlert(key);
    }
  } catch (e) {
    showError(e.message);
    throw e;
  }
}

// Handle mouse double clicks
function handleEditorDoubleClick(event) {
  return handleEditorClick(event, dbl=true);
}
  
// Handle mouse clicks for cursor movement, allowing movement between boxes
// Sure, here's the updated `handleEditorClick` function with the 'todo' item addressed:

// - added `event.stopPropagation();` to stop the event from propagating further when the cursor is clicked, as per the 'todo' item.
function handleEditorClick(event, dbl = false) {
  console.log('Handling mouse click.');
  const element = document.elementFromPoint(event.clientX, event.clientY);
  console.log('Element under click:', element);

  if (element === cursor) {
    console.log('Clicked on cursor.');
    event.preventDefault();
    event.stopPropagation();
  } else if (dbl) {
    handleEditorDblClick(event, element);
  } else {
    handleEditorClick2(event, element);
  }

  updateSelectionRange();
}

function handleEditorClick2(event, element) {
  if (element && editor.contains(element)) {
    console.log('Element is within editor, proceeding.');
    // Create a range at the click position
    const range = document.caretRangeFromPoint(event.clientX, event.clientY);
    if (range) {
      console.log('Range found at:', range.startContainer, 'with offset:', range.startOffset);
      // Move cursor to the clicked position, even if it's outside the current box
      moveCursorToClickedPosition(range);
    } else {
      console.log('Failed to create range from click.');
    }
  }
}

function handleEditorDblClick(event, element) {
  if (isShrunkenBox(element)) {
    unshrinkBox(element);
    handleEditorClick2(event, element);
  }
}

// Restricted variant on handleClick but for use in clipboard.
// todo: make this all better; still attach handlers to #clipboard #editor
//      is it best practice to use two ahndler functions or
//      use two levels of key/click maps?
function handleClipboardClick(event) {
  console.log('Handling clipbord mouse click.');
  const box = document.elementFromPoint(event.clientX, event.clientY);
  console.log('Box under click:', box);

  if (!box || !clipboard.contains(box))
    return;

  const newBox = clipboard.removeChild(box);
  insertClipboardItemAtCursor(newBox);

  selectionRange = null;
  resetGoalColumn();
}


// Mouse Left Click
function moveCursorToClickedPosition(range) {
  let node = range.startContainer;
  let offset = range.startOffset;

  if (node === cursor) {
    return;
  }

  if (isShrunkenBox(node)) {
    console.log(`Cannot enter shrunken box ${node}`);
    return;
  }

  resetGoalColumn();

  if (isBox(node)) {
    console.log('Clicked a box; placing cursor inside start of box.');
    moveCursorTo(node, 0);
    return;
  }

  offset = Math.max(0, Math.min(offset, node.textContent?.length ?? 0));

  if (node !== editor && node.parentNode !== cursor) {
    moveCursorTo(node, offset);
    console.log('Cursor moved to:', node, 'at offset:', offset);
  } else {
    console.log('Invalid cursor movement attempted.');
  }
}

function findLineStart(cursor) {
  const box = cursor.parentNode;
  const { row } = getCurrentRowInfo(box);
  return getPointForOffset(box, row.start);
}

function findLineEnd(cursor) {
  const box = cursor.parentNode;
  const { row } = getCurrentRowInfo(box);
  return getPointForOffset(box, row.start + row.length);
}

// EVALUATOR SPI: 
function getCurrentBoxText() {
  return serializeBox(cursor.parentNode);
}

// EVALUATOR SPI: 
function serializeBox(boxElem) {
  // todo: fix this workaround
  if (boxElem.dataset.markdown) {
    return boxElem.dataset.markdown
  } else {
    return getBoxRowsText(boxElem).join('');
  }
}

// EVALUATOR SPI: 
// todo: tidy up differences in model wrt code boxes, markdown boxes, markdown language, code language, parens, brackets, and triple-backquote
function getBoxRowsText(boxElem) {
  const parts = [];
  const children = Array.from(boxElem.childNodes);

  for (const child of children) {
    if (isCursor(child)) {
      // Skip cursor
    } else if (isCha(child)) {
      // Collect text nodes (including indentation and newlines, but not empty nodes)
      if (child.textContent !== '') {
        parts.push(child.textContent);
      }
    } else if (isBox(child)) {
      // If child is another box, recursively gather it with brackets
      let leftDelim, rightDelim;
      if (isMarkdownBox(child)) {
        leftDelim = "```" + codeType(child) + "\n";
        rightDelim = "\n```\n";
      } else {
        leftDelim = isCodeBox(child) ? '(' : '[';
        rightDelim = isCodeBox(child) ? ')' : ']';
      }
      const ser = (leftDelim + serializeBox(child).trim() + rightDelim);
      parts.push(ser);
    } else {
      // Throw error for unexpected content
        console.warn(
            `Unexpected content <${child?.tagName?.toLowerCase()}> (id=${child?.id || 'no-id'}) inside a box (box id=${boxElem.id || 'no-id'}).`
        );
        parts.push(child.outerHTML);
    }
  }

  return parts;
}

// EVALUATOR SPI: Gets text between two cursor positions, useful for selections.
function getTextBetweenPoints(start, end) {
  const parts = [];
  let currentNode = start.node;
  let done = false;

  while (currentNode && !done) {
    if (isCursor(currentNode)) {
      // Skip cursor
    } else if (isCha(currentNode)) {
      // Collect text content, slicing if partial
      const text = currentNode.textContent;
      const fromIdx = (currentNode === start.node) ? start.offset : 0;
      const toIdx = (currentNode === end.node) ? end.offset : text.length;
      parts.push(text.slice(fromIdx, toIdx));
    } else if (isBox(currentNode)) {
      parts.push(serializeBox(currentNode));
    } else {
      throw new Error(`Unexpected node type in line: ${currentNode.nodeType}`);
    }

    if (currentNode === end.node) {
      done = true;
    }

    // Move to the next sibling if not done
    if (!done) {
      currentNode = currentNode.nextSibling;
    }
  }

  return parts.join('');
}

// EVALUATOR SPI: Returns Serialized text of row as a string.
function getCurrentRowText() {
  const text = getTextBetweenPoints(findLineStart(cursor), findLineEnd(cursor));
  return text.trim()
}

// EVAL SPI: Returns the current cursor position in terms of its parent box and offset.
function getCurrentCursorPosition() {
  const currentBox = cursor.parentNode;
  const position = findCursorPositionInBox(currentBox);
  return { box: currentBox, offset: position.offset };
}

// Finds the cursor's position within a given box.
function findCursorPositionInBox(box) {
  let position = 0;
  let currentNode = box.firstChild;
  while (currentNode !== cursor) {
    if (isCha(currentNode)) {
      position += currentNode.textContent.length;
    } else if (isBox(currentNode)) {
      position++; // Account for the `[...]` representation
    }
    currentNode = currentNode.nextSibling;
  }
  return { node: currentNode, offset: position };
}

function findBoxPosition(box) {
  let position = 0;
  let inbox = box.parentNode;
  let currentNode = inbox.firstChild;
  let previousSibling = currentNode;
  while (currentNode !== box) {
    if (isCha(currentNode)) {
      position += currentNode.textContent.length;
    } else if (isBox(currentNode)) {
      position++;
    } else {
      throw new Error(`findBoxPosition: cannot parse ${currentNode}`);
    }
    previousSibling = currentNode;
    currentNode = currentNode.nextSibling;
  }
  return { node: previousSibling, offset: position };
}

// EDITOR SPI: Replaces the content of a box with the specified text, handling nested boxes.
function setBoxContent(box, newText) {
  clearBoxContent(box);
  insertTextAtCursor(newText);
}

// EDITOR SPI: Deletes the current box and moves the cursor to the parent box's boundary.
// Returns the removed box
function deleteCurrentBox() {
  notInEditor("deleteCurrentBox");
  const box = cursor.parentNode;
  const parentBox = box.parentNode;
  exitBoxRight();
  parentBox.removeChild(box);
  return box;
}

// Evaluator SPI: Sanitize dom (todo)
function sanitize_dom(v) {
  // todo: dom sanitize
  return v;
}

// Evaluator SPI: Deserialize a box string into DOM nodes
function deserializeBox(serialized) {
  // Extract markdown code blocks and replace them with temporary placeholders
  const markdownBlocks = [];
  const extractMarkdownRegex = /```(\w*)\s*\n([\s\S]*?)\s*```/g;
  const placeholderRegex = /<MARKDOWN_(\d+)>/g;

  // Replace markdown blocks with placeholders
  const tempSerialized = serialized.replace(extractMarkdownRegex, (match, lang, code) => {
    const index = markdownBlocks.length;
    markdownBlocks.push({ lang, code });
    return `<MARKDOWN_${index}>`;
  });

  // Process non-markdown parts for boxes
  const boxSerialized = tempSerialized
    .replaceAll('[', '<div class="box">')
    .replaceAll(']', '</div>');

  // leave code boxes for a future time
  // .replaceAll('(', '<div class="box code">').replaceAll(')', '</div>')

  // Restore markdown blocks
  const finalSerialized = boxSerialized.replace(placeholderRegex, (match, index) => {
    const { lang, code } = markdownBlocks[index];
    return `<div class="box code markdown code_${lang}">${code}</div>`;
  });

  // Convert to DOM nodes
  const parser = new DOMParser();
  const doc = parser.parseFromString(finalSerialized, 'text/html');
  const box = document.createElement('div');
  box.classList.add('box');

  // Process children
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



// EDITOR SPI: Shrinks current box
function shrinkBox() {
  const node = cursor.parentNode;
  notInEditor('Cannot shrink');
  if (! isBox(node)) {
    throw new Error(`shrinkBox: not a box: ${node}`);
  }
  node.classList.add('shrunken');
  node.classList.remove('fullsize');
  exitBoxRight()
}

// EDITOR SPI: Unshrinks current box
function unshrinkBox(node) {
  notInEditor('Cannot unshrink');
  if (! isBox(node)) {
    throw new Error(`shrinkBox: not a box: ${node}`);
  }
  if (node.classList?.contains('shrunken')) {
      node.classList.remove('fullsize')
      node.classList.remove('shrunken')
      exitBoxRight()
  }
}

function toggleCurrentBoxExpansion() {
    notInEditor('Cannot unshrink');
    console.log("toggleCurrentBoxExpansion");
    let box = cursor.parentNode;
    box.classList.remove('shrunken')
    if (!box.classList.contains("fullsize")) {
        console.log("toggleCurrentBoxExpansion: expanding");
        box.classList.add("fullsize");
    } else {
        console.log("toggleCurrentBoxExpansion: unexpanding");
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

// EDITOR SPI: Sets the cursor position based on a specified object `{ node, offset }`.
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
	console.log(`toggleTheme: ${themes[nextIndex].id}`);
        themes.forEach((theme, index) => {
            document.getElementById(theme.id).disabled = index !== nextIndex;
        });
    } else {
        console.error("toggleTheme: cannot figure out current theme; using first");
        document.getElementById(themes[0].id).disabled = false;
    }
}

function addToMenu(label, fun, keyBinding) {
  const topMenus = document.getElementById('top-menus');

  // Start with separator
  topMenus.appendChild(document.createTextNode(' | '));

  // Create a new anchor element
  const menuItem = document.createElement('a');
  menuItem.href = '#';
  menuItem.onclick = fun;
  menuItem.title = keyBinding;
  menuItem.textContent = label;
  // Append the new menu item to the top menus
  topMenus.appendChild(menuItem);
  console.log(topMenus.outerHTML);
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

// Add editor event listeners
editor.addEventListener('keydown', handleKeydown);
editor.addEventListener('click', handleEditorClick);
editor.addEventListener('dblclick', handleEditorDoubleClick);
editor.addEventListener('mouseup', updateSelectionRange);
document.addEventListener('selectionchange', updateSelectionRange);

// Add clipboard event listeners
clipboard.addEventListener('click', handleClipboardClick);


// Set initial focus
editor.focus();
