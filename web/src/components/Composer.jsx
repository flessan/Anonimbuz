import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import api from '../api';
import { useAuth } from '../auth.jsx';
import GifPicker from './GifPicker.jsx';
import { parsePostContent } from '../utils/markdownParser.js';

const CATEGORIES = ['genre', 'character', 'artist', 'group', 'language', 'format'];

// Utility Avatar component
function ComposerAvatar({ user, size = 40 }) {
  const initial = (user?.displayName || user?.username || '?').charAt(0).toUpperCase();
  if (user?.avatarUrl) {
    return <img className="avatar-img" src={user.avatarUrl} alt={user.username} style={{ width: size, height: size }} />;
  }
  return <div className="avatar-placeholder" style={{ width: size, height: size }}>{initial}</div>;
}

// 1. CreatePostBar Component
export function CreatePostBar() {
  const { user } = useAuth();

  const handleBarClick = () => {
    window.dispatchEvent(new CustomEvent('open-composer-modal'));
  };

  if (!user) return null;

  return (
    <div className="create-post-bar card" onClick={handleBarClick} style={{ cursor: 'pointer' }}>
      <ComposerAvatar user={user} size={40} />
      <div className="create-post-bar-input">Apa yang ingin kamu bagikan?</div>
      <div className="post-divider" style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}></div>
    </div>
  );
}

// 2. ComposerModal Component
export function ComposerModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const textareaRef = useRef(null);

  const DRAFT_KEY = useMemo(() => `anonimbuz_draft_${user?.id || 'guest'}`, [user?.id]);

  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);
  const [tagName, setTagName] = useState('');
  const [tagCategory, setTagCategory] = useState('genre');
  const [embedUrl, setEmbedUrl] = useState('');
  const [detectedUrls, setDetectedUrls] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  // Polling state
  const [showPollForm, setShowPollForm] = useState(false);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollDuration, setPollDuration] = useState('1');

  function handlePollOptionChange(idx, val) {
    const updated = [...pollOptions];
    updated[idx] = val;
    setPollOptions(updated);
  }

  function addPollOption() {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, '']);
    }
  }

  function removePollOption(idx) {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== idx));
    }
  }

  // ✅ useEffect untuk focus + restore draft
  useEffect(() => {
    if (isOpen) {
      // Restore draft if content is empty
      if (!content) {
        const saved = localStorage.getItem(DRAFT_KEY);
        if (saved) {
          try {
            const draft = JSON.parse(saved);
            if (draft.content) {
              setContent(draft.content);
              setHasDraft(true);
            }
          } catch { /* ignore */ }
        }
      }
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [isOpen, DRAFT_KEY]);

  // ✅ Auto-save draft on content change (debounced 800ms)
  useEffect(() => {
    if (!isOpen || busy) return;
    const timer = setTimeout(() => {
      if (content.trim()) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ content, savedAt: Date.now() }));
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [content, isOpen, DRAFT_KEY]);

  // ✅ Auto-detect multiple URLs untuk embed preview
  useEffect(() => {
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const matches = content.match(urlRegex) || [];
    setDetectedUrls([...new Set(matches)]);
    if (matches.length > 0 && !embedUrl) {
      setEmbedUrl(matches[0]);
    }
  }, [content]);

  function discardDraft() {
    localStorage.removeItem(DRAFT_KEY);
    setContent('');
    setHasDraft(false);
  }

  // ✅ Early return
  if (!isOpen) return null;

  // ✅ Handler functions
  async function handleSubmit(e) {
    e.preventDefault();
    if (!content.trim() || busy) return;

    if (!turnstileToken) {
      setErr('Selesaikan verifikasi keamanan terlebih dahulu.');
      return;
    }

    setBusy(true);
    setErr('');

    try {
      // Check if we have valid poll options
      let pollData = undefined;
      const cleanOptions = pollOptions.filter(o => o.trim());
      if (showPollForm && cleanOptions.length >= 2) {
        pollData = {
          options: cleanOptions,
          durationDays: parseInt(pollDuration)
        };
      }

      const res = await api.post('/posts', {
        content: content.trim(),
        embedUrl: embedUrl || undefined,
        tags: tags,
        turnstileToken,
        poll: pollData
      });

      window.dispatchEvent(new CustomEvent('new-post-created', {
        detail: res.data.post
      }));

      setContent('');
      setTags([]);
      setTagName('');
      setEmbedUrl('');
      setDetectedUrls([]);
      setTurnstileToken('');
      setShowPollForm(false);
      setPollOptions(['', '']);
      setPollDuration('1');
      setPreviewMode(false);
      setHasDraft(false);
      localStorage.removeItem(DRAFT_KEY);

      onClose();
    } catch (error) {
      console.error('Post creation failed:', error);
      setErr(error.response?.data?.error || 'Gagal membuat postingan');
    } finally {
      setBusy(false);
    }
  }

  // ➕ Insert text at cursor position
  function insertText(before, after = '') {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);

    setContent(newText);

    // Set cursor position after insertion
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  }

  // ➕ Handle GIF selection
  function handleGifSelect(gifUrl) {
    const gifMarkdown = `![GIF](${gifUrl})`;
    insertText(gifMarkdown + '\n');
    setShowGifPicker(false);
  }

  function handleAddTag(e) {
    e.preventDefault();
    if (!tagName.trim()) return;

    const newTag = {
      name: tagName.trim(),
      category: tagCategory
    };

    if (tags.some(t => t.name.toLowerCase() === newTag.name.toLowerCase())) {
      setErr('Tag sudah ditambahkan');
      return;
    }

    setTags([...tags, newTag]);
    setTagName('');
    setErr('');
  }

  function handleRemoveTag(tagNameToRemove) {
    setTags(tags.filter(t => t.name !== tagNameToRemove));
  }

  return (
    <div className="fullscreen-modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <button className="modal-close-btn" onClick={onClose} disabled={busy}>
            Batalin
          </button>
          <span className="modal-header-title">Buat Postingan</span>
          <button
            className="modal-submit-btn"
            onClick={handleSubmit}
            disabled={!content.trim() || busy || !turnstileToken}
          >
            {busy ? 'Mengirim...' : 'Kirim'}
          </button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            {/* User info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <ComposerAvatar user={user} size={40} />
              <div>
                <div style={{ fontWeight: '600' }}>{user?.displayName || user?.username}</div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>@{user?.username}</div>
              </div>
            </div>

            {/* Draft restored banner */}
            {hasDraft && (
              <div className="draft-restored-banner">
                <span>📝 Draft dipulihkan</span>
                <button type="button" className="draft-discard-btn" onClick={discardDraft}>
                  Buang
                </button>
              </div>
            )}

            {/* ➕ Rich Text Toolbar */}
            <div className="composer-toolbar">
              {/* Write / Preview tabs */}
              <button
                type="button"
                className={`composer-toolbar-btn ${!previewMode ? 'active-tab' : ''}`}
                onClick={() => setPreviewMode(false)}
                title="Mode Tulis"
              >
                ✏️ Tulis
              </button>
              <button
                type="button"
                className={`composer-toolbar-btn ${previewMode ? 'active-tab' : ''}`}
                onClick={() => setPreviewMode(true)}
                disabled={!content.trim()}
                title="Pratinjau Markdown"
              >
                👁 Pratinjau
              </button>
              <div className="composer-toolbar-divider"></div>
              <button
                type="button"
                className="composer-toolbar-btn"
                onClick={() => insertText('**', '**')}
                style={{ fontWeight: 'bold' }}
                title="Bold"
                disabled={previewMode}
              >
                B
              </button>
              <button
                type="button"
                className="composer-toolbar-btn"
                onClick={() => insertText('*', '*')}
                style={{ fontStyle: 'italic' }}
                title="Italic"
                disabled={previewMode}
              >
                I
              </button>
              <button
                type="button"
                className="composer-toolbar-btn"
                onClick={() => insertText('`', '`')}
                style={{ fontFamily: 'monospace' }}
                title="Code"
                disabled={previewMode}
              >
                {'</>'}
              </button>
              <button
                type="button"
                className="composer-toolbar-btn"
                onClick={() => insertText('[', '](url)')}
                title="Link"
                disabled={previewMode}
              >
                🔗 Link
              </button>
              <div className="composer-toolbar-divider"></div>
              <button
                type="button"
                className="composer-toolbar-btn"
                onClick={() => setShowGifPicker(true)}
                style={{ color: 'var(--color-accent)' }}
                title="Add GIF"
                disabled={previewMode}
              >
                🎬 GIF
              </button>
              <div className="composer-toolbar-divider"></div>
              <button
                type="button"
                className="composer-toolbar-btn"
                onClick={() => setShowPollForm(!showPollForm)}
                style={showPollForm ? { background: 'var(--color-accent-soft)', color: 'var(--color-accent)' } : undefined}
                title="Tambah Polling"
                disabled={previewMode}
              >
                📊 Polling
              </button>
            </div>

            {/* Content textarea / Preview */}
            {previewMode ? (
              <div
                className="composer-preview post-content"
                dangerouslySetInnerHTML={{ __html: parsePostContent(content) }}
              />
            ) : (
              <textarea
                ref={textareaRef}
                className="modal-textarea"
                placeholder="Apa yang sedang Anda pikirkan?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={2000}
                disabled={busy}
                style={{ minHeight: '150px', resize: 'vertical' }}
              />
            )}

            {/* Character counter & Circular progress */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
              <div>
                {showPollForm && (
                  <span style={{ fontSize: '12px', color: 'var(--color-accent)', fontWeight: 600 }}>Polling ditambahkan</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ position: 'relative', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="20" height="20" style={{ transform: 'rotate(-90deg)' }}>
                    {/* Background circle */}
                    <circle
                      cx="10"
                      cy="10"
                      r="8"
                      fill="none"
                      stroke="var(--color-border)"
                      strokeWidth="2"
                    />
                    {/* Foreground progress circle */}
                    <circle
                      cx="10"
                      cy="10"
                      r="8"
                      fill="none"
                      stroke={content.length >= 2000 ? 'var(--color-danger)' : content.length >= 1900 ? '#fbbf24' : 'var(--color-accent)'}
                      strokeWidth="2"
                      strokeDasharray={2 * Math.PI * 8}
                      strokeDashoffset={2 * Math.PI * 8 - (Math.min(content.length, 2000) / 2000) * (2 * Math.PI * 8)}
                      style={{ transition: 'stroke-dashoffset 0.1s ease' }}
                    />
                  </svg>
                </div>
                <div style={{
                  fontSize: '12px',
                  color: content.length >= 2000 ? 'var(--color-danger)' : content.length >= 1900 ? '#fbbf24' : 'var(--color-text-secondary)',
                  fontWeight: content.length >= 1900 ? '600' : 'normal'
                }}>
                  {content.length}/2000
                </div>
              </div>
            </div>

            {/* Polling Input Form */}
            {showPollForm && (
              <div className="poll-composer-form" style={{
                background: 'var(--color-surface-2)',
                padding: '12px',
                borderRadius: '8px',
                marginTop: '12px',
                border: '1px solid var(--color-border)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '600', fontSize: '13px' }}>Buat Polling</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPollForm(false);
                      setPollOptions(['', '']);
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: '12px' }}
                  >
                    Hapus
                  </button>
                </div>
                {pollOptions.map((opt, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder={`Pilihan ${idx + 1}`}
                      value={opt}
                      onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                      maxLength={80}
                      style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '13px' }}
                      disabled={busy}
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removePollOption(idx)}
                        style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '16px' }}
                        disabled={busy}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 4 && (
                  <button
                    type="button"
                    onClick={addPollOption}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-primary)',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '600',
                      padding: '4px 0',
                      marginBottom: '8px',
                      display: 'block'
                    }}
                    disabled={busy}
                  >
                    + Tambah Pilihan
                  </button>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Durasi:</span>
                  <select
                    value={pollDuration}
                    onChange={(e) => setPollDuration(e.target.value)}
                    style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                    disabled={busy}
                  >
                    <option value="1">1 Hari</option>
                    <option value="3">3 Hari</option>
                    <option value="7">7 Hari</option>
                  </select>
                </div>
              </div>
            )}

            {/* ➕ Multiple URL Preview Cards */}
            {detectedUrls.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                {detectedUrls.map((url, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '8px',
                      background: 'var(--color-surface-2)',
                      borderRadius: '8px',
                      marginBottom: index < detectedUrls.length - 1 ? '8px' : 0
                    }}
                  >
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                      Link {index + 1}:
                    </div>
                    <div style={{ fontSize: '13px', wordBreak: 'break-all', color: 'var(--color-primary)' }}>
                      {url}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tags section */}
            <div style={{ marginTop: '16px' }}>
              <label style={{ fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                Tags ({tags.length})
              </label>

              {tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                  {tags.map((tag) => (
                    <span
                      key={tag.name}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        background: 'var(--color-primary)',
                        color: 'white',
                        borderRadius: '12px',
                        fontSize: '12px'
                      }}
                    >
                      {tag.name}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag.name)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'white',
                          cursor: 'pointer',
                          padding: '0',
                          fontSize: '14px'
                        }}
                        disabled={busy}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Nama tag"
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                  disabled={busy}
                />
                <select
                  value={tagCategory}
                  onChange={(e) => setTagCategory(e.target.value)}
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                  disabled={busy}
                >
                  <option value="genre">Genre</option>
                  <option value="character">Karakter</option>
                  <option value="artist">Artis</option>
                  <option value="group">Grup</option>
                  <option value="language">Bahasa</option>
                  <option value="format">Format</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddTag}
                  disabled={busy || !tagName.trim()}
                  style={{ padding: '8px 16px', borderRadius: '6px', background: 'var(--color-primary)', color: 'white', border: 'none', cursor: 'pointer' }}
                >
                  Tambah
                </button>
              </div>
            </div>

            {/* Turnstile verification */}
            <div style={{ marginTop: '16px' }}>
              <Turnstile
                siteKey="0x4AAAAAADptq3u1zNIT7v01"
                onSuccess={(token) => setTurnstileToken(token)}
                onExpire={() => setTurnstileToken('')}
                onError={() => setErr('Gagal memuat sistem keamanan.')}
              />
            </div>

            {err && (
              <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(255, 0, 0, 0.1)', color: 'var(--color-danger)', borderRadius: '6px', fontSize: '14px' }}>
                {err}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* ➕ GIF Picker Modal */}
      {showGifPicker && (
        <GifPicker
          onSelect={handleGifSelect}
          onClose={() => setShowGifPicker(false)}
        />
      )}
    </div>
  );
}