import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import { parsePostContent } from '../utils/markdownParser.js';
import anonLogo from '../assets/images/anon.svg';

export default function EmbedPost() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchPost() {
      try {
        const res = await api.get(`/posts/${id}`);
        setPost(res.data.post);
      } catch (err) {
        console.error(err);
        setError('Postingan tidak ditemukan atau telah dihapus.');
      } finally {
        setLoading(false);
      }
    }
    fetchPost();
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '150px', background: 'var(--color-bg)', color: 'var(--color-text-secondary)', fontFamily: 'sans-serif' }}>
        Memuat preview...
      </div>
    );
  }

  if (error || !post) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '150px', padding: '16px', background: 'var(--color-bg)', color: 'var(--color-danger)', border: '1px solid var(--color-border)', borderRadius: '12px', textAlign: 'center', fontSize: '14px', fontFamily: 'sans-serif' }}>
        ⚠️ {error || 'Gagal memuat postingan.'}
      </div>
    );
  }

  const cleanText = parsePostContent(post.content);
  const initial = (post.author?.displayName || post.author?.username || '?').charAt(0).toUpperCase();

  return (
    <div style={{
      padding: '16px',
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: '12px',
      fontFamily: 'var(--font-family)',
      color: 'var(--color-text-primary)',
      boxShadow: 'var(--glass-shadow-sm)',
      maxWidth: '100%',
      margin: '0 auto',
      boxSizing: 'border-box'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {post.author?.avatarUrl ? (
            <img
              src={post.author.avatarUrl}
              alt={post.author.username}
              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #7C6AF7, #6d4aff)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '12px'
            }}>
              {initial}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-text-primary)' }}>
              {post.author?.displayName || post.author?.username}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              @{post.author?.username}
            </span>
          </div>
        </div>

        {/* Brand Logo / Watermark */}
        <a href={`${window.location.origin}/p/${post.id}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', color: 'inherit' }}>
          <img src={anonLogo} alt="Anonimbuz" style={{ width: '18px', height: '18px' }} />
          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-secondary)' }}>Anonimbuz</span>
        </a>
      </div>

      {/* Content */}
      <div
        className="post-content"
        dangerouslySetInnerHTML={{ __html: cleanText }}
        style={{
          fontSize: '14px',
          lineHeight: '1.5',
          wordBreak: 'break-word',
          marginBottom: '12px',
          color: 'var(--color-text-primary)'
        }}
      />

      {/* Footer Link */}
      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
          {new Date(post.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
        </span>
        <a
          href={`${window.location.origin}/p/${post.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="profile-btn primary"
          style={{
            fontSize: '11px',
            padding: '4px 10px',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            height: 'auto',
            minHeight: 'auto'
          }}
        >
          Lihat Postingan →
        </a>
      </div>
    </div>
  );
}
