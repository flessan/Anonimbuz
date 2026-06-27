// functions/api/routes/auth.js
import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import { hashPassword as hashPasswordHelper, verifyPassword, needsPasswordUpgrade, upgradePasswordHash } from '../utils/password.js';
import { authRequired } from '../middleware/auth.js';

const authApp = new Hono();

// Helper untuk konversi user ke JSON publik (diperbarui untuk _count)
function userToPublicJSON(user) {
    if (!user) return null;
    return {
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
        role: user.role
    };
}

// Register
authApp.post('/register', async (c) => {
    const prisma = c.get('prisma');

    try {
        const body = await c.req.json();
        const { username, password, displayName, turnstileToken } = body;
        const clientIp = c.req.header('CF-Connecting-IP') || 'unknown';

        // Validasi dasar
        if (!username || !password) {
            return c.json({ error: 'Username dan password wajib diisi' }, 400);
        }
        if (password.length < 8) {
            return c.json({ error: 'Password minimal 8 karakter' }, 400);
        }

        // Validasi Turnstile
        if (!turnstileToken) {
            return c.json({ error: 'Verifikasi keamanan (Turnstile) diperlukan.' }, 400);
        }

        try {
            const formData = new FormData();
            formData.append('secret', c.env.TURNSTILE_SECRET_KEY);
            formData.append('response', turnstileToken);
            formData.append('remoteip', clientIp);

            const turnstileResult = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
                body: formData,
                method: 'POST',
            });

            const outcome = await turnstileResult.json();

            if (!outcome.success) {
                return c.json({
                    error: 'Verifikasi Turnstile gagal.',
                    turnstileErrors: outcome['error-codes']
                }, 403);
            }
        } catch (err) {
            console.error('Turnstile verification error:', err);
            return c.json({ error: 'Gagal memverifikasi keamanan sistem.' }, 500);
        }

        const cleanUsername = String(username).trim().toLowerCase();
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(cleanUsername)) {
            return c.json({ error: 'Username hanya boleh huruf, angka, dan underscore, dengan panjang 3-20 karakter.' }, 400);
        }

        const existing = await prisma.user.findUnique({ where: { username: cleanUsername } });
        if (existing) {
            return c.json({ error: 'Username sudah dipakai' }, 409);
        }

        const passwordHash = await hashPasswordHelper(password);
        const cleanDisplayName = displayName ? String(displayName).trim().slice(0, 50) : cleanUsername;

        const user = await prisma.user.create({
            data: {
                username: cleanUsername,
                passwordHash,
                displayName: cleanDisplayName,
            },
            include: {
                _count: { select: { followers: true, following: true } }
            }
        });

        const jwtPayload = {
            sub: user.id,
            exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7)
        };
        const token = await sign(jwtPayload, c.env.JWT_SECRET);

        return c.json({ token, user: userToPublicJSON(user) }, 201);

    } catch (error) {
        console.error('❌ Register error:', error);
        return c.json({ error: 'Terjadi kesalahan saat registrasi. Silakan coba lagi.' }, 500);
    }
});

// Login
authApp.post('/login', async (c) => {
    const prisma = c.get('prisma');

    try {
        const { username, password } = await c.req.json();

        if (!username || !password) {
            return c.json({ error: 'Username dan password wajib diisi' }, 400);
        }

        const cleanUsername = String(username).trim().toLowerCase();

        const user = await prisma.user.findUnique({
            where: { username: cleanUsername },
            include: {
                _count: { select: { followers: true, following: true } }
            }
        });

        if (!user) {
            return c.json({ error: 'Username atau password salah' }, 401);
        }

        // Verifikasi password
        const isPasswordValid = await verifyPassword(password, user.passwordHash);
        if (!isPasswordValid) {
            return c.json({ error: 'Username atau password salah' }, 401);
        }

        // ⚡ AUTO-UPGRADE: Upgrade password lama ke PBKDF2
        if (await needsPasswordUpgrade(user.passwordHash)) {
            console.log(`🔄 Upgrading password for user: ${cleanUsername}`);
            const newHash = await upgradePasswordHash(password);
            await prisma.user.update({
                where: { id: user.id },
                data: { passwordHash: newHash }
            });
        }

        const jwtPayload = { sub: user.id, exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7) };
        const token = await sign(jwtPayload, c.env.JWT_SECRET);

        return c.json({ token, user: userToPublicJSON(user) });

    } catch (error) {
        console.error('❌ Login error:', error);
        return c.json({ error: 'Terjadi kesalahan saat login. Silakan coba lagi.' }, 500);
    }
});

// Me
authApp.get('/me', authRequired, async (c) => {
    const prisma = c.get('prisma');
    const userId = c.get('userId');

    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            _count: { select: { followers: true, following: true } }
        }
    });

    if (!user) {
        return c.json({ error: 'User tidak ditemukan' }, 404);
    }

    return c.json({ user: userToPublicJSON(user) });
});

// DEBUG ENDPOINT - HAPUS SETELAH SELESAI DEBUGGING
authApp.post('/debug/verify-password', async (c) => {
    const prisma = c.get('prisma');
    const { username, password } = await c.req.json();

    try {
        console.log('🔍 DEBUG: Verifying password for user:', username);

        const user = await prisma.user.findUnique({
            where: { username }
        });

        if (!user) {
            console.log('❌ User not found');
            return c.json({ error: 'User tidak ditemukan' }, 404);
        }

        console.log('✅ User found');
        console.log('   Stored hash length:', user.passwordHash.length);
        console.log('   Stored hash preview:', user.passwordHash.substring(0, 50) + '...');

        const isValid = await verifyPassword(password, user.passwordHash);

        console.log('🔑 Verification result:', isValid);

        return c.json({
            success: true,
            userFound: true,
            hashLength: user.passwordHash.length,
            hashPreview: user.passwordHash.substring(0, 50) + '...',
            passwordValid: isValid,
            message: isValid ? 'Password valid!' : 'Password tidak cocok'
        });

    } catch (error) {
        console.error('❌ Debug error:', error);
        return c.json({ error: error.message }, 500);
    }
});

export default authApp;