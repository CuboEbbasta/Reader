/**
 * Smoke test "offline": carica l'app reale (index.html + tutti gli script)
 * dentro jsdom, simulando un ambiente browser, e verifica che le funzioni
 * principali girino senza errori. NON fa parte dell'app consegnata: serve
 * solo a me (Claude) per validare il codice senza un dispositivo Android reale.
 */
const fs = require('fs');
const path = require('path');
const { JSDOM, requestInterceptor } = require('jsdom');

const errori = [];
const WWW = path.join(__dirname, 'www');

// Reindirizza le richieste "http://app.locale/..." ai file reali su disco,
// cosi' i <script src> e <link> di index.html vengono caricati esattamente
// come farebbe un browser vero (stesso scope globale condiviso tra script,
// invece di eval() ripetuti che in jsdom NON condividono i "const" globali).
const interceptorLocale = requestInterceptor((request) => {
  const u = new URL(request.url);
  if (u.hostname !== 'app.locale') return undefined;
  const percorso = path.join(WWW, decodeURIComponent(u.pathname));
  const contentType = percorso.endsWith('.css') ? 'text/css'
    : percorso.endsWith('.js') ? 'application/javascript'
    : 'text/html';
  const corpo = fs.readFileSync(percorso);
  return new Response(corpo, { headers: { 'Content-Type': contentType } });
});

async function main() {
  const dom = await JSDOM.fromFile(path.join(WWW, 'index.html'), {
    url: 'http://app.locale/index.html',
    runScripts: 'dangerously',
    resources: { interceptors: [interceptorLocale] },
    pretendToBeVisual: true
  });

  const { window } = dom;
  window.addEventListener('error', (e) => {
    errori.push('Errore runtime: ' + (e.error ? (e.error.stack || e.error.message) : e.message));
  });

  // Aspetta che tutti gli script (caricati in modo asincrono da jsdom) siano
  // stati eseguiti e che DOMContentLoaded (quindi App.init()) sia scattato.
  await new Promise((resolve) => {
    if (window.document.readyState === 'complete') return resolve();
    window.addEventListener('load', resolve);
  });
  await new Promise(r => setTimeout(r, 400));

  function assert(cond, msg) { if (!cond) errori.push('ASSERT FALLITO: ' + msg); }

  assert(window.App, 'window.App deve esistere dopo il caricamento');
  assert(window.Dati && window.Dati.stato(), 'Dati.stato() deve restituire uno stato');

  // ---- crea una routine di test ----
  const s = window.Dati.stato();
  s.routine.push({ id: 'r_test', nome: 'Test lettura', oraInizio: '07:00', durataMinuti: 30, priorita: 8, giorni: [1,2,3,4,5,6,7], attiva: true });
  await window.Dati.salva();
  window.App.mostraTab('routine');
  const listaRoutineHtml = window.document.getElementById('lista-routine').innerHTML;
  assert(listaRoutineHtml.includes('Test lettura'), 'la routine di test deve comparire nella lista routine');

  // ---- crea task con ambiti diversi e verifica la cascata ----
  const oggi = window.DataUtils.oggiISO();
  const traUnGiorno = window.DataUtils.addGiorni(oggi, 1);
  const traDueSettimane = window.DataUtils.addGiorni(oggi, 14);

  s.task.push({ id: 't_settimana_urgente', nome: 'Task settimana quasi scaduta', priorita: 7, ambito: 'settimana', scadenza: traUnGiorno, oraPromemoria: null, durataStimataMinuti: null, note: '', completata: false });
  s.task.push({ id: 't_mese_lontano', nome: 'Task mese lontana', priorita: 4, ambito: 'mese', scadenza: traDueSettimane, oraPromemoria: null, durataStimataMinuti: null, note: '', completata: false });
  await window.Dati.salva();

  const statoUrgente = window.Cascata.statoTask(s.task.find(t => t.id === 't_settimana_urgente'), oggi);
  assert(statoUrgente.ambitoEffettivo === 'giorno', 'una task settimanale a 1 giorno dalla scadenza deve diventare "giorno" (era: ' + statoUrgente.ambitoEffettivo + ')');

  const statoLontano = window.Cascata.statoTask(s.task.find(t => t.id === 't_mese_lontano'), oggi);
  assert(statoLontano.ambitoEffettivo === 'mese', 'una task mensile lontana deve restare "mese" (era: ' + statoLontano.ambitoEffettivo + ')');

  window.App.mostraTab('task');
  const listaTaskHtml = window.document.getElementById('lista-task').innerHTML;
  assert(listaTaskHtml.includes('Task settimana quasi scaduta'), 'la task urgente deve comparire nella lista task');

  // ---- vista Oggi: deve includere la routine e la task cascata a "giorno" ----
  window.App.mostraTab('oggi');
  const timelineHtml = window.document.getElementById('timeline-oggi').innerHTML;
  assert(timelineHtml.includes('Test lettura'), 'la routine di oggi deve comparire nella timeline');
  assert(timelineHtml.includes('Task settimana quasi scaduta'), 'la task cascata a "giorno" deve comparire nella timeline di oggi');

  const quadranteHtml = window.document.getElementById('quadrante-cont').innerHTML;
  assert(quadranteHtml.includes('<svg'), 'il quadrante deve produrre un SVG');

  // ---- segna la routine come fatta e verifica le statistiche ----
  const rigaTimeline = window.document.querySelector('.btn-segna[data-chiave="routine:r_test"][data-valore="true"]');
  assert(!!rigaTimeline, 'deve esistere il bottone "Fatto" per la routine di test');
  rigaTimeline.dispatchEvent(new window.Event('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 150));
  const statHtml = window.document.getElementById('statistiche-oggi').innerHTML;
  assert(/1\/\d/.test(statHtml), 'le statistiche devono riflettere 1 completata dopo il click (trovato: ' + statHtml.replace(/\s+/g,' ') + ')');

  // ---- export/import (fallback web, senza Filesystem nativo) ----
  const stato1 = JSON.stringify(window.Dati.stato());
  const risultatoImport = window.Dati.importaDaTesto(stato1, 'unisci');
  assert(risultatoImport.ok, 'importaDaTesto deve riuscire su un JSON valido');
  const risultatoImportBad = window.Dati.importaDaTesto('{ questo non è json', 'unisci');
  assert(!risultatoImportBad.ok, 'importaDaTesto deve fallire con garbage in input');

  // ---- apertura form (bottom sheet) ----
  window.App.mostraTab('routine');
  window.UiRoutine.apriForm(null);
  assert(window.document.getElementById('overlay-foglio').classList.contains('attivo'), 'il foglio deve aprirsi per una nuova routine');
  assert(!!window.document.getElementById('f-nome'), 'il form routine deve avere il campo nome');
  window.App.chiudiFoglio();

  window.UiTask.apriForm(null);
  assert(!!window.document.getElementById('f-ambito'), 'il form task deve avere il campo ambito');
  window.App.chiudiFoglio();

  window.App.mostraTab('impostazioni');
  assert(window.document.getElementById('btn-esporta'), 'la vista impostazioni deve avere il bottone esporta');

  window.close();

  if (errori.length) {
    console.log('\n❌ TROVATI PROBLEMI:\n' + errori.map(e => ' - ' + e).join('\n'));
    process.exit(1);
  } else {
    console.log('\n✅ Tutti i controlli sono passati.');
  }
}

main().catch(e => { console.error('Errore fatale nel test:', e); process.exit(1); });
