// web/src/components/AvatarStack.jsx
import React from 'react';
import { Link } from 'react-router-dom';

export default function AvatarStack({ followers, totalCount, username }) {
    // ✅ Defensive check
    if (!followers || !Array.isArray(followers) || followers.length === 0) {
        return null;
    }

    const displayFollowers = followers.slice(0, 5);
    const remainingCount = Math.max(0, totalCount - displayFollowers.length);

    return (
        <div className="avatar-stack-container">
            <div className="avatar-stack">
                {displayFollowers.map((follower, index) => {
                    // ✅ Safe access untuk follower data
                    const safeFollower = follower || {};
                    const displayName = safeFollower.displayName || safeFollower.username || 'User';

                    return (
                        <Link
                            key={safeFollower.id || index}
                            to={`/u/${safeFollower.username || 'unknown'}`}
                            className="avatar-stack-item"
                            style={{ zIndex: displayFollowers.length - index }}
                            title={displayName}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {safeFollower.avatarUrl ? (
                                <img
                                    src={safeFollower.avatarUrl}
                                    alt={safeFollower.username || 'user'}
                                    className="avatar-stack-img"
                                    onError={(e) => {
                                        // ✅ Fallback jika gambar gagal load
                                        e.target.style.display = 'none';
                                        e.target.nextSibling && (e.target.nextSibling.style.display = 'flex');
                                    }}
                                />
                            ) : null}
                            <div
                                className="avatar-stack-placeholder"
                                style={{ display: safeFollower.avatarUrl ? 'none' : 'flex' }}
                            >
                                {displayName.charAt(0).toUpperCase()}
                            </div>
                        </Link>
                    );
                })}

                {remainingCount > 0 && (
                    <Link
                        to={`/u/${username}/followers`}
                        className="avatar-stack-more"
                        onClick={(e) => e.stopPropagation()}
                    >
                        +{remainingCount}
                    </Link>
                )}
            </div>

            <Link
                to={`/u/${username}/followers`}
                className="avatar-stack-text"
                onClick={(e) => e.stopPropagation()}
            >
                Diikuti oleh {displayFollowers.map(f => f?.displayName || f?.username || 'User').join(', ')}
                {remainingCount > 0 && ` dan ${remainingCount} lainnya`}
            </Link>
        </div>
    );
}