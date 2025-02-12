// modules/save-restore/save-restore.js

// todo: use localStorage() in addition to URL-based
// that will give local users save/restore capability as well

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
  killResponse();
  let url = getCurrentRowText().trim();
  fetchUrlToString(url)
    .then(data => {
      console.log(`Fetched ${url}`);
      killResponse()
      insertResponse(data);	// applyMarkdown? images?
    })
    .catch(error => {
      showError(`loadBoxFromString(${url}) error ${error}`)
    })
}

function downloadSerializedBoxy() {
  downloadSerializedBox(editor);
}

function downloadSerializedCurrentBox() {
  downloadSerializedBox(cursor.parentNode);
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
