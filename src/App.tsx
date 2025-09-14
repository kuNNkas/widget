import React, { useMemo, useState } from 'react'
import { Routes, Route, useNavigate, useParams } from 'react-router-dom'
import Header from './components/Header'
import ProductCard from './components/ProductCard'
import ProductModal from './components/ProductModal'
import CartDrawer from './components/CartDrawer'
import Filters from './components/Filters'
import TryOnWidget from './components/TryOnWidget'   // ⬅ добавить
import { CartProvider } from './context/CartContext'
import { PRODUCTS } from './data/products'

function Catalog(){
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [maxPrice, setMaxPrice] = useState(9990)
  const [query, setQuery] = useState('')
  const [modalSlug, setModalSlug] = useState<string | null>(null)

  // состояние виджета
  const [tryOnOpen, setTryOnOpen] = useState(false)
  const [tryOnGarment, setTryOnGarment] = useState<string>('')

  const filtered = useMemo(() => {
    return PRODUCTS.filter(p => {
      const matchesText = (p.title + ' ' + p.brand).toLowerCase().includes(query.toLowerCase())
      const matchesPrice = p.price <= maxPrice
      const matchesSize = selectedSize ? p.variants.some(v => v.sizes.includes(selectedSize)) : true
      const matchesColor = selectedColor ? p.variants.some(v => v.color.name.toLowerCase() === selectedColor.toLowerCase()) : true
      return matchesText && matchesPrice && matchesSize && matchesColor
    })
  }, [selectedSize, selectedColor, maxPrice, query])

  const productForModal = PRODUCTS.find(p => p.slug === modalSlug) || null

  return (
    <>
      {/* ... hero пропускаем без изменений ... */}

      <main className="container main" id="cat">
        <Filters
          selectedSize={selectedSize} setSelectedSize={setSelectedSize}
          selectedColor={selectedColor} setSelectedColor={setSelectedColor}
          maxPrice={maxPrice} setMaxPrice={setMaxPrice}
        />
        <section className="grid">
          {filtered.map(p => (
            <ProductCard
              key={p.id}
              p={p}
              onTryOn={(imageUrl) => {
                setTryOnGarment(imageUrl);
                setTryOnOpen(true);
              }}
            />
          ))}
        </section>
      </main>

      {productForModal && (
        <ProductModal product={productForModal} onClose={()=>setModalSlug(null)} />
      )}

      {/* Виджет примерки */}
      <TryOnWidget
        isOpen={tryOnOpen}
        onClose={() => setTryOnOpen(false)}
        garmentImageUrl={tryOnGarment}
      />
    </>
  )
}

function PDP(){
  const { slug } = useParams()
  const navigate = useNavigate()
  const product = PRODUCTS.find(p => p.slug === slug)

  // состояние виджета только для PDP
  const [tryOnOpen, setTryOnOpen] = useState(false)
  const [tryOnGarment, setTryOnGarment] = useState('')

  if (!product) return <div className="container" style={{padding:24}}>Товар не найден</div>

  return (
    <>
      <ProductModal
        product={product}
        onClose={()=>navigate(-1)}
        onTryOn={(imgUrl) => {           // ← вот этот колбэк
          setTryOnGarment(imgUrl)
          setTryOnOpen(true)
        }}
      />

      <TryOnWidget
        isOpen={tryOnOpen}
        onClose={() => setTryOnOpen(false)}
        garmentImageUrl={tryOnGarment}
      />
    </>
  )
}

export default function App(){
  return (
    <CartProvider>
      <Header />
      <Routes>
        <Route path="/" element={<Catalog/>} />
        <Route path="/p/:slug" element={<PDP/>} />
      </Routes>
      <CartDrawer />
      <footer className="footer">
        <div className="container footer__inner">
          <div>© 2025 CloseIt Demo</div>
          <div className="muted">Доставка по РФ • Возврат 14 дней</div>
        </div>
      </footer>
    </CartProvider>
  )
}
