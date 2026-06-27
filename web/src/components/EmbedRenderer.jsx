import React, { useState, useEffect, useRef } from 'react';
import { getEmbedUrl, isDirectImage, isDirectVideo } from '../utils/embedParser.js';
import api from '../api';

export default function EmbedRenderer({ embed }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const embedRef = useRef(null);

    if (!embed || !embed.url) return null;

    // Direct image
    if (isDirectImage(embed.url)) {
        return (
            <div className="embed-container image-embed" onClick={(e) => e.stopPropagation()}>
                <img
                    src={embed.url}
                    alt="Embed"
                    loading="lazy"
                    onLoad={() => setLoading(false)}
                    onError={() => setError(true)}
                    style={{ display: error ? 'none' : 'block' }}
                />
                {error && (
                    <div className="embed-error">
                        Gagal memuat gambar
                    </div>
                )}
            </div>
        );
    }

    // Direct video
    if (isDirectVideo(embed.url)) {
        return (
            <div className="embed-container video-embed" onClick={(e) => e.stopPropagation()}>
                <video
                    src={embed.url}
                    controls
                    preload="metadata"
                    onLoadedData={() => setLoading(false)}
                    onError={() => setError(true)}
                />
                {error && (
                    <div className="embed-error">
                        Gagal memuat video
                    </div>
                )}
            </div>
        );
    }

    // Iframe embeds (YouTube, Spotify, dll)
    const embedUrl = getEmbedUrl(embed);
    if (embedUrl) {
        return (
            <div className="embed-container iframe-embed" onClick={(e) => e.stopPropagation()}>
                {loading && (
                    <div className="embed-loading">
                        Memuat embed...
                    </div>
                )}
                <iframe
                    src={embedUrl}
                    title={`${embed.type} embed`}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    onLoad={() => setLoading(false)}
                    onError={() => setError(true)}
                    style={{ display: error ? 'none' : 'block' }}
                    loading="lazy"
                />
                {error && (
                    <div className="embed-error">
                        Gagal memuat embed
                    </div>
                )}
            </div>
        );
    }

    // Rich link preview (default fallback)
    return (
        <RichLinkPreview url={embed.url} />
    );
}

function RichLinkPreview({ url }) {
    const [metadata, setMetadata] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!url) return;
        setLoading(true);
        api.get(`/embeds/preview?url=${encodeURIComponent(url)}`)
            .then((res) => {
                setMetadata({
                    title: res.data.title || url,
                    description: res.data.description || '',
                    domain: res.data.domain || new URL(url).hostname,
                    thumbnail: res.data.thumbnail || null
                });
            })
            .catch((err) => {
                console.error('Failed to load embed preview:', err);
                let domain;
                try {
                    domain = new URL(url).hostname;
                } catch (e) {
                    domain = url;
                }
                setMetadata({
                    title: url,
                    description: '',
                    domain,
                    thumbnail: null
                });
            })
            .finally(() => {
                setLoading(false);
            });
    }, [url]);

    if (loading) {
        return (
            <div className="embed-container link-embed loading">
                Memuat preview...
            </div>
        );
    }

    if (!metadata) {
        return null;
    }

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="embed-link-card"
            onClick={(e) => e.stopPropagation()}
        >
            {metadata.thumbnail && (
                <img src={metadata.thumbnail} alt="" className="embed-link-thumbnail" />
            )}
            <div className="embed-link-info">
                <span className="embed-link-title">{metadata.title}</span>
                {metadata.description && (
                    <span className="embed-link-description">{metadata.description}</span>
                )}
                <span className="embed-link-domain">🔗 {metadata.domain}</span>
            </div>
        </a>
    );
}