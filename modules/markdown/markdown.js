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

  // Claim the 'markdown' class
  if (box.classList.contains('markdown')) {
    showError("Box is already markdown");
    return;
  }
  box.classList.add('markdown');

  // Get the text content from current box
  const markdownText = serializeBox(box);

  // Jimmy the text
  const jimmiedText = markdownText.replace(/\n\n/g, '\n').trim();

  // Use marked to parse and format the markdown
  const formattedHtml = marked.parse(jimmiedText);

  // Sanitize
  const sanitizedHtml = sanitize_dom(formattedHtml);

  let priorContent = box.innerHTML;

  // Create a function that will revert the content and then remove the event listener
  const restoreAndRemoveListener = () => {
    box.innerHTML = priorContent;
    box.classList.remove('markdown');
    box.removeEventListener('click', restoreAndRemoveListener);
  };

  // this fails becuase our cursor is not real and so there is no blur event
  // probablty we should be moving toward boxtops and/or dispatch our
  // own boxblur event, hence we need an event schema.
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

function removeWhitespaceBetweenListItems(box) {
  if (!box) return; // Check if the box element exists
  const uls = box.querySelectorAll('ul'); // Find all <ul> elements inside the box
  
  uls.forEach(ul => {
    // Remove whitespace inside the <ul>
    let currentNode = ul.firstChild;
    while (currentNode) {
      const nextNode = currentNode.nextSibling; // Cache the next sibling
      if (currentNode.nodeType === Node.TEXT_NODE && currentNode.nodeValue.trim() === '') {
        ul.removeChild(currentNode); // Remove whitespace text nodes
      }
      currentNode = nextNode;
    }

    // Remove whitespace after the <ul>
    let nextNode = ul.nextSibling;
    while (nextNode && nextNode.nodeType === Node.TEXT_NODE && nextNode.nodeValue.trim() === '') {
      const nodeToRemove = nextNode;
      nextNode = nextNode.nextSibling; // Cache the next sibling
      ul.parentNode.removeChild(nodeToRemove); // Remove the text node
    }
  });
}

// Execute the function after the DOM is fully loaded
// todo: why?
window.addEventListener('DOMContentLoaded', (event) => {
  removeWhitespaceBetweenListItems();
});

keyMap['Ctrl-\\'] = formatMarkdownBoxKey;
