/**
 * main.js — processo principale di Electron.
 * Carica la STESSA interfaccia web usata dalla versione Android (../www),
 * cosi' la logica dell'app (routine, task, cascata, quadrante...) è scritta
 * una sola volta. Qui aggiungiamo cio' che ha senso solo su desktop:
 * - una finestra vera con menu di sistema,
 * - il salvataggio del backup su file reale tramite finestra di dialogo nativa,
 * - (in futuro) la chiamata a Ollama in locale per i consigli dell'IA.
 */
const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

function creaFinestra() {
  const win = new BrowserWindow({
    width: 480,
    height: 860,
    minWidth: 380,
    minHeight: 640,
    title: 'Assistente Personale',
    backgroundColor: '#eee9e1',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.loadFile(path.join(__dirname, '..', 'www', 'index.html'));

  // Rimuove il menu di default (File/Edit/View...) inutile per questa app;
  // resta disponibile con Alt se serve durante lo sviluppo.
  win.setMenuBarVisibility(false);

  return win;
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  creaFinestra();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) creaFinestra();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ---- Export dati: finestra "Salva con nome" nativa + scrittura file reale ----
ipcMain.handle('esporta-json', async (event, nomeFileSuggerito, contenuto) => {
  const finestra = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePath } = await dialog.showSaveDialog(finestra, {
    title: 'Salva backup Assistente Personale',
    defaultPath: nomeFileSuggerito,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (canceled || !filePath) return { ok: false, annullato: true };
  try {
    await fs.promises.writeFile(filePath, contenuto, 'utf8');
    return { ok: true, percorso: filePath };
  } catch (e) {
    return { ok: false, errore: e.message };
  }
});
