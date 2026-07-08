import { NextRequest, NextResponse } from 'next/server';
import { downloadManager } from '@/lib/download/manager';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const status = await downloadManager.getStatus(id);
  if (!status) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(status);
}
