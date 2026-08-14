/**
 * workout-plan.js
 * Genera la "terza versione" concordata: una scheda adattiva sui giorni a
 * settimana disponibili, evidenziando la differenza rispetto alle due
 * schede fisse (che restano invariate). Con pochi giorni fa full body,
 * con più giorni divide upper/lower per allenarsi più spesso con meno
 * volume a sessione.
 */
const GeneratorePianoWorkout = (function () {

  function schemaGiorni(numGiorni) {
    if (numGiorni <= 2) return ['fullbody', 'fullbody'].slice(0, numGiorni);
    if (numGiorni === 3) return ['fullbody', 'fullbody', 'fullbody'];
    if (numGiorni === 4) return ['upper', 'lower', 'upper', 'lower'];
    return ['upper', 'lower', 'fullbody', 'upper', 'lower', 'fullbody', 'core'].slice(0, numGiorni);
  }

  function pescaEsercizi(gruppo, quantita, usatiRecentemente) {
    const pool = DatabaseWorkout.perGruppo(gruppo, false).filter(e => !usatiRecentemente.has(e.id));
    const bacino = pool.length >= quantita ? pool : DatabaseWorkout.perGruppo(gruppo, false);
    const copia = bacino.slice();
    const scelti = [];
    while (scelti.length < quantita && copia.length) {
      const i = Math.floor(Math.random() * copia.length);
      scelti.push(copia.splice(i, 1)[0]);
    }
    scelti.forEach(e => usatiRecentemente.add(e.id));
    return scelti;
  }

  function generaGiornoAllenamento(tipoGiorno, usatiRecentemente) {
    let esercizi = [];
    if (tipoGiorno === 'fullbody') {
      esercizi = [].concat(
        pescaEsercizi('cardio', 1, usatiRecentemente),
        pescaEsercizi('upper', 2, usatiRecentemente),
        pescaEsercizi('lower', 2, usatiRecentemente),
        pescaEsercizi('core', 1, usatiRecentemente)
      );
    } else if (tipoGiorno === 'upper') {
      esercizi = [].concat(
        pescaEsercizi('cardio', 1, usatiRecentemente),
        pescaEsercizi('upper', 3, usatiRecentemente),
        pescaEsercizi('core', 1, usatiRecentemente)
      );
    } else if (tipoGiorno === 'lower') {
      esercizi = [].concat(
        pescaEsercizi('cardio', 1, usatiRecentemente),
        pescaEsercizi('lower', 3, usatiRecentemente),
        pescaEsercizi('core', 1, usatiRecentemente)
      );
    } else {
      esercizi = [].concat(
        pescaEsercizi('cardio', 1, usatiRecentemente),
        pescaEsercizi('core', 3, usatiRecentemente)
      );
    }
    return esercizi;
  }

  const ETICHETTE_TIPO_GIORNO = { fullbody: 'Full body', upper: 'Parte superiore', lower: 'Parte inferiore', core: 'Core / riposo attivo' };

  /** Genera la scheda adattiva: un array di giorni, ciascuno con i propri esercizi già scalati */
  function generaSchedaAdattiva(giorniDisponibili, obiettivo, livello) {
    const schema = schemaGiorni(Math.max(1, Math.min(7, giorniDisponibili)));
    const usatiRecentemente = new Set();
    return schema.map((tipoGiorno, indice) => {
      if (indice > 0 && indice % 3 === 0) usatiRecentemente.clear();
      const base = generaGiornoAllenamento(tipoGiorno, usatiRecentemente);
      return {
        numero: indice + 1,
        tipo: tipoGiorno,
        etichetta: `Giorno ${indice + 1} — ${ETICHETTE_TIPO_GIORNO[tipoGiorno]}`,
        esercizi: base.map(e => CalcoloWorkout.scalaEsercizio(e, obiettivo, livello))
      };
    });
  }

  return { schemaGiorni, generaSchedaAdattiva, ETICHETTE_TIPO_GIORNO };
})();

window.GeneratorePianoWorkout = GeneratorePianoWorkout;
