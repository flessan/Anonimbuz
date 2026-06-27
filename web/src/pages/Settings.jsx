import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function Settings({ theme, toggleTheme, accentIndex, setAccent, presets, onOpenShortcuts }) {
  const [exporting, setExporting] = useState(false);
  const [exportErr, setExportErr] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState('');
  const [activeSection, setActiveSection] = useState(null);

  const toggleSection = (section) => {
    setActiveSection(prev => prev === section ? null : section);
  };

  const handleExportData = async () => {
    setExporting(true);
    setExportErr('');
    try {
      const res = await api.get('/users/me/export');
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data.data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `anonimbuz_data_export_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error(err);
      setExportErr(err.response?.data?.error || 'Gagal mengunduh ekspor data.');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('PERINGATAN: Apakah Anda yakin ingin menghapus akun secara permanen? Semua data postingan, komentar, dan pengaturan akan dihapus dan tidak dapat dikembalikan.')) return;
    
    setDeleting(true);
    setDeleteErr('');
    try {
      await api.delete('/users/me');
      localStorage.removeItem('token');
      window.location.href = '/';
    } catch (err) {
      console.error(err);
      setDeleteErr(err.response?.data?.error || 'Gagal menghapus akun.');
      setDeleting(false);
    }
  };

  const AccordionItem = ({ id, title, subtitle, children, isDanger = false }) => (
    <div style={{ borderBottom: '1px solid var(--color-border)' }}>
      <button 
        onClick={() => toggleSection(id)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left'
        }}
      >
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: isDanger ? 'var(--color-danger)' : 'var(--color-text-primary)' }}>{title}</h3>
          {subtitle && <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>{subtitle}</p>}
        </div>
        <span style={{ 
          transform: activeSection === id ? 'rotate(180deg)' : 'rotate(0deg)', 
          transition: 'transform 0.3s ease',
          color: 'var(--color-text-secondary)',
          fontSize: '20px'
        }}>
          ▼
        </span>
      </button>
      <div style={{
        maxHeight: activeSection === id ? '500px' : '0',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: activeSection === id ? 1 : 0
      }}>
        <div style={{ padding: '0 0 20px 0' }}>
          {children}
        </div>
      </div>
    </div>
  );

  return (
    <div className="card settings-container" style={{ padding: '24px' }}>
      <div style={{ paddingBottom: '16px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--color-text-primary)' }}>Pengaturan</h2>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Sesuaikan preferensi aplikasi Anda</p>
      </div>

      <AccordionItem id="theme" title="Tema Tampilan" subtitle={`Saat ini: ${theme === 'dark' ? 'Gelap 🌙' : 'Terang ☀️'}`}>
        <button className="profile-btn" onClick={toggleTheme} style={{ minWidth: '120px' }}>
          Ubah ke {theme === 'dark' ? 'Terang' : 'Gelap'}
        </button>
      </AccordionItem>

      <AccordionItem id="accent" title="Warna Aksen" subtitle="Pilih warna aksen kustom">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {presets.map((preset, idx) => (
            <button
              key={preset.name}
              className={`accent-swatch ${accentIndex === idx ? 'active' : ''}`}
              style={{
                background: preset.dark,
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: accentIndex === idx ? '3px solid #ffffff' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: accentIndex === idx ? `0 0 12px ${preset.dark}` : 'none'
              }}
              onClick={() => setAccent(idx)}
              title={preset.name}
            />
          ))}
        </div>
      </AccordionItem>

      <AccordionItem id="shortcuts" title="Pintasan Keyboard" subtitle="Navigasi dengan cepat menggunakan keyboard">
        <button className="profile-btn" onClick={onOpenShortcuts} style={{ minWidth: '120px' }}>
          Buka Pintasan
        </button>
      </AccordionItem>

      <AccordionItem id="privacy" title="Privasi & Informasi" subtitle="Pengaturan privasi dan daftar blokir">
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link to="/settings/blocked" className="profile-btn" style={{ textDecoration: 'none', color: 'inherit', display: 'inline-flex', alignItems: 'center' }}>
            🚫 Daftar Blokir
          </Link>
          <Link to="/about" className="profile-btn" style={{ textDecoration: 'none', color: 'inherit', display: 'inline-flex', alignItems: 'center' }}>
            ℹ️ Tentang
          </Link>
        </div>
      </AccordionItem>

      <AccordionItem id="export" title="Ekspor Data GDPR" subtitle="Unduh seluruh data Anda dalam format JSON">
        <button className="profile-btn primary" onClick={handleExportData} disabled={exporting}>
          {exporting ? 'Mengekspor...' : 'Ekspor JSON'}
        </button>
        {exportErr && <div style={{ marginTop: '8px', color: 'var(--color-danger)', fontSize: '13px' }}>{exportErr}</div>}
      </AccordionItem>

      <AccordionItem id="delete" title="Hapus Akun" subtitle="Hapus akun permanen dan seluruh data" isDanger={true}>
        <button 
          className="profile-btn" 
          style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }} 
          onClick={handleDeleteAccount} 
          disabled={deleting}
        >
          {deleting ? 'Menghapus...' : 'Hapus Akun Permanen'}
        </button>
        {deleteErr && <div style={{ marginTop: '8px', color: 'var(--color-danger)', fontSize: '13px' }}>{deleteErr}</div>}
      </AccordionItem>
    </div>
  );
}

