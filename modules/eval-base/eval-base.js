//  modules/eval-base/eval-base.js

// Function to delete all spaces to the left and right of the cursor
function deleteSpacesAroundCursor() {
  const textNode = cursor.previousSibling;

  // Ensure the previous sibling is a text node
  if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
    console.error("Cursor is not adjacent to a text node.");
    return;
  }

  const textContent = textNode.nodeValue;

  // Find the cursor's position within the text node
  const cursorIndex = textContent.length; // Assume cursor is right after the text node

  // Identify spaces to the left of the cursor
  let leftIndex = cursorIndex - 1;
  while (leftIndex >= 0 && textContent[leftIndex] === ' ') {
    leftIndex--;
  }
  leftIndex++; // Move back to the first non-space character

  // Identify spaces to the right of the cursor
  let rightIndex = cursorIndex;
  while (rightIndex < textContent.length && textContent[rightIndex] === ' ') {
    rightIndex++;
  }

  // Remove spaces around the cursor
  textNode.nodeValue = textContent.slice(0, leftIndex) + textContent.slice(rightIndex);

  console.log(`Updated text content: "${textNode.nodeValue}"`);
}

// Function to delete the old response and handle undo functionality
function killResponse() {
  const { node: pipeNode, offset: pipeOffset } = findPipeIndex();

  if (pipeNode && pipeOffset !== -1) {
    // If pipe character is found, move to it and remove everything after it
    moveCursorTo(pipeNode, pipeOffset);
    killLine();

    // Delete spaces around the cursor
    deleteSpacesAroundCursor();
  }
}

function findPipeIndex() {
  const bol = findBeginningOfLine(cursor, 0);
  const eol = findEndOfLine(cursor, 0);

  curr = bol
  while (curr.node) {
    if (curr.node.nodeType === Node.TEXT_NODE) {
      const firstPipeOffset = curr.node.textContent.indexOf('|');
      if (firstPipeOffset !== -1) {
        return { node: curr.node, offset: firstPipeOffset };
      }
    }
    if (curr.node == eol.node) {
      break;
    } 
    curr.node = curr.node.nextSibling;
    curr.offset = 0;
  }
  return { node: null, offset: -1 };
}

// insert ' | ' and LLM response.
// caller should delete prior responses before calling, if desired
function insertLlmResponse(response, applyMarkdown=false) {
  // Move to the end of the line
  moveCursorToEndOfLineInBox();
  insertTextAtCursor(' | ');
  // Insert the LLM response in a new context box, with cursor at EOL
  let rawText = response.trim();
  let responseBox = deserializeBox(rawText);
  if (rawText.includes('\n')) {
    insertBoxAtCursor(responseBox);
    console.log("formatting responseBox as markdown");
    if (applyMarkdown) {
      formatMarkdownBox(responseBox);
    }
    exitBoxRight();
  } else {
    // unbox single-line text responses
    insertBoxContentsAtCursor(responseBox);
  }
}
