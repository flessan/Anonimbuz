// functions/api/routes/comments.js
import { Hono } from 'hono';
import { authRequired, authOptional } from '../middleware/auth.js';

const commentsApp = new Hono();

// Helper untuk konversi komentar ke JSON publik
function commentToJSON(comment, currentUserId) {
    if (!comment) return null;

    const isMine = currentUserId ? String(comment.authorId) === String(currentUserId) : false;

    return {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        deletedAt: comment.deletedAt,
        isMine,
        parentId: comment.parentId || null,
        author: {
            id: comment.author.id,
            username: comment.author.username,
            displayName: comment.author.displayName || comment.author.username,
            avatarUrl: comment.author.avatarUrl || ''
        }
    };
}

// GET /comments/user/:username - Semua komentar dari user tertentu
commentsApp.get('/user/:username', authOptional, async (c) => {
    const prisma = c.get('prisma');
    const username = c.req.param('username');

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return c.json({ error: 'User tidak ditemukan' }, 404);

    const comments = await prisma.comment.findMany({
        where: {
            authorId: user.id,
            deletedAt: null
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
            post: {
                include: {
                    author: true
                }
            },
            author: true // ✅ PENTING: Include author!
        }
    });

    return c.json({
        comments: comments.map(c => ({
            id: c.id,
            content: c.content,
            createdAt: c.createdAt,
            author: {
                id: c.author.id,
                username: c.author.username,
                displayName: c.author.displayName || c.author.username,
                avatarUrl: c.author.avatarUrl || ''
            },
            post: c.post ? {
                id: c.post.id,
                author: {
                    username: c.post.author?.username || 'unknown',
                    displayName: c.post.author?.displayName || c.post.author?.username || 'Unknown'
                }
            } : null
        }))
    });
});

export default commentsApp;