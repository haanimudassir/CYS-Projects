import React from 'react';

export default function Terminal({ title, text, cls, className = '' }) {
  return (
    <div className={`terminal ${className}`}>
      <div className="terminal-bar">
        <div className="terminal-dot t-red"></div>
        <div className="terminal-dot t-amber"></div>
        <div className="terminal-dot t-green"></div>
        <span className="terminal-title">{title}</span>
      </div>
      <div className={`terminal-body t-${cls || 'neutral'}`} style={{ whiteSpace: 'pre-wrap' }}>
        {text}
      </div>
    </div>
  );
}
