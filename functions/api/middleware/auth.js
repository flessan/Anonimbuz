// functions/api/middleware/auth.js
import { verify } from 'hono/jwt';

export const authRequired = async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Token tidak ditemukan' }, 401);
    }

    const token = authHeader.slice(7);
    try {
        const payload = await verify(token, c.env.JWT_SECRET, 'HS256');
        const userId = payload.sub;
        if (!userId) {
            return c.json({ error: 'Token tidak valid' }, 401);
        }
        c.set('userId', userId);
        await next();
    } catch (e) {
        return c.json({ error: 'Token tidak valid atau telah kedaluwarsa' }, 401);
    }
};

export const authOptional = async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        try {
            const payload = await verify(token, c.env.JWT_SECRET, 'HS256');
            const userId = payload.sub;
            if (userId) {
                c.set('userId', userId);
            }
        } catch (e) {
            // Ignore invalid tokens in optional auth
        }
    }
    await next();
};