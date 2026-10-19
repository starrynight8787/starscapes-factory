import { Link } from 'react-router-dom'
import { AREAS } from '../draftingdesk/draftingData'
import { MEMBERSHIP } from '../data/membership'

// The tall box under the pinned entry on Archive Entries (Figma: "Archive Entry / Author's Notebook"): a teaser for the Author's Notebook, which is for members.
// It shows no notebook titles (there is no way to check who has paid yet, and none is ever shown here). While memberships are not open the button cannot be
// pressed; once MEMBERSHIP.open is true it becomes a link to the Notebook page.
export default function NotebookTeaser() {
  const info = AREAS['authors-notebook']
  return (
    <section className="en__card en__notebook" aria-labelledby="en-notebook-title">
      <p className="en__meta"><span className="en__label">Author&apos;s Notebook</span> <span className="pg-chip">Members only</span></p>
      <h2 id="en-notebook-title" className="en__notebooktitle">Behind the scenes</h2>
      <p className="en__text">Early drafts, notes and the thinking behind the stories, straight from my notebook.</p>
      {MEMBERSHIP.open
        ? <Link className="pg-btn fm-btn--primary" to={info.to}>Find out more</Link>
        : <button type="button" className="pg-btn fm-btn--primary" disabled>{MEMBERSHIP.buttonWhileClosed}</button>}
      <p className="en__caption">Part of {MEMBERSHIP.name}.</p>
    </section>
  )
}
