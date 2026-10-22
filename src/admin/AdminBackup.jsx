import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageLoading from '../components/PageLoading'
import useTitle from '../pages/useTitle'
import { useOwnerCheck } from './useIsOwner'
import { orderAction } from '../artloft/orderActionsApi'
import { makeBackup, BackupError } from './makeBackup'
import { saveFile } from './saveFile'
import '../styles/pages.css'
import './admin.css'
import './adminv2.css'
import AdminBanner from './AdminBanner'
import './adminbackup.css'

// The owner's page at /admin/backup. The database is on a plan that keeps no backups of its own, so this saves a copy of everything that matters to the owner's own computer in one click.
export default function AdminBackup({ session }) {
  useTitle('Download a backup')
  const { checking, owner } = useOwnerCheck(session)
  const [phase, setPhase] = useState('idle') // idle, working, done, error
  const [steps, setSteps] = useState([])
  const [result, setResult] = useState(null)
  const [problem, setProblem] = useState('')

  if (checking) return <PageLoading label="Checking who you are…" />
  if (!owner) return <main className="ad"><h1>Download a backup</h1><p className="ad-note">This area is for the site owner.</p><p><Link to="/">Back to the homepage</Link></p></main>

  function onProgress(p) {
    setSteps((list) => {
      const rest = list.filter((s) => s.table !== p.table)
      return [...rest, { table: p.table, label: p.label, state: p.state, rows: p.rows }]
    })
  }

  async function take() {
    setPhase('working'); setSteps([]); setResult(null); setProblem('')
    try {
      const made = await makeBackup({ call: orderAction, onProgress })
      saveFile(made.fileName, JSON.stringify(made.file))
      setResult({ name: made.fileName, ...made.summary })
      setPhase('done')
    } catch (e) {
      setProblem(e instanceof BackupError ? e.message : (e && e.message) || 'The backup did not work just now. Nothing was saved. Please try again in a moment.')
      setPhase('error')
    }
  }

  const working = phase === 'working'
  return (
    <main className="ad ad--wide bk">
      <AdminBanner chip="Backup" title="Download a backup" subtitle="Save a copy of your shop's data to your own computer, so nothing is lost if something goes wrong. Your database is on a free plan, which does not keep backups of its own." />

      <p className="bk__warn" role="note"><strong>This file holds personal details.</strong> It contains your customers&apos; and members&apos; names, email addresses and delivery addresses. Keep it somewhere private. Please don&apos;t email it, and don&apos;t put it in a shared or open folder.</p>

      <section className="ad-card bk__section" aria-labelledby="bk-take">
        <h2 id="bk-take">Take a backup</h2>
        <p className="bk__last">A backup once a week is a good habit, and always before a big change. Each file has the date and time in its name, so you can always tell how old your latest one is.</p>
        <div className="bk__buttons">
          <button type="button" className="pg-btn pg-btn--primary" onClick={take} disabled={working}>{working ? 'Taking the backup…' : 'Download a backup'}</button>
        </div>

        <div className="bk__live" aria-live="polite">
          {steps.length > 0 && (
            <ol className="bk__steps">
              {steps.map((s) => (
                <li key={s.table} className={`bk__step bk__step--${s.state}`}>{s.state === 'done' ? `Saved: ${s.label} (${s.rows} ${s.rows === 1 ? 'row' : 'rows'})` : `Reading: ${s.label}…`}</li>
              ))}
            </ol>
          )}
          {phase === 'done' && result && (
            <div className="bk__done" role="status">
              <p><strong>Done.</strong> Saved {result.tables} tables and {result.rows} rows to <strong>{result.name}</strong>. Look in your Downloads folder, and move the file somewhere private and safe.</p>
              <p>{result.accountsIncluded ? 'The list of accounts is included.' : 'The list of accounts could not be included this time.'}</p>
              {result.warnings.length > 0 && <ul className="bk__warnings">{result.warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
            </div>
          )}
        </div>
        {phase === 'error' && <p className="bk__error" role="alert">{problem}</p>}
      </section>

      <section className="ad-card bk__section" aria-labelledby="bk-in">
        <h2 id="bk-in">What is in it</h2>
        <p>Your orders; your members, their memberships and their reminder emails; the newsletter and ebook sign-ups and the newsletters you have written and sent; every post (including the text of paid posts) and how often it was read; your products and their prices; your books, stories and Book Club comments; the suggestions and every vote; the Star Atlas; which doors are open; and the list of accounts.</p>
        <h2 id="bk-not">What is not in it</h2>
        <ul className="bk__list">
          <li><strong>Passwords.</strong> The sign-in system never gives them to anyone, not even you. If everything had to be rebuilt, members would choose new passwords.</li>
          <li><strong>Pictures and other files</strong> you have uploaded. Keep your own originals.</li>
          <li><strong>Secret keys</strong> (Stripe, Creative Hub and so on) and the Instagram connection. They are kept out of a backup on purpose.</li>
          <li><strong>The website&apos;s code.</strong> That is safe in GitHub.</li>
          <li><strong>Card details.</strong> Stripe keeps those, and the site never holds them.</li>
        </ul>
      </section>

      <section className="ad-card bk__section" aria-labelledby="bk-restore">
        <h2 id="bk-restore">If you ever need to put it back</h2>
        <p>The file holds every row with its original number, so it can be loaded back in. Ask Claude to write a restore for you to run on <em>your own computer</em>: that way the file never has to be shared with anyone, and your promise that customers&apos; details never go into AI tools is kept.</p>
      </section>
    </main>
  )
}
