#!/usr/bin/env python3
"""
PUBLISH THE FIVE LEGAL PAGES (SFW-186). Run it ONLY when Gill has read and approved the pages.

  python3 tools/publish-legal-pages.py --check          shows where things stand and CHANGES NOTHING
  python3 tools/publish-legal-pages.py                  publishes, dated TODAY (the date on this computer)
  python3 tools/publish-legal-pages.py "24 October 2026"   publishes with a date you choose

What publishing changes (and nothing else):
  1. src/data/legalPages.js: for each of the five pages (Terms, Privacy, Returns and refunds, AI policy, Cookie policy)
     "ready": false  becomes  "ready": true   and   "updated": "[date]"  becomes the real date.
     Ready pages are shown to every visitor and linked from the footer; until then only the owner sees them, as drafts.
  2. src/cart/beforeYouPay.js: LEGAL_PAGES_PUBLISHED = false  becomes  = true.
     That lets REAL payments through the checkout (the Terms tick box points at these pages); a test fails if the two disagree.
Nothing is written unless EVERYTHING is in the expected state, so it can never leave the site half-published. Safe to run twice.
"""
import datetime
import pathlib
import re
import sys

root = pathlib.Path(__file__).resolve().parent.parent
LEGAL = root / 'src' / 'data' / 'legalPages.js'
RAIL = root / 'src' / 'cart' / 'beforeYouPay.js'
PAGES = 5
DATE_OK = re.compile(r'^[1-9][0-9]? (January|February|March|April|May|June|July|August|September|October|November|December) 20[0-9]{2}$')
FLAG_FALSE = 'export const LEGAL_PAGES_PUBLISHED = false'
FLAG_TRUE = 'export const LEGAL_PAGES_PUBLISHED = true'


def stop(message):
    print('\nNOTHING WAS CHANGED.\n' + message)
    sys.exit(1)


args = [a for a in sys.argv[1:]]
check_only = '--check' in args
args = [a for a in args if a != '--check']
if len(args) > 1:
    stop('Give at most one thing: a date in the form "24 October 2026" (or nothing, to use today).')
today = datetime.date.today()
date = args[0] if args else f'{today.day} {today.strftime("%B")} {today.year}'
if not DATE_OK.match(date):
    stop(f'"{date}" is not a date in the form "24 October 2026" (day, full month name, year).')

for f in (LEGAL, RAIL):
    if not f.exists():
        stop(f'{f.relative_to(root)} is missing: run this from the project folder, after "git pull".')
legal, rail = LEGAL.read_text(encoding='utf-8'), RAIL.read_text(encoding='utf-8')

slugs = re.findall(r'"slug": "([a-z-]+)"', legal)
n_false, n_true = len(re.findall(r'"ready": false', legal)), len(re.findall(r'"ready": true', legal))
n_gap = len(re.findall(r'"updated": "\[date\]"', legal))
n_dated = PAGES - n_gap if n_gap <= PAGES else 0
flag_false, flag_true = FLAG_FALSE in rail, FLAG_TRUE in rail

draft = len(slugs) == PAGES and n_false == PAGES and n_true == 0 and n_gap == PAGES and flag_false
published = len(slugs) == PAGES and n_true == PAGES and n_false == 0 and n_gap == 0 and flag_true
state = 'NOT PUBLISHED (all five are drafts)' if draft else 'PUBLISHED' if published else 'HALF-WAY (this should never happen)'

print('The five legal pages: ' + (', '.join(slugs) if slugs else '(none found)'))
print(f'  ready: {n_true} of {PAGES}   still showing [date]: {n_gap}   checkout rail LEGAL_PAGES_PUBLISHED: {"true" if flag_true else "false" if flag_false else "not found"}')
print(f'  STATE: {state}')

if check_only:
    if draft:
        print(f'\nIf you publish now it would be dated: {date}\nNothing was changed (--check).')
    sys.exit(0 if (draft or published) else 1)
if published:
    print('\nAlready published: nothing to do.')
    sys.exit(0)
if not draft:
    stop('The pages are not all in the same state, so it is not safe to continue. Paste the lines above to Claude.')

new_legal = legal.replace('"ready": false', '"ready": true').replace('"updated": "[date]"', f'"updated": "{date}"')
new_rail = rail.replace(FLAG_FALSE, FLAG_TRUE)
if new_legal.count('"ready": true') != PAGES or new_legal.count('[date]') != legal.count('[date]') - PAGES or new_rail.count(FLAG_TRUE) != 1:
    stop('The result did not look right, so nothing was written. Paste the lines above to Claude.')
LEGAL.write_text(new_legal, encoding='utf-8')
RAIL.write_text(new_rail, encoding='utf-8')
print(f'\nPublished, dated {date}: the five pages are ready and the checkout rail is open.')
print('NEXT: npm test, then npm run build, then a branch and a preview, and LOOK at the pages as a stranger (a private window) before you merge.')
