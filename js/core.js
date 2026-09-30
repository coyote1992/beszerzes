'use strict';
/* ===== Utilities ===== */
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const MON=['jan.','febr.','márc.','ápr.','máj.','jún.','júl.','aug.','szept.','okt.','nov.','dec.'];
const WDN=['vasárnap','hétfő','kedd','szerda','csütörtök','péntek','szombat'];
const MONL=['január','február','március','április','május','június','július','augusztus','szeptember','október','november','december'];
const pd=s=>{const a=s.slice(0,10).split('-').map(Number);return new Date(Date.UTC(a[0],a[1]-1,a[2]));};
const iso=d=>d.toISOString().slice(0,10);
const addD=(s,n)=>{const d=pd(s);d.setUTCDate(d.getUTCDate()+n);return iso(d);};
const addWD=(s,n)=>{const d=pd(s);let k=0;while(k<n){d.setUTCDate(d.getUTCDate()+1);const w=d.getUTCDay();if(w!==0&&w!==6)k++;}return iso(d);};
const diffD=(a,b)=>Math.round((pd(b)-pd(a))/864e5);
const fShort=s=>{if(!s)return '–';const d=pd(s);return MON[d.getUTCMonth()]+' '+d.getUTCDate()+'.';};
const fDay=s=>{if(!s)return '–';const d=pd(s);return d.getUTCFullYear()+'. '+String(d.getUTCMonth()+1).padStart(2,'0')+'. '+String(d.getUTCDate()).padStart(2,'0')+'.';};
const fdt=t=>t?fDay(t)+' '+t.slice(11,16):'–';
const rel=s=>!s?'–':(s===S.today?'ma':fShort(s));
const nf=new Intl.NumberFormat('hu-HU');
const ft=v=>nf.format(Math.round(v)).replace(/ | /g,' ')+' Ft';
const short=v=>{const o={maximumFractionDigits:2};if(v>=1e9)return (v/1e9).toLocaleString('hu-HU',o)+' Mrd Ft';if(v>=1e6)return (v/1e6).toLocaleString('hu-HU',o)+' M Ft';return ft(v);};
const h53=(str,seed=0)=>{let h1=0xdeadbeef^seed,h2=0x41c6ce57^seed;for(let i=0,ch;i<str.length;i++){ch=str.charCodeAt(i);h1=Math.imul(h1^ch,2654435761);h2=Math.imul(h2^ch,1597334677);}h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);return (4294967296*(2097151&h2)+(h1>>>0)).toString(16).padStart(14,'0');};

/* ===== Icons ===== */
const IC={grid:'<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>',clip:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9z"/>',checksq:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="m8 12 3 3 5-6"/>',doc:'<path d="M7 3h8l4 4v14H7z"/><path d="M10 12h6M10 16h6"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',search:'<circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/>',plus:'<path d="M12 5v14M5 12h14"/>',x:'<path d="M6 6l12 12M18 6 6 18"/>',check:'<path d="m5 12 4 4 10-10"/>',alert:'<path d="M12 6v8M12 18v.5"/>',lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',upload:'<path d="M12 16V5M7 9l5-5 5 5M5 19h14"/>',cal:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',download:'<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',shield:'<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z"/><path d="m9 12 2 2 4-4"/>',book:'<path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/>',arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',half:'<circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',hourglass:'<path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9"/>'};
const ic=n=>`<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${IC[n]||''}</svg>`;

/* ===== Policy constants ===== */
const CEO='Haász Róbert',CFO='Török András',SCM='Sándor Dávid',MI='Bacza Roland',ADM='Kovács Eszter',JOGI='Dr. Kiss Anna',PENZ='Farkas Ildikó',MDM='Nagy Réka',RAKT='Varga Béla';
const USERS=[
 {n:CEO,role:'CEO',ini:'HR'},{n:CFO,role:'CFO',ini:'TA'},{n:SCM,role:'SCM vezető · Beszerzés',ini:'SD'},
 {n:'Szilágyi László',role:'Igénylő · Csány termelés, költséghely-felelős',ini:'SL'},{n:MI,role:'Minőségirányítás / IFS',ini:'BR'},
 {n:ADM,role:'Tenderadminisztrátor',ini:'KE'},{n:JOGI,role:'Jogi',ini:'KA'},{n:PENZ,role:'Pénzügy',ini:'FI'},
 {n:MDM,role:'Master Data Management',ini:'NR'},{n:RAKT,role:'Raktár',ini:'VB'},
 {n:'Klujber László',role:'Költséghely-felelős · Somogyvár',ini:'KL'},{n:'Gyulai Péter',role:'Költséghely-felelős · Somogyvár karbantartás',ini:'GP'},{n:'Jekkel Tibor',role:'Költséghely-felelős · Csány karbantartás',ini:'JT'}];
const INF=Infinity;
const CC={
 '1255BS1200':{n:'HQ – Management & Admin',b:[[2e5,null],[INF,CEO]]},
 '1255BS1300':{n:'HQ – QA & HSE',b:[[2e5,'Bacza Roland'],[INF,CEO]]},
 '1255BS1400':{n:'HQ – Supply Chain Mngmt',b:[[1e6,SCM],[INF,CEO]]},
 '1255BS2300':{n:'Somogyvár karbantartás',b:[[2e5,'Gyulai Péter'],[5e5,'Klujber László'],[INF,CEO]]},
 '1255BS2400':{n:'Somogyvár telephely – termelés',b:[[2e5,'Klujber László'],[2e6,SCM],[INF,CEO]]},
 '1255BS3300':{n:'Csány karbantartás',b:[[2e5,'Jekkel Tibor'],[5e5,'Szilágyi László'],[INF,CEO]]},
 '1255BS3400':{n:'Csány telephely – termelés',b:[[2e5,'Szilágyi László'],[2e6,SCM],[INF,CEO]]}};
const ORGS=[['Somogyvár – karbantartás','1255BS2300'],['Somogyvár – termelés','1255BS2400'],['Csány – karbantartás','1255BS3300'],['Csány – termelés','1255BS3400'],['HQ – Supply Chain','1255BS1400'],['HQ – QA & HSE','1255BS1300'],['HQ – Management & Admin','1255BS1200']];
const ccApprover=(cc,v)=>{const c=CC[cc];if(!c)return null;for(const b of c.b){if(v<b[0])return b[1];}return CEO;};
const typeOf=v=>v<2e6?'Egyedi':v<=2e7?'Egyszerű':'Kiemelt';
const TYPEDESC={Egyedi:'< 2 M Ft · egyszerűsített eljárás, 3 ajánlat (max. 2 webáruházi)',Egyszerű:'2–20 M Ft · teljes tender, 3 írásos ajánlat vagy lemondó nyilatkozat',Kiemelt:'> 20 M Ft · teljes tender + BSD + Értékelő Bizottság, jogi és pénzügyi vélemény'};
const STAGES=[['PROC1','Igény'],['PROC2','Előkészítés'],['PROC3','Tender'],['PROC4','Kiválasztás'],['PROC5','Szerződés'],['PROC6','Teljesítés']];
const W={t:.4,c:.6};
const DOCS={
 spec:['Beszerzési igény és műszaki specifikáció',1,'docx'],vhReason:['Vészhelyzeti írásos indoklás',1,'docx'],ifsReq:['IFS / minőségi követelmények melléklet',1,'pdf'],msds:['MSDS és DoC',1,'pdf'],
 bsd:['Bid Starting Document (BSD)',2,'docx'],rfq:['RFQ / ajánlatkérő levél',2,'docx'],qty:['Mennyiség és ütemterv',2,'xlsx'],pricing:['Árazási struktúra',2,'xlsx'],matrixTpl:['Kiértékelési mátrix sablon',2,'xlsx'],contractDraft:['Szerződéstervezet',2,'docx'],nda:['Titoktartási nyilatkozat',2,'pdf'],cyber:['Kiberbiztonsági záradék',2,'docx'],supplierForm:['Beszállítói adatlap',2,'docx'],ssForm:['Sole Source indoklás űrlap (5. melléklet)',2,'docx'],
 invit:['Kiküldött meghívó / ajánlatkérés',3,'eml'],bid:['Ajánlat',4,'pdf'],opening:['Bontási jegyzőkönyv',5,'docx'],
 tco:['TCO / DCF kalkuláció (7. melléklet)',7,'xlsx'],matrix:['Kiértékelési mátrix (2. melléklet)',7,'xlsx'],
 nego:['Tárgyalási jegyzőkönyv',8,'docx'],revised:['Módosított, írásos ajánlat',8,'pdf'],
 ssd:['Supplier Selection Document (SSD)',9,'docx'],ifsCert:['IFS-megfelelőségi tanúsítványok',9,'pdf'],
 contractFinal:['Szerződés / PO-dokumentum (végleges)',10,'docx'],contractSigned:['Aláírt szerződés (Netlock / szkennelt)',10,'pdf'],bankGuar:['Bankgarancia',10,'pdf'],
 po:['Purchase Order (PO)',11,'pdf'],perfCert:['Teljesítésigazolás (9. melléklet)',11,'pdf'],invoice:['Számla',11,'pdf'],vhProtocol:['Vészhelyzeti jegyzőkönyv (6. melléklet)',11,'docx']};
const FOLDERS=['Igény és specifikáció','BSD és tenderkiírás','Meghívások','Beérkezett ajánlatok','Bontási jegyzőkönyv','Műszaki értékelés','Kereskedelmi értékelés és TCO','Tárgyalási dokumentumok','SSD és jóváhagyások','Szerződés és módosítások','PO, teljesítésigazolás és lezárás'];
const dl=k=>DOCS[k][0];

/* ===== State ===== */
const SKEY='fv-tender-demo-v2';
let S=null;
const U={view:'dash',open:null,tab:'ov',menu:false,q:'',fType:'',fStage:'',fProc:'',taskF:'me',apprTab:'wait',auditQ:'',auditP:'',dashTab:'all',auditMsg:''};
function save(){try{localStorage.setItem(SKEY,JSON.stringify(S));}catch(e){}}
function load(){try{const r=localStorage.getItem(SKEY);if(r){const s=JSON.parse(r);if(s&&s.procs&&s.audit)return s;}}catch(e){}return null;}
const P=id=>S.procs.find(p=>p.id===id);
const stamp=()=>S.today+' '+new Date().toTimeString().slice(0,5);
function auditHash(e){return h53(e.prev+'|'+[e.n,e.ts,e.user,e.proc,e.type,e.title,e.detail].join('|'));}
function log(proc,type,title,detail,user,ts){
  const prev=S.audit.length?S.audit[S.audit.length-1].hash:'GENESIS';
  const e={n:S.audit.length+1,ts:ts||stamp(),user:user||S.user,proc:proc||'',type,title,detail:detail||'',prev};
  e.hash=auditHash(e);S.audit.push(e);return e;
}
function verifyChain(){let prev='GENESIS';for(const e of S.audit){if(e.prev!==prev||auditHash(e)!==e.hash)return {ok:false,at:e.n};prev=e.hash;}return {ok:true,n:S.audit.length};}
function toast(msg,tone){const d=document.createElement('div');d.className='toast '+(tone||'');d.textContent=msg;$('#toasts').appendChild(d);setTimeout(()=>d.remove(),4200);}
const uid=()=>'x'+Math.random().toString(36).slice(2,9);
const nextId=prefix=>{const y=S.today.slice(0,4);const n=(S.seq[prefix]||0)+1;S.seq[prefix]=n;return prefix+'-'+y+'/'+String(n).padStart(3,'0');};
