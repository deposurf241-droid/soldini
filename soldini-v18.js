/* Soldini V18 — miglioramenti grafici non distruttivi */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

let booted = false;

function ensureBottomNav(){
  const nav = $('#sd18-bottom-nav');
  const app = $('#app');
  if(!nav || !app) return;

  const items = [
    { id:'home', icon:'🏠', label:'Home', getTarget:()=>$('#sd18-home-section') || $('.hello') },
    { id:'saldo', icon:'💶', label:'Saldo', getTarget:()=>$('#sd18-summary-section') || $('.stats') },
    { id:'grafici', icon:'📈', label:'Grafici', getTarget:()=>$('#v5-line')?.closest('.card') || $('#sd18-trend-section') },
    { id:'movimenti', icon:'🧾', label:'Movimenti', getTarget:()=>$('#transactions')?.closest('.card') }
  ];

  if(!nav.dataset.ready){
    nav.innerHTML = items.map(item =>
      `<button type="button" data-target="${item.id}"><span class="sd18-ico">${item.icon}</span><span>${item.label}</span></button>`
    ).join('');
    nav.dataset.ready = '1';
    nav.classList.remove('hidden');

    nav.addEventListener('click', e => {
      const btn = e.target.closest('button[data-target]');
      if(!btn) return;
      const item = items.find(x => x.id === btn.dataset.target);
      const target = item?.getTarget();
      if(target){
        target.scrollIntoView({behavior:'smooth', block:'start'});
      }
    });

    const setActive = () => {
      const buttons = $$(`#${nav.id} button[data-target]`);
      let activeId = 'home';
      for(const item of items){
        const target = item.getTarget();
        if(!target) continue;
        const rect = target.getBoundingClientRect();
        if(rect.top <= window.innerHeight * 0.35){
          activeId = item.id;
        }
      }
      buttons.forEach(btn => btn.classList.toggle('active', btn.dataset.target === activeId));
    };
    window.addEventListener('scroll', setActive, {passive:true});
    window.addEventListener('resize', setActive);
    setTimeout(setActive, 600);
  }
}

function compactActionButtons(){
  const holder = $('#sd18-shortcuts');
  if(!holder) return;
  const candidates = [
    ['#s12-report-open', '📸 Resoconto'],
    ['#v4-rec-button', '🔁 Ricorrenti'],
    ['#soldini-categories-btn', '🏷️ Categorie']
  ];

  candidates.forEach(([selector, label]) => {
    const button = $(selector);
    if(button && button.parentElement !== holder){
      button.textContent = label;
      holder.appendChild(button);
    }
  });

  holder.hidden = holder.children.length === 0;
}

function enhanceTxRows(){
  $$('#transactions .tx-row').forEach(row => {
    if(row.dataset.sd18done === '1') return;
    row.dataset.sd18done = '1';

    const amount = row.querySelector('.tx-amount');
    if(amount){
      row.classList.add(amount.classList.contains('pos') ? 'sd18-income' : 'sd18-expense');
    }

    const meta = row.querySelector('.tx-info small');
    if(meta){
      const tokens = meta.textContent.split('·').map(x => x.trim()).filter(Boolean);
      if(tokens.length){
        meta.innerHTML = tokens.map((token, index) => {
          const extra = index >= 2 ? ' sd18-pill-note' : '';
          return `<span class="sd18-meta-pill${extra}">${escapeHtml(token)}</span>`;
        }).join('');
      }
    }
  });
}

function tagCards(){
  const incomeCard = $('#v4-income-chart')?.closest('.card');
  const expenseCard = $('#categories')?.closest('.card');
  const lineCard = $('#v5-line')?.closest('.card');
  if(incomeCard) incomeCard.classList.add('sd18-income-donut-card');
  if(expenseCard) expenseCard.classList.add('sd18-expense-donut-card');
  if(lineCard) lineCard.classList.add('sd18-cumulative-card');

  const lineTitle = lineCard?.querySelector('h2');
  if(lineTitle && !lineTitle.dataset.sd18done){
    lineTitle.dataset.sd18done = '1';
    if(!/cumulative/i.test(lineTitle.textContent)){
      lineTitle.textContent = '📈 Entrate e spese cumulative nel tempo';
    }
  }
}

function enhanceQuickHints(){
  const note = $('#v5-note');
  if(note && !note.dataset.sd18done){
    note.dataset.sd18done = '1';
    if(!note.textContent.trim()){
      note.textContent = 'Tocca i punti del grafico per leggere meglio l’andamento del periodo.';
    }
    note.classList.add('v5-note-strong');
  }
}

function escapeHtml(x){
  return String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function observe(){
  const tx = $('#transactions');
  if(tx && !tx.dataset.sd18observe){
    tx.dataset.sd18observe = '1';
    new MutationObserver(() => enhanceTxRows()).observe(tx, {childList:true, subtree:true});
  }

  const app = $('#app');
  if(app && !app.dataset.sd18observe){
    app.dataset.sd18observe = '1';
    new MutationObserver(() => {
      compactActionButtons();
      tagCards();
      ensureBottomNav();
      enhanceQuickHints();
    }).observe(app, {childList:true, subtree:true});
  }
}

function boot(){
  if(booted) return;
  const app = $('#app');
  if(!app){
    setTimeout(boot, 300);
    return;
  }
  booted = true;
  compactActionButtons();
  enhanceTxRows();
  tagCards();
  ensureBottomNav();
  enhanceQuickHints();
  observe();

  // Some modules insert buttons later.
  setInterval(() => {
    compactActionButtons();
    tagCards();
    enhanceQuickHints();
  }, 1200);
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
