/* Soldini — pulsante Aggiungi rapido (estensione non distruttiva). */
(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const modal = () => $('#tx-modal');
  const original = () => $('#add');
  const isHidden = (el) => !el || el.classList.contains('hidden');
  function localDate() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
  }
  function selectCurrentSpace() {
    const current = $('#space-select');
    const target = $('#tx-space');
    if (!current || !target) return;
    const value = current.value;
    if (Array.from(target.options).some(o => o.value === value)) {
      target.value = value;
      target.dispatchEvent(new Event('change', {bubbles:true}));
    }
  }
  function openNewMovement() {
    const sheet = modal();
    if (!sheet) return;
    const native = original();
    if (native && native !== document.activeElement) native.click();
    // Compatibilità con versioni nelle quali il click originale non apre la scheda.
    if (isHidden(sheet)) {
      const form = $('#tx-form');
      if (form) form.reset();
      const title = $('#tx-title');
      if (title) title.textContent = 'Nuovo movimento';
      const date = $('#date');
      if (date) date.value = localDate();
      const del = $('#delete-tx');
      if (del) del.classList.add('hidden');
      const err = $('#tx-error');
      if (err) err.textContent = '';
      sheet.classList.remove('hidden');
    }
    selectCurrentSpace();
    const amount = $('#amount');
    if (amount) setTimeout(() => {try {amount.focus({preventScroll:true});} catch (_) {}}, 60);
  }
  function init() {
    const hello = $('#app .hello');
    if (!hello || $('#soldini-quickadd')) return false;
    const btn = document.createElement('button');
    btn.id = 'soldini-quickadd';
    btn.type = 'button';
    btn.textContent = '＋ Aggiungi movimento';
    btn.addEventListener('click', openNewMovement);
    hello.insertAdjacentElement('afterend', btn);
    const orig = original();
    if (orig) {
      // Fallback anche per il pulsante in basso, senza rimuovere i listener esistenti.
      orig.addEventListener('click', () => {
        if (isHidden(modal())) {
          // Non richiamare orig.click() da qui.
          const form = $('#tx-form');
          if (form) form.reset();
          const title = $('#tx-title');
          if (title) title.textContent = 'Nuovo movimento';
          const date = $('#date');
          if (date) date.value = localDate();
          $('#delete-tx')?.classList.add('hidden');
          modal()?.classList.remove('hidden');
          selectCurrentSpace();
        }
      });
    }
    return true;
  }
  if (!init()) {
    const observer = new MutationObserver(() => {if (init()) observer.disconnect();});
    observer.observe(document.documentElement, {subtree:true,childList:true});
  }
})();
