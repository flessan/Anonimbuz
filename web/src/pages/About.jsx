import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import anonLogo from '../assets/images/anon.svg';

export default function About() {
  const [activeTab, setActiveTab] = useState('features'); // 'features' | 'guide' | 'dev' | 'changelog'

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px 16px' }}>
      {/* Brand Header */}
      <div className="card" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: '32px 24px',
        marginBottom: '24px',
        background: 'radial-gradient(circle at top, var(--color-accent-soft) 0%, var(--color-surface) 100%)',
        borderColor: 'var(--color-border-glow)'
      }}>
        <img
          src={anonLogo}
          alt="Anonimbuz Logo"
          style={{
            width: '80px',
            height: '80px',
            marginBottom: '16px',
            filter: 'drop-shadow(0 4px 12px var(--color-border-glow))'
          }}
        />
        <h1 style={{ fontSize: '2.2rem', fontWeight: '800', marginBottom: '8px', color: 'var(--color-text-primary)' }}>
          Anonimbuz
        </h1>
        <p style={{
          fontSize: '1.1rem',
          color: 'var(--color-text-secondary)',
          maxWidth: '540px',
          lineHeight: '1.6',
          margin: 0
        }}>
          Platform sosial berbasis teks yang mengutamakan privasi. Tanpa pelacak invasif, tanpa iklan mengganggu, dan didukung oleh sistem penyematan media pintar.
        </p>
      </div>

      {/* Glassmorphic Tabs Navigation */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        overflowX: 'auto',
        padding: '4px',
        borderRadius: '12px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        backdropFilter: 'var(--glass-blur)'
      }}>
        {[
          { id: 'features', label: '🚀 Fitur Utama', desc: 'Daftar kapabilitas platform' },
          { id: 'guide', label: '📖 Cara Penggunaan', desc: 'Panduan format & media' },
          { id: 'dev', label: '💻 Developer & Donasi', desc: 'Tim pengembang & dukungan' },
          { id: 'changelog', label: '📅 Log Update', desc: 'Roadmap & riwayat perubahan' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: '1',
              minWidth: '130px',
              padding: '12px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === tab.id ? 'var(--color-accent)' : 'transparent',
              color: activeTab === tab.id ? '#ffffff' : 'var(--color-text-secondary)',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              transition: 'all var(--transition-fast)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px'
            }}
          >
            <span>{tab.label}</span>
            <span style={{
              fontSize: '10px',
              opacity: activeTab === tab.id ? 0.9 : 0.6,
              fontWeight: '400'
            }} className="desktop-only">
              {tab.desc}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="tab-content" style={{ animation: 'fadeIn 0.3s ease-in-out' }}>

        {/* TAB 1: FEATURES */}
        {activeTab === 'features' && (
          <div style={{ display: 'grid', gap: '16px' }}>
            <div className="card" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '24px' }}>📝</div>
              <div>
                <h3 style={{ marginBottom: '6px', color: 'var(--color-text-primary)' }}>Postingan Berbasis Teks (Hingga 2000 Karakter)</h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
                  Tulis pikiranmu dengan leluasa. Kami mendukung format Markdown lengkap untuk teks tebal, miring, kode terformat, tautan eksternal, sebutan user (mentions), dan tagar (hashtags).
                </p>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '24px' }}>🔗</div>
              <div>
                <h3 style={{ marginBottom: '6px', color: 'var(--color-text-primary)' }}>Super Embed System</h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
                  Meskipun kami membatasi unggahan gambar langsung demi kecepatan dan privasi, kamu bisa menempelkan tautan dari YouTube, Spotify, TikTok, Instagram, Facebook, GIF (via pemilih GIF bawaan), atau gambar langsung untuk disematkan secara instan.
                </p>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '24px' }}>🛡️</div>
              <div>
                <h3 style={{ marginBottom: '6px', color: 'var(--color-text-primary)' }}>Mode Anonim & Pseudonim</h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
                  Ingin berbicara tanpa beban? Centang opsi "Posting secara anonim" untuk mempublikasikan postingan menggunakan nama samaran acak yang keren. Identitas aslimu aman terjaga.
                </p>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '24px' }}>📊</div>
              <div>
                <h3 style={{ marginBottom: '6px', color: 'var(--color-text-primary)' }}>Poling & Reaksi Emoji</h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
                  Buat jajak pendapat hingga 4 pilihan jawaban untuk mengumpulkan opini publik. Berikan respon pada postingan dengan berbagai emoji unik untuk mengekspresikan perasaanmu.
                </p>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '24px' }}>💬</div>
              <div>
                <h3 style={{ marginBottom: '6px', color: 'var(--color-text-primary)' }}>Komentar Bersarang & Bookmark</h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
                  Lakukan diskusi interaktif melalui komentar bersarang (nested threads). Simpan postingan menarik ke dalam Bookmark pribadimu untuk dibaca kembali kapan saja.
                </p>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '24px' }}>🚫</div>
              <div>
                <h3 style={{ marginBottom: '6px', color: 'var(--color-text-primary)' }}>Sistem Blokir & Keamanan</h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
                  Kendalikan lini masa-mu dengan memblokir pengguna yang mengganggu. Blokir akan menyembunyikan postingan dan komentar mereka secara menyeluruh dari hadapanmu.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: GUIDE */}
        {activeTab === 'guide' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="card">
              <h3 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>✍️</span> Cara Menulis Format Teks (Markdown)
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: '1.6', marginBottom: '12px' }}>
                Kamu bisa mempercantik tulisanmu menggunakan format Markdown sederhana di bawah ini:
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '12px',
                fontSize: '13px',
                lineHeight: '1.5'
              }}>
                <div style={{ padding: '10px', background: 'var(--color-surface-2)', borderRadius: '6px' }}>
                  <strong>Tebal</strong>: Gunakan <code>**teks**</code> untuk menghasilkan <strong>teks</strong>.
                </div>
                <div style={{ padding: '10px', background: 'var(--color-surface-2)', borderRadius: '6px' }}>
                  <strong>Miring</strong>: Gunakan <code>*teks*</code> untuk menghasilkan <em>teks</em>.
                </div>
                <div style={{ padding: '10px', background: 'var(--color-surface-2)', borderRadius: '6px' }}>
                  <strong>Kode Segaris</strong>: Gunakan <code>`kode`</code> untuk menghasilkan <code>kode</code>.
                </div>
                <div style={{ padding: '10px', background: 'var(--color-surface-2)', borderRadius: '6px' }}>
                  <strong>Tautan</strong>: Gunakan <code>[Nama](https://...)</code> untuk menyematkan link.
                </div>
                <div style={{ padding: '10px', background: 'var(--color-surface-2)', borderRadius: '6px' }}>
                  <strong>Sebutan</strong>: Ketik <code>@username</code> untuk me-mention pengguna terdaftar.
                </div>
                <div style={{ padding: '10px', background: 'var(--color-surface-2)', borderRadius: '6px' }}>
                  <strong>Tagar</strong>: Ketik <code>#tag</code> untuk menambahkan topik ke dalam pencarian.
                </div>
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🎵</span> Cara Menyematkan Media & Musik
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: '1.6', marginBottom: '12px' }}>
                Cukup salin dan tempelkan alamat URL lengkap media ke dalam konten postinganmu. Sistem kami akan mendeteksi dan merendernya secara otomatis:
              </p>
              <ul style={{ paddingLeft: '20px', fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: '1.8' }}>
                <li><strong>YouTube</strong>: Tempelkan tautan video standar atau Shorts.</li>
                <li><strong>Spotify</strong>: Tempelkan tautan lagu, album, atau daftar putar (Playlist).</li>
                <li><strong>Instagram/TikTok</strong>: Tempelkan tautan kiriman publik mereka.</li>
                <li><strong>Gambar & Video</strong>: Tempelkan tautan langsung file berakhiran <code>.png</code>, <code>.jpg</code>, <code>.gif</code>, atau <code>.mp4</code>.</li>
              </ul>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🤖</span> Verifikasi Keamanan Turnstile
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: '1.6', margin: 0 }}>
                Untuk meminimalkan spam dan bot liar, kami menggunakan <strong>Cloudflare Turnstile</strong> pada modal pembuat post (Composer). Pastikan indikator Turnstile telah verifikasi secara otomatis sebelum menekan tombol publikasi kiriman.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: DEVELOPER & DONATION */}
        {activeTab === 'dev' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="card" style={{
              background: 'linear-gradient(135deg, var(--color-accent-soft) 0%, var(--color-surface) 100%)',
              borderColor: 'var(--color-border-glow)',
              padding: '24px'
            }}>
              <h3 style={{ marginBottom: '8px', fontSize: '1.3rem', color: 'var(--color-accent)' }}>☕ Dukung Pengembangan Anonimbuz</h3>
              <p style={{ fontSize: '14px', color: 'var(--color-text-primary)', lineHeight: '1.6', marginBottom: '16px' }}>
                Anonimbuz dikembangkan secara independen dan dijalankan menggunakan dana pribadi untuk biaya server database serta infrastruktur Cloudflare. Setiap donasi dari Anda sangat berarti untuk kelangsungan hidup platform ini!
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                <a
                  href="https://tako.id/fLeSs/gift"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="profile-btn primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    fontWeight: 'bold',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    background: 'var(--color-accent)',
                    color: '#ffffff',
                    boxShadow: '0 4px 14px rgba(129, 140, 248, 0.4)'
                  }}
                >
                  ❤️ Donasi via Tako.id/fless
                </a>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '12px', margin: '12px 0 0 0' }}>
                *Silakan kirimkan pesan penyemangat setelah mendonasikan dukungan Anda!
              </p>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: '12px' }}>💻 Tim Pengembang</h3>
              <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: '1.6', margin: 0 }}>
                Aplikasi ini dibangun menggunakan teknologi mutakhir: <strong>React</strong> di sisi Frontend, <strong>Hono.js</strong> pada <strong>Cloudflare Pages Functions</strong> untuk sisi Backend serverless, serta database <strong>PostgreSQL (Neon DB)</strong> dengan <strong>Prisma ORM</strong>.
              </p>
            </div>
          </div>
        )}

        {/* TAB 4: CHANGELOG & ROADMAP */}
        {activeTab === 'changelog' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="card">
              <h3 style={{ marginBottom: '12px', color: 'var(--color-accent)' }}>📢 Pembaruan Terkini</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
                <div style={{ borderLeft: '3px solid var(--color-accent)', paddingLeft: '12px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Visual Overhaul & Polish Pass (Juni 2026)</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>v0.1.5</div>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>
                    Pemberian konsistensi visual di seluruh komponen, transisi glassmorphism yang halus, peningkatan status muatan kosong (empty states), indikator skeleton screens untuk memuat data, serta penambahan halaman informasi ini.
                  </p>
                </div>

                <div style={{ borderLeft: '3px solid var(--color-border)', paddingLeft: '12px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Stabilitas Embed & Chat Socket Removal</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>v0.1.2</div>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>
                    Penghapusan integrasi Socket.io lama untuk performa koneksi yang lebih stabil, perbaikan deteksi fallbacks URL Facebook, penanganan crash null authors, dan integrasi modul Turnstile yang diperbarui.
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: '12px' }}>🗺️ Peta Jalan (Roadmap)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ color: 'var(--color-mod)' }}>[✓]</span>
                  <span><strong>Fase 1: Polish & Stabilitas (Sekarang)</strong> - Perbaikan bug visual, optimasi feed loading, dan error boundaries.</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ color: 'var(--color-dev)' }}>[▶]</span>
                  <span><strong>Fase 2: Peningkatan UX</strong> - Konversi ke PWA, pintasan keyboard, tema khusus, pratinjau markdown langsung.</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>[ ]</span>
                  <span><strong>Fase 3: Fitur Privasi Tingkat Lanjut</strong> - AnonStory (Postingan terhapus otomatis dalam 24 jam).</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>[ ]</span>
                  <span><strong>Fase 4: Alat Penulisan</strong> - Blok kode dengan sintaks warna (syntax highlighting), mode thread cerita bersambung, draf, dan jadwal postingan.</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Footer support prompt */}
      <div style={{
        marginTop: '32px',
        textAlign: 'center',
        fontSize: '12px',
        color: 'var(--color-text-secondary)',
        padding: '16px 0',
        borderTop: '1px solid var(--color-border)'
      }}>
        Anonimbuz v0.1.5 • Dibuat dengan 💜 untuk komunitas.
      </div>
    </div>
  );
}
