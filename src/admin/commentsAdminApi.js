import { supabase } from '../supabaseClient'

// The owner's list of every comment on the Book Club books, newest first, each with the title of its book. The database decides who may read them: only Book Club members
// and the owner (sql/book-details.sql), so anyone else just gets nothing back. A problem comes back as plain words.
export async function fetchComments(limit = 1000) {
  const { data, error } = await supabase.from('book_comments').select('id, book_id, author_name, body, created_at, books(title)').order('created_at', { ascending: false }).limit(limit)
  if (error) throw new Error('The comments could not load just now. Please try again in a moment.')
  return (Array.isArray(data) ? data : []).map((r) => ({
    id: r.id,
    bookId: r.book_id,
    bookTitle: (r.books && r.books.title) || '',
    author: r.author_name || '',
    body: r.body || '',
    createdAt: r.created_at || null,
  }))
}

// Deletes one comment for good. The database lets only the owner delete someone else's, and it does not complain if it deleted nothing, so the deleted row is asked for:
// no row back means nothing was deleted, and that is said, not hidden.
export async function deleteComment(id) {
  const { data, error } = await supabase.from('book_comments').delete().eq('id', id).select('id')
  if (error) throw new Error('That comment could not be deleted just now. Please try again in a moment.')
  if (!Array.isArray(data) || data.length === 0) throw new Error('That comment was not deleted. It may already be gone: reload the page to check.')
}
