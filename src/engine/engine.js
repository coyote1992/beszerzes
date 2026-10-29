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

/* ===== Roles, people, cost centres (configured in Beállítások) ===== */
/* Built-in roles are referenced by the rules below; custom roles (S.roleDefs) can be assigned to people and used as cost-centre approvers. */
export const BUILTIN_ROLES=[['CEO','Ügyvezető (CEO)'],['CFO','Pénzügyi igazgató (CFO)'],['SCM','SCM vezető / beszerzés'],['MI','Minőségirányítás / IFS']];
export const isBuiltinRole=k=>BUILTIN_ROLES.some(r=>r[0]===k);
export let ROLES=BUILTIN_ROLES.map(r=>[r[0],r[1]]);
export let ROLE_LABEL=Object.fromEntries(ROLES);
export let CEO='role:CEO',CFO='role:CFO',SCM='role:SCM',MI='role:MI';
export const roleRef=r=>(S&&S.roles&&S.roles[r])||'role:'+r;
export const INF=Infinity;
/* Cost centres and approval bands (11. melléklet). Band = [upper limit (null = no limit), approver ref, hint from the policy].
   Approver ref: 'role:X' | e-mail | '' (to be assigned) | null (no approval needed). */
export const DEFAULT_CC={
 '1255BS1200':{n:'HQ – Management & Admin',b:[[2e5,null,'Nincs jóváhagyás'],[null,'role:CEO','Haász Róbert']]},
 '1255BS1300':{n:'HQ – QA & HSE',b:[[2e5,'role:MI','Bacza Roland'],[null,'role:CEO','Haász Róbert']]},
 '1255BS1400':{n:'HQ – Supply Chain Mngmt',b:[[1e6,'role:SCM','Sándor Dávid'],[null,'role:CEO','Haász Róbert']]},
 '1255BS2300':{n:'Somogyvár karbantartás',b:[[2e5,'','Gyulai Péter'],[5e5,'','Klujber László'],[null,'role:CEO','Haász Róbert']]},
 '1255BS2400':{n:'Somogyvár telephely – termelés',b:[[2e5,'','Klujber László'],[2e6,'role:SCM','Sándor Dávid'],[null,'role:CEO','Haász Róbert']]},
 '1255BS3300':{n:'Csány karbantartás',b:[[2e5,'','Jekkel Tibor'],[5e5,'','Szilágyi László'],[null,'role:CEO','Haász Róbert']]},
 '1255BS3400':{n:'Csány telephely – termelés',b:[[2e5,'','Szilágyi László'],[2e6,'role:SCM','Sándor Dávid'],[null,'role:CEO','Haász Róbert']]}};
export let CC=DEFAULT_CC;
export function applyRoles(){const cu=(S&&S.roleDefs)||[];ROLES=[...BUILTIN_ROLES.map(r=>[r[0],r[1]]),...cu.map(r=>[r.key,r.label])];ROLE_LABEL=Object.fromEntries(ROLES);
  CEO=roleRef('CEO');CFO=roleRef('CFO');SCM=roleRef('SCM');MI=roleRef('MI');CC=(S&&S.cc)||DEFAULT_CC;}
export const resolveRef=(ref,code,i)=>ref===null?null:(ref&&ref.startsWith('role:')?roleRef(ref.slice(5)):(ref||`cc:${code}:${i}`));
export const personOf=e=>S&&S.people?S.people.find(p=>p.email===e):null;
/** Display name for a person key (e-mail), an unassigned role or an unassigned cost-centre band. */
export const nm=k=>{if(!k)return '';if(k.startsWith('role:'))return (ROLE_LABEL[k.slice(5)]||k.slice(5))+' (nincs kijelölve)';
  if(k.startsWith('cc:')){const [,code,i]=k.split(':');const b=CC[code]&&CC[code].b[+i];return (b&&b[2]?b[2]:'Költséghely-jóváhagyó')+' (nincs kijelölve)';}
  const p=personOf(k);return p?p.name:k;};
export const rolesOf=e=>ROLES.filter(([r])=>S&&S.roles&&S.roles[r]===e).map(([,l])=>l);
export const unassigned=k=>!!k&&(k.startsWith('role:')||k.startsWith('cc:'));
export const ORGS=[['Somogyvár – karbantartás','1255BS2300'],['Somogyvár – termelés','1255BS2400'],['Csány – karbantartás','1255BS3300'],['Csány – termelés','1255BS3400'],['HQ – Supply Chain','1255BS1400'],['HQ – QA & HSE','1255BS1300'],['HQ – Management & Admin','1255BS1200']];
export const ccApprover=(cc,v)=>{const c=CC[cc];if(!c)return null;for(let i=0;i<c.b.length;i++){const b=c.b[i];if(v<(b[0]==null?INF:b[0]))return resolveRef(b[1],cc,i);}return CEO;};
export const typeOf=v=>v<2e6?'Egyedi':v<=2e7?'Egyszerű':'Kiemelt';
export const TYPEDESC={Egyedi:'< 2 M Ft · egyszerűsített eljárás, 3 ajánlat (max. 2 webáruházi)',Egyszerű:'2–20 M Ft · teljes tender, 3 írásos ajánlat vagy lemondó nyilatkozat',Kiemelt:'> 20 M Ft · teljes tender + BSD + Értékelő Bizottság, jogi és pénzügyi vélemény'};
export const STAGES=[['PROC1','Igény'],['PROC2','Előkészítés'],['PROC3','Tender'],['PROC4','Kiválasztás'],['PROC5','Szerződés']];
export const W={t:.4,c:.6};
export const DOCS={
 spec:['Beszerzési igény és műszaki specifikáció',1,'docx'],vhReason:['Vészhelyzeti írásos indoklás',1,'docx'],ifsReq:['IFS / minőségi követelmények melléklet',1,'pdf'],msds:['MSDS és DoC',1,'pdf'],
 bsd:['Bid Starting Document (BSD)',2,'docx'],rfq:['RFQ / ajánlatkérő levél',2,'docx'],qty:['Mennyiség és ütemterv',2,'xlsx'],pricing:['Árazási struktúra',2,'xlsx'],matrixTpl:['Kiértékelési mátrix sablon',2,'xlsx'],contractDraft:['Szerződéstervezet',2,'docx'],nda:['Titoktartási nyilatkozat',2,'pdf'],cyber:['Kiberbiztonsági záradék',2,'docx'],supplierForm:['Beszállítói adatlap',2,'docx'],ssForm:['Sole Source indoklás űrlap (5. melléklet)',2,'docx'],
 invit:['Kiküldött meghívó / ajánlatkérés',3,'eml'],bid:['Ajánlat',4,'pdf'],opening:['Bontási jegyzőkönyv',5,'docx'],
 tco:['TCO / DCF kalkuláció (7. melléklet)',7,'xlsx'],matrix:['Kiértékelési mátrix (2. melléklet)',7,'xlsx'],
 nego:['Tárgyalási jegyzőkönyv',8,'docx'],revised:['Módosított, írásos ajánlat',8,'pdf'],
 ssd:['Supplier Selection Document (SSD)',9,'docx'],ifsCert:['IFS-megfelelőségi tanúsítványok',9,'pdf'],
 contractFinal:['Szerződés / PO-dokumentum (végleges)',10,'docx'],contractSigned:['Aláírt szerződés (Netlock / szkennelt)',10,'pdf'],legalOp:['Jogi vélemény',10,'pdf'],finOp:['Pénzügyi vélemény',10,'pdf'],bankGuar:['Bankgarancia',10,'pdf'],
 po:['Purchase Order (PO)',11,'pdf'],perfCert:['Teljesítésigazolás (9. melléklet)',11,'pdf'],invoice:['Számla',11,'pdf'],vhProtocol:['Vészhelyzeti jegyzőkönyv (6. melléklet)',11,'docx']};
export const FOLDERS=['Igény és specifikáció','BSD és tenderkiírás','Meghívások','Beérkezett ajánlatok','Bontási jegyzőkönyv','Műszaki értékelés','Kereskedelmi értékelés és TCO','Tárgyalási dokumentumok','SSD és jóváhagyások','Szerződés és módosítások','PO, teljesítésigazolás és lezárás'];
export const dl=k=>DOCS[k][0];

/* ===== State ===== */
export let S=null;
export function setS(x){S=x;applyRoles();}
export function save(){}
const pad2=n=>String(n).padStart(2,'0');
export const todayLocal=()=>{const d=new Date();return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());};
export const emptyState=()=>({today:todayLocal(),user:'',me:null,procs:[],tasks:[],audit:[],people:[],roles:{},roleDefs:[],cc:DEFAULT_CC});
export const P=id=>S.procs.find(p=>p.id===id);
export const stamp=()=>S.today+' '+new Date().toTimeString().slice(0,5);
/** Audit events are numbered and hash-chained on the server; the user is taken from the sign-in session. */
export function log(proc,type,title,detail){const e={n:null,ts:stamp(),user:S.user,userName:nm(S.user),proc:proc||'',type,title,detail:detail||'',_new:true};S.audit.push(e);return e;}
export const uid=()=>'x'+Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4);
export const nextId=(prefix,test)=>{const pre=(test?'TESZT-':'')+prefix+'-'+S.today.slice(0,4)+'/';let n=0;for(const p of S.procs){if(p.id.startsWith(pre)){const k=parseInt(p.id.slice(pre.length),10);if(k>n)n=k;}}return pre+String(n+1).padStart(3,'0');};

/* ===== Documents ===== */
export const docs=(p,key,bid)=>p.docs.filter(d=>d.key===key&&(bid===undefined||d.bid===bid));
export const docLatest=(p,key,bid)=>{const a=docs(p,key,bid);return a.length?a[a.length-1]:null;};
export const skipped=p=>p.proc==='Vészhelyzeti'?[2,3,4]:p.proc==='SS'?[3]:[];
export const nextStage=p=>{let n=p.stage+1;while(skipped(p).includes(n)&&n<STAGES.length)n++;return n;};
export const tcoReq=p=>p.cat==='CAPEX'&&!p.maint;

/* ===== Approvals ===== */
export const ATITLE={igeny:'Beszerzési igény',tender:'Tenderkiírás',ssd:'Beszállító-kiválasztás (SSD)',ss:'Sole Source indoklás',vh:'Vészhelyzeti beszerzés',sign:'Szerződés cégszerű aláírása',bgWaive:'Eltérés a bankgaranciától'};
export const ADESC={igeny:'Költséghely szerinti jóváhagyás (8.1 mátrix)',tender:'Tenderindítási jóváhagyás – CEO + CFO együtt',ssd:'SSD ügyvezetői jóváhagyása',ss:'Versenyeztetés alóli felmentés jóváhagyása',vh:'Vészhelyzeti beszerzés jóváhagyása',sign:'Aláírás jóváhagyása – CEO + CFO együtt',bgWaive:'Kizárólag CFO engedélyezheti'};
export function required(p,k){
  const t=typeOf(p.value);
  if(k==='igeny'){const a=ccApprover(p.cc,p.value);const r=a?[a]:[];if(t==='Kiemelt'&&!r.includes(SCM))r.push(SCM);return r;}
  if(k==='tender'||k==='sign')return [CEO,CFO];
  if(k==='ssd'||k==='ss')return t==='Kiemelt'?[CEO,CFO]:[ccApprover(p.cc,p.value)||SCM];
  if(k==='vh')return p.value>=2e6?[CEO]:[ccApprover(p.cc,p.value)||SCM];
  if(k==='bgWaive')return [CFO];
  return [];
}
export const BOUND={igeny:'spec',ssd:'ssd',ss:'ssForm',vh:'vhReason',sign:'contractFinal'};
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
    if(a.status==='pending'&&(canProxy(p,user)||a.per.some(x=>x.name===user&&(x.state==='pending'||x.state==='stale'))))out.push({p,key:k,a});});});
  return out;
}
/** On a TEST procurement its creator (or an admin) decides for every approver, so the whole flow can be tried alone. */
export const canProxy=(p,user)=>!!p.test&&!p.closed&&(p.createdBy===user||!!(S.me&&S.me.admin&&user===S.user));
export function decide(p,key,dec,comment){
  const a=apprState(p,key);
  if(canProxy(p,S.user)){
    if(a.bound&&!a.doc){toast('Nincs jóváhagyandó dokumentum.','bad');return false;}
    const who=a.per.filter(x=>x.state!==(dec==='approve'?'approved':'rejected'));
    who.forEach(x=>p.appr[key].decisions.push({by:x.name,dec,ts:stamp(),ver:a.ver,c:comment||'',proxy:S.user}));
    log(p.id,'Jóváhagyás',(dec==='approve'?ATITLE[key]+' jóváhagyva':ATITLE[key]+' elutasítva')+' (teszt)',`${nm(S.user)} rögzítette ${who.map(x=>nm(x.name)).join(' + ')} nevében · ${a.bound?dl(a.bound)+' v'+a.ver:'—'}${comment?' · „'+comment+'"':''}`);
    return true;
  }
  const me=a.per.find(x=>x.name===S.user);
  if(!me){toast('Ezt a jóváhagyást nem Ön végzi. Jóváhagyó: '+a.required.map(nm).join(' + '),'bad');return false;}
  if((key==='ssd'||key==='ss')&&S.user===p.requester){toast('Az igénylő nem vehet részt a végső jóváhagyásban (9.4.4).','bad');return false;}
  if(a.bound&&!a.doc){toast('Nincs jóváhagyandó dokumentum.','bad');return false;}
  p.appr[key].decisions.push({by:S.user,dec,ts:stamp(),ver:a.ver,c:comment||''});
  const na=apprState(p,key);
  log(p.id,'Jóváhagyás',(dec==='approve'?ATITLE[key]+' jóváhagyva':ATITLE[key]+' elutasítva'),`${nm(S.user)} · ${a.bound?dl(a.bound)+' v'+a.ver:'—'}${comment?' · „'+comment+'"':''}${na.status==='approved'?' · minden jóváhagyó döntött':''}`);
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
  const dI=(key,label,who,o)=>{const d=docLatest(p,key),n=d?docs(p,key).filter(x=>x.ver===d.ver).length:0;push(Object.assign({id:'d-'+key,label,who,done:!!d,ev:d?`${d.name}${n>1?` + ${n-1} további fájl`:''} · v${d.ver} · ${nm(d.by)}`:'',acts:[{a:'doc',k:key,l:d?'Új verzió':'Feltöltés',p:!d}]},o||{}));};
  const fI=(key,label,who,o)=>{const f=p.f[key];push(Object.assign({id:'f-'+key,label,who,done:!!f,ev:f?`${nm(f.by)} · ${fdt(f.ts)}${f.note?' · '+f.note:''}`:'',acts:f?[]:[{a:'flag',k:key,l:'Igazolom',p:true}]},o||{}));};
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
    push({id:'send',label:'Ajánlatkérés kiküldése (arajanlat@fonteviva.hu) és rögzítése',short:'Ajánlatkérés kiküldése',who:p.owner,done:!!p.f.sent,ev:p.f.sent?`${nm(p.f.sent.by)} · ${fdt(p.f.sent.ts)} · ${n} címzett · határidő: ${fDay(p.bidDeadline)}`:'',blocked:!p.f.sent&&ta.status!=='approved'?'A kiküldéshez CEO + CFO jóváhagyás szükséges':null,acts:p.f.sent?[]:[{a:'send',l:'Kiküldés rögzítése',p:true}]});
    push({id:'resp',label:`Ajánlatok / lemondó nyilatkozatok beérkezése (${rc}/${n})`,short:'Ajánlattételi határidő',who:p.owner,due:p.bidDeadline,done:!!p.f.sent&&(allResp(p)||(p.bidDeadline&&S.today>=p.bidDeadline)||!!p.f.opened),ev:p.f.sent?'Ajánlattételi határidő: '+fDay(p.bidDeadline):'',acts:[{a:'tab',k:'bids',l:'Ajánlatok'}]});
    const early=!p.test&&p.bidDeadline&&S.today<p.bidDeadline&&!allResp(p);
    push({id:'open',label:'Ajánlatbontás és bontási jegyzőkönyv',short:'Ajánlatbontás',who:p.owner,due:p.bidDeadline,done:!!p.f.opened,ev:p.f.opened?`${nm(p.f.opened.by)} · ${fdt(p.f.opened.ts)}`:'',blocked:!p.f.opened&&(!p.f.sent?'Előbb küldje ki a tendert':(early?`A határidő (${fDay(p.bidDeadline)}) előtt nem bontható`:null)),acts:p.f.opened?[]:[{a:'open',l:'Ajánlatbontás',p:true}]});
    if(p.f.opened){
      const v=validBids(p).length;
      if(v<=1)push({id:'single',label:v===0?'Nincs érvényes ajánlat: sikertelen tender vagy újratendereztetés':'Egyetlen érvényes ajánlat: SS-átsorolás vagy újratendereztetés (ÉB / SCM vezető dönt)',short:'Egyetlen érvényes ajánlat – döntés',who:SCM,done:!!p.f.singleResolved,ev:p.f.singleResolved?p.f.singleResolved.note:'',acts:p.f.singleResolved?[]:[{a:'resolve1',l:'Döntés',p:true}]});
      else if(v===2)push({id:'two',label:'Két érvényes ajánlat: a tényt az SSD-ben rögzíteni kell (9.3.6)',who:p.owner,done:true,ev:'Automatikus megjegyzés kerül az SSD-be'});
      push({id:'tech',label:`Műszaki értékelés az előre meghatározott kritériumok szerint (${validBids(p).filter(b=>b.tech!=null).length}/${v})`,short:'Műszaki értékelés',who:p.requester,done:techDone(p),acts:[{a:'tab',k:'bids',l:'Értékelés',p:!techDone(p)}]});
      const ready=techDone(p)&&validBids(p).filter(techOk).every(commFilled)&&validBids(p).filter(techOk).length>0;
      fI('commDone','Kereskedelmi értékelés lezárása (ár, fizetési feltétel, szállítási idő, jótállás)',p.owner,{short:'Kereskedelmi értékelés lezárása',due:p.due[3],blocked:!p.f.commDone&&!ready?'Műszaki pontszámok és kereskedelmi adatok szükségesek minden műszakilag megfelelő ajánlathoz':null,acts:p.f.commDone?[]:[{a:'commClose',l:'Lezárás',p:true}]});
      if(tcoReq(p))dI('tco','TCO / DCF kalkuláció (CAPEX esetén kötelező)',p.owner,{acts:[{a:'tco',l:docLatest(p,'tco')?'Újraszámolás':'TCO számoló',p:!docLatest(p,'tco')},{a:'doc',k:'tco',l:'Feltöltés'}]});
      push({id:'matrix',label:'Egységes kiértékelési mátrix (2. melléklet)',who:p.owner,done:!!docLatest(p,'matrix'),ev:docLatest(p,'matrix')?`${docLatest(p,'matrix').name} · v${docLatest(p,'matrix').ver}`:'',blocked:!docLatest(p,'matrix')&&!p.f.commDone?'A kereskedelmi értékelés lezárása után generálható':null,acts:[{a:'genMatrix',l:docLatest(p,'matrix')?'Újragenerálás':'Generálás',p:!docLatest(p,'matrix')}]});
      if(t==='Kiemelt')fI('ndaSigned','Titoktartási és összeférhetetlenségi nyilatkozatok (ÉB-tagok)',p.owner);
    }
  }
  if(s===4){
    push({id:'nego',label:'Tárgyalási kör lezárása és nyertes beszállító kiválasztása',short:'Tárgyalás lezárása',who:p.owner,done:!!p.nego,ev:p.nego?`Nyertes: ${p.nego.winnerName} · végső ár: ${ft(p.nego.final)} · megtakarítás: ${ft(p.nego.saving)}`:'',acts:p.nego?[]:[{a:'nego',l:'Tárgyalás rögzítése',p:true}]});
    if(p.nego&&p.nego.final<p.nego.initial)dI('revised',dl('revised'),p.owner);
    if(p.nego&&p.nego.isNew)fI('prequal','Új beszállító előminősítése (MI, 5 munkanapon belül)',MI,{acts:[{a:'prequal',l:'Előminősítés',p:!p.f.prequal}]});
    if(p.ifs)dI('ifsCert',dl('ifsCert'),MI);
    if((SS||p.reclass)&&tcoReq(p))dI('tco',dl('tco'),p.owner,{acts:[{a:'tco',l:'TCO számoló',p:true},{a:'doc',k:'tco',l:'Feltöltés'}]});
    if(p.reclass){dI('ssForm',dl('ssForm'),p.owner);aI('ss','Sole Source indoklás jóváhagyása');}
    dI('ssd','Supplier Selection Document (SSD) – eredmény, megtakarítás, kockázatok',p.owner,{blocked:!docLatest(p,'ssd')&&!p.nego?'A tárgyalás rögzítése után generálható':null,acts:[{a:'genSSD',l:docLatest(p,'ssd')?'Újragenerálás':'SSD generálása',p:!docLatest(p,'ssd')},{a:'doc',k:'ssd',l:'Feltöltés'}]});
    aI('ssd','SSD jóváhagyása (az igénylő nem szavazhat)');
  }
  if(s===5&&!VH){
    push({id:'ctype',label:'Szerződéstípus kiválasztása (PO / ICO / FCO / előrevásárlás / csatlakozási)',who:p.owner,done:!!p.contractType,ev:p.contractType||'',acts:p.contractType?[]:[{a:'ctype',l:'Kiválasztás',p:true}]});
    dI('contractFinal','Szerződés / PO-dokumentum végleges tervezete',p.owner);
    if(t==='Kiemelt'){dI('legalOp','Jogi vélemény a szerződéstervezetről (20 M Ft felett, 5 munkanapon belül)',p.owner);dI('finOp','Pénzügyi vélemény a szerződéstervezetről (20 M Ft felett, 5 munkanapon belül)',p.owner);}
    if(p.prepay){const bg=!!docLatest(p,'bankGuar'),w=apprState(p,'bgWaive');push({id:'bg',label:'Előleg esetén: bankgarancia csatolva vagy CFO írásos eltérés-engedély',who:p.owner+' + '+CFO,done:bg||w.status==='approved',appr:w.requested?w:null,ev:bg?'Bankgarancia csatolva':'',acts:bg?[]:[{a:'doc',k:'bankGuar',l:'Bankgarancia',p:true}].concat(w.requested?[]:[{a:'apprReq',k:'bgWaive',l:'CFO eltérés kérése'}])});}
    const sg=apprState(p,'sign'),pre=(t!=='Kiemelt'||(!!docLatest(p,'legalOp')&&!!docLatest(p,'finOp')));
    aI('sign','Cégszerű aláírás jóváhagyása (CEO + CFO együttesen)',{blocked:!sg.requested&&!docLatest(p,'contractFinal')?'Előbb töltse fel a szerződés végleges tervezetét':(!sg.requested&&!pre?'A jogi és pénzügyi vélemény szükséges':null)});
    dI('contractSigned','Aláírt példány (Netlock e-aláírás vagy papír + szkennelt másolat)',p.owner,{blocked:!docLatest(p,'contractSigned')&&sg.status!=='approved'?'Az aláírás-jóváhagyás után tölthető fel':null});
  }
  if(s===5&&VH){const due=addWD(p.vhDate,5);
    dI('vhProtocol','Vészhelyzeti jegyzőkönyv (6. melléklet)',p.owner,{short:'Vészhelyzeti dokumentáció lezárása',due});dI('ssForm',dl('ssForm'),p.owner,{due});
    push({id:'quote',label:'Beérkezett ajánlat(ok) rögzítve',who:p.owner,due,done:p.docs.some(d=>d.key==='bid'),acts:[{a:'tab',k:'bids',l:'Ajánlatok'}]});
    dI('po','Visszamenőleges PO (dokumentált indoklással)',p.owner,{due});
  }
  return L;
}
export const nextItem=p=>checklist(p).find(i=>!i.done);
export function statusOf(p){
  if(p.closed)return p.closed.failed?{l:'Sikertelen',t:'bad'}:{l:'Lezárt',t:'ok'};
  const it=checklist(p);
  const rej=it.find(i=>i.appr&&i.appr.status==='rejected');if(rej)return {l:'Elutasítva – javítás szükséges',t:'bad'};
  if(p.proc==='Vészhelyzeti'&&p.stage===5&&it.some(i=>!i.done&&i.due&&i.due<=S.today))return {l:'Dokumentáció hiányos',t:'bad'};
  const pa=it.find(i=>i.appr&&i.appr.requested&&i.appr.status==='pending');
  if(pa)return {l:(pa.appr.key==='ssd'||pa.appr.key==='ss')?'Döntésre vár':'Jóváhagyásra vár',t:'warn'};
  if(p.stage===3&&p.f.sent&&!p.f.opened)return {l:'Ajánlattétel folyamatban',t:'inf'};
  if(p.stage===3&&p.f.opened)return {l:'Értékelés alatt',t:'pur'};
  if(p.proc==='Vészhelyzeti'&&p.stage===5)return {l:'Utólagos dokumentáció',t:'warn'};
  return {l:p.stage===1?'Igény előkészítése':'Előkészítés alatt',t:'mut'};
}
export function nextDue(p){if(p.closed)return {date:p.closed.ts.slice(0,10),text:p.closed.failed?'Sikertelen eljárás':'Nincs nyitott feladat'};const i=nextItem(p);if(!i)return {date:p.due[p.stage]||null,text:'Továbbléphet: '+(p.stage<STAGES.length?STAGES[nextStage(p)-1][1]:'lezárás')};return {date:i.due||p.due[p.stage]||null,text:i.short||i.label,item:i};}

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
    out.push({pid:p.id,title:i.short||i.label,sub:p.subject,date:d,right:i.appr?i.who.split(' + ').map(k=>k===CEO?'CEO':k===CFO?'CFO':nm(k)).join(' + ')+' döntése':typeOf(p.value),tone:i.appr?'warn':(overdue||d===S.today&&p.proc==='Vészhelyzeti'?'bad':'inf'),ic:i.appr?'check':(overdue||d===S.today&&p.proc==='Vészhelyzeti'?'alert':'arrow')});});
  return out.sort((a,b)=>(a.date||'9')<(b.date||'9')?-1:1);
}

