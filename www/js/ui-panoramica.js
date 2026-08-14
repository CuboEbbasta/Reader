/**
 * ui-panoramica.js
 * Raggruppa le viste "oltre il giorno": orario fisso (lezioni/lavoro),
 * vista mese (calendario + torta), vista anno (periodi + torta), storico/recap.
 */
const UiPanoramica = (function () {
  let sottoVista = 'mese'; // 'mese' | 'anno' | 'storico' | 'orario'
  let meseVisualizzato = DataUtils.primoGiornoMese(DataUtils.oggiISO());
  let recapPeriodo = 'settimana'; // 'settimana' | 'mese'

  const COLORI_TIPO_PERIODO = { esami: '#B24F3C', studio: '#B8863E', lavoro: '#2F7D6E', altro: '#5B6BB0' };
  const ETICHETTE_TIPO_PERIODO = { esami: 'Esami', studio: 'Studio', lavoro: 'Lavoro', altro: 'Altro' };
  const ETICHETTE_TIPO_ORARIO = { universita: 'Università', scuola: 'Scuola', lavoro: 'Lavoro', altro: 'Altro' };

  function renderSottoNav() {
    const opzioni = [['mese', 'Mese'], ['anno', 'Anno'], ['storico', 'Storico'], ['orario', 'Orario fisso']];
    return `<div class="riga-btn" id="panoramica-subnav" style="margin-bottom:14px;">
      ${opzioni.map(([v, l]) => `<button type="button" class="btn btn-sm ${sottoVista === v ? 'btn-primary' : ''}" data-sv="${v}">${l}</button>`).join('')}
    </div>`;
  }

  // =================================================================
  // MESE
  // =================================================================
  function coloreAderenza(perc) {
    if (perc == null) return 'var(--surface-alt)';
    if (perc >= 75) return 'var(--ok)';
    if (perc >= 40) return 'var(--accent)';
    return 'var(--warn)';
  }

  function renderMese() {
    const oggi = DataUtils.oggiISO();
    const giorni = DataUtils.giorniDelMese(meseVisualizzato);
    const primoGiorno = giorni[0];
    const offsetIniziale = DataUtils.weekdayISO(primoGiorno) - 1; // 0 = lunedì

    let celle = '';
    for (let i = 0; i < offsetIniziale; i++) celle += '<div></div>';
    giorni.forEach(g => {
      const isFuturo = g > oggi;
      const stats = isFuturo ? null : UiOggi.calcolaStatistiche(g);
      const haOrario = Dati.stato().orarioFisso.some(o => o.giorno === DataUtils.weekdayISO(g));
      const colore = isFuturo ? 'var(--surface-alt)' : coloreAderenza(stats && stats.totali ? stats.percCompletate : null);
      const isOggi = g === oggi;
      celle += `
        <div style="aspect-ratio:1;border-radius:8px;background:${colore};display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:11px;font-family:var(--font-mono);color:${isFuturo?'var(--ink-faint)':'#fff'};${isOggi?'box-shadow:0 0 0 2px var(--ink) inset;':''}position:relative;">
          ${parseInt(g.slice(-2), 10)}
          ${haOrario ? '<span style="position:absolute;bottom:2px;width:4px;height:4px;border-radius:50%;background:currentColor;opacity:0.8;"></span>' : ''}
        </div>`;
    });

    const minutiPerRoutine = {};
    giorni.filter(g => g <= oggi).forEach(g => {
      const log = Dati.stato().log[g];
      if (!log) return;
      Dati.stato().routine.forEach(r => {
        if (log.completamenti[`routine:${r.id}`] === true) {
          minutiPerRoutine[r.nome] = (minutiPerRoutine[r.nome] || 0) + r.durataMinuti;
        }
      });
    });
    const fetteMese = Object.entries(minutiPerRoutine).map(([nome, min], i) => ({
      nome, valore: min, colore: UiRoutine.coloreDaPriorita(((i * 3) % 9) + 1)
    }));

    return `
      ${renderSottoNav()}
      <div class="card">
        <div class="riga-btn" style="justify-content:space-between;align-items:center;margin-bottom:10px;">
          <button class="btn btn-sm" id="btn-mese-prev">←</button>
          <strong>${DataUtils.nomeMeseAnno(meseVisualizzato)}</strong>
          <button class="btn btn-sm" id="btn-mese-next">→</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:6px;">
          ${DataUtils.NOMI_GIORNI.map(n => `<div style="text-align:center;font-size:10px;color:var(--ink-faint);font-family:var(--font-mono);">${n}</div>`).join('')}
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;">${celle}</div>
        <div class="elemento-meta" style="margin-top:10px;">Colore = aderenza del giorno (verde alta, ambra media, rosso bassa). Il punto = c'è un orario fisso quel giorno.</div>
      </div>
      <div class="card">
        <h3>Come hai speso il tempo questo mese</h3>
        ${fetteMese.length ? `
        <div class="quadrante-wrap"><div>${Quadrante.renderTortaGenerica(fetteMese, 220)}</div></div>
        <div class="quadrante-legenda">
          ${fetteMese.map(f => `<div class="legenda-riga"><span class="legenda-swatch" style="background:${f.colore}"></span><span class="legenda-nome">${UiRoutine.escapeHtml(f.nome)}</span><span class="legenda-tempo">${(f.valore/60).toFixed(1)} h</span></div>`).join('')}
        </div>` : '<div class="vuoto">Ancora nessuna routine completata questo mese.</div>'}
      </div>
    `;
  }

  function wireMese(cont) {
    document.getElementById('btn-mese-prev').addEventListener('click', () => { meseVisualizzato = DataUtils.meseSuccessivo(meseVisualizzato, -1); render(); });
    document.getElementById('btn-mese-next').addEventListener('click', () => { meseVisualizzato = DataUtils.meseSuccessivo(meseVisualizzato, 1); render(); });
  }

  // =================================================================
  // ANNO (12 mesi)
  // =================================================================
  function periodoDelGiorno(dataISO) {
    return Dati.stato().periodiAnno.find(p => dataISO >= p.dataInizio && dataISO <= p.dataFine);
  }

  function renderAnno() {
    const oggi = DataUtils.oggiISO();
    const anno = DataUtils.isoToData(oggi).getFullYear();
    const periodi = Dati.stato().periodiAnno.slice().sort((a, b) => a.dataInizio.localeCompare(b.dataInizio));

    const meseBlocchi = DataUtils.NOMI_MESI.map((nomeMese, i) => {
      const isoMese = `${anno}-${DataUtils.pad2(i + 1)}-01`;
      const coperti = periodi.filter(p => p.dataInizio <= DataUtils.fineMese(isoMese) && p.dataFine >= isoMese);
      return `
        <div class="card-flat" style="padding:8px 10px;">
          <div style="font-size:11px;font-weight:700;color:var(--ink-soft);text-transform:uppercase;">${nomeMese.slice(0,3)}</div>
          ${coperti.length ? coperti.map(p => `<div class="badge" style="background:${COLORI_TIPO_PERIODO[p.tipo]}22;color:${COLORI_TIPO_PERIODO[p.tipo]};margin-top:4px;display:block;width:fit-content;">${UiRoutine.escapeHtml(p.titolo)}</div>`).join('') : ''}
        </div>`;
    }).join('');

    const inizioAnno = `${anno}-01-01`, fineAnno = `${anno}-12-31`;
    const conteggi = { esami: 0, studio: 0, lavoro: 0, altro: 0, libero: 0 };
    let cursore = inizioAnno;
    while (cursore <= fineAnno) {
      const p = periodoDelGiorno(cursore);
      conteggi[p ? p.tipo : 'libero']++;
      cursore = DataUtils.addGiorni(cursore, 1);
    }
    const fetteAnno = Object.entries(conteggi).filter(([, v]) => v > 0).map(([tipo, v]) => ({
      nome: tipo === 'libero' ? 'Nessun periodo' : ETICHETTE_TIPO_PERIODO[tipo],
      valore: v, colore: tipo === 'libero' ? Quadrante.COLORE_LIBERO : COLORI_TIPO_PERIODO[tipo]
    }));

    return `
      ${renderSottoNav()}
      <div class="card">
        <h3>Periodi dell'anno ${anno}</h3>
        <div class="elemento-meta" style="margin-bottom:10px;">Utile per segnare sessioni d'esame, periodi di studio intenso o di lavoro.</div>
        <button class="btn btn-sm btn-accent btn-block" id="btn-nuovo-periodo" style="margin-bottom:12px;">+ Nuovo periodo</button>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">${meseBlocchi}</div>
      </div>
      <div class="card">
        <h3>Elenco periodi</h3>
        <div id="lista-periodi">${renderListaPeriodi(periodi)}</div>
      </div>
      <div class="card">
        <h3>Com'è andato l'anno</h3>
        <div class="quadrante-wrap"><div>${Quadrante.renderTortaGenerica(fetteAnno, 220)}</div></div>
        <div class="quadrante-legenda">
          ${fetteAnno.map(f => `<div class="legenda-riga"><span class="legenda-swatch" style="background:${f.colore}"></span><span class="legenda-nome">${f.nome}</span><span class="legenda-tempo">${f.valore} gg</span></div>`).join('')}
        </div>
      </div>
    `;
  }

  function renderListaPeriodi(periodi) {
    if (!periodi.length) return '<div class="vuoto">Nessun periodo ancora.</div>';
    return periodi.map((p) => {
      const indice = Dati.stato().periodiAnno.indexOf(p);
      return `
      <div class="elemento-riga" data-indice="${indice}">
        <div class="priorita-pill" style="background:${COLORI_TIPO_PERIODO[p.tipo]};font-size:9px;">${ETICHETTE_TIPO_PERIODO[p.tipo].slice(0,3)}</div>
        <div class="elemento-corpo">
          <div class="elemento-titolo">${UiRoutine.escapeHtml(p.titolo)}</div>
          <div class="elemento-meta">${DataUtils.formatDataBreve(p.dataInizio)} → ${DataUtils.formatDataBreve(p.dataFine)}</div>
        </div>
        <div class="elemento-azioni">
          <button class="icon-btn btn-modifica-periodo" data-indice="${indice}">✏️</button>
          <button class="icon-btn btn-elimina-periodo" data-indice="${indice}">🗑️</button>
        </div>
      </div>`;
    }).join('');
  }

  function apriFormPeriodo(indiceEsistente) {
    const esistente = indiceEsistente != null ? Dati.stato().periodiAnno[indiceEsistente] : null;
    const p = esistente || { titolo: '', tipo: 'studio', dataInizio: DataUtils.oggiISO(), dataFine: DataUtils.addGiorni(DataUtils.oggiISO(), 7), note: '' };
    const html = `
      <div class="foglio-header"><h2>${esistente ? 'Modifica periodo' : 'Nuovo periodo'}</h2><button class="icon-btn" id="btn-chiudi-foglio">✕</button></div>
      <div class="campo"><label>Titolo</label><input type="text" id="f-titolo-periodo" value="${UiRoutine.escapeHtml(p.titolo)}" placeholder="Es. Sessione esami estiva"></div>
      <div class="campo"><label>Tipo</label>
        <select id="f-tipo-periodo">${Object.keys(ETICHETTE_TIPO_PERIODO).map(k => `<option value="${k}" ${p.tipo===k?'selected':''}>${ETICHETTE_TIPO_PERIODO[k]}</option>`).join('')}</select>
      </div>
      <div class="griglia-2">
        <div class="campo"><label>Dal</label><input type="date" id="f-inizio-periodo" value="${p.dataInizio}"></div>
        <div class="campo"><label>Al</label><input type="date" id="f-fine-periodo" value="${p.dataFine}"></div>
      </div>
      <div class="riga-btn" style="margin-top:16px;"><button class="btn btn-primary btn-block" id="btn-salva-periodo">Salva</button></div>
    `;
    window.App.apriFoglio(html);
    document.getElementById('btn-chiudi-foglio').addEventListener('click', window.App.chiudiFoglio);
    document.getElementById('btn-salva-periodo').addEventListener('click', async () => {
      const titolo = document.getElementById('f-titolo-periodo').value.trim();
      if (!titolo) { window.App.mostraToast('Dai un titolo al periodo.'); return; }
      const nuovo = {
        id: esistente ? p.id : Dati.generaId('periodo'),
        titolo, tipo: document.getElementById('f-tipo-periodo').value,
        dataInizio: document.getElementById('f-inizio-periodo').value,
        dataFine: document.getElementById('f-fine-periodo').value,
        note: ''
      };
      const elenco = Dati.stato().periodiAnno;
      if (indiceEsistente != null) elenco[indiceEsistente] = nuovo; else elenco.push(nuovo);
      await Dati.salvaPeriodiAnno(elenco);
      window.App.chiudiFoglio();
      window.App.mostraToast('Periodo salvato.');
      render();
    });
  }

  function wireAnno(cont) {
    document.getElementById('btn-nuovo-periodo').addEventListener('click', () => apriFormPeriodo(null));
    cont.querySelectorAll('.btn-modifica-periodo').forEach(b => b.addEventListener('click', () => apriFormPeriodo(parseInt(b.dataset.indice, 10))));
    cont.querySelectorAll('.btn-elimina-periodo').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('Eliminare questo periodo?')) return;
      const elenco = Dati.stato().periodiAnno;
      elenco.splice(parseInt(b.dataset.indice, 10), 1);
      await Dati.salvaPeriodiAnno(elenco);
      render();
    }));
  }

  // =================================================================
  // STORICO / RECAP
  // =================================================================
  function rigaConfronto(etichetta, corrente, precedente, unita, invertiMiglioramento) {
    unita = unita || '';
    if (corrente == null) return `<div class="legenda-riga"><span class="legenda-nome">${etichetta}</span><span class="legenda-tempo">— dati insufficienti</span></div>`;
    let delta = '';
    if (precedente != null) {
      const diff = Math.round((corrente - precedente) * 100) / 100;
      const migliora = invertiMiglioramento ? diff < 0 : diff > 0;
      const colore = diff === 0 ? 'var(--ink-faint)' : (migliora ? 'var(--ok)' : 'var(--warn)');
      const segno = diff > 0 ? '+' : '';
      delta = ` <span style="color:${colore};font-family:var(--font-mono);font-size:12px;">(${segno}${diff}${unita})</span>`;
    }
    return `<div class="legenda-riga"><span class="legenda-nome">${etichetta}</span><span class="legenda-tempo">${corrente}${unita}${delta}</span></div>`;
  }

  function renderStorico() {
    const recap = recapPeriodo === 'settimana' ? CalcoloRecap.recapSettimanale() : CalcoloRecap.recapMensile();
    const { corrente, precedente } = recap;
    return `
      ${renderSottoNav()}
      <div class="card">
        <div class="riga-btn" style="margin-bottom:12px;">
          <button class="btn btn-sm ${recapPeriodo === 'settimana' ? 'btn-primary' : ''}" data-rp="settimana">Ultimi 7 giorni</button>
          <button class="btn btn-sm ${recapPeriodo === 'mese' ? 'btn-primary' : ''}" data-rp="mese">Ultimi 30 giorni</button>
        </div>
        <div class="elemento-meta" style="margin-bottom:10px;">Dal ${DataUtils.formatDataBreve(corrente.dataInizio)} al ${DataUtils.formatDataBreve(corrente.dataFine)}, confrontato col periodo immediatamente precedente. ${corrente.giorniViaggio ? `(${corrente.giorniViaggio} giorno/i "viaggio" escluso/i dalle medie)` : ''}</div>
        ${rigaConfronto('Aderenza media', corrente.aderenzaMedia, precedente.aderenzaMedia, '%')}
        ${rigaConfronto('Pesata per priorità', corrente.pesataMedia, precedente.pesataMedia, '%')}
        ${rigaConfronto('Voto medio diario', corrente.votoMedio, precedente.votoMedio, '')}
        ${rigaConfronto('Peso', corrente.variazionePeso, null, ' kg', true)}
        <div class="legenda-riga"><span class="legenda-nome">Task completate</span><span class="legenda-tempo">${corrente.taskCompletate}/${corrente.taskTotali}</span></div>
      </div>
    `;
  }

  function wireStorico(cont) {
    cont.querySelectorAll('[data-rp]').forEach(b => b.addEventListener('click', () => { recapPeriodo = b.dataset.rp; render(); }));
  }

  // =================================================================
  // ORARIO FISSO
  // =================================================================
  function renderOrario() {
    const elenco = Dati.stato().orarioFisso.slice().sort((a, b) => a.giorno - b.giorno || a.oraInizio.localeCompare(b.oraInizio));
    return `
      ${renderSottoNav()}
      <div class="card">
        <h3>Orario fisso settimanale</h3>
        <div class="elemento-meta" style="margin-bottom:10px;">Lezioni, turni di lavoro o impegni fissi che si ripetono ogni settimana — compaiono anche nella vista "Oggi".</div>
        <div class="riga-btn" style="margin-bottom:12px;">
          <button class="btn btn-sm btn-accent" id="btn-nuovo-orario">+ Aggiungi</button>
          <button class="btn btn-sm" id="btn-importa-orario">Importa da JSON</button>
        </div>
        <input type="file" accept="application/json,.json" id="input-import-orario" style="display:none;">
        <div id="lista-orario">${renderListaOrario(elenco)}</div>
      </div>
      <div class="card card-flat">
        <div class="elemento-meta">
          Formato JSON accettato (un array di voci): <br>
          <code style="font-size:11px;">[{"materia":"Analisi Matematica","giorno":"lunedì","oraInizio":"09:00","oraFine":"11:00","aula":"Aula 3","tipo":"universita"}]</code><br>
          "giorno" può essere il nome in italiano o un numero 1-7 (1=lunedì).
        </div>
      </div>
    `;
  }

  function renderListaOrario(elenco) {
    if (!elenco.length) return '<div class="vuoto">Nessun orario fisso ancora.</div>';
    return elenco.map((o) => {
      const indice = Dati.stato().orarioFisso.indexOf(o);
      return `
      <div class="elemento-riga" data-indice="${indice}">
        <div class="elemento-corpo">
          <div class="elemento-titolo">${UiRoutine.escapeHtml(o.materia)}</div>
          <div class="elemento-meta">${DataUtils.NOMI_GIORNI_ESTESI[o.giorno - 1]} · ${o.oraInizio}-${o.oraFine}${o.aula ? ' · ' + UiRoutine.escapeHtml(o.aula) : ''} · ${ETICHETTE_TIPO_ORARIO[o.tipo] || o.tipo}</div>
        </div>
        <div class="elemento-azioni">
          <button class="icon-btn btn-modifica-orario" data-indice="${indice}">✏️</button>
          <button class="icon-btn btn-elimina-orario" data-indice="${indice}">🗑️</button>
        </div>
      </div>`;
    }).join('');
  }

  function apriFormOrario(indiceEsistente) {
    const esistente = indiceEsistente != null ? Dati.stato().orarioFisso[indiceEsistente] : null;
    const o = esistente || { materia: '', tipo: 'universita', giorno: 1, oraInizio: '09:00', oraFine: '11:00', aula: '', note: '' };
    const html = `
      <div class="foglio-header"><h2>${esistente ? 'Modifica' : 'Nuovo'} impegno fisso</h2><button class="icon-btn" id="btn-chiudi-foglio">✕</button></div>
      <div class="campo"><label>Materia / attività</label><input type="text" id="f-materia-orario" value="${UiRoutine.escapeHtml(o.materia)}" placeholder="Es. Analisi Matematica"></div>
      <div class="griglia-2">
        <div class="campo"><label>Tipo</label>
          <select id="f-tipo-orario">${Object.keys(ETICHETTE_TIPO_ORARIO).map(k => `<option value="${k}" ${o.tipo===k?'selected':''}>${ETICHETTE_TIPO_ORARIO[k]}</option>`).join('')}</select>
        </div>
        <div class="campo"><label>Giorno</label>
          <select id="f-giorno-orario">${DataUtils.NOMI_GIORNI_ESTESI.map((n, i) => `<option value="${i+1}" ${o.giorno===i+1?'selected':''}>${n}</option>`).join('')}</select>
        </div>
      </div>
      <div class="griglia-2">
        <div class="campo"><label>Ora inizio</label><input type="time" id="f-inizio-orario" value="${o.oraInizio}"></div>
        <div class="campo"><label>Ora fine</label><input type="time" id="f-fine-orario" value="${o.oraFine}"></div>
      </div>
      <div class="campo"><label>Aula / luogo (facoltativo)</label><input type="text" id="f-aula-orario" value="${UiRoutine.escapeHtml(o.aula || '')}"></div>
      <div class="riga-btn" style="margin-top:16px;"><button class="btn btn-primary btn-block" id="btn-salva-orario">Salva</button></div>
    `;
    window.App.apriFoglio(html);
    document.getElementById('btn-chiudi-foglio').addEventListener('click', window.App.chiudiFoglio);
    document.getElementById('btn-salva-orario').addEventListener('click', async () => {
      const materia = document.getElementById('f-materia-orario').value.trim();
      if (!materia) { window.App.mostraToast('Dai un nome alla materia/attività.'); return; }
      const nuovo = {
        id: esistente ? o.id : Dati.generaId('orario'),
        materia, tipo: document.getElementById('f-tipo-orario').value,
        giorno: parseInt(document.getElementById('f-giorno-orario').value, 10),
        oraInizio: document.getElementById('f-inizio-orario').value,
        oraFine: document.getElementById('f-fine-orario').value,
        aula: document.getElementById('f-aula-orario').value.trim(), note: ''
      };
      const elenco = Dati.stato().orarioFisso;
      if (indiceEsistente != null) elenco[indiceEsistente] = nuovo; else elenco.push(nuovo);
      await Dati.salvaOrarioFisso(elenco);
      window.App.chiudiFoglio();
      window.App.mostraToast('Salvato.');
      render();
    });
  }

  function importaOrarioDaJSON(testo) {
    let dati;
    try { dati = JSON.parse(testo); } catch (e) { return { ok: false, errore: 'File JSON non valido.' }; }
    if (!Array.isArray(dati)) return { ok: false, errore: 'Il file deve contenere un array di voci.' };
    const elenco = Dati.stato().orarioFisso;
    let importati = 0, scartati = 0;
    dati.forEach(v => {
      const giorno = DataUtils.giornoDaTesto(v.giorno);
      if (!v.materia || !giorno || !v.oraInizio || !v.oraFine) { scartati++; return; }
      elenco.push({
        id: Dati.generaId('orario'), materia: v.materia, tipo: v.tipo || 'altro',
        giorno, oraInizio: v.oraInizio, oraFine: v.oraFine, aula: v.aula || '', note: v.note || ''
      });
      importati++;
    });
    return { ok: true, importati, scartati };
  }

  function wireOrario(cont) {
    document.getElementById('btn-nuovo-orario').addEventListener('click', () => apriFormOrario(null));
    cont.querySelectorAll('.btn-modifica-orario').forEach(b => b.addEventListener('click', () => apriFormOrario(parseInt(b.dataset.indice, 10))));
    cont.querySelectorAll('.btn-elimina-orario').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('Eliminare questo impegno fisso?')) return;
      const elenco = Dati.stato().orarioFisso;
      elenco.splice(parseInt(b.dataset.indice, 10), 1);
      await Dati.salvaOrarioFisso(elenco);
      render();
    }));
    const inputFile = document.getElementById('input-import-orario');
    document.getElementById('btn-importa-orario').addEventListener('click', () => inputFile.click());
    inputFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const risultato = importaOrarioDaJSON(String(reader.result));
        if (!risultato.ok) { window.App.mostraToast('Errore: ' + risultato.errore); return; }
        await Dati.salvaOrarioFisso(Dati.stato().orarioFisso);
        window.App.mostraToast(`Importate ${risultato.importati} voci` + (risultato.scartati ? `, ${risultato.scartati} scartate (dati incompleti)` : '') + '.');
        render();
      };
      reader.readAsText(file);
      inputFile.value = '';
    });
  }

  // =================================================================
  function render() {
    const cont = document.getElementById('panoramica-corpo');
    if (sottoVista === 'mese') { cont.innerHTML = renderMese(); wireSubnav(cont); wireMese(cont); }
    else if (sottoVista === 'anno') { cont.innerHTML = renderAnno(); wireSubnav(cont); wireAnno(cont); }
    else if (sottoVista === 'storico') { cont.innerHTML = renderStorico(); wireSubnav(cont); wireStorico(cont); }
    else { cont.innerHTML = renderOrario(); wireSubnav(cont); wireOrario(cont); }
  }

  function wireSubnav(cont) {
    cont.querySelectorAll('#panoramica-subnav [data-sv]').forEach(b => b.addEventListener('click', () => { sottoVista = b.dataset.sv; render(); }));
  }

  return { render, importaOrarioDaJSON };
})();

window.UiPanoramica = UiPanoramica;
