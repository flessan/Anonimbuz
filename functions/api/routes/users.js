// functions/api/routes/users.js
import { Hono } from 'hono';
import { authRequired, authOptional } from '../middleware/auth.js';

const usersApp = new Hono();

// Helper untuk konversi user ke JSON publik
function userToPublicJSON(user, currentUserId = null) {
    if (!user) return null;

    const result = {
        id: user.id,
        username: user.username,
        displayName: user.displayName || user.username,
        bio: user.bio || '',
        avatarUrl: user.avatarUrl || '',
        bannerUrl: user.bannerUrl || '',
        followersCount: user._count?.followers || 0,
        followingCount: user._count?.following || 0,
        githubUrl: user.githubUrl || '',
        instagramUrl: user.instagramUrl || '',
        twitterUrl: user.twitterUrl || '',
        facebookUrl: user.facebookUrl || '',
        createdAt: user.createdAt,
        role: user.role,
        isFollowing: false // Default
    };

    // ✅ Cek isFollowing jika currentUserId diberikan
    if (currentUserId && user.followers && Array.isArray(user.followers)) {
        result.isFollowing = user.followers.some(f => f.followerId === currentUserId);
    }

    return result;
}

// Helper untuk upload ke Cloudinary
async function uploadToCloudinary(file, folder, env) {
    const cloudName = env.CLOUDINARY_CLOUD_NAME;
    const apiKey = env.CLOUDINARY_API_KEY;
    const apiSecret = env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error('Konfigurasi Cloudinary tidak lengkap');
    }

    const timestamp = Math.round(new Date().getTime() / 1000);
    const signatureStr = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;

    const encoder = new TextEncoder();
    const data = encoder.encode(signatureStr);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    formData.append('timestamp', String(timestamp));
    formData.append('api_key', apiKey);
    formData.append('signature', signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData
    });

    if (!res.ok) {
        const errObj = await res.json();
        throw new Error(errObj.error?.message || 'Gagal mengunggah ke Cloudinary');
    }

    const resData = await res.json();
    return { secure_url: resData.secure_url, public_id: resData.public_id };
}

async function destroyCloudinaryAsset(publicId, env) {
    if (!publicId) return;

    const cloudName = env.CLOUDINARY_CLOUD_NAME;
    const apiKey = env.CLOUDINARY_API_KEY;
    const apiSecret = env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) return;

    const timestamp = Math.round(new Date().getTime() / 1000);
    const signatureStr = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;

    const encoder = new TextEncoder();
    const data = encoder.encode(signatureStr);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    const formData = new FormData();
    formData.append('public_id', publicId);
    formData.append('timestamp', String(timestamp));
    formData.append('api_key', apiKey);
    formData.append('signature', signature);

    try {
        await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
            method: 'POST',
            body: formData
        });
    } catch (e) {
        console.error('Cloudinary destroy failed:', e);
    }
}

// GET /users/search - Cari user
usersApp.get('/search', authOptional, async (c) => {
    const prisma = c.get('prisma');
    // ✅ Baca parameter 'q' atau 'search' (support keduanya)
    const query = (c.req.query('q') || c.req.query('search') || '').trim();

    let users;

    if (query) {
        // ✅ Jika ada query, search by username/displayName
        users = await prisma.user.findMany({
            where: {
                OR: [
                    { username: { contains: query, mode: 'insensitive' } },
                    { displayName: { contains: query, mode: 'insensitive' } }
                ]
            },
            include: {
                _count: { select: { followers: true, following: true } }
            },
            orderBy: {
                followers: { _count: 'desc' }  // ✅ Urutkan by followers terbanyak
            },
            take: 30
        });
    } else {
        // ✅ Jika tidak ada query, tampilkan semua user (popular first)
        users = await prisma.user.findMany({
            include: {
                _count: { select: { followers: true, following: true } }
            },
            orderBy: {
                followers: { _count: 'desc' }  // ✅ User dengan followers terbanyak di atas
            },
            take: 30
        });
    }

    return c.json({
        users: users.map(u => userToPublicJSON(u, c.get('userId')))
    });
});

// GET /users/:username - Profil user
usersApp.get('/:username', authOptional, async (c) => {
    const prisma = c.get('prisma');
    const currentUserId = c.get('userId');
    const username = c.req.param('username');

    try {
        // ✅ Query user dengan include followers untuk cek isFollowing
        const user = await prisma.user.findUnique({
            where: { username },
            include: {
                _count: { 
                    select: { 
                        followers: true, 
                        following: true,
                        posts: true
                    } 
                },
                followers: {
                    select: { followerId: true }
                }
            }
        });

        if (!user) return c.json({ error: 'User tidak ditemukan' }, 404);

        // ✅ Gunakan userToPublicJSON yang sudah ada
        const userData = userToPublicJSON(user, currentUserId);

        // ✅ Cek apakah user ini mengikuti current user (mutual follow)
        let isFollowingMe = false;
        if (currentUserId) {
            const followBack = await prisma.follow.findUnique({
                where: {
                    followerId_followingId: {
                        followerId: user.id,
                        followingId: currentUserId
                    }
                }
            });
            isFollowingMe = !!followBack;
        }

        // ✅ Tambahkan field tambahan
        userData.isFollowingMe = isFollowingMe;
        userData.postsCount = user._count?.posts || 0;

        return c.json({ user: userData });
        
    } catch (e) {
        console.error('Error fetching user profile:', e);
        return c.json({ 
            error: 'Gagal memuat profil', 
            details: e.message 
        }, 500);
    }
});

// GET /users/me/export - Ekspor data GDPR
usersApp.get('/me/export', authRequired, async (c) => {
    const prisma = c.get('prisma');
    const userId = c.get('userId');

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                posts: {
                    select: {
                        id: true,
                        content: true,
                        embedUrl: true,
                        isEdited: true,
                        isPinned: true,
                        createdAt: true,
                        status: true
                    }
                },
                comments: {
                    select: {
                        id: true,
                        content: true,
                        postId: true,
                        createdAt: true
                    }
                },
                bookmarks: {
                    select: {
                        id: true,
                        postId: true,
                        createdAt: true
                    }
                },
                reactions: {
                    select: {
                        id: true,
                        postId: true,
                        emoji: true,
                        createdAt: true
                    }
                }
            }
        });

        if (!user) return c.json({ error: 'User tidak ditemukan' }, 404);

        const exportData = {
            profile: {
                id: user.id,
                username: user.username,
                displayName: user.displayName,
                bio: user.bio,
                avatarUrl: user.avatarUrl,
                bannerUrl: user.bannerUrl,
                githubUrl: user.githubUrl,
                instagramUrl: user.instagramUrl,
                twitterUrl: user.twitterUrl,
                facebookUrl: user.facebookUrl,
                createdAt: user.createdAt,
                role: user.role
            },
            posts: user.posts,
            comments: user.comments,
            bookmarks: user.bookmarks,
            reactions: user.reactions,
            exportedAt: new Date().toISOString()
        };

        return c.json({ data: exportData });
    } catch (e) {
        console.error('Error exporting user data:', e);
        return c.json({ error: 'Gagal mengekspor data', details: e.message }, 500);
    }
});

// PATCH /users/me - Update profil
usersApp.patch('/me', authRequired, async (c) => {
    const prisma = c.get('prisma');
    const userId = c.get('userId');
    const body = await c.req.json();

    const { displayName, bio, githubUrl, instagramUrl, twitterUrl, facebookUrl } = body;

    const update = {};
    if (displayName !== undefined) update.displayName = String(displayName).slice(0, 50);
    if (bio !== undefined) update.bio = String(bio).slice(0, 280);

    // Validasi URL sosial
    const urlFields = { githubUrl, instagramUrl, twitterUrl, facebookUrl };
    for (const [key, value] of Object.entries(urlFields)) {
        if (value !== undefined) {
            if (value && !/^https?:\/\//i.test(value)) {
                return c.json({ error: `URL ${key} tidak valid` }, 400);
            }
            update[key] = String(value).slice(0, 255);
        }
    }

    const user = await prisma.user.update({
        where: { id: userId },
        data: update,
        include: {
            _count: { select: { followers: true, following: true } }
        }
    });

    return c.json({ user: userToPublicJSON(user) });
});

// POST /users/me/avatar - Upload avatar
usersApp.post('/me/avatar', authRequired, async (c) => {
    const prisma = c.get('prisma');
    const userId = c.get('userId');
    const body = await c.req.parseBody();
    const file = body['file'];

    if (!file) return c.json({ error: 'File tidak ditemukan' }, 400);

    // Validasi ukuran file (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        return c.json({ error: 'Ukuran file maksimal 5MB' }, 400);
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const oldPublicId = user.avatarPublicId;

    try {
        const result = await uploadToCloudinary(file, 'anomia/avatars', c.env);
        const updated = await prisma.user.update({
            where: { id: userId },
            data: { avatarUrl: result.secure_url, avatarPublicId: result.public_id },
            include: {
                _count: { select: { followers: true, following: true } }
            }
        });

        if (oldPublicId) await destroyCloudinaryAsset(oldPublicId, c.env);

        return c.json({ user: userToPublicJSON(updated) });
    } catch (e) {
        return c.json({ error: e.message || 'Upload gagal' }, 400);
    }
});

// POST /users/me/banner - Upload banner
usersApp.post('/me/banner', authRequired, async (c) => {
    const prisma = c.get('prisma');
    const userId = c.get('userId');
    const body = await c.req.parseBody();
    const file = body['file'];

    if (!file) return c.json({ error: 'File tidak ditemukan' }, 400);

    if (file.size > 5 * 1024 * 1024) {
        return c.json({ error: 'Ukuran file maksimal 5MB' }, 400);
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const oldPublicId = user.bannerPublicId;

    try {
        const result = await uploadToCloudinary(file, 'anomia/banners', c.env);
        const updated = await prisma.user.update({
            where: { id: userId },
            data: { bannerUrl: result.secure_url, bannerPublicId: result.public_id },
            include: {
                _count: { select: { followers: true, following: true } }
            }
        });

        if (oldPublicId) await destroyCloudinaryAsset(oldPublicId, c.env);

        return c.json({ user: userToPublicJSON(updated) });
    } catch (e) {
        return c.json({ error: e.message || 'Upload gagal' }, 400);
    }
});

// functions/api/routes/users.js

usersApp.post('/:username/follow', authRequired, async (c) => {
    const prisma = c.get('prisma');
    const userId = c.get('userId'); // ID pengikut (kamu)
    const targetUsername = c.req.param('username');

    // 1. Cari target user
    const targetUser = await prisma.user.findUnique({
        where: { username: targetUsername },
        include: { _count: { select: { followers: true } } } // Hitung followers saat ini
    });

    if (!targetUser) return c.json({ error: 'User tidak ditemukan' }, 404);
    if (targetUser.id === userId) return c.json({ error: 'Tidak bisa follow diri sendiri' }, 400);

    // 2. Cek apakah sudah follow
    const existingFollow = await prisma.follow.findUnique({
        where: {
            followerId_followingId: {
                followerId: userId,
                followingId: targetUser.id
            }
        }
    });

    let isFollowing = false;

    if (existingFollow) {
        // Jika sudah follow -> Unfollow
        await prisma.follow.delete({
            where: {
                followerId_followingId: {
                    followerId: userId,
                    followingId: targetUser.id
                }
            }
        });
        isFollowing = false;
    } else {
        // Jika belum follow -> Follow
        await prisma.follow.create({
            data: {
                followerId: userId,
                followingId: targetUser.id
            }
        });

        // Kirim notifikasi
        await prisma.notification.create({
            data: { type: 'FOLLOW', senderId: userId, receiverId: targetUser.id }
        }).catch(() => { }); // Ignore error notif agar tidak menggagalkan follow

        isFollowing = true;
    }

    // 3. Ambil data user TERBARU setelah perubahan
    const updatedUser = await prisma.user.findUnique({
        where: { id: targetUser.id },
        include: {
            _count: { select: { followers: true, following: true } }
        }
    });

    return c.json({
        ok: true,
        followed: isFollowing,
        user: {
            id: updatedUser.id,
            followersCount: updatedUser._count.followers,
            followingCount: updatedUser._count.following
        }
    });
});

// GET /users/suggested - Auto-detect suggested users berdasarkan role
usersApp.get('/suggested', authOptional, async (c) => {
  const prisma = c.get('prisma');
  const currentUserId = c.get('userId');
  const limit = Math.min(parseInt(c.req.query('limit')) || 10, 20);
  
  // Priority: dev > mod > user dengan followers terbanyak
  // Exclude current user
  const where = currentUserId 
    ? { id: { not: currentUserId } }
    : {};
  
  const users = await prisma.user.findMany({
    where,
    orderBy: [
      // Sort by role priority (dev=1, mod=2, user=3)
      { 
        role: 'asc' // 'dev' < 'mod' < 'user' secara alphabet
      },
      // Lalu by followers count (descending)
      {
        followers: {
          _count: 'desc'
        }
      },
      // Terakhir by createdAt (user lama dulu)
      {
        createdAt: 'asc'
      }
    ],
    take: limit,
    include: {
      _count: {
        select: { 
          followers: true,
          following: true,
          posts: true
        }
      }
    }
  });
  
  // Cek status following untuk current user
  let followingIds = new Set();
  if (currentUserId && users.length > 0) {
    const follows = await prisma.follow.findMany({
      where: {
        followerId: currentUserId,
        followingId: { in: users.map(u => u.id) }
      },
      select: { followingId: true }
    });
    followingIds = new Set(follows.map(f => f.followingId));
  }
  
  return c.json({ 
    users: users.map(u => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName || u.username,
      avatarUrl: u.avatarUrl || '',
      role: u.role,
      bio: u.bio || '',
      followersCount: u._count.followers,
      followingCount: u._count.following,
      postsCount: u._count.posts,
      isFollowing: followingIds.has(u.id)
    }))
  });
});

// GET /users/:username/followers - Daftar followers
usersApp.get('/:username/followers', authOptional, async (c) => {
    const prisma = c.get('prisma');
    const currentUserId = c.get('userId');
    const username = c.req.param('username');
    const page = Math.max(1, parseInt(c.req.query('page')) || 1);
    const limit = 20;

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return c.json({ error: 'User tidak ditemukan' }, 404);

    const followers = await prisma.follow.findMany({
        where: { followingId: user.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
            follower: {
                include: {
                    _count: { select: { followers: true, following: true } }
                }
            }
        }
    });

    const totalCount = await prisma.follow.count({
        where: { followingId: user.id }
    });

    return c.json({
        followers: followers.map(f => userToPublicJSON(f.follower)),
        totalCount,
        page,
        hasMore: followers.length === limit
    });
});

// GET /users/:username/following - Daftar following
usersApp.get('/:username/following', authOptional, async (c) => {
    const prisma = c.get('prisma');
    const currentUserId = c.get('userId');
    const username = c.req.param('username');
    const page = Math.max(1, parseInt(c.req.query('page')) || 1);
    const limit = 20;

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return c.json({ error: 'User tidak ditemukan' }, 404);

    const following = await prisma.follow.findMany({
        where: { followerId: user.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
            following: {
                include: {
                    _count: { select: { followers: true, following: true } }
                }
            }
        }
    });

    const totalCount = await prisma.follow.count({
        where: { followerId: user.id }
    });

    return c.json({
        following: following.map(f => userToPublicJSON(f.following)),
        totalCount,
        page,
        hasMore: following.length === limit
    });
});

// GET /users/:username/followers/top - Top 5 followers untuk avatar stack
usersApp.get('/:username/followers/top', async (c) => {
    const prisma = c.get('prisma');
    const username = c.req.param('username');

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return c.json({ error: 'User tidak ditemukan' }, 404);

    const topFollowers = await prisma.follow.findMany({
        where: { followingId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
            follower: {
                select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true
                }
            }
        }
    });

    const totalCount = await prisma.follow.count({
        where: { followingId: user.id }
    });

    return c.json({
        topFollowers: topFollowers.map(f => ({
            id: f.follower.id,
            username: f.follower.username,
            displayName: f.follower.displayName || f.follower.username,
            avatarUrl: f.follower.avatarUrl || ''
        })),
        totalCount
    });
});

// DELETE /users/me - Hapus akun secara permanen (cascade)
usersApp.delete('/me', authRequired, async (c) => {
    const prisma = c.get('prisma');
    const userId = c.get('userId');

    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return c.json({ error: 'User tidak ditemukan' }, 404);

        // Hapus aset dari Cloudinary jika ada
        if (user.avatarPublicId) await destroyCloudinaryAsset(user.avatarPublicId, c.env);
        if (user.bannerPublicId) await destroyCloudinaryAsset(user.bannerPublicId, c.env);

        // Hapus user dari database (akan cascade ke semua relasi)
        await prisma.user.delete({ where: { id: userId } });

        return c.json({ message: 'Akun berhasil dihapus permanen' });
    } catch (e) {
        console.error('Error deleting account:', e);
        return c.json({ error: 'Gagal menghapus akun', details: e.message }, 500);
    }
});

export default usersApp;