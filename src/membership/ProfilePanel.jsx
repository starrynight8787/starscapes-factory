import { useEffect, useState } from 'react'
import MemberIcon from './MemberIcon'
import { MEMBER_ICONS, NEWSLETTER_CHOICES, USERNAME_RE, MAX_NAME, EMAIL_RE, SAY } from './memberIcons'
import { fetchProfile, saveProfile, changeEmail } from './profileApi'
import './profile.css'

// "Your profile", the left side of My passes (Figma: 25 My passes and profile): name, username (shown beside their comments), email (how they log in; changing it sends a link to the new address),
// an icon for the message board, and which emails they want. Each person sees and changes only their own.
export default function ProfilePanel() {
  const [phase, setPhase] = useState('loading') // loading, ready, error
  const [email, setEmail] = useState('')
  const [form, setForm] = useState({ name: '', username: '', icon: '', newsletter: 'none', email: '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [round, setRound] = useState(0)

  useEffect(() => {
    let stopped = false
    setPhase('loading')
    fetchProfile()
      .then((p) => {
        if (stopped) return
        setEmail(p.email)
        setForm({ name: p.name, username: p.username, icon: p.icon, newsletter: p.newsletter, email: p.email })
        setPhase('ready')
      })
      .catch(() => !stopped && setPhase('error'))
    return () => {
      stopped = true
    }
  }, [round])

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setMessage('')
    setErrors((x) => ({ ...x, [key]: '' }))
  }
  const pick = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }))
    setMessage('')
  }

  async function submit(e) {
    e.preventDefault()
    const name = form.name.trim()
    const username = form.username.trim()
    const found = {}
    if (name.length > MAX_NAME) found.name = SAY.name_long
    if (username && !USERNAME_RE.test(username)) found.username = SAY.username_invalid
    const newEmail = form.email.trim()
    const emailChanged = newEmail.toLowerCase() !== email.toLowerCase()
    if (emailChanged && !EMAIL_RE.test(newEmail)) found.email = SAY.email_invalid
    setErrors(found)
    if (Object.keys(found).length > 0) return
    setSaving(true)
    setMessage('')
    try {
      await saveProfile({ name, username, icon: form.icon, newsletter: form.newsletter })
      setForm((f) => ({ ...f, name, username }))
      if (emailChanged) {
        try {
          await changeEmail(newEmail)
          setForm((f) => ({ ...f, email }))
          setMessage(`Saved. We have sent a link to ${newEmail}. Your log-in email changes once you press it. You may also get a link at your current address.`)
        } catch (err) {
          setErrors({ email: err.message })
          setMessage('Your other details are saved.')
        }
      } else {
        setMessage('Saved. Thank you.')
      }
    } catch (err) {
      if (err.field) setErrors({ [err.field]: err.message })
      else setMessage(err.message)
    }
    setSaving(false)
  }

  if (phase === 'loading') {
    return (
      <section className="pf" aria-labelledby="pf-title">
        <h2 id="pf-title" className="pf__title">Your profile</h2>
        <p className="pf__note" role="status">Finding your details…</p>
      </section>
    )
  }
  if (phase === 'error') {
    return (
      <section className="pf" aria-labelledby="pf-title">
        <h2 id="pf-title" className="pf__title">Your profile</h2>
        <p className="pf__note" role="status">{SAY.generic}</p>
        <button type="button" className="pf__btn pf__btn--quiet" onClick={() => setRound((n) => n + 1)}>Try again</button>
      </section>
    )
  }

  const shownName = form.username.trim() ? `@${form.username.trim()}` : '@your_username'
  return (
    <section className="pf" aria-labelledby="pf-title">
      <h2 id="pf-title" className="pf__title">Your profile</h2>
      <p className="pf__note">This is what you will see, and what other people see beside your comments.</p>
      <form className="pf__form" onSubmit={submit} noValidate>
        <div className="pf__field">
          <label htmlFor="pf-name">Name</label>
          <input id="pf-name" type="text" autoComplete="name" value={form.name} onChange={set('name')} maxLength={MAX_NAME + 20} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'pf-name-err' : undefined} />
          {errors.name && <small id="pf-name-err" className="pf__err" role="alert">{errors.name}</small>}
        </div>
        <div className="pf__field">
          <label htmlFor="pf-username">Username</label>
          <input id="pf-username" type="text" autoComplete="username" autoCapitalize="none" spellCheck="false" value={form.username} onChange={set('username')} maxLength={24} aria-invalid={Boolean(errors.username)} aria-describedby={errors.username ? 'pf-username-err' : 'pf-username-help'} />
          {errors.username ? (
            <small id="pf-username-err" className="pf__err" role="alert">{errors.username}</small>
          ) : (
            <small id="pf-username-help">Shown beside your comments as {shownName}. 3 to 20 letters, numbers or underscores. Each one is unique.</small>
          )}
        </div>
        <div className="pf__field">
          <label htmlFor="pf-email">Email</label>
          <input id="pf-email" type="email" autoComplete="email" value={form.email} onChange={set('email')} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'pf-email-err' : 'pf-email-help'} />
          {errors.email ? (
            <small id="pf-email-err" className="pf__err" role="alert">{errors.email}</small>
          ) : (
            <small id="pf-email-help">The email you log in with. If you change it, we send a link to the new address, and it changes once you press it.</small>
          )}
        </div>

        <fieldset className="pf__icons">
          <legend>Your icon for the message board</legend>
          <div className="pf__grid" role="radiogroup" aria-label="Your icon for the message board">
            {MEMBER_ICONS.map((i) => (
              <button key={i.key} type="button" role="radio" aria-checked={form.icon === i.key} aria-label={i.label} title={i.label} className={`pf__icon${form.icon === i.key ? ' is-on' : ''}`} onClick={() => pick('icon', i.key)}>
                <MemberIcon icon={i.key} size={52} />
              </button>
            ))}
          </div>
        </fieldset>

        <div className="pf__preview" aria-label="How you will look on a comment">
          <p className="pf__label">How you will look on a comment</p>
          <div className="pf__comment">
            <MemberIcon icon={form.icon} size={40} />
            <div>
              <p className="pf__who">{shownName}</p>
              <p className="pf__says">I loved this one. Can&rsquo;t wait for the next part!</p>
            </div>
          </div>
        </div>

        <fieldset className="pf__news">
          <legend>Emails from Starscapes Factory</legend>
          {NEWSLETTER_CHOICES.map((c) => (
            <label key={c.value} className={`pf__choice${form.newsletter === c.value ? ' is-on' : ''}`}>
              <input type="radio" name="pf-newsletter" value={c.value} checked={form.newsletter === c.value} onChange={() => pick('newsletter', c.value)} />
              <span>
                <span className="pf__choicename">{c.label}</span>
                <span className="pf__choiceblurb">{c.blurb}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <button type="submit" className="pf__btn" disabled={saving}>{saving ? 'Saving…' : 'Save my details'}</button>
        {message && <p className="pf__note pf__saved" role="status">{message}</p>}
      </form>
    </section>
  )
}
