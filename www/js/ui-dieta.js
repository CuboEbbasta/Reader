/**
 * ui-dieta.js
 * Sezione Dieta: profilo fisico -> target calorico/macro -> piano
 * settimanale generato (ma sempre modificabile a mano) -> log di cosa si è
 * mangiato oggi, confrontato col target.
 */
const UiDieta = (function () {
  let giornoSelezionatoPiano = DataUtils.weekdayISO(DataUtils.oggiISO());

  /** Integrità dati: un pasto non può essere tutto a zero, né avere valori assurdi */
  function validaValoriPasto(kcal, proteine, carboidrati, grassi) {
    if (kcal === 0 && proteine === 0 && carboidrati === 0 && grassi === 0) {
      return 'Inserisci almeno un valore diverso da zero — un pasto non può essere tutto a 0.';
    }
    if (kcal < 0 || proteine < 0 || carboidrati < 0 || grassi < 0) return 'I valori non possono essere negativi.';
    if (kcal > 5000) return 'Kcal troppo alte per un singolo pasto (' + kcal + '): controlla il valore.';
    return null;
  }

  // ---------------- Profilo ----------------
  function apriFormProfilo() {
    const p = Dati.stato().profilo;
    const html = `
      <div class="foglio-header">
        <h2>Il tuo profilo</h2>
        <button class="icon-btn" id="btn-chiudi-foglio">✕</button>
      </div>
      <div class="elemento-meta" style="margin-bottom:12px;">
        Serve per calcolare un fabbisogno calorico indicativo. Non sostituisce
        una valutazione medica o di un/a nutrizionista, specie in presenza di patologie.
      </div>
      <div class="griglia-2">
        <div class="campo">
          <label>Età</label>
          <input type="number" id="f-eta" min="10" max="100" value="${p.eta || ''}">
        </div>
        <div class="campo">
          <label>Sesso (per il calcolo del BMR)</label>
          <select id="f-sesso">
            <option value="M" ${p.sesso==='M'?'selected':''}>M</option>
            <option value="F" ${p.sesso==='F'?'selected':''}>F</option>
          </select>
        </div>
      </div>
      <div class="griglia-2">
        <div class="campo">
          <label>Altezza (cm)</label>
          <input type="number" id="f-altezza" min="120" max="230" value="${p.altezzaCm || ''}">
        </div>
        <div class="campo">
          <label>Peso attuale (kg)</label>
          <input type="number" id="f-peso" min="30" max="250" step="0.1" value="${p.pesoKg || ''}">
        </div>
      </div>
      <div class="campo">
        <label>Livello di attività</label>
        <select id="f-attivita">
          ${Object.keys(CalcoloDieta.ETICHETTE_ATTIVITA).map(k => `<option value="${k}" ${p.livelloAttivita===k?'selected':''}>${CalcoloDieta.ETICHETTE_ATTIVITA[k]}</option>`).join('')}
        </select>
      </div>
      <div class="campo">
        <label>Obiettivo</label>
        <select id="f-obiettivo">
          ${Object.keys(CalcoloDieta.ETICHETTE_OBIETTIVO).map(k => `<option value="${k}" ${p.obiettivo===k?'selected':''}>${CalcoloDieta.ETICHETTE_OBIETTIVO[k]}</option>`).join('')}
        </select>
      </div>
      <div class="campo">
        <label>Quanti pasti al giorno</label>
        <select id="f-numero-pasti">
          ${[3,4,5,6].map(n => `<option value="${n}" ${(p.numeroPasti||5)===n?'selected':''}>${n} pasti</option>`).join('')}
        </select>
      </div>
      <div class="divisore-testo">Facoltativo</div>
      <div class="griglia-2">
        <div class="campo">
          <label>% massa grassa</label>
          <input type="number" id="f-perc-grassa" step="0.1" min="0" max="70" value="${p.percentualeGrassa != null ? p.percentualeGrassa : ''}" placeholder="Se la conosci">
        </div>
        <div class="campo">
          <label>Vita (cm)</label>
          <input type="number" id="f-circ-vita" step="0.5" value="${(p.circonferenze && p.circonferenze.vita != null) ? p.circonferenze.vita : ''}">
        </div>
      </div>
      <div class="griglia-2">
        <div class="campo">
          <label>Fianchi (cm)</label>
          <input type="number" id="f-circ-fianchi" step="0.5" value="${(p.circonferenze && p.circonferenze.fianchi != null) ? p.circonferenze.fianchi : ''}">
        </div>
        <div class="campo">
          <label>Torace (cm)</label>
          <input type="number" id="f-circ-torace" step="0.5" value="${(p.circonferenze && p.circonferenze.torace != null) ? p.circonferenze.torace : ''}">
        </div>
      </div>
      <div class="campo">
        <label>Braccio (cm)</label>
        <input type="number" id="f-circ-braccio" step="0.5" value="${(p.circonferenze && p.circonferenze.braccio != null) ? p.circonferenze.braccio : ''}">
      </div>
      <div class="campo">
        <label>Allergie / intolleranze (escluse automaticamente dal piano)</label>
        <div class="giorni-settimana">
          ${DatabaseDieta.ALLERGENI.map(a => `<button type="button" class="giorno-toggle ${(p.allergie||[]).includes(a.id)?'selezionato':''}" data-allergene="${a.id}" style="width:auto;padding:0 10px;">${a.nome}</button>`).join('')}
        </div>
      </div>
      <div class="campo">
        <label>Cibi che non ti piacciono (separati da virgola)</label>
        <input type="text" id="f-non-graditi" value="${UiRoutine.escapeHtml(p.cibiNonGraditi || '')}" placeholder="Es. tonno, funghi, tofu">
      </div>
      <div class="campo">
        <label>Patologie o note per un professionista (facoltativo, solo informativo)</label>
        <textarea id="f-patologie" placeholder="Non usato per generare il piano, ma tienilo a mente se lo condividi con un medico.">${UiRoutine.escapeHtml(p.patologie || '')}</textarea>
      </div>
      <div class="riga-btn" style="margin-top:16px;">
        <button class="btn btn-primary btn-block" id="btn-salva-profilo">Salva profilo</button>
      </div>
    `;
    window.App.apriFoglio(html);
    document.querySelectorAll('[data-allergene]').forEach(b => b.addEventListener('click', () => b.classList.toggle('selezionato')));
    document.getElementById('btn-chiudi-foglio').addEventListener('click', window.App.chiudiFoglio);
    document.getElementById('btn-salva-profilo').addEventListener('click', salvaProfiloDaForm);
  }

  async function salvaProfiloDaForm() {
    const eta = parseInt(document.getElementById('f-eta').value, 10);
    const altezzaCm = parseInt(document.getElementById('f-altezza').value, 10);
    const pesoKg = parseFloat(document.getElementById('f-peso').value);
    if (!eta || !altezzaCm || !pesoKg) { window.App.mostraToast('Compila almeno età, altezza e peso.'); return; }
    const allergie = Array.from(document.querySelectorAll('[data-allergene].selezionato')).map(b => b.dataset.allergene);

    await Dati.salvaProfilo({
      eta, altezzaCm, pesoKg,
      sesso: document.getElementById('f-sesso').value,
      livelloAttivita: document.getElementById('f-attivita').value,
      obiettivo: document.getElementById('f-obiettivo').value,
      numeroPasti: parseInt(document.getElementById('f-numero-pasti').value, 10) || 5,
      allergie,
      cibiNonGraditi: document.getElementById('f-non-graditi').value.trim(),
      patologie: document.getElementById('f-patologie').value.trim(),
      percentualeGrassa: document.getElementById('f-perc-grassa').value ? parseFloat(document.getElementById('f-perc-grassa').value) : null,
      circonferenze: {
        vita: document.getElementById('f-circ-vita').value ? parseFloat(document.getElementById('f-circ-vita').value) : null,
        fianchi: document.getElementById('f-circ-fianchi').value ? parseFloat(document.getElementById('f-circ-fianchi').value) : null,
        torace: document.getElementById('f-circ-torace').value ? parseFloat(document.getElementById('f-circ-torace').value) : null,
        braccio: document.getElementById('f-circ-braccio').value ? parseFloat(document.getElementById('f-circ-braccio').value) : null
      }
    });
    await Dati.registraPeso(DataUtils.oggiISO(), pesoKg);
    window.App.chiudiFoglio();
    window.App.mostraToast('Profilo salvato.');
    render();
  }

  // ---------------- Peso ----------------
  function renderPeso() {
    const p = Dati.stato().profilo;
    const storico = p.storicoPeso.slice().sort((a, b) => b.data.localeCompare(a.data)).slice(0, 6);
    const c = p.circonferenze || {};
    const misureImpostate = [
      p.percentualeGrassa != null ? `Massa grassa: <strong>${p.percentualeGrassa}%</strong>` : null,
      c.vita != null ? `Vita: <strong>${c.vita} cm</strong>` : null,
      c.fianchi != null ? `Fianchi: <strong>${c.fianchi} cm</strong>` : null,
      c.torace != null ? `Torace: <strong>${c.torace} cm</strong>` : null,
      c.braccio != null ? `Braccio: <strong>${c.braccio} cm</strong>` : null
    ].filter(Boolean);
    return `
      <div class="card">
        <h3>Andamento peso</h3>
        <div class="griglia-2" style="align-items:end;margin-bottom:10px;">
          <div class="stat-box"><div class="stat-num">${p.pesoKg || '—'}</div><div class="stat-lbl">kg attuali</div></div>
          <div class="campo" style="margin-bottom:0;">
            <label>Registra peso di oggi</label>
            <input type="number" id="f-peso-rapido" step="0.1" placeholder="${p.pesoKg || 'kg'}">
          </div>
        </div>
        <button class="btn btn-sm btn-accent btn-block" id="btn-registra-peso">Salva peso di oggi</button>
        ${storico.length ? `
        <div class="divisore-testo">Ultime misurazioni</div>
        ${storico.map(v => `<div class="legenda-riga"><span class="legenda-nome">${DataUtils.formatDataBreve(v.data)}</span><span class="legenda-tempo">${v.peso} kg</span></div>`).join('')}
        ` : ''}
        ${misureImpostate.length ? `
        <div class="divisore-testo">Altre misure</div>
        <div class="elemento-meta">${misureImpostate.join(' · ')}</div>
        ` : ''}
      </div>
    `;
  }

  // ---------------- Target ----------------
  function renderTarget() {
    const p = Dati.stato().profilo;
    const macro = CalcoloDieta.calcolaMacro(p);
    return `
      <div class="card">
        <h3>Target giornaliero indicativo</h3>
        <div class="griglia-3" style="margin-bottom:10px;">
          <div class="stat-box"><div class="stat-num">${macro.targetKcal}</div><div class="stat-lbl">kcal</div></div>
          <div class="stat-box"><div class="stat-num">${macro.proteineG}g</div><div class="stat-lbl">Proteine</div></div>
          <div class="stat-box"><div class="stat-num">${macro.carboidratiG}g</div><div class="stat-lbl">Carboidrati</div></div>
        </div>
        <div class="stat-box" style="margin-bottom:10px;"><div class="stat-num">${macro.grassiG}g</div><div class="stat-lbl">Grassi</div></div>
        <button class="btn btn-sm" id="btn-modifica-profilo">Modifica profilo</button>
      </div>
    `;
  }

  // ---------------- Piano settimanale ----------------
  function renderPiano() {
    const piano = Dati.stato().dietaPiano;
    const haPiano = piano && piano.generatoIl;
    let corpo = '';
    if (haPiano) {
      const pastiGiorno = piano.giorni[giornoSelezionatoPiano] || [];
      const totali = GeneratorePiano.totaliGiorno(pastiGiorno);
      corpo = `
        <div class="giorni-settimana" style="margin-bottom:12px;">
          ${DataUtils.NOMI_GIORNI.map((n, i) => `<button type="button" class="giorno-toggle ${giornoSelezionatoPiano === i+1 ? 'selezionato' : ''}" data-giorno="${i+1}">${n}</button>`).join('')}
        </div>
        <div id="lista-pasti-giorno">${renderListaPasti(pastiGiorno)}</div>
        <div class="elemento-meta" style="margin-top:8px;">Totale giorno: ${totali.kcal} kcal · P ${totali.proteine}g · C ${totali.carboidrati}g · G ${totali.grassi}g</div>
        <div class="riga-btn" style="margin-top:12px;">
          <button class="btn btn-sm" id="btn-aggiungi-pasto">+ Aggiungi pasto</button>
          <button class="btn btn-sm btn-warn" id="btn-rigenera-piano">Rigenera piano</button>
        </div>
      `;
    } else {
      corpo = `
        <div class="vuoto">Nessun piano ancora.</div>
        <button class="btn btn-accent btn-block" id="btn-genera-piano">Genera piano settimanale</button>
      `;
    }
    return `<div class="card"><h3>Piano settimanale</h3>${corpo}</div>`;
  }

  function renderListaPasti(pastiGiorno) {
    if (!pastiGiorno.length) return '<div class="vuoto">Nessun pasto per questo giorno.</div>';
    return pastiGiorno.map((p, indice) => `
      <div class="elemento-riga" data-indice="${indice}">
        <div class="priorita-pill" style="background:var(--accent);font-size:9px;">${DatabaseDieta.ETICHETTE_CATEGORIA[p.categoria] || '—'}</div>
        <div class="elemento-corpo">
          <div class="elemento-titolo">${UiRoutine.escapeHtml(p.nome)}</div>
          <div class="elemento-meta">${p.kcal} kcal · P ${p.proteine}g · C ${p.carboidrati}g · G ${p.grassi}g</div>
        </div>
        <div class="elemento-azioni">
          <button class="icon-btn btn-modifica-pasto" data-indice="${indice}" title="Modifica">✏️</button>
          <button class="icon-btn btn-elimina-pasto" data-indice="${indice}" title="Elimina">🗑️</button>
        </div>
      </div>
    `).join('');
  }

  function apriFormPasto(indiceEsistente) {
    const piano = Dati.stato().dietaPiano;
    const pastiGiorno = piano.giorni[giornoSelezionatoPiano] || [];
    const esistente = indiceEsistente != null ? pastiGiorno[indiceEsistente] : null;
    const pasto = esistente || { nome: '', categoria: 'pranzo', kcal: 0, proteine: 0, carboidrati: 0, grassi: 0 };

    const html = `
      <div class="foglio-header">
        <h2>${esistente ? 'Modifica pasto' : 'Nuovo pasto'}</h2>
        <button class="icon-btn" id="btn-chiudi-foglio">✕</button>
      </div>
      <div class="campo">
        <label>Nome</label>
        <input type="text" id="f-nome-pasto" value="${UiRoutine.escapeHtml(pasto.nome)}" placeholder="Es. piano dato dalla mia nutrizionista...">
      </div>
      <div class="campo">
        <label>Fascia</label>
        <select id="f-categoria-pasto">
          ${DatabaseDieta.CATEGORIE.map(c => `<option value="${c}" ${pasto.categoria===c?'selected':''}>${DatabaseDieta.ETICHETTE_CATEGORIA[c]}</option>`).join('')}
        </select>
      </div>
      <div class="griglia-2">
        <div class="campo"><label>Kcal</label><input type="number" id="f-kcal-pasto" value="${pasto.kcal}"></div>
        <div class="campo"><label>Proteine (g)</label><input type="number" id="f-prot-pasto" value="${pasto.proteine}"></div>
      </div>
      <div class="griglia-2">
        <div class="campo"><label>Carboidrati (g)</label><input type="number" id="f-carb-pasto" value="${pasto.carboidrati}"></div>
        <div class="campo"><label>Grassi (g)</label><input type="number" id="f-grassi-pasto" value="${pasto.grassi}"></div>
      </div>
      <div class="riga-btn" style="margin-top:16px;">
        <button class="btn btn-primary btn-block" id="btn-salva-pasto">Salva</button>
      </div>
    `;
    window.App.apriFoglio(html);
    document.getElementById('btn-chiudi-foglio').addEventListener('click', window.App.chiudiFoglio);
    document.getElementById('btn-salva-pasto').addEventListener('click', () => salvaPasto(indiceEsistente));
  }

  async function salvaPasto(indiceEsistente) {
    const nome = document.getElementById('f-nome-pasto').value.trim();
    if (!nome) { window.App.mostraToast('Dai un nome al pasto.'); return; }
    const kcal = parseInt(document.getElementById('f-kcal-pasto').value, 10) || 0;
    const proteine = parseInt(document.getElementById('f-prot-pasto').value, 10) || 0;
    const carboidrati = parseInt(document.getElementById('f-carb-pasto').value, 10) || 0;
    const grassi = parseInt(document.getElementById('f-grassi-pasto').value, 10) || 0;
    const erroreValidazione = validaValoriPasto(kcal, proteine, carboidrati, grassi);
    if (erroreValidazione) { window.App.mostraToast(erroreValidazione); return; }
    const nuovoPasto = { nome, categoria: document.getElementById('f-categoria-pasto').value, kcal, proteine, carboidrati, grassi };
    const piano = Dati.stato().dietaPiano;
    if (!piano.giorni[giornoSelezionatoPiano]) piano.giorni[giornoSelezionatoPiano] = [];
    if (indiceEsistente != null) piano.giorni[giornoSelezionatoPiano][indiceEsistente] = nuovoPasto;
    else piano.giorni[giornoSelezionatoPiano].push(nuovoPasto);
    await Dati.salvaPianoDieta(piano);
    window.App.chiudiFoglio();
    window.App.mostraToast('Pasto salvato.');
    render();
  }

  async function eliminaPasto(indice) {
    const piano = Dati.stato().dietaPiano;
    piano.giorni[giornoSelezionatoPiano].splice(indice, 1);
    await Dati.salvaPianoDieta(piano);
    render();
  }

  async function generaPiano(conConferma) {
    if (conConferma && !confirm('Questo sostituirà il piano attuale con uno nuovo generato automaticamente. Continuare?')) return;
    const piano = GeneratorePiano.generaPianoSettimanale(Dati.stato().profilo);
    await Dati.salvaPianoDieta(piano);
    window.App.mostraToast('Piano generato.');
    render();
  }

  // ---------------- Log di oggi ----------------
  function renderLogOggi() {
    const oggi = DataUtils.oggiISO();
    const p = Dati.stato().profilo;
    const macro = CalcoloDieta.calcolaMacro(p);
    const log = Dati.stato().dietaLog[oggi] || { pasti: [] };
    const mangiato = log.pasti.reduce((tot, x) => ({
      kcal: tot.kcal + x.kcal, proteine: tot.proteine + x.proteine,
      carboidrati: tot.carboidrati + x.carboidrati, grassi: tot.grassi + x.grassi
    }), { kcal: 0, proteine: 0, carboidrati: 0, grassi: 0 });

    const piano = Dati.stato().dietaPiano;
    const weekdayOggi = DataUtils.weekdayISO(oggi);
    const pastiPianificatiOggi = (piano && piano.giorni[weekdayOggi]) || [];

    const valutazione = CalcoloDieta.valutaGiornata(mangiato, macro);
    return `
      <div class="card">
        <div class="riga-btn" style="justify-content:space-between;align-items:center;">
          <h3 style="margin:0;">Oggi hai mangiato</h3>
          ${valutazione ? `<span class="badge ${valutazione.classe}">${valutazione.etichetta}</span>` : ''}
        </div>
        <div class="griglia-3" style="margin:10px 0;">
          <div class="stat-box"><div class="stat-num">${mangiato.kcal}/${macro.targetKcal}</div><div class="stat-lbl">kcal</div></div>
          <div class="stat-box"><div class="stat-num">${mangiato.proteine}/${macro.proteineG}g</div><div class="stat-lbl">Proteine</div></div>
          <div class="stat-box"><div class="stat-num">${mangiato.carboidrati}/${macro.carboidratiG}g</div><div class="stat-lbl">Carboidrati</div></div>
        </div>
        <div id="lista-log-oggi">${renderListaLog(log.pasti)}</div>
        ${pastiPianificatiOggi.length ? `
        <div class="divisore-testo">Dal piano di oggi</div>
        <div class="riga-btn" style="flex-wrap:wrap;">
          ${pastiPianificatiOggi.map((p, i) => `<button type="button" class="btn btn-sm btn-dal-piano" data-indice="${i}">+ ${UiRoutine.escapeHtml(p.nome)}</button>`).join('')}
        </div>` : ''}
        <div class="riga-btn" style="margin-top:12px;">
          <button class="btn btn-sm btn-accent btn-block" id="btn-pasto-libero">+ Pasto libero (manuale)</button>
        </div>
      </div>
    `;
  }

  function renderListaLog(pasti) {
    if (!pasti.length) return '<div class="vuoto">Non hai ancora segnato nulla oggi.</div>';
    return pasti.map((p, indice) => `
      <div class="elemento-riga" data-indice="${indice}">
        <div class="elemento-corpo">
          <div class="elemento-titolo">${UiRoutine.escapeHtml(p.nome)}</div>
          <div class="elemento-meta">${p.kcal} kcal · P ${p.proteine}g · C ${p.carboidrati}g · G ${p.grassi}g</div>
        </div>
        <div class="elemento-azioni">
          <button class="icon-btn btn-elimina-log" data-indice="${indice}" title="Rimuovi">🗑️</button>
        </div>
      </div>
    `).join('');
  }

  function apriFormPastoLibero() {
    const html = `
      <div class="foglio-header">
        <h2>Pasto libero</h2>
        <button class="icon-btn" id="btn-chiudi-foglio">✕</button>
      </div>
      <div class="campo"><label>Nome</label><input type="text" id="f-nome-libero" placeholder="Cosa hai mangiato"></div>
      <div class="griglia-2">
        <div class="campo"><label>Kcal</label><input type="number" id="f-kcal-libero" value="0"></div>
        <div class="campo"><label>Proteine (g)</label><input type="number" id="f-prot-libero" value="0"></div>
      </div>
      <div class="griglia-2">
        <div class="campo"><label>Carboidrati (g)</label><input type="number" id="f-carb-libero" value="0"></div>
        <div class="campo"><label>Grassi (g)</label><input type="number" id="f-grassi-libero" value="0"></div>
      </div>
      <div class="riga-btn" style="margin-top:16px;"><button class="btn btn-primary btn-block" id="btn-salva-libero">Aggiungi al log di oggi</button></div>
    `;
    window.App.apriFoglio(html);
    document.getElementById('btn-chiudi-foglio').addEventListener('click', window.App.chiudiFoglio);
    document.getElementById('btn-salva-libero').addEventListener('click', async () => {
      const nome = document.getElementById('f-nome-libero').value.trim();
      if (!nome) { window.App.mostraToast('Dai un nome al pasto.'); return; }
      const kcal = parseInt(document.getElementById('f-kcal-libero').value, 10) || 0;
      const proteine = parseInt(document.getElementById('f-prot-libero').value, 10) || 0;
      const carboidrati = parseInt(document.getElementById('f-carb-libero').value, 10) || 0;
      const grassi = parseInt(document.getElementById('f-grassi-libero').value, 10) || 0;
      const erroreValidazione = validaValoriPasto(kcal, proteine, carboidrati, grassi);
      if (erroreValidazione) { window.App.mostraToast(erroreValidazione); return; }
      await Dati.aggiungiPastoLog(DataUtils.oggiISO(), { nome, kcal, proteine, carboidrati, grassi, fonte: 'libero' });
      window.App.chiudiFoglio();
      window.App.mostraToast('Aggiunto al log di oggi.');
      render();
    });
  }

  // ---------------- Render principale + eventi ----------------
  function render() {
    const cont = document.getElementById('dieta-corpo');
    const p = Dati.stato().profilo;

    if (!CalcoloDieta.profiloCompleto(p)) {
      cont.innerHTML = `
        <div class="card">
          <h3>Completa il tuo profilo</h3>
          <div class="elemento-meta" style="margin-bottom:12px;">
            Età, altezza, peso e livello di attività servono per calcolare un
            fabbisogno calorico indicativo e generare un piano di partenza.
          </div>
          <button class="btn btn-accent btn-block" id="btn-crea-profilo">Compila il profilo</button>
        </div>`;
      document.getElementById('btn-crea-profilo').addEventListener('click', apriFormProfilo);
      return;
    }

    cont.innerHTML = renderTarget() + renderPeso() + renderPiano() + renderLogOggi();

    document.getElementById('btn-modifica-profilo').addEventListener('click', apriFormProfilo);

    document.getElementById('btn-registra-peso').addEventListener('click', async () => {
      const val = parseFloat(document.getElementById('f-peso-rapido').value);
      if (!val) { window.App.mostraToast('Inserisci un peso valido.'); return; }
      await Dati.registraPeso(DataUtils.oggiISO(), val);
      window.App.mostraToast('Peso registrato.');
      render();
    });

    const btnGenera = document.getElementById('btn-genera-piano');
    if (btnGenera) btnGenera.addEventListener('click', () => generaPiano(false));
    const btnRigenera = document.getElementById('btn-rigenera-piano');
    if (btnRigenera) btnRigenera.addEventListener('click', () => generaPiano(true));
    const btnAggiungiPasto = document.getElementById('btn-aggiungi-pasto');
    if (btnAggiungiPasto) btnAggiungiPasto.addEventListener('click', () => apriFormPasto(null));

    cont.querySelectorAll('[data-giorno]').forEach(b => b.addEventListener('click', () => {
      giornoSelezionatoPiano = parseInt(b.dataset.giorno, 10);
      render();
    }));
    cont.querySelectorAll('.btn-modifica-pasto').forEach(b => b.addEventListener('click', () => apriFormPasto(parseInt(b.dataset.indice, 10))));
    cont.querySelectorAll('.btn-elimina-pasto').forEach(b => b.addEventListener('click', () => eliminaPasto(parseInt(b.dataset.indice, 10))));

    document.getElementById('btn-pasto-libero').addEventListener('click', apriFormPastoLibero);
    cont.querySelectorAll('.btn-elimina-log').forEach(b => b.addEventListener('click', async () => {
      await Dati.rimuoviPastoLog(DataUtils.oggiISO(), parseInt(b.dataset.indice, 10));
      render();
    }));
    cont.querySelectorAll('.btn-dal-piano').forEach(b => b.addEventListener('click', async () => {
      const piano = Dati.stato().dietaPiano;
      const weekdayOggi = DataUtils.weekdayISO(DataUtils.oggiISO());
      const pasto = piano.giorni[weekdayOggi][parseInt(b.dataset.indice, 10)];
      await Dati.aggiungiPastoLog(DataUtils.oggiISO(), Object.assign({ fonte: 'piano' }, pasto));
      window.App.mostraToast('Aggiunto al log di oggi.');
      render();
    }));
  }

  return { render };
})();

window.UiDieta = UiDieta;
