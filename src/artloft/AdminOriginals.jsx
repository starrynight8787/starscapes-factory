import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import './artloft.css'
import useTitle from './useTitle'
import { fetchOriginals, saveOriginal, setSold, setPublished, deleteOriginal, uploadOriginalPhotos, discardOriginalPhotos, currentUser, MISSING_ORIGINAL_COLUMNS } from './artLoftApi'
import { COLLECTIONS, formatPrice } from './artLoftData'
import { readOriginalForm, checkPhotos, isSold, sizeText, MAX_PHOTOS, MAX_PHOTO_MB } from './originals'

const EMPTY = { title: '', collection: '', price: '', medium: '', width_cm: '', height_cm: '', depth_cm: '', year: '', framed: '', description: '' }
const COLLECTION_NAMES = COLLECTIONS.map((c) => c.name)
const SAVE_FAILED = 'That did not save. Nothing was changed. Please try again.'

const formFrom = (o) => ({
  title: o.title || '',
  collection: o.collection || '',
  price: o.price == null ? '' : String(o.price),
  medium: o.medium || '',
  width_cm: o.width_cm == null ? '' : String(o.width_cm),
  height_cm: o.height_cm == null ? '' : String(o.height_cm),
  depth_cm: o.depth_cm == null ? '' : String(o.depth_cm),
  year: o.year == null ? '' : String(o.year),
  framed: o.framed === true ? 'yes' : o.framed === false ? 'no' : '',
  description: o.description || '',
})

// Manage your original paintings, at /art-loft/admin/originals. Only you will find this page.
export default function AdminOriginals() {
  useTitle('Manage originals')
  const [user, setUser] = useState(undefined) // undefined = checking, null = signed out
  const [originals, setOriginals] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error | missing
  const [message, setMessage] = useState({ text: '', kind: '' })
  const [busyId, setBusyId] = useState(null)
  const [confirming, setConfirming] = useState(null)
  const [editing, setEditing] = useState(null) // null, 'new', or the id being edited
  const [form, setForm] = useState(EMPTY)
  const [kept, setKept] = useState([]) // photos already saved with this piece
  const [files, setFiles] = useState([]) // photos chosen but not uploaded yet
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const u = await currentUser()
        if (!alive) return
        setUser(u)
        if (!u) return setStatus('ready')
        const all = await fetchOriginals()
        if (!alive) return
        setOriginals(all.filter((o) => o.author_id === u.id))
        setStatus('ready')
      } catch (e) {
        if (alive) setStatus(e && e.message === MISSING_ORIGINAL_COLUMNS ? 'missing' : 'error')
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const say = (text, kind = 'done') => setMessage({ text, kind })
  const patch = (id, changes) => setOriginals((cur) => cur.map((o) => (o.id === id ? { ...o, ...changes } : o)))

  // drafts first (they need you), then pieces for sale, then sold ones
  const rows = useMemo(() => {
    const rank = (o) => (!o.published ? 0 : isSold(o) ? 2 : 1)
    return originals.slice().sort((a, b) => rank(a) - rank(b) || String(a.title).localeCompare(String(b.title)))
  }, [originals])

  const counts = useMemo(() => {
    const sold = originals.filter(isSold).length
    const live = originals.filter((o) => o.published).length
    return { total: originals.length, sold, available: originals.length - sold, live, drafts: originals.length - live }
  }, [originals])

  async function toggleSold(o) {
    const nowSold = !isSold(o)
    setBusyId(o.id)
    say('')
    try {
      await setSold(o.id, nowSold)
      patch(o.id, { status: nowSold ? 'sold' : 'available', sold_at: nowSold ? new Date().toISOString() : null })
      say(nowSold ? `Marked as sold: ${o.title}. It now shows a Sold label.` : `Marked as available again: ${o.title}.`)
    } catch (e) {
      say(SAVE_FAILED, 'error')
    } finally {
      setBusyId(null)
    }
  }

  async function toggleLive(o) {
    const next = !o.published
    if (next && (!(o.images && o.images.length) || !(Number(o.price) > 0))) {
      return say(`${o.title} can't be switched on yet. It needs at least one photo and a price. Choose Edit to add them.`, 'error')
    }
    setBusyId(o.id)
    say('')
    try {
      await setPublished([o.id], next)
      patch(o.id, { published: next })
      say(next ? `Switched on: ${o.title}. Visitors can see it now.` : `Switched off: ${o.title}. Only you can see it now.`)
    } catch (e) {
      say(SAVE_FAILED, 'error')
    } finally {
      setBusyId(null)
    }
  }

  async function remove(o) {
    setBusyId(o.id)
    say('')
    try {
      await deleteOriginal(o.id)
      setOriginals((cur) => cur.filter((x) => x.id !== o.id))
      say(`Deleted the draft: ${o.title}.`)
    } catch (e) {
      say(SAVE_FAILED, 'error')
    } finally {
      setBusyId(null)
      setConfirming(null)
    }
  }

  function openForm(o) {
    setEditing(o ? o.id : 'new')
    setForm(o ? formFrom(o) : EMPTY)
    setKept(o ? (o.images || []).slice() : [])
    setFiles([])
    setErrors({})
    say('')
  }
  function closeForm() {
    setEditing(null)
    setErrors({})
  }
  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  function choosePhotos(e) {
    const picked = Array.from(e.target.files || [])
    e.target.value = ''
    if (!picked.length) return
    const problem = checkPhotos(picked, kept.length + files.length)
    if (problem) return setErrors((er) => ({ ...er, images: problem }))
    setErrors((er) => ({ ...er, images: undefined }))
    setFiles((cur) => [...cur, ...picked])
  }
  const makeMain = (i) => setKept((cur) => [cur[i], ...cur.filter((_, n) => n !== i)])

  async function submit(e) {
    e.preventDefault()
    say('')
    const { values, errors: found } = readOriginalForm({ ...form, images: kept }, { collections: COLLECTION_NAMES })
    if (kept.length + files.length > MAX_PHOTOS) found.images = `An original can have up to ${MAX_PHOTOS} photos.`
    const clean = Object.fromEntries(Object.entries(found).filter(([, v]) => v))
    setErrors(clean)
    if (Object.keys(clean).length) return say('Please fix what is marked below. Nothing was saved.', 'error')
    const existing = editing !== 'new' ? originals.find((o) => o.id === editing) : null
    setSaving(files.length ? `Uploading photo 1 of ${files.length}…` : 'Saving…')
    let uploaded = []
    try {
      if (existing && existing.published && kept.length + files.length === 0) throw new Error('A piece that is switched on needs at least one photo. Switch it off first, or keep a photo.')
      uploaded = files.length ? await uploadOriginalPhotos(files, user.id, (n, total) => setSaving(`Uploading photo ${n} of ${total}…`)) : []
      const images = [...kept, ...uploaded.map((u) => u.url)]
      setSaving('Saving…')
      const toSave = { ...values, images }
      const id = await saveOriginal(toSave, { id: existing ? existing.id : null, userId: user.id })
      if (existing) {
        patch(id, toSave)
        say(`Saved: ${values.title}.`)
      } else {
        setOriginals((cur) => [...cur, { id, author_id: user.id, published: false, status: 'available', sold_at: null, ...toSave }])
        say(`Saved as a draft: ${values.title}. Switch it on when you want visitors to see it.`)
      }
      setEditing(null)
      setFiles([])
    } catch (err) {
      await discardOriginalPhotos(uploaded.map((u) => u.path)) // do not leave photos behind for a piece that was not saved
      say(`${err && err.message ? err.message : SAVE_FAILED} Nothing was saved.`, 'error')
    } finally {
      setSaving('')
    }
  }

  if (user === undefined && status === 'loading') {
    return (
      <main className="al al-admin">
        <h1>Manage originals</h1>
        <p className="al-note">Loading…</p>
      </main>
    )
  }
  if (!user) {
    return (
      <main className="al al-admin">
        <h1>Manage originals</h1>
        <p>Please <Link to="/login">log in</Link> to manage originals.</p>
      </main>
    )
  }

  const field = (key, label, input, help) => (
    <div className="al-field">
      <label className="al-field__label" htmlFor={`orig-${key}`}>{label}</label>
      {input}
      {help && <small>{help}</small>}
      {errors[key] && <small className="al-field__error" role="alert">{errors[key]}</small>}
    </div>
  )

  return (
    <main className="al al-admin">
      <p className="al-back">
        <Link to="/art-loft">← Back to the Art Loft</Link>
        <Link to="/art-loft/admin">Manage prints</Link>
      </p>
      <h1>Manage originals</h1>
      <p className="al-blurb">
        Originals are one of a kind. Mark one as sold when it goes, and it stays on its page with a Sold label. You can undo that at any time. A new original starts as a draft that only you can see.
      </p>

      {status === 'missing' && <p className="al-admin__fill is-error" role="alert">{MISSING_ORIGINAL_COLUMNS}</p>}
      {status === 'error' && <p className="al-admin__fill is-error" role="alert">The originals could not load just now. Please try again in a moment.</p>}

      {status === 'ready' && (
        <>
          <p className="al-admin__counts">
            {counts.total} {counts.total === 1 ? 'original' : 'originals'}: {counts.available} available, {counts.sold} sold. {counts.live} switched on, {counts.drafts} {counts.drafts === 1 ? 'draft' : 'drafts'}.
          </p>
          <p className={`al-admin__fill${message.kind === 'error' ? ' is-error' : message.text ? ' is-done' : ''}`} role={message.kind === 'error' ? 'alert' : 'status'}>{message.text}</p>

          {!editing && (
            <p>
              <button type="button" className="al-btn al-btn--solid" onClick={() => openForm(null)}>Add an original</button>
            </p>
          )}

          {editing && (
            <form className="al-orig-form" onSubmit={submit} noValidate>
              <h2>{editing === 'new' ? 'Add an original' : 'Edit this original'}</h2>
              {field('title', 'Title', <input id="orig-title" type="text" value={form.title} onChange={setField('title')} maxLength={120} />)}
              {field('collection', 'Collection', (
                <select id="orig-collection" value={form.collection} onChange={setField('collection')}>
                  <option value="">No collection</option>
                  {COLLECTION_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              ), 'It will show on that collection\'s page as well as the Originals page.')}
              {field('price', 'Price (£)', <input id="orig-price" type="text" inputMode="decimal" value={form.price} onChange={setField('price')} />)}
              {field('medium', 'Medium', <input id="orig-medium" type="text" value={form.medium} onChange={setField('medium')} placeholder="For example: acrylic on canvas" />)}
              <div className="al-orig-form__sizes">
                {field('width_cm', 'Width (cm)', <input id="orig-width_cm" type="text" inputMode="decimal" value={form.width_cm} onChange={setField('width_cm')} />)}
                {field('height_cm', 'Height (cm)', <input id="orig-height_cm" type="text" inputMode="decimal" value={form.height_cm} onChange={setField('height_cm')} />)}
                {field('depth_cm', 'Depth (cm)', <input id="orig-depth_cm" type="text" inputMode="decimal" value={form.depth_cm} onChange={setField('depth_cm')} />)}
              </div>
              {field('year', 'Year', <input id="orig-year" type="text" inputMode="numeric" value={form.year} onChange={setField('year')} maxLength={4} />)}
              {field('framed', 'Framed', (
                <select id="orig-framed" value={form.framed} onChange={setField('framed')}>
                  <option value="">Not said</option>
                  <option value="yes">Framed</option>
                  <option value="no">Unframed</option>
                </select>
              ))}
              {field('description', 'Description', <textarea id="orig-description" rows={5} value={form.description} onChange={setField('description')} />)}

              <fieldset className="al-orig-photos">
                <legend>Photos</legend>
                <p className="al-orig-photos__help">The first photo is the main one. Up to {MAX_PHOTOS} photos, each smaller than {MAX_PHOTO_MB} MB.</p>
                {kept.length > 0 && (
                  <ul>
                    {kept.map((src, i) => (
                      <li key={src}>
                        <img src={src} alt={`Photo ${i + 1}`} />
                        <span>
                          <button type="button" className="al-btn al-btn--quiet" onClick={() => setKept((cur) => cur.filter((_, n) => n !== i))}>Remove photo {i + 1}</button>
                          {i > 0 && <button type="button" className="al-btn al-btn--quiet" onClick={() => makeMain(i)}>Make photo {i + 1} the main one</button>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {files.length > 0 && (
                  <ul>
                    {files.map((f, i) => (
                      <li key={`${f.name}-${i}`}>
                        <span className="al-orig-photos__new">{f.name} ({(f.size / 1024 / 1024).toFixed(1)} MB), to upload when you save</span>
                        <button type="button" className="al-btn al-btn--quiet" onClick={() => setFiles((cur) => cur.filter((_, n) => n !== i))}>Remove {f.name}</button>
                      </li>
                    ))}
                  </ul>
                )}
                <label className="al-field__label" htmlFor="orig-photos">Add photos</label>
                <input id="orig-photos" type="file" accept="image/*" multiple onChange={choosePhotos} />
                {errors.images && <small className="al-field__error" role="alert">{errors.images}</small>}
              </fieldset>

              <p className="al-orig-form__buttons">
                <button type="submit" className="al-btn al-btn--solid" disabled={Boolean(saving)}>{saving || 'Save'}</button>
                <button type="button" className="al-btn al-btn--quiet" onClick={closeForm} disabled={Boolean(saving)}>Cancel</button>
              </p>
            </form>
          )}

          {rows.length === 0 && !editing && <p className="al-note">No originals yet. Choose Add an original to start.</p>}
          <ul className="al-orig-list">
            {rows.map((o) => {
              const sold = isSold(o)
              const busy = busyId === o.id
              return (
                <li key={o.id} className={sold ? 'is-sold' : ''}>
                  {o.images && o.images[0] ? <img src={o.images[0]} alt="" /> : <span className="al-orig-list__blank" aria-hidden="true" />}
                  <div className="al-orig-list__info">
                    <strong>{o.title}</strong>
                    <span>{formatPrice(o.price)}{sizeText(o) ? `, ${sizeText(o)}` : ''}{o.collection ? `, ${o.collection}` : ', no collection'}</span>
                    <span className="al-orig-list__chips">
                      <span className={`al-chip ${o.published ? 'is-live' : 'is-draft'}`}>{o.published ? 'Switched on' : 'Draft'}</span>
                      <span className={`al-chip ${sold ? 'is-sold' : 'is-available'}`}>{sold ? 'Sold' : 'Available'}</span>
                    </span>
                  </div>
                  <div className="al-orig-list__buttons">
                    <button type="button" className={`al-btn ${sold ? 'al-btn--quiet' : 'al-btn--solid'}`} disabled={busy} onClick={() => toggleSold(o)} aria-label={sold ? `Mark ${o.title} as available again` : `Mark ${o.title} as sold`}>
                      {sold ? 'Mark as available again' : 'Mark as sold'}
                    </button>
                    <button type="button" className="al-btn al-btn--quiet" disabled={busy} onClick={() => toggleLive(o)} aria-label={o.published ? `Switch ${o.title} off` : `Switch ${o.title} on`}>
                      {o.published ? 'Switch off' : 'Switch on'}
                    </button>
                    <button type="button" className="al-btn al-btn--quiet" disabled={busy} onClick={() => openForm(o)} aria-label={`Edit ${o.title}`}>Edit</button>
                    {!o.published && confirming !== o.id && (
                      <button type="button" className="al-btn al-btn--quiet" disabled={busy} onClick={() => setConfirming(o.id)} aria-label={`Delete ${o.title}`}>Delete</button>
                    )}
                    {!o.published && confirming === o.id && (
                      <span className="al-orig-list__confirm" role="group" aria-label={`Delete ${o.title}?`}>
                        Delete this draft for good?
                        <button type="button" className="al-btn al-btn--danger" disabled={busy} onClick={() => remove(o)}>Yes, delete {o.title}</button>
                        <button type="button" className="al-btn al-btn--quiet" onClick={() => setConfirming(null)}>Keep it</button>
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </main>
  )
}
