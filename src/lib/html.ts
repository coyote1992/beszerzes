// Generated documents are stored as HTML in SharePoint; only a small, attribute-free tag set is rendered.
const ALLOWED = new Set(['H3', 'H4', 'P', 'B', 'STRONG', 'I', 'EM', 'BR', 'UL', 'OL', 'LI', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD'])

function clean(node: Node, doc: Document): Node | null {
  if (node.nodeType === Node.TEXT_NODE) return doc.createTextNode(node.textContent || '')
  if (node.nodeType !== Node.ELEMENT_NODE) return null
  const el = node as Element
  const kids = Array.from(el.childNodes).map((c) => clean(c, doc)).filter(Boolean) as Node[]
  if (!ALLOWED.has(el.tagName)) {
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return null
    const frag = doc.createDocumentFragment(); kids.forEach((k) => frag.appendChild(k)); return frag
  }
  const out = doc.createElement(el.tagName.toLowerCase())
  kids.forEach((k) => out.appendChild(k))
  return out
}

export function cleanHtml(html: string): string {
  const src = new DOMParser().parseFromString(String(html || ''), 'text/html')
  const box = document.createElement('div')
  Array.from(src.body.childNodes).forEach((n) => { const c = clean(n, document); if (c) box.appendChild(c) })
  return box.innerHTML
}
