/**
 * workout-database.js
 * Catalogo esercizi a corpo libero (alcuni richiedono la sbarra) e le due
 * schede fisse concordate: "veloce senza attrezzi" e "completa con sbarra".
 * I numeri (serie/ripetizioni/recupero) sono valori di base, poi adattati
 * in workout-calc.js in base a obiettivo fisico e livello.
 */
const DatabaseWorkout = (function () {
  const ESERCIZI = [
    // ---- UPPER BODY ----
    { id: 'w1', nome: 'Push-up (piegamenti)', gruppo: 'upper', richiedeSbarra: false, serieBase: 3, ripetizioniBase: '10-15', recuperoBase: 40 },
    { id: 'w2', nome: 'Push-up diamante', gruppo: 'upper', richiedeSbarra: false, serieBase: 3, ripetizioniBase: '8-12', recuperoBase: 45 },
    { id: 'w3', nome: 'Dip tra due sedie', gruppo: 'upper', richiedeSbarra: false, serieBase: 3, ripetizioniBase: '8-12', recuperoBase: 45 },
    { id: 'w4', nome: 'Trazioni alla sbarra (presa prona)', gruppo: 'upper', richiedeSbarra: true, serieBase: 4, ripetizioniBase: 'max, 5-8', recuperoBase: 60 },
    { id: 'w5', nome: 'Trazioni presa inversa', gruppo: 'upper', richiedeSbarra: true, serieBase: 3, ripetizioniBase: 'max, 5-8', recuperoBase: 60 },
    { id: 'w6', nome: 'Trazioni presa larga', gruppo: 'upper', richiedeSbarra: true, serieBase: 3, ripetizioniBase: 'max, 4-6', recuperoBase: 60 },
    { id: 'w7', nome: 'Dead hang alla sbarra', gruppo: 'upper', richiedeSbarra: true, serieBase: 3, ripetizioniBase: '20-30 sec', recuperoBase: 30 },

    // ---- LOWER BODY ----
    { id: 'w8', nome: 'Squat a corpo libero', gruppo: 'lower', richiedeSbarra: false, serieBase: 3, ripetizioniBase: '15-20', recuperoBase: 30 },
    { id: 'w9', nome: 'Affondi alternati', gruppo: 'lower', richiedeSbarra: false, serieBase: 3, ripetizioniBase: '12 per gamba', recuperoBase: 30 },
    { id: 'w10', nome: 'Squat bulgaro (piede rialzato)', gruppo: 'lower', richiedeSbarra: false, serieBase: 3, ripetizioniBase: '10-12 per gamba', recuperoBase: 40 },
    { id: 'w11', nome: 'Hip thrust a terra', gruppo: 'lower', richiedeSbarra: false, serieBase: 3, ripetizioniBase: '15-20', recuperoBase: 30 },
    { id: 'w12', nome: 'Calf raise (alzate su punte)', gruppo: 'lower', richiedeSbarra: false, serieBase: 3, ripetizioniBase: '20', recuperoBase: 20 },
    { id: 'w13', nome: 'Jump squat', gruppo: 'lower', richiedeSbarra: false, serieBase: 3, ripetizioniBase: '12', recuperoBase: 40 },

    // ---- CORE ----
    { id: 'w14', nome: 'Plank', gruppo: 'core', richiedeSbarra: false, serieBase: 3, ripetizioniBase: '30-45 sec', recuperoBase: 20 },
    { id: 'w15', nome: 'Mountain climber', gruppo: 'core', richiedeSbarra: false, serieBase: 3, ripetizioniBase: '20 per lato', recuperoBase: 20 },
    { id: 'w16', nome: 'Russian twist', gruppo: 'core', richiedeSbarra: false, serieBase: 3, ripetizioniBase: '20', recuperoBase: 20 },
    { id: 'w17', nome: 'Leg raise appesi alla sbarra', gruppo: 'core', richiedeSbarra: true, serieBase: 3, ripetizioniBase: '10-15', recuperoBase: 30 },

    // ---- CARDIO / RISCALDAMENTO ----
    { id: 'w18', nome: 'Jumping jack', gruppo: 'cardio', richiedeSbarra: false, serieBase: 3, ripetizioniBase: '30 sec', recuperoBase: 15 },
    { id: 'w19', nome: 'Burpees', gruppo: 'cardio', richiedeSbarra: false, serieBase: 3, ripetizioniBase: '10', recuperoBase: 30 },
    { id: 'w20', nome: 'High knees', gruppo: 'cardio', richiedeSbarra: false, serieBase: 3, ripetizioniBase: '30 sec', recuperoBase: 15 }
  ];

  function trova(id) { return ESERCIZI.find(e => e.id === id); }
  function perGruppo(gruppo, soloSenzaSbarra) {
    return ESERCIZI.filter(e => e.gruppo === gruppo && (!soloSenzaSbarra || !e.richiedeSbarra));
  }

  // Le due schede fisse: solo un elenco ordinato di ID esercizi.
  const SCHEDA_VELOCE_IDS = ['w18', 'w8', 'w1', 'w9', 'w14', 'w15'];
  const SCHEDA_COMPLETA_IDS = ['w18', 'w4', 'w8', 'w1', 'w5', 'w9', 'w3', 'w14', 'w7'];

  return { ESERCIZI, trova, perGruppo, SCHEDA_VELOCE_IDS, SCHEDA_COMPLETA_IDS };
})();

window.DatabaseWorkout = DatabaseWorkout;
