/* Soldini V7 - categorie definite solo dall'utente, recuperate dai movimenti Firebase */
import { getApps } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

const field=document.getElementById('category');
const panel=document.getElementById('v7-category-list');
const toggle=document.getElementById('v7-category-toggle');
const preview=document.getElementById('v7-category-emoji');
const hint=document.getElementById('v7-category-hint');
const form=document.getElementById('tx-form');
const modal=document.getElementById('tx-modal');
const spaceField=document.getElementById('tx-space');
const kindInputs=[...document.querySelectorAll('input[name="kind"]')];
const visibleSpace=document.getElementById('space-select');
let auth=null,db=null,uid=null,categories={income:new Map(),expense:new Map()},opened=false,loading=false,fetchVersion=0;
const normalize=s=>String(s||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('it');
const cap=s=>String(s||'').trim().replace(/\s+/g,' ');
const kind=()=>kindInputs.find(x=>x.checked)?.value||'expense';

function emojiFor(name){
  const value=normalize(name).normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const rules=[
    [/compars|cinema|film|teatro|recita|spettacol/, '🎬'],
    [/ripetizion|lezion|insegn|tutor|scuola|universit/, '📚'],
    [/benzina|gasolio|carburant|diesel|riforniment/, '⛽'],
    [/affitt|locazion|canone/, '🏠'],
    [/bollett|bollett|bollett|bollett|bolletta|luce|gas|acqua|elettric/, '💡'],
    [/aliment|spesa aliment|supermercat|cib|ristorant|pranz|cen/, '🛒'],
    [/braccial/, '📿'],[/collan|orecchin|gioiell/, '💎'],
    [/negozio|vendit|incass|cliente|ordine/, '🛍️'],
    [/vestit|abbigli|scarpe|moda/, '👕'],
    [/stipendi|salari|lavor|compens/, '💼'],
    [/auto|macchina|assicurazion|bollo|meccanic|parchegg/, '🚗'],
    [/salute|medic|farmac|ospedal/, '💊'],
    [/viagg|aereo|treno|hotel|vacanz/, '✈️'],
    [/sport|palestra|squash|fitness/, '🏋️'],
    [/regal|compleann|festa/, '🎁'],
    [/telefon|internet|abbonament/, '📱'],
    [/gratta|lotteria|vincit/, '🍀'],
    [/tass|impost|iva|f24/, '🧾'],
  ];
  return rules.find(([pattern])=>pattern.test(value))?.[1]||'🏷️';
}
function setEmoji(){preview.textContent=emojiFor(field.value)}
function addCategory(which,text){
  const name=cap(text),key=normalize(name);
  if(!key)return;
  if(!categories[which].has(key))categories[which].set(key,name);
}
function current(){return [...categories[kind()].values()].sort((a,b)=>a.localeCompare(b,'it',{sensitivity:'base'}))}
function setOpen(state){opened=state;panel.hidden=!state;field.setAttribute('aria-expanded',String(state));toggle.setAttribute('aria-expanded',String(state));toggle.textContent=state?'⌃':'⌄';if(state)renderChoices()}
function renderChoices(){
  if(!opened)return;
  panel.replaceChildren();
  const typed=normalize(field.value);
  const matches=current().filter(name=>normalize(name).includes(typed));
  const exact=current().find(name=>normalize(name)===typed);
  if(loading&&current().length===0){const item=document.createElement('div');item.className='v7-list-status';item.textContent='Carico le tue categorie…';panel.append(item)}
  for(const name of matches){
    const choice=document.createElement('button');choice.type='button';choice.className='v7-category-choice';choice.setAttribute('role','option');
    const pict=document.createElement('span');pict.textContent=emojiFor(name);
    const label=document.createElement('span');label.textContent=name;
    choice.append(pict,label);
    choice.addEventListener('pointerdown',ev=>ev.preventDefault());
    choice.addEventListener('click',()=>{field.value=name;setEmoji();setOpen(false);field.focus();field.dispatchEvent(new Event('input',{bubbles:true}))});
    panel.append(choice);
  }
  if(!matches.length&&!loading){const empty=document.createElement('div');empty.className='v7-list-status';empty.textContent=typed?'Non è ancora una tua categoria. Puoi crearla salvando il movimento.':'Nessuna categoria salvata: scrivi la prima e salva il movimento.';panel.append(empty)}
  if(typed&&!exact){const newChoice=document.createElement('div');newChoice.className='v7-create-status';newChoice.textContent=`✨ Nuova categoria: “${cap(field.value)}”`;panel.append(newChoice)}
}
function userSpaces(){return [...new Set(['personal',...Array.from(visibleSpace.options).map(opt=>opt.value).filter(v=>v&&v!=='global'&&v!=='personal')])];}
async function loadCategories(){
  if(!uid||!db)return;
  const request=++fetchVersion;
  loading=true;renderChoices();
  const destinations=userSpaces();
  const requests=destinations.map(scope=>getDocs(scope==='personal'?collection(db,'users',uid,'transactions'):collection(db,'spaces',scope,'transactions')));
  const results=await Promise.allSettled(requests);
  if(request!==fetchVersion)return;
  categories={income:new Map(),expense:new Map()};
  results.forEach(result=>{
    if(result.status==='fulfilled')result.value.forEach(document=>{
      const data=document.data();
      if(data.kind==='income'||data.kind==='expense')addCategory(data.kind,data.category);
    });
  });
  loading=false;renderChoices();
  const unavailable=results.some(result=>result.status==='rejected');
  hint.textContent=unavailable?'Alcune categorie non sono disponibili: controlla la connessione.':'Scegli una categoria salvata oppure scrivine una nuova: sarà memorizzata nel movimento.';
}

// Wait for the existing Soldini application to initialize Firebase.
function boot(){
  const apps=getApps();
  if(!apps.length){setTimeout(boot,350);return;}
  auth=getAuth(apps[0]);db=getFirestore(apps[0]);
  onAuthStateChanged(auth,user=>{
    uid=user?.uid||null;fetchVersion++;
    categories={income:new Map(),expense:new Map()};
    if(user)loadCategories();else setOpen(false);
  });
}
boot();
field.removeAttribute('list');
field.addEventListener('focus',()=>{setOpen(true);loadCategories()});
field.addEventListener('input',()=>{setEmoji();setOpen(true)});
field.addEventListener('keydown',event=>{if(event.key==='Escape')setOpen(false);if(event.key==='ArrowDown'&&opened){event.preventDefault();panel.querySelector('button')?.focus()}});
toggle.addEventListener('click',()=>{setOpen(!opened);if(opened){field.focus();loadCategories()}});
kindInputs.forEach(r=>r.addEventListener('change',()=>{field.value='';setEmoji();if(opened)renderChoices()}));
spaceField.addEventListener('change',()=>{if(opened)loadCategories()});
visibleSpace.addEventListener('change',()=>{if(opened)loadCategories()});
form.addEventListener('submit',()=>{
  // Do not add a category on invalid submissions.
  if(!form.checkValidity()||!(Number(document.getElementById('amount').value)>0))return;
  const name=cap(field.value);
  const existing=categories[kind()].get(normalize(name));
  // Canonical spelling prevents case/space duplicates for future saved entries.
  if(existing)field.value=existing;
  const completed=field.value, completedKind=kind();
  const watcher=new MutationObserver(()=>{
    if(modal.classList.contains('hidden')){
      addCategory(completedKind,completed);watcher.disconnect();
    }else if(document.getElementById('tx-error')?.textContent.trim())watcher.disconnect();
  });
  watcher.observe(modal,{attributes:true,attributeFilter:['class']});
  setTimeout(()=>watcher.disconnect(),15000);
},true);
modal.addEventListener('click',event=>{if(event.target===modal||event.target.closest('[data-close="tx-modal"]'))setOpen(false)});
document.addEventListener('pointerdown',event=>{if(opened&&!event.target.closest('.v7-category-wrap'))setOpen(false)});
setEmoji();
