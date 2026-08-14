/**
 * ui-journal.js
 * Diario serale: statistiche del giorno (calcolate da ui-oggi.js, riusate
 * qui), 3 campi di riflessione libera, e un voto 1-10 con mezzi punti e +/-
 * in stile pagella italiana. Si può sfogliare avanti/indietro nei giorni.
 */
const UiJournal = (function () {
  let dataCorrente = null; // ISO string della data attualmente mostrata nell'editor

  const MODIFICATORI = [
    { id: 'meno', simbolo: '-', delta: -0.25 },
    { id: 'pieno', simbolo: '', delta: 0 },
    { id: 'piu', simbolo: '+', delta: 0.25 },
    { id: 'mezzo', simbolo: '½', delta: 0.5 }
  ];

  function costruisciVoto(base, modificatoreId) {
    const m = MODIFICATORI.find(x => x.id === modificatoreId) || MODIFICATORI[1];
    return { testo: `${base}${m.simbolo}`, numerico: Math.min(10, base + m.delta) };
  }

  function renderStatisticheGiorno(dataISO) {
    const { completate, totali, percCompletate, percPesata } = UiOggi.calcolaStatistiche(dataISO);
    document.getElementById('diario-statistiche').innerHTML = `
      <div class="griglia-3">
        <div class="stat-box"><div class="stat-num">${completate}/${totali}</div><div class="stat-lbl">Completate</div></div>
        <div class="stat-box"><div class="stat-num">${percCompletate}%</div><div class="stat-lbl">Aderenza</div></div>
        <div class="stat-box"><div class="stat-num">${percPesata}%</div><div class="stat-lbl">Pesata priorità</div></div>
      </div>`;
  }

  function renderIntestazione(dataISO) {
    const oggi = DataUtils.oggiISO();
    document.getElementById('diario-data').textContent = DataUtils.formatDataEstesa(dataISO) + (dataISO === oggi ? ' (oggi)' : '');
    document.getElementById('diario-btn-oggi').style.display = dataISO === oggi ? 'none' : '';
  }

  function renderForm(dataISO) {
    dataCorrente = dataISO;
    renderIntestazione(dataISO);
    renderStatisticheGiorno(dataISO);

    const voce = Dati.stato().journal[dataISO] || { fattoBene: '', daMigliorare: '', obiettivoDomani: '', voto: '7', votoNumerico: 7, votoBase: 7, votoModificatore: 'pieno' };
    const cont = document.getElementById('diario-form');
    cont.innerHTML = `
      <div class="campo">
        <label>Cosa ho fatto bene oggi</label>
        <textarea id="f-fatto-bene" placeholder="Anche una cosa piccola va bene.">${UiRoutine.escapeHtml(voce.fattoBene || '')}</textarea>
      </div>
      <div class="campo">
        <label>Cosa posso migliorare</label>
        <textarea id="f-da-migliorare">${UiRoutine.escapeHtml(voce.daMigliorare || '')}</textarea>
      </div>
      <div class="campo">
        <label>Obiettivo di domani</label>
        <textarea id="f-obiettivo-domani">${UiRoutine.escapeHtml(voce.obiettivoDomani || '')}</textarea>
      </div>
      <div class="campo">
        <label>Voto alla giornata: <span class="priorita-valore" id="voto-anteprima">${voce.voto || '7'}</span></label>
        <input type="range" class="slider-priorita" id="f-voto-base" min="1" max="10" value="${voce.votoBase || 7}">
        <div class="giorni-settimana" style="margin-top:8px;">
          ${MODIFICATORI.map(m => `<button type="button" class="giorno-toggle ${(voce.votoModificatore || 'pieno') === m.id ? 'selezionato' : ''}" data-mod="${m.id}" style="width:auto;padding:0 12px;">${m.simbolo || '='}</button>`).join('')}
        </div>
      </div>
      <div class="riga-btn" style="margin-top:16px;">
        <button class="btn btn-primary btn-block" id="btn-salva-diario">Salva voce del diario</button>
      </div>
    `;

    let modificatoreSelezionato = voce.votoModificatore || 'pieno';
    function aggiornaAnteprima() {
      const base = parseInt(document.getElementById('f-voto-base').value, 10);
      document.getElementById('voto-anteprima').textContent = costruisciVoto(base, modificatoreSelezionato).testo;
    }
    document.getElementById('f-voto-base').addEventListener('input', aggiornaAnteprima);
    cont.querySelectorAll('[data-mod]').forEach(b => {
      b.addEventListener('click', () => {
        cont.querySelectorAll('[data-mod]').forEach(x => x.classList.remove('selezionato'));
        b.classList.add('selezionato');
        modificatoreSelezionato = b.dataset.mod;
        aggiornaAnteprima();
      });
    });

    document.getElementById('btn-salva-diario').addEventListener('click', async () => {
      const base = parseInt(document.getElementById('f-voto-base').value, 10);
      const votoCalcolato = costruisciVoto(base, modificatoreSelezionato);
      await Dati.salvaVoceDiario(dataISO, {
        fattoBene: document.getElementById('f-fatto-bene').value.trim(),
        daMigliorare: document.getElementById('f-da-migliorare').value.trim(),
        obiettivoDomani: document.getElementById('f-obiettivo-domani').value.trim(),
        voto: votoCalcolato.testo,
        votoNumerico: votoCalcolato.numerico,
        votoBase: base,
        votoModificatore: modificatoreSelezionato
      });
      window.App.mostraToast('Voce del diario salvata.');
      renderStorico();
    });
  }

  function renderStorico() {
    const cont = document.getElementById('diario-storico');
    const voci = Object.entries(Dati.stato().journal).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 14);
    if (!voci.length) {
      cont.innerHTML = '<div class="vuoto">Nessuna voce ancora. Scrivi quella di oggi qui sopra, stasera.</div>';
      return;
    }
    cont.innerHTML = voci.map(([data, voce]) => `
      <div class="elemento-riga" data-data="${data}" style="cursor:pointer;">
        <div class="priorita-pill" style="background:var(--accent);">${UiRoutine.escapeHtml(voce.voto || '—')}</div>
        <div class="elemento-corpo">
          <div class="elemento-titolo">${DataUtils.formatDataBreve(data)}</div>
          <div class="elemento-meta">${UiRoutine.escapeHtml((voce.fattoBene || '').slice(0, 60)) || 'Nessuna nota su cosa è andato bene'}</div>
        </div>
      </div>
    `).join('');
    cont.querySelectorAll('[data-data]').forEach(el => {
      el.addEventListener('click', () => renderForm(el.dataset.data));
    });
  }

  function vaiA(dataISO) {
    renderForm(dataISO);
  }

  function inizializza() {
    document.getElementById('diario-prev').addEventListener('click', () => vaiA(DataUtils.addGiorni(dataCorrente, -1)));
    document.getElementById('diario-next').addEventListener('click', () => vaiA(DataUtils.addGiorni(dataCorrente, 1)));
    document.getElementById('diario-btn-oggi').addEventListener('click', () => vaiA(DataUtils.oggiISO()));
    renderForm(DataUtils.oggiISO());
    renderStorico();
  }

  return { inizializza, renderForm: vaiA, renderStorico };
})();

window.UiJournal = UiJournal;
