/**
 * ui-sonno.js
 * Registro del sonno: ora in cui sei andato a letto e ora della sveglia,
 * da cui si calcolano da soli quante ore hai dormito (gestisce il
 * passaggio di mezzanotte). La qualità è facoltativa. Si integra con la
 * routine di tipo "Sonno" (quella ti ricorda l'orario, questa registra
 * quanto hai dormito davvero).
 */
const UiSonno = (function () {

  function calcolaOreDormite(oraInizio, oraFine) {
    const inizioMin = DataUtils.oraToMinuti(oraInizio);
    const fineMin = DataUtils.oraToMinuti(oraFine);
    let diff = fineMin - inizioMin;
    if (diff <= 0) diff += 24 * 60; // attraversa la mezzanotte (il caso normale)
    return Math.round((diff / 60) * 10) / 10;
  }

  function render() {
    const cont = document.getElementById('sonno-corpo');
    const oggi = DataUtils.oggiISO();
    const log = Dati.stato().sonnoLog;
    const voceOggi = log[oggi];
    const ultimi7 = Object.entries(log).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 7);
    const media = ultimi7.length ? Math.round((ultimi7.reduce((s, [, v]) => s + v.oreDormite, 0) / ultimi7.length) * 10) / 10 : null;

    cont.innerHTML = `
      <div class="card">
        <h3>Stanotte</h3>
        <div class="griglia-2">
          <div class="campo"><label>A letto alle</label><input type="time" id="f-sonno-inizio" value="${voceOggi ? voceOggi.oraInizio : '23:00'}"></div>
          <div class="campo"><label>Sveglio/a alle</label><input type="time" id="f-sonno-fine" value="${voceOggi ? voceOggi.oraFine : '07:00'}"></div>
        </div>
        <div class="campo">
          <label>Qualità (facoltativa)</label>
          <div class="giorni-settimana" id="f-sonno-qualita">
            ${[1,2,3,4,5].map(n => `<button type="button" class="giorno-toggle ${voceOggi && voceOggi.qualita === n ? 'selezionato' : ''}" data-q="${n}" style="width:auto;padding:0 12px;">${n}</button>`).join('')}
          </div>
        </div>
        <button class="btn btn-accent btn-block" id="btn-salva-sonno">Salva</button>
      </div>
      <div class="card">
        <div class="griglia-2">
          <div class="stat-box"><div class="stat-num">${voceOggi ? voceOggi.oreDormite : '—'}</div><div class="stat-lbl">Ore stanotte</div></div>
          <div class="stat-box"><div class="stat-num">${media != null ? media : '—'}</div><div class="stat-lbl">Media 7 giorni</div></div>
        </div>
        ${ultimi7.length ? `
        <div class="divisore-testo">Ultime notti</div>
        ${ultimi7.map(([data, v]) => `<div class="legenda-riga"><span class="legenda-nome">${DataUtils.formatDataBreve(data)}</span><span class="legenda-tempo">${v.oreDormite} h${v.qualita ? ' · qualità ' + v.qualita + '/5' : ''}</span></div>`).join('')}
        ` : ''}
      </div>
    `;

    let qualitaSelezionata = voceOggi ? voceOggi.qualita : null;
    cont.querySelectorAll('#f-sonno-qualita [data-q]').forEach(b => b.addEventListener('click', () => {
      const eraSelezionato = b.classList.contains('selezionato');
      cont.querySelectorAll('#f-sonno-qualita [data-q]').forEach(x => x.classList.remove('selezionato'));
      if (!eraSelezionato) { b.classList.add('selezionato'); qualitaSelezionata = parseInt(b.dataset.q, 10); }
      else qualitaSelezionata = null;
    }));

    document.getElementById('btn-salva-sonno').addEventListener('click', async () => {
      const oraInizio = document.getElementById('f-sonno-inizio').value;
      const oraFine = document.getElementById('f-sonno-fine').value;
      if (!oraInizio || !oraFine) { window.App.mostraToast('Indica entrambi gli orari.'); return; }
      const oreDormite = calcolaOreDormite(oraInizio, oraFine);
      if (oreDormite < 1 || oreDormite > 16) {
        window.App.mostraToast('Controlla gli orari: il risultato (' + oreDormite + ' h) non sembra plausibile.');
        return;
      }
      await Dati.registraSonno(oggi, { oraInizio, oraFine, oreDormite, qualita: qualitaSelezionata });
      window.App.mostraToast('Sonno registrato: ' + oreDormite + ' ore.');
      render();
    });
  }

  return { render, calcolaOreDormite };
})();

window.UiSonno = UiSonno;
