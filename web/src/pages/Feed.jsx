import React, { useEffect, useState, useRef } from 'react';
import api from '../api';
import { useAuth } from '../auth.jsx';
import { CreatePostBar } from '../components/Composer.jsx';
import PostCard from '../components/PostCard.jsx';
import OnboardingModal from '../components/OnboardingModal.jsx';

function SkeletonLoader() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-avatar"></div>
          <div className="skeleton-body">
            <div className="skeleton-line short"></div>
            <div className="skeleton-line medium"></div>
            <div className="skeleton-line long"></div>
            <div className="skeleton-line media"></div>
          </div>
        </div>
      ))}
    </>
  );
}

// Cache untuk menyimpan state feed per tab
const feedCache = {
  for_you: { posts: [], page: 1, hasMore: true, scrollY: 0 },
  following: { posts: [], page: 1, hasMore: true, scrollY: 0 },
};

export default function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('for_you');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (user && !localStorage.getItem('anonimbuz_onboarded')) {
      setShowOnboarding(true);
    }
  }, [user]);

  const bottomRef = useRef(null);
  const mountedRef = useRef(false);

  // ✅ 1. SAVE/LOAD CACHE
  function saveCacheFromState() {
    feedCache[activeTab] = {
      posts: posts,
      page: page,
      hasMore: hasMore,
      scrollY: window.scrollY,
    };
  }

  // ✅ 2. LOAD FEED FUNCTION
  async function loadFeed(pageNum = 1, append = false) {
    if (!append) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      // Pilih endpoint berdasarkan tab
      let endpoint = '/feed/recent'; // Default: recent posts

      if (activeTab === 'for_you') {
        endpoint = '/feed/for-you';
      } else if (activeTab === 'following' && user) {
        endpoint = '/posts/feed';
      }

      const res = await api.get(`${endpoint}?page=${pageNum}`);
      const fetchedPosts = res.data.posts || [];
      const fetchedHasMore = fetchedPosts.length === 20;

      if (append) {
        setPosts((prev) => [...prev, ...fetchedPosts]);
      } else {
        setPosts(fetchedPosts);
      }

      setPage(pageNum);
      setHasMore(fetchedHasMore);

      // Save to cache
      saveCacheFromState();
    } catch (err) {
      console.error('Failed to load feed:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  // ✅ 3. LOAD FROM CACHE ON MOUNT/TAB CHANGE
  useEffect(() => {
    const cached = feedCache[activeTab];

    if (cached && cached.posts.length > 0 && !mountedRef.current) {
      // Restore from cache
      setPosts(cached.posts);
      setPage(cached.page);
      setHasMore(cached.hasMore);
      setLoading(false);

      // Restore scroll position
      requestAnimationFrame(() => {
        window.scrollTo(0, cached.scrollY);
      });
    } else {
      // Load fresh data
      loadFeed(1, false);
    }

    mountedRef.current = true;
  }, [activeTab]);

  // ✅ 4. SAVE CACHE ON UNMOUNT/NAVIGATE
  useEffect(() => {
    const handleBeforeNavigate = () => {
      saveCacheFromState();
    };

    window.addEventListener('beforeunload', handleBeforeNavigate);

    // Intercept navigation
    const origPushState = history.pushState;
    const origReplaceState = history.replaceState;

    history.pushState = function (...args) {
      saveCacheFromState();
      return origPushState.apply(this, args);
    };

    history.replaceState = function (...args) {
      saveCacheFromState();
      return origReplaceState.apply(this, args);
    };

    return () => {
      saveCacheFromState();
      window.removeEventListener('beforeunload', handleBeforeNavigate);
      history.pushState = origPushState;
      history.replaceState = origReplaceState;
    };
  }, [activeTab, posts, page, hasMore]);

  // ✅ 5. EVENT LISTENER UNTUK REAL-TIME POST (HANYA 1x)
  useEffect(() => {
    const handleNewPostCreated = (e) => {
      const newPost = e.detail;
      if (newPost && activeTab === 'for_you') {
        setPosts((prev) => {
          const updated = [newPost, ...prev];
          feedCache[activeTab].posts = updated;
          return updated;
        });
      }
    };

    window.addEventListener('new-post-created', handleNewPostCreated);
    return () => window.removeEventListener('new-post-created', handleNewPostCreated);
  }, [activeTab]);

  // ✅ 6. INFINITE SCROLL OBSERVER
  useEffect(() => {
    if (!bottomRef.current || loading || loadingMore || !hasMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loading && !loadingMore) {
          loadFeed(page + 1, true);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(bottomRef.current);
    return () => observer.disconnect();
  }, [bottomRef.current, hasMore, loading, loadingMore, page]);

  // ✅ 7. TAB CLICK HANDLER
  const handleTabClick = (tab) => {
    if (activeTab === tab) {
      // Click tab yang sama = refresh
      window.scrollTo({ top: 0, behavior: 'smooth' });
      feedCache[tab] = { posts: [], page: 1, hasMore: true, scrollY: 0 };
      loadFeed(1, false);
    } else {
      // Ganti tab
      saveCacheFromState();
      mountedRef.current = false;
      setActiveTab(tab);
    }
  };

  // ✅ 8. POST DELETE HANDLER
  const handlePostDeleted = (id) => {
    setPosts((prev) => {
      const filtered = prev.filter((p) => p.id !== id);
      feedCache[activeTab].posts = filtered;
      return filtered;
    });
  };

  return (
    <div style={{ minHeight: '100%' }}>

      {/* Tab Navigation */}
      <div className="feed-tabs">
        <button
          className={`feed-tab ${activeTab === 'for_you' ? 'active' : ''}`}
          onClick={() => handleTabClick('for_you')}
        >
          Untuk Kamu
        </button>
        {user && (
          <button
            className={`feed-tab ${activeTab === 'following' ? 'active' : ''}`}
            onClick={() => handleTabClick('following')}
          >
            Mengikuti
          </button>
        )}
      </div>

      {/* Create Post Bar */}
      {user && <CreatePostBar />}

      {/* Feed Content */}
      {loading ? (
        <SkeletonLoader />
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <h3 className="empty-state-title">Belum Ada Postingan</h3>
          <p className="empty-state-text">
            {activeTab === 'following'
              ? 'Anda belum mengikuti siapa pun. Jelajahi dan ikuti user lain untuk mengisi Feed Anda!'
              : 'Belum ada postingan di platform ini. Jadilah yang pertama memposting cerita menarik!'}
          </p>
          {activeTab === 'following' ? (
            <Link to="/explore" className="profile-btn primary">
              Jelajahi Pengguna
            </Link>
          ) : (
            <button className="profile-btn primary" onClick={() => window.dispatchEvent(new CustomEvent('open-composer-modal'))}>
              Buat Post Pertama
            </button>
          )}
        </div>
      ) : (
        <div className="feed-list">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} onDeleted={handlePostDeleted} />
          ))}
        </div>
      )}

      {/* Infinite Scroll Trigger */}
      {hasMore && !loading && (
        <div ref={bottomRef} style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {loadingMore && <div className="muted" style={{ fontSize: '14px' }}>Memuat lebih banyak...</div>}
        </div>
      )}

      {/* End of feed message */}
      {!hasMore && posts.length > 0 && (
        <div className="center" style={{ padding: '20px', color: 'var(--color-text-secondary)' }}>
          Anda telah mencapai akhir feed
        </div>
      )}

      {/* Onboarding Modal Wizard */}
      {showOnboarding && (
        <OnboardingModal user={user} onClose={() => setShowOnboarding(false)} />
      )}
    </div>
  );
}