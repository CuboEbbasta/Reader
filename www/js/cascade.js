/**
 * cascade.js
 * Motore generico di "cascata temporale": un elemento (task o obiettivo) ha
 * un ambito originale (es. "anno") e una scadenza; quando la scadenza si
 * avvicina, l'elemento viene ricategorizzato in un ambito più piccolo
 * (es. "mese", poi "settimana", poi "giorno"), pur restando lo stesso
 * elemento — non viene mai scomposto automaticamente in azioni più piccole,
 * solo "visualizzato" nel contenitore temporale giusto.
 *
 * Lo stesso motore serve sia per le task (giorno/settimana/mese/anno) sia
 * per gli obiettivi (1 mese/6 mesi/1 anno/5 anni/10 anni), con scale e
 * soglie diverse: vedi le due istanze create in fondo al file.
 */
function creaMotoreCascata({ ordine, soglieGiorni, etichette }) {
  function ambitoEffettivo(ambitoOriginale, giorniMancanti) {
    let idx = ordine.indexOf(ambitoOriginale);
    if (idx === -1) idx = ordine.length - 1;
    while (idx < ordine.length - 1) {
      const livello = ordine[idx];
      const soglia = soglieGiorni[livello];
      if (giorniMancanti <= soglia) idx++; else break;
    }
    return ordine[idx];
  }

  /** Calcola lo stato "vivo" di un elemento (task o obiettivo) con {ambito, scadenza, completata/completato} */
  function statoElemento(elemento, oggiISO, campoCompletato) {
    oggiISO = oggiISO || DataUtils.oggiISO();
    const completato = !!elemento[campoCompletato];
    const giorniMancanti = DataUtils.differenzaGiorni(oggiISO, elemento.scadenza);
    const effettivo = ambitoEffettivo(elemento.ambito, giorniMancanti);
    return {
      giorniMancanti,
      ambitoEffettivo: effettivo,
      cascata: effettivo !== elemento.ambito,
      scaduta: giorniMancanti < 0 && !completato,
      visibileOggi: effettivo === ordine[ordine.length - 1] && !completato,
      urgente: giorniMancanti <= 1 && !completato
    };
  }

  return { ORDINE: ordine, SOGLIE_GIORNI: soglieGiorni, ETICHETTE_AMBITO: etichette, ambitoEffettivo, statoElemento };
}

// ---- Istanza per le TASK: giorno/settimana/mese/anno ----
const MotoreTask = creaMotoreCascata({
  ordine: ['anno', 'mese', 'settimana', 'giorno'],
  soglieGiorni: { anno: 31, mese: 7, settimana: 1 },
  etichette: { anno: 'Anno', mese: 'Mese', settimana: 'Settimana', giorno: 'Giorno' }
});

const Cascata = {
  ORDINE: MotoreTask.ORDINE,
  SOGLIE_GIORNI: MotoreTask.SOGLIE_GIORNI,
  ETICHETTE_AMBITO: MotoreTask.ETICHETTE_AMBITO,
  ambitoEffettivo: MotoreTask.ambitoEffettivo,
  statoTask: (task, oggiISO) => MotoreTask.statoElemento(task, oggiISO, 'completata')
};

// ---- Istanza per gli OBIETTIVI: 1 mese/6 mesi/1 anno/5 anni/10 anni ----
const MotoreObiettivi = creaMotoreCascata({
  ordine: ['10anni', '5anni', '1anno', '6mesi', '1mese'],
  soglieGiorni: { '10anni': 5 * 365, '5anni': 366, '1anno': 183, '6mesi': 31 },
  etichette: { '10anni': '10 anni', '5anni': '5 anni', '1anno': '1 anno', '6mesi': '6 mesi', '1mese': '1 mese' }
});

const CascataObiettivi = {
  ORDINE: MotoreObiettivi.ORDINE,
  SOGLIE_GIORNI: MotoreObiettivi.SOGLIE_GIORNI,
  ETICHETTE_AMBITO: MotoreObiettivi.ETICHETTE_AMBITO,
  ambitoEffettivo: MotoreObiettivi.ambitoEffettivo,
  statoObiettivo: (obiettivo, oggiISO) => MotoreObiettivi.statoElemento(obiettivo, oggiISO, 'completato')
};

window.Cascata = Cascata;
window.CascataObiettivi = CascataObiettivi;
