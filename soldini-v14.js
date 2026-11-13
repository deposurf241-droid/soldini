/** Soldini V14 — campanella e controllo duplicati, solo spazi condivisi.
 * Non scrive eventi in nuove collezioni Firestore e non modifica app.js.
 * Lo storico mostra le operazioni attualmente presenti, non una traccia immutabile
 * di modifiche/eliminazioni. Le push con app chiusa NON sono implementate.
 */
import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getFirestore, collection, query, where, onSnapshot } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app), db = getFirestore(app);
const $ = s => document.querySelector(s);
const euro = n => new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(n);
const escapeHtml = x => String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const keyNorm = x => String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLocaleLowerCase('it').replace(/\s+/g,' ');
const epoch = v => v && typeof v.toMillis === 'function' ? v.toMillis() : (v?.seconds ? v.seconds*1000 : 0);
const isVisible = el => !!el && !el.classList.contains('hidden');
let user = null, spaces = [], membershipsStop = null, txStops = new Map(), shared = new Map();
let initialAuthRead = false;
const appRoot = $('#app');
if(appRoot){
  const greeting = $('.hello');
  // V17: il pulsante e' gia' presente nell'HTML: non duplicarlo.
  let btn = $('#sd14-bell');
  if (!btn) {
    btn = document.createElement('button');
    btn.type='button';btn.id='sd14-bell';btn.setAttribute('aria-label','Apri attività di famiglia');btn.innerHTML='🔔 <span id="sd14-badge" hidden>0</span>';
    greeting?.appendChild(btn);
  }
  const dialog=document.createElement('div');dialog.id='sd14-modal';dialog.hidden=true;
  dialog.innerHTML=`<div class="sd14-sheet" role="dialog" aria-modal="true" aria-label="Attività di famiglia">
    <div class="sd14-top"><h2>🔔 Attività di famiglia</h2><button type="button" class="sd14-close" aria-label="Chiudi">✕</button></div>
    <p class="sd14-note">Solo Casa e Negozio (o altri spazi condivisi). Le operazioni personali non compaiono. Questo storico mostra i movimenti ancora presenti, non le eliminazioni.</p>
    <div class="sd14-filters"><span id="sd14-state" class="sd14-note">Caricamento…</span><button type="button" id="sd14-names">✏️ Nomi familiari</button></div>
    <div id="sd14-list" aria-live="polite"></div></div>`;
  document.body.appendChild(dialog);
  btn.addEventListener('click',()=>{dialog.hidden=false;setSeen();paint();});
  dialog.querySelector('.sd14-close').addEventListener('click',()=>dialog.hidden=true);
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.hidden=true;});
  dialog.querySelector('#sd14-names').addEventListener('click',()=>{
    if(!user)return;
    const known=new Set([user.uid]);
    spaces.forEach(s=>(s.memberIds||[]).forEach(id=>known.add(id)));
    const lines=[...known].map(id=>`${nameFor(id)}: ${id.slice(0,7)}…`).join('\n');
    const id=prompt('Nomi visualizzati su questo telefono:\n'+lines+'\n\nIncolla l’UID del familiare a cui vuoi assegnare un nome:');
    if(!id)return;
    if(!known.has(id.trim())){alert('UID non presente negli spazi condivisi.');return;}
    const name=prompt('Nome da mostrare per questo familiare (es. Paolo):',nameFor(id.trim()));
    if(name===null)return;
    if(name.trim())localStorage.setItem('sd14-name-'+id.trim(),name.trim().slice(0,32));
    else localStorage.removeItem('sd14-name-'+id.trim());
    paint();
  });
  const note=document.createElement('div');note.id='sd14-dup';note.hidden=true;note.setAttribute('role','status');
  $('#tx-form')?.insertBefore(note,$('#tx-form')?.querySelector('button[type="submit"]'));
}
function nameFor(uid){
  if(!uid)return 'Un familiare';
  const custom=localStorage.getItem('sd14-name-'+uid);
  if(custom)return custom;
  if(user?.uid===uid)return localStorage.getItem('soldini-name-'+uid)||'Tu';
  return 'Un familiare';
}
function seenKey(){return `sd14-seen-${user?.uid||'anon'}`;}
function setSeen(){if(user){localStorage.setItem(seenKey(),String(Date.now()));paintBadge();}}
function listTransactions(){
  return spaces.flatMap(s=>(shared.get(s.id)||[]).map(t=>({...t,spaceName:s.name,scope:s.id})))
    .sort((a,b)=>epoch(b.createdAt)-epoch(a.createdAt)).slice(0,70);
}
function paintBadge(){
  const badge=$('#sd14-badge');if(!badge)return;
  const seen=Number(localStorage.getItem(seenKey())||Date.now());
  const n=listTransactions().filter(t=>t.createdBy!==user?.uid && epoch(t.createdAt)>seen).length;
  badge.hidden=n===0;badge.textContent=String(Math.min(n,99));
}
function paint(){
  const list=$('#sd14-list'),status=$('#sd14-state');if(!list)return;
  const txs=listTransactions();
  status.textContent=`${txs.length} movimenti condivisi recenti`;
  list.innerHTML=txs.length?txs.map(t=>{
    const inc=t.kind==='income';const when=t.date||'Data non disponibile';
    const name=escapeHtml(nameFor(t.createdBy));
    return `<div class="sd14-row"><div class="sd14-ico">${inc?'🤑':'💸'}</div><div class="sd14-row-main"><strong>${name} · ${escapeHtml(t.spaceName)}</strong><small>${escapeHtml(t.category||'Senza categoria')} · ${escapeHtml(when)}${t.note?' · '+escapeHtml(t.note):''}</small></div><div class="sd14-sum ${inc?'income':'expense'}">${inc?'+':'−'}${escapeHtml(euro(Number(t.amount)||0))}</div></div>`;
  }).join(''):'<div class="sd14-empty">🌼 Nessun movimento condiviso da mostrare.</div>';
  paintBadge();
}
function cleanup(){
  if(membershipsStop){membershipsStop();membershipsStop=null;}
  txStops.forEach(stop=>stop());txStops.clear();spaces=[];shared.clear();paint();
}
function subscribeMembers(uid){
  membershipsStop=onSnapshot(query(collection(db,'spaces'),where('memberIds','array-contains',uid)), snap=>{
    if(!user||user.uid!==uid)return;
    spaces=snap.docs.map(d=>({id:d.id,...d.data()}));
    const ids=new Set(spaces.map(s=>s.id));
    for(const [id,stop] of txStops){if(!ids.has(id)){stop();txStops.delete(id);shared.delete(id);}}
    spaces.forEach(s=>{
      if(txStops.has(s.id))return;
      const stop=onSnapshot(collection(db,'spaces',s.id,'transactions'), rows=>{
        if(!user||user.uid!==uid)return;
        shared.set(s.id,rows.docs.map(d=>({id:d.id,...d.data()})));
        paint();
      },err=>{console.warn('Soldini V14: impossibile leggere i movimenti condivisi',err);});
      txStops.set(s.id,stop);
    });paint();
  },err=>{console.warn('Soldini V14: accesso agli spazi non disponibile',err);});
}
onAuthStateChanged(auth,u=>{
  cleanup();user=u;
  if(u){
    // Prima apertura: il passato resta visibile, ma non viene segnalato come "nuovo".
    if(!localStorage.getItem(seenKey()))localStorage.setItem(seenKey(),String(Date.now()));
    subscribeMembers(u.uid);
  }else{$('#sd14-modal') && ($('#sd14-modal').hidden=true);}
});

// Duplicati: un avviso prudente, mai un blocco irreversibile.
function getPossibleDuplicates(){
  if(!user || !$('#tx-form') || !isVisible($('#tx-modal')))return [];
  if(!$('#delete-tx')?.classList.contains('hidden'))return []; // edit: non confrontare con se stesso
  const scope=$('#tx-space')?.value;
  if(!scope || scope==='personal' || !spaces.some(s=>s.id===scope))return [];
  const amount=Math.round(Number($('#amount')?.value)*100);
  const category=keyNorm($('#category')?.value);
  const date=$('#date')?.value;
  const kind=$('input[name="kind"]:checked')?.value;
  if(!(amount>0)||!category||!date||!kind)return [];
  return (shared.get(scope)||[]).filter(t=>t.kind===kind && t.date===date && keyNorm(t.category)===category && Math.round(Number(t.amount)*100)===amount);
}
function checkWarning(){
  const note=$('#sd14-dup');if(!note)return;
  const matches=getPossibleDuplicates();
  note.hidden=!matches.length;
  if(matches.length){note.textContent=`⚠️ Possibile doppione: esiste già ${matches.length===1?'un movimento':'una serie di movimenti'} con stesso giorno, categoria e importo nello stesso spazio. Verifica prima di salvarlo.`;}
}
const form=$('#tx-form');
form?.addEventListener('input',checkWarning);
form?.addEventListener('change',checkWarning);
form?.addEventListener('submit',e=>{
  const matches=getPossibleDuplicates();
  if(!matches.length)return;
  if(!confirm(`⚠️ Attenzione: esiste già un movimento con stessa data, categoria e importo nello spazio condiviso.\n\nSe questa è una seconda vendita reale, premi OK per salvarla comunque. Altrimenti premi Annulla.`)){
    e.preventDefault();e.stopImmediatePropagation();
  }
},true);
