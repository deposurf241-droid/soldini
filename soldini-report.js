/* Soldini V13 — Resoconto mensile esportabile in PNG. Non modifica Firestore. */
import {getApps} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {getFirestore,collection,getDocs,query,where} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
const $=q=>document.querySelector(q);
const euro=n=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(n);
const fdate=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const parseDate=s=>new Date(+s.slice(0,4),+s.slice(5,7)-1,+s.slice(8,10),12);
const niceDate=s=>parseDate(s).toLocaleDateString('it-IT',{day:'numeric',month:'long',year:'numeric'});
const colors=['#f18cab','#ffc978','#7dcbaf','#bba1e6','#93b7ee','#f3ac89','#a6d4dc','#d0c68b','#d1a2b5'];
let currentUser=null,currentDb=null,lastPng=null,lastName='soldini-resoconto.png';
function round(g,x,y,w,h,r,fill){g.fillStyle=fill;g.beginPath();g.roundRect(x,y,w,h,r);g.fill()}
function txt(g,t,x,y,size=28,color='#44394f',weight=500,align='left'){g.fillStyle=color;g.font=`${weight} ${size}px system-ui,-apple-system,'Segoe UI',sans-serif`;g.textAlign=align;g.textBaseline='alphabetic';g.fillText(String(t),x,y)}
function fit(g,t,x,y,max,size=28,color='#44394f',weight=600){let s=String(t);g.font=`${weight} ${size}px system-ui`;if(g.measureText(s).width>max){while(s.length&&g.measureText(s+'…').width>max)s=s.slice(0,-1);s+='…'}txt(g,s,x,y,size,color,weight)}
function donut(g,cx,cy,r,vals,total){g.lineWidth=40;g.strokeStyle='#f1eaf0';g.beginPath();g.arc(cx,cy,r,0,Math.PI*2);g.stroke();let angle=-Math.PI/2;if(total>0)vals.forEach((v,i)=>{const a=Math.PI*2*v.value/total;g.beginPath();g.strokeStyle=colors[i%colors.length];g.arc(cx,cy,r,angle+.006,angle+a-.006);g.stroke();angle+=a})}
function groups(items,kind){let m=new Map();for(const x of items.filter(i=>i.kind===kind)){let c=String(x.category||'Senza categoria').trim()||'Senza categoria';m.set(c,(m.get(c)||0)+Number(x.amount))}let arr=[...m].map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);if(arr.length>5)arr=[...arr.slice(0,5),{name:'Altre categorie',value:arr.slice(5).reduce((s,x)=>s+x.value,0)}];return arr}
function donutCard(g,y,title,kind,items){const arr=groups(items,kind),total=arr.reduce((s,x)=>s+x.value,0);round(g,42,y,996,445,35,'#ffffff');txt(g,title,88,y+68,36,'#43374e',800);donut(g,282,y+247,113,arr,total);txt(g,euro(total),282,y+241,36,'#483b50',800,'center');txt(g,kind==='income'?'entrate totali':'spese totali',282,y+278,19,'#a78ca0',600,'center');if(!arr.length)txt(g,'Nessun movimento',630,y+255,24,'#a28c9f',500,'center');else arr.forEach((x,i)=>{let ly=y+147+i*52;round(g,505,ly-16,22,22,6,colors[i%colors.length]);fit(g,x.name,544,ly+3,245,24,'#514357',650);txt(g,`${(100*x.value/total).toFixed(1).replace('.',',')}%`,987,ly,24,'#4d4054',800,'right');txt(g,euro(x.value),987,ly+23,17,'#a98fa1',500,'right')})}
function lineChart(g,y,items,start,end){round(g,42,y,996,490,35,'#ffffff');txt(g,'📈 Andamento generale',88,y+69,36,'#43374e',800);txt(g,'Entrate e spese cumulative nel periodo',88,y+106,21,'#9e8a9c',500);const daily=new Map();for(const x of items){const old=daily.get(x.date)||{income:0,expense:0};old[x.kind]+=Number(x.amount);daily.set(x.date,old)}let points=[],d=parseDate(start),finish=parseDate(end);while(d<=finish&&points.length<740){points.push({date:fdate(d),...(daily.get(fdate(d))||{income:0,expense:0})});d.setDate(d.getDate()+1)}if(points.length>80){let size=Math.ceil(points.length/40),sample=[];for(let i=0;i<points.length;i+=size)sample.push({date:points[Math.min(points.length-1,i+size-1)].date,income:points.slice(i,i+size).reduce((s,p)=>s+p.income,0),expense:points.slice(i,i+size).reduce((s,p)=>s+p.expense,0)});points=sample}let ci=0,ce=0;points=points.map(p=>({...p,income:ci+=p.income,expense:ce+=p.expense}));const max=Math.max(1,...points.map(p=>Math.max(p.income,p.expense)));const x0=120,x1=971,y0=y+410,y1=y+152;for(let i=0;i<4;i++){const yy=y1+(y0-y1)*i/3;g.strokeStyle='#f2e7ee';g.setLineDash([8,9]);g.lineWidth=2;g.beginPath();g.moveTo(x0,yy);g.lineTo(x1,yy);g.stroke();g.setLineDash([]);txt(g,Math.round(max*(1-i/3)).toLocaleString('it-IT'),104,yy+8,17,'#a08d9e',500,'right')}
for(const [kind,color] of [['income','#2aa97a'],['expense','#eb6a86']]){g.strokeStyle=color;g.lineWidth=7;g.lineJoin='round';g.lineCap='round';g.beginPath();points.forEach((p,i)=>{const x=x0+(x1-x0)*(points.length===1?.5:i/(points.length-1)),yy=y0-(y0-y1)*p[kind]/max;i?g.lineTo(x,yy):g.moveTo(x,yy)});g.stroke();if(points.length<=18)points.forEach((p,i)=>{const x=x0+(x1-x0)*(points.length===1?.5:i/(points.length-1)),yy=y0-(y0-y1)*p[kind]/max;g.fillStyle=color;g.beginPath();g.arc(x,yy,7,0,Math.PI*2);g.fill()})}
txt(g,start.slice(8,10)+'/'+start.slice(5,7),120,y+448,20,'#9e8a9c',500);txt(g,end.slice(8,10)+'/'+end.slice(5,7),971,y+448,20,'#9e8a9c',500,'right');round(g,545,y+54,16,16,8,'#2aa97a');txt(g,'Entrate',570,y+68,20);round(g,716,y+54,16,16,8,'#eb6a86');txt(g,'Spese',741,y+68,20)}
// V13: poster compatto e illustrato, ispirato alla grafica richiesta dall'utente.
function v13Money(n){return new Intl.NumberFormat('it-IT',{maximumFractionDigits:2,minimumFractionDigits:2}).format(n)+' €'}
function v13Text(g,t,x,y,size,color='#442c48',weight=700,align='left'){
  g.save();g.fillStyle=color;g.font=`${weight} ${size}px system-ui,-apple-system,sans-serif`;g.textAlign=align;g.textBaseline='middle';g.fillText(String(t),x,y);g.restore();
}
function v13Rounded(g,x,y,w,h,r,fill){g.save();g.fillStyle=fill;g.beginPath();g.roundRect(x,y,w,h,r);g.fill();g.restore()}
function v13Ellipse(g,x,y,rx,ry,color){g.save();g.fillStyle=color;g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fill();g.restore()}
function v13Fit(g,t,x,y,max,size,color='#442c48',weight=650,align='left'){
  let text=String(t);g.font=`${weight} ${size}px system-ui`;while(text.length>1&&g.measureText(text).width>max){text=text.slice(0,-1)}if(text!==String(t))text=text.replace(/\s+$/,'')+'…';v13Text(g,text,x,y,size,color,weight,align)
}
const v13Colors=['#f48cb2','#ffdb7a','#ca9cf2','#ffb7a1','#9bdea8','#79d6b4','#8db9ee','#f5bd77'];
function v13Donut(g,cx,cy,r,values,total){
  g.save();g.lineWidth=40;g.strokeStyle='#f8eaf0';g.beginPath();g.arc(cx,cy,r,-Math.PI/2,Math.PI*1.5);g.stroke();
  let angle=-Math.PI/2;
  for(let i=0;i<values.length;i++){
    let length=(total?values[i].value/total:0)*2*Math.PI;
    if(length<=0)continue;g.beginPath();g.strokeStyle=v13Colors[i%v13Colors.length];g.arc(cx,cy,r,angle,angle+length);g.stroke();angle+=length;
  }
  g.restore();
}
function v13DonutCard(g,x,y,w,h,title,items,kind){
  v13Rounded(g,x,y,w,h,40,'#ffffff');
  v13Fit(g,title,x+28,y+50,w-48,29,'#48314a',850);
  const arr=groups(items,kind),total=arr.reduce((a,b)=>a+b.value,0);
  const cx=x+w/2,cy=y+223;
  v13Donut(g,cx,cy,129,arr,total);
  v13Text(g,v13Money(total),cx,cy-7,total>=100000?28:34,'#46304a',850,'center');
  v13Text(g,kind==='income'?'entrate totali':'uscite totali',cx,cy+36,19,'#a88b9f',550,'center');
  if(!arr.length){v13Text(g,'Nessun movimento nel periodo',cx,y+447,22,'#b293a5',550,'center');return}
  let top=y+410;
  arr.forEach((item,i)=>{
    const yy=top+i*66;
    v13Rounded(g,x+31,yy-10,22,22,11,v13Colors[i%v13Colors.length]);
    v13Fit(g,item.name,x+67,yy+2,w-246,21,'#57405b',600);
    v13Text(g,(100*item.value/total).toFixed(1).replace('.',',')+'%',x+w-30,yy-5,23,'#4d3551',800,'right');
    v13Text(g,v13Money(item.value),x+w-30,yy+23,17,'#a98ca1',500,'right');
  });
}
function v13Trend(g,x,y,w,h,items,start,end){
  v13Rounded(g,x,y,w,h,39,'#ffffff');
  v13Text(g,'📈 Andamento generale',x+40,y+57,35,'#48314a',850);
  v13Rounded(g,x+w-340,y+25,142,43,22,'#e3f7ec');v13Ellipse(g,x+w-320,y+46,9,9,'#2cba87');v13Text(g,'Entrate',x+w-298,y+46,19,'#268d67',750);
  v13Rounded(g,x+w-187,y+25,149,43,22,'#ffe9f0');v13Ellipse(g,x+w-166,y+46,9,9,'#f46a93');v13Text(g,'Uscite',x+w-143,y+46,19,'#bd4d73',750);
  const daily=new Map();for(const entry of items){let v=daily.get(entry.date)||{income:0,expense:0};v[entry.kind]+=entry.amount;daily.set(entry.date,v)}
  let p=[],d=parseDate(start),finish=parseDate(end);
  while(d<=finish&&p.length<740){p.push({date:fdate(d),...(daily.get(fdate(d))||{income:0,expense:0})});d.setDate(d.getDate()+1)}
  if(p.length>42){const width=Math.ceil(p.length/42),chunks=[];for(let i=0;i<p.length;i+=width){const slice=p.slice(i,i+width);chunks.push({date:slice.at(-1).date,income:slice.reduce((v,z)=>v+z.income,0),expense:slice.reduce((v,z)=>v+z.expense,0)})}p=chunks}
  let inc=0,exp=0;p=p.map(z=>({...z,income:inc+=z.income,expense:exp+=z.expense}));
  const xx=x+112,rx=x+w-54,top=y+134,bottom=y+h-87,mx=Math.max(1,...p.map(z=>Math.max(z.income,z.expense)));
  g.save();g.strokeStyle='#eedde5';g.lineWidth=2;g.setLineDash([4,7]);for(let i=0;i<5;i++){let gy=bottom-(bottom-top)*i/4;g.beginPath();g.moveTo(xx,gy);g.lineTo(rx,gy);g.stroke();v13Text(g,Math.round(mx*i/4).toLocaleString('it-IT'),xx-15,gy,17,'#b09aa8',500,'right')}g.restore();
  for(let [kind,color,light] of [['income','#20af77','#d3f7e8'],['expense','#ed5d8c','#ffdee9']]){
    if(!p.length)continue;
    const point=(z,i)=>({x:xx+(rx-xx)*(p.length===1?.5:i/(p.length-1)),y:bottom-(bottom-top)*z[kind]/mx});
    g.save();g.fillStyle=light;g.beginPath();g.moveTo(point(p[0],0).x,bottom);p.forEach((z,i)=>{let q=point(z,i);g.lineTo(q.x,q.y)});g.lineTo(point(p.at(-1),p.length-1).x,bottom);g.closePath();g.fill();
    g.strokeStyle=color;g.lineWidth=6;g.lineJoin='round';g.lineCap='round';g.beginPath();p.forEach((z,i)=>{let q=point(z,i);i?g.lineTo(q.x,q.y):g.moveTo(q.x,q.y)});g.stroke();
    const stride=Math.max(1,Math.ceil(p.length/8));p.forEach((z,i)=>{if(i%stride&&i!==p.length-1)return;let q=point(z,i);g.fillStyle='#fff';g.beginPath();g.arc(q.x,q.y,7.5,0,Math.PI*2);g.fill();g.strokeStyle=color;g.lineWidth=4;g.stroke()});g.restore();
    const last=point(p.at(-1),p.length-1);v13Rounded(g,rx-109,last.y+(kind==='income'?-38:13),111,34,17,color);v13Text(g,v13Money(p.at(-1)[kind]),rx-53,last.y+(kind==='income'?-21:30),17,'#fff',750,'center');
  }
  v13Text(g,start.slice(8,10)+'/'+start.slice(5,7),xx,bottom+40,20,'#96798c',550);v13Text(g,end.slice(8,10)+'/'+end.slice(5,7),rx,bottom+40,20,'#96798c',550,'right');
}
function paint(items,start,end,scopeName){
  const totalIn=items.filter(z=>z.kind==='income').reduce((a,b)=>a+b.amount,0),totalOut=items.filter(z=>z.kind==='expense').reduce((a,b)=>a+b.amount,0),balance=totalIn-totalOut;
  // Poster verticale fisso: grafici a torta AFFIANCATI, come nell'esempio scelto.
  const c=document.createElement('canvas');c.width=1200;c.height=2100;const g=c.getContext('2d');
  let grad=g.createLinearGradient(0,0,1200,2100);grad.addColorStop(0,'#fffaf5');grad.addColorStop(1,'#fff3ed');g.fillStyle=grad;g.fillRect(0,0,1200,2100);
  v13Ellipse(g,20,40,290,105,'#fde4e9');v13Ellipse(g,1180,40,285,115,'#ffebeb');v13Ellipse(g,52,2070,240,125,'#e6f6ce');v13Ellipse(g,1152,2077,250,135,'#e2f3c9');
  v13Rounded(g,377,62,118,112,29,'#ffecaf');v13Text(g,'🌈',436,123,68,'#44354a',600,'center');
  v13Text(g,'Soldini',517,104,59,'#d95888',900);v13Text(g,'il portafoglio di famiglia',519,150,26,'#a88ea0',500);
  v13Text(g,'📸 Resoconto mensile',600,248,55,'#432b46',900,'center');
  const sameMonth=start.slice(0,7)===end.slice(0,7);
  const period=sameMonth?parseDate(start).toLocaleDateString('it-IT',{month:'long',year:'numeric'}):`${niceDate(start)} – ${niceDate(end)}`;
  v13Rounded(g,355,292,490,59,29,'#ffe6eb');v13Fit(g,'📅 '+period,600,322,445,28,'#c34379',800,'center');
  v13Text(g,scopeName,600,379,22,'#ad8fa4',600,'center');
  const cards=[{x:31,title:'💸 Uscite totali',val:totalOut,fill:'#ffe0e9',ink:'#ac3562'},{x:431,title:'💚 Entrate totali',val:totalIn,fill:'#daf8e6',ink:'#16845b'},{x:831,title:'✨ Saldo finale',val:balance,fill:'#fff0c2',ink:balance>=0?'#247d52':'#874a6a'}];
  cards.forEach(card=>{v13Rounded(g,card.x,422,338,188,33,card.fill);v13Fit(g,card.title,card.x+23,467,292,28,card.ink,800);v13Text(g,(card.title.includes('Saldo')&&card.val>0?'+':'')+v13Money(card.val),card.x+169,551,39,card.ink,900,'center')});
  v13DonutCard(g,30,648,556,764,'🍰 Dove spendi',items,'expense');
  v13DonutCard(g,614,648,556,764,'🤑 Da dove arrivano le entrate',items,'income');
  v13Trend(g,30,1442,1140,436,items,start,end);
  v13Rounded(g,300,1914,600,52,26,'#fde5e9');v13Fit(g,'Periodo: '+niceDate(start)+' – '+niceDate(end),600,1940,555,22,'#a16986',700,'center');
  v13Rounded(g,360,1975,480,65,30,'#ffe6ec');v13Text(g,balance>=0?'Stai andando bene 🌸':'Tieni d’occhio le spese 🌷',600,2009,30,'#c04b80',850,'center');
  v13Text(g,'Creato con Soldini 🌈',600,2070,19,'#ac8c9c',600,'center');
  return c.toDataURL('image/png');
}
async function collect(scope,user,db){let rows=[];if(scope==='personal'){const snap=await getDocs(collection(db,'users',user.uid,'transactions'));snap.forEach(d=>rows.push({...d.data(),id:d.id}));return rows}const shared=await getDocs(query(collection(db,'spaces'),where('memberIds','array-contains',user.uid)));for(const s of shared.docs){if(scope!=='global'&&s.id!==scope)continue;const snap=await getDocs(collection(db,'spaces',s.id,'transactions'));snap.forEach(d=>rows.push({...d.data(),id:d.id}))}return rows}
function show(){if($('.s12-backdrop'))return;const now=new Date(),m=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;const cover=document.createElement('div');cover.className='s12-backdrop';cover.innerHTML=`<div class="s12-sheet" role="dialog" aria-modal="true" aria-label="Resoconto mensile"><div class="s12-head"><h2>📸 Resoconto in immagine</h2><button class="s12-close" type="button" aria-label="Chiudi">×</button></div><p class="s12-help">Scegli il mese o le date e genera una foto con grafici, categorie, entrate, uscite e saldo. Nessun dato viene modificato.</p><label>Spazio da analizzare<select id="s12-scope"></select></label><label>Periodo<select id="s12-mode"><option value="month">Un mese</option><option value="custom">Da una data a un'altra</option></select></label><div id="s12-month-wrap"><label>Mese<input type="month" id="s12-month" value="${m}"></label></div><div id="s12-dates" style="display:none"><div class="s12-dual"><div><label>Dal<input type="date" id="s12-start"></label></div><div><label>Al<input type="date" id="s12-end"></label></div></div></div><div class="s12-actions"><button class="s12-build" type="button">✨ Genera immagine</button><button class="s12-download" type="button" disabled>⬇ Salva foto</button></div><p class="s12-state" role="status"></p><img class="s12-preview" alt="Anteprima resoconto Soldini" hidden><p class="s12-note">Su iPhone puoi usare «Salva foto» oppure tenere premuto sull'anteprima e scegliere «Salva in Foto». Il grafico riporta i totali cumulativi, non una previsione.</p></div>`;document.body.append(cover);const scope=cover.querySelector('#s12-scope'),mainScope=$('#space-select');if(mainScope)scope.innerHTML=mainScope.innerHTML;else scope.innerHTML='<option value="personal">Personale</option>';scope.value=mainScope?.value||'personal';cover.querySelector('.s12-close').onclick=()=>cover.remove();cover.addEventListener('click',e=>{if(e.target===cover)cover.remove()});const mode=cover.querySelector('#s12-mode');mode.onchange=()=>{cover.querySelector('#s12-month-wrap').style.display=mode.value==='month'?'block':'none';cover.querySelector('#s12-dates').style.display=mode.value==='custom'?'block':'none'};const start=cover.querySelector('#s12-start'),end=cover.querySelector('#s12-end');start.value=fdate(new Date(now.getFullYear(),now.getMonth(),1));end.value=fdate(now);const state=cover.querySelector('.s12-state'),preview=cover.querySelector('.s12-preview'),save=cover.querySelector('.s12-download');cover.querySelector('.s12-build').onclick=async()=>{if(!currentUser||!currentDb){state.textContent='Devi accedere a Soldini prima di generare il resoconto.';return}let a,b;if(mode.value==='month'){a=cover.querySelector('#s12-month').value+'-01';const d=parseDate(a);b=fdate(new Date(d.getFullYear(),d.getMonth()+1,0))}else{a=start.value;b=end.value}if(!a||!b||a>b||(parseDate(b)-parseDate(a))/86400000>730){state.textContent='Seleziona date valide (massimo 2 anni).';return}state.textContent='Sto leggendo i movimenti autorizzati…';save.disabled=true;try{const all=await collect(scope.value,currentUser,currentDb);const items=all.filter(t=>['income','expense'].includes(t.kind)&&Number.isFinite(Number(t.amount))&&Number(t.amount)>0&&typeof t.date==='string'&&t.date>=a&&t.date<=b).map(t=>({...t,amount:Number(t.amount)}));const name=scope.selectedOptions[0]?.textContent?.replace(/^[^\p{L}\p{N}]+/u,'').trim()||'Soldini';lastPng=paint(items,a,b,name);lastName=`Soldini_resoconto_${a}_${b}.png`;preview.src=lastPng;preview.hidden=false;save.disabled=false;state.textContent=`Immagine pronta! ${items.length} movimenti inclusi. Tocca «Salva foto».`}catch(err){console.error('Soldini V12 report:',err);state.textContent='Impossibile leggere i movimenti. Verifica connessione e accessi Firebase.'}};save.onclick=async()=>{if(!lastPng)return;try{const res=await fetch(lastPng),blob=await res.blob(),file=new File([blob],lastName,{type:'image/png'});if(navigator.canShare?.({files:[file]})&&navigator.share){await navigator.share({files:[file],title:'Resoconto Soldini'});return}}catch(e){if(e.name==='AbortError')return}const a=document.createElement('a');a.href=lastPng;a.download=lastName;document.body.append(a);a.click();a.remove();state.textContent='Se il download non parte, tieni premuta l’anteprima e scegli «Salva in Foto».'}}
function boot(){if(!$('#app'))return;if(!$('#s12-report-open')){const b=document.createElement('button');b.type='button';b.id='s12-report-open';b.textContent='📸 Resoconto mensile';const add=$('#soldini-quick-add');if(add)add.insertAdjacentElement('afterend',b);else $('#app .hello')?.insertAdjacentElement('afterend',b);b.onclick=show}const apps=getApps();if(!apps.length){setTimeout(boot,350);return}currentDb=getFirestore(apps[0]);onAuthStateChanged(getAuth(apps[0]),u=>{currentUser=u})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
