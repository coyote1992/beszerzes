'use strict';
/* ===== small components ===== */
const pill=(t,tone,dot)=>`<span class="pill tone-${tone||'mut'}${dot?' dot':''}">${esc(t)}</span>`;
const typeTone=t=>t==='Kiemelt'?'pur':t==='Egyszerű'?'inf':'mut';
const procTone=x=>x==='Tender'?'inf':x==='SS'?'warn':'bad';
const procLabel=x=>x==='SS'?'Sole Source':x;
const avatar=(n,cls)=>{const u=USERS.find(x=>x.n===n);return `<span class="av ${cls||''}">${esc(u?u.ini:(n||'?').split(' ').map(w=>w[0]).join('').slice(0,2))}</span>`;};
const ownerChips=w=>String(w||'').split(' + ').filter(Boolean).map(n=>`<span class="own">${avatar(n,'sm')}${esc(n)}</span>`).join('');
const fixName=n=>n===CEO?'CEO':n===CFO?'CFO':n;
const myApprCount=()=>pendingFor(S.user).length;
const myTaskCount=()=>S.tasks.filter(t=>!t.done&&t.owner===S.user).length;
const activeProcs=()=>S.procs.filter(p=>!p.closed);

/* ===== side / top ===== */
function renderSide(){
  const nav=[['dash','Irányítópult','grid'],['procs','Beszerzések','clip',activeProcs().length],['appr','Jóváhagyásaim','checksq',myApprCount(),1],['tasks','Feladatok','doc',myTaskCount()],['audit','Auditnapló','clock'],['policy','Szabályzat','book']];
  const wd=WDN[pd(S.today).getUTCDay()];
  $('#side').innerHTML=`<div class="brand"><div class="logo">F</div><div><b>FONTE VIVA</b><small>Beszerzési központ</small></div></div>
  <nav class="nav">${nav.map(n=>`<button data-a="nav" data-v="${n[0]}" class="${U.view===n[0]?'on':''}">${ic(n[2])}<span class="lb">${n[1]}</span>${n[3]!=null&&n[3]!==''?`<span class="cnt${n[4]?' gold':''}">${n[3]}</span>`:''}</button>`).join('')}</nav>
  <div class="sidefoot">
   <div class="clock"><span>Demó dátuma</span><br><b>${fDay(S.today)} (${wd})</b><div class="row"><button data-a="clock">+1 munkanap</button><button data-a="reset">Alaphelyzet</button></div></div>
   <div class="audited"><span class="ck">${ic('check')}</span><div><b>Auditált munkamenet</b>Entra ID azonosítás aktív</div></div>
   <button class="linkbtn" data-a="about">A demóról</button></div>`;
}
function renderTop(){
  const titles={dash:'Irányítópult',procs:'Beszerzések',appr:'Jóváhagyásaim',tasks:'Feladatok',audit:'Auditnapló',policy:'Szabályzat'};
  $('#topTitle').textContent=titles[U.view]||'';
  $('#searchIc').innerHTML=ic('search');
  document.querySelector('.icon-btn').innerHTML=ic('half');
  const u=USERS.find(x=>x.n===S.user);
  $('#userChip').innerHTML=`${avatar(S.user)}<span><b>${esc(S.user)}</b><small>${esc(u.role)} · Windows-fiókkal belépve ⌄</small></span>`;
  const m=$('#umenu');m.hidden=!U.menu;
  if(U.menu)m.innerHTML=`<h5>Megjelenítés mint (szerepkör-váltás)</h5>${USERS.map(x=>`<button class="u ${x.n===S.user?'on':''}" data-a="user" data-v="${esc(x.n)}">${avatar(x.n)}<span><b>${esc(x.n)}</b><small>${esc(x.role)}</small></span></button>`).join('')}<h5>Beállítások</h5>
   <label><input type="checkbox" data-a="strict" ${S.strict?'checked':''}><span><b>Szigorú szerepkör-ellenőrzés</b><br><small>Minden lépést csak a felelős végezhet. A jóváhagyások mindig szigorúak (négy szem elv).</small></span></label>`;
  document.documentElement.dataset.theme=S.theme;
}

/* ===== dashboard ===== */
function kpiData(){
  const act=activeProcs();
  const newW=act.filter(p=>diffD(p.created,S.today)<=7).length;
  const pend=[];S.procs.forEach(p=>{if(p.closed)return;Object.keys(p.appr).forEach(k=>{if(apprState(p,k).status==='pending')pend.push(k);});});
  let near=0,hiany=0;act.forEach(p=>{const n=nextDue(p);if(n.date&&diffD(S.today,n.date)<=5)near++;if(p.proc==='Vészhelyzeti'&&statusOf(p).l==='Dokumentáció hiányos')hiany++;});
  return {act:act.length,newW,pend:pend.length,mine:myApprCount(),near,hiany,val:act.reduce((s,p)=>s+p.value,0)};
}
function renderDash(){
  const k=kpiData(),d=pd(S.today);
  const todos=allTodos(U.dashTab==='me'?S.user:null);
  const kp=(t,v,sub,tone,ico)=>`<div class="card kpi"><small>${t}</small><b>${v}</b><span style="color:var(--mut);font-size:13px">${sub}</span><div class="bubble tone-${tone}">${ico}</div></div>`;
  const cnt=[0,0,0,0,0,0];activeProcs().forEach(p=>cnt[p.stage-1]++);
  const mx=Math.max(1,...cnt);
  const recent=S.procs.slice().sort((a,b)=>b.created<a.created?-1:1).slice(0,5);
  $('#view').innerHTML=`<div class="pagehead"><div><div class="kicker">${fDay(S.today).replace(/\. (\d+)\. (\d+)\./,(m,a,b)=>'. '+MONL[+a-1]+' '+(+b)+'.')}</div><div class="h1">Beszerzési áttekintés</div><p class="sub">A következő döntések és határidők igényelnek figyelmet.</p></div><button class="btn p" data-a="newProc">${ic('plus')} Új beszerzés</button></div>
  <div class="kpis">${kp('Aktív beszerzések',k.act,`${k.newW} új folyamat ezen a héten`,'inf','▦')}${kp('Jóváhagyásra vár',k.pend,`${k.mine} döntés Önnél van`,'warn','✓')}${kp('Közeli határidő / eltérés',k.near,`${k.hiany} dokumentációs hiány`,'bad','!')}${kp('Aktív beszerzési érték',short(k.val),'Nettó, becsült összérték','pur','Ft')}</div>
  <div class="grid2"><div class="card"><div class="hd"><div><h3>Teendők</h3><small>Prioritás és határidő szerint</small></div><div class="tabs" style="padding:0;border:0"><button data-a="dashTab" data-v="all" class="${U.dashTab==='all'?'on':''}">Összes határidő</button><button data-a="dashTab" data-v="me" class="${U.dashTab==='me'?'on':''}">Nekem</button></div></div>
   ${todos.length?todos.slice(0,6).map(t=>`<div class="todo" data-a="open" data-v="${esc(t.pid)}"><div class="ti tone-${t.tone}">${ic(t.ic)}</div><div class="tt"><b>${esc(t.title)}</b><span>${esc(t.sub)}</span></div><div class="tr"><b style="color:${t.date&&t.date<=S.today?'var(--bad)':'inherit'}">${rel(t.date)}</b><span>${esc(t.right)}</span></div></div>`).join(''):'<div class="empty">Nincs Önre váró teendő.</div>'}</div>
   <div class="card"><div class="hd"><div><h3>Aktív folyamatok</h3><small>PROC1–PROC6 szerinti megoszlás</small></div></div><div class="bars">${STAGES.map((s,i)=>`<div class="bar"><b>${s[0]}</b><span>${s[1]}</span><i><u style="width:${cnt[i]/mx*100}%"></u></i><b>${cnt[i]}</b></div>`).join('')}</div>
   <div class="note">${ic('shield')}<div><b>Szabályzati kontroll</b><br>A rendszer a becsült érték alapján automatikusan választja ki az eljárást és a kötelező jóváhagyásokat.</div></div></div></div>
  <div class="card"><div class="hd"><div><h3>Legutóbbi beszerzések</h3><small>Élő státusz és következő lépés</small></div><button class="btn sm" data-a="nav" data-v="procs">Teljes lista →</button></div>${procTable(recent,true)}</div>`;
}
function procTable(list,withDue){
  if(!list.length)return '<div class="empty">Nincs a szűrésnek megfelelő beszerzés.</div>';
  return `<div style="overflow:auto"><table class="t"><thead><tr><th>Azonosító / tárgy</th><th>${withDue?'Típus':'Kategória'}</th>${withDue?'':'<th>Eljárás</th>'}<th>Érték</th>${withDue?'<th>Felelős</th>':'<th>Folyamatszakasz</th>'}<th>Státusz</th>${withDue?'<th>Következő határidő</th>':'<th>Felelős</th>'}<th></th></tr></thead><tbody>${list.map(p=>{const st=statusOf(p),t=typeOf(p.value),nd=nextDue(p);
   return `<tr class="clk" data-a="open" data-v="${esc(p.id)}"><td><span class="id">${esc(p.id)}</span><br><b>${esc(p.subject)}</b></td>`+
   (withDue?`<td>${pill(t,typeTone(t))}</td><td><b>${short(p.value)}</b></td><td>${ownerChips(p.owner)}</td><td>${pill(st.l,st.t,1)}</td><td><b>${rel(nd.date)}</b><br><small style="color:var(--mut)">${esc(nd.text)}</small></td>`:
   `<td><b>${p.cat}</b>${p.ifs?'<br><small style="color:var(--mut)">IFS-kritikus</small>':''}</td><td>${pill(procLabel(p.proc),procTone(p.proc))}</td><td><b>${short(p.value)}</b><br>${pill(t,typeTone(t))}</td><td><b>${STAGES[p.stage-1][0]}</b> <small style="color:var(--mut)">${STAGES[p.stage-1][1]}</small><span class="mini"><u style="width:${p.closed?100:p.stage/6*100}%"></u></span></td><td>${pill(st.l,st.t,1)}</td><td>${ownerChips(p.owner)}</td>`)+`<td>${ic('arrow')}</td></tr>`;}).join('')}</tbody></table></div>`;
}

/* ===== procurements ===== */
function renderProcs(){
  let l=S.procs.filter(p=>{const q=U.q.toLowerCase();return (!q||(p.id+p.subject+p.bidders.map(b=>b.name).join(' ')).toLowerCase().includes(q))&&(!U.fType||typeOf(p.value)===U.fType)&&(!U.fStage||String(p.stage)===U.fStage)&&(!U.fProc||p.proc===U.fProc);});
  const sel=(a,v,opts)=>`<select data-a="filter" data-v="${a}">${opts.map(o=>`<option value="${o[0]}" ${String(v)===String(o[0])?'selected':''}>${o[1]}</option>`).join('')}</select>`;
  $('#view').innerHTML=`<div class="pagehead"><div><div class="kicker">Tenderportfólió</div><div class="h1">Beszerzések</div><p class="sub">Minden folyamat egy helyen, a teljes döntési és dokumentációs lánccal.</p></div><button class="btn p" data-a="newProc">${ic('plus')} Új beszerzés</button></div>
  <div class="card filters"><input data-a="filter" data-v="q" placeholder="Keresés…" value="${esc(U.q)}">${sel('fType',U.fType,[['','Minden típus'],['Egyedi','Egyedi'],['Egyszerű','Egyszerű'],['Kiemelt','Kiemelt']])}${sel('fStage',U.fStage,[['','Minden szakasz']].concat(STAGES.map((s,i)=>[i+1,s[0]+' · '+s[1]])))}${sel('fProc',U.fProc,[['','Minden eljárás'],['Tender','Tender'],['SS','Sole Source'],['Vészhelyzeti','Vészhelyzeti']])}<button class="btn" data-a="clearF">Szűrők törlése</button></div>
  <div class="card"><div class="hd"><b>${l.length} beszerzés</b><small>Az értékek nettó HUF összegek.</small></div>${procTable(l,false)}</div>`;
}

/* ===== approvals ===== */
function renderAppr(){
  const wait=pendingFor(S.user);
  const hist=[];S.procs.forEach(p=>Object.keys(p.appr).forEach(k=>p.appr[k].decisions.forEach(d=>{if(d.by===S.user)hist.push({p,k,d});})));hist.sort((a,b)=>a.d.ts<b.d.ts?1:-1);
  const card=x=>{const p=x.p,t=typeOf(p.value),a=x.a,others=a.per.filter(y=>y.name!==S.user);const conflict=(x.key==='ssd'||x.key==='ss')&&S.user===p.requester;
   return `<div class="card acard"><div style="flex:1;min-width:280px"><span class="id">${esc(p.id)}</span> ${pill(t,typeTone(t))} ${pill(procLabel(p.proc),procTone(p.proc))}<h4>${ATITLE[x.key]} · ${esc(p.subject)}</h4><span class="sub">${ADESC[x.key]}</span>
   <div class="meta"><div><small>Érték</small><b>${ft(p.value)}</b></div><div><small>Igénylő</small><b>${esc(p.requester)}</b></div><div><small>Dokumentumverzió</small><b>${a.doc?'v'+a.ver:'–'}</b></div><div><small>Határidő</small><b>${fDay(nextDue(p).date||p.due[p.stage])}</b></div>${others.length?`<div><small>További jóváhagyók</small><b>${others.map(o=>esc(fixName(o.name))+(o.state==='approved'?' ✓':' ⏳')).join(', ')}</b></div>`:''}</div></div>
   <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" data-a="openTab" data-v="${esc(p.id)}" data-t="appr">Részletek</button><button class="btn bad" data-a="decide" data-p="${esc(p.id)}" data-k="${x.key}" data-d="reject" ${conflict?'disabled title="Az igénylő nem szavazhat"':''}>Elutasítom</button><button class="btn p" data-a="decide" data-p="${esc(p.id)}" data-k="${x.key}" data-d="approve" ${conflict?'disabled title="Az igénylő nem szavazhat"':''}>Jóváhagyom</button></div></div>`;};
  $('#view').innerHTML=`<div class="pagehead"><div><div class="kicker">Személyes munkalista</div><div class="h1">Jóváhagyásaim</div><p class="sub">A jóváhagyás a dokumentum aktuális verziójához és időbélyegéhez kötődik.</p></div></div>
  <div style="display:flex;gap:10px;margin-bottom:18px"><button class="btn ${U.apprTab==='wait'?'p':''}" data-a="apprTab" data-v="wait">Jóváhagyásra vár <span class="pill tone-inf">${wait.length}</span></button><button class="btn ${U.apprTab==='hist'?'p':''}" data-a="apprTab" data-v="hist">Korábbi döntések</button></div>
  ${U.apprTab==='wait'?(wait.length?wait.map(card).join(''):`<div class="card empty">${esc(S.user)} számára nincs függő jóváhagyás. Váltson felhasználót a jobb felső menüben (pl. CEO / CFO).</div>`):
  `<div class="card">${hist.length?`<table class="t"><thead><tr><th>Időpont</th><th>Beszerzés</th><th>Jóváhagyás</th><th>Döntés</th><th>Megjegyzés</th></tr></thead><tbody>${hist.map(h=>`<tr class="clk" data-a="open" data-v="${esc(h.p.id)}"><td>${fdt(h.d.ts)}</td><td><span class="id">${esc(h.p.id)}</span><br>${esc(h.p.subject)}</td><td>${ATITLE[h.k]} · v${h.d.ver}</td><td>${pill(h.d.dec==='approve'?'Jóváhagyva':'Elutasítva',h.d.dec==='approve'?'ok':'bad')}</td><td>${esc(h.d.c)}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">Még nincs korábbi döntés.</div>'}</div>`}`;
}

/* ===== tasks ===== */
function taskRow(t){const p=P(t.pid);const late=!t.done&&t.due<S.today;
  return `<div class="todo" style="cursor:default"><input type="checkbox" data-a="taskDone" data-v="${t.id}" ${t.done?'checked':''} aria-label="Kész" style="width:20px;height:20px"><div class="tt"><b style="${t.done?'text-decoration:line-through;color:var(--mut)':'color:var(--ink)'}">${esc(t.title)}</b><span>${esc(t.desc)}</span><br>${p?`<a href="#" data-a="open" data-v="${esc(p.id)}" class="id">${esc(p.id)}</a> `:''}<span>· Kiosztotta: ${esc(t.by)}</span></div><div class="tr">${ownerChips(t.owner)}<b style="color:${late?'var(--bad)':'inherit'}">${t.done?'Kész: '+fShort(t.done.slice(0,10)):'Határidő: '+rel(t.due)}</b></div></div>`;}
function renderTasks(){
  const f=U.taskF;let l=S.tasks.filter(t=>f==='me'?(t.owner===S.user&&!t.done):f==='by'?(t.by===S.user&&!t.done):f==='done'?!!t.done:!t.done);
  l.sort((a,b)=>a.due<b.due?-1:1);
  $('#view').innerHTML=`<div class="pagehead"><div><div class="kicker">Személyes munkalista</div><div class="h1">Feladatok</div><p class="sub">Felelős, határidő és leírás – minden feladat az auditnaplóba kerül.</p></div><button class="btn p" data-a="newTask">${ic('plus')} Új feladat</button></div>
  <div style="display:flex;gap:10px;margin-bottom:18px;flex-wrap:wrap">${[['me','Feladataim'],['by','Általam kiosztott'],['all','Minden nyitott'],['done','Lezárt']].map(x=>`<button class="btn ${f===x[0]?'p':''}" data-a="taskF" data-v="${x[0]}">${x[1]}</button>`).join('')}</div>
  <div class="card">${l.length?l.map(taskRow).join(''):'<div class="empty">Nincs megjeleníthető feladat.</div>'}</div>`;
}

/* ===== audit ===== */
function auditRows(pid){const q=U.auditQ.toLowerCase();return S.audit.slice().reverse().filter(e=>(!pid||e.proc===pid)&&(!q||(e.title+e.detail+e.user+e.proc+e.type).toLowerCase().includes(q)));}
function auditTL(rows){return rows.length?`<div class="tl">${rows.map(e=>`<div class="te"><time>${fdt(e.ts)}</time><div class="dot">${esc(e.user[0])}</div><div><b>${esc(e.title)}</b><small>${esc(e.detail)} · <b style="display:inline">${esc(e.user)}</b></small><div class="hs">#${e.n} · ${e.hash.slice(0,10)}</div></div><a href="#" class="id" data-a="open" data-v="${esc(e.proc)}">${esc(e.proc)}</a></div>`).join('')}</div>`:'<div class="empty">Nincs találat.</div>';}
function renderAudit(){
  const rows=auditRows(U.auditP).slice(0,120);
  $('#view').innerHTML=`<div class="pagehead"><div><div class="kicker">Csak hozzáfűzhető eseménynapló</div><div class="h1">Auditnapló</div><p class="sub">Minden művelet felhasználóhoz, rendszeridőhöz és tenderazonosítóhoz kötve jelenik meg; a bejegyzések hash-lánccal kapcsolódnak.</p></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-a="verify">${ic('shield')} Lánc ellenőrzése</button><button class="btn" data-a="tamper">Manipuláció szimulálása</button><button class="btn" data-a="csv">${ic('download')} CSV export</button></div></div>
  ${U.auditMsg?`<div class="note ${U.auditMsg[0]}" style="margin:0 0 16px">${ic(U.auditMsg[0]==='ok'?'shield':'alert')}<div>${U.auditMsg[1]}</div></div>`:''}
  <div class="card"><div class="filters" style="margin:0;border-bottom:1px solid var(--line)"><input data-a="auditQ" placeholder="Keresés az eseményekben…" value="${esc(U.auditQ)}"><select data-a="auditP"><option value="">Minden beszerzés</option>${S.procs.map(p=>`<option ${U.auditP===p.id?'selected':''}>${esc(p.id)}</option>`).join('')}</select><span class="lockbadge">${ic('lock')} Csak olvasható</span></div>${auditTL(rows)}</div>`;
}

/* ===== policy ===== */
function renderPolicy(){
  const band=b=>b.map((x,i)=>{const lo=i?(b[i-1][0]):0;return (x[1]?esc(x[1]):'nincs jóváhagyás')+' ('+(x[0]===INF?'≥ '+nf.format(lo):'< '+nf.format(x[0]))+' Ft)';}).join(' → ');
  $('#view').innerHTML=`<div class="pagehead"><div><div class="kicker">Beszerzési szabályzat 01. verzió</div><div class="h1">Szabályzat a rendszerben</div><p class="sub">Az alkalmazás ezeket a szabályokat kényszeríti ki – nem a felhasználó választja ki, hanem az érték alapján számolja.</p></div></div>
  <div class="grid2"><div class="card"><div class="hd"><h3>Típusok és értékhatárok (7. fejezet)</h3></div><table class="t"><thead><tr><th>Típus</th><th>Értéksáv</th><th>Követelmény</th></tr></thead><tbody>${['Egyedi','Egyszerű','Kiemelt'].map(t=>`<tr><td>${pill(t,typeTone(t))}</td><td>${t==='Egyedi'?'< 2 000 000 Ft':t==='Egyszerű'?'2 – 20 000 000 Ft':'> 20 000 000 Ft'}</td><td>${TYPEDESC[t]}</td></tr>`).join('')}</tbody></table>
   <div class="note warn" style="margin:16px 24px">${ic('alert')}<div><b>Eltérés a szabályzatban:</b> az 1. melléklet (BSD) még 1 / 10 M Ft határokat említ. Az alkalmazás egyetlen mátrixot – a 7. fejezetet – használja; a BSD-sablont ehhez kell igazítani.</div></div></div>
  <div class="card"><div class="hd"><h3>Kötelező jóváhagyások (8.2)</h3></div><table class="t"><tbody><tr><td>Tenderkiírás kiküldése (minden értéken)</td><td>CEO + CFO együtt</td></tr><tr><td>Szerződés > 20 M Ft</td><td>Jogi + Pénzügy (5 munkanap)</td></tr><tr><td>Cégszerű aláírás</td><td>CEO + CFO együtt</td></tr><tr><td>Sole Source</td><td>Értékhatár szerinti jóváhagyók + indoklás</td></tr><tr><td>Vészhelyzeti < 2 M Ft / ≥ 2 M Ft</td><td>Költséghely-felelős / CEO</td></tr><tr><td>Előleg bankgarancia nélkül</td><td>CFO</td></tr><tr><td>SSD végső jóváhagyás</td><td>Az igénylő nem vehet részt</td></tr></tbody></table></div></div>
  <div class="card" style="margin-bottom:20px"><div class="hd"><h3>Költséghelyek és jóváhagyási szintek (11. melléklet)</h3></div><table class="t"><thead><tr><th>Kód</th><th>Név</th><th>Jóváhagyási szintek</th></tr></thead><tbody>${Object.keys(CC).map(k=>`<tr><td class="mono">${k}</td><td>${esc(CC[k].n)}</td><td>${band(CC[k].b)}</td></tr>`).join('')}</tbody></table></div>
  <div class="card"><div class="hd"><h3>Megőrzési idők (13.3) és folyamatlépések</h3></div><table class="t"><tbody><tr><td>Szerződések és kapcsolódó dokumentáció</td><td>a szerződés lejártát követő 8 év</td></tr><tr><td>PO és számla</td><td>8 év</td></tr><tr><td>Tenderdokumentáció (nem nyertes ajánlatok is)</td><td>a szerződés lejártát követő 5 év</td></tr>${STAGES.map(s=>`<tr><td><b>${s[0]}</b> · ${s[1]}</td><td>${['Igénylő','Beszerzés + Igénylő + MI','Beszerzés + Igénylő','Beszerzés (vezeti) + Igénylő','Beszerzés + Jogi/Pénzügy + CEO/CFO','Beszerzés + MDM + Raktár + MI'][STAGES.indexOf(s)]}</td></tr>`).join('')}</tbody></table></div>`;
}

/* ===== global ===== */
function renderView(){({dash:renderDash,procs:renderProcs,appr:renderAppr,tasks:renderTasks,audit:renderAudit,policy:renderPolicy})[U.view]();}
function render(){
  const mt=document.documentElement.scrollTop,ds=document.querySelector('.db');const dst=ds?ds.scrollTop:0;
  renderSide();renderTop();renderView();renderDrawer();renderModal();
  const d2=document.querySelector('.db');if(d2&&U.open)d2.scrollTop=dst;
  save();
}
