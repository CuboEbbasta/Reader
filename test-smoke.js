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

  // ---- Obiettivi: creazione e cascata sugli orizzonti lunghi ----
  const s2 = window.Dati.stato();
  const tra20giorni = window.DataUtils.addGiorni(oggi, 20);   // < soglia 6mesi (31gg) => dovrebbe cascare a "1mese"
  const tra3anni = window.DataUtils.addAnni(oggi, 3);          // < soglia 5anni (366gg) ma > soglia 1anno (183gg) => resta "5anni"
  s2.obiettivi.push({ id: 'ob_vicino', titolo: 'Obiettivo 6 mesi quasi scaduto', tipo: 'concreto', ambito: '6mesi', scadenza: tra20giorni, descrizione: '', completato: false, taskCollegate: [] });
  s2.obiettivi.push({ id: 'ob_lontano', titolo: 'Obiettivo a 10 anni', tipo: 'valoriale', ambito: '10anni', scadenza: tra3anni, descrizione: '', completato: false, taskCollegate: [] });
  await window.Dati.salva();

  const statoObVicino = window.CascataObiettivi.statoObiettivo(s2.obiettivi.find(o => o.id === 'ob_vicino'), oggi);
  assert(statoObVicino.ambitoEffettivo === '1mese', 'un obiettivo a 6 mesi con 20gg residui deve cascare a "1mese" (era: ' + statoObVicino.ambitoEffettivo + ')');

  const statoObLontano = window.CascataObiettivi.statoObiettivo(s2.obiettivi.find(o => o.id === 'ob_lontano'), oggi);
  assert(statoObLontano.ambitoEffettivo === '5anni', 'un obiettivo a 10 anni con 3 anni residui deve restare "5anni" (era: ' + statoObLontano.ambitoEffettivo + ')');

  window.App.mostraTab('obiettivi');
  const listaObiettiviHtml = window.document.getElementById('lista-obiettivi').innerHTML;
  assert(listaObiettiviHtml.includes('Obiettivo 6 mesi quasi scaduto'), 'la lista obiettivi deve mostrare l\'obiettivo creato');
  assert(listaObiettiviHtml.includes('1 mese'), 'la lista obiettivi deve mostrare la cascata a "1 mese"');

  window.UiObiettivi.apriForm(null);
  assert(!!window.document.getElementById('f-titolo'), 'il form obiettivo deve avere il campo titolo');
  window.App.chiudiFoglio();

  // ---- Diario: salvataggio voce con voto in stile pagella ----
  window.App.mostraTab('diario');
  assert(!!window.document.getElementById('f-voto-base'), 'il form diario deve avere lo slider del voto');
  window.document.getElementById('f-fatto-bene').value = 'Ho completato la routine mattutina';
  window.document.getElementById('f-voto-base').value = '8';
  const bottonePiu = window.document.querySelector('[data-mod="piu"]');
  assert(!!bottonePiu, 'deve esistere il modificatore "+"');
  bottonePiu.dispatchEvent(new window.Event('click', { bubbles: true }));
  window.document.getElementById('btn-salva-diario').dispatchEvent(new window.Event('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 150));
  const voceSalvata = window.Dati.stato().journal[oggi];
  assert(voceSalvata && voceSalvata.voto === '8+', 'la voce del diario deve salvare il voto "8+" (trovato: ' + JSON.stringify(voceSalvata) + ')');
  assert(voceSalvata.votoNumerico === 8.25, 'il voto numerico di "8+" deve essere 8.25 (trovato: ' + (voceSalvata && voceSalvata.votoNumerico) + ')');

  // navigazione avanti/indietro nel diario
  window.document.getElementById('diario-prev').dispatchEvent(new window.Event('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 50));
  assert(window.document.getElementById('diario-data').textContent.includes(window.DataUtils.formatDataEstesa(window.DataUtils.addGiorni(oggi, -1))), 'la freccia indietro deve mostrare il giorno precedente');
  window.document.getElementById('diario-btn-oggi').dispatchEvent(new window.Event('click', { bubbles: true }));

  // ---- Dieta: calcolo BMR/macro, profilo, generazione piano, log di oggi ----
  const profiloTest = { eta: 30, sesso: 'M', altezzaCm: 180, pesoKg: 80, livelloAttivita: 'moderato', obiettivo: 'mantenimento', allergie: ['pesce'], cibiNonGraditi: 'funghi', patologie: '' };
  const bmrAtteso = 10 * 80 + 6.25 * 180 - 5 * 30 + 5; // formula Mifflin-St Jeor uomo
  const bmrCalcolato = window.CalcoloDieta.calcolaBMR(profiloTest);
  assert(Math.abs(bmrCalcolato - bmrAtteso) < 0.01, 'il BMR calcolato deve corrispondere alla formula di Mifflin-St Jeor (atteso ' + bmrAtteso + ', trovato ' + bmrCalcolato + ')');

  const macroTest = window.CalcoloDieta.calcolaMacro(profiloTest);
  assert(macroTest.targetKcal > 2000 && macroTest.targetKcal < 3500, 'il target calorico per un uomo di 80kg moderatamente attivo deve essere in un range plausibile (trovato ' + macroTest.targetKcal + ')');
  assert(macroTest.proteineG === Math.round(80 * 1.8), 'le proteine target devono essere 1.8g/kg di peso corporeo');

  window.App.mostraTab('dieta');
  assert(!!window.document.getElementById('btn-crea-profilo'), 'senza profilo completo deve comparire il CTA per compilarlo');

  await window.Dati.salvaProfilo(profiloTest);
  window.UiDieta.render();
  assert(!window.document.getElementById('btn-crea-profilo'), 'con profilo completo il CTA deve sparire');
  assert(!!window.document.getElementById('btn-genera-piano'), 'senza un piano generato deve comparire il bottone per generarlo');

  // genera il piano piu' volte per verificare che l'esclusione allergie/graditi regga anche con la casualita'
  for (let tentativo = 0; tentativo < 8; tentativo++) {
    const piano = window.GeneratorePiano.generaPianoSettimanale(window.Dati.stato().profilo);
    for (const giorno of Object.values(piano.giorni)) {
      for (const pasto of giorno) {
        const originale = window.DatabaseDieta.PASTI.find(p => p.id === pasto.id);
        if (originale) {
          assert(!originale.contiene.includes('pesce'), 'il piano non deve mai includere pasti con pesce (allergia impostata): trovato "' + pasto.nome + '"');
          assert(!originale.nome.toLowerCase().includes('funghi'), 'il piano non deve includere pasti con "funghi" (cibo non gradito): trovato "' + pasto.nome + '"');
        }
      }
    }
  }

  await window.Dati.salvaPianoDieta(window.GeneratorePiano.generaPianoSettimanale(window.Dati.stato().profilo));
  window.UiDieta.render();
  assert(!!window.document.getElementById('btn-rigenera-piano'), 'con un piano generato deve comparire il bottone per rigenerarlo');
  const listaPastiHtml = window.document.getElementById('lista-pasti-giorno').innerHTML;
  assert(listaPastiHtml.includes('kcal'), 'la lista pasti del giorno selezionato deve mostrare i valori nutrizionali');

  // log di oggi: aggiunta pasto libero e verifica che risulti nel totale
  await window.Dati.aggiungiPastoLog(oggi, { nome: 'Test pasto libero', kcal: 300, proteine: 20, carboidrati: 30, grassi: 10, fonte: 'libero' });
  window.UiDieta.render();
  const logOggiHtml = window.document.getElementById('lista-log-oggi').innerHTML;
  assert(logOggiHtml.includes('Test pasto libero'), 'il pasto libero aggiunto deve comparire nel log di oggi');

  // ---- Obiettivi: tappe/timeline (scheletro automatico + tappa manuale) ----
  window.App.mostraTab('obiettivi');
  const idObVicino = 'ob_vicino'; // orizzonte "6mesi" -> scheletro mensile
  window.UiObiettivi.apriTappe(idObVicino);
  assert(!!window.document.getElementById('btn-genera-tappe'), 'il foglio tappe deve avere il bottone per generare lo scheletro');
  window.document.getElementById('btn-genera-tappe').dispatchEvent(new window.Event('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 50));
  const obVicinoDopo = window.Dati.stato().obiettivi.find(o => o.id === idObVicino);
  assert(obVicinoDopo.tappe.length >= 1, 'generare lo scheletro deve creare almeno una tappa (trovate: ' + obVicinoDopo.tappe.length + ')');
  assert(obVicinoDopo.tappe[0].titolo.startsWith('Mese'), 'per un orizzonte "6mesi" lo scheletro deve usare tappe mensili (trovato titolo: ' + obVicinoDopo.tappe[0].titolo + ')');

  window.document.getElementById('btn-aggiungi-tappa').dispatchEvent(new window.Event('click', { bubbles: true }));
  assert(!!window.document.getElementById('f-titolo-tappa'), 'il form tappa deve avere il campo titolo');
  window.document.getElementById('f-titolo-tappa').value = 'Tappa manuale di prova';
  window.document.getElementById('btn-salva-tappa').dispatchEvent(new window.Event('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 50));
  const obVicinoConManuale = window.Dati.stato().obiettivi.find(o => o.id === idObVicino);
  assert(obVicinoConManuale.tappe.some(t => t.titolo === 'Tappa manuale di prova'), 'la tappa aggiunta manualmente deve essere salvata');

  const primaTappaId = obVicinoConManuale.tappe[0].id;
  const indicePrimaTappa = obVicinoConManuale.tappe.findIndex(t => t.id === primaTappaId);
  const bottoneToggle = window.document.querySelector(`[data-azione="toggle"][data-indice="${indicePrimaTappa}"]`);
  if (bottoneToggle) {
    bottoneToggle.dispatchEvent(new window.Event('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 50));
    assert(window.Dati.stato().obiettivi.find(o => o.id === idObVicino).tappe[indicePrimaTappa].completata === true, 'la tappa deve risultare completata dopo aver toccato "Fatta"');
  }
  window.App.chiudiFoglio();
  window.UiObiettivi.renderLista();
  const listaObiettiviConTappeHtml = window.document.getElementById('lista-obiettivi').innerHTML;
  assert(listaObiettiviConTappeHtml.includes('tappe'), 'la lista obiettivi deve mostrare il conteggio delle tappe');

  // ---- Workout: schede fisse, scheda adattiva, log ----
  window.App.mostraTab('workout');
  const schedaVeloceEsercizi = window.CalcoloWorkout.costruisciScheda(window.DatabaseWorkout.SCHEDA_VELOCE_IDS, 'mantenimento', 'intermedio');
  assert(schedaVeloceEsercizi.length === window.DatabaseWorkout.SCHEDA_VELOCE_IDS.length, 'la scheda veloce deve avere tanti esercizi quanti gli ID definiti');
  assert(schedaVeloceEsercizi.every(e => !e.richiedeSbarra), 'la scheda veloce non deve richiedere la sbarra per nessun esercizio');
  const schedaCompletaEsercizi = window.CalcoloWorkout.costruisciScheda(window.DatabaseWorkout.SCHEDA_COMPLETA_IDS, 'mantenimento', 'intermedio');
  assert(schedaCompletaEsercizi.some(e => e.richiedeSbarra), 'la scheda completa deve includere almeno un esercizio con la sbarra');

  // scaling: aumento_massa deve aggiungere una serie rispetto a mantenimento, sullo stesso esercizio base
  const baseEsercizio = window.DatabaseWorkout.trova('w1');
  const scalaMantenimento = window.CalcoloWorkout.scalaEsercizio(baseEsercizio, 'mantenimento', 'intermedio');
  const scalaMassa = window.CalcoloWorkout.scalaEsercizio(baseEsercizio, 'aumento_massa', 'intermedio');
  assert(scalaMassa.serie === scalaMantenimento.serie + 1, 'l\'obiettivo "aumento_massa" deve aggiungere una serie rispetto a "mantenimento" (trovato ' + scalaMassa.serie + ' vs ' + scalaMantenimento.serie + ')');

  const schedaVelocaHtml = window.document.getElementById('workout-corpo').innerHTML;
  assert(schedaVelocaHtml.includes('Scheda veloce'), 'la vista workout deve mostrare la scheda veloce');
  assert(schedaVelocaHtml.includes('Scheda completa'), 'la vista workout deve mostrare la scheda completa');

  await window.Dati.salvaProfiloWorkout({ livello: 'intermedio', giorniDisponibili: 4 });
  window.UiWorkout.render();
  window.document.getElementById('btn-genera-adattiva').dispatchEvent(new window.Event('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 50));
  const schedaAdattivaSalvata = window.Dati.stato().schedaAdattiva;
  assert(schedaAdattivaSalvata.giorni.length === 4, 'con 4 giorni disponibili la scheda adattiva deve avere 4 giorni (trovati ' + schedaAdattivaSalvata.giorni.length + ')');
  assert(schedaAdattivaSalvata.giorni.every(g => g.esercizi.length > 0), 'ogni giorno della scheda adattiva deve avere almeno un esercizio');

  const bottonePrimaSchedaFissa = window.document.querySelector('[data-registra-tipo="veloce"]');
  assert(!!bottonePrimaSchedaFissa, 'deve esistere il bottone per registrare la scheda veloce come fatta oggi');
  bottonePrimaSchedaFissa.dispatchEvent(new window.Event('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 50));
  const workoutOggi = window.Dati.stato().workoutLog[oggi];
  assert(workoutOggi && workoutOggi.schedaTipo === 'veloce', 'il log di oggi deve registrare la scheda veloce come fatta');

  // ---- Orario fisso (ora dentro "Fare"): import JSON + parsing giorni ----
  assert(window.DataUtils.giornoDaTesto('lunedì') === 1, 'giornoDaTesto deve riconoscere "lunedì" come 1');
  assert(window.DataUtils.giornoDaTesto('Mar') === 2, 'giornoDaTesto deve riconoscere l\'abbreviazione "Mar" come 2');
  assert(window.DataUtils.giornoDaTesto(5) === 5, 'giornoDaTesto deve accettare direttamente un numero valido');
  assert(window.DataUtils.giornoDaTesto('non-un-giorno') === null, 'giornoDaTesto deve restituire null per testo non riconosciuto');

  window.App.mostraTab('orario');
  const risultatoImportOrario = window.UiOrario.importaDaJSON(JSON.stringify([
    { materia: 'Analisi Matematica', giorno: 'lunedì', oraInizio: '09:00', oraFine: '11:00', aula: 'Aula 3', tipo: 'universita' },
    { materia: 'Voce incompleta senza orario', giorno: 'martedì' }
  ]));
  assert(risultatoImportOrario.ok && risultatoImportOrario.importati === 1 && risultatoImportOrario.scartati === 1, 'import orario deve importare la voce valida e scartare quella incompleta (trovato: ' + JSON.stringify(risultatoImportOrario) + ')');
  await window.Dati.salva();
  window.UiOrario.render();
  assert(window.document.getElementById('orario-corpo').innerHTML.includes('Analisi Matematica'), 'la vista Orario fisso deve mostrare la voce importata');

  window.App.mostraTab('panoramica');
  const panoramicaHtml = window.document.getElementById('panoramica-corpo').innerHTML;
  assert(panoramicaHtml.includes(window.DataUtils.nomeMeseAnno(window.DataUtils.oggiISO())), 'la vista Mese deve mostrare mese e anno correnti');

  // l'orario fisso di lunedì deve comparire nella vista Oggi se oggi è lunedì
  if (window.DataUtils.weekdayISO(oggi) === 1) {
    window.App.mostraTab('oggi');
    assert(window.document.getElementById('timeline-oggi').innerHTML.includes('Analisi Matematica'), 'se oggi è lunedì, l\'orario fisso deve comparire nella timeline di oggi');
    window.App.mostraTab('panoramica');
  }

  // vista Anno: aggiunta di un periodo e verifica che compaia
  const cont = window.document.getElementById('panoramica-corpo');
  cont.querySelector('[data-sv="anno"]').dispatchEvent(new window.Event('click', { bubbles: true }));
  window.document.getElementById('btn-nuovo-periodo').dispatchEvent(new window.Event('click', { bubbles: true }));
  window.document.getElementById('f-titolo-periodo').value = 'Sessione esami test';
  window.document.getElementById('btn-salva-periodo').dispatchEvent(new window.Event('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 50));
  assert(window.Dati.stato().periodiAnno.some(p => p.titolo === 'Sessione esami test'), 'il periodo aggiunto deve essere salvato');
  const annoHtml = window.document.getElementById('panoramica-corpo').innerHTML;
  assert(annoHtml.includes('Sessione esami test'), 'la vista Anno deve mostrare il periodo aggiunto nell\'elenco');

  // storico/recap: struttura e coerenza dei dati
  const recapSettimana = window.CalcoloRecap.recapSettimanale();
  assert(recapSettimana.corrente && typeof recapSettimana.corrente.taskTotali === 'number', 'recapSettimanale deve restituire un oggetto "corrente" con taskTotali numerico');
  assert(recapSettimana.corrente.taskCompletate >= 1, 'il recap settimanale deve contare almeno la routine segnata "fatta" oggi in questo test (trovato ' + recapSettimana.corrente.taskCompletate + ')');
  cont.querySelector('[data-sv="storico"]').dispatchEvent(new window.Event('click', { bubbles: true }));
  const storicoHtml = window.document.getElementById('panoramica-corpo').innerHTML;
  assert(storicoHtml.includes('Aderenza media'), 'la vista Storico deve mostrare la riga "Aderenza media"');

  // ---- Navigazione a gruppi: le tab principali risolvono all'ultimo figlio visitato ----
  window.App.mostraTab('routine');
  window.App.mostraTab('task'); // ora "fare" dovrebbe ricordare "task" come ultimo figlio
  window.App.mostraTab('fare');
  assert(window.document.getElementById('view-task').classList.contains('attiva'), '"fare" deve riaprire l\'ultimo figlio visitato (task)');
  assert(window.document.querySelector('.tab-btn[data-tab="fare"]').classList.contains('attivo'), 'la tab principale "fare" deve risultare attiva');
  const subnavTaskHtml = window.document.getElementById('subnav-task').innerHTML;
  assert(subnavTaskHtml.includes('Routine') && subnavTaskHtml.includes('Task'), 'la sotto-nav dentro "fare" deve mostrare le pillole Routine e Task');

  window.App.mostraTab('dieta');
  window.App.mostraTab('salute');
  assert(window.document.getElementById('view-dieta').classList.contains('attiva'), '"salute" deve riaprire l\'ultimo figlio visitato (dieta)');
  window.App.mostraTab('workout');
  window.App.mostraTab('salute');
  assert(window.document.getElementById('view-workout').classList.contains('attiva'), '"salute" deve ricordare "workout" come nuovo ultimo figlio visitato');

  // ================================================================
  // NUOVE FEATURE DI QUESTA SESSIONE
  // ================================================================

  // ---- Tipi di attività condivisi ----
  const tipiIniziali = window.Dati.stato().tipiAttivita.map(t => t.id);
  assert(['allenamento','pasto','sonno','diario'].every(id => tipiIniziali.includes(id)), 'i 4 tipi protetti devono esistere di default');
  const nuovoTipoId = await window.Dati.aggiungiTipoAttivita('Università');
  assert(window.Dati.stato().tipiAttivita.some(t => t.id === nuovoTipoId && !t.protetto), 'un tipo creato dall\'utente non deve essere protetto');
  const tentativoEliminaProtetto = await window.Dati.eliminaTipoAttivita('pasto');
  assert(tentativoEliminaProtetto.ok === false, 'non deve essere possibile eliminare un tipo protetto');

  // ---- Routine: tipo, descrizione, vincolo "un solo diario" ----
  const s3 = window.Dati.stato();
  s3.routine.push({ id: 'r_pasto', nome: 'Pranzo', tipo: 'pasto', descrizione: 'Pranzo principale', oraInizio: '13:00', durataMinuti: 30, priorita: 6, giorni: [1,2,3,4,5,6,7], attiva: true });
  s3.routine.push({ id: 'r_allenamento', nome: 'Palestra', tipo: 'allenamento', descrizione: '', oraInizio: '18:00', durataMinuti: 60, priorita: 7, giorni: [1,2,3,4,5,6,7], attiva: true });
  s3.routine.push({ id: 'r_diario1', nome: 'Diario serale', tipo: 'diario', descrizione: '', oraInizio: '22:00', durataMinuti: 10, priorita: 4, giorni: [1,2,3,4,5,6,7], attiva: true });
  await window.Dati.salva();

  window.App.mostraTab('routine');
  window.UiRoutine.apriForm(null);
  window.document.getElementById('f-nome').value = 'Secondo diario';
  window.document.getElementById('f-tipo-routine').value = 'diario';
  window.document.getElementById('btn-salva-routine').dispatchEvent(new window.Event('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 50));
  assert(window.Dati.stato().routine.filter(r => r.tipo === 'diario').length === 1, 'non deve essere possibile creare una seconda routine di tipo "diario"');
  window.App.chiudiFoglio();

  // ---- Popup di dettaglio: contestuale per pasto/allenamento, redirect per diario ----
  window.App.mostraTab('oggi');
  window.UiOggi.apriDettaglioAttivita('routine:r_pasto', oggi);
  assert(!!window.document.getElementById('btn-popup-salva-pasto'), 'il popup per una routine "pasto" deve avere il quick-log del pasto');
  window.App.chiudiFoglio();

  window.UiOggi.apriDettaglioAttivita('routine:r_allenamento', oggi);
  assert(!!window.document.getElementById('popup-allenamento-tipo'), 'il popup per una routine "allenamento" deve avere il selettore scheda');
  window.App.chiudiFoglio();

  window.UiOggi.apriDettaglioAttivita('routine:r_diario1', oggi);
  assert(window.document.getElementById('view-diario').classList.contains('attiva'), 'toccare una routine "diario" deve aprire direttamente il Diario');

  // ---- Notifiche di cascata per le task: date di transizione corrette ----
  const taskCascataTest = { id: 'tc1', nome: 'Test cascata', ambito: 'mese', scadenza: window.DataUtils.addGiorni(oggi, 40) };
  const transizioni = window.Notifiche.calcolaTransizioniTask(taskCascataTest);
  assert(transizioni.length === 2, 'una task con ambito "mese" deve avere 2 transizioni (mese->settimana, settimana->giorno)');
  assert(transizioni[0].livello === 'settimana' && transizioni[0].data === window.DataUtils.addGiorni(oggi, 33), 'la transizione a "settimana" deve avvenire 7gg prima della scadenza (trovato: ' + JSON.stringify(transizioni[0]) + ')');
  assert(transizioni[1].livello === 'giorno' && transizioni[1].data === window.DataUtils.addGiorni(oggi, 39), 'la transizione a "giorno" deve avvenire 1gg prima della scadenza');

  // ---- Task: ambito anno/mese/settimana tramite i nuovi selettori data ----
  window.App.mostraTab('task');
  window.UiTask.apriForm(null);
  window.document.getElementById('f-nome').value = 'Task annuale test';
  window.document.getElementById('f-ambito').value = 'anno';
  window.document.getElementById('f-ambito').dispatchEvent(new window.Event('change', { bubbles: true }));
  const annoTarget = parseInt(oggi.slice(0,4), 10) + 2;
  window.document.getElementById('f-scad-anno').value = String(annoTarget);
  window.document.getElementById('btn-salva-task').dispatchEvent(new window.Event('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 50));
  const taskAnnuale = window.Dati.stato().task.find(t => t.nome === 'Task annuale test');
  assert(taskAnnuale && taskAnnuale.scadenza === `${annoTarget}-12-31`, 'una task "anno" deve salvare come scadenza il 31 dicembre dell\'anno scelto (trovato: ' + (taskAnnuale && taskAnnuale.scadenza) + ')');

  window.UiTask.apriForm(null);
  window.document.getElementById('f-nome').value = 'Task mese test';
  window.document.getElementById('f-ambito').value = 'mese';
  window.document.getElementById('f-ambito').dispatchEvent(new window.Event('change', { bubbles: true }));
  const meseTarget = window.DataUtils.addMesi(oggi, 2).slice(0,7);
  window.document.getElementById('f-scad-mese').value = meseTarget;
  window.document.getElementById('btn-salva-task').dispatchEvent(new window.Event('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 50));
  const taskMensile = window.Dati.stato().task.find(t => t.nome === 'Task mese test');
  assert(taskMensile && taskMensile.scadenza === window.DataUtils.fineMese(meseTarget + '-01'), 'una task "mese" deve salvare come scadenza l\'ultimo giorno del mese scelto (trovato: ' + (taskMensile && taskMensile.scadenza) + ')');

  window.UiTask.apriForm(null);
  window.document.getElementById('f-nome').value = 'Task settimana test';
  window.document.getElementById('f-ambito').value = 'settimana';
  window.document.getElementById('f-ambito').dispatchEvent(new window.Event('change', { bubbles: true }));
  const rangeInizio = window.DataUtils.addGiorni(oggi, 3), rangeFine = window.DataUtils.addGiorni(oggi, 10);
  window.document.getElementById('f-scad-range-inizio').value = rangeInizio;
  window.document.getElementById('f-scad-range-fine').value = rangeFine;
  window.document.getElementById('btn-salva-task').dispatchEvent(new window.Event('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 50));
  const taskSettimanale = window.Dati.stato().task.find(t => t.nome === 'Task settimana test');
  assert(taskSettimanale && taskSettimanale.scadenza === rangeFine && taskSettimanale.rangeInizio === rangeInizio, 'una task "settimana" deve salvare il range scelto (trovato: ' + JSON.stringify(taskSettimanale) + ')');

  // ---- Task: cartelle (tipo condiviso) ----
  window.UiTask.apriForm(null);
  window.document.getElementById('f-nome').value = 'Task con cartella';
  window.document.getElementById('f-tipo-task').value = nuovoTipoId;
  window.document.getElementById('btn-salva-task').dispatchEvent(new window.Event('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 50));
  window.UiTask.renderLista();
  const bottoneCartella = window.document.querySelector(`[data-ft="${nuovoTipoId}"]`);
  assert(!!bottoneCartella, 'deve comparire un filtro-cartella per il tipo personalizzato creato');
  bottoneCartella.dispatchEvent(new window.Event('click', { bubbles: true }));
  assert(window.document.getElementById('lista-task').innerHTML.includes('Task con cartella'), 'filtrando per la cartella "Università" deve comparire la task assegnata');

  // ---- Obiettivi: collegamento anche a routine, non solo task ----
  window.App.mostraTab('obiettivi');
  window.UiObiettivi.apriForm(null);
  const selectAttivita = window.document.getElementById('f-attivita-collegate');
  assert(selectAttivita && selectAttivita.innerHTML.includes('Palestra') && selectAttivita.innerHTML.includes('optgroup'), 'il selettore attività collegate deve includere anche le routine, non solo le task');
  window.App.chiudiFoglio();

  // ---- Diario come routine: limitato a oggi/passato, mai al futuro ----
  window.App.mostraTab('diario');
  window.UiJournal.renderForm(window.DataUtils.addGiorni(oggi, -2));
  window.document.getElementById('diario-next').dispatchEvent(new window.Event('click', { bubbles: true }));
  window.document.getElementById('diario-next').dispatchEvent(new window.Event('click', { bubbles: true }));
  window.document.getElementById('diario-next').dispatchEvent(new window.Event('click', { bubbles: true }));
  assert(window.document.getElementById('diario-data').textContent.includes('(oggi)'), 'il diario non deve mai poter avanzare oltre oggi, qualunque numero di click su "avanti"');

  // ---- Dieta: numero pasti configurabile ----
  const profiloTre = Object.assign({}, window.Dati.stato().profilo, { numeroPasti: 3 });
  await window.Dati.salvaProfilo(profiloTre);
  const pianoTrePasti = window.GeneratorePiano.generaPianoSettimanale(window.Dati.stato().profilo);
  assert(pianoTrePasti.giorni[1].length === 3, 'con numeroPasti=3 il piano generato deve avere 3 pasti al giorno (trovati: ' + pianoTrePasti.giorni[1].length + ')');

  // ---- Workout: modalità personalizzata con duplica giorno ----
  window.App.mostraTab('workout');
  window.UiWorkout.render();
  window.document.getElementById('f-modalita-workout').value = 'personalizzato';
  window.document.getElementById('f-modalita-workout').dispatchEvent(new window.Event('change', { bubbles: true }));
  window.document.getElementById('btn-aggiungi-giorno-perso').dispatchEvent(new window.Event('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 50));
  assert(window.Dati.stato().schedaPersonalizzata.giorni.length === 1, 'deve essere stato creato un giorno personalizzato');
  window.document.querySelector('.btn-duplica-giorno-perso').dispatchEvent(new window.Event('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 50));
  assert(window.Dati.stato().schedaPersonalizzata.giorni.length === 2, 'duplicare un giorno personalizzato deve crearne una copia (trovati: ' + window.Dati.stato().schedaPersonalizzata.giorni.length + ')');

  // ---- Tema scuro ----
  window.App.mostraTab('impostazioni');
  await window.UiImpostazioni.impostaTema('scuro');
  assert(window.document.documentElement.getAttribute('data-tema') === 'scuro', 'attivare il tema scuro deve impostare data-tema="scuro" su <html>');
  await window.UiImpostazioni.impostaTema('chiaro');

  // ---- IA: impostazioni, parsing robusto del JSON, whitelist di sicurezza ----
  await window.Dati.salvaImpostazioniIA({ abilitata: true, indirizzoServer: 'http://192.168.1.50:11434', modello: 'qwen3:8b' });
  assert(window.Dati.stato().impostazioniIA.modello === 'qwen3:8b', 'le impostazioni IA devono salvarsi correttamente');

  const jsonPulito = window.UiIA.estraiJSON('{"risposta":"ok","modifiche":[]}');
  assert(jsonPulito && jsonPulito.risposta === 'ok', 'estraiJSON deve interpretare un JSON pulito');
  const jsonConTestoIntorno = window.UiIA.estraiJSON('Ecco qua: {"risposta":"fatto","modifiche":[]} grazie mille');
  assert(jsonConTestoIntorno && jsonConTestoIntorno.risposta === 'fatto', 'estraiJSON deve isolare il JSON anche se il modello aggiunge testo extra');
  const jsonRotto = window.UiIA.estraiJSON('questo non e proprio json');
  assert(jsonRotto === null, 'estraiJSON deve restituire null su testo non-JSON, senza lanciare eccezioni');

  const routineEsistenteId = window.Dati.stato().routine[0].id;
  assert(window.UiIA.validaModifica({ tipo: 'routine', id: routineEsistenteId, campo: 'descrizione', nuovoValore: 'x' }) === true, 'una modifica su un campo whitelisted e un id reale deve validare');
  assert(window.UiIA.validaModifica({ tipo: 'routine', id: routineEsistenteId, campo: 'oraInizio', nuovoValore: '10:00' }) === false, 'una modifica su un campo NON whitelisted (es. oraInizio) deve essere rifiutata');
  assert(window.UiIA.validaModifica({ tipo: 'routine', id: 'id-inventato-inesistente', campo: 'descrizione', nuovoValore: 'x' }) === false, 'una modifica che punta a un id inesistente deve essere rifiutata');
  assert(window.UiIA.validaModifica({ tipo: 'task', id: routineEsistenteId, campo: 'ambito', nuovoValore: 'anno' }) === false, 'non deve mai essere possibile proporre modifiche a campi strutturali come "ambito"');

  const risultatoTestIA = await window.ClienteIA.testConnessione();
  assert(risultatoTestIA.ok === false && typeof risultatoTestIA.errore === 'string', 'senza un server IA reale raggiungibile, testConnessione deve fallire con grazia (non lanciare eccezioni)');

  window.close();

  if (errori.length) {
    console.log('\n❌ TROVATI PROBLEMI:\n' + errori.map(e => ' - ' + e).join('\n'));
    process.exit(1);
  } else {
    console.log('\n✅ Tutti i controlli sono passati.');
  }
}

main().catch(e => { console.error('Errore fatale nel test:', e); process.exit(1); });
