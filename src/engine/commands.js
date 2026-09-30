// @ts-nocheck
/* State-changing commands. Each returns an error string on failure, otherwise undefined. */
import {
  S, setS, P, log, stamp, save, uid, nextId, load, SKEY, seedState,
  addWD, addD, fDay, ft, typeOf, docLatest, docs, boundKey, apprState, checklist, nextStage, ranking,
  validBids, tcoReq, W, STAGES, ATITLE, dl, DOCS, SCM, decide,
} from './engine.js'
import { notify } from './notify.js'

const toast = notify
export const num = (v) => Number(String(v ?? '').replace(/[\s ]/g, '').replace(',', '.'))
export const asc = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '')
export const sample = (p, key, ver) => `${asc(dl(key)).slice(0, 30)}_${asc(p.id)}_v${ver}.${DOCS[key][2]}`
const F0 = (note) => ({ by: S.user, ts: stamp(), note: note || '' })
export const procLabel = (x) => (x === 'SS' ? 'Sole Source' : x)

/* ---------- generated documents ---------- */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const tbl = (h, rows) => `<table><tr>${h.map((x) => `<th>${x}</th>`).join('')}</tr>${rows.map((r) => `<tr>${r.map((x) => `<td>${x}</td>`).join('')}</tr>`).join('')}</table>`
export const tcoCalc = (v) => { let s = v.c0; for (let i = 1; i <= v.n; i++) s += v.k / Math.pow(1 + v.r, i); return s - v.res / Math.pow(1 + v.r, v.n) }
export function openingHTML(p) {
  return `<h4>Bontási jegyzőkönyv – ${esc(p.id)}</h4><p>Bontás időpontja: ${fDay(p.f.opened.ts.slice(0, 10))} ${p.f.opened.ts.slice(11)} · jelen: ${esc(p.f.opened.by)} (adminisztrátor)</p>` +
    tbl(['Ajánlattevő', 'Beérkezés', 'Formai megfelelés', 'Ár (nettó)'], p.bidders.map((b) => [esc(b.name), b.recv || 'nem érkezett', b.status === 'lemondó' ? 'lemondó nyilatkozat' : b.formal ? 'megfelelő' : b.status === 'beérkezett' ? 'nem megfelelő' + (b.late ? ' (késve)' : '') : '–', b.price ? ft(b.price) : '–']))
}
export function matrixHTML(p) {
  const r = ranking(p)
  return `<h4>Kiértékelési mátrix – ${esc(p.id)}</h4><p>Súlyozás: műszaki ${W.t * 100}% · kereskedelmi ${W.c * 100}%</p>` +
    tbl(['#', 'Ajánlattevő', 'Műszaki', 'Kereskedelmi', 'Összesen', 'Ár'], r.map((x) => [x.rank, esc(x.b.name), x.b.tech, x.comm.toFixed(1), '<b>' + x.total.toFixed(1) + '</b>', ft(x.b.price)])) +
    `<h4>Javaslat</h4><p>${r[0] ? 'Legmagasabb összpontszám: ' + esc(r[0].b.name) + '.' : '–'}</p>`
}
export function ssdHTML(p) {
  const n = p.nego, r = ranking(p)
  return `<h4>1. A beszerzés tárgya, értéke</h4><p>${esc(p.subject)} · becsült: ${ft(p.value)}${n ? ' · tényleges: ' + ft(n.final) : ''}</p><h4>2. Igénylő és besorolás</h4><p>${esc(p.org)} · ${p.cat} · ${typeOf(p.value)} · ${procLabel(p.proc)}</p>
  <h4>3. Meghívott és válaszadó ajánlattevők</h4><p>${p.bidders.map((b) => esc(b.name) + ' (' + b.status + ')').join('; ')}</p>${validBids(p).length === 2 ? '<p><b>Megjegyzés:</b> két érvényes ajánlat érkezett (szabályzat 9.3.6).</p>' : ''}
  <h4>4. Értékelési módszer</h4><p>Műszaki ${W.t * 100}% / kereskedelmi ${W.c * 100}%; részletek: kiértékelési mátrix.</p>${r.length ? tbl(['#', 'Ajánlattevő', 'Összpont'], r.map((x) => [x.rank, esc(x.b.name), x.total.toFixed(1)])) : ''}
  <h4>5. Tárgyalás eredménye</h4><p>${n ? `Kezdő ár: ${ft(n.initial)} → végső ár: ${ft(n.final)}${n.rebate ? ' · rabatt/skontó: ' + ft(n.rebate) : ''} · <b>megtakarítás: ${ft(n.saving)}</b>` : '–'}</p>
  <h4>6. Javasolt nyertes</h4><p>${n ? esc(n.winnerName) : '–'} · minősítési státusz: ${n && n.isNew ? 'új (előminősítés szükséges)' : 'meglévő / jóváhagyott'}</p>
  <h4>7. Kockázatok és mérséklő intézkedések</h4><p>Single-source kockázat, ár- és ellátási kockázat, minőségi kockázat – a szabályzat 9.2.2 szerint értékelve.</p>
  <h4>8. Mellékletek</h4><p>${p.ifs ? 'IFS-megfelelőségi tanúsítványok · ' : ''}${tcoReq(p) ? 'TCO / DCF kalkuláció · ' : ''}kiértékelési mátrix, tárgyalási jegyzőkönyv.</p>`
}

/* ---------- documents ---------- */
export function addDoc(p, o) {
  const prev = docLatest(p, o.key, o.bid), ver = (prev ? prev.ver : 0) + 1
  const inv = prev ? Object.keys(p.appr).filter((k) => boundKey(p, k) === o.key && p.appr[k].decisions.some((d) => d.ver === prev.ver)) : []
  const d = { id: 'd' + ++S.dn, key: o.key, ver, name: o.name, size: o.size || Math.round(60 + Math.random() * 700) * 1024, by: S.user, ts: stamp(), bid: o.bid, note: o.note || '', content: o.content || '' }
  p.docs.push(d)
  log(p.id, 'Dokumentum', (o.title || dl(o.key)) + (ver > 1 ? ' – új verzió' : ' feltöltve'), `${d.name} · v${ver}`)
  inv.forEach((k) => log(p.id, 'Jóváhagyás', 'Korábbi jóváhagyások érvénytelenek', `${ATITLE[k]} · új dokumentumverzió (v${ver}) – a döntéseket meg kell ismételni`))
  return d
}
export function uploadDoc(pid, { key, bid, file, note }) {
  const p = P(pid), prev = docLatest(p, key, bid)
  addDoc(p, { key, bid, name: file ? file.name : sample(p, key, (prev ? prev.ver : 0) + 1), size: file ? file.size : 0, note })
  toast('Dokumentum rögzítve', 'ok')
}
export function genMatrix(pid) { const p = P(pid); addDoc(p, { key: 'matrix', name: 'Kiertekelesi_matrix_' + asc(p.id) + '.xlsx', content: matrixHTML(p) }); toast('Kiértékelési mátrix elkészült', 'ok') }
export function genSSD(pid) { const p = P(pid); const d = addDoc(p, { key: 'ssd', name: 'SSD-' + asc(p.id) + '_tervezet.docx', content: ssdHTML(p) }); toast('SSD v' + d.ver + ' elkészült', 'ok') }

/* ---------- procurement lifecycle ---------- */
export function createProc(v) {
  const val = num(v.value)
  if (!v.subject.trim()) return 'Adja meg a beszerzés tárgyát.'
  if (!(val > 0)) return 'Adja meg a becsült nettó értéket.'
  if (v.proc === 'Vészhelyzeti' && !v.reason.trim()) return 'Vészhelyzeti eljárásnál az indoklás kötelező.'
  const t = typeOf(val), prefix = v.proc === 'SS' ? 'SS' : v.proc === 'Vészhelyzeti' ? 'VH' : t === 'Kiemelt' ? 'BSD' : t === 'Egyszerű' ? 'BR' : 'EG'
  const p = { id: nextId(prefix), subject: v.subject.trim(), org: v.org, cc: v.cc, value: val, cat: v.cat, proc: v.proc, ifs: !!v.ifs, maint: v.cat === 'CAPEX' && !!v.maint, it: !!v.it, prepay: !!v.prepay, requester: v.requester, owner: SCM, stage: 1, created: S.today, desired: v.desired, due: { 1: addWD(S.today, 5) }, docs: [], bidders: [], appr: {}, f: {}, mail: [], round: 1, closed: null, nego: null, bidDeadline: null, contractType: null, reclass: false, vhDate: v.proc === 'Vészhelyzeti' ? S.today : null }
  S.procs.unshift(p)
  log(p.id, 'Létrehozás', v.proc === 'Vészhelyzeti' ? 'Vészhelyzeti beszerzés indítva' : 'Beszerzés létrehozva', `${p.subject} · ${p.cat} · ${ft(val)} · besorolás: ${t}`)
  if (v.proc === 'Vészhelyzeti') addDoc(p, { key: 'vhReason', name: 'Veszhelyzeti_indoklas.txt', note: v.reason })
  toast(`${p.id} létrehozva – besorolás: ${t}`, 'ok')
  return { id: p.id }
}
export function advance(pid) {
  const p = P(pid), miss = checklist(p).filter((i) => !i.done)
  if (miss.length) return 'Még hiányzik: ' + (miss[0].short || miss[0].label)
  if (p.stage === 6) return 'close'
  const old = p.stage
  p.stage = nextStage(p); p.due[p.stage] = addWD(S.today, 5)
  log(p.id, 'Státusz', 'Státuszváltás', `PROC${old} → PROC${p.stage} · ${STAGES[p.stage - 1][1]}`)
  toast(`Továbblépés: PROC${p.stage} · ${STAGES[p.stage - 1][1]}`, 'ok')
}
export function closeProc(pid) {
  const p = P(pid)
  p.closed = { ts: stamp(), by: S.user, failed: false }
  log(p.id, 'Státusz', 'Beszerzés lezárva', 'Dokumentumtár zárolva · megőrzés: szerződés lejárta + 8 év')
  toast('Beszerzés lezárva', 'ok')
}
export function failProc(pid, reason) {
  if (!reason.trim()) return 'Az indoklás kötelező.'
  const p = P(pid)
  p.closed = { ts: stamp(), by: S.user, failed: true, reason }
  log(p.id, 'Státusz', 'Eljárás sikertelen', reason)
  toast('Az eljárás sikertelenként lezárva')
}
export function resolveSingle(pid, r, n) {
  if (!n.trim()) return 'Adja meg az indoklást.'
  const p = P(pid)
  if (r === 'ss') { p.proc = 'SS'; p.reclass = true; p.f.singleResolved = F0('SS-átsorolás: ' + n); log(p.id, 'Értékelés', 'SS-átsorolás', n) }
  else {
    p.round++
    p.bidders.forEach((b) => { b.status = 'meghívva'; b.formal = null; b.tech = null; b.price = null; b.recv = null; b.late = false })
    p.f.sent = null; p.f.opened = null; p.f.commDone = null; p.f.singleResolved = null
    delete p.appr.tender; p.bidDeadline = null; p.stage = 2; p.due[2] = addWD(S.today, 5)
    log(p.id, 'Státusz', 'Újratendereztetés', `${n} · PROC3 → PROC2 (${p.round}. kör)`)
  }
  toast('Döntés rögzítve', 'ok')
}

/* ---------- checklist actions ---------- */
export function requestApproval(pid, k) {
  const p = P(pid), a = apprState(p, k)
  if (a.bound && !a.doc) return 'Előbb töltse fel: ' + dl(a.bound)
  p.appr[k] = { req: { by: S.user, ts: stamp() }, decisions: [] }
  log(p.id, 'Jóváhagyás', 'Jóváhagyás elindítva', `${ATITLE[k]} · ${a.required.join(' + ')}${a.doc ? ' · ' + dl(a.bound) + ' v' + a.ver : ''}`)
  toast('Jóváhagyás elindítva: ' + a.required.join(' + '), 'ok')
}
export function decideApproval(pid, key, dec, comment) {
  const p = P(pid)
  if (dec === 'reject' && !comment.trim()) return 'Elutasításhoz indoklás szükséges.'
  if (!decide(p, key, dec, comment)) return 'x'
  toast(dec === 'approve' ? 'Jóváhagyva' : 'Elutasítva', dec === 'approve' ? 'ok' : undefined)
}
export function setFlag(pid, key, note) {
  const p = P(pid), i = checklist(p).find((x) => x.id === 'f-' + key)
  p.f[key] = F0(note)
  log(p.id, 'Értékelés', 'Igazolás: ' + (i ? i.short || i.label : key), `${S.user}${note ? ' · ' + note : ''}`)
}
export function setInput(pid, key, n) {
  if (!n.trim()) return 'Adja meg az azonosítót.'
  const p = P(pid)
  p.f[key] = F0(n.trim())
  log(p.id, 'Dokumentum', key === 'po' ? 'PO kibocsátva' : 'Szerződés rögzítve BC-ben', n.trim())
}
export function setCtype(pid, t) {
  const p = P(pid); p.contractType = t
  if (t.startsWith('Előrevásárlás')) p.prepay = true
  log(p.id, 'Dokumentum', 'Szerződéstípus kiválasztva', t)
}
export function commClose(pid) {
  const p = P(pid), r = ranking(p)
  p.f.commDone = F0(r[0] ? '1. hely: ' + r[0].b.name : '')
  log(p.id, 'Értékelés', 'Kereskedelmi értékelés lezárva', `${validBids(p).length} formailag érvényes ajánlat rangsorolva.${r[0] ? ' Első: ' + r[0].b.name + '.' : ''}`)
  toast('Kereskedelmi értékelés lezárva', 'ok')
}

/* ---------- bidders & bids ---------- */
export function addBidder(pid, v) {
  const p = P(pid)
  if (!v.name.trim()) return 'Adja meg a cég nevét.'
  if (p.proc === 'SS' && p.bidders.length >= 1) return 'Sole Source esetén egyetlen beszállító nevezhető meg.'
  p.bidders.push({ id: 'b' + (p.bidders.length + 1) + uid().slice(1, 3), name: v.name.trim(), email: v.email || 'nincs@megadva.example', type: v.type, isNew: !!v.isNew, status: 'meghívva', invited: null, recv: null, sender: '', msgId: '', late: false, formal: null, tech: null, price: null, pay: null, lead: null, warr: null, note: '' })
  log(p.id, 'Ajánlat', 'Ajánlattevő felvéve', `${v.name.trim()} · ${v.type}${v.isNew ? ' · új beszállító' : ''}`)
  toast('Ajánlattevő felvéve', 'ok')
}
export function removeBidder(pid, bid) {
  const p = P(pid), b = p.bidders.find((x) => x.id === bid)
  p.bidders = p.bidders.filter((x) => x !== b)
  log(p.id, 'Ajánlat', 'Ajánlattevő eltávolítva', b.name)
}
export function recvBid(pid, bid, v) {
  const p = P(pid), b = p.bidders.find((x) => x.id === bid), vh = p.proc === 'Vészhelyzeti', late = p.bidDeadline && S.today > p.bidDeadline
  const prev = docLatest(p, 'bid', b.id), ver = (prev ? prev.ver : 0) + 1
  b.status = 'beérkezett'; b.recv = stamp(); b.sender = v.sender
  b.msgId = `<${uid().slice(1)}@${v.sender.split('@')[1] || 'ajanlat.example'}>`
  b.late = !!late; b.formal = late ? false : vh ? true : null
  if (vh) b.price = num(v.price) || p.value
  const fname = v.file ? v.file.name : asc(b.name) + '_ajanlat_v' + ver + '.pdf'
  addDoc(p, { key: 'bid', bid: b.id, name: fname, size: v.file ? v.file.size : 0, note: v.note, title: 'Ajánlat beérkezett – ' + b.name })
  p.mail.push({ dir: 'in', ts: b.recv, from: v.sender, to: 'arajanlat@fonteviva.hu', subj: 'Ajánlat – ' + p.subject + ' (' + p.id + ')', body: '', att: [fname], bid: b.id })
  log(p.id, 'Ajánlat', 'Ajánlat beérkezett', `${b.name} · v${ver} · üzenetazonosító: ${b.msgId}${late ? ' · KÉSVE' : ''}`)
  toast('Ajánlat rögzítve – tartalma zárolt a bontásig', 'ok')
}
export function declineBid(pid, bid, v) {
  const p = P(pid), b = p.bidders.find((x) => x.id === bid)
  b.status = 'lemondó'; b.recv = stamp(); b.note = v.note
  addDoc(p, { key: 'bid', bid: b.id, name: v.file ? v.file.name : asc(b.name) + '_lemondo_nyilatkozat.pdf', note: v.note, title: 'Lemondó nyilatkozat – ' + b.name })
  log(p.id, 'Ajánlat', 'Lemondó nyilatkozat rögzítve', `${b.name}${v.note ? ' · ' + v.note : ''}`)
}
export function sendTender(pid, v) {
  const p = P(pid)
  if (!v.ok) return 'Erősítse meg a kiküldést.'
  if (!(v.dl > S.today)) return 'A határidő legyen a mai napnál későbbi.'
  const pkg = ['rfq', 'qty', 'pricing', 'matrixTpl', 'bsd', 'contractDraft', 'nda', 'ifsReq', 'msds', 'supplierForm', 'cyber'].map((k) => docLatest(p, k)).filter(Boolean)
  const ts = stamp()
  p.bidDeadline = v.dl; p.due[3] = v.dl; p.bidders.forEach((b) => (b.invited = ts))
  p.f.sent = { by: S.user, ts, to: p.bidders.map((b) => b.name) }
  p.mail.push({ dir: 'out', ts, from: 'arajanlat@fonteviva.hu', to: p.bidders.map((b) => b.email).join(', '), subj: v.subj, body: v.body, att: pkg.map((d) => d.name) })
  addDoc(p, { key: 'invit', name: 'Meghivo_' + asc(p.id) + '.eml', content: `<h4>${esc(v.subj)}</h4><p>${esc(v.body).replace(/\n/g, '<br>')}</p>`, title: 'Tender kiküldve' })
  log(p.id, 'Levelezés', 'Tender kiküldve', `arajanlat@fonteviva.hu · ${p.bidders.length} címzett · határidő: ${fDay(v.dl)}`)
  toast('Ajánlatkérés kiküldve', 'ok')
}
export function openBids(pid, v) {
  const p = P(pid), rec = p.bidders.filter((b) => b.status === 'beérkezett')
  for (const b of rec) if (!b.late && v['f_' + b.id] && !(num(v['p_' + b.id]) > 0)) return 'Adja meg a(z) ' + b.name + ' árát.'
  rec.forEach((b) => { b.formal = b.late ? false : !!v['f_' + b.id]; b.price = num(v['p_' + b.id]) || null; b.pay = num(v['d_' + b.id]) || null; b.lead = num(v['l_' + b.id]) || null; b.warr = num(v['w_' + b.id]) || null })
  p.f.opened = F0()
  addDoc(p, { key: 'opening', name: 'Bontasi_jegyzokonyv_' + asc(p.id) + '.docx', content: openingHTML(p) })
  log(p.id, 'Ajánlat', 'Ajánlatbontás', `Bontási jegyzőkönyv · ${validBids(p).length} érvényes ajánlat, ${p.bidders.filter((b) => b.status === 'lemondó').length} lemondó nyilatkozat`)
  toast('Ajánlatbontás rögzítve – az árak láthatóvá váltak', 'ok')
}
export function evalBid(pid, bid, v) {
  const p = P(pid), b = p.bidders.find((x) => x.id === bid)
  b.formal = !!v.formal; b.tech = v.tech === '' || v.tech == null ? null : num(v.tech)
  b.price = num(v.price) || null; b.pay = v.pay === '' ? null : num(v.pay); b.lead = num(v.lead) || null; b.warr = num(v.warr) || null; b.note = v.note
  log(p.id, 'Értékelés', 'Ajánlat értékelve', `${b.name} · műszaki: ${b.tech == null ? '–' : b.tech}${b.tech != null && b.tech < 60 ? ' (nem megfelelő)' : ''} · ár: ${b.price ? ft(b.price) : '–'}`)
}
export function saveTco(pid, v) {
  const p = P(pid), x = { c0: num(v.c0), k: num(v.k), n: Math.max(1, Math.round(num(v.n))), r: num(v.r) / 100, res: num(v.res) }
  if (!(x.c0 > 0)) return 'Adja meg a kezdő költséget.'
  x.result = tcoCalc(x); p.tcoData = x
  addDoc(p, { key: 'tco', name: 'TCO_kalkulacio_' + asc(p.id) + '.xlsx', content: `<h4>TCO / DCF – ${esc(p.id)}</h4>` + tbl(['Tétel', 'Érték'], [['Kezdő költség', ft(x.c0)], ['Éves üzemeltetési költség', ft(x.k)], ['Élettartam', x.n + ' év'], ['WACC', (x.r * 100).toFixed(1) + '%'], ['Maradványérték', ft(x.res)], ['<b>Diszkontált TCO</b>', '<b>' + ft(x.result) + '</b>']]) })
  toast('TCO rögzítve', 'ok')
}
export function saveNego(pid, v, cand) {
  const p = P(pid), b = cand.find((x) => x.id === v.winner), ini = num(v.initial), fin = num(v.final), reb = num(v.rebate) || 0
  if (!(ini > 0 && fin > 0)) return 'Adja meg a kezdő és végső árat.'
  p.nego = { winner: b.id, winnerName: b.name, initial: ini, final: fin, rebate: reb, saving: ini - fin + reb, isNew: !!b.isNew, note: v.note, ts: stamp(), by: S.user }
  addDoc(p, { key: 'nego', name: 'Targyalasi_jegyzokonyv_' + asc(p.id) + '.docx', content: `<h4>Tárgyalási jegyzőkönyv</h4><p>Nyertes: ${esc(b.name)}<br>Kezdő ár: ${ft(ini)} → végső ár: ${ft(fin)}<br>Megtakarítás: <b>${ft(p.nego.saving)}</b></p><p>${esc(v.note)}</p>` })
  log(p.id, 'Értékelés', 'Tárgyalási kör lezárva', `Nyertes: ${b.name} · ${ft(ini)} → ${ft(fin)} · megtakarítás: ${ft(p.nego.saving)}`)
  toast('Tárgyalás rögzítve', 'ok')
}
export const PREQ = ['Cégkivonat (30 napnál nem régebbi)', 'Adószám és közösségi adószám (NAV / VIES)', 'Köztartozás-mentesség', 'Tényleges tulajdonos (BO) nyilatkozat', 'Felelősségbiztosítás igazolása', 'Beszállítói adatlap + adatkezelési tájékoztató', 'IFS / BRC / FSSC 22000 / ISO 9001 tanúsítvány', 'Specifikáció, EU 1935/2004 és 10/2011 megfelelőségi nyilatkozat', 'Kioldódási vizsgálat, allergén-nyilatkozat', 'COA/DoC garancia, nyomonkövethetőség, mock recall', 'MI értékelés (max. 5 munkanap)', 'Pénzügyi stabilitás ellenőrzése', 'MDM felvétel indítva (BC)']
export function savePrequal(pid, checked) {
  const p = P(pid)
  p.f.prequalItems = checked
  if (checked.length === PREQ.length) { p.f.prequal = F0('minden dokumentum rendben'); log(p.id, 'Értékelés', 'Előminősítés lezárva', (p.nego ? p.nego.winnerName : '') + ' · minden kötelező elem rendben'); toast('Előminősítés kész', 'ok') }
  else toast(`Előminősítés folyamatban (${checked.length}/${PREQ.length})`)
}

/* ---------- tasks ---------- */
export function addTask(v) {
  if (!v.title.trim()) return 'Adja meg a feladat nevét.'
  if (!v.due) return 'Adja meg a határidőt.'
  S.tasks.push({ id: uid(), pid: v.pid, title: v.title.trim(), desc: v.desc, owner: v.owner, by: S.user, due: v.due, done: null })
  log(v.pid, 'Feladat', 'Feladat létrehozva', `${v.title.trim()} · felelős: ${v.owner} · határidő: ${fDay(v.due)}`)
  toast('Feladat létrehozva', 'ok')
}
export function toggleTask(id, done) {
  const t = S.tasks.find((x) => x.id === id)
  t.done = done ? stamp() : null
  log(t.pid, 'Feladat', done ? 'Feladat lezárva' : 'Feladat újranyitva', t.title)
}

/* ---------- global ---------- */
export function resetDemo() {
  const th = S.theme
  try { localStorage.removeItem(SKEY) } catch { /* noop */ }
  const s = seedState(); s.theme = th
  toast('Demó alaphelyzetbe állítva', 'ok')
}
export function ensureState() { const s = load(); setS(s && s.tasks ? s : seedState()); return S }
export function clockNext() { S.today = addWD(S.today, 1); toast('Demó dátuma: ' + fDay(S.today)) }
export function csvExport() {
  const rows = [['Sorszám', 'Időpont', 'Felhasználó', 'Beszerzés', 'Típus', 'Esemény', 'Részletek', 'Hash']].concat(S.audit.map((e) => [e.n, e.ts, e.user, e.proc, e.type, e.title, e.detail, e.hash]))
  const csv = '﻿' + rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(';')).join('\r\n')
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = 'auditnaplo_' + S.today + '.csv'
  document.body.appendChild(a); a.click(); a.remove()
}
export { save, addD, docs }
