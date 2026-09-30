'use strict';
/* ===== modal framework ===== */
let M=null;
function openModal(c){M=Object.assign({ok:'Mentés',rendered:false},c);renderModal();}
function closeModal(){M=null;renderModal();}
function renderModal(){
  const w=$('#modalWrap');if(!M){w.innerHTML='';return;}if(M.rendered)return;M.rendered=true;
  w.innerHTML=`<div class="scrim" data-a="scrim"><div class="modal ${M.wide?'wide':''}" role="dialog" aria-modal="true"><div class="mh"><div><div class="kicker">${M.kicker||''}</div><h3>${M.title}</h3></div><button class="x" data-a="mclose" aria-label="Bezárás">${ic('x')}</button></div><div class="mb" id="mbody">${M.body}</div><div class="mf"><button class="btn" data-a="mclose">${M.noCancel?'Bezárás':'Mégse'}</button>${M.noOk?'':`<button class="btn ${M.bad?'bad':'p'}" data-a="mok">${M.ok}</button>`}</div></div></div>`;
  const f=w.querySelector('input:not([type=checkbox]):not([type=file]),textarea');if(f&&!M.noFocus)f.focus();
}
function fv(){const o={};document.querySelectorAll('#mbody [name]').forEach(e=>{if(e.type==='checkbox')o[e.name]=e.checked;else if(e.type==='file')o[e.name]=e.files[0]||null;else if(e.type==='radio'){if(e.checked)o[e.name]=e.value;}else o[e.name]=e.value;});return o;}
const bad=m=>{toast(m,'bad');return false;};
const fld=(l,inner,hint)=>`<label class="fld">${l}${inner}${hint?`<small>${hint}</small>`:''}</label>`;
const inp=(n,v,o)=>`<input name="${n}" value="${esc(v==null?'':v)}" ${o||''}>`;
const opts=(a,sel)=>a.map(x=>{const v=Array.isArray(x)?x[0]:x,l=Array.isArray(x)?x[1]:x;return `<option value="${esc(v)}" ${String(v)===String(sel)?'selected':''}>${esc(l)}</option>`;}).join('');
const asc=s=>String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_|_$/g,'');
const sample=(p,key,ver)=>`${asc(dl(key)).slice(0,30)}_${asc(p.id)}_v${ver}.${DOCS[key][2]}`;
const num=v=>Number(String(v).replace(/[\s ]/g,'').replace(',','.'));

function addDoc(p,o){
  const prev=docLatest(p,o.key,o.bid),ver=(prev?prev.ver:0)+1;
  const inv=prev?Object.keys(p.appr).filter(k=>boundKey(p,k)===o.key&&p.appr[k].decisions.some(d=>d.ver===prev.ver)):[];
  const d={id:'d'+(++S.dn),key:o.key,ver,name:o.name,size:o.size||Math.round(60+Math.random()*700)*1024,by:S.user,ts:stamp(),bid:o.bid,note:o.note||'',content:o.content||''};
  p.docs.push(d);
  log(p.id,'Dokumentum',(o.title||dl(o.key))+(ver>1?' – új verzió':' feltöltve'),`${d.name} · v${ver}`);
  inv.forEach(k=>log(p.id,'Jóváhagyás','Korábbi jóváhagyások érvénytelenek',`${ATITLE[k]} · új dokumentumverzió (v${ver}) – a döntéseket meg kell ismételni`));
  return d;
}
const F0=(note)=>({by:S.user,ts:stamp(),note:note||''});

/* ===== generated documents ===== */
const tbl=(h,rows)=>`<table><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr>${rows.map(r=>`<tr>${r.map(x=>`<td>${x}</td>`).join('')}</tr>`).join('')}</table>`;
function openingHTML(p){return `<h4>Bontási jegyzőkönyv – ${esc(p.id)}</h4><p>Bontás időpontja: ${fdt(p.f.opened.ts)} · jelen: ${esc(p.f.opened.by)} (adminisztrátor)</p>`+tbl(['Ajánlattevő','Beérkezés','Formai megfelelés','Ár (nettó)'],p.bidders.map(b=>[esc(b.name),b.recv?fdt(b.recv):'nem érkezett',b.status==='lemondó'?'lemondó nyilatkozat':b.formal?'megfelelő':(b.status==='beérkezett'?'nem megfelelő'+(b.late?' (késve)':''):'–'),b.price?ft(b.price):'–']));}
function matrixHTML(p){const r=ranking(p);return `<h4>Kiértékelési mátrix – ${esc(p.id)}</h4><p>Súlyozás: műszaki ${W.t*100}% · kereskedelmi ${W.c*100}%</p>`+tbl(['#','Ajánlattevő','Műszaki','Kereskedelmi','Összesen','Ár'],r.map(x=>[x.rank,esc(x.b.name),x.b.tech,x.comm.toFixed(1),'<b>'+x.total.toFixed(1)+'</b>',ft(x.b.price)]))+`<h4>Javaslat</h4><p>${r[0]?'Legmagasabb összpontszám: '+esc(r[0].b.name)+'.':'–'}</p>`;}
function ssdHTML(p){const n=p.nego,ex=p.bidders.filter(b=>b.isNew).length;const r=ranking(p);
  return `<h4>1. A beszerzés tárgya, értéke</h4><p>${esc(p.subject)} · becsült: ${ft(p.value)}${n?' · tényleges: '+ft(n.final):''}</p><h4>2. Igénylő és besorolás</h4><p>${esc(p.org)} · ${p.cat} · ${typeOf(p.value)} · ${procLabel(p.proc)}</p>
  <h4>3. Meghívott és válaszadó ajánlattevők</h4><p>${p.bidders.map(b=>esc(b.name)+' ('+b.status+')').join('; ')}</p>${validBids(p).length===2?'<p><b>Megjegyzés:</b> két érvényes ajánlat érkezett (szabályzat 9.3.6).</p>':''}
  <h4>4. Értékelési módszer</h4><p>Műszaki ${W.t*100}% / kereskedelmi ${W.c*100}%; részletek: kiértékelési mátrix.</p>${r.length?tbl(['#','Ajánlattevő','Összpont'],r.map(x=>[x.rank,esc(x.b.name),x.total.toFixed(1)])):''}
  <h4>5. Tárgyalás eredménye</h4><p>${n?`Kezdő ár: ${ft(n.initial)} → végső ár: ${ft(n.final)}${n.rebate?' · rabatt/skontó: '+ft(n.rebate):''} · <b>megtakarítás: ${ft(n.saving)}</b>`:'–'}</p>
  <h4>6. Javasolt nyertes</h4><p>${n?esc(n.winnerName):'–'} · minősítési státusz: ${n&&n.isNew?'új (előminősítés szükséges)':'meglévő / jóváhagyott'}</p>
  <h4>7. Kockázatok és mérséklő intézkedések</h4><p>Single-source kockázat, ár- és ellátási kockázat, minőségi kockázat – a szabályzat 9.2.2 szerint értékelve.</p>
  <h4>8. Mellékletek</h4><p>${p.ifs?'IFS-megfelelőségi tanúsítványok · ':''}${tcoReq(p)?'TCO / DCF kalkuláció · ':''}kiértékelési mátrix, tárgyalási jegyzőkönyv.</p>`;}
function tcoCalc(v){let s=v.c0;for(let i=1;i<=v.n;i++)s+=v.k/Math.pow(1+v.r,i);return s-v.res/Math.pow(1+v.r,v.n);}

/* ===== modals ===== */
function mAbout(){openModal({kicker:'A demóról',title:'Fonte Viva Beszerzési Központ – kattintható demó',noOk:1,noCancel:1,body:`<p>Ez a prototípus a <b>Beszerzési szabályzat 01. verzió</b> szerint működik: az értékhatárok, jóváhagyók, kötelező dokumentumok és határidők szabályai be vannak építve.</p><ul><li>Az állapotot nem írják át közvetlenül – csak gombokkal (kiküldés, bontás, jóváhagyás, továbblépés) léphet, így minden változás mögött auditesemény van.</li><li>A jóváhagyás a dokumentum adott verziójához kötött; új verzió érvényteleníti.</li><li>Az auditnapló hash-lánccal kapcsolt, csak hozzáfűzhető.</li><li>Váltson felhasználót a jobb felső menüben a négy szem elv kipróbálásához; a „+1 munkanap” gombbal előreléptetheti a demó idejét.</li></ul><p><b>Éles megvalósítás:</b> Power Apps + SharePoint-listák/dokumentumtár + Power Automate; azonosítás Entra ID-val; tartós megőrzéshez Microsoft Purview. A demó adatai csak ebben a böngészőben tárolódnak.</p>`});}
function mDoc(d){openModal({kicker:'Dokumentum',title:esc(d.name)+' · v'+d.ver,noOk:1,noCancel:1,wide:1,body:`<div class="prev">${d.content}</div>`});}

function mNew(){
  const u=USERS.find(x=>x.n===S.user);
  const cost=(o,sel)=>Object.keys(CC).map(k=>`<option value="${k}" ${k===sel?'selected':''}>${k} · ${esc(CC[k].n)}</option>`).join('');
  const live=v=>{const val=num(v.value)||0,t=typeOf(val),b=$('#nb');if(!b)return;const ap=ccApprover(v.cc,val);
    b.innerHTML=`<span class="pill tone-${typeTone(t)}">${t}</span><div><b>Az érték megadása után automatikus besorolás</b><br><small>${TYPEDESC[t]}. Tenderkiírás: CEO + CFO. Költséghely-jóváhagyó: ${ap?esc(ap):'nem szükséges'}.${v.proc==='Vészhelyzeti'?' Vészhelyzeti: '+(val>=2e6?'CEO':'költséghely-felelős')+' jóváhagyás, dokumentáció 5 munkanapon belül.':''}</small></div>`;
    $('#capexOpt').hidden=v.cat!=='CAPEX';$('#vhOpt').hidden=v.proc!=='Vészhelyzeti';};
  openModal({kicker:'PROC1 · ÚJ IGÉNY',title:'Új beszerzés indítása',ok:'Beszerzés létrehozása',live,
   body:fld('Beszerzés tárgya',inp('subject','','placeholder="Például: új címkenyomtató beszerzése"'))+
   `<div class="row2">${fld('Igénylő szervezet',`<select name="org">${opts(ORGS.map(o=>o[0]),'Somogyvár – karbantartás')}</select>`)}${fld('Költséghely',`<select name="cc">${cost(0,'1255BS2300')}</select>`)}</div>
   <div class="row2">${fld('Becsült nettó érték (Ft)',inp('value','','inputmode="numeric" placeholder="0"'))}${fld('Beszerzési kategória',`<select name="cat">${opts(['Direkt','Indirekt','CAPEX','OPEX'],'OPEX')}</select>`)}</div>
   <div class="row2">${fld('Eljárás',`<select name="proc">${opts([['Tender','Tender'],['SS','Sole Source'],['Vészhelyzeti','Vészhelyzeti']],'Tender')}</select>`)}${fld('Kívánt teljesítés',inp('desired',addD(S.today,60),'type="date"'))}</div>
   ${fld('Igénylő személy',`<select name="requester">${opts(USERS.map(x=>x.n),S.user)}</select>`)}
   <div id="vhOpt" hidden>${fld('Vészhelyzeti indoklás (kötelező)',`<textarea name="reason" rows="2" placeholder="Üzemzavar, minőségi kockázat, hatósági előírás…"></textarea>`)}</div>
   <label class="chk"><input type="checkbox" name="ifs"><span><b>IFS-kritikus beszerzés</b>Minőségirányítási előminősítés és dokumentumkontroll szükséges.</span></label>
   <div id="capexOpt" hidden><label class="chk"><input type="checkbox" name="maint"><span><b>Fenntartó beruházás</b>A TCO/DCF kalkuláció alól mentes.</span></label></div>
   <label class="chk"><input type="checkbox" name="prepay"><span><b>Előlegfizetéssel járó szerződés</b>Bankgarancia vagy CFO eltérés-engedély szükséges.</span></label>
   <label class="chk"><input type="checkbox" name="it"><span><b>IT / adatkezelést érintő</b>Kiberbiztonsági záradék szükséges.</span></label>
   <div class="note" style="margin:0" id="nb"></div>`,
   onOk(v){const val=num(v.value);if(!v.subject.trim())return bad('Adja meg a beszerzés tárgyát.');if(!(val>0))return bad('Adja meg a becsült nettó értéket.');if(v.proc==='Vészhelyzeti'&&!v.reason.trim())return bad('Vészhelyzeti eljárásnál az indoklás kötelező.');
     const t=typeOf(val),prefix=v.proc==='SS'?'SS':v.proc==='Vészhelyzeti'?'VH':t==='Kiemelt'?'BSD':t==='Egyszerű'?'BR':'EG';
     const p={id:nextId(prefix),subject:v.subject.trim(),org:v.org,cc:v.cc,value:val,cat:v.cat,proc:v.proc,ifs:v.ifs,maint:v.cat==='CAPEX'&&v.maint,it:v.it,prepay:v.prepay,requester:v.requester,owner:SCM,stage:1,created:S.today,desired:v.desired,due:{1:addWD(S.today,5)},docs:[],bidders:[],appr:{},f:{},mail:[],round:1,closed:null,nego:null,bidDeadline:null,contractType:null,reclass:false,vhDate:v.proc==='Vészhelyzeti'?S.today:null};
     S.procs.unshift(p);
     log(p.id,'Létrehozás',v.proc==='Vészhelyzeti'?'Vészhelyzeti beszerzés indítva':'Beszerzés létrehozva',`${p.subject} · ${p.cat} · ${ft(val)} · besorolás: ${t}`);
     if(v.proc==='Vészhelyzeti')addDoc(p,{key:'vhReason',name:'Veszhelyzeti_indoklas.txt',note:v.reason});
     U.open=p.id;U.tab='ov';toast(`${p.id} létrehozva – besorolás: ${t}`,'ok');}});
  live({value:'',cc:'1255BS2300',cat:'OPEX',proc:'Tender'});
  const w=$('#mbody');w.querySelector('[name=org]').addEventListener('change',e=>{const o=ORGS.find(x=>x[0]===e.target.value);if(o)w.querySelector('[name=cc]').value=o[1];live(fv());});
}
function mUpload(pid,key,bid,folder){
  const p=P(pid);const keys=folder?Object.keys(DOCS).filter(k=>DOCS[k][1]===+folder&&k!=='bid'&&k!=='invit'):null;
  openModal({kicker:'Dokumentumtár · '+p.id,title:key?dl(key):'Dokumentum feltöltése',ok:'Feltöltés',body:(keys?fld('Dokumentumtípus',`<select name="key">${opts(keys.map(k=>[k,dl(k)]))}</select>`):'')+fld('Fájl',`<input type="file" name="file">`,'Demó: csak a fájlnév és méret kerül rögzítésre. Fájl nélkül mintadokumentum jön létre.')+fld('Megjegyzés / verzióleírás',inp('note','')),
   onOk(v){const k=key||v.key,prev=docLatest(p,k,bid);const name=v.file?v.file.name:sample(p,k,(prev?prev.ver:0)+1);addDoc(p,{key:k,name,size:v.file?v.file.size:0,note:v.note,bid});toast('Dokumentum rögzítve','ok');}});
}
function mBidders(pid){
  const p=P(pid);const list=()=>p.bidders.map(b=>`<div class="docrow"><div class="fi"><b>${esc(b.name)}</b> ${b.isNew?pill('új','warn'):''}${b.type==='Webshop'?pill('webáruház','mut'):''}<br><small>${esc(b.email)}</small></div><button class="btn sm bad" data-a="rmBidder" data-p="${esc(p.id)}" data-b="${b.id}">Eltávolítás</button></div>`).join('')||'<small>Még nincs ajánlattevő.</small>';
  openModal({kicker:'PROC2 · Ajánlattevői lista',title:p.proc==='SS'?'Javasolt beszállító':'Ajánlattevők ('+p.bidders.length+'/3)',ok:'Felvétel',bad:0,
   body:`<div class="card" style="margin-bottom:16px;overflow:hidden">${list()}</div>`+fld('Cégnév',inp('name',''))+`<div class="row2">${fld('E-mail',inp('email',''))}${fld('Típus',`<select name="type">${opts(['Céges','Webshop'])}</select>`,'Webáruházi árajánlat csak egyedi kategóriában (max. 2 a 3-ból).')}</div><label class="chk"><input type="checkbox" name="isNew"><span><b>Új beszállító</b>Beszállítói adatlap és előminősítés szükséges.</span></label>`,
   onOk(v){if(!v.name.trim())return bad('Adja meg a cég nevét.');if(p.proc==='SS'&&p.bidders.length>=1)return bad('Sole Source esetén egyetlen beszállító nevezhető meg.');
     p.bidders.push({id:'b'+(p.bidders.length+1)+uid().slice(1,3),name:v.name.trim(),email:v.email||'nincs@megadva.example',type:v.type,isNew:v.isNew,status:'meghívva',invited:null,recv:null,sender:'',msgId:'',late:false,formal:null,tech:null,price:null,pay:null,lead:null,warr:null,note:''});
     log(p.id,'Ajánlat','Ajánlattevő felvéve',`${v.name.trim()} · ${v.type}${v.isNew?' · új beszállító':''}`);toast('Ajánlattevő felvéve','ok');setTimeout(()=>mBidders(pid),0);}});
}
function mBidRecv(pid,bid){
  const p=P(pid),b=p.bidders.find(x=>x.id===bid),vh=p.proc==='Vészhelyzeti',late=p.bidDeadline&&S.today>p.bidDeadline;
  openModal({kicker:'PROC3 · Ajánlat beérkezése',title:b.name,ok:'Rögzítés',body:(late?`<div class="note bad" style="margin:0 0 14px">${ic('alert')}<div>A határidő (${fDay(p.bidDeadline)}) lejárt – az ajánlat késve érkezettként, formailag érvénytelenként rögzül.</div></div>`:'')+fld('Ajánlat fájlja',`<input type="file" name="file">`,'Az ajánlat tartalma a bontásig zárolt, csak a beérkezés ténye látszik.')+fld('Feladó',inp('sender',b.email))+(vh?fld('Ajánlati ár (nettó Ft)',inp('price',p.value)):'')+fld('Megjegyzés',inp('note','')),
   onOk(v){const prev=docLatest(p,'bid',b.id),ver=(prev?prev.ver:0)+1;b.status='beérkezett';b.recv=stamp();b.sender=v.sender;b.msgId=`<${uid().slice(1)}@${(v.sender.split('@')[1]||'ajanlat.example')}>`;b.late=!!late;b.formal=late?false:(vh?true:null);if(vh)b.price=num(v.price)||p.value;
     addDoc(p,{key:'bid',bid:b.id,name:v.file?v.file.name:asc(b.name)+'_ajanlat_v'+ver+'.pdf',size:v.file?v.file.size:0,note:v.note,title:'Ajánlat beérkezett – '+b.name});
     p.mail.push({dir:'in',ts:b.recv,from:v.sender,to:'arajanlat@fonteviva.hu',subj:'Ajánlat – '+p.subject+' ('+p.id+')',body:'',att:[asc(b.name)+'_ajanlat_v'+ver+'.pdf'],bid:b.id});
     log(p.id,'Ajánlat','Ajánlat beérkezett',`${b.name} · v${ver} · üzenetazonosító: ${b.msgId}${late?' · KÉSVE':''}`);toast('Ajánlat rögzítve – tartalma zárolt a bontásig','ok');}});
}
function mBidDecl(pid,bid){
  const p=P(pid),b=p.bidders.find(x=>x.id===bid);
  openModal({kicker:'PROC3 · Lemondó nyilatkozat',title:b.name,ok:'Rögzítés',body:fld('Nyilatkozat fájlja',`<input type="file" name="file">`)+fld('Indoklás',inp('note','','placeholder="pl. kapacitáshiány"')),
   onOk(v){b.status='lemondó';b.recv=stamp();b.note=v.note;addDoc(p,{key:'bid',bid:b.id,name:v.file?v.file.name:asc(b.name)+'_lemondo_nyilatkozat.pdf',note:v.note,title:'Lemondó nyilatkozat – '+b.name});log(p.id,'Ajánlat','Lemondó nyilatkozat rögzítve',`${b.name}${v.note?' · '+v.note:''}`);}});
}
function mSend(pid){
  const p=P(pid),dflt=addWD(S.today,10),subj=`Ajánlatkérés – ${p.subject} (${p.id})`;
  const pkg=['rfq','qty','pricing','matrixTpl','bsd','contractDraft','nda','ifsReq','msds','supplierForm','cyber'].map(k=>docLatest(p,k)).filter(Boolean);
  openModal({kicker:'PROC3 · Tender kiküldése',title:'Ajánlatkérés kiküldése',ok:'Kiküldés az arajanlat@ címről',
   body:fld('Feladó',inp('from','arajanlat@fonteviva.hu','readonly'))+fld('Címzettek (azonos információ, azonos határidő)',`<div class="card" style="padding:10px 14px">${p.bidders.map(b=>`<span class="pill tone-inf" style="margin:2px">${esc(b.name)} &lt;${esc(b.email)}&gt;</span>`).join('')}</div>`)+fld('Tárgy',inp('subj',subj))+fld('Levél szövege',`<textarea name="body" rows="4">Tisztelt Partnerünk!\n\nMellékelten megküldjük ajánlatkérésünket a(z) „${esc(p.subject)}" tárgyában. Kérjük, ajánlatát az alábbi határidőig küldje meg erre a címre.\n\nÜdvözlettel,\nFonte Viva Kft. – Beszerzés</textarea>`)+fld('Csatolt dokumentumok (jóváhagyott verziók)',`<div>${pkg.map(d=>`<span class="pill tone-mut" style="margin:2px">${ic('doc')} ${esc(d.name)} v${d.ver}</span>`).join('')}</div>`)+fld('Ajánlattételi határidő',inp('dl',dflt,'type="date"'))+`<label class="chk"><input type="checkbox" name="ok"><span><b>Megerősítem</b>A CEO + CFO által jóváhagyott tendercsomag kerül kiküldésre.</span></label>`,
   onOk(v){if(!v.ok)return bad('Erősítse meg a kiküldést.');if(!(v.dl>S.today))return bad('A határidő legyen a mai napnál későbbi.');
     const ts=stamp();p.bidDeadline=v.dl;p.due[3]=v.dl;p.bidders.forEach(b=>b.invited=ts);p.f.sent={by:S.user,ts,to:p.bidders.map(b=>b.name)};
     p.mail.push({dir:'out',ts,from:'arajanlat@fonteviva.hu',to:p.bidders.map(b=>b.email).join(', '),subj:v.subj,body:v.body,att:pkg.map(d=>d.name)});
     addDoc(p,{key:'invit',name:'Meghivo_'+asc(p.id)+'.eml',content:`<h4>${esc(v.subj)}</h4><p>${esc(v.body).replace(/\n/g,'<br>')}</p>`,title:'Tender kiküldve'});
     log(p.id,'Levelezés','Tender kiküldve',`arajanlat@fonteviva.hu · ${p.bidders.length} címzett · határidő: ${fDay(v.dl)}`);toast('Ajánlatkérés kiküldve','ok');}});
}
function mOpenBids(pid){
  const p=P(pid),rec=p.bidders.filter(b=>b.status==='beérkezett');
  openModal({kicker:'PROC3 · Ajánlatbontás',title:'Ajánlatbontás és bontási jegyzőkönyv',wide:1,ok:'Bontás lezárása, jegyzőkönyv',
   body:`<div class="note" style="margin:0 0 14px">${ic('lock')}<div>A bontás a határidő után, az adminisztrátor jelenlétében történik. A rögzített árak a kiértékelés lezárásáig bizalmasak.</div></div>`+(rec.length?`<table class="t"><thead><tr><th>Ajánlattevő</th><th>Formailag megfelelő</th><th>Ár (nettó Ft)</th><th>Fizetési határidő (nap)</th><th>Szállítás (hét)</th><th>Jótállás (hó)</th></tr></thead><tbody>${rec.map(b=>`<tr><td><b>${esc(b.name)}</b><br><small>${fdt(b.recv)}${b.late?' · KÉSVE':''}</small></td><td><input type="checkbox" name="f_${b.id}" ${b.late?'':'checked'} ${b.late?'disabled':''}></td><td><input name="p_${b.id}" style="width:130px" value="${b.price||''}"></td><td><input name="d_${b.id}" style="width:70px" value="${b.pay||''}"></td><td><input name="l_${b.id}" style="width:70px" value="${b.lead||''}"></td><td><input name="w_${b.id}" style="width:70px" value="${b.warr||''}"></td></tr>`).join('')}</tbody></table>`:'<div class="empty">Nem érkezett ajánlat.</div>'),
   onOk(v){for(const b of rec){if(!b.late&&v['f_'+b.id]&&!(num(v['p_'+b.id])>0))return bad('Adja meg a(z) '+b.name+' árát.');}
     rec.forEach(b=>{b.formal=b.late?false:!!v['f_'+b.id];b.price=num(v['p_'+b.id])||null;b.pay=num(v['d_'+b.id])||null;b.lead=num(v['l_'+b.id])||null;b.warr=num(v['w_'+b.id])||null;});
     p.f.opened=F0();addDoc(p,{key:'opening',name:'Bontasi_jegyzokonyv_'+asc(p.id)+'.docx',content:openingHTML(p)});
     const n=validBids(p).length;log(p.id,'Ajánlat','Ajánlatbontás',`Bontási jegyzőkönyv · ${n} érvényes ajánlat, ${p.bidders.filter(b=>b.status==='lemondó').length} lemondó nyilatkozat`);toast('Ajánlatbontás rögzítve – az árak láthatóvá váltak','ok');}});
}
function mEval(pid,bid){
  const p=P(pid),b=p.bidders.find(x=>x.id===bid);
  openModal({kicker:'PROC3 · Értékelés',title:b.name,ok:'Értékelés mentése',
   body:`<label class="chk"><input type="checkbox" name="formal" ${b.formal?'checked':''}><span><b>Formailag megfelelő</b></span></label><div class="row2">${fld('Műszaki pontszám (0–100)',inp('tech',b.tech,'type="number" min="0" max="100"'),'60 pont alatt műszakilag nem megfelelő – kizárható.')}${fld('Ár (nettó Ft)',inp('price',b.price))}</div><div class="row2">${fld('Fizetési határidő (nap)',inp('pay',b.pay))}${fld('Szállítási idő (hét)',inp('lead',b.lead))}</div>${fld('Jótállás (hónap)',inp('warr',b.warr))}${fld('Értékelési indoklás',inp('note',b.note))}`,
   onOk(v){b.formal=v.formal;b.tech=v.tech===''?null:num(v.tech);b.price=num(v.price)||null;b.pay=v.pay===''?null:num(v.pay);b.lead=num(v.lead)||null;b.warr=num(v.warr)||null;b.note=v.note;
     log(p.id,'Értékelés','Ajánlat értékelve',`${b.name} · műszaki: ${b.tech==null?'–':b.tech}${b.tech!=null&&b.tech<60?' (nem megfelelő)':''} · ár: ${b.price?ft(b.price):'–'}`);}});
}
function mTco(pid){
  const p=P(pid),d=p.tcoData||{c0:p.value,k:Math.round(p.value*.05),n:10,r:.09,res:Math.round(p.value*.1)};
  const live=v=>{const x={c0:num(v.c0),k:num(v.k),n:Math.max(1,Math.round(num(v.n))),r:num(v.r)/100,res:num(v.res)};$('#tcoRes').textContent=ft(tcoCalc(x));};
  openModal({kicker:'CAPEX · 7. melléklet',title:'TCO / DCF számoló',ok:'Mentés a dokumentumtárba',live,body:`<div class="row2">${fld('Kezdő költség C₀ (Ft)',inp('c0',d.c0))}${fld('Éves üzemeltetési + karbantartási költség K (Ft)',inp('k',d.k))}</div><div class="row2">${fld('Élettartam n (év)',inp('n',d.n))}${fld('WACC r (%)',inp('r',(d.r*100).toFixed(1)))}</div>${fld('Maradványérték (Ft)',inp('res',d.res))}<div class="note ok" style="margin:0">${ic('check')}<div><b>Diszkontált TCO</b> = C₀ + Σ Kᵢ/(1+r)ⁱ − maradványérték/(1+r)ⁿ<br><b style="font-size:20px" id="tcoRes"></b></div></div>`,
   onOk(v){const x={c0:num(v.c0),k:num(v.k),n:Math.max(1,Math.round(num(v.n))),r:num(v.r)/100,res:num(v.res)};if(!(x.c0>0))return bad('Adja meg a kezdő költséget.');x.result=tcoCalc(x);p.tcoData=x;
     addDoc(p,{key:'tco',name:'TCO_kalkulacio_'+asc(p.id)+'.xlsx',content:`<h4>TCO / DCF – ${esc(p.id)}</h4>`+tbl(['Tétel','Érték'],[['Kezdő költség',ft(x.c0)],['Éves üzemeltetési költség',ft(x.k)],['Élettartam',x.n+' év'],['WACC',(x.r*100).toFixed(1)+'%'],['Maradványérték',ft(x.res)],['<b>Diszkontált TCO</b>','<b>'+ft(x.result)+'</b>']])});toast('TCO rögzítve','ok');}});
  live(fv());
}
function mNego(pid){
  const p=P(pid),cand=(ranking(p).length?ranking(p).map(r=>r.b):validBids(p).length?validBids(p):p.bidders.filter(b=>b.status==='beérkezett'||p.proc==='SS'));
  if(!cand.length)return toast('Nincs kiválasztható beszállító.','bad');
  const first=cand[0];let lastW=first.id;
  const live=v=>{if(v.winner!==lastW){lastW=v.winner;const b=cand.find(x=>x.id===v.winner);document.querySelector('#mbody [name=initial]').value=b.price||'';}};
  openModal({kicker:'PROC4 · Tárgyalás',title:'Tárgyalási kör lezárása',ok:'Rögzítés',live,body:fld('Nyertes beszállító',`<select name="winner">${cand.map((b,i)=>`<option value="${b.id}">${i+1}. ${esc(b.name)}${b.isNew?' (új)':''}</option>`).join('')}</select>`,'Az ártárgyalás eredményét az ajánlattevő módosított, írásos ajánlatban megerősíti.')+`<div class="row2">${fld('Kezdő ár (Ft)',inp('initial',first.price||p.value))}${fld('Végső ár (Ft)',inp('final',first.price||p.value))}</div>${fld('Rabatt / skontó (Ft, opcionális)',inp('rebate','0'))}${fld('Tárgyalási jegyzet',inp('note',''))}`,
   onOk(v){const b=cand.find(x=>x.id===v.winner),ini=num(v.initial),fin=num(v.final),reb=num(v.rebate)||0;if(!(ini>0&&fin>0))return bad('Adja meg a kezdő és végső árat.');
     p.nego={winner:b.id,winnerName:b.name,initial:ini,final:fin,rebate:reb,saving:ini-fin+reb,isNew:!!b.isNew,note:v.note,ts:stamp(),by:S.user};
     addDoc(p,{key:'nego',name:'Targyalasi_jegyzokonyv_'+asc(p.id)+'.docx',content:`<h4>Tárgyalási jegyzőkönyv</h4><p>Nyertes: ${esc(b.name)}<br>Kezdő ár: ${ft(ini)} → végső ár: ${ft(fin)}<br>Megtakarítás: <b>${ft(p.nego.saving)}</b></p><p>${esc(v.note)}</p>`});
     log(p.id,'Értékelés','Tárgyalási kör lezárva',`Nyertes: ${b.name} · ${ft(ini)} → ${ft(fin)} · megtakarítás: ${ft(p.nego.saving)}`);toast('Tárgyalás rögzítve','ok');}});
}
const PREQ=['Cégkivonat (30 napnál nem régebbi)','Adószám és közösségi adószám (NAV / VIES)','Köztartozás-mentesség','Tényleges tulajdonos (BO) nyilatkozat','Felelősségbiztosítás igazolása','Beszállítói adatlap + adatkezelési tájékoztató','IFS / BRC / FSSC 22000 / ISO 9001 tanúsítvány','Specifikáció, EU 1935/2004 és 10/2011 megfelelőségi nyilatkozat','Kioldódási vizsgálat, allergén-nyilatkozat','COA/DoC garancia, nyomonkövethetőség, mock recall','MI értékelés (max. 5 munkanap)','Pénzügyi stabilitás ellenőrzése','MDM felvétel indítva (BC)'];
function mPrequal(pid){
  const p=P(pid),sel=p.f.prequalItems||[];
  openModal({kicker:'PROC4 · 10.1',title:'Beszállítói előminősítés – '+(p.nego?p.nego.winnerName:''),ok:'Mentés',body:PREQ.map((x,i)=>`<label class="chk" style="padding:10px 14px;margin-bottom:8px"><input type="checkbox" name="c${i}" ${sel.includes(i)?'checked':''}><span>${x}</span></label>`).join(''),
   onOk(v){const c=PREQ.map((x,i)=>i).filter(i=>v['c'+i]);p.f.prequalItems=c;if(c.length===PREQ.length){p.f.prequal=F0('minden dokumentum rendben');log(p.id,'Értékelés','Előminősítés lezárva',(p.nego?p.nego.winnerName:'')+' · minden kötelező elem rendben');toast('Előminősítés kész','ok');}else toast(`Előminősítés folyamatban (${c.length}/${PREQ.length})`);}});
}
function mCtype(pid){const p=P(pid);openModal({kicker:'PROC5',title:'Szerződéstípus',body:fld('Típus',`<select name="t">${opts(['PO','ICO – egyedi szerződés','FCO – keretszerződés (max. 3 év)','Előrevásárlás – alapanyag-előrevásárlási szerződés','Csatlakozási szerződés'])}</select>`),onOk(v){p.contractType=v.t;if(v.t.startsWith('Előrevásárlás'))p.prepay=true;log(p.id,'Dokumentum','Szerződéstípus kiválasztva',v.t);}});}
function mInput(pid,key){const p=P(pid),L={po:['PO kibocsátása','PO-szám (BC)','4500019'],bc:['Szerződés rögzítése BC-ben','BC szerződésszám','FCO-2026-']};
  openModal({kicker:'PROC6',title:L[key][0],body:fld(L[key][1],inp('n',L[key][2]+String(Math.floor(Math.random()*900+100)))),onOk(v){if(!v.n.trim())return bad('Adja meg az azonosítót.');p.f[key]=F0(v.n.trim());log(p.id,'Dokumentum',key==='po'?'PO kibocsátva':'Szerződés rögzítve BC-ben',v.n.trim());}});}
function mFlag(pid,key){const p=P(pid),i=checklist(p).find(x=>x.id==='f-'+key);
  openModal({kicker:'Igazolás · '+p.id,title:i?i.label:key,ok:'Igazolom',body:fld('Megjegyzés (opcionális)',inp('note',''),'Az igazolás felhasználóhoz és időbélyeghez kötve az auditnaplóba kerül.'),onOk(v){p.f[key]=F0(v.note);log(p.id,'Értékelés','Igazolás: '+(i?(i.short||i.label):key),`${S.user}${v.note?' · '+v.note:''}`);}});}
function mDecide(pid,key,dec){
  const p=P(pid),a=apprState(p,key),ap=dec==='approve';
  openModal({kicker:ATITLE[key],title:ap?'Jóváhagyás megerősítése':'Elutasítás',ok:ap?'Jóváhagyom':'Elutasítom',bad:!ap,body:`<div class="note" style="margin:0 0 14px">${ic('shield')}<div>A döntés a <b>${a.doc?esc(dl(a.bound))+' v'+a.ver:'beszerzés'}</b> dokumentumverzióhoz és a jelenlegi időbélyeghez kötődik (${esc(S.user)}). Új verzió feltöltése érvényteleníti.</div></div><p><b>${esc(p.subject)}</b> · ${ft(p.value)}</p>`+fld(ap?'Megjegyzés (opcionális)':'Indoklás (kötelező)',`<textarea name="c" rows="3"></textarea>`),
   onOk(v){if(!ap&&!v.c.trim())return bad('Elutasításhoz indoklás szükséges.');if(!decide(p,key,dec,v.c))return false;toast(ap?'Jóváhagyva':'Elutasítva',ap?'ok':'');}});
}
function mTask(pid){
  openModal({kicker:'Feladatkezelés',title:'Új feladat',ok:'Feladat létrehozása',body:fld('Feladat megnevezése',inp('title',''))+fld('Leírás – mi a feladat?',`<textarea name="desc" rows="3"></textarea>`)+`<div class="row2">${fld('Felelős',`<select name="owner">${opts(USERS.map(u=>[u.n,u.n+' – '+u.role]),S.user)}</select>`)}${fld('Határidő',inp('due',addWD(S.today,3),'type="date"'))}</div>`+fld('Kapcsolódó beszerzés',`<select name="pid"><option value="">– nincs –</option>${S.procs.map(x=>`<option value="${esc(x.id)}" ${x.id===pid?'selected':''}>${esc(x.id)} · ${esc(x.subject)}</option>`).join('')}</select>`),
   onOk(v){if(!v.title.trim())return bad('Adja meg a feladat nevét.');if(!v.due)return bad('Adja meg a határidőt.');S.tasks.push({id:uid(),pid:v.pid,title:v.title.trim(),desc:v.desc,owner:v.owner,by:S.user,due:v.due,done:null});log(v.pid,'Feladat','Feladat létrehozva',`${v.title.trim()} · felelős: ${v.owner} · határidő: ${fDay(v.due)}`);toast('Feladat létrehozva','ok');}});
}
function mResolve1(pid){
  const p=P(pid);openModal({kicker:'PROC3 · 9.3.6',title:'Érvényes ajánlatok száma: '+validBids(p).length,ok:'Döntés rögzítése',body:`<label class="chk"><input type="radio" name="r" value="ss" checked><span><b>Folytatás Sole Source-ként (SS-átsorolás)</b>SS indoklás és jóváhagyás szükséges a kiválasztás előtt.</span></label><label class="chk"><input type="radio" name="r" value="re"><span><b>Újratendereztetés módosított feltételekkel</b>Új CEO + CFO jóváhagyás szükséges; a korábbi ajánlatok megőrződnek.</span></label>`+fld('Indoklás (ÉB / SCM vezető döntése)',inp('n','')),
   onOk(v){if(!v.n.trim())return bad('Adja meg az indoklást.');
     if(v.r==='ss'){p.proc='SS';p.reclass=true;p.f.singleResolved=F0('SS-átsorolás: '+v.n);log(p.id,'Értékelés','SS-átsorolás',v.n);}
     else{p.round++;p.bidders.forEach(b=>{b.status='meghívva';b.formal=null;b.tech=null;b.price=null;b.recv=null;b.late=false;});p.f.sent=null;p.f.opened=null;p.f.commDone=null;p.f.singleResolved=null;delete p.appr.tender;p.bidDeadline=null;p.stage=2;p.due[2]=addWD(S.today,5);log(p.id,'Státusz','Újratendereztetés',`${v.n} · PROC3 → PROC2 (${p.round}. kör)`);}
     toast('Döntés rögzítve','ok');}});
}
function mFail(pid){const p=P(pid);openModal({kicker:'SCM vezető döntése',title:'Eljárás sikertelenné nyilvánítása',bad:1,ok:'Sikertelen',body:fld('Indoklás (kötelező)',`<textarea name="r" rows="3" placeholder="Az ajánlatok jelentősen meghaladják a költségkeretet / egyik sem felel meg műszakilag…"></textarea>`)+'<small>Új tender indítható módosított specifikációval vagy szélesebb ajánlattevői körrel.</small>',
  onOk(v){if(!v.r.trim())return bad('Az indoklás kötelező.');p.closed={ts:stamp(),by:S.user,failed:true,reason:v.r};log(p.id,'Státusz','Eljárás sikertelen',v.r);toast('Az eljárás sikertelenként lezárva');}});}
function mClose(pid){const p=P(pid);openModal({kicker:'PROC6',title:'Beszerzés lezárása',ok:'Lezárás',body:`<div class="note ok" style="margin:0">${ic('lock')}<div>Lezáráskor a tendercsomag zárolt állapotba kerül, és rákerül a szabályzat szerinti megőrzési idő (szerződés lejárta + 8 év; PO/számla 8 év; tenderdokumentáció 5 év). Éles környezetben ehhez Microsoft Purview record label alkalmazható.</div></div>`,
  onOk(){p.closed={ts:stamp(),by:S.user,failed:false};log(p.id,'Státusz','Beszerzés lezárva','Dokumentumtár zárolva · megőrzés: szerződés lejárta + 8 év');toast('Beszerzés lezárva','ok');}});}
