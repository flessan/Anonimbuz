import React, { useState } from 'react';
import { useFeatureFlags } from '../context/FeatureFlagContext.jsx';

const PROMPTS = [
  "Apa rahasia terbesar yang tidak pernah kamu ceritakan kepada siapa pun?",
  "Pelajaran hidup apa yang paling berharga yang kamu pelajari minggu ini?",
  "Jika kamu bisa memutar waktu 5 tahun ke belakang, apa yang ingin kamu ubah?",
  "Apa hal kecil yang selalu berhasil membuatmu tersenyum di saat sedih?",
  "Siapa orang yang paling kamu rindukan saat ini, dan mengapa?",
  "Jika kamu menulis buku tentang hidupmu, apa judul bab saat ini?",
  "Apa ketakutan terbesarmu yang masih belum bisa kamu taklukkan?"
];

export default function WeeklyPrompt() {
  const { flags } = useFeatureFlags();
  const [closed, setClosed] = useState(false);

  // Jika feature flag dimatikan atau user menutup card
  if (!flags.enablePrompts || closed) return null;

  // Pilih prompt berdasarkan hari (0-6)
  const today = new Date().getDay();
  const currentPrompt = PROMPTS[today % PROMPTS.length];

  const handleCreatePost = () => {
    // Dispatch event untuk membuka composer dengan text awalan
    const event = new CustomEvent('open-composer-modal', {
      detail: { initialContent: `"${currentPrompt}"\n\n` }
    });
    window.dispatchEvent(event);
  };

  return (
    <div className="card weekly-prompt-card" style={{ marginBottom: '16px', background: 'linear-gradient(135deg, var(--color-accent-soft) 0%, var(--color-surface) 100%)', position: 'relative' }}>
      <button 
        onClick={() => setClosed(true)} 
        style={{ position: 'absolute', top: '8px', right: '12px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
        title="Tutup prompt"
      >
        ✕
      </button>
      <div style={{ padding: '16px' }}>
        <h3 style={{ fontSize: '13px', color: 'var(--color-accent)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
          ✨ Diskusi Hari Ini
        </h3>
        <p style={{ fontSize: '16px', fontWeight: '500', marginBottom: '12px' }}>
          {currentPrompt}
        </p>
        <button className="profile-btn primary" onClick={handleCreatePost} style={{ padding: '6px 12px', fontSize: '13px' }}>
          Tulis Ceritamu
        </button>
      </div>
    </div>
  );
}
