// modules/markdown/markdown.js

marked.setOptions({
  gfm: true,
  breaks: false
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
  const markdownText = serializeBox(box);

  // Jimmy the text
  const jimmiedText = markdownText.replace(/\n\n/g, '\n');

  // Use marked to parse and format the markdown
  const formattedHtml = marked.parse(jimmiedText);

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

  removeWhitespaceBetweenListItems(box);
}

// function removeWhitespaceBetweenListItems(box) {
//   const uls = box.querySelectorAll('ul');
//   uls.forEach(ul => {
//     let currentNode = ul.firstChild;
//     while (currentNode) {
//       const nextNode = currentNode.nextSibling;
//       if (currentNode.nodeType === Node.TEXT_NODE && currentNode.nodeValue.trim() === '') {
//         ul.removeChild(currentNode);
//       }
//       currentNode = nextNode;
//     }
//   });
// }

// Execute the function after the DOM is fully loaded
window.addEventListener('DOMContentLoaded', (event) => {
  removeWhitespaceBetweenListItems();
});

keyMap['Ctrl-\\'] = formatMarkdownBoxKey;

