/**
 * ui-task.js
 * Task "extra" (non ricorrenti): possono valere per un giorno preciso,
 * per la settimana, per il mese o per l'anno. Quando si avvicina la
 * scadenza del contenitore superiore, "scendono" automaticamente di
 * livello (vedi cascade.js) e vengono segnalate come urgenti/scadute.
 */
const UiTask = (function () {
  let filtroCorrente = 'attive'; // 'attive' | 'oggi' | 'completate' | 'tutte'

  function coloreDaPriorita(p) { return UiRoutine.coloreDaPriorita(p); }

  function defaultScadenzaPerAmbito(ambito, oggi) {
    oggi = oggi || DataUtils.oggiISO();
    if (ambito === 'giorno') return oggi;
    if (ambito === 'settimana') return DataUtils.fineSettimana(oggi);
    if (ambito === 'mese') return DataUtils.fineMese(oggi);
    return DataUtils.fineAnno(oggi);
  }

  function badgeAmbito(stato, task) {
    const testo = Cascata.ETICHETTE_AMBITO[stato.ambitoEffettivo];
    if (stato.scaduta) return `<span class="badge badge-warn">Scaduta</span>`;
    if (task.completata) return `<span class="badge badge-ok">Fatta</span>`;
    if (stato.cascata) return `<span class="badge badge-warn">${testo} (era ${Cascata.ETICHETTE_AMBITO[task.ambito]})</span>`;
    return `<span class="badge badge-accent">${testo}</span>`;
  }

  function renderFiltri() {
    const cont = document.getElementById('filtri-task');
    const opzioni = [['attive', 'Attive'], ['oggi', 'Oggi'], ['completate', 'Completate'], ['tutte', 'Tutte']];
    cont.innerHTML = opzioni.map(([v, l]) =>
      `<button type="button" class="btn btn-sm ${filtroCorrente === v ? 'btn-primary' : ''}" data-f="${v}">${l}</button>`
    ).join('');
    cont.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      filtroCorrente = b.dataset.f;
      renderLista();
    }));
  }

  function renderLista() {
    renderFiltri();
    const cont = document.getElementById('lista-task');
    const oggi = DataUtils.oggiISO();
    let task = Dati.stato().task.map(t => ({ t, stato: Cascata.statoTask(t, oggi) }));

    if (filtroCorrente === 'attive') task = task.filter(x => !x.t.completata);
    else if (filtroCorrente === 'oggi') task = task.filter(x => (x.stato.visibileOggi || x.stato.scaduta));
    else if (filtroCorrente === 'completate') task = task.filter(x => x.t.completata);

    task.sort((a, b) => {
      if (a.t.completata !== b.t.completata) return a.t.completata ? 1 : -1;
      const ordA = Cascata.ORDINE.indexOf(a.stato.ambitoEffettivo), ordB = Cascata.ORDINE.indexOf(b.stato.ambitoEffettivo);
      if (ordA !== ordB) return ordB - ordA; // 'giorno' prima
      return b.t.priorita - a.t.priorita;
    });

    if (!task.length) {
      cont.innerHTML = '<div class="vuoto">Nessuna task in questa vista.</div>';
      return;
    }

    cont.innerHTML = task.map(({ t, stato }) => `
      <div class="elemento-riga" data-id="${t.id}">
        <div class="priorita-pill" style="background:${coloreDaPriorita(t.priorita)}">${t.priorita}</div>
        <div class="elemento-corpo">
          <div class="elemento-titolo" style="${t.completata ? 'text-decoration:line-through;color:var(--ink-faint);' : ''}">${UiRoutine.escapeHtml(t.nome)}</div>
          <div class="elemento-meta">Scade il ${DataUtils.formatDataBreve(t.scadenza)} ${badgeAmbito(stato, t)}</div>
        </div>
        <div class="elemento-azioni">
          <button class="icon-btn btn-toggle-task" data-id="${t.id}" title="${t.completata ? 'Segna da fare' : 'Segna fatta'}">${t.completata ? '↺' : '✅'}</button>
          <button class="icon-btn btn-modifica-task" data-id="${t.id}" title="Modifica">✏️</button>
          <button class="icon-btn btn-elimina-task" data-id="${t.id}" title="Elimina">🗑️</button>
        </div>
      </div>
    `).join('');

    cont.querySelectorAll('.btn-modifica-task').forEach(b => b.addEventListener('click', () => apriForm(b.dataset.id)));
    cont.querySelectorAll('.btn-elimina-task').forEach(b => b.addEventListener('click', () => elimina(b.dataset.id)));
    cont.querySelectorAll('.btn-toggle-task').forEach(b => b.addEventListener('click', () => toggleCompletata(b.dataset.id)));
  }

  function toggleCompletata(id) {
    const t = Dati.stato().task.find(x => x.id === id);
    t.completata = !t.completata;
    Dati.salva().then(() => { renderLista(); window.App.aggiornaOggi(); });
  }

  function elimina(id) {
    if (!confirm('Eliminare questa task?')) return;
    const s = Dati.stato();
    s.task = s.task.filter(t => t.id !== id);
    Dati.salva().then(() => { renderLista(); window.App.aggiornaOggi(); });
  }

  function apriForm(idEsistente) {
    const esistente = idEsistente ? Dati.stato().task.find(t => t.id === idEsistente) : null;
    const oggi = DataUtils.oggiISO();
    const t = esistente || {
      id: null, nome: '', priorita: 5, ambito: 'giorno',
      scadenza: oggi, oraPromemoria: '', durataStimataMinuti: '', note: '', completata: false
    };

    const html = `
      <div class="foglio-header">
        <h2>${esistente ? 'Modifica task' : 'Nuova task'}</h2>
        <button class="icon-btn" id="btn-chiudi-foglio">✕</button>
      </div>
      <div class="campo">
        <label>Nome task</label>
        <input type="text" id="f-nome" value="${UiRoutine.escapeHtml(t.nome)}" placeholder="Es. Prenotare visita, capitolo 3 tesi...">
      </div>
      <div class="griglia-2">
        <div class="campo">
          <label>Ambito</label>
          <select id="f-ambito">
            ${['giorno','settimana','mese','anno'].map(a => `<option value="${a}" ${t.ambito===a?'selected':''}>${Cascata.ETICHETTE_AMBITO[a]}</option>`).join('')}
          </select>
        </div>
        <div class="campo">
          <label>Scadenza</label>
          <input type="date" id="f-scadenza" value="${t.scadenza}">
        </div>
      </div>
      <div class="campo">
        <label>Priorità: <span class="priorita-valore" id="valore-priorita">${t.priorita}</span> / 10</label>
        <input type="range" class="slider-priorita" id="f-priorita" min="1" max="10" value="${t.priorita}">
      </div>
      <div class="griglia-2">
        <div class="campo">
          <label>Promemoria (opzionale)</label>
          <input type="time" id="f-ora-promemoria" value="${t.oraPromemoria || ''}">
        </div>
        <div class="campo">
          <label>Durata stimata min. (opz.)</label>
          <input type="number" id="f-durata" min="0" step="5" value="${t.durataStimataMinuti || ''}">
        </div>
      </div>
      <div class="campo">
        <label>Note</label>
        <textarea id="f-note" placeholder="Dettagli, promemoria per te stesso...">${UiRoutine.escapeHtml(t.note || '')}</textarea>
      </div>
      <div class="riga-btn" style="margin-top:18px;">
        <button class="btn btn-primary btn-block" id="btn-salva-task">Salva</button>
      </div>
    `;
    window.App.apriFoglio(html);

    document.getElementById('f-priorita').addEventListener('input', (e) => {
      document.getElementById('valore-priorita').textContent = e.target.value;
    });
    document.getElementById('f-ambito').addEventListener('change', (e) => {
      // Suggerisce una scadenza coerente col nuovo ambito, se l'utente non l'ha già personalizzata manualmente in questa sessione
      document.getElementById('f-scadenza').value = defaultScadenzaPerAmbito(e.target.value, oggi);
    });
    document.getElementById('btn-chiudi-foglio').addEventListener('click', window.App.chiudiFoglio);
    document.getElementById('btn-salva-task').addEventListener('click', () => salva(t.id));
  }

  function salva(idEsistente) {
    const nome = document.getElementById('f-nome').value.trim();
    if (!nome) { window.App.mostraToast('Dai un nome alla task.'); return; }
    const ambito = document.getElementById('f-ambito').value;
    const scadenza = document.getElementById('f-scadenza').value || defaultScadenzaPerAmbito(ambito);
    const priorita = parseInt(document.getElementById('f-priorita').value, 10);
    const oraPromemoria = document.getElementById('f-ora-promemoria').value || null;
    const durataRaw = document.getElementById('f-durata').value;
    const durataStimataMinuti = durataRaw ? parseInt(durataRaw, 10) : null;
    const note = document.getElementById('f-note').value.trim();

    const s = Dati.stato();
    if (idEsistente) {
      const t = s.task.find(x => x.id === idEsistente);
      Object.assign(t, { nome, ambito, scadenza, priorita, oraPromemoria, durataStimataMinuti, note });
    } else {
      s.task.push({ id: Dati.generaId('task'), nome, ambito, scadenza, priorita, oraPromemoria, durataStimataMinuti, note, completata: false });
    }
    Dati.salva().then(() => {
      window.App.chiudiFoglio();
      renderLista();
      window.App.aggiornaOggi();
      window.App.mostraToast('Task salvata.');
    });
  }

  return { renderLista, apriForm, defaultScadenzaPerAmbito };
})();

window.UiTask = UiTask;
