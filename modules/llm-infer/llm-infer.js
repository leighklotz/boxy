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

//// Find the first '|' in current row and delete it and the rest of the line.
//// then, Insert the ' | ' and the response.
//// normalize space around ' | ' to one space each side.
function insertLlmResponse(response) {
    let currentRow = cursor.parentNode;
    let node = currentRow.firstChild;

    // Traverse the current line to find the text node containing the '|'
    while (node) {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.includes('|')) {

            // Delete from node to the end of the line
            while (node) {
                if (node.nodeType === Node.TEXT_NODE) {
                    const newlineIndex = node.textContent.indexOf('\n');
                    if (newlineIndex !== -1) {
                        // Keep the newline
                        node.textContent = node.textContent.slice(newlineIndex);
                        break;
                    } else {
                        // Remove entire text node if no newline
                        node.remove(); 
                    }
                } else {
                    // Remove non-text nodes
                    node.remove();
                }
                node = cursor.nextSibling; // Move to next sibling
            }

            found = true;
            break;
        }
        node = node.nextSibling;
    }

    insertTextAtCursor(' | ');
    insertAndEnterBox();
    insertTextAtCursor(response.trim());
    exitBoxRight();
    
    console.log("Cursor moved to:", document.activeElement);
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



