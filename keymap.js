// Key map for commands
const keyMap = {
  '[': insertAndEnterBox,
  '(': insertAndEnterCodeBox,
  ']': exitBoxRight,
  ')': exitBoxRight,
  'Ctrl-[': enterNextBox,
  'Ctrl-(': enterNextBox,
  'Ctrl-]': exitBoxLeft,
  'Ctrl-)': exitBoxLeft,
  'Ctrl-f': moveCursorForward,
  'Ctrl-b': moveCursorBackward,
  'Ctrl-a': moveCursorToStartOfLineInBox,
  'Ctrl-C': shrinkBox,
  'Ctrl-d': deleteCharForward,
  'Delete': deleteCharForward,
  'Ctrl-e': moveCursorToEndOfLineInBox,
  'Ctrl-k': killLine,
  'Ctrl-p': moveCursorUp,
  'Ctrl-n': moveCursorDown,
  'Ctrl-q': insertQuotedChar,
  'Ctrl-R': () => { window.location.reload() },
  'Ctrl-y': yank,
  'Ctrl-,': moveCursorToStartOfBox,
  'Ctrl-.': moveCursorToEndOfBox,
  'Ctrl-*': explodeBox,
  'F3': toggleCurrentBoxExpansion,
  'ArrowLeft': moveCursorBackward,
  'ArrowRight': moveCursorForward,
  'ArrowUp': moveCursorUp,
  'ArrowDown': moveCursorDown,
  'Backspace': deleteCharAtCursor,
  'Enter': insertNewline
};

// todo: make keyMap value into an object so we can define the label and menu there and automate this:
addToMenu('Toggle Theme', toggleTheme, '');
addToMenu('Expand/Contract Box', toggleCurrentBoxExpansion, 'F3');
addToMenu('Explode Box', explodeBox, 'Ctrl-*');
