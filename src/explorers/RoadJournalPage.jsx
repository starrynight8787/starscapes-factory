import { Link } from 'react-router-dom'
import useTitle from '../rooms/useTitle'
import PageBanner from '../components/PageBanner'
import RequestForm from './RequestForm'
import TapedDoorPage from './TapedDoorPage'
import { JOURNAL } from './explorersConfig'
import '../rooms/roompages.css'
import '../styles/pages.css'
import '../ebook/ebook.css'
import '../ebook/ebookv2.css'
import './explorers.css'

// The Road journal (Figma E9): what it is, a preview, and an email box that gives the free download. Getting it needs only an email address (no tick); the newsletter is a separate optional box;
// the download link comes by email once they have pressed the confirm link, and the thank-you page opens from that link, never straight after typing an address.
// Until the file exists (src/explorers/explorersConfig.js) this shows the taped page instead, even if the door has been opened in Admin.
export default function RoadJournalPage() {
  if (!JOURNAL.file) return <TapedDoorPage door="road-journal" />
  return <OpenJournal />
}

function OpenJournal() {
  useTitle(JOURNAL.title)
  return (
    <main className="rp eb eb--v2">
      <p className="rp-back"><Link to="/explorers-bay">← Back to Explorer&apos;s Bay</Link></p>
      <PageBanner chip="Free" title={JOURNAL.title} subtitle={JOURNAL.summary} art="transit" room="explorers-bay" />
      <div className="eb__layout">
        <div className="eb__side">
          <div className="eb__cover" aria-hidden="true"><span>The Road Journal</span></div>
          <h2 className="eb__h2">What is inside</h2>
          <ul className="eb__inside">{JOURNAL.inside.map((line) => <li key={line}>{line}</li>)}</ul>
        </div>
        <div className="eb__card">
          <h2 className="eb__h2">Where shall I send it?</h2>
          <RequestForm id="xb-journal" source="road-journal" button="Get the free Road journal" smallPrint={JOURNAL.smallPrint} doneNote="You will not get the journal until you do." />
        </div>
      </div>
    </main>
  )
}
