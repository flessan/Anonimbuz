import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import anonLogo from './assets/images/anon.svg';
import { ComposerModal } from './components/Composer.jsx';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal.jsx';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js';
import {
  IconHome,
  IconSearch,
  IconNotification,
  IconProfile,
  IconTheme,
  IconBack,
  IconShield,
  IconCreate,
  IconBookmark,
  IconSettings,
  IconInfo
} from './components/Icons.jsx';
import BackToTop from './components/BackToTop.jsx';
import TrendingSidebar from './components/TrendingSidebar.jsx';

// Lazy load pages for code splitting
const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const Feed = lazy(() => import('./pages/Feed.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const PostDetail = lazy(() => import('./pages/PostDetail.jsx'));
const TagPage = lazy(() => import('./pages/TagPage.jsx'));
const Explore = lazy(() => import('./pages/Explore.jsx'));
const Notifications = lazy(() => import('./pages/Notifications.jsx'));
const AdminPanel = lazy(() => import('./pages/AdminPanel.jsx'));
const FollowList = lazy(() => import('./pages/FollowList.jsx'));
const Bookmarks = lazy(() => import('./pages/Bookmarks.jsx'));
const BlockedUsers = lazy(() => import('./pages/BlockedUsers.jsx'));
const About = lazy(() => import('./pages/About.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const EmbedPost = lazy(() => import('./pages/EmbedPost.jsx'));

// Accent color presets
const ACCENT_PRESETS = [
  { name: 'Indigo', dark: '#818cf8', light: '#4f46e5', darkHover: '#a5b4fc', lightHover: '#4338ca', darkSoft: 'rgba(129,140,248,0.12)', lightSoft: 'rgba(79,70,229,0.08)' },
  { name: 'Violet', dark: '#a78bfa', light: '#7c3aed', darkHover: '#c4b5fd', lightHover: '#6d28d9', darkSoft: 'rgba(167,139,250,0.12)', lightSoft: 'rgba(124,58,237,0.08)' },
  { name: 'Rose', dark: '#fb7185', light: '#e11d48', darkHover: '#fda4af', lightHover: '#be123c', darkSoft: 'rgba(251,113,133,0.12)', lightSoft: 'rgba(225,29,72,0.08)' },
  { name: 'Cyan', dark: '#22d3ee', light: '#0891b2', darkHover: '#67e8f9', lightHover: '#0e7490', darkSoft: 'rgba(34,211,238,0.12)', lightSoft: 'rgba(8,145,178,0.08)' },
  { name: 'Emerald', dark: '#34d399', light: '#059669', darkHover: '#6ee7b7', lightHover: '#047857', darkSoft: 'rgba(52,211,153,0.12)', lightSoft: 'rgba(5,150,105,0.08)' },
  { name: 'Amber', dark: '#fbbf24', light: '#d97706', darkHover: '#fcd34d', lightHover: '#b45309', darkSoft: 'rgba(251,191,36,0.12)', lightSoft: 'rgba(217,119,6,0.08)' },
];

function applyAccentColor(preset, theme) {
  const root = document.documentElement;
  const isDark = theme === 'dark';
  root.style.setProperty('--color-accent', isDark ? preset.dark : preset.light);
  root.style.setProperty('--color-accent-hover', isDark ? preset.darkHover : preset.lightHover);
  root.style.setProperty('--color-accent-soft', isDark ? preset.darkSoft : preset.lightSoft);
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center">Memuat...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { user, logout, unreadCount } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Settings dropdown state
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const settingsRef = useRef(null); // ➕ tambahkan useRef di import

  // Theme management
  const [theme, setTheme] = useState(() => localStorage.getItem('anomia_theme') || 'dark');
  const [accentIndex, setAccentIndex] = useState(() => {
    const saved = localStorage.getItem('anomia_accent_index');
    return saved !== null ? parseInt(saved, 10) : 0;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('anomia_theme', theme);
    // Re-apply accent when theme changes
    applyAccentColor(ACCENT_PRESETS[accentIndex] || ACCENT_PRESETS[0], theme);
  }, [theme, accentIndex]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setAccent = (idx) => {
    setAccentIndex(idx);
    localStorage.setItem('anomia_accent_index', idx);
    applyAccentColor(ACCENT_PRESETS[idx], theme);
  };

  // PWA install prompt
  const [pwaInstallEvent, setPwaInstallEvent] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setPwaInstallEvent(e);
      const dismissed = sessionStorage.getItem('pwa_banner_dismissed');
      if (!dismissed) setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPWA = async () => {
    if (!pwaInstallEvent) return;
    pwaInstallEvent.prompt();
    const { outcome } = await pwaInstallEvent.userChoice;
    if (outcome === 'accepted') setShowInstallBanner(false);
  };

  const dismissInstallBanner = () => {
    setShowInstallBanner(false);
    sessionStorage.setItem('pwa_banner_dismissed', '1');
  };

  // Keyboard shortcuts modal
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Register global keyboard shortcuts
  useKeyboardShortcuts({
    onOpenComposer: handleOpenComposerEarly,
    onToggleTheme: toggleTheme,
    onShowShortcuts: () => setShowShortcutsModal(true),
    isLoggedIn: !!user,
  });

  // Global composer modal state
  const [isComposerOpen, setComposerOpen] = useState(false);
  const [composerInitialContent, setComposerInitialContent] = useState('');

  // Declared early so keyboard shortcut hook can reference it
  function handleOpenComposerEarly() {
    if (!user) {
      navigate('/login');
    } else {
      setComposerOpen(true);
    }
  }

  useEffect(() => {
    const handleOpen = (e) => {
      if (!user) {
        navigate('/login');
        return;
      }
      setComposerInitialContent(e?.detail?.initialContent || '');
      setComposerOpen(true);
    };
    window.addEventListener('open-composer-modal', handleOpen);
    return () => {
      window.removeEventListener('open-composer-modal', handleOpen);
    };
  }, [user]);

  // Handle ?compose=true from PWA shortcut
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('compose') === 'true' && user) {
      setComposerOpen(true);
      window.history.replaceState({}, '', '/');
    }
  }, [user]);

  // Check if we are on a detail/sub-page to show back button
  const isSubPage = !['/', '/explore', '/notifications', '/admin'].includes(location.pathname);

  // Helper to open composer (requires login)
  const handleOpenComposer = () => {
    if (!user) {
      navigate('/login');
    } else {
      setComposerOpen(true);
    }
  };

  return (
    <div className="app-layout">
      {/* Sticky Top Bar */}
      <header className="top-bar">
        {isSubPage ? (
          <button className="top-bar-action" onClick={() => navigate(-1)} title="Kembali">
            <IconBack />
          </button>
        ) : (
          <div style={{ width: 36 }}></div> // Spacer to keep logo centered
        )}

        {/* GANTI BAGIAN INI */}
        <Link
          to="/"
          className="top-bar-center"
          style={{
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '18px',
            fontWeight: '700',
            color: 'var(--color-text-primary)'
            // HAPUS semua background, border, shadow, padding yang berlebihan
          }}
        >
          <img
            src={anonLogo}
            alt="Anonimbuz"
            style={{
              width: 28,
              height: 28,
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
            }}
          />
          <span>Anonimbuz</span>
        </Link>

        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button className="top-bar-action" onClick={toggleTheme} title="Ganti Tema">
            <IconTheme dark={theme === 'dark'} />
          </button>
          {user && (
            <button className="top-bar-action mobile-only" onClick={() => { navigator.vibrate?.(15); navigate('/settings'); }} title="Pengaturan">
              <IconSettings />
            </button>
          )}
        </div>
      </header>

      <div className="app-body">
        {/* Left Sidebar (Desktop Only) */}
        <aside className="sidebar">
          <Link to="/" className={`sidebar-link ${location.pathname === '/' ? 'active' : ''}`}>
            <IconHome filled={location.pathname === '/'} />
            <span>Beranda</span>
          </Link>

          <Link to="/explore" className={`sidebar-link ${location.pathname === '/explore' ? 'active' : ''}`}>
            <IconSearch filled={location.pathname === '/explore'} />
            <span>Jelajah</span>
          </Link>

          <Link to="/about" className={`sidebar-link ${location.pathname === '/about' ? 'active' : ''}`}>
            <IconInfo filled={location.pathname === '/about'} />
            <span>Tentang</span>
          </Link>

          {user && (
            <>
              <Link to="/notifications" className={`sidebar-link ${location.pathname === '/notifications' ? 'active' : ''}`} style={{ position: 'relative' }}>
                <IconNotification filled={location.pathname === '/notifications'} />
                <span>Notifikasi</span>
                {unreadCount > 0 && (
                  <span className="bottom-nav-badge" style={{ right: 16, top: 12 }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>

              <Link to="/bookmarks" className={`sidebar-link ${location.pathname === '/bookmarks' ? 'active' : ''}`}>
                <IconBookmark filled={location.pathname === '/bookmarks'} />
                <span>Bookmark</span>
              </Link>

              <Link to={`/u/${user.username}`} className={`sidebar-link ${location.pathname.startsWith('/u/') ? 'active' : ''}`}>
                <IconProfile filled={location.pathname.startsWith('/u/')} />
                <span>Profil</span>
              </Link>

              <Link to="/settings" className={`sidebar-link ${location.pathname === '/settings' ? 'active' : ''}`}>
                <IconSettings />
                <span>Pengaturan</span>
              </Link>

              {user.role === 'dev' && (
                <Link to="/admin" className={`sidebar-link ${location.pathname === '/admin' ? 'active' : ''}`}>
                  <IconShield />
                  <span>Admin Panel</span>
                </Link>
              )}

              <button className="sidebar-create-btn" onClick={handleOpenComposer}>
                <span>Buat Post</span>
              </button>

              <button
                className="profile-btn"
                style={{ marginTop: 'auto', width: '100%', background: 'transparent', borderColor: 'var(--color-border)' }}
                onClick={() => { logout(); navigate('/login'); }}
              >
                Keluar
              </button>
            </>
          )}

          {!user && (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link to="/login" className="profile-btn primary" style={{ textAlign: 'center', display: 'block' }}>Masuk</Link>
              <Link to="/register" className="profile-btn" style={{ textAlign: 'center', display: 'block' }}>Daftar</Link>
            </div>
          )}
        </aside>

        {/* Main Content Area */}
        <main className="container">
          <Suspense fallback={<div className="center">Memuat...</div>}>
            <Routes>
              <Route path="/" element={<RequireAuth><Feed /></RequireAuth>} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/u/:username" element={<Profile />} />
              <Route path="/u/:username/followers" element={<FollowList type="followers" />} />
              <Route path="/u/:username/following" element={<FollowList type="following" />} />
              <Route path="/p/:id" element={<PostDetail />} />
              <Route path="/tag/:slug" element={<TagPage />} />
              <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
              <Route path="/admin" element={<RequireAuth><AdminPanel /></RequireAuth>} />
              <Route path="/bookmarks" element={<RequireAuth><Bookmarks /></RequireAuth>} />
              <Route path="/settings/blocked" element={<RequireAuth><BlockedUsers /></RequireAuth>} />
              <Route path="/about" element={<About />} />
              <Route path="/settings" element={<RequireAuth><Settings theme={theme} toggleTheme={toggleTheme} accentIndex={accentIndex} setAccent={setAccent} presets={ACCENT_PRESETS} onOpenShortcuts={() => setShowShortcutsModal(true)} /></RequireAuth>} />
              <Route path="/embed/:id" element={<EmbedPost />} />
              <Route path="*" element={<div className="center">404 - Halaman Tidak Ditemukan</div>} />
            </Routes>
          </Suspense>
        </main>

        {/* Trending Sidebar (hidden on narrow screens via CSS) */}
        <div className="trending-sidebar-wrap">
          <TrendingSidebar />
        </div>
      </div>

      {/* Back to Top */}
      <BackToTop />

      {/* Bottom Navigation Bar (Mobile Only) */}
      <nav className="bottom-nav mobile-only">
        <Link to="/" className={`bottom-nav-item ${location.pathname === '/' ? 'active' : ''}`} onClick={() => navigator.vibrate?.(15)}>
          <IconHome filled={location.pathname === '/'} />
          <span className="bottom-nav-label">Beranda</span>
        </Link>

        <Link to="/explore" className={`bottom-nav-item ${location.pathname === '/explore' ? 'active' : ''}`} onClick={() => navigator.vibrate?.(15)}>
          <IconSearch filled={location.pathname === '/explore'} />
          <span className="bottom-nav-label">Jelajah</span>
        </Link>

        <button className="bottom-nav-fab" onClick={() => { navigator.vibrate?.(15); handleOpenComposer(); }} title="Buat Post">
          <IconCreate filled={true} size={24} />
        </button>

        {/* HAPUS BOOKMARK DARI SINI */}

        <Link to="/notifications" className={`bottom-nav-item ${location.pathname === '/notifications' ? 'active' : ''}`} onClick={() => navigator.vibrate?.(15)}>
          <IconNotification filled={location.pathname === '/notifications'} />
          {unreadCount > 0 && (
            <span className="bottom-nav-badge">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          <span className="bottom-nav-label">Notifikasi</span>
        </Link>

        <Link to={user ? `/u/${user.username}` : '/login'} className={`bottom-nav-item ${location.pathname.startsWith('/u/') || location.pathname === '/login' ? 'active' : ''}`} onClick={() => navigator.vibrate?.(15)}>
          <IconProfile filled={location.pathname.startsWith('/u/') || location.pathname === '/login'} />
          <span className="bottom-nav-label">Profil</span>
        </Link>
      </nav>

      {/* Global Fullscreen Composer Modal */}
      {user && (
        <ComposerModal
          isOpen={isComposerOpen}
          initialContent={composerInitialContent}
          onClose={() => setComposerOpen(false)}
        />
      )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcutsModal && (
        <KeyboardShortcutsModal onClose={() => setShowShortcutsModal(false)} />
      )}

      {/* PWA Install Banner */}
      {showInstallBanner && (
        <div className="pwa-install-banner">
          <div className="pwa-install-content">
            <span className="pwa-install-icon">📱</span>
            <div className="pwa-install-text">
              <strong>Pasang Anonimbuz</strong>
              <span>Buka lebih cepat, tanpa browser!</span>
            </div>
          </div>
          <div className="pwa-install-actions">
            <button className="pwa-install-btn" onClick={handleInstallPWA}>Pasang</button>
            <button className="pwa-dismiss-btn" onClick={dismissInstallBanner}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
