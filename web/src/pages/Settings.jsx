import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function Settings({ theme, toggleTheme, accentIndex, setAccent, presets, onOpenShortcuts }) {
  const [exporting, setExporting] = useState(false);
  const [exportErr, setExportErr] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState('');

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

  return (
    <div className="card settings-container" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-text-primary)' }}>Pengaturan</h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Sesuaikan tampilan dan kelola data akun Anda</p>
      </div>

      {/* Theme switching */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600' }}>Tema Tampilan</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            Tema aktif saat ini: <strong>{theme === 'dark' ? 'Gelap 🌙' : 'Terang ☀️'}</strong>
          </span>
          <button className="profile-btn" onClick={toggleTheme} style={{ minWidth: '120px' }}>
            Ubah ke {theme === 'dark' ? 'Terang' : 'Gelap'}
          </button>
        </div>
      </div>

      <div style={{ height: '1px', background: 'var(--color-border)' }} />

      {/* Accent selection */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600' }}>Warna Aksen</h3>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Pilih warna aksen untuk menyorot tautan, tombol, dan elemen interaktif</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '4px' }}>
          {presets.map((preset, idx) => (
            <button
              key={preset.name}
              className={`accent-swatch ${accentIndex === idx ? 'active' : ''}`}
              style={{
                background: preset.dark,
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: accentIndex === idx ? '3px solid #ffffff' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: accentIndex === idx ? '0 0 12px ' + preset.dark : 'none'
              }}
              onClick={() => setAccent(idx)}
              title={preset.name}
            />
          ))}
        </div>
      </div>

      <div style={{ height: '1px', background: 'var(--color-border)' }} />

      {/* Keyboard Shortcuts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600' }}>Pintasan Keyboard</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            Gunakan pintasan keyboard untuk bernavigasi lebih cepat
          </span>
          <button className="profile-btn" onClick={onOpenShortcuts} style={{ minWidth: '120px' }}>
            Buka Pintasan
          </button>
        </div>
      </div>

      <div style={{ height: '1px', background: 'var(--color-border)' }} />

      {/* Links & Navigation */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600' }}>Privasi & Informasi</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link to="/settings/blocked" className="profile-btn" style={{ textDecoration: 'none', color: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            🚫 Daftar Pengguna Diblokir
          </Link>
          <Link to="/about" className="profile-btn" style={{ textDecoration: 'none', color: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            ℹ️ Tentang Anonimbuz
          </Link>
        </div>
      </div>

      <div style={{ height: '1px', background: 'var(--color-border)' }} />

      {/* GDPR Data Export Tool */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600' }}>Ekspor Data GDPR</h3>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          Unduh salinan lengkap semua data pribadi Anda (profil, postingan, komentar, reaksi, dan bookmark) dalam format JSON.
        </p>
        <div>
          <button className="profile-btn primary" onClick={handleExportData} disabled={exporting}>
            {exporting ? 'Mengekspor...' : 'Ekspor Semua Data Saya (JSON)'}
          </button>
          {exportErr && (
            <div style={{ marginTop: '8px', color: 'var(--color-danger)', fontSize: '13px' }}>
              {exportErr}
            </div>
          )}
        </div>
      </div>

      <div style={{ height: '1px', background: 'var(--color-border)', margin: '12px 0' }} />

      {/* Account Deletion */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--color-danger)' }}>Hapus Akun</h3>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          Hapus akun Anda secara permanen beserta semua data yang terkait. Tindakan ini tidak dapat dibatalkan.
        </p>
        <div>
          <button 
            className="profile-btn" 
            style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }} 
            onClick={handleDeleteAccount} 
            disabled={deleting}
          >
            {deleting ? 'Menghapus...' : 'Hapus Akun Permanen'}
          </button>
          {deleteErr && (
            <div style={{ marginTop: '8px', color: 'var(--color-danger)', fontSize: '13px' }}>
              {deleteErr}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
