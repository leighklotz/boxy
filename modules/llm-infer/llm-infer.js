// llm-infer.js

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

async function llmInfer() {
  // Delete the old response first
  // todo: preserve it somehow
  const { node: pipeNode, offset: pipeOffset } = findPipeIndex();

  if (pipeNode && pipeOffset !== -1) {
    // If pipe character is found, move to it and remove everything after it
    moveCursor(pipeNode, pipeOffset);
    killLine();
  }

  let question = getRowText();
  console.log("llmInfer question", question);
  const messages = [
    { role: "system", content: "Respond very briefly:" },
    { role: "user", content: question }
  ];

  try {
    const response = await callOpenAPI(messages, "chat", 0.7, 1.0, 0.0, 42);
    console.log("llmInfer response", JSON.stringify(response));
    insertLlmResponse(response);
  } catch (error) {
    console.error("Error during inference:", error);
    throw new Exception("Failed to get LLM response. Please try again.", error);
  }

}

// todo: use open api chat history instead of just string concat
async function llmChat() {
    let history_raw = getBoxRowsText();
    console.log("llmChat history_raw", JSON.stringify(history_raw));
    let chatHistory = constructChatHistory(history_raw);
    console.log("llmChat chatHistory", JSON.stringify(chatHistory));
    const response = await callOpenAPI(chatHistory, "chat", 0.7, 1.0, 0.0, 42);
    console.log("llmChat response", JSON.stringify(response));
    insertLlmResponse(response);
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
                moveCursor(node, lineBreakIndex);
                reachedEndOfLine = true;
            } else {
                // No line break, continue to update the last text node
                lastTextNode = node;
            }
        }
    });

    // Move cursor to the end of the last text node if no line break is found
    if (lastTextNode && !reachedEndOfLine) {
        moveCursor(lastTextNode, lastTextNode.textContent.length);
    }
}

function findPipeIndex() {
  const currentLineContainer = cursor.parentNode;

  if (!currentLineContainer) {
    console.error('Cursor is not within a valid line container.');
    return { node: null, offset: -1 }; // Explicitly return null if no container
  }

  const nodes = Array.from(currentLineContainer.childNodes);

  // Iterate through nodes to find the `|` character
  for (let node of nodes) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.includes('|')) {
      const pipeOffset = node.textContent.indexOf('|');
      return { node, offset: pipeOffset }; // Return node and offset where `|` is found
    }
  }

  // If no pipe character is found, return a fallback
  return { node: null, offset: -1 };
}


// insert ' | ' and LLM response.
// delete prior responses before calling
function insertLlmResponse(response) {
  // Move to the end of the line
  moveCursorToEndOfLineInBox();
  insertTextAtCursor(' | ');

  // Insert the LLM response in a new context box
  insertAndEnterBox();
  insertTextAtCursor(response.trim());
  exitBoxRight();
}

function moveCursorToEndOfLineInBox() {
  console.log('Attempting to move to the end of the current row...');
  let currentNode = cursor.parentNode.lastChild;
  if (currentNode && currentNode.nodeType === Node.TEXT_NODE) {
    moveCursor(currentNode, currentNode.textContent.length);
  } else if (currentNode) {
    let textContent = currentNode.textContent;
    moveCursor(currentNode, textContent.length);
  } else {
    let box = cursor.parentNode;
    let textContent = gatherText(box);
    let endIndex = textContent.reduce((acc, curr) => acc + curr.length, 0);
    moveCursor(box, endIndex);
  }
}

function llmDuplicateTest() {
    let response = getBoxRowsText();
    console.log("getBoxRowsText", response);
    insertLlmResponse(response)
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
    let history_raw = getBoxRowsText();
    let chatHistory = constructChatHistory(history_raw);

    console.log(JSON.stringify(chatHistory));
}



keyMap['Ctrl-|'] = llmChat;
keyMap['|'] = llmInfer;
keyMap['Tab'] = llmDuplicateTest
// keyMap['Tab'] = chatTest
