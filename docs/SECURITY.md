# Security

## SSRF Protection
- DNS resolution before any HTTP request
- Blocks private IP ranges (10.x, 172.16-31.x, 192.168.x, 127.x)
- Only allows http: and https: protocols

## Rate Limiting
- Upstash Redis (cloud) or in-memory fallback
- Configurable requests per window
- Whitelist support

## Content Security Policy
- Strict CSP headers via next.config.js
- Prevents XSS and injection attacks

## Input Validation
- Zod schemas for all API inputs
- Filename sanitization
- HTML escape for strings

## Database Security
- Prisma ORM prevents SQL injection
- Parameterized queries only
- Connection pooling

## File Security
- Random UUID filenames
- Temp file cleanup
- Size limits enforced
