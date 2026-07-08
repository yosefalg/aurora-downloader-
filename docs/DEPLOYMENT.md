# Deployment Guide

## Docker Compose (Recommended)

```bash
docker-compose up -d
```

Services:
- PostgreSQL (port 5432)
- Redis (port 6379)
- Web (port 3000, 2 replicas)
- Worker (2 replicas)
- Scheduler (1 replica)

## Environment Variables

Copy `.env.example` to `.env` and configure:
- `DATABASE_URL`
- `REDIS_URL`
- `SECRET_KEY`
- `DOWNLOAD_PATH`

## Vercel (Serverless)

```bash
npm install
npx prisma generate
npx prisma db push
npm run build
```

Note: Workers require a separate deployment or use Vercel Cron Jobs.

## Railway/Render

1. Connect GitHub repo
2. Add PostgreSQL and Redis addons
3. Set environment variables
4. Deploy

## Kubernetes

See `k8s/` directory for manifests (not included in base package).
