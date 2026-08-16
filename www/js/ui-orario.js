/**
 * ui-orario.js
 * Orario fisso settimanale (lezioni, turni di lavoro, impegni fissi che si
 * ripetono ogni settimana). Vive dentro la sezione "Fare" insieme a Routine
 * e Task perché concettualmente è la stessa cosa di una routine con un
 * orario preciso — compare anche nella vista "Oggi".
 */
const UiOrario = (function () {
  const ETICHETTE_TIPO_ORARIO = { universita: 'Università', scuola: 'Scuola', lavoro: 'Lavoro', altro: 'Altro' };

  function render() {
    const cont = document.getElementById('orario-corpo');
    const elenco = Dati.stato().orarioFisso.slice().sort((a, b) => a.giorno - b.giorno || a.oraInizio.localeCompare(b.oraInizio));
    cont.innerHTML = `
      <div class="card">
        <h3>Orario fisso settimanale</h3>
        <div class="elemento-meta" style="margin-bottom:10px;">Lezioni, turni di lavoro o impegni fissi che si ripetono ogni settimana — compaiono anche nella vista "Oggi".</div>
        <div class="riga-btn" style="margin-bottom:12px;">
          <button class="btn btn-sm btn-accent" id="btn-nuovo-orario">+ Aggiungi</button>
          <button class="btn btn-sm" id="btn-importa-orario">Importa da JSON</button>
        </div>
        <input type="file" accept="application/json,.json" id="input-import-orario" style="display:none;">
        <div id="lista-orario">${renderLista(elenco)}</div>
      </div>
      <div class="card card-flat">
        <div class="elemento-meta">
          Formato JSON accettato (un array di voci): <br>
          <code style="font-size:11px;">[{"materia":"Analisi Matematica","giorno":"lunedì","oraInizio":"09:00","oraFine":"11:00","aula":"Aula 3","tipo":"universita"}]</code><br>
          "giorno" può essere il nome in italiano o un numero 1-7 (1=lunedì).
        </div>
      </div>
    `;
    wire(cont);
  }

  function renderLista(elenco) {
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

  function apriForm(indiceEsistente) {
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
      window.App.aggiornaOggi();
    });
  }

  function importaDaJSON(testo) {
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

  function wire(cont) {
    document.getElementById('btn-nuovo-orario').addEventListener('click', () => apriForm(null));
    cont.querySelectorAll('.btn-modifica-orario').forEach(b => b.addEventListener('click', () => apriForm(parseInt(b.dataset.indice, 10))));
    cont.querySelectorAll('.btn-elimina-orario').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('Eliminare questo impegno fisso?')) return;
      const elenco = Dati.stato().orarioFisso;
      elenco.splice(parseInt(b.dataset.indice, 10), 1);
      await Dati.salvaOrarioFisso(elenco);
      render();
      window.App.aggiornaOggi();
    }));
    const inputFile = document.getElementById('input-import-orario');
    document.getElementById('btn-importa-orario').addEventListener('click', () => inputFile.click());
    inputFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const risultato = importaDaJSON(String(reader.result));
        if (!risultato.ok) { window.App.mostraToast('Errore: ' + risultato.errore); return; }
        await Dati.salvaOrarioFisso(Dati.stato().orarioFisso);
        window.App.mostraToast(`Importate ${risultato.importati} voci` + (risultato.scartati ? `, ${risultato.scartati} scartate (dati incompleti)` : '') + '.');
        render();
        window.App.aggiornaOggi();
      };
      reader.readAsText(file);
      inputFile.value = '';
    });
  }

  return { render, importaDaJSON };
})();

window.UiOrario = UiOrario;
