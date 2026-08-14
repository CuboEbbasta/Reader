/**
 * app.js
 * Avvio dell'app, navigazione a tab (con gruppi e sotto-sezioni), foglio
 * (bottom sheet) per i form, toast.
 */
const App = (function () {

  // Le 5 tab principali; alcune raggruppano più viste con una sotto-nav a pillole.
  const GRUPPI = {
    fare: { figli: ['routine', 'task'], etichette: { routine: 'Routine', task: 'Task' } },
    salute: { figli: ['dieta', 'workout'], etichette: { dieta: 'Dieta', workout: 'Workout' } },
    crescita: { figli: ['obiettivi', 'diario'], etichette: { obiettivi: 'Obiettivi', diario: 'Diario' } },
    altro: { figli: ['panoramica', 'impostazioni'], etichette: { panoramica: 'Panoramica', impostazioni: 'Impostazioni' } }
  };
  const FIGLIO_A_GRUPPO = {};
  Object.entries(GRUPPI).forEach(([g, def]) => def.figli.forEach(f => { FIGLIO_A_GRUPPO[f] = g; }));
  const ultimoFiglio = { fare: 'routine', salute: 'dieta', crescita: 'obiettivi', altro: 'panoramica' };

  function mostraToast(msg, ms) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('mostra');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('mostra'), ms || 2200);
  }

  function apriFoglio(html) {
    document.getElementById('foglio-contenuto').innerHTML = html;
    document.getElementById('overlay-foglio').classList.add('attivo');
  }
  function chiudiFoglio() {
    document.getElementById('overlay-foglio').classList.remove('attivo');
  }

  function renderVista(nome) {
    if (nome === 'oggi') UiOggi.renderTutto();
    else if (nome === 'dieta') UiDieta.render();
    else if (nome === 'workout') UiWorkout.render();
    else if (nome === 'routine') UiRoutine.renderLista();
    else if (nome === 'task') UiTask.renderLista();
    else if (nome === 'obiettivi') UiObiettivi.renderLista();
    else if (nome === 'diario') UiJournal.renderForm(DataUtils.oggiISO());
    else if (nome === 'panoramica') UiPanoramica.render();
    else if (nome === 'impostazioni') UiImpostazioni.render();
  }

  function aggiornaSubNav(vista) {
    const gruppo = FIGLIO_A_GRUPPO[vista];
    if (!gruppo) return; // "oggi" non appartiene a un gruppo, niente sotto-nav
    const def = GRUPPI[gruppo];
    const placeholder = document.getElementById('subnav-' + vista);
    if (!placeholder) return;
    placeholder.innerHTML = def.figli.map(f =>
      `<button type="button" class="btn btn-sm ${f === vista ? 'btn-primary' : ''}" data-figlio="${f}">${def.etichette[f]}</button>`
    ).join('');
    placeholder.querySelectorAll('[data-figlio]').forEach(b => b.addEventListener('click', () => mostraTab(b.dataset.figlio)));
  }

  /** Accetta sia il nome di un gruppo ("fare") sia di una vista diretta ("routine") */
  function mostraTab(nome) {
    const vista = GRUPPI[nome] ? (ultimoFiglio[nome] || GRUPPI[nome].figli[0]) : nome;
    const gruppo = FIGLIO_A_GRUPPO[vista];
    if (gruppo) ultimoFiglio[gruppo] = vista;

    document.querySelectorAll('.view').forEach(v => v.classList.remove('attiva'));
    document.getElementById('view-' + vista).classList.add('attiva');

    const tabPrincipaleAttiva = gruppo || vista; // "oggi" e' tab principale di se stessa
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('attivo', b.dataset.tab === tabPrincipaleAttiva));

    aggiornaSubNav(vista);
    renderVista(vista);
  }

  function aggiornaOggi() { UiOggi.renderTutto(); }

  function aggiornaTutto() {
    UiRoutine.renderLista();
    UiTask.renderLista();
    UiObiettivi.renderLista();
    UiJournal.renderStorico();
    UiOggi.renderTutto();
    UiDieta.render();
    UiWorkout.render();
    UiPanoramica.render();
    UiImpostazioni.render();
  }

  async function onAzioneNotifica(extra, actionId) {
    if (!extra || !extra.chiave || !extra.dataISO) return;
    if (actionId === 'fatto' || actionId === 'non_fatto') {
      const valore = actionId === 'fatto';
      await Dati.impostaCompletamento(extra.chiave, extra.dataISO, valore);
      UiOggi.renderTutto();
    }
  }

  async function init() {
    await Dati.carica();
    await Notifiche.inizializza(onAzioneNotifica);

    document.querySelectorAll('.tab-btn').forEach(b => {
      b.addEventListener('click', () => mostraTab(b.dataset.tab));
    });
    document.getElementById('btn-nuova-routine').addEventListener('click', () => UiRoutine.apriForm(null));
    document.getElementById('btn-nuova-task').addEventListener('click', () => UiTask.apriForm(null));
    document.getElementById('btn-nuovo-obiettivo').addEventListener('click', () => UiObiettivi.apriForm(null));
    document.getElementById('overlay-foglio').addEventListener('click', (e) => {
      if (e.target.id === 'overlay-foglio') chiudiFoglio();
    });

    UiJournal.inizializza();
    mostraTab('oggi');

    // Ricontrolla la vista "oggi" quando l'app torna in primo piano
    // (utile se e' passata la mezzanotte o e' passato del tempo da ultimo controllo)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) UiOggi.renderTutto();
    });
  }

  return { init, apriFoglio, chiudiFoglio, mostraToast, mostraTab, aggiornaOggi, aggiornaTutto };
})();

window.App = App;
document.addEventListener('DOMContentLoaded', () => { App.init(); });
