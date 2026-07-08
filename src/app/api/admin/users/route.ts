import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if ('status' in admin) return admin;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const search = searchParams.get('search') || '';

  const where = search
    ? { OR: [{ email: { contains: search, mode: 'insensitive' as any } }, { name: { contains: search, mode: 'insensitive' as any } }] }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, name: true, role: true, createdAt: true, _count: { select: { downloads: true } } },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}
