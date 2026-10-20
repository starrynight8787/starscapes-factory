import { describe, it, expect } from 'vitest'
import { descriptionParagraphs } from '../src/artloft/descriptionText'

describe('description paragraphs', () => {
  it('shows the blurb, then everything else run together as one paragraph', () => {
    const text = 'Blurb here.\n\nAll prints are on paper.\n\nSizes available:\n\n21x30cm, open edition\n30x40cm, open edition\n\nSafe delivery.'
    expect(descriptionParagraphs(text)).toEqual(['Blurb here.', 'All prints are on paper. Sizes available: 21x30cm, open edition 30x40cm, open edition Safe delivery.'])
  })
  it('keeps a one-paragraph description as it is, and copes with nothing', () => {
    expect(descriptionParagraphs('test')).toEqual(['test'])
    expect(descriptionParagraphs('')).toEqual([])
    expect(descriptionParagraphs(null)).toEqual([])
  })
})
