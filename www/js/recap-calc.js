/**
 * recap-calc.js
 * Calcola i riepiloghi periodici (settimanale/mensile): aderenza media,
 * voto medio del diario, task completate, variazione di peso. Confronta
 * sempre il periodo corrente con quello immediatamente precedente della
 * stessa lunghezza, per capire se si sta migliorando o meno. I giorni
 * marcati come "viaggio" (atipici) sono esclusi dalle medie, come deciso.
 */
const CalcoloRecap = (function () {

  function pesoAllaData(dataISO) {
    const storico = Dati.stato().profilo.storicoPeso;
    const precedenti = storico.filter(v => v.data <= dataISO).sort((a, b) => b.data.localeCompare(a.data));
    if (precedenti.length) return precedenti[0].peso;
    const successive = storico.filter(v => v.data > dataISO).sort((a, b) => a.data.localeCompare(b.data));
    return successive.length ? successive[0].peso : null;
  }

  function calcolaRecap(dataInizio, dataFine) {
    const s = Dati.stato();
    const giorni = [];
    let cursore = dataInizio;
    while (cursore <= dataFine) { giorni.push(cursore); cursore = DataUtils.addGiorni(cursore, 1); }

    let sommaAderenza = 0, sommaPesata = 0, giorniConDati = 0;
    let sommaVoto = 0, giorniConVoto = 0;
    let taskCompletate = 0, taskTotali = 0;
    let giorniViaggio = 0;

    giorni.forEach(g => {
      const giornoLog = s.log[g];
      if (giornoLog && giornoLog.tipo === 'viaggio') { giorniViaggio++; return; }
      const stats = UiOggi.calcolaStatistiche(g);
      if (stats.totali > 0) {
        sommaAderenza += stats.percCompletate;
        sommaPesata += stats.percPesata;
        giorniConDati++;
        taskCompletate += stats.completate;
        taskTotali += stats.totali;
      }
      const voce = s.journal[g];
      if (voce && typeof voce.votoNumerico === 'number') {
        sommaVoto += voce.votoNumerico;
        giorniConVoto++;
      }
    });

    const pesoIniziale = pesoAllaData(dataInizio);
    const pesoFinale = pesoAllaData(dataFine);

    return {
      dataInizio, dataFine, giorniViaggio,
      aderenzaMedia: giorniConDati ? Math.round(sommaAderenza / giorniConDati) : null,
      pesataMedia: giorniConDati ? Math.round(sommaPesata / giorniConDati) : null,
      votoMedio: giorniConVoto ? Math.round((sommaVoto / giorniConVoto) * 100) / 100 : null,
      taskCompletate, taskTotali,
      variazionePeso: (pesoIniziale != null && pesoFinale != null) ? Math.round((pesoFinale - pesoIniziale) * 10) / 10 : null,
      giorniConDati, giorniConVoto
    };
  }

  function recapPeriodo(oggiISO, lunghezzaGiorni) {
    oggiISO = oggiISO || DataUtils.oggiISO();
    const fine = oggiISO;
    const inizio = DataUtils.addGiorni(oggiISO, -(lunghezzaGiorni - 1));
    const corrente = calcolaRecap(inizio, fine);
    const finePrec = DataUtils.addGiorni(inizio, -1);
    const inizioPrec = DataUtils.addGiorni(finePrec, -(lunghezzaGiorni - 1));
    const precedente = calcolaRecap(inizioPrec, finePrec);
    return { corrente, precedente };
  }

  function recapSettimanale(oggiISO) { return recapPeriodo(oggiISO, 7); }
  function recapMensile(oggiISO) { return recapPeriodo(oggiISO, 30); }

  return { calcolaRecap, recapSettimanale, recapMensile, pesoAllaData };
})();

window.CalcoloRecap = CalcoloRecap;
