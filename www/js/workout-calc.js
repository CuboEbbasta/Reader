/**
 * workout-calc.js
 * Adatta serie/recupero di un esercizio "base" in funzione di:
 * - obiettivo fisico: riusa profilo.obiettivo della dieta (dimagrimento /
 *   mantenimento / aumento_massa) per non chiedere due volte la stessa cosa;
 * - livello di allenamento (principiante / intermedio / avanzato).
 * Le ripetizioni restano l'intervallo indicato (sono già un range), con una
 * piccola nota testuale per chi è avanzato o alle prime armi.
 */
const CalcoloWorkout = (function () {
  const ETICHETTE_LIVELLO = { principiante: 'Principiante', intermedio: 'Intermedio', avanzato: 'Avanzato' };

  function scalaEsercizio(base, obiettivo, livello) {
    let serie = base.serieBase;
    let recupero = base.recuperoBase;
    let nota = '';

    if (obiettivo === 'dimagrimento') recupero = Math.round(recupero * 0.7);
    else if (obiettivo === 'aumento_massa') { serie += 1; recupero = Math.round(recupero * 1.2); }

    if (livello === 'principiante') { serie = Math.max(2, serie - 1); nota = 'Riduci pure le ripetizioni se serve, l\'importante è la forma corretta.'; }
    else if (livello === 'avanzato') { serie += 1; nota = 'Se ti risulta facile, aumenta le ripetizioni o aggiungi un peso/zaino.'; }

    return {
      id: base.id, nome: base.nome, gruppo: base.gruppo, richiedeSbarra: base.richiedeSbarra,
      serie, ripetizioni: base.ripetizioniBase, recupero, nota
    };
  }

  function costruisciScheda(idsEsercizi, obiettivo, livello) {
    return idsEsercizi
      .map(id => DatabaseWorkout.trova(id))
      .filter(Boolean)
      .map(base => scalaEsercizio(base, obiettivo, livello));
  }

  return { ETICHETTE_LIVELLO, scalaEsercizio, costruisciScheda };
})();

window.CalcoloWorkout = CalcoloWorkout;
