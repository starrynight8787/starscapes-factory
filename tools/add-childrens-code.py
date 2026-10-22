#!/usr/bin/env python3
"""Applies the Children's Code changes for Sarah Junior's Clubhouse: hides the newsletter box on its pages, adds the promise card, adds grown-ups wording to every email form and the sign-up page, and rewrites Privacy section 12. The four new files are only put in place if every edit succeeds.

Run it from the project folder, AFTER unzipping starscapes-childrens-code-22oct.zip into it:   python3 tools/add-childrens-code.py

What it does: it makes exact edits to 10 files and, only if all succeed, puts four new files in place.
  src/components/Footer.jsx, src/data/legalPages.js, src/den/YouTubeSeriesPage.jsx, src/ebook/FreeEbookPage.jsx, src/explorers/RequestForm.jsx, src/newsletter/NewsletterSignup.jsx, src/pages/Signup.jsx, src/rooms/RoomHome.jsx, test/newsletter-free.test.jsx, test/newsletter-pages.test.jsx

How it keeps you safe:
  - It checks ALL 10 files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-childrens-code.
  - It is safe to run twice: a file already done is left alone.
  - The new files (INSTALL-CHILDRENS-CODE.txt, tools/childrens-code-files/src_components_ClubhouseNote.jsx.staged, tools/childrens-code-files/src_components_clubhousenote.css.staged, tools/childrens-code-files/src_data_children.js.staged, tools/childrens-code-files/test_children-code.test.jsx.staged) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{"src/components/Footer.jsx": [["import { Link } from 'react-router-dom'\nimport Logo from './Logo'\n", "import { Link, useLocation } from 'react-router-dom'\nimport Logo from './Logo'\n"], ["import NewsletterSignup from '../newsletter/NewsletterSignup'\nimport '../styles/site.css'\n", "import NewsletterSignup from '../newsletter/NewsletterSignup'\nimport { onClubhouse } from '../data/children'\nimport '../styles/site.css'\n"], ["export default function Footer({ social = socialLinks, owner = false }) {\n  const follow = social.filter((s) => s.url && s.url.trim())\n", "export default function Footer({ social = socialLinks, owner = false }) {\n  const { pathname } = useLocation()\n  const follow = social.filter((s) => s.url && s.url.trim())\n"], ["                  ))}\n                </ul>\n              </nav>\n            )}\n          </div>\n        </div>\n        <NewsletterSignup />\n        <hr />\n", "                  ))}\n                </ul>\n              </nav>\n            )}\n          </div>\n        </div>\n        {!onClubhouse(pathname) && <NewsletterSignup />}\n        <hr />\n"]], "src/data/legalPages.js": [["        \"paragraphs\": [\n          \"This shop is for adults. We don't knowingly collect information about children. If you think we have, please tell us and we will delete it.\"\n        ]\n", "        \"paragraphs\": [\n          \"The shop, accounts and passes are for adults. You must be 18 or over to create an account, buy passes, or sign up to our emails.\",\n          \"Sarah Junior's Clubhouse is for children, and we look after it with extra care. A child doesn't need an account, and the Clubhouse doesn't ask them for their name, their email address or anything else. It uses no advertising, no analytics and no tracking, and the newsletter sign-up box is not shown there. A video only loads from YouTube when it is pressed, and then through YouTube's privacy-enhanced player. The only thing we can see from a visit is the ordinary technical record that every website keeps to stay secure, such as an IP address, kept only as long as needed.\",\n          \"We don't knowingly collect information about children. If you think we have collected your child's information, please tell us at [{{CONTACT_EMAIL}}](mailto:{{CONTACT_EMAIL}}) and we will delete it. We looked at the Information Commissioner's Children's Code for the Clubhouse and wrote down our reasons.\"\n        ]\n"]], "src/den/YouTubeSeriesPage.jsx": [["import PageBanner from '../components/PageBanner'\nimport { SOCIAL_LINKS } from '../data/contact'\n", "import PageBanner from '../components/PageBanner'\nimport ClubhouseNote from '../components/ClubhouseNote'\nimport { SOCIAL_LINKS } from '../data/contact'\n"], ["            {channel && <a className=\"pg-btn\" href={channel} target=\"_blank\" rel=\"noopener noreferrer\" aria-label=\"See all videos on YouTube (opens in a new tab)\">See all videos on YouTube ↗</a>}\n          </div>\n        </section>\n      )}\n    </main>\n", "            {channel && <a className=\"pg-btn\" href={channel} target=\"_blank\" rel=\"noopener noreferrer\" aria-label=\"See all videos on YouTube (opens in a new tab)\">See all videos on YouTube ↗</a>}\n          </div>\n        </section>\n      )}\n      <ClubhouseNote />\n    </main>\n"]], "src/ebook/FreeEbookPage.jsx": [["import { OPTIONAL_NEWSLETTER_TEXT } from '../newsletter/newsletterRules'\nimport '../rooms/roompages.css'\nimport '../styles/pages.css'\nimport './ebook.css'\nimport './ebookv2.css'\n\n", "import { OPTIONAL_NEWSLETTER_TEXT } from '../newsletter/newsletterRules'\nimport '../rooms/roompages.css'\nimport '../styles/pages.css'\nimport './ebook.css'\nimport './ebookv2.css'\nimport { GROWN_UPS_NOTE } from '../data/children'\n\n"], ["            <button type=\"submit\" className=\"pg-btn sg-btn--primary eb__submit\" disabled={saving}>{saving ? 'Sending…' : 'Get the free ebook'}</button>\n            <p className=\"eb__small\">{EBOOK.smallPrint} See our <Link to=\"/page/privacy\">Privacy policy</Link>.</p>\n", "            <button type=\"submit\" className=\"pg-btn sg-btn--primary eb__submit\" disabled={saving}>{saving ? 'Sending…' : 'Get the free ebook'}</button>\n            <p className=\"eb__small\">{GROWN_UPS_NOTE}</p>\n            <p className=\"eb__small\">{EBOOK.smallPrint} See our <Link to=\"/page/privacy\">Privacy policy</Link>.</p>\n"]], "src/explorers/RequestForm.jsx": [["import { OPTIONAL_NEWSLETTER_TEXT } from '../newsletter/newsletterRules'\nimport '../ebook/ebook.css'\nimport '../ebook/ebookv2.css'\n\n", "import { OPTIONAL_NEWSLETTER_TEXT } from '../newsletter/newsletterRules'\nimport '../ebook/ebook.css'\nimport '../ebook/ebookv2.css'\nimport { GROWN_UPS_NOTE } from '../data/children'\n\n"], ["      <button type=\"submit\" className=\"pg-btn sg-btn--primary eb__submit\" disabled={saving}>{saving ? 'Sending…' : button}</button>\n      <p className=\"eb__small\">{smallPrint} See our <Link to=\"/page/privacy\">Privacy policy</Link>.</p>\n", "      <button type=\"submit\" className=\"pg-btn sg-btn--primary eb__submit\" disabled={saving}>{saving ? 'Sending…' : button}</button>\n      <p className=\"eb__small\">{GROWN_UPS_NOTE}</p>\n      <p className=\"eb__small\">{smallPrint} See our <Link to=\"/page/privacy\">Privacy policy</Link>.</p>\n"]], "src/newsletter/NewsletterSignup.jsx": [["import { CONSENT_TEXT, cleanSubscribe } from './newsletterRules'\nimport { fetchOpen, subscribe } from './newsletterApi'\n", "import { CONSENT_TEXT, cleanSubscribe } from './newsletterRules'\nimport { GROWN_UPS_NOTE } from '../data/children'\nimport { fetchOpen, subscribe } from './newsletterApi'\n"], ["      <p className=\"nl-signup__text\">Free, with no account or pass needed. New posts and news from Starscapes Factory, by email.</p>\n      <form className=\"nl-signup__form\" onSubmit={submit} noValidate>\n", "      <p className=\"nl-signup__text\">Free, with no account or pass needed. New posts and news from Starscapes Factory, by email.</p>\n      <p className=\"nl-signup__text\">{GROWN_UPS_NOTE}</p>\n      <form className=\"nl-signup__form\" onSubmit={submit} noValidate>\n"]], "src/pages/Signup.jsx": [["import CaptchaCheck, { captchaOn } from '../components/CaptchaCheck'\n\n", "import CaptchaCheck, { captchaOn } from '../components/CaptchaCheck'\nimport { ACCOUNT_AGE_NOTE } from '../data/children'\n\n"], ["      <p className=\"fm__sub\">So you can follow along, and keep your orders in one place.</p>\n      <ErrorSummary errors={summary} />\n", "      <p className=\"fm__sub\">So you can follow along, and keep your orders in one place.</p>\n      <p className=\"fm__small\">{ACCOUNT_AGE_NOTE}</p>\n      <ErrorSummary errors={summary} />\n"]], "src/rooms/RoomHome.jsx": [["import { applyDoors } from '../doors/applyDoors'\n\n// A room's front page: its illustrated scene, with a door to each area. A door the owner has opened shows as open, with a link to its page.\nexport default function RoomHome({ room }) {\n  useTitle(ROOMS[room].name)\n  const { isOpen } = useDoors()\n  return <RoomScene scene={applyDoors(buildRoomScene(room), room, isOpen)} />\n}\n", "import { applyDoors } from '../doors/applyDoors'\nimport ClubhouseNote from '../components/ClubhouseNote'\nimport { CLUBHOUSE_ROOM } from '../data/children'\n\n// A room's front page: its illustrated scene, with a door to each area. A door the owner has opened shows as open, with a link to its page.\nexport default function RoomHome({ room }) {\n  useTitle(ROOMS[room].name)\n  const { isOpen } = useDoors()\n  return (\n    <>\n      <RoomScene scene={applyDoors(buildRoomScene(room), room, isOpen)} />\n      {room === CLUBHOUSE_ROOM && <ClubhouseNote />}\n    </>\n  )\n}\n"]], "test/newsletter-free.test.jsx": [["  })\n  it('the box sits in the footer on its own, with no condition about being signed in or holding a pass', () => {\n    const footer = read('src/components/Footer.jsx'); expect(footer).toMatch(/\\n\\s*<NewsletterSignup \\/>\\n/); expect(footer).not.toMatch(/(&&|\\?)\\s*<NewsletterSignup/)\n  })\n", "  })\n  it('the box sits in the footer with no condition about being signed in or holding a pass: its ONE condition is that the page is not the children\\'s Clubhouse (SFW-264)', () => {\n    const footer = read('src/components/Footer.jsx')\n    expect(footer).toMatch(/\\{!onClubhouse\\(pathname\\) && <NewsletterSignup \\/>\\}/)\n    expect(footer).not.toMatch(/\\b(session|signedIn|isMember|hasPass|holdsPass|useIsOwner|useSession|supabase)\\b/)\n  })\n"]], "test/newsletter-pages.test.jsx": [["  it('is in the footer, has routes for both link pages, and page titles kept out of search', () => {\n    expect(read('src/components/Footer.jsx')).toMatch(/<NewsletterSignup \\/>\\s*<hr \\/>/)\n    const app = read('src/App.jsx'); expect(app).toContain('<Route path=\"/newsletter/confirm\" element={<NewsletterConfirmPage />} />'); expect(app).toContain('<Route path=\"/newsletter/unsubscribe\" element={<NewsletterUnsubscribePage />} />')\n", "  it('is in the footer, has routes for both link pages, and page titles kept out of search', () => {\n    expect(read('src/components/Footer.jsx')).toMatch(/<NewsletterSignup \\/>\\}?\\s*<hr \\/>/) // still just above the rule, whether or not the Clubhouse condition wraps it (SFW-264)\n    const app = read('src/App.jsx'); expect(app).toContain('<Route path=\"/newsletter/confirm\" element={<NewsletterConfirmPage />} />'); expect(app).toContain('<Route path=\"/newsletter/unsubscribe\" element={<NewsletterUnsubscribePage />} />')\n"]]}''')
STAGED = {
    'src/data/children.js': 'tools/childrens-code-files/src_data_children.js.staged',
    'src/components/ClubhouseNote.jsx': 'tools/childrens-code-files/src_components_ClubhouseNote.jsx.staged',
    'src/components/clubhousenote.css': 'tools/childrens-code-files/src_components_clubhousenote.css.staged',
    'test/children-code.test.jsx': 'tools/childrens-code-files/test_children-code.test.jsx.staged',
}  # copied into place ONLY after every edit above has succeeded (a refusal exits before this)
NEW_FILES = ["INSTALL-CHILDRENS-CODE.txt", "tools/childrens-code-files/src_components_ClubhouseNote.jsx.staged", "tools/childrens-code-files/src_components_clubhousenote.css.staged", "tools/childrens-code-files/src_data_children.js.staged", "tools/childrens-code-files/test_children-code.test.jsx.staged"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-childrens-code-22oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-childrens-code').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
for target, source in STAGED.items():
    t, src = root / target, root / source
    new_text = src.read_text(encoding='utf-8')
    if t.exists() and t.read_text(encoding='utf-8') == new_text:
        print('already done  ' + target)
        continue
    if t.exists():
        pathlib.Path(str(t) + '.before-childrens-code').write_text(t.read_text(encoding='utf-8'), encoding='utf-8')
    t.parent.mkdir(parents=True, exist_ok=True)
    t.write_text(new_text, encoding='utf-8')
    print('replaced      ' + target)
