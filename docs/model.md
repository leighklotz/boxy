# Boxy

Boxy is an interactive text-based interface that allows users to navigate and manipulate a structured document composed of nested "boxes". 

### **Boxy Model: Overview**
The Boxy Model provides a unique way to interact with structured content using nested boxes and Emacs-style navigation. The model combines direct DOM manipulation with high-level scripting capabilities, focusing on ease of navigation and manipulation through keyboard commands.


### **DOM Structure**
1. **Editor Container**
   - The root of the interface is a `<div>` with the ID `editor` and class `box`.
   - It has `contenteditable="false"` and `tabindex="0"` to handle keyboard input.
   - Contains an `<input class="cursor">` element for cursor positioning.
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
   - The `CursorManager` maintains a `virtualIndex` representing the logical position within the current **Row**.
   - Boxes can be entered using `[` or `Ctrl-[`, and exited using `]` or `Ctrl-]`.
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

### **Cursor Management (Floating Cursor Strategy)**
To avoid DOM fragmentation caused by excessive `splitText` operations, Boxy uses a **Floating Cursor** strategy.
1. **Row-driven Navigation**: The cursor position is tracked via a `virtualIndex` within the current **Row** (the sequence of text nodes and box elements).
2. **Visual Positioning**: Instead of inserting an `<input>` into the DOM tree, the `CursorManager` calculates the visual coordinates of the logical position using the `Range` API and positions the cursor absolutely over the editor.
3. **Modes**: 
   - `SURFACE`: The cursor navigates the top-level Row of the editor.
   - `INTERIOR`: The cursor navigates the internal Row of a specific box.

### **Key Commands**
The editor supports a variety of keyboard shortcuts for navigation and manipulation, in additon to mouse clicks:

| Command             | Description                                  |
|---------------------|----------------------------------------------|
| `[`                 | Insert a new box and enter it.               |
| `Ctrl-[`            | Enter box to right.                          |
| `Ctrl-]`            | Exit box to left.                            |
| `]` /               | Exit the current box.                        |
| `Ctrl-f` / `Ctrl-b` | Move cursor forward/backward.                |
| `Ctrl-p` / `Ctrl-n` | Move cursor up/down.                         |
| `Ctrl-k`            | Kill line (delete from cursor to end of row).|
| `Ctrl-d`            | Delete character forward.                    |
| `Backspace`         | Delete character backward.                   |
| `|`                 | Evaluate current row or selection.           |
| `Ctrl-|`            | Evaluate current box.                        |

---

### **Implementation Details**
1. **Insertion and Deletion**
- Text insertion uses `insertCharAtCursor()` and `insertTextAtCursor()`, which update the `virtualIndex` within the current Row.
- Box insertion creates a new `<div>` element with the `box` class.
- Deletion removes text or nodes while maintaining document structure.
2. **Cursor Positioning**
- The cursor is a floating `<input>` element.
- Physical DOM positioning is synchronized via `CursorManager.syncDOM()` using `getBoundingClientRect()`.
3. **Text and Box Serialization**
- The `serializeBox()` function serializes a box and its contents, including nested boxes.
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
4. **Row Synchronization**: Refining edge cases where the Row-driven `virtualIndex` and the physical DOM deviate.

---

### Editor SPI
You can use this stable SPI to implement new editor primitive operations (e.g. for keybindings)

#### **Manipulation Functions**
- `insertCharAtCursor()`
- `insertTextAtCursor()`
- `insertNewline()`
- `deleteCharAtCursor()`
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
- `moveCursorBackward()`
- `moveCursorForward()`


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
- `serializeBox(boxElem)`
   Retrieves the specified box's text content, excluding the cursor.
- `deserializeBox()`
   parses a serialized box string back into DOM elements.

### **Utility Functions**
- `highlightText()`
  Applies visual highlighting to specified text.
- `getTextBetweenPoints()`
  Retrieves text between two cursor positions.
- `getCurrentCursorPosition()`  
  Returns the cursor's current position within the document.

### **Limitations**
1. **Undo/Redo**: Currently not implemented.
2. **Selection**: Basic selection is not fully supported beyond cursor movement.
3. **Clipboard Operations**: Only ctrl-k and ctrl-y are implemented. No styling.
4. and refine the evaluator's integration with the document structure.
