/**
 * ui-routine.js
 * Gestione delle attività di routine: nome, orario, durata, priorità (1-10),
 * giorni della settimana in cui è attiva.
 */
const UiRoutine = (function () {

  function coloreDaPriorita(p) {
    const l = 80 - ((Math.max(1, Math.min(10, p)) - 1) / 9) * 42; // 80% -> 38%
    return `hsl(38, 58%, ${l.toFixed(0)}%)`;
  }

  function renderLista() {
    const cont = document.getElementById('lista-routine');
    const routine = Dati.stato().routine.slice().sort((a, b) => b.priorita - a.priorita || a.oraInizio.localeCompare(b.oraInizio));
    if (!routine.length) {
      cont.innerHTML = '<div class="vuoto">Nessuna routine ancora.<br>Tocca "+ Nuova routine" per iniziare.</div>';
      return;
    }
    cont.innerHTML = routine.map(r => {
      const giorniTxt = r.giorni.length === 7 ? 'Tutti i giorni' : r.giorni.slice().sort((a,b)=>a-b).map(g => DataUtils.NOMI_GIORNI[g - 1]).join(' ');
      const badgeTipo = (r.tipo && r.tipo !== 'altro') ? `<span class="badge" style="background:${UiTipi.coloreTipo(r.tipo)}22;color:${UiTipi.coloreTipo(r.tipo)};">${UiTipi.nomeTipo(r.tipo)}</span>` : '';
      return `
      <div class="elemento-riga" data-id="${r.id}">
        <div class="priorita-pill" style="background:${coloreDaPriorita(r.priorita)}">${r.priorita}</div>
        <div class="elemento-corpo">
          <div class="elemento-titolo">${escapeHtml(r.nome)} ${badgeTipo}</div>
          <div class="elemento-meta">${r.oraInizio} · ${r.durataMinuti} min · ${giorniTxt}</div>
        </div>
        <div class="elemento-azioni">
          <button class="icon-btn btn-modifica-routine" data-id="${r.id}" title="Modifica">✏️</button>
          <button class="icon-btn btn-elimina-routine" data-id="${r.id}" title="Elimina">🗑️</button>
        </div>
      </div>`;
    }).join('');

    cont.querySelectorAll('.btn-modifica-routine').forEach(b => b.addEventListener('click', () => apriForm(b.dataset.id)));
    cont.querySelectorAll('.btn-elimina-routine').forEach(b => b.addEventListener('click', () => elimina(b.dataset.id)));
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function elimina(id) {
    if (!confirm('Eliminare questa routine?')) return;
    const s = Dati.stato();
    s.routine = s.routine.filter(r => r.id !== id);
    Dati.salva().then(() => { renderLista(); window.App.aggiornaOggi(); });
  }

  function apriForm(idEsistente) {
    const esistente = idEsistente ? Dati.stato().routine.find(r => r.id === idEsistente) : null;
    const r = esistente || { id: null, nome: '', tipo: 'altro', descrizione: '', oraInizio: '08:00', durataMinuti: 30, priorita: 5, giorni: [1,2,3,4,5,6,7], attiva: true };

    const html = `
      <div class="foglio-header">
        <h2>${esistente ? 'Modifica routine' : 'Nuova routine'}</h2>
        <button class="icon-btn" id="btn-chiudi-foglio">✕</button>
      </div>
      <div class="campo">
        <label>Nome attività</label>
        <input type="text" id="f-nome" value="${escapeHtml(r.nome)}" placeholder="Es. Allenamento, Studio, Lettura...">
      </div>
      <div class="campo">
        <label>Tipo</label>
        <select id="f-tipo-routine">${UiTipi.opzioniHtml(r.tipo)}</select>
        ${UiTipi.htmlCreazioneInline('f-tipo-routine')}
      </div>
      <div class="griglia-2">
        <div class="campo">
          <label>Orario di inizio</label>
          <input type="time" id="f-ora" value="${r.oraInizio}">
        </div>
        <div class="campo">
          <label>Durata (minuti)</label>
          <input type="number" id="f-durata" min="5" step="5" value="${r.durataMinuti}">
        </div>
      </div>
      <div class="campo">
        <label>Priorità: <span class="priorita-valore" id="valore-priorita">${r.priorita}</span> / 10</label>
        <input type="range" class="slider-priorita" id="f-priorita" min="1" max="10" value="${r.priorita}">
      </div>
      <div class="campo">
        <label>Giorni della settimana</label>
        <div class="giorni-settimana" id="f-giorni">
          ${DataUtils.NOMI_GIORNI.map((n, i) => `<button type="button" class="giorno-toggle ${r.giorni.includes(i+1) ? 'selezionato' : ''}" data-g="${i+1}">${n}</button>`).join('')}
        </div>
      </div>
      <div class="campo">
        <label>Descrizione (facoltativa)</label>
        <textarea id="f-descrizione-routine" placeholder="Dettagli che vuoi rivedere quando tocchi questa attività...">${escapeHtml(r.descrizione || '')}</textarea>
      </div>
      <div class="riga-btn" style="margin-top:18px;">
        <button class="btn btn-primary btn-block" id="btn-salva-routine">Salva</button>
      </div>
    `;
    window.App.apriFoglio(html);
    UiTipi.wireSelect('f-tipo-routine');

    document.getElementById('f-priorita').addEventListener('input', (e) => {
      document.getElementById('valore-priorita').textContent = e.target.value;
    });
    document.querySelectorAll('#f-giorni .giorno-toggle').forEach(btn => {
      btn.addEventListener('click', () => btn.classList.toggle('selezionato'));
    });
    document.getElementById('btn-chiudi-foglio').addEventListener('click', window.App.chiudiFoglio);
    document.getElementById('btn-salva-routine').addEventListener('click', () => salva(r.id));
  }

  function salva(idEsistente) {
    const nome = document.getElementById('f-nome').value.trim();
    if (!nome) { window.App.mostraToast('Dai un nome alla routine.'); return; }
    const tipo = document.getElementById('f-tipo-routine').value;
    if (tipo === 'diario') {
      const s0 = Dati.stato();
      const giaEsiste = s0.routine.some(r => r.tipo === 'diario' && r.id !== idEsistente);
      if (giaEsiste) { window.App.mostraToast('Esiste già una routine di tipo "Diario": può essercene solo una.'); return; }
    }
    const oraInizio = document.getElementById('f-ora').value || '08:00';
    const durataMinuti = Math.max(5, parseInt(document.getElementById('f-durata').value, 10) || 30);
    const priorita = parseInt(document.getElementById('f-priorita').value, 10);
    const giorni = Array.from(document.querySelectorAll('#f-giorni .giorno-toggle.selezionato')).map(b => parseInt(b.dataset.g, 10));
    const descrizione = document.getElementById('f-descrizione-routine').value.trim();

    const s = Dati.stato();
    if (idEsistente) {
      const r = s.routine.find(x => x.id === idEsistente);
      Object.assign(r, { nome, tipo, oraInizio, durataMinuti, priorita, giorni, descrizione });
    } else {
      s.routine.push({ id: Dati.generaId('routine'), nome, tipo, oraInizio, durataMinuti, priorita, giorni, descrizione, attiva: true });
    }
    Dati.salva().then(() => {
      window.App.chiudiFoglio();
      renderLista();
      window.App.aggiornaOggi();
      window.App.mostraToast('Routine salvata.');
    });
  }

  return { renderLista, apriForm, coloreDaPriorita, escapeHtml };
})();

window.UiRoutine = UiRoutine;
