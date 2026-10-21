#!/usr/bin/env python3
"""Gives the New product form plain-words problems like New post, and stops the shared error summary from taking the keyboard focus while someone types (a bug on every form that had shown a problem). The two new files are only put in place if every edit succeeds.

Run it from the project folder, AFTER unzipping starscapes-form-messages-21oct.zip into it:   python3 tools/add-form-messages.py

What it does: it makes exact edits to 3 files and, only if all succeed, puts two new files in place.
  src/components/FormMessages.jsx, src/pages/NewProduct.jsx, test/form-messages.test.jsx

How it keeps you safe:
  - It checks ALL three files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-form-messages.
  - It is safe to run twice: a file already done is left alone.
  - The new files (tools/form-messages-files/productFormRules.js.staged, tools/form-messages-files/new-product-form.test.jsx.staged, INSTALL-FORM-MESSAGES.txt) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/components/FormMessages.jsx": [
[
"  const box = useRef(null)\n  useEffect(() => {\n    if (errors.length > 0 && box.current) box.current.focus()\n  }, [errors])\n  if (errors.length === 0) return null\n",
"  const box = useRef(null)\n  const lastSaid = useRef('') // the problems the box last took the focus for\n  const justSent = useRef(false) // a form on the page has just been sent\n  // Most forms build a NEW list of problems every time they are drawn, so every letter typed would draw it again. The box takes the focus only when the problems\n  // are different from last time, or when a form has just been sent (so a screen reader hears that the form was not accepted, even if the problem has not changed),\n  // and never merely because the form was drawn again: otherwise anyone typing to fix a problem would be pulled out of the field after every letter.\n  useEffect(() => {\n    const noteSent = (event) => { if (event.target && event.target.closest && event.target.closest('main')) justSent.current = true } // a form on the page (not the menu or the footer)\n    document.addEventListener('submit', noteSent, true)\n    return () => document.removeEventListener('submit', noteSent, true)\n  }, [])\n  const said = errors.map((e) => `${e.id}: ${e.message}`).join('\\n')\n  useEffect(() => {\n    if (errors.length === 0) { lastSaid.current = ''; justSent.current = false; return }\n    if (box.current && (said !== lastSaid.current || justSent.current)) box.current.focus()\n    lastSaid.current = said\n    justSent.current = false\n  })\n  if (errors.length === 0) return null\n"
]
],
"src/pages/NewProduct.jsx": [
[
"import { supabase } from '../supabaseClient'\nimport { Field, FailureMessage } from '../components/FormMessages'\nimport '../styles/pages.css'\n",
"import { supabase } from '../supabaseClient'\nimport { Field, ErrorSummary, FailureMessage } from '../components/FormMessages'\nimport { productProblems } from './productFormRules'\nimport { summaryOf } from './postFormRules'\nimport '../styles/pages.css'\n"
],
[
"\nexport default function NewProduct({ session }) {\n",
"\nconst IDS = { title: 'npr-title', description: 'npr-description', price: 'npr-price', files: 'npr-images' }\n\nexport default function NewProduct({ session }) {\n"
],
[
"  const [error, setError] = useState(null)\n  const [saving, setSaving] = useState(false)\n  const navigate = useNavigate()\n\n  async function handleSubmit(e) {\n    e.preventDefault()\n    setError(null)\n    setSaving(true)\n",
"  const [error, setError] = useState(null)\n  const [errors, setErrors] = useState({}) // a plain-words problem under each field that needs fixing\n  const [saving, setSaving] = useState(false)\n  const navigate = useNavigate()\n\n  async function handleSubmit(e) {\n    e.preventDefault()\n    setError(null)\n    const found = productProblems({ title, description, price, files })\n    if (Object.keys(found).length > 0) {\n      setErrors(found)\n      return\n    }\n    setErrors({})\n    setSaving(true)\n"
],
[
"      <h1 className=\"fm__title\">New product</h1>\n      {error && <FailureMessage title=\"The product was not saved\">{error}</FailureMessage>}\n      <form className=\"fm__form\" onSubmit={handleSubmit}>\n        <Field id=\"npr-title\" label=\"Title\">\n          {(p) => <input {...p} type=\"text\" placeholder=\"Title\" value={title} onChange={(e) => setTitle(e.target.value)} required />}\n        </Field>\n        <Field id=\"npr-description\" label=\"Description\">\n          {(p) => <textarea {...p} placeholder=\"Description\" rows={6} value={description} onChange={(e) => setDescription(e.target.value)} required />}\n        </Field>\n        <div className=\"fm__row\">\n          <Field id=\"npr-price\" label=\"Price (£)\">\n            {(p) => <input {...p} type=\"number\" step=\"0.01\" placeholder=\"Price (£)\" value={price} onChange={(e) => setPrice(e.target.value)} required />}\n",
"      <h1 className=\"fm__title\">New product</h1>\n      <ErrorSummary errors={summaryOf(errors, IDS)} />\n      {error && <FailureMessage title=\"The product was not saved\">{error}</FailureMessage>}\n      <form className=\"fm__form\" onSubmit={handleSubmit} noValidate>\n        <Field id=\"npr-title\" label=\"Title\" error={errors.title}>\n          {(p) => <input {...p} type=\"text\" placeholder=\"Title\" value={title} onChange={(e) => setTitle(e.target.value)} required />}\n        </Field>\n        <Field id=\"npr-description\" label=\"Description\" error={errors.description}>\n          {(p) => <textarea {...p} placeholder=\"Description\" rows={6} value={description} onChange={(e) => setDescription(e.target.value)} required />}\n        </Field>\n        <div className=\"fm__row\">\n          <Field id=\"npr-price\" label=\"Price (£)\" error={errors.price}>\n            {(p) => <input {...p} type=\"number\" step=\"0.01\" placeholder=\"Price (£)\" value={price} onChange={(e) => setPrice(e.target.value)} required />}\n"
],
[
"        </Field>\n        <Field id=\"npr-images\" label=\"Images\" help=\"3 to 6 recommended. The first one becomes the thumbnail.\">\n          {(p) => <input {...p} type=\"file\" accept=\"image/*\" multiple onChange={(e) => setFiles(Array.from(e.target.files))} />}\n",
"        </Field>\n        <Field id=\"npr-images\" label=\"Images\" help=\"3 to 6 recommended. The first one becomes the thumbnail.\" error={errors.files}>\n          {(p) => <input {...p} type=\"file\" accept=\"image/*\" multiple onChange={(e) => setFiles(Array.from(e.target.files))} />}\n"
]
],
"test/form-messages.test.jsx": [
[
"import { describe, it, expect } from 'vitest'\nimport { render, screen, within } from '@testing-library/react'\nimport userEvent from '@testing-library/user-event'\n",
"import { useState } from 'react'\nimport { describe, it, expect } from 'vitest'\nimport { render, screen, within, fireEvent } from '@testing-library/react'\nimport userEvent from '@testing-library/user-event'\n"
],
[
"  })\n  it('takes the focus again each time the form fails again', () => {\n    const { rerender } = render(<><input aria-label=\"elsewhere\" /><ErrorSummary errors={errors} /></>)\n    screen.getByLabelText('elsewhere').focus()\n    expect(document.activeElement).not.toBe(screen.getByRole('alert'))\n    rerender(<><input aria-label=\"elsewhere\" /><ErrorSummary errors={[...errors]} /></>)\n    expect(document.activeElement).toBe(screen.getByRole('alert'))\n",
"  })\n  it('takes the focus again each time the form fails again: the form is sent and the same problems come back (a re-draw alone does not count: see the typing test at the end)', () => {\n    const page = (list) => <main><form onSubmit={(e) => e.preventDefault()}><input aria-label=\"elsewhere\" /></form><ErrorSummary errors={list} /></main>\n    const { rerender, container } = render(page(errors))\n    screen.getByLabelText('elsewhere').focus()\n    expect(document.activeElement).not.toBe(screen.getByRole('alert'))\n    fireEvent.submit(container.querySelector('form'))\n    rerender(page([...errors]))\n    expect(document.activeElement).toBe(screen.getByRole('alert'))\n"
],
[
"    expect(within(box).queryByRole('link')).toBeNull()\n  })\n})\n\n",
"    expect(within(box).queryByRole('link')).toBeNull()\n  })\n})\n\n// A form that, like most on the site, builds its list of problems afresh each time it is drawn (so the list is a NEW list on every keystroke).\nfunction Harness() {\n  const [text, setText] = useState('')\n  const [problems, setProblems] = useState([])\n  return (\n    <main>\n      <ErrorSummary errors={problems.map((message, i) => ({ id: `f${i}`, message }))} />\n      <form onSubmit={(e) => { e.preventDefault(); setProblems(text ? [] : ['Write something.']) }} noValidate>\n        <input aria-label=\"the field\" id=\"f0\" value={text} onChange={(e) => setText(e.target.value)} />\n        <button type=\"submit\">Send</button>\n      </form>\n      <form onSubmit={(e) => e.preventDefault()}><button type=\"submit\">Unrelated</button></form>\n    </main>\n  )\n}\n\ndescribe('the summary and the keyboard focus (found 21 October 2026 by a test on the New product form)', () => {\n  it('moves the focus to the summary when a form is sent and has a problem', async () => {\n    const user = userEvent.setup(); render(<Harness />); await user.click(screen.getByRole('button', { name: 'Send' }))\n    expect(screen.getByRole('alert')).toHaveFocus()\n  })\n  it('does NOT take the focus back while the person types to fix the problem: every letter lands, in the field, with the summary still showing', async () => {\n    const user = userEvent.setup(); render(<Harness />); await user.click(screen.getByRole('button', { name: 'Send' }))\n    await user.click(screen.getByLabelText('the field')); await user.keyboard('hello world')\n    expect(screen.getByLabelText('the field')).toHaveValue('hello world'); expect(screen.getByLabelText('the field')).toHaveFocus(); expect(screen.getByRole('alert')).toBeInTheDocument()\n  })\n  it('takes the focus again each time the form is sent with the problem still there (so a screen reader hears that nothing was accepted)', async () => {\n    const user = userEvent.setup(); render(<Harness />); const send = screen.getByRole('button', { name: 'Send' })\n    await user.click(send); expect(screen.getByRole('alert')).toHaveFocus()\n    await user.click(screen.getByLabelText('the field')); expect(screen.getByLabelText('the field')).toHaveFocus()\n    await user.click(send); expect(screen.getByRole('alert')).toHaveFocus()\n  })\n  it('is not set off by a different form elsewhere on the page, such as a sign-up box in the footer: sending that one does not pull the focus out of the field being fixed', async () => {\n    const user = userEvent.setup(); render(<><Harness /><footer><form onSubmit={(e) => e.preventDefault()}><button type=\"submit\">Join the newsletter</button></form></footer></>)\n    await user.click(screen.getByRole('button', { name: 'Send' })); await user.click(screen.getByRole('button', { name: 'Join the newsletter' }))\n    await user.click(screen.getByLabelText('the field')); await user.keyboard('still typing')\n    expect(screen.getByLabelText('the field')).toHaveValue('still typing'); expect(screen.getByLabelText('the field')).toHaveFocus()\n  })\n  it('leaves once the problem is put right: the summary goes away when the form is sent correctly', async () => {\n    const user = userEvent.setup(); render(<Harness />); await user.click(screen.getByRole('button', { name: 'Send' }))\n    await user.type(screen.getByLabelText('the field'), 'ok'); await user.click(screen.getByRole('button', { name: 'Send' }))\n    expect(screen.queryByRole('alert')).toBeNull()\n  })\n  it('takes the focus when a different problem appears while it is already showing', async () => {\n    const { rerender } = render(<ErrorSummary errors={[{ id: 'a', message: 'First problem' }]} />); const box = screen.getByRole('alert'); box.blur(); document.body.focus()\n    rerender(<ErrorSummary errors={[{ id: 'a', message: 'First problem' }, { id: 'b', message: 'Second problem' }]} />); expect(screen.getByRole('alert')).toHaveFocus()\n  })\n})\n"
]
]
}''')
STAGED = {
    'src/pages/productFormRules.js': 'tools/form-messages-files/productFormRules.js.staged',
    'test/new-product-form.test.jsx': 'tools/form-messages-files/new-product-form.test.jsx.staged',
}  # copied into place ONLY after every edit above has succeeded (a refusal exits before this)
NEW_FILES = ["tools/form-messages-files/productFormRules.js.staged", "tools/form-messages-files/new-product-form.test.jsx.staged", "INSTALL-FORM-MESSAGES.txt"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-form-messages-21oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-form-messages').write_text(before, encoding='utf-8')
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
        pathlib.Path(str(t) + '.before-form-messages').write_text(t.read_text(encoding='utf-8'), encoding='utf-8')
    t.parent.mkdir(parents=True, exist_ok=True)
    t.write_text(new_text, encoding='utf-8')
    print('replaced      ' + target)
