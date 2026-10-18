// What the post forms check before saving. Plain words for each problem, in the same pattern as the other forms on the site.
export const MAX_PICTURE_MB = 6
export const MAX_PICTURE_BYTES = MAX_PICTURE_MB * 1024 * 1024

export function postProblems({ title, content, file }) {
  const found = {}
  if (!String(title || '').trim()) found.title = 'Write a title for the post.'
  if (!String(content || '').trim()) found.content = 'Write the post itself.'
  if (file && typeof file.size === 'number' && file.size > MAX_PICTURE_BYTES) found.file = `That picture is over ${MAX_PICTURE_MB} MB. Choose a smaller one.`
  return found
}

export const summaryOf = (problems, ids) => Object.keys(problems).map((key) => ({ id: ids[key], message: problems[key] }))
