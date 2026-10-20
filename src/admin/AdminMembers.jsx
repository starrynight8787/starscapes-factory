import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageLoading from '../components/PageLoading'
import { PASSES } from '../membership/passes'
import { formatDate } from '../membership/account'
import useTitle from '../pages/useTitle'
import { useOwnerCheck } from './useIsOwner'
import { fetchMembers } from './membersAdminApi'
import { STATUS_CHOICES, countByPass, dateLine, filterMembers, offerWords, passesLine, paymentLine, priceRows, statusWords, stripeUrl, summarise } from './membersRules'
import '../styles/pages.css'
import './admin.css'
import './adminv2.css'
import AdminBanner from './AdminBanner'
import './adminmembers.css'

// The owner's page at /admin/members: the five passes and what they cost (from the same sums checkout uses), how many people hold each pass, and a list of members with their
// email, passes, what they pay, and when they pay next. It is for looking: cancelling, refunding and changing a card are done in Stripe, which each member links to.
export default function AdminMembers({ session }) {
  useTitle('Passes and members')
  const { checking, owner } = useOwnerCheck(session)
  const [state, setState] = useState({ phase: 'loading', members: [], mode: 'unknown', emailsOk: true })
  const [pass, setPass] = useState('all')
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!owner) return undefined
    let alive = true
    fetchMembers()
      .then((r) => alive && setState({ phase: 'ready', members: r.members, mode: r.mode, emailsOk: r.emailsOk }))
      .catch((e) => alive && setState((s) => ({ ...s, phase: 'error', message: e && e.message })))
    return () => { alive = false }
  }, [owner])

  const { members } = state
  const total = useMemo(() => summarise(members), [members])
  const byPass = useMemo(() => countByPass(members), [members])
  const shown = useMemo(() => filterMembers(members, { pass, status, search }), [members, pass, status, search])
  const prices = useMemo(() => priceRows(), [])

  if (checking) return <PageLoading label="Checking who you are…" />
  if (!owner) return <main className="ad"><h1>Passes and members</h1><p className="ad-note">This area is for the site owner.</p><p><Link to="/">Back to the homepage</Link></p></main>

  return (
    <main className="ad ad--wide am">
      <AdminBanner chip="Passes and members" title="Passes and members" subtitle="The five passes and what they cost, who holds them, and when each member pays next. This page is for looking: to cancel, refund or change a card, open the member in Stripe." icon="passes" room="factory-floor" />

      {state.phase === 'ready' && state.mode !== 'unknown' && (
        <p className={`am__mode am__mode--${state.mode}`} role="note"><strong>{state.mode === 'test' ? 'Stripe is in test mode.' : 'Stripe is in live mode.'}</strong> {state.mode === 'test' ? 'The Stripe links below open test customers, not real ones.' : 'The Stripe links below open real customers.'}</p>
      )}

      <section className="am__section ad-card" aria-labelledby="am-cost">
        <h2 id="am-cost">What the passes cost</h2>
        <p>There are five passes: {PASSES.map((p) => p.name).join(', ')}. The more passes a member takes, the less each one costs. {offerWords()}. Prices include VAT.</p>
        <div className="am__scroll">
          <table className="am__table am__table--wide">
            <caption>Price for each number of passes</caption>
            <thead><tr><th scope="col">Passes</th><th scope="col">A month</th><th scope="col">A year (ten months)</th><th scope="col">First year on the launch offer, a month</th><th scope="col">First year on the launch offer, a year</th></tr></thead>
            <tbody>{prices.map((r) => <tr key={r.key}><th scope="row">{r.label}</th><td>{r.month}</td><td>{r.year}</td><td>{r.offerMonth || 'None'}</td><td>{r.offerYear || 'None'}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="am__help">These come from the same rules checkout uses, so they cannot disagree with it. A price or the launch offer is changed in the site&apos;s code, not here, because the Terms and the reminder emails depend on it.</p>
      </section>

      <section className="am__section ad-card" aria-labelledby="am-hold">
        <h2 id="am-hold">Who holds each pass</h2>
        {state.phase === 'loading' && <p className="rp-note">Loading…</p>}
        {state.phase === 'error' && <p className="rp-note" role="alert">{state.message || 'The members could not load just now. Please try again in a moment.'}</p>}
        {state.phase === 'ready' && (
          <>
            <dl className="am__stats">
              <div><dt>People holding passes now</dt><dd>{total.holding}</dd></div>
              <div><dt>Active</dt><dd>{total.active}</dd></div>
              <div><dt>Cancelling</dt><dd>{total.cancelling}</dd></div>
              <div><dt>Payment trouble</dt><dd>{total.trouble}</dd></div>
              <div><dt>Ended</dt><dd>{total.ended}</dd></div>
              <div><dt>Never started</dt><dd>{total.free}</dd></div>
            </dl>
            <div className="am__scroll">
              <table className="am__table">
                <caption>People holding each pass now</caption>
                <thead><tr><th scope="col">Pass</th><th scope="col">Holding it now</th><th scope="col">Of those, cancelling</th></tr></thead>
                <tbody>{byPass.map((p) => <tr key={p.id}><th scope="row">{p.name}</th><td>{p.holding}</td><td>{p.cancelling}</td></tr>)}</tbody>
              </table>
            </div>
            <p className="am__help">Someone holds a pass while their membership is active or a payment is being retried. A cancelled membership still holds its passes until the period they paid for ends.</p>
          </>
        )}
      </section>

      <section className="am__section" aria-labelledby="am-list">
        <h2 id="am-list">Members</h2>
        {state.phase === 'ready' && !state.emailsOk && <p className="rp-note" role="alert">The email addresses could not be read just now, so members are shown without them. Please reload in a moment.</p>}
        <form className="am__filters ad-card" onSubmit={(e) => e.preventDefault()}>
          <label className="am__field">Pass
            <select className="am__control" value={pass} onChange={(e) => setPass(e.target.value)}>
              <option value="all">Any pass</option>
              {PASSES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label className="am__field">Status
            <select className="am__control" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_CHOICES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>
          <label className="am__field">Search the emails
            <input className="am__control" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Part of an email address" />
          </label>
        </form>

        {state.phase === 'ready' && <p className="am__count" role="status">Showing {shown.length} of {members.length} {members.length === 1 ? 'member' : 'members'}</p>}
        {state.phase === 'ready' && members.length === 0 && <p className="rp-note">Nobody has bought passes yet.</p>}
        {state.phase === 'ready' && members.length > 0 && shown.length === 0 && <p className="rp-note">No members match.</p>}

        <ul className="am__list">
          {shown.map((m) => {
            const link = stripeUrl(state.mode, m.customer)
            const who = m.email || `No email found (account ${m.ref})`
            return (
              <li key={`${m.ref}-${m.customer || m.since}`} className="am__row">
                <div className="am__main">
                  <p className="am__who">{who}</p>
                  <p className="am__chips"><span className={`am__chip am__chip--${m.view}`}>{statusWords(m)}</span>{formatDate(m.since) && <span className="am__date">Member since {formatDate(m.since)}</span>}</p>
                  <p>{passesLine(m)}</p>
                  {paymentLine(m) && <p>{paymentLine(m)}</p>}
                  {dateLine(m) && <p>{dateLine(m)}</p>}
                </div>
                <div className="am__buttons">
                  {link && <a className="pg-btn" href={link} target="_blank" rel="noopener noreferrer" aria-label={`Open ${who} in Stripe (opens in a new tab)`}>Open in Stripe</a>}
                </div>
              </li>
            )
          })}
        </ul>
        <p className="am__help">Only you can see this page. Members&apos; email addresses are read from the sign-in system each time you open it, and are not stored anywhere new.</p>
      </section>
    </main>
  )
}
