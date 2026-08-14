/**
 * ui-workout.js
 * Due schede fisse (Veloce senza attrezzi, Completa con sbarra) sempre
 * uguali, più una scheda Adattiva generata sui giorni disponibili a
 * settimana. Tutte mostrate come tabella leggibile. In fondo, si registra
 * quale scheda è stata fatta ogni giorno, per avere lo storico.
 */
const UiWorkout = (function () {
  let giornoSelezionatoAdattiva = 0; // indice nel array della scheda adattiva

  function obiettivoCorrente() {
    return (Dati.stato().profilo && Dati.stato().profilo.obiettivo) || 'mantenimento';
  }

  function renderTabellaEsercizi(esercizi) {
    if (!esercizi.length) return '<div class="vuoto">Nessun esercizio.</div>';
    return `
      <table class="tabella-scheda">
        <thead><tr><th>Esercizio</th><th>Serie</th><th>Rip.</th><th>Recupero</th></tr></thead>
        <tbody>
          ${esercizi.map(e => `
            <tr>
              <td class="col-esercizio">${UiRoutine.escapeHtml(e.nome)}${e.richiedeSbarra ? ' <span class="badge badge-accent">sbarra</span>' : ''}</td>
              <td>${e.serie}</td>
              <td>${e.ripetizioni}</td>
              <td>${e.recupero}s</td>
            </tr>`).join('')}
        </tbody>
      </table>
      ${esercizi.some(e => e.nota) ? `<div class="elemento-meta" style="margin-top:8px;">${esercizi.find(e => e.nota).nota}</div>` : ''}
    `;
  }

  // ---------------- Impostazioni allenamento ----------------
  function renderImpostazioni() {
    const pw = Dati.stato().profiloWorkout;
    return `
      <div class="card">
        <h3>Le tue impostazioni</h3>
        <div class="griglia-2">
          <div class="campo" style="margin-bottom:0;">
            <label>Livello</label>
            <select id="f-livello-workout">
              ${Object.keys(CalcoloWorkout.ETICHETTE_LIVELLO).map(k => `<option value="${k}" ${pw.livello===k?'selected':''}>${CalcoloWorkout.ETICHETTE_LIVELLO[k]}</option>`).join('')}
            </select>
          </div>
          <div class="campo" style="margin-bottom:0;">
            <label>Giorni disponibili/sett.</label>
            <input type="number" id="f-giorni-workout" min="1" max="7" value="${pw.giorniDisponibili}">
          </div>
        </div>
        <button class="btn btn-sm btn-accent btn-block" id="btn-salva-impostazioni-workout" style="margin-top:12px;">Salva</button>
        <div class="elemento-meta" style="margin-top:8px;">
          L'obiettivo fisico usato per calibrare le schede è quello impostato nel
          profilo Dieta (${CalcoloDieta.ETICHETTE_OBIETTIVO[obiettivoCorrente()]}) — così non te lo richiediamo due volte.
        </div>
      </div>
    `;
  }

  // ---------------- Schede fisse ----------------
  function renderSchedaFissa(titolo, idsEsercizi, tipo, sottotitolo) {
    const esercizi = CalcoloWorkout.costruisciScheda(idsEsercizi, obiettivoCorrente(), Dati.stato().profiloWorkout.livello);
    return `
      <div class="card">
        <h3>${titolo}</h3>
        <div class="elemento-meta">${sottotitolo}</div>
        ${renderTabellaEsercizi(esercizi)}
        <button class="btn btn-sm btn-ok" data-registra-tipo="${tipo}" data-registra-etichetta="${titolo}" style="margin-top:10px;">✅ Ho fatto questa oggi</button>
      </div>
    `;
  }

  // ---------------- Scheda adattiva ----------------
  function renderSchedaAdattiva() {
    const scheda = Dati.stato().schedaAdattiva;
    const haScheda = scheda && scheda.generataIl && scheda.giorni.length;
    let corpo;
    if (haScheda) {
      if (giornoSelezionatoAdattiva >= scheda.giorni.length) giornoSelezionatoAdattiva = 0;
      const giornoCorrente = scheda.giorni[giornoSelezionatoAdattiva];
      corpo = `
        <div class="giorni-settimana" style="margin-bottom:10px;">
          ${scheda.giorni.map((g, i) => `<button type="button" class="giorno-toggle ${giornoSelezionatoAdattiva === i ? 'selezionato' : ''}" data-giorno-adattiva="${i}" style="width:auto;padding:0 10px;">${i+1}</button>`).join('')}
        </div>
        <div class="elemento-meta" style="margin-bottom:4px;"><strong>${giornoCorrente.etichetta}</strong></div>
        ${renderTabellaEsercizi(giornoCorrente.esercizi)}
        <div class="riga-btn" style="margin-top:12px;">
          <button class="btn btn-sm btn-ok" data-registra-tipo="adattiva" data-registra-etichetta="${giornoCorrente.etichetta}" data-registra-indice="${giornoSelezionatoAdattiva}">✅ Ho fatto questa oggi</button>
          <button class="btn btn-sm btn-warn" id="btn-rigenera-adattiva">Rigenera</button>
        </div>
      `;
    } else {
      corpo = `
        <div class="vuoto">Nessuna scheda adattiva ancora.</div>
        <button class="btn btn-accent btn-block" id="btn-genera-adattiva">Genera scheda adattiva</button>
      `;
    }
    return `
      <div class="card">
        <h3>Scheda adattiva (${Dati.stato().profiloWorkout.giorniDisponibili} giorni/sett.)</h3>
        <div class="elemento-meta" style="margin-bottom:10px;">
          Differenza rispetto alle schede fisse: l'allenamento è diviso sui
          giorni che hai indicato, alternando gruppi muscolari, così ti alleni
          più spesso con meno volume per sessione invece di un'unica seduta.
        </div>
        ${corpo}
      </div>
    `;
  }

  // ---------------- Log di oggi + storico ----------------
  function renderLog() {
    const oggi = DataUtils.oggiISO();
    const log = Dati.stato().workoutLog;
    const voceOggi = log[oggi];
    const storico = Object.entries(log).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 7);
    return `
      <div class="card">
        <h3>Oggi</h3>
        ${voceOggi
          ? `<div class="legenda-riga"><span class="badge badge-ok">Fatto</span><span class="legenda-nome">${UiRoutine.escapeHtml(voceOggi.etichetta)}</span></div>
             <button class="btn btn-sm btn-ghost" id="btn-annulla-workout-oggi">Annulla</button>`
          : '<div class="vuoto">Non hai ancora segnato un allenamento per oggi.</div>'}
        ${storico.length ? `
        <div class="divisore-testo">Ultimi 7 giorni</div>
        ${storico.map(([data, v]) => `<div class="legenda-riga"><span class="legenda-nome">${DataUtils.formatDataBreve(data)}</span><span class="legenda-tempo">${UiRoutine.escapeHtml(v.etichetta)}</span></div>`).join('')}
        ` : ''}
      </div>
    `;
  }

  // ---------------- Render principale ----------------
  function render() {
    const cont = document.getElementById('workout-corpo');
    cont.innerHTML =
      renderImpostazioni() +
      renderSchedaFissa('Scheda veloce (senza attrezzi)', DatabaseWorkout.SCHEDA_VELOCE_IDS, 'veloce', 'Circa 15-20 minuti, corpo libero, nessun attrezzo.') +
      renderSchedaFissa('Scheda completa (con sbarra)', DatabaseWorkout.SCHEDA_COMPLETA_IDS, 'completa', 'Circa 40-45 minuti, usa anche la sbarra per trazioni.') +
      renderSchedaAdattiva() +
      renderLog();

    document.getElementById('btn-salva-impostazioni-workout').addEventListener('click', async () => {
      const livello = document.getElementById('f-livello-workout').value;
      const giorniDisponibili = Math.max(1, Math.min(7, parseInt(document.getElementById('f-giorni-workout').value, 10) || 3));
      await Dati.salvaProfiloWorkout({ livello, giorniDisponibili });
      window.App.mostraToast('Impostazioni salvate.');
      render();
    });

    const btnGeneraAdattiva = document.getElementById('btn-genera-adattiva');
    if (btnGeneraAdattiva) btnGeneraAdattiva.addEventListener('click', () => generaAdattiva(false));
    const btnRigeneraAdattiva = document.getElementById('btn-rigenera-adattiva');
    if (btnRigeneraAdattiva) btnRigeneraAdattiva.addEventListener('click', () => generaAdattiva(true));

    cont.querySelectorAll('[data-giorno-adattiva]').forEach(b => b.addEventListener('click', () => {
      giornoSelezionatoAdattiva = parseInt(b.dataset.giornoAdattiva, 10);
      render();
    }));

    cont.querySelectorAll('[data-registra-tipo]').forEach(b => b.addEventListener('click', async () => {
      await Dati.registraWorkoutGiorno(DataUtils.oggiISO(), {
        schedaTipo: b.dataset.registraTipo,
        etichetta: b.dataset.registraEtichetta,
        completato: true
      });
      window.App.mostraToast('Allenamento registrato per oggi.');
      render();
    }));

    const btnAnnulla = document.getElementById('btn-annulla-workout-oggi');
    if (btnAnnulla) btnAnnulla.addEventListener('click', async () => {
      const s = Dati.stato();
      delete s.workoutLog[DataUtils.oggiISO()];
      await Dati.salva();
      render();
    });
  }

  async function generaAdattiva(conConferma) {
    if (conConferma && !confirm('Rigenerare la scheda adattiva? Quella attuale verrà sostituita.')) return;
    const pw = Dati.stato().profiloWorkout;
    const giorni = GeneratorePianoWorkout.generaSchedaAdattiva(pw.giorniDisponibili, obiettivoCorrente(), pw.livello);
    giornoSelezionatoAdattiva = 0;
    await Dati.salvaSchedaAdattiva({ generataIl: DataUtils.oggiISO(), giorni });
    window.App.mostraToast('Scheda adattiva generata.');
    render();
  }

  return { render };
})();

window.UiWorkout = UiWorkout;
