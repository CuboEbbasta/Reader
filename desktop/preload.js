/**
 * preload.js — unico ponte, sicuro, tra la pagina web (www/) e il processo
 * principale di Electron. Espone solo cio' che serve (esportare un file),
 * niente accesso libero a Node dentro la pagina (contextIsolation attiva).
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  esportaJSON: (nomeFile, contenuto) => ipcRenderer.invoke('esporta-json', nomeFile, contenuto)
});
