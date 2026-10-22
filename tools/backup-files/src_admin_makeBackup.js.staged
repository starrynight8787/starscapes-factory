// The owner's backup, put together in her own browser (22 October 2026). It asks the server for one small page at a time (api/order-actions.js, lib/backupData.js), joins them into one file,
// and saves it to her computer. Nothing is stored anywhere else.
// A backup that is only half there is worse than none, because it looks like a safe copy and is not: so if ANY table cannot be read, no file is made at all.
export const BACKUP_KIND = 'starscapes-factory-backup'

export class BackupError extends Error {}

const MOST_PAGES = 500 // a table would need half a million rows to reach this: it only stops a fault from looping for ever

export const backupFileName = (when) => {
  const p = (n) => String(n).padStart(2, '0')
  return `starscapes-factory-backup-${when.getFullYear()}-${p(when.getMonth() + 1)}-${p(when.getDate())}-${p(when.getHours())}${p(when.getMinutes())}.json`
}

async function readAll(call, action, extra, step) {
  const rows = []
  let total = null
  let next = step.first
  for (let pages = 0; next != null; pages += 1) {
    if (pages >= MOST_PAGES) throw new Error('it did not come to an end')
    const page = await call(action, { ...extra, [step.key]: next })
    if (!page || !Array.isArray(page.rows)) throw new Error('the answer could not be read')
    rows.push(...page.rows)
    if (total == null && typeof page.total === 'number') total = page.total
    if (page.next != null && !(page.next > next)) throw new Error('it did not move on') // the server must always move forward, or this would never end
    next = page.next
  }
  return { rows, total }
}

// call(action, extra) asks the server (the owner's sign-in goes with it); onProgress is told what is happening, for the screen.
export async function makeBackup({ call, onProgress = () => {}, now = () => new Date() }) {
  const plan = await call('backup_plan')
  if (!plan || !Array.isArray(plan.tables) || plan.tables.length === 0) throw new BackupError('The backup could not find out what to save. Nothing was saved. Please try again in a moment.')
  const tables = {}
  const counts = {}
  const warnings = []
  let finished = 0
  for (const t of plan.tables) {
    onProgress({ state: 'working', table: t.name, label: t.label, finished, of: plan.tables.length + 1 })
    let got
    try {
      got = await readAll(call, 'backup_page', { table: t.name }, { key: 'offset', first: 0 })
    } catch (e) {
      throw new BackupError(`The backup stopped at "${t.label}" (${(e && e.message) || 'it could not be read'}). Nothing was saved, so there is no half-finished file to trust. Please try again.`)
    }
    if (got.total != null && got.rows.length !== got.total) warnings.push(`"${t.label}" changed while the backup was running (it had ${got.total} rows at the start and the backup has ${got.rows.length}). That is normal if the site was in use. Take another backup if it matters.`)
    tables[t.name] = got.rows
    counts[t.name] = got.rows.length
    finished += 1
    onProgress({ state: 'done', table: t.name, label: t.label, rows: got.rows.length, finished, of: plan.tables.length + 1 })
  }

  // The list of accounts: worth having (it says whose email goes with each member number), but if it cannot be read the rest is still worth saving, and the file says so plainly.
  onProgress({ state: 'working', table: 'accounts', label: 'The list of accounts', finished, of: plan.tables.length + 1 })
  let accounts = { included: false, reason: 'It could not be read.', rows: [] }
  try {
    const got = await readAll(call, 'backup_users', {}, { key: 'page', first: 1 })
    accounts = { included: true, rows: got.rows }
  } catch (e) {
    warnings.push('The list of accounts could not be included, so this file does not say whose email address goes with each member. Everything else is in it. Try again later if you need that list.')
  }
  onProgress({ state: 'done', table: 'accounts', label: 'The list of accounts', rows: accounts.rows.length, finished: finished + 1, of: plan.tables.length + 1 })

  const made = now()
  const file = {
    kind: BACKUP_KIND,
    version: 1,
    made_at: made.toISOString(),
    about: 'A copy of the Starscapes Factory database, taken from Admin. It contains personal details of customers and members: keep it private. It does not contain passwords (nobody can read those), pictures or files, secret keys, or the website\u2019s code.',
    left_out: plan.left_out || [],
    counts: { ...counts, accounts: accounts.rows.length },
    accounts,
    tables,
  }
  const rowsInAll = Object.values(counts).reduce((a, b) => a + b, 0) + accounts.rows.length
  return { file, fileName: backupFileName(made), summary: { tables: plan.tables.length, rows: rowsInAll, accountsIncluded: accounts.included, warnings } }
}
