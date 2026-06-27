import React, { useState, useEffect } from 'react';

// Giphy API Key, Nitip sendals: https://developers.giphy.com/dashboard/)
const GIPHY_API_KEY = "4lG0jD6kfBaDIem4UFFJ7qcGV0eIMA5b";
const GIPHY_URL = 'https://api.giphy.com/v1/gifs';

export default function GifPicker({ onSelect, onClose }) {
    const [gifs, setGifs] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [trendingGifs, setTrendingGifs] = useState([]);

    // Load trending GIFs on mount
    useEffect(() => {
        loadTrendingGifs();
    }, []);

    async function loadTrendingGifs() {
        try {
            const res = await fetch(`${GIPHY_URL}/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g`);
            const data = await res.json();
            setTrendingGifs(data.data || []);
        } catch (err) {
            console.error('Failed to load trending GIFs:', err);
        }
    }

    async function searchGifs(query) {
        if (!query.trim()) return;

        setLoading(true);
        try {
            const res = await fetch(
                `${GIPHY_URL}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=20&rating=g`
            );
            const data = await res.json();
            setGifs(data.data || []);
        } catch (err) {
            console.error('Failed to search GIFs:', err);
        } finally {
            setLoading(false);
        }
    }

    function handleGifClick(gif) {
        // Ambil URL GIF (prioritas: original > downsized > preview)
        const gifUrl = gif.images?.downsized_medium?.url ||
            gif.images?.downsized?.url ||
            gif.images?.fixed_height?.url;

        onSelect(gifUrl);
    }

    return (
        <div className="fullscreen-modal gif-picker-modal" onClick={onClose}>
            <div className="modal-content gif-picker-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header gif-picker-header">
                    <h3 className="modal-header-title">Pilih GIF</h3>
                    <button onClick={onClose} className="modal-close-btn">×</button>
                </div>
                <div style={{ padding: '16px', borderBottom: 'var(--border-width) solid var(--color-border)' }}>
                    <input
                        type="text"
                        placeholder="Cari GIF..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && searchGifs(searchQuery)}
                        style={{ width: '100%' }}
                    />
                </div>

                {/* GIF Grid */}
                <div style={{
                    flex: 1,
                    overflow: 'auto',
                    padding: '16px'
                }}>
                    {loading ? (
                        <div className="center" style={{ padding: '40px' }}>
                            Memuat GIF...
                        </div>
                    ) : gifs.length > 0 ? (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                            gap: '12px'
                        }}>
                            {gifs.map((gif) => (
                                <div
                                    key={gif.id}
                                    onClick={() => handleGifClick(gif)}
                                    style={{
                                        cursor: 'pointer',
                                        borderRadius: '8px',
                                        overflow: 'hidden',
                                        background: 'var(--color-surface-2)',
                                        transition: 'transform 0.2s',
                                        ':hover': { transform: 'scale(1.05)' }
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    <img
                                        src={gif.images?.fixed_height?.url || gif.images?.preview_url}
                                        alt={gif.title}
                                        style={{
                                            width: '100%',
                                            height: 'auto',
                                            display: 'block'
                                        }}
                                        loading="lazy"
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div>
                            <h4 style={{ marginBottom: '12px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                                Trending GIFs
                            </h4>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                                gap: '12px'
                            }}>
                                {trendingGifs.map((gif) => (
                                    <div
                                        key={gif.id}
                                        onClick={() => handleGifClick(gif)}
                                        style={{
                                            cursor: 'pointer',
                                            borderRadius: '8px',
                                            overflow: 'hidden',
                                            background: 'var(--color-surface-2)',
                                            transition: 'transform 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        <img
                                            src={gif.images?.fixed_height?.url || gif.images?.preview_url}
                                            alt={gif.title}
                                            style={{
                                                width: '100%',
                                                height: 'auto',
                                                display: 'block'
                                            }}
                                            loading="lazy"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}