// functions/api/[[route]].js
import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import { Pool } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';

// Import middleware dan routes
import { securityMiddleware } from './middleware/security.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import authRoutes from './routes/auth.js';
import postRoutes from './routes/posts.js';
import userRoutes from './routes/users.js';
import commentRoutes from './routes/comments.js';
import tagRoutes from './routes/tags.js';
import feedRoutes from './routes/feed.js';
import notificationRoutes from './routes/notifications.js';
import bookmarksRoutes from './routes/bookmarks.js';
import blocksRoutes from './routes/blocks.js';
import embedsRoutes from './routes/embeds.js';

// ✅ 1. BUAT APP INSTANCE DULU
const app = new Hono().basePath('/api');

// ✅ 2. TERAPKAN MIDDLEWARE
securityMiddleware(app);
app.use('*', rateLimiter({ windowMs: 60 * 1000, maxRequests: 100 })); // Global rate limit
app.use('/api/auth/*', rateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 15 })); // Stricter auth rate limit

// ✅ 3. DATABASE CONNECTION MIDDLEWARE
app.use('*', async (c, next) => {
  const databaseUrl = c.env.DATABASE_URL;
  if (!databaseUrl) {
    return c.json({ error: "DATABASE_URL belum terdaftar di Cloudflare!" }, 500);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaNeon(pool);
  const localPrisma = new PrismaClient({ adapter });
  c.set('prisma', localPrisma);

  try {
    await next();
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});

// ✅ 4. MOUNT SEMUA ROUTES (setelah app dibuat)
app.route('/auth', authRoutes);
app.route('/posts', postRoutes);
app.route('/users', userRoutes);
app.route('/comments', commentRoutes);
app.route('/tags', tagRoutes);
app.route('/notifications', notificationRoutes);
app.route('/feed', feedRoutes);
app.route('/', bookmarksRoutes);  // Untuk POST/DELETE /posts/:id/bookmark
app.route('/bookmarks', bookmarksRoutes);  // Untuk GET /bookmarks
app.route('/blocks', blocksRoutes);
app.route('/embeds', embedsRoutes);

// ✅ 5. EXPORT HANDLER
export const onRequest = handle(app);