import { Link } from 'react-router-dom'
import { MEMBERSHIP } from '../data/membership'
import { passName } from './lockedPosts'
import './membership.css'

// What a visitor sees in place of the words of a post that belongs to a pass they do not hold. (Not drawn in Figma: Claude's own design, to be confirmed.)
// While memberships are closed it says so and offers no links to buy; once they are open it says how to get in.
export default function PostGate({ pass, signedIn }) {
  const name = passName(pass)
  const open = MEMBERSHIP.open === true
  return (
    <section className="mb__gate" aria-labelledby="mb-gate-title">
      <h2 id="mb-gate-title" className="mb__gatetitle">{`This is part of the ${name} pass`}</h2>
      <p>{open ? `The first three posts in every pass are free to read. This isn't one of them, so it opens with the ${name} pass.` : "The first three posts in every pass are free to read. This isn't one of them."}</p>
      {open ? (
        <div className="mb__wbtns">
          {!signedIn && (
            <Link className="mb__wbtn" to="/login">
              Log in
            </Link>
          )}
          <Link className="mb__wbtn" to="/membership">
            Choose your passes
          </Link>
          {signedIn && (
            <Link className="mb__wbtn" to="/membership/passes">
              My passes
            </Link>
          )}
        </div>
      ) : (
        <p>Passes aren&rsquo;t open yet. When they are, it will open with the {name} pass.</p>
      )}
    </section>
  )
}
