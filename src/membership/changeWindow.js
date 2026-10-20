// When a member may change their passes. WORKING RULE (Gill, 20 October 2026; to be changed if she decides otherwise): only in the last 7 days before the next payment.
// Why: a change opens the new passes at once but the new price only starts at the next payment, so without a limit someone could add passes the day after paying, enjoy them for the
// month (or, on a yearly pass, up to a year), and take them away again just before the next payment. The change starts at once, and the new price starts with that payment.
// This file has no imports, so the payment server and the page both use it. Nothing here touches the screen or the network.

export const CHANGE_WINDOW_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000

// "16 November 2026", in London time (the day a member sees is the London day)
export function formatLondonDate(iso) {
  const d = new Date(iso)
  if (!iso || Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' })
}

// Can this member change their passes now? row.current_period_end is when the current period (and so the next payment) falls due.
// Open from CHANGE_WINDOW_DAYS before that moment onwards (it stays open if the date has just passed and the new period has not been recorded yet).
// If the date is missing or unreadable we cannot tell, so the window is open: a member is never locked out because of a gap in our records.
export function changeWindow(row, nowMs = Date.now()) {
  const end = row && row.current_period_end ? Date.parse(row.current_period_end) : NaN
  if (!Number.isFinite(end)) return { known: false, open: true, opensAt: null, nextPayment: null }
  const opensAt = end - CHANGE_WINDOW_DAYS * DAY_MS
  return { known: true, open: nowMs >= opensAt, opensAt: new Date(opensAt).toISOString(), nextPayment: new Date(end).toISOString() }
}

// What a member is told when the window is closed
export const closedMessage = (win) => `You can change your passes in the ${CHANGE_WINDOW_DAYS} days before your next payment. Your next payment is on ${formatLondonDate(win.nextPayment)}, so you can change them from ${formatLondonDate(win.opensAt)}.`
