// boxy.js

const clipboard = document.getElementById('clipboard');
const editor = document.getElementById('editor');
const cursor = document.getElementById('cursor');
const alertBox = document.getElementById('alert-box');
const MAX_CLIPBOARD_SIZE = 20;
let goalColumn = -1; // Initialize goal column
let selectionRange = null;
let quoteFlag = false;

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
  const newBox = document.createElement('div');
  newBox.classList.add('box');
  if (boxtype) newBox.classList.add(boxtype);
  cursor.parentNode.insertBefore(newBox, cursor);
  moveCursorTo(newBox, 0);
}

// EDITOR SPI: Enter the box immediately after the cursor
//             hack: if at EOL, enter previous box
function enterNextBox() {
  let nextNode = cursor.nextSibling;
  // todo: this does not account for multiple whitespace nodes before or after cursor
  if (! nextNode || (isWhitespaceChas(nextNode))) {
    moveCursorTo(cursor.previousSibling, 0);
    return
  }
  
  // keep going forward whitespace nodes until you reach a box or eol
  while (! isBox(nextNode) && isWhitespaceChas(nextNode)) {
    nextNode = nextNode.nextSibling;
  }
  if (isBox(nextNode)) {
    moveCursorTo(nextNode, 0);
  }
}

// EDITOR SPI: Move the cursor out of the current box to the left and position it before the box
function exitBoxLeft() {
  const box = cursor.parentNode;
  if (box !== editor) {
    exitBoxRight();
    moveCursorBackward();
    console.log('Cursor moved before the current box.');
  }
}

// EDITOR SPI: Move the cursor out of the current box to the right and position it after the box
function exitBoxRight() {
  const parentBox = cursor.parentNode;
  if (parentBox !== editor) {
    cursor.remove()
    parentBox.parentNode.insertBefore(cursor, parentBox.nextSibling);
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
  // Move the cursor to the start of the first child of the current box
  moveCursorTo(cursor.parentNode.firstChild, 0);
}


// EDITOR SPI: Move cursor to the beginning of the current line
// hacky implementation
function moveCursorToStartOfLineInBox() {
  console.log('Moving cursor to start of line.');
  
  while (true) {
    let prevChar = getPreviousCharNode(cursor);
    
    if (!prevChar) {
      console.log('Reached beginning of buffer.');
      break;
    }

    let { node, offset } = prevChar;
    
    // Stop if we encounter a newline character
    if (node.nodeType === Node.TEXT_NODE && node.textContent[offset] === '\n') {
      console.log('Reached beginning of line.');
      break;
    }

    moveCursorBackward();
  }
}

// EDITOR SPI: Move cursor to end of box
function moveCursorToEndOfBox() {
  console.log('Attempting to move to the end of the current box.');
  const currentBox = cursor.parentNode;
  const lastChild = currentBox.lastChild;
  if (lastChild && lastChild.nodeType === Node.TEXT_NODE) {
    const textLen = lastChild.textContent.length;
    moveCursorTo(lastChild, textLen);
  } else {
    // If the last child is an element node, move to its end
    moveCursorTo(lastChild, lastChild?.textContent.length ?? 0);
  }
}

// todo: write this function
// function findBeginningOfLine(node, offset) {
//   let currentNode = node;
//   let currentOffset = offset;
// 
//   while (currentNode) {
//     if (isCursor(currentNode)) {
//       currentNode = currentNode.previousSibling;
//     } else if (isCha(currentNode)) {
//       // If the current node is a text node, search backward for a newline character
//       const newlineIndex = currentNode.textContent.lastIndexOf('\n', currentOffset - 1);
//       if (newlineIndex !== -1) {
//         // Found a newline character, the beginning of the line is just after this newline
//         return { node: currentNode, offset: newlineIndex + 1 };
//       } else {
//         // No newline found in this text node, continue to the previous sibling
//         if (currentNode.previousSibling) {
//           currentOffset = currentNode.previousSibling.textContent.length;
//           currentNode = currentNode.previousSibling;
//         } else {
//           // If there are no previous siblings, the beginning of the line is at the start of this text node
//           return { node: currentNode, offset: 0 };
//         }
//       }
//     } else if (isBox(currentNode)) {
//       currentNode = currentNode.previousSibling;
//     } else {
//       currentNode = currentNode.previousSibling;
//     }
//   }
// 
//   // If we reach here, the beginning of the line is at the start of the parent box
//   return { node: node.parentNode, offset: 0 };
// }

function findBeginningOfLine(node, offset) {
  let currentNode = node;
  let currentOffset = offset;

  while (currentNode) {
    if (isCursor(currentNode)) {
      currentNode = currentNode.previousSibling;
    } else if (isCha(currentNode)) {
      // Search backward for a newline character
      const newlineIndex = currentNode.textContent.lastIndexOf('\n', currentOffset - 1);
      if (newlineIndex !== -1) {
        return { node: currentNode, offset: newlineIndex + 1 };
      } else {
        // No newline found, continue to the previous sibling
        if (currentNode.previousSibling) {
          currentOffset = currentNode.previousSibling.textContent.length;
          currentNode = currentNode.previousSibling;
        } else {
          // If no previous siblings, the beginning is at the start of this node
          return { node: currentNode, offset: 0 };
        }
      }
    } else if (isBox(currentNode)) {
      // Move to the previous sibling if it exists, otherwise we are at beginning of box
      // so return { currentNode, offset: none}
      if (currentNode.previousSibling) {
	currentNode = currentNode.previousSibling;
      } else {
	return { node: currentNode, offset: null };
      }
    } else {
      // Handle unexpected node types
      currentNode = currentNode.previousSibling;
    }

    // Check for null or undefined to avoid infinite loops
    if (!currentNode) {
      break;
    }
  }

  // If no previous sibling or valid start found, return the parent node with offset 0
  return { node: node.parentNode, offset: 0 };
}

function findEndOfLine(node, offset) {
  let currentNode = node;
  let currentOffset = offset;
  let lastChild = currentNode;

  while (currentNode) {
    if (isCursor(currentNode)) {
      if (currentNode.nextSibling === null) {
        console.log(`reached cursor and no next sibling; lastChild=${lastChild}`);
        return { node: lastChild, offset: 0 };
      }
    } else if (isBox(currentNode)) {
      if (currentNode.nextSibling === null) {
        // workaround: if there is no text after the box at the end insert a space
        currentNode.insertAdjacentText('afterend', ' ');
        const textNode = currentNode.nextSibling;
        console.log(`reached box and no nextsibling; currentNode=${currentNode} textNode=${textNode}`);
        return { node: textNode, offset: 0 };
      }
    } else if (isCha(currentNode)) {
      const newlineIndex = currentNode.textContent.indexOf('\n', currentOffset);
      if (newlineIndex !== -1) {
        return { node: currentNode, offset: newlineIndex };
      }
      currentOffset = 0;
    } else {
      currentOffset = 0;
    }
    lastChild = currentNode;
    currentNode = currentNode.nextSibling;
  }

  offset=lastChild.textContent?.length || 0;
  console.log(`fell off end lastChild=${lastChild} offset=${offset}`)
  return { node: lastChild, offset: offset };
}

// EDITOR SPI: Move cursor to the start of the current box
function moveCursorToStartOfBox() {
  console.log('Attempting to move to the start of the current box.');
  let firstChild = cursor.parentNode.firstChild;

  if (isBox(firstChild)) {
    // If first child is a box, place cursor before it instead of inside
    cursor.parentNode.insertBefore(cursor, firstChild);
  } else {
    moveCursorTo(firstChild, 0);
  }
}

// EDITOR SPI: Move cursor to end of line in box
function moveCursorToEndOfLineInBox() {
  console.log('Attempting to move to the end of the current row.');
  const currentBox = cursor.parentElement;

  // Find the end of the current line
  const endOfLine = findEndOfLine(cursor, 0);

  // Move the cursor to the end of the line
  if (endOfLine.node) {
    moveCursorTo(endOfLine.node, endOfLine.offset);
    console.log('Cursor moved to the end of the line:', endOfLine);
  } else {
    console.error('Unable to find the end of the line.');
  }
}

// EDITOR SPI: Move cursor forward
function moveCursorForward() {
  console.log('Moving cursor forward.');
  let nextChar = getNextCharNode(cursor);

  if (!nextChar) {
    console.log('Cursor is at the end.');
    return;
  }

  let { node, offset } = nextChar;
  cursor.parentNode.removeChild(cursor); // Remove cursor from current position

  if (node.nodeType === Node.ELEMENT_NODE) {
    // If the next node is a box, move cursor after the box
    node.parentNode.insertBefore(cursor, node.nextSibling);
  } else {
    // If the next node is a text node, insert cursor at the correct offset
    if (offset >= node.textContent.length) {
      node.parentNode.insertBefore(cursor, node.nextSibling);
    } else {
      let splitNode = node.splitText(offset + 1);
      node.parentNode.insertBefore(cursor, splitNode);
    }
  }
}

function getPreviousCharNode(node) {
  let prevNode = node.previousSibling;
  let offset = 0;

  while (prevNode) {
    if (prevNode.nodeType === Node.ELEMENT_NODE) {
      if (prevNode.classList.contains('box')) {
        return { node: prevNode, offset: 0 }; // Treat the entire box as a single character
      }
    } else if (prevNode.nodeType === Node.TEXT_NODE) {
      if (prevNode.textContent.length > 0) {
        return { node: prevNode, offset: prevNode.textContent.length - 1 }; // Move to the end of the text node
      }
    }
    prevNode = prevNode.previousSibling;
  }

  return null; // No previous character found
}

function getNextCharNode(node) {
  let nextNode = node.nextSibling;
  let offset = 0;

  while (nextNode) {
    if (nextNode.nodeType === Node.ELEMENT_NODE) {
      if (nextNode.classList.contains('box')) {
        return { node: nextNode, offset: 0 }; // Treat the entire box as a single character
      }
    } else if (nextNode.nodeType === Node.TEXT_NODE) {
      if (nextNode.textContent.length > 0) {
        return { node: nextNode, offset: 0 }; // Move to the start of the text node
      }
    }
    nextNode = nextNode.nextSibling;
  }

  return null; // No next character found
}

// EDITOR SPI: Move cursor backward
function moveCursorBackward() {
  console.log('Moving cursor backward.');
  let prevChar = getPreviousCharNode(cursor);

  if (!prevChar) {
    console.log('Cursor is at the start.');
    return;
  }

  let { node, offset } = prevChar;
  cursor.parentNode.removeChild(cursor); // Remove cursor from current position

  if (node.nodeType === Node.ELEMENT_NODE) {
    // If the previous node is a box, place cursor before the box
    node.parentNode.insertBefore(cursor, node);
  } else {
    // If the previous node is a text node, insert cursor at the correct offset
    if (offset < 0) {
      node.parentNode.insertBefore(cursor, node);
    } else {
      let splitNode = node.splitText(offset);
      node.parentNode.insertBefore(cursor, splitNode);
    }
  }
}

// EDITOR SPI: move cursor up within the current box, maintaining goal column
function moveCursorUp() {
  console.log('Attempting to move up.');
  const currentColumn = getColumnPosition(cursor);
  if (goalColumn === -1 || currentColumn !== goalColumn) {
    goalColumn = currentColumn;
  }
  let prevNode = cursor.previousSibling;
  // Traverse backward to find a line break or start of text node
  while (prevNode) {
    if (isCha(prevNode) && prevNode.textContent.includes('\n')) {
      const lineEnd = prevNode.textContent.lastIndexOf('\n');
      const targetColumn = Math.min(goalColumn, lineEnd);
      console.log(`Moving up to previous line at column ${targetColumn}.`);
      moveCursorTo(prevNode, targetColumn);
      return;
    }
    prevNode = prevNode.previousSibling;
  }
  console.log('No previous line found, staying at the current line.');
}

// EDITOR SPI: move cursor down within the current box, maintaining goal column
function moveCursorDown() {
  console.log('Attempting to move down.');
  const currentColumn = getColumnPosition(cursor);
  if (goalColumn === -1 || currentColumn !== goalColumn) {
    goalColumn = currentColumn;
  }
  let nextNode = cursor.nextSibling;
  // Traverse forward to find a line break or start of the next text node
  while (nextNode) {
    if (isCha(nextNode) && nextNode.textContent.includes('\n')) {
      const lineStart = nextNode.textContent.indexOf('\n') + 1;
      const targetColumn = Math.min(goalColumn, nextNode.textContent.length - lineStart);
      console.log(`Moving down to next line at column ${targetColumn}.`);
      moveCursorTo(nextNode, lineStart + targetColumn);
      return;
    }
    nextNode = nextNode.nextSibling;
  }
  console.log('No next line found, staying at the current line.');
}

// Get the current column position of the cursor
function getColumnPosition(cursorNode) {
  // Ensure the cursorNode is valid
  if (!cursorNode || !cursorNode.parentNode) {
    console.error('Invalid cursor node.');
    return 0;
  }

  let column = 0;

  // Traverse all siblings before the cursor to calculate the column position
  let currentNode = cursorNode.parentNode.firstChild;
  while (currentNode && currentNode !== cursorNode) {
    if (isCha(currentNode)) {
      // Add the length of the text node
      column += currentNode.textContent.length;
    } else if (isBox(currentNode)) {
      // Treat each box as a single character for column calculation
      column += 1;
    }
    currentNode = currentNode.nextSibling;
  }

  // If the cursor is inside a text node, add the offset within that text node
  if (isCha(cursorNode.previousSibling)) {
    const prevTextNode = cursorNode.previousSibling;
    column += prevTextNode.textContent.length;
  }

  return column;
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
  let currentNode = box.firstChild;
  while (currentNode) {
    if (isCursor(currentNode)) {
      // skip cursor
    } else if (isCha(currentNode)) {
      insertTextAtCursor(currentNode.textContent);
    } else if (isBox(currentNode)) {
      insertBoxAtCursor(currentNode);
    } else {
      cursor.parentNode.insertBefore(currentNode, cursor);
    }
    currentNode = currentNode.nextSibling;
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
  const lineEnd = findEndOfLine(cursor, 0);
  if ((cursor.nextSibling === lineEnd.node) && lineEnd.node?.textContent === '\n') {
    deleteCharForward();
  } else {
    const newBox = document.createElement('div');
    newBox.classList.add('box');
    
    while (cursor.nextSibling !== null) {
      const node = cursor.nextSibling;
      if (node === lineEnd.node) {
	newBox.insertBefore(document.createTextNode(node.textContent.slice(0, lineEnd.offset)), null);
	node.textContent = node.textContent.slice(lineEnd.offset);
	break;
      }
      node.remove();
      newBox.insertBefore(node, null);
    }
    addToClipboard(newBox);
  }
}

function addToClipboard(node) {
  if (node?.children.length === 0 && node?.textContent.length === 0) return;

  const clipboard = document.getElementById('clipboard');
  clipboard.insertBefore(node, clipboard.firstChild);

  if (clipboard.children.length > MAX_CLIPBOARD_SIZE) {
    console.log(`Removing item from clipboard: ${clipboard.lastChild}`);
    clipboard.removeChild(clipboard.lastChild);
  }
}

// EDITOR SPI: Pop clipboard and insert at cursor
function yank() {
  const clipboard = document.getElementById('clipboard');
  if (clipboard.firstChild) {
    const clipBox = clipboard.firstChild;
    clipboard.removeChild(clipBox);
    insertBoxAtCursor(clipBox);
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
    selectionRange.deleteContents();
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
    // Avoid intercepting the Mac "Command" key
    if (event.metaKey) return;

    // Check if a modifier key is pressed alone
    if (event.key === "Control" || event.key === "Alt" || event.key === "Shift" || event.key === "Meta") {
      return;
    }

    // if quote, just insert the key
    if (quoteFlag) {
      insertCharAtCursor(event.key);
      event.preventDefault();
      quoteFlag = false;
      return;
    }

    let key = '';

    if (event.ctrlKey) key += 'Ctrl-';
    const shiftedKeys = {
      'Digit8': '*',  // Ctrl-Shift-8 -> Ctrl-*
      'Digit5': '%',  // Ctrl-Shift-5 -> Ctrl-%
      'Digit6': '^',  // Ctrl-Shift-6 -> Ctrl-^
      'Digit7': '&',  // Ctrl-Shift-7 -> Ctrl-&
      'Digit9': '(',  // Ctrl-Shift-9 -> Ctrl-(
      'Digit0': ')',  // Ctrl-Shift-0 -> Ctrl-)
    };

    let mainKey = event.key;
    if (event.ctrlKey && event.shiftKey && shiftedKeys[event.code]) {
      mainKey = shiftedKeys[event.code];
    }
    key += mainKey;
    console.log('Pressed key:', key);

    // Check if the key is in the key map
    if (keyMap[key]) {
      event.preventDefault();
      keyMap[key](); // Execute the mapped function
    } else if (event.ctrlKey) {
      // Handle unbound Ctrl combinations
      event.preventDefault();
      console.log(`Unbound Ctrl combination: ${key}`);
      showUnboundKeyAlert(key);
    } else if (/^[\x20-\x7E\t]$/.test(event.key)) {
      // Handle self-inserting characters (printable ASCII including space and tab)
      event.preventDefault();
      insertCharAtCursor(event.key);
    } else {
      // Show alert for other unbound special keys
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
  // Get the element under the click
  const element = document.elementFromPoint(event.clientX, event.clientY);
  console.log('Element under click:', element);

  // if it's the cursor, do not do processing, just clear selection range
  // also not cursor is :disabled so it should never be clickable
  if (element === cursor) {
    console.log('Clicked on cursor.');
    // prevent the window.cursor from moving
    event.preventDefault();
    event.stopPropagation();
  } else if (dbl) {
    handleEditorDblClick(event, element);
  } else {
    handleEditorClick2(event, element);
  }

  selectionRange = null; // Clear any existing selection
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

  let newBox = clipboard.removeChild(box);
  // newBox = deserializeBox(serializeBox(box))

  insertBoxAtCursor(newBox);

  selectionRange = null; // Clear any existing selection
}


// Mouse Left Click
function moveCursorToClickedPosition(range) {
  let node = range.startContainer;
  let offset = range.startOffset;

  // If we clicked in the same spot, do nothing.
  if (node === cursor) {
    return;
  }

  // Avoid entering shrunken boxes
  // todo: user can still erroneously enter nested shrunken boxes if you click just inside one
  //       could use a boxtop to display over a shrunken box, once we have boxtops.
  if (isShrunkenBox(node)) {
    console.log(`Cannot enter shrunken box ${node}`)
    return;
  }

  // Check if the clicked node is the editor box or contains text
  if (isBox(node)) {
    console.log('Clicked a box; placing cursor inside start of box.');
    moveCursorTo(node, 0);
    return;
  }

  // Adjust the offset to avoid unexpected jumps
  offset = Math.max(0, Math.min(offset, node.textContent?.length ?? 0));

  // Move cursor to the specified position, ensuring it is not invalid
  if (node !== editor && node.parentNode !== cursor) {
    moveCursorTo(node, offset);
    console.log('Cursor moved to:', node, 'at offset:', offset);
  } else {
    console.log("Invalid cursor movement attempted.");
  }
}

function findLineStart(cursor) {
  // We'll mimic moveCursorToStartOfLineInBox, but *just return* the node & offset
  // instead of moving the real cursor.

  let node = cursor.previousSibling;
  while (node) {
    if (isCha(node)) {
      const lineBreakIndex = node.textContent.lastIndexOf('\n');
      if (lineBreakIndex !== -1) {
        // The line starts just after that newline
        return { node, offset: lineBreakIndex + 1 };
      }
    }
    node = node.previousSibling;
  }
  // If no line break found, the line starts at the very first child of this box
  const box = cursor.parentNode;
  if (!box.firstChild) {
    // Box is empty?
    return { node: box, offset: 0 };
  }
  // If the first child is a text node, we start at offset 0
  return { node: box.firstChild, offset: 0 };
}

function findLineEnd(cursor) {
  console.log('Attempting to find the end of the current line.');
  let currentNode = cursor;
  let offset = 0;

  // Start from the cursor and move forward through siblings
  while (currentNode) {
    if (isCha(currentNode)) {
      const lineBreakIndex = currentNode.textContent.indexOf('\n');
      if (lineBreakIndex !== -1) {
        // Found a newline, return the position before the newline
        return { node: currentNode, offset: lineBreakIndex };
      } else {
        // No newline, continue to next sibling
        currentNode = currentNode.nextSibling;
      }
    } else if (isBox(currentNode)) {
      // Treat boxes as single units and skip over them
      currentNode = currentNode.nextSibling;
    } else {
      // Unexpected node type, skip it
      currentNode = currentNode.nextSibling;
    }
  }

  // If no newline is found, return the end of the last node in the box
  const lastNode = cursor.parentNode.lastChild;
  if (isCha(lastNode)) {
    return { node: lastNode, offset: lastNode.textContent.length };
  } else if (lastNode) {
    return { node: lastNode, offset: lastNode.textContent?.length || 0 };
  }

  // Fallback: Return the parent box itself
  return { node: cursor.parentNode, offset: 0 };
}

// EVALUATOR SPI: 
function getCurrentBoxText() {
  return serializeBox(cursor.parentNode);
}

// EVALUATOR SPI: 
function serializeBox(boxElem) {
  return getBoxRowsText(boxElem).join('');
}

// EVALUATOR SPI: 
// todo: tidy up differences in model wrt code boxes, markdown boxes, markdown language, code language, () and [] and ```
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
            `Unexpected content <${child.tagName.toLowerCase()}> (id=${child.id || 'no-id'}) inside a box (box id=${boxElem.id || 'no-id'}).`
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

// Add clipboard event listeners
clipboard.addEventListener('click', handleClipboardClick);


// Set initial focus
editor.focus();
