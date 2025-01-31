// modules/markdown/markdown.js

marked.setOptions({
  gfm: true,
  newlines: false
});

function formatMarkdownBoxKey() {
  let box = cursor.parentNode;
  // Cursor will be lost
  exitBoxRight();
  formatMarkdownBox(box)
}

function formatMarkdownBox(box) {
  if (box === editor) {
    showError("Cannot format toplevel box as markdown");
    return;
  }
  // Get the text content from current box
  const markdownText = getBoxText(box);

  // Use marked to parse and format the markdown
  const formattedHtml = marked.parse(markdownText);

  // Sanitize
  const sanitizedHtml = sanitize_dom(formattedHtml);
  
  let priorContent = box.innerHTML;

  // Create a function that will revert the content and then remove the event listener
  const restoreAndRemoveListener = () => {
    box.innerHTML = priorContent;
    box.removeEventListener('click', restoreAndRemoveListener);
  };

  // todo: this fails becuase our cursor is not real and so there is no blur event
  // probablty we should be moving toward boxtops
  if (false) {
    box.addEventListener('blur', () => {
      box.innerHTML = formattedHtml;
    });
  }

  // Add the event listener to revert the content on click
  box.addEventListener('click', restoreAndRemoveListener);

  // Display the formatted markdown in the box
  box.innerHTML = formattedHtml;
}

keyMap['Ctrl-\\'] = formatMarkdownBoxKey;

