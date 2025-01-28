# Boxy

Boxy is an interactive text-based interface that allows users to navigate and manipulate a structured document composed of nested "boxes". 

### **Boxy Model: Overview**
The Boxy Model provides a unique way to interact with structured content using nested boxes and Emacs-style navigation. The model combines direct DOM manipulation with high-level scripting capabilities, focusing on ease of navigation and manipulation through keyboard commands.


### **DOM Structure**
1. **Editor Container**
   - The root of the interface is a `<div>` with the ID `editor` and class `box`.
   - It has `contenteditable="false"` and `tabindex="0"` to handle keyboard input.
   - Contains a `<span class="cursor">` element for cursor positioning.
2. **Boxes**
   - Boxes are represented as `<div>` elements with the class `box`.
   - Boxes can contain rows of text and other boxes, enabling arbitrary nesting.
   - Each box is treated as a single unit in most cursor movements, though users can enter and edit them using specific commands.
3. **Rows and Text**
   - Text content is stored in text nodes within boxes.
   - Rows are implicitly defined by newline characters (`\n`), which separate lines of text within a box.

### **Editor Functionality**
The editor provides a text-based interface with nested box manipulation capabilities.
1. **Navigation**
   - The editor supports Emacs-style key bindings for cursor movement (e.g., `Ctrl-f`, `Ctrl-b`, `Ctrl-p`, `Ctrl-n`).
   - Cursor movements treat boxes as single units by default, though specific commands allow entering and exiting boxes.
   - Boxes can be entered using `[` or `Ctrl-[`, and exited using `]` or a mouse click.
2. **Text Manipulation**
   - The editor allows insertion and deletion of characters, as well as more advanced operations like `kill-line` (`Ctrl-k`).
   - Newlines are handled as implicit row boundaries, allowing text to flow naturally across multiple lines.
3. **Box Manipulation**
   - Boxes can be inserted at the cursor position using `[` or `Ctrl-[`.
   - Exiting a box moves the cursor to the position immediately before or after the box, depending on the command used.
   - Boxes are serialized as `[...]` in their parent rows, with nested boxes represented recursively.

### **Evaluator**
The evaluator provides a way to process and modify the content of boxes.
1. **Evaluation Workflow**
   - Evaluation is initiated using a command (e.g., `|` or `Ctrl-|`).
   - The result of an evaluation is appended to the current row, following a ` | ` separator, with normalized spacing.
2. **Serialization**
   - Boxes are serialized as their contents enclosed in `[...]`, with nested boxes represented recursively.
   - For example, a box containing "Hello" and a nested box containing "World" would be serialized as `[Hello[World]]`.
3. **Scripting**
   - The evaluator provides primitives for manipulating the document structure, allowing scripts to:
     - Insert and modify boxes and text.
     - Navigate the document hierarchy.
     - Access the current cursor position and row content.

### **Cursor Management**
The cursor's position determines the active context within the document.
1. **Movement**
   - The cursor can move within the current box, row, or document.
   - Vertical movements (`Ctrl-p`/`Ctrl-n`) maintain a "goal column" to align the cursor vertically across rows.
   - Horizontal movements (`Ctrl-f`/`Ctrl-b`) treat boxes as single units by default.
2. **Box Entry**
   - Entering a box moves the cursor to the start of its content.
   - Exiting a box moves the cursor to the boundary of the box in its parent row.
3. **Specialized Commands**
   - `moveCursorToStartOfBox()`: Moves the cursor to the start of the current box.
   - `moveCursorToEndOfBox()`: Moves the cursor to the end of the current box.
   - `moveCursorToStartOfLineInBox()`: Moves the cursor to the start of the current row.
   - `moveCursorToEndOfLineInBox()`: Moves the cursor to the end of the current row.
   - `statusLedOn()`: Turns status-led on.
   - `statusLedOff()`: turns'status-led off.


### **Key Commands**
The editor supports a variety of keyboard shortcuts for navigation and manipulation:

| Command             | Description                                  |
|---------------------|----------------------------------------------|
| `[` / `Ctrl-[`      | Insert a new box and enter it.               |
| `]` / Mouse Click    | Exit the current box.                       |
| `Ctrl-f` / `Ctrl-b` | Move cursor forward/backward.                |
| `Ctrl-p` / `Ctrl-n` | Move cursor up/down.                         |
| `Ctrl-k`            | Kill line (delete from cursor to end of row).|
| `Ctrl-d`            | Delete character forward.                    |
| `Backspace`         | Delete character backward.                   |
| `|` / `Ctrl-|`      | Evaluate current row or selection.           |

---

### **Implementation Details**
1. **Insertion and Deletion**
- Text insertion uses `insertCharAtCursor()` and `insertTextAtCursor()`.
- Box insertion creates a new `<div>` element with the `box` class.
- Deletion removes text or nodes while maintaining document structure.
2. **Cursor Positioning**
- The cursor is represented as a `<span>` element with the class `cursor`.
- Cursor movements are handled by `moveCursorTo()`, which updates the cursor's position in the DOM.
3. **Text and Box Serialization**
- The `gatherEntireBox()` function serializes a box and its contents, including nested boxes.
- The `getCurrentRowText()` function collects text from the current row, handling boxes and text nodes appropriately.

### **Evaluator Integration**
The evaluator interacts with the document through high-level functions:
1. **Text Access**
- `getCurrentRowText()`: Returns the current row's text content, excluding the cursor.
- `getCurrentBoxText()`: Returns all rows of text in the current box.
2. **Manipulation**
- The evaluator can insert new content at the cursor position or modify existing boxes.
- Results of evaluations are appended to the current row, following a ` | ` separator.

### **Limitations**
1. **Undo/Redo**: Currently not implemented.
2. **Selection**: Basic selection is not fully supported beyond cursor movement.
3. **Clipboard Operations**: Cut/copy/paste functionality is incomplete.
4. and refine the evaluator's integration with the document structure.

---

### Editor SPI
You can use this stable SPI to implement new editor primitive operations (e.g. for keybindings)

#### **Manipulation Functions**
- `insertCharAtCursor()`
- `insertTextAtCursor()`
- `insertNewline()`
- `deleteCharAtCursor()`
- `insertAndEnterBox()`
- `killLine()`
- `deleteCurrentBox()`

### **Cursor Management Functions**
- `moveCursorTo()`
- `moveCursorToStartOfBox()`
- `moveCursorToEndOfBox()`
- `moveCursorToStartOfLineInBox()`
- `moveCursorToEndOfLineInBox()`
- `getCurrentCursorPosition()`
- `setCursorPosition()`

### **Box Operations**
- `insertAndEnterBox()`
- `deleteCurrentBox()`
- `replaceBoxContent()`
- `serializeBox()`


### Evaluator SPI
You can use this stable SPI to implement new evaluator primitive operations (e.g. for functions or keybindings)

### **Text Access Functions**
- `getCurrentRowText()`
   Retrieves the current row's text content, excluding the cursor.
- `getCurrentBoxText()`
  Returns all rows of text in the current box, including nested boxes.
- `gatherEntireBox()`  
   Serializes a box and its contents, including nested boxes, as a single string.
- `serializeBox()`  
   Converts a box and its contents into a string representation enclosed in `[...]`.
- `deserializeBox()`
   parses a serialized box string back into DOM elements.

### **Utility Functions**
- `highlightText()`
  Applies visual highlighting to specified text.
- `getTextBetweenCursors()`
  Retrieves text between two cursor positions.
- `getCurrentCursorPosition()`  
  Returns the cursor's current position within the document.

### **Limitations**
1. **Undo/Redo**: Currently not implemented.
2. **Selection**: Basic selection is not fully supported beyond cursor movement.
3. **Clipboard Operations**: Cut/copy/paste functionality is incomplete.
4. and refine the evaluator's integration with the document structure.

