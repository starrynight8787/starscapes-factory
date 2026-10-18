// The search, sort and tag buttons above a list of posts.
// It does not keep any choices itself: they live in the page address, and onChange({ q, tag, sort }) updates them.
export default function PostFilter({ q, tag, sort, tags, total, shown, onChange }) {
  const filtering = Boolean(q.trim() || tag)
  return (
    <form className="ff-filter legacy" role="search" aria-label="Filter posts" onSubmit={(e) => e.preventDefault()}>
      <div className="ff-filter__row">
        <label className="ff-filter__field">
          <span>Search</span>
          <input type="search" value={q} placeholder="Search by title" onChange={(e) => onChange({ q: e.target.value })} />
        </label>
        <label className="ff-filter__field ff-filter__field--sort">
          <span>Sort</span>
          <select value={sort} onChange={(e) => onChange({ sort: e.target.value === 'oldest' ? 'oldest' : '' })}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
      </div>

      {tags.length > 0 && (
        <div className="ff-filter__tags" role="group" aria-label="Filter by tag">
          {tags.map((t) => {
            const on = tag.trim().toLowerCase() === t.key
            return (
              <button key={t.key} type="button" className={on ? 'is-on' : ''} aria-pressed={on} onClick={() => onChange({ tag: on ? '' : t.key })}>
                {t.label} <small>{t.count}</small>
              </button>
            )
          })}
        </div>
      )}

      <p className="ff-filter__count" role="status">
        Showing {shown} of {total} {total === 1 ? 'post' : 'posts'}
        {filtering && (
          <button type="button" onClick={() => onChange({ q: '', tag: '' })}>Clear filters</button>
        )}
      </p>
    </form>
  )
}
