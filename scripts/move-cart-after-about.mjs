// Moves the Cart link so it comes right after About, in both menus (desktop and phone). Safe to run more than once.
//   - It edits only src/components/Navbar.jsx, and makes a backup of it first (src/components/Navbar.jsx.before-cart-move)
//   - It moves the two Cart links and changes nothing else. If anything is not what it expects, it stops and changes nothing.
import fs from 'node:fs'

const NAV = 'src/components/Navbar.jsx'

function stop(message) {
  console.log('\nNothing was changed.\n' + message + '\n')
  process.exit(1)
}
const SEND = 'Send me the output of: cat src/components/Navbar.jsx'

if (!fs.existsSync(NAV)) stop(`I can't find ${NAV}. Make sure you are in your project folder (cd ~/Website/supabase-blog-starter).`)
const original = fs.readFileSync(NAV, 'utf8')
const nl = original.includes('\r\n') ? '\r\n' : '\n'

// Where the opening tag that starts at `start` ends (the index just after its ">"). Understands {braces}, so "=>" inside a prop is not mistaken for the end.
function openingTagEnd(src, start) {
  let depth = 0
  let quote = null
  for (let i = start; i < src.length; i += 1) {
    const c = src[i]
    if (quote) {
      if (c === quote) quote = null
      continue
    }
    if (c === '"' || c === "'" || c === '`') quote = c
    else if (c === '{') depth += 1
    else if (c === '}') depth -= 1
    else if (c === '>' && depth === 0 && src[i - 1] !== '=') return i + 1
  }
  return -1
}

// Every <CartNavLink ... /> in the file, as { start, end }
function findCarts(src) {
  const found = []
  const re = /<CartNavLink\b/g
  let m
  while ((m = re.exec(src))) {
    const end = openingTagEnd(src, m.index)
    if (end < 0 || src.slice(end - 2, end) !== '/>') return null // not a self-closing link: not what I expect
    found.push({ start: m.index, end })
  }
  return found
}

// Every About link: <Link ... to="/page/about" ...>About</Link>, as { start, end }
function findAbouts(src) {
  const found = []
  const re = /<Link\b/g
  let m
  while ((m = re.exec(src))) {
    const tagEnd = openingTagEnd(src, m.index)
    if (tagEnd < 0) return null
    if (!/\bto=["']\/page\/about["']/.test(src.slice(m.index, tagEnd))) continue
    const after = src.slice(tagEnd).match(/^\s*About\s*<\/Link>/)
    if (!after) return null // an About link that holds something other than the word About: not what I expect
    found.push({ start: m.index, end: tagEnd + after[0].length })
  }
  return found
}

function removeCarts(src) {
  const carts = findCarts(src) || []
  let out = src
  for (const c of carts.slice().reverse()) out = out.slice(0, c.start) + out.slice(c.end)
  return out
}
const squash = (s) => s.replace(/\s+/g, '')

const carts = findCarts(original)
const abouts = findAbouts(original)
if (carts === null || abouts === null) stop(`Something in Navbar.jsx is not the way I expected, so I haven't touched it. ${SEND}`)
if (carts.length === 0) stop(`I couldn't find the Cart link in Navbar.jsx. Has the cart update been installed? ${SEND}`)
if (carts.length !== 2) stop(`I expected the Cart link twice (desktop and phone menu) but found it ${carts.length} times, so I haven't touched Navbar.jsx. ${SEND}`)
if (abouts.length !== 2) stop(`I expected the About link twice (desktop and phone menu) but found it ${abouts.length} times, so I haven't touched Navbar.jsx. ${SEND}`)

// the order they appear in the file: C = Cart, A = About. Before: C A C A (Cart first, in each menu). After: A C A C.
const order = [...carts.map((c) => ({ at: c.start, k: 'C' })), ...abouts.map((a) => ({ at: a.start, k: 'A' }))].sort((x, y) => x.at - y.at).map((x) => x.k).join('')
if (order === 'ACAC') {
  console.log('\nThe Cart link already comes right after About, in both menus. Nothing to do.\n')
  process.exit(0)
}
if (order !== 'CACA') stop(`The Cart and About links are in an order I didn't expect (${order.split('').map((k) => (k === 'C' ? 'Cart' : 'About')).join(', ')}), so I haven't touched Navbar.jsx. ${SEND}`)

// Move each Cart link to just after its About link. Work from the end of the file, so the earlier positions stay true.
let nav = original
for (let k = 1; k >= 0; k -= 1) {
  const cart = carts[k]
  const about = abouts[k]
  const cartText = original.slice(cart.start, cart.end)
  const aboutLineStart = nav.lastIndexOf('\n', about.start) + 1
  const indent = nav.slice(aboutLineStart, about.start).match(/^[ \t]*/)[0]
  // put it in after About, on its own line...
  nav = nav.slice(0, about.end) + nl + indent + cartText + nav.slice(about.end)
  // ...then take it out from where it was (the whole line, if it was alone on its line)
  const lineStart = nav.lastIndexOf('\n', cart.start) + 1
  const lineEndAt = nav.indexOf('\n', cart.end)
  const lineEnd = lineEndAt < 0 ? nav.length : lineEndAt + 1
  const alone = /^[ \t]*$/.test(nav.slice(lineStart, cart.start)) && /^[ \t]*\r?\n?$/.test(nav.slice(cart.end, lineEnd))
  nav = alone ? nav.slice(0, lineStart) + nav.slice(lineEnd) : nav.slice(0, cart.start) + nav.slice(cart.end)
}

// Check my own work before saving anything: both links still there, in the new order, and nothing else different.
const newCarts = findCarts(nav)
const newAbouts = findAbouts(nav)
const newOrder = newCarts && newAbouts ? [...newCarts.map((c) => ({ at: c.start, k: 'C' })), ...newAbouts.map((a) => ({ at: a.start, k: 'A' }))].sort((x, y) => x.at - y.at).map((x) => x.k).join('') : ''
const sameCarts = newCarts && newCarts.length === 2 && newCarts.every((c, i) => squash(nav.slice(c.start, c.end)) === squash(original.slice(carts[i].start, carts[i].end)))
if (newOrder !== 'ACAC' || !sameCarts || squash(removeCarts(nav)) !== squash(removeCarts(original))) {
  stop("Something didn't add up when I checked my own work on Navbar.jsx, so I haven't saved anything. " + SEND)
}

fs.writeFileSync(NAV + '.before-cart-move', original)
fs.writeFileSync(NAV, nav)
console.log('\nDone. The Cart link now comes right after About, in the desktop menu and the phone menu.')
console.log('A backup of your old file is at ' + NAV + '.before-cart-move\n')
