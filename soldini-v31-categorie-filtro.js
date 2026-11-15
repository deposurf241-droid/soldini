/* Soldini V31: nasconde solo due suggerimenti per Negozio > Entrata.
   Non tocca Firestore, movimenti salvati, altre categorie o grafici. */
(() => {
  'use strict';
  const excluded = new Set(['incisione', 'incassatore']);
  const norm = value => String(value || '')
    .normalize('NFKC').trim().toLocaleLowerCase('it-IT')
    .replace(/\s+/g, ' ');

  const get = id => document.getElementById(id);
  const correctContext = () => {
    const space = get('tx-space');
    const choice = space && space.selectedOptions && space.selectedOptions[0];
    const isShop = Boolean(choice && /\bnegozio\b/i.test(choice.textContent || ''));
    const income = Boolean(document.querySelector('input[name="kind"][value="income"]:checked'));
    return isShop && income;
  };

  let scheduled = false;
  const filter = () => {
    scheduled = false;
    const list = get('v7-category-list');
    if (!list) return;
    const hide = correctContext();
    // La lista può essere aggiornata da moduli precedenti in qualsiasi momento.
    // Nascondiamo solo i due elementi esatti, non i fornitori con nomi simili.
    for (const item of list.querySelectorAll('.v7-category-choice, button[role="option"]')) {
      const label = item.querySelector('span:last-child');
      const value = norm(label ? label.textContent : item.textContent);
      const mustHide = hide && excluded.has(value);
      if (item.hidden !== mustHide) item.hidden = mustHide;
      if (mustHide && item.style.display !== 'none') item.style.display = 'none';
      else if (!mustHide && item.style.display === 'none') item.style.display = '';
    }
  };
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(filter);
  };
  const install = () => {
    const list = get('v7-category-list');
    if (!list) return;
    new MutationObserver(schedule).observe(list, { childList: true, subtree: true });
    document.addEventListener('change', schedule, true);
    document.addEventListener('click', schedule, true);
    document.addEventListener('input', schedule, true);
    filter();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
