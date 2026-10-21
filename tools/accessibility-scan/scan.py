#!/usr/bin/env python3
"""Scan the site for accessibility problems with axe, in a real browser. See README.md in this folder.

    python3 tools/accessibility-scan/scan.py desktop            # every kind of page, as a first-time visitor sees it ("nothing yet" states)
    python3 tools/accessibility-scan/scan.py mobile content     # pages that show real content, using sample posts and products
    python3 tools/accessibility-scan/scan.py desktop empty http://localhost:4177   # a different address

It stands in for the database (Supabase) and blocks every other outside address, so it never touches real data or sends anything anywhere.
Exit code 0 = no problems found, 1 = problems found, 2 = a page could not be scanned.
"""
import json, os, sys, tempfile, urllib.parse
from pathlib import Path
from playwright.sync_api import sync_playwright

VIEW = sys.argv[1] if len(sys.argv) > 1 else 'desktop'
SET = sys.argv[2] if len(sys.argv) > 2 else 'empty'
BASE = (sys.argv[3] if len(sys.argv) > 3 else 'http://localhost:4177').rstrip('/')
SIZE = {'desktop': {'width': 1280, 'height': 900}, 'mobile': {'width': 390, 'height': 844}}[VIEW]
ROOT = Path(__file__).resolve().parents[2]
AXE = (ROOT / 'node_modules' / 'axe-core' / 'axe.min.js')
if not AXE.exists(): sys.exit('axe-core is missing. In the project folder run:  npm install --no-save axe-core')
AXE = AXE.read_text()
TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']

TOKEN = 'ab' * 24
EMPTY_PAGES = ['/', '/blog', '/channel/factory-floor', '/page/about', '/page/contact', '/page/delivery', '/page/terms', '/page/privacy', '/page/returns', '/page/ai-policy', '/page/cookies', '/page/accessibility',
               '/testers', '/membership', '/membership/passes', '/products', '/login', '/signup', '/forgot-password', '/reset-password', '/cart', '/checkout/success',
               '/art-loft', '/art-loft/prints', '/factory-floor', '/drafting-desk', '/idea-hatchery', '/leadership-lounge', '/explorers-bay', '/knowledge-nook', '/sarah-jrs-den',
               '/idea-hatchery/stop-motion', '/leadership-lounge/free-ebook', '/knowledge-nook/book-club', '/sarah-jrs-den/youtube-series', f'/newsletter/confirm?t={TOKEN}', f'/newsletter/unsubscribe?t={TOKEN}', '/definitely-not-a-page']
PID = '11111111-1111-4111-8111-111111111111'; PRID = '22222222-2222-4222-8222-222222222222'
CONTENT_PAGES = ['/blog', f'/post/{PID}', '/channel/factory-floor', '/channel/art-loft', '/channel/drafting-desk', '/products', f'/products/{PRID}', '/products?collection=Nature', '/drafting-desk/archive-entries',
                 '/drafting-desk/poems', '/art-loft/prints', '/factory-floor', '/leadership-lounge/blog', '/leadership-lounge/leading-from-the-middle']
URLS = EMPTY_PAGES if SET == 'empty' else CONTENT_PAGES

IMG = 'data:image/svg+xml;utf8,' + urllib.parse.quote("<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'><rect width='600' height='400' fill='#2e8fd0'/></svg>")
BODY = '## A heading inside the post\n\nSome **bold** words, some *italic* words and a [link to somewhere](https://example.com).\n\n- first point\n- second point\n\n> A quotation, set apart.\n\n1. one\n2. two\n\n![](' + IMG + ')\n'
def post(i, ch, img=True, tags=None):
    return {'id': PID if i == 0 else f'11111111-1111-4111-8111-11111111111{i}', 'title': f'Sample post number {i + 1}: a title long enough to wrap onto two lines on a phone', 'content': BODY, 'image_url': IMG if img else None,
            'tags': tags or ['build-diary'], 'channel': ch, 'created_at': '2026-10-1%dT10:00:00Z' % (i + 1), 'author_id': 'owner-1', 'pass': None, 'published': True}
POSTS = [post(0, 'factory-floor'), post(1, 'factory-floor', False), post(2, 'art-loft'), post(3, 'drafting-desk', True, ['archive-entries']), post(4, 'drafting-desk', False, ['poems'])]
PRODUCTS = [{'id': PRID, 'title': 'Moon Garden print', 'price': 35, 'images': [IMG, IMG], 'collection': 'Nature', 'description': 'A calm, quiet print for a bedroom wall.'},
            {'id': '22222222-2222-4222-8222-222222222223', 'title': 'Harbour Lights print', 'price': 42.5, 'images': [IMG], 'collection': 'Places', 'description': 'Evening on the water.'}]

def handle(route):
    req = route.request; u = req.url
    if 'supabase.co' in u and req.method == 'GET' and '/rest/v1/' in u:
        single = 'pgrst.object' in (req.headers.get('accept') or '')
        if SET == 'content' and '/rest/v1/posts' in u: data = POSTS[0] if single else POSTS
        elif SET == 'content' and '/rest/v1/products' in u: data = PRODUCTS[0] if single else PRODUCTS
        else: data = None if single else []
        return route.fulfill(status=200 if data is not None else 406, content_type='application/json', body=json.dumps(data) if data is not None else '{}')
    if u.startswith(BASE) or u.startswith('data:'): return route.continue_()
    return route.abort()

found = 0; errors = 0; results = {}
with sync_playwright() as p:
    browser = p.chromium.launch(); page = browser.new_context(viewport=SIZE).new_page(); page.route('**/*', handle)
    for url in URLS:
        try:
            page.goto(BASE + url, wait_until='domcontentloaded', timeout=20000); page.wait_for_timeout(2000); page.evaluate(AXE)
            res = page.evaluate("(tags) => axe.run(document, { runOnly: { type: 'tag', values: tags } })", TAGS)
            bad = [{'rule': v['id'], 'impact': v['impact'], 'help': v['help'], 'places': len(v['nodes']), 'example': ' '.join(map(str, v['nodes'][0]['target'])), 'html': v['nodes'][0]['html'][:160], 'why': (v['nodes'][0].get('failureSummary') or '')[:200]} for v in res['violations']]
            results[url] = bad; found += sum(b['places'] for b in bad)
            print(f"{'OK  ' if not bad else 'FAIL'} {url[:60]:62} {len(bad)} problem(s)")
            for b in bad: print(f"       {b['impact']:8} {b['rule']}: {b['help']} ({b['places']} place(s))\n         {b['example']}\n         {b['html']}\n         {b['why'].replace(chr(10), ' | ')}")
        except Exception as e:
            errors += 1; print(f"ERR  {url[:60]:62} {str(e)[:100]}")
    browser.close()
out = Path(tempfile.gettempdir()) / f'accessibility-scan-{VIEW}-{SET}.json'; out.write_text(json.dumps(results, indent=1))
print(f"\n{VIEW}, {SET}: {len(URLS)} pages, {found} problem place(s), {errors} page(s) not scanned. Details: {out}")
sys.exit(2 if errors else (1 if found else 0))
