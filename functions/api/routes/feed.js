// functions/api/routes/feed.js
import { Hono } from 'hono';
import { authOptional } from '../middleware/auth.js';

const feedApp = new Hono();

// Helper untuk konversi post ke JSON publik (copy dari posts.js)
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

    // Handle poll
    if (post.poll) {
        const totalVotes = post.poll.options.reduce((sum, opt) => sum + (opt.votes ? opt.votes.length : 0), 0);
        const hasVoted = currentUserId ? post.poll.options.some(opt => opt.votes && opt.votes.some(v => String(v.userId) === String(currentUserId))) : false;
        const userVoteOptionId = currentUserId ? post.poll.options.find(opt => opt.votes && opt.votes.some(v => String(v.userId) === String(currentUserId)))?.id : null;

        result.poll = {
            id: post.poll.id,
            question: post.poll.question,
            expiresAt: post.poll.expiresAt,
            isExpired: new Date(post.poll.expiresAt) < new Date(),
            hasVoted,
            userVoteOptionId,
            totalVotes,
            options: post.poll.options.map(opt => ({
                id: opt.id,
                text: opt.text,
                votesCount: opt.votes ? opt.votes.length : 0
            }))
        };
    } else {
        result.poll = null;
    }

    // Handle reactions
    if (post.reactions && post.reactions.length > 0) {
        const counts = {};
        post.reactions.forEach(r => {
            counts[r.emoji] = (counts[r.emoji] || 0) + 1;
        });
        const userReaction = currentUserId ? post.reactions.find(r => String(r.userId) === String(currentUserId))?.emoji : null;

        result.reactions = Object.entries(counts).map(([emoji, count]) => ({
            emoji,
            count
        }));
        result.userReaction = userReaction;
    } else {
        result.reactions = [];
        result.userReaction = null;
    }

    if (post.quotedPost) {
        result.repostOf = anonymizePost(post.quotedPost, currentUserId);
    }

    return result;
}

// GET /recent - Feed global terbaru
feedApp.get('/recent', authOptional, async (c) => {
    const prisma = c.get('prisma');
    const currentUserId = c.get('userId');
    const page = Math.max(1, parseInt(c.req.query('page')) || 1);
    const limit = Math.min(50, parseInt(c.req.query('limit')) || 20);

    try {
        const posts = await prisma.post.findMany({
            where: { status: 'ACTIVE', deletedAt: null },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                author: true,
                tags: true,
                likedBy: { select: { id: true } },
                _count: { select: { comments: true } },
                poll: {
                    include: {
                        options: {
                            include: {
                                votes: true
                            }
                        }
                    }
                },
                reactions: true,
                quotedPost: {
                    include: {
                        author: true,
                        tags: true,
                        likedBy: { select: { id: true } },
                        _count: { select: { comments: true } },
                        poll: {
                            include: {
                                options: {
                                    include: {
                                        votes: true
                                    }
                                }
                            }
                        },
                        reactions: true
                    }
                }
            }
        });

        return c.json({
            posts: posts.map(p => anonymizePost(p, currentUserId)),
            page,
            hasMore: posts.length === limit
        });
    } catch (error) {
        console.error('Error fetching recent feed:', error);
        return c.json({ error: 'Gagal memuat feed recent' }, 500);
    }
});

// GET /for-you - Feed "For You"
feedApp.get('/for-you', authOptional, async (c) => {
    const prisma = c.get('prisma');
    const currentUserId = c.get('userId');
    const page = Math.max(1, parseInt(c.req.query('page')) || 1);
    const limit = Math.min(50, parseInt(c.req.query('limit')) || 20);

    try {
        const posts = await prisma.post.findMany({
            where: { status: 'ACTIVE', deletedAt: null },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                author: true,
                tags: true,
                likedBy: { select: { id: true } },
                _count: { select: { comments: true } },
                poll: {
                    include: {
                        options: {
                            include: {
                                votes: true
                            }
                        }
                    }
                },
                reactions: true
            }
        });

        return c.json({
            posts: posts.map(p => anonymizePost(p, currentUserId)),
            page,
            hasMore: posts.length === limit
        });
    } catch (error) {
        console.error('Error fetching for-you feed:', error);
        return c.json({ error: 'Gagal memuat feed for-you' }, 500);
    }
});

export default feedApp;