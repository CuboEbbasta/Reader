/**
 * cascade.js
 * Implementa la "cascata" degli ambiti temporali per le task:
 * anno -> mese (quando manca <= 1 mese) -> settimana (quando manca <= 1 settimana) -> giorno (quando manca <= 1 giorno)
 * La stessa logica di soglie si applica, concettualmente, anche alla ricategorizzazione degli obiettivi
 * (vedi ui-obiettivi.js in una versione futura), qui e' centralizzata cosi' resta coerente ovunque.
 */
const Cascata = (function () {
  const ORDINE = ['anno', 'mese', 'settimana', 'giorno'];
  // Se i giorni mancanti alla scadenza sono <= soglia del livello corrente, si scende al livello successivo.
  const SOGLIE_GIORNI = { anno: 31, mese: 7, settimana: 1 };

  function ambitoEffettivo(ambitoOriginale, giorniMancanti) {
    let idx = ORDINE.indexOf(ambitoOriginale);
    if (idx === -1) idx = ORDINE.length - 1;
    while (idx < ORDINE.length - 1) {
      const livello = ORDINE[idx];
      const soglia = SOGLIE_GIORNI[livello];
      if (giorniMancanti <= soglia) idx++; else break;
    }
    return ORDINE[idx];
  }

  /** Calcola lo stato "vivo" di una task rispetto a una data di riferimento (default: oggi) */
  function statoTask(task, oggiISO) {
    oggiISO = oggiISO || DataUtils.oggiISO();
    const giorniMancanti = DataUtils.differenzaGiorni(oggiISO, task.scadenza);
    const effettivo = ambitoEffettivo(task.ambito, giorniMancanti);
    return {
      giorniMancanti,
      ambitoEffettivo: effettivo,
      cascata: effettivo !== task.ambito,
      scaduta: giorniMancanti < 0 && !task.completata,
      visibileOggi: effettivo === 'giorno' && !task.completata,
      urgente: giorniMancanti <= 1 && !task.completata
    };
  }

  const ETICHETTE_AMBITO = { anno: 'Anno', mese: 'Mese', settimana: 'Settimana', giorno: 'Giorno' };

  return { ORDINE, SOGLIE_GIORNI, ambitoEffettivo, statoTask, ETICHETTE_AMBITO };
})();

window.Cascata = Cascata;
