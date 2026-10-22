import { Link } from 'react-router-dom'
import { countryName, isLesson, travelOf } from './travelRules'

// The details at the top of a travel article: the country (linking to the map), the year visited and the official travel advice. Shows nothing for a post without a country.
export default function TravelCard({ post }) {
  const t = travelOf(post)
  if (!t.country) return null
  const lesson = isLesson(post)
  return (
    <dl className="xb-card" aria-label="About this place">
      <dt>Country</dt>
      <dd><Link to={`/explorers-bay/travel-map?country=${t.country}`}>{countryName(t.country)}</Link></dd>
      {lesson && t.year && (<><dt>Year visited</dt><dd>{t.year}</dd></>)}
      {lesson && t.advice && (
        <>
          <dt>Official travel advice</dt>
          <dd><a href={t.advice} target="_blank" rel="noopener noreferrer">Government travel advice for {countryName(t.country)} (opens in a new tab)</a></dd>
        </>
      )}
    </dl>
  )
}
