/**
 * notifications.js
 * Notifiche locali (offline, senza server), in due famiglie:
 * 1) "di oggi" (routine, orario fisso): ricalcolate ad ogni apertura app,
 *    con azioni rapide "Fatto/Non ora" per i tipi semplici, oppure senza
 *    azioni (solo tap per aprire il dettaglio) per pasto/allenamento/diario,
 *    che hanno bisogno di un'interazione più ricca.
 * 2) "di cascata" per le task: programmate una volta sola alla creazione/
 *    modifica della task, per ogni transizione di ambito (es. da mese a
 *    settimana), calcolate in anticipo dato che sono date deterministiche.
 *
 * Su Android 12+ serve anche il permesso di allarme esatto, richiesto
 * insieme a quello di notifica fin dall'avvio (altrimenti il sistema
 * "affossa" le notifiche successive alla prima, in Doze/standby).
 */
const Notifiche = (function () {
  const TIPO_AZIONE = 'ATTIVITA_ASSISTENTE';
  let inizializzato = false;
  let idProgrammatiOggi = [];
  let gestoreAzione = null;

  function plugin() {
    return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
  }

  function hashStringToId(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) { h = (h * 31 + str.charCodeAt(i)) | 0; }
    return (Math.abs(h) % 2000000000) + 1;
  }

  async function richiediPermessi() {
    const LN = plugin();
    if (!LN) return false;
    try {
      const attuale = await LN.checkPermissions();
      if (attuale.display === 'granted') return true;
      const richiesto = await LN.requestPermissions();
      return richiesto.display === 'granted';
    } catch (e) {
      console.warn('Permessi notifiche non disponibili in questo ambiente', e);
      return false;
    }
  }

  async function richiediAllarmeEsatto() {
    const LN = plugin();
    if (!LN || !LN.checkExactNotificationSetting) return;
    try {
      const stato = await LN.checkExactNotificationSetting();
      if (stato && stato.exact_alarm && stato.exact_alarm !== 'granted') {
        await LN.changeExactNotificationSetting();
      }
    } catch (e) {
      console.warn('Impostazione allarmi esatti non disponibile', e);
    }
  }

  async function inizializza(onAzione) {
    gestoreAzione = onAzione;
    if (inizializzato) return;
    const LN = plugin();
    if (!LN) { console.warn('LocalNotifications non disponibile (anteprima browser?)'); return; }

    // Entrambi i permessi richiesti subito: senza l'allarme esatto, Android
    // fa arrivare solo la prima notifica e "affossa" le successive.
    await richiediPermessi();
    await richiediAllarmeEsatto();

    try {
      await LN.registerActionTypes({
        types: [{
          id: TIPO_AZIONE,
          actions: [
            { id: 'fatto', title: '✅ Fatto' },
            { id: 'non_fatto', title: '❌ Non ora' }
          ]
        }]
      });
    } catch (e) { console.warn('registerActionTypes non disponibile', e); }

    LN.addListener('localNotificationActionPerformed', async (evento) => {
      const notifica = evento && evento.notification;
      const extra = notifica && notifica.extra;
      if (extra && gestoreAzione) gestoreAzione(extra, evento.actionId);
      // Chiude sempre la notifica dopo averla gestita (Android non lo fa da solo
      // per le notifiche con azioni, resterebbe nella tendina indefinitamente).
      if (notifica && typeof notifica.id === 'number') {
        try { await LN.cancel({ notifications: [{ id: notifica.id }] }); } catch (e) { /* ignora */ }
      }
    });

    inizializzato = true;
  }

  /** voci: [{chiave, titolo, corpo, orarioMin, dataISO, conAzioni}] — conAzioni=false per pasto/allenamento/diario */
  async function programmaPerOggi(voci) {
    const LN = plugin();
    if (!LN) return;

    if (idProgrammatiOggi.length) {
      try { await LN.cancel({ notifications: idProgrammatiOggi.map(id => ({ id })) }); } catch (e) { /* ignora */ }
      idProgrammatiOggi = [];
    }

    const adesso = DataUtils.minutiAdesso();
    const notifiche = [];
    voci.forEach(v => {
      if (v.orarioMin == null || v.orarioMin < adesso) return;
      const id = hashStringToId(v.chiave + v.dataISO);
      const dataOra = new Date();
      dataOra.setHours(Math.floor(v.orarioMin / 60), v.orarioMin % 60, 0, 0);
      const notifica = {
        id,
        title: v.titolo,
        body: v.corpo || '',
        schedule: { at: dataOra, allowWhileIdle: true },
        extra: { chiave: v.chiave, dataISO: v.dataISO }
      };
      if (v.conAzioni !== false) notifica.actionTypeId = TIPO_AZIONE;
      notifiche.push(notifica);
      idProgrammatiOggi.push(id);
    });

    if (notifiche.length) {
      try { await LN.schedule({ notifications: notifiche }); } catch (e) { console.error('Errore programmazione notifiche', e); }
    }
  }

  // ---------------- Notifiche "di cascata" per le task ----------------
  function idCascata(taskId, livello) { return hashStringToId('cascata:' + taskId + ':' + livello); }

  /** Le date (deterministiche) in cui una task "scende" di ambito, dato l'ambito iniziale e la scadenza */
  function calcolaTransizioniTask(task) {
    const ordine = Cascata.ORDINE; // ['anno','mese','settimana','giorno']
    const soglie = Cascata.SOGLIE_GIORNI;
    const idxInizio = ordine.indexOf(task.ambito);
    const transizioni = [];
    for (let i = idxInizio; i >= 0 && i < ordine.length - 1; i++) {
      const livelloCorrente = ordine[i];
      const livelloSuccessivo = ordine[i + 1];
      transizioni.push({ livello: livelloSuccessivo, data: DataUtils.addGiorni(task.scadenza, -soglie[livelloCorrente]) });
    }
    return transizioni;
  }

  async function cancellaCascataTask(taskId) {
    const LN = plugin();
    if (!LN) return;
    const ids = ['mese', 'settimana', 'giorno', 'extra'].map(l => idCascata(taskId, l));
    try { await LN.cancel({ notifications: ids.map(id => ({ id })) }); } catch (e) { /* ignora */ }
  }

  /** Da chiamare quando una task viene creata/modificata (ripianifica sempre da zero) */
  async function pianificaCascataTask(task) {
    const LN = plugin();
    if (!LN) return;
    await cancellaCascataTask(task.id);
    if (task.completata) return;

    const oggi = DataUtils.oggiISO();
    const notifiche = [];

    calcolaTransizioniTask(task).forEach(({ livello, data }) => {
      if (data < oggi) return; // mai nel passato
      const dataOra = DataUtils.isoToData(data);
      dataOra.setHours(9, 0, 0, 0);
      notifiche.push({
        id: idCascata(task.id, livello),
        title: `"${task.nome}" è entrata: ${Cascata.ETICHETTE_AMBITO[livello]}`,
        body: `Scade il ${DataUtils.formatDataBreve(task.scadenza)}`,
        schedule: { at: dataOra, allowWhileIdle: true },
        extra: { chiave: `task:${task.id}`, dataISO: data, tipoNotifica: 'cascata-task' }
      });
    });

    if (task.oraPromemoria && task.scadenza >= oggi) {
      const dataOra = DataUtils.isoToData(task.scadenza);
      const [hh, mm] = task.oraPromemoria.split(':').map(Number);
      dataOra.setHours(hh, mm, 0, 0);
      if (task.scadenza > oggi || DataUtils.oraToMinuti(task.oraPromemoria) >= DataUtils.minutiAdesso()) {
        notifiche.push({
          id: idCascata(task.id, 'extra'),
          title: task.nome,
          body: 'Promemoria che avevi impostato tu',
          schedule: { at: dataOra, allowWhileIdle: true },
          actionTypeId: TIPO_AZIONE,
          extra: { chiave: `task:${task.id}`, dataISO: task.scadenza }
        });
      }
    }

    if (notifiche.length) {
      try { await LN.schedule({ notifications: notifiche }); } catch (e) { console.error('Errore programmazione cascata task', e); }
    }
  }

  return {
    inizializza, programmaPerOggi, richiediPermessi, richiediAllarmeEsatto,
    pianificaCascataTask, cancellaCascataTask, calcolaTransizioniTask
  };
})();

window.Notifiche = Notifiche;
