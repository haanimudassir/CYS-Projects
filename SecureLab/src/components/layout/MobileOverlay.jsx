import React from 'react';
import { useApp } from '../../context/AppContext.jsx';

export default function MobileOverlay() {
  const { mobileNavOpen, closeMobileNav } = useApp();
  return (
    <div
      className={`mobile-overlay${mobileNavOpen ? ' open' : ''}`}
      onClick={closeMobileNav}
    ></div>
  );
}
