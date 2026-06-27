// hooks/useKeyboardShortcuts.js
// Global keyboard shortcut system for Anonimbuz

import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Registers global keyboard shortcuts for the app.
 * @param {Object} options
 * @param {Function} options.onOpenComposer - Opens the post composer
 * @param {Function} options.onToggleTheme - Toggles dark/light theme
 * @param {Function} options.onShowShortcuts - Shows keyboard shortcuts help
 * @param {boolean} options.isLoggedIn - Whether user is logged in
 */
export function useKeyboardShortcuts({
  onOpenComposer,
  onToggleTheme,
  onShowShortcuts,
  isLoggedIn,
}) {
  const navigate = useNavigate();

  const handleKeyDown = useCallback((e) => {
    // Skip if user is typing in an input/textarea/contenteditable
    const tag = e.target.tagName;
    const isEditing =
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      tag === 'SELECT' ||
      e.target.isContentEditable;

    if (isEditing) return;

    // Skip if modifier keys are involved (except Shift for some)
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    switch (e.key) {
      // N  → New post (composer)
      case 'n':
      case 'N':
        if (isLoggedIn && onOpenComposer) {
          e.preventDefault();
          onOpenComposer();
        }
        break;

      // G + H → Go Home
      case 'h':
      case 'H':
        e.preventDefault();
        navigate('/');
        break;

      // G + E → Go Explore
      case 'e':
      case 'E':
        e.preventDefault();
        navigate('/explore');
        break;

      // G + N → Go Notifications
      case 'g':
        // We use double-key patterns via sequential press tracking
        // handled separately below if needed
        break;

      // B → Go Bookmarks
      case 'b':
      case 'B':
        if (isLoggedIn) {
          e.preventDefault();
          navigate('/bookmarks');
        }
        break;

      // P → Go Profile
      case 'p':
      case 'P':
        if (isLoggedIn) {
          e.preventDefault();
          navigate('/notifications');
        }
        break;

      // T → Toggle theme
      case 't':
      case 'T':
        e.preventDefault();
        if (onToggleTheme) onToggleTheme();
        break;

      // ? → Show keyboard shortcuts
      case '?':
        e.preventDefault();
        if (onShowShortcuts) onShowShortcuts();
        break;

      // Escape is handled per-component; no global handler needed
      default:
        break;
    }
  }, [navigate, onOpenComposer, onToggleTheme, onShowShortcuts, isLoggedIn]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Exported shortcut definitions for the help modal
export const KEYBOARD_SHORTCUTS = [
  { keys: ['N'], description: 'Buat postingan baru', requiresAuth: true },
  { keys: ['H'], description: 'Ke Beranda' },
  { keys: ['E'], description: 'Ke Jelajah' },
  { keys: ['B'], description: 'Ke Bookmark', requiresAuth: true },
  { keys: ['P'], description: 'Ke Notifikasi', requiresAuth: true },
  { keys: ['T'], description: 'Toggle tema gelap/terang' },
  { keys: ['?'], description: 'Tampilkan pintasan keyboard ini' },
];
