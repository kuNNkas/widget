import React from 'react'
import { useCart } from '../context/CartContext'

export default function CartDrawer(){
  const { items, remove, setQty, total, open, setOpen } = useCart()
  return (<>
    <aside className={open ? 'cart is-open' : 'cart'}>
      <div className="cart__header">
        <div className="cart__title">Корзина</div>
        <button className="icon-btn" onClick={()=>setOpen(false)}>×</button>
      </div>
      <div className="cart__items">
        {items.length===0 && <div className="muted">Ваша корзина пуста</div>}
        {items.map(it => (
          <div key={it.slug+it.size+it.color} className="cart__item">
            <img src={it.image} alt={it.title}/>
            <div>
              <div><strong>{it.title}</strong></div>
              <div className="muted" style={{fontSize:12}}>{it.color} • {it.size}</div>
              <div className="cart__row">
                <div>
                  <input type="number" min={1} max={10} value={it.qty}
                    onChange={e=>setQty(it.slug, it.size, it.color, Math.max(1, parseInt(e.target.value)||1))}
                    style={{width:64,padding:'6px 8px',border:'1px solid #e5e7eb',borderRadius:8}}/>
                </div>
                <div><strong>{(it.price*it.qty).toLocaleString('ru-RU')} ₽</strong></div>
              </div>
            </div>
            <button className="icon-btn" onClick={()=>remove(it.slug, it.size, it.color)}>×</button>
          </div>
        ))}
      </div>
      <div className="cart__footer">
        <div className="cart__row"><span>Товары</span><strong>{total.toLocaleString('ru-RU')} ₽</strong></div>
        <div className="cart__row"><span>Доставка</span><span className="muted">Бесплатно</span></div>
        <div className="cart__divider"></div>
        <div className="cart__row"><span><strong>Итого</strong></span><strong>{total.toLocaleString('ru-RU')} ₽</strong></div>
        <button className="btn btn--full" onClick={()=>alert('Демо: оформление заказа')}>Оформить заказ</button>
      </div>
    </aside>
    <div className={open ? 'backdrop is-open' : 'backdrop'} onClick={()=>setOpen(false)} />
  </>)
}
