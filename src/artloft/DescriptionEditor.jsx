import { useState } from 'react'

export const DESCRIPTION_MAX = 1500

// A box for your own description of one print. It lives in your shop, so a sync with Creative Hub never changes it.
export default function DescriptionEditor({ print, busy, onSave }) {
  const [text, setText] = useState(print.description || '')
  const changed = text.trim() !== (print.description || '').trim()
  return (
    <div className="al-admin__editor">
      <label>
        <span>Your description of {print.title}</span>
        <textarea value={text} maxLength={DESCRIPTION_MAX} rows={4} onChange={(e) => setText(e.target.value)} />
      </label>
      <div className="al-admin__editor-row">
        <small>{text.length} of {DESCRIPTION_MAX}</small>
        <button type="button" disabled={busy || !changed} onClick={() => onSave(print, text.trim())}>Save description</button>
      </div>
    </div>
  )
}
