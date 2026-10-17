import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Field, CheckField, FieldError, ErrorSummary, SuccessMessage } from '../src/components/FormMessages'

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
  it('takes the focus again each time the form fails again', () => {
    const { rerender } = render(<><input aria-label="elsewhere" /><ErrorSummary errors={errors} /></>)
    screen.getByLabelText('elsewhere').focus()
    expect(document.activeElement).not.toBe(screen.getByRole('alert'))
    rerender(<><input aria-label="elsewhere" /><ErrorSummary errors={[...errors]} /></>)
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
