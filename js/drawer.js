'use strict';
function itemHTML(p,i){
  const cls=i.done?'tone-ok':i.blocked?'tone-mut':(i.appr&&i.appr.requested?'tone-warn':'tone-warn');
  const ico=i.done?ic('check'):i.blocked?ic('lock'):(i.appr&&i.appr.requested?ic('hourglass'):ic('alert'));
  let sub='';
  if(i.done)sub=i.ev?esc(i.ev):'';
  else if(i.blocked)sub='🔒 '+esc(i.blocked);
  else if(i.due)sub='Határidő: '+fShort(i.due)+(i.due<S.today?' – lejárt':'');
  let ap='';
  if(i.appr&&i.appr.requested){const a=i.appr;ap='<div class="wh">'+a.per.map(x=>`<span class="pill tone-${x.state==='approved'?'ok':x.state==='rejected'?'bad':'warn'}" title="${x.dec?esc(x.dec.c||''):''}">${x.state==='approved'?'✓':x.state==='rejected'?'✗':x.state==='stale'?'↻':'⏳'} ${esc(fixName(x.name))}${x.state==='approved'?' · '+fShort(x.dec.ts.slice(0,10))+' v'+x.dec.ver:x.state==='stale'?' · új verzió, újra kell':''}</span>`).join(' ')+(a.doc?` <small>${esc(dl(a.bound))} v${a.ver}</small>`:'')+'</div>';}
  const btns=[];
  if(!p.closed){
    i.acts.forEach(x=>{if(!x.l)return;btns.push(`<button class="btn sm ${x.p&&!i.blocked?'p':''}" data-a="itemAct" data-p="${esc(p.id)}" data-i="${i.id}" data-x="${x.a}" data-k="${x.k||''}" data-who="${esc(i.who)}" ${i.blocked&&x.p?'disabled':''}>${x.l}</button>`);});
    if(i.appr&&i.appr.requested&&i.appr.status!=='approved'&&i.appr.per.some(x=>x.name===S.user&&(x.state==='pending'||x.state==='stale')))
      btns.push(`<button class="btn sm bad" data-a="decide" data-p="${esc(p.id)}" data-k="${i.appr.key}" data-d="reject">Elutasítom</button><button class="btn sm p" data-a="decide" data-p="${esc(p.id)}" data-k="${i.appr.key}" data-d="approve">Jóváhagyom</button>`);
  }
  return `<div class="item"><div class="st ${cls}">${ico}</div><div class="bd"><b>${esc(i.label)}</b>${sub?`<small>${sub}</small>`:''}${ap}<div class="wh">${ownerChips(i.who)}</div></div><div class="ac">${btns.join('')}</div></div>`;
}
function tabOverview(p){
  const t=typeOf(p.value),st=statusOf(p),it=checklist(p),done=it.filter(i=>i.done).length,cc=CC[p.cc];
  const sk=skipped(p);
  const step=STAGES.map((s,i)=>{const n=i+1;const cl=p.closed||n<p.stage?(sk.includes(n)?'done skip':'done'):n===p.stage?'cur':'';return `<div class="step ${cl}"><i>${cl.startsWith('done')?'✓':n}</i>${s[0]} · ${s[1]}</div>`;}).join('');
  const missing=it.filter(i=>!i.done).length;
  const nx=p.stage<6?STAGES[nextStage(p)-1]:null;
  const fact=(l,v,tone)=>`<div class="fact card ${tone?'tone-'+tone:''}"><small>${l}</small><b>${v}</b></div>`;
  return `<div class="card stepper">${step}</div>
  <div class="facts">${fact('Aktuális státusz',pill(st.l,st.t))}${fact('Felelős beszerző',esc(p.owner))}${fact('Igénylő',esc(p.requester))}${fact('Költséghely',`${p.cc}<br><small style="font-weight:500;color:var(--mut)">${cc?esc(cc.n):''}</small>`)}${fact('Becsült nettó érték',ft(p.value))}${fact('Teljesítési határidő',fDay(p.desired))}</div>
  ${p.nego?`<div class="note ok" style="margin:0 0 16px">${ic('check')}<div><b>Tényleges érték: ${ft(p.nego.final)}</b> · nyertes: ${esc(p.nego.winnerName)} · megtakarítás a kezdő ajánlathoz képest: <b>${ft(p.nego.saving)}</b></div></div>`:''}
  ${p.closed?`<div class="note ${p.closed.failed?'bad':'ok'}" style="margin:0 0 16px">${ic('lock')}<div><b>${p.closed.failed?'Sikertelen eljárás':'Lezárt beszerzés'}</b> · ${fdt(p.closed.ts)} · ${esc(p.closed.by)}${p.closed.reason?' · '+esc(p.closed.reason):''}<br>A dokumentumtár zárolva. Megőrzés: szerződés lejártát követő 8 év (PO, számla: 8 év; tenderdokumentáció: 5 év).</div></div>`:
  `<div class="card sec"><div class="hd"><div><h3>${nx?`Mi hiányzik a következő lépéshez? (${STAGES[p.stage-1][0]} → ${nx[0]})`:'Mi hiányzik a lezáráshoz?'}</h3><small>Minden lépéshez tartozik felelős; ha minden zöld, továbbléphet.</small></div><b>${done}/${it.length}</b></div><div class="prog"><u style="width:${it.length?done/it.length*100:100}%"></u></div>${it.map(i=>itemHTML(p,i)).join('')||'<div class="empty">Nincs teendő ebben a szakaszban.</div>'}</div>`}
  <div class="card sec"><div class="hd"><h3>Automatikus szabályzatellenőrzés</h3></div>${rules(p).map(r=>`<div class="rule"><span class="st tone-${r.s==='ok'?'ok':r.s==='bad'?'bad':'warn'}">${ic(r.s==='ok'?'check':'alert')}</span><span>${esc(r.t)}</span></div>`).join('')}<div style="height:10px"></div></div>`;
}
function tabBids(p){
  const vis=bidVisible(p),rk=ranking(p),rankOf=id=>{const x=rk.find(r=>r.b.id===id);return x?x.rank:null;};
  const canRecv=p.f.sent&&!p.f.opened&&!p.closed||(p.proc==='Vészhelyzeti'&&!p.closed);
  const rows=p.bidders.map(b=>{const d=docs(p,'bid',b.id);const st=b.status==='beérkezett'?pill(b.late?'Késve érkezett':'Beérkezett',b.late?'bad':'ok'):b.status==='lemondó'?pill('Lemondó nyilatkozat','mut'):pill('Meghívva','warn');
   const price=b.price?(vis||p.proc==='Vészhelyzeti'?ft(b.price):'<span class="pill tone-mut">🔒 zárolt a bontásig</span>'):'–';
   const act=[];if(!p.closed){if(canRecv&&b.status!=='lemondó')act.push(`<button class="btn sm" data-a="bidRecv" data-p="${esc(p.id)}" data-b="${b.id}">${d.length?'Új verzió':'Ajánlat rögzítése'}</button>`);if(canRecv&&b.status==='meghívva')act.push(`<button class="btn sm" data-a="bidDecl" data-p="${esc(p.id)}" data-b="${b.id}">Lemondó nyil.</button>`);
     if(p.f.opened&&b.status==='beérkezett'&&p.stage<=3)act.push(`<button class="btn sm p" data-a="bidEval" data-p="${esc(p.id)}" data-b="${b.id}">Értékelés</button>`);}
   return `<tr><td><b>${esc(b.name)}</b><br><small style="color:var(--mut)">${esc(b.email)}${b.isNew?' · új beszállító':''}${b.type==='Webshop'?' · webáruház':''}</small></td><td>${b.invited?fdt(b.invited):'–'}</td><td>${st}${b.recv?`<br><small style="color:var(--mut)">${fdt(b.recv)}</small>`:''}</td><td>${d.length?d.length+' verzió':'–'}</td><td>${b.formal==null?'–':b.formal?pill('Megfelelő','ok'):pill('Nem megfelelő','bad')}</td><td class="nw">${price}</td><td>${b.tech==null?'–':b.tech}</td><td>${rankOf(b.id)?'<b>#'+rankOf(b.id)+'</b>':'–'}</td><td>${act.join(' ')}</td></tr>`;}).join('');
  const addBtn=!p.closed&&!p.f.sent&&p.stage<=3?`<button class="btn sm p" data-a="bidders" data-p="${esc(p.id)}">${ic('plus')} Ajánlattevő felvétele</button>`:'';
  return `<div class="card sec"><div class="hd"><div><h3>Ajánlattevők és ajánlatok</h3><small>${p.bidDeadline?'Ajánlattételi határidő: '+fDay(p.bidDeadline)+' · ':''}Az árinformációk a kiértékelés lezárásáig bizalmasak (12.3).</small></div>${addBtn}</div>
  ${p.bidders.length?`<div style="overflow:auto"><table class="t"><thead><tr><th>Ajánlattevő</th><th>Meghívás</th><th>Állapot</th><th>Dok.</th><th>Formai</th><th>Ár (nettó)</th><th>Műszaki</th><th>Rang</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`:'<div class="empty">Még nincs ajánlattevő. Minimum 3 szükséges (SS esetén 1).</div>'}</div>
  ${rk.length?`<div class="card sec"><div class="hd"><div><h3>Kiértékelési mátrix</h3><small>Súlyozás: műszaki ${W.t*100}% · kereskedelmi ${W.c*100}% (ár 60%, fizetési feltétel 20%, szállítási idő 20%). A kritériumrendszer csak CEO+CFO jóváhagyással módosítható.</small></div>${p.f.commDone?pill('Lezárva','ok'):pill('Folyamatban','warn')}</div><table class="t"><thead><tr><th>#</th><th>Ajánlattevő</th><th>Műszaki</th><th>Ár pont</th><th>Fizetési</th><th>Szállítás</th><th>Kereskedelmi</th><th>Összesen</th></tr></thead><tbody>${rk.map(r=>`<tr><td><b>${r.rank}</b></td><td>${esc(r.b.name)}<br><small style="color:var(--mut)">${ft(r.b.price)}</small></td><td>${r.b.tech}</td><td>${r.sp.toFixed(1)}</td><td>${r.spay.toFixed(1)}</td><td>${r.sl.toFixed(1)}</td><td>${r.comm.toFixed(1)}</td><td><b>${r.total.toFixed(1)}</b></td></tr>`).join('')}</tbody></table></div>`:''}`;
}
function docLink(d){return d.content?`<button class="btn sm" data-a="viewDoc" data-v="${d.id}">Megnyitás</button>`:'';}
function tabDocs(p){
  const locked=!!p.closed;
  const out=FOLDERS.map((f,i)=>{const n=i+1;const ds=p.docs.filter(d=>DOCS[d.key][1]===n);const latest=[];const seen={};ds.slice().reverse().forEach(d=>{const k=d.key+(d.bid||'');if(!seen[k]){seen[k]=1;latest.push(d);}});
   const hide=n===4&&!vis4(p);
   return `<div class="card sec"><div class="hd"><h3>${String(n).padStart(2,'0')} – ${f}</h3><div>${locked?pill('🔒 Lezárt','ok'):(n===3||n===4?'':`<button class="btn sm" data-a="folderUp" data-p="${esc(p.id)}" data-f="${n}">${ic('upload')} Feltöltés</button>`)}</div></div>${latest.length?latest.reverse().map(d=>`<div class="docrow">${ic('doc')}<div class="fi"><b>${hide?'🔒 zárolt ajánlat ('+esc((p.bidders.find(b=>b.id===d.bid)||{}).name||'')+')':esc(d.name)}</b> <span class="pill tone-inf">v${d.ver}</span><br><small>${esc(d.by)} · ${fdt(d.ts)} · ${d.size?Math.round(d.size/1024)+' KB':''}${d.note?' · '+esc(d.note):''}${ds.filter(x=>x.key===d.key&&x.bid===d.bid).length>1?' · '+ds.filter(x=>x.key===d.key&&x.bid===d.bid).length+' verzió (mind megőrizve)':''}</small></div>${hide?'':docLink(d)}</div>`).join(''):`<div class="docrow"><small>Nincs dokumentum.</small></div>`}</div>`;}).join('');
  return (locked?'':`<div class="note" style="margin:0 0 16px">${ic('shield')}<div>Verziókövetés: új feltöltés nem írja felül a korábbi verziót. Ha a jóváhagyott dokumentumból új verzió készül, a kapcsolódó jóváhagyások érvénytelenné válnak.</div></div>`)+out;
}
const vis4=p=>bidVisible(p)||p.proc==='Vészhelyzeti'||S.user===ADM&&false;
function tabAppr(p){
  const keys=Object.keys(p.appr);
  if(!keys.length)return '<div class="card empty">Még nem indult jóváhagyás.</div>';
  return keys.map(k=>{const a=apprState(p,k);return `<div class="card sec"><div class="hd"><div><h3>${ATITLE[k]}</h3><small>${ADESC[k]} · indította: ${esc(a.req.by)} · ${fdt(a.req.ts)}${a.doc?' · '+esc(dl(a.bound))+' v'+a.ver:''}</small></div>${pill(a.status==='approved'?'Jóváhagyva':a.status==='rejected'?'Elutasítva':'Folyamatban',a.status==='approved'?'ok':a.status==='rejected'?'bad':'warn',1)}</div>${a.per.map(x=>`<div class="docrow">${avatar(x.name)}<div class="fi"><b>${esc(x.name)}</b><br><small>${x.dec?fdt(x.dec.ts)+' · v'+x.dec.ver+(x.dec.c?' · „'+esc(x.dec.c)+'"':''):'Még nem döntött'}</small></div>${pill(x.state==='approved'?'Jóváhagyta':x.state==='rejected'?'Elutasította':x.state==='stale'?'Érvénytelen (új verzió)':'Vár','' + (x.state==='approved'?'ok':x.state==='rejected'?'bad':'warn'))}</div>`).join('')}${p.appr[k].decisions.length>a.per.length?`<div class="docrow"><small>Döntési előzmények: ${p.appr[k].decisions.map(d=>`${esc(fixName(d.by))} ${d.dec==='approve'?'✓':'✗'} v${d.ver}`).join(' · ')}</small></div>`:''}</div>`;}).join('');
}
function tabMail(p){
  const open=p.f.sent&&!p.f.opened&&!p.closed;
  return `<div class="note ${open?'warn':''}" style="margin:0 0 16px">${ic('mail')}<div><b>arajanlat@fonteviva.hu</b> – zárt tendercsatorna. Hozzáférés kizárólag a kijelölt beszerzési adminisztrátornak, csak kiírás, bontás és értékelés időszakában. Jelenleg: <b>${open?'nyitott (tender folyamatban)':'nem használt ennél a beszerzésnél'}</b>.</div></div>
  ${p.mail.length?p.mail.slice().reverse().map(m=>`<div class="card sec"><div class="hd"><div><h3>${m.dir==='out'?'↗ Kimenő':'↙ Bejövő'}: ${esc(m.subj)}</h3><small>${fdt(m.ts)} · ${esc(m.from)} → ${esc(m.to)}</small></div></div><div style="padding:14px 20px">${m.body?`<p style="margin-top:0">${esc(m.body)}</p>`:''}${m.att&&m.att.length?m.att.map(a=>`<span class="pill tone-inf" style="margin-right:6px">${ic('doc')} ${m.dir==='in'&&!bidVisible(p)?'🔒 melléklet zárolva a bontásig':esc(a)}</span>`).join(''):''}</div></div>`).join(''):'<div class="card empty">Nincs levelezés.</div>'}`;
}
function tabTasks(p){
  const l=S.tasks.filter(t=>t.pid===p.id);
  return `<div style="text-align:right;margin-bottom:12px"><button class="btn p" data-a="newTask" data-p="${esc(p.id)}">${ic('plus')} Új feladat</button></div><div class="card">${l.length?l.map(taskRow).join(''):'<div class="empty">Ehhez a beszerzéshez még nincs feladat.</div>'}</div>`;
}
function renderDrawer(){
  const w=$('#drawerWrap');
  if(!U.open){w.innerHTML='';return;}
  const p=P(U.open);if(!p){U.open=null;w.innerHTML='';return;}
  const t=typeOf(p.value),it=checklist(p),miss=it.filter(i=>!i.done),tab=U.tab;
  const tabs=[['ov','Áttekintés'],['bids',`Ajánlatok (${p.bidders.filter(b=>b.status==='beérkezett').length}/${p.bidders.length})`],['docs',`Dokumentumok (${p.docs.length})`],['tasks',`Feladatok (${S.tasks.filter(x=>x.pid===p.id).length})`],['appr','Jóváhagyások'],['mail','Levelezés'],['log','Auditnapló']];
  const body=({ov:tabOverview,bids:tabBids,docs:tabDocs,tasks:tabTasks,appr:tabAppr,mail:tabMail,log:q=>auditTL(auditRows(q.id))})[tab](p);
  const last=p.stage===6;
  w.innerHTML=`<div class="dscrim" data-a="closeDrawer"><div class="drawer" role="dialog" aria-label="${esc(p.subject)}"><div class="dh" style="position:relative"><button class="x" data-a="closeDrawer" aria-label="Bezárás">${ic('x')}</button><div class="k">${esc(p.id)} · ${STAGES[p.stage-1][0]}</div><h2>${esc(p.subject)}</h2><p>${esc(nextDue(p).text)}${nextDue(p).date?' · határidő: '+fDay(nextDue(p).date):''}</p><div class="chips"><span>${p.cat}</span><span>${t}</span><span>${procLabel(p.proc)}</span><span>${short(p.value)}</span>${p.ifs?'<span>IFS-kritikus</span>':''}</div><div class="tabs">${tabs.map(x=>`<button data-a="tab" data-v="${x[0]}" class="${tab===x[0]?'on':''}">${x[1]}</button>`).join('')}</div></div>
  <div class="db">${body}</div>
  <div class="df"><span style="color:var(--mut);font-size:13px">${p.closed?'Lezárt beszerzés – csak olvasható':miss.length?`${miss.length} hiányzó feltétel a továbblépéshez`:'Minden feltétel teljesült'}</span><span style="display:flex;gap:8px">${p.closed?'':`<button class="btn" data-a="failProc" data-p="${esc(p.id)}">Sikertelen eljárás</button><button class="btn p" data-a="advance" data-p="${esc(p.id)}" ${miss.length?'disabled':''} title="${esc(miss.map(m=>m.short||m.label).join(' | '))}">${last?'Beszerzés lezárása':'Tovább a következő szakaszba'}</button>`}</span></div></div></div>`;
}
