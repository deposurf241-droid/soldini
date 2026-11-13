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
    ['#soldini-categories-btn', '🏷️ Categorie'],
    ['#v5-vat-btn', '🧾 IVA']
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

// La lista dei movimenti è gestita esclusivamente da app.js.
// V20 non la ricostruisce e non modifica le sue righe o i relativi eventi click.
function enhanceTxRows(){}

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


// V20: ripristina in modo isolato le ciambelle originali V17.
// Un solo osservatore sulla lista; niente osservatori incrociati sui grafici.
const sd20Palette=['#f78ea9','#ffca78','#78c9a9','#95b9f4','#bda2ef','#efaa83','#7dd7d5','#d7bf9f','#d797c9','#a4c885'];
const sd20EUR=n=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(n);
let sd20Timer=0, sd20LastSignature='';
function sd20ReadData(){
  const obj={income:new Map(),expense:new Map()};
  $$('#transactions .tx-row').forEach(row=>{
    const elem=row.querySelector('.tx-amount');
    const kind=elem?.classList.contains('pos')?'income':'expense';
    const cat=row.querySelector('.tx-info b')?.textContent?.trim()||'Altro';
    const raw=(elem?.textContent||'').replace(/[^0-9,.-]/g,'').replace(/\./g,'').replace(',','.');
    const amount=Math.abs(Number(raw));
    if(Number.isFinite(amount)&&amount>0)obj[kind].set(cat,(obj[kind].get(cat)||0)+amount);
  });
  return obj;
}
function sd20Markup(map,kind){
  const entries=[...map.entries()].sort((a,b)=>b[1]-a[1]);
  const total=entries.reduce((sum,entry)=>sum+entry[1],0);
  if(!total)return `<div class="v4-empty">Nessun ${kind==='income'?'incasso':'pagamento'} nel periodo selezionato 🌷</div>`;
  let angle=0;
  const bg=entries.map(([,amount],i)=>{
    const begin=angle;
    angle+=amount/total*100;
    return `${sd20Palette[i%sd20Palette.length]} ${begin}% ${angle}%`;
  }).join(',');
  const rows=entries.map(([name,amount],i)=>`<div class="v4-legend-item"><i style="background:${sd20Palette[i%sd20Palette.length]}"></i><span>${escapeHtml(name)}</span><b>${(amount/total*100).toFixed(1).replace('.',',')}% <small>${escapeHtml(sd20EUR(amount))}</small></b></div>`).join('');
  return `<div class="v4-pie-wrap"><div class="v4-donut" style="background:conic-gradient(${bg})"><span><strong>${escapeHtml(sd20EUR(total))}</strong><small>${kind==='income'?'entrate':'spese'} totali</small></span></div><div class="v4-pie-legend">${rows}</div></div>`;
}
function sd20RenderPies(){
  const transactions=$('#transactions');
  const expense=$('#categories');
  const income=$('#v4-income-chart');
  if(!transactions||!expense||!income)return;
  // Non sovrascrivere grafici con risultati vuoti se Firebase sta ancora caricando.
  if(!transactions.querySelector('.tx-row'))return;
  const data=sd20ReadData();
  const signature=JSON.stringify([...[...data.expense],...[...data.income]]);
  if(signature!==sd20LastSignature || !expense.querySelector('.v4-donut') || !income.querySelector('.v4-donut, .v4-empty')){
    sd20LastSignature=signature;
    expense.innerHTML=sd20Markup(data.expense,'expense');
    income.innerHTML=sd20Markup(data.income,'income');
  }
}
function sd20Schedule(){
  clearTimeout(sd20Timer);
  sd20Timer=setTimeout(sd20RenderPies,120);
}
function sd20StartPies(){
  const history=$('#transactions');
  if(history&&!history.dataset.sd20watch){
    history.dataset.sd20watch='1';
    new MutationObserver(sd20Schedule).observe(history,{childList:true});
  }
  sd20Schedule();
}

function observe(){

  const app = $('#app');
  if(app && !app.dataset.sd18observe){
    app.dataset.sd18observe = '1';
    new MutationObserver(() => {
      compactActionButtons();
      tagCards();
      ensureBottomNav();
      enhanceQuickHints();
      sd20StartPies();
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
  sd20StartPies();

  // Some modules insert buttons later.
  setInterval(() => {
    compactActionButtons();
    tagCards();
    enhanceQuickHints();
    sd20StartPies();
  }, 1200);
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
