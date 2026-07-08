import { NextRequest } from 'next/server';
import { downloadRepo } from '@/lib/db/repositories/download';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let interval: NodeJS.Timeout;
      const cleanup = () => {
        if (interval) clearInterval(interval);
        controller.close();
      };
      req.signal.addEventListener('abort', cleanup);
      interval = setInterval(async () => {
        try {
          const record = await downloadRepo.findById(id);
          if (!record) {
            cleanup();
            return;
          }
          const data = {
            id: record.id,
            status: record.status,
            progress: record.progress,
            filename: record.filename,
            fileSize: record.fileSize ? Number(record.fileSize) : null,
            error: record.error,
            startedAt: record.startedAt,
            completedAt: record.completedAt,
          };
          const json = JSON.stringify(data);
          controller.enqueue(encoder.encode(`data: ${json}\n\n`));
          if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(record.status)) {
            cleanup();
          }
        } catch (error) {
          cleanup();
        }
      }, 1000);
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
