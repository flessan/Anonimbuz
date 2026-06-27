# Anonimbuz Privacy & Security Audit Checklist

## 1. Data Protection & GDPR
- [x] Users can download a full JSON copy of all their data (GDPR Right to Access).
- [x] Account deletion is absolute and cascades across all relations (GDPR Right to Erasure).
- [ ] No third-party trackers or unnecessary analytics libraries installed.
- [ ] Cloudinary images/banners are deleted when a user is deleted (avoiding orphaned files).

## 2. Authentication & Authorization
- [x] JWT tokens are signed securely and only passed over HTTPS/secured contexts.
- [ ] Implement Two-Factor Authentication (TOTP).
- [x] Proper role-based access control (dev, mod, user) enforced on backend endpoints.
- [x] Passwords hashed using bcrypt/argon2 before storage.

## 3. API Security
- [x] CORS is restricted to trusted origins only.
- [x] Rate limiting is applied to all endpoints (login, registration, post creation).
- [ ] Input validation and sanitization using Zod or custom logic to prevent XSS.
- [ ] Sensitive headers (e.g. Server, X-Powered-By) are hidden.

## 4. Anonymous Posting
- [x] Anonymous posts hide standard author fields properly.
- [ ] Content watermarking or cryptographic fingerprinting for internal tracking in case of severe abuse.
- [x] Moderators can soft-delete or remove inappropriate anonymous posts without exposing the author to the public.

*This document should be reviewed periodically during development and prior to production launches.*
