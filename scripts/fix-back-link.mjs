// Fixes the "Back" link at the top of a post, which used to send everyone to the homepage.
// Safe to run more than once. It makes a backup first: src/pages/PostPage.jsx.before-back-link
import fs from 'node:fs'

const FILE = 'src/pages/PostPage.jsx'
const IMPORT_LINE = "import BackToPosts from '../components/BackToPosts'"

function stop(message) {
  console.log('\nNothing was changed.\n' + message + '\n')
  process.exit(1)
}

for (const f of [FILE, 'src/components/BackToPosts.jsx', 'src/components/backTarget.js', 'src/factoryfloor/factoryData.js', 'src/data/channels.js', 'src/data/roomImages.js']) {
  if (!fs.existsSync(f)) stop(`I can't find ${f}. Make sure you are in your project folder (cd ~/Website/supabase-blog-starter), and that you have unzipped the update and installed the Factory Floor.`)
}
const original = fs.readFileSync(FILE, 'utf8')

if (original.includes('BackToPosts')) {
  console.log('\nThe back link is already fixed. Nothing to do.\n')
  process.exit(0)
}

const link = /<Link\s+to=["']\/["']\s*>\s*(?:&larr;|←)\s*Back to all posts\s*<\/Link>/g
const found = [...original.matchAll(link)].length
if (found === 0) stop("I couldn't find the 'Back to all posts' link in PostPage.jsx, so I haven't touched it. Send me the output of: cat src/pages/PostPage.jsx")
if (found > 1) stop(`I found that link ${found} times, and I only expected one, so I haven't touched PostPage.jsx. Send me the output of: cat src/pages/PostPage.jsx`)

let updated = original.replace(link, '<BackToPosts />')

// the new import goes after the last import line
const lines = updated.split('\n')
let last = -1
let inImport = false
lines.forEach((l, i) => {
  const t = l.trim()
  if (!inImport && /^import\b/.test(t)) inImport = true
  if (inImport && (/\bfrom\s+['"][^'"]+['"]\s*;?\s*$/.test(t) || /^import\s+['"][^'"]+['"]\s*;?\s*$/.test(t))) {
    last = i
    inImport = false
  }
})
if (last < 0) stop("I couldn't find the import lines at the top of PostPage.jsx. Send me the output of: cat src/pages/PostPage.jsx")
lines.splice(last + 1, 0, IMPORT_LINE)
updated = lines.join('\n')

if (!updated.includes('<BackToPosts />') || !updated.includes(IMPORT_LINE) || link.test(updated)) {
  stop("Something didn't add up when I checked my own work, so I haven't saved anything. Send me the output of: cat src/pages/PostPage.jsx")
}

fs.writeFileSync(FILE + '.before-back-link', original)
fs.writeFileSync(FILE, updated)
console.log('\nDone. The Back link on a post now goes to the list it came from, or to the room the post belongs to.')
console.log('A backup of your old file is at src/pages/PostPage.jsx.before-back-link')

// any other page with the same old link? Just tell you.
const others = []
const walk = (dir) => {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = `${dir}/${f.name}`
    if (f.isDirectory()) walk(p)
    else if (/\.jsx$/.test(f.name) && p !== FILE && /Back to all posts/.test(fs.readFileSync(p, 'utf8'))) others.push(p)
  }
}
walk('src')
if (others.length) {
  console.log('\nThese other pages also say "Back to all posts" and still go to the homepage. Tell me if you want them fixed too:')
  others.forEach((o) => console.log('  ' + o))
}
console.log('')
