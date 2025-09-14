import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingHeader() {
  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <header className="bw-nav">
      <div className="bw-container bw-nav__inner">
        {/* ТЕКСТОВЫЙ ЛОГОТИП */}
        <Link to="/" className="ci-logo" aria-label="Close it">Close it</Link>

        <nav className="bw-nav__links">
          <a href="#how" onClick={go('how')}>Как это работает</a>
          <a href="#benefits" onClick={go('benefits')}>Преимущества</a>
          <Link to="/demo">Демо</Link>
        </nav>

        <div className="bw-nav__cta">
          <Link className="btn btn--ghost btn--pill" to="/demo">Попробовать</Link>
        </div>
      </div>
    </header>
  );
}
