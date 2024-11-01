# Async JavaScript Function for Calling OpenAI Compatible API from Local Files

## Introduction

In this article, we'll explore how to create an asynchronous JavaScript function to interact with an OpenAI compatible API, specifically designed to work seamlessly from local files and a local Oobabooga Text Generation UI server. This function will enable you to make POST requests to the API and receive text responses, all while handling the intricacies of cross-origin requests and JSON parsing.

## Prerequisites

Before diving into the function, let's cover some prerequisites and essential concepts:

### Local File Limitations

When working with HTML files served from the local file system (`file://`), you encounter the same-origin policy enforced by web browsers. This policy restricts interactions between resources from different origins to prevent security vulnerabilities like cross-site scripting attacks.

### Fetch API

The Fetch API provides a modern, flexible way to make network requests in JavaScript. It offers a Promise-based interface, making it easier to handle asynchronous operations and integrate with modern JavaScript features.

### CORS (Cross-Origin Resource Sharing)

To bypass the same-origin policy, you need to ensure that the server you're communicating with allows cross-origin requests. This is typically handled by configuring CORS headers on the server.

## Setting Up the Local Server

To work around the same-origin policy, you can set up a local web server. This server will act as a proxy, allowing your local HTML file to make requests to the API.

### Example with Python's SimpleHTTPServer

You can use Python's built-in `http.server` module to set up a simple HTTP server:

```sh
python -m http.server 3000
```

This command will start a server on `http://localhost:3000`, serving files from the current directory.

## Creating the `callOpenAPI` Function

Now that we have a local server set up, we can create the `callOpenAPI` function. This function will make a POST request to the OpenAI compatible API and return the text response.

### Function Definition

Here's the complete function:

```javascript
async function callOpenAPI(question, mode, temperature, repetition_penalty, penalize_nl, seed) {
    const apiUrl = "http://tensor-psy.klotz.me:5000/v1/chat/completions";

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

// Example of calling the function
callOpenAPI("What is the meaning of life?", "chat", 0.7, 1.0, 0.0, 42)
    .then(response => console.log(response))
    .catch(error => console.error("Error:", error));
```

### Explanation

1. **API URL**: The `apiUrl` variable holds the endpoint of the OpenAI compatible API.

2. **Request Body**: The `requestBody` object contains the parameters required by the API. Adjust these parameters as needed for your specific use case.

3. **Fetch Request**: The `fetch` function makes the POST request to the API. The `headers` object specifies that the request body is in JSON format.

4. **Response Handling**: The function checks if the response is successful (`response.ok`). If not, it throws an error. Otherwise, it parses the JSON response and extracts the text response from the assumed structure.

## Adapting to Other Backends

This function can be easily adapted to work with other backends by changing the `apiUrl` and adjusting the request body parameters as needed.

## Conclusion

By following the steps outlined in this article, you can create an asynchronous JavaScript function that interacts with an OpenAI compatible API from local files and a local Oobabooga Text Generation UI server. This function handles the complexities of cross-origin requests and JSON parsing, providing a seamless way to make API calls from your local development environment.

Happy coding! 🚀
