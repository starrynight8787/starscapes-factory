import { Link } from 'react-router-dom'
import './markdown.css'

// A small, safe way to show the legal pages' text: headings (## and ###), paragraphs, bullet and numbered lists, quotes (> text), tables (| a | b |), **bold**, and [links](address). Nothing else
// is understood and no HTML is ever let through. A link is only made for an address on this site (starting /), an https:// address, or a mailto: address;
// anything else is shown as plain words. A backslash before [ or ] shows the bracket itself (\[DATE\]), and plain [square brackets] stay as they are.
export const slugify = (text) => String(text).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'section'

function link(label, href, key) {
  if (href.startsWith('/')) return <Link key={key} to={href}>{label}</Link>
  if (/^https:\/\/[^\s<>"']+$/i.test(href)) return <a key={key} href={href} target="_blank" rel="noopener noreferrer" aria-label={`${label} (opens in a new tab)`}>{label}</a>
  if (/^mailto:[^\s<>"']+$/i.test(href)) return <a key={key} href={href}>{label}</a>
  return label
}

export function inline(text, base = 'i') {
  const out = []
  let buf = ''
  let i = 0
  let n = 0
  const flush = () => { if (buf) { out.push(buf); buf = '' } }
  while (i < text.length) {
    const ch = text[i]
    if (ch === '\\' && i + 1 < text.length && '[]\\*'.includes(text[i + 1])) { buf += text[i + 1]; i += 2; continue }
    if (text.startsWith('**', i)) {
      const end = text.indexOf('**', i + 2)
      if (end > i + 2) { flush(); out.push(<strong key={`${base}-${n++}`}>{inline(text.slice(i + 2, end), `${base}-${n}`)}</strong>); i = end + 2; continue }
    }
    if (ch === '[') {
      const m = /^\[([^\]]+)\]\(([^)\s]+)\)/.exec(text.slice(i))
      if (m) { flush(); out.push(link(m[1], m[2], `${base}-${n++}`)); i += m[0].length; continue }
    }
    buf += ch
    i += 1
  }
  flush()
  return out
}

// The text as page parts
export function renderMarkdown(text) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n')
  const nodes = []
  const used = new Set()
  let para = []
  let list = null
  let quote = []
  let table = []
  const flushPara = () => { if (para.length) { nodes.push(<p key={`p${nodes.length}`}>{inline(para.join(' '), `p${nodes.length}`)}</p>); para = [] } }
  const flushList = () => {
    if (!list) return
    const items = list.items.map((t, k) => <li key={k}>{inline(t, `l${nodes.length}-${k}`)}</li>)
    nodes.push(list.ordered ? <ol key={`l${nodes.length}`}>{items}</ol> : <ul key={`l${nodes.length}`}>{items}</ul>)
    list = null
  }
  const flushQuote = () => { if (quote.length) { nodes.push(<blockquote key={`q${nodes.length}`}><p>{inline(quote.join(' '), `q${nodes.length}`)}</p></blockquote>); quote = [] } }
  const cells = (row) => row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim())
  const flushTable = () => {
    if (!table.length) return
    const [head, ...rest] = table
    const body = rest.filter((r) => !/^\|[\s|:-]+\|?$/.test(r.trim()))
    nodes.push(
      <div key={`t${nodes.length}`} className="md-tablewrap">
        <table>
          <thead><tr>{cells(head).map((c, k) => <th key={k} scope="col">{inline(c, `th${nodes.length}-${k}`)}</th>)}</tr></thead>
          <tbody>{body.map((r, i) => <tr key={i}>{cells(r).map((c, k) => <td key={k}>{inline(c, `td${nodes.length}-${i}-${k}`)}</td>)}</tr>)}</tbody>
        </table>
      </div>,
    )
    table = []
  }
  for (const raw of lines) {
    const line = raw.trimEnd()
    const heading = /^(#{2,3})\s+(.+)$/.exec(line)
    const bullet = /^[-*]\s+(.+)$/.exec(line)
    const numbered = /^\d+\.\s+(.+)$/.exec(line)
    if (!line.trim()) { flushPara(); flushList(); flushQuote(); flushTable(); continue }
    if (line.startsWith('|')) { flushPara(); flushList(); flushQuote(); table.push(line); continue }
    flushTable()
    if (/^>\s?/.test(line)) { flushPara(); flushList(); quote.push(line.replace(/^>\s?/, '').trim()); continue }
    flushQuote()
    if (heading) {
      flushPara(); flushList()
      const level = heading[1].length
      let id = slugify(heading[2].replace(/\\([[\]])/g, '$1'))
      let k = 2
      while (used.has(id)) id = `${slugify(heading[2])}-${k++}`
      used.add(id)
      const Tag = level === 2 ? 'h2' : 'h3'
      nodes.push(<Tag key={`h${nodes.length}`} id={id}>{inline(heading[2], `h${nodes.length}`)}</Tag>)
      continue
    }
    if (bullet || numbered) {
      flushPara()
      const ordered = Boolean(numbered)
      if (list && list.ordered !== ordered) flushList()
      if (!list) list = { ordered, items: [] }
      list.items.push((bullet || numbered)[1])
      continue
    }
    flushList()
    para.push(line.trim())
  }
  flushPara(); flushList(); flushQuote(); flushTable()
  return { nodes }
}

// How many gaps still in [square brackets] a page has (not counting links), for the owner's draft banner
export const countGaps = (text) => (String(text || '').replace(/\\([[\]])/g, '$1').replace(/\[[^\]\n]+\]\([^)\s]*\)/g, '').match(/\[[^\]\n]+\]/g) || []).length
