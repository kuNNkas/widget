import React, { useState } from 'react';
import TryOnWidget from '../components/TryOnWidget';
import LandingHeader from '../components/LandingHeader';

export default function Demo() {
  const garment = '/garments/women-dress.png'; // можно заменить на любую картинку товара
  const [open, setOpen] = useState(false);

  return (
    <>
      <LandingHeader />
      <section className="bw-section">
        <div className="bw-container">
          <h1 className="bw-h2" style={{marginBottom: 8}}>Демонстрация виджета</h1>
          <p className="muted" style={{marginBottom: 24}}>Нажмите «Онлайн-примерка», загрузите своё фото и дождитесь результата.</p>

          <div className="demo">
            <div className="demo__left">
              <div className="demo__image">
                <img src={garment} alt="Товар" />
              </div>
            </div>
            <div className="demo__right">
              <div className="demo__brand">CLOSE IT</div>
              <h3 className="demo__title">Платье-миди из хлопка</h3>
              <div className="demo__price">5&nbsp;990 ₽</div>
              <div className="demo__spec">
                100% хлопок<br/>Силуэт — слегка свободный<br/>Пояс помогает подчеркнуть талию
              </div>
              <button className="btn btn--xl" onClick={()=>setOpen(true)}>Онлайн-примерка</button>
            </div>
          </div>

          <TryOnWidget
            isOpen={open}
            onClose={()=>setOpen(false)}
            garmentImageUrl={garment}
          />
        </div>
      </section>
    </>
  );
}
