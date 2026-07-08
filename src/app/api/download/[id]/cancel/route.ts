import { NextRequest, NextResponse } from 'next/server';
import { downloadManager } from '@/lib/download/manager';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const result = await downloadManager.cancel(id);
  if (!result) {
    return NextResponse.json({ error: 'Cannot cancel' }, { status: 404 });
  }
  return NextResponse.json({ success: true, message: 'Download cancelled' });
}
