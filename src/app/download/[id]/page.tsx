'use client';

import { useParams, useRouter } from 'next/navigation';
import { useDownload } from '@/hooks/useDownload';
import { GlassCard } from '@/components/ui/GlassCard';
import { Spinner } from '@/components/ui/Spinner';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function DownloadPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { status, isLoading, isConnected, error, cancel } = useDownload(id);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-900/20 via-purple-900/20 to-pink-900/20">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Spinner size={12} />
        </div>
        <Footer />
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-900/20 via-purple-900/20 to-pink-900/20">
        <Header />
        <div className="flex-1 flex items-center justify-center p-6">
          <GlassCard className="text-red-400 text-center max-w-md">
            <p>Failed to load download status</p>
            <p className="text-sm text-gray-400 mt-2">{error}</p>
            <Button onClick={() => router.push('/')} className="mt-4">
              Go Home
            </Button>
          </GlassCard>
        </div>
        <Footer />
      </div>
    );
  }

  const getStatusText = () => {
    switch (status?.status) {
      case 'PENDING': return 'Waiting in queue...';
      case 'PROCESSING': return 'Preparing download...';
      case 'DOWNLOADING': return `Downloading... ${status.progress || 0}%`;
      case 'COMPLETED': return 'Complete!';
      case 'FAILED': return 'Failed';
      case 'CANCELLED': return 'Cancelled';
      default: return 'Unknown';
    }
  };

  const isDownloading = status?.status === 'PENDING' || status?.status === 'PROCESSING' || status?.status === 'DOWNLOADING';
  const isCompleted = status?.status === 'COMPLETED';
  const isFailed = status?.status === 'FAILED';
  const isCancelled = status?.status === 'CANCELLED';

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-900/20 via-purple-900/20 to-pink-900/20">
      <Header />
      <div className="flex-1 flex items-center justify-center p-6">
        <GlassCard className="w-full max-w-md text-center space-y-4">
          <h2 className="text-2xl font-bold">Download Status</h2>
          <div className="py-4">
            <div className="text-4xl mb-2">
              {isDownloading ? <Spinner size={10} /> :
               isCompleted ? '✅' :
               isFailed ? '❌' :
               isCancelled ? '⏹' : '⏳'}
            </div>
            <p className="text-lg">{getStatusText()}</p>
            {isDownloading && status && (
              <div className="mt-4">
                <ProgressBar value={status.progress || 0} />
                <p className="text-sm text-gray-400 mt-2">
                  {status.progress || 0}%
                </p>
              </div>
            )}
            {status?.filename && (
              <p className="text-sm text-gray-400 mt-2">
                File: {status.filename}
              </p>
            )}
            {status?.fileSize && (
              <p className="text-sm text-gray-400">
                Size: {(status.fileSize / 1024 / 1024).toFixed(2)} MB
              </p>
            )}
            {status?.error && (
              <p className="text-sm text-red-400 mt-2">{status.error}</p>
            )}
            {isConnected && isDownloading && (
              <p className="text-xs text-green-400 mt-2">Live updates connected</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {isCompleted && status && (
              <a
                href={`/api/download/${status.id}/file`}
                className="inline-block w-full px-6 py-2 bg-purple-500 text-white rounded-lg hover:opacity-90 transition text-center"
              >
                Download File
              </a>
            )}
            {isDownloading && (
              <Button
                variant="danger"
                onClick={cancel}
                className="w-full"
              >
                Cancel Download
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => router.push('/')}
              className="w-full"
            >
              New Download
            </Button>
          </div>
        </GlassCard>
      </div>
      <Footer />
    </div>
  );
}
