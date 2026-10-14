// Stops the "404: NOT_FOUND" when you refresh a page (or open a link to one) on the live site.
// It creates or updates vercel.json in your project folder. Safe to run more than once.
// If vercel.json already exists, it keeps everything in it, adds only what is missing, and backs the old file up first.
import fs from 'node:fs'

const FILE = 'vercel.json'
// every address except the ones starting with /api/ (your Creative Hub pages live there) gets the one real page
const RULE = { source: '/((?!api/.*).*)', destination: '/index.html' }

function stop(message) {
  console.log('\nNothing was changed.\n' + message + '\n')
  process.exit(1)
}

if (!fs.existsSync('package.json') || !fs.existsSync('index.html')) {
  stop("This doesn't look like your project folder (I can't see package.json and index.html). Run:\n  cd ~/Website/supabase-blog-starter\nand try again.")
}

let config = {}
let existed = false
let original = ''
if (fs.existsSync(FILE)) {
  existed = true
  original = fs.readFileSync(FILE, 'utf8')
  try {
    config = JSON.parse(original)
  } catch (e) {
    stop("vercel.json is already there, but I can't read it (it isn't valid JSON), so I haven't touched it. Send me the output of: cat vercel.json")
  }
  if (config === null || typeof config !== 'object' || Array.isArray(config)) stop("vercel.json isn't in the shape I expected, so I haven't touched it. Send me the output of: cat vercel.json")
  if ('routes' in config) stop("vercel.json uses an older setting called 'routes', which can't be mixed with the setting I need to add. I haven't touched it. Send me the output of: cat vercel.json")
  if (config.cleanUrls) stop("vercel.json turns on 'cleanUrls', which changes how this setting has to be written. I haven't touched it. Send me the output of: cat vercel.json")
  if ('rewrites' in config && !Array.isArray(config.rewrites)) stop("The 'rewrites' part of vercel.json isn't a list, so I haven't touched it. Send me the output of: cat vercel.json")
}

const rewrites = Array.isArray(config.rewrites) ? config.rewrites : []
const catchAll = rewrites.some(
  (r) => r && ['/(.*)', '/:path*', '/((?!api/.*).*)', '/((?!api/).*)'].includes(r.source) && ['/index.html', '/', '/index'].includes(r.destination)
)
if (catchAll) {
  console.log('\nvercel.json already sends every address to the home page. Nothing to do.')
  console.log('If refreshing still gives a 404, make sure vercel.json has been pushed, and tell me.\n')
  process.exit(0)
}

config.rewrites = [...rewrites, RULE] // added last, so any more specific rules you already have still win
const text = JSON.stringify(config, null, 2) + '\n'
JSON.parse(text) // never write something that is not valid

if (existed) fs.writeFileSync(FILE + '.before-rewrite', original)
fs.writeFileSync(FILE, text)

console.log(`\nDone. ${existed ? 'Updated' : 'Created'} vercel.json:\n`)
console.log(text)
if (existed) console.log('A backup of the old file is at vercel.json.before-rewrite\n')
console.log('This only takes effect on the live site after you push it:')
console.log('  git add . && git commit -m "Fix 404 on refresh" && git push\n')
