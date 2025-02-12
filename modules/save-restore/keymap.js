keyMap['Ctrl-o'] = loadBoxFromString
keyMap['Ctrl-%'] = downloadSerializedCurrentBox
keyMap['Ctrl-^'] = downloadSerializedBoxy
keyMap['Ctrl-V'] = pasteText
keyMap['Ctrl-C'] = copyBoxText

addToMenu('Load Box (specify filename)', loadBoxFromString, 'Ctrl-o');
addToMenu('Download whole Boxy', downloadSerializedBoxy, 'Ctrl-^');
addToMenu('Download current box', downloadSerializedCurrentBox, 'Ctrl-%');
