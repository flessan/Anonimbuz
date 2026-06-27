import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';
import { useAuth } from '../auth.jsx';

export default function BlockedUsers() {
    const { user } = useAuth();
    const [blockedUsers, setBlockedUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [unblockBusy, setUnblockBusy] = useState({});

    useEffect(() => {
        loadBlockedUsers(1);
    }, []);

    const loadBlockedUsers = async (pageNum) => {
        setLoading(true);
        try {
            const res = await api.get(`/blocks?page=${pageNum}`);
            if (pageNum === 1) {
                setBlockedUsers(res.data.blockedUsers);
            } else {
                setBlockedUsers(prev => [...prev, ...res.data.blockedUsers]);
            }
            setTotalCount(res.data.totalCount);
            setHasMore(res.data.hasMore);
            setPage(pageNum);
        } catch (err) {
            console.error('Failed to load blocked users:', err);
            alert('Gagal memuat blocked users');
        } finally {
            setLoading(false);
        }
    };

    const handleUnblock = async (username) => {
        if (unblockBusy[username]) return;
        setUnblockBusy(prev => ({ ...prev, [username]: true }));

        try {
            await api.delete(`/blocks/users/${username}/block`);
            setBlockedUsers(prev => prev.filter(u => u.username !== username));
            setTotalCount(prev => prev - 1);
        } catch (err) {
            console.error('Failed to unblock user:', err);
            alert('Gagal unblock user');
        } finally {
            setUnblockBusy(prev => ({ ...prev, [username]: false }));
        }
    };

    if (!user) {
        return <div className="center">Silakan login untuk melihat blocked users</div>;
    }

    return (
        <div className="blocked-users-container" style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
            <div style={{ marginBottom: '24px' }}>
                <h2 style={{ margin: '0 0 8px 0' }}>🚫 Blocked Users</h2>
                <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
                    {totalCount} user yang di-block
                </p>
            </div>

            {loading && blockedUsers.length === 0 ? (
                <div className="center">Memuat...</div>
            ) : blockedUsers.length === 0 ? (
                <div className="center" style={{ padding: '40px 20px' }}>
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                        Belum ada user yang di-block
                    </p>
                </div>
            ) : (
                <>
                    <div className="blocked-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {blockedUsers.map(blockedUser => (
                            <div
                                key={blockedUser.id}
                                className="blocked-item"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '12px',
                                    background: 'var(--color-surface)',
                                    borderRadius: '12px',
                                    gap: '12px'
                                }}
                            >
                                <Link
                                    to={`/u/${blockedUser.username}`}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        flex: 1,
                                        textDecoration: 'none',
                                        color: 'inherit',
                                        minWidth: 0
                                    }}
                                >
                                    <div style={{ flexShrink: 0 }}>
                                        {blockedUser.avatarUrl ? (
                                            <img
                                                src={blockedUser.avatarUrl}
                                                alt={blockedUser.username}
                                                style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
                                            />
                                        ) : (
                                            <div
                                                className="avatar-placeholder"
                                                style={{ width: '48px', height: '48px', borderRadius: '50%' }}
                                            >
                                                {(blockedUser.displayName || blockedUser.username).charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: '600', fontSize: '15px' }}>
                                            {blockedUser.displayName || blockedUser.username}
                                        </div>
                                        <div style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                                            @{blockedUser.username}
                                        </div>
                                        <div style={{ color: 'var(--color-text-secondary)', fontSize: '12px', marginTop: '4px' }}>
                                            Diblokir {new Date(blockedUser.blockedAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                </Link>

                                <button
                                    className="profile-btn"
                                    onClick={() => handleUnblock(blockedUser.username)}
                                    disabled={unblockBusy[blockedUser.username]}
                                    style={{ flexShrink: 0 }}
                                >
                                    {unblockBusy[blockedUser.username] ? '...' : 'Unblock'}
                                </button>
                            </div>
                        ))}
                    </div>

                    {hasMore && (
                        <button
                            className="load-more-btn"
                            onClick={() => loadBlockedUsers(page + 1)}
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '12px',
                                marginTop: '16px',
                                background: 'transparent',
                                border: '1px solid var(--color-border)',
                                borderRadius: '8px',
                                color: 'var(--color-primary)',
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