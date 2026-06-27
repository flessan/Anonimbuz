// web/src/utils/apiAudit.js
import api from '../api';

// Daftar semua endpoint yang digunakan frontend
export const API_ENDPOINTS = {
    // Auth
    AUTH_LOGIN: 'POST /auth/login',
    AUTH_REGISTER: 'POST /auth/register',
    AUTH_ME: 'GET /auth/me',

    // Posts
    POSTS_CREATE: 'POST /posts',
    POSTS_LIST: 'GET /posts',
    POSTS_FEED: 'GET /posts/feed',
    POSTS_FEED_RECENT: 'GET /feed/recent',
    POSTS_FEED_FOR_YOU: 'GET /feed/for-you',
    POSTS_USER: 'GET /posts/user/:username',
    POSTS_DETAIL: 'GET /posts/:id',
    POSTS_LIKE: 'POST /posts/:id/like',
    POSTS_UNLIKE: 'DELETE /posts/:id/like',
    POSTS_REPOST: 'POST /posts/:id/repost',
    POSTS_UNREPOST: 'DELETE /posts/:id/repost',
    POSTS_QUOTE: 'POST /posts/:id/quote',
    POSTS_DELETE: 'DELETE /posts/:id',
    POSTS_MODERATE: 'DELETE /posts/:id/moderate',

    // Comments
    COMMENTS_LIST: 'GET /posts/:id/comments',
    COMMENTS_CREATE: 'POST /posts/:id/comments',
    COMMENTS_DELETE: 'DELETE /posts/:id/comments/:commentId',
    COMMENTS_USER: 'GET /comments/user/:username',

    // Users
    USERS_SEARCH: 'GET /users/search',
    USERS_PROFILE: 'GET /users/:username',
    USERS_UPDATE: 'PATCH /users/me',
    USERS_AVATAR: 'POST /users/me/avatar',
    USERS_BANNER: 'POST /users/me/banner',
    USERS_FOLLOW: 'POST /users/:username/follow',
    USERS_UNFOLLOW: 'DELETE /users/:username/follow',
    USERS_FOLLOWERS: 'GET /users/:username/followers',
    USERS_FOLLOWING: 'GET /users/:username/following',
    USERS_FOLLOWERS_TOP: 'GET /users/:username/followers/top',

    // Tags
    TAGS_CATEGORIES: 'GET /tags/categories',
    TAGS_LIST: 'GET /tags',
    TAGS_POPULAR: 'GET /tags/popular',
    TAGS_DETAIL: 'GET /tags/:slug',
    TAGS_CREATE: 'POST /tags',

    // Notifications
    NOTIFICATIONS_UNREAD: 'GET /notifications/unread-count',
    NOTIFICATIONS_LIST: 'GET /notifications',
    NOTIFICATIONS_READ_ALL: 'POST /notifications/read-all',
    NOTIFICATIONS_DELETE: 'DELETE /notifications/:id',
};

// Fungsi untuk test semua endpoint
export async function auditAllEndpoints() {
    console.log('🔍 Starting API Audit...\n');

    const results = {
        working: [],
        missing: [],
        errors: []
    };

    // Test endpoint yang tidak perlu auth
    const publicEndpoints = [
        { name: 'AUTH_LOGIN', method: 'POST', path: '/auth/login', body: { username: 'test', password: 'test' } },
        { name: 'POSTS_LIST', method: 'GET', path: '/posts?page=1' },
        { name: 'FEED_RECENT', method: 'GET', path: '/feed/recent?page=1' },
        { name: 'FEED_FOR_YOU', method: 'GET', path: '/feed/for-you?page=1' },
        { name: 'TAGS_CATEGORIES', method: 'GET', path: '/tags/categories' },
        { name: 'TAGS_POPULAR', method: 'GET', path: '/tags/popular' },
    ];

    for (const endpoint of publicEndpoints) {
        try {
            const config = {
                method: endpoint.method,
                url: endpoint.path,
            };

            if (endpoint.body) {
                config.data = endpoint.body;
            }

            const res = await api(config);
            results.working.push({
                name: endpoint.name,
                path: endpoint.path,
                status: res.status
            });
            console.log(`✅ ${endpoint.name}: ${endpoint.method} ${endpoint.path} → ${res.status}`);
        } catch (err) {
            if (err.response?.status === 404) {
                results.missing.push({
                    name: endpoint.name,
                    path: endpoint.path,
                    status: 404
                });
                console.log(`❌ ${endpoint.name}: ${endpoint.method} ${endpoint.path} → 404 NOT FOUND`);
            } else {
                results.errors.push({
                    name: endpoint.name,
                    path: endpoint.path,
                    status: err.response?.status || 'Network Error',
                    message: err.message
                });
                console.log(`⚠️  ${endpoint.name}: ${endpoint.method} ${endpoint.path} → ${err.response?.status || 'ERROR'}`);
            }
        }
    }

    console.log('\n📊 Audit Summary:');
    console.log(`✅ Working: ${results.working.length}`);
    console.log(`❌ Missing (404): ${results.missing.length}`);
    console.log(`⚠️  Errors: ${results.errors.length}`);

    if (results.missing.length > 0) {
        console.log('\n🚨 Missing Endpoints:');
        results.missing.forEach(m => {
            console.log(`  - ${m.name}: ${m.path}`);
        });
    }

    return results;
}

// Export untuk digunakan di console browser
if (typeof window !== 'undefined') {
    window.auditAPI = auditAllEndpoints;
}