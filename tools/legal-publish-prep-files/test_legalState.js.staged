// Whether the five legal pages are DRAFTS (only the owner sees them, the footer hides them, the date is still [date]) or PUBLISHED (every visitor sees them, the footer links to them, they carry a real date).
// A test that only makes sense in one state runs only in that state: it.runIf(DRAFT) / describe.runIf(PUBLISHED). Publishing is one command (tools/publish-legal-pages.py, SFW-186); test/legal-states.test.jsx
// fails if the pages are ever half-way between the two.
import { LEGAL_PAGES } from '../src/data/legalPages'

export const DRAFT = LEGAL_PAGES.every((p) => p.ready !== true)
export const PUBLISHED = LEGAL_PAGES.every((p) => p.ready === true)
