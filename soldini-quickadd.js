/* Soldini V9 — apertura rapida attraverso l'unica funzione nativa.
   Non modifica il salvataggio Firebase e non apre il form manualmente. */
(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const modalOpen = () => {
    const m = byId('tx-modal');
    return Boolean(m && !m.classList.contains('hidden'));
  };
  const notice = text => {
    const area = byId('tx-error');
    if (area && modalOpen()) area.textContent = text;
    else window.alert(text);
  };
  function openNew() {
    const add = byId('add');
    const form = byId('tx-form');
    if (!add || !form || typeof add.onclick !== 'function') {
      notice('L’app non è ancora pronta. Aggiorna la pagina e riprova.');
      return;
    }
    // L'handler originale chiama openTx(null), che azzera lo stato editing.
    // Non aprire manualmente la modale: si rischia di salvare sul vecchio record.
    add.click();
    if (!modalOpen()) {
      notice('Impossibile aprire il modulo: aggiorna la pagina e riprova.');
      return;
    }
    // La scelta dello spazio viene fatta DOPO la preparazione nativa del modulo.
    const current = byId('space-select');
    const target = byId('tx-space');
    if (current && target && current.value !== 'global' &&
        [...target.options].some(o => o.value === current.value)) {
      target.value = current.value;
    }
  }
  function init() {
    const anchor = document.querySelector('#app .hello');
    if (!anchor) return false;
    let button = byId('soldini-quickadd');
    if (!button) {
      button = document.createElement('button');
      button.id = 'soldini-quickadd';
      button.type = 'button';
      button.textContent = '＋ Aggiungi movimento';
      anchor.insertAdjacentElement('afterend',button);
    }
    button.onclick = openNew;
    // Non aggiungere un listener al pulsante inferiore: gestito da app.js.
    return true;
  }
  if (!init()) {
    const observer = new MutationObserver(() => {
      if (init()) observer.disconnect();
    });
    observer.observe(document.documentElement, {childList:true,subtree:true});
  }
})();
