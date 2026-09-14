/**
 * ui-oggi.js
 * Vista del giorno corrente: quadrante (grafico a torta 24h, compatto),
 * timeline delle attività di oggi (routine attive, orario fisso, task in
 * scadenza oggi), statistiche di aderenza, e il popup di dettaglio che si
 * apre toccando una voce (o la notifica): per routine di tipo Pasto/
 * Allenamento chiede subito cosa hai mangiato/allenato, per tipo Diario
 * apre direttamente il diario.
 */
const UiOggi = (function () {

  function vociDiGiorno(dataISO) {
    dataISO = dataISO || DataUtils.oggiISO();
    const weekday = DataUtils.weekdayISO(dataISO);
    const s = Dati.stato();

    const daRoutine = s.routine
      .filter(r => r.attiva !== false && r.giorni.includes(weekday))
      .map(r => ({
        chiave: `routine:${r.id}`,
        nome: r.nome,
        tipo: 'routine',
        tipoAttivita: r.tipo || 'altro',
        priorita: r.priorita,
        inizioMin: DataUtils.oraToMinuti(r.oraInizio),
        fineMin: DataUtils.oraToMinuti(r.oraInizio) + r.durataMinuti,
        conOrario: true
      }));

    const daTask = s.task
      .filter(t => !t.completata)
      .map(t => ({ t, stato: Cascata.statoTask(t, dataISO) }))
      .filter(x => x.stato.visibileOggi || x.stato.scaduta)
      .map(({ t, stato }) => {
        const conOrario = !!t.oraPromemoria;
        const inizioMin = conOrario ? DataUtils.oraToMinuti(t.oraPromemoria) : null;
        const durata = t.durataStimataMinuti || 20;
        return {
          chiave: `task:${t.id}`,
          nome: t.nome,
          tipo: 'task',
          priorita: t.priorita,
          inizioMin,
          fineMin: conOrario ? inizioMin + durata : null,
          conOrario,
          scaduta: stato.scaduta,
          ambitoEffettivo: stato.ambitoEffettivo
        };
      });

    const daOrarioFisso = (s.orarioFisso || [])
      .filter(o => o.giorno === weekday)
      .map(o => ({
        chiave: `orario:${o.id}`,
        nome: `${o.materia}${o.aula ? ' (' + o.aula + ')' : ''}`,
        tipo: 'orario',
        priorita: 5,
        inizioMin: DataUtils.oraToMinuti(o.oraInizio),
        fineMin: DataUtils.oraToMinuti(o.oraFine),
        conOrario: true
      }));

    return daRoutine.concat(daTask, daOrarioFisso);
  }

  function vociOggi() { return vociDiGiorno(DataUtils.oggiISO()); }

  function renderQuadrante(voci) {
    const cont = document.getElementById('quadrante-cont');
    const conOrario = voci.filter(v => v.conOrario);
    const blocchi = conOrario.map(v => ({
      inizioMin: v.inizioMin, fineMin: v.fineMin,
      colore: UiRoutine.coloreDaPriorita(v.priorita),
      nome: v.nome, tipo: v.tipo, chiave: v.chiave
    }));
    const spicchi = Quadrante.calcolaSpicchi(blocchi);
    cont.innerHTML = Quadrante.renderSVG(spicchi, DataUtils.minutiAdesso(), 104);
  }

  function statoCompletamento(chiave, dataISO) {
    dataISO = dataISO || DataUtils.oggiISO();
    const log = Dati.stato().log[dataISO];
    if (!log || !(chiave in log.completamenti)) return null; // non ancora risposto
    return log.completamenti[chiave]; // true / false
  }

  /** Riutilizzabile anche dal diario per mostrare le statistiche di un giorno qualsiasi */
  function calcolaStatistiche(dataISO) {
    dataISO = dataISO || DataUtils.oggiISO();
    const voci = vociDiGiorno(dataISO);
    const totali = voci.length;
    let completate = 0, pesoTotale = 0, pesoFatto = 0;
    voci.forEach(v => {
      pesoTotale += v.priorita;
      if (statoCompletamento(v.chiave, dataISO) === true) { completate++; pesoFatto += v.priorita; }
    });
    return {
      totali, completate,
      percCompletate: totali ? Math.round((completate / totali) * 100) : 0,
      percPesata: pesoTotale ? Math.round((pesoFatto / pesoTotale) * 100) : 0
    };
  }

  function renderTimeline(voci) {
    const cont = document.getElementById('timeline-oggi');
    if (!voci.length) {
      cont.innerHTML = '<div class="vuoto">Nessuna attività per oggi. Aggiungi una routine o una task.</div>';
      return;
    }
    const ordinati = voci.slice().sort((a, b) => {
      if (a.conOrario !== b.conOrario) return a.conOrario ? -1 : 1;
      if (a.conOrario) return a.inizioMin - b.inizioMin;
      return b.priorita - a.priorita;
    });

    cont.innerHTML = ordinati.map(v => {
      const stato = statoCompletamento(v.chiave);
      let badge = '';
      if (stato === true) badge = '<span class="badge badge-ok">Fatto</span>';
      else if (stato === false) badge = '<span class="badge badge-warn">Saltato</span>';
      else if (v.scaduta) badge = '<span class="badge badge-warn">Scaduta</span>';
      const colore = UiRoutine.coloreDaPriorita(v.priorita);
      const ora = v.conOrario ? DataUtils.formatOraMinutiInGiorno(v.inizioMin) : '—';
      return `
      <div class="timeline-item" data-chiave="${v.chiave}" style="cursor:pointer;">
        <div class="timeline-ora">${ora}</div>
        <div class="timeline-barra" style="background:${colore}"></div>
        <div class="timeline-corpo">
          <div class="timeline-titolo">${UiRoutine.escapeHtml(v.nome)}</div>
          <div class="timeline-meta">Priorità ${v.priorita}/10 ${v.tipo === 'task' ? '· task' : v.tipo === 'orario' ? '· orario fisso' : '· routine'} ${badge}</div>
          <div class="timeline-azioni">
            <button class="btn btn-sm btn-ok btn-segna" data-chiave="${v.chiave}" data-valore="true">✅ Fatto</button>
            <button class="btn btn-sm btn-warn btn-segna" data-chiave="${v.chiave}" data-valore="false">❌ Non fatto</button>
          </div>
        </div>
      </div>`;
    }).join('');

    cont.querySelectorAll('.btn-segna').forEach(b => {
      b.addEventListener('click', async (e) => {
        e.stopPropagation();
        const valore = b.dataset.valore === 'true';
        await Dati.impostaCompletamento(b.dataset.chiave, DataUtils.oggiISO(), valore);
        renderTutto();
      });
    });
    cont.querySelectorAll('.timeline-item').forEach(el => {
      el.addEventListener('click', () => apriDettaglioAttivita(el.dataset.chiave, DataUtils.oggiISO()));
    });
  }

  function renderStatistiche(voci) {
    const { completate, totali, percCompletate } = calcolaStatistiche(DataUtils.oggiISO());
    document.getElementById('statistiche-oggi').innerHTML = `
      <div class="oggi-stat-riga"><span class="oggi-stat-num">${completate}/${totali}</span><span class="oggi-stat-lbl">completate</span></div>
      <div class="oggi-stat-riga"><span class="oggi-stat-num">${percCompletate}%</span><span class="oggi-stat-lbl">aderenza oggi</span></div>
    `;
  }

  function renderTipoGiorno() {
    const oggi = DataUtils.oggiISO();
    const log = Dati.stato().log[oggi];
    const tipo = (log && log.tipo) || 'abituale';
    const cont = document.getElementById('tipo-giorno');
    cont.innerHTML = `
      <button type="button" class="btn btn-sm ${tipo === 'abituale' ? 'btn-primary' : ''}" data-tipo="abituale">Giorno abituale</button>
      <button type="button" class="btn btn-sm ${tipo === 'viaggio' ? 'btn-primary' : ''}" data-tipo="viaggio">Viaggio / trasferta</button>
    `;
    cont.querySelectorAll('button').forEach(b => b.addEventListener('click', async () => {
      await Dati.impostaTipoGiorno(oggi, b.dataset.tipo);
      renderTipoGiorno();
      window.App.mostraToast(b.dataset.tipo === 'viaggio'
        ? 'Segnato come giorno atipico: non peserà sulle medie di aderenza future.'
        : 'Segnato come giorno abituale.');
    }));
  }

  // ---------------- Popup di dettaglio (click su una voce, o tap su una notifica) ----------------
  function apriDettaglioAttivita(chiave, dataISO) {
    dataISO = dataISO || DataUtils.oggiISO();
    const [tipoChiave, id] = chiave.split(':');
    if (tipoChiave === 'routine') {
      const r = Dati.stato().routine.find(x => x.id === id);
      if (!r) return;
      if (r.tipo === 'diario') { window.App.mostraTab('diario'); return; }
      apriPopupRoutine(r, dataISO);
    } else if (tipoChiave === 'task') {
      window.App.mostraTab('task');
    }
    // per l'orario fisso non c'e' un'azione contestuale speciale: si segna fatto/non fatto dalla timeline stessa
  }

  function corpoContestualePerTipo(r, chiave, dataISO) {
    if (r.tipo === 'pasto') {
      return `
        <div class="divisore-testo">Cosa hai mangiato?</div>
        <div class="campo"><input type="text" id="popup-pasto-nome" placeholder="Es. Pasta al pomodoro" value="${UiRoutine.escapeHtml(r.nome)}"></div>
        <div class="griglia-2">
          <div class="campo"><label>Kcal</label><input type="number" id="popup-pasto-kcal" value="0"></div>
          <div class="campo"><label>Proteine (g)</label><input type="number" id="popup-pasto-prot" value="0"></div>
        </div>
        <div class="griglia-2">
          <div class="campo"><label>Carboidrati (g)</label><input type="number" id="popup-pasto-carb" value="0"></div>
          <div class="campo"><label>Grassi (g)</label><input type="number" id="popup-pasto-grassi" value="0"></div>
        </div>
        <button class="btn btn-ok btn-block" id="btn-popup-salva-pasto" style="margin-top:4px;">Salva e segna fatto</button>
      `;
    }
    if (r.tipo === 'allenamento') {
      const schedaAd = Dati.stato().schedaAdattiva;
      const opzioniAdattiva = (schedaAd && schedaAd.giorni.length)
        ? schedaAd.giorni.map((g, i) => `<option value="adattiva:${i}">${UiRoutine.escapeHtml(g.etichetta)}</option>`).join('') : '';
      return `
        <div class="divisore-testo">Che allenamento hai fatto?</div>
        <select id="popup-allenamento-tipo" style="width:100%;padding:9px 10px;border:1px solid var(--border-strong);border-radius:8px;margin-bottom:10px;">
          <option value="veloce">Scheda veloce</option>
          <option value="completa">Scheda completa</option>
          ${opzioniAdattiva}
          <option value="personalizzato">Altro / personalizzato</option>
        </select>
        <button class="btn btn-ok btn-block" id="btn-popup-salva-allenamento">Salva e segna fatto</button>
      `;
    }
    return '';
  }

  function apriPopupRoutine(r, dataISO) {
    const chiave = `routine:${r.id}`;
    const html = `
      <div class="foglio-header">
        <h2>${UiRoutine.escapeHtml(r.nome)}</h2>
        <button class="icon-btn" id="btn-chiudi-foglio">✕</button>
      </div>
      ${r.descrizione ? `<div class="card-flat" style="margin-bottom:14px;">${UiRoutine.escapeHtml(r.descrizione)}</div>` : ''}
      ${corpoContestualePerTipo(r, chiave, dataISO)}
      <div class="riga-btn" style="margin-top:14px;">
        <button class="btn btn-ok" id="btn-popup-fatto">✅ Fatto</button>
        <button class="btn btn-warn" id="btn-popup-non-fatto">❌ Non fatto</button>
      </div>
    `;
    window.App.apriFoglio(html);
    document.getElementById('btn-chiudi-foglio').addEventListener('click', window.App.chiudiFoglio);
    document.getElementById('btn-popup-fatto').addEventListener('click', async () => {
      await Dati.impostaCompletamento(chiave, dataISO, true);
      window.App.chiudiFoglio(); renderTutto();
    });
    document.getElementById('btn-popup-non-fatto').addEventListener('click', async () => {
      await Dati.impostaCompletamento(chiave, dataISO, false);
      window.App.chiudiFoglio(); renderTutto();
    });

    const btnPasto = document.getElementById('btn-popup-salva-pasto');
    if (btnPasto) btnPasto.addEventListener('click', async () => {
      const nome = document.getElementById('popup-pasto-nome').value.trim() || r.nome;
      const kcal = parseInt(document.getElementById('popup-pasto-kcal').value, 10) || 0;
      const proteine = parseInt(document.getElementById('popup-pasto-prot').value, 10) || 0;
      const carboidrati = parseInt(document.getElementById('popup-pasto-carb').value, 10) || 0;
      const grassi = parseInt(document.getElementById('popup-pasto-grassi').value, 10) || 0;
      if (kcal === 0 && proteine === 0 && carboidrati === 0 && grassi === 0) {
        window.App.mostraToast('Inserisci almeno un valore diverso da zero.');
        return;
      }
      await Dati.aggiungiPastoLog(dataISO, { nome, kcal, proteine, carboidrati, grassi, fonte: 'routine' });
      await Dati.impostaCompletamento(chiave, dataISO, true);
      window.App.chiudiFoglio(); window.App.mostraToast('Pasto registrato.'); renderTutto();
    });

    const btnAllenamento = document.getElementById('btn-popup-salva-allenamento');
    if (btnAllenamento) btnAllenamento.addEventListener('click', async () => {
      const val = document.getElementById('popup-allenamento-tipo').value;
      let schedaTipo = val, etichetta;
      if (val === 'veloce') etichetta = 'Scheda veloce';
      else if (val === 'completa') etichetta = 'Scheda completa';
      else if (val === 'personalizzato') etichetta = r.nome;
      else if (val.startsWith('adattiva:')) {
        schedaTipo = 'adattiva';
        etichetta = Dati.stato().schedaAdattiva.giorni[parseInt(val.split(':')[1], 10)].etichetta;
      }
      await Dati.registraWorkoutGiorno(dataISO, { schedaTipo, etichetta, completato: true });
      await Dati.impostaCompletamento(chiave, dataISO, true);
      window.App.chiudiFoglio(); window.App.mostraToast('Allenamento registrato.'); renderTutto();
    });
  }

  function renderTutto() {
    document.getElementById('data-oggi').textContent = DataUtils.formatDataEstesa(DataUtils.oggiISO());
    renderTipoGiorno();
    const voci = vociOggi();
    renderQuadrante(voci);
    renderTimeline(voci);
    renderStatistiche(voci);

    // Riprogramma le notifiche "di oggi" per routine/orario fisso (le task usano
    // ora un sistema a parte, pianificato in anticipo — vedi notifications.js).
    const oggi = DataUtils.oggiISO();
    const s = Dati.stato();
    const daNotificare = voci
      .filter(v => v.conOrario && v.tipo !== 'task' && statoCompletamento(v.chiave) === null)
      .map(v => {
        let conAzioni = true;
        if (v.tipo === 'routine') {
          const r = s.routine.find(x => `routine:${x.id}` === v.chiave);
          if (r && (r.tipo === 'pasto' || r.tipo === 'allenamento' || r.tipo === 'diario')) conAzioni = false;
        }
        return {
          chiave: v.chiave,
          titolo: v.nome,
          corpo: conAzioni ? `Priorità ${v.priorita}/10 — tocca per segnare come fatto` : 'Tocca per aprire e rispondere',
          orarioMin: v.inizioMin,
          dataISO: oggi,
          conAzioni
        };
      });
    Notifiche.programmaPerOggi(daNotificare);
  }

  return { renderTutto, vociOggi, vociDiGiorno, calcolaStatistiche, statoCompletamento, apriDettaglioAttivita };
})();

window.UiOggi = UiOggi;
