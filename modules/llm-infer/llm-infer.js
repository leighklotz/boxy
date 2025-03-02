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

async function llmInfer() {
  statusLedOn('llm');

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
    insertResponse(response, applyMarkdown=true);
  } catch (error) {
    console.error("Error during inference:", error);
    statusLedOn('error')
    throw new Error("Failed to get LLM response. Please try again.", error);
  } finally {
    statusLedOff('llm');
  }
}

// todo: use open api chat history instead of just string concat
async function llmChat() {
  statusLedOn('llm');
  try {
    let history_raw = getBoxRowsText(cursor.parentNode);
    console.log("llmChat history_raw", JSON.stringify(history_raw));
    let chatHistory = constructChatHistory(history_raw);
    console.log("llmChat chatHistory", JSON.stringify(chatHistory));
    const response = await callOpenAPI(chatHistory, "chat", 0.7, 1.0, 0.0, 42);
    console.log("llmChat response", JSON.stringify(response));
    insertResponse(response, applyMarkdown=true);
  } catch (error) {
    console.error("Error during chat:", error);
    statusLedOn('error')
    throw new Error("Failed to get LLM response. Please try again.", error);
  } finally {
    statusLedOff('llm');
  }
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
  let history_raw = getBoxRowsText(cursor.parentNode);
  let chatHistory = constructChatHistory(history_raw);

  console.log(JSON.stringify(chatHistory));
}

