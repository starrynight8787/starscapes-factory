import { Link } from 'react-router-dom'
import { CLUBHOUSE_PROMISE } from '../data/children'
import './clubhousenote.css'

// The promise to a child, on the Clubhouse's pages (SFW-264): what the site does NOT do, in plain words, with a line for the grown-up and the way to the full Privacy policy.
export default function ClubhouseNote() {
  return (
    <aside className="cn" aria-labelledby="cn-title">
      <h2 id="cn-title" className="cn__title">Our promise to you</h2>
      <ul className="cn__list">
        {CLUBHOUSE_PROMISE.map((line) => <li key={line}>{line}</li>)}
      </ul>
      <p className="cn__grownups"><strong>Grown-ups:</strong> nothing on these pages collects anything about your child. You can read how we look after information in our <Link to="/page/privacy">Privacy policy</Link>.</p>
    </aside>
  )
}
