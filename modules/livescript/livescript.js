// modules/livescript/livescript.js

// evaluate box as JavaScript and stick results in a context.
// Security Risks: human-preview the script in the box before pressing the execute button.

const global_livescripts = {};

function addMethodsToObj(element, targetObj) {
  const scriptText = element.textContent;
  console.log(`Evaluating JavaScript: ${scriptText}`);

  try {
    console.log(`before: global_livescripts=${global_livescripts}`);
    with(global_livescripts) {
      eval(scriptText);
    }
    console.log(`after: global_livescripts=${global_livescripts}`);

  } catch (error) {
    console.error(`Error evaluating JavaScript: ${error.message}`);
    throw error;
  }
}

function evaluateCurrentBox() {
  evaluateBox(cursor.parentNode);
}

function evaluateBox(box) {
  if (!box || !box.textContent) return;
  statusLedOn('livescript');

  try {
    addMethodsToObj(box, global_livescripts); 
  } finally {
    statusLedOff('livescript');
  }
}

keyMap['Ctrl-='] = evaluateCurrentBox;
