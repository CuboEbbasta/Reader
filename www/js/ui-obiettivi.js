/**
 * ui-obiettivi.js
 * Obiettivi a lungo termine, di 3 tipi:
 * - concreto: risultato tangibile con scadenza (es. "scrivere un libro")
 * - generale: percorso di crescita/competenza (es. "migliorare in ambito scientifico")
 * - valoriale: modo di essere, non un "fare" (es. "essere più umile")
 *
 * Stessa logica di cascata delle task (cascade.js), ma su orizzonti lunghi:
 * 1 mese / 6 mesi / 1 anno / 5 anni / 10 anni. La cascata cambia solo la
 * "vetrina" temporale in cui l'obiettivo compare, MAI lo scompone in azioni:
 * per quello c'è il campo note libere e, se vuoi, il collegamento manuale a
 * una o più task esistenti.
 */
const UiObiettivi = (function () {
  let filtroTipo = 'tutti'; // 'tutti' | 'concreto' | 'generale' | 'valoriale'
  let filtroAmbito = 'tutti'; // 'tutti' | '1mese' | '6mesi' | '1anno' | '5anni' | '10anni'

  const ETICHETTE_TIPO = { concreto: 'Concreto', generale: 'Generale', valoriale: 'Valoriale' };
  const DESCRIZIONE_TIPO = {
    concreto: 'Un risultato preciso e verificabile (es. scrivere un libro, prendere una certificazione).',
    generale: 'Un percorso di crescita senza un traguardo unico (es. migliorare in ambito scientifico).',
    valoriale: 'Riguarda il modo di essere, non un\'azione da completare (es. essere più umile).'
  };

  function defaultScadenzaPerAmbito(ambito, oggi) {
    oggi = oggi || DataUtils.oggiISO();
    if (ambito === '1mese') return DataUtils.addMesi(oggi, 1);
    if (ambito === '6mesi') return DataUtils.addMesi(oggi, 6);
    if (ambito === '1anno') return DataUtils.addAnni(oggi, 1);
    if (ambito === '5anni') return DataUtils.addAnni(oggi, 5);
    return DataUtils.addAnni(oggi, 10);
  }

  function badgeAmbito(stato, obiettivo) {
    const testo = CascataObiettivi.ETICHETTE_AMBITO[stato.ambitoEffettivo];
    if (obiettivo.completato) return `<span class="badge badge-ok">Raggiunto</span>`;
    if (stato.scaduta) return `<span class="badge badge-warn">Scaduto</span>`;
    if (stato.cascata) return `<span class="badge badge-warn">${testo} (era ${CascataObiettivi.ETICHETTE_AMBITO[obiettivo.ambito]})</span>`;
    return `<span class="badge badge-accent">${testo}</span>`;
  }

  function renderFiltri() {
    const cont = document.getElementById('filtri-obiettivi');
    const opzioni = [['tutti', 'Tutti'], ['concreto', 'Concreti'], ['generale', 'Generali'], ['valoriale', 'Valoriali']];
    cont.innerHTML = opzioni.map(([v, l]) =>
      `<button type="button" class="btn btn-sm ${filtroTipo === v ? 'btn-primary' : ''}" data-f="${v}">${l}</button>`
    ).join('');
    cont.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { filtroTipo = b.dataset.f; renderLista(); }));

    const contAmbito = document.getElementById('filtri-obiettivi-ambito');
    if (!contAmbito) return;
    let htmlAmbito = `<button type="button" class="btn btn-sm ${filtroAmbito === 'tutti' ? 'btn-primary' : ''}" data-fa="tutti">Ogni orizzonte</button>`;
    htmlAmbito += CascataObiettivi.ORDINE.slice().reverse().map(a =>
      `<button type="button" class="btn btn-sm ${filtroAmbito === a ? 'btn-primary' : ''}" data-fa="${a}">${CascataObiettivi.ETICHETTE_AMBITO[a]}</button>`
    ).join('');
    contAmbito.innerHTML = htmlAmbito;
    contAmbito.querySelectorAll('[data-fa]').forEach(b => b.addEventListener('click', () => { filtroAmbito = b.dataset.fa; renderLista(); }));
  }

  function renderLista() {
    renderFiltri();
    const cont = document.getElementById('lista-obiettivi');
    const oggi = DataUtils.oggiISO();
    let obiettivi = Dati.stato().obiettivi.map(o => ({ o, stato: CascataObiettivi.statoObiettivo(o, oggi) }));

    if (filtroTipo !== 'tutti') obiettivi = obiettivi.filter(x => x.o.tipo === filtroTipo);
    if (filtroAmbito !== 'tutti') obiettivi = obiettivi.filter(x => x.stato.ambitoEffettivo === filtroAmbito);

    obiettivi.sort((a, b) => {
      if (a.o.completato !== b.o.completato) return a.o.completato ? 1 : -1;
      const ordA = CascataObiettivi.ORDINE.indexOf(a.stato.ambitoEffettivo);
      const ordB = CascataObiettivi.ORDINE.indexOf(b.stato.ambitoEffettivo);
      return ordB - ordA; // orizzonti più corti (piu' urgenti) prima
    });

    if (!obiettivi.length) {
      cont.innerHTML = '<div class="vuoto">Nessun obiettivo in questa vista.<br>Tocca "+ Nuovo obiettivo" per iniziare.</div>';
      return;
    }

    cont.innerHTML = obiettivi.map(({ o, stato }) => {
      const tappe = o.tappe || [];
      const tappeFatte = tappe.filter(t => t.completata).length;
      return `
      <div class="elemento-riga" data-id="${o.id}" style="align-items:flex-start;">
        <div class="priorita-pill" style="background:${UiRoutine.coloreDaPriorita(o.tipo === 'concreto' ? 8 : o.tipo === 'generale' ? 5 : 3)}; font-size:10px;">${ETICHETTE_TIPO[o.tipo].slice(0,3)}</div>
        <div class="elemento-corpo">
          <div class="elemento-titolo" style="${o.completato ? 'text-decoration:line-through;color:var(--ink-faint);' : ''}">${UiRoutine.escapeHtml(o.titolo)}</div>
          <div class="elemento-meta">Entro il ${DataUtils.formatDataBreve(o.scadenza)} ${badgeAmbito(stato, o)} ${tappe.length ? `<span class="badge badge-accent">${tappeFatte}/${tappe.length} tappe</span>` : ''}</div>
          ${o.descrizione ? `<div class="elemento-meta" style="margin-top:3px;font-style:italic;">${UiRoutine.escapeHtml(o.descrizione.slice(0, 90))}${o.descrizione.length > 90 ? '…' : ''}</div>` : ''}
        </div>
        <div class="elemento-azioni">
          <button class="icon-btn btn-tappe-obiettivo" data-id="${o.id}" title="Tappe/timeline">📍</button>
          <button class="icon-btn btn-toggle-obiettivo" data-id="${o.id}" title="${o.completato ? 'Riapri' : 'Segna raggiunto'}">${o.completato ? '↺' : '✅'}</button>
          <button class="icon-btn btn-modifica-obiettivo" data-id="${o.id}" title="Modifica">✏️</button>
          <button class="icon-btn btn-elimina-obiettivo" data-id="${o.id}" title="Elimina">🗑️</button>
        </div>
      </div>
    `; }).join('');

    cont.querySelectorAll('.btn-modifica-obiettivo').forEach(b => b.addEventListener('click', () => apriForm(b.dataset.id)));
    cont.querySelectorAll('.btn-elimina-obiettivo').forEach(b => b.addEventListener('click', () => elimina(b.dataset.id)));
    cont.querySelectorAll('.btn-toggle-obiettivo').forEach(b => b.addEventListener('click', () => toggleCompletato(b.dataset.id)));
    cont.querySelectorAll('.btn-tappe-obiettivo').forEach(b => b.addEventListener('click', () => apriTappe(b.dataset.id)));
  }

  function toggleCompletato(id) {
    const o = Dati.stato().obiettivi.find(x => x.id === id);
    o.completato = !o.completato;
    Dati.salva().then(renderLista);
  }

  function elimina(id) {
    if (!confirm('Eliminare questo obiettivo?')) return;
    const s = Dati.stato();
    s.obiettivi = s.obiettivi.filter(o => o.id !== id);
    Dati.salva().then(renderLista);
  }

  function apriForm(idEsistente) {
    const esistente = idEsistente ? Dati.stato().obiettivi.find(o => o.id === idEsistente) : null;
    const oggi = DataUtils.oggiISO();
    const o = esistente || {
      id: null, titolo: '', tipo: 'concreto', ambito: '1anno',
      scadenza: defaultScadenzaPerAmbito('1anno', oggi), descrizione: '', completato: false, attivitaCollegate: []
    };

    const tutteLeTask = Dati.stato().task;
    const tutteLeRoutine = Dati.stato().routine;
    const html = `
      <div class="foglio-header">
        <h2>${esistente ? 'Modifica obiettivo' : 'Nuovo obiettivo'}</h2>
        <button class="icon-btn" id="btn-chiudi-foglio">✕</button>
      </div>
      <div class="campo">
        <label>Titolo</label>
        <input type="text" id="f-titolo" value="${UiRoutine.escapeHtml(o.titolo)}" placeholder="Es. Scrivere un libro, Essere più umile...">
      </div>
      <div class="campo">
        <label>Tipo</label>
        <select id="f-tipo">
          ${Object.keys(ETICHETTE_TIPO).map(t => `<option value="${t}" ${o.tipo===t?'selected':''}>${ETICHETTE_TIPO[t]}</option>`).join('')}
        </select>
        <div class="elemento-meta" id="descrizione-tipo" style="margin-top:6px;">${DESCRIZIONE_TIPO[o.tipo]}</div>
      </div>
      <div class="griglia-2">
        <div class="campo">
          <label>Orizzonte</label>
          <select id="f-ambito">
            ${CascataObiettivi.ORDINE.slice().reverse().map(a => `<option value="${a}" ${o.ambito===a?'selected':''}>${CascataObiettivi.ETICHETTE_AMBITO[a]}</option>`).join('')}
          </select>
        </div>
        <div class="campo">
          <label>Scadenza indicativa</label>
          <input type="date" id="f-scadenza" value="${o.scadenza}">
        </div>
      </div>
      <div class="campo">
        <label>Note / come vorrei scomporlo (facoltativo)</label>
        <textarea id="f-descrizione" placeholder="Idee, tappe intermedie, promemoria per te stesso...">${UiRoutine.escapeHtml(o.descrizione || '')}</textarea>
      </div>
      ${(tutteLeTask.length || tutteLeRoutine.length) ? `
      <div class="campo">
        <label>Attività collegate (facoltativo)</label>
        <select id="f-attivita-collegate" multiple size="5">
          ${tutteLeRoutine.length ? `<optgroup label="Routine">${tutteLeRoutine.map(r => `<option value="routine:${r.id}" ${(o.attivitaCollegate||[]).includes('routine:'+r.id)?'selected':''}>${UiRoutine.escapeHtml(r.nome)}</option>`).join('')}</optgroup>` : ''}
          ${tutteLeTask.length ? `<optgroup label="Task">${tutteLeTask.map(t => `<option value="task:${t.id}" ${(o.attivitaCollegate||[]).includes('task:'+t.id)?'selected':''}>${UiRoutine.escapeHtml(t.nome)}</option>`).join('')}</optgroup>` : ''}
        </select>
        <div class="elemento-meta" style="margin-top:4px;">Tieni premuto/Ctrl+click per selezionarne più di una.</div>
      </div>` : ''}
      <div class="riga-btn" style="margin-top:18px;">
        <button class="btn btn-primary btn-block" id="btn-salva-obiettivo">Salva</button>
      </div>
    `;
    window.App.apriFoglio(html);

    document.getElementById('f-tipo').addEventListener('change', (e) => {
      document.getElementById('descrizione-tipo').textContent = DESCRIZIONE_TIPO[e.target.value];
    });
    document.getElementById('f-ambito').addEventListener('change', (e) => {
      document.getElementById('f-scadenza').value = defaultScadenzaPerAmbito(e.target.value, oggi);
    });
    document.getElementById('btn-chiudi-foglio').addEventListener('click', window.App.chiudiFoglio);
    document.getElementById('btn-salva-obiettivo').addEventListener('click', () => salva(o.id));
  }

  function salva(idEsistente) {
    const titolo = document.getElementById('f-titolo').value.trim();
    if (!titolo) { window.App.mostraToast('Dai un titolo all\'obiettivo.'); return; }
    const tipo = document.getElementById('f-tipo').value;
    const ambito = document.getElementById('f-ambito').value;
    const scadenza = document.getElementById('f-scadenza').value || defaultScadenzaPerAmbito(ambito);
    const descrizione = document.getElementById('f-descrizione').value.trim();
    const selectAttivita = document.getElementById('f-attivita-collegate');
    const attivitaCollegate = selectAttivita ? Array.from(selectAttivita.selectedOptions).map(o => o.value) : [];

    const s = Dati.stato();
    if (idEsistente) {
      const o = s.obiettivi.find(x => x.id === idEsistente);
      Object.assign(o, { titolo, tipo, ambito, scadenza, descrizione, attivitaCollegate });
    } else {
      s.obiettivi.push({ id: Dati.generaId('obiettivo'), titolo, tipo, ambito, scadenza, descrizione, completato: false, attivitaCollegate, tappe: [] });
    }
    Dati.salva().then(() => {
      window.App.chiudiFoglio();
      renderLista();
      window.App.mostraToast('Obiettivo salvato.');
    });
  }

  // ---------------- Tappe (timeline manuale dentro l'obiettivo) ----------------
  function suggerimentoIntervalloTappe(ambito) {
    if (ambito === '1mese') return { giorni: 7, etichetta: 'Settimana' };
    if (ambito === '6mesi' || ambito === '1anno') return { giorni: 30, etichetta: 'Mese' };
    return { giorni: 365, etichetta: 'Anno' }; // 5anni, 10anni
  }

  function apriTappe(id) {
    const o = Dati.stato().obiettivi.find(x => x.id === id);
    const suggerimento = suggerimentoIntervalloTappe(o.ambito);
    const html = `
      <div class="foglio-header">
        <h2>Tappe — ${UiRoutine.escapeHtml(o.titolo)}</h2>
        <button class="icon-btn" id="btn-chiudi-foglio">✕</button>
      </div>
      <div class="elemento-meta" style="margin-bottom:12px;">
        Decidi tu cosa fare e quando: aggiungi le tappe a mano, oppure genera
        uno scheletro (${suggerimento.etichetta.toLowerCase()} per ${suggerimento.etichetta.toLowerCase()})
        da entro oggi e la scadenza, e poi rinomina/riempi ogni tappa.
      </div>
      <div class="riga-btn" style="margin-bottom:14px;">
        <button class="btn btn-sm btn-accent" id="btn-aggiungi-tappa">+ Aggiungi tappa</button>
        <button class="btn btn-sm" id="btn-genera-tappe">Genera scheletro (${suggerimento.etichetta.toLowerCase()}e)</button>
      </div>
      <div id="lista-tappe"></div>
    `;
    window.App.apriFoglio(html);
    document.getElementById('btn-chiudi-foglio').addEventListener('click', window.App.chiudiFoglio);
    document.getElementById('btn-aggiungi-tappa').addEventListener('click', () => apriFormTappa(id, null));
    document.getElementById('btn-genera-tappe').addEventListener('click', () => generaTappeAutomatiche(id));
    renderTappeContenuto(id);
  }

  function renderTappeContenuto(id) {
    const cont = document.getElementById('lista-tappe');
    if (!cont) return; // il foglio potrebbe non essere più quello attivo
    const o = Dati.stato().obiettivi.find(x => x.id === id);
    if (!o.tappe) o.tappe = [];
    const tappeOrdinate = o.tappe.slice().sort((a, b) => a.data.localeCompare(b.data));

    if (!tappeOrdinate.length) {
      cont.innerHTML = '<div class="vuoto">Nessuna tappa ancora.</div>';
      return;
    }

    cont.innerHTML = tappeOrdinate.map((t) => {
      const indiceReale = o.tappe.indexOf(t);
      return `
      <div class="timeline-item">
        <div class="timeline-ora">${DataUtils.formatDataBreve(t.data)}</div>
        <div class="timeline-barra" style="background:${t.completata ? 'var(--ok)' : 'var(--accent)'}"></div>
        <div class="timeline-corpo">
          <div class="timeline-titolo" style="${t.completata ? 'text-decoration:line-through;color:var(--ink-faint);' : ''}">${UiRoutine.escapeHtml(t.titolo)}</div>
          ${t.note ? `<div class="timeline-meta">${UiRoutine.escapeHtml(t.note)}</div>` : ''}
          <div class="timeline-azioni">
            <button class="btn btn-sm ${t.completata ? '' : 'btn-ok'}" data-azione="toggle" data-indice="${indiceReale}">${t.completata ? '↺ Riapri' : '✅ Fatta'}</button>
            <button class="btn btn-sm" data-azione="modifica" data-indice="${indiceReale}">✏️</button>
            <button class="btn btn-sm btn-warn" data-azione="elimina" data-indice="${indiceReale}">🗑️</button>
          </div>
        </div>
      </div>`;
    }).join('');

    cont.querySelectorAll('[data-azione="toggle"]').forEach(b => b.addEventListener('click', () => toggleTappa(id, parseInt(b.dataset.indice, 10))));
    cont.querySelectorAll('[data-azione="modifica"]').forEach(b => b.addEventListener('click', () => apriFormTappa(id, parseInt(b.dataset.indice, 10))));
    cont.querySelectorAll('[data-azione="elimina"]').forEach(b => b.addEventListener('click', () => eliminaTappa(id, parseInt(b.dataset.indice, 10))));
  }

  function generaTappeAutomatiche(id) {
    const o = Dati.stato().obiettivi.find(x => x.id === id);
    if (!o.tappe) o.tappe = [];
    if (o.tappe.length && !confirm('Verranno aggiunte nuove tappe vuote a quelle già presenti (quelle esistenti restano). Continuare?')) return;

    const oggi = DataUtils.oggiISO();
    const { giorni, etichetta } = suggerimentoIntervalloTappe(o.ambito);
    const totaleGiorni = Math.max(1, DataUtils.differenzaGiorni(oggi, o.scadenza));
    const numero = Math.min(24, Math.max(1, Math.round(totaleGiorni / giorni)));

    for (let i = 1; i <= numero; i++) {
      o.tappe.push({
        id: Dati.generaId('tappa'),
        titolo: `${etichetta} ${i}`,
        data: DataUtils.addGiorni(oggi, giorni * i),
        completata: false,
        note: ''
      });
    }
    Dati.salva().then(() => {
      renderTappeContenuto(id);
      renderLista();
      window.App.mostraToast(`${numero} tappe generate — rinominale e riempile come preferisci.`);
    });
  }

  function apriFormTappa(obiettivoId, indiceEsistente) {
    const o = Dati.stato().obiettivi.find(x => x.id === obiettivoId);
    const esistente = indiceEsistente != null ? o.tappe[indiceEsistente] : null;
    const t = esistente || { titolo: '', data: DataUtils.oggiISO(), note: '', completata: false };

    const html = `
      <div class="foglio-header">
        <h2>${esistente ? 'Modifica tappa' : 'Nuova tappa'}</h2>
        <button class="icon-btn" id="btn-chiudi-foglio">✕</button>
      </div>
      <div class="campo">
        <label>Titolo</label>
        <input type="text" id="f-titolo-tappa" value="${UiRoutine.escapeHtml(t.titolo)}" placeholder="Es. Settimana 1 — scrivere il capitolo 1">
      </div>
      <div class="campo">
        <label>Data</label>
        <input type="date" id="f-data-tappa" value="${t.data}">
      </div>
      <div class="campo">
        <label>Note (facoltativo)</label>
        <textarea id="f-note-tappa">${UiRoutine.escapeHtml(t.note || '')}</textarea>
      </div>
      <div class="riga-btn" style="margin-top:16px;">
        <button class="btn btn-primary btn-block" id="btn-salva-tappa">Salva</button>
      </div>
      <div class="riga-btn" style="margin-top:8px;">
        <button class="btn btn-sm btn-ghost btn-block" id="btn-torna-tappe">← Torna alla timeline</button>
      </div>
    `;
    window.App.apriFoglio(html);
    document.getElementById('btn-chiudi-foglio').addEventListener('click', window.App.chiudiFoglio);
    document.getElementById('btn-torna-tappe').addEventListener('click', () => apriTappe(obiettivoId));
    document.getElementById('btn-salva-tappa').addEventListener('click', () => salvaTappa(obiettivoId, indiceEsistente));
  }

  function salvaTappa(obiettivoId, indiceEsistente) {
    const titolo = document.getElementById('f-titolo-tappa').value.trim();
    if (!titolo) { window.App.mostraToast('Dai un titolo alla tappa.'); return; }
    const data = document.getElementById('f-data-tappa').value || DataUtils.oggiISO();
    const note = document.getElementById('f-note-tappa').value.trim();

    const o = Dati.stato().obiettivi.find(x => x.id === obiettivoId);
    if (!o.tappe) o.tappe = [];
    if (indiceEsistente != null) {
      Object.assign(o.tappe[indiceEsistente], { titolo, data, note });
    } else {
      o.tappe.push({ id: Dati.generaId('tappa'), titolo, data, note, completata: false });
    }
    Dati.salva().then(() => {
      apriTappe(obiettivoId);
      renderLista();
      window.App.mostraToast('Tappa salvata.');
    });
  }

  function toggleTappa(obiettivoId, indice) {
    const o = Dati.stato().obiettivi.find(x => x.id === obiettivoId);
    o.tappe[indice].completata = !o.tappe[indice].completata;
    Dati.salva().then(() => { renderTappeContenuto(obiettivoId); renderLista(); });
  }

  function eliminaTappa(obiettivoId, indice) {
    if (!confirm('Eliminare questa tappa?')) return;
    const o = Dati.stato().obiettivi.find(x => x.id === obiettivoId);
    o.tappe.splice(indice, 1);
    Dati.salva().then(() => { renderTappeContenuto(obiettivoId); renderLista(); });
  }

  return { renderLista, apriForm, apriTappe, defaultScadenzaPerAmbito, ETICHETTE_TIPO };
})();

window.UiObiettivi = UiObiettivi;
