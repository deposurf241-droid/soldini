/* Soldini V32: filtra i suggerimenti, senza toccare i movimenti.
   Negozio/Entrata: nasconde Incisione e Incassatore.
   Casa/Spesa: nasconde solo Farmacia e Teatro, NON Spese mediche e farmacia. */
(() => {
  'use strict';
  const excludedShopIncome = new Set(['incisione', 'incassatore']);
  const excludedHouseExpense = new Set(['farmacia', 'teatro']);
  const norm = value => String(value || '')
    .normalize('NFKC').trim().toLocaleLowerCase('it-IT').replace(/\s+/g, ' ');
  const get = id => document.getElementById(id);
  const excludedInContext = () => {
    const space = get('tx-space');
    const choice = space?.selectedOptions?.[0];
    const label = norm(choice?.textContent);
    const income = Boolean(document.querySelector('input[name="kind"][value="income"]:checked'));
    if (/\bnegozio\b/.test(label) && income) return excludedShopIncome;
    if (/\bcasa\b/.test(label) && !income) return excludedHouseExpense;
    return null;
  };
  let scheduled = false;
  const filter = () => {
    scheduled = false;
    const list = get('v7-category-list');
    if (!list) return;
    const excluded = excludedInContext();
    for (const item of list.querySelectorAll('.v7-category-choice, button[role="option"]')) {
      const label = item.querySelector('span:last-child');
      const value = norm(label ? label.textContent : item.textContent);
      const mustHide = Boolean(excluded?.has(value));
      if (item.hidden !== mustHide) item.hidden = mustHide;
      if (mustHide && item.style.display !== 'none') item.style.display = 'none';
      if (!mustHide && item.style.display === 'none') item.style.display = '';
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
    new MutationObserver(schedule).observe(list, {childList:true, subtree:true});
    document.addEventListener('change', schedule, true);
    document.addEventListener('click', schedule, true);
    document.addEventListener('input', schedule, true);
    filter();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
})();
