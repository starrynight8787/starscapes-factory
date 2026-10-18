import { Link } from 'react-router-dom'
import useTitle from '../rooms/useTitle'
import { CONTACT_EMAIL } from '../data/contact'
import { TESTERS as T } from './testersData'
import '../rooms/roompages.css'
import '../styles/pages.css'
import './testers.css'

// The private page for testers (/testers): what is pretend, the test card, what to try, and how to send feedback. Not in the footer, the menu or the sitemap.
export default function TestersPage() {
  useTitle('For testers')
  return (
    <main className="pg pg-text ts">
      <p className="rp-back"><Link to="/">← Back to the home page</Link></p>
      <h1>{T.title}</h1>
      <p className="ts__intro">{T.intro}</p>

      <section aria-labelledby="ts-pretend">
        <h2 id="ts-pretend">What is pretend</h2>
        <ul>{T.pretend.map((line) => <li key={line}>{line}</li>)}</ul>
      </section>

      <section aria-labelledby="ts-card">
        <h2 id="ts-card">The test card</h2>
        <dl className="ts__card">
          {T.card.map(([name, value]) => (
            <div key={name} className="ts__row">
              <dt>{name}</dt>
              <dd>{name === 'Card number' ? <code>{value}</code> : value}</dd>
            </div>
          ))}
        </dl>
        <p>{T.declineNote} <code>{T.declineCard}</code></p>
      </section>

      <section aria-labelledby="ts-try">
        <h2 id="ts-try">What to try</h2>
        <ol>{T.tryThese.map((line) => <li key={line}>{line}</li>)}</ol>
      </section>

      <section aria-labelledby="ts-tell">
        <h2 id="ts-tell">How to tell me what you found</h2>
        <p>{T.tellIntro}</p>
        <ul>{T.tell.map((line) => <li key={line}>{line}</li>)}</ul>
        {CONTACT_EMAIL && (
          <p>
            <a className="pg-btn sg-btn--primary ts__mail" href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(T.subject)}`}>Email {CONTACT_EMAIL}</a>
          </p>
        )}
      </section>

      <p className="ts__thanks">{T.thanks}</p>
    </main>
  )
}
