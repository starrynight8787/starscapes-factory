import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import './artloft.css'
import useTitle from './useTitle'
import { fetchPrints, setPublished, setCollection, currentUser, fetchPictureList, savePicture } from './artLoftApi'
import { COLLECTIONS, formatPrice } from './artLoftData'

// Only you will find this page, at /art-loft/admin. Anyone else sees nothing to manage.
export default function AdminPrints() {
  useTitle('Manage prints')
  const [user, setUser] = useState(undefined) // undefined = checking, null = signed out
  const [prints, setPrints] = useState([])
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const u = await currentUser()
        if (!alive) return
        setUser(u)
        if (!u) return setStatus('ready')
        const all = await fetchPrints()
        if (!alive) return
        setPrints(all.filter((p) => p.author_id === u.id))
        setStatus('ready')
      } catch (e) {
        if (alive) setStatus('error')
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const groups = useMemo(() => {
    const known = COLLECTIONS.map((c) => ({ name: c.name, items: prints.filter((p) => p.collection === c.name) }))
    const names = new Set(COLLECTIONS.map((c) => c.name))
    const other = prints.filter((p) => !names.has(p.collection))
    return [...known, { name: 'No collection', items: other }].filter((g) => g.items.length)
  }, [prints])

  async function apply(ids, published, doing) {
    if (!ids.length) return
    setBusy(true)
    setMessage('')
    try {
      await setPublished(ids, published)
      setPrints((cur) => cur.map((p) => (ids.includes(p.id) ? { ...p, published } : p)))
      setMessage(`${doing}: ${ids.length} ${ids.length === 1 ? 'print' : 'prints'}.`)
    } catch (e) {
      setMessage('That did not save. Nothing was changed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function move(print, collection) {
    setBusy(true)
    setMessage('')
    try {
      await setCollection(print.id, collection)
      setPrints((cur) => cur.map((p) => (p.id === print.id ? { ...p, collection } : p)))
      setMessage(collection ? `Moved ${print.title} to ${collection}.` : `Moved ${print.title} out of its collection.`)
    } catch (e) {
      setMessage('That did not save. Nothing was changed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  // Fill in the picture of every size and frame from Creative Hub, six at a time, with a running count
  const [fill, setFill] = useState({ phase: 'idle', text: '' }) // idle | working | done | error
  async function fillPictures() {
    setFill({ phase: 'working', text: 'Asking Creative Hub for the pictures…' })
    let list
    try {
      list = await fetchPictureList()
    } catch (e) {
      return setFill({ phase: 'error', text: e.message })
    }
    const queue = list.pictures.slice()
    const total = queue.length
    let saved = 0
    let unmatched = 0
    let failed = 0
    let noColumn = false
    let finished = 0
    async function worker() {
      while (queue.length) {
        const item = queue.shift()
        try {
          if (await savePicture(item.variant_id, item.url)) saved++
          else unmatched++
        } catch (e) {
          if (/image_url/i.test((e && e.message) || '')) noColumn = true
          failed++
        }
        finished++
        if (finished % 10 === 0 && finished < total) setFill({ phase: 'working', text: `Saving… ${finished} of ${total}` })
      }
    }
    await Promise.all(Array.from({ length: 6 }, worker))
    if (noColumn) {
      return setFill({ phase: 'error', text: 'The picture column is not in the database yet. Run this one line in the Supabase SQL editor, then press the button again: alter table product_variants add column if not exists image_url text;' })
    }
    const parts = [`Done. ${saved} ${saved === 1 ? 'picture' : 'pictures'} saved.`]
    if (unmatched) parts.push(`${unmatched} at Creative Hub ${unmatched === 1 ? 'is' : 'are'} not in your shop, so ${unmatched === 1 ? 'it was' : 'they were'} skipped.`)
    if (failed) parts.push(`${failed} could not be saved. Press the button again to retry ${failed === 1 ? 'it' : 'them'}.`)
    setFill({ phase: failed ? 'error' : 'done', text: parts.join(' ') })
  }

  const live = prints.filter((p) => p.published).length

  if (user === undefined || status === 'loading') return <main className="al"><p className="al-note">Loading…</p></main>
  if (status === 'error') return <main className="al"><p className="al-note" role="alert">The prints could not load just now. Please try again.</p></main>
  if (!user) {
    return (
      <main className="al">
        <h1>Manage prints</h1>
        <p>Please <Link to="/login">log in</Link> to manage prints.</p>
      </main>
    )
  }

  return (
    <main className="al al-admin">
      <p className="al-back"><Link to="/art-loft">← The Art Loft</Link></p>
      <h1>Manage prints</h1>
      <p className="al-blurb">
        {prints.length} prints, {live} live. A print is only visible to visitors once you switch it on. You can always see all of them while you are signed in. Use the drop-down beside a print to move it to a different collection.
      </p>
      <p className="al-note" role="status">{message}</p>

      {prints.length > 0 && (
        <section className="al-admin__pictures" aria-labelledby="pictures-title">
          <h2 id="pictures-title">Pictures of each size and frame</h2>
          <p>
            Fetches Creative Hub's picture of every size and frame and saves it to your shop, so the print page can show each frame. It is safe to press again whenever you add or change prints. It never changes prices, collections, or what is live.
          </p>
          <button type="button" disabled={fill.phase === 'working'} onClick={fillPictures}>
            {fill.phase === 'working' ? 'Working…' : 'Fill in pictures from Creative Hub'}
          </button>
          <p className={`al-admin__fill is-${fill.phase}`} role="status">{fill.text}</p>
        </section>
      )}

      {groups.length === 0 && <p className="al-note">There are no prints to manage.</p>}
      {groups.map((g) => {
        const off = g.items.filter((p) => !p.published).map((p) => p.id)
        const on = g.items.filter((p) => p.published).map((p) => p.id)
        return (
          <section key={g.name} className="al-admin__group" aria-labelledby={`g-${g.name}`}>
            <div className="al-admin__head">
              <h2 id={`g-${g.name}`}>{g.name} <small>{g.items.length}</small></h2>
              <div className="al-admin__bulk">
                <button type="button" disabled={busy || !off.length} onClick={() => apply(off, true, `Switched on in ${g.name}`)}>Switch all on</button>
                <button type="button" disabled={busy || !on.length} onClick={() => apply(on, false, `Switched off in ${g.name}`)}>Switch all off</button>
              </div>
            </div>
            <ul className="al-admin__list">
              {g.items.map((p) => (
                <li key={p.id}>
                  <Link to={`/art-loft/prints/${p.id}`}>{p.title}</Link>
                  <span className="al-admin__price">{formatPrice(p.price)}</span>
                  <select className="al-admin__select" value={p.collection || ''} disabled={busy} onChange={(e) => move(p, e.target.value)} aria-label={`${p.title}: collection`}>
                    {COLLECTIONS.map((c) => (
                      <option key={c.slug} value={c.name}>{c.name}</option>
                    ))}
                    {p.collection && !COLLECTIONS.some((c) => c.name === p.collection) && <option value={p.collection}>{p.collection}</option>}
                    <option value="">No collection</option>
                  </select>
                  <label className="al-switch">
                    <input type="checkbox" checked={Boolean(p.published)} disabled={busy} onChange={(e) => apply([p.id], e.target.checked, e.target.checked ? 'Switched on' : 'Switched off')} aria-label={`${p.title}: show to visitors`} />
                    <span>{p.published ? 'Live' : 'Draft'}</span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </main>
  )
}
