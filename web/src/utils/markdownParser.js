import { marked } from 'marked';
import DOMPurify from 'dompurify';

// ─── Lazy-load highlight.js from CDN ─────────────────────────────────────────
let hljs = null;
let hljsLoading = false;
let hljsLoaded = false;

function loadHighlightJS() {
    if (hljsLoaded || hljsLoading) return;
    hljsLoading = true;

    // Load CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css';
    link.id = 'hljs-css';
    document.head.appendChild(link);

    // Load JS
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js';
    script.onload = () => {
        hljs = window.hljs;
        hljsLoaded = true;
        hljsLoading = false;
    };
    document.head.appendChild(script);
}

// Configure marked with a custom code renderer
const renderer = new marked.Renderer();
renderer.code = ({ text, lang }) => {
    const validLang = lang && hljs?.getLanguage(lang) ? lang : null;
    const highlighted = validLang
        ? hljs.highlight(text, { language: validLang }).value
        : (hljs ? hljs.highlightAuto(text).value : escapeHtml(text));
    const langLabel = lang ? `<span class="code-lang-label">${escapeHtml(lang)}</span>` : '';
    return `<div class="code-block-wrapper">${langLabel}<pre><code class="hljs${validLang ? ` language-${validLang}` : ''}">${highlighted}</code></pre></div>`;
};

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Configure marked
marked.setOptions({
    breaks: true,
    gfm: true,
    sanitize: false, // Kita pakai DOMPurify
    headerIds: false,
    mangle: false,
    renderer,
});

export function parseMarkdown(text) {
    if (!text) return '';

    // Trigger hljs load if content has code blocks
    if (text.includes('```') && !hljsLoaded) {
        loadHighlightJS();
    }

    try {
        let html = marked.parse(text);

        // Sanitize untuk cegah XSS — allow hljs classes and code blocks
        html = DOMPurify.sanitize(html, {
            ALLOWED_TAGS: [
                'p', 'br', 'strong', 'b', 'em', 'i', 'u',
                'code', 'pre', 'blockquote', 'a', 'img',
                'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                'span', 'div'
            ],
            ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title', 'class'],
            ADD_ATTR: ['target'],
        });

        // Auto-add target="_blank" untuk external links
        html = html.replace(
            /<a href="(https?:\/\/[^"]+)"/g,
            '<a href="$1" target="_blank" rel="noopener noreferrer"'
        );

        return html;
    } catch (error) {
        console.error('Markdown parse error:', error);
        return text;
    }
}

export function parseMentionsAndHashtags(text) {
    if (!text) return '';

    // Split on HTML tags so we only process text nodes, not attributes
    return text.replace(/(<[^>]+>)|(@([a-zA-Z0-9_]+))|(#([a-zA-Z0-9_]+))/g, (match, tag, mention, mentionName, hashtag, hashtagName) => {
        if (tag) return tag; // Keep HTML tags unchanged
        if (mention) return `<a href="/u/${mentionName}" class="mention" data-username="${mentionName}">@${mentionName}</a>`;
        if (hashtag) return `<a href="/tag/${hashtagName}" class="hashtag" data-tag="${hashtagName}">#${hashtagName}</a>`;
        return match;
    });
}

export function parsePostContent(text) {
    if (!text) return '';
    let html = parseMarkdown(text);
    html = parseMentionsAndHashtags(html);
    return html;
}
