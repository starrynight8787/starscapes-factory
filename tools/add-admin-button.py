#!/usr/bin/env python3
"""Puts an Admin button in the site's menu (shown only to you) and an admin console page at /admin.

Run it from the project folder:   python3 tools/add-admin-button.py

It changes two files, and nothing else:
  src/components/Navbar.jsx   the menu: "New post" and "New product" (which any signed-in person could see) are replaced by one Admin
                              button that only the owner sees, on the computer menu and the phone menu
  src/App.jsx                 adds the /admin page (one import and one route, kept behind the sign-in like the New post page)
It needs the admin files to be unzipped first (src/admin/..., api/is-owner.js). It is safe to run twice. If either file is not the way it
expects, it changes NEITHER and tells you what it could not find.
"""
import pathlib
import sys

NAV = 'src/components/Navbar.jsx'
APP = 'src/App.jsx'

NAV_DESKTOP_OLD = '''                <Link to="/new" className="sf-link">
                  New post
                </Link>
                <Link to="/new-product" className="sf-link">
                  New product
                </Link>
'''
NAV_DESKTOP_NEW = '''                {isOwner && (
                  <Link to="/admin" className="sf-link sf-admin-btn">
                    Admin
                  </Link>
                )}
'''
NAV_MOBILE_OLD = '''            {session && (
              <>
                <Link to="/new" className="sf-menu__item sf-menu__item--plain" onClick={closeMenu}>
                  New post
                </Link>
                <Link to="/new-product" className="sf-menu__item sf-menu__item--plain" onClick={closeMenu}>
                  New product
                </Link>
              </>
            )}
'''
NAV_MOBILE_NEW = '''            {isOwner && (
              <Link to="/admin" className="sf-menu__item sf-menu__item--plain" onClick={closeMenu}>
                Admin
              </Link>
            )}
'''
NAV_IMPORT_ANCHOR = "import CartNavLink from '../cart/CartNavLink'\n"
NAV_IMPORT_NEW = NAV_IMPORT_ANCHOR + "import useIsOwner from '../admin/useIsOwner'\n"
NAV_HOOK_ANCHOR = 'export default function Navbar({ session }) {\n'
NAV_HOOK_NEW = NAV_HOOK_ANCHOR + '  const isOwner = useIsOwner(session)\n'

APP_IMPORT_ANCHOR = "import NewProduct from './pages/NewProduct'\n"
APP_IMPORT_NEW = APP_IMPORT_ANCHOR + "import AdminConsole from './admin/AdminConsole'\n"
APP_ROUTE_ANCHOR = '<Route path="/new-product" element={ <ProtectedRoute session={session}> <NewProduct session={session} /> </ProtectedRoute> } />\n'
APP_ROUTE_NEW = APP_ROUTE_ANCHOR + '<Route path="/admin" element={ <ProtectedRoute session={session}> <AdminConsole session={session} /> </ProtectedRoute> } />\n'


def read(path):
    p = pathlib.Path(path)
    if not p.exists():
        print('NOT FOUND  %s (run this from the project folder)' % path)
        sys.exit(1)
    return p.read_text(encoding='utf-8')


for needed in ('src/admin/AdminConsole.jsx', 'src/admin/useIsOwner.js', 'src/admin/adminTools.js', 'api/is-owner.js'):
    if not pathlib.Path(needed).exists():
        print('WARNING: %s is missing. Unzip the admin zip first. Nothing changed.' % needed)
        sys.exit(1)

nav = read(NAV)
app = read(APP)
nav_done = 'useIsOwner' in nav
app_done = '<Route path="/admin"' in app
if nav_done and app_done:
    print('already done  the Admin button and the /admin page are both in')
    sys.exit(0)


def expect_once(text, old, where, label):
    if text.count(old) != 1:
        print('NOT CHANGED  nothing was touched. In %s I expected to find %s exactly once and found it %d times.' % (where, label, text.count(old)))
        sys.exit(1)


if not nav_done:
    expect_once(nav, NAV_IMPORT_ANCHOR, NAV, 'the CartNavLink import')
    expect_once(nav, NAV_HOOK_ANCHOR, NAV, 'the start of the Navbar')
    expect_once(nav, NAV_DESKTOP_OLD, NAV, 'the New post and New product links on the computer menu')
    expect_once(nav, NAV_MOBILE_OLD, NAV, 'the New post and New product links on the phone menu')
if not app_done:
    expect_once(app, APP_IMPORT_ANCHOR, APP, 'the NewProduct import')
    expect_once(app, APP_ROUTE_ANCHOR, APP, 'the /new-product route')

changed = []
if not nav_done:
    nav = nav.replace(NAV_IMPORT_ANCHOR, NAV_IMPORT_NEW, 1).replace(NAV_HOOK_ANCHOR, NAV_HOOK_NEW, 1)
    nav = nav.replace(NAV_DESKTOP_OLD, NAV_DESKTOP_NEW, 1).replace(NAV_MOBILE_OLD, NAV_MOBILE_NEW, 1)
    pathlib.Path(NAV + '.before-admin').write_text(read(NAV), encoding='utf-8')
    pathlib.Path(NAV).write_text(nav, encoding='utf-8')
    changed.append('%s: the Admin button replaces New post and New product (computer and phone menus)' % NAV)
if not app_done:
    app = app.replace(APP_IMPORT_ANCHOR, APP_IMPORT_NEW, 1).replace(APP_ROUTE_ANCHOR, APP_ROUTE_NEW, 1)
    pathlib.Path(APP + '.before-admin').write_text(read(APP), encoding='utf-8')
    pathlib.Path(APP).write_text(app, encoding='utf-8')
    changed.append('%s: the /admin page' % APP)

print('Done.')
for line in changed:
    print('  ' + line)
