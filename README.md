# Aurora Downloader v3.5

> The most beautiful, secure, and scalable media downloader on the planet.

[![CI/CD](https://github.com/YOUR_USERNAME/aurora-downloader/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/aurora-downloader/actions)
[![Security Scan](https://github.com/YOUR_USERNAME/aurora-downloader/actions/workflows/security.yml/badge.svg)](https://github.com/YOUR_USERNAME/aurora-downloader/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker)](https://docker.com)
[![K8s](https://img.shields.io/badge/Kubernetes-Ready-blue?logo=kubernetes)](https://kubernetes.io)

## Features

- **700+ Platforms** via yt-dlp (YouTube, TikTok, Instagram, Twitter, Vimeo, SoundCloud, and more)
- **Glass-morphism UI** with dark/light/AMOLED themes
- **Background Queue Processing** with BullMQ (auto-retry, recovery, scheduling)
- **Real-time Progress** via Server-Sent Events
- **Multi-quality Support** up to 4K with subtitle extraction
- **JWT Authentication** with session management
- **Stripe Payments** with subscription plans (Free/Pro/Enterprise)
- **AI-powered Summaries** and recommendations
- **Prometheus Metrics** and Sentry error tracking
- **Docker & Kubernetes** ready with Terraform IaC
- **CI/CD Pipelines** with GitHub Actions
- **Security Hardened** (SSRF, rate limiting, CSP, command injection protection)

## Quick Start

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/aurora-downloader.git
cd aurora-downloader

# Install
npm install

# Setup database
cp .env.example .env
npx prisma generate
npx prisma db push

# Run
npm run dev
```

## Docker Compose (Production)

```bash
docker-compose up -d
```

Services:
- Web (port 3000, 2 replicas)
- Worker (2 replicas)
- Scheduler (1 replica)
- PostgreSQL (port 5432)
- Redis (port 6379)

## Kubernetes

```bash
kubectl apply -k k8s/overlays/production
```

## Terraform (AWS)

```bash
cd terraform
terraform init
terraform plan -var="environment=production" -var="domain=aurora.example.com"
terraform apply
```

## API Documentation

See [docs/API.md](docs/API.md) for complete API reference.

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for system design.

## Security

See [docs/SECURITY.md](docs/SECURITY.md) for security model.

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for deployment guides.

## License

MIT License - see [LICENSE](LICENSE)

---

Built with Next.js 14, TypeScript, Prisma, BullMQ, yt-dlp, and love.
