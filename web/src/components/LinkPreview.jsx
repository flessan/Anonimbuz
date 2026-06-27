import React, { useEffect, useState } from 'react';
import api from '../api';

// Extracts the first URL found in a post's text content
export function extractFirstUrl(text) {
  if (!text) return null;
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
  const matches = text.match(urlRegex);
  if (!matches) return null;
  // Filter out image links (gif, png, jpg, webp) — those are handled by LazyImage
  return matches.find(u => !/\.(gif|png|jpg|jpeg|webp|svg)(\?.*)?$/i.test(u)) || null;
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

export default function LinkPreview({ url }) {
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    setMeta(null);

    api.get(`/embed/preview?url=${encodeURIComponent(url)}`)
      .then(res => {
        if (!cancelled && res.data?.title) {
          // Backend returns { title, description, domain, thumbnail }
          setMeta({
            title: res.data.title,
            description: res.data.description || '',
            image: res.data.thumbnail || null,
            siteName: res.data.domain || null,
          });
        } else if (!cancelled) {
          setFailed(true);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [url]);

  if (loading || failed || !meta) return null;

  const { title, description, image, siteName } = meta;
  if (!title && !description) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="link-preview-card"
      onClick={e => e.stopPropagation()}
    >
      {image && (
        <img
          src={image}
          alt={title || 'Link preview'}
          className="link-preview-image"
          onError={e => { e.currentTarget.style.display = 'none'; }}
        />
      )}
      <div className="link-preview-body">
        <div className="link-preview-domain">{siteName || getDomain(url)}</div>
        {title && <div className="link-preview-title">{title}</div>}
        {description && <div className="link-preview-desc">{description}</div>}
      </div>
    </a>
  );
}
