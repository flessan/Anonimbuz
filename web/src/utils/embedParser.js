// Utility untuk parse dan classify URLs untuk embed

const EMBED_PATTERNS = {
    youtube: /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i,
    spotify: /open\.spotify\.com\/(track|playlist|album|artist)\/([a-zA-Z0-9]+)/i,
    soundcloud: /soundcloud\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)/i,
    giphy: /giphy\.com\/gifs\/(?:[a-zA-Z0-9_-]+-)?([a-zA-Z0-9]+)/i,
    tenor: /tenor\.com\/(?:view|[a-zA-Z0-9_-]+)\/(?:[a-zA-Z0-9_-]+-)?([0-9]+)/i,
    twitter: /(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)\/status\/([0-9]+)/i,
    tiktok: /tiktok\.com\/@([a-zA-Z0-9_.]+)\/video\/([0-9]+)/i,
    instagram: /instagram\.com\/(?:p|reel)\/([a-zA-Z0-9_-]+)/i,
    facebook: /facebook\.com\/(?:[^\/]+\/videos|watch\/?\?v=|video\.php\?v=)\/?([0-9]+)/i
};

/**
 * Classify URL ke tipe embed
 * @param {string} url - URL untuk di-classify
 * @returns {Object} { type, id, metadata }
 */
export function classifyUrl(url) {
    if (!url) return null;

    for (const [type, pattern] of Object.entries(EMBED_PATTERNS)) {
        const match = url.match(pattern);
        if (match) {
            return {
                type,
                url,
                id: match[match.length - 1], // ID terakhir biasanya yang paling spesifik
                metadata: {}
            };
        }
    }

    // Default: rich link preview
    return {
        type: 'link',
        url,
        id: null,
        metadata: {}
    };
}

/**
 * Extract semua URLs dari text content
 * @param {string} text - Text content
 * @returns {Array<string>} Array of URLs
 */
export function extractUrls(text) {
    if (!text) return [];

    const urlRegex = /https?:\/\/[^\s<]+[^<.,:;"')\]\s]/g;
    const matches = text.match(urlRegex) || [];

    // Remove duplicates
    return [...new Set(matches)];
}

/**
 * Parse content dan extract embeds
 * @param {string} content - Post content
 * @returns {Array<Object>} Array of embed objects
 */
export function parseEmbeds(content) {
    const urls = extractUrls(content);
    return urls.map(url => classifyUrl(url)).filter(Boolean);
}

/**
 * Generate embed URL untuk iframe
 * @param {Object} embed - Embed object dari classifyUrl
 * @returns {string|null} Embed URL atau null jika tidak support iframe
 */
export function getEmbedUrl(embed) {
    if (!embed) return null;

    switch (embed.type) {
        case 'youtube':
            return `https://www.youtube.com/embed/${embed.id}`;

        case 'spotify':
            return `https://open.spotify.com/embed/${embed.metadata.type || 'track'}/${embed.id}`;

        case 'twitter':
            return null; // Twitter butuh special handling dengan oEmbed

        case 'tiktok':
            return null; // TikTok butuh special handling

        case 'instagram':
            return null; // Instagram butuh special handling

        default:
            return null;
    }
}

/**
 * Check apakah URL adalah direct image/GIF
 * @param {string} url - URL untuk di-check
 * @returns {boolean}
 */
export function isDirectImage(url) {
    if (!url) return false;
    return /\.(jpeg|jpg|gif|png|webp|svg)(?:\?.*)?$/i.test(url);
}

/**
 * Check apakah URL adalah direct video
 * @param {string} url - URL untuk di-check
 * @returns {boolean}
 */
export function isDirectVideo(url) {
    if (!url) return false;
    return /\.(mp4|webm|ogg)(?:\?.*)?$/i.test(url);
}