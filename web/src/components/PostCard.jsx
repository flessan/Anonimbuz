import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { parsePostContent } from '../utils/markdownParser.js';
import api from '../api';
import { useAuth } from '../auth.jsx';
import BadgeRole from './BadgeRole.jsx';
import {
  IconHeart,
  IconComment,
  IconRepost,
  IconShare,
  IconTrash,
  IconBookmark,
  IconEdit
} from './Icons.jsx';

// ✅ Fallback author untuk mencegah crash
const FALLBACK_AUTHOR = {
  id: 'unknown',
  username: 'unknown',
  displayName: 'User Tidak Dikenal',
  avatarUrl: '',
  bio: '',
  role: null
};

function formatRelativeTime(dateStr) {
  const now = new Date();
  const past = new Date(dateStr);
  const diffMs = now - past;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Baru saja';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}j`;
  if (diffDays === 1) return 'Kemarin';
  return `${diffDays}h`;
}

// Calculate reading time in minutes (200 wpm average)
function readingTime(text) {
  if (!text) return null;
  const words = text.trim().split(/\s+/).length;
  const mins = Math.ceil(words / 200);
  // Only show for posts that take at least 1 minute
  return words >= 100 ? mins : null;
}

function PostPoll({ poll, handleVote, user }) {
  if (!poll) return null;

  const totalVotes = poll.totalVotes || 0;
  const isExpired = poll.isExpired || new Date(poll.expiresAt) < new Date();
  const showResults = poll.hasVoted || isExpired;

  let footerText = `${totalVotes} suara`;
  if (isExpired) {
    footerText += ' · Polling berakhir';
  } else {
    const timeLeft = new Date(poll.expiresAt) - new Date();
    const daysLeft = Math.max(1, Math.ceil(timeLeft / (1000 * 60 * 60 * 24)));
    footerText += ` · ${daysLeft} hari tersisa`;
  }

  return (
    <div className="post-poll-container" onClick={(e) => e.stopPropagation()}>
      {showResults ? (
        <div className="poll-results">
          {poll.options.map((opt) => {
            const votes = opt.votesCount || 0;
            const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
            const isUserChoice = opt.id === poll.userVoteOptionId;

            return (
              <div key={opt.id} className={`poll-result-row ${isUserChoice ? 'user-choice' : ''}`}>
                <div className="poll-result-bar" style={{ width: `${percentage}%` }}></div>
                <div className="poll-result-info">
                  <span className="poll-result-text">
                    {opt.text} {isUserChoice && <span className="user-choice-badge">✓</span>}
                  </span>
                  <span className="poll-result-percent">{percentage}%</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="poll-options-list">
          {poll.options.map((opt) => (
            <button
              key={opt.id}
              className="poll-option-btn"
              onClick={() => handleVote(opt.id)}
              disabled={!user}
            >
              {opt.text}
            </button>
          ))}
        </div>
      )}
      <div className="poll-footer">{footerText}</div>
    </div>
  );
}

function PostAvatar({ user, size = 40 }) {
  // ✅ Safe access untuk user
  const safeUser = user || FALLBACK_AUTHOR;
  const initial = (safeUser.displayName || safeUser.username || '?').charAt(0).toUpperCase();

  if (safeUser.avatarUrl) {
    return <img className="avatar-img" src={safeUser.avatarUrl} alt={safeUser.username} style={{ width: size, height: size }} />;
  }
  return <div className="avatar-placeholder" style={{ width: size, height: size }}>{initial}</div>;
}

function PostContent({ content }) {
  if (!content) return null;
  const html = parsePostContent(content);

  return (
    <div
      className="post-content"
      dangerouslySetInnerHTML={{ __html: html }}
      style={{
        wordBreak: 'break-word',
        lineHeight: 1.6,
        fontSize: '15px'
      }}
    />
  );
}

function getEmbedDetails(url) {
  if (!url) return null;
  const cleanedUrl = url.trim();
  if (!/^https?:\/\//i.test(cleanedUrl)) return null;

  // YouTube
  const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const ytMatch = cleanedUrl.match(ytRegex);
  if (ytMatch) return { type: 'youtube', embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}` };

  // Spotify
  const spotifyRegex = /open\.spotify\.com\/(track|playlist|album|artist)\/([a-zA-Z0-9]+)/i;
  const spotifyMatch = cleanedUrl.match(spotifyRegex);
  if (spotifyMatch) return { type: 'spotify', embedUrl: `https://open.spotify.com/embed/${spotifyMatch[1]}/${spotifyMatch[2]}` };

  // ✅ Facebook - Handle multiple formats
  // Cek apakah ini short URL (tidak support embed)
  const fbShortRegex = /(?:facebook\.com|web\.facebook\.com)\/(?:share\/p\/|share\/v\/)/i;
  const fbWatchRegex = /fb\.watch\//i;

  if (fbShortRegex.test(cleanedUrl) || fbWatchRegex.test(cleanedUrl)) {
    // Short URL - tidak support iframe embed
    return {
      type: 'facebook_short',
      url: cleanedUrl
    };
  }

  // Format lama yang support embed
  const fbRegex = /(?:facebook\.com|web\.facebook\.com)\/(?:[^\/]+\/posts\/|posts\/|permalink\.php\?id=|photo\.php\?fbid=|videos\/|watch\/?\?v=)([a-zA-Z0-9]+)/i;
  const fbMatch = cleanedUrl.match(fbRegex);
  if (fbMatch) {
    return {
      type: 'facebook',
      embedUrl: `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(cleanedUrl)}&width=500&show_text=true`
    };
  }

  // Instagram
  const igRegex = /instagram\.com\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/i;
  const igMatch = cleanedUrl.match(igRegex);
  if (igMatch) {
    return {
      type: 'instagram',
      embedUrl: `https://www.instagram.com/p/${igMatch[1]}/embed`
    };
  }

  // TikTok
  const ttRegex = /tiktok\.com\/@([a-zA-Z0-9_.]+)\/video\/([0-9]+)/i;
  const ttMatch = cleanedUrl.match(ttRegex);
  if (ttMatch) {
    return {
      type: 'tiktok',
      embedUrl: `https://www.tiktok.com/embed/v2/${ttMatch[2]}`
    };
  }

  // Direct media
  if (/\.(jpeg|jpg|gif|png|webp|svg)(?:\?.*)?$/i.test(cleanedUrl)) return { type: 'image', url: cleanedUrl };
  if (/\.(mp4|webm|ogg)(?:\?.*)?$/i.test(cleanedUrl)) return { type: 'video', url: cleanedUrl };
  if (/\.(mp3|wav|ogg)(?:\?.*)?$/i.test(cleanedUrl)) return { type: 'audio', url: cleanedUrl };

  return { type: 'link', url: cleanedUrl };
}

function EmbedPreview({ url, content }) {
  let targetUrl = url;
  if (!targetUrl && content) {
    const urlRegex = /(https?:\/\/[^\s]+)/i;
    const match = content.match(urlRegex);
    if (match) targetUrl = match[0];
  }
  if (!targetUrl) return null;

  try {
    const embed = getEmbedDetails(targetUrl);
    if (!embed) return null;

    switch (embed.type) {
      case 'youtube':
        return (
          <div className="embed-container youtube-embed" onClick={(e) => e.stopPropagation()}>
            <iframe src={embed.embedUrl} title="YouTube video player" frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen></iframe>
          </div>
        );

      case 'facebook':
        return (
          <div className="embed-container facebook-embed" onClick={(e) => e.stopPropagation()}>
            <iframe src={embed.embedUrl} width="100%" height="500"
              style={{ border: 'none', overflow: 'hidden' }} scrolling="no"
              allowFullScreen={true} allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"></iframe>
          </div>
        );

      // ✅ TAMBAHKAN: Handler untuk Facebook short URL
      case 'facebook_short':
        return (
          <a
            href={embed.url}
            target="_blank"
            rel="noopener noreferrer"
            className="embed-link-card facebook-short-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px',
              background: 'linear-gradient(135deg, rgba(24, 119, 242, 0.1) 0%, rgba(24, 119, 242, 0.05) 100%)',
              border: '1px solid rgba(24, 119, 242, 0.2)',
              borderRadius: '12px',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(24, 119, 242, 0.15) 0%, rgba(24, 119, 242, 0.08) 100%)';
              e.currentTarget.style.borderColor = 'rgba(24, 119, 242, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(24, 119, 242, 0.1) 0%, rgba(24, 119, 242, 0.05) 100%)';
              e.currentTarget.style.borderColor = 'rgba(24, 119, 242, 0.2)';
            }}
          >
            <div style={{
              fontSize: '32px',
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(24, 119, 242, 0.1)',
              borderRadius: '12px'
            }}>
              📘
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '600', marginBottom: '4px', fontSize: '14px' }}>
                Facebook Post
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                Klik untuk melihat konten di Facebook
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-primary)' }}>
                Buka di tab baru →
              </div>
            </div>
          </a>
        );

      case 'instagram':
        return (
          <div className="embed-container instagram-embed" onClick={(e) => e.stopPropagation()}>
            <iframe src={embed.embedUrl} width="100%" height="600" frameBorder="0"
              scrolling="no" allowTransparency={true}></iframe>
          </div>
        );

      case 'tiktok':
        return (
          <div className="embed-container tiktok-embed" onClick={(e) => e.stopPropagation()}>
            <iframe src={embed.embedUrl} width="100%" height="800"
              style={{ border: 'none' }} allowFullScreen></iframe>
          </div>
        );

      case 'spotify':
        return (
          <div className="embed-container spotify-embed" onClick={(e) => e.stopPropagation()}>
            <iframe src={embed.embedUrl} width="100%" height="200" frameBorder="0" allowFullScreen=""
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
          </div>
        );

      case 'image':
        return (
          <div className="embed-container image-embed" onClick={(e) => e.stopPropagation()}>
            <img src={embed.url} alt="Embed" loading="lazy" />
          </div>
        );

      case 'video':
        return (
          <div className="embed-container video-embed" onClick={(e) => e.stopPropagation()}>
            <video src={embed.url} controls preload="metadata" />
          </div>
        );

      case 'audio':
        return (
          <div className="embed-container audio-embed" onClick={(e) => e.stopPropagation()}>
            <audio src={embed.url} controls />
          </div>
        );

      case 'link':
        const domain = new URL(targetUrl).hostname;
        return (
          <a href={targetUrl} target="_blank" rel="noopener noreferrer" className="embed-link-card" onClick={(e) => e.stopPropagation()}>
            <span className="embed-link-icon">🔗</span>
            <div className="embed-link-info">
              <span className="embed-link-title">{targetUrl}</span>
              <span className="embed-link-domain">Kunjungi {domain}</span>
            </div>
          </a>
        );

      default:
        return null;
    }
  } catch (e) {
    console.error('Embed error:', e);
    return null;
  }
}

export default function PostCard({ post, onDeleted }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ✅ SAFE DERIVED VALUES dengan fallback
  const safeAuthor = post?.author || FALLBACK_AUTHOR;
  const isDirectRepost = post.repostOf && !post.content;
  const originalPost = isDirectRepost ? (post.repostOf || post) : post;
  const safeOriginalAuthor = originalPost?.author || FALLBACK_AUTHOR;

  // ✅ SEMUA STATE DI AWAL
  const [likes, setLikes] = useState(originalPost?.likes || []);
  const [reposts, setReposts] = useState(originalPost?.reposts || []);
  const [poll, setPoll] = useState(originalPost?.poll || null);
  const [reactions, setReactions] = useState(originalPost?.reactions || []);
  const [userReaction, setUserReaction] = useState(originalPost?.userReaction || null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reason, setReason] = useState('');

  const [showRepostDropdown, setShowRepostDropdown] = useState(false);
  const [showShareDropdown, setShowShareDropdown] = useState(false);
  const [showReactionPopover, setShowReactionPopover] = useState(false);
  const [isQuoteOpen, setIsQuoteOpen] = useState(false);
  const [quoteContent, setQuoteContent] = useState('');
  const [quoteBusy, setQuoteBusy] = useState(false);

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkBusy, setBookmarkBusy] = useState(false);
  const [isPinned, setIsPinned] = useState(originalPost?.isPinned || false);
  const [pinBusy, setPinBusy] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editBusy, setEditBusy] = useState(false);

  const repostRef = useRef(null);
  const shareRef = useRef(null);
  const reactionRef = useRef(null);

  // ✅ DERIVED BOOLEANS dengan safe access
  const liked = user && likes.some((id) => String(id) === String(user.id));
  const reposted = user && reposts.some((id) => String(id) === String(user.id));
  const mine = user && safeOriginalAuthor.id !== 'unknown' && String(safeOriginalAuthor.id) === String(user.id);

  // ✅ USEEFFECTS
  useEffect(() => {
    setLikes(originalPost?.likes || []);
    setReposts(originalPost?.reposts || []);
    setPoll(originalPost?.poll || null);
    setReactions(originalPost?.reactions || []);
    setUserReaction(originalPost?.userReaction || null);
    setIsBookmarked(originalPost?.isBookmarked || false);
    setIsPinned(originalPost?.isPinned || false);
  }, [originalPost?.id]);

  useEffect(() => {
    const clickOutside = (e) => {
      if (repostRef.current && !repostRef.current.contains(e.target)) setShowRepostDropdown(false);
      if (shareRef.current && !shareRef.current.contains(e.target)) setShowShareDropdown(false);
      if (reactionRef.current && !reactionRef.current.contains(e.target)) setShowReactionPopover(false);
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  // ✅ EARLY RETURNS
  if (!originalPost || originalPost.status === 'removed') return null;

  if (originalPost.status === 'removed_by_mod') {
    return (
      <div className="card-wrap">
        <article className="card" style={{ opacity: 0.6, fontStyle: 'italic', padding: '16px' }}>
          <div style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🚫 Postingan ini dihapus oleh moderator. Alasan: {originalPost.removedReason || 'Melanggar ketentuan komunitas.'}</span>
          </div>
        </article>
        <div className="post-divider"></div>
      </div>
    );
  }

  // ✅ HANDLER FUNCTIONS
  async function toggleLike() {
    if (!user || busy) return;
    setBusy(true);
    try {
      if (liked) {
        await api.delete(`/posts/${originalPost.id}/like`);
        setLikes(likes.filter((id) => String(id) !== String(user.id)));
      } else {
        await api.post(`/posts/${originalPost.id}/like`);
        setLikes([...likes, user.id]);
      }
    } catch (e) { console.error(e); } finally { setBusy(false); }
  }

  async function handleVote(optionId) {
    if (!user || busy) return;
    setBusy(true);
    try {
      const res = await api.post(`/posts/${originalPost.id}/poll/vote`, { optionId });
      if (res.data.post) setPoll(res.data.post.poll);
    } catch (err) { alert(err.response?.data?.error || 'Gagal memberikan suara'); } finally { setBusy(false); }
  }

  async function toggleReaction(emoji) {
    if (!user || busy) return;
    setBusy(true);
    setShowReactionPopover(false);
    try {
      if (userReaction === emoji) {
        const res = await api.delete(`/posts/${originalPost.id}/react`);
        setReactions(res.data.post.reactions || []);
        setUserReaction(null);
      } else {
        const res = await api.post(`/posts/${originalPost.id}/react`, { emoji });
        setReactions(res.data.post.reactions || []);
        setUserReaction(emoji);
      }
    } catch (e) { console.error(e); } finally { setBusy(false); }
  }

  async function toggleBookmark() {
    if (!user || bookmarkBusy) return;
    setBookmarkBusy(true);
    try {
      if (isBookmarked) {
        await api.delete(`/posts/${originalPost.id}/bookmark`);
        setIsBookmarked(false);
      } else {
        await api.post(`/posts/${originalPost.id}/bookmark`);
        setIsBookmarked(true);
      }
    } catch (err) { console.error('Bookmark toggle failed:', err); alert('Gagal toggle bookmark'); } finally { setBookmarkBusy(false); }
  }

  async function togglePin() {
    if (!user || pinBusy || !mine) return;
    setPinBusy(true);
    try {
      const res = await api.post(`/posts/${originalPost.id}/pin`);
      setIsPinned(res.data.isPinned);
    } catch (err) {
      console.error('Pin toggle failed:', err);
    } finally {
      setPinBusy(false);
    }
  }

  function startEdit() { setEditContent(originalPost.content); setIsEditing(true); }


  async function saveEdit() {
    if (!editContent.trim() || editBusy) return;
    setEditBusy(true);
    try {
      const res = await api.patch(`/posts/${originalPost.id}`, { content: editContent });
      if (res.data.post) {
        originalPost.content = res.data.post.content;
        originalPost.isEdited = res.data.post.isEdited;
        originalPost.updatedAt = res.data.post.updatedAt;
      } else {
        originalPost.content = editContent.trim();
        originalPost.isEdited = true;
      }
      setIsEditing(false);
    } catch (err) { alert(err.response?.data?.error || 'Gagal edit post'); } finally { setEditBusy(false); }
  }

  async function handleRepostDirect() {
    if (!user || busy) return;
    setBusy(true);
    setShowRepostDropdown(false);
    try {
      if (reposted) {
        await api.delete(`/posts/${originalPost.id}/repost`);
        setReposts(reposts.filter((id) => String(id) !== String(user.id)));
      } else {
        const res = await api.post(`/posts/${originalPost.id}/repost`);
        setReposts([...reposts, user.id]);
        window.dispatchEvent(new CustomEvent('new-post-created', { detail: res.data.post }));
      }
    } catch (e) { console.error(e); } finally { setBusy(false); }
  }

  async function handleQuoteSubmit(e) {
    e.preventDefault();
    if (!quoteContent.trim() || quoteBusy) return;
    setQuoteBusy(true);
    try {
      const res = await api.post(`/posts/${originalPost.id}/quote`, { content: quoteContent });
      setQuoteContent('');
      setIsQuoteOpen(false);
      window.dispatchEvent(new CustomEvent('new-post-created', { detail: res.data.post }));
    } catch (err) { alert(err.response?.data?.error || 'Gagal mengirim kutipan'); } finally { setQuoteBusy(false); }
  }

  async function handleDelete() {
    if (!confirm('Hapus post ini?')) return;
    try {
      await api.delete(`/posts/${post.id}`);
      onDeleted && onDeleted(post.id);
    } catch (err) { alert('Gagal menghapus post'); }
  }

  async function handleModerateDelete() {
    if (!reason.trim()) { alert('Alasan wajib diisi!'); return; }
    try {
      await api.delete(`/posts/${originalPost.id}/moderate`, { data: { reason } });
      onDeleted && onDeleted(post.id);
    } catch (err) { alert(err.response?.data?.error || 'Gagal menghapus postingan'); }
  }

  const handleCopyLink = () => {
    const url = `${window.location.origin}/p/${originalPost.id}`;
    navigator.clipboard.writeText(url).then(() => { alert('Tautan disalin ke papan klip!'); setShowShareDropdown(false); });
  };

  const handleNativeShare = async () => {
    const origin = window.location.origin || `${window.location.protocol}//${window.location.host}`;
    const url = `${origin}/p/${originalPost?.id}`;
    const cleanText = originalPost?.content ? (originalPost.content.length > 100 ? `${originalPost.content.substring(0, 97)}...` : originalPost.content) : 'Lihat postingan anonim ini';
    if (navigator.share && navigator.canShare?.({ title: 'Anon-Post', text: cleanText, url })) {
      try { await navigator.share({ title: 'Anon-Post', text: cleanText, url }); } catch (error) { if (error.name !== 'AbortError') handleCopyLink(); }
    } else { handleCopyLink(); }
  };

  const handleCardClick = () => navigate(`/p/${originalPost.id}`);

  // ✅ RETURN dengan safe access di semua tempat
  return (
    <div className="post-card-container">
      {/* Pinned indicator */}
      {isPinned && (
        <div className="post-pinned-header">
          <span>📌</span>
          <span>Postingan Disematkan</span>
        </div>
      )}

      {/* Repost Indicator Bar */}
      {isDirectRepost && post.author && (
        <div className="post-repost-header">
          <IconRepost size={14} />
          <span>
            <Link to={`/u/${post.author.username}`} onClick={(e) => e.stopPropagation()}>
              {post.author.displayName || post.author.username}
            </Link> me-repost
          </span>
        </div>
      )}

      <article className="card" onClick={handleCardClick} style={{ cursor: 'pointer' }}>
        <div className="post-main">
          {/* Avatar dengan safe access */}
          <div className="post-avatar-wrap" onClick={(e) => e.stopPropagation()}>
            <Link to={`/u/${safeOriginalAuthor.username}`}>
              <PostAvatar user={safeOriginalAuthor} size={40} />
            </Link>
          </div>

          <div className="post-body">
            {/* Header row dengan safe access */}
            <div className="post-header" onClick={(e) => e.stopPropagation()}>
              <Link to={`/u/${safeOriginalAuthor.username}`} className="post-author-name">
                {safeOriginalAuthor.displayName || safeOriginalAuthor.username}
              </Link>
              {safeOriginalAuthor.role && <BadgeRole role={safeOriginalAuthor.role} />}
              <span className="post-author-handle">@{safeOriginalAuthor.username}</span>
              <span>·</span>
              <Link to={`/p/${originalPost.id}`} className="post-time">
                {formatRelativeTime(originalPost.createdAt)}
              </Link>
              {originalPost.isEdited && (
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginLeft: '4px' }}>(diedit)</span>
              )}
              {(() => {
                const rt = readingTime(originalPost.content);
                return rt ? (
                  <span className="reading-time-badge" title={`Estimasi waktu baca: ${rt} menit`}>
                    📖 {rt} mnt
                  </span>
                ) : null;
              })()}
            </div>

            <PostContent content={originalPost.content} />
            <EmbedPreview url={originalPost.embedUrl} content={originalPost.content} />
            <PostPoll poll={poll} handleVote={handleVote} user={user} />

            {/* Quote Post Render dengan safe access */}
            {originalPost.quotedPost && originalPost.content && (
              <div className="quote-post-box" onClick={(e) => {
                e.stopPropagation();
                if (originalPost.quotedPost.status === 'ACTIVE' && originalPost.quotedPost.id) {
                  navigate(`/p/${originalPost.quotedPost.id}`);
                }
              }}>
                {originalPost.quotedPost.status === 'removed_by_mod' || originalPost.quotedPost.status === 'DELETED' || originalPost.quotedPost.status === 'removed' ? (
                  <div className="quote-content" style={{ opacity: 0.6, fontStyle: 'italic', padding: '4px 0' }}>
                    🚫 Postingan yang dikutip telah dihapus.
                  </div>
                ) : (
                  <>
                    <div className="quote-header">
                      <img src={originalPost.quotedPost.author?.avatarUrl || ''} alt=""
                        className="quote-avatar" onError={(e) => { e.target.style.display = 'none'; }} />
                      <span className="quote-name">
                        {originalPost.quotedPost.author?.displayName || originalPost.quotedPost.author?.username || 'User'}
                      </span>
                      <span style={{ color: 'var(--color-text-secondary)' }}>
                        @{originalPost.quotedPost.author?.username || 'anonim'}
                      </span>
                    </div>
                    <div className="quote-content">{originalPost.quotedPost.content}</div>
                  </>
                )}
              </div>
            )}

            {/* Action Bar */}
            <div className="post-actions" onClick={(e) => e.stopPropagation()}>
              <div className="dropdown-wrap" ref={reactionRef}>
                <button className={`post-action-btn react-trigger-btn ${liked || userReaction ? 'active' : ''}`}
                  onClick={toggleLike} onMouseEnter={() => setShowReactionPopover(true)} disabled={!user || busy} title="Suka / Reaksi">
                  <span className="react-btn-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
                    {userReaction ? <span style={{ fontSize: '16px' }}>{userReaction}</span> : <IconHeart filled={liked} size={18} />}
                  </span>
                  <span>{likes.length + reactions.reduce((acc, r) => acc + r.count, 0)}</span>
                </button>
                {showReactionPopover && (
                  <div className="reaction-popover" onMouseLeave={() => setShowReactionPopover(false)}>
                    {['👍', '❤️', '😂', '😮', '😢', '😡'].map((emoji) => (
                      <button key={emoji} className={`reaction-emoji-btn ${userReaction === emoji ? 'selected' : ''}`}
                        onClick={() => toggleReaction(emoji)}>
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Link to={`/p/${originalPost.id}`} className="post-action-btn comment-btn">
                <IconComment size={18} /><span>{originalPost.commentsCount || 0}</span>
              </Link>

              <div className="dropdown-wrap" ref={repostRef}>
                <button className={`post-action-btn repost-btn ${reposted ? 'active' : ''}`}
                  onClick={() => setShowRepostDropdown(!showRepostDropdown)} disabled={!user}>
                  <IconRepost size={18} /><span>{reposts.length}</span>
                </button>
                {showRepostDropdown && (
                  <div className="dropdown-menu">
                    <button className="dropdown-item" onClick={handleRepostDirect}>
                      <IconRepost size={16} /><span>{reposted ? 'Urungkan Repost' : 'Repost'}</span>
                    </button>
                    <button className="dropdown-item" onClick={() => { setIsQuoteOpen(true); setShowRepostDropdown(false); }}>
                      <span>Kutip Postingan</span>
                    </button>
                  </div>
                )}
              </div>

              <button className={`post-action-btn bookmark-btn ${isBookmarked ? 'active' : ''}`}
                onClick={toggleBookmark} disabled={!user || bookmarkBusy}
                title={isBookmarked ? 'Hapus bookmark' : 'Bookmark post'}>
                <IconBookmark filled={isBookmarked} size={18} />
              </button>

              <div className="dropdown-wrap" ref={shareRef}>
                <button className="post-action-btn share-btn" onClick={() => setShowShareDropdown(!showShareDropdown)}>
                  <IconShare size={18} />
                </button>
                {showShareDropdown && (
                  <div className="dropdown-menu">
                    <button className="dropdown-item" onClick={handleCopyLink}><span>Salin Tautan</span></button>
                    <button className="dropdown-item" onClick={handleNativeShare}>
                      <IconShare size={14} /><span>Bagikan via...</span>
                    </button>
                  </div>
                )}
              </div>

              {mine && (
                <button className="post-action-btn edit-btn" onClick={startEdit} title="Edit post">
                  <IconEdit size={18} />
                </button>
              )}

              {mine && !isDirectRepost && (
                <button
                  className={`post-action-btn pin-btn ${isPinned ? 'active' : ''}`}
                  onClick={togglePin}
                  disabled={pinBusy}
                  title={isPinned ? 'Lepas sematkan' : 'Sematkan post'}
                >
                  📌
                </button>
              )}

              {mine ? (
                <button className="post-action-btn" style={{ color: 'var(--color-danger)' }} onClick={handleDelete} title="Hapus postingan">
                  <IconTrash size={18} />
                </button>
              ) : (user && (user.role === 'mod' || user.role === 'dev') && (
                confirmDelete ? (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginLeft: 'auto', background: 'var(--color-surface-2)', padding: '4px', borderRadius: '8px' }}>
                    <input type="text" placeholder="Alasan hapus..." value={reason} onChange={(e) => setReason(e.target.value)}
                      style={{ fontSize: '11px', padding: '4px 8px', height: '24px', flex: 1, minHeight: 'auto', margin: 0, width: '100px' }} />
                    <button className="profile-btn primary" onClick={handleModerateDelete} style={{ fontSize: '10px', padding: '4px 8px', height: '24px' }}>Hapus</button>
                    <button className="profile-btn" onClick={() => setConfirmDelete(false)} style={{ fontSize: '10px', padding: '4px 8px', height: '24px' }}>Batal</button>
                  </div>
                ) : (
                  <button className="post-action-btn" style={{ color: 'var(--color-danger)' }} onClick={() => setConfirmDelete(true)} title="Hapus sebagai Moderator">
                    <IconTrash size={18} />
                  </button>
                )
              ))}
            </div>

            {/* Active Reactions Pills */}
            {reactions.length > 0 && (
              <div className="active-reactions-row" onClick={(e) => e.stopPropagation()} style={{
                display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px',
                paddingTop: '4px', borderTop: '1px solid var(--color-border-subtle)'
              }}>
                {reactions.map((r, idx) => (
                  <button key={idx} className={`reaction-pill ${userReaction === r.emoji ? 'active' : ''}`}
                    onClick={() => toggleReaction(r.emoji)} disabled={!user || busy} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px',
                      background: userReaction === r.emoji ? 'var(--color-accent-soft)' : 'var(--color-surface-2)',
                      color: userReaction === r.emoji ? 'var(--color-accent)' : 'var(--color-text)',
                      border: '1px solid var(--color-border)', borderRadius: '12px',
                      fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s'
                    }}>
                    <span>{r.emoji}</span>
                    <span className="reaction-count" style={{ fontWeight: 600 }}>{r.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </article>
      <div className="post-divider"></div>

      {/* Quote Post Modal */}
      {isQuoteOpen && (
        <div className="fullscreen-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <button className="modal-close-btn" onClick={() => setIsQuoteOpen(false)} disabled={quoteBusy}>Batal</button>
            <span className="modal-header-title">Kutip Postingan</span>
            <button className="modal-submit-btn" onClick={handleQuoteSubmit} disabled={!quoteContent.trim() || quoteBusy}>Kirim</button>
          </div>
          <div className="modal-body">
            <div className="modal-composer-row">
              <PostAvatar user={user} size={40} />
              <textarea className="modal-textarea" placeholder="Tambahkan komentar Anda..."
                value={quoteContent} onChange={(e) => setQuoteContent(e.target.value)} maxLength={500} disabled={quoteBusy} />
            </div>
            <div className="quote-post-box" style={{ background: 'var(--color-surface)' }}>
              <div className="quote-header">
                <img src={safeOriginalAuthor?.avatarUrl || ''} alt="" className="quote-avatar"
                  onError={(e) => { e.target.style.display = 'none'; }} />
                <span className="quote-name">{safeOriginalAuthor?.displayName || safeOriginalAuthor?.username}</span>
                <span style={{ color: 'var(--color-text-secondary)' }}>@{safeOriginalAuthor?.username}</span>
              </div>
              <div className="quote-content">{originalPost.content}</div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Post Modal */}
      {isEditing && (
        <div className="fullscreen-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <button className="modal-close-btn" onClick={() => setIsEditing(false)} disabled={editBusy}>Batal</button>
            <span className="modal-header-title">Edit Post</span>
            <button className="modal-submit-btn" onClick={saveEdit} disabled={!editContent.trim() || editBusy}>
              {editBusy ? '...' : 'Simpan'}
            </button>
          </div>
          <div className="modal-body">
            <div className="modal-composer-row">
              <PostAvatar user={user} size={40} />
              <textarea className="modal-textarea" placeholder="Edit postingan Anda..."
                value={editContent} onChange={(e) => setEditContent(e.target.value)} maxLength={2000} disabled={editBusy} autoFocus />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}