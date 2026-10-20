import { Link } from 'react-router-dom'
import { MEMBERSHIP } from '../data/membership'
import '../styles/pages.css'
import '../styles/forms.css'
import './entries.css'

// The Into the Nebula membership box for the right-hand column of the blog pages (Writing in Transit, The Factory Floor, Blueprints). Its words come from
// src/data/membership.js. While memberships are not open the button cannot be pressed; once MEMBERSHIP.open is true it becomes a link to the membership page.
export default function NebulaBox() {
  return (
    <section className="en__card en__notebook en__nebula" aria-labelledby="en-nebula-title">
      <p className="en__meta"><span className="en__label">Membership</span>{!MEMBERSHIP.open && <span className="pg-chip">{MEMBERSHIP.buttonWhileClosed}</span>}</p>
      <h2 id="en-nebula-title" className="en__notebooktitle">{MEMBERSHIP.name}</h2>
      <p className="en__text">{MEMBERSHIP.line}</p>
      {!MEMBERSHIP.open && <p className="en__caption">{MEMBERSHIP.textWhileClosed}</p>}
      {MEMBERSHIP.open
        ? <Link className="pg-btn fm-btn--primary" to="/membership">Find out more</Link>
        : <button type="button" className="pg-btn fm-btn--primary" disabled>{MEMBERSHIP.buttonWhileClosed}</button>}
    </section>
  )
}
