keyMap['Ctrl-|'] = llmChat;
keyMap['|'] = llmInfer;

addToMenu('Chat (box)', llmChat, 'Ctrl-|');
addToMenu('Infer (line)', llmInfer, '|');
