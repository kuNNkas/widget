import React, { useMemo, useState } from 'react'
import type { Product } from '../data/products'
import classNames from 'classnames'
import { useCart } from '../context/CartContext'

type Props = {
  product: Product
  onClose: () => void
  onTryOn?: (imageUrl: string) => void   // ⬅ добавили проп
}

export default function ProductModal({ product, onClose, onTryOn }: Props){
  const [colorIdx, setColorIdx] = useState(0)
  const [size, setSize] = useState(product.variants[0]?.sizes[0] || 'M')
  const [qty, setQty] = useState(1)
  const variant = useMemo(()=> product.variants[colorIdx], [colorIdx, product])
  const { add } = useCart()

  return (
    <dialog open className="modal" onClose={onClose}>
      <div className="modal__content">
        <button className="modal__close" onClick={onClose}>×</button>

        <div className="modal__body">
          <div className="modal__gallery">
            <img
              src={variant.images[0]}
              alt={product.title}
              style={{maxWidth:'90%',maxHeight:'90%',objectFit:'contain'}}
            />
          </div>

          <div className="modal__info">
            <div className="muted" style={{fontSize:12}}>{product.brand}</div>
            <h3>{product.title}</h3>

            <div className="row">
              <div>
                <span className="price">{product.price.toLocaleString('ru-RU')} ₽</span>
                {product.oldPrice && <span className="old">{product.oldPrice.toLocaleString('ru-RU')} ₽</span>}
              </div>
              <div className="rating">★ {product.rating.toFixed(1)} <span className="muted">({product.reviews})</span></div>
            </div>

            <p className="muted">{product.description}</p>

            <div className="filters__title">Цвет</div>
            <div className="swatches">
              {product.variants.map((v, i)=>(
                <button key={i}
                  className={classNames('swatch', i===colorIdx && 'is-active')}
                  title={v.color.name}
                  style={{background:v.color.code}}
                  onClick={()=>setColorIdx(i)}
                />
              ))}
            </div>

            <div className="filters__title" style={{marginTop:10}}>Размер</div>
            <div className="options">
              {variant.sizes.map(s=>(
                <button key={s}
                  className={classNames('option', s===size && 'is-active')}
                  onClick={()=>setSize(s)}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Кнопки действий */}
            <div className="row" style={{marginTop:10, gap:10}}>
              {/* ⬇⬇⬇ КНОПКА ПРИМЕРИТЬ */}
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => onTryOn?.(variant.images[0])}
              >
                Примерить
              </button>

              <label className="muted" style={{marginLeft:8}}>Кол-во</label>
              <input
                type="number" min={1} max={10} value={qty}
                onChange={e=>setQty(parseInt(e.target.value)||1)}
                style={{width:72,padding:'8px 10px',border:'1px solid #e5e7eb',borderRadius:10}}
              />

              <div style={{flex:1}} />

              <button
                type="button"
                className="btn"
                onClick={()=>{
                  add({
                    id: product.id,
                    title: product.title,
                    slug: product.slug,
                    price: product.price,
                    image: variant.images[0],
                    size, color: variant.color.name, qty
                  })
                  onClose()
                }}
              >
                В корзину
              </button>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  )
}
