// Puts back any of these pages that are missing from your App.jsx: Log in, Sign up, and a single post.
//   - It makes a backup first: src/App.jsx.before-route-fix
//   - It only adds routes whose page is already imported at the top of App.jsx
//   - It never changes or removes anything. Safe to run more than once.
import fs from 'node:fs'

const FILE = 'src/App.jsx'
const WANTED = [
  { path: '/login', component: 'Login', note: 'Log in' },
  { path: '/signup', component: 'Signup', note: 'Sign up' },
  { path: '/post/:id', component: 'PostPage', note: 'A single post' },
]

function stop(message) {
  console.log('\nNothing was changed.\n' + message + '\n')
  process.exit(1)
}

if (!fs.existsSync(FILE)) stop(`I can't find ${FILE}. Make sure you are in your project folder (cd ~/Website/supabase-blog-starter) and try again.`)
const original = fs.readFileSync(FILE, 'utf8')
if (!original.includes('</Routes>')) stop("I couldn't find where the pages are listed (</Routes>) in App.jsx. Send me the output of: cat src/App.jsx")

const have = (path) => new RegExp(`path=["']${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`).test(original)
const imported = (name) => new RegExp(`import\\s+${name}\\s+from`).test(original)

const toAdd = []
const skipped = []
const present = []
for (const w of WANTED) {
  if (have(w.path)) present.push(w)
  else if (!imported(w.component)) skipped.push(w)
  else toAdd.push(w)
}

console.log('\nChecking your pages:')
for (const w of WANTED) {
  const state = present.includes(w) ? 'already there' : toAdd.includes(w) ? 'MISSING, adding it now' : `MISSING, but ${w.component} isn't imported so I can't add it`
  console.log(`  ${w.path.padEnd(12)} ${w.note.padEnd(14)} ${state}`)
}

if (!toAdd.length) {
  console.log(skipped.length ? '\nNothing I can add safely. Send me the output of: cat src/App.jsx\n' : '\nEverything is already in place. Nothing to do.\n')
  process.exit(skipped.length ? 1 : 0)
}

const at = original.lastIndexOf('</Routes>')
const lineStart = original.lastIndexOf('\n', at) + 1
const indent = original.slice(lineStart, at).match(/^\s*/)[0]
const lines = toAdd.map((w) => `${indent}  <Route path="${w.path}" element={<${w.component} />} />\n`).join('')
const updated = original.slice(0, lineStart) + lines + original.slice(lineStart)

const before = (original.match(/<Route\b/g) || []).length
const after = (updated.match(/<Route\b/g) || []).length
if (after !== before + toAdd.length) stop("Something didn't add up when I checked my own work, so I haven't saved anything. Send me the output of: cat src/App.jsx")

fs.writeFileSync(FILE + '.before-route-fix', original)
fs.writeFileSync(FILE, updated)

console.log(`\nDone. Added ${toAdd.length} ${toAdd.length === 1 ? 'page' : 'pages'}. A backup of your old file is at src/App.jsx.before-route-fix\n`)
console.log('Pages your site now knows about:')
for (const m of updated.matchAll(/<Route[^>]*\bpath=["']([^"']+)["']/g)) console.log('  ' + m[1])
console.log('')
