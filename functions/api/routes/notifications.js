// functions/api/routes/notifications.js
import { Hono } from 'hono';
import { authRequired } from '../middleware/auth.js';

const notificationsApp = new Hono();

// Helper untuk konversi notifikasi ke JSON publik
function notificationToJSON(notification) {
    if (!notification) return null;

    const sender = notification.sender;
    const post = notification.post;

    let message = '';
    let deepLink = '';

    switch (notification.type) {
        case 'LIKE':
            message = 'menyukai postingan Anda';
            deepLink = post ? `/p/${post.id}` : '';
            break;
        case 'COMMENT':
            message = 'mengomentari postingan Anda';
            deepLink = post ? `/p/${post.id}` : '';
            break;
        case 'FOLLOW':
            message = 'mulai mengikuti Anda';
            deepLink = sender ? `/u/${sender.username}` : '';
            break;
        case 'REPOST':
            message = 'membagikan ulang postingan Anda';
            deepLink = post ? `/p/${post.id}` : '';
            break;
        case 'QUOTE':
            message = 'mengutip postingan Anda';
            deepLink = post ? `/p/${post.id}` : '';
            break;
        case 'MENTION':
            message = 'menyebut Anda dalam postingan';
            deepLink = post ? `/p/${post.id}` : '';
            break;
        default:
            message = 'mengirimkan notifikasi';
    }

    return {
        id: notification.id,
        type: notification.type,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
        senderUsername: sender ? sender.username : null,
        senderAvatar: sender ? sender.avatarUrl : null,
        message,
        deepLink,
        isBroadcast: false,
        refMediaPreview: null,
        sender: sender ? {
            id: sender.id,
            username: sender.username,
            displayName: sender.displayName || sender.username,
            avatarUrl: sender.avatarUrl || ''
        } : null,
        post: post ? {
            id: post.id,
            content: post.content?.slice(0, 100) || '', // Batasi panjang konten
            isAnonymous: post.isAnonymous,
            status: post.status
        } : null
    };
}

// GET /notifications/unread-count - Jumlah notifikasi belum dibaca
notificationsApp.get('/unread-count', authRequired, async (c) => {
    const prisma = c.get('prisma');
    const userId = c.get('userId');

    try {
        const count = await prisma.notification.count({
            where: {
                receiverId: userId,
                isRead: false
            }
        });

        return c.json({ count, unreadCount: count });
    } catch (error) {
        console.error('Error fetching unread count:', error);
        return c.json({ error: 'Gagal memuat jumlah notifikasi' }, 500);
    }
});

// GET /notifications - List notifikasi dengan pagination
notificationsApp.get('/', authRequired, async (c) => {
    const prisma = c.get('prisma');
    const userId = c.get('userId');
    const page = Math.max(1, parseInt(c.req.query('page')) || 1);
    const limit = Math.min(50, parseInt(c.req.query('limit')) || 20); // Max 50 per page

    try {
        const notifications = await prisma.notification.findMany({
            where: { receiverId: userId },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                sender: true,
                post: {
                    select: {
                        id: true,
                        content: true,
                        isAnonymous: true,
                        status: true
                    }
                }
            }
        });

        // Mark semua notifikasi yang dimuat sebagai 'sudah dibaca'
        if (notifications.length > 0) {
            await prisma.notification.updateMany({
                where: {
                    receiverId: userId,
                    id: { in: notifications.map(n => n.id) }
                },
                data: { isRead: true }
            });
        }

        // Hitung total notifikasi untuk pagination
        const totalCount = await prisma.notification.count({
            where: { receiverId: userId }
        });

        return c.json({
            notifications: notifications.map(n => notificationToJSON(n)),
            page,
            limit,
            totalCount,
            hasMore: notifications.length === limit
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return c.json({ error: 'Gagal memuat notifikasi' }, 500);
    }
});

// POST & PATCH /notifications/read-all - Tandai semua notifikasi sebagai sudah dibaca
const markAllAsReadHandler = async (c) => {
    const prisma = c.get('prisma');
    const userId = c.get('userId');

    try {
        await prisma.notification.updateMany({
            where: {
                receiverId: userId,
                isRead: false
            },
            data: { isRead: true }
        });

        return c.json({ ok: true, message: 'Semua notifikasi ditandai sebagai sudah dibaca' });
    } catch (error) {
        console.error('Error marking all as read:', error);
        return c.json({ error: 'Gagal menandai notifikasi' }, 500);
    }
};

notificationsApp.post('/read-all', authRequired, markAllAsReadHandler);
notificationsApp.patch('/read-all', authRequired, markAllAsReadHandler);

// PATCH /notifications/:id/read - Tandai satu notifikasi sebagai sudah dibaca
notificationsApp.patch('/:id/read', authRequired, async (c) => {
    const prisma = c.get('prisma');
    const userId = c.get('userId');
    const notificationId = c.req.param('id');

    try {
        const notification = await prisma.notification.findUnique({
            where: { id: notificationId }
        });

        if (!notification) {
            return c.json({ error: 'Notifikasi tidak ditemukan' }, 404);
        }

        if (notification.receiverId !== userId) {
            return c.json({ error: 'Akses ditolak' }, 403);
        }

        await prisma.notification.update({
            where: { id: notificationId },
            data: { isRead: true }
        });

        return c.json({ ok: true, message: 'Notifikasi ditandai sebagai sudah dibaca' });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        return c.json({ error: 'Gagal mengubah status notifikasi' }, 500);
    }
});

// DELETE /notifications/:id - Hapus notifikasi tertentu
notificationsApp.delete('/:id', authRequired, async (c) => {
    const prisma = c.get('prisma');
    const userId = c.get('userId');
    const notificationId = c.req.param('id');

    try {
        const notification = await prisma.notification.findUnique({
            where: { id: notificationId }
        });

        if (!notification) {
            return c.json({ error: 'Notifikasi tidak ditemukan' }, 404);
        }

        if (notification.receiverId !== userId) {
            return c.json({ error: 'Akses ditolak' }, 403);
        }

        await prisma.notification.delete({
            where: { id: notificationId }
        });

        return c.json({ ok: true, message: 'Notifikasi berhasil dihapus' });
    } catch (error) {
        console.error('Error deleting notification:', error);
        return c.json({ error: 'Gagal menghapus notifikasi' }, 500);
    }
});

export default notificationsApp;