// @ts-nocheck
/* Fonte Viva policy engine – state, rules, seed data. UI-independent. */
import { notify as toast } from './notify.js';
/* ===== Utilities ===== */
export const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const MON=['jan.','febr.','márc.','ápr.','máj.','jún.','júl.','aug.','szept.','okt.','nov.','dec.'];
export const WDN=['vasárnap','hétfő','kedd','szerda','csütörtök','péntek','szombat'];
export const MONL=['január','február','március','április','május','június','július','augusztus','szeptember','október','november','december'];
export const pd=s=>{const a=s.slice(0,10).split('-').map(Number);return new Date(Date.UTC(a[0],a[1]-1,a[2]));};
export const iso=d=>d.toISOString().slice(0,10);
export const addD=(s,n)=>{const d=pd(s);d.setUTCDate(d.getUTCDate()+n);return iso(d);};
export const addWD=(s,n)=>{const d=pd(s);let k=0;while(k<n){d.setUTCDate(d.getUTCDate()+1);const w=d.getUTCDay();if(w!==0&&w!==6)k++;}return iso(d);};
export const diffD=(a,b)=>Math.round((pd(b)-pd(a))/864e5);
export const fShort=s=>{if(!s)return '–';const d=pd(s);return MON[d.getUTCMonth()]+' '+d.getUTCDate()+'.';};
export const fDay=s=>{if(!s)return '–';const d=pd(s);return d.getUTCFullYear()+'. '+String(d.getUTCMonth()+1).padStart(2,'0')+'. '+String(d.getUTCDate()).padStart(2,'0')+'.';};
export const fdt=t=>t?fDay(t)+' '+t.slice(11,16):'–';
export const rel=s=>!s?'–':(s===S.today?'ma':fShort(s));
export const nf=new Intl.NumberFormat('hu-HU');
export const ft=v=>nf.format(Math.round(v)).replace(/ | /g,' ')+' Ft';
export const short=v=>{const o={maximumFractionDigits:2};if(v>=1e9)return (v/1e9).toLocaleString('hu-HU',o)+' Mrd Ft';if(v>=1e6)return (v/1e6).toLocaleString('hu-HU',o)+' M Ft';return ft(v);};
export const h53=(str,seed=0)=>{let h1=0xdeadbeef^seed,h2=0x41c6ce57^seed;for(let i=0,ch;i<str.length;i++){ch=str.charCodeAt(i);h1=Math.imul(h1^ch,2654435761);h2=Math.imul(h2^ch,1597334677);}h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);return (4294967296*(2097151&h2)+(h1>>>0)).toString(16).padStart(14,'0');};

/* ===== Policy constants ===== */
export const CEO='Haász Róbert',CFO='Török András',SCM='Sándor Dávid',MI='Bacza Roland',ADM='Kovács Eszter',JOGI='Dr. Kiss Anna',PENZ='Farkas Ildikó',MDM='Nagy Réka',RAKT='Varga Béla';
export const USERS=[
 {n:CEO,role:'CEO',ini:'HR'},{n:CFO,role:'CFO',ini:'TA'},{n:SCM,role:'SCM vezető · Beszerzés',ini:'SD'},
 {n:'Szilágyi László',role:'Igénylő · Csány termelés, költséghely-felelős',ini:'SL'},{n:MI,role:'Minőségirányítás / IFS',ini:'BR'},
 {n:ADM,role:'Tenderadminisztrátor',ini:'KE'},{n:JOGI,role:'Jogi',ini:'KA'},{n:PENZ,role:'Pénzügy',ini:'FI'},
 {n:MDM,role:'Master Data Management',ini:'NR'},{n:RAKT,role:'Raktár',ini:'VB'},
 {n:'Klujber László',role:'Költséghely-felelős · Somogyvár',ini:'KL'},{n:'Gyulai Péter',role:'Költséghely-felelős · Somogyvár karbantartás',ini:'GP'},{n:'Jekkel Tibor',role:'Költséghely-felelős · Csány karbantartás',ini:'JT'}];
export const INF=Infinity;
export const CC={
 '1255BS1200':{n:'HQ – Management & Admin',b:[[2e5,null],[INF,CEO]]},
 '1255BS1300':{n:'HQ – QA & HSE',b:[[2e5,'Bacza Roland'],[INF,CEO]]},
 '1255BS1400':{n:'HQ – Supply Chain Mngmt',b:[[1e6,SCM],[INF,CEO]]},
 '1255BS2300':{n:'Somogyvár karbantartás',b:[[2e5,'Gyulai Péter'],[5e5,'Klujber László'],[INF,CEO]]},
 '1255BS2400':{n:'Somogyvár telephely – termelés',b:[[2e5,'Klujber László'],[2e6,SCM],[INF,CEO]]},
 '1255BS3300':{n:'Csány karbantartás',b:[[2e5,'Jekkel Tibor'],[5e5,'Szilágyi László'],[INF,CEO]]},
 '1255BS3400':{n:'Csány telephely – termelés',b:[[2e5,'Szilágyi László'],[2e6,SCM],[INF,CEO]]}};
export const ORGS=[['Somogyvár – karbantartás','1255BS2300'],['Somogyvár – termelés','1255BS2400'],['Csány – karbantartás','1255BS3300'],['Csány – termelés','1255BS3400'],['HQ – Supply Chain','1255BS1400'],['HQ – QA & HSE','1255BS1300'],['HQ – Management & Admin','1255BS1200']];
export const ccApprover=(cc,v)=>{const c=CC[cc];if(!c)return null;for(const b of c.b){if(v<b[0])return b[1];}return CEO;};
export const typeOf=v=>v<2e6?'Egyedi':v<=2e7?'Egyszerű':'Kiemelt';
export const TYPEDESC={Egyedi:'< 2 M Ft · egyszerűsített eljárás, 3 ajánlat (max. 2 webáruházi)',Egyszerű:'2–20 M Ft · teljes tender, 3 írásos ajánlat vagy lemondó nyilatkozat',Kiemelt:'> 20 M Ft · teljes tender + BSD + Értékelő Bizottság, jogi és pénzügyi vélemény'};
export const STAGES=[['PROC1','Igény'],['PROC2','Előkészítés'],['PROC3','Tender'],['PROC4','Kiválasztás'],['PROC5','Szerződés'],['PROC6','Teljesítés']];
export const W={t:.4,c:.6};
export const DOCS={
 spec:['Beszerzési igény és műszaki specifikáció',1,'docx'],vhReason:['Vészhelyzeti írásos indoklás',1,'docx'],ifsReq:['IFS / minőségi követelmények melléklet',1,'pdf'],msds:['MSDS és DoC',1,'pdf'],
 bsd:['Bid Starting Document (BSD)',2,'docx'],rfq:['RFQ / ajánlatkérő levél',2,'docx'],qty:['Mennyiség és ütemterv',2,'xlsx'],pricing:['Árazási struktúra',2,'xlsx'],matrixTpl:['Kiértékelési mátrix sablon',2,'xlsx'],contractDraft:['Szerződéstervezet',2,'docx'],nda:['Titoktartási nyilatkozat',2,'pdf'],cyber:['Kiberbiztonsági záradék',2,'docx'],supplierForm:['Beszállítói adatlap',2,'docx'],ssForm:['Sole Source indoklás űrlap (5. melléklet)',2,'docx'],
 invit:['Kiküldött meghívó / ajánlatkérés',3,'eml'],bid:['Ajánlat',4,'pdf'],opening:['Bontási jegyzőkönyv',5,'docx'],
 tco:['TCO / DCF kalkuláció (7. melléklet)',7,'xlsx'],matrix:['Kiértékelési mátrix (2. melléklet)',7,'xlsx'],
 nego:['Tárgyalási jegyzőkönyv',8,'docx'],revised:['Módosított, írásos ajánlat',8,'pdf'],
 ssd:['Supplier Selection Document (SSD)',9,'docx'],ifsCert:['IFS-megfelelőségi tanúsítványok',9,'pdf'],
 contractFinal:['Szerződés / PO-dokumentum (végleges)',10,'docx'],contractSigned:['Aláírt szerződés (Netlock / szkennelt)',10,'pdf'],bankGuar:['Bankgarancia',10,'pdf'],
 po:['Purchase Order (PO)',11,'pdf'],perfCert:['Teljesítésigazolás (9. melléklet)',11,'pdf'],invoice:['Számla',11,'pdf'],vhProtocol:['Vészhelyzeti jegyzőkönyv (6. melléklet)',11,'docx']};
export const FOLDERS=['Igény és specifikáció','BSD és tenderkiírás','Meghívások','Beérkezett ajánlatok','Bontási jegyzőkönyv','Műszaki értékelés','Kereskedelmi értékelés és TCO','Tárgyalási dokumentumok','SSD és jóváhagyások','Szerződés és módosítások','PO, teljesítésigazolás és lezárás'];
export const dl=k=>DOCS[k][0];

/* ===== State ===== */
export const SKEY='fv-tender-demo-v2';
export let S=null;
export function save(){try{localStorage.setItem(SKEY,JSON.stringify(S));}catch(e){}}
export function setS(x){S=x;}
export function load(){try{const r=localStorage.getItem(SKEY);if(r){const s=JSON.parse(r);if(s&&s.procs&&s.audit)return s;}}catch(e){}return null;}
export const P=id=>S.procs.find(p=>p.id===id);
export const stamp=()=>S.today+' '+new Date().toTimeString().slice(0,5);
export function auditHash(e){return h53(e.prev+'|'+[e.n,e.ts,e.user,e.proc,e.type,e.title,e.detail].join('|'));}
export function log(proc,type,title,detail,user,ts){
  const prev=S.audit.length?S.audit[S.audit.length-1].hash:'GENESIS';
  const e={n:S.audit.length+1,ts:ts||stamp(),user:user||S.user,proc:proc||'',type,title,detail:detail||'',prev};
  e.hash=auditHash(e);S.audit.push(e);return e;
}
export function verifyChain(){let prev='GENESIS';for(const e of S.audit){if(e.prev!==prev||auditHash(e)!==e.hash)return {ok:false,at:e.n};prev=e.hash;}return {ok:true,n:S.audit.length};}
export const uid=()=>'x'+Math.random().toString(36).slice(2,9);
export const nextId=prefix=>{const y=S.today.slice(0,4);const n=(S.seq[prefix]||0)+1;S.seq[prefix]=n;return prefix+'-'+y+'/'+String(n).padStart(3,'0');};

/* ===== Documents ===== */
export const docs=(p,key,bid)=>p.docs.filter(d=>d.key===key&&(bid===undefined||d.bid===bid));
export const docLatest=(p,key,bid)=>{const a=docs(p,key,bid);return a.length?a[a.length-1]:null;};
export const skipped=p=>p.proc==='Vészhelyzeti'?[2,3,4,5]:p.proc==='SS'?[3]:[];
export const nextStage=p=>{let n=p.stage+1;while(skipped(p).includes(n)&&n<6)n++;return n;};
export const tcoReq=p=>p.cat==='CAPEX'&&!p.maint;

/* ===== Approvals ===== */
export const ATITLE={igeny:'Beszerzési igény',tender:'Tenderkiírás',ssd:'Beszállító-kiválasztás (SSD)',ss:'Sole Source indoklás',vh:'Vészhelyzeti beszerzés',jogi:'Jogi vélemény',penz:'Pénzügyi vélemény',sign:'Szerződés cégszerű aláírása',bgWaive:'Eltérés a bankgaranciától'};
export const ADESC={igeny:'Költséghely szerinti jóváhagyás (8.1 mátrix)',tender:'Tenderindítási jóváhagyás – CEO + CFO együtt',ssd:'SSD ügyvezetői jóváhagyása',ss:'Versenyeztetés alóli felmentés jóváhagyása',vh:'Vészhelyzeti beszerzés jóváhagyása',jogi:'Jogi véleményezés (5 munkanap)',penz:'Pénzügyi véleményezés (5 munkanap)',sign:'Aláírás jóváhagyása – CEO + CFO együtt',bgWaive:'Kizárólag CFO engedélyezheti'};
export function required(p,k){
  const t=typeOf(p.value);
  if(k==='igeny'){const a=ccApprover(p.cc,p.value);const r=a?[a]:[];if(t==='Kiemelt'&&!r.includes(SCM))r.push(SCM);return r;}
  if(k==='tender'||k==='sign')return [CEO,CFO];
  if(k==='ssd'||k==='ss')return t==='Kiemelt'?[CEO,CFO]:[ccApprover(p.cc,p.value)||SCM];
  if(k==='vh')return p.value>=2e6?[CEO]:[ccApprover(p.cc,p.value)||SCM];
  if(k==='jogi')return [JOGI];if(k==='penz')return [PENZ];if(k==='bgWaive')return [CFO];
  return [];
}
export const BOUND={igeny:'spec',ssd:'ssd',ss:'ssForm',vh:'vhReason',jogi:'contractFinal',penz:'contractFinal',sign:'contractFinal'};
export const boundKey=(p,k)=>k==='tender'?(typeOf(p.value)==='Kiemelt'?'bsd':'rfq'):(BOUND[k]||null);
export function apprState(p,key){
  const req=required(p,key),a=p.appr[key],bk=boundKey(p,key),bd=bk?docLatest(p,bk):null,ver=bd?bd.ver:1;
  const per=req.map(n=>{const ds=a?a.decisions.filter(d=>d.by===n):[];const cur=ds.filter(d=>d.ver===ver).pop(),old=ds.filter(d=>d.ver!==ver).pop();
    return {name:n,state:cur?(cur.dec==='approve'?'approved':'rejected'):(old?'stale':'pending'),dec:cur||old};});
  let status='none';
  if(a){status='pending';if(per.some(x=>x.state==='rejected'))status='rejected';else if(per.length&&per.every(x=>x.state==='approved'))status='approved';}
  return {key,required:req,per,status,requested:!!a,req:a&&a.req,bound:bk,doc:bd,ver};
}
export function pendingFor(user){
  const out=[];
  S.procs.forEach(p=>{if(p.closed)return;Object.keys(p.appr).forEach(k=>{const a=apprState(p,k);
    if(a.status==='pending'&&a.per.some(x=>x.name===user&&(x.state==='pending'||x.state==='stale')))out.push({p,key:k,a});});});
  return out;
}
export function decide(p,key,dec,comment){
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
export const allResp=p=>p.bidders.length>0&&p.bidders.every(b=>b.status!=='meghívva');
export const validBids=p=>p.bidders.filter(b=>b.status==='beérkezett'&&b.formal===true);
export const techOk=b=>b.tech!=null&&b.tech>=60;
export const commFilled=b=>b.price>0&&b.pay!=null&&b.lead>0;
export const techDone=p=>{const v=validBids(p);return v.length>0&&v.every(b=>b.tech!=null);};
export function ranking(p){
  const c=validBids(p).filter(b=>techOk(b)&&commFilled(b));if(!c.length)return [];
  const minP=Math.min(...c.map(b=>b.price)),minL=Math.min(...c.map(b=>b.lead));
  const r=c.map(b=>{const sp=minP/b.price*100,spay=Math.min(100,(b.pay||0)/60*100),sl=minL/b.lead*100;const comm=.6*sp+.2*spay+.2*sl;return {b,sp,spay,sl,comm,total:W.t*b.tech+W.c*comm};});
  r.sort((a,b)=>b.total-a.total);r.forEach((x,i)=>x.rank=i+1);return r;
}
export const bidVisible=p=>!!p.f.opened;

/* ===== Checklist engine ===== */
export function checklist(p){
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
export const nextItem=p=>checklist(p).find(i=>!i.done);
export function statusOf(p){
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
export function nextDue(p){if(p.closed)return {date:p.closed.ts.slice(0,10),text:p.closed.failed?'Sikertelen eljárás':'Nincs nyitott feladat'};const i=nextItem(p);if(!i)return {date:p.due[p.stage]||null,text:'Továbbléphet: '+(p.stage<6?STAGES[nextStage(p)-1][1]:'lezárás')};return {date:i.due||p.due[p.stage]||null,text:i.short||i.label,item:i};}

/* ===== Compliance panel ===== */
export function rules(p){
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
export function allTodos(user){
  const out=[];
  S.procs.filter(p=>!p.closed).forEach(p=>{
    const n=nextDue(p);if(!n.item)return;const i=n.item;
    if(user&&!(String(i.who).split(' + ').includes(user)))return;
    const d=n.date,overdue=d&&d<S.today;
    out.push({pid:p.id,title:i.short||i.label,sub:p.subject,date:d,right:i.appr?i.who.replace(CEO,'CEO').replace(CFO,'CFO').replace(' + ','+')+' döntés':typeOf(p.value),tone:i.appr?'warn':(overdue||d===S.today&&p.proc==='Vészhelyzeti'?'bad':'inf'),ic:i.appr?'check':(overdue||d===S.today&&p.proc==='Vészhelyzeti'?'alert':'arrow')});});
  return out.sort((a,b)=>(a.date||'9')<(b.date||'9')?-1:1);
}

export function seedState(){
  const st={today:'2026-09-04',user:CEO,strict:false,theme:'light',procs:[],tasks:[],audit:[],seq:{BSD:7,BR:21,SS:6,VH:12,EG:0},dn:0};
  S=st;
  let dn=0;
  const dc=(p,rows)=>rows.forEach(r=>{p.docs.push({id:'d'+(++dn),key:r[0],ver:r[1],name:r[2],size:r[5]||Math.round(40+Math.random()*900)*1024,by:r[3],ts:r[4],bid:r[6],note:'',content:r[7]||''});});
  const B=(id,name,email,st_,o)=>Object.assign({id,name,email,type:'Céges',isNew:false,status:st_,invited:null,recv:null,sender:'',msgId:'',late:false,formal:null,tech:null,price:null,pay:null,lead:null,warr:null,note:''},o||{});
  const base=o=>Object.assign({docs:[],bidders:[],appr:{},f:{},due:{},mail:[],ifs:false,maint:false,it:false,prepay:false,owner:SCM,round:1,closed:null,nego:null,bidDeadline:null,contractType:null,reclass:false,vhDate:null},o);
  const ap=(by,ts)=>({req:{by,ts},decisions:[]});
  const dec=(a,by,dc_,ts,ver,c)=>a.decisions.push({by,dec:dc_,ts,ver,c:c||''});
  const F=(by,ts,note)=>({by,ts,note:note||''});

  /* --- BSD-2026/003 --- */
  const p3=base({id:'BSD-2026/003',subject:'Csányi új PET palackozó gépsor',org:'Csány – termelés',cc:'1255BS3400',value:3250000000,cat:'CAPEX',proc:'Tender',requester:'Szilágyi László',stage:4,created:'2026-07-06',desired:'2027-03-31',due:{4:'2026-09-08'},bidDeadline:'2026-08-21'});
  p3.bidders=[B('b1','Krones Hungária Kft.','sales@krones-hu.example','beérkezett',{recv:'2026-08-20 15:41',sender:'sales@krones-hu.example',msgId:'<7f2a91@krones-hu.example>',formal:true,tech:88,price:3420000000,pay:60,lead:34,warr:24}),
    B('b2','KHS Packaging GmbH','offer@khs.example','beérkezett',{recv:'2026-08-21 09:12',sender:'offer@khs.example',msgId:'<c1d044@khs.example>',formal:true,tech:82,price:3610000000,pay:45,lead:38,warr:24}),
    B('b3','Sidel Central Europe Kft.','tender@sidel.example','beérkezett',{recv:'2026-08-21 11:03',sender:'tender@sidel.example',msgId:'<93bb12@sidel.example>',formal:true,tech:79,price:3780000000,pay:30,lead:32,warr:36}),
    B('b4','Sacmi Hungary Kft.','info@sacmi.example','lemondó',{recv:'2026-08-14 10:00',note:'Kapacitáshiány miatt nem ad ajánlatot.'})];
  dc(p3,[['spec',1,'Igeny_palackozo_gepsor_v1.docx',p3.requester,'2026-07-06 09:30'],['bsd',1,'BSD_BSD-2026-003_v1.docx',SCM,'2026-07-20 11:00'],['rfq',1,'RFQ_palackozo_gepsor.docx',SCM,'2026-07-21 09:40'],['qty',1,'Mennyiseg_utemterv.xlsx',SCM,'2026-07-21 09:41'],['pricing',1,'Arazasi_struktura.xlsx',SCM,'2026-07-21 09:42'],['matrixTpl',1,'Kiertekelesi_matrix_sablon.xlsx',SCM,'2026-07-21 09:43'],['contractDraft',1,'Szerzodes_tervezet_gepsor.docx',SCM,'2026-07-22 14:10'],['nda',1,'Titoktartasi_nyilatkozat.pdf',ADM,'2026-07-22 14:20'],
    ['bid',1,'Krones_ajanlat.pdf',ADM,'2026-08-20 15:41',null,'b1'],['bid',1,'KHS_ajanlat.pdf',ADM,'2026-08-21 09:12',null,'b2'],['bid',1,'Sidel_ajanlat.pdf',ADM,'2026-08-21 11:03',null,'b3'],['bid',1,'Sacmi_lemondo_nyilatkozat.pdf',ADM,'2026-08-14 10:00',null,'b4'],
    ['opening',1,'Bontasi_jegyzokonyv_BSD-2026-003.docx',ADM,'2026-08-21 14:00'],['matrix',1,'Kiertekelesi_matrix_BSD-2026-003.xlsx',SCM,'2026-09-02 15:50'],
    ['tco',1,'TCO_kalkulacio_v1.xlsx',CFO,'2026-08-28 10:00'],['tco',2,'TCO_kalkulacio_v2.xlsx',CFO,'2026-09-01 09:30'],['tco',3,'TCO_kalkulacio_v3.xlsx',CFO,'2026-09-03 10:21'],
    ['nego',1,'Targyalasi_jegyzokonyv.docx',SCM,'2026-09-03 12:00'],['revised',1,'Krones_modositott_ajanlat.pdf',SCM,'2026-09-03 13:45'],['ssd',1,'SSD-2026-003_tervezet.docx',SCM,'2026-09-02 17:00'],['ssd',2,'SSD-2026-003_tervezet.docx',SCM,'2026-09-03 16:12']]);
  p3.appr.igeny=ap(p3.requester,'2026-07-07 08:00');dec(p3.appr.igeny,CEO,'approve','2026-07-08 10:05',1);dec(p3.appr.igeny,SCM,'approve','2026-07-08 10:40',1);
  p3.appr.tender=ap(SCM,'2026-07-27 09:00');dec(p3.appr.tender,CEO,'approve','2026-07-28 08:50',1);dec(p3.appr.tender,CFO,'approve','2026-07-28 09:15',1);
  p3.appr.ssd=ap(SCM,'2026-09-03 16:20');
  p3.f={strategy:F(SCM,'2026-07-18 10:00'),sent:{by:SCM,ts:'2026-07-29 10:00',to:['Krones Hungária Kft.','KHS Packaging GmbH','Sidel Central Europe Kft.','Sacmi Hungary Kft.']},opened:F(ADM,'2026-08-21 14:00'),commDone:F(SCM,'2026-09-02 15:48','3 érvényes ajánlat'),ndaSigned:F(ADM,'2026-08-21 13:30')};
  p3.nego={winner:'b1',winnerName:'Krones Hungária Kft.',initial:3420000000,final:3250000000,rebate:0,saving:170000000,isNew:false,note:'Ártárgyalás után módosított írásos ajánlat.',ts:'2026-09-03 12:00',by:SCM};
  p3.tcoData={c0:3250000000,k:210000000,n:12,r:.09,res:400000000,result:4632000000};

  /* --- BSD-2026/007 --- */
  const p7=base({id:'BSD-2026/007',subject:'2027. évi PET preform keretszerződés',org:'HQ – Supply Chain',cc:'1255BS1400',value:1150000000,cat:'Direkt',proc:'Tender',ifs:true,prepay:true,requester:SCM,stage:2,created:'2026-08-10',desired:'2027-01-02',due:{2:'2026-09-05'}});
  p7.bidders=[B('b1','Retal Hungary Kft.','sales@retal.example','meghívva'),B('b2','Resilux Central Europe Kft.','tender@resilux.example','meghívva'),B('b3','Alpla Hungary Kft.','offer@alpla.example','meghívva'),B('b4','Indorama Ventures Poland','bids@indorama.example','meghívva',{isNew:true})];
  dc(p7,[['spec',1,'Igeny_preform_2027.docx',SCM,'2026-08-10 09:00'],['bsd',1,'BSD_BSD-2026-007_v1.docx',SCM,'2026-08-24 11:02'],['bsd',2,'BSD_BSD-2026-007_v2.docx',SCM,'2026-09-02 16:40'],['rfq',1,'RFQ_preform.docx',SCM,'2026-08-25 10:00'],['qty',1,'Mennyiseg_utemterv.xlsx',SCM,'2026-08-25 10:05'],['pricing',1,'Arazasi_struktura.xlsx',SCM,'2026-08-25 10:06'],['matrixTpl',1,'Kiertekelesi_matrix_sablon.xlsx',SCM,'2026-08-25 10:07'],['contractDraft',1,'FCO_tervezet_preform.docx',SCM,'2026-08-27 15:00'],['nda',1,'Titoktartasi_nyilatkozat.pdf',ADM,'2026-08-27 15:10'],['ifsReq',1,'IFS_kovetelmenyek_preform.pdf',MI,'2026-08-26 09:00'],['msds',1,'DoC_preform_EU10-2011.pdf',MI,'2026-08-26 09:10'],['supplierForm',1,'Beszallitoi_adatlap_Indorama.docx',SCM,'2026-08-28 12:00']]);
  p7.appr.igeny=ap(SCM,'2026-08-10 09:10');dec(p7.appr.igeny,CEO,'approve','2026-08-11 08:00',1);dec(p7.appr.igeny,SCM,'approve','2026-08-10 09:20',1);
  p7.appr.tender=ap(SCM,'2026-09-03 13:30');dec(p7.appr.tender,CFO,'approve','2026-09-04 08:27',2);
  p7.f={strategy:F(SCM,'2026-08-20 10:00'),ifsRisk:F(MI,'2026-08-24 14:00')};

  /* --- BR-2026/021 --- */
  const p21=base({id:'BR-2026/021',subject:'Somogyvári rágcsálómentesítési szolgáltatás',org:'Somogyvár – termelés',cc:'1255BS2400',value:12800000,cat:'Indirekt',proc:'Tender',ifs:true,requester:'Klujber László',stage:3,created:'2026-08-18',desired:'2026-11-01',due:{3:'2026-09-11'},bidDeadline:'2026-09-11'});
  p21.bidders=[B('b1','Bábolna Bio Kft.','ajanlat@babolnabio.example','beérkezett',{invited:'2026-08-31 10:15',recv:'2026-09-03 09:22',sender:'ajanlat@babolnabio.example',msgId:'<5e10ad@babolnabio.example>'}),B('b2','Rentokil Hungária Kft.','tender@rentokil.example','meghívva',{invited:'2026-08-31 10:15'}),B('b3','Pest Control Somogy Kft.','iroda@pcsomogy.example','meghívva',{invited:'2026-08-31 10:15'})];
  dc(p21,[['spec',1,'Igeny_racsalomentesites.docx','Klujber László','2026-08-18 09:00'],['rfq',1,'RFQ_racsalomentesites.docx',SCM,'2026-08-24 10:00'],['qty',1,'Szolgaltatasi_terv.xlsx',SCM,'2026-08-24 10:02'],['pricing',1,'Arazasi_struktura.xlsx',SCM,'2026-08-24 10:03'],['matrixTpl',1,'Kiertekelesi_matrix_sablon.xlsx',SCM,'2026-08-24 10:04'],['ifsReq',1,'IFS_szolgaltato_kovetelmenyek.pdf',MI,'2026-08-24 10:30'],['bid',1,'Babolna_Bio_ajanlat.pdf',ADM,'2026-09-03 09:22',null,'b1']]);
  p21.appr.igeny=ap('Klujber László','2026-08-18 09:10');dec(p21.appr.igeny,CEO,'approve','2026-08-19 08:30',1);
  p21.appr.tender=ap(SCM,'2026-08-28 09:00');dec(p21.appr.tender,CEO,'approve','2026-08-28 15:00',1);dec(p21.appr.tender,CFO,'approve','2026-08-29 08:10',1);
  p21.f={strategy:F(SCM,'2026-08-24 09:00'),ifsRisk:F(MI,'2026-08-24 11:00'),sent:{by:SCM,ts:'2026-08-31 10:15',to:p21.bidders.map(b=>b.name)}};
  p21.mail=[{dir:'out',ts:'2026-08-31 10:15',from:'arajanlat@fonteviva.hu',to:p21.bidders.map(b=>b.email).join(', '),subj:'Ajánlatkérés – Somogyvári rágcsálómentesítési szolgáltatás (BR-2026/021)',body:'Tisztelt Partnerünk! Mellékelten küldjük ajánlatkérésünket. Ajánlattételi határidő: 2026. 09. 11.',att:['RFQ_racsalomentesites.docx','Szolgaltatasi_terv.xlsx','Arazasi_struktura.xlsx']},{dir:'in',ts:'2026-09-03 09:22',from:'ajanlat@babolnabio.example',to:'arajanlat@fonteviva.hu',subj:'RE: Ajánlatkérés – BR-2026/021',body:'',att:['Babolna_Bio_ajanlat.pdf'],bid:'b1'}];

  /* --- BR-2026/019 --- */
  const p19=base({id:'BR-2026/019',subject:'Rámpa kültéri üzemi kijelzők',org:'Somogyvár – termelés',cc:'1255BS2400',value:6200000,cat:'Indirekt',proc:'Tender',requester:'Klujber László',stage:3,created:'2026-08-05',desired:'2026-10-15',due:{3:'2026-09-09'},bidDeadline:'2026-08-31'});
  p19.bidders=[B('b1','LED-Tech Hungary Kft.','sales@ledtech.example','beérkezett',{invited:'2026-08-20 09:00',recv:'2026-08-28 10:10',sender:'sales@ledtech.example',msgId:'<a88c01@ledtech.example>',formal:true,tech:84,price:5840000,pay:30,lead:6,warr:24}),B('b2','Signum Display Zrt.','info@signum.example','beérkezett',{invited:'2026-08-20 09:00',recv:'2026-08-31 08:45',sender:'info@signum.example',msgId:'<11f9be@signum.example>',formal:true,tech:78,price:6190000,pay:45,lead:4,warr:36}),B('b3','Display Partner Kft.','iroda@displaypartner.example','lemondó',{invited:'2026-08-20 09:00',recv:'2026-08-27 14:00',note:'Nem ad ajánlatot.'})];
  dc(p19,[['spec',1,'Igeny_kijelzok.docx','Klujber László','2026-08-05 09:00'],['rfq',1,'RFQ_kijelzok.docx',SCM,'2026-08-19 10:00'],['qty',1,'Mennyiseg.xlsx',SCM,'2026-08-19 10:01'],['pricing',1,'Arazasi_struktura.xlsx',SCM,'2026-08-19 10:02'],['matrixTpl',1,'Kiertekelesi_matrix_sablon.xlsx',SCM,'2026-08-19 10:03'],['bid',1,'LEDTech_ajanlat.pdf',ADM,'2026-08-28 10:10',null,'b1'],['bid',1,'Signum_ajanlat.pdf',ADM,'2026-08-31 08:45',null,'b2'],['bid',1,'DisplayPartner_lemondo.pdf',ADM,'2026-08-27 14:00',null,'b3'],['opening',1,'Bontasi_jegyzokonyv_BR-2026-019.docx',ADM,'2026-09-01 10:00']]);
  p19.appr.igeny=ap('Klujber László','2026-08-05 09:10');dec(p19.appr.igeny,CEO,'approve','2026-08-06 08:00',1);
  p19.appr.tender=ap(SCM,'2026-08-18 09:00');dec(p19.appr.tender,CEO,'approve','2026-08-18 15:00',1);dec(p19.appr.tender,CFO,'approve','2026-08-19 08:00',1);
  p19.f={strategy:F(SCM,'2026-08-18 08:00'),sent:{by:SCM,ts:'2026-08-20 09:00',to:p19.bidders.map(b=>b.name)},opened:F(ADM,'2026-09-01 10:00')};

  /* --- SS-2026/006 (lezárt) --- */
  const p6=base({id:'SS-2026/006',subject:'KHS kupakzáró egyedi hajtóműalkatrész',org:'Somogyvár – karbantartás',cc:'1255BS2300',value:1700000,cat:'OPEX',proc:'SS',maint:true,requester:'Klujber László',stage:6,created:'2026-07-20',desired:'2026-08-28',due:{6:'2026-08-28'},closed:{ts:'2026-08-28 14:10',by:SCM,failed:false}});
  p6.bidders=[B('b1','KHS Packaging GmbH','service@khs.example','beérkezett',{formal:true,price:1700000,recv:'2026-07-22 10:00'})];
  dc(p6,[['spec',1,'Igeny_hajtomualkatresz.docx','Klujber László','2026-07-20 09:00'],['ssForm',1,'SS_indoklas_hajtomualkatresz.docx',SCM,'2026-07-21 10:00'],['ssd',1,'SSD-2026-006.docx',SCM,'2026-07-24 11:00'],['contractFinal',1,'PO_tervezet.docx',SCM,'2026-07-25 09:00'],['contractSigned',1,'PO_alairt.pdf',SCM,'2026-07-27 15:00'],['po',1,'PO_4500018831.pdf',SCM,'2026-07-27 15:30'],['perfCert',1,'Teljesitesigazolas.pdf','Klujber László','2026-08-26 10:00'],['invoice',1,'Szamla_2026-8841.pdf',PENZ,'2026-08-27 09:00']]);
  p6.appr.igeny=ap('Klujber László','2026-07-20 09:10');dec(p6.appr.igeny,CEO,'approve','2026-07-20 12:00',1);
  p6.appr.ss=ap(SCM,'2026-07-21 10:10');dec(p6.appr.ss,CEO,'approve','2026-07-21 14:00',1);
  p6.appr.ssd=ap(SCM,'2026-07-24 11:10');dec(p6.appr.ssd,CEO,'approve','2026-07-24 16:00',1);
  p6.appr.sign=ap(SCM,'2026-07-25 09:10');dec(p6.appr.sign,CEO,'approve','2026-07-26 09:00',1);dec(p6.appr.sign,CFO,'approve','2026-07-26 10:00',1);
  p6.contractType='PO';p6.f={strategy:F(SCM,'2026-07-21 09:00'),mdm:F(MDM,'2026-07-27 12:00'),po:F(SCM,'2026-07-27 15:30','4500018831'),goods:F(RAKT,'2026-08-25 13:00'),invoice:F(PENZ,'2026-08-27 09:10')};
  p6.nego={winner:'b1',winnerName:'KHS Packaging GmbH',initial:1700000,final:1700000,rebate:0,saving:0,isNew:false,note:'',ts:'2026-07-23 10:00',by:SCM};

  /* --- VH-2026/012 --- */
  const p12=base({id:'VH-2026/012',subject:'Csányi kompresszor sürgősségi javítása',org:'Csány – karbantartás',cc:'1255BS3300',value:4800000,cat:'OPEX',proc:'Vészhelyzeti',maint:true,requester:'Szilágyi László',stage:6,created:'2026-08-28',desired:'2026-09-04',vhDate:'2026-08-28',due:{6:'2026-09-04'}});
  p12.bidders=[B('b1','Atlas Copco Kompresszor Kft.','service@atlas.example','beérkezett',{recv:'2026-08-28 09:30',formal:true,price:4800000,invited:'2026-08-28 08:50'})];
  dc(p12,[['vhReason',1,'Veszhelyzeti_indoklas_kompresszor.docx','Szilágyi László','2026-08-28 08:40'],['po',1,'PO_utolagos_kompresszor.pdf',SCM,'2026-08-28 12:00'],['bid',1,'Atlas_ajanlat.pdf',SCM,'2026-08-28 09:30',null,'b1']]);
  p12.appr.vh=ap('Szilágyi László','2026-08-28 08:45');dec(p12.appr.vh,CEO,'approve','2026-08-28 09:00',1,'Szóbeli jóváhagyás, utólagos írásos megerősítéssel.');
  p12.f={};

  st.procs=[p3,p7,p21,p19,p12,p6];
  st.procs.sort((a,b)=>['BSD-2026/003','BSD-2026/007','BR-2026/021','BR-2026/019','SS-2026/006','VH-2026/012'].indexOf(a.id)-['BSD-2026/003','BSD-2026/007','BR-2026/021','BR-2026/019','SS-2026/006','VH-2026/012'].indexOf(b.id));
  st.dn=dn;

  st.tasks=[
   {id:'t1',pid:'BSD-2026/003',title:'Kiemelt SSD előzetes átnézése',desc:'A tárgyalási megtakarítás és a TCO-eredmény ellenőrzése a jóváhagyás előtt.',owner:CEO,by:SCM,due:'2026-09-07',done:null},
   {id:'t2',pid:'VH-2026/012',title:'Vészhelyzeti jegyzőkönyv (6. melléklet) elkészítése',desc:'Az 5 munkanapos határidő ma jár le. Csatolni: PO, ajánlat, SS indoklás.',owner:SCM,by:CEO,due:'2026-09-04',done:null},
   {id:'t3',pid:'BR-2026/021',title:'Zárt postafiók megnyitásának előkészítése',desc:'Az ajánlatbontás időpontjának egyeztetése az adminisztrátorral és az igénylővel.',owner:ADM,by:SCM,due:'2026-09-11',done:null},
   {id:'t4',pid:'BSD-2026/007',title:'Költségkeret előzetes ellenőrzése',desc:'Az előrevásárlási keret és az előleg cash flow hatása.',owner:PENZ,by:SCM,due:'2026-09-05',done:null},
   {id:'t5',pid:'BR-2026/019',title:'Műszaki értékelés lezárása',desc:'Mindkét érvényes ajánlat pontozása.',owner:'Klujber László',by:SCM,due:'2026-09-02',done:'2026-09-02 13:50'}];

  /* --- audit seed --- */
  const A=[
   ['2026-07-06 09:12','Szilágyi László','BSD-2026/003','Létrehozás','Beszerzés létrehozva','Csányi új PET palackozó gépsor · CAPEX · 3 250 000 000 Ft · besorolás: Kiemelt'],
   ['2026-07-08 10:40','Sándor Dávid','BSD-2026/003','Jóváhagyás','Beszerzési igény jóváhagyva','Haász Róbert, Sándor Dávid · Specifikáció v1'],
   ['2026-07-09 08:00','Sándor Dávid','BSD-2026/003','Státusz','Státuszváltás','PROC1 → PROC2'],
   ['2026-07-28 09:15','Török András','BSD-2026/003','Jóváhagyás','Tenderkiírás jóváhagyva','CEO + CFO · BSD v1'],
   ['2026-07-29 10:00','Sándor Dávid','BSD-2026/003','Levelezés','Tender kiküldve','arajanlat@fonteviva.hu · 4 címzett · határidő: 2026. 08. 21.'],
   ['2026-07-29 10:01','Sándor Dávid','BSD-2026/003','Státusz','Státuszváltás','PROC2 → PROC3'],
   ['2026-08-21 14:00','Kovács Eszter','BSD-2026/003','Ajánlat','Ajánlatbontás','Bontási jegyzőkönyv · 3 érvényes ajánlat, 1 lemondó nyilatkozat'],
   ['2026-09-02 15:48','Sándor Dávid','BSD-2026/003','Értékelés','Kereskedelmi értékelés lezárva','Három formailag érvényes ajánlat rangsorolva.'],
   ['2026-09-02 15:49','Sándor Dávid','BSD-2026/003','Státusz','Státuszváltás','PROC3 → PROC4'],
   ['2026-09-03 10:21','Török András','BSD-2026/003','Dokumentum','TCO-kalkuláció frissítve','TCO_kalkulacio_v3.xlsx · v3'],
   ['2026-09-03 16:12','Sándor Dávid','BSD-2026/003','Dokumentum','SSD-tervezet feltöltve','SSD-2026-003_tervezet.docx · v2'],
   ['2026-09-03 16:20','Sándor Dávid','BSD-2026/003','Jóváhagyás','Jóváhagyás elindítva','SSD · CEO + CFO együttes döntés szükséges.'],
   ['2026-08-10 09:00','Sándor Dávid','BSD-2026/007','Létrehozás','Beszerzés létrehozva','2027. évi PET preform keretszerződés · Direkt · IFS-kritikus · 1 150 000 000 Ft'],
   ['2026-08-11 08:00','Haász Róbert','BSD-2026/007','Jóváhagyás','Beszerzési igény jóváhagyva','Specifikáció v1'],
   ['2026-09-02 16:40','Sándor Dávid','BSD-2026/007','Dokumentum','BSD feltöltve','BSD_BSD-2026-007_v2.docx · v2'],
   ['2026-09-03 13:30','Sándor Dávid','BSD-2026/007','Jóváhagyás','Jóváhagyás elindítva','CEO + CFO együttes döntés szükséges.'],
   ['2026-09-04 08:27','Török András','BSD-2026/007','Jóváhagyás','Tenderkiírás jóváhagyva','CFO-jóváhagyás · BSD v2'],
   ['2026-08-18 09:00','Klujber László','BR-2026/021','Létrehozás','Beszerzés létrehozva','Somogyvári rágcsálómentesítési szolgáltatás · Indirekt · IFS · 12 800 000 Ft · Egyszerű'],
   ['2026-08-31 10:15','Sándor Dávid','BR-2026/021','Levelezés','Tender kiküldve','arajanlat@fonteviva.hu · 3 címzett · határidő: 2026. 09. 11.'],
   ['2026-09-03 09:22','Kovács Eszter','BR-2026/021','Ajánlat','Ajánlat beérkezett','Bábolna Bio Kft. · formailag megfelelő.'],
   ['2026-08-05 09:00','Klujber László','BR-2026/019','Létrehozás','Beszerzés létrehozva','Rámpa kültéri üzemi kijelzők · Indirekt · 6 200 000 Ft · Egyszerű'],
   ['2026-09-01 10:00','Kovács Eszter','BR-2026/019','Ajánlat','Ajánlatbontás','Bontási jegyzőkönyv · 2 érvényes ajánlat, 1 lemondó nyilatkozat'],
   ['2026-09-02 14:00','Sándor Dávid','BR-2026/019','Értékelés','Értékelés megkezdve','2 érvényes ajánlat; a hiányzó válasz ténye az SSD-ben rögzítendő.'],
   ['2026-07-20 09:00','Klujber László','SS-2026/006','Létrehozás','Beszerzés létrehozva','KHS kupakzáró egyedi hajtóműalkatrész · OPEX · Sole Source · 1 700 000 Ft'],
   ['2026-07-21 14:00','Haász Róbert','SS-2026/006','Jóváhagyás','Sole Source indoklás jóváhagyva','SS indoklás v1'],
   ['2026-08-28 14:10','Sándor Dávid','SS-2026/006','Státusz','Beszerzés lezárva','Dokumentumtár zárolva · megőrzés: szerződés lejárta + 8 év'],
   ['2026-08-28 08:40','Szilágyi László','VH-2026/012','Létrehozás','Vészhelyzeti beszerzés indítva','Csányi kompresszor sürgősségi javítása · 4 800 000 Ft · Vészhelyzeti'],
   ['2026-08-28 09:00','Haász Róbert','VH-2026/012','Jóváhagyás','Vészhelyzeti beszerzés jóváhagyva','Szóbeli jóváhagyás, utólagos írásos megerősítéssel.'],
   ['2026-08-28 12:00','Sándor Dávid','VH-2026/012','Dokumentum','Visszamenőleges PO rögzítve','PO_utolagos_kompresszor.pdf · v1']];
  A.map((r,i)=>({r,i})).sort((a,b)=>a.r[0]<b.r[0]?-1:a.r[0]>b.r[0]?1:a.i-b.i).forEach(x=>log(x.r[2],x.r[3],x.r[4],x.r[5],x.r[1],x.r[0]));
  return st;
}

