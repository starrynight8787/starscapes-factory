// Runs after "vite build" (see package.json). For every address in src/data/pageMeta.js it writes a copy of the page with that page's own
// title, description and share picture in the HTML, because WhatsApp, Facebook, X, iMessage and Slack do not run the site's code and so can
// only see what is in the HTML itself. It also writes sitemap.xml.
//
//   dist/index.html             the home page. It is ALSO what Vercel serves for every address that is not in the table (one post, one print),
//                               so it deliberately has no address of its own (no canonical, no og:url): a post is never taken for the home page
//   dist/<address>/index.html   each other page in the table, with its own words and its own address
//   dist/sitemap.xml            the addresses in the table that are allowed in search results
//
// If this script is ever skipped, nothing breaks: the site still works, and index.html still carries the general words from the project's own
// index.html. vercel.json is unchanged.
//
// Usage: node scripts/make-share-pages.mjs [build folder]      (the folder defaults to dist)
import fs from 'node:fs'
import path from 'node:path'
import { createServer } from 'vite'
import { renderHead, fileFor, sitemapXml } from './shareHead.mjs'

const dist = path.resolve(process.argv[2] || 'dist')
const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')

// The table imports the rooms' own data the way the site does, so it is loaded the way the site loads it
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent', root: process.cwd() })
let meta
try {
  meta = await server.ssrLoadModule('/src/data/pageMeta.js')
} finally {
  await server.close()
}
const { PAGES, IMAGES, SITE_NAME, urlFor, fullTitleFor, imageUrlFor } = meta

const forPage = (page, urlPath) => ({
  title: fullTitleFor(page),
  description: page.description,
  siteName: SITE_NAME,
  url: urlFor(urlPath),
  imageUrl: imageUrlFor(page),
  imageAlt: IMAGES[page.image].alt,
  index: page.index !== false,
})

// One copy of the page for each address in the table
const indexable = []
for (const [urlPath, page] of Object.entries(PAGES)) {
  const target = path.join(dist, fileFor(urlPath))
  fs.mkdirSync(path.dirname(target), { recursive: true })
  const info = forPage(page, urlPath)
  if (urlPath === '/') delete info.url // the home page file is also the fallback for unlisted addresses, so it carries no address of its own
  fs.writeFileSync(target, renderHead(template, info))
  if (page.index !== false) indexable.push(urlFor(urlPath))
}

// The sitemap
fs.writeFileSync(path.join(dist, 'sitemap.xml'), sitemapXml(indexable))
console.log(`Share pages: ${Object.keys(PAGES).length} written (${indexable.length} in the sitemap).`)
