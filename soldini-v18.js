/* Soldini V21 — solo grafica e navigazione.
   NON tocca app.js, Firebase, movimenti, grafici o saldi.
   Le ciambelle originali sono gestite esclusivamente da soldini-v4.js. */
const sd21 = selector => document.querySelector(selector);
const sd21All = selector => [...document.querySelectorAll(selector)];

function sd21Shortcuts(){
  const holder=sd21('#sd18-shortcuts');
  if(!holder)return;
  const links=[
    ['#s12-report-open','📸 Resoconto'],
    ['#v4-rec-button','🔁 Ricorrenti'],
    ['#soldini-categories-btn','🏷️ Categorie'],
    ['#v5-vat-btn','🧾 IVA']
  ];
  for(const [selector,label] of links){
    const button=sd21(selector);
    if(!button)continue;
    if(button.parentElement!==holder){
      holder.appendChild(button);
    }
    if(button.textContent!==label)button.textContent=label;
  }
}

function sd21BottomNav(){
  const nav=sd21('#sd18-bottom-nav');
  if(!nav||nav.dataset.initialized)return;
  const items=[
    {id:'home',label:'Home',icon:'🏠',target:()=>sd21('#sd18-home-section')},
    {id:'saldo',label:'Saldo',icon:'💶',target:()=>sd21('.stats')},
    {id:'grafici',label:'Grafici',icon:'📈',target:()=>sd21('#v5-line')?.closest('.card')||sd21('#sd18-trend-section')},
    {id:'movimenti',label:'Movimenti',icon:'🧾',target:()=>sd21('#transactions')?.closest('.card')}
  ];
  nav.innerHTML=items.map(item=>`<button type="button" data-sd21-nav="${item.id}"><span class="sd18-ico">${item.icon}</span><span>${item.label}</span></button>`).join('');
  nav.dataset.initialized='1';
  nav.addEventListener('click',e=>{
    const button=e.target.closest('[data-sd21-nav]');
    if(!button)return;
    const item=items.find(i=>i.id===button.dataset.sd21Nav);
    const target=item?.target();
    if(target)target.scrollIntoView({behavior:'smooth',block:'start'});
    sd21All('#sd18-bottom-nav button').forEach(b=>b.classList.toggle('active',b===button));
  });
  function update(){
    const app=sd21('#app');
    if(!app||app.classList.contains('hidden')){nav.classList.add('hidden');return;}
    nav.classList.remove('hidden');
    let selected='home';
    for(const item of items){
      const target=item.target();
      if(target && target.getBoundingClientRect().top<=innerHeight*.35)selected=item.id;
    }
    sd21All('#sd18-bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.sd21Nav===selected));
  }
  addEventListener('scroll',update,{passive:true});
  addEventListener('resize',update);
  setInterval(update,1600);
  update();
}

function sd21Boot(){
  sd21BottomNav();
  sd21Shortcuts();
  // Le estensioni V17 inseriscono i pulsanti dopo il caricamento.
  // Cerchiamo solo quei quattro pulsanti, senza osservare né riscrivere i movimenti.
  let tries=0;
  const timer=setInterval(()=>{
    sd21Shortcuts();
    if(++tries>=35)clearInterval(timer);
  },500);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sd21Boot,{once:true});
else sd21Boot();
