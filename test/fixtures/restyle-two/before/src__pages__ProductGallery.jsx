import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function ProductGallery() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const activeCollection = searchParams.get('collection')

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true)

      let query = supabase
        .from('products')
        .select('id, title, price, images, product_type, collection, created_at')
        .eq('published', true)
        .order('created_at', { ascending: false })

      if (activeCollection) {
        query = query.eq('collection', activeCollection)
      }

      const { data, error } = await query

      if (error) {
        setError(error.message)
      } else {
        setProducts(data)
      }
      setLoading(false)
    }

    fetchProducts()
  }, [activeCollection])

  function clearFilter() {
    setSearchParams({})
  }

  if (loading) return <p>Loading products...</p>
  if (error) return <p className="error">{error}</p>

  return (
    <div>
      <h1>🎨 The Art Loft</h1>

      {activeCollection && (
        <p className="muted">
          Collection: <strong>{activeCollection}</strong>{' '}
          <button onClick={clearFilter} style={{ marginLeft: 8 }}>
            Clear
          </button>
        </p>
      )}

      {products.length === 0 && <p className="muted">No products yet. Check back soon!</p>}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 20,
        }}
      >
        {products.map((product) => (
          <Link
            key={product.id}
            to={`/products/${product.id}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            {product.images && product.images[0] && (
              <img
                src={product.images[0]}
                alt={product.title}
                style={{ width: '100%', borderRadius: 8, aspectRatio: '1', objectFit: 'cover' }}
              />
            )}
            <h3 style={{ margin: '10px 0 4px', fontSize: 15 }}>{product.title}</h3>
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>
              £{Number(product.price).toFixed(2)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}