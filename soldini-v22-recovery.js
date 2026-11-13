/* Soldini V22 — Recupero visualizzazione movimenti V17.
   Non sostituisce l'app principale, non modifica regole, dati o Firebase config.
   Ripara soltanto l'elenco quando il rendering originale rimane vuoto.
   Le modifiche ed eliminazioni aprono un modulo dedicato solo per le righe recuperate. */
import {getApps} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {getFirestore,collection,query,where,onSnapshot,doc,updateDoc,deleteDoc} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

const V22 = sel => document.querySelector(sel);
const V22all = sel => [...document.querySelectorAll(sel)];
const v22esc = str => String(str??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const v22euro = n => new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(Number(n)||0);
const v22date = d => [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');

let v22User=null, v22Db=null, v22SpaceNames=new Map(), v22Personal=[], v22Shared=new Map();
let v22SpaceStop=null, v22PersonalStop=null, v22Stops=new Map(),v22DrawTimer=0;
function v22Stop(){
  if(v22SpaceStop){v22SpaceStop();v22SpaceStop=null;}
  if(v22PersonalStop){v22PersonalStop();v22PersonalStop=null;}
  for(const stop of v22Stops.values())stop();
  v22Stops.clear();v22Personal=[];v22Shared.clear();v22SpaceNames.clear();
}
function v22Schedule(){clearTimeout(v22DrawTimer);v22DrawTimer=setTimeout(v22Draw,240);}
function v22Scope(){return V22('#space-select')?.value||'global'}
function v22Filter(date){
  if(typeof date!=='string')return false;
  const selected=V22('.chip.active')?.dataset.period||'month';
  if(selected==='all')return true;
  const now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  let a,b;
  if(selected==='day'){a=b=v22date(today)}
  else if(selected==='week'){
    today.setDate(today.getDate()-(today.getDay()+6)%7);a=v22date(today);today.setDate(today.getDate()+6);b=v22date(today);
  }else if(selected==='month'){
    a=v22date(new Date(now.getFullYear(),now.getMonth(),1));
    b=v22date(new Date(now.getFullYear(),now.getMonth()+1,0));
  }else{a=V22('#from')?.value||'0000-01-01';b=V22('#to')?.value||'9999-12-31'}
  return date>=a&&date<=b;
}
function v22Visible(){
  const scope=v22Scope();
  const rows=scope==='personal'?v22Personal:scope==='global'?[...v22Shared.values()].flat():v22Shared.get(scope)||[];
  return rows.filter(t=>v22Filter(t.date)).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(b.id||'').localeCompare(String(a.id||'')));
}
function v22All(){return [...v22Personal,...[...v22Shared.values()].flat()]}
function v22Card(t){
  const name=t.scope==='personal'?'Personale':v22SpaceNames.get(t.scope)||'Condiviso';
  const inc=t.kind==='income';
  const day=String(t.date||'').split('-').reverse().join('/');
  const note=String(t.note||'').trim();
  const secondary=[day,name,note].filter(Boolean).map(s=>`<span class="sd18-meta-pill">${v22esc(s)}</span>`).join('');
  return `<div class="tx-row v22-recovered-row" data-id="${v22esc(t.id)}" data-scope="${v22esc(t.scope)}" tabindex="0" role="button" aria-label="Modifica ${v22esc(t.category||'movimento')}">
    <div class="tx-icon">${inc?'🤑':'😢💸'}</div>
    <div class="tx-info"><b>${v22esc(t.category||'Senza categoria')}</b><small>${secondary}</small></div>
    <div class="tx-amount ${inc?'pos':'neg'}">${inc?'+':'−'}${v22euro(t.amount)}</div>
  </div>`;
}
const v22Colors=['#f78ea9','#ffca78','#78c9a9','#95b9f4','#bda2ef','#efaa83','#7dd7d5','#d7bf9f','#d797c9','#a4c885'];
function v22DonutHtml(rows,kind){
  const totals=new Map();
  for(const t of rows){
    if(t.kind!==kind)continue;
    const amount=Number(t.amount);
    if(!Number.isFinite(amount)||amount<=0)continue;
    const name=String(t.category||'Senza categoria').trim()||'Senza categoria';
    totals.set(name,(totals.get(name)||0)+amount);
  }
  const ordered=[...totals.entries()].sort((a,b)=>b[1]-a[1]);
  const total=ordered.reduce((s,entry)=>s+entry[1],0);
  if(!total)return `<div class="v4-empty">Nessun ${kind==='income'?'incasso':'pagamento'} nel periodo selezionato 🌷</div>`;
  let percentage=0;
  const parts=ordered.map(([,value],i)=>{
    const from=percentage;
    percentage+=100*value/total;
    return `${v22Colors[i%v22Colors.length]} ${from}% ${percentage}%`;
  }).join(',');
  return `<div class="v4-pie-wrap"><div class="v4-donut" style="background:conic-gradient(${parts})"><span><strong>${v22esc(v22euro(total))}</strong><small>${kind==='income'?'entrate':'spese'} totali</small></span></div><div class="v4-pie-legend">${ordered.map(([name,value],i)=>`<div class="v4-legend-item"><i style="background:${v22Colors[i%v22Colors.length]}"></i><span>${v22esc(name)}</span><b>${(100*value/total).toFixed(1).replace('.',',')}% <small>${v22esc(v22euro(value))}</small></b></div>`).join('')}</div></div>`;
}
function v22DrawPies(rows){
  const expense=V22('#categories');
  if(!expense)return;
  let income=V22('#v4-income-chart');
  if(!income){
    // The V17 module normally creates this card. Restore if a delayed loader did not.
    const card=expense.closest('.card');
    if(card){
      const section=document.createElement('div');section.className='card';section.id='v22-income-card';
      section.innerHTML='<div class="section-title"><h2>🤑 Da dove arrivano le entrate</h2></div><div id="v4-income-chart"></div>';
      card.insertAdjacentElement('afterend',section);
      income=section.querySelector('#v4-income-chart');
    }
  }
  expense.innerHTML=v22DonutHtml(rows,'expense');
  if(income)income.innerHTML=v22DonutHtml(rows,'income');
}
function v22Draw(){
  if(!v22User)return;
  const host=V22('#transactions');if(!host)return;
  const rows=v22Visible();
  // If the original renderer works, NEVER replace its interactive rows.
  if(host.querySelector('.tx-row:not(.v22-recovered-row)'))return;
  if(rows.length){
    const signature=rows.map(t=>`${t.scope}/${t.id}/${t.amount}/${t.date}/${t.category}/${t.note}/${t.kind}`).join('|');
    if(host.dataset.v22Signature===signature && host.querySelector('.v22-recovered-row'))return;
    host.dataset.v22Signature=signature;
    host.innerHTML=rows.map(v22Card).join('');
    v22DrawPies(rows);
  }else if(host.querySelector('.v22-recovered-row')){
    delete host.dataset.v22Signature;
    host.innerHTML='<p class="empty">Nessun movimento nel periodo selezionato 🌷</p>';
  }
}
function v22Open(t){
  if(!t||!v22User)return;
  if(V22('#v22-overlay'))return;
  const modal=document.createElement('div');modal.id='v22-overlay';modal.className='v4-overlay';
  modal.style.zIndex='100020';
  modal.innerHTML=`<div class="v4-sheet" style="max-width:560px">
    <button class="v4-close" type="button" id="v22-close" aria-label="Chiudi">✕</button>
    <h2>✏️ Modifica movimento</h2><p style="color:#907987;font-size:13px">${v22esc(t.scope==='personal'?'Personale':v22SpaceNames.get(t.scope)||'Spazio condiviso')}</p>
    <form id="v22-edit">
      <label>Tipo<select name="kind"><option value="expense" ${t.kind==='expense'?'selected':''}>😢💸 Spesa</option><option value="income" ${t.kind==='income'?'selected':''}>🤑 Entrata</option></select></label>
      <label>Importo (€)<input name="amount" type="number" min="0.01" step="0.01" inputmode="decimal" value="${v22esc(t.amount)}" required></label>
      <label>Categoria<input name="category" maxlength="50" value="${v22esc(t.category||'')}" required></label>
      <label>Data<input name="date" type="date" value="${v22esc(t.date||'')}" required></label>
      <label>Nota<input name="note" maxlength="250" value="${v22esc(t.note||'')}"></label>
      <button type="submit" class="v4-primary">Salva modifiche ✨</button>
      <button type="button" id="v22-delete" class="danger-text">Elimina movimento</button>
      <p id="v22-error" class="error" role="status"></p>
    </form>
  </div>`;
  document.body.appendChild(modal);
  const close=()=>modal.remove();
  modal.querySelector('#v22-close').onclick=close;
  modal.addEventListener('click',e=>{if(e.target===modal)close()});
  const ref=t.scope==='personal'?doc(v22Db,'users',v22User.uid,'transactions',t.id):doc(v22Db,'spaces',t.scope,'transactions',t.id);
  const error=modal.querySelector('#v22-error');
  modal.querySelector('#v22-edit').onsubmit=async e=>{
    e.preventDefault();const fd=new FormData(e.currentTarget);
    const amount=Number(fd.get('amount'));
    const data={kind:String(fd.get('kind')),amount,category:String(fd.get('category')).trim(),date:String(fd.get('date')),note:String(fd.get('note')).trim()};
    if(!Number.isFinite(amount)||amount<=0||!data.category||!data.date){error.textContent='Controlla i campi.';return;}
    const save=e.currentTarget.querySelector('[type=submit]');save.disabled=true;
    try{await updateDoc(ref,data);close();v22Schedule();}
    catch(ex){error.textContent='Impossibile salvare: '+(ex.code||ex.message||'errore');save.disabled=false;}
  };
  modal.querySelector('#v22-delete').onclick=async()=>{
    if(!confirm('Eliminare definitivamente questo movimento?'))return;
    try{await deleteDoc(ref);close();v22Schedule();}
    catch(ex){error.textContent='Impossibile eliminare: '+(ex.code||ex.message||'errore');}
  };
}
function v22InstallClick(){
  const host=V22('#transactions');if(!host)return;
  new MutationObserver(()=>{if(v22User && !host.querySelector('.tx-row:not(.v22-recovered-row)'))v22Schedule();}).observe(host,{childList:true});
  host.addEventListener('click',e=>{
    const row=e.target.closest('.v22-recovered-row');if(!row)return;
    const t=v22All().find(x=>x.id===row.dataset.id&&x.scope===row.dataset.scope);
    if(t)v22Open(t);
  });
  host.addEventListener('keydown',e=>{
    if(e.key!=='Enter'&&e.key!==' ')return;
    const row=e.target.closest('.v22-recovered-row');if(!row)return;
    e.preventDefault();const t=v22All().find(x=>x.id===row.dataset.id&&x.scope===row.dataset.scope);if(t)v22Open(t);
  });
}
function v22Subscribe(user){
  v22PersonalStop=onSnapshot(collection(v22Db,'users',user.uid,'transactions'),snap=>{
    if(v22User?.uid!==user.uid)return;
    v22Personal=snap.docs.map(d=>({id:d.id,...d.data(),scope:'personal'}));v22Schedule();
  },err=>console.warn('Soldini V22: personale',err));
  v22SpaceStop=onSnapshot(query(collection(v22Db,'spaces'),where('memberIds','array-contains',user.uid)),snap=>{
    if(v22User?.uid!==user.uid)return;
    const current=new Set();
    for(const s of snap.docs){
      current.add(s.id);v22SpaceNames.set(s.id,s.data().name||'Spazio condiviso');
      if(!v22Stops.has(s.id)){
        const stop=onSnapshot(collection(v22Db,'spaces',s.id,'transactions'),res=>{
          if(v22User?.uid!==user.uid)return;
          v22Shared.set(s.id,res.docs.map(d=>({id:d.id,...d.data(),scope:s.id})));v22Schedule();
        },err=>console.warn('Soldini V22: spazio',err));
        v22Stops.set(s.id,stop);
      }
    }
    for(const [id,stop] of v22Stops)if(!current.has(id)){stop();v22Stops.delete(id);v22Shared.delete(id);v22SpaceNames.delete(id)}
    v22Schedule();
  },err=>console.warn('Soldini V22: iscrizioni',err));
}
function v22Boot(){
  const apps=getApps();
  if(!apps.length){setTimeout(v22Boot,350);return;}
  v22Db=getFirestore(apps[0]);
  v22InstallClick();
  V22('#space-select')?.addEventListener('change',v22Schedule);
  V22all('.chip').forEach(btn=>btn.addEventListener('click',v22Schedule));
  for(const field of ['#from','#to'])V22(field)?.addEventListener('change',v22Schedule);
  onAuthStateChanged(getAuth(apps[0]),u=>{
    v22Stop();v22User=u;
    if(u){v22Subscribe(u);v22Schedule();}
  });
  // Restore from a main renderer failure without periodically rewriting working rows.
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')v22Schedule()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',v22Boot,{once:true});else v22Boot();
