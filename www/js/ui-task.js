/**
 * ui-task.js
 * Task "extra" (non ricorrenti): possono valere per un giorno preciso,
 * per un intervallo di settimana, per un mese (anno+mese) o per un anno.
 * Non si può mai scegliere una scadenza nel passato. Quando si avvicina la
 * scadenza del contenitore superiore, "scendono" automaticamente di
 * livello (vedi cascade.js) e vengono segnalate come urgenti/scadute.
 * Il "tipo" (condiviso con le Routine, vedi ui-tipi.js) funge anche da
 * cartella per organizzare le task.
 */
const UiTask = (function () {
  let filtroCorrente = 'attive'; // 'attive' | 'oggi' | 'completate' | 'tutte'
  let filtroTipo = 'tutti';

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
    let html = opzioni.map(([v, l]) =>
      `<button type="button" class="btn btn-sm ${filtroCorrente === v ? 'btn-primary' : ''}" data-f="${v}">${l}</button>`
    ).join('');
    cont.innerHTML = html;
    cont.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => { filtroCorrente = b.dataset.f; renderLista(); }));

    // seconda riga: filtro per "cartella" (tipo)
    const contTipo = document.getElementById('filtri-task-cartella');
    if (!contTipo) return;
    const tipiUsati = Dati.stato().tipiAttivita;
    let htmlTipo = `<button type="button" class="btn btn-sm ${filtroTipo === 'tutti' ? 'btn-primary' : ''}" data-ft="tutti">📁 Tutte</button>`;
    htmlTipo += tipiUsati.map(t => `<button type="button" class="btn btn-sm ${filtroTipo === t.id ? 'btn-primary' : ''}" data-ft="${t.id}">📁 ${UiRoutine.escapeHtml(t.nome)}</button>`).join('');
    contTipo.innerHTML = htmlTipo;
    contTipo.querySelectorAll('[data-ft]').forEach(b => b.addEventListener('click', () => { filtroTipo = b.dataset.ft; renderLista(); }));
  }

  function renderLista() {
    renderFiltri();
    const cont = document.getElementById('lista-task');
    const oggi = DataUtils.oggiISO();
    let task = Dati.stato().task.map(t => ({ t, stato: Cascata.statoTask(t, oggi) }));

    if (filtroCorrente === 'attive') task = task.filter(x => !x.t.completata);
    else if (filtroCorrente === 'oggi') task = task.filter(x => (x.stato.visibileOggi || x.stato.scaduta));
    else if (filtroCorrente === 'completate') task = task.filter(x => x.t.completata);
    if (filtroTipo !== 'tutti') task = task.filter(x => (x.t.tipo || 'altro') === filtroTipo);

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

    cont.innerHTML = task.map(({ t, stato }) => {
      const badgeCartella = (t.tipo && t.tipo !== 'altro') ? `<span class="badge" style="background:${UiTipi.coloreTipo(t.tipo)}22;color:${UiTipi.coloreTipo(t.tipo)};">${UiTipi.nomeTipo(t.tipo)}</span>` : '';
      return `
      <div class="elemento-riga" data-id="${t.id}">
        <div class="priorita-pill" style="background:${coloreDaPriorita(t.priorita)}">${t.priorita}</div>
        <div class="elemento-corpo">
          <div class="elemento-titolo" style="${t.completata ? 'text-decoration:line-through;color:var(--ink-faint);' : ''}">${UiRoutine.escapeHtml(t.nome)}</div>
          <div class="elemento-meta">Scade il ${DataUtils.formatDataBreve(t.scadenza)} ${badgeAmbito(stato, t)} ${badgeCartella}</div>
        </div>
        <div class="elemento-azioni">
          <button class="icon-btn btn-toggle-task" data-id="${t.id}" title="${t.completata ? 'Segna da fare' : 'Segna fatta'}">${t.completata ? '↺' : '✅'}</button>
          <button class="icon-btn btn-modifica-task" data-id="${t.id}" title="Modifica">✏️</button>
          <button class="icon-btn btn-elimina-task" data-id="${t.id}" title="Elimina">🗑️</button>
        </div>
      </div>
    `;
    }).join('');

    cont.querySelectorAll('.btn-modifica-task').forEach(b => b.addEventListener('click', () => apriForm(b.dataset.id)));
    cont.querySelectorAll('.btn-elimina-task').forEach(b => b.addEventListener('click', () => elimina(b.dataset.id)));
    cont.querySelectorAll('.btn-toggle-task').forEach(b => b.addEventListener('click', () => toggleCompletata(b.dataset.id)));
  }

  function toggleCompletata(id) {
    const t = Dati.stato().task.find(x => x.id === id);
    t.completata = !t.completata;
    Dati.salva().then(() => {
      if (t.completata) Notifiche.cancellaCascataTask(id); else Notifiche.pianificaCascataTask(t);
      renderLista(); window.App.aggiornaOggi();
    });
  }

  function elimina(id) {
    if (!confirm('Eliminare questa task?')) return;
    const s = Dati.stato();
    s.task = s.task.filter(t => t.id !== id);
    Dati.salva().then(() => {
      Notifiche.cancellaCascataTask(id);
      renderLista(); window.App.aggiornaOggi();
    });
  }

  // ---------------- Campo scadenza dinamico (dipende dall'ambito) ----------------
  function renderCampoScadenza(ambito, t, oggi) {
    if (ambito === 'giorno') {
      return `
        <div class="campo">
          <label>Data</label>
          <input type="date" id="f-scad-giorno" min="${oggi}" value="${t.ambito === 'giorno' ? t.scadenza : oggi}">
        </div>`;
    }
    if (ambito === 'settimana') {
      const inizio = t.ambito === 'settimana' ? (t.rangeInizio || oggi) : oggi;
      const fine = t.ambito === 'settimana' ? t.scadenza : DataUtils.fineSettimana(oggi);
      return `
        <div class="griglia-2">
          <div class="campo"><label>Dal</label><input type="date" id="f-scad-range-inizio" min="${oggi}" value="${inizio}"></div>
          <div class="campo"><label>Al</label><input type="date" id="f-scad-range-fine" min="${oggi}" value="${fine}"></div>
        </div>
        <div class="elemento-meta" style="margin-top:-6px;margin-bottom:10px;">Scegli l'intervallo che ti interessa (es. "1-7 agosto", o due settimane intere).</div>`;
    }
    if (ambito === 'mese') {
      const val = t.ambito === 'mese' ? t.scadenza.slice(0, 7) : oggi.slice(0, 7);
      return `
        <div class="campo">
          <label>Mese</label>
          <input type="month" id="f-scad-mese" min="${oggi.slice(0,7)}" value="${val}">
        </div>`;
    }
    // anno
    const annoCorrente = parseInt(oggi.slice(0, 4), 10);
    const annoVal = t.ambito === 'anno' ? parseInt(t.scadenza.slice(0, 4), 10) : annoCorrente;
    return `
      <div class="campo">
        <label>Anno</label>
        <input type="number" id="f-scad-anno" min="${annoCorrente}" max="${annoCorrente + 30}" value="${annoVal}">
      </div>`;
  }

  function calcolaScadenzaDaCampi(ambito, oggi) {
    if (ambito === 'giorno') {
      const v = document.getElementById('f-scad-giorno').value || oggi;
      return { scadenza: v < oggi ? oggi : v, rangeInizio: null };
    }
    if (ambito === 'settimana') {
      let inizio = document.getElementById('f-scad-range-inizio').value || oggi;
      let fine = document.getElementById('f-scad-range-fine').value || DataUtils.fineSettimana(oggi);
      if (inizio < oggi) inizio = oggi;
      if (fine < inizio) fine = inizio;
      return { scadenza: fine, rangeInizio: inizio };
    }
    if (ambito === 'mese') {
      const v = document.getElementById('f-scad-mese').value || oggi.slice(0, 7); // "YYYY-MM"
      const primoDelMese = v + '-01';
      const scad = (primoDelMese < oggi.slice(0,8) + '01') ? DataUtils.fineMese(oggi) : DataUtils.fineMese(primoDelMese);
      return { scadenza: scad, rangeInizio: null };
    }
    // anno
    const annoCorrente = parseInt(oggi.slice(0, 4), 10);
    let anno = parseInt(document.getElementById('f-scad-anno').value, 10) || annoCorrente;
    if (anno < annoCorrente) anno = annoCorrente;
    return { scadenza: `${anno}-12-31`, rangeInizio: null };
  }

  function apriForm(idEsistente) {
    const esistente = idEsistente ? Dati.stato().task.find(t => t.id === idEsistente) : null;
    const oggi = DataUtils.oggiISO();
    const t = esistente || {
      id: null, nome: '', priorita: 5, ambito: 'giorno', tipo: 'altro',
      scadenza: oggi, rangeInizio: null, oraPromemoria: '', durataStimataMinuti: '', note: '', completata: false
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
          <label>Cartella / tipo</label>
          <select id="f-tipo-task">${UiTipi.opzioniHtml(t.tipo)}</select>
        </div>
      </div>
      ${UiTipi.htmlCreazioneInline('f-tipo-task')}
      <div id="scadenza-dinamica">${renderCampoScadenza(t.ambito, t, oggi)}</div>
      <div class="campo">
        <label>Priorità: <span class="priorita-valore" id="valore-priorita">${t.priorita}</span> / 10</label>
        <input type="range" class="slider-priorita" id="f-priorita" min="1" max="10" value="${t.priorita}">
      </div>
      <div class="griglia-2">
        <div class="campo">
          <label>Promemoria extra (opzionale)</label>
          <input type="time" id="f-ora-promemoria" value="${t.oraPromemoria || ''}">
        </div>
        <div class="campo">
          <label>Durata stimata min. (opz.)</label>
          <input type="number" id="f-durata" min="0" step="5" value="${t.durataStimataMinuti || ''}">
        </div>
      </div>
      <div class="elemento-meta" style="margin-top:-6px;margin-bottom:10px;">
        Oltre al promemoria extra, ricevi comunque una notifica ogni volta che la task "scende" di livello (es. da mese a settimana, da settimana a giorno).
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
    UiTipi.wireSelect('f-tipo-task');

    document.getElementById('f-priorita').addEventListener('input', (e) => {
      document.getElementById('valore-priorita').textContent = e.target.value;
    });
    document.getElementById('f-ambito').addEventListener('change', (e) => {
      document.getElementById('scadenza-dinamica').innerHTML = renderCampoScadenza(e.target.value, { ambito: '__nuovo__' }, oggi);
    });
    document.getElementById('btn-chiudi-foglio').addEventListener('click', window.App.chiudiFoglio);
    document.getElementById('btn-salva-task').addEventListener('click', () => salva(t.id));
  }

  function salva(idEsistente) {
    const nome = document.getElementById('f-nome').value.trim();
    if (!nome) { window.App.mostraToast('Dai un nome alla task.'); return; }
    const ambito = document.getElementById('f-ambito').value;
    const tipo = document.getElementById('f-tipo-task').value;
    const oggi = DataUtils.oggiISO();
    const { scadenza, rangeInizio } = calcolaScadenzaDaCampi(ambito, oggi);
    const priorita = parseInt(document.getElementById('f-priorita').value, 10);
    const oraPromemoriaRaw = document.getElementById('f-ora-promemoria').value || null;
    let oraPromemoria = oraPromemoriaRaw;
    if (oraPromemoria && scadenza === oggi) {
      // se il promemoria e' per oggi, non permettere un orario gia' passato
      const minutiOra = DataUtils.oraToMinuti(oraPromemoria);
      if (minutiOra < DataUtils.minutiAdesso()) oraPromemoria = null;
    }
    const durataRaw = document.getElementById('f-durata').value;
    const durataStimataMinuti = durataRaw ? parseInt(durataRaw, 10) : null;
    const note = document.getElementById('f-note').value.trim();

    const s = Dati.stato();
    let taskSalvata;
    if (idEsistente) {
      taskSalvata = s.task.find(x => x.id === idEsistente);
      Object.assign(taskSalvata, { nome, ambito, tipo, scadenza, rangeInizio, priorita, oraPromemoria, durataStimataMinuti, note });
    } else {
      taskSalvata = { id: Dati.generaId('task'), nome, ambito, tipo, scadenza, rangeInizio, priorita, oraPromemoria, durataStimataMinuti, note, completata: false };
      s.task.push(taskSalvata);
    }
    Dati.salva().then(() => {
      if (window.Notifiche && Notifiche.pianificaCascataTask) Notifiche.pianificaCascataTask(taskSalvata);
      window.App.chiudiFoglio();
      renderLista();
      window.App.aggiornaOggi();
      window.App.mostraToast('Task salvata.');
    });
  }

  return { renderLista, apriForm, defaultScadenzaPerAmbito };
})();

window.UiTask = UiTask;
