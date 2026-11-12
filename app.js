import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, getDocs, onSnapshot, query, where, arrayUnion, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const euro=n=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(n);
const safe=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const localDate=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const today=()=>localDate(new Date());
let auth,db,user,spaces=[],personal=[],shared={},unsubs=[],period='month',selected='global',editing=null;
const validConfig=!Object.values(firebaseConfig).some(x=>!x||x.startsWith('INCOLLA_'));
function show(el,visible=true){$(el).classList.toggle('hidden',!visible)}
function toast(message){const node=$('#toast');node.textContent=message;show('#toast');setTimeout(()=>show('#toast',false),3200)}
function humanError(err){const c=err?.code||'';const hints={'auth/invalid-credential':'Email o password non corretti.','auth/email-already-in-use':'Questa email è già registrata.','auth/weak-password':'Password troppo corta.','permission-denied':'Accesso negato: controlla i permessi e le regole Firestore.','auth/unauthorized-domain':'Dominio non autorizzato su Firebase Authentication.'};return hints[c]||err?.message||'Si è verificato un errore.'}
function clearListeners(){unsubs.forEach(u=>u());unsubs=[]}
if(!validConfig){show('#setup')}else{
  try{const app=initializeApp(firebaseConfig);auth=getAuth(app);db=getFirestore(app);show('#auth');onAuthStateChanged(auth,u=>{clearListeners();user=u;spaces=[];personal=[];shared={};selected='global';if(u){show('#auth',false);show('#app');startData()}else{show('#auth');show('#app',false);show('#logout',false)}})}catch(e){show('#setup');$('#setup').append(document.createTextNode(humanError(e)))}}
$('#auth-form').onsubmit=async e=>{e.preventDefault();$('#auth-error').textContent='';try{await signInWithEmailAndPassword(auth,$('#email').value.trim(),$('#password').value)}catch(err){$('#auth-error').textContent=humanError(err)}};
$('#logout').onclick=()=>signOut(auth);
function startData(){show('#logout');$('#uid').textContent=user.uid;refreshGreeting();unsubs.push(onSnapshot(collection(db,'users',user.uid,'transactions'),snap=>{personal=snap.docs.map(d=>({id:d.id,...d.data(),scope:'personal'}));render()},err=>toast(humanError(err))));unsubs.push(onSnapshot(query(collection(db,'spaces'),where('memberIds','array-contains',user.uid)),snap=>{spaces=snap.docs.map(d=>({id:d.id,...d.data()}));Object.keys(shared).forEach(id=>{if(!spaces.some(s=>s.id===id))delete shared[id]});subscribeShared();render()},err=>toast(humanError(err))))}
let sharedListeners={};function subscribeShared(){Object.entries(sharedListeners).forEach(([id,u])=>{if(!spaces.some(s=>s.id===id)){u();delete sharedListeners[id]}});spaces.forEach(s=>{if(sharedListeners[s.id])return;sharedListeners[s.id]=onSnapshot(collection(db,'spaces',s.id,'transactions'),snap=>{shared[s.id]=snap.docs.map(d=>({id:d.id,...d.data(),scope:s.id}));render()},err=>toast(humanError(err)))});unsubs=unsubs.filter(()=>true)}
function resetShared(){Object.values(sharedListeners).forEach(fn=>fn());sharedListeners={}}
// Stop shared listeners on logout and account changes.
const originalClear=clearListeners;clearListeners=function(){originalClear();resetShared()};
function options(){return [{id:'global',name:'🌍 Tutto insieme'},{id:'personal',name:'🔒 Personale'},...spaces.map(s=>({id:s.id,name:'🏡 '+s.name}))]}
function refreshSelects(){const opts=options();if(!opts.some(o=>o.id===selected))selected='global';const sel=$('#space-select');sel.innerHTML=opts.map(o=>`<option value="${safe(o.id)}">${safe(o.name)}</option>`).join('');sel.value=selected;const txopts=opts.filter(o=>o.id!=='global');$('#tx-space').innerHTML=txopts.map(o=>`<option value="${safe(o.id)}">${safe(o.name)}</option>`).join('')}
function allTx(){return [...personal,...spaces.flatMap(s=>shared[s.id]||[])]}
function familyTx(){return spaces.flatMap(s=>shared[s.id]||[])}
function inRange(date){if(!date)return false;if(period==='all')return true;const t=new Date(), start=new Date(t.getFullYear(),t.getMonth(),t.getDate());let from,to;if(period==='day'){from=to=localDate(start)}else if(period==='week'){start.setDate(start.getDate()-(start.getDay()+6)%7);from=localDate(start);start.setDate(start.getDate()+6);to=localDate(start)}else if(period==='month'){from=localDate(new Date(t.getFullYear(),t.getMonth(),1));to=localDate(new Date(t.getFullYear(),t.getMonth()+1,0))}else{from=$('#from').value||'0000-01-01';to=$('#to').value||'9999-12-31'}return date>=from&&date<=to}
function visibleTx(){return (selected==='global'?familyTx():selected==='personal'?personal:shared[selected]||[]).filter(x=>inRange(x.date)).sort((a,b)=>b.date.localeCompare(a.date)||String(b.id).localeCompare(String(a.id)))}
function summary(arr){return {income:arr.filter(x=>x.kind==='income').reduce((n,x)=>n+Number(x.amount||0),0),expense:arr.filter(x=>x.kind==='expense').reduce((n,x)=>n+Number(x.amount||0),0)}}
function chartRender(arr){const wrap=$('#chart');if(!arr.length){wrap.innerHTML='<p class="empty">Aggiungi qualche movimento per vedere il grafico 🌷</p>';return}const by={};arr.forEach(tx=>{const key=tx.date.slice(0,7);by[key]??={income:0,expense:0};by[key][tx.kind]+=Number(tx.amount)});let keys=Object.keys(by).sort().slice(-8);if(keys.length===1){const days={};arr.forEach(tx=>{days[tx.date]??={income:0,expense:0};days[tx.date][tx.kind]+=Number(tx.amount)});keys=Object.keys(days).sort().slice(-8);Object.keys(by).forEach(k=>delete by[k]);Object.assign(by,days)}const max=Math.max(1,...keys.flatMap(k=>[by[k].income,by[k].expense]));wrap.innerHTML=keys.map(key=>`<div class="chart-col" title="${safe(key)}"><div class="chart-bars"><div class="bar in" title="Entrate ${euro(by[key].income)}" style="height:${Math.max(2,by[key].income/max*140)}px"></div><div class="bar out" title="Spese ${euro(by[key].expense)}" style="height:${Math.max(2,by[key].expense/max*140)}px"></div></div><div class="bar-label">${safe(key.length===7?key.slice(5)+'/'+key.slice(2,4):key.slice(8))}</div></div>`).join('')}
function categoriesRender(arr){const cat={};arr.filter(t=>t.kind==='expense').forEach(t=>cat[t.category]=(cat[t.category]||0)+Number(t.amount));const top=Object.entries(cat).sort((a,b)=>b[1]-a[1]).slice(0,6);const max=Math.max(1,...top.map(x=>x[1]));$('#categories').innerHTML=top.length?top.map(([name,n])=>`<div class="category-row"><div><div class="cat-name">${safe(name)}</div><div class="track"><div class="fill" style="width:${n/max*100}%"></div></div></div><b>${euro(n)}</b></div>`).join(''):'<div class="empty">Qui vedrai le categorie delle tue spese 🎈</div>'}

const defaultCategories=['Alimentari','Casa','Affitto','Trasporti','Benzina','Palestra','Salute','Stipendio','Vendite','Materiali','Bollette','Abbigliamento','Macchina','Bolli','Bracciali','Collane','Altro'];
function refreshCategories(){
  if(!user)return;
  const txs=selected==='personal'?personal:selected==='global'?familyTx():(shared[selected]||[]);
  const names=[...new Set([...defaultCategories,...txs.map(t=>t.category).filter(Boolean)].map(s=>s.trim()))].sort((a,b)=>a.localeCompare(b,'it'));
  $('#suggestions').innerHTML=names.map(s=>`<option value="${safe(s)}"></option>`).join('');
}
function refreshGreeting(){
  const name=localStorage.getItem('soldini-name-'+user.uid);
  $('#greeting').textContent=name?'Ciao '+name+'! ☀️':'Come va oggi? ☀️';
}
$('#greeting').onclick=()=>{
  if(!user)return;
  const old=localStorage.getItem('soldini-name-'+user.uid)||'';
  const chosen=prompt('Come vuoi essere chiamato su questo telefono? (es. Andrea, Cinzia, Paolo)',old);
  if(chosen===null)return;
  const name=chosen.trim().slice(0,30);
  if(name)localStorage.setItem('soldini-name-'+user.uid,name);
  else localStorage.removeItem('soldini-name-'+user.uid);
  refreshGreeting();
};
const pieColors=['#ff9fb9','#8bd8b1','#ffd174','#8bc9f7','#bca4ef','#f4a889','#9cdddf','#d7c9a5'];
function pieRender(arr){
  const counts=Object.create(null);arr.filter(t=>t.kind==='expense').forEach(t=>counts[t.category]=(counts[t.category]||0)+Number(t.amount));
  const entries=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  const total=entries.reduce((n,x)=>n+x[1],0),pie=$('#expense-pie'), legend=$('#pie-legend');
  if(!total){pie.style.background='#f6edf0';pie.innerHTML='<span>Nessuna spesa</span>';legend.innerHTML='';return;}
  let angle=0;
  const stops=entries.map(([cat,value],i)=>{let from=angle;angle+=value/total*100;return `${pieColors[i%pieColors.length]} ${from}% ${angle}%`});
  pie.style.background=`conic-gradient(${stops.join(',')})`;
  pie.innerHTML=`<span>${euro(total)}<small>spese totali</small></span>`;
  legend.innerHTML=entries.map(([name,value],i)=>`<div class="pie-label"><i style="background:${pieColors[i%pieColors.length]}"></i><span>${safe(name)}</span><b>${(value/total*100).toFixed(1).replace('.',',')}%</b></div>`).join('');
}
function monthlyRender(){
  const arr=selected==='global'?familyTx():selected==='personal'?personal:(shared[selected]||[]);
  const map={};arr.forEach(t=>{const m=t.date?.slice(0,7);if(!m)return;map[m]??={income:0,expense:0};map[m][t.kind]+=Number(t.amount||0)});
  const now=new Date(),months=Array.from({length:6},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-5+i,1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`});
  const max=Math.max(1,...months.flatMap(m=>[map[m]?.income||0,map[m]?.expense||0]));
  const width=340,height=175,left=11,right=329,top=16,bottom=145;
  const x=i=>left+(right-left)*i/(months.length-1), y=v=>bottom-v/max*(bottom-top);
  const series=[['income','#39b987'],['expense','#ef8da8']];
  let html=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Grafico mensile di entrate e spese">`;
  [0,.5,1].forEach(t=>{html+=`<line x1="${left}" x2="${right}" y1="${y(max*t)}" y2="${y(max*t)}" stroke="#eee5e9" stroke-dasharray="3 3"/>`});
  series.forEach(([kind,color])=>{
    const points=months.map((m,i)=>[x(i),y(map[m]?.[kind]||0)]);
    html+=`<polyline fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round" points="${points.map(p=>p.join(',')).join(' ')}"/>`;
    points.forEach(([px,py],i)=>{html+=`<circle cx="${px}" cy="${py}" r="4" fill="${color}"><title>${months[i]} ${kind==='income'?'Entrate':'Spese'}: ${euro(map[months[i]]?.[kind]||0)}</title></circle>`});
  });
  months.forEach((m,i)=>{html+=`<text x="${x(i)}" y="166" text-anchor="middle" font-size="10" fill="#877487">${['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'][Number(m.slice(5))-1]}</text>`});
  html+='</svg>';
  $('#monthly-chart').innerHTML=html;
  const current=months[months.length-1],sum=map[current]||{income:0,expense:0};const bal=sum.income-sum.expense;
  $('#monthly-profit').textContent=`Saldo di questo mese: ${bal>=0?'+':''}${euro(bal)}`;
  $('#monthly-profit').className=bal>=0?'pos':'neg';
}

function render(){if(!user)return;refreshSelects();refreshCategories();$('#scope-hint').textContent=selected==='global'?'Solo Casa e Negozio, senza le spese personali':selected==='personal'?'Solo tuo, nessun altro lo vede':'Condiviso con i membri autorizzati';const arr=visibleTx(),s=summary(arr);$('#income').textContent=euro(s.income);$('#expense').textContent=euro(s.expense);$('#balance').textContent=(s.income-s.expense>=0?'+ ':'− ')+euro(Math.abs(s.income-s.expense));$('#balance-hint').textContent=s.income-s.expense>=0?'Stai risparmiando! 🎉':'Le spese superano le entrate';$('#period-label').textContent=period==='month'?'Questo mese':period==='day'?'Oggi':period==='week'?'Questa settimana':period==='all'?'Tutto lo storico':`Dal ${$('#from').value||'…'} al ${$('#to').value||'…'}`;chartRender(arr);categoriesRender(arr);pieRender(arr);monthlyRender();$('#transactions').innerHTML=arr.length?arr.map(tx=>`<div class="tx-row" data-id="${safe(tx.id)}" data-scope="${safe(tx.scope)}"><div class="tx-icon">${tx.kind==='income'?'🤑':'😢💸'}</div><div class="tx-info"><b>${safe(tx.category)}</b><small>${safe(tx.date.split('-').reverse().join('/'))} · ${safe(tx.scope==='personal'?'Personale':spaces.find(s=>s.id===tx.scope)?.name||'Spazio')} ${tx.note?'· '+safe(tx.note):''}</small></div><div class="tx-amount ${tx.kind==='income'?'pos':'neg'}">${tx.kind==='income'?'+':'−'}${euro(Number(tx.amount))}</div></div>`).join(''):'<p class="empty">Nessun movimento qui. Cominciamo? 🌼</p>';$$('.tx-row').forEach(row=>row.onclick=()=>openTx(allTx().find(t=>t.id===row.dataset.id&&t.scope===row.dataset.scope)));renderSpaces()}
$('#space-select').onchange=e=>{selected=e.target.value;render()};$$('.chip').forEach(btn=>btn.onclick=()=>{period=btn.dataset.period;$$('.chip').forEach(b=>b.classList.toggle('active',b===btn));show('#range',period==='custom');render()});['#from','#to'].forEach(id=>$(id).onchange=render);
function openTx(tx=null){refreshCategories();editing=tx;$('#tx-form').reset();$('#tx-title').textContent=tx?'Modifica movimento':'Nuovo movimento';$('#date').value=tx?.date||today();$('#amount').value=tx?.amount||'';$('#category').value=tx?.category||'';$('#note').value=tx?.note||'';$$('input[name="kind"]').forEach(r=>r.checked=((tx?.kind||'expense')===r.value));$('#tx-space').value=tx?.scope||(selected!=='global'?selected:'personal');$('#tx-space').disabled=Boolean(tx);show('#delete-tx',Boolean(tx));$('#tx-error').textContent='';show('#tx-modal')}
$('#add').onclick=()=>openTx();$$('[data-close]').forEach(b=>b.onclick=()=>show('#'+b.dataset.close,false));$$('.modal').forEach(el=>el.addEventListener('click',e=>{if(e.target===el)show('#'+el.id,false)}));
function txRef(scope,id){return scope==='personal'?doc(db,'users',user.uid,'transactions',id):doc(db,'spaces',scope,'transactions',id)}
function txCollection(scope){return scope==='personal'?collection(db,'users',user.uid,'transactions'):collection(db,'spaces',scope,'transactions')}
$('#tx-form').onsubmit=async e=>{e.preventDefault();$('#tx-error').textContent='';const amount=Number($('#amount').value);const scope=$('#tx-space').value;const data={kind:$('input[name="kind"]:checked').value,amount,category:$('#category').value.trim(),date:$('#date').value,note:$('#note').value.trim()};if(!(amount>0)||!Number.isFinite(amount)||!scope||!data.category||!data.date){$('#tx-error').textContent='Controlla i dati inseriti.';return}try{if(editing)await updateDoc(txRef(editing.scope,editing.id),data);else await addDoc(txCollection(scope),{...data,createdAt:serverTimestamp(),createdBy:user.uid});show('#tx-modal',false);toast('Salvato! 🎉')}catch(err){$('#tx-error').textContent=humanError(err)}};
$('#delete-tx').onclick=async()=>{if(!editing||!confirm('Vuoi eliminare definitivamente questo movimento?'))return;try{await deleteDoc(txRef(editing.scope,editing.id));show('#tx-modal',false);toast('Movimento eliminato')}catch(err){$('#tx-error').textContent=humanError(err)}};
$('#spaces-button').onclick=()=>{show('#spaces-modal');renderSpaces()};$('#space-form').onsubmit=async e=>{e.preventDefault();$('#space-error').textContent='';try{await addDoc(collection(db,'spaces'),{name:$('#space-name').value.trim(),ownerUid:user.uid,memberIds:[user.uid],createdAt:serverTimestamp()});$('#space-name').value='';toast('Spazio creato! 🏡')}catch(err){$('#space-error').textContent=humanError(err)}};
function renderSpaces(){if(!user)return;$('#spaces-list').innerHTML=spaces.length?spaces.map(s=>`<div class="space-row"><div style="flex:1;min-width:0"><b>${safe(s.name)}</b><div class="muted member">${s.memberIds.length} persone autorizzate · ${s.ownerUid===user.uid?'Lo gestisci tu':'Gestito da un familiare'}</div>${s.ownerUid===user.uid?`<label>Aggiungi familiare tramite UID<input data-member="${safe(s.id)}" placeholder="Incolla UID di mamma o papà"/></label><button class="soft invite" data-space="${safe(s.id)}">+ Autorizza</button>`:''}</div></div>`).join(''):'<p class="empty">Nessuno spazio condiviso ancora 🏡</p>';$$('.invite').forEach(btn=>btn.onclick=async()=>{const space=spaces.find(s=>s.id===btn.dataset.space);const uid=$$('[data-member]').find(i=>i.dataset.member===btn.dataset.space)?.value.trim();if(!uid||!(/^[a-zA-Z0-9]{20,128}$/.test(uid))){$('#space-error').textContent='Incolla un UID valido.';return}if(space.memberIds.includes(uid)){toast('Familiare già presente');return}try{await updateDoc(doc(db,'spaces',space.id),{memberIds:arrayUnion(uid)});toast('Familiare autorizzato! 💛');$('#space-error').textContent=''}catch(err){$('#space-error').textContent=humanError(err)}})}
$('#copy-uid').onclick=async()=>{try{await navigator.clipboard.writeText(user.uid);toast('Codice copiato!')}catch(e){toast('Tieni premuto il codice per copiarlo')}};
$('#export').onclick=()=>{const arr=visibleTx();const csv=[['tipo','importo_euro','categoria','data','nota','spazio'],...arr.map(t=>[t.kind,t.amount,t.category,t.date,t.note,t.scope==='personal'?'Personale':spaces.find(s=>s.id===t.scope)?.name||'Condiviso'])].map(row=>row.map(x=>'"'+String(x??'').replaceAll('"','""')+'"').join(';')).join('\r\n');const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`soldini-${today()}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),3000)};
