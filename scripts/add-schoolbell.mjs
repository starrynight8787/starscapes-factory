// Adds the Schoolbell font to the site (loaded with the other Google fonts) and gives it a name to use: --sf-school.
// Safe to run twice. Run it from the project folder:   node scripts/add-schoolbell.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const FILE = 'src/styles/site.css'
if (!existsSync(FILE)) { console.error(`Could not find ${FILE}. Run this from the project folder (the one with package.json).`); process.exit(1) }
let css = readFileSync(FILE, 'utf8')
let changed = false

// 1. load the font with the others
if (!/family=Schoolbell/.test(css)) {
  const next = css.replace(/(@import url\('https:\/\/fonts\.googleapis\.com\/css2\?[^']*?)(&display=swap'\);)/, '$1&family=Schoolbell$2')
  if (next === css) { console.error('Could not find the Google Fonts line at the top of site.css. Nothing was changed.'); process.exit(1) }
  css = next; changed = true
}
// 2. give it a name, next to the other fonts
if (!/--sf-school:/.test(css)) {
  const next = css.replace(/(\s*--sf-hand:[^;]*;)/, "$1\n  --sf-school: 'Schoolbell', 'Caveat', cursive; /* article titles and the name plaques */")
  if (next === css) { console.error('Could not find where the fonts are named (--sf-hand). Nothing was changed.'); process.exit(1) }
  css = next; changed = true
}
if (changed) { writeFileSync(FILE, css); console.log('Schoolbell added to src/styles/site.css.') } else console.log('Schoolbell was already there. Nothing to do.')
