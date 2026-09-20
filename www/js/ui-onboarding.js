/**
 * ui-onboarding.js
 * Breve giro di presentazione mostrato una sola volta, alla primissima
 * apertura dell'app, prima di chiedere i permessi di notifica. Al termine
 * chiama la funzione ricevuta da app.js per completare l'avvio (permessi +
 * apertura della vista "Oggi").
 */
const UiOnboarding = (function () {
  const SLIDE = [
    { titolo: 'Benvenuto', testo: 'Un solo posto per organizzare giornate, allenamento, alimentazione e obiettivi — tutto offline, i dati restano sul tuo dispositivo.' },
    { titolo: 'Oggi', testo: 'La tua giornata a colpo d\'occhio: routine, orari fissi e task in scadenza, con un piccolo riepilogo di quanto hai già fatto.' },
    { titolo: 'Fare', testo: 'Routine (quello che ripeti ogni giorno), Task (scadenze una tantum, anche a settimane/mesi/anni di distanza) e Orario fisso (lezioni, lavoro).' },
    { titolo: 'Salute', testo: 'Dieta con piano settimanale e log dei pasti, schede di allenamento su misura, e il registro del sonno.' },
    { titolo: 'Crescita', testo: 'Obiettivi da un mese a dieci anni, con tappe personalizzabili, e un diario serale con un piccolo resoconto automatico.' },
    { titolo: 'Altro', testo: 'Panoramica su mese/anno e storico, un assistente IA opzionale, e tutte le impostazioni — incluso il tema scuro.' }
  ];
  let indice = 0;
  let callbackFine = null;

  function render() {
    const s = SLIDE[indice];
    const ultimo = indice === SLIDE.length - 1;
    document.getElementById('onboarding-corpo').innerHTML = `
      <div class="onboarding-puntini">
        ${SLIDE.map((_, i) => `<span class="onboarding-puntino ${i === indice ? 'attivo' : ''}"></span>`).join('')}
      </div>
      <h1 class="onboarding-titolo">${s.titolo}</h1>
      <p class="onboarding-testo">${s.testo}</p>
      <div class="riga-btn" style="margin-top:22px;">
        ${indice > 0 ? '<button class="btn btn-ghost" id="btn-onboarding-indietro">Indietro</button>' : ''}
        <button class="btn btn-primary btn-block" id="btn-onboarding-avanti">${ultimo ? 'Inizia' : 'Avanti'}</button>
      </div>
    `;
    document.getElementById('btn-onboarding-avanti').addEventListener('click', async () => {
      if (ultimo) { await chiudi(); } else { indice++; render(); }
    });
    const btnIndietro = document.getElementById('btn-onboarding-indietro');
    if (btnIndietro) btnIndietro.addEventListener('click', () => { indice--; render(); });
  }

  async function chiudi() {
    document.getElementById('overlay-onboarding').classList.remove('attivo');
    Dati.stato().impostazioni.onboardingCompletato = true;
    await Dati.salva();
    if (callbackFine) await callbackFine();
  }

  function avvia(onFine) {
    callbackFine = onFine;
    indice = 0;
    document.getElementById('overlay-onboarding').classList.add('attivo');
    render();
  }

  return { avvia };
})();

window.UiOnboarding = UiOnboarding;
