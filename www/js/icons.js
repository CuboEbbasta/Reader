/**
 * icons.js
 * Set minimo di icone lineari coerenti (SVG inline, stesso spessore tratto),
 * al posto delle emoji: più coerente tra dispositivi e meno "già visto".
 */
const Icone = (function () {
  const TRACCIATI = {
    oggi: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v3M12 18.5v3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M2.5 12h3M18.5 12h3M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"/>',
    fare: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8.5 12.5l2.3 2.3L16 9.3"/>',
    salute: '<path d="M3 12h4l1.8 5 3.4-10 1.8 5H21"/>',
    crescita: '<path d="M4 21V11M12 21V5M20 21v-8"/><path d="M2 21h20"/>',
    altro: '<circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/>',
    check: '<path d="M4.5 12.5l4.5 4.5L19.5 6"/>',
    cross: '<path d="M6 6l12 12M18 6L6 18"/>',
    edit: '<path d="M4 20l0.8-3.6L15.5 5.7a1.5 1.5 0 0 1 2.1 0l0.7 0.7a1.5 1.5 0 0 1 0 2.1L7.6 19.2 4 20z"/><path d="M14 7.5l2.5 2.5"/>',
    add: '<path d="M12 5v14M5 12h14"/>',
    delete: '<path d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0-0.9 12.1a1 1 0 0 1-1 0.9H8.9a1 1 0 0 1-1-0.9L7 7"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.2M12 18.3v2.2M4.9 4.9l1.5 1.5M17.6 17.6l1.5 1.5M3.5 12h2.2M18.3 12h2.2M4.9 19.1l1.5-1.5M17.6 6.4l1.5-1.5"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    tappa: '<path d="M6 2v20"/><path d="M6 4h11l-2.2 3.5L17 11H6"/>',
    duplica: '<rect x="8.5" y="8.5" width="11" height="11" rx="1.5"/><path d="M4.5 15.5v-10a1 1 0 0 1 1-1h10"/>',
    indietro: '<path d="M15 5l-7 7 7 7"/>',
    avanti: '<path d="M9 5l7 7-7 7"/>',
    cartella: '<path d="M3.5 6.5a1 1 0 0 1 1-1h4.5l1.6 2H19a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1V6.5z"/>',
    chevronSu: '<path d="M6 15l6-6 6 6"/>',
    chevronGiu: '<path d="M6 9l6 6 6-6"/>',
    esporta: '<path d="M12 15V3M7 8l5-5 5 5"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>'
  };

  function svg(nome, dimensione) {
    const d = dimensione || 18;
    const contenuto = TRACCIATI[nome];
    if (!contenuto) return '';
    return `<svg class="icona" width="${d}" height="${d}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${contenuto}</svg>`;
  }

  return { svg, elenco: Object.keys(TRACCIATI) };
})();

window.Icone = Icone;
