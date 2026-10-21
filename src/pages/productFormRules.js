// What the New product form checks before saving. Plain words for each problem that also say what to do, in the same pattern as the post form (postFormRules.js).
// (The summary list at the top of the form uses summaryOf from postFormRules.js.)

export function productProblems({ title, description, price, files }) {
  const found = {}
  if (!String(title || '').trim()) found.title = 'Write a title for the product.'
  if (!String(description || '').trim()) found.description = 'Write a description of the product.'
  const raw = String(price == null ? '' : price).trim()
  if (!raw) found.price = 'Enter the price in pounds, for example 35.00.'
  else if (!Number.isFinite(Number(raw)) || Number(raw) <= 0) found.price = 'Enter a price above £0, for example 35.00.'
  const notPictures = (Array.isArray(files) ? files : []).filter((f) => f && typeof f.type === 'string' && !/^image\//.test(f.type))
  if (notPictures.length === 1) found.files = `${notPictures[0].name || 'One of the files'} is not a picture. Choose pictures only.`
  else if (notPictures.length > 1) found.files = `These files are not pictures: ${notPictures.map((f) => f.name || 'a file').join(', ')}. Choose pictures only.`
  return found
}
