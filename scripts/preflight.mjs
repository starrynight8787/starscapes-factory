// Checks your project before you push it live. It only READS. It never changes anything.
//   Run it from your project folder:   node scripts/preflight.mjs
import fs from 'node:fs'

const read = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null)
const has = (f) => fs.existsSync(f)
const app = read('src/App.jsx')
const nav = read('src/components/Navbar.jsx')
const login = read('src/pages/Login.jsx')
const rooms = read('src/data/roomImages.js')

if (!app) {
  console.log("\nI can't find src/App.jsx. Make sure you are in your project folder:\n  cd ~/Website/supabase-blog-starter\n")
  process.exit(1)
}

const routeThere = (path) => new RegExp(`path=["']${path.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&')}["']`).test(app)
let problems = 0
let notes = 0
const line = (state, text) => console.log(`  ${state.padEnd(14)} ${text}`)
const need = (ok, text, fix) => {
  if (ok) line('OK', text)
  else {
    problems++
    line('MISSING', text + (fix ? `\n${' '.repeat(17)}Fix: ${fix}` : ''))
  }
}
const optional = (ok, text, how) => {
  if (ok) line('OK', text)
  else {
    notes++
    line('not installed', text + (how ? `\n${' '.repeat(17)}To add it: ${how}` : ''))
  }
}

console.log('\nThe basics (the site is broken without these)')
need(routeThere('/'), 'Home page route', 'send me: cat src/App.jsx')
need(routeThere('/login'), 'Log in page', 'node scripts/fix-missing-routes.mjs')
need(routeThere('/signup'), 'Sign up page', 'node scripts/fix-missing-routes.mjs')
need(routeThere('/post/:id'), 'A single post page', 'node scripts/fix-missing-routes.mjs')
need(has('src/supabaseClient.js'), 'The database connection file', 'send me what you see in the src folder: ls src')
const postPage = read('src/pages/PostPage.jsx')
if (postPage) need(postPage.includes('BackToPosts') && has('src/components/BackToPosts.jsx'), 'The Back link on a post goes to its room (not the homepage)', 'unzip -o ~/Downloads/starscapes-back-link.zip   then   node scripts/fix-back-link.mjs')

console.log('\nThe Art Loft')
need(routeThere('/art-loft/*') && has('src/artloft/ArtLoftRoutes.jsx'), 'Art Loft pages and route', 'unzip -o ~/Downloads/starscapes-artloft.zip   then   node scripts/add-art-loft-route.mjs')
need(has('public/scenes/art-loft.svg'), 'Art Loft scene picture (public/scenes/art-loft.svg)', 'unzip -o ~/Downloads/starscapes-artloft.zip')
need(has('src/artloft/AdminPrints.jsx'), 'The publish page for your prints')

console.log('\nThe Factory Floor')
need(routeThere('/factory-floor/*') && has('src/factoryfloor/FactoryFloorRoutes.jsx'), 'Factory Floor pages and route', 'unzip -o ~/Downloads/starscapes-factory-floor.zip   then   node scripts/add-factory-floor-route.mjs')
need(has('public/scenes/factory-floor-bg.jpg'), 'Factory Floor background (public/scenes/factory-floor-bg.jpg)', 'unzip -o ~/Downloads/starscapes-factory-floor.zip')
need(has('src/factoryfloor/PostFilter.jsx'), 'The filter on the Factory Floor and Blueprints pages', 'unzip -o ~/Downloads/starscapes-factory-floor-filter.zip')
if (has('src/factoryfloor/factoryData.js')) {
  need(/'#CDE4FF'/i.test(read('src/factoryfloor/factoryData.js')) && /'#DCCDFF'/i.test(read('src/factoryfloor/factoryData.js')), 'Pale blue and pale purple post-its', 'unzip -o ~/Downloads/starscapes-factory-floor-filter.zip')
}
if (rooms) {
  need(/'\/art-loft'/.test(rooms) && /'\/factory-floor'/.test(rooms), 'The floor plan sends visitors to the Art Loft and Factory Floor pages', 'unzip -o ~/Downloads/starscapes-factory-floor.zip')
}

console.log('\nExtras (the site works without them, but they were part of this update)')
const cartIn = routeThere('/cart') && has('src/cart/CartPage.jsx')
optional(cartIn, 'Shopping cart page', 'unzip -o ~/Downloads/starscapes-cart.zip   then   node scripts/add-cart.mjs')
if (nav) {
  if (nav.includes('CartNavLink')) line('OK', 'The menu says Cart')
  else { notes++; line('not installed', 'The menu still says Shop (it opens the old shop page)' + (cartIn ? '\n' + ' '.repeat(17) + 'Fix: node scripts/add-cart.mjs' : '')) }
}
const forgotIn = routeThere('/forgot-password') && routeThere('/reset-password') && has('src/pages/ForgotPassword.jsx') && has('src/pages/ResetPassword.jsx')
optional(forgotIn, 'Forgot password pages', 'unzip -o ~/Downloads/starscapes-forgot-password.zip   then   node scripts/add-forgot-password.mjs')
if (login) optional(login.includes('/forgot-password'), 'A "Forgot your password?" link on the log-in page', forgotIn ? 'node scripts/add-forgot-password.mjs' : null)

// leftovers from the install scripts
const backups = []
for (const dir of ['src', 'src/components', 'src/pages', 'src/data']) {
  if (has(dir)) for (const f of fs.readdirSync(dir)) if (/\.before-[a-z-]+$/.test(f)) backups.push(`${dir}/${f}`)
}
if (backups.length) {
  console.log('\nBackup copies the install scripts made (harmless, but they get pushed too):')
  backups.forEach((b) => console.log('  ' + b))
  console.log('  Once the live site works, you can delete them:  find src -name "*.before-*" -delete')
}

console.log('')
if (problems) {
  console.log(`NOT READY: ${problems} thing${problems === 1 ? '' : 's'} missing from the list above. Fix those first.`)
  process.exit(1)
}
console.log(notes ? `READY TO PUSH. ${notes} optional thing${notes === 1 ? ' is' : 's are'} not installed, so ${notes === 1 ? 'it' : 'they'} will not be on the live site.` : 'READY TO PUSH. Everything is installed.')
console.log('Next: npm run build   (it must finish without errors), then push.\n')
