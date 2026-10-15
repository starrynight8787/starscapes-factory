export function formatMoney(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return ''
  // whole pounds have no pence, anything else has two, and thousands are separated: £89, £149.50, £1,200
  const digits = Number.isInteger(v) ? 0 : 2
  return `£${v.toLocaleString('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
}
