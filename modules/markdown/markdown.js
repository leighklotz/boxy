// modules/markdown/markdown.js

marked.setOptions({
  gfm: true,
  newlines: false
});

function formatMarkdownBox() {
  // Get the text content from current box
  const markdownText = getBoxText(cursor.parentNode);

  // Use marked to parse and format the markdown
  const formattedHtml = marked.parse(markdownText);

  // Sanitize
  const sanitizedHtml = sanitize_dom(formattedHtml);
  
  // Display the formatted markdown in the box
  cursor.parentNode.innerHTML = formattedHtml;

  // todo: repair the cursor. probably is is lost.
  // moveCursorToStartOfBox()
}

keyMap['Ctrl-*'] = formatMarkdownBox;

