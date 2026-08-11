/**
 * storage.js
 * Unica fonte di verità per i dati dell'app. Il salvataggio avviene tramite
 * il plugin Capacitor Preferences (funziona sia su Android nativo che
 * nell'anteprima web durante lo sviluppo).
 *
 * Filosofia di conservazione dati (vedi discussione con l'utente):
 * - i dati "vivi" (routine, task) restano qui per intero;
 * - lo storico giorno per giorno (state.log) viene tenuto come riepilogo
 *   compatto per data, non come log grezzo di ogni evento: questo lo rende
 *   sostenibile anche dopo anni di utilizzo.
 */
const Dati = (function () {
  const CHIAVE = 'assistente_stato_v1';

  function statoDefault() {
    return {
      versione: 1,
      routine: [],   // { id, nome, oraInizio:"HH:MM", durataMinuti, priorita:1-10, giorni:[1..7], attiva }
      task: [],      // { id, nome, priorita:1-10, ambito:'giorno'|'settimana'|'mese'|'anno', scadenza:"YYYY-MM-DD",
                     //   oraPromemoria:"HH:MM"|null, durataStimataMinuti:number|null, note:"", completata:bool }
      log: {},       // "YYYY-MM-DD" -> { tipo:'abituale'|'viaggio', completamenti:{ "routine:ID":bool, "task:ID":bool } }
      impostazioni: {
        oraPromemoriaDefaultTask: '09:00'
      }
    };
  }

  let statoCorrente = null;

  function generaId(prefisso) {
    return `${prefisso}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  }

  function plugins() {
    return (window.Capacitor && window.Capacitor.Plugins) || {};
  }

  async function carica() {
    try {
      const { Preferences } = plugins();
      const res = Preferences ? await Preferences.get({ key: CHIAVE }) : null;
      statoCorrente = (res && res.value) ? JSON.parse(res.value) : statoDefault();
      if (!statoCorrente.impostazioni) statoCorrente.impostazioni = statoDefault().impostazioni;
    } catch (e) {
      console.error('Errore caricamento stato, uso i valori di default', e);
      statoCorrente = statoDefault();
    }
    return statoCorrente;
  }

  async function salva() {
    try {
      const { Preferences } = plugins();
      if (Preferences) {
        await Preferences.set({ key: CHIAVE, value: JSON.stringify(statoCorrente) });
      }
      return true;
    } catch (e) {
      console.error('Errore salvataggio stato', e);
      return false;
    }
  }

  function stato() { return statoCorrente; }

  function logGiorno(dataISO) {
    if (!statoCorrente.log[dataISO]) {
      statoCorrente.log[dataISO] = { tipo: 'abituale', completamenti: {} };
    }
    return statoCorrente.log[dataISO];
  }

  async function impostaCompletamento(chiaveElemento, dataISO, valore) {
    const giorno = logGiorno(dataISO);
    giorno.completamenti[chiaveElemento] = valore;
    await salva();
  }

  async function impostaTipoGiorno(dataISO, tipo) {
    const giorno = logGiorno(dataISO);
    giorno.tipo = tipo;
    await salva();
  }

  // ---------------- Export ----------------
  async function esporta() {
    const json = JSON.stringify(statoCorrente, null, 2);
    const nomeFile = `assistente-backup-${DataUtils.oggiISO()}.json`;

    // Su desktop (Electron) usiamo il vero filesystem del PC tramite una
    // finestra di salvataggio nativa (vedi desktop/preload.js e main.js):
    // il risultato è un file reale che puoi poi trasferire sul telefono.
    if (window.electronAPI && window.electronAPI.esportaJSON) {
      const res = await window.electronAPI.esportaJSON(nomeFile, json);
      if (res.annullato) return { ok: false, annullato: true };
      return res.ok ? { ok: true, percorso: res.percorso, nomeFile } : { ok: false, errore: res.errore };
    }

    const { Filesystem, Share } = plugins();

    if (!Filesystem) {
      // Anteprima nel browser (nessun plugin nativo): scarica il file col metodo web classico.
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = nomeFile;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      return { ok: true, percorso: nomeFile, nomeFile };
    }

    try {
      const scrittura = await Filesystem.writeFile({
        path: nomeFile,
        data: json,
        directory: 'CACHE',
        encoding: 'utf8'
      });
      if (Share) {
        try {
          await Share.share({
            title: 'Backup Assistente Personale',
            text: 'Backup dei dati dell\'app',
            url: scrittura.uri
          });
        } catch (eShare) {
          console.warn('Condivisione annullata o non disponibile', eShare);
        }
      }
      return { ok: true, percorso: scrittura.uri, nomeFile };
    } catch (e) {
      console.error('Errore esportazione', e);
      return { ok: false, errore: e.message || String(e) };
    }
  }

  // ---------------- Import ----------------
  function importaDaTesto(testoJson, modalita) {
    // modalita: 'sostituisci' | 'unisci'
    let nuovo;
    try {
      nuovo = JSON.parse(testoJson);
    } catch (e) {
      return { ok: false, errore: 'Il file scelto non è un JSON valido.' };
    }
    if (!nuovo || typeof nuovo !== 'object') {
      return { ok: false, errore: 'Contenuto non riconosciuto.' };
    }

    if (modalita === 'sostituisci') {
      statoCorrente = Object.assign(statoDefault(), nuovo);
    } else {
      const s = statoCorrente;
      (nuovo.routine || []).forEach(r => { if (!s.routine.find(x => x.id === r.id)) s.routine.push(r); });
      (nuovo.task || []).forEach(t => { if (!s.task.find(x => x.id === t.id)) s.task.push(t); });
      Object.entries(nuovo.log || {}).forEach(([data, giorno]) => {
        if (!s.log[data]) {
          s.log[data] = giorno;
        } else {
          s.log[data].completamenti = Object.assign({}, giorno.completamenti, s.log[data].completamenti);
        }
      });
    }
    return { ok: true };
  }

  return {
    statoDefault, generaId, carica, salva, stato,
    logGiorno, impostaCompletamento, impostaTipoGiorno,
    esporta, importaDaTesto
  };
})();

window.Dati = Dati;
