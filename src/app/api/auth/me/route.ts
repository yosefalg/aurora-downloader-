import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  const user = await authenticate(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ user });
}
