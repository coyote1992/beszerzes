'use strict';
function guard(who){
  if(!S.strict)return true;
  const names=String(who||'').split(' + ');
  if(names.includes(S.user))return true;
  toast(`Ezt a lépést ${who} végzi. Váltson felhasználót, vagy kapcsolja ki a szigorú szerepkör-ellenőrzést.`,'bad');return false;
}
function advance(p){
  const miss=checklist(p).filter(i=>!i.done);
  if(miss.length)return toast('Még hiányzik: '+(miss[0].short||miss[0].label),'bad');
  if(p.stage===6)return mClose(p.id);
  const old=p.stage;p.stage=nextStage(p);p.due[p.stage]=addWD(S.today,5);
  log(p.id,'Státusz','Státuszváltás',`PROC${old} → PROC${p.stage} · ${STAGES[p.stage-1][1]}`);
  toast(`Továbblépés: PROC${p.stage} · ${STAGES[p.stage-1][1]}`,'ok');
}
function itemAct(el){
  const p=P(el.dataset.p),x=el.dataset.x,k=el.dataset.k,who=el.dataset.who;
  if(x==='tab'){U.tab=k;return true;}
  if(x==='apprReq'){
    const a=apprState(p,k);if(a.bound&&!a.doc)return toast('Előbb töltse fel: '+dl(a.bound),'bad');
    p.appr[k]={req:{by:S.user,ts:stamp()},decisions:[]};
    log(p.id,'Jóváhagyás','Jóváhagyás elindítva',`${ATITLE[k]} · ${a.required.join(' + ')}${a.doc?' · '+dl(a.bound)+' v'+a.ver:''}`);
    toast('Jóváhagyás elindítva: '+a.required.join(' + '),'ok');return true;
  }
  if(!guard(who))return false;
  switch(x){
    case 'doc':mUpload(p.id,k);return false;
    case 'flag':mFlag(p.id,k);return false;
    case 'bidders':mBidders(p.id);return false;
    case 'send':mSend(p.id);return false;
    case 'open':mOpenBids(p.id);return false;
    case 'resolve1':mResolve1(p.id);return false;
    case 'tco':mTco(p.id);return false;
    case 'nego':mNego(p.id);return false;
    case 'prequal':mPrequal(p.id);return false;
    case 'ctype':mCtype(p.id);return false;
    case 'input':mInput(p.id,k);return false;
    case 'commClose':{const r=ranking(p);p.f.commDone=F0(r[0]?'1. hely: '+r[0].b.name:'');log(p.id,'Értékelés','Kereskedelmi értékelés lezárva',`${validBids(p).length} formailag érvényes ajánlat rangsorolva.${r[0]?' Első: '+r[0].b.name+'.':''}`);toast('Kereskedelmi értékelés lezárva','ok');return true;}
    case 'genMatrix':addDoc(p,{key:'matrix',name:'Kiertekelesi_matrix_'+asc(p.id)+'.xlsx',content:matrixHTML(p)});toast('Kiértékelési mátrix elkészült','ok');return true;
    case 'genSSD':{const d=addDoc(p,{key:'ssd',name:'SSD-'+asc(p.id)+'_tervezet.docx',content:ssdHTML(p)});toast('SSD v'+d.ver+' elkészült','ok');return true;}
  }
  return false;
}
function csvExport(){
  const rows=[['Sorszám','Időpont','Felhasználó','Beszerzés','Típus','Esemény','Részletek','Hash']].concat(S.audit.map(e=>[e.n,e.ts,e.user,e.proc,e.type,e.title,e.detail,e.hash]));
  const csv='﻿'+rows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(';')).join('\r\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='auditnaplo_'+S.today+'.csv';document.body.appendChild(a);a.click();a.remove();
}
const A={
  nav(el){U.view=el.dataset.v;U.open=null;U.menu=false;},
  theme(){S.theme=S.theme==='dark'?'light':'dark';},
  userMenu(){U.menu=!U.menu;},
  user(el){S.user=el.dataset.v;U.menu=false;toast('Belépve mint: '+S.user);},
  strict(el){S.strict=el.checked;},
  clock(){S.today=addWD(S.today,1);toast('Demó dátuma: '+fDay(S.today));},
  reset(){if(confirm('Visszaállítja a demó adatait az induló állapotra?')){const th=S.theme;localStorage.removeItem(SKEY);S=seedState();S.theme=th;U.open=null;U.view='dash';toast('Demó alaphelyzetbe állítva','ok');}},
  about(){mAbout();},
  newProc(){mNew();},
  open(el){if(!P(el.dataset.v))return false;U.open=el.dataset.v;U.tab='ov';},
  openTab(el){U.open=el.dataset.v;U.tab=el.dataset.t||'ov';},
  closeDrawer(el,e){if(el.classList.contains('dscrim')&&e.target!==el)return false;U.open=null;},
  tab(el){U.tab=el.dataset.v;},
  filter(el){U[el.dataset.v]=el.value;},
  clearF(){U.q='';U.fType='';U.fStage='';U.fProc='';},
  apprTab(el){U.apprTab=el.dataset.v;},
  dashTab(el){U.dashTab=el.dataset.v;},
  taskF(el){U.taskF=el.dataset.v;},
  taskDone(el){const t=S.tasks.find(x=>x.id===el.dataset.v);t.done=el.checked?stamp():null;log(t.pid,'Feladat',el.checked?'Feladat lezárva':'Feladat újranyitva',t.title);},
  newTask(el){mTask(el.dataset.p||'');},
  auditQ(el){U.auditQ=el.value;},auditP(el){U.auditP=el.value;},
  verify(){const r=verifyChain();U.auditMsg=r.ok?['ok',`A hash-lánc ép: mind a(z) ${r.n} bejegyzés az előzőhöz kapcsolódik, egyik sem módosult.`]:['bad',`<b>Integritási hiba a(z) #${r.at} bejegyzésnél</b> – a napló tartalma megváltozott a rögzítés óta.`];},
  tamper(){if(U.tamper){S.audit[U.tamper.i].detail=U.tamper.orig;U.tamper=null;U.auditMsg=['ok','Az eredeti bejegyzés visszaállítva (csak demó). Éles rendszerben ez nem lehetséges.'];}else{const i=Math.floor(S.audit.length/2),e=S.audit[i];U.tamper={i,orig:e.detail};e.detail+=' (utólag módosítva)';U.auditMsg=['bad',`A(z) #${e.n} bejegyzést szimuláltan módosítottuk. Futtassa a lánc-ellenőrzést!`];}},
  csv(){csvExport();return false;},
  itemAct(el){return itemAct(el);},
  bidRecv(el){mBidRecv(el.dataset.p,el.dataset.b);return false;},
  bidDecl(el){mBidDecl(el.dataset.p,el.dataset.b);return false;},
  bidEval(el){mEval(el.dataset.p,el.dataset.b);return false;},
  bidders(el){mBidders(el.dataset.p);return false;},
  rmBidder(el){const p=P(el.dataset.p);const b=p.bidders.find(x=>x.id===el.dataset.b);p.bidders=p.bidders.filter(x=>x!==b);log(p.id,'Ajánlat','Ajánlattevő eltávolítva',b.name);closeModal();setTimeout(()=>mBidders(p.id),0);},
  folderUp(el){mUpload(el.dataset.p,null,undefined,el.dataset.f);return false;},
  viewDoc(el){const d=P(U.open).docs.find(x=>x.id===el.dataset.v);mDoc(d);return false;},
  advance(el){advance(P(el.dataset.p));},
  failProc(el){mFail(el.dataset.p);return false;},
  decide(el){const p=P(el.dataset.p),a=apprState(p,el.dataset.k);if(!a.per.some(x=>x.name===S.user)){toast('Ezt a jóváhagyást '+a.required.map(fixName).join(' + ')+' végzi. Váltson felhasználót a jobb felső menüben.','bad');return false;}mDecide(p.id,el.dataset.k,el.dataset.d);return false;},
  mclose(){closeModal();},
  scrim(el,e){if(e.target===el)closeModal();return false;},
  mok(){const cur=M;if(!cur||!cur.onOk)return closeModal();const r=cur.onOk(fv());if(r===false)return false;if(M===cur)closeModal();}
};
const TEXTY=new Set(['filter','auditQ','auditP','strict','taskDone']);
document.addEventListener('click',e=>{
  if(U.menu&&!e.target.closest('.userbox')){U.menu=false;renderTop();}
  const sr=$('#sres');if(sr&&!sr.hidden&&!e.target.closest('.search')){sr.hidden=true;}
  const el=e.target.closest('[data-a]');if(!el)return;
  const a=el.dataset.a;if(TEXTY.has(a)&&el.tagName!=='INPUT'||el.tagName==='SELECT'||(el.tagName==='INPUT'&&el.type==='text'))return;
  if(el.tagName==='A')e.preventDefault();
  if(!A[a])return;
  const r=A[a](el,e);if(r===false)return;render();
});
document.addEventListener('change',e=>{const el=e.target.closest('[data-a]');if(!el)return;if(el.tagName==='SELECT'&&A[el.dataset.a]){A[el.dataset.a](el,e);render();}});
document.addEventListener('input',e=>{
  if(e.target.closest('#mbody')){if(M&&M.live)M.live(fv());return;}
  if(e.target.id==='gsearch'){globalSearch(e.target.value);return;}
  const el=e.target.closest('[data-a]');if(el&&el.tagName==='INPUT'&&el.type==='text'&&A[el.dataset.a]){const pos=el.selectionStart,a=el.dataset.a,v=el.dataset.v;A[a](el,e);render();const n=document.querySelector(`[data-a="${a}"]${v?`[data-v="${v}"]`:''}`);if(n){n.focus();try{n.setSelectionRange(pos,pos);}catch(x){}}}
  if(el&&el.type==='checkbox'&&el.dataset.a==='taskDone'){}
});
function globalSearch(q){
  const r=$('#sres');q=q.trim().toLowerCase();if(!q){r.hidden=true;return;}
  const l=S.procs.filter(p=>(p.id+' '+p.subject+' '+p.bidders.map(b=>b.name).join(' ')+' '+p.requester).toLowerCase().includes(q)).slice(0,6);
  r.hidden=false;r.innerHTML=l.length?l.map(p=>`<button data-a="open" data-v="${esc(p.id)}"><b class="id">${esc(p.id)}</b> ${esc(p.subject)}<br><small>${short(p.value)} · ${STAGES[p.stage-1][0]} · ${esc(statusOf(p).l)}</small></button>`).join(''):'<button disabled>Nincs találat</button>';
}
document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#gsearch').focus();}
  if(e.key==='Escape'){if(M){closeModal();}else if(U.open){U.open=null;render();}else if(U.menu){U.menu=false;renderTop();}}
});
S=load()||seedState();
if(!S.tasks)S=seedState();
render();
