'use strict';
/* ===== Documents ===== */
const docs=(p,key,bid)=>p.docs.filter(d=>d.key===key&&(bid===undefined||d.bid===bid));
const docLatest=(p,key,bid)=>{const a=docs(p,key,bid);return a.length?a[a.length-1]:null;};
const skipped=p=>p.proc==='Vészhelyzeti'?[2,3,4,5]:p.proc==='SS'?[3]:[];
const nextStage=p=>{let n=p.stage+1;while(skipped(p).includes(n)&&n<6)n++;return n;};
const tcoReq=p=>p.cat==='CAPEX'&&!p.maint;

/* ===== Approvals ===== */
const ATITLE={igeny:'Beszerzési igény',tender:'Tenderkiírás',ssd:'Beszállító-kiválasztás (SSD)',ss:'Sole Source indoklás',vh:'Vészhelyzeti beszerzés',jogi:'Jogi vélemény',penz:'Pénzügyi vélemény',sign:'Szerződés cégszerű aláírása',bgWaive:'Eltérés a bankgaranciától'};
const ADESC={igeny:'Költséghely szerinti jóváhagyás (8.1 mátrix)',tender:'Tenderindítási jóváhagyás – CEO + CFO együtt',ssd:'SSD ügyvezetői jóváhagyása',ss:'Versenyeztetés alóli felmentés jóváhagyása',vh:'Vészhelyzeti beszerzés jóváhagyása',jogi:'Jogi véleményezés (5 munkanap)',penz:'Pénzügyi véleményezés (5 munkanap)',sign:'Aláírás jóváhagyása – CEO + CFO együtt',bgWaive:'Kizárólag CFO engedélyezheti'};
function required(p,k){
  const t=typeOf(p.value);
  if(k==='igeny'){const a=ccApprover(p.cc,p.value);const r=a?[a]:[];if(t==='Kiemelt'&&!r.includes(SCM))r.push(SCM);return r;}
  if(k==='tender'||k==='sign')return [CEO,CFO];
  if(k==='ssd'||k==='ss')return t==='Kiemelt'?[CEO,CFO]:[ccApprover(p.cc,p.value)||SCM];
  if(k==='vh')return p.value>=2e6?[CEO]:[ccApprover(p.cc,p.value)||SCM];
  if(k==='jogi')return [JOGI];if(k==='penz')return [PENZ];if(k==='bgWaive')return [CFO];
  return [];
}
const BOUND={igeny:'spec',ssd:'ssd',ss:'ssForm',vh:'vhReason',jogi:'contractFinal',penz:'contractFinal',sign:'contractFinal'};
const boundKey=(p,k)=>k==='tender'?(typeOf(p.value)==='Kiemelt'?'bsd':'rfq'):(BOUND[k]||null);
function apprState(p,key){
  const req=required(p,key),a=p.appr[key],bk=boundKey(p,key),bd=bk?docLatest(p,bk):null,ver=bd?bd.ver:1;
  const per=req.map(n=>{const ds=a?a.decisions.filter(d=>d.by===n):[];const cur=ds.filter(d=>d.ver===ver).pop(),old=ds.filter(d=>d.ver!==ver).pop();
    return {name:n,state:cur?(cur.dec==='approve'?'approved':'rejected'):(old?'stale':'pending'),dec:cur||old};});
  let status='none';
  if(a){status='pending';if(per.some(x=>x.state==='rejected'))status='rejected';else if(per.length&&per.every(x=>x.state==='approved'))status='approved';}
  return {key,required:req,per,status,requested:!!a,req:a&&a.req,bound:bk,doc:bd,ver};
}
function pendingFor(user){
  const out=[];
  S.procs.forEach(p=>{if(p.closed)return;Object.keys(p.appr).forEach(k=>{const a=apprState(p,k);
    if(a.status==='pending'&&a.per.some(x=>x.name===user&&(x.state==='pending'||x.state==='stale')))out.push({p,key:k,a});});});
  return out;
}
function decide(p,key,dec,comment){
  const a=apprState(p,key);const me=a.per.find(x=>x.name===S.user);
  if(!me){toast('Ezt a jóváhagyást nem Ön végzi. Kérheti: '+a.required.join(' + '),'bad');return false;}
  if((key==='ssd'||key==='ss')&&S.user===p.requester){toast('Az igénylő nem vehet részt a végső jóváhagyásban (9.4.4).','bad');return false;}
  if(a.bound&&!a.doc){toast('Nincs jóváhagyandó dokumentum.','bad');return false;}
  p.appr[key].decisions.push({by:S.user,dec,ts:stamp(),ver:a.ver,c:comment||''});
  const na=apprState(p,key);
  log(p.id,'Jóváhagyás',(dec==='approve'?ATITLE[key]+' jóváhagyva':ATITLE[key]+' elutasítva'),`${S.user} · ${a.bound?dl(a.bound)+' v'+a.ver:'—'}${comment?' · „'+comment+'"':''}${na.status==='approved'?' · minden jóváhagyó döntött':''}`);
  return true;
}

/* ===== Bids ===== */
const allResp=p=>p.bidders.length>0&&p.bidders.every(b=>b.status!=='meghívva');
const validBids=p=>p.bidders.filter(b=>b.status==='beérkezett'&&b.formal===true);
const techOk=b=>b.tech!=null&&b.tech>=60;
const commFilled=b=>b.price>0&&b.pay!=null&&b.lead>0;
const techDone=p=>{const v=validBids(p);return v.length>0&&v.every(b=>b.tech!=null);};
function ranking(p){
  const c=validBids(p).filter(b=>techOk(b)&&commFilled(b));if(!c.length)return [];
  const minP=Math.min(...c.map(b=>b.price)),minL=Math.min(...c.map(b=>b.lead));
  const r=c.map(b=>{const sp=minP/b.price*100,spay=Math.min(100,(b.pay||0)/60*100),sl=minL/b.lead*100;const comm=.6*sp+.2*spay+.2*sl;return {b,sp,spay,sl,comm,total:W.t*b.tech+W.c*comm};});
  r.sort((a,b)=>b.total-a.total);r.forEach((x,i)=>x.rank=i+1);return r;
}
const bidVisible=p=>!!p.f.opened;

/* ===== Checklist engine ===== */
function checklist(p){
  const L=[],s=p.stage,t=typeOf(p.value);
  if(p.closed)return L;
  const push=o=>L.push(Object.assign({acts:[]},o));
  const dI=(key,label,who,o)=>{const d=docLatest(p,key);push(Object.assign({id:'d-'+key,label,who,done:!!d,ev:d?`${d.name} · v${d.ver} · ${d.by}`:'',acts:[{a:'doc',k:key,l:d?'Új verzió':'Feltöltés',p:!d}]},o||{}));};
  const fI=(key,label,who,o)=>{const f=p.f[key];push(Object.assign({id:'f-'+key,label,who,done:!!f,ev:f?`${f.by} · ${fdt(f.ts)}${f.note?' · '+f.note:''}`:'',acts:f?[]:[{a:'flag',k:key,l:'Igazolom',p:true}]},o||{}));};
  const aI=(key,label,o)=>{const a=apprState(p,key);const miss=a.bound&&!a.doc;push(Object.assign({id:'a-'+key,label,short:ATITLE[key]+' jóváhagyása',who:a.required.join(' + '),done:a.status==='approved',appr:a,acts:a.requested?[]:[{a:'apprReq',k:key,l:'Jóváhagyás indítása',p:true}],blocked:!a.requested&&miss?'Előbb töltse fel: '+dl(a.bound):null},o||{}));};
  const VH=p.proc==='Vészhelyzeti',SS=p.proc==='SS';
  const newSup=p.bidders.some(b=>b.isNew);
  if(s===1){
    if(VH){dI('vhReason','Írásos indoklás (üzemzavar, minőségi kockázat, hatósági előírás)',p.requester);aI('vh','Vészhelyzeti beszerzés jóváhagyása (költséghely-felelős / CEO)');}
    else{dI('spec','Műszaki / minőségi specifikáció, mennyiség, ütemezés',p.requester);
      push({id:'auto-req',label:'Kötelező igénytartalom rögzítve (tárgy, érték, határidő, IFS-besorolás)',who:p.requester,done:true,ev:'Az űrlap kitöltése automatikusan ellenőrzött'});
      if(required(p,'igeny').length)aI('igeny','Igény jóváhagyása (költséghely-felelős)');}
  }
  if(s===2&&!VH){
    fI('strategy','Beszerzési stratégia: meglévő keretszerződés / készlet és alternatív beszállítók vizsgálata',p.owner);
    if(p.ifs)fI('ifsRisk','IFS kockázatértékelés és beszállítói kategória jóváhagyása',MI);
    if(SS){push({id:'ssSup',label:'Az egyetlen javasolt beszállító megnevezése',who:p.owner,done:p.bidders.length===1,acts:[{a:'bidders',l:'Beszállító',p:p.bidders.length!==1}]});
      dI('ssForm',dl('ssForm'),p.owner);if(newSup)dI('supplierForm','Beszállítói adatlap (új beszállító)',p.owner);if(p.ifs)dI('ifsReq',dl('ifsReq'),MI);aI('ss','Sole Source indoklás jóváhagyása');}
    else{
      const nb=p.bidders.length,web=p.bidders.filter(b=>b.type==='Webshop').length,okList=nb>=3&&(t==='Egyedi'?web<=2:web===0);
      push({id:'bidlist',label:`Ajánlattevői lista: min. 3 meghívott (${nb}/3)`+(t==='Egyedi'?' – max. 2 webáruházi árajánlat':''),short:'Ajánlattevői lista',who:p.owner,done:okList,ev:okList?p.bidders.map(b=>b.name).join(', '):'',acts:p.f.sent?[]:[{a:'bidders',l:'Ajánlattevők',p:!okList}]});
      const pkg=[['rfq',1],['qty',1],['pricing',t!=='Egyedi'],['matrixTpl',t!=='Egyedi'],['contractDraft',t==='Kiemelt'],['nda',t==='Kiemelt'],['cyber',p.it&&t!=='Egyedi'],['ifsReq',p.ifs],['msds',p.ifs&&p.cat==='Direkt'],['supplierForm',newSup],['bsd',t==='Kiemelt']];
      pkg.forEach(x=>{if(x[1])dI(x[0],dl(x[0]),x[0]==='ifsReq'||x[0]==='msds'?MI:p.owner);});
      const miss=pkg.filter(x=>x[1]&&!docLatest(p,x[0])).length;
      aI('tender','Tenderkiírás jóváhagyása (CEO + CFO együtt)',{blocked:!p.appr.tender&&miss?`Előbb töltse fel a tendercsomag hiányzó dokumentumait (${miss} db)`:(!p.appr.tender&&!okList?'Előbb állítsa össze az ajánlattevői listát':null)});
    }
  }
  if(s===3&&p.proc==='Tender'){
    const ta=apprState(p,'tender'),n=p.bidders.length,rc=p.bidders.filter(b=>b.status!=='meghívva').length;
    push({id:'send',label:'Tender kiküldése az arajanlat@fonteviva.hu címről',short:'Tender kiküldése',who:p.owner,done:!!p.f.sent,ev:p.f.sent?`${p.f.sent.by} · ${fdt(p.f.sent.ts)} · ${n} címzett · határidő: ${fDay(p.bidDeadline)}`:'',blocked:!p.f.sent&&ta.status!=='approved'?'A kiküldéshez CEO + CFO jóváhagyás szükséges':null,acts:p.f.sent?[]:[{a:'send',l:'Kiküldés',p:true}]});
    push({id:'resp',label:`Ajánlatok / lemondó nyilatkozatok beérkezése (${rc}/${n})`,short:'Ajánlattételi határidő',who:ADM,due:p.bidDeadline,done:!!p.f.sent&&(allResp(p)||(p.bidDeadline&&S.today>=p.bidDeadline)||!!p.f.opened),ev:p.f.sent?'Ajánlattételi határidő: '+fDay(p.bidDeadline):'',acts:[{a:'tab',k:'bids',l:'Ajánlatok'}]});
    const early=p.bidDeadline&&S.today<p.bidDeadline&&!allResp(p);
    push({id:'open',label:'Ajánlatbontás és bontási jegyzőkönyv',short:'Ajánlatbontás',who:ADM,due:p.bidDeadline,done:!!p.f.opened,ev:p.f.opened?`${p.f.opened.by} · ${fdt(p.f.opened.ts)}`:'',blocked:!p.f.opened&&(!p.f.sent?'Előbb küldje ki a tendert':(early?`A határidő (${fDay(p.bidDeadline)}) előtt nem bontható`:null)),acts:p.f.opened?[]:[{a:'open',l:'Ajánlatbontás',p:true}]});
    if(p.f.opened){
      const v=validBids(p).length;
      if(v<=1)push({id:'single',label:v===0?'Nincs érvényes ajánlat: sikertelen tender vagy újratendereztetés':'Egyetlen érvényes ajánlat: SS-átsorolás vagy újratendereztetés (ÉB / SCM vezető dönt)',short:'Egyetlen érvényes ajánlat – döntés',who:SCM,done:!!p.f.singleResolved,ev:p.f.singleResolved?p.f.singleResolved.note:'',acts:p.f.singleResolved?[]:[{a:'resolve1',l:'Döntés',p:true}]});
      else if(v===2)push({id:'two',label:'Két érvényes ajánlat: a tényt az SSD-ben rögzíteni kell (9.3.6)',who:p.owner,done:true,ev:'Automatikus megjegyzés kerül az SSD-be'});
      push({id:'tech',label:`Műszaki értékelés az előre meghatározott kritériumok szerint (${validBids(p).filter(b=>b.tech!=null).length}/${v})`,short:'Műszaki értékelés',who:p.requester,done:techDone(p),acts:[{a:'tab',k:'bids',l:'Értékelés',p:!techDone(p)}]});
      const ready=techDone(p)&&validBids(p).filter(techOk).every(commFilled)&&validBids(p).filter(techOk).length>0;
      fI('commDone','Kereskedelmi értékelés lezárása (ár, fizetési feltétel, szállítási idő, jótállás)',p.owner,{short:'Kereskedelmi értékelés lezárása',due:p.due[3],blocked:!p.f.commDone&&!ready?'Műszaki pontszámok és kereskedelmi adatok szükségesek minden műszakilag megfelelő ajánlathoz':null,acts:p.f.commDone?[]:[{a:'commClose',l:'Lezárás',p:true}]});
      if(tcoReq(p))dI('tco','TCO / DCF kalkuláció (CAPEX esetén kötelező)',p.owner,{acts:[{a:'tco',l:docLatest(p,'tco')?'Újraszámolás':'TCO számoló',p:!docLatest(p,'tco')},{a:'doc',k:'tco',l:'Feltöltés'}]});
      push({id:'matrix',label:'Egységes kiértékelési mátrix (2. melléklet)',who:p.owner,done:!!docLatest(p,'matrix'),ev:docLatest(p,'matrix')?`${docLatest(p,'matrix').name} · v${docLatest(p,'matrix').ver}`:'',blocked:!docLatest(p,'matrix')&&!p.f.commDone?'A kereskedelmi értékelés lezárása után generálható':null,acts:[{a:'genMatrix',l:docLatest(p,'matrix')?'Újragenerálás':'Generálás',p:!docLatest(p,'matrix')}]});
      if(t==='Kiemelt')fI('ndaSigned','Titoktartási és összeférhetetlenségi nyilatkozatok (adminisztrátor, ÉB-tagok)',ADM);
    }
  }
  if(s===4){
    push({id:'nego',label:'Tárgyalási kör lezárása és nyertes beszállító kiválasztása',short:'Tárgyalás lezárása',who:p.owner,done:!!p.nego,ev:p.nego?`Nyertes: ${p.nego.winnerName} · végső ár: ${ft(p.nego.final)} · megtakarítás: ${ft(p.nego.saving)}`:'',acts:p.nego?[]:[{a:'nego',l:'Tárgyalás rögzítése',p:true}]});
    if(p.nego&&p.nego.final<p.nego.initial)dI('revised',dl('revised'),p.owner);
    if(p.nego&&p.nego.isNew)fI('prequal','Új beszállító előminősítése (MI ≤ 5 munkanap, Pénzügy, MDM)',MI,{acts:[{a:'prequal',l:'Előminősítés',p:!p.f.prequal}]});
    if(p.ifs)dI('ifsCert',dl('ifsCert'),MI);
    if((SS||p.reclass)&&tcoReq(p))dI('tco',dl('tco'),p.owner,{acts:[{a:'tco',l:'TCO számoló',p:true},{a:'doc',k:'tco',l:'Feltöltés'}]});
    if(p.reclass){dI('ssForm',dl('ssForm'),p.owner);aI('ss','Sole Source indoklás jóváhagyása');}
    dI('ssd','Supplier Selection Document (SSD) – eredmény, megtakarítás, kockázatok',p.owner,{blocked:!docLatest(p,'ssd')&&!p.nego?'A tárgyalás rögzítése után generálható':null,acts:[{a:'genSSD',l:docLatest(p,'ssd')?'Újragenerálás':'SSD generálása',p:!docLatest(p,'ssd')},{a:'doc',k:'ssd',l:'Feltöltés'}]});
    aI('ssd','SSD jóváhagyása (az igénylő nem szavazhat)');
  }
  if(s===5){
    push({id:'ctype',label:'Szerződéstípus kiválasztása (PO / ICO / FCO / előrevásárlás / csatlakozási)',who:p.owner,done:!!p.contractType,ev:p.contractType||'',acts:p.contractType?[]:[{a:'ctype',l:'Kiválasztás',p:true}]});
    dI('contractFinal','Szerződés / PO-dokumentum végleges tervezete',p.owner);
    if(t==='Kiemelt'){aI('jogi','Jogi véleményezés (20 M Ft felett, 5 munkanap)');aI('penz','Pénzügyi véleményezés (20 M Ft felett, 5 munkanap)');}
    if(p.prepay){const bg=!!docLatest(p,'bankGuar'),w=apprState(p,'bgWaive');push({id:'bg',label:'Előleg esetén: bankgarancia csatolva vagy CFO írásos eltérés-engedély',who:PENZ+' + '+CFO,done:bg||w.status==='approved',appr:w.requested?w:null,ev:bg?'Bankgarancia csatolva':'',acts:bg?[]:[{a:'doc',k:'bankGuar',l:'Bankgarancia',p:true}].concat(w.requested?[]:[{a:'apprReq',k:'bgWaive',l:'CFO eltérés kérése'}])});}
    const sg=apprState(p,'sign'),pre=(t!=='Kiemelt'||(apprState(p,'jogi').status==='approved'&&apprState(p,'penz').status==='approved'));
    aI('sign','Cégszerű aláírás jóváhagyása (CEO + CFO együttesen)',{blocked:!sg.requested&&!docLatest(p,'contractFinal')?'Előbb töltse fel a szerződés végleges tervezetét':(!sg.requested&&!pre?'A jogi és pénzügyi vélemény szükséges':null)});
    dI('contractSigned','Aláírt példány (Netlock e-aláírás vagy papír + szkennelt másolat)',p.owner,{blocked:!docLatest(p,'contractSigned')&&sg.status!=='approved'?'Az aláírás-jóváhagyás után tölthető fel':null});
  }
  if(s===6){
    if(VH){const due=addWD(p.vhDate,5);
      dI('vhProtocol','Vészhelyzeti jegyzőkönyv (6. melléklet)',p.owner,{short:'Vészhelyzeti dokumentáció lezárása',due});dI('ssForm',dl('ssForm'),p.owner,{due});
      push({id:'quote',label:'Beérkezett ajánlat(ok) rögzítve',who:p.owner,due,done:p.docs.some(d=>d.key==='bid'),acts:[{a:'tab',k:'bids',l:'Ajánlatok'}]});
      dI('po','Visszamenőleges PO (dokumentált indoklással)',p.owner,{due});dI('perfCert',dl('perfCert'),p.requester);dI('invoice','Számla és adategyezőség (Pénzügy)',PENZ);
    }else{
      fI('mdm','Törzsadatok: beszállítói törzs, cikkszám, fizetési feltételek (BC)',MDM);
      if(['ICO','FCO','Előrevásárlás'].some(x=>(p.contractType||'').startsWith(x)))push({id:'bc',label:'Szerződés rögzítése BC-ben (összeg, érvényesség, dokumentumok)',who:p.owner,done:!!p.f.bc,ev:p.f.bc?`BC: ${p.f.bc.note} · ${p.f.bc.by}`:'',acts:p.f.bc?[]:[{a:'input',k:'bc',l:'Rögzítés',p:true}]});
      push({id:'po',label:'PO kibocsátása (minden beszerzés PO-val kezdődik)',short:'PO kibocsátása',who:p.owner,done:!!p.f.po,ev:p.f.po?`PO: ${p.f.po.note} · ${p.f.po.by}`:'',blocked:!p.f.po&&!p.f.mdm?'Előbb a törzsadatok ellenőrzése szükséges':null,acts:p.f.po?[]:[{a:'input',k:'po',l:'PO rögzítése',p:true}]});
      fI('goods','Mennyiségi átvétel (Raktár)',RAKT);
      if(p.ifs)fI('qc','Minőségi átvétel: COA / DoC, karantén és dokumentált felszabadítás',MI);
      dI('perfCert',dl('perfCert'),p.requester);
      fI('invoice','Számla adategyezőség ellenőrzése a szerződéssel / PO-val (Pénzügy)',PENZ,{blocked:!p.f.invoice&&!docLatest(p,'perfCert')?'Számla csak igazolt teljesítés után fizethető':null});
    }
  }
  return L;
}
const nextItem=p=>checklist(p).find(i=>!i.done);
function statusOf(p){
  if(p.closed)return p.closed.failed?{l:'Sikertelen',t:'bad'}:{l:'Lezárt',t:'ok'};
  const it=checklist(p);
  const rej=it.find(i=>i.appr&&i.appr.status==='rejected');if(rej)return {l:'Elutasítva – javítás szükséges',t:'bad'};
  if(p.proc==='Vészhelyzeti'&&p.stage===6&&it.some(i=>!i.done&&i.due&&i.due<=S.today))return {l:'Dokumentáció hiányos',t:'bad'};
  const pa=it.find(i=>i.appr&&i.appr.requested&&i.appr.status==='pending');
  if(pa)return {l:(pa.appr.key==='ssd'||pa.appr.key==='ss')?'Döntésre vár':'Jóváhagyásra vár',t:'warn'};
  if(p.stage===3&&p.f.sent&&!p.f.opened)return {l:'Ajánlattétel folyamatban',t:'inf'};
  if(p.stage===3&&p.f.opened)return {l:'Értékelés alatt',t:'pur'};
  if(p.proc==='Vészhelyzeti'&&p.stage===6)return {l:'Dokumentáció hiányos',t:'bad'};
  return {l:p.stage===1?'Igény előkészítése':'Előkészítés alatt',t:'mut'};
}
function nextDue(p){if(p.closed)return {date:p.closed.ts.slice(0,10),text:p.closed.failed?'Sikertelen eljárás':'Nincs nyitott feladat'};const i=nextItem(p);if(!i)return {date:p.due[p.stage]||null,text:'Továbbléphet: '+(p.stage<6?STAGES[nextStage(p)-1][1]:'lezárás')};return {date:i.due||p.due[p.stage]||null,text:i.short||i.label,item:i};}

/* ===== Compliance panel ===== */
function rules(p){
  const R=[],t=typeOf(p.value),add=(s,tx)=>R.push({s,t:tx});
  add('ok',`Besorolás: ${t} – ${TYPEDESC[t]}`);
  if(p.proc==='Vészhelyzeti'){const due=addWD(p.vhDate,5),m=!(docLatest(p,'vhProtocol')&&docLatest(p,'ssForm'));add(!m?'ok':(S.today>due?'bad':'warn'),`Vészhelyzeti dokumentáció 5 munkanapon belül rendezendő (határidő: ${fShort(due)})`);}
  if(p.proc==='Tender'){const web=p.bidders.filter(b=>b.type==='Webshop').length;add(p.bidders.length>=3?'ok':'warn',`Min. 3 ajánlattevő meghívása (${p.bidders.length} meghívott)`);if(t!=='Egyedi'&&web)add('bad','Webáruházi árajánlat csak egyedi kategóriában helyettesíthet írásos ajánlatot');
    add(p.f.sent?(apprState(p,'tender').status==='approved'?'ok':'bad'):'ok',p.f.sent?'Tenderkiírás kiküldése előtt CEO + CFO jóváhagyás megvolt':'A tender csak CEO + CFO jóváhagyás után küldhető ki');}
  if(t==='Kiemelt')add(docLatest(p,'bsd')||p.stage<2?'ok':'warn','20 M Ft felett BSD kötelező, Értékelő Bizottság és jogi/pénzügyi vélemény');
  if(tcoReq(p))add(docLatest(p,'tco')||p.stage<3?'ok':'warn','CAPEX: TCO és DCF kalkuláció kötelező (SSD melléklet)');else if(p.cat==='CAPEX')add('ok','Fenntartó beruházás: TCO nem kötelező');else add('ok','TCO nem kötelező ebben a kategóriában');
  if(p.ifs)add('ok','IFS-kritikus: kötelező minőségi dokumentumok, előminősítés és MI-bevonás');
  if(p.f.opened&&validBids(p).length===1)add(p.f.singleResolved?'ok':'bad','Egyetlen érvényes ajánlat: SS-átsorolás vagy újratendereztetés szükséges');
  if(p.f.opened&&validBids(p).length===2)add('warn','Két érvényes ajánlat: a tényt az SSD-ben rögzíteni kell');
  if(p.stage>=4&&required(p,'ssd').includes(p.requester))add('bad','Az igénylő nem vehet részt a végső jóváhagyásban');
  else if(p.stage>=4)add('ok','Négy szem elv: az igénylő nem szerepel a végső jóváhagyók között');
  if(t==='Kiemelt'&&p.stage>=5)add('ok','Jogi és pénzügyi vélemény 5 munkanapon belül (20 M Ft felett)');
  return R;
}
/* ===== Todos ===== */
function allTodos(user){
  const out=[];
  S.procs.filter(p=>!p.closed).forEach(p=>{
    const n=nextDue(p);if(!n.item)return;const i=n.item;
    if(user&&!(String(i.who).split(' + ').includes(user)))return;
    const d=n.date,overdue=d&&d<S.today;
    out.push({pid:p.id,title:i.short||i.label,sub:p.subject,date:d,right:i.appr?i.who.replace(CEO,'CEO').replace(CFO,'CFO').replace(' + ','+')+' döntés':typeOf(p.value),tone:i.appr?'warn':(overdue||d===S.today&&p.proc==='Vészhelyzeti'?'bad':'inf'),ic:i.appr?'check':(overdue||d===S.today&&p.proc==='Vészhelyzeti'?'alert':'arrow')});});
  return out.sort((a,b)=>(a.date||'9')<(b.date||'9')?-1:1);
}
