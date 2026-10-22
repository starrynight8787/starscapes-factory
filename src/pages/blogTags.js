// The tag filter on /blog: tags that are only for our own bookkeeping (test posts, the build diary's working tags) are left out, and the rest are shown as plain words.
export const HIDDEN_BLOG_TAGS = ['factory-floor', 'blueprints', 'blueprint', 'test-import', 'testing', 'test', 'repeat', 'multiple', 'archive-entries', 'archive-entry']

export const hiddenFromBlog = (tag) => HIDDEN_BLOG_TAGS.includes(String(tag || '').trim().toLowerCase().replace(/\s+/g, '-'))

// "lessons-from-the-road" -> "Lessons from the road"
export function friendlyTag(tag) {
  const words = String(tag || '').trim().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ')
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : ''
}
