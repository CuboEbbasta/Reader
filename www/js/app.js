/**
 * app.js
 * Avvio dell'app, navigazione a tab, foglio (bottom sheet) per i form, toast.
 */
const App = (function () {

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

  function mostraTab(nome) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('attiva'));
    document.getElementById('view-' + nome).classList.add('attiva');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('attivo', b.dataset.tab === nome));

    if (nome === 'oggi') UiOggi.renderTutto();
    else if (nome === 'routine') UiRoutine.renderLista();
    else if (nome === 'task') UiTask.renderLista();
    else if (nome === 'impostazioni') UiImpostazioni.render();
  }

  function aggiornaOggi() { UiOggi.renderTutto(); }

  function aggiornaTutto() {
    UiRoutine.renderLista();
    UiTask.renderLista();
    UiOggi.renderTutto();
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
    document.getElementById('overlay-foglio').addEventListener('click', (e) => {
      if (e.target.id === 'overlay-foglio') chiudiFoglio();
    });

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
