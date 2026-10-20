import EntryPage from './EntryPage'
import { fetchDeskPosts } from '../draftingdesk/draftingApi'
import { AREAS, areaOf } from '../draftingdesk/draftingData'

// A Drafting Desk page of posts for one area (Writing Prompts, Poems), on the entry template under the Drafting Desk's room banner.
// A post belongs here if it is in the Drafting Desk and has the area's tag (see areaOf in draftingData.js).
const load = () => fetchDeskPosts()

export default function DeskAreaEntriesPage({ area }) {
  const info = AREAS[area]
  return <EntryPage art="archive" room="drafting-desk" chip="The Drafting Desk" title={info.name} blurb={info.blurb} backTo="/drafting-desk" backLabel="Back to the Drafting Desk" load={load} belongs={(post) => areaOf(post) === area} />
}
