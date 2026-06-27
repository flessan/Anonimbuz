// functions/api/routes/tags.js
import { Hono } from 'hono';
import { authRequired, authOptional } from '../middleware/auth.js';

const tagsApp = new Hono();

// Daftar kategori yang valid
const CATEGORIES = ['genre', 'character', 'artist', 'group', 'language', 'format'];

// Helper untuk slugify
function slugify(name) {
    return String(name)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// Helper untuk konversi post ke JSON publik (disederhanakan)
function anonymizePost(post, currentUserId) {
    if (!post) return null;
    const isMine = currentUserId ? String(post.authorId) === String(currentUserId) : false;

    const result = {
        _id: post.id,
        id: post.id,
        content: post.content,
        embedUrl: post.embedUrl || '',
        isAnonymous: post.isAnonymous,
        anonymousName: post.anonymousName || '',
        mood: post.mood || 'default',
        status: post.status,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        tags: post.tags || [],
        likes: (post.likedBy || []).map((u) => u.id),
        commentsCount: post._count?.comments || 0,
        isMine,
        author: post.isAnonymous ? {
            _id: 'anonim',
            id: 'anonim',
            username: 'anonim',
            displayName: post.anonymousName || 'Bisikan Misterius',
            avatarUrl: '',
            bio: 'Akun anonim di Anonimbuz.'
        } : {
            _id: post.author.id,
            id: post.author.id,
            username: post.author.username,
            displayName: post.author.displayName || post.author.username,
            avatarUrl: post.author.avatarUrl || '',
            bio: post.author.bio || ''
        }
    };

    if (post.quotedPost) {
        result.repostOf = anonymizePost(post.quotedPost, currentUserId);
    }

    return result;
}

// Helper untuk upsert tags
async function upsertTags(tagsList, prisma) {
    if (!Array.isArray(tagsList) || tagsList.length === 0) return [];
    const results = [];

    for (const it of tagsList) {
        const name = (it.name || '').trim();
        const category = it.category;
        if (!name || !category) continue;
        if (!CATEGORIES.includes(category)) continue;

        const slug = slugify(name);
        if (!slug) continue;

        let tag = await prisma.tag.findUnique({ where: { slug } });
        if (!tag) {
            tag = await prisma.tag.create({ data: { name, slug, category } });
        }
        results.push(tag);
    }
    return results;
}

// GET /tags/categories - Daftar kategori tag
tagsApp.get('/categories', (c) => {
    return c.json({ categories: CATEGORIES });
});

// GET /tags - List tags dengan filter
tagsApp.get('/', async (c) => {
    const prisma = c.get('prisma');
    const category = c.req.query('category');
    const search = c.req.query('search');

    const where = {};
    if (category) {
        if (!CATEGORIES.includes(category)) {
            return c.json({ error: 'Kategori tidak valid' }, 400);
        }
        where.category = category;
    }

    if (search) {
        where.name = { contains: search, mode: 'insensitive' };
    }

    const tags = await prisma.tag.findMany({
        where,
        orderBy: [
            { usageCount: 'desc' },
            { name: 'asc' }
        ],
        take: 50
    });

    return c.json({ tags });
});

// GET /tags/popular - Tags paling populer
tagsApp.get('/popular', async (c) => {
    const prisma = c.get('prisma');

    const tags = await prisma.tag.findMany({
        where: { usageCount: { gt: 0 } },
        orderBy: { usageCount: 'desc' },
        take: 30
    });

    return c.json({ tags });
});

// GET /tags/:slug - Posts dengan tag tertentu
tagsApp.get('/:slug', authOptional, async (c) => {
    const prisma = c.get('prisma');
    const currentUserId = c.get('userId');
    const slug = c.req.param('slug').toLowerCase();
    const page = Math.max(1, parseInt(c.req.query('page')) || 1);
    const limit = 20;
    const sort = c.req.query('sort');

    const tag = await prisma.tag.findUnique({ where: { slug } });
    if (!tag) return c.json({ error: 'Tag tidak ditemukan' }, 404);

    const posts = await prisma.post.findMany({
        where: {
            tags: { some: { id: tag.id } },
            status: 'ACTIVE',
            deletedAt: null
        },
        orderBy: sort === 'popular' ? [
            { likedBy: { _count: 'desc' } },
            { createdAt: 'desc' }
        ] : [
            { createdAt: 'desc' }
        ],
        skip: (page - 1) * limit,
        take: limit,
        include: {
            author: true,
            tags: true,
            likedBy: { select: { id: true } },
            _count: { select: { comments: true } }
        }
    });

    return c.json({
        tag,
        posts: posts.map(p => anonymizePost(p, currentUserId)),
        page
    });
});

// POST /tags - Buat tag baru
tagsApp.post('/', authRequired, async (c) => {
    const prisma = c.get('prisma');
    const { name, category } = await c.req.json();

    if (!name || !category) {
        return c.json({ error: 'Nama dan kategori wajib diisi' }, 400);
    }

    if (!CATEGORIES.includes(category)) {
        return c.json({ error: 'Kategori tidak valid' }, 400);
    }

    const tags = await upsertTags([{ name, category }], prisma);
    if (tags.length === 0) {
        return c.json({ error: 'Gagal membuat tag' }, 400);
    }

    return c.json({ tag: tags[0] }, 201);
});

export default tagsApp;