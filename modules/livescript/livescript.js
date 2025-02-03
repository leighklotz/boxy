// modules/livescript/livescript.js

// evaluate box as JavaScript and stick results in a context.
// Security Risks: human-preview the script in the box before pressing the execute button.

// 1. Create a sandbox that optionally inherits from a parent sandbox.
function BoxSandbox(parentSandbox) {
  // Create a new object whose prototype is the parent's sandbox (if any).
  return Object.create(parentSandbox || {});
}

// 2. Locate the nearest ancestor box with an existing sandbox.
// Assumes your box elements have the CSS class "box".
function getParentSandbox(box) {
  let parent = box.parentNode;
  while (parent) {
    if (parent.classList &&
        parent.classList.contains('box') &&
        parent.sandbox) {
      return parent.sandbox;
    }
    parent = parent.parentNode;
  }
  return null;
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

  // return result
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
    }

    // Retrieve the code from the box element.
    const code = box.textContent;

    // Evaluate the code in a temporary iframe, copying new bindings into box.sandbox.
    result = evaluateCodeInSandbox(code, box.sandbox);

    // Copy functions from the sandbox to the box element for easy access.
    addMethodsToObj(box, box.sandbox);
  } catch (err) {
    console.error("Error evaluating box:", err);
  } finally {
    statusLedOff('livescript');
  }
  return String(result);
}

// 6. Evaluate the box containing the current cursor.
function evaluateCurrentBox() {
  let response = evaluateBox(cursor.parentNode);
  exitBoxRight();
  insertLlmResponse(response);
}

// 7. Map a keyboard shortcut to evaluate the current box.
keyMap['Ctrl-='] = evaluateCurrentBox;
