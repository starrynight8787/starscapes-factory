#!/usr/bin/env python3
"""Makes the originals page use the site's single contact address, and then lists any other place in your code that still has the old one.

Run it from the project folder:   python3 tools/switch-contact-email.py

It changes ONE file, src/artloft/originals.js (the originals page had its own copy of the address; it now reads it from src/data/contact.js,
so the address lives in one place only). Then it LOOKS, and changes nothing, at src, api, lib, public and index.html for the old address
inspire@starscapesfactory.com, and tells you each file it still finds it in, so nothing is left behind.
It is safe to run twice. If originals.js is not the way it expects, it changes nothing and says so (it still does the look).
"""
import pathlib
import sys

FILE = 'src/artloft/originals.js'
OLD = "export const ENQUIRY_EMAIL = 'inspire@starscapesfactory.com'\n"
NEW = "import { CONTACT_EMAIL } from '../data/contact'\n\n// The originals page uses the site's one contact address, so it can never drift from the others.\nexport const ENQUIRY_EMAIL = CONTACT_EMAIL\n"
OLD_ADDRESS = 'inspire@starscapesfactory.com'
LOOK_IN = ['src', 'api', 'lib', 'public', 'index.html']
TEXT = {'.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.json', '.html', '.css', '.svg', '.md', '.txt', '.sql'}

root = pathlib.Path('.')
if not (root / 'src').exists():
    print('NOT FOUND  src (run this from the project folder)')
    sys.exit(1)
if not (root / 'src/data/contact.js').exists():
    print('WARNING: src/data/contact.js is missing. Unzip the contact email zip first. Nothing changed.')
    sys.exit(1)

outcome = ''
p = root / FILE
if not p.exists():
    outcome = 'NOT FOUND  %s, so I could not change it.' % FILE
else:
    text = p.read_text(encoding='utf-8')
    if 'CONTACT_EMAIL' in text and OLD_ADDRESS not in text:
        outcome = 'already done  %s already uses the contact file' % FILE
    elif text.count(OLD) != 1:
        outcome = 'NOT CHANGED  %s: I expected to find its own copy of the address exactly once and found it %d times. Nothing was touched.' % (FILE, text.count(OLD))
    else:
        pathlib.Path(str(p) + '.before-contact').write_text(text, encoding='utf-8')
        p.write_text(text.replace(OLD, NEW, 1), encoding='utf-8')
        outcome = 'changed %s: the originals page now reads the contact address from src/data/contact.js' % FILE
print(outcome)

# look for the old address anywhere else, and only report
found = []
for entry in LOOK_IN:
    base = root / entry
    paths = [base] if base.is_file() else sorted(base.rglob('*')) if base.exists() else []
    for f in paths:
        if f.is_file() and f.suffix in TEXT and '.before-' not in f.name:
            try:
                t = f.read_text(encoding='utf-8')
            except Exception:
                continue
            n = t.count(OLD_ADDRESS)
            if n:
                found.append((str(f), n))
print()
if found:
    print('The old address %s is still in these files. Send me this list and I will tell you what to do with each:' % OLD_ADDRESS)
    for name, n in found:
        print('  %s  (%d time%s)' % (name, n, '' if n == 1 else 's'))
else:
    print('The old address is not left anywhere in src, api, lib, public or index.html.')
sys.exit(1 if outcome.startswith(('NOT CHANGED', 'NOT FOUND')) else 0)
