import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import './artloft.css'
import useTitle from './useTitle'
import { fetchPrints, setPublished, setCollection, setDescription, currentUser, fetchPictureList, savePicture, fetchCatalogue, fetchShopCatalogue, syncRepo } from './artLoftApi'
import { planSync, applySync } from './sync'
import SyncPlan from './SyncPlan'
import DescriptionEditor from './DescriptionEditor'
import DeliveryTools from './DeliveryTools'
import OrdersPanel from './OrdersPanel'
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
    // Prints with no collection come FIRST: they are the ones that need you, and they are easy to miss at the bottom of a long page
    return [...(other.length ? [{ name: 'No collection', items: other, needsPlacing: true }] : []), ...known.filter((g) => g.items.length)]
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

  // Sync with Creative Hub: compare first, then apply only if the plan looks right
  const [sync, setSync] = useState({ phase: 'idle', plan: null, text: '' }) // idle | comparing | plan | applying | done | error
  async function compareWithHub() {
    setSync({ phase: 'comparing', plan: null, text: 'Asking Creative Hub, and looking at your shop…' })
    try {
      const [catalogue, shop] = await Promise.all([fetchCatalogue(), fetchShopCatalogue(user.id)])
      setSync({ phase: 'plan', plan: planSync(catalogue.prints, shop), text: '' })
    } catch (e) {
      setSync({ phase: 'error', plan: null, text: e.message })
    }
  }
  async function applyChanges() {
    const plan = sync.plan
    setSync({ phase: 'applying', plan, text: 'Syncing…' })
    const r = await applySync(plan, syncRepo, user.id, (done, total) => setSync((s) => ({ ...s, text: `Syncing… ${done} of ${total}` })))
    try {
      const all = await fetchPrints()
      setPrints(all.filter((p) => p.author_id === user.id))
    } catch (e) {
      /* the list will refresh next time the page opens */
    }
    const did = [
      r.added && `${r.added} added`,
      r.refreshed && `${r.refreshed} refreshed`,
      r.replaced && `${r.replaced} replaced`,
      r.hidden && `${r.hidden} hidden`,
      r.removed && `${r.removed} removed`,
    ].filter(Boolean)
    const parts = [`Done${did.length ? `: ${did.join(', ')}` : ''}.`]
    if (r.failures.length) parts.push(`${r.failures.length} could not be finished (${r.failures.map((f) => f.name).join(', ')}). Press Compare again to see what is left. First problem: ${r.failures[0].message}`)
    setSync({ phase: r.failures.length ? 'error' : 'done', plan: null, text: parts.join(' ') })
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

  async function saveDescription(print, text) {
    setBusy(true)
    setMessage('')
    try {
      await setDescription(print.id, text)
      setPrints((cur) => cur.map((p) => (p.id === print.id ? { ...p, description: text } : p)))
      setMessage(text ? `Saved the description for ${print.title}.` : `Cleared the description for ${print.title}.`)
    } catch (e) {
      setMessage('That did not save. Nothing was changed. Please try again.')
    } finally {
      setBusy(false)
    }
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
    <main className="al al-admin legacy">
      <p className="al-back"><Link to="/art-loft">← Back to the Art Loft</Link></p>
      <h1>Manage prints</h1>
      <p className="al-admin__links"><Link className="al-btn al-btn--quiet" to="/art-loft/admin/originals">Manage original paintings</Link></p>
      <p className="al-blurb">
        {prints.length} prints, {live} live. A print is only visible to visitors once you switch it on. You can always see all of them while you are signed in. Use the drop-down beside a print to move it to a different collection.
      </p>
      <p className="al-note" role="status">{message}</p>

      {prints.length > 0 && (
        <section className="al-admin__pictures al-admin__sync" aria-labelledby="sync-title">
          <h2 id="sync-title">Sync with Creative Hub</h2>
          <p>
            Names, prices, artwork, sizes, frames and pictures follow Creative Hub, so change them there and then sync here. It only compares first: nothing changes until you press Apply. Your collections and what is live are never changed on a print that is still at Creative Hub.
          </p>
          {sync.phase === 'plan' ? (
            <SyncPlan plan={sync.plan} onApply={applyChanges} onCancel={() => setSync({ phase: 'idle', plan: null, text: '' })} />
          ) : (
            <button type="button" disabled={sync.phase === 'comparing' || sync.phase === 'applying'} onClick={compareWithHub}>
              {sync.phase === 'comparing' ? 'Comparing…' : sync.phase === 'applying' ? 'Syncing…' : 'Compare with Creative Hub'}
            </button>
          )}
          <p className={`al-admin__fill is-${sync.phase}`} role="status">{sync.text}</p>
        </section>
      )}

      {prints.length > 0 && <OrdersPanel />}

      {prints.length > 0 && <DeliveryTools />}

      {prints.length > 0 && (
        <section className="al-admin__pictures" aria-labelledby="pictures-title">
          <h2 id="pictures-title">Pictures only</h2>
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
              {!g.needsPlacing && (
              <div className="al-admin__bulk">
                <button type="button" disabled={busy || !off.length} onClick={() => apply(off, true, `Switched on in ${g.name}`)}>Switch all on</button>
                <button type="button" disabled={busy || !on.length} onClick={() => apply(on, false, `Switched off in ${g.name}`)}>Switch all off</button>
              </div>
              )}
            </div>
            {g.needsPlacing && (
              <p className="al-admin__needs">These prints are not in a collection yet, so they do not appear on any canvas. Use the drop-down beside each one to place it.</p>
            )}
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
                  <details className="al-admin__describe" key={`d-${p.id}`}>
                    <summary>{p.description ? 'Edit description' : 'Add description'}</summary>
                    <DescriptionEditor print={p} busy={busy} onSave={saveDescription} />
                  </details>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </main>
  )
}
