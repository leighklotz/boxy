keyMap['Ctrl-o'] = loadBoxFromString
keyMap['Ctrl-%'] = downloadSerializedCurrentBox
keyMap['Ctrl-^'] = downloadSerializedBoxy

addToMenu('Load Box (specify filename)', loadBoxFromString, 'Ctrl-o');
addToMenu('Download whole Boxy', downloadSerializedBoxy, 'Ctrl-^');
addToMenu('Download current box', downloadSerializedCurrentBox, 'Ctrl-%');
