// components/KeyboardShortcutsModal.jsx
import React, { useEffect } from 'react';
import { KEYBOARD_SHORTCUTS } from '../hooks/useKeyboardShortcuts.js';

export default function KeyboardShortcutsModal({ onClose }) {
  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="fullscreen-modal" onClick={onClose}>
      <div
        className="modal-content shortcuts-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 480 }}
      >
        <div className="modal-header">
          <span className="modal-header-title">⌨️ Pintasan Keyboard</span>
          <button className="modal-close-btn" onClick={onClose}>
            Tutup
          </button>
        </div>

        <div className="modal-body" style={{ padding: '20px 24px' }}>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
            Pintasan ini aktif saat kamu <strong>tidak</strong> sedang mengetik di kolom input.
          </p>

          <div className="shortcuts-list">
            {KEYBOARD_SHORTCUTS.map((shortcut) => (
              <div key={shortcut.keys.join('+')} className="shortcut-row">
                <div className="shortcut-keys">
                  {shortcut.keys.map((key) => (
                    <kbd key={key} className="shortcut-key">{key}</kbd>
                  ))}
                </div>
                <span className="shortcut-desc">
                  {shortcut.description}
                  {shortcut.requiresAuth && (
                    <span className="shortcut-auth-tag">Login diperlukan</span>
                  )}
                </span>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
            fontSize: '13px',
            textAlign: 'center'
          }}>
            Tekan <kbd className="shortcut-key" style={{ margin: '0 4px' }}>?</kbd> kapan saja untuk membuka panel ini
          </div>
        </div>
      </div>
    </div>
  );
}
