/**
 * notifications.js
 * Notifiche locali (offline, senza server) con azioni "Fatto / Non ora"
 * direttamente dalla notifica. Su Android 12+ serve il permesso di allarme
 * esatto per orari precisi (vedi AndroidManifest.xml e richiediAllarmeEsatto).
 */
const Notifiche = (function () {
  const TIPO_AZIONE = 'ATTIVITA_ASSISTENTE';
  let inizializzato = false;
  let idProgrammatiOggi = [];

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
    if (inizializzato) return;
    const LN = plugin();
    if (!LN) { console.warn('LocalNotifications non disponibile (anteprima browser?)'); return; }

    await richiediPermessi();

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

    LN.addListener('localNotificationActionPerformed', (evento) => {
      const extra = evento && evento.notification && evento.notification.extra;
      if (extra && onAzione) onAzione(extra, evento.actionId);
    });

    inizializzato = true;
  }

  /** voci: [{chiave, titolo, corpo, orarioMin, dataISO}] */
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
      notifiche.push({
        id,
        title: v.titolo,
        body: v.corpo || '',
        schedule: { at: dataOra, allowWhileIdle: true },
        actionTypeId: TIPO_AZIONE,
        extra: { chiave: v.chiave, dataISO: v.dataISO }
      });
      idProgrammatiOggi.push(id);
    });

    if (notifiche.length) {
      try { await LN.schedule({ notifications: notifiche }); } catch (e) { console.error('Errore programmazione notifiche', e); }
    }
  }

  return { inizializza, programmaPerOggi, richiediPermessi, richiediAllarmeEsatto };
})();

window.Notifiche = Notifiche;
