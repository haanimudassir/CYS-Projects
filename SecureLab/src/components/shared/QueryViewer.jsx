import React from 'react';

export default function QueryViewer({ text, cls = '', className = '' }) {
  return (
    <div className={`query-viewer ${cls} ${className}`} style={{ whiteSpace: 'pre-wrap' }}>
      {text}
    </div>
  );
}
