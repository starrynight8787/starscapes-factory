import { useEffect, useRef } from 'react'
import './formmessages.css'

// The pieces every form uses for its errors and its good news, from the design.
//  - Field: a labelled field with optional help text and an error under it. The error is connected to the field for screen readers.
//  - CheckField: the same, for a tick box.
//  - ErrorSummary: the box at the top of a form that failed. It takes the keyboard focus, and each problem is a link to its field.
//  - SuccessMessage: a green box announced politely to a screen reader.

export const ErrorIcon = () => (
  <span className="sf-msg-icon sf-msg-icon--error" aria-hidden="true">
    !
  </span>
)

export function FieldError({ id, children }) {
  if (!children) return null
  return (
    <p id={id} className="sf-field__error">
      <ErrorIcon />
      <span>{children}</span>
    </p>
  )
}

// children is a function that is given the props the field needs, so it works with any kind of field:
//   <Field id="email" label="Email" error={problem}>{(p) => <input {...p} type="email" />}</Field>
export function Field({ id, label, help, error, children }) {
  const helpId = help ? `${id}-help` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined
  return (
    <div className="sf-field">
      <label className="sf-field__label" htmlFor={id}>
        {label}
      </label>
      {help && (
        <p id={helpId} className="sf-field__help">
          {help}
        </p>
      )}
      {children({ id, className: 'sf-input', 'aria-describedby': describedBy, 'aria-invalid': error ? 'true' : undefined })}
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  )
}

export function CheckField({ id, label, error, checked, onChange }) {
  const errorId = error ? `${id}-error` : undefined
  return (
    <div className="sf-field">
      <div className="sf-check">
        <input id={id} type="checkbox" checked={checked} onChange={onChange} aria-describedby={errorId} aria-invalid={error ? 'true' : undefined} />
        <label htmlFor={id}>{label}</label>
      </div>
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  )
}

// errors: [{ id: 'email', message: 'Enter your email address' }], where id is the field's id. Nothing is drawn when there are none.
export function ErrorSummary({ errors, title = 'There is a problem', intro = 'Fix these, then send the form again.' }) {
  const box = useRef(null)
  const lastSaid = useRef('') // the problems the box last took the focus for
  const justSent = useRef(false) // a form on the page has just been sent
  // Most forms build a NEW list of problems every time they are drawn, so every letter typed would draw it again. The box takes the focus only when the problems
  // are different from last time, or when a form has just been sent (so a screen reader hears that the form was not accepted, even if the problem has not changed),
  // and never merely because the form was drawn again: otherwise anyone typing to fix a problem would be pulled out of the field after every letter.
  useEffect(() => {
    const noteSent = (event) => { if (event.target && event.target.closest && event.target.closest('main')) justSent.current = true } // a form on the page (not the menu or the footer)
    document.addEventListener('submit', noteSent, true)
    return () => document.removeEventListener('submit', noteSent, true)
  }, [])
  const said = errors.map((e) => `${e.id}: ${e.message}`).join('\n')
  useEffect(() => {
    if (errors.length === 0) { lastSaid.current = ''; justSent.current = false; return }
    if (box.current && (said !== lastSaid.current || justSent.current)) box.current.focus()
    lastSaid.current = said
    justSent.current = false
  })
  if (errors.length === 0) return null
  const goTo = (event, id) => {
    event.preventDefault()
    const field = document.getElementById(id)
    if (field) field.focus()
  }
  return (
    <div ref={box} tabIndex={-1} role="alert" className="sf-summary" aria-labelledby="sf-summary-title">
      <h2 id="sf-summary-title" className="sf-summary__title">
        {title}
      </h2>
      <p>{intro}</p>
      <ul>
        {errors.map((e) => (
          <li key={e.id}>
            <a href={`#${e.id}`} onClick={(event) => goTo(event, e.id)}>
              {e.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

// For when the service failed and it is not the person's mistake (the network, too many requests): the same red box as the summary, but with
// nothing to fix and no links, so it just says plainly what happened. It is announced to a screen reader the moment it appears.
export function FailureMessage({ title, children }) {
  return (
    <div role="alert" className="sf-summary sf-failure">
      <h2 className="sf-summary__title">{title}</h2>
      <p>{children}</p>
    </div>
  )
}

export function SuccessMessage({ title, children }) {
  return (
    <div className="sf-success" role="status">
      <span className="sf-msg-icon sf-msg-icon--ok" aria-hidden="true">
        {'\u2713'}
      </span>
      <div>
        <p className="sf-success__title">{title}</p>
        {children && <p className="sf-success__text">{children}</p>}
      </div>
    </div>
  )
}
