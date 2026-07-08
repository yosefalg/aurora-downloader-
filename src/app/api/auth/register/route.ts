import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth/password';
import { generateTokens, generateSessionId } from '@/lib/auth/jwt';
import { createSession } from '@/lib/auth/session';
import { rateLimit } from '@/lib/security/rateLimit';
import { logger } from '@/lib/monitoring/logger';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(100).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const rate = await rateLimit(req);
    if (!rate.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await req.json();
    const { email, password, name } = registerSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name: name || email.split('@')[0] },
    });

    const sessionId = generateSessionId();
    await createSession(user.id, { email: user.email });
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId,
    });

    logger.info('User registered', { userId: user.id, email });

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      tokens,
    }, { status: 201 });
  } catch (error: any) {
    logger.error('Registration error', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Registration failed' },
      { status: 400 }
    );
  }
}
