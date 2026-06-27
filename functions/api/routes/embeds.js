// functions/api/routes/embeds.js
import { Hono } from 'hono';
import { authOptional } from '../middleware/auth.js';

const embedsApp = new Hono();

embedsApp.get('/preview', authOptional, async (c) => {
    const prisma = c.get('prisma');
    const urlString = c.req.query('url');

    if (!urlString) {
        return c.json({ error: 'URL query parameter is required' }, 400);
    }

    let url;
    try {
        url = new URL(urlString.trim());
    } catch (e) {
        return c.json({ error: 'Invalid URL format' }, 400);
    }

    const cleanUrl = url.toString();
    const domain = url.hostname;

    try {
        // 1. Cek cache database
        const cached = await prisma.embedCache.findUnique({
            where: { url: cleanUrl }
        });

        if (cached && new Date(cached.expiresAt) > new Date()) {
            return c.json({
                title: cached.metadata.title || cleanUrl,
                description: cached.metadata.description || '',
                domain: cached.metadata.domain || domain,
                thumbnail: cached.metadata.thumbnail || null
            });
        }

        // 2. Fetch HTML dari URL dengan timeout 5 detik
        let html = '';
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const res = await fetch(cleanUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; AnonimbuzBot/1.0; +https://anonimbuz.com)',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (res.ok) {
                html = await res.text();
            }
        } catch (fetchErr) {
            console.error('Fetch error for OpenGraph metadata:', fetchErr);
        }

        // 3. Ekstrak tag OpenGraph menggunakan Regex
        let title = '';
        let description = '';
        let thumbnail = '';

        if (html) {
            // Regex parsing
            const ogTitleRegex = /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i;
            const ogTitleRegexAlt = /<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:title["']/i;
            const titleTagRegex = /<title[^>]*>([^<]*)<\/title>/i;

            const ogTitleMatch = html.match(ogTitleRegex) || html.match(ogTitleRegexAlt);
            if (ogTitleMatch) {
                title = ogTitleMatch[1];
            } else {
                const titleTagMatch = html.match(titleTagRegex);
                title = titleTagMatch ? titleTagMatch[1] : '';
            }

            const ogDescRegex = /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i;
            const ogDescRegexAlt = /<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:description["']/i;
            const descNameRegex = /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i;
            const descNameRegexAlt = /<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i;

            const ogDescMatch = html.match(ogDescRegex) || html.match(ogDescRegexAlt) || html.match(descNameRegex) || html.match(descNameRegexAlt);
            description = ogDescMatch ? ogDescMatch[1] : '';

            const ogImageRegex = /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i;
            const ogImageRegexAlt = /<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:image["']/i;

            const ogImageMatch = html.match(ogImageRegex) || html.match(ogImageRegexAlt);
            thumbnail = ogImageMatch ? ogImageMatch[1] : '';

            // Clean up entities
            title = decodeHtmlEntities(title.trim());
            description = decodeHtmlEntities(description.trim());
            thumbnail = thumbnail.trim();
        }

        // Fallback title jika kosong
        if (!title) {
            title = cleanUrl;
        }

        const metadata = {
            title,
            description,
            domain,
            thumbnail: thumbnail || null
        };

        // 4. Update atau simpan cache (kadaluarsa 7 hari)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await prisma.embedCache.upsert({
            where: { url: cleanUrl },
            update: {
                type: 'link',
                metadata,
                expiresAt
            },
            create: {
                url: cleanUrl,
                type: 'link',
                metadata,
                expiresAt
            }
        });

        return c.json(metadata);
    } catch (error) {
        console.error('Error fetching/parsing OG tags:', error);
        return c.json({
            title: cleanUrl,
            description: '',
            domain,
            thumbnail: null
        });
    }
});

// Helper sederhana untuk decode HTML entities umum
function decodeHtmlEntities(str) {
    return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&rsquo;/g, "'")
        .replace(/&lsquo;/g, "'")
        .replace(/&ldquo;/g, '"')
        .replace(/&rdquo;/g, '"');
}

export default embedsApp;
