import { Hono } from 'hono';
import { authRequired } from '../middleware/auth.js';

const blocksApp = new Hono();

// POST /users/:username/block - Block user
blocksApp.post('/users/:username/block', authRequired, async (c) => {
    const prisma = c.get('prisma');
    const userId = c.get('userId');
    const targetUsername = c.req.param('username');

    try {
        const target = await prisma.user.findUnique({ where: { username: targetUsername } });
        if (!target) return c.json({ error: 'User tidak ditemukan' }, 404);
        if (target.id === userId) return c.json({ error: 'Tidak bisa block diri sendiri' }, 400);

        // Check if already blocked
        const existing = await prisma.block.findUnique({
            where: { blockerId_blockedId: { blockerId: userId, blockedId: target.id } }
        });

        if (existing) {
            return c.json({ error: 'User sudah di-block' }, 400);
        }

        // Create block
        await prisma.block.create({
            data: { blockerId: userId, blockedId: target.id }
        });

        // Optional: Auto unfollow jika sedang follow
        await prisma.follow.deleteMany({
            where: {
                OR: [
                    { followerId: userId, followingId: target.id },
                    { followerId: target.id, followingId: userId }
                ]
            }
        });

        return c.json({ ok: true, message: 'User berhasil di-block' });
    } catch (error) {
        console.error('Error blocking user:', error);
        return c.json({ error: 'Gagal block user' }, 500);
    }
});

// DELETE /users/:username/block - Unblock user
blocksApp.delete('/users/:username/block', authRequired, async (c) => {
    const prisma = c.get('prisma');
    const userId = c.get('userId');
    const targetUsername = c.req.param('username');

    try {
        const target = await prisma.user.findUnique({ where: { username: targetUsername } });
        if (!target) return c.json({ error: 'User tidak ditemukan' }, 404);

        await prisma.block.deleteMany({
            where: { blockerId: userId, blockedId: target.id }
        });

        return c.json({ ok: true, message: 'User berhasil di-unblock' });
    } catch (error) {
        console.error('Error unblocking user:', error);
        return c.json({ error: 'Gagal unblock user' }, 500);
    }
});

// GET /blocks - Get list of blocked users
blocksApp.get('/', authRequired, async (c) => {
    const prisma = c.get('prisma');
    const userId = c.get('userId');
    const page = Math.max(1, parseInt(c.req.query('page')) || 1);
    const limit = 20;

    try {
        const blocks = await prisma.block.findMany({
            where: { blockerId: userId },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                blocked: {
                    include: {
                        _count: { select: { followers: true, following: true } }
                    }
                }
            }
        });

        const blockedUsers = blocks.map(b => ({
            id: b.blocked.id,
            username: b.blocked.username,
            displayName: b.blocked.displayName || b.blocked.username,
            avatarUrl: b.blocked.avatarUrl || '',
            bio: b.blocked.bio || '',
            followersCount: b.blocked._count?.followers || 0,
            followingCount: b.blocked._count?.following || 0,
            blockedAt: b.createdAt
        }));

        const totalCount = await prisma.block.count({
            where: { blockerId: userId }
        });

        return c.json({
            blockedUsers,
            totalCount,
            page,
            hasMore: blocks.length === limit
        });
    } catch (error) {
        console.error('Error fetching blocks:', error);
        return c.json({ error: 'Gagal memuat blocked users' }, 500);
    }
});

export default blocksApp;