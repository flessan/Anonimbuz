import { Hono } from 'hono';
import { authRequired } from '../middleware/auth.js';

const bookmarksApp = new Hono();

// Helper untuk konversi post ke JSON
function anonymizePost(post, currentUserId) {
    if (!post) return null;
    const isMine = currentUserId ? String(post.authorId) === String(currentUserId) : false;

    return {
        _id: post.id,
        id: post.id,
        content: post.content,
        embedUrl: post.embedUrl || '',
        isAnonymous: post.isAnonymous,
        anonymousName: post.anonymousName || '',
        mood: post.mood || 'default',
        status: post.status,
        isEdited: post.isEdited,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        tags: post.tags || [],
        likes: (post.likedBy || []).map((u) => u.id),
        commentsCount: post._count?.comments || 0,
        isMine,
        isBookmarked: true, // Semua post di sini pasti sudah di-bookmark
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
}

// POST /posts/:id/bookmark - Bookmark post
bookmarksApp.post('/posts/:id/bookmark', authRequired, async (c) => {
    const prisma = c.get('prisma');
    const userId = c.get('userId');
    const postId = c.req.param('id');

    try {
        // Check if post exists
        const post = await prisma.post.findUnique({
            where: { id: postId, status: 'ACTIVE' }
        });
        if (!post) return c.json({ error: 'Post tidak ditemukan' }, 404);

        // Check if already bookmarked
        const existing = await prisma.bookmark.findUnique({
            where: { userId_postId: { userId, postId } }
        });

        if (existing) {
            return c.json({ error: 'Post sudah di-bookmark' }, 400);
        }

        // Create bookmark
        await prisma.bookmark.create({
            data: { userId, postId }
        });

        return c.json({ ok: true, message: 'Post berhasil di-bookmark' });
    } catch (error) {
        console.error('Error bookmarking post:', error);
        return c.json({ error: 'Gagal bookmark post' }, 500);
    }
});

// DELETE /posts/:id/bookmark - Remove bookmark
bookmarksApp.delete('/posts/:id/bookmark', authRequired, async (c) => {
    const prisma = c.get('prisma');
    const userId = c.get('userId');
    const postId = c.req.param('id');

    try {
        const bookmark = await prisma.bookmark.findUnique({
            where: { userId_postId: { userId, postId } }
        });

        if (!bookmark) {
            return c.json({ error: 'Bookmark tidak ditemukan' }, 404);
        }

        await prisma.bookmark.delete({
            where: { userId_postId: { userId, postId } }
        });

        return c.json({ ok: true, message: 'Bookmark berhasil dihapus' });
    } catch (error) {
        console.error('Error removing bookmark:', error);
        return c.json({ error: 'Gagal menghapus bookmark' }, 500);
    }
});

// GET /bookmarks - Get all bookmarked posts
bookmarksApp.get('/', authRequired, async (c) => {
    const prisma = c.get('prisma');
    const userId = c.get('userId');
    const page = Math.max(1, parseInt(c.req.query('page')) || 1);
    const limit = 20;

    try {
        const bookmarks = await prisma.bookmark.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                post: {
                    include: {
                        author: true,
                        tags: true,
                        likedBy: { select: { id: true } },
                        _count: { select: { comments: true } }
                    }
                }
            }
        });

        const posts = bookmarks
            .map(b => b.post)
            .filter(p => p && p.status === 'ACTIVE')
            .map(p => anonymizePost(p, userId));

        const totalCount = await prisma.bookmark.count({
            where: { userId }
        });

        return c.json({
            posts,
            totalCount,
            page,
            hasMore: bookmarks.length === limit
        });
    } catch (error) {
        console.error('Error fetching bookmarks:', error);
        return c.json({ error: 'Gagal memuat bookmarks' }, 500);
    }
});

export default bookmarksApp;