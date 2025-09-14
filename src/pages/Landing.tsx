import React from 'react';
import { Link } from 'react-router-dom';
import LandingHeader from '../components/LandingHeader';

export default function Landing() {
  // --- ПУТИ К КАРТИНКАМ ИЗ public/ ---
  const beforeImg = '/model_1/portret-molodoi-aponskoi-zensiny-s-kurtkoi.jpg';
  // ЗАМЕНИ на реальные имена трёх картинок в /public/result_1
  const afterImgs = [
    '/public/result_1/jacket_white.jpg',
    '/public/result_1/jacket.jpg',
    '/public/result_1/jeans.jpg',
  ];

  const howModel  = '/model_2/photo_2025-06-20_10-03-35.jpg';
  const howCloth  = '/clothes_2/photo_2025-06-20_09-08-23.jpg';
  const howResult = '/result_2/photo_2025-06-20_10-13-35.jpg';

  return (
    <>
      <LandingHeader />

      {/* HERO */}
      <section className="bw-hero">
        <div className="bw-container hero-grid">
          <div className="hero-left">
            <h1 className="ci-title">
              <span className="ci-brand">Close it</span> — твой умный
              <br/>гардероб и виртуальная примерка
            </h1>
            <p className="bw-hero__lead">
              Узнай, как вещь из любого магазина сядет на тебя, <strong>ещё до покупки</strong>.
              Создавай идеальные образы из того, что уже есть. Всё — в твоём
              мессенджере и на сайте.
            </p>

            <div className="bw-hero__cta">
              <Link className="btn btn--pill btn--xl" to="/demo">Попробовать бесплатно</Link>
              <span className="muted">Даём 3 примерки бесплатно</span>
            </div>
          </div>

          {/* PR / До/После (3:4) */}
          <div className="hero-right">
            <div className="ba-grid">
              <div className="ba-card">
                <div className="ba-badge">До</div>
                <div className="ratio ratio-3-4">
                  <img src={beforeImg} alt="До" />
                </div>
              </div>

              {afterImgs.map((src, i) => (
                <div className="ba-card" key={i}>
                  <div className="ba-badge ba-badge--after">После</div>
                  <div className="ratio ratio-3-4">
                    <img src={src} alt={`После ${i+1}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ПРЕИМУЩЕСТВА КОМАНДЫ/ПРОДУКТА */}
      <section className="bw-section" id="benefits">
        <div className="bw-container">
          <h2 className="bw-h2">Почему Close it</h2>
          <div className="bw-grid bw-grid--3">
            <div className="bw-card">
              <h3>Виртуальная примерочная</h3>
              <p className="muted">Работает с любыми магазинами и маркетплейсами. Меньше возвратов — выше уверенность.</p>
            </div>
            <div className="bw-card">
              <h3>Цифровой гардероб</h3>
              <p className="muted">Сохраняй удачные примерки и добавляй свои вещи — всё в одном месте.</p>
            </div>
            <div className="bw-card">
              <h3>Готовые образы</h3>
              <p className="muted">AI-стилист подскажет идеи на каждый день: офис, свидание, прогулка.</p>
            </div>
          </div>
        </div>
      </section>

      {/* КАК ЭТО РАБОТАЕТ */}
      <section className="bw-section" id="how">
        <div className="bw-container">
          <h2 className="bw-h2">Как это работает?</h2>

          <div className="how-grid">
            <div className="how-card">
              <div className="how-step">01</div>
              <h3>Загрузи своё фото</h3>
              <div className="how-img ratio ratio-3-4">
                <img src={howModel} alt="Фото пользователя" />
              </div>
              <p className="muted">Полный или половинный рост — это твой цифровой манекен.</p>
            </div>

            <div className="how-card">
              <div className="how-step">02</div>
              <h3>Добавь одежду</h3>
              <div className="how-img ratio ratio-3-4">
                <img src={howCloth} alt="Фото одежды" />
              </div>
              <p className="muted">Скрин из магазина или фото вещи. Подойдут JPG/PNG.</p>
            </div>

            <div className="how-card">
              <div className="how-step">03</div>
              <h3>Получи результат</h3>
              <div className="how-img ratio ratio-3-4">
                <img src={howResult} alt="Результат примерки" />
              </div>
              <p className="muted">AI-стилист сгенерирует примерку за 1–3 минуты. Скачай и делись.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bw-section">
        <div className="bw-container cta">
          <h3>Готов попробовать в деле?</h3>
          <Link className="btn btn--pill btn--xl" to="/demo">Открыть демо-примерку</Link>
        </div>
      </section>

      <footer className="bw-footer">
        <div className="bw-container bw-footer__inner">
          <div>© 2025 Close it</div>
          <div className="muted">React · Vite · FASHN API</div>
        </div>
      </footer>
    </>
  );
}
