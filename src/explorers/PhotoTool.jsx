import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { photoLine, scaledSize } from './travelRules'

// Adds a photo to the text of an Explorer's Bay post. The photo is re-drawn in the browser first, which leaves out the location and camera details saved inside the original file,
// then kept with the post pictures. It needs a description (read aloud for anyone who cannot see it). Please leave out children's faces and names.
async function cleanCopy(file) {
  const bitmap = await createImageBitmap(file)
  const { width, height } = scaledSize(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height)
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88))
  if (!blob) throw new Error('That photo could not be prepared.')
  return blob
}

export default function PhotoTool({ userId, onInsert }) {
  const [file, setFile] = useState(null)
  const [alt, setAlt] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  async function add() {
    setNote('')
    if (!file) return setNote('Choose a photo first.')
    if (!alt.trim()) return setNote('Describe what the photo shows, in a few words.')
    setBusy(true)
    try {
      const blob = await cleanCopy(file)
      const path = `${userId}/article-${Date.now()}.jpg`
      const { error } = await supabase.storage.from('post-images').upload(path, blob, { contentType: 'image/jpeg' })
      if (error) throw error
      const { data } = supabase.storage.from('post-images').getPublicUrl(path)
      onInsert(photoLine(data.publicUrl, alt))
      setFile(null)
      setAlt('')
      setNote('Added to the end of the text. Cut and paste the line to move the photo.')
    } catch (e) {
      setNote(e.message || 'The photo could not be added.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <fieldset className="xb-fields">
      <legend>Add a photo to the text</legend>
      <p className="xb-fields__help">No children&apos;s faces or names, please. Location details are removed from the photo for you.</p>
      <input className="xb-input" type="file" accept="image/*" aria-label="Photo" onChange={(e) => setFile(e.target.files[0] || null)} />
      <input className="xb-input" type="text" aria-label="What the photo shows" placeholder="What the photo shows" value={alt} onChange={(e) => setAlt(e.target.value)} />
      <button type="button" className="pg-btn" onClick={add} disabled={busy}>{busy ? 'Adding...' : 'Add photo'}</button>
      {note && <p role="status" className="xb-fields__help">{note}</p>}
    </fieldset>
  )
}
