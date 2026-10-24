// Settings that apply to the whole site.
//
// SEARCH_ENGINES_ALLOWED: while this is false, EVERY page says "do not list me" (noindex, nofollow) and the sitemap is empty, so Google and the others
// leave the site alone while you build and while testers try it. AT LAUNCH, change it to true, push, and the pages (apart from the private ones) and the
// sitemap open up again. It is read when the site is built, so the change takes effect with the next push.
export const SEARCH_ENGINES_ALLOWED = false

// PINTEREST_VERIFY: the code Pinterest gives you to claim the website (Business account, Settings, Claimed accounts, Claim, "Add HTML tag"). It looks like
// <meta name="p:domain_verify" content="0123456789abcdef0123456789abcdef"/>. Paste ONLY the part inside content="..." between the quotes below, push, and the tag is
// added to every page when the site is built. Leave it empty until you have the code. (A website can be claimed by one Pinterest account only.)
export const PINTEREST_VERIFY = ''
