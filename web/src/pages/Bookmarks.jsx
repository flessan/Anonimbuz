import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../auth.jsx';
import PostCard from '../components/PostCard.jsx';

function BookmarkSkeleton() {
  return (
    <>
      {[1, 2].map((i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-avatar"></div>
          <div className="skeleton-body">
            <div className="skeleton-line short"></div>
            <div className="skeleton-line medium"></div>
            <div className="skeleton-line long"></div>
          </div>
        </div>
      ))}
    </>
  );
}

export default function Bookmarks() {
    const { user } = useAuth();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [error, setError] = useState('');

    useEffect(() => {
        loadBookmarks(1);
    }, []);

    const loadBookmarks = async (pageNum) => {
        setLoading(true);
        try {
            const res = await api.get(`/bookmarks?page=${pageNum}`);
            if (pageNum === 1) {
                setPosts(res.data.posts);
            } else {
                setPosts(prev => [...prev, ...res.data.posts]);
            }
            setTotalCount(res.data.totalCount);
            setHasMore(res.data.hasMore);
            setPage(pageNum);
        } catch (err) {
            console.error('Failed to load bookmarks:', err);
            setError('Gagal memuat bookmarks. Coba refresh halaman.');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveBookmark = async (postId) => {
        try {
            await api.delete(`/posts/${postId}/bookmark`);
            setPosts(prev => prev.filter(p => p.id !== postId));
            setTotalCount(prev => prev - 1);
        } catch (err) {
            console.error('Failed to remove bookmark:', err);
            setError('Gagal menghapus bookmark.');
            setTimeout(() => setError(''), 3000);
        }
    };

    if (!user) {
        return <div className="center">Silakan login untuk melihat bookmarks</div>;
    }

    return (
        <div className="bookmarks-container" style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
            <div style={{ marginBottom: '24px' }}>
                <h2 style={{ margin: '0 0 8px 0' }}>📚 Bookmarks</h2>
                <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
                    {totalCount} post yang disimpan
                </p>
            </div>

            {error && (
                <div style={{ padding: '10px 14px', marginBottom: '12px', background: 'rgba(248,113,113,0.1)', border: '1px solid var(--color-danger)', borderRadius: '8px', color: 'var(--color-danger)', fontSize: '13px' }}>
                    {error}
                </div>
            )}

            {loading && posts.length === 0 ? (
                <BookmarkSkeleton />
            ) : posts.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">🔖</div>
                    <h3 className="empty-state-title">Belum Ada Bookmark</h3>
                    <p className="empty-state-text">
                        Postingan yang Anda bookmark akan disimpan di sini agar mudah dibaca kembali.
                    </p>
                    <Link to="/" className="profile-btn primary">
                        Jelajahi Postingan
                    </Link>
                </div>
            ) : (
                <>
                    <div className="feed-list">
                        {posts.map(post => (
                            <PostCard
                                key={post.id}
                                post={post}
                                onDeleted={(id) => setPosts(posts.filter(p => p.id !== id))}
                                onBookmarkToggle={handleRemoveBookmark}
                            />
                        ))}
                    </div>

                    {hasMore && (
                        <button
                            className="load-more-btn"
                            onClick={() => loadBookmarks(page + 1)}
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '12px',
                                marginTop: '16px',
                                background: 'transparent',
                                border: '1px solid var(--color-border)',
                                borderRadius: '8px',
                                color: 'var(--color-accent)',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            {loading ? 'Memuat...' : 'Muat Lebih Banyak'}
                        </button>
                    )}
                </>
            )}
        </div>
    );
}