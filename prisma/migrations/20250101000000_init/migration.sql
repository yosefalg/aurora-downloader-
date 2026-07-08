-- CreateEnum
CREATE TYPE "Status" AS ENUM ('PENDING', 'PROCESSING', 'DOWNLOADING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Download" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "quality" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "jobId" TEXT,
    "filePath" TEXT,
    "filename" TEXT,
    "fileSize" DOUBLE PRECISION,
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT,
    "sessionId" TEXT,
    "metadata" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Download_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DownloadHistory" (
    "id" TEXT NOT NULL,
    "downloadId" TEXT NOT NULL,
    "status" "Status" NOT NULL,
    "progress" INTEGER NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DownloadHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "downloadId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Download_jobId_key" ON "Download"("jobId");
CREATE UNIQUE INDEX "Download_url_quality_key" ON "Download"("url", "quality");
CREATE INDEX "Download_status_idx" ON "Download"("status");
CREATE INDEX "Download_createdAt_idx" ON "Download"("createdAt");
CREATE INDEX "Download_userId_idx" ON "Download"("userId");
CREATE INDEX "Download_sessionId_idx" ON "Download"("sessionId");
CREATE INDEX "Download_jobId_idx" ON "Download"("jobId");
CREATE INDEX "DownloadHistory_downloadId_idx" ON "DownloadHistory"("downloadId");
CREATE INDEX "DownloadHistory_createdAt_idx" ON "DownloadHistory"("createdAt");
CREATE INDEX "AuditLog_downloadId_idx" ON "AuditLog"("downloadId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "DownloadHistory" ADD CONSTRAINT "DownloadHistory_downloadId_fkey" FOREIGN KEY ("downloadId") REFERENCES "Download"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_downloadId_fkey" FOREIGN KEY ("downloadId") REFERENCES "Download"("id") ON DELETE CASCADE ON UPDATE CASCADE;
