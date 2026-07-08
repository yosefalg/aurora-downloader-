# Aurora Architecture

## Overview
Aurora is a distributed media downloader built on Next.js 14, BullMQ, and yt-dlp.

## Components

### Web Server (Next.js)
- API routes for analysis, download submission, status, and file serving
- Server-Sent Events for real-time progress
- Rate limiting and SSRF protection

### Worker (BullMQ)
- Processes download jobs from the queue
- yt-dlp integration for media extraction
- Automatic retry and recovery

### Scheduler
- Handles delayed and recurring jobs
- Cleanup scheduling

### Database (PostgreSQL + Prisma)
- Download records and history
- Audit logs
- User management

### Cache (Redis)
- Analysis results caching
- Rate limiting state
- Distributed locks

## Data Flow
1. User submits URL → API analyzes it
2. Analysis cached in Redis
3. User selects quality → Download job queued
4. Worker picks up job → yt-dlp downloads
5. Progress streamed via SSE
6. File served via API when complete
