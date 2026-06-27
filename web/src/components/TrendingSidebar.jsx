// components/TrendingSidebar.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const CATEGORY_EMOJI = {
  genre: '🎭',
  character: '👤',
  artist: '🎨',
  group: '👥',
  language: '🌐',
  format: '📁',
};

export default function TrendingSidebar() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/tags/popular')
      .then((res) => {
        setTags((res.data.tags || []).slice(0, 10));
      })
      .catch(() => { /* silently ignore */ })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <aside className="trending-sidebar">
        <div className="trending-sidebar-title">🔥 Trending</div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="trending-tag-skeleton skeleton" />
        ))}
      </aside>
    );
  }

  if (!tags.length) return null;

  return (
    <aside className="trending-sidebar">
      <div className="trending-sidebar-title">🔥 Trending Tags</div>
      <div className="trending-tags-list">
        {tags.map((tag, idx) => (
          <Link
            key={tag.id}
            to={`/tag/${tag.slug}`}
            className="trending-tag-item"
          >
            <div className="trending-tag-rank">#{idx + 1}</div>
            <div className="trending-tag-info">
              <span className="trending-tag-name">
                {CATEGORY_EMOJI[tag.category] || '🏷️'} {tag.name}
              </span>
              <span className="trending-tag-count">{tag.usageCount} post</span>
            </div>
          </Link>
        ))}
      </div>
    </aside>
  );
}
