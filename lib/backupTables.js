// WHAT GOES INTO THE BACKUP (22 October 2026). The database has no automatic backups on the free plan, so the owner can download a copy from Admin, "Download a backup".
// Every table in the database is either listed in BACKUP_TABLES (it is saved) or in LEFT_OUT (it is not, and the reason is written down). A test fails if a table is added to the database
// without being put in one of the two lists, so the backup cannot quietly fall behind the site.
// "order" is the column(s) a table is read in, so that reading it a page at a time never repeats or misses a row.
export const BACKUP_TABLES = [
  { name: 'orders', label: 'Orders', order: ['id'] },
  { name: 'memberships', label: 'Memberships', order: ['user_id'] },
  { name: 'member_profiles', label: 'Member profiles', order: ['user_id'] },
  { name: 'member_country', label: 'Members\u2019 countries', order: ['user_id'] },
  { name: 'membership_notices', label: 'Membership reminder emails', order: ['id'] },
  { name: 'newsletter_subscribers', label: 'Newsletter and ebook sign-ups', order: ['id'] },
  { name: 'newsletter_issues', label: 'Newsletters written', order: ['id'] },
  { name: 'newsletter_sends', label: 'Newsletters sent', order: ['id'] },
  { name: 'posts', label: 'Posts', order: ['id'] },
  { name: 'post_bodies', label: 'The text of paid posts', order: ['post_id'] },
  { name: 'post_reads', label: 'How often posts were read', order: ['post_id'] },
  { name: 'products', label: 'Products', order: ['id'] },
  { name: 'product_variants', label: 'Product sizes and prices', order: ['id'] },
  { name: 'books', label: 'Books', order: ['id'] },
  { name: 'reading_goals', label: 'Reading goals', order: ['year'] },
  { name: 'book_comments', label: 'Book Club comments', order: ['id'] },
  { name: 'stories', label: 'Stories', order: ['id'] },
  { name: 'story_chapters', label: 'Story chapters', order: ['story_id', 'number'] },
  { name: 'story_votes', label: 'Story votes', order: ['id'] },
  { name: 'story_vote_options', label: 'Story vote choices', order: ['id'] },
  { name: 'story_ballots', label: 'Story votes cast', order: ['vote_id', 'user_id'] },
  { name: 'suggestion_spaces', label: 'Suggestion boxes', order: ['space'] },
  { name: 'suggestions', label: 'Suggestions', order: ['id'] },
  { name: 'suggestion_votes', label: 'Suggestion votes cast', order: ['suggestion_id', 'user_id'] },
  { name: 'atlas_stamps', label: 'Star Atlas stamps', order: ['id'] },
  { name: 'atlas_years', label: 'Star Atlas years', order: ['year'] },
  { name: 'doors', label: 'Which doors are open', order: ['room', 'door'] },
  { name: 'events', label: 'Events', order: ['id'] },
  { name: 'site_settings', label: 'Site settings', order: ['key'] },
]

export const LEFT_OUT = [
  { name: 'instagram_token', why: 'It holds a secret access token. A backup file must not contain secrets, and Instagram can simply be connected again.' },
  { name: 'email_requests', why: 'A short-term log the site uses to limit how many emails can be asked for. It is not worth keeping.' },
]

export const BACKUP_TABLE_NAMES = BACKUP_TABLES.map((t) => t.name)
