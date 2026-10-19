import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import useTitle from '../pages/useTitle'
import RoomIcon from '../components/RoomIcon'
import { channels } from '../data/channels'
import { MEMBERSHIP } from '../data/membership'
import { redirectTo } from '../cart/redirect'
import { PASSES, PASS_IDS, cleanPassIds, CONSENT_TEXT, FREE_TEXT, STRIPE_NOTE } from './passes'
import { LAUNCH_OFFER, priceFor, formatPounds, ladderRows, ladderKey, YEARLY_MONTHS } from './pricing'
import { startMembershipCheckout, checkPromoCode } from './membershipApi'
import './membership.css'

// Every room's name, by its address (the Drafting Desk, the Factory Floor and the Knowledge Nook are not all in the illustrated-rooms list, but they are all here).
const ROOM_NAME = Object.fromEntries(channels.map((c) => [c.slug, c.name]))

// What someone has chosen is kept for the rest of their visit, so going off to log in or sign up does not lose it. The tick box and the promo code are NOT kept:
// agreeing to open the passes now must be done fresh, every time.
const CHOICE_KEY = 'sf-membership-choice'
function loadChoice() {
  try {
    const v = JSON.parse(window.sessionStorage.getItem(CHOICE_KEY) || 'null')
    return { picked: cleanPassIds(v && v.picked), billing: v && v.billing === 'year' ? 'year' : 'month' }
  } catch (e) {
    return { picked: [], billing: 'month' }
  }
}
function saveChoice(picked, billing) {
  try {
    window.sessionStorage.setItem(CHOICE_KEY, JSON.stringify({ picked, billing }))
  } catch (e) {
    // some private-browsing modes refuse; the choice then lasts only until the page is closed
  }
}

// "Choose your passes", at /membership (Figma: 13 Membership). While memberships are closed (MEMBERSHIP.open is false in src/data/membership.js) visitors are told they are not
// open yet; only the owner sees the page, under a draft banner. "Continue to payment" starts a Stripe checkout (a test one, until real payments are switched on).
export default function MembershipPage({ owner = false, session = null }) {
  useTitle('Choose your passes')
  const open = MEMBERSHIP.open === true
  if (!open && !owner) return <NotOpen />
  return <Chooser draft={!open} signedIn={Boolean(session)} />
}

export function NotOpen() {
  return (
    <main className="mb mb--closed">
      <div className="mb__body mb__body--narrow">
        <h1>Memberships are not open yet</h1>
        <p>{MEMBERSHIP.textWhileClosed}</p>
        <p>
          <Link to="/">Back to the home page</Link>
        </p>
      </div>
    </main>
  )
}

const unit = (billing) => (billing === 'year' ? 'a year' : 'a month')

// The big price box. It says what you pay, what it becomes after the launch year, and the other way of paying, in plain words.
function PriceText({ count, billing, code }) {
  if (count === 0) {
    return (
      <>
        <p className="mb__big">Choose a pass</p>
        <p className="mb__small">Tick one or more passes to see your price.</p>
      </>
    )
  }
  const price = priceFor(count)
  const here = billing === 'year' ? price.year : price.month
  const other = billing === 'year' ? price.month : price.year
  if (code) {
    // A promo code takes the place of the launch offer (Stripe allows one discount), and Stripe works out the final price on its own page.
    return (
      <>
        <p className="mb__big">{`${formatPounds(here.regular)} ${unit(billing)}`}</p>
        <p className="mb__small">{`Code ${code.code} applied: ${code.summary}. A code replaces the launch offer. Your final price is shown on the payment page.`}</p>
      </>
    )
  }
  if (price.offerActive) {
    const otherWay = billing === 'year'
      ? `Paying monthly? ${formatPounds(other.offer)} a month for the first year, then ${formatPounds(other.regular)} a month.`
      : `Paying yearly? ${formatPounds(other.offer)} for the first year, then ${formatPounds(other.regular)} a year.`
    return (
      <>
        <p className="mb__was">{`${formatPounds(here.regular)} ${unit(billing)}`}</p>
        <p className="mb__big">{billing === 'year' ? `${formatPounds(here.offer)} for your first year` : `${formatPounds(here.offer)} a month for your first year`}</p>
        <p className="mb__small">{`then ${formatPounds(here.regular)} ${unit(billing)}. Cancel any time. ${otherWay}`}</p>
      </>
    )
  }
  return (
    <>
      <p className="mb__big">{`${formatPounds(here.regular)} ${unit(billing)}`}</p>
      <p className="mb__small">
        {billing === 'year'
          ? `or ${formatPounds(other.regular)} a month. A year costs ${YEARLY_MONTHS} months, so two months are free. Cancel any time.`
          : `or ${formatPounds(other.regular)} a year, which is ${YEARLY_MONTHS} months of passes. Cancel any time.`}
      </p>
    </>
  )
}

function Chooser({ draft, signedIn }) {
  const [start] = useState(loadChoice)
  const [picked, setPicked] = useState(start.picked) // pass ids, always in the order the passes are drawn
  const [billing, setBilling] = useState(start.billing)
  const [agreed, setAgreed] = useState(false)
  const [code, setCode] = useState('')
  const [codeInfo, setCodeInfo] = useState(null) // { code, summary } once a code has been checked and works
  const [note, setNote] = useState('')
  const [needLogin, setNeedLogin] = useState(false)
  const [busy, setBusy] = useState(false)
  const count = picked.length
  const current = ladderKey(count)
  const canContinue = count > 0 && agreed

  useEffect(() => saveChoice(picked, billing), [picked, billing])

  function toggle(id) {
    setNote('')
    setPicked((now) => PASS_IDS.filter((pid) => (pid === id ? !now.includes(pid) : now.includes(pid))))
  }
  function changeCode(value) {
    setCode(value)
    setCodeInfo(null) // a code that has been changed has not been checked
  }
  async function apply() {
    const text = code.trim()
    if (!text) return setNote('Type your code first.')
    if (!signedIn) return setNeedLogin(true)
    setNote('')
    try {
      const summary = await checkPromoCode(text)
      setCodeInfo({ code: text, summary })
    } catch (e) {
      setCodeInfo(null)
      setNote(e.message)
    }
  }
  async function proceed() {
    if (!canContinue || busy) return
    if (!signedIn) return setNeedLogin(true)
    setBusy(true)
    setNote('')
    try {
      const url = await startMembershipCheckout({ passes: picked, interval: billing, consent: agreed, code: codeInfo ? codeInfo.code : '' })
      redirectTo(url)
    } catch (e) {
      setNote(e.message)
      setBusy(false)
    }
  }

  return (
    <main className="mb">
      {draft && (
        <div className="mb__draft" role="note">
          <strong>Draft: only you can see this page.</strong> Memberships are not open yet. Visitors are told so until you switch them on.
        </div>
      )}
      <div className="mb__hero">
        <h1>Open the parts of the story you want.</h1>
        <p>Choose one pass, or several. The more you take, the less each one costs.</p>
      </div>
      <div className="mb__body">
        <div className="mb__left">
          <h2 className="mb__h2">Free, always</h2>
          <p className="mb__lead">{FREE_TEXT}</p>
          <fieldset className="mb__passes">
            <legend className="mb__h2">Passes</legend>
            {PASSES.map((p) => {
              const on = picked.includes(p.id)
              return (
                <label key={p.id} className={`mb__pass${on ? ' is-on' : ''}`} htmlFor={`pass-${p.id}`}>
                  <input id={`pass-${p.id}`} className="mb__check" type="checkbox" checked={on} onChange={() => toggle(p.id)} />
                  <span className="mb__box" aria-hidden="true">{on ? '✓' : ''}</span>
                  <RoomIcon room={p.room} size={52} />
                  <span className="mb__passtext">
                    <span className="mb__passname">{p.name}</span>
                    <span className="mb__passblurb">{p.blurb}</span>
                    <span className="pg-chip mb__room">{ROOM_NAME[p.room]}</span>
                  </span>
                </label>
              )
            })}
          </fieldset>
        </div>

        <div className="mb__right">
          <section className="mb__price" aria-label="Your price">
            {LAUNCH_OFFER.active && count > 0 && !codeInfo && <span className="mb__offer">{LAUNCH_OFFER.label}</span>}
            <p className="mb__count">{`Your passes: ${count} of ${PASSES.length}`}</p>
            <div aria-live="polite">
              <PriceText count={count} billing={billing} code={codeInfo} />
            </div>
            <div className="mb__billing" role="group" aria-label="How you pay">
              <button type="button" className={`mb__bill${billing === 'month' ? ' is-on' : ''}`} aria-pressed={billing === 'month'} onClick={() => setBilling('month')}>
                Monthly
              </button>
              <button type="button" className={`mb__bill${billing === 'year' ? ' is-on' : ''}`} aria-pressed={billing === 'year'} onClick={() => setBilling('year')}>
                Yearly: save 2 months
              </button>
            </div>
          </section>

          <div className="mb__promo">
            <label htmlFor="mb-code">Have a promo code?</label>
            <div className="mb__promorow">
              <input id="mb-code" className="mb__field" type="text" value={code} onChange={(e) => changeCode(e.target.value)} placeholder="Enter your code" autoComplete="off" />
              <button type="button" className="pg-btn" onClick={apply}>
                Apply
              </button>
            </div>
          </div>

          <label className="mb__consent" htmlFor="mb-consent">
            <input id="mb-consent" className="mb__check" type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            <span className="mb__box" aria-hidden="true">{agreed ? '✓' : ''}</span>
            <span>{CONSENT_TEXT}</span>
          </label>

          <button type="button" className="mb__go" disabled={!canContinue || busy} aria-describedby={canContinue ? undefined : 'mb-why'} onClick={proceed}>
            {busy ? 'Taking you to Stripe…' : 'Continue to payment'}
          </button>
          {!canContinue && (
            <p id="mb-why" className="mb__why">
              Choose at least one pass and tick the box above to continue.
            </p>
          )}
          {needLogin && !signedIn && (
            <p className="mb__note" role="status">
              Please <Link to="/login">log in</Link> or <Link to="/signup">sign up</Link> first. Your choices are kept for when you come back to this page.
            </p>
          )}
          {note && (
            <p className="mb__note" role="status">
              {note}
            </p>
          )}
          <p className="mb__stripe">{STRIPE_NOTE}</p>

          <section className="mb__ladder" aria-label="Prices">
            <h2 className="mb__ladderh">The more passes you take, the less each one costs</h2>
            <ul>
              {ladderRows().map((r) => (
                <li key={r.key} className={r.key === current ? 'is-now' : ''} aria-current={r.key === current ? 'true' : undefined}>
                  <span>{r.label}</span>
                  <span>{`${formatPounds(r.month)} a month`}</span>
                  <span>{`or ${formatPounds(r.year)} a year`}</span>
                </li>
              ))}
            </ul>
            <p className="mb__small">{`Everything means four or more passes, and it stays ${formatPounds(ladderRows()[3].month)} however many passes there are.`}</p>
          </section>
        </div>
      </div>
    </main>
  )
}
