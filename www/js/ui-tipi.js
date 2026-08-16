/**
 * ui-tipi.js
 * Selettore "tipo di attività" condiviso tra Routine e Task. I 4 tipi
 * protetti (Allenamento, Pasto, Sonno, Diario) non si possono eliminare;
 * l'utente può crearne altri al volo direttamente dal form, senza uscirne
 * (niente foglio separato: una mini-form inline appare sotto la select).
 */
const UiTipi = (function () {
  const COLORI_PROTETTI = { allenamento: '#B24F3C', pasto: '#B8863E', sonno: '#5B6BB0', diario: '#2F7D6E' };

  function opzioniHtml(tipoSelezionato) {
    const tipi = Dati.stato().tipiAttivita;
    let html = `<option value="altro" ${(!tipoSelezionato || tipoSelezionato === 'altro') ? 'selected' : ''}>Altro</option>`;
    html += tipi.map(t => `<option value="${t.id}" ${tipoSelezionato === t.id ? 'selected' : ''}>${UiRoutine.escapeHtml(t.nome)}</option>`).join('');
    html += `<option value="__nuovo__">+ Nuovo tipo…</option>`;
    return html;
  }

  /** Da inserire subito dopo il <select id="{selectId}"> nel markup del form */
  function htmlCreazioneInline(selectId) {
    return `
      <div id="nuovo-tipo-${selectId}" class="campo" style="display:none;margin-top:8px;">
        <label>Nome del nuovo tipo</label>
        <div class="riga-btn">
          <input type="text" id="input-nuovo-tipo-${selectId}" placeholder="Es. Università" style="flex:1;">
          <button type="button" class="btn btn-sm btn-accent" id="btn-crea-tipo-${selectId}">Crea</button>
        </div>
      </div>`;
  }

  /** Da chiamare dopo aver inserito il markup nel DOM, per collegare gli eventi */
  function wireSelect(selectId) {
    const select = document.getElementById(selectId);
    const box = document.getElementById('nuovo-tipo-' + selectId);
    const input = document.getElementById('input-nuovo-tipo-' + selectId);
    const btnCrea = document.getElementById('btn-crea-tipo-' + selectId);
    if (!select || !box) return;
    let valorePrecedente = select.value;

    select.addEventListener('change', () => {
      if (select.value === '__nuovo__') {
        box.style.display = '';
        input.value = '';
        input.focus();
      } else {
        valorePrecedente = select.value;
        box.style.display = 'none';
      }
    });

    btnCrea.addEventListener('click', async () => {
      const nome = input.value.trim();
      if (!nome) { window.App.mostraToast('Dai un nome al tipo.'); return; }
      const id = await Dati.aggiungiTipoAttivita(nome);
      select.innerHTML = opzioniHtml(id);
      valorePrecedente = id;
      box.style.display = 'none';
    });
  }

  function nomeTipo(id) {
    if (!id || id === 'altro') return 'Altro';
    const t = Dati.stato().tipiAttivita.find(x => x.id === id);
    return t ? t.nome : 'Altro';
  }

  function coloreTipo(id) {
    return COLORI_PROTETTI[id] || '#8a8f9e';
  }

  return { opzioniHtml, htmlCreazioneInline, wireSelect, nomeTipo, coloreTipo };
})();

window.UiTipi = UiTipi;
