// modules/livescript/livescript.js

// evaluate box as JavaScript and stick results in a context.
// Security Risks: human-preview the script in the box before pressing the execute button.
// todo: make the sandbox explicit: when you press the key, open the sandbox visually and put the code in it.
// todo: what about return results in sanbox?
// todo: can we separate the evaluation from the sandbox? like maybe code goes in the sandbox and when you close the sandbox it does the definitions


// modules/livescript/livescript.js

// 1. Create a sandbox that optionally inherits from a parent sandbox.
function BoxSandbox(parentSandbox) {
  // Create a new object whose prototype is the parent's sandbox (if any).
  return Object.create(parentSandbox || {});
}

// 2. Locate the nearest ancestor box with an existing sandbox.
//    Assumes your box elements have the CSS class "box".
function getParentSandbox(box) {
  let parent = box.parentNode;
  while (parent) {
    if (
      parent.classList &&
      parent.classList.contains('box') &&
      parent.sandbox
    ) {
      return parent.sandbox;
    }
    parent = parent.parentNode;
  }
  return null;
}

// Re-thread the sandbox chain from the current box upward.
// This function walks upward in the DOM from the given box and, for every
// box element (i.e. an element with the class "box") that has a sandbox,
// it recalculates its parent sandbox (via getParentSandbox) and then resets
// its sandbox’s prototype accordingly.
function threadParentSandboxesFrom(box) {
  let current = box;
  while (current && current.nodeType === 1) {
    if (current.classList && current.classList.contains('box')) {
      // Recalculate what the parent sandbox should be.
      const newParentSandbox = getParentSandbox(current);
      if (current.sandbox) {
        // Update the prototype of the current box's sandbox to the newly computed parent.
        Object.setPrototypeOf(current.sandbox, newParentSandbox);
      }
    }
    current = current.parentNode;
  }
}

// 3. Evaluate code in a temporary iframe and capture all new global bindings.
//    The new bindings are copied into the provided sandbox.
function evaluateCodeInSandbox(code, sandbox) {
  // Create a hidden iframe.
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  document.body.appendChild(iframe);

  // Access the iframe's global object.
  const win = iframe.contentWindow;

  // Capture the baseline set of global properties before evaluating the code.
  const baseline = new Set(Object.keys(win));

  // Evaluate the code in the iframe's global context.
  // (Assumes non‑strict mode so that top‑level function declarations attach to win.)
  let result = win.eval(code);

  // Copy every new global property from the iframe's window into the sandbox.
  Object.keys(win).forEach(function(key) {
    if (!baseline.has(key)) {
      sandbox[key] = win[key];
    }
  });

  // Clean up by removing the iframe.
  document.body.removeChild(iframe);

  // Return the evaluation result.
  return result;
}

// 4. Attach sandbox methods as properties on the box element.
//    (This makes it convenient to call them later, e.g. box.foo().)
function addMethodsToObj(box, sandbox) {
  Object.keys(sandbox).forEach(function(key) {
    if (typeof sandbox[key] === 'function') {
      box[key] = sandbox[key];
    }
  });
}

// 5. Evaluate a box's code.
//    - If the box already has a sandbox, reuse it.
//    - Otherwise, create a new sandbox (with a link to its parent's sandbox).
//    - Then, evaluate the code and capture any new bindings.
//    - Finally, re-thread the sandbox hierarchy from this box upward.
function evaluateBox(box) {
  if (!box || !box.textContent.trim()) return;
  statusLedOn('livescript');
  let result = "";

  try {
    // Look for a parent's sandbox for inheritance.
    const parentSandbox = getParentSandbox(box);

    // Reuse the existing sandbox if available; otherwise, create a new one.
    if (!box.sandbox) {
      box.sandbox = new BoxSandbox(parentSandbox);
    } else {
      // If the sandbox already exists, update its prototype in case the DOM changed.
      Object.setPrototypeOf(box.sandbox, parentSandbox);
    }

    // Retrieve the code from the box element.
    const code = box.textContent;

    // Evaluate the code in a temporary iframe, copying new bindings into box.sandbox.
    result = evaluateCodeInSandbox(code, box.sandbox);

    // Attach functions from the sandbox to the box element for easy access.
    addMethodsToObj(box, box.sandbox);

    // NEW: Thread (update) the sandbox chain from the current box upward,
    // so that each box in the hierarchy uses the current parent's sandbox.
    threadParentSandboxesFrom(box);
  } catch (err) {
    console.error("Error evaluating box:", err);
    statusLedOn('error');
  } finally {
    statusLedOff('livescript');
  }
  return String(result);
}

// 6. Evaluate the box containing the current cursor.
function evaluateCurrentBox() {
  killResponse();
  let response = evaluateBox(cursor.parentNode);
  exitBoxRight();
  insertResponse(response);
}

// 7. Map a keyboard shortcut to evaluate the current box.
keyMap['Ctrl-='] = evaluateCurrentBox;
