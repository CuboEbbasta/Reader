/**
 * diet-calc.js
 * Calcolo indicativo di fabbisogno calorico e macronutrienti, con la
 * formula di Mifflin-St Jeor (la più usata e affidabile tra quelle
 * semplici). È una stima di partenza, non sostituisce un nutrizionista:
 * lo ricordiamo anche nell'interfaccia (vedi ui-dieta.js).
 */
const CalcoloDieta = (function () {
  const MOLTIPLICATORE_ATTIVITA = {
    sedentario: 1.2,
    leggero: 1.375,
    moderato: 1.55,
    attivo: 1.725,
    moltoattivo: 1.9
  };
  const ETICHETTE_ATTIVITA = {
    sedentario: 'Sedentario (poco o nessun esercizio)',
    leggero: 'Leggero (1-3 giorni/settimana)',
    moderato: 'Moderato (3-5 giorni/settimana)',
    attivo: 'Attivo (6-7 giorni/settimana)',
    moltoattivo: 'Molto attivo (lavoro fisico o atleta)'
  };
  const FATTORE_OBIETTIVO = { dimagrimento: 0.82, mantenimento: 1.0, aumento_massa: 1.12 };
  const ETICHETTE_OBIETTIVO = { dimagrimento: 'Perdere peso', mantenimento: 'Mantenere il peso', aumento_massa: 'Aumentare massa' };

  function profiloCompleto(p) {
    return !!(p && p.eta && p.altezzaCm && p.pesoKg && p.sesso);
  }

  function calcolaBMR(p) {
    const base = 10 * p.pesoKg + 6.25 * p.altezzaCm - 5 * p.eta;
    return p.sesso === 'F' ? base - 161 : base + 5;
  }

  function calcolaTDEE(p) {
    return calcolaBMR(p) * (MOLTIPLICATORE_ATTIVITA[p.livelloAttivita] || 1.375);
  }

  function calcolaTargetCalorico(p) {
    return Math.round(calcolaTDEE(p) * (FATTORE_OBIETTIVO[p.obiettivo] || 1.0));
  }

  function calcolaMacro(p) {
    const targetKcal = calcolaTargetCalorico(p);
    const proteineG = Math.round(p.pesoKg * 1.8);
    const kcalProteine = proteineG * 4;
    const grassiG = Math.round((targetKcal * 0.28) / 9);
    const kcalGrassi = grassiG * 9;
    const carboidratiG = Math.max(0, Math.round((targetKcal - kcalProteine - kcalGrassi) / 4));
    return { targetKcal, proteineG, grassiG, carboidratiG };
  }

  return {
    MOLTIPLICATORE_ATTIVITA, ETICHETTE_ATTIVITA, FATTORE_OBIETTIVO, ETICHETTE_OBIETTIVO,
    profiloCompleto, calcolaBMR, calcolaTDEE, calcolaTargetCalorico, calcolaMacro
  };
})();

window.CalcoloDieta = CalcoloDieta;
