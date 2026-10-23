// The rules behind discount codes (the "Promotions" page, /admin/promotions). ONE set of rules, used by the page (to check the form as you type) and by the server (to check it
// again before anything reaches Stripe), so the two can never disagree. Nothing here touches the screen or the network, so all of it is tested directly.
// Checkout looks a code up by its text (lib/membershipStripe.js findPromotionCode) and tells the member what it gives, in the words couponWords() writes here.
import { formatPounds } from '../membership/pricing.js'

export const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{1,39}$/
export const MAX_PERCENT = 100
export const MAX_POUNDS_PENCE = 12000 // £120: ten months of the dearest pass, the most a code could ever need to take off
export const MAX_MONTHS = 36
export const MAX_USES = 100000

export const DURATIONS = [
  { value: 'once', label: 'The first payment only' },
  { value: 'repeating', label: 'A number of months' },
  { value: 'forever', label: 'For as long as they keep their passes' },
]
export const EMPTY_FORM = { code: '', kind: 'percent', value: '', duration: 'once', months: '', maxUses: '', expiresOn: '' }

const text = (v) => String(v === null || v === undefined ? '' : v).trim()

// "2026-12-31" as the last second of that day in London, as a Stripe time (seconds). Works across the clocks changing.
export function londonEndOfDay(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text(ymd))
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const check = new Date(Date.UTC(y, mo - 1, d))
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null // not a real date
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  const want = `${m[3]}/${m[2]}/${m[1]}, 23:59:59`
  for (const offsetMinutes of [60, 0]) { // summer time, then winter time
    const t = Date.UTC(y, mo - 1, d, 23, 59, 59) - offsetMinutes * 60000
    if (fmt.format(new Date(t)) === want) return Math.floor(t / 1000)
  }
  return null
}

const bad = (field, message) => ({ ok: false, field, message })

// Checks the form. Returns { ok: true, value } with clean numbers (money in pence), or { ok: false, field, message } for the FIRST thing wrong, in plain words.
export function parseForm(input, nowMs = Date.now()) {
  const f = input && typeof input === 'object' ? input : {}
  const code = text(f.code).toUpperCase()
  if (!CODE_PATTERN.test(code)) return bad('code', 'The code needs 2 to 40 letters, numbers or dashes, with no spaces, for example SPRING20.')

  const kind = f.kind === 'amount' ? 'amount' : f.kind === 'percent' ? 'percent' : ''
  if (!kind) return bad('kind', 'Choose whether the code takes off a percentage or an amount of money.')

  const raw = text(f.value)
  let percentOff = null
  let amountOff = null
  if (kind === 'percent') {
    if (!/^\d{1,3}$/.test(raw) || Number(raw) < 1 || Number(raw) > MAX_PERCENT) return bad('value', 'The percentage must be a whole number from 1 to 100.')
    percentOff = Number(raw)
  } else {
    if (!/^\d{1,3}(\.\d{1,2})?$/.test(raw)) return bad('value', 'The amount must be in pounds, like 5 or 2.50.')
    const pence = Math.round(Number(raw) * 100)
    if (pence < 1 || pence > MAX_POUNDS_PENCE) return bad('value', `The amount must be from 1p to ${formatPounds(MAX_POUNDS_PENCE)}.`)
    amountOff = pence
  }

  const duration = ['once', 'repeating', 'forever'].includes(f.duration) ? f.duration : ''
  if (!duration) return bad('duration', 'Choose how long the discount lasts.')
  let months = null
  if (duration === 'repeating') {
    const mRaw = text(f.months)
    if (!/^\d{1,2}$/.test(mRaw) || Number(mRaw) < 1 || Number(mRaw) > MAX_MONTHS) return bad('months', `The number of months must be a whole number from 1 to ${MAX_MONTHS}.`)
    months = Number(mRaw)
  }

  let maxUses = null
  if (text(f.maxUses) !== '') {
    const uRaw = text(f.maxUses)
    if (!/^\d{1,6}$/.test(uRaw) || Number(uRaw) < 1 || Number(uRaw) > MAX_USES) return bad('maxUses', `The number of people must be a whole number from 1 to ${MAX_USES.toLocaleString('en-GB')}, or left empty for no limit.`)
    maxUses = Number(uRaw)
  }

  let expiresAt = null
  if (text(f.expiresOn) !== '') {
    expiresAt = londonEndOfDay(f.expiresOn)
    if (expiresAt === null) return bad('expiresOn', 'The last day must be a real date.')
    if (expiresAt * 1000 <= nowMs) return bad('expiresOn', 'The last day must be today or later.')
  }
  return { ok: true, value: { code, kind, percentOff, amountOff, duration, months, maxUses, expiresAt } }
}

// What the member is told the code gives (the same words checkout shows them: lib/membershipStripe.js describeCoupon)
export function couponWords(v) {
  const what = v.percentOff !== null && v.percentOff !== undefined ? `${v.percentOff}% off` : `${formatPounds(v.amountOff)} off`
  if (v.duration === 'once') return `${what} your first payment`
  if (v.duration === 'repeating') return `${what} for ${v.months} ${v.months === 1 ? 'month' : 'months'}`
  return `${what} for as long as you keep your passes`
}

const whenWords = (secs) => new Date(secs * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' })

// The whole code in one sentence, before it is made
export function previewWords(v) {
  const parts = [`${v.code} gives ${couponWords(v)}.`]
  parts.push(v.maxUses ? `Up to ${v.maxUses.toLocaleString('en-GB')} ${v.maxUses === 1 ? 'person' : 'people'} can use it.` : 'Anyone can use it, as many times as they like.')
  parts.push(v.expiresAt ? `It stops working after ${whenWords(v.expiresAt)}.` : 'It has no end date.')
  if (v.percentOff === 100) parts.push('It takes off the whole price: the passes would be free.')
  parts.push('It replaces the launch offer for anyone who uses it.')
  return parts.join(' ')
}

// working, off (switched off by you), or finished (ended, run out, or past its last day): from what Stripe says about a code
export function stateOf(item, nowMs = Date.now()) {
  if (!item) return 'finished'
  if (item.active === false) return 'off'
  if (item.couponValid === false) return 'finished'
  if (item.expiresAt && Date.parse(item.expiresAt) <= nowMs) return 'finished'
  if (item.maxUses && item.used >= item.maxUses) return 'finished'
  return 'working'
}
export const STATE_WORDS = { working: 'Working', off: 'Switched off', finished: 'Finished' }

export const usesText = (item) => (item.maxUses ? `${item.used} of ${item.maxUses.toLocaleString('en-GB')} used` : `${item.used} used, no limit`)

export function expiryText(item) {
  if (!item.expiresAt) return 'No end date'
  const t = Date.parse(item.expiresAt)
  return Number.isNaN(t) ? 'No end date' : `${t <= Date.now() ? 'Ended' : 'Works until'} ${whenWords(Math.floor(t / 1000))}`
}
