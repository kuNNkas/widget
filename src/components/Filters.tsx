import React from 'react'

type Props = {
  selectedSize: string | null
  setSelectedSize: (v: string | null) => void
  selectedColor: string | null
  setSelectedColor: (v: string | null) => void
  maxPrice: number
  setMaxPrice: (v: number) => void
}

export default function Filters({selectedSize, setSelectedSize, selectedColor, setSelectedColor, maxPrice, setMaxPrice}: Props){
  return (
    <aside className="filters">
      <div className="filters__section">
        <div className="filters__title">Размер</div>
        <div className="chips">
          {['XS','S','M','L','XL'].map(s => (
            <button key={s} className={['chip', selectedSize===s ? 'is-active' : ''].join(' ')} onClick={()=>setSelectedSize(selectedSize===s? null : s)}>{s}</button>
          ))}
        </div>
      </div>
      <div className="filters__section">
        <div className="filters__title">Цвет</div>
        <div className="swatches">
          {[['white','#ffffff'],['black','#111111'],['red','#c62828'],['blue','#1565c0'],['green','#2e7d32']].map(([name, code]) => (
            <button key={name} title={name} style={{background: String(code)}} className={['swatch', selectedColor===name? 'is-active' : ''].join(' ')} onClick={()=>setSelectedColor(selectedColor===name? null : String(name))}/>
          ))}
        </div>
      </div>
      <div className="filters__section">
        <div className="filters__title">Цена</div>
        <input type="range" min={1990} max={9990} step={100} value={maxPrice} onChange={e=>setMaxPrice(parseInt(e.target.value))} />
        <div className="muted">до <strong>{maxPrice.toLocaleString('ru-RU')} ₽</strong></div>
      </div>
    </aside>
  )
}
