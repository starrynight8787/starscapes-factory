// The tab title for pages that do not set one of their own.
import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import RouteTitle from '../src/components/RouteTitle'

const at = (path) => render(<MemoryRouter initialEntries={[path]}><RouteTitle /></MemoryRouter>)
beforeEach(() => { document.title = 'Something else' })

describe('RouteTitle', () => {
  it('gives the home page its full title', () => {
    at('/')
    expect(document.title).toBe('Starscapes Factory: where imagination takes shape')
  })
  it('gives a page with no title of its own the name from the table, then the site name', () => {
    at('/blog')
    expect(document.title).toBe('All posts | Starscapes Factory')
    at('/login')
    expect(document.title).toBe('Log in | Starscapes Factory')
  })
  it('copes with a slash on the end of the address', () => {
    at('/cart/')
    expect(document.title).toBe('Your cart | Starscapes Factory')
  })
  it('leaves alone a page that sets its own title (a room, a print, a post), so the two never fight', () => {
    at('/idea-hatchery')
    expect(document.title).toBe('Something else')
    at('/art-loft/prints/abc')
    expect(document.title).toBe('Something else')
    at('/post/123')
    expect(document.title).toBe('Something else')
  })
  it('shows nothing on the page itself', () => {
    const { container } = at('/blog')
    expect(container.innerHTML).toBe('')
  })
})
