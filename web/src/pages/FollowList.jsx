// web/src/pages/FollowList.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../auth.jsx';

function FollowSkeleton() {
  return (
    <div className="follow-list" style={{ marginTop: 12 }}>
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexGrow: 1 }}>
            <div className="skeleton-avatar" style={{ width: '36px', height: '36px' }}></div>
            <div className="skeleton-body" style={{ gap: '4px' }}>
              <div className="skeleton-line short" style={{ height: '10px' }}></div>
              <div className="skeleton-line medium" style={{ height: '8px' }}></div>
            </div>
          </div>
          <div className="skeleton-line" style={{ width: '60px', height: '24px', borderRadius: '6px' }}></div>
        </div>
      ))}
    </div>
  );
}

export default function FollowList({ type }) {
    const { username } = useParams();
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [followBusy, setFollowBusy] = useState({});
    const [followError, setFollowError] = useState('');

    const endpoint = type === 'followers' ? 'followers' : 'following';

    useEffect(() => {
        loadUsers(1);
    }, [username, type]);

    const loadUsers = async (pageNum) => {
        setLoading(true);
        try {
            const res = await api.get(`/users/${username}/${endpoint}?page=${pageNum}`);
            if (pageNum === 1) {
                setUsers(res.data[endpoint]);
            } else {
                setUsers(prev => [...prev, ...res.data[endpoint]]);
            }
            setTotalCount(res.data.totalCount);
            setHasMore(res.data.hasMore);
            setPage(pageNum);
        } catch (err) {
            console.error('Failed to load users:', err);
            alert('Gagal memuat data');
        } finally {
            setLoading(false);
        }
    };

    const handleFollowToggle = async (targetUsername) => {
        if (followBusy[targetUsername]) return;
        setFollowBusy(prev => ({ ...prev, [targetUsername]: true }));
        setFollowError('');

        const isFollowing = users.find(u => u.username === targetUsername)?.isFollowing;
        // Optimistic update
        setUsers(prev => prev.map(u =>
            u.username === targetUsername ? { ...u, isFollowing: !isFollowing } : u
        ));
        try {
            // Backend uses a single POST toggle endpoint
            await api.post(`/users/${targetUsername}/follow`);
        } catch (err) {
            console.error('Follow toggle failed:', err);
            // Rollback optimistic update
            setUsers(prev => prev.map(u =>
                u.username === targetUsername ? { ...u, isFollowing } : u
            ));
            setFollowError('Gagal mengubah status follow. Coba lagi.');
            setTimeout(() => setFollowError(''), 3000);
        } finally {
            setFollowBusy(prev => ({ ...prev, [targetUsername]: false }));
        }
    };

    return (
        <div className="follow-list-container">
            <div className="follow-list-header">
                <h2>{type === 'followers' ? 'Pengikut' : 'Mengikuti'}</h2>
                <p className="follow-list-count">{totalCount} {type === 'followers' ? 'pengikut' : 'mengikuti'}</p>
            </div>

            {followError && (
                <div style={{ padding: '8px 16px', marginBottom: '8px', background: 'rgba(248,113,113,0.12)', border: '1px solid var(--color-danger)', borderRadius: '8px', color: 'var(--color-danger)', fontSize: '13px' }}>
                    {followError}
                </div>
            )}

            {loading && users.length === 0 ? (
                <FollowSkeleton />
            ) : users.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">👥</div>
                    <h3 className="empty-state-title">Belum Ada Pengguna</h3>
                    <p className="empty-state-text">
                        {type === 'followers' 
                            ? 'Belum ada pengguna yang mengikuti akun ini.' 
                            : 'Akun ini belum mengikuti siapa pun.'}
                    </p>
                    <Link to="/explore" className="profile-btn primary">
                        Jelajahi Akun Lain
                    </Link>
                </div>
            ) : (
                <>
                    <div className="follow-list">
                        {users.map(user => (
                            <div key={user.id} className="follow-list-item">
                                <Link to={`/u/${user.username}`} className="follow-list-user">
                                    <div className="follow-list-avatar">
                                        {user.avatarUrl ? (
                                            <img src={user.avatarUrl} alt={user.username} />
                                        ) : (
                                            <div className="avatar-placeholder">
                                                {(user.displayName || user.username).charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="follow-list-info">
                                        <div className="follow-list-name">
                                            {user.displayName || user.username}
                                        </div>
                                        <div className="follow-list-username">@{user.username}</div>
                                        {user.bio && (
                                            <div className="follow-list-bio">{user.bio}</div>
                                        )}
                                    </div>
                                </Link>

                                {currentUser && currentUser.username !== user.username && (
                                    <button
                                        className={`profile-btn ${user.isFollowing ? '' : 'primary'}`}
                                        onClick={() => handleFollowToggle(user.username)}
                                        disabled={followBusy[user.username]}
                                    >
                                        {user.isFollowing ? 'Mengikuti' : 'Ikuti'}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {hasMore && (
                        <button
                            className="load-more-btn"
                            onClick={() => loadUsers(page + 1)}
                            disabled={loading}
                        >
                            {loading ? 'Memuat...' : 'Muat Lebih Banyak'}
                        </button>
                    )}
                </>
            )}
        </div>
    );
}