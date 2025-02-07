// modules/identity/identity.js - part of boxy

function duplicateBoxRow() {
  killResponse()
  let text = getCurrentRowText();
  console.log("duplicateBoxRow", text);
  insertResponse(text)
}
