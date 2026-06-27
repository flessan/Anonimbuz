import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import PostCard from '../components/PostCard.jsx';
import BadgeRole from '../components/BadgeRole.jsx';
import { IconSearch } from '../components/Icons.jsx';

function PostSkeleton() {
  return (
    <>
      {[1, 2, 3].map((i) => (
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

function AccountSkeleton() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton-card" style={{ display: 'flex', alignItems: 'center', padding: '16px' }}>
          <div className="skeleton-avatar" style={{ width: '44px', height: '44px' }}></div>
          <div className="skeleton-body" style={{ gap: '6px' }}>
            <div className="skeleton-line short" style={{ height: '12px' }}></div>
            <div className="skeleton-line medium" style={{ height: '10px' }}></div>
          </div>
        </div>
      ))}
    </>
  );
}

function TagSkeleton() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: 16 }}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="skeleton-card" style={{ width: '100px', height: '36px', borderRadius: '18px', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="skeleton-line short" style={{ width: '100%', height: '10px' }}></div>
        </div>
      ))}
    </div>
  );
}

function TagItem({ tag }) {
  return (
    <Link to={`/tag/${tag.slug}`} className={`tag ${tag.category}`} style={{ padding: '8px 16px', fontSize: '13px' }}>
      #{tag.name} <span style={{ opacity: 0.6, fontSize: '11px', marginLeft: 4 }}>({tag.usageCount || 0})</span>
    </Link>
  );
}

function UserSearchResultItem({ user }) {
  const initial = (user.displayName || user.username || '?').charAt(0).toUpperCase();
  return (
    <Link to={`/u/${user.username}`} className="user-card">
      {user.avatarUrl ? (
        <img className="avatar-img" src={user.avatarUrl} alt={user.username} style={{ width: 44, height: 44 }} />
      ) : (
        <div className="avatar-placeholder" style={{ width: 44, height: 44, fontSize: '15px' }}>{initial}</div>
      )}
      <div className="user-card-info">
        <div className="user-card-name">
          {user.displayName || user.username}
          <BadgeRole role={user.role} />
        </div>
        <div className="user-card-username">@{user.username}</div>
        {user.bio && (
          <div className="muted" style={{ fontSize: '13px', marginTop: 4, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '300px' }}>
            {user.bio}
          </div>
        )}
      </div>
    </Link>
  );
}

export default function Explore() {
  const [popularTags, setPopularTags] = useState([]);
  const [query, setQuery] = useState('');
  const [activeChip, setActiveChip] = useState('trending'); // 'trending' | 'accounts' | 'tags'
  const [posts, setPosts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const searchTimeoutRef = useRef(null);
  const [hasMore, setHasMore] = useState(true); // Track if there's more data to load
  const [loadingMore, setLoadingMore] = useState(false); // Track loading More state

  // PERBAIKAN: Mengubah useState menjadi useRef sejati agar properti '.current' valid
  const isFetchingRef = useRef(false);

  const [lastIds, setLastIds] = useState({
    trending: null,
    accounts: null,
    tags: null
  });
  const limit = 10;
  const observerTargetRef = useRef(null); // Ref untuk Intersection Observer

  // Load popular tags on mount
  async function loadPopularTags() {
    try {
      const r = await api.get('/tags/popular');
      setPopularTags(r.data.tags || []);
    } catch (e) {
      console.error('Failed to load popular tags', e);
    }
  }

  // Execute search queries
  async function performSearch(searchTerm = query, filterType = activeChip) {
    setLoading(true);
    try {
      if (filterType === 'trending') {
        const params = { sort: 'engagement' };
        if (searchTerm.trim()) {
          params.search = searchTerm.trim();
        }
        const r = await api.get('/posts', { params });
        setPosts(r.data.posts || []);
      } else if (filterType === 'accounts') {
        const params = {};
        if (searchTerm.trim()) {
          // ✅ PERBAIKAN: Kirim 'q' bukan 'search'
          params.q = searchTerm.trim();
        }
        const r = await api.get('/users/search', { params });
        setAccounts(r.data.users || []);
      } else if (filterType === 'tags') {
        const params = {};
        if (searchTerm.trim()) {
          params.search = searchTerm.trim();
        }
        const r = await api.get('/tags', { params });
        setTags(r.data.tags || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      isFetchingRef.current = false;
    }
  }

  useEffect(() => {
    loadPopularTags();
    performSearch('', 'trending');
  }, []);

  // Handle query change with debouncing
  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(val, activeChip);
    }, 300);
  };

  // Handle active filter change
  const handleChipChange = (chip) => {
    setActiveChip(chip);
    performSearch(query, chip);
  };

  return (
    <div style={{ minHeight: '100%' }}>
      {/* Sticky Search bar wrapper */}
      <div className="explore-search-wrap">
        <div className="search-input-wrap">
          <IconSearch size={18} />
          <input
            className="search-input"
            type="text"
            placeholder="Cari postingan, username, tag..."
            value={query}
            onChange={handleQueryChange}
          />
        </div>

        {/* Popular Tags Horizontal Scroller */}
        {popularTags.length > 0 && !query && (
          <div className="explore-trending-tags">
            {popularTags.map((t) => (
              <Link
                key={t.id}
                to={`/tag/${t.slug}`}
                className={`tag ${t.category}`}
                style={{ whiteSpace: 'nowrap' }}
              >
                #{t.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Filter Chips */}
      <div className="explore-filter-chips">
        <button
          className={`filter-chip ${activeChip === 'trending' ? 'active' : ''}`}
          onClick={() => handleChipChange('trending')}
        >
          Trending
        </button>
        <button
          className={`filter-chip ${activeChip === 'accounts' ? 'active' : ''}`}
          onClick={() => handleChipChange('accounts')}
        >
          Akun
        </button>
        <button
          className={`filter-chip ${activeChip === 'tags' ? 'active' : ''}`}
          onClick={() => handleChipChange('tags')}
        >
          Tag
        </button>
      </div>

      {/* Search results container */}
      <div style={{ marginTop: 8 }}>
        {loading ? (
          activeChip === 'trending' ? <PostSkeleton /> :
          activeChip === 'accounts' ? <AccountSkeleton /> :
          <TagSkeleton />
        ) : activeChip === 'trending' ? (
          posts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <h3 className="empty-state-title">Postingan Tidak Ditemukan</h3>
              <p className="empty-state-text">Tidak ada postingan yang cocok dengan kata kunci "{query || 'trending'}".</p>
            </div>
          ) : (
            posts.map((p) => <PostCard key={p.id} post={p} onDeleted={() => performSearch(query, 'trending')} />)
          )
        ) : activeChip === 'accounts' ? (
          accounts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <h3 className="empty-state-title">Akun Tidak Ditemukan</h3>
              <p className="empty-state-text">Tidak ada akun pengguna yang cocok dengan kata kunci "{query}".</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {accounts.map((u) => (
                <UserSearchResultItem key={u.id} user={u} />
              ))}
            </div>
          )
        ) : activeChip === 'tags' ? (
          tags.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏷️</div>
              <h3 className="empty-state-title">Tag Tidak Ditemukan</h3>
              <p className="empty-state-text">Tidak ada tagar yang cocok dengan kata kunci "{query}".</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: 16 }}>
              {tags.map((t) => (
                <TagItem key={t.id} tag={t} />
              ))}
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}
