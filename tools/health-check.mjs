// Checks that the key files in your project are the current ones, and says which are not.
// Run it from the project folder at any time (especially after unpacking a zip):   node tools/health-check.mjs
// It only reads. It never changes anything.
import fs from 'node:fs'
import crypto from 'node:crypto'

const CHECKS = [
  // [what it checks, file, what must be in it, which update it came from]
  ['Room pages: Home link row', 'src/rooms/roomscene.css', /\.rs-home \{/, 'the Home link update'],
  ['Room pages: heading size settings', 'src/rooms/roomscene.css', /--rs-name:\s*0\.034/, 'the Explorer\'s Bay heading update'],
  ['Room pages: Drafting Desk and Nook layout', 'src/rooms/roomscene.css', /\.rs\[data-room='drafting-desk'\],\s*\.rs\[data-room='knowledge-nook'\]/, 'the Knowledge Nook update (the stylesheet repair)'],
  ['Room component: Home link', 'src/rooms/RoomScene.jsx', /HomeLink/, 'the Home link update'],
  ['Room component: knows which room it is', 'src/rooms/RoomScene.jsx', /data-room/, 'the room size and bench update'],
  ['Art Loft: Home link', 'src/artloft/ArtLoftScene.jsx', /HomeLink/, 'the Home link update (the add-home-links script)'],
  ['Factory Floor: Home link', 'src/factoryfloor/FactoryFloorHome.jsx', /HomeLink/, 'the Home link update (the add-home-links script)'],
  ['Menu: the new room icons', 'src/components/Navbar.jsx', /RoomIcon/, 'the room icons update (the add-room-icons script)'],
  ['App: the 404 page', 'src/App.jsx', /<Route path="\*" element=\{<NotFound \/>\} \/>/, 'the system pages update (the add-system-pages script)'],
  ['App: the error catcher', 'src/App.jsx', /<ErrorBoundary>/, 'the system pages update (the add-system-pages script)'],
  ['App: the loading page', 'src/App.jsx', /<PageLoading \/>/, 'the system pages update (the add-system-pages script)'],
  ['App: the Knowledge Nook page', 'src/App.jsx', /\/knowledge-nook\/\*/, 'the Knowledge Nook update (the add-knowledge-nook script)'],
  ['Room addresses: the Nook opens its own page', 'src/data/roomImages.js', /'knowledge-nook':\s*'\/knowledge-nook'/, 'the Knowledge Nook update (the add-knowledge-nook script)'],
  ['Room list: the Knowledge Nook', 'src/rooms/roomsData.js', /'knowledge-nook': \{/, 'the Knowledge Nook update (the add-knowledge-nook script)'],
  ['App: Sarah Jr.\'s Den page', 'src/App.jsx', /\/sarah-jrs-den\/\*/, 'the Den update (the add-sarahs-den script)'],
  ['Room addresses: the Den opens its own page', 'src/data/roomImages.js', /'sarah-jrs-den':\s*'\/sarah-jrs-den'/, 'the Den update (the add-sarahs-den script)'],
  ['Room list: Sarah Jr.\'s Den', 'src/rooms/roomsData.js', /'sarah-jrs-den': \{/, 'the Den update (the add-sarahs-den script)'],
  ['Den picture: the sitting room', 'public/scenes/sarah-jrs-den/base.svg', /viewBox="0 0 1200 840"/, 'the Den update'],
  ['Room measurements: Idea Hatchery bench order', 'src/rooms/roomsGeometry.js', /'stop-motion': \{ cx: 847/, 'the Idea Hatchery bench update'],
  ['Idea Hatchery picture: the new bench', 'public/scenes/idea-hatchery/base.svg', /data-bench/, 'the Idea Hatchery bench update'],
  ['Leadership Lounge picture: periwinkle couch', 'public/scenes/leadership-lounge/item-leading-from-the-middle.svg', /#DBE3FF/, 'the Leadership Lounge colour update'],
  ['Explorer\'s Bay picture: the moon moved', 'public/scenes/explorers-bay/base.svg', /data-moon/, 'the Explorer\'s Bay update'],
  ['Drafting Desk picture: the oak desk', 'public/scenes/drafting-desk/base.svg', /data-oak="surface"/, 'the Drafting Desk oak update'],
  ['Art Loft picture: yellow tape and red cone', 'public/scenes/art-loft.svg', /data-tape/, 'the Art Loft tape update'],
  ['Tape on the Idea Hatchery\'s closed beaker', 'public/scenes/idea-hatchery/item-come-study-with-me.svg', /data-tape-group/, 'the closed objects tape update'],
  ['Tape on the Leadership Lounge\'s Free Ebook', 'public/scenes/leadership-lounge/item-free-ebook.svg', /data-tape-group/, 'the closed objects tape update'],
  ['Tape on Explorer\'s Bay\'s Something New', 'public/scenes/explorers-bay/item-coming-soon.svg', /data-tape-group/, 'the closed objects tape update'],
  ['Tape on the Drafting Desk\'s Come Write With Me', 'public/scenes/drafting-desk/sheet-come-write-with-me.svg', /data-tape-group/, 'the closed objects tape update'],
  ['Knowledge Nook picture: the bookcase', 'public/scenes/knowledge-nook/base.svg', /viewBox="0 0 1200 840"/, 'the Knowledge Nook update'],
  ['Form messages: the failure box', 'src/components/FormMessages.jsx', /export function FailureMessage/, 'the form messages update'],
  ['Log in form: the new messages', 'src/pages/Login.jsx', /ErrorSummary/, 'the form messages update'],
  ['Sign up form: the new messages', 'src/pages/Signup.jsx', /SuccessMessage/, 'the form messages update'],
  ['Forgot password form: the new messages', 'src/pages/ForgotPassword.jsx', /FailureMessage/, 'the form messages update'],
  ['Reset password form: the new messages', 'src/pages/ResetPassword.jsx', /ErrorSummary/, 'the form messages update'],
  ['Form wording: what the forms say', 'src/pages/formRules.js', /loginMessage/, 'the form messages update'],
  ['Home floor plan: the new room icons', 'src/pages/ChannelDirectory.jsx', /ROOM_ICONS\[c\.slug\]/, 'the home icons update (the add-home-icons script)'],
  ['Admin button: in the menu', 'src/components/Navbar.jsx', /useIsOwner/, 'the admin update (the add-admin-button script)'],
  ['Admin console: the /admin page in the app', 'src/App.jsx', /<Route path="\/admin"/, 'the admin update (the add-admin-button script)'],
  ['Admin console: the page itself', 'src/admin/AdminConsole.jsx', /useOwnerCheck/, 'the admin update'],
  ['Admin console: the server\'s yes-or-no answer', 'api/is-owner.js', /requireOwner/, 'the admin update'],
  ['Contact details: the address and the reply time', 'src/data/contact.js', /imagine@starscapesfactory\.com[\s\S]*ACCESSIBILITY_REPLY_DAYS = '5'/, 'the contact details update'],
  ['Doors: the gate on the pages behind doors', 'src/rooms/RoomRoutes.jsx', /DoorGate/, 'the doors update'],
  ['Doors: scenes follow the switch', 'src/rooms/RoomHome.jsx', /applyDoors/, 'the doors update'],
  ['Doors: the room page can show a door\'s page', 'src/rooms/RoomAreaPage.jsx', /areas \|\| config\.areas/, 'the doors update'],
  ['Doors: the Open a door page in the app', 'src/App.jsx', /<Route path="\/admin\/doors"/, 'the doors update (the add-doors script)'],
  ['Doors: the Open a door tool', 'src/admin/OpenDoors.jsx', /saveDoor/, 'the doors update'],
  ['Doors: the console links to the tool', 'src/admin/adminTools.js', /to: '\/admin\/doors'/, 'the doors update'],
  ['Doors: the database file', 'sql/doors.sql', /create table if not exists public\.doors/, 'the doors update'],
  ['Room icon: Art Loft', 'public/icons/rooms/art-loft.png', null, 'the room icons update'],
  ['Room icon: Knowledge Nook', 'public/icons/rooms/knowledge-nook.png', null, 'the room icons update'],
  ['Order email: the wording and its approval rail', 'lib/orderEmailText.js', /WORDING_APPROVED/, 'the order confirmation email update'],
  ['Order email: sending through Resend', 'lib/sendEmail.js', /api\.resend\.com/, 'the order confirmation email update'],
  ['Order email: deciding, sending and recording', 'lib/orderConfirmation.js', /confirmationProblems/, 'the order confirmation email update (the add-order-email script)'],
  ['Order email: the payment listener sends it', 'api/stripe-webhook.js', /confirmOrder/, 'the order confirmation email update (the add-order-email script)'],
  ['Order email: real checkout waits for it', 'api/checkout.js', /confirmationProblems/, 'the order confirmation email update (the add-order-email script)'],
  ['Order email: the owner\'s resend button (server)', 'api/order-actions.js', /resend_confirmation/, 'the order confirmation email update (the add-order-email script)'],
  ['Order email: the orders list reads it', 'api/orders.js', /confirmation_status/, 'the order confirmation email update (the add-order-email script)'],
  ['Order email: the Orders panel shows it', 'src/artloft/OrdersPanel.jsx', /resend_confirmation/, 'the order confirmation email update (the add-order-email script)'],
  ['Order email: the database columns file', 'sql/orders-confirmation.sql', /confirmation_status/, 'the order confirmation email update'],
  ['Posted email: the wording', 'lib/dispatchEmailText.js', /cleanTracking/, 'the posted email update'],
  ['Posted email: sending and recording', 'lib/dispatchEmail.js', /dispatchOrder/, 'the posted email update'],
  ['Posted email: the owner\'s button (server)', 'api/order-actions.js', /send_dispatch/, 'the posted email update (the add-dispatch-email script)'],
  ['Posted email: the orders list reads it', 'api/orders.js', /dispatch_status/, 'the posted email update (the add-dispatch-email script)'],
  ['Posted email: the Orders panel shows it', 'src/artloft/OrdersPanel.jsx', /send_dispatch/, 'the posted email update (the add-dispatch-email script)'],
  ['Posted email: the database columns file', 'sql/orders-dispatch.sql', /dispatch_status/, 'the posted email update'],
  ['Share pages: the table of titles and descriptions', 'src/data/pageMeta.js', /export const PAGES/, 'the share pages update'],
  ['Share pages: the writer of each page head', 'scripts/shareHead.mjs', /export function renderHead/, 'the share pages update'],
  ['Share pages: the build step', 'scripts/make-share-pages.mjs', /sitemapXml/, 'the share pages update'],
  ['Share pages: the build runs it', 'package.json', /make-share-pages/, 'the share pages update (the add-share-pages script)'],
  ['Share pages: the tab title', 'src/components/RouteTitle.jsx', /fullTitleFor/, 'the share pages update'],
  ['Share pages: the app uses the tab title', 'src/App.jsx', /<RouteTitle \/>/, 'the share pages update (the add-share-pages script)'],
  ['Share pages: a post sets its own title', 'src/pages/PostPage.jsx', /useTitle\(post/, 'the share pages update (the add-share-pages script)'],
  ['Share pages: the page shell description', 'index.html', /name="description"/, 'the share pages update (the add-share-pages script)'],
  ['Share pages: the robots file', 'public/robots.txt', /Sitemap: https:\/\/starscapesfactory\.com\/sitemap\.xml/, 'the share pages update'],
  ['Share picture: site', 'public/share/site.png', null, 'the share pages update'],
  ['Share picture: idea-hatchery', 'public/share/idea-hatchery.png', null, 'the share pages update'],
  ['Share picture: leadership-lounge', 'public/share/leadership-lounge.png', null, 'the share pages update'],
  ['Share picture: explorers-bay', 'public/share/explorers-bay.png', null, 'the share pages update'],
  ['Share picture: knowledge-nook', 'public/share/knowledge-nook.png', null, 'the share pages update'],
  ['Share picture: sarah-jrs-den', 'public/share/sarah-jrs-den.png', null, 'the share pages update'],
  ['Share picture: drafting-desk', 'public/share/drafting-desk.png', null, 'the share pages update'],
  ['Share picture: art-loft', 'public/share/art-loft.png', null, 'the share pages update'],
  ['Share picture: factory-floor', 'public/share/factory-floor.png', null, 'the share pages update'],
  ['Share previews: posts, prints and collections', 'scripts/dynamicPages.mjs', /export async function databasePages/, 'the share previews update'],
  ['Share previews: the build uses them', 'scripts/make-share-pages.mjs', /databasePages/, 'the share previews update (the add-share-posts script)'],
  ['Restyled pages: the stylesheet', 'src/styles/pages.css', /\.pg-post__body/, 'the restyled pages update'],
  ['Restyled pages: the post list', 'src/pages/Home.jsx', /pg--list/, 'the restyled pages update (the add-restyle-pages script)'],
  ['Restyled pages: a single post', 'src/pages/PostPage.jsx', /pg-post/, 'the restyled pages update (the add-restyle-pages script)'],
  ['Restyled pages: the text pages', 'src/pages/StaticPage.jsx', /pg-text/, 'the restyled pages update (the add-restyle-pages script)'],
  ['Footer: the social links come from contact.js', 'src/data/social.js', /SOCIAL_LINKS/, 'the restyled pages update (the add-restyle-pages script)'],
  ['Nook: the Research door', 'src/rooms/roomsData.js', /id: 'research'/, 'the research and bottle update (the add-research-bottle script)'],
  ['Doors: Research has its page', 'src/doors/doorsData.js', /id: 'research'[^\n]*page: \{ layout: 'list' \}/, 'the research and bottle update (the add-research-bottle script)'],
  ['Bay bottle: its own padlock', 'public/scenes/explorers-bay/item-coming-soon-open.svg', /data-lock="explorers-bay"/, 'the research and bottle update'],
  ['Footer: the links are not in white boxes', 'src/styles/site.css', /\.sf-footer nav \{/, 'the footer fix update (the add-footer-fix script)'],
  ['Footer: the social links list', 'src/components/Footer.jsx', /aria-label="Follow us"/, 'the footer label update (the add-footer-label script)'],
  ['Suggest and vote: the database file', 'sql/suggestions.sql', /suggestion_tally/, 'the suggest and ledger update'],
  ['Suggest and vote: the rules', 'src/suggest/suggestRules.js', /export function cleanSuggestion/, 'the suggest and ledger update'],
  ['Suggest and vote: the box', 'src/suggest/SuggestPanel.jsx', /Most wanted/, 'the suggest and ledger update'],
  ['Suggest and vote: the admin tool', 'src/admin/AdminSuggestions.jsx', /setSpaceOn/, 'the suggest and ledger update'],
  ['Suggest and vote: the admin route', 'src/App.jsx', /admin\/suggestions/, 'the suggest and ledger update (the add-suggest-ledger script)'],
  ['Story Ledger: the page', 'src/ledger/StoryLedgerPage.jsx', /SuggestPanel space="story-ledger"/, 'the suggest and ledger update'],
  ['Story Ledger: its door', 'src/doors/doorsData.js', /id: 'story-ledger'[^\n]*layout: 'custom'/, 'the suggest and ledger update (the add-suggest-ledger script)'],
  ['Story Ledger: its address', 'src/rooms/RoomRoutes.jsx', /CUSTOM_PAGES/, 'the suggest and ledger update (the add-suggest-ledger script)'],
  ['YouTube Series: the feed reader', 'lib/youtubeFeed.js', /export function parseFeed/, 'the ebook and YouTube update'],
  ['YouTube Series: the page', 'src/den/YouTubeSeriesPage.jsx', /youtube-nocookie/, 'the ebook and YouTube update'],
  ['YouTube Series: its door', 'src/doors/doorsData.js', /id: 'youtube-series'[^\n]*layout: 'custom'/, 'the ebook and YouTube update (the add-ebook-youtube script)'],
  ['Free Ebook: the sign-up on the server', 'lib/ebookSignup.js', /export async function handleSignup/, 'the ebook and YouTube update'],
  ['Free Ebook: the database file', 'sql/ebook-signups.sql', /enable row level security/, 'the ebook and YouTube update'],
  ['Free Ebook: the page', 'src/ebook/FreeEbookPage.jsx', /Get the free ebook/, 'the ebook and YouTube update'],
  ['Free Ebook: its door', 'src/doors/doorsData.js', /id: 'free-ebook'[^\n]*layout: 'custom'/, 'the ebook and YouTube update (the add-ebook-youtube script)'],
  ['Free Ebook and YouTube: their addresses', 'src/rooms/RoomRoutes.jsx', /FreeEbookPage/, 'the ebook and YouTube update (the add-ebook-youtube script)'],
  ['Book Club: the database file', 'sql/books.sql', /reading_goals/, 'the book club update'],
  ['Book Club: the rules', 'src/bookclub/bookRules.js', /export function cleanBook/, 'the book club update'],
  ['Book Club: the page', 'src/bookclub/BookClubPage.jsx', /COME_READ/, 'the book club update'],
  ['Book Club: the books tool', 'src/admin/AdminBooks.jsx', /saveBook/, 'the book club update'],
  ['Book Club: the admin route', 'src/App.jsx', /admin\/books/, 'the book club update (the add-book-club script)'],
  ['Book Club: its door', 'src/doors/doorsData.js', /id: 'book-club'[^\n]*layout: 'custom'/, 'the book club update (the add-book-club script)'],
  ['Book Club: its address', 'src/rooms/RoomRoutes.jsx', /BookClubPage/, 'the book club update (the add-book-club script)'],
  ['Book Club: the tool listed in Admin', 'src/admin/adminTools.js', /name: 'Books'/, 'the book club update (the add-book-club script)'],
  ['Restyle 2: the form styles', 'src/styles/forms.css', /\.fm__card/, 'the restyle part 2 update'],
  ['Restyle 2: the legacy rules', 'src/styles/legacy.css', /:where\(\.legacy\)/, 'the restyle part 2 update'],
  ['Restyle 2: the post form rules', 'src/pages/postFormRules.js', /export function postProblems/, 'the restyle part 2 update'],
  ['Restyle 2: the log in card', 'src/pages/Login.jsx', /fm__card/, 'the restyle part 2 update (the add-restyle-two script)'],
  ['Restyle 2: New post', 'src/pages/NewPost.jsx', /postProblems/, 'the restyle part 2 update (the add-restyle-two script)'],
  ['Restyle 2: the old rules are retired', 'src/index.css', /legacy\.css/, 'the restyle part 2 update (the add-restyle-two script)'],
  ['Restyle 2: the legacy rules are loaded', 'src/main.jsx', /legacy\.css/, 'the restyle part 2 update (the add-restyle-two script)'],
]

const results = CHECKS.map(([what, file, pattern, from]) => {
  if (!fs.existsSync(file)) return { what, ok: false, why: `${file} is missing`, from }
  if (!pattern) return { what, ok: true }
  const ok = pattern.test(fs.readFileSync(file, 'utf8'))
  return { what, ok, why: ok ? '' : `${file} is an older copy`, from }
})
// Every picture is checked against the exact current copy (a list of fingerprints in tools/art-manifest.json). A picture is never edited by hand,
// so any difference means an older copy has been put back.
const manifestFile = 'tools/art-manifest.json'
let pictureCount = 0
if (fs.existsSync(manifestFile)) {
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'))
  for (const [file, fingerprint] of Object.entries(manifest)) {
    pictureCount += 1
    if (!fs.existsSync(file)) {
      results.push({ what: `Picture: ${file}`, ok: false, why: 'is missing', from: 'the pictures zip (starscapes-art-current-17oct.zip)' })
      continue
    }
    const now = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 16)
    if (now !== fingerprint) results.push({ what: `Picture: ${file}`, ok: false, why: 'is not the current version', from: 'the pictures zip (starscapes-art-current-17oct.zip)' })
  }
  if (results.filter((r) => r.what.startsWith('Picture:')).length === 0) results.push({ what: `Pictures: all ${pictureCount} match the current versions`, ok: true })
}
const bad = results.filter((r) => !r.ok)
console.log('')
for (const r of results) console.log(`  ${r.ok ? 'ok     ' : 'PROBLEM'}  ${r.what}`)
console.log('')
if (bad.length === 0) {
  console.log(`All ${results.length} checks passed: your key files are the current ones.\n`)
} else {
  console.log(`${bad.length} of ${results.length} checks need attention:`)
  for (const r of bad) console.log(`  - ${r.what}: ${r.why}. It comes from ${r.from}.`)
  console.log('\nPaste this whole list to me and I will tell you exactly which zip to unpack again, and in which order.\n')
  process.exit(1)
}
