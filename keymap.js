// Key map for commands
const keyMap = {
    '[': insertAndEnterBox,
    '(': insertAndEnterBox,
    ']': exitBoxRight,
    ')': exitBoxRight,
    'Ctrl-[': enterNextBox,
    'Ctrl-(': enterNextBox,
    'Ctrl-]': exitBoxLeft,
    'Ctrl-)': exitBoxLeft,
    'Ctrl-f': moveCursorRightWithinBox,
    'Ctrl-b': moveCursorLeftWithinBox,
    'Ctrl-a': moveCursorToStartOfLineInBox,
    'Ctrl-d': deleteCharForward,
    'Ctrl-e': moveCursorToEndOfLineInBox,
    'Ctrl-k': killLine,
    'Ctrl-p': moveCursorUp,
    'Ctrl-n': moveCursorDown,
    'Ctrl-q': insertQuotedChar,
    'ArrowLeft': moveCursorLeftWithinBox,
    'ArrowRight': moveCursorRightWithinBox,
    'ArrowUp': moveCursorUp,
    'ArrowDown': moveCursorDown,
    'Backspace': deleteCharAtCursor,
    'Enter': insertNewline
};

