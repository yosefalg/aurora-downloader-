# Aurora API Documentation

## Endpoints

### POST /api/analyze
Analyze a URL and return metadata.

**Request:**
```json
{ "url": "https://youtube.com/watch?v=..." }
```

**Response:**
```json
{
  "title": "Video Title",
  "uploader": "Channel Name",
  "duration": 120,
  "qualities": [...],
  "thumbnail": "https://...",
  "subtitles": [...]
}
```

### POST /api/download
Submit a download job.

**Request:**
```json
{
  "url": "...",
  "quality": "best",
  "format": "mp4",
  "subtitle": "en"
}
```

**Response:**
```json
{ "id": "cuid", "status": "pending", "message": "Download started" }
```

### GET /api/download/:id
Get download status.

### GET /api/download/:id/events
SSE stream for real-time progress.

### GET /api/download/:id/file
Download the completed file.

### POST /api/download/:id/cancel
Cancel a download.

### GET /api/health
Health check endpoint.

### GET /api/metrics
Prometheus metrics.
