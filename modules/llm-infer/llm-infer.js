// modules/llm-infer/llm-infer.js - part of boxy

async function callOpenAPI(messages, mode, temperature, repetition_penalty, penalize_nl, seed) {
  const requestBody = {
    "messages": [
      {
        "role": "system",
        "content": "Answer briefly:"
      },
      ...messages
    ],
    "mode": mode,
    "temperature": temperature,
    "temperature_last": true,
    "repetition_penalty": repetition_penalty,
    "penalize_nl": penalize_nl,
    "seed": seed,
    "repeat_last_n": 64,
    "repeat_penalty": 1.000,
    "frequency_penalty": 0.000,
    "presence_penalty": 0.000,
    "top_k": 40,
    "tfs_z": 1.000,
    "top_p": 0.950,
    "min_p": 0.050,
    "typical_p": 1.000,
    "mirostat": 0,
    "mirostat_lr": 0.100,
    "mirostat_ent": 5.000,
    "n_keep": 1,
    "max_tokens": 4096,
    "auto_max_new_tokens": true,
    "skip_special_tokens": false
  };

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;

  } catch (error) {
    console.error("API call failed:", error);
    throw error;
  }
}

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

async function llmInfer() {
  statusLedOn();
  killResponse();

  let question = getCurrentRowText();
  console.log("llmInfer question", question);
  const messages = [
    { role: "system", content: "Respond very briefly:" },
    { role: "user", content: question }
  ];

  try {
    const response = await callOpenAPI(messages, "instruct", 0.7, 1.0, 0.0, 42);
    console.log("llmInfer response", JSON.stringify(response));
    insertLlmResponse(response);
    document.getElementById('status-led').classList.remove('running');
  } catch (error) {
    console.error("Error during inference:", error);
    statusLedOff();
    throw new Error("Failed to get LLM response. Please try again.", error);
  }

}

// todo: use open api chat history instead of just string concat
async function llmChat() {
  statusLedOn();
  let history_raw = getCurrentBoxRowsText();
  console.log("llmChat history_raw", JSON.stringify(history_raw));
  let chatHistory = constructChatHistory(history_raw);
  console.log("llmChat chatHistory", JSON.stringify(chatHistory));
  const response = await callOpenAPI(chatHistory, "chat", 0.7, 1.0, 0.0, 42);
  console.log("llmChat response", JSON.stringify(response));
  insertLlmResponse(response);
  statusLedOff();
}

function moveCursorToEndOfLine(parentNode) {
  let lastTextNode = null;
  let reachedEndOfLine = false;

  parentNode.childNodes.forEach(node => {
    if (node === cursor) {
      // If the cursor is encountered, consider it the end point for modifications
      reachedEndOfLine = true;
    }
    if (node.nodeType === Node.TEXT_NODE && !reachedEndOfLine) {
      const lineBreakIndex = node.textContent.indexOf('\n');
      if (lineBreakIndex !== -1) {
        // Found a line break, move the cursor here and mark end of line
        lastTextNode = node;
        moveCursorTo(node, lineBreakIndex);
        reachedEndOfLine = true;
      } else {
        // No line break, continue to update the last text node
        lastTextNode = node;
      }
    }
  });

  // Move cursor to the end of the last text node if no line break is found
  if (lastTextNode && !reachedEndOfLine) {
    moveCursorTo(lastTextNode, lastTextNode.textContent.length);
  }
}

// todo: use findBeginningOfLine(node, offset) and function findEndOfLine(node, offset)
//       as bounds for the search. call them each as `fun(cursor,0)`
function findPipeIndex() {
  const bol = findBeginningOfLine(cursor, 0);
  const eol = findEndOfLine(cursor, 0);
  const text = getTextBetweenCursors(bol, eol);
  console.log(`findPipeIndex1 text=${text}`);

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
// delete prior responses before calling
function insertLlmResponse(response) {
  // Move to the end of the line
  moveCursorToEndOfLineInBox();
  insertTextAtCursor(' | ');
  // Insert the LLM response in a new context box
  // todo: is cursor at the right spot after?
  insertBoxAtCursor(deserializeBox(response.trim()));
  exitBoxRight();
}

function getChatHistory() {
  const rowsText = [];
  let currentNode = editor.firstChild;
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

function constructChatHistory(rowsText) {
  const chatHistory = [];

  rowsText.forEach(row => {
    if (row.includes('|')) {
      const [userPart, responsePart] = row.split('|');
      chatHistory.push({ role: 'user', content: userPart.trim() });
      chatHistory.push({ role: 'assistant', content: responsePart.trim() });
    } else {
      chatHistory.push({ role: 'user', content: row.trim() });
    }
  });

  return chatHistory;
}

function chatTest() {
  let history_raw = getCurrentBoxRowsText();
  let chatHistory = constructChatHistory(history_raw);

  console.log(JSON.stringify(chatHistory));
}

keyMap['Ctrl-|'] = llmChat;
keyMap['|'] = llmInfer;
