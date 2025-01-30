// modules/identity/identity.js - part of boxy

function llmDuplicateTest() {
  killResponse()
  let text = getCurrentRowText();
  console.log("llmDuplicateTest getCurrentRowText", text);
  insertLlmResponse(text)
}

keyMap['Tab'] = llmDuplicateTest
