import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../auth.jsx';
import PostCard from '../components/PostCard.jsx';
import BadgeRole from '../components/BadgeRole.jsx';
import AvatarStack from '../components/AvatarStack.jsx'; // ➕ TAMBAHKAN INI

function ProfileCommentItem({ comment }) {
  // ✅ Safe access
  const safeAuthor = comment.author || {
    id: 'unknown',
    username: 'unknown',
    displayName: 'User Tidak Dikenal',
    avatarUrl: ''
  };

  const safePostAuthor = comment.post?.author || {
    username: 'unknown',
    displayName: 'Unknown'
  };

  return (
    <Link to={`/p/${comment.post?.id || comment.post}`} className="card" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
      <div className="post-meta" style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
        <strong>{safeAuthor.displayName || safeAuthor.username}</strong>
        <span>@{safeAuthor.username}</span>
        <span>·</span>
        <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
      </div>
      <div style={{ fontSize: '13px', color: 'var(--color-accent)', margin: '4px 0 8px' }}>
        Membalas {safePostAuthor ? `@${safePostAuthor.username}` : 'postingan'}
      </div>
      <div className="post-content" style={{ fontSize: '14px' }}>
        {comment.content}
      </div>
      <div className="post-divider" style={{ marginTop: 12, marginBottom: -16 }}></div>
    </Link>
  );
}

export default function Profile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [replies, setReplies] = useState([]);
  const [activeTab, setActiveTab] = useState('posts');

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [github, setGithub] = useState('');
  const [instagram, setInstagram] = useState('');
  const [twitter, setTwitter] = useState('');
  const [facebook, setFacebook] = useState('');

  const [bio, setBio] = useState('');
  const [busy, setBusy] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadErr, setUploadErr] = useState('');

  // ✅ Di awal Profile component
  const [topFollowers, setTopFollowers] = useState([]); // Selalu array, tidak pernah null/undefined
  const [followersCount, setFollowersCount] = useState(0);

  const avatarInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const bottomRef = useRef(null);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function loadProfile() {
  setLoading(true);
  
  // Reset state
  setPosts([]);
  setReplies([]);
  setTopFollowers([]);
  setFollowersCount(0);
  setPage(1);
  setHasMore(true);
  
  try {
    const uRes = await api.get(`/users/${username}`);
    
    if (!uRes.data.user) {
      setProfile(null);
      return;
    }
    
    setProfile(uRes.data.user);
    setDisplayName(uRes.data.user.displayName || '');
    setBio(uRes.data.user.bio || '');
    setGithub(uRes.data.user.githubUrl || '');
    setInstagram(uRes.data.user.instagramUrl || '');
    setTwitter(uRes.data.user.twitterUrl || '');
    setFacebook(uRes.data.user.facebookUrl || '');

    const pRes = await api.get(`/posts/user/${username}?page=1`);
    setPosts(pRes.data.posts || []);
    setHasMore((pRes.data.posts || []).length === 20);

    const cRes = await api.get(`/comments/user/${username}`);
    setReplies(cRes.data.comments || []);

    await loadTopFollowers();

  } catch (e) {
    console.error('Load profile error:', e);
    
    if (e.response?.status === 404) {
      setProfile(null);
    } else if (e.response?.status === 500) {
      console.error('Server error:', e.response?.data);
      alert('Terjadi kesalahan server. Silakan coba lagi.');
    }
  } finally {
    setLoading(false);
  }
}

  async function loadTopFollowers() {
    try {
      const res = await api.get(`/users/${username}/followers/top`);
      const followers = res.data.topFollowers || [];
      const total = res.data.totalCount || 0;
      setTopFollowers(followers);
      setFollowersCount(total);
    } catch (err) {
      console.error('Failed to load top followers:', err.response?.data || err.message);
      setTopFollowers([]);
      setFollowersCount(0);
    }
  }

  useEffect(() => {
    loadProfile();
  }, [username]);

  useEffect(() => {
  if (activeTab !== 'posts' || !hasMore || loading) return;
  
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting && !loadingMore) {
        loadMorePosts();
      }
    },
    { threshold: 0.1 }
  );
  
  const currentRef = bottomRef.current;
  if (currentRef) {
    observer.observe(currentRef);
  }
  
  return () => {
    if (currentRef) {
      observer.unobserve(currentRef);
    }
  };
}, [hasMore, loading, loadingMore, activeTab]);

  async function loadMorePosts() {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const r = await api.get(`/posts/user/${username}?page=${nextPage}`);
      const nextPosts = r.data.posts || [];
      if (nextPosts.length < 20) {
        setHasMore(false);
      }
      setPosts((prev) => [...prev, ...nextPosts]);
      setPage(nextPage);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
    }
  }

  const isMe = user && profile && user.username === profile.username;

  const amIFollowing = profile?.isFollowing || false;
  // ✅ Ambil dari profile data (backend harus return field ini)
const areTheyFollowingMe = profile?.isFollowingMe || false;

let followButtonText = 'Ikuti';
if (amIFollowing && areTheyFollowingMe) {
  followButtonText = 'Saling Ikuti';
} else if (amIFollowing) {
  followButtonText = 'Mengikuti';
}

  async function toggleFollow() {
  if (!user || followBusy) return;
  setFollowBusy(true);

  const previousStatus = profile?.isFollowing || false;
  const previousFollowersCount = profile?.followersCount || 0;

  // Optimistic update
  setProfile(prev => ({
    ...prev,
    isFollowing: !previousStatus,
    followersCount: previousFollowersCount + (previousStatus ? -1 : 1)
  }));

  try {
    const res = await api.post(`/users/${username}/follow`);
    const followed = res.data.followed;

    // Update profile dengan data dari server
    setProfile(prev => ({
      ...prev,
      isFollowing: followed,
      followersCount: res.data.user?.followersCount ?? prev.followersCount,
      followingCount: res.data.user?.followingCount ?? prev.followingCount
    }));

    // Update current user data
    try {
      const meRes = await api.get('/auth/me');
      const currentUser = meRes.data.user;
      
      if (followed) {
        setTopFollowers(prev => {
          const exists = prev.find(u => u.username === currentUser.username);
          if (exists) return prev;
          return [currentUser, ...prev].slice(0, 5);
        });
      } else {
        setTopFollowers(prev => prev.filter(u => u.username !== currentUser.username));
      }
      
      setUser(currentUser);
    } catch (meError) {
      console.error('Failed to fetch current user:', meError);
      // Silent fail - tidak perlu alert karena follow sudah sukses
    }

    // Update followersCount untuk AvatarStack
    setFollowersCount(res.data.user?.followersCount ?? (previousFollowersCount + (followed ? 1 : -1)));

  } catch (e) {
    // Rollback jika error
    setProfile(prev => ({
      ...prev,
      isFollowing: previousStatus,
      followersCount: previousFollowersCount
    }));
    console.error('Follow failed:', e);
    alert(e.response?.data?.error || 'Gagal mengubah status follow');
  } finally {
    setFollowBusy(false);
  }
}

  async function saveProfile(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.patch('/users/me', { displayName, bio, githubUrl: github, instagramUrl: instagram, twitterUrl: twitter, facebookUrl: facebook });
      setProfile(r.data.user);
      setUser(r.data.user);
      setEditing(false);
    } catch (e) {
      alert('Gagal menyimpan profil');
    } finally {
      setBusy(false);
    }
  }

  async function uploadMedia(kind, file) {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setUploadErr('File maksimum 20MB');
      return;
    }
    setUploadErr('');
    const setBusyFn = kind === 'avatar' ? setUploadingAvatar : setUploadingBanner;
    setBusyFn(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await api.post(`/users/me/${kind}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProfile(r.data.user);
      setUser(r.data.user);
    } catch (e) {
      setUploadErr(e.response?.data?.error || 'Upload gagal');
    } finally {
      setBusyFn(false);
    }
  }

  if (loading) return <div className="center">Memuat profil...</div>;
  if (!profile) return <div className="center">User tidak ditemukan.</div>;

  const initial = (profile.displayName || profile.username).charAt(0).toUpperCase();
  const mediaPosts = posts.filter((p) => p.embedUrl);

  return (
    <div>
      {/* Banner */}
      <div className="card profile-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          className="profile-banner"
          style={profile.bannerUrl ? { backgroundImage: `url(${profile.bannerUrl})` } : undefined}
        >
          {isMe && editing && (
            <button
              type="button"
              className="profile-btn"
              style={{ position: 'absolute', right: 12, bottom: 12, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 0 }}
              onClick={() => bannerInputRef.current?.click()}
              disabled={uploadingBanner}
            >
              {uploadingBanner ? 'Mengunggah...' : '📷 Ganti Banner'}
            </button>
          )}
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => uploadMedia('banner', e.target.files?.[0])}
          />
        </div>

        {/* Profile Header Details */}
        <div className="profile-header-wrap">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div className="profile-avatar-overlap">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.username} />
              ) : (
                <div className="avatar-placeholder">{initial}</div>
              )}
              {isMe && editing && (
                <button
                  type="button"
                  className="profile-btn"
                  style={{
                    position: 'absolute',
                    right: -6,
                    bottom: -6,
                    background: 'var(--color-surface-2)',
                    padding: '4px 8px',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--color-border)'
                  }}
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  title="Ganti avatar"
                >
                  {uploadingAvatar ? '...' : '📷'}
                </button>
              )}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => uploadMedia('avatar', e.target.files?.[0])}
              />
            </div>

            {/* Action buttons (Follow/Edit) */}
            <div className="profile-action-row" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              {isMe ? (
                editing ? null : (
                  <button className="profile-btn" onClick={() => setEditing(true)}>Edit profil</button>
                )
              ) : user ? (
                <button
                  key={`follow-btn-${amIFollowing}`} // ✅ Force re-render saat status berubah
                  className={`profile-btn ${!amIFollowing ? 'primary' : ''}`}
                  onClick={toggleFollow}
                  disabled={followBusy}
                  style={{ minWidth: '100px' }}
                >
                  {followBusy ? '...' : followButtonText}
                </button>
              ) : null}

              {/* Menu 3-Titik */}
              <div ref={menuRef} style={{ position: 'relative', marginLeft: '8px' }}>
                <button
                  className="profile-btn"
                  onClick={() => setShowMenu(!showMenu)}
                  style={{ padding: '8px 12px', minWidth: '40px' }}
                >
                  ⋮
                </button>

                {showMenu && (
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: '100%',
                    marginTop: '8px',
                    background: 'var(--color-surface)',
                    border: 'var(--border-width) solid var(--color-border)',
                    borderRadius: 'var(--radius)',
                    padding: '8px',
                    minWidth: '180px',
                    zIndex: 100,
                    boxShadow: 'var(--shadow-offset) var(--shadow-offset) 0 0 var(--color-shadow)'
                  }}>
                    <Link
                      to="/bookmarks"
                      onClick={() => setShowMenu(false)}
                      style={{
                        display: 'block',
                        padding: '10px 12px',
                        color: 'inherit',
                        textDecoration: 'none',
                        borderRadius: '6px',
                        fontWeight: '700',
                        fontSize: '14px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-2)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      📚 Bookmark
                    </Link>
                    {isMe && (
                      <button
                        onClick={() => { setEditing(true); setShowMenu(false); }}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '10px 12px',
                          background: 'none',
                          border: 'none',
                          color: 'inherit',
                          textAlign: 'left',
                          borderRadius: '6px',
                          fontWeight: '700',
                          fontSize: '14px',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-2)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        ✏️ Edit Profil
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Edit Form */}
          {editing ? (
            <form onSubmit={saveProfile} style={{ marginTop: 16 }} className="profile-form">
              <div className="field">
                <label>Nama tampilan</label>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={50} />
              </div>
              <div className="field">
                <label>Bio</label>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={280} style={{ minHeight: 80 }} />
              </div>

              <div className="field"><label>URL GitHub</label><input value={github} onChange={(e) => setGithub(e.target.value)} placeholder="https://github.com..." /></div>
              <div className="field"><label>URL Instagram</label><input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com..." /></div>
              <div className="field"><label>URL Twitter/X</label><input value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="https://x.com..." /></div>
              <div className="field"><label>URL Facebook</label><input value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="https://fb.com..." /></div>

              {uploadErr && <div className="error">{uploadErr}</div>}
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button className="profile-btn primary" type="submit" disabled={busy}>Simpan</button>
                <button className="profile-btn" type="button" onClick={() => setEditing(false)}>Batal</button>
              </div>
            </form>
          ) : (
            <div className="profile-info">
              <h2 className="profile-name">
                {profile.displayName || profile.username}
                <BadgeRole role={profile.role} />
              </h2>
              <div className="profile-handle">@{profile.username}</div>

              {profile.bio && <div className="profile-bio">{profile.bio}</div>}

              {/* Social Links */}
              <div className="profile-socials" style={{ display: 'flex', gap: 16, marginTop: 12, marginBottom: 12 }}>
                {profile.githubUrl && (
                  <a href={profile.githubUrl} target="_blank" rel="noreferrer" title="GitHub" style={{ color: '#fff', opacity: 0.8 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path><path d="M9 18c-4.51 2-5-2-7-2"></path></svg>
                  </a>
                )}
                {profile.instagramUrl && (
                  <a href={profile.instagramUrl} target="_blank" rel="noreferrer" title="Instagram" style={{ color: '#e1306c' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                  </a>
                )}
                {profile.twitterUrl && (
                  <a href={profile.twitterUrl} target="_blank" rel="noreferrer" title="Twitter/X" style={{ color: '#fff', opacity: 0.9 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l11.733 16h4.267l-11.733 -16z"></path><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"></path></svg>
                  </a>
                )}
                {profile.facebookUrl && (
                  <a href={profile.facebookUrl} target="_blank" rel="noreferrer" title="Facebook" style={{ color: '#1877f2' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                  </a>
                )}
              </div>

              {/* Stats dengan Link ke Followers/Following */}
              <div className="profile-stats" style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                <Link to={`/u/${profile.username}/following`} className="stat-link" style={{ color: 'inherit', textDecoration: 'none' }}>
                  <span className="hover-underline" style={{ cursor: 'pointer' }}>
                    <strong style={{ color: '#fff', marginRight: '4px' }}>{profile.followersCount || 0}</strong>
                    <span style={{ color: '#aaa' }}>Mengikuti</span>
                  </span>
                </Link>

                <Link to={`/u/${profile.username}/followers`} className="stat-link" style={{ color: 'inherit', textDecoration: 'none' }}>
                  <span className="hover-underline" style={{ cursor: 'pointer' }}>
                    <strong style={{ color: '#fff', marginRight: '4px' }}>{profile.followingCount || 0}</strong>
                    <span style={{ color: '#aaa' }}>Pengikut</span>
                  </span>
                </Link>
              </div>

              {/* Ganti yang lama dengan ini */}
              {topFollowers.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <AvatarStack
                    followers={topFollowers}
                    totalCount={profile?.followersCount || 0}
                    username={username}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Developer Panel */}
      {user && user.role === 'dev' && !isMe && (
        <div className="admin-section" style={{ marginTop: 12, borderColor: 'var(--color-dev)', background: 'rgba(255, 107, 53, 0.05)' }}>
          <h3 style={{ color: 'var(--color-dev)' }}>Developer Tools</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {profile.role === 'dev' ? (
              <span className="muted">Developer lain tidak dapat dimodifikasi.</span>
            ) : (
              <>
                <button
                  className="profile-btn"
                  style={{ minHeight: 44 }}
                  onClick={async () => {
                    const newRole = profile.role === 'mod' ? 'user' : 'mod';
                    if (!confirm(`Ubah role @${profile.username} menjadi ${newRole}?`)) return;
                    try {
                      await api.patch(`/users/${profile.id}/role`, { role: newRole });
                      alert('Role berhasil diubah!');
                      loadProfile();
                    } catch (err) {
                      alert(err.response?.data?.error || 'Gagal mengubah role');
                    }
                  }}
                >
                  {profile.role === 'mod' ? 'Cabut Moderator' : 'Jadikan Moderator'}
                </button>
                {!profile.isSuspended ? (
                  <button
                    className="profile-btn"
                    style={{ background: 'var(--color-danger)', color: '#fff', borderColor: 'var(--color-danger)', minHeight: 44 }}
                    onClick={async () => {
                      const reason = prompt('Masukkan alasan penangguhan akun:');
                      if (reason === null) return;
                      if (!reason.trim()) {
                        alert('Alasan wajib diisi!');
                        return;
                      }
                      try {
                        await api.patch(`/users/${profile.id}/suspend`, { reason });
                        alert('Akun berhasil ditangguhkan!');
                        loadProfile();
                      } catch (err) {
                        alert(err.response?.data?.error || 'Gagal menangguhkan akun');
                      }
                    }}
                  >
                    Suspend Akun
                  </button>
                ) : (
                  <span className="error" style={{ display: 'flex', alignItems: 'center' }}>
                    Akun Ditangguhkan
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Profile Tabs */}
      <div className="profile-tabs">
        <button
          className={`profile-tab ${activeTab === 'posts' ? 'active' : ''}`}
          onClick={() => setActiveTab('posts')}
        >
          Postingan
        </button>
        <button
          className={`profile-tab ${activeTab === 'replies' ? 'active' : ''}`}
          onClick={() => setActiveTab('replies')}
        >
          Balasan
        </button>
        <button
          className={`profile-tab ${activeTab === 'media' ? 'active' : ''}`}
          onClick={() => setActiveTab('media')}
        >
          Media
        </button>
      </div>

      {/* Tab Contents */}
      <div style={{ marginTop: 12 }}>
        {activeTab === 'posts' && (
          posts.length === 0 ? (
            <div className="center">Belum ada postingan.</div>
          ) : (
            <>
              <div className="feed-list">
                {posts.map((p) => (
                  <PostCard key={p.id} post={p} onDeleted={(id) => setPosts(prev => prev.filter((x) => x.id !== id))} />
                ))}
              </div>

              {hasMore && !loading && (
                <div ref={bottomRef} style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {loadingMore && <div className="muted" style={{ fontSize: '14px' }}>Memuat lebih banyak...</div>}
                </div>
              )}
            </>
          )
        )}

        {activeTab === 'replies' && (
          replies.length === 0 ? (
            <div className="center">Belum ada balasan.</div>
          ) : (
            <div className="feed-list">
              {replies.map((c) => {
                // ✅ Safe access untuk author
                const safeAuthor = c.author || {
                  id: 'unknown',
                  username: 'unknown',
                  displayName: 'User Tidak Dikenal',
                  avatarUrl: ''
                };

                return (
                  <ProfileCommentItem
                    key={c.id}
                    comment={{
                      ...c,
                      author: safeAuthor
                    }}
                  />
                );
              })}
            </div>
          )
        )}

        {activeTab === 'media' && (
          mediaPosts.length === 0 ? (
            <div className="center">Belum ada media.</div>
          ) : (
            <div className="feed-list">
              {mediaPosts.map((p) => (
                <PostCard key={p.id} post={p} onDeleted={(id) => setPosts(prev => prev.filter((x) => x.id !== id))} />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}