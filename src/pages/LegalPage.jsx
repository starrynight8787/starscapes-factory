import { COMPANY } from '../data/company'
import { renderMarkdown } from './simpleMarkdown'
import useTitle from './useTitle'
import './systempages.css'

const slugify = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// The company line the law asks for: only the parts that are filled in are shown.
export function CompanyCard({ company = COMPANY }) {
  const parts = []
  if (company.number) parts.push(`Company number ${company.number}.`)
  if (company.registeredOffice) parts.push(`Registered office: ${company.registeredOffice}.`)
  if (company.registeredIn) parts.push(`Registered in ${company.registeredIn}.`)
  if (company.vat) parts.push(`VAT number ${company.vat}.`)
  return (
    <div className="lg-company">
      <strong>{company.name}</strong>
      {parts.length > 0 && <span>{parts.join(' ')}</span>}
    </div>
  )
}

// A legal page: the title, when it was last updated, a list of its sections down the side, and the sections themselves, numbered.
export default function LegalPage({ page, company }) {
  useTitle(page.title)
  const sections = page.sections.map((s) => ({ ...s, id: slugify(s.title) }))
  return (
    <main className="lg">
      <h1>{page.title}</h1>
      {page.updated && <p className="lg-updated">Last updated: {page.updated}</p>}
      <div className="lg-body">
        <nav className="lg-toc" aria-label="On this page">
          <p className="lg-toc__title">On this page</p>
          <ol>
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>
                  {i + 1}. {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="lg-text">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-heading`}>
              <h2 id={`${s.id}-heading`}>
                {i + 1}. {s.title}
              </h2>
              {renderMarkdown(s.paragraphs.join('\n\n')).nodes}
            </section>
          ))}
          <CompanyCard company={company} />
        </div>
      </div>
    </main>
  )
}
