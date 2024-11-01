const editor = document.getElementById('editor');
const cursor = document.querySelector('.cursor');
const alertBox = document.getElementById('alert-box');

let goalColumn = -1;  // Initialize goal column
let clipboard = "";  // For cut/copy/paste operations
let selectionRange = null;

var quoteFlag = false;

/**
 * Box Commands
 */

// Insert a box at the cursor position and enter it
function insertAndEnterBox() {
    clearSelection();
    const newBox = document.createElement('div');
    newBox.classList.add('box');
    cursor.parentNode.insertBefore(newBox, cursor);
    moveCursor(newBox, 0);
}

// Enter the box immediately after the cursor
function enterNextBox() {
    const nextNode = cursor.nextSibling;
    if (nextNode && nextNode.classList.contains('box')) {
        moveCursor(nextNode, 0);
    }
}

// Move the cursor out of the current box to the left and position it before the box
function exitBoxLeft() {
    const parentBox = cursor.parentNode;
    if (parentBox !== editor) {
        parentBox.parentNode.insertBefore(cursor, parentBox);
        console.log('Cursor moved before the current box.');
    }
}

// Move the cursor out of the current box to the right and position it after the box
function exitBoxRight() {
    const parentBox = cursor.parentNode;
    if (parentBox !== editor) {
        parentBox.parentNode.insertBefore(cursor, parentBox.nextSibling);
        console.log('Cursor moved after the current box.');
    }
}

/**
 * Cursor Management
 */
function moveCursor(node, offset = 0) {
    // Remove any empty text nodes before moving the cursor
    if (node && node.nodeType === Node.TEXT_NODE && node.textContent === "") {
        node.remove();
        return;
    }

    // Adjust to allow moving the cursor to a different parent
    if (node) {
        // Handle text node insertion
        if (node.nodeType === Node.TEXT_NODE) {
            if (offset >= node.textContent.length) {
                node.parentNode.insertBefore(cursor, node.nextSibling);
            } else {
                const splitNode = node.splitText(offset);
                node.parentNode.insertBefore(cursor, splitNode);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            // Insert cursor at the correct child node
            node.insertBefore(cursor, node.childNodes[offset] || null);
        } else {
            // Insert cursor at the parent of the node
            node.parentNode.insertBefore(cursor, node);
        }
    }
}

function moveCursorToStartOfLineInBox() {
    console.log('Attempting to move to the start of the current row...');
    let node = cursor.previousSibling;
    while (node) {
        if (node.nodeType === Node.TEXT_NODE) {
            const lineBreakIndex = node.textContent.lastIndexOf('\n');
            if (lineBreakIndex !== -1) {
                console.log(`Moving to start of current row at column ${lineBreakIndex + 1}.`);
                moveCursor(node, lineBreakIndex + 1);
                return;
            }
        }
        node = node.previousSibling;
    }
    // If no line break found, move to the start of the first node
    console.log('No previous line break found, moving to the start of the box.');
    moveCursor(cursor.parentNode.firstChild, 0);
}

function moveCursorToEndOfLineInBox() {
    console.log('Attempting to move to the end of the current row...');
    let node = cursor.nextSibling;
    while (node) {
        if (node.nodeType === Node.TEXT_NODE) {
            const lineBreakIndex = node.textContent.indexOf('\n');
            if (lineBreakIndex !== -1) {
                console.log(`Moving to end of current row at column ${lineBreakIndex}.`);
                moveCursor(node, lineBreakIndex);
                return;
            }
        }
        node = node.nextSibling;
    }
    // If no line break found, move to the end of the last node
    console.log('No next line break found, moving to the end of the box.');
    moveCursor(cursor.parentNode.lastChild, cursor.parentNode.lastChild.textContent.length);
}

function moveCursorRightWithinBox() {
    console.log('Attempting to move right...');
    goalColumn = -1; // Reset goal column on explicit horizontal motion
    let nextNode = cursor.nextSibling;

    // If no next node, check if we are at the end of the current box
    if (!nextNode) {
        console.log('No next sibling, at the end of the current box.');
        const parentBox = cursor.parentNode;

        // Move to the right boundary of the next box, not inside it
        if (parentBox.nextSibling && parentBox.nextSibling.classList.contains('box')) {
            console.log('Moving past the next box...');
            parentBox.parentNode.insertBefore(cursor, parentBox.nextSibling.nextSibling);
            return;
        } else {
            console.log('Already at the rightmost boundary.');
            return;
        }
    }

    // If next node is a text node, move forward one character
    if (nextNode && nextNode.nodeType === Node.TEXT_NODE) {
        console.log(`Moving forward within text node. Text length: ${nextNode.textContent.length}`);
        moveCursor(nextNode, 1);  // Move to the next character
    } else {
        // If the next node is not a text node, stop at the boundary
        console.log('Next node is not a text node, stopping at the boundary.');
    }
}

function moveCursorLeftWithinBox() {
    console.log('Attempting to move left...');
    goalColumn = -1; // Reset goal column on explicit horizontal motion
    let prevNode = cursor.previousSibling;

    // If no previous node, check if we are at the boundary of the current box
    if (!prevNode) {
        console.log('No previous sibling, at the start of the current box.');
        const parentBox = cursor.parentNode;

        // Move to the left boundary of the previous box, not inside it
        if (parentBox.previousSibling && parentBox.previousSibling.classList.contains('box')) {
            console.log('Moving past the previous box...');
            parentBox.parentNode.insertBefore(cursor, parentBox.previousSibling);
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
            moveCursor(prevNode, textLen - 1);
        } else {
            console.log('Previous text node is empty, moving to its previous sibling...');
            cursor.parentNode.insertBefore(cursor, prevNode); // Move cursor before the empty node
            // Check if there is another previous sibling to continue moving
            prevNode = prevNode.previousSibling;
            if (prevNode && prevNode.nodeType === Node.TEXT_NODE) {
                console.log('Moving to end of previous text node...');
                moveCursor(prevNode, prevNode.textContent.length);
            }
        }
    } else {
        // If the previous node is not a text node, stop at the boundary
        console.log('Previous node is not a text node, stopping at the boundary.');
    }
}

// Move the cursor up within the current box, maintaining goal column
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
            moveCursor(prevNode, targetColumn);
            return;
        }
        prevNode = prevNode.previousSibling;
    }
    console.log('No previous line found, staying at the current line.');
}

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
            moveCursor(nextNode, lineStart + targetColumn);
            return;
        }
        nextNode = nextNode.nextSibling;
    }
    console.log('No next line found, staying at the current line.');
}

// Get the current column position of the cursor
function getColumnPosition(cursor) {
    const prevText = cursor.previousSibling;
    return prevText ? prevText.textContent.length : 0;
}

/**
 * Inserting and Deleting
*/

// Insert character at the cursor position
function insertCharAtCursor(char) {
    clearSelection();
    const textNode = document.createTextNode(char);
    cursor.parentNode.insertBefore(textNode, cursor);
}

// Insert text at the cursor position
function insertTextAtCursor(text) {
    clearSelection();
    const textNode = document.createTextNode(text);
    cursor.parentNode.insertBefore(textNode, cursor);
}
// Insert a newline at the cursor position
function insertNewline() {
    clearSelection();
    const textNode = document.createTextNode('\n');
    cursor.parentNode.insertBefore(textNode, cursor);
}

// Insert quoted character at cursor position
function insertQuotedChar() {
    quoteFlag = true;
}

// Delete character at the cursor position (Backspace)
function deleteCharAtCursor() {
    console.log('Attempting to delete character...');
    let prevNode = cursor.previousSibling;

    // If previous node is a text node, delete the last character in it
    if (prevNode && prevNode.nodeType === Node.TEXT_NODE) {
        const textLen = prevNode.textContent.length;
        if (textLen > 0) {
            console.log(`Deleting character at position ${textLen - 1}.`);
            prevNode.textContent = prevNode.textContent.slice(0, -1);

            // If the text node becomes empty, move the cursor before it
            if (prevNode.textContent.length === 0) {
                console.log('Previous text node is now empty, moving cursor before it...');
                cursor.parentNode.insertBefore(cursor, prevNode);
                prevNode.remove();
            }
        }
    } else if (prevNode) {
        // If the previous node is not a text node, remove it entirely
        console.log('Deleting non-text node (e.g., empty node)...');
        prevNode.remove();
    } else {
        console.log('No previous node to delete.');
    }
}


// Kill line (Ctrl-k) - Delete from cursor to end of line or join if at newline
function killLine() {
    let node = cursor.nextSibling;

    // If at a newline, delete it and join the next line
    if (node && node.nodeType === Node.TEXT_NODE && node.textContent.startsWith('\n')) {
        node.textContent = node.textContent.slice(1); // Remove the newline
        return;
    }

    // Delete from cursor to the end of the line
    while (node) {
        if (node.nodeType === Node.TEXT_NODE) {
            const newlineIndex = node.textContent.indexOf('\n');
            if (newlineIndex !== -1) {
                node.textContent = node.textContent.slice(newlineIndex); // Keep the newline
                break;
            } else {
                node.remove(); // Remove entire text node if no newline
            }
        } else {
            node.remove(); // Remove non-text nodes
        }
        node = cursor.nextSibling; // Move to next sibling
    }
}

// Delete character forward (Ctrl-d), including newline at EOL
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

// Clear the current selection
function clearSelection() {
    if (selectionRange) {
        selectionRange.deleteContents();
        selectionRange = null;
    }
}


/**
 * Key Binding and Executios
 */


// Function to display an alert for unbound keys
function showUnboundKeyAlert(key) {
    alertBox.textContent = `"${key}" is undefined`;
    alertBox.style.display = 'block';
    alertBox.style.opacity = 1;

    setTimeout(() => {
        alertBox.style.opacity = 0;
    }, 500);

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
        keyMap[key]();  // Execute the mapped function
        event.preventDefault();
    } else if (event.ctrlKey) {
        // Handle unbound Ctrl combinations
        console.log(`Unbound Ctrl combination: ${key}`);
        showUnboundKeyAlert(key);
        event.preventDefault();
    } else if (/^[ -~\t]$/.test(event.key)) {
        // Handle self-inserting characters (printable ASCII)
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

    selectionRange = null;  // Clear any existing selection
}


// Mouse Left Click
function moveCursorToClickedPosition(range) {
    let node = range.startContainer;
    let offset = range.startOffset;

    // Ensure the node is not the cursor itself
    if (node === cursor) {
        console.log("Attempted to insert cursor within itself, aborting.");
        return;
    }

    // Check if the clicked node is the editor box or contains text
    if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('box')) {
        const isBoxEmpty = !node.textContent || node.textContent.length === 0;

        // Handle clicking inside an empty box
        if (isBoxEmpty) {
            console.log('Clicked an empty box, placing cursor...');
            moveCursor(node, 0); // Place cursor at the start of the empty box
            return;
        }
    }

    // Adjust the offset to avoid unexpected jumps
    offset = Math.max(0, Math.min(offset, node.textContent.length));

    // Move cursor to the specified position, ensuring it is not invalid
    if (node !== editor && node.parentNode !== cursor) {
        moveCursor(node, offset);
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

        while (offset < node.textContent.length && rects.length > 0) {
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

/**
 * Box access functions for evaluator
 */

// Gather text content from a node, serializing nested boxes inside []
function gatherText(node, isNested = false) {
    const textContent = [];

    if (node.nodeType === Node.TEXT_NODE) {
        textContent.push(node.textContent);
    } else if (node.classList && node.classList.contains('box')) {
        if (isNested) textContent.push('['); // Only add brackets for nested boxes
        Array.from(node.childNodes).forEach(child => textContent.push(...gatherText(child, true)));
        if (isNested) textContent.push(']');
    } else {
        Array.from(node.childNodes).forEach(child => textContent.push(...gatherText(child, isNested)));
    }

    return textContent;
}


// Gather text content from current row in box, serializing nested boxes inside []
function getRowText() {
    const currentRow = [];
    let currentNode = cursor.parentNode;

    while (currentNode && !(currentNode.nodeType === Node.TEXT_NODE && currentNode.textContent.includes('\n'))) {

        // Start gathering content of the current node
        currentRow.push(...gatherText(currentNode));

        currentNode = currentNode.nextSibling;
    }

    // Join the text of the row and return it
    return currentRow.join('');
}


// returns a list of the text of each row.
// if there is a box in any row, serialize its contents between '[' and ']'
function getBoxRowsText() {
    const rowsText = [];
    // todo: i want currentNode to be the first node of the nox.
    let currentNode = cursor.parentNode;

    while (currentNode) {
        const rowText = [];
        currentNode = currentNode.firstChild;

        while (currentNode && !(currentNode.nodeType === Node.TEXT_NODE && currentNode.textContent.includes('\n'))) {
            rowText.push(...gatherText(currentNode));
            currentNode = currentNode.nextSibling;
        }

        rowsText.push(rowText.join(''));
        currentNode = currentNode?.nextSibling;
    }

    return rowsText;
}

// Add event listeners
editor.addEventListener('keydown', handleKeydown);
editor.addEventListener('click', handleClick);

// Set initial focus
editor.focus();
