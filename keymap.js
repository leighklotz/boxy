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
  'Ctrl-c': toggleShrinkBox,
  'Ctrl-d': deleteCharForward,
  'Delete': deleteCharForward,
  'Ctrl-e': moveCursorToEndOfLineInBox,
  'Ctrl-k': killLine,
  'Ctrl-p': moveCursorUp,
  'Ctrl-n': moveCursorDown,
  'Ctrl-q': insertQuotedChar,
  'Ctrl-,': moveCursorToStartOfBox,
  'Ctrl-.': moveCursorToEndOfBox,
  'Ctrl-*': formatMarkdownBox,
  'ArrowLeft': moveCursorBackward,
  'ArrowRight': moveCursorForward,
  'ArrowUp': moveCursorUp,
  'ArrowDown': moveCursorDown,
  'Backspace': deleteCharAtCursor,
  'Enter': insertNewline
};
