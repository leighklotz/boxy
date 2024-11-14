async function callOpenAPI(chat_history, question, mode, temperature, repetition_penalty, penalize_nl, seed) {
    if (chat_history && question) {
        throw new Error("cannot append question to chat_history yet");
    }

    const requestBody = {
        messages: chat_history ? chat_history : [ { role: "user", content: question } ],
        mode: mode,
        temperature_last: true,
        temperature: temperature,
        repetition_penalty: repetition_penalty,
        penalize_nl: penalize_nl,
        seed: seed,
        repeat_last_n: 64,
        repeat_penalty: 1.000,
        frequency_penalty: 0.000,
        presence_penalty: 0.000,
        top_k: 40,
        tfs_z: 1.000,
        top_p: 0.950,
        min_p: 0.050,
        typical_p: 1.000,
        temp: temperature,
        n_keep: 1,
        max_tokens: 4096,
        auto_max_new_tokens: true,
        skip_special_tokens: false
    };

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
    // Assuming the response has a structure where the text response is stored in data.choices[0].message.content
    return data.choices[0].message.content;
}

async function llmInfer() {
    let question = getRowText();
    console.log("llmInfer", question);
    const response = await callOpenAPI(question, "chat", 0.7, 1.0, 0.0, 42);
    insertLlmResponse(response);
}

// todo: use open api chat history instead of just string concat
async function llmChat() {
    let history_raw = getBoxRowsText();
    let chatHistory = constructChatHistory(history_raw);
    console.log("llmChat", JSON.stringify(chatHistory));
    const response = await callOpenAPI(chatHistory, "", "chat", 0.7, 1.0, 0.0, 42);
    insertLlmResponse(response);
}

// function insertLlmResponse(response) {
//     let node = cursor;
//     
//     // todo: 
//     // Find the first '|' in current row and delete it and the rest of the line.
//     // then, Insert the ' | ' and the response.
//     // normalize space around ' | ' to one space each side.
// 
//     insertTextAtCursor(' | ');
//     insertAndEnterBox();
//     insertTextAtCursor(response.trim());
//     exitBoxRight();
//     
//     console.log("Cursor moved to:", document.activeElement);
// }

function insertLlmResponse(response) {
    let currentLineContainer = cursor.parentNode;
    let foundPipe = false;
    let nodesToClear = [];

    for (let node of currentLineContainer.childNodes) {
        if (node === cursor) {
            continue; // Skip the cursor
        }
        if (!foundPipe && node.nodeType === Node.TEXT_NODE) {
            const pipeIndex = node.textContent.indexOf('|');
            if (pipeIndex !== -1) {
                node.textContent = node.textContent.substring(0, pipeIndex + 1).trim() + ' '; // Normalize space
                foundPipe = true;
                // Collect nodes after '|' to clear
                nodesToClear = [...currentLineContainer.childNodes].slice([...currentLineContainer.childNodes].indexOf(node) + 1);
                break;
            }
        }
    }

    // Remove nodes collected to be cleared
    nodesToClear.forEach(node => node.remove());

    // Move the cursor to the end of the line or right after the '|'
    if (foundPipe) {
        moveCursorToEndOfLine(currentLineContainer);
    } else {
        // If no '|' found, add it at the end of the current row
        insertTextAtCursor(' | ');
        moveCursorToEndOfLine(currentLineContainer);
    }

    // Insert the response in a new box
    insertAndEnterBox();
    insertTextAtCursor(response.trim());
    exitBoxRight();

    console.log("Cursor moved to:", document.activeElement);
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
function insertLlmResponse(response) {
    let currentLineContainer = cursor.parentNode;
    let nodes = Array.from(currentLineContainer.childNodes);
    let foundPipe = false;
    let indexAfterPipe = 0;

    // Find the '|' character and note where to start clearing content
    for (let i = 0; i < nodes.length; i++) {
        let node = nodes[i];
        if (node.nodeType === Node.TEXT_NODE && node.textContent.includes('|')) {
            let pipeIndex = node.textContent.indexOf('|');
            node.textContent = node.textContent.substring(0, pipeIndex + 1); // Keep everything before and including '|'
            foundPipe = true;
            indexAfterPipe = i + 1;
            break;
        }
    }

    // Remove all nodes after the '|' character
    nodes.slice(indexAfterPipe).forEach(node => node.remove());

    // Normalize space around '|'
    if (foundPipe) {
        moveCursorToEndOfLine(currentLineContainer);
        insertTextAtCursor(' ');
    } else {
        insertTextAtCursor(' | ');
        moveCursorToEndOfLine(currentLineContainer);
    }

    // Insert the response in a new context box
    insertAndEnterBox();
    insertTextAtCursor(response.trim());
    exitBoxRight();
}


function moveCursorToEndOfLine(parentNode) {
    let lastTextNode = null;
    parentNode.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
            lastTextNode = node; // Update to the last text node
        }
    });
    if (lastTextNode) {
        moveCursor(lastTextNode, lastTextNode.textContent.length);
    } else {
        moveCursor(parentNode, parentNode.childNodes.length); // Fallback to the end of the parent node
    }
}




function llmDuplicateTest() {
    let response = getBoxRowsText();
    console.log("getBoxRowsText", response);
    insertLlmResponse(response)
}

function getChatHistory() {
    const rowsText = [];
    let currentNode = document.getElementById('editor').firstChild;
    let rowText = [];

    while (currentNode) {
        if (currentNode.nodeType === Node.TEXT_NODE) {
            rowText.push(currentNode.textContent);
        } else if (currentNode.classList && currentNode.classList.contains('box')) {
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



keyMap['Ctrl-|'] = llmInfer;
keyMap['|'] = llmChat;
// keyMap['Tab'] = llmDuplicateTest
// keyMap['Tab'] = chatTest



