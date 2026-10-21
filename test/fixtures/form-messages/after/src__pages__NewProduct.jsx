import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Field, ErrorSummary, FailureMessage } from '../components/FormMessages'
import { productProblems } from './productFormRules'
import { summaryOf } from './postFormRules'
import '../styles/pages.css'
import '../styles/forms.css'

const COLLECTIONS = [
  'Calm Series',
  'Out of this World',
  "Ocean's View",
  "Dance Like You Just Don't Care",
  'Unique One of a Kind',
]

const IDS = { title: 'npr-title', description: 'npr-description', price: 'npr-price', files: 'npr-images' }

export default function NewProduct({ session }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [productType, setProductType] = useState('original')
  const [collection, setCollection] = useState('')
  const [files, setFiles] = useState([])
  const [error, setError] = useState(null)
  const [errors, setErrors] = useState({}) // a plain-words problem under each field that needs fixing
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    const found = productProblems({ title, description, price, files })
    if (Object.keys(found).length > 0) {
      setErrors(found)
      return
    }
    setErrors({})
    setSaving(true)

    try {
      const imageUrls = []

      for (const file of files) {
        const fileExt = file.name.split('.').pop()
        const filePath = `${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath)

        imageUrls.push(publicUrlData.publicUrl)
      }

      const { error: insertError } = await supabase.from('products').insert({
        title,
        description,
        price: parseFloat(price),
        product_type: productType,
        collection: collection || null,
        images: imageUrls,
        author_id: session.user.id,
        published: true,
      })

      if (insertError) throw insertError

      navigate('/products')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="fm">
      <h1 className="fm__title">New product</h1>
      <ErrorSummary errors={summaryOf(errors, IDS)} />
      {error && <FailureMessage title="The product was not saved">{error}</FailureMessage>}
      <form className="fm__form" onSubmit={handleSubmit} noValidate>
        <Field id="npr-title" label="Title" error={errors.title}>
          {(p) => <input {...p} type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />}
        </Field>
        <Field id="npr-description" label="Description" error={errors.description}>
          {(p) => <textarea {...p} placeholder="Description" rows={6} value={description} onChange={(e) => setDescription(e.target.value)} required />}
        </Field>
        <div className="fm__row">
          <Field id="npr-price" label="Price (£)" error={errors.price}>
            {(p) => <input {...p} type="number" step="0.01" placeholder="Price (£)" value={price} onChange={(e) => setPrice(e.target.value)} required />}
          </Field>
          <Field id="npr-type" label="Kind of product">
            {(p) => (
              <select {...p} value={productType} onChange={(e) => setProductType(e.target.value)}>
                <option value="original">Original</option>
                <option value="print">Print</option>
                <option value="digital">Digital Download</option>
              </select>
            )}
          </Field>
        </div>
        <Field id="npr-collection" label="Collection">
          {(p) => (
            <select {...p} value={collection} onChange={(e) => setCollection(e.target.value)}>
              <option value="">No collection</option>
              {COLLECTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field id="npr-images" label="Images" help="3 to 6 recommended. The first one becomes the thumbnail." error={errors.files}>
          {(p) => <input {...p} type="file" accept="image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files))} />}
        </Field>
        <div className="fm__actions">
          <button type="submit" className="pg-btn fm-btn--primary" disabled={saving}>
            {saving ? 'Publishing...' : 'Publish Product'}
          </button>
          <button type="button" className="pg-btn" onClick={() => navigate('/admin')}>
            Cancel
          </button>
        </div>
      </form>
    </main>
  )
}
