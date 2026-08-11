/**
 * dial.js
 * Il "quadrante" e' il grafico a torta delle 24 ore: ogni spicchio e' un blocco
 * di tempo (routine o task con orario), il resto e' "tempo libero".
 * Disegnato a mano in SVG (nessuna libreria esterna) cosi' funziona anche offline.
 */
const Quadrante = (function () {
  const COLORE_LIBERO = '#e6e0d3';

  function polareACartesiane(cx, cy, r, angoloGradi) {
    const rad = (angoloGradi - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function pathSpicchio(cx, cy, r, angoloIniziale, angoloFinale) {
    if (angoloFinale - angoloIniziale >= 359.99) {
      return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${(cx - 0.01).toFixed(2)} ${(cy - r).toFixed(2)} Z`;
    }
    const p1 = polareACartesiane(cx, cy, r, angoloIniziale);
    const p2 = polareACartesiane(cx, cy, r, angoloFinale);
    const arcoGrande = (angoloFinale - angoloIniziale) > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${r} ${r} 0 ${arcoGrande} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} Z`;
  }

  /** blocchi: [{inizioMin, fineMin, colore, nome, tipo, chiave}] non sovrapposti */
  function calcolaSpicchi(blocchi) {
    const ordinati = blocchi.slice().sort((a, b) => a.inizioMin - b.inizioMin);
    const spicchi = [];
    let cursore = 0;
    ordinati.forEach(b => {
      const inizio = Math.max(0, Math.min(1440, b.inizioMin));
      const fine = Math.max(0, Math.min(1440, b.fineMin));
      if (inizio > cursore) {
        spicchi.push({ inizioMin: cursore, fineMin: inizio, colore: COLORE_LIBERO, nome: 'Tempo libero', tipo: 'libero' });
      }
      if (fine > inizio) {
        spicchi.push({ inizioMin: inizio, fineMin: fine, colore: b.colore, nome: b.nome, tipo: b.tipo, chiave: b.chiave });
      }
      cursore = Math.max(cursore, fine);
    });
    if (cursore < 1440) {
      spicchi.push({ inizioMin: cursore, fineMin: 1440, colore: COLORE_LIBERO, nome: 'Tempo libero', tipo: 'libero' });
    }
    return spicchi;
  }

  function renderSVG(spicchi, minutiAdesso, size) {
    size = size || 280;
    const cx = size / 2, cy = size / 2, r = size / 2 - 28;

    const percorsi = spicchi.map(s => {
      const a0 = (s.inizioMin / 1440) * 360;
      const a1 = (s.fineMin / 1440) * 360;
      return `<path d="${pathSpicchio(cx, cy, r, a0, a1)}" fill="${s.colore}" stroke="#fff" stroke-width="1.5"><title>${s.nome}</title></path>`;
    }).join('');

    let tacche = '';
    [0, 3, 6, 9, 12, 15, 18, 21].forEach(h => {
      const angolo = (h / 24) * 360;
      const p1 = polareACartesiane(cx, cy, r + 7, angolo);
      const p2 = polareACartesiane(cx, cy, r + 14, angolo);
      const lbl = polareACartesiane(cx, cy, r + 24, angolo);
      tacche += `<line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" stroke="#9a9fb0" stroke-width="1.5"/>`;
      tacche += `<text x="${lbl.x.toFixed(1)}" y="${lbl.y.toFixed(1)}" font-size="10" font-family="monospace" fill="#9a9fb0" text-anchor="middle" dominant-baseline="middle">${DataUtils.pad2(h)}</text>`;
    });

    let lancetta = '';
    if (typeof minutiAdesso === 'number') {
      const angoloAdesso = (minutiAdesso / 1440) * 360;
      const punta = polareACartesiane(cx, cy, r - 6, angoloAdesso);
      lancetta = `<line x1="${cx}" y1="${cy}" x2="${punta.x.toFixed(1)}" y2="${punta.y.toFixed(1)}" stroke="#23293a" stroke-width="2.5" stroke-linecap="round"/>
                  <circle cx="${cx}" cy="${cy}" r="4.5" fill="#23293a" />`;
    }

    return `<svg class="quadrante-svg" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${cx}" cy="${cy}" r="${r + 1}" fill="#fff" />
      ${percorsi}
      ${tacche}
      ${lancetta}
    </svg>`;
  }

  return { calcolaSpicchi, renderSVG, COLORE_LIBERO };
})();

window.Quadrante = Quadrante;
