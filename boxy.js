// boxy.js

const editor = document.getElementById('editor');
const cursor = document.getElementById('cursor');
const alertBox = document.getElementById('alert-box');
let goalColumn = -1; // Initialize goal column
let clipboard = ""; // For cut/copy/paste operations
let selectionRange = null;
let quoteFlag = false;

/** * Box Commands */

function isShrunkenBox(node) {
  return isBox(node) && node.classList?.contains('shrunken');
}

function isCodeBox(node) {
  return isBox(node) && node.classList?.contains('code');
}

function isBox(node) {
  return (node?.nodeType === Node.ELEMENT_NODE && node.classList?.contains('box'));
}

function isCursor(node) {
  return (node === cursor);
}

function isCha(node) {
  return (node?.nodeType === Node.TEXT_NODE);
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
function enterNextBox() {
  const nextNode = cursor.nextSibling;
  if (isBox(nextNode)) {
    moveCursorTo(nextNode, 0);
  }
}

// EDITOR SPI: Move the cursor out of the current box to the left and position it before the box
function exitBoxLeft() {
  const parentBox = cursor.parentNode;
  if (parentBox !== editor) {
    moveCursorTo(parentBox, 0);
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

  if (isShrunkenBox(node)) {
    console.log(`Cannot enter shrunken box ${node}`)
    return;
  }

  // Handle empty text nodes: remove them and continue
  if (node.nodeType === Node.TEXT_NODE && node.textContent === "") {
    const parentNode = node.parentNode;
    if (parentNode) {
      parentNode.removeChild(node); // Remove the empty text node
      moveCursorTo(parentNode, offset); // Retry with the parent node
    }
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

  // Handle element nodes
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

// EDITOR SPI: Move cursor to start of line in box
function moveCursorToStartOfLineInBox() {
  console.log('Attempting to move to the start of the current row.');
  const result = findBeginningOfLine(cursor, 0);
  if (result) {
    console.log(`Moving to start of current row at column ${result.offset}.`);
    moveCursorTo(result.node, result.offset);
  }
}

// EDITOR SPI: Find location of beginning of line
function findBeginningOfLine(node, offset) {
  const parentNode = node.parentNode; // Store the parent node upfront
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const lineBreakIndex = node.textContent.lastIndexOf('\n', offset);
      if (lineBreakIndex !== -1) {
        return { node: node, offset: lineBreakIndex + 1 };
      }
    }
    node = node.previousSibling;
    if (node && node.nodeType === Node.TEXT_NODE) {
      offset = node.textContent.length;
    }
  }
  // If no line break found, return the start of the first node in the parent
  return { node: parentNode.firstChild, offset: 0 };
}

// EDITOR SPI: Find location of end of line
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

function moveCursorForward() {
  console.log('Moving cursor forward.');
  let nextNode = cursor.nextSibling;
  
  while (nextNode) {
    if (isBox(nextNode)) {
      console.log('Skipping over a box.');
      let afterBoxNode = nextNode.nextSibling;
      if (afterBoxNode) {
        moveCursorTo(afterBoxNode, 0);
      } else {
        moveCursorTo(nextNode.parentNode, Array.from(nextNode.parentNode.childNodes).indexOf(nextNode) + 1);
      }
      return;
    }
    if (isCha(nextNode) && nextNode.textContent.length > 0) {
      moveCursorTo(nextNode, 1);
      return;
    }
    nextNode = nextNode.nextSibling;
  }
  console.log('At the end of the container, placing cursor at end.');
  moveCursorTo(cursor.parentNode, cursor.parentNode.childNodes.length);
}

function moveCursorBackward() {
  console.log('Moving cursor backward.');
  let prevNode = cursor.previousSibling;
  
  while (prevNode) {
    if (isBox(prevNode)) {
      console.log('Skipping over a box.');
      let beforeBoxNode = prevNode.previousSibling;
      if (beforeBoxNode) {
        moveCursorTo(beforeBoxNode, beforeBoxNode.textContent?.length || 0);
      } else {
        moveCursorTo(prevNode.parentNode, Array.from(prevNode.parentNode.childNodes).indexOf(prevNode));
      }
      return;
    }
    if (isCha(prevNode) && prevNode.textContent.length > 0) {
      moveCursorTo(prevNode, prevNode.textContent.length - 1);
      return;
    }
    prevNode = prevNode.previousSibling;
  }
  console.log('At the beginning of the container, placing cursor at start.');
  moveCursorTo(cursor.parentNode, 0);
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
    const prevText = cursorNode.previousSibling;
    return prevText ? prevText.textContent.length : 0;
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

// EDITOR SPI: Insert text at the cursor position
function insertBoxAtCursor(node) {
  clearSelection();
  cursor.parentNode.insertBefore(node, cursor);
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
  } else if (prevNode) {
    // If the previous node is not a text node, remove it entirely
    console.log('Deleting non-text node.');
    prevNode.remove();
  } else {
    console.log('No previous node to delete.');
  }
}

// EDITOR SPI: Kill line (Ctrl-k) - Delete from cursor to end of line or join if at newline
// todo: make sure cursor is never removed, or at least add it back at the point
function killLine() {
  let node = cursor.nextSibling;
  if (isCha(node) && node.textContent && node.textContent[0] == '\n') {
    deleteCharForward();
  } else {
    while (node) {
      if (isCha(node)) {
	const newlineIndex = node.textContent.indexOf('\n');
	if (newlineIndex !== -1) {
          // Found a newline, slice it out and stop further processing
          node.textContent = node.textContent.slice(newlineIndex);
          break;
	} else {
          // Remove the entire text node if no newline
          const nextNode = node.nextSibling;
          node.remove();
          node = nextNode;
	}
      } else {
	// Remove non-text nodes and move to the next sibling
	const nextNode = node.nextSibling;
	node.remove();
	node = nextNode;
      }
    }
  }
}

// EDITOR SPI: Delete character forward (Ctrl-d), including newline at EOL
function deleteCharForward() {
  let node = cursor.nextSibling;
  if (! node) return;

  // If the next node is a text node
  if (isCha(node)) {
    if (node.textContent.length > 0) {
      // Delete one character forward
      node.textContent = node.textContent.slice(1);
      // If the text node becomes empty, remove it
      if (node.textContent.length === 0) {
        node.remove();
      }
    } else {
      node.remove(); // If empty, just remove the node
    }
  }
  // If the next node is a newline, delete and join lines
  if (node && node.textContent.startsWith('\n')) {
    node.textContent = node.textContent.slice(1); // Remove the newline
  } else if (node) {
    node.remove(); // If non-text node, remove it
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
      keyMap[key](); // Execute the mapped function
      event.preventDefault();
    } else if (event.ctrlKey) {
      // Handle unbound Ctrl combinations
      console.log(`Unbound Ctrl combination: ${key}`);
      showUnboundKeyAlert(key);
      event.preventDefault();
    } else if (/^[\x20-\x7E\t]$/.test(event.key)) {
      // Handle self-inserting characters (printable ASCII including space and tab)
      insertCharAtCursor(event.key);
      event.preventDefault();
    } else {
      // Show alert for other unbound special keys
      console.log(`Unbound key: ${key}`);
      showUnboundKeyAlert(key);
      event.preventDefault();
    }
  } catch (e) {
    showError(e.message);
    throw e;
  }
}

// Handle mouse double clicks
function handleDoubleClick(event) {
  return handleClick(event, dbl=true);
}
  
// Handle mouse clicks for cursor movement, allowing movement between boxes
function handleClick(event, dbl=false) {
  console.log('Handling mouse click.');
  // Get the element under the click
  const element = document.elementFromPoint(event.clientX, event.clientY);
  console.log('Element under click:', element);

  // if it's the cursor, do not do processing, just clear selection range
  if (element === cursor) {
    console.log('Clicked on cursor.');
  } else if (dbl && isShrunkenBox(element)) {
    unshrinkBox(element);
    handleClick(event, dbl=false);
  } else {
    // Check if the element is within the editor
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
    } else {
      console.log('Clicked element is not within the editor.');
    }
  }

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

// Helper function to find the nearest parent or sibling text node
function findParentOrSiblingTextNode(element) {
  console.log('Finding nearest parent or sibling text node.');
  // If the element is already a text node, return it
  if (isCha(element)) {
    return element;
  }
  // Try finding a sibling text node
  let sibling = element.nextSibling || element.previousSibling;
  while (sibling) {
    if (isCha(sibling)) {
      return sibling;
    }
    sibling = sibling.nextSibling || sibling.previousSibling;
  }
  // If no sibling text node is found, move up to the parent
  return element.parentNode ? findParentOrSiblingTextNode(element.parentNode) : null;
}

// Helper function to calculate offset within a text node based on click position
function getOffsetInNode(node, clientX, clientY) {
  console.log('Calculating offset in text node:', node);
  if (isCha(node)) {
    console.log('Node is a text node. Calculating offset.');
    // Calculate character offset for text nodes
    const range = document.createRange();
    range.setStart(node, 0);
    range.collapse(true);
    let offset = 0;
    let rects = range.getClientRects();
    while (offset < node.textContent?.length && rects.length > 0) {
      const rect = rects[0];
      console.log(`Offset: ${offset}, Rect:`, rect);
      if (clientX < rect.right && clientY < rect.bottom) {
        console.log('Cursor position found within rect.');
        break;
      }
      offset++;
      range.setStart(node, offset);
      range.collapse(true);
      rects = range.getClientRects();
    }
    console.log('Final offset:', offset);
    return offset;
  }
  // Default to 0 if not a text node
  return 0;
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
  return getBoxText(cursor.parentNode);
}

// EVALUATOR SPI: 
function getCurrentBoxRowsText() {
  return getBoxRowsText(cursor.parentNode);
}

// EVALUATOR SPI: 
function getBoxText(boxElem) {
  const rows = getBoxRowsText(boxElem);
  return rows.join('');
}

// EVALUATOR SPI: 
function getBoxRowsText(boxElem) {
  const parts = [];
  boxElem.childNodes.forEach(child => {
    if (isCursor(child)) {
      // Skip cursor
    } else if (isCha(child)) {
      // Collect text nodes (including newlines)
      parts.push(child.textContent);
    } else if (isBox(child)) {
      // If child is another box, recursively gather it with brackets
      let left_delim = isCodeBox(child) ? '(' : '[';
      let right_delim = isCodeBox(child) ? ')' : ']';
      parts.push(left_delim + getBoxText(child) + right_delim);
    } else {
      // Throw error for unexpected content
      throw new Error(
        `Unexpected content <${child.tagName.toLowerCase()}> inside a box (id=${child.id || 'no-id'}).`
      );
    }
  });

  return parts;
}

// EVALUATOR SPI: Gets text between two cursor positions, useful for selections.
function getTextBetweenCursors(start, end) {
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

      // Stop if this is the end node
      if (currentNode === end.node) {
        done = true;
      }
    } else if (isCodeBox(currentNode)) {
      parts.push('(' + getBoxText(currentNode) + ')');
      if (currentNode === end.node) {
        done = true;
      }
    } else if (isBox(currentNode)) {
      let left_delim = isCodeBox(currentNode) ? '(' : '[';
      let right_delim = isCodeBox(currentNode) ? ')' : ']';
      parts.push(left_delim + getBoxText(currentNode) + right_delim);
      if (currentNode === end.node) {
        done = true;
      }
    } else {
      throw new Error(`Unexpected node type in line: ${currentNode.nodeType}`);
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
  // 1. Find the start of the line
  // 2. Find the end of the line
  // 3. Gather text from start to end
  const text = getTextBetweenCursors(findLineStart(cursor), findLineEnd(cursor));
  // 4. trim
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

// EDITOR SPI: Replaces the content of a box with the specified text, handling nested boxes.
function setBoxContent(box, newText) {
  clearBoxContent(box);
  insertTextAtCursor(newText);
}

// EDITOR SPI: Deletes the current box and moves the cursor to the parent box's boundary.
function deleteCurrentBox() {
  const parentBox = cursor.parentNode.parentNode;
  const boxIndex = Array.from(parentBox.children).indexOf(cursor.parentNode);
  parentBox.removeChild(cursor.parentNode);
  moveCursorTo(parentBox, boxIndex);
}

// EDITOR SPI: Returns a text serialization of the box.
// todo: shrunken boxes?
function serializeBox(box) {
  const parts = [];
  box.childNodes.forEach(child => {
    if (isCursor(child)) {
      // skip
    } else if (isCha(child)) {
      parts.push(child.textContent);
    } else if (isCodeBox(child)) {
      parts.push(`(${serializeBox(child)})`);
    } else if (isBox(child)) {
      parts.push(`[${serializeBox(child)}]`);
    } else {
      throw new Error(`Unexpected node type ${child.nodeType} in line: ${child}`);
    }
  });
  return parts.join('');
}

// Evaluator SPI: Sanitize dom (todo)
function sanitize_dom(v) {
  // todo: dom sanitize
  return v;
}

// Evaluator SPI: Deserialize a box string into DOM nodes
function deserializeBox(serialized) {
  // First, handle triple backticks for code blocks
  const codeBlockRegex = /```([\s\S]*?)```/g;
  serialized = serialized.replaceAll(codeBlockRegex, '<div class="box code">$1</div>');

  // Then handle regular boxes 
  serialized = serialized.replaceAll('[', '<div class="box">');
  serialized = serialized.replaceAll(']', '</div>');
  serialized = serialized.replaceAll('(', '<div class="box code">');
  serialized = serialized.replaceAll(')', '</div>');

  const parser = new DOMParser();
  const doc = parser.parseFromString(serialized, 'text/html');
  const box = document.createElement('div');
  box.classList.add('box');
  
  // Convert the parsed HTML into DOM nodes
  const children = Array.from(doc.body.childNodes);
  children.forEach(child => {
    const node_name = child.nodeName.toLowerCase();
    if (node_name === 'think' || node_name === 'code') {
      const newBox = deserializeBox(child.textContent.trim());
      newBox.classList.add('node_name');
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
  if (node === editor) {
    console.log('Cannot shrink editor');
    return;
  }
  if (! isBox(node)) {
    throw new Error(`shrinkBox: not a box: ${node}`);
  }
  node.classList.add('shrunken')
  exitBoxRight()
}

function unshrinkBox(node) {
  if (node === editor) {
    console.log('Cannot unshrink editor');
    return;
  }
  if (! isBox(node)) {
    throw new Error(`shrinkBox: not a box: ${node}`);
  }
  node.classList.remove('shrunken')
  exitBoxRight()
}

// EDITOR SPI: Sets the cursor position based on a specified object `{ node, offset }`.
function setCursorPosition(position) {
  moveCursorTo(position.node, position.offset);
}

function statusLedOn() {
  document.getElementById('status-led').classList.add('running');
}

function statusLedOff() {
  document.getElementById('status-led').classList.remove('running');
}

// Add event listeners
editor.addEventListener('keydown', handleKeydown);
editor.addEventListener('click', handleClick);
editor.addEventListener('dblclick', handleDoubleClick);

// Set initial focus
editor.focus();
