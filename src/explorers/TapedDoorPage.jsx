import { Link } from 'react-router-dom'
import useTitle from '../rooms/useTitle'
import PageBanner from '../components/PageBanner'
import RequestForm from './RequestForm'
import { OPENING_DOORS, OPENS_SMALL_PRINT } from './explorersConfig'
import '../rooms/roompages.css'
import '../styles/pages.css'
import '../ebook/ebook.css'
import '../ebook/ebookv2.css'
import './explorers.css'

// The page behind a door that is still taped (Figma: "Taped door" and its sign-up). It says the door is not open yet and offers one message when it opens, and nothing else
// unless the optional newsletter box is ticked. Shown to visitors while the door is closed; the owner sees the real page under a banner (src/doors/DoorGate.jsx).
const WORDS = {
  'lessons-from-the-road': { chip: 'Opening soon', line: 'Short pieces about the places I have been: a lesson from each, what to look out for, and where to find the official travel advice.' },
  'travel-map': { chip: 'Opening soon', line: 'A map of the countries I have visited, each one linking to what I have written about it. It opens with the first lesson.' },
  'road-journal': { chip: 'Opening soon', line: 'A free printable journal to take on the road. It is still being made.' },
}

export default function TapedDoorPage({ door }) {
  const info = OPENING_DOORS[door]
  const words = WORDS[door]
  const name = info ? info.name.replace(/^The /, '') : 'This door'
  useTitle(`${name}: opening soon`)
  return (
    <main className="rp eb eb--v2 xb-taped">
      <p className="rp-back"><Link to="/explorers-bay">← Back to Explorer&apos;s Bay</Link></p>
      <PageBanner chip={words.chip} title={name} subtitle={words.line} art="transit" room="explorers-bay" />
      <div className="eb__layout">
        <div className="eb__side"><div className="xb-tape" aria-hidden="true"><span>Opening soon</span></div></div>
        <div className="eb__card">
          <h2 className="eb__h2">Tell me when it opens</h2>
          <p className="eb__text">This door is not open yet. Leave your email address and I will send you one message when it opens.</p>
          <RequestForm id={`xb-${door}`} source="opens" door={door} button="Tell me when it opens" smallPrint={OPENS_SMALL_PRINT} doneNote="Once you have, I will email you when this door opens." />
        </div>
      </div>
    </main>
  )
}
