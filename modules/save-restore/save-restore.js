// modules/save-restore/save-restore.js

// todo: use localStorage() in addition to URL-based
// that will give local users save/restore capability as well
// options, with (b) currently preferred
// - (a) auto save/restore just one box: global space prevents different boxes in different browser tabs
// - (b) like current save/restore, but to local storage: easy to implement but save/update/overwrite issues
// - (c) menu of boxes: flat space, similar to Arduino examples and sketches: easy to implement
// - (d) skip out into an outer-limits box that shows all the boxes in local storage and you can then click on one: cool but hard to do
function saveToLocalStorage() {
  const serializedString = serializeBox(editor);
  localStorage.setItem('savedBox', serializedString);
  showStatus('Box saved to localStorage');
}

function loadFromLocalStorage() {
  const savedData = localStorage.getItem('savedBox');
  if (savedData) {
    insertResponse(savedData);
    showStatus('Box loaded from localStorage');
  } else {
    showError('No saved box found in localStorage');
  }
}

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
  const extension = url.split('.').pop().toLowerCase();
  const imageExtensions = ['jpg', 'png', 'webp', 'jpeg'];

  if (imageExtensions.includes(extension)) {
    // Handle image URLs
    const img = document.createElement('img');
    img.src = url;
    img.style.maxWidth = '100%'; // Ensure image doesn't overflow
    insertResponse(img.outerHTML);
    return;
  }

  // Handle .box files and other URLs
  fetchUrlToString(url)
    .then(data => {
      console.log(`Fetched ${url}`);
      killResponse();
      insertResponse(data);
    })
    .catch(error => {
      showError(`loadBoxFromString(${url}) error: ${error}`);
    });
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
