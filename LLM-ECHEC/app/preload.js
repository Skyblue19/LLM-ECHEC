const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('appInfo', {
  version: '1.0.0'
});

contextBridge.exposeInMainWorld('mistral', {
  analyze: (fen) => ipcRenderer.invoke('mistral:analyze', { fen }),
  analyzeMove: (fen, move) => ipcRenderer.invoke('mistral:analyzeMove', { fen, move })
});

contextBridge.exposeInMainWorld('session', {
  save: (sessionData) => ipcRenderer.invoke('session:save', sessionData),
  load: () => ipcRenderer.invoke('session:load')
});

contextBridge.exposeInMainWorld('defis', {
  load: () => ipcRenderer.invoke('defis:load')
});

contextBridge.exposeInMainWorld('progression', {
  update: (progressionData) => ipcRenderer.invoke('progression:update', progressionData)
});
