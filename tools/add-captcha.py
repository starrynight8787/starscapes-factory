#!/usr/bin/env python3
"""Adds a Cloudflare Turnstile security check to the Sign up, Log in and Forgot password forms (off until a site key is set, so releasing it changes nothing by itself). The new component and its two test files are only put in place if every edit succeeds.

Run it from the project folder, AFTER unzipping starscapes-captcha-22oct.zip into it:   python3 tools/add-captcha.py

What it does: it makes exact edits to 5 files and, only if all succeed, puts the new component and its two test files in place.
  .env.example, src/pages/ForgotPassword.jsx, src/pages/Login.jsx, src/pages/Signup.jsx, src/pages/formRules.js

How it keeps you safe:
  - It checks ALL five files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-captcha.
  - It is safe to run twice: a file already done is left alone.
  - The new files (INSTALL-CAPTCHA.txt, tools/captcha-files/CaptchaCheck.jsx.staged, tools/captcha-files/captcha-check.test.jsx.staged, tools/captcha-files/captcha-forms.test.jsx.staged) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
".env.example": [
[
"VITE_SUPABASE_ANON_KEY=your-anon-public-key\n",
"VITE_SUPABASE_ANON_KEY=your-anon-public-key\n\n# The security check on Sign up, Log in and Forgot password (Cloudflare Turnstile). The PUBLIC site key only: the secret key goes in Supabase, never here.\n# Leave it empty to switch the check off (the forms then work as they always did).\nVITE_TURNSTILE_SITE_KEY=\n"
]
],
"src/pages/ForgotPassword.jsx": [
[
"import { useState } from 'react'\nimport { Link } from 'react-router-dom'\nimport { supabase } from '../supabaseClient'\nimport { Field, ErrorSummary, FailureMessage, SuccessMessage } from '../components/FormMessages'\nimport { emailProblem } from './formRules'\nimport '../styles/pages.css'\n",
"import { useRef, useState } from 'react'\nimport { Link } from 'react-router-dom'\nimport { supabase } from '../supabaseClient'\nimport { Field, ErrorSummary, FailureMessage, SuccessMessage } from '../components/FormMessages'\nimport { emailProblem, captchaIssue, isCaptchaFailure, CAPTCHA_FAILED } from './formRules'\nimport CaptchaCheck, { captchaOn } from '../components/CaptchaCheck'\nimport '../styles/pages.css'\n"
],
[
"  const [failure, setFailure] = useState(null) // a problem on our side, with nothing for the person to fix\n\n",
"  const [failure, setFailure] = useState(null) // a problem on our side, with nothing for the person to fix\n  const [captchaToken, setCaptchaToken] = useState('') // from the security check; empty until it has finished\n  const [captchaBroken, setCaptchaBroken] = useState(false)\n  const captcha = useRef(null)\n\n"
],
[
"    }\n    setFieldError(null)\n    setSummary([])\n    setStatus('sending')\n\n    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {\n      redirectTo: `${window.location.origin}/reset-password`,\n    })\n\n    if (error) {\n      setStatus('idle')\n      const tooMany = error.status === 429 || /rate limit|only request this after/i.test(error.message || '')\n      setFailure(\n        tooMany\n          ? 'Too many requests just now. Please wait a few minutes and try again.'\n          : \"We couldn't send the email just now. Please try again in a moment.\"\n      )\n",
"    }\n    const waitForCheck = captchaIssue(captchaOn(), captchaToken, captchaBroken)\n    if (waitForCheck) {\n      setFieldError(null)\n      setSummary([{ id: 'forgot-captcha', message: waitForCheck }])\n      return\n    }\n    setFieldError(null)\n    setSummary([])\n    setStatus('sending')\n\n    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {\n      redirectTo: `${window.location.origin}/reset-password`,\n      ...(captchaToken ? { captchaToken } : {}),\n    })\n    if (captcha.current) captcha.current.reset() // the token has been used, whatever happened\n\n    if (error) {\n      setStatus('idle')\n      const tooMany = error.status === 429 || /rate limit|only request this after/i.test(error.message || '')\n      setFailure(\n        isCaptchaFailure(error)\n          ? CAPTCHA_FAILED\n          : tooMany\n            ? 'Too many requests just now. Please wait a few minutes and try again.'\n            : \"We couldn't send the email just now. Please try again in a moment.\"\n      )\n"
],
[
"        </Field>\n        <button type=\"submit\" className=\"pg-btn fm-btn--primary fm__submit\" disabled={status === 'sending'}>\n",
"        </Field>\n        <CaptchaCheck id=\"forgot-captcha\" ref={captcha} onToken={setCaptchaToken} onProblem={() => setCaptchaBroken(true)} />\n        <button type=\"submit\" className=\"pg-btn fm-btn--primary fm__submit\" disabled={status === 'sending'}>\n"
]
],
"src/pages/Login.jsx": [
[
"import { useState } from 'react'\nimport { useNavigate, Link } from 'react-router-dom'\nimport { supabase } from '../supabaseClient'\nimport { Field, ErrorSummary, FailureMessage } from '../components/FormMessages'\nimport { emailProblem, loginMessage } from './formRules'\nimport '../styles/pages.css'\n",
"import { useRef, useState } from 'react'\nimport { useNavigate, Link } from 'react-router-dom'\nimport { supabase } from '../supabaseClient'\nimport { Field, ErrorSummary, FailureMessage } from '../components/FormMessages'\nimport { emailProblem, loginMessage, captchaIssue } from './formRules'\nimport CaptchaCheck, { captchaOn } from '../components/CaptchaCheck'\nimport '../styles/pages.css'\n"
],
[
"  const [busy, setBusy] = useState(false)\n  const navigate = useNavigate()\n\n  function showProblems(found) {\n    setFailure(null)\n    setFieldErrors(found)\n    setSummary([['email', 'login-email'], ['password', 'login-password']].filter(([key]) => found[key]).map(([key, id]) => ({ id, message: found[key] })))\n  }\n",
"  const [busy, setBusy] = useState(false)\n  const [captchaToken, setCaptchaToken] = useState('') // from the security check; empty until it has finished\n  const [captchaBroken, setCaptchaBroken] = useState(false)\n  const captcha = useRef(null)\n  const navigate = useNavigate()\n\n  function showProblems(found) {\n    setFailure(null)\n    setFieldErrors(found)\n    setSummary([['email', 'login-email'], ['password', 'login-password'], ['captcha', 'login-captcha']].filter(([key]) => found[key]).map(([key, id]) => ({ id, message: found[key] })))\n  }\n"
],
[
"    if (!password) found.password = 'Enter your password'\n    if (Object.keys(found).length > 0) return showProblems(found)\n\n    setFieldErrors({})\n    setSummary([])\n    setFailure(null)\n    setBusy(true)\n    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })\n    setBusy(false)\n\n",
"    if (!password) found.password = 'Enter your password'\n    const waitForCheck = captchaIssue(captchaOn(), captchaToken, captchaBroken)\n    if (waitForCheck) found.captcha = waitForCheck\n    if (Object.keys(found).length > 0) return showProblems(found)\n\n    setFieldErrors({})\n    setSummary([])\n    setFailure(null)\n    setBusy(true)\n    const { error } = await supabase.auth.signInWithPassword(captchaToken ? { email: email.trim(), password, options: { captchaToken } } : { email: email.trim(), password })\n    setBusy(false)\n    if (captcha.current) captcha.current.reset() // the token has been used, whatever happened\n\n"
],
[
"        </Field>\n        <button type=\"submit\" className=\"pg-btn fm-btn--primary fm__submit\" disabled={busy}>\n",
"        </Field>\n        <CaptchaCheck id=\"login-captcha\" ref={captcha} onToken={setCaptchaToken} onProblem={() => setCaptchaBroken(true)} />\n        <button type=\"submit\" className=\"pg-btn fm-btn--primary fm__submit\" disabled={busy}>\n"
]
],
"src/pages/Signup.jsx": [
[
"import PageBanner from '../components/PageBanner'\nimport { emailProblem, signupMessage } from './formRules'\n\n",
"import PageBanner from '../components/PageBanner'\nimport { emailProblem, signupMessage, captchaIssue } from './formRules'\nimport CaptchaCheck, { captchaOn } from '../components/CaptchaCheck'\n\n"
],
[
"  const [busy, setBusy] = useState(false)\n  const done = useRef(null)\n  useEffect(() => { if (created && done.current) done.current.focus() }, [created]) // the form has gone, so the keyboard focus goes to what replaced it\n\n  function showProblems(found) {\n    setFailure(null)\n    setFieldErrors(found)\n    setSummary([['email', 'signup-email'], ['password', 'signup-password']].filter(([key]) => found[key]).map(([key, id]) => ({ id, message: found[key] })))\n  }\n",
"  const [busy, setBusy] = useState(false)\n  const [captchaToken, setCaptchaToken] = useState('') // from the security check; empty until it has finished\n  const [captchaBroken, setCaptchaBroken] = useState(false)\n  const captcha = useRef(null)\n  const done = useRef(null)\n  useEffect(() => { if (created && done.current) done.current.focus() }, [created]) // the form has gone, so the keyboard focus goes to what replaced it\n\n  function showProblems(found) {\n    setFailure(null)\n    setFieldErrors(found)\n    setSummary([['email', 'signup-email'], ['password', 'signup-password'], ['captcha', 'signup-captcha']].filter(([key]) => found[key]).map(([key, id]) => ({ id, message: found[key] })))\n  }\n"
],
[
"    else if (password.length < 6) found.password = 'Use at least 6 characters for your password'\n    if (Object.keys(found).length > 0) return showProblems(found)\n\n    setFieldErrors({})\n    setSummary([])\n    setFailure(null)\n    setBusy(true)\n    const { error } = await supabase.auth.signUp({ email: email.trim(), password })\n    setBusy(false)\n\n",
"    else if (password.length < 6) found.password = 'Use at least 6 characters for your password'\n    const waitForCheck = captchaIssue(captchaOn(), captchaToken, captchaBroken)\n    if (waitForCheck) found.captcha = waitForCheck\n    if (Object.keys(found).length > 0) return showProblems(found)\n\n    setFieldErrors({})\n    setSummary([])\n    setFailure(null)\n    setBusy(true)\n    const { error } = await supabase.auth.signUp(captchaToken ? { email: email.trim(), password, options: { captchaToken } } : { email: email.trim(), password })\n    setBusy(false)\n    if (captcha.current) captcha.current.reset() // the token has been used, whatever happened\n\n"
],
[
"            </Field>\n            <button type=\"submit\" className=\"pg-btn fm-btn--primary fm__submit\" disabled={busy}>\n",
"            </Field>\n            <CaptchaCheck id=\"signup-captcha\" ref={captcha} onToken={setCaptchaToken} onProblem={() => setCaptchaBroken(true)} />\n            <button type=\"submit\" className=\"pg-btn fm-btn--primary fm__submit\" disabled={busy}>\n"
]
],
"src/pages/formRules.js": [
[
"// Supabase said no to a log in. Returns { fix } for something to correct, or { failure } for something on our side.\nexport function loginMessage(error) {\n  const text = (error && error.message) || ''\n  if (/invalid login credentials/i.test(text)) return { fix: 'Your email or password is not right. Check them and try again.' }\n",
"// Supabase said no to a log in. Returns { fix } for something to correct, or { failure } for something on our side.\n// The security check (Cloudflare Turnstile, see src/components/CaptchaCheck.jsx): what to say when it has not finished, did not load, or was refused\nexport const CAPTCHA_WAIT = 'Please wait a moment while the security check finishes, then press the button again.'\nexport const CAPTCHA_BROKEN = 'The security check did not load. Please reload the page and try again, or try another browser.'\nexport const CAPTCHA_FAILED = \"We couldn't check that you are a person. Please try again.\"\nexport const isCaptchaFailure = (error) => Boolean(error) && (error.code === 'captcha_failed' || /captcha/i.test(error.message || ''))\n// null when the form may be sent: the check is switched off, or it has given a token. Otherwise what to tell the person.\nexport const captchaIssue = (isOn, token, brokenCheck) => (!isOn || token ? null : brokenCheck ? CAPTCHA_BROKEN : CAPTCHA_WAIT)\n\nexport function loginMessage(error) {\n  const text = (error && error.message) || ''\n  if (isCaptchaFailure(error)) return { failure: CAPTCHA_FAILED }\n  if (/invalid login credentials/i.test(text)) return { fix: 'Your email or password is not right. Check them and try again.' }\n"
],
[
"  const text = (error && error.message) || ''\n  if (/already registered|already been registered|already exists/i.test(text)) return { email: 'There is already an account with that email address. Try logging in instead.' }\n",
"  const text = (error && error.message) || ''\n  if (isCaptchaFailure(error)) return { failure: CAPTCHA_FAILED }\n  if (/already registered|already been registered|already exists/i.test(text)) return { email: 'There is already an account with that email address. Try logging in instead.' }\n"
]
]
}''')
STAGED = {
    'src/components/CaptchaCheck.jsx': 'tools/captcha-files/CaptchaCheck.jsx.staged',
    'test/captcha-check.test.jsx': 'tools/captcha-files/captcha-check.test.jsx.staged',
    'test/captcha-forms.test.jsx': 'tools/captcha-files/captcha-forms.test.jsx.staged',
}  # copied into place ONLY after every edit above has succeeded (a refusal exits before this)
NEW_FILES = ["INSTALL-CAPTCHA.txt", "tools/captcha-files/CaptchaCheck.jsx.staged", "tools/captcha-files/captcha-check.test.jsx.staged", "tools/captcha-files/captcha-forms.test.jsx.staged"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-captcha-22oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-captcha').write_text(before, encoding='utf-8')
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
        pathlib.Path(str(t) + '.before-captcha').write_text(t.read_text(encoding='utf-8'), encoding='utf-8')
    t.parent.mkdir(parents=True, exist_ok=True)
    t.write_text(new_text, encoding='utf-8')
    print('replaced      ' + target)
