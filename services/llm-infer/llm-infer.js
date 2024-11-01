async function callOpenAPI(question, mode, temperature, repetition_penalty, penalize_nl, seed) {
    const requestBody = {
        messages: [
            {
                role: "user",
                content: question
            }
        ],
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
    console.log(question);

    const response = await callOpenAPI(question, "chat", 0.7, 1.0, 0.0, 42);

    if (question.includes('|')) {
        // Find the first '|' in current row and delete it and the rest of the row
        let currentRow = cursor.parentNode;
        let node = currentRow.firstChild;

        while (node) {
            if (node.nodeType === Node.TEXT_NODE && node.textContent.includes('|')) {
                const textContent = node.textContent;
                const index = textContent.indexOf('|');
                if (index > -1) {
                    // Remove the entire text node
                    currentRow.removeChild(node);
                    break;
                }
            }
            node = node.nextSibling;
        }
    }

    insertTextAtCursor('   |   ');
    insertAndEnterBox();
    insertTextAtCursor(response);
    exitBoxRight();

    console.log("Cursor moved to:", document.activeElement);
}

