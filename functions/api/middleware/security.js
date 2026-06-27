// functions/api/middleware/security.js
import { cors } from 'hono/cors';

// Daftar domain yang diizinkan (sesuaikan dengan domain Anda)
const ALLOWED_ORIGINS = [
    'https://anon.thio.qzz.io',
    'http://localhost:5173', // Vite dev server
    'https://anonimbuz.pages.dev' // Cloudflare Pages preview
];

export const securityMiddleware = (app) => {
    // CORS yang ketat
    app.use('*', cors({
        origin: (origin) => {
            if (!origin) return '*'; // Untuk request non-browser (curl, Postman)
            return ALLOWED_ORIGINS.includes(origin) ? origin : '';
        },
        credentials: true,
        allowHeaders: ['Content-Type', 'Authorization'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
    }));

    // Global Error Handler - MENCEGAH KEBOCORAN ERROR INTERNAL
    app.onError((err, c) => {
        console.error('INTERNAL ERROR:', err);

        // Jangan pernah mengembalikan detail error internal ke frontend!
        return c.json({
            error: 'Terjadi kesalahan internal pada server.'
        }, 500);
    });

    // Rate Limiting Sederhana (opsional, bisa ditambahkan nanti)
    // Untuk saat ini, kita andalkan Cloudflare Rate Limiting di dashboard
};