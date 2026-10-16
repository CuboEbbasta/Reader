/**
 * testo-orario.js
 * Importa una routine settimanale scritta come testo libero a punti, es.:
 *
 *   Lun
 *   - 6:00: Sveglia
 *   - 6:00 alle 7:00: Prepararsi (Viso, Doccia) + Briefing
 *   - Alle 11:00 Claude
 *   - 24:00 max: Dormire
 *
 * Riconosce: "H:MM alle H:MM: nome" (intervallo), "Alle H:MM nome" e
 * "H:MM: nome" / "H:MM nome" (singolo istante, durata di default breve).
 * "24:00" viene trattato come 23:59. Voci con stesso nome+orario su più
 * giorni vengono unite in un'unica routine con più giorni, invece di
 * creare doppioni. Il "tipo" viene assegnato in automatico cercando nel
 * nome una delle parole chiave configurate (vedi Dati.paroleChiaveTipi).
 */
const ImportatoreOrario = (function () {
  const MAPPA_GIORNI = {
    lun: 1, lunedi: 1, mar: 2, martedi: 2, mer: 3, mercoledi: 3,
    gio: 4, giovedi: 4, ven: 5, venerdi: 5, sab: 6, sabato: 6, dom: 7, domenica: 7
  };
  const DURATA_DEFAULT_PUNTUALE = 15; // minuti, per eventi senza orario di fine esplicito

  function normalizzaGiorno(riga) {
    const pulito = riga.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
    return MAPPA_GIORNI[pulito] || null;
  }

  function normalizzaOra(hh, mm) {
    let h = parseInt(hh, 10);
    let m = parseInt(mm, 10);
    if (h >= 24) { h = 23; m = 59; }
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return DataUtils.pad2(h) + ':' + DataUtils.pad2(m);
  }

  function pulisciNome(nome) {
    return nome.replace(/^[:\s]+/, '').trim();
  }

  /** Analizza una singola riga puntata (senza il trattino iniziale) */
  function parsaRiga(testoRiga) {
    const testo = testoRiga.trim().replace(/^[-•]\s*/, '');
    if (!testo) return null;

    let m = testo.match(/^(?:dalle\s+)?(\d{1,2}):(\d{2})\s+alle\s+(\d{1,2}):(\d{2})\s*:?\s*(.+)$/i);
    if (m) {
      const oraInizio = normalizzaOra(m[1], m[2]);
      const oraFine = normalizzaOra(m[3], m[4]);
      const nome = pulisciNome(m[5]);
      if (!oraInizio || !oraFine || !nome) return null;
      let durata = DataUtils.oraToMinuti(oraFine) - DataUtils.oraToMinuti(oraInizio);
      if (durata <= 0) durata = DURATA_DEFAULT_PUNTUALE; // orario incoerente: degrada a evento puntuale
      return { oraInizio, durataMinuti: durata, nome };
    }

    m = testo.match(/^alle\s+(\d{1,2}):(\d{2})\s*:?\s*(.+)$/i);
    if (m) {
      const oraInizio = normalizzaOra(m[1], m[2]);
      const nome = pulisciNome(m[3]);
      if (!oraInizio || !nome) return null;
      return { oraInizio, durataMinuti: DURATA_DEFAULT_PUNTUALE, nome };
    }

    m = testo.match(/^(\d{1,2}):(\d{2})\s*(?:max)?\s*:?\s*(.+)$/i);
    if (m) {
      const oraInizio = normalizzaOra(m[1], m[2]);
      const nome = pulisciNome(m[3]);
      if (!oraInizio || !nome) return null;
      return { oraInizio, durataMinuti: DURATA_DEFAULT_PUNTUALE, nome };
    }

    return null;
  }

  function assegnaTipo(nome, paroleChiave) {
    const nomeLower = nome.toLowerCase();
    const trovata = (paroleChiave || []).find(pc => pc.parola && nomeLower.includes(pc.parola.toLowerCase()));
    return trovata ? trovata.tipoId : 'altro';
  }

  /** Ritorna { voci: [{nome,oraInizio,durataMinuti,giorni:[...],tipo}], righeIgnorate: n } */
  function analizza(testoCompleto, paroleChiave) {
    const righe = (testoCompleto || '').split('\n');
    const voci = [];
    let giornoCorrente = null;
    let righeIgnorate = 0;

    righe.forEach(rigaOriginale => {
      const riga = rigaOriginale.trim();
      if (!riga) return;
      const eBullet = riga.startsWith('-') || riga.startsWith('•');

      if (!eBullet) {
        const giorno = normalizzaGiorno(riga);
        if (giorno) giornoCorrente = giorno;
        return;
      }
      if (giornoCorrente == null) { righeIgnorate++; return; }

      const parsed = parsaRiga(riga);
      if (!parsed) { righeIgnorate++; return; }

      const tipo = assegnaTipo(parsed.nome, paroleChiave);
      const esistente = voci.find(v => v.nome === parsed.nome && v.oraInizio === parsed.oraInizio && v.durataMinuti === parsed.durataMinuti);
      if (esistente) {
        if (!esistente.giorni.includes(giornoCorrente)) esistente.giorni.push(giornoCorrente);
      } else {
        voci.push({ nome: parsed.nome, oraInizio: parsed.oraInizio, durataMinuti: parsed.durataMinuti, giorni: [giornoCorrente], tipo });
      }
    });

    voci.forEach(v => v.giorni.sort((a, b) => a - b));
    voci.sort((a, b) => a.oraInizio.localeCompare(b.oraInizio));
    return { voci, righeIgnorate };
  }

  return { analizza, parsaRiga, normalizzaGiorno, assegnaTipo, MAPPA_GIORNI };
})();

window.ImportatoreOrario = ImportatoreOrario;
