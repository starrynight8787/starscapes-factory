// The reusable banner at the top of a page, and how the Leadership Blog uses it.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import PageBanner from '../src/components/PageBanner'

const read = (p) => readFileSync(join(process.cwd(), p), 'utf8')

describe('the banner', () => {
  it('has a chip, the page\u2019s one heading, a line under it, and buttons', () => {
    render(<PageBanner chip="Leading from the Middle" title="Leadership Blog" subtitle="Notes on leading from where you are."><a href="/x">Start</a></PageBanner>)
    expect(screen.getAllByRole('heading')).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Leadership Blog' })).toBeInTheDocument()
    expect(screen.getByText('Leading from the Middle')).toBeInTheDocument(); expect(screen.getByText('Notes on leading from where you are.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Start' })).toBeInTheDocument()
  })
  it('shows only what it is given: no chip, subtitle, buttons or picture means none of them', () => {
    const { container } = render(<PageBanner title="Just a title" />)
    expect(container.querySelector('.pb__chip')).toBeNull(); expect(container.querySelector('.pb__subtitle')).toBeNull()
    expect(container.querySelector('.pb__buttons')).toBeNull(); expect(container.querySelector('img')).toBeNull()
  })
  it('shows its picture as decoration (no description, so a screen reader skips it), loaded lazily', () => {
    const { container } = render(<PageBanner title="T" picture="/scenes/x/base.svg" />)
    const img = container.querySelector('img')
    expect(img).toHaveAttribute('src', '/scenes/x/base.svg'); expect(img).toHaveAttribute('alt', ''); expect(img).toHaveAttribute('loading', 'lazy')
  })
  it('has no inline styles apart from hiding a picture that will not load, and no text under 14px', () => {
    expect(read('src/components/PageBanner.jsx').replace("e.currentTarget.style.visibility = 'hidden'", '')).not.toMatch(/style=\{\{/)
    for (const m of read('src/components/pagebanner.css').matchAll(/font-size:\s*([\d.]+)(px|rem)/g)) expect(m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]), m[0]).toBeGreaterThanOrEqual(14)
  })
  it('stacks into one column on a phone, with full-width buttons', () => {
    expect(read('src/components/pagebanner.css')).toMatch(/@media \(max-width: 960px\)[\s\S]*\.pb__buttons,\s*\.pb__buttons \.pg-btn \{\s*width: 100%/)
  })
})
