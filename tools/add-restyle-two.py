#!/usr/bin/env python3
"""Restyles the sign-in pages and the owner's forms, and retires the old blanket rules from the shared stylesheet.

Run it from the project folder, AFTER unzipping starscapes-restyle-two-18oct.zip into it:   python3 tools/add-restyle-two.py

What it does: it makes exact edits to sixteen files that already exist: the seven restyled pages, the old stylesheet, and the pages that still need the old rules (which are marked so they look exactly as they do now).
  src/admin/adminTools.js, src/artloft/AdminOriginals.jsx, src/artloft/AdminPrints.jsx, src/cart/CartPage.jsx, src/factoryfloor/PostFilter.jsx, src/index.css, src/main.jsx, src/pages/EditPost.jsx, src/pages/ForgotPassword.jsx, src/pages/Login.jsx, src/pages/NewPost.jsx, src/pages/NewProduct.jsx, src/pages/ProductGallery.jsx, src/pages/ProductPage.jsx, src/pages/ResetPassword.jsx, src/pages/Signup.jsx

How it keeps you safe:
  - It checks ALL 16 files first. If any is not exactly the way it expects, it changes NOTHING and says which.
  - Before changing a file it keeps a copy, ending .before-restyle-two.
  - It is safe to run twice: a file already done is left alone.
  - The new files (src/styles/forms.css, src/styles/legacy.css, src/pages/postFormRules.js) come in the zip itself.
"""
import json
import pathlib
import sys

PATCH = json.loads(r'''{
"src/admin/adminTools.js": [
[
"\nexport const ADMIN_TOOLS = [\n  { group: 'Write', name: 'New post', to: '/new', blurb: 'Write a post and publish it, or save it as a draft.' },\n  { group: 'Shop', name: 'New product', to: '/new-product', blurb: 'Add a product by hand. Prints come from Creative Hub, so this is for anything else.' },\n  { group: 'Shop', name: 'Prints, orders and Creative Hub', to: '/art-loft/admin', blurb: 'Switch prints on, sort them into collections, write descriptions, sync with Creative Hub, and see your orders.' },\n",
"\nexport const ADMIN_TOOLS = [\n  { group: 'Write', name: 'New post', to: '/new', blurb: 'Write a post and publish it.' },\n  { group: 'Shop', name: 'New product', to: '/new-product', blurb: 'Add a product by hand. Prints come from Creative Hub, so this is for anything else.' },\n  { group: 'Shop', name: 'Prints, orders and Creative Hub', to: '/art-loft/admin', blurb: 'Switch prints on, sort them into collections, write descriptions, sync with Creative Hub, and see your orders.' },\n"
]
],
"src/artloft/AdminOriginals.jsx": [
[
"  if (user === undefined && status === 'loading') {\n    return (\n      <main className=\"al al-admin\">\n        <h1>Manage originals</h1>\n        <p className=\"al-note\">Loading…</p>\n",
"  if (user === undefined && status === 'loading') {\n    return (\n      <main className=\"al al-admin legacy\">\n        <h1>Manage originals</h1>\n        <p className=\"al-note\">Loading…</p>\n"
],
[
"  if (!user) {\n    return (\n      <main className=\"al al-admin\">\n        <h1>Manage originals</h1>\n        <p>Please <Link to=\"/login\">log in</Link> to manage originals.</p>\n",
"  if (!user) {\n    return (\n      <main className=\"al al-admin legacy\">\n        <h1>Manage originals</h1>\n        <p>Please <Link to=\"/login\">log in</Link> to manage originals.</p>\n"
],
[
"\n  return (\n    <main className=\"al al-admin\">\n      <p className=\"al-back\">\n        <Link to=\"/art-loft\">← Back to the Art Loft</Link>\n",
"\n  return (\n    <main className=\"al al-admin legacy\">\n      <p className=\"al-back\">\n        <Link to=\"/art-loft\">← Back to the Art Loft</Link>\n"
]
],
"src/artloft/AdminPrints.jsx": [
[
"\n  return (\n    <main className=\"al al-admin\">\n      <p className=\"al-back\"><Link to=\"/art-loft\">← Back to the Art Loft</Link></p>\n      <h1>Manage prints</h1>\n",
"\n  return (\n    <main className=\"al al-admin legacy\">\n      <p className=\"al-back\"><Link to=\"/art-loft\">← Back to the Art Loft</Link></p>\n      <h1>Manage prints</h1>\n"
]
],
"src/cart/CartPage.jsx": [
[
"  if (items.length === 0) {\n    return (\n      <main className=\"cart\">\n        <h1>Your cart</h1>\n        <p className=\"cart-empty\">Your cart is empty.</p>\n",
"  if (items.length === 0) {\n    return (\n      <main className=\"cart legacy\">\n        <h1>Your cart</h1>\n        <p className=\"cart-empty\">Your cart is empty.</p>\n"
],
[
"\n  return (\n    <main className=\"cart\">\n      <h1>Your cart</h1>\n      <p className=\"cart-count\" role=\"status\">\n",
"\n  return (\n    <main className=\"cart legacy\">\n      <h1>Your cart</h1>\n      <p className=\"cart-count\" role=\"status\">\n"
]
],
"src/factoryfloor/PostFilter.jsx": [
[
"  const filtering = Boolean(q.trim() || tag)\n  return (\n    <form className=\"ff-filter\" role=\"search\" aria-label=\"Filter posts\" onSubmit={(e) => e.preventDefault()}>\n      <div className=\"ff-filter__row\">\n        <label className=\"ff-filter__field\">\n",
"  const filtering = Boolean(q.trim() || tag)\n  return (\n    <form className=\"ff-filter legacy\" role=\"search\" aria-label=\"Filter posts\" onSubmit={(e) => e.preventDefault()}>\n      <div className=\"ff-filter__row\">\n        <label className=\"ff-filter__field\">\n"
]
],
"src/index.css": [
[
"* {\n  box-sizing: border-box;\n",
"/* The few rules the whole site still shares. The old blanket rules for nav, button, input, textarea and form used to live here: they now live in\n   legacy.css and apply only to the pages marked \"legacy\". */\n* {\n  box-sizing: border-box;\n"
],
[
"  margin: 0 auto;\n  padding: 24px 20px 80px;\n}\n\nnav {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 16px 20px;\n  border-bottom: 1px solid #e5e5e5;\n  background: #fff;\n}\n\nnav a {\n  margin-right: 16px;\n  color: #1a1a1a;\n  text-decoration: none;\n  font-weight: 500;\n}\n\nnav a:hover {\n  text-decoration: underline;\n}\n\nbutton {\n  cursor: pointer;\n  padding: 10px 16px;\n  border-radius: 6px;\n  border: none;\n  background: #1a1a1a;\n  color: #fff;\n  font-size: 14px;\n}\n\nbutton:hover {\n  opacity: 0.85;\n}\n\ninput, textarea {\n  display: block;\n  width: 100%;\n  padding: 10px;\n  margin-bottom: 12px;\n  border: 1px solid #ccc;\n  border-radius: 6px;\n  font-size: 14px;\n}\n\nform {\n  max-width: 400px;\n}\n\n",
"  margin: 0 auto;\n  padding: 24px 20px 80px;\n}\n\n"
]
],
"src/main.jsx": [
[
"import App from './App.jsx'\nimport './index.css'\n\nReactDOM.createRoot(document.getElementById('root')).render(\n",
"import App from './App.jsx'\nimport './index.css'\nimport './styles/legacy.css'\n\nReactDOM.createRoot(document.getElementById('root')).render(\n"
]
],
"src/pages/EditPost.jsx": [
[
"import { FACTORY, SECTIONS, kindOf } from '../factoryfloor/factoryData'\nimport './pinswitch.css'\n\nexport default function EditPost({ session }) {\n",
"import { FACTORY, SECTIONS, kindOf } from '../factoryfloor/factoryData'\nimport './pinswitch.css'\nimport { Field, ErrorSummary } from '../components/FormMessages'\nimport { MAX_PICTURE_MB, postProblems, summaryOf } from './postFormRules'\nimport '../styles/pages.css'\nimport '../styles/forms.css'\n\nconst IDS = { title: 'ep-title', content: 'ep-content', file: 'ep-file' }\n\nexport default function EditPost({ session }) {\n"
],
[
"  const [saving, setSaving] = useState(false)\n  const [error, setError] = useState(null)\n  // Pinning: does the database have the pinned_in column yet, is this post pinned, and which other post holds the pin\n  const [canPin, setCanPin] = useState(false)\n",
"  const [saving, setSaving] = useState(false)\n  const [error, setError] = useState(null)\n  const [errors, setErrors] = useState({}) // a plain-words problem under each field that needs fixing\n  // Pinning: does the database have the pinned_in column yet, is this post pinned, and which other post holds the pin\n  const [canPin, setCanPin] = useState(false)\n"
],
[
"    e.preventDefault()\n    setError(null)\n    setSaving(true)\n\n",
"    e.preventDefault()\n    setError(null)\n    const found = postProblems({ title, content, file })\n    if (Object.keys(found).length > 0) {\n      setErrors(found)\n      return\n    }\n    setErrors({})\n    setSaving(true)\n\n"
],
[
"\n  return (\n    <div>\n      <h1>Edit Post</h1>\n      <form onSubmit={handleSubmit}>\n        <input\n          type=\"text\"\n          placeholder=\"Title\"\n          value={title}\n          onChange={(e) => setTitle(e.target.value)}\n          required\n        />\n        <textarea\n          placeholder=\"Write your post...\"\n          rows={10}\n          value={content}\n          onChange={(e) => setContent(e.target.value)}\n          required\n        />\n        <input\n          type=\"text\"\n          placeholder=\"Tags (comma separated, e.g. art, travel)\"\n          value={tags}\n          onChange={(e) => setTags(e.target.value)}\n        />\n        <select value={channel} onChange={(e) => setChannel(e.target.value)}>\n          <option value=\"\">No channel</option>\n          {channels.map((c) => (\n            <option key={c.slug} value={c.slug}>\n              {c.emoji} {c.name}\n            </option>\n          ))}\n        </select>\n        {pinnable && (\n          <fieldset className=\"pin-box\">\n",
"\n  return (\n    <main className=\"fm\">\n      <h1 className=\"fm__title\">Edit post</h1>\n      <ErrorSummary errors={summaryOf(errors, IDS)} />\n      <form className=\"fm__form\" onSubmit={handleSubmit} noValidate>\n        <Field id=\"ep-title\" label=\"Title\" error={errors.title}>\n          {(p) => <input {...p} type=\"text\" placeholder=\"Title\" value={title} onChange={(e) => setTitle(e.target.value)} />}\n        </Field>\n        <Field id=\"ep-content\" label=\"Post text\" error={errors.content}>\n          {(p) => <textarea {...p} placeholder=\"Write your post...\" rows={10} value={content} onChange={(e) => setContent(e.target.value)} />}\n        </Field>\n        <div className=\"fm__row\">\n          <Field id=\"ep-tags\" label=\"Tags\" help=\"Separate them with commas, for example art, travel.\">\n            {(p) => <input {...p} type=\"text\" placeholder=\"Tags (comma separated, e.g. art, travel)\" value={tags} onChange={(e) => setTags(e.target.value)} />}\n          </Field>\n          <Field id=\"ep-room\" label=\"Room\">\n            {(p) => (\n              <select {...p} value={channel} onChange={(e) => setChannel(e.target.value)}>\n                <option value=\"\">No channel</option>\n                {channels.map((c) => (\n                  <option key={c.slug} value={c.slug}>\n                    {c.emoji} {c.name}\n                  </option>\n                ))}\n              </select>\n            )}\n          </Field>\n        </div>\n        {pinnable && (\n          <fieldset className=\"pin-box\">\n"
],
[
"        )}\n        {imageUrl && (\n          <div style={{ marginBottom: 12 }}>\n            <p className=\"muted\">Current image:</p>\n            <img src={imageUrl} alt=\"Current\" style={{ maxWidth: 200 }} />\n          </div>\n        )}\n        <input type=\"file\" accept=\"image/*\" onChange={(e) => setFile(e.target.files[0])} />\n        <button type=\"submit\" disabled={saving}>\n          {saving ? 'Saving...' : 'Save Changes'}\n        </button>\n      </form>\n    </div>\n  )\n}\n",
"        )}\n        {imageUrl && (\n          <div>\n            <p className=\"fm__small\">Current picture:</p>\n            <img className=\"fm__preview\" src={imageUrl} alt=\"The post's current header picture\" />\n          </div>\n        )}\n        <Field id=\"ep-file\" label={`New header picture (optional, up to ${MAX_PICTURE_MB} MB)`} error={errors.file}>\n          {(p) => <input {...p} type=\"file\" accept=\"image/*\" onChange={(e) => setFile(e.target.files[0] || null)} />}\n        </Field>\n        <div className=\"fm__actions\">\n          <button type=\"submit\" className=\"pg-btn fm-btn--primary\" disabled={saving}>\n            {saving ? 'Saving...' : 'Save Changes'}\n          </button>\n          <button type=\"button\" className=\"pg-btn\" onClick={() => navigate(`/post/${id}`)}>\n            Cancel\n          </button>\n        </div>\n      </form>\n    </main>\n  )\n}\n"
]
],
"src/pages/ForgotPassword.jsx": [
[
"import { Field, ErrorSummary, FailureMessage, SuccessMessage } from '../components/FormMessages'\nimport { emailProblem } from './formRules'\n\n// Step 1 of getting back in: ask for a reset link by email.\n",
"import { Field, ErrorSummary, FailureMessage, SuccessMessage } from '../components/FormMessages'\nimport { emailProblem } from './formRules'\nimport '../styles/pages.css'\nimport '../styles/forms.css'\n\n// Step 1 of getting back in: ask for a reset link by email.\n"
],
[
"  if (status === 'sent') {\n    return (\n      <div>\n        <h1>Check your email</h1>\n        <SuccessMessage title=\"If there is an account for that email address, we've sent a link to reset your password.\">\n          It can take a few minutes, and it might land in your spam folder.\n        </SuccessMessage>\n        <p className=\"muted\">\n          <button type=\"button\" onClick={() => setStatus('idle')}>Use a different email</button>\n        </p>\n        <p className=\"muted\">\n          <Link to=\"/login\">Back to log in</Link>\n        </p>\n      </div>\n    )\n  }\n\n  return (\n    <div>\n      <h1>Forgot your password?</h1>\n      <p className=\"muted\">Enter your email and we'll send you a link to choose a new one.</p>\n      <ErrorSummary errors={summary} />\n      {failure && <FailureMessage title=\"We couldn't send the email\">{failure}</FailureMessage>}\n      <form onSubmit={handleSubmit} noValidate>\n        <Field id=\"forgot-email\" label=\"Email\" error={fieldError}>\n          {(p) => <input {...p} type=\"email\" placeholder=\"Email\" autoComplete=\"email\" value={email} onChange={(e) => setEmail(e.target.value)} required />}\n        </Field>\n        <button type=\"submit\" disabled={status === 'sending'}>\n          {status === 'sending' ? 'Sending…' : 'Send reset link'}\n        </button>\n      </form>\n      <p className=\"muted\">\n        <Link to=\"/login\">Back to log in</Link>\n      </p>\n    </div>\n  )\n}\n",
"  if (status === 'sent') {\n    return (\n      <main className=\"fm fm--auth\">\n        <div className=\"fm__card\">\n          <h1 className=\"fm__title\">Check your email</h1>\n          <SuccessMessage title=\"If there is an account for that email address, we've sent a link to reset your password.\">\n            It can take a few minutes, and it might land in your spam folder.\n          </SuccessMessage>\n          <div className=\"fm__actions\">\n            <button type=\"button\" className=\"pg-btn\" onClick={() => setStatus('idle')}>Use a different email</button>\n          </div>\n          <p className=\"fm__links\">\n            <Link to=\"/login\">Back to log in</Link>\n          </p>\n        </div>\n      </main>\n    )\n  }\n\n  return (\n    <main className=\"fm fm--auth\">\n     <div className=\"fm__card\">\n      <h1 className=\"fm__title\">Forgot your password?</h1>\n      <p className=\"fm__sub\">Enter your email and we'll send you a link to choose a new one.</p>\n      <ErrorSummary errors={summary} />\n      {failure && <FailureMessage title=\"We couldn't send the email\">{failure}</FailureMessage>}\n      <form className=\"fm__form\" onSubmit={handleSubmit} noValidate>\n        <Field id=\"forgot-email\" label=\"Email\" error={fieldError}>\n          {(p) => <input {...p} type=\"email\" placeholder=\"Email\" autoComplete=\"email\" value={email} onChange={(e) => setEmail(e.target.value)} required />}\n        </Field>\n        <button type=\"submit\" className=\"pg-btn fm-btn--primary fm__submit\" disabled={status === 'sending'}>\n          {status === 'sending' ? 'Sending…' : 'Send reset link'}\n        </button>\n      </form>\n      <p className=\"fm__links\">\n        <Link to=\"/login\">Back to log in</Link>\n      </p>\n     </div>\n    </main>\n  )\n}\n"
]
],
"src/pages/Login.jsx": [
[
"import { Field, ErrorSummary, FailureMessage } from '../components/FormMessages'\nimport { emailProblem, loginMessage } from './formRules'\n\nexport default function Login() {\n",
"import { Field, ErrorSummary, FailureMessage } from '../components/FormMessages'\nimport { emailProblem, loginMessage } from './formRules'\nimport '../styles/pages.css'\nimport '../styles/forms.css'\n\nexport default function Login() {\n"
],
[
"\n  return (\n    <div>\n      <h1>Log in</h1>\n      <ErrorSummary errors={summary} />\n      {failure && <FailureMessage title=\"We couldn't log you in\">{failure}</FailureMessage>}\n      <form onSubmit={handleSubmit} noValidate>\n        <Field id=\"login-email\" label=\"Email\" error={fieldErrors.email}>\n          {(p) => <input {...p} type=\"email\" placeholder=\"Email\" autoComplete=\"email\" value={email} onChange={(e) => setEmail(e.target.value)} required />}\n        </Field>\n        <Field id=\"login-password\" label=\"Password\" error={fieldErrors.password}>\n          {(p) => <input {...p} type=\"password\" placeholder=\"Password\" autoComplete=\"current-password\" value={password} onChange={(e) => setPassword(e.target.value)} required />}\n        </Field>\n        <button type=\"submit\" disabled={busy}>\n          Log in\n        </button>\n      </form>\n      <p className=\"muted\">\n        <Link to=\"/forgot-password\">Forgot your password?</Link>\n      </p>\n      <p className=\"muted\">\n        Don't have an account? <Link to=\"/signup\">Sign up</Link>\n      </p>\n    </div>\n  )\n}\n",
"\n  return (\n    <main className=\"fm fm--auth\">\n     <div className=\"fm__card\">\n      <h1 className=\"fm__title\">Log in</h1>\n      <p className=\"fm__sub\">Welcome back.</p>\n      <ErrorSummary errors={summary} />\n      {failure && <FailureMessage title=\"We couldn't log you in\">{failure}</FailureMessage>}\n      <form className=\"fm__form\" onSubmit={handleSubmit} noValidate>\n        <Field id=\"login-email\" label=\"Email\" error={fieldErrors.email}>\n          {(p) => <input {...p} type=\"email\" placeholder=\"Email\" autoComplete=\"email\" value={email} onChange={(e) => setEmail(e.target.value)} required />}\n        </Field>\n        <Field id=\"login-password\" label=\"Password\" error={fieldErrors.password}>\n          {(p) => <input {...p} type=\"password\" placeholder=\"Password\" autoComplete=\"current-password\" value={password} onChange={(e) => setPassword(e.target.value)} required />}\n        </Field>\n        <button type=\"submit\" className=\"pg-btn fm-btn--primary fm__submit\" disabled={busy}>\n          Log in\n        </button>\n      </form>\n      <p className=\"fm__links\">\n        <Link to=\"/forgot-password\">Forgot your password?</Link>\n        <span>\n          New here? <Link to=\"/signup\">Sign up</Link>\n        </span>\n      </p>\n     </div>\n    </main>\n  )\n}\n"
]
],
"src/pages/NewPost.jsx": [
[
"import { supabase } from '../supabaseClient'\nimport { channels } from '../data/channels'\n\nexport default function NewPost({ session }) {\n",
"import { supabase } from '../supabaseClient'\nimport { channels } from '../data/channels'\nimport { Field, ErrorSummary, FailureMessage } from '../components/FormMessages'\nimport { MAX_PICTURE_MB, postProblems, summaryOf } from './postFormRules'\nimport '../styles/pages.css'\nimport '../styles/forms.css'\n\nconst IDS = { title: 'np-title', content: 'np-content', file: 'np-file' }\n\nexport default function NewPost({ session }) {\n"
],
[
"  const [file, setFile] = useState(null)\n  const [error, setError] = useState(null)\n  const [saving, setSaving] = useState(false)\n  const navigate = useNavigate()\n\n  async function handleSubmit(e) {\n    e.preventDefault()\n    setError(null)\n    setSaving(true)\n\n",
"  const [file, setFile] = useState(null)\n  const [error, setError] = useState(null)\n  const [errors, setErrors] = useState({}) // a plain-words problem under each field that needs fixing\n  const [saving, setSaving] = useState(false)\n  const navigate = useNavigate()\n\n  async function handleSubmit(e) {\n    e.preventDefault()\n    setError(null)\n    const found = postProblems({ title, content, file })\n    if (Object.keys(found).length > 0) {\n      setErrors(found)\n      return\n    }\n    setErrors({})\n    setSaving(true)\n\n"
],
[
"\n  return (\n    <div>\n      <h1>New Post</h1>\n      {error && <p className=\"error\">{error}</p>}\n      <form onSubmit={handleSubmit}>\n        <input\n          type=\"text\"\n          placeholder=\"Title\"\n          value={title}\n          onChange={(e) => setTitle(e.target.value)}\n          required\n        />\n        <textarea\n          placeholder=\"Write your post...\"\n          rows={10}\n          value={content}\n          onChange={(e) => setContent(e.target.value)}\n          required\n        />\n        <input\n          type=\"text\"\n          placeholder=\"Tags (comma separated, e.g. art, travel)\"\n          value={tags}\n          onChange={(e) => setTags(e.target.value)}\n        />\n        <select value={channel} onChange={(e) => setChannel(e.target.value)}>\n          <option value=\"\">No channel</option>\n          {channels.map((c) => (\n            <option key={c.slug} value={c.slug}>\n              {c.emoji} {c.name}\n            </option>\n          ))}\n        </select>\n        <input type=\"file\" accept=\"image/*\" onChange={(e) => setFile(e.target.files[0])} />\n        <button type=\"submit\" disabled={saving}>\n          {saving ? 'Publishing...' : 'Publish'}\n        </button>\n      </form>\n    </div>\n  )\n}",
"\n  return (\n    <main className=\"fm\">\n      <h1 className=\"fm__title\">New post</h1>\n      <ErrorSummary errors={summaryOf(errors, IDS)} />\n      {error && <FailureMessage title=\"The post was not saved\">{error}</FailureMessage>}\n      <form className=\"fm__form\" onSubmit={handleSubmit} noValidate>\n        <Field id=\"np-title\" label=\"Title\" error={errors.title}>\n          {(p) => <input {...p} type=\"text\" placeholder=\"Title\" value={title} onChange={(e) => setTitle(e.target.value)} />}\n        </Field>\n        <Field id=\"np-content\" label=\"Post text\" error={errors.content}>\n          {(p) => <textarea {...p} placeholder=\"Write your post...\" rows={10} value={content} onChange={(e) => setContent(e.target.value)} />}\n        </Field>\n        <div className=\"fm__row\">\n          <Field id=\"np-tags\" label=\"Tags\" help=\"Separate them with commas, for example art, travel.\">\n            {(p) => <input {...p} type=\"text\" placeholder=\"Tags (comma separated, e.g. art, travel)\" value={tags} onChange={(e) => setTags(e.target.value)} />}\n          </Field>\n          <Field id=\"np-room\" label=\"Room\">\n            {(p) => (\n              <select {...p} value={channel} onChange={(e) => setChannel(e.target.value)}>\n                <option value=\"\">No channel</option>\n                {channels.map((c) => (\n                  <option key={c.slug} value={c.slug}>\n                    {c.emoji} {c.name}\n                  </option>\n                ))}\n              </select>\n            )}\n          </Field>\n        </div>\n        <Field id=\"np-file\" label={`Header picture (optional, up to ${MAX_PICTURE_MB} MB)`} error={errors.file}>\n          {(p) => <input {...p} type=\"file\" accept=\"image/*\" onChange={(e) => setFile(e.target.files[0] || null)} />}\n        </Field>\n        <div className=\"fm__actions\">\n          <button type=\"submit\" className=\"pg-btn fm-btn--primary\" disabled={saving}>\n            {saving ? 'Publishing...' : 'Publish'}\n          </button>\n          <button type=\"button\" className=\"pg-btn\" onClick={() => navigate('/admin')}>\n            Cancel\n          </button>\n        </div>\n      </form>\n    </main>\n  )\n}\n"
]
],
"src/pages/NewProduct.jsx": [
[
"import { useNavigate } from 'react-router-dom'\nimport { supabase } from '../supabaseClient'\n\nconst COLLECTIONS = [\n",
"import { useNavigate } from 'react-router-dom'\nimport { supabase } from '../supabaseClient'\nimport { Field, FailureMessage } from '../components/FormMessages'\nimport '../styles/pages.css'\nimport '../styles/forms.css'\n\nconst COLLECTIONS = [\n"
],
[
"\n  return (\n    <div>\n      <h1>New Product</h1>\n      {error && <p className=\"error\">{error}</p>}\n      <form onSubmit={handleSubmit}>\n        <input\n          type=\"text\"\n          placeholder=\"Title\"\n          value={title}\n          onChange={(e) => setTitle(e.target.value)}\n          required\n        />\n        <textarea\n          placeholder=\"Description\"\n          rows={6}\n          value={description}\n          onChange={(e) => setDescription(e.target.value)}\n          required\n        />\n        <input\n          type=\"number\"\n          step=\"0.01\"\n          placeholder=\"Price (£)\"\n          value={price}\n          onChange={(e) => setPrice(e.target.value)}\n          required\n        />\n        <select value={productType} onChange={(e) => setProductType(e.target.value)}>\n          <option value=\"original\">Original</option>\n          <option value=\"print\">Print</option>\n          <option value=\"digital\">Digital Download</option>\n        </select>\n        <select value={collection} onChange={(e) => setCollection(e.target.value)}>\n          <option value=\"\">No collection</option>\n          {COLLECTIONS.map((c) => (\n            <option key={c} value={c}>\n              {c}\n            </option>\n          ))}\n        </select>\n        <label className=\"muted\" style={{ display: 'block', marginBottom: 6 }}>\n          Images (3–6 recommended, first one becomes the thumbnail)\n        </label>\n        <input\n          type=\"file\"\n          accept=\"image/*\"\n          multiple\n          onChange={(e) => setFiles(Array.from(e.target.files))}\n        />\n        <button type=\"submit\" disabled={saving}>\n          {saving ? 'Publishing...' : 'Publish Product'}\n        </button>\n      </form>\n    </div>\n  )\n}",
"\n  return (\n    <main className=\"fm\">\n      <h1 className=\"fm__title\">New product</h1>\n      {error && <FailureMessage title=\"The product was not saved\">{error}</FailureMessage>}\n      <form className=\"fm__form\" onSubmit={handleSubmit}>\n        <Field id=\"npr-title\" label=\"Title\">\n          {(p) => <input {...p} type=\"text\" placeholder=\"Title\" value={title} onChange={(e) => setTitle(e.target.value)} required />}\n        </Field>\n        <Field id=\"npr-description\" label=\"Description\">\n          {(p) => <textarea {...p} placeholder=\"Description\" rows={6} value={description} onChange={(e) => setDescription(e.target.value)} required />}\n        </Field>\n        <div className=\"fm__row\">\n          <Field id=\"npr-price\" label=\"Price (£)\">\n            {(p) => <input {...p} type=\"number\" step=\"0.01\" placeholder=\"Price (£)\" value={price} onChange={(e) => setPrice(e.target.value)} required />}\n          </Field>\n          <Field id=\"npr-type\" label=\"Kind of product\">\n            {(p) => (\n              <select {...p} value={productType} onChange={(e) => setProductType(e.target.value)}>\n                <option value=\"original\">Original</option>\n                <option value=\"print\">Print</option>\n                <option value=\"digital\">Digital Download</option>\n              </select>\n            )}\n          </Field>\n        </div>\n        <Field id=\"npr-collection\" label=\"Collection\">\n          {(p) => (\n            <select {...p} value={collection} onChange={(e) => setCollection(e.target.value)}>\n              <option value=\"\">No collection</option>\n              {COLLECTIONS.map((c) => (\n                <option key={c} value={c}>\n                  {c}\n                </option>\n              ))}\n            </select>\n          )}\n        </Field>\n        <Field id=\"npr-images\" label=\"Images\" help=\"3 to 6 recommended. The first one becomes the thumbnail.\">\n          {(p) => <input {...p} type=\"file\" accept=\"image/*\" multiple onChange={(e) => setFiles(Array.from(e.target.files))} />}\n        </Field>\n        <div className=\"fm__actions\">\n          <button type=\"submit\" className=\"pg-btn fm-btn--primary\" disabled={saving}>\n            {saving ? 'Publishing...' : 'Publish Product'}\n          </button>\n          <button type=\"button\" className=\"pg-btn\" onClick={() => navigate('/admin')}>\n            Cancel\n          </button>\n        </div>\n      </form>\n    </main>\n  )\n}\n"
]
],
"src/pages/ProductGallery.jsx": [
[
"\n  return (\n    <div>\n      <h1>🎨 The Art Loft</h1>\n\n",
"\n  return (\n    <div className=\"legacy\">\n      <h1>🎨 The Art Loft</h1>\n\n"
]
],
"src/pages/ProductPage.jsx": [
[
"\n  return (\n    <div>\n      <p>\n        <Link to=\"/products\">&larr; Back to The Art Loft</Link>\n",
"\n  return (\n    <div className=\"legacy\">\n      <p>\n        <Link to=\"/products\">&larr; Back to The Art Loft</Link>\n"
]
],
"src/pages/ResetPassword.jsx": [
[
"import { supabase } from '../supabaseClient'\nimport { Field, ErrorSummary, SuccessMessage } from '../components/FormMessages'\n\n// Step 2: the page the emailed link opens. Supabase signs you in briefly from the link, and this page lets you choose a new password.\n",
"import { supabase } from '../supabaseClient'\nimport { Field, ErrorSummary, SuccessMessage } from '../components/FormMessages'\nimport '../styles/pages.css'\nimport '../styles/forms.css'\n\n// Step 2: the page the emailed link opens. Supabase signs you in briefly from the link, and this page lets you choose a new password.\n"
],
[
"  if (phase === 'checking') {\n    return (\n      <div>\n        <h1>Reset your password</h1>\n        <p className=\"muted\" role=\"status\">Checking your link…</p>\n      </div>\n    )\n  }\n\n  if (phase === 'expired') {\n    return (\n      <div>\n        <h1>This link has expired</h1>\n        <p>The link may be old, or it may already have been used. Reset links only work once.</p>\n        <p><Link to=\"/forgot-password\">Send me a new link</Link></p>\n      </div>\n    )\n  }\n\n  if (phase === 'done') {\n    return (\n      <div>\n        <h1>Password updated</h1>\n        <SuccessMessage title=\"Your new password is saved and you're signed in.\" />\n        <p><Link to=\"/\">Continue to the homepage</Link></p>\n      </div>\n    )\n  }\n\n  return (\n    <div>\n      <h1>Choose a new password</h1>\n      <p className=\"muted\">Use at least 8 characters. If it isn't strong enough, you'll be told what's missing.</p>\n      <ErrorSummary errors={summary} />\n      <form onSubmit={handleSubmit} noValidate>\n        <Field id=\"reset-password\" label=\"New password\" error={fieldErrors.password}>\n          {(p) => <input {...p} type=\"password\" placeholder=\"New password\" autoComplete=\"new-password\" value={password} onChange={(e) => setPassword(e.target.value)} required />}\n        </Field>\n        <Field id=\"reset-confirm\" label=\"Confirm new password\" error={fieldErrors.confirm}>\n          {(p) => <input {...p} type=\"password\" placeholder=\"Type it again\" autoComplete=\"new-password\" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />}\n        </Field>\n        <button type=\"submit\" disabled={saving}>{saving ? 'Saving…' : 'Save new password'}</button>\n      </form>\n    </div>\n  )\n}\n",
"  if (phase === 'checking') {\n    return (\n      <main className=\"fm fm--auth\">\n        <div className=\"fm__card\">\n          <h1 className=\"fm__title\">Reset your password</h1>\n          <p className=\"fm__sub\" role=\"status\">Checking your link…</p>\n        </div>\n      </main>\n    )\n  }\n\n  if (phase === 'expired') {\n    return (\n      <main className=\"fm fm--auth\">\n        <div className=\"fm__card\">\n          <h1 className=\"fm__title\">This link has expired</h1>\n          <p className=\"fm__sub\">The link may be old, or it may already have been used. Reset links only work once.</p>\n          <p className=\"fm__links\"><Link to=\"/forgot-password\">Send me a new link</Link></p>\n        </div>\n      </main>\n    )\n  }\n\n  if (phase === 'done') {\n    return (\n      <main className=\"fm fm--auth\">\n        <div className=\"fm__card\">\n          <h1 className=\"fm__title\">Password updated</h1>\n          <SuccessMessage title=\"Your new password is saved and you're signed in.\" />\n          <p className=\"fm__links\"><Link to=\"/\">Continue to the homepage</Link></p>\n        </div>\n      </main>\n    )\n  }\n\n  return (\n    <main className=\"fm fm--auth\">\n     <div className=\"fm__card\">\n      <h1 className=\"fm__title\">Choose a new password</h1>\n      <p className=\"fm__sub\">Use at least 8 characters. If it isn't strong enough, you'll be told what's missing.</p>\n      <ErrorSummary errors={summary} />\n      <form className=\"fm__form\" onSubmit={handleSubmit} noValidate>\n        <Field id=\"reset-password\" label=\"New password\" error={fieldErrors.password}>\n          {(p) => <input {...p} type=\"password\" placeholder=\"New password\" autoComplete=\"new-password\" value={password} onChange={(e) => setPassword(e.target.value)} required />}\n        </Field>\n        <Field id=\"reset-confirm\" label=\"Confirm new password\" error={fieldErrors.confirm}>\n          {(p) => <input {...p} type=\"password\" placeholder=\"Type it again\" autoComplete=\"new-password\" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />}\n        </Field>\n        <button type=\"submit\" className=\"pg-btn fm-btn--primary fm__submit\" disabled={saving}>{saving ? 'Saving…' : 'Save new password'}</button>\n      </form>\n     </div>\n    </main>\n  )\n}\n"
]
],
"src/pages/Signup.jsx": [
[
"import { supabase } from '../supabaseClient'\nimport { Field, ErrorSummary, FailureMessage, SuccessMessage } from '../components/FormMessages'\nimport { emailProblem, signupMessage } from './formRules'\n\n",
"import { supabase } from '../supabaseClient'\nimport { Field, ErrorSummary, FailureMessage, SuccessMessage } from '../components/FormMessages'\nimport '../styles/pages.css'\nimport '../styles/forms.css'\nimport { emailProblem, signupMessage } from './formRules'\n\n"
],
[
"\n  return (\n    <div>\n      <h1>Sign up</h1>\n      <ErrorSummary errors={summary} />\n      {failure && <FailureMessage title=\"We couldn't create your account\">{failure}</FailureMessage>}\n      {info && <SuccessMessage title=\"Account created\">{info}</SuccessMessage>}\n      <form onSubmit={handleSubmit} noValidate>\n        <Field id=\"signup-email\" label=\"Email\" error={fieldErrors.email}>\n          {(p) => <input {...p} type=\"email\" placeholder=\"Email\" autoComplete=\"email\" value={email} onChange={(e) => setEmail(e.target.value)} required />}\n",
"\n  return (\n    <main className=\"fm fm--auth\">\n     <div className=\"fm__card\">\n      <h1 className=\"fm__title\">Sign up</h1>\n      <p className=\"fm__sub\">So you can follow along, and keep your orders in one place.</p>\n      <ErrorSummary errors={summary} />\n      {failure && <FailureMessage title=\"We couldn't create your account\">{failure}</FailureMessage>}\n      {info && <SuccessMessage title=\"Account created\">{info}</SuccessMessage>}\n      <form className=\"fm__form\" onSubmit={handleSubmit} noValidate>\n        <Field id=\"signup-email\" label=\"Email\" error={fieldErrors.email}>\n          {(p) => <input {...p} type=\"email\" placeholder=\"Email\" autoComplete=\"email\" value={email} onChange={(e) => setEmail(e.target.value)} required />}\n"
],
[
"          )}\n        </Field>\n        <button type=\"submit\" disabled={busy}>\n          Create account\n        </button>\n      </form>\n      <p className=\"muted\">\n        Already have an account? <Link to=\"/login\">Log in</Link>\n      </p>\n    </div>\n  )\n}\n",
"          )}\n        </Field>\n        <button type=\"submit\" className=\"pg-btn fm-btn--primary fm__submit\" disabled={busy}>\n          Create account\n        </button>\n      </form>\n      <p className=\"fm__links\">\n        <span>\n          Already have an account? <Link to=\"/login\">Log in</Link>\n        </span>\n      </p>\n     </div>\n    </main>\n  )\n}\n"
]
]
}''')
NEW_FILES = ["src/styles/forms.css", "src/styles/legacy.css", "src/pages/postFormRules.js"]

root = pathlib.Path('.')
if not (root / 'src').exists() or not (root / 'package.json').exists():
    print('NOT FOUND  src or package.json (run this from the project folder)')
    sys.exit(1)
NEEDS_FIRST = ["src/bookclub/BookClubPage.jsx", "src/styles/pages.css"]
not_first = [f for f in NEEDS_FIRST if not (root / f).exists()]
if not_first:
    print('Install the Book Club update first (starscapes-book-club-17oct.zip). These files from it are missing: ' + ', '.join(not_first) + '. Nothing was changed.')
    sys.exit(1)
missing = [f for f in NEW_FILES if not (root / f).exists()]
if missing:
    print('Unzip starscapes-restyle-two-18oct.zip into the project folder first. These files are missing: ' + ', '.join(missing) + '. Nothing was changed.')
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
    pathlib.Path(str(p) + '.before-restyle-two').write_text(before, encoding='utf-8')
    p.write_text(after, encoding='utf-8')
    print('changed       ' + rel)
for rel in done:
    print('already done  ' + rel)
if not plan:
    print('\nEverything was already in place.')
else:
    print('\nDone. Next: node tools/health-check.mjs, then npm run build.')
