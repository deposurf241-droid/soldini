/* Soldini V26 — selettore categorie: ogni spazio separato, preset Negozio. */
import { getApps } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth,onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getFirestore,collection,getDocs } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

const EXPENSE = [
  'Affitto negozio', 'Bollette telefonia', 'Bollette luce', 'Bollette acqua e condominio',
  'Commercialista', 'Oro vecchio', 'Tasse IVA (accantonamento)', 'Tasse INAIL',
  'Tasse IRPEF', 'Tasse INPS', 'Tasse arretrate', 'Fornitore Fusione',
  'Fornitore Lefèvre', 'Fornitore Incassatore Luciano', 'Fornitore CP Pietre',
  'Fornitore Laser Claudio', 'Altro'
];
const INCOME = [
  'Infilatura','Rodiatura','Pagamento in oro','Incisione','Riparazione','Incassatore',
  'Creazione','Vetrina','Compra oro','Clips di sicurezza D&D'
];
const el = id=>document.getElementById(id);
const field=el('category'),list=el('v7-category-list'),toggle=el('v7-category-toggle');
const emoji=el('v7-category-emoji'),hint=el('v7-category-hint'),space=el('tx-space');
const form=el('tx-form'),modal=el('tx-modal'),view=el('space-select');
const kinds=[...document.querySelectorAll('input[name="kind"]')];
const norm=s=>String(s??'').normalize('NFKC').toLocaleLowerCase('it').trim().replace(/\s+/g,' ');
const clean=s=>String(s??'').trim().replace(/\s+/g,' ');
let userId=null,db=null,opened=false,requestId=0,working=false;
let entries={income:new Map(),expense:new Map()};
const kind=()=>kinds.find(k=>k.checked)?.value||'expense';
const isShop=()=>{
  const option=space?.selectedOptions?.[0];
  return option && /negozio/i.test(option.textContent||'') && space.value!=='personal' && space.value!=='global';
};
function iconFor(name){
  const s=norm(name).normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  if(/^fornitore\b/.test(s))return '🛍️';
  if(s==='incassatore'&&kind()==='income')return '';
  const tests=[[/bollett|luce|acqua|condominio|telefonia/,'💡'],[/tasse|iva|inps|inail|irpef/,'🧾'],
    [/fornitore|fusione|pietre/,'📦'],[/affitt/,'🏠'],[/oro|gioiell|orecchin|braccial/,'💎'],
    [/riparazion|incision|rodiat|infilat/,'🛠️'],[/stipend|lavor/,'💼'],
    [/supermercat|aliment/,'🛒'],[/farmac|medic/,'💊'],[/palestr|sport|calcett/,'🏋️'],[/teatr|cinema/,'🎬']];
  return tests.find(([r])=>r.test(s))?.[1]||'🏷️';
}
function setEmoji(){if(emoji)emoji.textContent=iconFor(field?.value)}
function add(type,value){
  if(type!=='expense'&&type!=='income')return;
  const name=clean(value),key=norm(name);
  if(name&&!entries[type].has(key))entries[type].set(key,name);
}
function sorted(){return [...entries[kind()].values()].sort((a,b)=>a.localeCompare(b,'it',{sensitivity:'base'}))}
function open(state){
  if(!list||!field||!toggle)return;
  opened=state;list.hidden=!state;
  field.setAttribute('aria-expanded',String(state));
  toggle.setAttribute('aria-expanded',String(state));
  toggle.textContent=state?'⌃':'⌄';
  if(state)render();
}
function render(){
  if(!opened||!list||!field)return;
  list.replaceChildren();
  const val=norm(field.value),options=sorted(),matches=options.filter(x=>norm(x).includes(val));
  for(const name of matches){
    const button=document.createElement('button');button.type='button';button.className='v7-category-choice';button.setAttribute('role','option');
    const pict=document.createElement('span'),label=document.createElement('span');
    pict.textContent=iconFor(name);label.textContent=name;button.append(pict,label);
    button.addEventListener('pointerdown',e=>e.preventDefault());
    button.addEventListener('click',()=>{
      field.value=name;setEmoji();open(false);field.focus();
    });
    list.append(button);
  }
  if(!matches.length){
    const msg=document.createElement('div');msg.className='v7-list-status';
    msg.textContent=working?'Caricamento delle categorie…':val?'Puoi creare questa categoria salvando il movimento.':'Nessuna categoria in questo spazio: scrivine una nuova.';
    list.append(msg);
  }
}
async function refresh(){
  const myRequest=++requestId;
  const chosen=space?.value||'personal';
  const shop=isShop();
  entries={income:new Map(),expense:new Map()};
  if(shop){INCOME.forEach(x=>add('income',x));EXPENSE.forEach(x=>add('expense',x));}
  working=true;
  if(hint)hint.textContent=shop?'Categorie Negozio: entrate e uscite separate. Puoi scrivere una nuova categoria.':'Categorie salvate in questo spazio; puoi anche scriverne una nuova.';
  render();
  if(!userId||!db){working=false;render();return;}
  try{
    const ref=chosen==='personal'?collection(db,'users',userId,'transactions'):
      chosen==='global'?null:collection(db,'spaces',chosen,'transactions');
    if(ref){
      const snap=await getDocs(ref);
      if(myRequest!==requestId)return;
      snap.forEach(doc=>{const d=doc.data();add(d.kind,d.category)});
    }
  }catch(error){
    console.warn('Soldini V26: categorie storiche non disponibili; i preset restano visibili.',error);
  }finally{
    if(myRequest===requestId){working=false;render();}
  }
}
if(field&&list&&toggle&&space){
  field.removeAttribute('list');
  field.addEventListener('focus',()=>{open(true);refresh()});
  field.addEventListener('input',()=>{setEmoji();open(true)});
  field.addEventListener('keydown',e=>{
    if(e.key==='Escape')open(false);
    if(e.key==='ArrowDown'&&opened){e.preventDefault();list.querySelector('button')?.focus();}
  });
  toggle.addEventListener('click',()=>{const next=!opened;open(next);if(next)refresh()});
  kinds.forEach(k=>k.addEventListener('change',()=>{field.value='';setEmoji();render()}));
  space.addEventListener('change',()=>{field.value='';setEmoji();refresh()});
  view?.addEventListener('change',()=>{if(opened)refresh()});
  modal?.addEventListener('click',e=>{
    if(e.target===modal||e.target.closest('[data-close="tx-modal"]'))open(false);
  });
  document.addEventListener('pointerdown',e=>{if(opened&&!e.target.closest('.v7-category-wrap'))open(false)});
  form?.addEventListener('submit',()=>{
    if(!form.checkValidity()||!(Number(el('amount')?.value)>0))return;
    const existing=entries[kind()].get(norm(field.value));
    if(existing)field.value=existing;
    // The application handles saving to Firestore; this module only supplies choices.
  },true);
  setEmoji();
}
function initFirebase(){
  if(!getApps().length){setTimeout(initFirebase,250);return;}
  db=getFirestore(getApps()[0]);
  onAuthStateChanged(getAuth(getApps()[0]),u=>{
    userId=u?.uid||null;
    refresh();
  });
}
initFirebase();
