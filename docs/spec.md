# Boxy Specification 

Here is a spec for Boxy, a simpler implementation of the Boxer editor:

Here’s a UX specification for implementing a visual editor that handles both text and nested boxes recursively, with Emacs-style cursor motion rules:

## Boxy Editor Spec
### 1. **Overall UI Design**
   - **Text Editor Canvas:** 
     - A central area where users can enter and edit text and boxes.
     - Boxes are treated as characters within the text stream, meaning they can be inserted, selected, and manipulated just like regular text characters.
   - **Boxes:**
     - Boxes should appear as distinguishable, bordered elements within the text flow.
     - Nested boxes should be visually represented, showing their parent-child relationship clearly.
     - Users can expand or collapse boxes, revealing or hiding nested content, but collapsed boxes should retain a placeholder representation in the flow.
   - **Text Entry and Cursor Behavior:**
     - Text should be editable within or outside of boxes.
     - The cursor should behave in a predictable, Emacs-like manner across both text and box boundaries.

### 2. **Emacs-style Cursor Movement**
   - **Vertical Movement (C-p and C-n):**
     - Maintain column position as the user navigates vertically.
     - Handle lines of varying lengths by stopping at the end of the line when shorter than the goal column.
     - Skip over empty lines while aiming to restore the goal column once a sufficiently long line is reached.
   - **Horizontal Movement (C-f and C-b):**
     - Treat the contents of boxes as individual characters, meaning a single horizontal move should allow the cursor to enter or leave a box.
     - When inside a box, horizontal navigation should allow character-by-character movement or navigation to nested boxes.
   - **Box Traversal:**
     - C-f should move into a box if it’s at the cursor position, and C-b should exit the box, treating it like moving between characters.
   - **Column Resetting:**
     - If horizontal movement occurs, reset the goal column for subsequent vertical navigation.
   - **Selection and Editing:**
     - Standard Emacs commands (or equivalents) should work for selecting text, cutting, and pasting, even when dealing with nested boxes.
     - Boxes can be selected, cut, and pasted as entire units, preserving nested content.

### 3. **Box Management**
   - **Adding Boxes:**
     - Users should be able to create new boxes with a command or a UI element.
     - Newly created boxes should appear inline at the cursor position.
   - **Resizing Boxes:**
     - Users should be able to resize boxes either by dragging edges or through commands.
   - **Moving Boxes:**
     - Boxes should be movable within the text flow, just like text characters, using cut/paste or equivalent commands.

### 4. **Nested Box Behavior**
   - Boxes can contain other boxes, creating a hierarchy.
   - When navigating inside nested boxes, the behavior should adapt accordingly:
     - Vertical movement should continue to respect the goal column, even within nested boxes.
     - Horizontal movement should allow entry and exit of nested boxes.
   - Expanding and collapsing boxes should be possible without losing the contents or breaking the text flow.

### 5. **Undo/Redo Functionality**
   - All actions (including adding, deleting, and resizing boxes) should be undoable and redoable.
   - The undo/redo stack should maintain Emacs-style history, preserving changes sequentially.

### 6. **Command Palette for Editor Actions**
   - A command palette, similar to Emacs’ M-x, should allow users to execute editor commands (e.g., create a box, expand/collapse, move cursor) via keyboard shortcuts or text-based commands.

### 7. **Keyboard Shortcuts**
   - Standard Emacs shortcuts should be used wherever applicable for familiar commands:
     - C-p, C-n, C-f, C-b for movement.
     - C-k to kill lines, C-y to yank (paste), etc.
   - Box-specific commands should also have shortcuts, e.g., create box, enter box, exit box.

### 8. **User Feedback**
   - Cursor position should be clearly visible, even inside nested boxes.
   - When moving across boundaries (e.g., entering/exiting a box), provide subtle visual feedback (e.g., a border highlight or color change).
   - Ensure that users are aware of changes to the goal column or cursor behavior through subtle hints, e.g., a tooltip or a brief visual marker.

## Boxy Mouse Bindings
| **Mouse**  | **Action** -| **Description**                              |
|------------|-------------|----------------------------------------------|
| Left Click | Move Cursor |Move cursor to position clicked, inside boxes.|
| Click Drag | Select text |Mark the dragged-over text as selected.       |

## Boxy Editor Key Bindings
Below is comprehensive table of key bindings for the visual editor, based on standard Emacs conventions along with custom commands for managing boxes.
Note that if a text region is selected, any insert or delete commands will delete the current region first.

| **Key Binding** | **Action**                            | **Description**                                          |
|-----------------|---------------------------------------|----------------------------------------------------------|
| [               | Insert and enter box                  | Insert a box at the point and enter it.                  |
| (               | Insert and enter box                  | Insert a box at the point and enter it.                  |
| ]               | Exit box                              | Exit current box and put pouint after it.                |
| )               | Exit box                              | Exit current box and put pouint after it.                |
| C-[             | Enter box                             | Enter box after point                  |
| C-(             | Enter box                             | Enter box after point                  |
| C-)             | Exit box to left                      | Exit current box and put point before it             |
| C-)             | Exit box to left                      | Exit current box and put point before it              |
| C-p             | Move cursor up                        | Move cursor to the previous line, maintaining goal column. |
| C-n             | Move cursor down                      | Move cursor to the next line, maintaining goal column.     |
| C-f             | Move cursor forward                   | Move cursor to the next character; enters boxes if present.|
| C-b             | Move cursor backward                  | Move cursor to the previous character; exits boxes if present. |
| C-a             | Move to beginning of line in box      | Move cursor to the start of the current line in box.       |
| C-e             | Move to end of line in box            | Move cursor to the end of the current line in box          |
| C-f             | Move forward                          | Move cursor forward one char or box          |
| C-b             | Move backward                         | Move cursor backward one char or box          |
| C-p             | Move up                               | Move cursor up one row in box box, preserving goal column          |
| C-n             | Move down                             | Move cursor down one row in box box, preserving goal column          |
| Arrow Keys      | Move Up, Down, Left, or Right         | Like Ctrl-P, Ctrl-N, Ctrl-B, Ctrl-F. |
| C-k             | Kill line                             | Delete content from cursor to the end of the line in box   |
| C-y             | Yank (paste)                          | Paste previously cut or copied text/box at the cursor position. Remove from clipboard.|
| C-w             | Cut region                            | Cut the selected region or current box to the clipboard.   |
| C-c             | Copy Region                           | Copy the selected region or current box to the clipboard.   |
| C-Shift-C       | Collapse/Expand box                   | Collapse or expand the currently selected box with nested content. |
| C-leftarrow     | Undo                                  | Undo the last action.                                      |
| C-rightarrow    | Redo                                  | Redo the last undone action.                               |
| <printingchar>  | Self insert                           | Insert the character used to invoke this.                  |
| <return>        | Newline                               | Insert a new line and move cursor to beginning. Extend box to fit. |
| C-|             | Evaluate                              | Send the text of the current row to the "evaluate" function and output the resulting box after a pipe symbol on the same line.  |
| <unbound key>   | Unbound key                           | Display "$key undefined" in an alertish yellow rectangle at top of screen, then fade.|

## Boxy Editor Implementation Notes
Here are the major implementation decisions to consider for the spec, focused on underlying structures, algorithms, and behavior logic:

### 1. **Data Structure for Representing Text and Boxes**
   - **Hybrid Tree-List Structure:**
     - Use a tree structure where text and boxes are treated as nodes, with boxes capable of having child nodes.
     - Each node should have metadata indicating its type (text, box, nested box), content, and position.
     - This structure allows treating boxes as characters while supporting recursion, making it easy to traverse and modify both text and nested boxes.

### 2. **Cursor Management and Goal Column Handling**
   - **Goal Column Tracking:**
     - Maintain a separate variable to store the goal column whenever a vertical movement (C-p or C-n) is made.
     - This should update dynamically as users move vertically, even across nested boxes.
   - **Column Restoration Logic:**
     - Implement logic to restore the goal column when skipping shorter lines or empty lines.
     - On horizontal movement (C-f, C-b), reset the goal column to the new column.

### 3. **Handling Box Boundaries as Characters**
   - **Entry and Exit Points:**
     - Treat entering a box as moving one character forward, and exiting as moving one character backward.
     - Adjust the cursor navigation logic to allow smooth transitions across box boundaries, ensuring that boxes and nested boxes are considered a single unit during horizontal navigation.
   - **Box Expansion and Collapsing:**
     - When a box is collapsed, replace its content with a single placeholder node. 
     - For expanded boxes, insert their children as regular nodes within the text flow.

### 4. **Rendering Strategy**
   - **Recursive Rendering:**
     - Implement rendering as a recursive function that iterates through the tree-list structure, drawing nodes based on their type.
     - Boxes should be rendered inline, with nested content appearing indented or visually contained within the parent box.
   - **Performance Optimization:**
     - Use lazy rendering for nested boxes, loading content only when expanded, to avoid performance degradation with deeply nested structures.
     - Implement line caching to speed up cursor movement and ensure responsive editing.

### 5. **Keyboard Event Handling and Emacs-style Commands**
   - **Event Dispatcher:**
     - Implement a keyboard event dispatcher that maps input events to commands, following Emacs keybindings.
     - Extend the dispatcher to include custom commands for managing boxes, using a consistent pattern for command execution.
   - **Command Implementation:**
     - Organize commands into a modular system, making it easier to add or modify existing behavior without affecting unrelated parts of the code.
     - Support chaining of commands, allowing for macros or more complex multi-step operations, similar to Emacs.

### 6. **Selection and Region Management**
   - **Mark and Region Handling:**
     - Implement a mark and region system that supports both text and boxes, enabling selection across box boundaries.
     - Ensure compatibility with cut, copy, and paste operations, allowing boxes to be treated like text when part of a region.

### 7. **Undo/Redo Mechanism**
   - **Stack-based State Tracking:**
     - Use a stack-based approach to track editor states for undo/redo functionality.
     - Each action (insertion, deletion, movement, box creation/collapse/expansion) should create a new state, while batch actions (like collapsing a box) can be grouped into a single undo state to minimize user frustration.
   - **Granular vs. Batch Updates:**
     - For text and box editing, provide granular undo actions, but batch updates for operations like resizing or complex nesting changes.

### 8. **Box Nesting Logic**
   - **Dynamic Depth Management:**
     - Ensure that the editor can handle deep nesting levels, managing memory efficiently and preventing stack overflow.
   - **Parent-Child Relationship Tracking:**
     - Maintain parent-child references for each box node, enabling operations like moving a nested box to another location or copying entire box structures.
   - **Traversal Algorithm:**
     - Implement a robust tree traversal algorithm that supports depth-first and breadth-first operations, depending on the command and context.

### 9. **Command Palette and Command Execution**
   - **Modular Command Interface:**
     - Design a command interface that allows commands to be called by name, either through a palette (like M-x) or key bindings.
   - **Command Execution Context:**
     - Commands should be context-aware, executing differently depending on whether the cursor is inside a box, outside of boxes, or at a boundary.

### 10. **User Feedback and Visual Cues**
   - **Cursor Position Indicators:**
     - Use subtle visual cues to indicate when the cursor enters or exits a box, e.g., changing border color or adding a temporary highlight.
   - **Placeholder Representation for Collapsed Boxes:**
     - Use a distinct placeholder symbol for collapsed boxes, making it clear that they are part of the text flow without displaying their contents.

# Boxy Evaluate Function

Boxy Evaluate is not yet implemented.
# Boxy Editor Specification (Revised)

## 1. **Overall UI Design**
   - **Text Editor Canvas:** 
     - The central editing area where users can interact with text and boxes.
     - Boxes appear as bordered elements within the text flow, supporting nested structures.
   - **Cursor Handling:**
     - The cursor is represented as a distinct element.
     - Cursor behaves according to Emacs-like principles, without creating residual empty nodes or spaces.
   - **Clipboard Canvas:**
	- A line above the editor that shows clipboard items. You cannot click into them.

## 2. **Emacs-style Cursor Movement**
   - **Vertical Movement (C-p, C-n):**
     - Moves up/down while maintaining the goal column.
     - Stops at the end of shorter lines and skips empty lines.
   - **Horizontal Movement (C-f, C-b):**
     - Moves forward/backward one character or box.
     - Avoids entering boxes unless explicitly commanded.
   - **Boundary Handling:**
     - Treats boxes as single units; requires explicit commands to enter/exit.
   - **Column Resetting:**
     - Horizontal movement resets the goal column for vertical navigation.

## 3. **Box Management**
   - **Adding Boxes:**
     - Create boxes inline using commands (`[`, `(`).
   - **Entering/Exiting Boxes:**
     - Use commands like `Ctrl-[`, `Ctrl-(` to enter and `]`, `)` to exit boxes.
   - **Moving Boxes:**
     - Boxes are treated as characters, supporting standard cut/paste operations.

## 4. **Keyboard Shortcuts and Event Handling**
   - **Key Binding Table:**
     - Standard Emacs shortcuts for movement, editing, and box management.
     - Alerts for unbound keys.
   - **Handling Self-Inserting Characters:**
     - Printable characters are inserted at the cursor position.
   - **Handling Unbound Keys:**
     - Unbound keys trigger a yellow alert that fades after 2 seconds.

### Key Bindings
| **Key Binding** | **Action**                            | **Description**                                          |
|-----------------|---------------------------------------|----------------------------------------------------------|
| [               | Insert and enter box                  | Insert a box at the cursor and enter it.                 |
| (               | Insert and enter box                  | Insert a box at the cursor and enter it.                 |
| ]               | Exit box right                        | Exit current box and place cursor after it.              |
| )               | Exit box right                        | Exit current box and place cursor after it.              |
| C-[             | Enter next box                        | Enter the box immediately after the cursor.              |
| C-(             | Enter next box                        | Enter the box immediately after the cursor.              |
| C-]             | Exit box left                         | Exit current box and place cursor before it.             |
| C-)             | Exit box left                         | Exit current box and place cursor before it.             |
| C-p             | Move up                               | Move up one row, maintaining goal column.                |
| C-n             | Move down                             | Move down one row, maintaining goal column.              |
| C-f             | Move forward                          | Move right one character or box.                         |
| C-b             | Move backward                         | Move left one character or box.                          |
| C-a             | Move to beginning of line in box      | Move to the start of the current line in box.            |
| C-e             | Move to end of line in box            | Move to the end of the current line in box.              |
| C-k             | Kill line                             | Delete content from cursor to end of line in box.        |
| C-y             | Yank (paste)                          | Paste cut/copied text or current box at the cursor position. |
| C-w             | Cut region                            | Cut selected region of text or current box to the clipboard. |
| C-c             | Copy Region                           | Copy the selection region or current box with nested content. |
| C-c             | Collapse/Expand box                   | Collapse/expand the current box with nested content.     |
| <printingchar>  | Self insert                           | Insert the character typed.                              |
| <return>        | Newline                               | Insert a new line and move cursor to beginning.          |
| <unbound key>   | Unbound key                           | Display "$key undefined" alert in a yellow rectangle.    |

## 5. **Command Palette for Editor Actions**
   - Users can run editor commands through a command palette (e.g., M-x style).
   - Commands include text and box manipulation options.

## 6. **Rendering and Performance**
   - **Rendering Strategy**:
     - Uses recursive rendering to handle text and nested boxes.
   - **Performance Optimization**:
     - Lazy rendering for nested boxes and line caching for responsiveness.

## 7. **Selection and Region Management**
   - Supports mark and region handling within and across boxes.
   - Cut, copy, and paste work with text and boxes as units.

## 8. **Undo/Redo Mechanism**
   - Implements stack-based state tracking for undo/redo functionality.
   - Supports granular undo for text edits and batch undo for box operations.

## 9. **Error Handling and Alerts**
   - Alerts for unbound keys, faded over 2 seconds.
   - Error handling includes checks for empty nodes or unexpected cursor positions, ensuring consistent behavior.

---


