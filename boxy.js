// boxy.js

const editor = document.getElementById('editor');
const cursor = document.querySelector('.cursor');
const alertBox = document.getElementById('alert-box');
let goalColumn = -1; // Initialize goal column
let clipboard = ""; // For cut/copy/paste operations
let selectionRange = null;
let quoteFlag = false;

/** * Box Commands */

// EDITOR SPI: Insert a box at the cursor position and enter it
function insertAndEnterBox() {
  clearSelection();
  const newBox = document.createElement('div');
  newBox.classList.add('box');
  cursor.parentNode.insertBefore(newBox, cursor);
  moveCursorTo(newBox, 0);
}

// EDITOR SPI: Enter the box immediately after the cursor
function enterNextBox() {
  const nextNode = cursor.nextSibling;
  if (nextNode && nextNode.classList.contains('box')) {
    moveCursorTo(nextNode, 0);
  }
}

// EDITOR SPI: Move the cursor out of the current box to the left and position it before the box
function exitBoxLeft() {
  const parentBox = cursor.parentNode;
  if (parentBox !== editor) {
    parentBox.parentNode.insertBefore(cursor, parentBox);
    console.log('Cursor moved before the current box.');
  }
}

// EDITOR SPI: Move the cursor out of the current box to the right and position it after the box
function exitBoxRight() {
  const parentBox = cursor.parentNode;
  if (parentBox !== editor) {
    parentBox.parentNode.insertBefore(cursor, parentBox.nextSibling);
    console.log('Cursor moved after the current box.');
  }
}

/** * Cursor Management */
// EDITOR SPI: Move cursor to specified node and offset
function moveCursorTo(node, offset = 0) {
  if (!node) {
    console.error('Invalid node, cannot move cursor.');
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
        node.parentNode.insertBefore(cursor, node.nextSibling);
      } else {
        node.parentNode.appendChild(cursor);
      }
    } else {
      // Split the text node and insert the cursor
      const splitNode = node.splitText(offset);
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
        node.insertBefore(cursor, targetNode);
      }
    } else {
      // Append cursor if offset is beyond child nodes
      if (node !== cursor) {
        node.appendChild(cursor);
      }
    }
    return;
  }

  // Fallback: insert cursor at the parent of the node if valid
  if (node.parentNode && node !== cursor) {
    node.parentNode.insertBefore(cursor, node);
  } else {
    console.error('Node has no valid parent or is the cursor itself, cannot move cursor.');
  }
}

// EDITOR SPI: Move cursor to start of box
function moveCursorToStartOfBox() {
  console.log('Attempting to move to the start of the current box...');
  // Move the cursor to the start of the first child of the current box
  moveCursorTo(cursor.parentNode.firstChild, 0);
}

// EDITOR SPI: Move cursor to end of box
function moveCursorToEndOfBox() {
  console.log('Attempting to move to the end of the current box...');
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
  console.log('Attempting to move to the start of the current row...');
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

  while (currentNode) {
    if (currentNode.nodeType === Node.TEXT_NODE) {
      // Check for a newline character in the current text node
      const newlineIndex = currentNode.textContent.indexOf('\n', currentOffset);
      if (newlineIndex !== -1) {
	return { node: currentNode, offset: newlineIndex };
      }
      // No newline, move to the end of the text node
      currentOffset = currentNode.textContent.length;
    } else if (currentNode.nodeType === Node.ELEMENT_NODE && currentNode !== cursor) {
      if (currentNode.classList.contains('box')) {
	// Ignore the content of nested boxes, move to their last sibling
	currentNode = currentNode.nextSibling;
	currentOffset = 0;
	continue;
      }
    }

    // Move to the next sibling, if available
    if (currentNode.nextSibling) {
      currentNode = currentNode.nextSibling;
      currentOffset = 0;
    } else {
      // Reached the end of the current node, break out of the loop
      break;
    }
  }

  // todo: If no line break found, return the end of the last node in the parent
  // Return the position at the end of the last valid node
  return { node: currentNode, offset: currentOffset };
}

// EDITOR SPI: Move cursor to end of line in box
function moveCursorToEndOfLineInBox() {
  console.log('Attempting to move to the end of the current row...');
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

// EDITOR SPI: Move cursor right within box
function moveCursorRightWithinBox() {
  console.log('Attempting to move right...');
  goalColumn = -1; // Reset goal column on explicit horizontal motion
  let nextNode = cursor.nextSibling;

  // Check if the next node is a box
  if (nextNode && nextNode.classList?.contains('box')) {
    console.log('Moving past the nested box...');
    moveCursorTo(nextNode.nextSibling || cursor.parentNode.nextSibling, 0);
    return;
  }

  // If no next node, check if we are at the end of the current box
  if (!nextNode) {
    console.log('No next sibling, at the end of the current box.');
    const parentBox = cursor.parentNode;
    // Move to the right boundary of the next box, not inside it
    if (parentBox.nextSibling && parentBox.nextSibling.classList?.contains('box')) {
      console.log('Moving past the next box...');
      moveCursorTo(parentBox.nextSibling.nextSibling, 0);
      return;
    } else {
      console.log('Already at the rightmost boundary.');
      return;
    }
  }

  // If next node is a text node, move forward one character
  if (nextNode && nextNode.nodeType === Node.TEXT_NODE) {
    console.log(`Moving forward within text node. Text length: ${nextNode.textContent.length}`);
    moveCursorTo(nextNode, 1); // Move to the next character
  } else {
    // If the next node is not a text node, stop at the boundary
    console.log('Next node is not a text node, stopping at the boundary.');
  }
}

// EDITOR SPI: Move cursor left within box
function moveCursorLeftWithinBox() {
  console.log('Attempting to move left...');
  goalColumn = -1; // Reset goal column on explicit horizontal motion
  let prevNode = cursor.previousSibling;

  // Check if the previous node is a box
  if (prevNode && prevNode.classList?.contains('box')) {
    console.log('Moving past the nested box...');
    moveCursorTo(prevNode, prevNode.childNodes.length);
    return;
  }

  // If no previous node, check if we are at the boundary of the current box
  if (!prevNode) {
    console.log('No previous sibling, at the start of the current box.');
    const parentBox = cursor.parentNode;
    // Move to the left boundary of the previous box, not inside it
    if (parentBox.previousSibling && parentBox.previousSibling.classList?.contains('box')) {
      console.log('Moving past the previous box...');
      moveCursorTo(parentBox.previousSibling, parentBox.previousSibling.childNodes.length);
      return;
    } else {
      console.log('Already at the leftmost boundary.');
      return;
    }
  }

  // If previous node is a text node, move back one character
  if (prevNode && prevNode.nodeType === Node.TEXT_NODE) {
    const textLen = prevNode.textContent.length;
    if (textLen > 0) {
      console.log(`Moving back within text node. Text length: ${textLen}`);
      moveCursorTo(prevNode, textLen - 1);
    } else {
      console.log('Previous text node is empty, moving to its previous sibling...');
      cursor.parentNode.insertBefore(cursor, prevNode); // Move cursor before the empty node
      // Check if there is another previous sibling to continue moving
      prevNode = prevNode.previousSibling;
      if (prevNode && prevNode.nodeType === Node.TEXT_NODE) {
        console.log('Moving to end of previous text node...');
        moveCursorTo(prevNode, prevNode.textContent.length);
      }
    }
  } else {
    // If the previous node is not a text node, stop at the boundary
    console.log('Previous node is not a text node, stopping at the boundary.');
  }
}

// EDITOR SPI: move cursor up within the current box, maintaining goal column
function moveCursorUp() {
  console.log('Attempting to move up...');
  const currentColumn = getColumnPosition(cursor);
  if (goalColumn === -1 || currentColumn !== goalColumn) {
    goalColumn = currentColumn;
  }
  let prevNode = cursor.previousSibling;
  // Traverse backward to find a line break or start of text node
  while (prevNode) {
    if (prevNode.nodeType === Node.TEXT_NODE && prevNode.textContent.includes('\n')) {
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
  console.log('Attempting to move down...');
  const currentColumn = getColumnPosition(cursor);
  if (goalColumn === -1 || currentColumn !== goalColumn) {
    goalColumn = currentColumn;
  }
  let nextNode = cursor.nextSibling;
  // Traverse forward to find a line break or start of the next text node
  while (nextNode) {
    if (nextNode.nodeType === Node.TEXT_NODE && nextNode.textContent.includes('\n')) {
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

/** * Inserting and Deleting */

// EDITOR SPI: Insert character at the cursor position
function insertCharAtCursor(char) {
  clearSelection();
  const textNode = document.createTextNode(char);
  cursor.parentNode.insertBefore(textNode, cursor);
}

// EDITOR SPI: Insert text at the cursor position
function insertBoxAtCursor(node) {
  clearSelection();
  cursor.parentNode.insertBefore(node, cursor);
}

// EDITOR SPI: Insert box at the cursor position
function insertTextAtCursor(text) {
  clearSelection();
  const textNode = document.createTextNode(text);
  cursor.parentNode.insertBefore(textNode, cursor);
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
  console.log('Attempting to delete character...');
  
  let prevNode = cursor.previousSibling;

  // Remove any empty text nodes before processing
  while (prevNode && prevNode.nodeType === Node.TEXT_NODE && prevNode.textContent === '') {
    console.log('Removing empty text node...');
    prevNode.remove();
    prevNode = cursor.previousSibling;
  }

  // If previous node is a text node, delete the last character in it
  if (prevNode && prevNode.nodeType === Node.TEXT_NODE) {
    const textLen = prevNode.textContent.length;
    if (textLen > 0) {
      console.log(`Deleting character at position ${textLen - 1}.`);
      prevNode.textContent = prevNode.textContent.slice(0, -1);
      
      // If the text node becomes empty, remove it and move the cursor before it
      if (prevNode.textContent.length === 0) {
        console.log('Previous text node is now empty, removing it...');
        prevNode.remove();
      }
    } else {
      console.log('Previous text node is already empty.');
    }
  } else if (prevNode) {
    // If the previous node is not a text node, remove it entirely
    console.log('Deleting non-text node...');
    prevNode.remove();
  } else {
    console.log('No previous node to delete.');
  }
}

// EDITOR SPI: Kill line (Ctrl-k) - Delete from cursor to end of line or join if at newline
// todo: make sure cursor is never removed, or at least add it back at the point
function killLine() {
  let node = cursor.nextSibling;

  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
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

// EDITOR SPI: Delete character forward (Ctrl-d), including newline at EOL
function deleteCharForward() {
  let node = cursor.nextSibling;
  // If the next node is a text node
  if (node && node.nodeType === Node.TEXT_NODE) {
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

/** * Key Binding and Executions */
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

function handleKeydown(event) {
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

  // Determine the key pressed (with or without Ctrl)
  const key = event.ctrlKey ? `Ctrl-${event.key.toLowerCase()}` : event.key;

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
}

// Handle mouse clicks for cursor movement, allowing movement between boxes
function handleClick(event) {
  console.log('Handling mouse click...');
  // Get the element under the click
  const element = document.elementFromPoint(event.clientX, event.clientY);
  console.log('Element under click:', element);

  // if it's the cursor, do not do processing, just clear selection range
  if (element !== cursor) {
    // Check if the element is within the editor
    if (element && editor.contains(element)) {
      console.log('Element is within editor, proceeding...');
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
  } else {
      console.log('Clicked on cursor.');
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

  // Check if the clicked node is the editor box or contains text
  if (node.nodeType === Node.ELEMENT_NODE && node.classList?.contains('box')) {
    console.log('Clicked a box, placing cursor inside...');
    moveCursorTo(node, 0); // Place cursor at the start of the box
    return;
  }

  // Check if the clicked node is inside a box
  let parentBox = node;
  while (parentBox && parentBox !== editor) {
    if (parentBox.classList?.contains('box')) {
      console.log('Clicked inside a box, placing cursor inside...');
      moveCursorTo(parentBox, offset);
      return;
    }
    parentBox = parentBox.parentNode;
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
  console.log('Finding nearest parent or sibling text node...');
  // If the element is already a text node, return it
  if (element.nodeType === Node.TEXT_NODE) {
    return element;
  }
  // Try finding a sibling text node
  let sibling = element.nextSibling || element.previousSibling;
  while (sibling) {
    if (sibling.nodeType === Node.TEXT_NODE) {
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
  if (node.nodeType === Node.TEXT_NODE) {
    console.log('Node is a text node. Calculating offset...');
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

/** * Box access functions for evaluator */

// Gather text content from a node, serializing nested boxes inside []
function gatherText(node, isNested = false) {
  const textContent = [];
  if (node.nodeType === Node.TEXT_NODE) {
    textContent.push(node.textContent);
  } else if (node.classList?.contains('box')) {
    if (isNested) textContent.push('['); // Only add brackets for nested boxes
    Array.from(node.childNodes).forEach(child => textContent.push(...gatherText(child, true)));
    if (isNested) textContent.push(']');
  } else {
    Array.from(node.childNodes).forEach(child => textContent.push(...gatherText(child, isNested)));
  }
  return textContent;
}

// EVALUATOR SPI: same as serializeBox(currentBox()) except in a list?
// todo: combine implementations
function getCurrentBoxText() {
  const rowsText = [];
  let currentNode = cursor.parentNode.firstChild; 
  let rowText = [];
  while (currentNode) {
    if (currentNode.nodeType === Node.TEXT_NODE) {
      rowText.push(currentNode.textContent);
    } else if (currentNode.classList?.contains('box')) {
      rowText.push(...gatherText(currentNode));
    }
    if (currentNode.nodeType === Node.TEXT_NODE && currentNode.textContent.includes('\n')) {
      rowsText.push(rowText.join(''));
      rowText = [];
    }
    currentNode = currentNode.nextSibling;
  }
  // Add the last row, if any
  if (rowText.length > 0) {
    rowsText.push(rowText.join(''));
  }
  return rowsText;
}

function findLineStart(cursor) {
  // We'll mimic moveCursorToStartOfLineInBox, but *just return* the node & offset
  // instead of moving the real cursor.

  let node = cursor.previousSibling;
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
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
    console.log('Attempting to find the end of the current line...');
    let currentNode = cursor;
    let offset = 0;

    // Start from the cursor and move forward through siblings
    while (currentNode) {
        if (currentNode.nodeType === Node.TEXT_NODE) {
            const lineBreakIndex = currentNode.textContent.indexOf('\n');
            if (lineBreakIndex !== -1) {
                // Found a newline, return the position before the newline
                return { node: currentNode, offset: lineBreakIndex };
            } else {
                // No newline, continue to next sibling
                currentNode = currentNode.nextSibling;
            }
        } else if (currentNode.nodeType === Node.ELEMENT_NODE && currentNode.classList?.contains('box')) {
            // Treat boxes as single units and skip over them
            currentNode = currentNode.nextSibling;
        } else {
            // Unexpected node type, skip it
            currentNode = currentNode.nextSibling;
        }
    }

    // If no newline is found, return the end of the last node in the box
    const lastNode = cursor.parentNode.lastChild;
    if (lastNode && lastNode.nodeType === Node.TEXT_NODE) {
        return { node: lastNode, offset: lastNode.textContent.length };
    } else if (lastNode) {
        return { node: lastNode, offset: lastNode.textContent?.length || 0 };
    }

    // Fallback: Return the parent box itself
    return { node: cursor.parentNode, offset: 0 };
}

// EVALUATOR SPI: ???
// todo: what is this and how is it different from getCurrentBoxText
function gatherEntireBox(boxElem) {
  const parts = [];
  boxElem.childNodes.forEach(child => {
    if (child.nodeType === Node.TEXT_NODE) {
      // Collect text nodes (including newlines)
      parts.push(child.textContent);
    } 
    else if (child.nodeType === Node.ELEMENT_NODE) {
      // If child is another box, recursively gather it with brackets
      if (child.classList?.contains('box')) {
        parts.push('[' + gatherEntireBox(child) + ']');
      } 
      // Ignore the cursor element
      else if (child === cursor) {
        // Skip cursor
      } 
      else {
        // Throw error for unexpected elements
        throw new Error(
          `Unexpected element <${child.tagName.toLowerCase()}> inside a box (id=${child.id || 'no-id'}).`
        );
      }
    } 
    else {
      // Throw error for unexpected node types
      throw new Error(`Unexpected node type inside box: ${child.nodeType}`);
    }
  });
  return parts.join('');
}

// EVALUATOR SPI: Gets text between two cursor positions, useful for selections.
function getTextBetweenCursors(start, end) {
  const parts = [];
  let currentNode = start.node;
  let done = false;

  while (currentNode && !done) {
    if (currentNode.nodeType === Node.TEXT_NODE) {
      // Collect text content, slicing if partial
      const text = currentNode.textContent;
      const fromIdx = (currentNode === start.node) ? start.offset : 0;
      const toIdx = (currentNode === end.node) ? end.offset : text.length;
      parts.push(text.slice(fromIdx, toIdx));

      // Stop if this is the end node
      if (currentNode === end.node) {
        done = true;
      }
    } 
    else if (currentNode.nodeType === Node.ELEMENT_NODE) {
      // Handle boxes by bracketing their entire content
      if (currentNode.classList?.contains('box')) {
        parts.push('[' + gatherEntireBox(currentNode) + ']');
      } 
      // Ignore the cursor element
      else if (currentNode === cursor) {
        // Skip cursor
      } 
      else {
        // Throw error for unexpected elements
        throw new Error(
          `Unexpected element <${currentNode.tagName.toLowerCase()}> in line (id=${currentNode.id || 'no-id'}).`
        );
      }

      // Stop if this is the end node
      if (currentNode === end.node) {
        done = true;
      }
    } 
    else {
      // Throw error for unexpected node types
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
    if (currentNode.nodeType === Node.TEXT_NODE) {
      position += currentNode.textContent.length;
    } else if (currentNode.classList.contains('box')) {
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
function serializeBox(box) {
  const parts = [];
  box.childNodes.forEach(child => {
    if (child.nodeType === Node.TEXT_NODE) {
      parts.push(child.textContent);
    } else if (child.classList.contains('box')) {
      parts.push(`[${serializeBox(child)}]`);
    }
  });
  return parts.join('');
}

// Evaluator SPI: Deserialize a box string into DOM nodes
function deserializeBox(serialized) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(serialized, 'text/html');
  const box = document.createElement('div');
  box.classList.add('box');
  
  // Convert the parsed HTML into DOM nodes
  const children = Array.from(doc.body.childNodes);
  children.forEach(child => {
    if (child.nodeName === 'BOX') {
      const newBox = deserializeBox(child.textContent);
      box.appendChild(newBox);
    } else {
      box.appendChild(child);
    }
  });
  
  return box;
}

// EDITOR SPI: Sets the cursor position based on a specified object `{ node, offset }`.
function setCursorPosition(position) {
  moveCursorTo(position.node, position.offset);
}

function formatMarkdownBox() {
  // Get the text content from current box
  const markdownText = gatherEntireBox(cursor.parentNode);

  // Use marked to parse and format the markdown
  const formattedHtml = marked.parse(markdownText);

  // Sanitize
  const sanitizedHtml = sanitize_dom(formattedHtml);
  
  // Display the formatted markdown in the box
  cursor.parentNode.innerHTML = formattedHtml;

  // todo: repair the cursor. probably is is lost.
  // moveCursorToStartOfBox()
}

function sanitize_dom(v) {
  // todo: dom sanitize
  return v;
}

/** A simple ordering function to compare DOM siblings (not always necessary). */
function currentNodeCompare(a, b) {
  if (a === b) return 0;
  // Otherwise, we can see if a is before b in the sibling chain
  let node = a;
  while (node) {
    if (node === b) return -1; // a is before b
    node = node.nextSibling;
  }
  return 1; // didn't find b, so presumably a is after
}

// Add event listeners
editor.addEventListener('keydown', handleKeydown);
editor.addEventListener('click', handleClick);

// Set initial focus
editor.focus();
