import { ACCESSIBILITY_REPLY_DAYS, CONTACT_EMAIL } from '../data/contact'
import { ACCESSIBILITY_STATEMENT } from '../data/accessibilityStatement'
import { COMPANY } from '../data/company'
import { CompanyCard } from './LegalPage'
import useTitle from './useTitle'
import './systempages.css'

// The statement is only ready to publish when every gap in it has been filled in.
export function statementIsReady(statement = ACCESSIBILITY_STATEMENT, email = CONTACT_EMAIL, replyDays = ACCESSIBILITY_REPLY_DAYS) {
  return Boolean(statement.lastReviewed && statement.notYetRight && statement.complaint && email && replyDays)
}

export default function AccessibilityStatement({ statement = ACCESSIBILITY_STATEMENT, email = CONTACT_EMAIL, replyDays = ACCESSIBILITY_REPLY_DAYS, company = COMPANY }) {
  useTitle('Accessibility statement')
  return (
    <main className="lg lg--narrow">
      <h1>Accessibility statement</h1>
      <p className="lg-updated">Last reviewed: {statement.lastReviewed}</p>

      <section aria-labelledby="acc-aim" className="lg-text">
        <h2 id="acc-aim">What we aim for</h2>
        <p>
          We want everyone to be able to use Starscapes Factory, whether you use a mouse, a keyboard, a screen reader, a touch screen or a magnifier. We aim to meet the Web Content
          Accessibility Guidelines (WCAG) 2.2, level AA.
        </p>
      </section>

      <section aria-labelledby="acc-do" className="lg-text">
        <h2 id="acc-do">What we do</h2>
        <ul>
          <li>Text and buttons have enough contrast against their backgrounds.</li>
          <li>Everything can be used with a keyboard, and you can always see where you are.</li>
          <li>Pictures that carry meaning have a text description, including the room scenes and logos.</li>
          <li>You can make the text bigger without losing anything.</li>
          <li>Forms tell you in plain words what is wrong and how to fix it.</li>
        </ul>
      </section>

      <section aria-labelledby="acc-not" className="lg-text">
        <h2 id="acc-not">What is not yet right</h2>
        <p>{statement.notYetRight}</p>
      </section>

      <section aria-labelledby="acc-tell" className="lg-text">
        <h2 id="acc-tell">Tell us about a problem</h2>
        <p>If something on the site is hard to use, please tell us. We will reply within {replyDays} working days and aim to put it right.</p>
        <p className="lg-contact">
          Email us: <a href={`mailto:${email}`}>{email}</a>
        </p>
      </section>

      <section aria-labelledby="acc-complaint" className="lg-text">
        <h2 id="acc-complaint">If you are not happy with our reply</h2>
        <p>{statement.complaint}</p>
      </section>

      <CompanyCard company={company} />
    </main>
  )
}
