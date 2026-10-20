// A print's description is shown as two paragraphs: the blurb (everything before the first blank line), then the rest of the text run together as one paragraph.
export function descriptionParagraphs(text) {
  const parts = String(text || '')
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  if (parts.length <= 1) return parts
  return [parts[0], parts.slice(1).join(' ')]
}
