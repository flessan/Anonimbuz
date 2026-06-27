import React, { useState } from 'react';

export default function LazyImage({ src, alt, className = '', style = {} }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div style={{
      position: 'relative',
      overflow: 'hidden',
      background: 'var(--color-surface-2)',
      borderRadius: style.borderRadius || 'inherit',
      width: style.width || '100%',
      height: style.height || '100%',
      ...style
    }}>
      {/* Blur-up placeholder overlay */}
      {!loaded && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          color: 'var(--color-text-secondary)'
        }}>
          Memuat gambar...
        </div>
      )}
      
      {/* Real image */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={className}
        style={{
          width: '100%',
          height: '100%',
          objectFit: style.objectFit || 'cover',
          display: 'block',
          filter: loaded ? 'none' : 'blur(20px)',
          transition: 'filter 0.4s ease-out',
          opacity: loaded ? 1 : 0.3
        }}
      />
    </div>
  );
}
