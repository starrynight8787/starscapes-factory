import EntryPage from './EntryPage'
import NotebookTeaser from './NotebookTeaser'
import { fetchDeskPosts } from '../draftingdesk/draftingApi'
import { AREAS, areaOf } from '../draftingdesk/draftingData'

// Archive Entries (the Drafting Desk), on the entry template, with the Author's Notebook teaser under the pinned entry, as drawn. A post belongs here if it has the
// tag archive-entries (or archive-entry), which the Drafting Desk has always used. The Drafting Desk's own posts come from its own call.
const AREA = AREAS['archive-entries']
const load = () => fetchDeskPosts()
const belongs = (post) => areaOf(post) === 'archive-entries'
const aside = <NotebookTeaser />

export default function ArchiveEntriesPage() {
  return <EntryPage art="archive" chip="Overthink Archive" title={AREA.name} blurb={AREA.blurb} backTo="/drafting-desk" backLabel="Back to the Drafting Desk" load={load} belongs={belongs} aside={aside} />
}
