#!/usr/bin/env python3
"""After a sign-up succeeds, clears the email and password, replaces the form with the Account created message and a Log in button, shows the address the link went to, and offers Start again. A failed sign-up changes nothing. The new test is only put in place if the edits succeed.

Run it from the project folder, AFTER unzipping starscapes-signup-done-22oct.zip into it:   python3 tools/add-signup-done.py

What it does: it makes exact edits to 2 files and, only if both succeed, puts one new test in place.
  src/pages/Signup.jsx, src/styles/forms.css

How it keeps you safe:
  - It checks ALL two files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-signup-done.
  - It is safe to run twice: a file already done is left alone.
  - The new files (INSTALL-SIGNUP-DONE.txt, tools/signup-done-files/signup-done.test.jsx.staged) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{"src/pages/Signup.jsx": [["import { useState } from 'react'\nimport { Link } from 'react-router-dom'\n", "import { useEffect, useRef, useState } from 'react'\nimport { Link } from 'react-router-dom'\n"], ["  const [failure, setFailure] = useState(null) // a problem on our side, with nothing for the person to fix\n  const [info, setInfo] = useState(null)\n  const [busy, setBusy] = useState(false)\n\n  function showProblems(found) {\n    setFailure(null)\n    setInfo(null)\n    setFieldErrors(found)\n", "  const [failure, setFailure] = useState(null) // a problem on our side, with nothing for the person to fix\n  const [created, setCreated] = useState(null) // the address an account has just been made for: the page then says what to do next, instead of showing the form again\n  const [busy, setBusy] = useState(false)\n  const done = useRef(null)\n  useEffect(() => { if (created && done.current) done.current.focus() }, [created]) // the form has gone, so the keyboard focus goes to what replaced it\n\n  function showProblems(found) {\n    setFailure(null)\n    setFieldErrors(found)\n"], ["    setFailure(null)\n    setInfo(null)\n    setBusy(true)\n", "    setFailure(null)\n    setBusy(true)\n"], ["\n    setInfo('Check your email to confirm your account, then log in.')\n  }\n", "\n    // The account is made: clear the form (the password must not be left on the page), and take it away, so it cannot be sent a second time\n    setCreated(email.trim())\n    setEmail('')\n    setPassword('')\n  }\n"], ["      {failure && <FailureMessage title=\"We couldn't create your account\">{failure}</FailureMessage>}\n      {info && <SuccessMessage title=\"Account created\">{info}</SuccessMessage>}\n      <form className=\"fm__form\" onSubmit={handleSubmit} noValidate>\n        <Field id=\"signup-email\" label=\"Email\" error={fieldErrors.email}>\n          {(p) => <input {...p} type=\"email\" placeholder=\"Email\" autoComplete=\"email\" value={email} onChange={(e) => setEmail(e.target.value)} required />}\n        </Field>\n        <Field id=\"signup-password\" label=\"Password\" help=\"At least 6 characters.\" error={fieldErrors.password}>\n          {(p) => (\n            <input {...p} type=\"password\" placeholder=\"Password (min 6 characters)\" autoComplete=\"new-password\" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />\n          )}\n        </Field>\n        <button type=\"submit\" className=\"pg-btn fm-btn--primary fm__submit\" disabled={busy}>\n          Create account\n        </button>\n      </form>\n      <p className=\"fm__links\">\n        <span>\n          Already have an account? <Link to=\"/login\">Log in</Link>\n        </span>\n      </p>\n     </div>\n", "      {failure && <FailureMessage title=\"We couldn't create your account\">{failure}</FailureMessage>}\n      {created ? (\n        <div className=\"fm__done\" ref={done} tabIndex={-1}>\n          <SuccessMessage title=\"Account created\">\n            Check your email to confirm your account, then log in. We sent the link to {created}.\n          </SuccessMessage>\n          <Link to=\"/login\" className=\"pg-btn fm-btn--primary fm__submit\">Log in</Link>\n          <p className=\"fm__links\">\n            <span>\n              Wrong email address? <button type=\"button\" className=\"fm__textbtn\" onClick={() => setCreated(null)}>Start again</button>\n            </span>\n          </p>\n        </div>\n      ) : (\n        <>\n          <form className=\"fm__form\" onSubmit={handleSubmit} noValidate>\n            <Field id=\"signup-email\" label=\"Email\" error={fieldErrors.email}>\n              {(p) => <input {...p} type=\"email\" placeholder=\"Email\" autoComplete=\"email\" value={email} onChange={(e) => setEmail(e.target.value)} required />}\n            </Field>\n            <Field id=\"signup-password\" label=\"Password\" help=\"At least 6 characters.\" error={fieldErrors.password}>\n              {(p) => (\n                <input {...p} type=\"password\" placeholder=\"Password (min 6 characters)\" autoComplete=\"new-password\" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />\n              )}\n            </Field>\n            <button type=\"submit\" className=\"pg-btn fm-btn--primary fm__submit\" disabled={busy}>\n              Create account\n            </button>\n          </form>\n          <p className=\"fm__links\">\n            <span>\n              Already have an account? <Link to=\"/login\">Log in</Link>\n            </span>\n          </p>\n        </>\n      )}\n     </div>\n"]], "src/styles/forms.css": [[".fm__submit {\n  display: inline-flex;\n  align-items: center;\n}\n", ".fm__submit {\n  display: inline-flex;\n  align-items: center;\n  text-decoration: none; /* so a link can be drawn as the button */\n}\n.fm__done:focus {\n  outline: none; /* the box takes the keyboard focus when the form has gone; it is not something to press */\n}\n.fm__textbtn {\n  padding: 6px 2px;\n  border: 0;\n  background: none;\n  color: var(--sf-blue, #1f6fa8);\n  font: inherit;\n  font-weight: 700;\n  text-decoration: underline;\n  cursor: pointer;\n}\n"]]}''')
STAGED = {
    'test/signup-done.test.jsx': 'tools/signup-done-files/signup-done.test.jsx.staged',
}  # copied into place ONLY after every edit above has succeeded (a refusal exits before this)
NEW_FILES = ["INSTALL-SIGNUP-DONE.txt", "tools/signup-done-files/signup-done.test.jsx.staged"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-signup-done-22oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-signup-done').write_text(before, encoding='utf-8')
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
        pathlib.Path(str(t) + '.before-signup-done').write_text(t.read_text(encoding='utf-8'), encoding='utf-8')
    t.parent.mkdir(parents=True, exist_ok=True)
    t.write_text(new_text, encoding='utf-8')
    print('replaced      ' + target)
