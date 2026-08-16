/**
 * ollama-client.js
 * Parla con un server Ollama (di norma quello del PC, raggiunto anche dal
 * telefono via IP di rete locale — vedi la spiegazione in ui-ia.js). Non
 * gira mai un modello sul telefono stesso: Ollama non gira nativamente su
 * Android senza Termux, quindi qui ci si collega sempre a un server esterno.
 *
 * Su PC (Electron) la chiamata passa dal processo main (Node, nessun
 * problema di CORS). Su Android/anteprima web usa fetch diretto: se
 * CapacitorHttp è abilitato (vedi capacitor.config.json), Android instrada
 * la richiesta nativamente, aggirando le restrizioni CORS della WebView.
 */
const ClienteIA = (function () {
  function config() { return Dati.stato().impostazioniIA; }

  function baseUrl() {
    return (config().indirizzoServer || 'http://localhost:11434').replace(/\/+$/, '');
  }

  async function testConnessione() {
    const cfg = config();
    try {
      if (window.electronAPI && window.electronAPI.elencaModelliIA) {
        return await window.electronAPI.elencaModelliIA(baseUrl());
      }
      const risposta = await fetch(baseUrl() + '/api/tags');
      if (!risposta.ok) return { ok: false, errore: 'Il server ha risposto con codice ' + risposta.status };
      const dati = await risposta.json();
      return { ok: true, modelli: (dati.models || []).map(m => m.name) };
    } catch (e) {
      return { ok: false, errore: 'Impossibile raggiungere ' + cfg.indirizzoServer + ' (' + e.message + ')' };
    }
  }

  async function chiamaOllama(prompt, promptSistema) {
    const cfg = config();
    if (!cfg.abilitata) return { ok: false, errore: 'IA non abilitata nelle impostazioni.' };
    const corpo = {
      model: cfg.modello,
      prompt: prompt,
      system: promptSistema || undefined,
      stream: false
    };
    try {
      if (window.electronAPI && window.electronAPI.chiamaIA) {
        return await window.electronAPI.chiamaIA({ indirizzoServer: baseUrl(), corpo });
      }
      const risposta = await fetch(baseUrl() + '/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo)
      });
      if (!risposta.ok) return { ok: false, errore: 'Il server ha risposto con codice ' + risposta.status };
      const dati = await risposta.json();
      return { ok: true, testo: dati.response };
    } catch (e) {
      return { ok: false, errore: 'Impossibile raggiungere il server IA: ' + e.message };
    }
  }

  return { config, testConnessione, chiamaOllama };
})();

window.ClienteIA = ClienteIA;
