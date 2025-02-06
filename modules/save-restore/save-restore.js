/** 
 * Example use:
 * fetchUrlToString('https://www.example.com/')
 *  .then(data => {
 *    console.log(data); // The response text as a string
 *  })
 *  .catch(error => {
 *    // Handle errors here
 *  });
*/
async function fetchUrlToString(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    console.error('Error fetching URL:', error);
    throw error;
  }
}

function loadBoxFromString() {
  let url = getCurrentRowText().trim();
  fetchUrlToString(url)
    .then(data => {
      console.log(`Fetched ${url}`);
      killResponse()
      insertResponse(data);	// applyMarkdown?
    })
    .catch(error => {
      showError(`loadBoxFromString(${url}) error ${error}`)
    })
}

function downloadSerializedBoxy() {
  downloadSerializedBox(editor);
}

function downloadSerializedCurrentBox() {
  return downloadSerializedBox(cursor.parentNode);
}

function downloadSerializedBox(box) {
  // Serialize the box
  const serializedString = serializeBox(box);

  // Create a Blob from the serialized string
  const blob = new Blob([serializedString], {type: 'text/plain'});

  // Create a temporary URL for the Blob
  const url = window.URL.createObjectURL(blob);

  // Create a hidden link element
  const a = document.createElement('a');
  a.href = url;
  a.download = 'boxy.box'; // Set the filename

  // Append the link to the body and simulate a click
  document.body.appendChild(a);
  a.click();

  // Clean up
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
