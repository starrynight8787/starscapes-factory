#!/usr/bin/env python3
"""Builds the newsletter: a sign-up box (hidden until you open it), confirm and unsubscribe pages, and an admin page to write, preview, test and send newsletters through Resend to the people who confirmed. The list is kept in your own database.

Run it from the project folder, AFTER unzipping starscapes-newsletter-20oct.zip into it:   python3 tools/add-newsletter.py

What it does: it makes exact edits to seven files that already exist (the ebook sign-up function, the admin server hand-off, the app's routes, the admin tile icons, the admin tool list, the footer and the page titles) and adds thirteen new files from the zip (the unzip itself also adds six tests).
  api/ebook-signup.js, lib/membershipAdmin.js, src/App.jsx, src/admin/AdminConsole.jsx, src/admin/adminTools.js, src/components/Footer.jsx, src/data/pageMeta.js

How it keeps you safe:
  - It checks ALL 7 files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-newsletter.
  - It is safe to run twice: a file already done is left alone.
  - The new files (INSTALL-NEWSLETTER.txt, sql/newsletter.sql, lib/newsletter.js, lib/newsletterAdmin.js, src/newsletter/newsletterRules.js, src/newsletter/newsletterApi.js, src/newsletter/NewsletterSignup.jsx, src/newsletter/NewsletterLinkPage.jsx, src/newsletter/newsletter.css, src/admin/AdminNewsletter.jsx, src/admin/newsletterAdminApi.js, src/admin/newsletterAdminRules.js, src/admin/adminnewsletter.css) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"api/ebook-signup.js": [
[
"import { handleSignup } from '../lib/ebookSignup.js'\n\nexport default async function handler(req, res) {\n  res.setHeader('Cache-Control', 'no-store')\n  if (req.method !== 'POST') return res.status(405).json({ ok: false })\n",
"import { handleSignup } from '../lib/ebookSignup.js'\nimport { handleNewsletter } from '../lib/newsletter.js'\n\nexport default async function handler(req, res) {\n  res.setHeader('Cache-Control', 'no-store')\n  // The newsletter (sign up, confirm, unsubscribe) is handled in lib/newsletter.js: this is the only public function it can use, because the free Vercel plan allows 12\n  if (req.query && req.query.newsletter) return handleNewsletter(req, res)\n  if (req.method !== 'POST') return res.status(405).json({ ok: false })\n"
]
],
"lib/membershipAdmin.js": [
[
"import { handlePromotions } from './promotionsAdmin.js'\nimport { cleanPassIds } from '../src/membership/passes.js'\n",
"import { handlePromotions } from './promotionsAdmin.js'\nimport { handleNewsletterAdmin } from './newsletterAdmin.js'\nimport { cleanPassIds } from '../src/membership/passes.js'\n"
],
[
"  if (clean(req.query && req.query.admin) === 'promotions') return handlePromotions(req, res) // codes can be made as well as looked at\n  if (req.method !== 'GET') {\n",
"  if (clean(req.query && req.query.admin) === 'promotions') return handlePromotions(req, res) // codes can be made as well as looked at\n  if (clean(req.query && req.query.admin) === 'newsletter') return handleNewsletterAdmin(req, res, who) // the newsletter can be written and sent as well as looked at\n  if (req.method !== 'GET') {\n"
]
],
"src/App.jsx": [
[
"import AdminBooks from './admin/AdminBooks'\nimport AdminStories from './admin/AdminStories'\n",
"import AdminBooks from './admin/AdminBooks'\nimport AdminNewsletter from './admin/AdminNewsletter'\nimport { NewsletterConfirmPage, NewsletterUnsubscribePage } from './newsletter/NewsletterLinkPage'\nimport AdminStories from './admin/AdminStories'\n"
],
[
"<Route path=\"/membership\" element={<MembershipPage owner={owner} session={session} />} />\n<Route path=\"/membership/welcome\" element={ <ProtectedRoute session={session}> <WelcomePage /> </ProtectedRoute> } />\n",
"<Route path=\"/membership\" element={<MembershipPage owner={owner} session={session} />} />\n<Route path=\"/newsletter/confirm\" element={<NewsletterConfirmPage />} />\n<Route path=\"/newsletter/unsubscribe\" element={<NewsletterUnsubscribePage />} />\n<Route path=\"/membership/welcome\" element={ <ProtectedRoute session={session}> <WelcomePage /> </ProtectedRoute> } />\n"
],
[
"<Route path=\"/admin/books\" element={ <ProtectedRoute session={session}> <AdminBooks session={session} /> </ProtectedRoute> } />\n<Route path=\"/admin/stories\" element={ <ProtectedRoute session={session}> <AdminStories session={session} /> </ProtectedRoute> } />\n",
"<Route path=\"/admin/books\" element={ <ProtectedRoute session={session}> <AdminBooks session={session} /> </ProtectedRoute> } />\n<Route path=\"/admin/newsletter\" element={ <ProtectedRoute session={session}> <AdminNewsletter session={session} /> </ProtectedRoute> } />\n<Route path=\"/admin/stories\" element={ <ProtectedRoute session={session}> <AdminStories session={session} /> </ProtectedRoute> } />\n"
]
],
"src/admin/AdminConsole.jsx": [
[
"  post: <><path d=\"M4 20h4l11-11-4-4L4 16z\" /><path d=\"M13 7l4 4\" /></>,\n  product: <><path d=\"M5 8h14l-1 12H6z\" /><path d=\"M9 8a3 3 0 0 1 6 0\" /></>,\n",
"  post: <><path d=\"M4 20h4l11-11-4-4L4 16z\" /><path d=\"M13 7l4 4\" /></>,\n  newsletter: <><rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\" /><path d=\"M3 7l9 6 9-6\" /></>,\n  product: <><path d=\"M5 8h14l-1 12H6z\" /><path d=\"M9 8a3 3 0 0 1 6 0\" /></>,\n"
]
],
"src/admin/adminTools.js": [
[
"  { group: 'Write', name: 'New post', to: '/new', blurb: 'Write a post and publish it.', icon: 'post' },\n  { group: 'Shop', name: 'New product', to: '/new-product', blurb: 'Add a product by hand. Prints come from Creative Hub, so this is for anything else.', icon: 'product' },\n",
"  { group: 'Write', name: 'New post', to: '/new', blurb: 'Write a post and publish it.', icon: 'post' },\n  { group: 'Write', name: 'Newsletter', to: '/admin/newsletter', blurb: 'Write a newsletter, send it to the people who have confirmed, and see who is signed up.', icon: 'newsletter' },\n  { group: 'Shop', name: 'New product', to: '/new-product', blurb: 'Add a product by hand. Prints come from Creative Hub, so this is for anything else.', icon: 'product' },\n"
]
],
"src/components/Footer.jsx": [
[
"import { companyLine, printerLine } from '../data/company'\nimport '../styles/site.css'\n",
"import { companyLine, printerLine } from '../data/company'\nimport NewsletterSignup from '../newsletter/NewsletterSignup'\nimport '../styles/site.css'\n"
],
[
"        </div>\n        <hr />\n",
"        </div>\n        <NewsletterSignup />\n        <hr />\n"
]
],
"src/data/pageMeta.js": [
[
"  '/admin/home': { title: 'Home page tool', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/admin/posts': { title: 'All posts', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n",
"  '/admin/home': { title: 'Home page tool', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/admin/newsletter': { title: 'Newsletter', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n  '/newsletter/confirm': { title: 'Confirm your subscription', description: 'Confirm that you would like the Starscapes Factory newsletter.', image: 'site', index: false, client: true },\n  '/newsletter/unsubscribe': { title: 'Unsubscribe', description: 'Stop the Starscapes Factory newsletter.', image: 'site', index: false, client: true },\n  '/admin/posts': { title: 'All posts', description: 'The shop owner\\u2019s page.', image: 'site', index: false },\n"
]
]
}''')
NEW_FILES = ["INSTALL-NEWSLETTER.txt", "sql/newsletter.sql", "lib/newsletter.js", "lib/newsletterAdmin.js", "src/newsletter/newsletterRules.js", "src/newsletter/newsletterApi.js", "src/newsletter/NewsletterSignup.jsx", "src/newsletter/NewsletterLinkPage.jsx", "src/newsletter/newsletter.css", "src/admin/AdminNewsletter.jsx", "src/admin/newsletterAdminApi.js", "src/admin/newsletterAdminRules.js", "src/admin/adminnewsletter.css"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
NEEDS_FIRST = ["lib/promotionsAdmin.js", "lib/membershipAdmin.js", "lib/ebookSignup.js", "src/components/Footer.jsx"]
not_first = [f for f in NEEDS_FIRST if not (root / f).exists()]
if not_first:
    print('Install the Passes and members and Promotions packages first. These files are missing: ' + ', '.join(not_first) + '. Nothing was changed.')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-newsletter-20oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
    sys.exit(1)


def splice(text, pairs):
    spans = []
    for old, new in pairs:
        spans.append((text.find(old), old, new))
    spans.sort()
    out, pos = [], 0
    for index, old, new in spans:
        out.append(text[pos:index])
        out.append(new)
        pos = index + len(old)
    out.append(text[pos:])
    return ''.join(out)


plan, problems, done = {}, [], []
for rel, pairs in PATCH.items():
    p = root / rel
    if not p.exists():
        problems.append('%s is missing' % rel)
        continue
    text = p.read_text(encoding='utf-8')
    # each edit is either already in the file, still to do (its "before" text is there exactly once), or neither (not the file expected)
    def state(old, new):
        # an edit that only ADDS text contains its "before" inside its "after"; one that only REMOVES text has its "after" inside its "before"
        if old in text and not (old in new and new in text):
            return 'todo' if text.count(old) == 1 else 'bad'
        return 'done' if new in text else 'bad'
    states = [state(old, new) for old, new in pairs]
    if all(s == 'done' for s in states):
        done.append(rel)
    elif all(s == 'todo' for s in states):
        spans = sorted((text.find(old), text.find(old) + len(old)) for old, new in pairs)
        if any(a2 > b1 for (a1, a2), (b1, b2) in zip(spans, spans[1:])):
            problems.append('%s: the edits would overlap, so it is not the file I expected' % rel)
        else:
            plan[rel] = (text, splice(text, pairs))
    else:
        problems.append('%s is not the way I expected (it may have been changed since the last update)' % rel)

if problems:
    print('NOTHING WAS CHANGED, because:')
    for line in problems:
        print('  - ' + line)
    print('Paste this to me and I will tell you what to do.')
    sys.exit(1)

for rel, (before, after) in plan.items():
    p = root / rel
    pathlib.Path(str(p) + '.before-newsletter').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
