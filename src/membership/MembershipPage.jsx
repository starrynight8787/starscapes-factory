import { useState } from 'react'
import { Link } from 'react-router-dom'
import useTitle from '../pages/useTitle'
import RoomIcon from '../components/RoomIcon'
import { channels } from '../data/channels'
import { MEMBERSHIP } from '../data/membership'
import { PASSES, CONSENT_TEXT, FREE_TEXT, STRIPE_NOTE } from './passes'
import { LAUNCH_OFFER, priceFor, formatPounds, ladderRows, ladderKey, YEARLY_MONTHS } from './pricing'
import './membership.css'

// Every room's name, by its address (the Drafting Desk, the Factory Floor and the Knowledge Nook are not all in the illustrated-rooms list, but they are all here).
const ROOM_NAME = Object.fromEntries(channels.map((c) => [c.slug, c.name]))

// "Choose your passes", at /membership (Figma: 13 Membership). While memberships are closed (MEMBERSHIP.open is false in src/data/membership.js) visitors are told they are not
// open yet; only the owner sees the page, under a draft banner. Nothing here takes a payment: "Continue to payment" is connected in the next step.
export default function MembershipPage({ owner = false }) {
  useTitle('Choose your passes')
  const open = MEMBERSHIP.open === true
  if (!open && !owner) return <NotOpen />
  return <Chooser draft={!open} />
}

function NotOpen() {
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
function PriceText({ count, billing }) {
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

function Chooser({ draft }) {
  const [picked, setPicked] = useState([]) // pass ids, always in the order the passes are drawn
  const [billing, setBilling] = useState('month')
  const [agreed, setAgreed] = useState(false)
  const [code, setCode] = useState('')
  const [note, setNote] = useState('')
  const count = picked.length
  const current = ladderKey(count)
  const canContinue = count > 0 && agreed

  function toggle(id) {
    setNote('')
    setPicked((now) => PASSES.map((p) => p.id).filter((pid) => (pid === id ? !now.includes(pid) : now.includes(pid))))
  }
  function apply() {
    setNote(code.trim() ? 'Your code will be checked on the payment page.' : 'Type your code first.')
  }
  function proceed() {
    if (!canContinue) return
    setNote('Payment is not connected yet, so nothing has been charged.')
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
            {LAUNCH_OFFER.active && count > 0 && <span className="mb__offer">{LAUNCH_OFFER.label}</span>}
            <p className="mb__count">{`Your passes: ${count} of ${PASSES.length}`}</p>
            <div aria-live="polite">
              <PriceText count={count} billing={billing} />
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
              <input id="mb-code" className="mb__field" type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter your code" autoComplete="off" />
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

          <button type="button" className="mb__go" disabled={!canContinue} aria-describedby={canContinue ? undefined : 'mb-why'} onClick={proceed}>
            Continue to payment
          </button>
          {!canContinue && (
            <p id="mb-why" className="mb__why">
              Choose at least one pass and tick the box above to continue.
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
