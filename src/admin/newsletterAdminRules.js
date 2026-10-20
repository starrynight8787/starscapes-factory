// The rules behind the "Newsletter" page (/admin/newsletter): the counts, the filters, and the words about each person and each newsletter. Nothing here touches the screen or the
// network, so all of it is tested directly.
export const SUBSCRIBER_FILTERS = [
  { value: 'all', label: 'Everyone' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'pending', label: 'Waiting to confirm' },
  { value: 'unsubscribed', label: 'Unsubscribed' },
]

export function counts(list) {
  const l = Array.isArray(list) ? list : []
  const n = (s) => l.filter((p) => p.status === s).length
  return { confirmed: n('confirmed'), pending: n('pending'), unsubscribed: n('unsubscribed'), total: l.length }
}

export function filterSubscribers(list, { status = 'all', search = '' } = {}) {
  const q = String(search || '').trim().toLowerCase()
  return (Array.isArray(list) ? list : []).filter((p) => (status === 'all' || p.status === status) && (!q || String(p.email || '').toLowerCase().includes(q)))
}

export function whenText(iso) {
  const t = Date.parse(iso)
  return Number.isNaN(t) ? '' : new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' })
}

const people = (n) => `${n} ${n === 1 ? 'person' : 'people'}`

// What a person's row says about when
export function personWhen(p) {
  if (p.status === 'confirmed' && whenText(p.confirmedAt)) return `Confirmed ${whenText(p.confirmedAt)}`
  if (p.status === 'unsubscribed' && whenText(p.unsubscribedAt)) return `Unsubscribed ${whenText(p.unsubscribedAt)}`
  return whenText(p.createdAt) ? `Signed up ${whenText(p.createdAt)}` : ''
}

// What a newsletter's row says about where it has got to
export function issueLine(i) {
  if (i.status === 'draft') return whenText(i.updatedAt || i.createdAt) ? `Draft, last changed ${whenText(i.updatedAt || i.createdAt)}` : 'Draft'
  if (i.status === 'sending') return `Going out: ${i.sent} of ${i.total} sent so far`
  const when = whenText(i.sentAt)
  return `Sent${when ? ` ${when}` : ''} to ${i.sent} of ${people(i.total)}`
}

// The words shown while sending
export function progressText(p) {
  if (!p) return ''
  const base = `${p.sent} of ${p.total} sent`
  return p.failed > 0 ? `${base}, ${p.failed} could not be sent` : base
}

export const peopleWords = people
