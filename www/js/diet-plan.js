/**
 * diet-plan.js
 * Genera un piano settimanale a partire dal database dei pasti (diet-database.js),
 * escludendo allergie/intolleranze e cibi non graditi, e scalando le porzioni
 * per avvicinarsi al target calorico calcolato (diet-calc.js) per ogni fascia
 * del giorno. È un punto di partenza plausibile, non un piano clinico:
 * ogni pasto generato resta comunque modificabile o sostituibile a mano.
 */
const GeneratorePiano = (function () {

  function pastoEscluso(pasto, profilo) {
    const allergie = profilo.allergie || [];
    if (pasto.contiene.some(tag => allergie.includes(tag))) return true;
    const nonGraditi = (profilo.cibiNonGraditi || '')
      .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const nomeLower = pasto.nome.toLowerCase();
    return nonGraditi.some(parola => parola && nomeLower.includes(parola));
  }

  function scalaPasto(pasto, fattore) {
    fattore = Math.max(0.6, Math.min(1.6, fattore));
    const arrotonda = (v) => Math.round(v * fattore);
    return {
      id: pasto.id,
      nome: pasto.nome,
      kcal: arrotonda(pasto.kcal),
      proteine: arrotonda(pasto.proteine),
      carboidrati: arrotonda(pasto.carboidrati),
      grassi: arrotonda(pasto.grassi),
      fattorePorzione: Math.round(fattore * 100) / 100
    };
  }

  function generaPastoCategoria(categoriaBase, targetKcalFascia, profilo) {
    let candidati = DatabaseDieta.perCategoria(categoriaBase).filter(p => !pastoEscluso(p, profilo));
    if (!candidati.length) candidati = DatabaseDieta.perCategoria(categoriaBase); // meglio un pasto "generico" che nessuno
    const scelto = candidati[Math.floor(Math.random() * candidati.length)];
    return scalaPasto(scelto, targetKcalFascia / scelto.kcal);
  }

  /** Genera un piano per tutti e 7 i giorni della settimana (chiavi 1=Lunedì..7=Domenica) */
  function generaPianoSettimanale(profilo) {
    const macro = CalcoloDieta.calcolaMacro(profilo);
    const preset = DatabaseDieta.perNumeroPasti(profilo.numeroPasti || 5);
    const giorni = {};
    for (let giorno = 1; giorno <= 7; giorno++) {
      giorni[giorno] = preset.categorie.map(cat => {
        const categoriaBase = cat.startsWith('spuntino') ? 'spuntino' : cat;
        const targetFascia = macro.targetKcal * preset.quote[cat];
        const pasto = generaPastoCategoria(categoriaBase, targetFascia, profilo);
        return Object.assign({ categoria: cat }, pasto);
      });
    }
    return { generatoIl: DataUtils.oggiISO(), giorni };
  }

  function totaliGiorno(pastiGiorno) {
    return pastiGiorno.reduce((tot, p) => ({
      kcal: tot.kcal + p.kcal,
      proteine: tot.proteine + p.proteine,
      carboidrati: tot.carboidrati + p.carboidrati,
      grassi: tot.grassi + p.grassi
    }), { kcal: 0, proteine: 0, carboidrati: 0, grassi: 0 });
  }

  return { generaPianoSettimanale, generaPastoCategoria, pastoEscluso, totaliGiorno };
})();

window.GeneratorePiano = GeneratorePiano;
