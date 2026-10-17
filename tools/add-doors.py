#!/usr/bin/env python3
"""Adds the "Open a door" page to the admin console's routes.

Run it from the project folder:   python3 tools/add-doors.py

It changes ONE file, src/App.jsx: one import and one route (/admin/doors), kept behind the sign-in like the rest of the admin pages.
It needs the doors files to be unzipped first, and the admin console from the admin update to be in already.
It is safe to run twice. If App.jsx is not the way it expects, it changes nothing and tells you what it could not find.
"""
import pathlib
import sys

APP = 'src/App.jsx'
IMPORT_ANCHOR = "import AdminConsole from './admin/AdminConsole'\n"
IMPORT_NEW = IMPORT_ANCHOR + "import OpenDoors from './admin/OpenDoors'\n"
ROUTE_ANCHOR = '<Route path="/admin" element={ <ProtectedRoute session={session}> <AdminConsole session={session} /> </ProtectedRoute> } />\n'
ROUTE_NEW = ROUTE_ANCHOR + '<Route path="/admin/doors" element={ <ProtectedRoute session={session}> <OpenDoors session={session} /> </ProtectedRoute> } />\n'

p = pathlib.Path(APP)
if not p.exists():
    print('NOT FOUND  %s (run this from the project folder)' % APP)
    sys.exit(1)
for needed in ('src/admin/OpenDoors.jsx', 'src/doors/doorsData.js', 'src/doors/DoorGate.jsx', 'src/doors/useDoors.js'):
    if not pathlib.Path(needed).exists():
        print('WARNING: %s is missing. Unzip the doors zip first. Nothing changed.' % needed)
        sys.exit(1)
text = p.read_text(encoding='utf-8')
if '<Route path="/admin/doors"' in text:
    print('already done  the Open a door page is already in')
    sys.exit(0)
for anchor, label in ((IMPORT_ANCHOR, 'the AdminConsole import'), (ROUTE_ANCHOR, 'the /admin route')):
    if text.count(anchor) != 1:
        print('NOT CHANGED  nothing was touched. In %s I expected to find %s exactly once and found it %d times. Has the admin update been installed?' % (APP, label, text.count(anchor)))
        sys.exit(1)
pathlib.Path(APP + '.before-doors').write_text(text, encoding='utf-8')
text = text.replace(IMPORT_ANCHOR, IMPORT_NEW, 1).replace(ROUTE_ANCHOR, ROUTE_NEW, 1)
p.write_text(text, encoding='utf-8')
print('Done.')
print('  %s: the /admin/doors page' % APP)
