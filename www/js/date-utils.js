/**
 * date-utils.js
 * Funzioni di supporto per le date. Nessuna dipendenza esterna.
 * Le date "chiave" sono sempre stringhe ISO "YYYY-MM-DD" (fuso orario locale del dispositivo).
 */
const DataUtils = (function () {
  const NOMI_GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']; // indice 0 = Lunedi
  const NOMI_GIORNI_ESTESI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
  const NOMI_MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

  function pad2(n) { return String(n).padStart(2, '0'); }

  function oggiISO() {
    return dataToISO(new Date());
  }

  function dataToISO(d) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function isoToData(iso) {
    // Interpretata come mezzanotte locale, per evitare scivolamenti di fuso orario
    const [y, m, g] = iso.split('-').map(Number);
    return new Date(y, m - 1, g);
  }

  /** Lunedi=1 ... Domenica=7 (ISO) */
  function weekdayISO(iso) {
    const d = isoToData(iso);
    const js = d.getDay(); // 0=Domenica..6=Sabato
    return js === 0 ? 7 : js;
  }

  function addGiorni(iso, n) {
    const d = isoToData(iso);
    d.setDate(d.getDate() + n);
    return dataToISO(d);
  }

  function addMesi(iso, n) {
    const d = isoToData(iso);
    const giornoOriginale = d.getDate();
    d.setDate(1); // evita overflow (es. 31 gennaio + 1 mese)
    d.setMonth(d.getMonth() + n);
    const ultimoGiornoMese = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(giornoOriginale, ultimoGiornoMese));
    return dataToISO(d);
  }

  function addAnni(iso, n) {
    const d = isoToData(iso);
    d.setFullYear(d.getFullYear() + n);
    return dataToISO(d);
  }

  function differenzaGiorni(isoA, isoB) {
    // isoB - isoA, in giorni interi
    return Math.round((isoToData(isoB) - isoToData(isoA)) / 86400000);
  }

  function fineSettimana(iso) {
    const wd = weekdayISO(iso); // 1..7
    return addGiorni(iso, 7 - wd);
  }

  function fineMese(iso) {
    const d = isoToData(iso);
    const fine = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return dataToISO(fine);
  }

  function fineAnno(iso) {
    const d = isoToData(iso);
    return `${d.getFullYear()}-12-31`;
  }

  function formatDataBreve(iso) {
    const d = isoToData(iso);
    return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
  }

  function formatDataEstesa(iso) {
    const d = isoToData(iso);
    return `${NOMI_GIORNI_ESTESI[weekdayISO(iso) - 1]} ${d.getDate()} ${NOMI_MESI[d.getMonth()]}`;
  }

  function formatOraMinutiInGiorno(minuti) {
    const h = Math.floor(minuti / 60);
    const m = minuti % 60;
    return `${pad2(h)}:${pad2(m)}`;
  }

  function oraToMinuti(oraStr) {
    // "HH:MM" -> minuti da mezzanotte
    if (!oraStr) return null;
    const [h, m] = oraStr.split(':').map(Number);
    return h * 60 + m;
  }

  function minutiAdesso() {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }

  /** Restituisce l'elenco di date ISO (YYYY-MM-DD) di un mese, dato un qualsiasi giorno ISO di quel mese */
  function giorniDelMese(isoDelMese) {
    const d = isoToData(isoDelMese);
    const anno = d.getFullYear(), mese = d.getMonth();
    const numGiorni = new Date(anno, mese + 1, 0).getDate();
    const risultato = [];
    for (let g = 1; g <= numGiorni; g++) risultato.push(dataToISO(new Date(anno, mese, g)));
    return risultato;
  }

  function primoGiornoMese(isoDelMese) {
    const d = isoToData(isoDelMese);
    return dataToISO(new Date(d.getFullYear(), d.getMonth(), 1));
  }

  function meseSuccessivo(isoDelMese, delta) {
    const d = isoToData(isoDelMese);
    return dataToISO(new Date(d.getFullYear(), d.getMonth() + delta, 1));
  }

  function nomeMeseAnno(isoDelMese) {
    const d = isoToData(isoDelMese);
    return `${NOMI_MESI[d.getMonth()]} ${d.getFullYear()}`;
  }

  /** Converte un nome giorno italiano (o abbreviato) in numero ISO 1-7; ritorna null se non riconosciuto */
  const MAPPA_NOMI_GIORNO = {
    lunedi: 1, lun: 1, martedi: 2, mar: 2, mercoledi: 3, mer: 3,
    giovedi: 4, gio: 4, venerdi: 5, ven: 5, sabato: 6, sab: 6, domenica: 7, dom: 7
  };
  function giornoDaTesto(testo) {
    if (typeof testo === 'number') return testo >= 1 && testo <= 7 ? testo : null;
    if (!testo) return null;
    const pulito = String(testo).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    return MAPPA_NOMI_GIORNO[pulito] || null;
  }

  return {
    NOMI_GIORNI, NOMI_GIORNI_ESTESI, NOMI_MESI,
    pad2, oggiISO, dataToISO, isoToData, weekdayISO,
    addGiorni, addMesi, addAnni, differenzaGiorni, fineSettimana, fineMese, fineAnno,
    formatDataBreve, formatDataEstesa, formatOraMinutiInGiorno,
    oraToMinuti, minutiAdesso,
    giorniDelMese, primoGiornoMese, meseSuccessivo, nomeMeseAnno, giornoDaTesto
  };
})();

window.DataUtils = DataUtils;
