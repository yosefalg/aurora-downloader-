import { NextRequest, NextResponse } from 'next/server';
import { downloadRepo } from '@/lib/db/repositories/download';

export async function GET(req: NextRequest) {
  const sessionId = req.cookies.get('sessionId')?.value;
  const userId = req.headers.get('x-user-id');
  const records = await downloadRepo.findActive();
  return NextResponse.json(records);
}
