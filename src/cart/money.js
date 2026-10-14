export function formatMoney(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return ''
  return `£${Number.isInteger(v) ? v : v.toFixed(2)}`
}
