/**
 * ui-oggi.js
 * Vista del giorno corrente: quadrante (grafico a torta 24h), timeline delle
 * attività di oggi (routine attive + task in scadenza oggi) con possibilità
 * di segnarle fatte/non fatte, e statistiche di aderenza della giornata.
 */
const UiOggi = (function () {

  function vociOggi() {
    const oggi = DataUtils.oggiISO();
    const weekday = DataUtils.weekdayISO(oggi);
    const s = Dati.stato();

    const daRoutine = s.routine
      .filter(r => r.attiva !== false && r.giorni.includes(weekday))
      .map(r => ({
        chiave: `routine:${r.id}`,
        nome: r.nome,
        tipo: 'routine',
        priorita: r.priorita,
        inizioMin: DataUtils.oraToMinuti(r.oraInizio),
        fineMin: DataUtils.oraToMinuti(r.oraInizio) + r.durataMinuti,
        conOrario: true
      }));

    const daTask = s.task
      .filter(t => !t.completata)
      .map(t => ({ t, stato: Cascata.statoTask(t, oggi) }))
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

    return daRoutine.concat(daTask);
  }

  function renderQuadrante(voci) {
    const cont = document.getElementById('quadrante-cont');
    const conOrario = voci.filter(v => v.conOrario);
    const blocchi = conOrario.map(v => ({
      inizioMin: v.inizioMin, fineMin: v.fineMin,
      colore: UiRoutine.coloreDaPriorita(v.priorita),
      nome: v.nome, tipo: v.tipo, chiave: v.chiave
    }));
    const spicchi = Quadrante.calcolaSpicchi(blocchi);
    cont.innerHTML = Quadrante.renderSVG(spicchi, DataUtils.minutiAdesso(), 280);

    const legenda = document.getElementById('quadrante-legenda');
    const rilevanti = spicchi.filter(s => s.tipo !== 'libero');
    const libero = spicchi.filter(s => s.tipo === 'libero').reduce((acc, s) => acc + (s.fineMin - s.inizioMin), 0);
    let righe = rilevanti.map(s => `
      <div class="legenda-riga">
        <span class="legenda-swatch" style="background:${s.colore}"></span>
        <span class="legenda-nome">${UiRoutine.escapeHtml(s.nome)}</span>
        <span class="legenda-tempo">${DataUtils.formatOraMinutiInGiorno(s.inizioMin)}–${DataUtils.formatOraMinutiInGiorno(s.fineMin)}</span>
      </div>`).join('');
    righe += `
      <div class="legenda-riga">
        <span class="legenda-swatch" style="background:${Quadrante.COLORE_LIBERO}"></span>
        <span class="legenda-nome">Tempo libero</span>
        <span class="legenda-tempo">${(libero / 60).toFixed(1)} h</span>
      </div>`;
    legenda.innerHTML = righe;
  }

  function statoCompletamento(chiave) {
    const oggi = DataUtils.oggiISO();
    const log = Dati.stato().log[oggi];
    if (!log || !(chiave in log.completamenti)) return null; // non ancora risposto
    return log.completamenti[chiave]; // true / false
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
      <div class="timeline-item" data-chiave="${v.chiave}">
        <div class="timeline-ora">${ora}</div>
        <div class="timeline-barra" style="background:${colore}"></div>
        <div class="timeline-corpo">
          <div class="timeline-titolo">${UiRoutine.escapeHtml(v.nome)}</div>
          <div class="timeline-meta">Priorità ${v.priorita}/10 ${v.tipo === 'task' ? '· task' : '· routine'} ${badge}</div>
          <div class="timeline-azioni">
            <button class="btn btn-sm btn-ok btn-segna" data-chiave="${v.chiave}" data-valore="true">✅ Fatto</button>
            <button class="btn btn-sm btn-warn btn-segna" data-chiave="${v.chiave}" data-valore="false">❌ Non fatto</button>
          </div>
        </div>
      </div>`;
    }).join('');

    cont.querySelectorAll('.btn-segna').forEach(b => {
      b.addEventListener('click', async () => {
        const valore = b.dataset.valore === 'true';
        await Dati.impostaCompletamento(b.dataset.chiave, DataUtils.oggiISO(), valore);
        renderTutto();
      });
    });
  }

  function renderStatistiche(voci) {
    const oggi = DataUtils.oggiISO();
    const totali = voci.length;
    let completate = 0, pesoTotale = 0, pesoFatto = 0;
    voci.forEach(v => {
      pesoTotale += v.priorita;
      const st = statoCompletamento(v.chiave);
      if (st === true) { completate++; pesoFatto += v.priorita; }
    });
    const percCompletate = totali ? Math.round((completate / totali) * 100) : 0;
    const percPesata = pesoTotale ? Math.round((pesoFatto / pesoTotale) * 100) : 0;

    document.getElementById('statistiche-oggi').innerHTML = `
      <div class="griglia-3">
        <div class="stat-box"><div class="stat-num">${completate}/${totali}</div><div class="stat-lbl">Completate</div></div>
        <div class="stat-box"><div class="stat-num">${percCompletate}%</div><div class="stat-lbl">Aderenza</div></div>
        <div class="stat-box"><div class="stat-num">${percPesata}%</div><div class="stat-lbl">Pesata priorità</div></div>
      </div>`;
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

  function renderTutto() {
    document.getElementById('data-oggi').textContent = DataUtils.formatDataEstesa(DataUtils.oggiISO());
    renderTipoGiorno();
    const voci = vociOggi();
    renderQuadrante(voci);
    renderTimeline(voci);
    renderStatistiche(voci);

    // riprogramma le notifiche di oggi in base ai dati aggiornati
    const oggi = DataUtils.oggiISO();
    const daNotificare = voci.filter(v => v.conOrario && statoCompletamento(v.chiave) === null).map(v => ({
      chiave: v.chiave,
      titolo: v.nome,
      corpo: `Priorità ${v.priorita}/10 — tocca per segnare come fatto`,
      orarioMin: v.inizioMin,
      dataISO: oggi
    }));
    Notifiche.programmaPerOggi(daNotificare);
  }

  return { renderTutto, vociOggi };
})();

window.UiOggi = UiOggi;
