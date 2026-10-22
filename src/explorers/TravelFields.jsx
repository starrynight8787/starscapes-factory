import { useMemo } from 'react'
import { Field } from '../components/FormMessages'
import { COUNTRY_CODES } from '../atlas/atlasRules'
import { countryName } from './travelRules'

// The three extra boxes on the post forms for an Explorer's Bay post: the country, the year visited and the official travel advice link. Shown only when the room is Explorer's Bay.
export default function TravelFields({ idPrefix, values, onChange, errors = {} }) {
  const countries = useMemo(() => COUNTRY_CODES.map((code) => ({ code, name: countryName(code) })).sort((a, b) => a.name.localeCompare(b.name, 'en-GB')), [])
  const set = (key) => (e) => onChange({ ...values, [key]: e.target.value })
  return (
    <fieldset className="xb-fields">
      <legend>Where this piece is about</legend>
      <Field id={`${idPrefix}-country`} label="Country" help="Needed for a Lessons from the road piece. It puts the piece on the Travel map." error={errors.country}>
        {(p) => (
          <select {...p} value={values.country || ''} onChange={set('country')}>
            <option value="">No country</option>
            {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        )}
      </Field>
      <Field id={`${idPrefix}-year`} label="Year visited" help="Four digits, for example 2023." error={errors.year}>
        {(p) => <input {...p} type="text" inputMode="numeric" maxLength={4} placeholder="2023" value={values.year || ''} onChange={set('year')} />}
      </Field>
      <Field id={`${idPrefix}-advice`} label="Official travel advice link" help="The government page for this country, starting with https://" error={errors.advice}>
        {(p) => <input {...p} type="url" placeholder="https://" value={values.advice || ''} onChange={set('advice')} />}
      </Field>
    </fieldset>
  )
}
