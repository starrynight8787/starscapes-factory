import { useState } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Field, CheckField, FieldError, ErrorSummary, SuccessMessage, FailureMessage } from '../src/components/FormMessages'

const email = (props = {}) => (
  <Field id="email" label="Your email address" help="We use this only to send you the ebook." {...props}>
    {(p) => <input {...p} type="email" />}
  </Field>
)

describe('a field', () => {
  it('has a visible label that names it, and help text that is connected to it', () => {
    render(email())
    const input = screen.getByLabelText('Your email address')
    expect(input.id).toBe('email')
    expect(input.className).toBe('sf-input')
    expect(input.getAttribute('aria-describedby')).toBe('email-help')
    expect(screen.getByText('We use this only to send you the ebook.').id).toBe('email-help')
    expect(input.getAttribute('aria-invalid')).toBeNull()
  })
  it('with an error: is marked invalid, and the error sits under it, connected to it, with a ! icon and words', () => {
    const { container } = render(email({ error: 'Enter your email address, for example name@example.com' }))
    const input = screen.getByLabelText('Your email address')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.getAttribute('aria-describedby')).toBe('email-help email-error')
    const error = container.querySelector('#email-error')
    expect(error.textContent).toBe('!Enter your email address, for example name@example.com')
    expect(error.querySelector('[aria-hidden="true"]').textContent).toBe('!')   // the icon is decoration: the words carry the message
    expect(input.compareDocumentPosition(error) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
  it('with no help text and no error: has nothing extra to read', () => {
    render(<Field id="name" label="Name">{(p) => <input {...p} />}</Field>)
    expect(screen.getByLabelText('Name').getAttribute('aria-describedby')).toBeNull()
  })
  it('draws no error when there is none', () => {
    expect(render(<FieldError id="x">{''}</FieldError>).container.innerHTML).toBe('')
  })
})

describe('a tick box', () => {
  it('is a real tick box with its full sentence as its name, and an error that is connected to it', () => {
    render(<CheckField id="consent" label="Yes, send me the free ebook and your free blog posts by email" error="Tick the box to say yes" checked={false} onChange={() => {}} />)
    const box = screen.getByRole('checkbox', { name: 'Yes, send me the free ebook and your free blog posts by email' })
    expect(box.getAttribute('aria-invalid')).toBe('true')
    expect(box.getAttribute('aria-describedby')).toBe('consent-error')
    expect(screen.getByText('Tick the box to say yes')).toBeTruthy()
  })
  it('can be ticked by clicking its words', async () => {
    let ticked = false
    render(<CheckField id="c" label="I agree" checked={ticked} onChange={(e) => { ticked = e.target.checked }} />)
    await userEvent.click(screen.getByText('I agree'))
    expect(ticked).toBe(true)
  })
})

describe('the summary at the top of a form that failed', () => {
  const errors = [{ id: 'email', message: 'Enter your email address' }, { id: 'consent', message: 'Tick the box to say yes to the ebook and emails' }]
  it('draws nothing when there are no problems', () => {
    expect(render(<ErrorSummary errors={[]} />).container.innerHTML).toBe('')
  })
  it('says there is a problem, and lists each one', () => {
    render(<ErrorSummary errors={errors} />)
    const box = screen.getByRole('alert')
    expect(within(box).getByRole('heading', { name: 'There is a problem' })).toBeTruthy()
    expect(within(box).getByText('Fix these, then send the form again.')).toBeTruthy()
    expect(within(box).getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')])).toEqual([['Enter your email address', '#email'], ['Tick the box to say yes to the ebook and emails', '#consent']])
  })
  it('takes the keyboard focus, so a screen reader reads it at once', () => {
    render(<ErrorSummary errors={errors} />)
    expect(document.activeElement).toBe(screen.getByRole('alert'))
  })
  it('takes the focus again each time the form fails again: the form is sent and the same problems come back (a re-draw alone does not count: see the typing test at the end)', () => {
    const page = (list) => <main><form onSubmit={(e) => e.preventDefault()}><input aria-label="elsewhere" /></form><ErrorSummary errors={list} /></main>
    const { rerender, container } = render(page(errors))
    screen.getByLabelText('elsewhere').focus()
    expect(document.activeElement).not.toBe(screen.getByRole('alert'))
    fireEvent.submit(container.querySelector('form'))
    rerender(page([...errors]))
    expect(document.activeElement).toBe(screen.getByRole('alert'))
  })
  it('moves the focus into the field when a problem is clicked, without leaving the page', async () => {
    render(<><ErrorSummary errors={errors} />{email()}</>)
    await userEvent.click(screen.getByRole('link', { name: 'Enter your email address' }))
    expect(document.activeElement).toBe(screen.getByLabelText('Your email address'))
  })
  it('can be given its own words', () => {
    render(<ErrorSummary errors={errors} title="We could not send that" intro="Please check these." />)
    expect(screen.getByRole('heading', { name: 'We could not send that' })).toBeTruthy()
    expect(screen.getByText('Please check these.')).toBeTruthy()
  })
})

describe('a success message', () => {
  it('is announced politely, with a tick that is decoration and words that carry the news', () => {
    const { container } = render(<SuccessMessage title="Thank you. Your free ebook is ready.">The first free post is on its way to your inbox.</SuccessMessage>)
    const box = screen.getByRole('status')
    expect(box.textContent).toBe('\u2713Thank you. Your free ebook is ready.The first free post is on its way to your inbox.')
    expect(container.querySelector('[aria-hidden="true"]').textContent).toBe('\u2713')
  })
  it('works with a title alone', () => {
    render(<SuccessMessage title="Saved." />)
    expect(screen.getByRole('status').textContent).toBe('\u2713Saved.')
  })
})

describe('a failure message', () => {
  it('is announced at once, with a title and what happened, and nothing to click (it is not the person\u2019s mistake)', () => {
    render(<FailureMessage title="We couldn't send the email">Please try again in a moment.</FailureMessage>)
    const box = screen.getByRole('alert')
    expect(within(box).getByRole('heading', { name: "We couldn't send the email" })).toBeTruthy()
    expect(box.textContent).toContain('Please try again in a moment.')
    expect(within(box).queryByRole('link')).toBeNull()
  })
})

// A form that, like most on the site, builds its list of problems afresh each time it is drawn (so the list is a NEW list on every keystroke).
function Harness() {
  const [text, setText] = useState('')
  const [problems, setProblems] = useState([])
  return (
    <main>
      <ErrorSummary errors={problems.map((message, i) => ({ id: `f${i}`, message }))} />
      <form onSubmit={(e) => { e.preventDefault(); setProblems(text ? [] : ['Write something.']) }} noValidate>
        <input aria-label="the field" id="f0" value={text} onChange={(e) => setText(e.target.value)} />
        <button type="submit">Send</button>
      </form>
      <form onSubmit={(e) => e.preventDefault()}><button type="submit">Unrelated</button></form>
    </main>
  )
}

describe('the summary and the keyboard focus (found 21 October 2026 by a test on the New product form)', () => {
  it('moves the focus to the summary when a form is sent and has a problem', async () => {
    const user = userEvent.setup(); render(<Harness />); await user.click(screen.getByRole('button', { name: 'Send' }))
    expect(screen.getByRole('alert')).toHaveFocus()
  })
  it('does NOT take the focus back while the person types to fix the problem: every letter lands, in the field, with the summary still showing', async () => {
    const user = userEvent.setup(); render(<Harness />); await user.click(screen.getByRole('button', { name: 'Send' }))
    await user.click(screen.getByLabelText('the field')); await user.keyboard('hello world')
    expect(screen.getByLabelText('the field')).toHaveValue('hello world'); expect(screen.getByLabelText('the field')).toHaveFocus(); expect(screen.getByRole('alert')).toBeInTheDocument()
  })
  it('takes the focus again each time the form is sent with the problem still there (so a screen reader hears that nothing was accepted)', async () => {
    const user = userEvent.setup(); render(<Harness />); const send = screen.getByRole('button', { name: 'Send' })
    await user.click(send); expect(screen.getByRole('alert')).toHaveFocus()
    await user.click(screen.getByLabelText('the field')); expect(screen.getByLabelText('the field')).toHaveFocus()
    await user.click(send); expect(screen.getByRole('alert')).toHaveFocus()
  })
  it('is not set off by a different form elsewhere on the page, such as a sign-up box in the footer: sending that one does not pull the focus out of the field being fixed', async () => {
    const user = userEvent.setup(); render(<><Harness /><footer><form onSubmit={(e) => e.preventDefault()}><button type="submit">Join the newsletter</button></form></footer></>)
    await user.click(screen.getByRole('button', { name: 'Send' })); await user.click(screen.getByRole('button', { name: 'Join the newsletter' }))
    await user.click(screen.getByLabelText('the field')); await user.keyboard('still typing')
    expect(screen.getByLabelText('the field')).toHaveValue('still typing'); expect(screen.getByLabelText('the field')).toHaveFocus()
  })
  it('leaves once the problem is put right: the summary goes away when the form is sent correctly', async () => {
    const user = userEvent.setup(); render(<Harness />); await user.click(screen.getByRole('button', { name: 'Send' }))
    await user.type(screen.getByLabelText('the field'), 'ok'); await user.click(screen.getByRole('button', { name: 'Send' }))
    expect(screen.queryByRole('alert')).toBeNull()
  })
  it('takes the focus when a different problem appears while it is already showing', async () => {
    const { rerender } = render(<ErrorSummary errors={[{ id: 'a', message: 'First problem' }]} />); const box = screen.getByRole('alert'); box.blur(); document.body.focus()
    rerender(<ErrorSummary errors={[{ id: 'a', message: 'First problem' }, { id: 'b', message: 'Second problem' }]} />); expect(screen.getByRole('alert')).toHaveFocus()
  })
})
