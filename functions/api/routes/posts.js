// functions/api/routes/posts.js
import { Hono } from 'hono';
import { authRequired, authOptional } from '../middleware/auth.js';

const postsApp = new Hono();

// Pseudonyms untuk post anonim
const ANONYMOUS_PSEUDONYMS = [
    'Pena Misterius', 'Siluet Malam', 'Penjelajah Sunyi', 'Gema Angin', 'Bayang Senja',
    'Bisikan Malam', 'Pembaca Sandi', 'Pemikir Bebas', 'Arwah Digital', 'Kabut Pagi'
];

// Helper untuk konversi post ke JSON publik (dengan anonymization)
function anonymizePost(post, currentUserId) {
    if (!post) return null;
    const isMine = currentUserId ? String(post.authorId) === String(currentUserId) : false;

    // ✅ TAMBAHKAN FALLBACK AUTHOR jika post.author undefined
    const fallbackAuthor = {
        id: 'unknown',
        username: 'unknown',
        displayName: 'User Tidak Dikenal',
        avatarUrl: '',
        bio: ''
    };

    const authorData = post.author || fallbackAuthor;

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
        isPinned: post.isPinned || false,
        // ✅ Gunakan authorData yang sudah di-fallback
        author: post.isAnonymous ? {
            _id: 'anonim',
            id: 'anonim',
            username: 'anonim',
            displayName: post.anonymousName || 'Bisikan Misterius',
            avatarUrl: '',
            bio: 'Akun anonim di Anonimbuz.'
        } : {
            _id: authorData.id,
            id: authorData.id,
            username: authorData.username,
            displayName: authorData.displayName || authorData.username,
            avatarUrl: authorData.avatarUrl || '',
            bio: authorData.bio || ''
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

    // ✅ Handle quoted post dengan null check
    if (post.quotedPost) {
        // Cek apakah quotedPost masih valid (punya author)
        if (post.quotedPost.author || post.quotedPost.isAnonymous) {
            result.repostOf = anonymizePost(post.quotedPost, currentUserId);
        } else {
            // Quoted post sudah dihapus atau author hilang
            result.repostOf = {
                id: post.quotedPost.id,
                status: 'DELETED',
                content: '',
                author: fallbackAuthor
            };
        }
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

        const slug = String(name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        if (!slug) continue;

        let tag = await prisma.tag.findUnique({ where: { slug } });
        if (!tag) {
            tag = await prisma.tag.create({ data: { name, slug, category } });
        }
        results.push(tag);
    }
    return results;
}

// Helper untuk validasi Turnstile
async function verifyTurnstile(turnstileToken, clientIp, env) {
    if (!turnstileToken) {
        return { success: false, error: 'Verifikasi keamanan (Turnstile) diperlukan.' };
    }

    try {
        const formData = new FormData();
        formData.append('secret', env.TURNSTILE_SECRET_KEY);
        formData.append('response', turnstileToken);
        formData.append('remoteip', clientIp);

        const turnstileResult = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            body: formData,
            method: 'POST',
        });

        const outcome = await turnstileResult.json();

        if (!outcome.success) {
            return {
                success: false,
                error: 'Verifikasi Turnstile gagal.',
                turnstileErrors: outcome['error-codes']
            };
        }

        return { success: true };
    } catch (err) {
        return { success: false, error: 'Gagal memverifikasi sistem keamanan.' };
    }
}

// Helper untuk include relations yang lengkap
function getPostIncludes() {
    return {
        author: true,
        tags: true,
        likedBy: { select: { id: true } },
        _count: { select: { comments: true } },
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
    };
}

// POST /posts - Buat post baru
postsApp.post('/', authRequired, async (c) => {
    const prisma = c.get('prisma');
    const userId = c.get('userId');
    const bodyData = await c.req.json().catch(() => ({}));
    const { content, embedUrl, isAnonymous, mood, turnstileToken, tags, poll } = bodyData;
    const clientIp = c.req.header('CF-Connecting-IP') || 'unknown';

    // Validasi Turnstile
    const turnstileCheck = await verifyTurnstile(turnstileToken, clientIp, c.env);
    if (!turnstileCheck.success) {
        return c.json({ error: turnstileCheck.error, turnstileErrors: turnstileCheck.turnstileErrors }, 403);
    }

    // Validasi konten
    if (!content || !content.trim()) {
        return c.json({ error: 'Konten tidak boleh kosong' }, 400);
    }
    if (content.length > 2000) {
        return c.json({ error: 'Konten maksimal 2000 karakter' }, 400);
    }

    // Validasi embedUrl
    if (embedUrl && !/^https?:\/\//i.test(embedUrl)) {
        return c.json({ error: 'URL embed tidak valid' }, 400);
    }

    const tagDocs = Array.isArray(tags) ? await upsertTags(tags, prisma) : [];
    const anonName = isAnonymous
        ? ANONYMOUS_PSEUDONYMS[Math.floor(Math.random() * ANONYMOUS_PSEUDONYMS.length)]
        : '';

    let pollData = undefined;
    if (poll && Array.isArray(poll.options) && poll.options.length >= 2) {
        const durationDays = parseInt(poll.durationDays) || 1;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + durationDays);

        pollData = {
            create: {
                question: poll.question || null,
                expiresAt,
                options: {
                    create: poll.options.filter(o => o.trim()).map(o => ({ text: o.trim() }))
                }
            }
        };
    }

    const post = await prisma.post.create({
        data: {
            authorId: userId,
            content: content.trim(),
            embedUrl: embedUrl || '',
            isAnonymous: !!isAnonymous,
            anonymousName: anonName,
            mood: mood || 'default',
            tags: { connect: tagDocs.map((t) => ({ id: t.id })) },
            poll: pollData
        },
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

    if (tagDocs.length > 0) {
        await prisma.tag.updateMany({
            where: { id: { in: tagDocs.map((t) => t.id) } },
            data: { usageCount: { increment: 1 } }
        });
    }

    // --- Streak Logic ---
    try {
        const userRec = await prisma.user.findUnique({ where: { id: userId } });
        if (userRec) {
            const today = new Date();
            const lastPost = userRec.lastPostDate ? new Date(userRec.lastPostDate) : null;
            
            let newStreak = userRec.currentStreak;
            let newLongest = userRec.longestStreak;
            
            if (!lastPost) {
                newStreak = 1;
                newLongest = Math.max(1, newLongest);
            } else {
                const todayStr = today.toISOString().split('T')[0];
                const lastPostStr = lastPost.toISOString().split('T')[0];
                
                if (todayStr !== lastPostStr) {
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toISOString().split('T')[0];
                    
                    if (lastPostStr === yesterdayStr) {
                        newStreak += 1;
                    } else {
                        newStreak = 1;
                    }
                    newLongest = Math.max(newStreak, newLongest);
                }
            }
            
            await prisma.user.update({
                where: { id: userId },
                data: {
                    currentStreak: newStreak,
                    longestStreak: newLongest,
                    lastPostDate: today
                }
            });
        }
    } catch (streakErr) {
        console.error('Streak update error:', streakErr);
    }

    return c.json({ post: anonymizePost(post, userId) }, 201);
});

// POST /posts/:id/quote - Quote post (kutip dengan komentar)
postsApp.post('/:id/quote', authRequired, async (c) => {
    const prisma = c.get('prisma');
    const userId = c.get('userId');
    const originalPostId = c.req.param('id');
    const { content, isAnonymous, mood } = await c.req.json();

    // Validasi konten
    if (!content || !content.trim()) {
        return c.json({ error: 'Konten kutipan tidak boleh kosong' }, 400);
    }
    if (content.length > 2000) {
        return c.json({ error: 'Konten maksimal 2000 karakter' }, 400);
    }

    // Cek post asli
    const originalPost = await prisma.post.findUnique({
        where: { id: originalPostId, status: 'ACTIVE' },
        include: { author: true }
    });

    if (!originalPost) {
        return c.json({ error: 'Post asli tidak ditemukan atau sudah dihapus' }, 404);
    }

    const anonName = isAnonymous
        ? ANONYMOUS_PSEUDONYMS[Math.floor(Math.random() * ANONYMOUS_PSEUDONYMS.length)]
        : '';

    // Buat post kutipan
    const quotedPost = await prisma.post.create({
        data: {
            authorId: userId,
            content: content.trim(),
            quotedPostId: originalPostId,
            isAnonymous: !!isAnonymous,
            anonymousName: anonName,
            mood: mood || 'default'
        },
        include: {
            author: true,
            tags: true,
            likedBy: { select: { id: true } },
            _count: { select: { comments: true } },
            quotedPost: {
                include: {
                    author: true,
                    tags: true,
                    likedBy: { select: { id: true } },
                    _count: { select: { comments: true } }
                }
            }
        }
    });

    // Kirim notifikasi ke pemilik post asli (kecuali anonim)
    if (originalPost.authorId !== userId && !originalPost.isAnonymous) {
        await prisma.notification.create({
            data: {
                type: 'QUOTE',
                senderId: userId,
                receiverId: originalPost.authorId,
                postId: quotedPost.id
            }
        });
    }

    return c.json({ post: anonymizePost(quotedPost, userId) }, 201);
});

// POST /posts/:id/repost - Repost biasa
postsApp.post('/:id/repost', authRequired, async (c) => {
    const prisma = c.get('prisma');
    const postId = c.req.param('id');
    const userId = c.get('userId');

    const post = await prisma.post.findUnique({ where: { id: postId, status: 'ACTIVE' } });
    if (!post) return c.json({ error: 'Post tidak ditemukan' }, 404);

    const existing = await prisma.repost.findUnique({ where: { userId_postId: { userId, postId } } });

    if (existing) {
        await prisma.repost.delete({ where: { userId_postId: { userId, postId } } });
        return c.json({ ok: true, reposted: false, message: 'Repost dibatalkan' });
    }

    await prisma.repost.create({ data: { userId, postId } });

    if (post.authorId !== userId) {
        await prisma.notification.create({
            data: { type: 'REPOST', senderId: userId, receiverId: post.authorId, postId }
        });
    }

    return c.json({ ok: true, reposted: true, message: 'Berhasil repost' });
});

// POST /posts/:id/like - Like post
postsApp.post('/:id/like', authRequired, async (c) => {
    const prisma = c.get('prisma');
    const userId = c.get('userId');
    const postId = c.req.param('id');

    const post = await prisma.post.findUnique({ where: { id: postId, status: 'ACTIVE' } });
    if (!post) return c.json({ error: 'Post tidak ditemukan' }, 404);

    const alreadyLiked = await prisma.post.findFirst({
        where: { id: postId, likedBy: { some: { id: userId } } }
    });

    if (!alreadyLiked) {
        await prisma.post.update({
            where: { id: postId },
            data: { likedBy: { connect: { id: userId } } }
        });

        if (post.authorId !== userId) {
            await prisma.notification.create({
                data: { type: 'LIKE', senderId: userId, receiverId: post.authorId, postId }
            });
        }
    }

    return c.json({ ok: true });
});

// DELETE /posts/:id/like - Unlike post
postsApp.delete('/:id/like', authRequired, async (c) => {
    const prisma = c.get('prisma');
    const userId = c.get('userId');
    const postId = c.req.param('id');

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) return c.json({ error: 'Post tidak ditemukan' }, 404);

    await prisma.post.update({
        where: { id: postId },
        data: { likedBy: { disconnect: { id: userId } } }
    });

    return c.json({ ok: true });
});

// DELETE /posts/:id - Hapus post sendiri
postsApp.delete('/:id', authRequired, async (c) => {
    const prisma = c.get('prisma');
    const userId = c.get('userId');
    const postId = c.req.param('id');

    const post = await prisma.post.findUnique({
        where: { id: postId },
        include: { tags: true }
    });

    if (!post) return c.json({ error: 'Post tidak ditemukan' }, 404);
    if (post.authorId !== userId) return c.json({ error: 'Bukan post milik Anda' }, 403);

    const tagIds = post.tags.map((t) => t.id);

    // Soft delete
    await prisma.post.update({
        where: { id: postId },
        data: { deletedAt: new Date(), status: 'DELETED' }
    });

    if (tagIds.length > 0) {
        await prisma.tag.updateMany({
            where: { id: { in: tagIds } },
            data: { usageCount: { decrement: 1 } }
        });
    }

    return c.json({ ok: true });
});

// DELETE /posts/:id/moderate - Hapus post oleh moderator
postsApp.delete('/:id/moderate', authRequired, async (c) => {
    const prisma = c.get('prisma');
    const userId = c.get('userId');
    const postId = c.req.param('id');
    const { reason } = await c.req.json();

    // Cek apakah user adalah moderator
    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser || (currentUser.role !== 'mod' && currentUser.role !== 'dev')) {
        return c.json({ error: 'Akses ditolak. Hanya moderator yang dapat menghapus post.' }, 403);
    }

    if (!reason || !reason.trim()) {
        return c.json({ error: 'Alasan penghapusan wajib diisi' }, 400);
    }

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) return c.json({ error: 'Post tidak ditemukan' }, 404);

    // Update status post menjadi REMOVED_BY_MOD
    await prisma.post.update({
        where: { id: postId },
        data: {
            status: 'REMOVED_BY_MOD',
            removedReason: reason.trim(),
            removedAt: new Date(),
            removedById: userId
        }
    });

    return c.json({ ok: true, message: 'Post berhasil dihapus oleh moderator' });
});

// POST /posts/:id/pin - Toggle pin post (hanya author)
postsApp.post('/:id/pin', authRequired, async (c) => {
    const prisma = c.get('prisma');
    const userId = c.get('userId');
    const postId = c.req.param('id');

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) return c.json({ error: 'Post tidak ditemukan' }, 404);
    if (post.authorId !== userId) return c.json({ error: 'Hanya author yang bisa menyematkan post' }, 403);

    // Unpin all other posts from this user first
    if (!post.isPinned) {
        await prisma.post.updateMany({
            where: { authorId: userId, isPinned: true },
            data: { isPinned: false }
        });
    }

    const updated = await prisma.post.update({
        where: { id: postId },
        data: { isPinned: !post.isPinned }
    });

    return c.json({ ok: true, isPinned: updated.isPinned });
});

// GET /posts/feed - Feed dari user yang diikuti (Following Feed)
postsApp.get('/feed', authRequired, async (c) => {
    const prisma = c.get('prisma');
    const userId = c.get('userId');
    const page = Math.max(1, parseInt(c.req.query('page')) || 1);
    const limit = Math.min(50, parseInt(c.req.query('limit')) || 20);

    try {
        const following = await prisma.follow.findMany({
            where: { followerId: userId },
            select: { followingId: true }
        });
        const followingIds = following.map(f => f.followingId);

        const posts = await prisma.post.findMany({
            where: {
                authorId: { in: followingIds },
                isAnonymous: false,
                status: 'ACTIVE',
                deletedAt: null
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                author: true,
                tags: true,
                likedBy: { select: { id: true } },
                _count: { select: { comments: true } },
                quotedPost: {
                    include: {
                        author: true,
                        tags: true,
                        likedBy: { select: { id: true } },
                        _count: { select: { comments: true } }
                    }
                },
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
            posts: posts.map(p => anonymizePost(p, userId)),
            page,
            hasMore: posts.length === limit
        });
    } catch (error) {
        console.error('Error fetching following feed:', error);
        return c.json({ error: 'Gagal memuat feed Mengikuti' }, 500);
    }
});

// GET /posts/user/:username - Post dari user tertentu
postsApp.get('/user/:username', authOptional, async (c) => {
    const prisma = c.get('prisma');
    const currentUserId = c.get('userId');
    const username = c.req.param('username');

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return c.json({ error: 'User tidak ditemukan' }, 404);

    const query = {
        authorId: user.id,
        status: 'ACTIVE',
        deletedAt: null
    };

    // Jika bukan pemilik, jangan tampilkan post anonim
    if (user.id !== currentUserId) {
        query.isAnonymous = false;
    }

    const posts = await prisma.post.findMany({
        where: query,
        orderBy: [
            { isPinned: 'desc' }, // pinned posts first
            { createdAt: 'desc' }
        ],
        take: 50,
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

    return c.json({ posts: posts.map(p => anonymizePost(p, currentUserId)) });
});

// GET /posts/:id - Detail post
postsApp.get('/:id', authOptional, async (c) => {
    const prisma = c.get('prisma');
    const currentUserId = c.get('userId');
    const postId = c.req.param('id');

    const post = await prisma.post.findUnique({
        where: { id: postId },
        include: {
            author: true,
            tags: true,
            likedBy: { select: { id: true } },
            _count: { select: { comments: true } },
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
            },
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

    if (!post) return c.json({ error: 'Post tidak ditemukan' }, 404);

    return c.json({ post: anonymizePost(post, currentUserId) });
});

postsApp.patch('/:id', authRequired, async (c) => {
    const prisma = c.get('prisma');
    const userId = c.get('userId');
    const postId = c.req.param('id');
    const { content } = await c.req.json();

    try {
        const post = await prisma.post.findUnique({
            where: { id: postId }
        });

        if (!post) return c.json({ error: 'Post tidak ditemukan' }, 404);
        if (post.authorId !== userId) {
            return c.json({ error: 'Hanya author yang bisa edit post' }, 403);
        }

        if (!content || !content.trim()) {
            return c.json({ error: 'Konten tidak boleh kosong' }, 400);
        }

        if (content.length > 2000) {
            return c.json({ error: 'Konten maksimal 2000 karakter' }, 400);
        }

        const updatedPost = await prisma.post.update({
            where: { id: postId },
            data: {
                content: content.trim(),
                isEdited: true,
                updatedAt: new Date()
            },
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

        return c.json({ post: anonymizePost(updatedPost, userId) });
    } catch (error) {
        console.error('Error editing post:', error);
        return c.json({ error: 'Gagal edit post' }, 500);
    }
});

// POST /posts/:id/poll/vote - Beri suara pada polling
postsApp.post('/:id/poll/vote', authRequired, async (c) => {
    const prisma = c.get('prisma');
    const userId = c.get('userId');
    const postId = c.req.param('id');
    const { optionId } = await c.req.json().catch(() => ({}));

    if (!optionId) {
        return c.json({ error: 'ID pilihan polling diperlukan' }, 400);
    }

    try {
        const post = await prisma.post.findUnique({
            where: { id: postId, status: 'ACTIVE' },
            include: {
                poll: {
                    include: {
                        options: true
                    }
                }
            }
        });

        if (!post || !post.poll) {
            return c.json({ error: 'Post atau polling tidak ditemukan' }, 404);
        }

        if (new Date(post.poll.expiresAt) < new Date()) {
            return c.json({ error: 'Polling sudah berakhir' }, 400);
        }

        const validOption = post.poll.options.find(o => o.id === optionId);
        if (!validOption) {
            return c.json({ error: 'Pilihan polling tidak valid' }, 400);
        }

        // Cek apakah sudah pernah memilih
        const existingVote = await prisma.pollVote.findUnique({
            where: {
                userId_pollId: {
                    userId,
                    pollId: post.poll.id
                }
            }
        });

        if (existingVote) {
            return c.json({ error: 'Anda sudah memilih pada polling ini' }, 400);
        }

        // Buat suara
        await prisma.pollVote.create({
            data: {
                userId,
                pollId: post.poll.id,
                optionId
            }
        });

        // Ambil postingan terbaru dengan relasi ter-update
        const updatedPost = await prisma.post.findUnique({
            where: { id: postId },
            include: {
                author: true,
                tags: true,
                likedBy: { select: { id: true } },
                _count: { select: { comments: true } },
                quotedPost: {
                    include: {
                        author: true,
                        tags: true,
                        likedBy: { select: { id: true } },
                        _count: { select: { comments: true } }
                    }
                },
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

        return c.json({ post: anonymizePost(updatedPost, userId) });
    } catch (err) {
        console.error('Error voting in poll:', err);
        return c.json({ error: 'Gagal memberikan suara' }, 500);
    }
});

// POST /posts/:id/react - Tambah/update reaksi emoji pada post
postsApp.post('/:id/react', authRequired, async (c) => {
    const prisma = c.get('prisma');
    const userId = c.get('userId');
    const postId = c.req.param('id');
    const { emoji } = await c.req.json().catch(() => ({}));

    if (!emoji || !emoji.trim()) {
        return c.json({ error: 'Emoji reaksi diperlukan' }, 400);
    }

    try {
        const post = await prisma.post.findUnique({
            where: { id: postId, status: 'ACTIVE' }
        });

        if (!post) {
            return c.json({ error: 'Post tidak ditemukan' }, 404);
        }

        // Upsert reaksi
        await prisma.reaction.upsert({
            where: {
                userId_postId: {
                    userId,
                    postId
                }
            },
            update: {
                emoji: emoji.trim()
            },
            create: {
                userId,
                postId,
                emoji: emoji.trim()
            }
        });

        // Kirim notifikasi LIKE ke pemilik post (kecuali jika bereaksi pada post sendiri)
        if (post.authorId !== userId) {
            // Cek apakah notifikasi untuk post ini dari user ini sudah ada agar tidak spam
            const existingNotif = await prisma.notification.findFirst({
                where: {
                    senderId: userId,
                    receiverId: post.authorId,
                    postId,
                    type: 'LIKE'
                }
            });

            if (!existingNotif) {
                await prisma.notification.create({
                    data: {
                        type: 'LIKE',
                        senderId: userId,
                        receiverId: post.authorId,
                        postId
                    }
                });
            }
        }

        // Ambil postingan terbaru dengan relasi ter-update
        const updatedPost = await prisma.post.findUnique({
            where: { id: postId },
            include: {
                author: true,
                tags: true,
                likedBy: { select: { id: true } },
                _count: { select: { comments: true } },
                quotedPost: {
                    include: {
                        author: true,
                        tags: true,
                        likedBy: { select: { id: true } },
                        _count: { select: { comments: true } }
                    }
                },
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

        return c.json({ post: anonymizePost(updatedPost, userId) });
    } catch (err) {
        console.error('Error adding reaction:', err);
        return c.json({ error: 'Gagal menambahkan reaksi' }, 500);
    }
});

// DELETE /posts/:id/react - Hapus reaksi emoji pada post
postsApp.delete('/:id/react', authRequired, async (c) => {
    const prisma = c.get('prisma');
    const userId = c.get('userId');
    const postId = c.req.param('id');

    try {
        const post = await prisma.post.findUnique({
            where: { id: postId }
        });

        if (!post) {
            return c.json({ error: 'Post tidak ditemukan' }, 404);
        }

        // Hapus reaksi jika ada
        await prisma.reaction.deleteMany({
            where: {
                userId,
                postId
            }
        });

        // Ambil postingan terbaru dengan relasi ter-update
        const updatedPost = await prisma.post.findUnique({
            where: { id: postId },
            include: {
                author: true,
                tags: true,
                likedBy: { select: { id: true } },
                _count: { select: { comments: true } },
                quotedPost: {
                    include: {
                        author: true,
                        tags: true,
                        likedBy: { select: { id: true } },
                        _count: { select: { comments: true } }
                    }
                },
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

        return c.json({ post: anonymizePost(updatedPost, userId) });
    } catch (err) {
        console.error('Error removing reaction:', err);
        return c.json({ error: 'Gagal menghapus reaksi' }, 500);
    }
});

// ✅ GET /posts/:id/comments - Ambil semua komentar di post
postsApp.get('/:id/comments', authOptional, async (c) => {
    const prisma = c.get('prisma');
    const currentUserId = c.get('userId');
    const postId = c.req.param('id');

    const post = await prisma.post.findUnique({
        where: { id: postId, status: 'ACTIVE' }
    });

    if (!post) return c.json({ error: 'Post tidak ditemukan' }, 404);

    const comments = await prisma.comment.findMany({
        where: {
            postId: postId,
            deletedAt: null
        },
        orderBy: { createdAt: 'asc' },
        include: {
            author: true
        }
    });

    return c.json({
        comments: comments.map(comment => {
            const isMine = currentUserId ? String(comment.authorId) === String(currentUserId) : false;
            return {
                id: comment.id,
                content: comment.content,
                createdAt: comment.createdAt,
                updatedAt: comment.updatedAt,
                isMine,
                parentId: comment.parentId || null,
                author: {
                    id: comment.author.id,
                    username: comment.author.username,
                    displayName: comment.author.displayName || comment.author.username,
                    avatarUrl: comment.author.avatarUrl || ''
                }
            };
        })
    });
});

// ✅ POST /posts/:id/comments - Buat komentar baru
postsApp.post('/:id/comments', authRequired, async (c) => {
    const prisma = c.get('prisma');
    const userId = c.get('userId');
    const postId = c.req.param('id');
    const { content, parentId } = await c.req.json();

    if (!content || !content.trim()) {
        return c.json({ error: 'Konten komentar tidak boleh kosong' }, 400);
    }
    if (content.length > 1000) {
        return c.json({ error: 'Komentar maksimal 1000 karakter' }, 400);
    }

    const post = await prisma.post.findUnique({
        where: { id: postId, status: 'ACTIVE' },
        include: { author: true }
    });

    if (!post) {
        return c.json({ error: 'Post tidak ditemukan atau sudah dihapus' }, 404);
    }

    if (parentId) {
        const parentComment = await prisma.comment.findUnique({
            where: { id: parentId }
        });
        if (!parentComment || parentComment.postId !== postId) {
            return c.json({ error: 'Komentar induk tidak valid' }, 400);
        }
    }

    const comment = await prisma.comment.create({
        data: {
            content: content.trim(),
            postId,
            authorId: userId,
            parentId: parentId || null
        },
        include: {
            author: true
        }
    });

    // Kirim notifikasi
    if (parentId) {
        const parentComment = await prisma.comment.findUnique({
            where: { id: parentId }
        });
        if (parentComment && parentComment.authorId !== userId) {
            await prisma.notification.create({
                data: {
                    type: 'COMMENT',
                    senderId: userId,
                    receiverId: parentComment.authorId,
                    postId
                }
            });
        }
    } else {
        if (post.authorId !== userId && !post.isAnonymous) {
            await prisma.notification.create({
                data: {
                    type: 'COMMENT',
                    senderId: userId,
                    receiverId: post.authorId,
                    postId
                }
            });
        }
    }

    return c.json({
        comment: {
            id: comment.id,
            content: comment.content,
            createdAt: comment.createdAt,
            updatedAt: comment.updatedAt,
            isMine: true,
            parentId: comment.parentId || null,
            author: {
                id: comment.author.id,
                username: comment.author.username,
                displayName: comment.author.displayName || comment.author.username,
                avatarUrl: comment.author.avatarUrl || ''
            }
        }
    }, 201);
});

// ✅ DELETE /posts/:id/comments/:commentId - Hapus komentar
postsApp.delete('/:id/comments/:commentId', authRequired, async (c) => {
    const prisma = c.get('prisma');
    const userId = c.get('userId');
    const commentId = c.req.param('commentId');
    const postId = c.req.param('id');

    const comment = await prisma.comment.findUnique({
        where: { id: commentId }
    });

    if (!comment) return c.json({ error: 'Komentar tidak ditemukan' }, 404);

    if (comment.postId !== postId) {
        return c.json({ error: 'Komentar tidak cocok dengan post' }, 400);
    }

    if (comment.authorId !== userId) {
        return c.json({ error: 'Bukan komentar milik Anda' }, 403);
    }

    await prisma.comment.update({
        where: { id: commentId },
        data: { deletedAt: new Date() }
    });

    return c.json({ ok: true, message: 'Komentar berhasil dihapus' });
});

export default postsApp;