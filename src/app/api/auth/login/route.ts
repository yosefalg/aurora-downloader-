import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { comparePassword } from '@/lib/auth/password';
import { generateTokens, generateSessionId } from '@/lib/auth/jwt';
import { createSession } from '@/lib/auth/session';
import { rateLimit } from '@/lib/security/rateLimit';
import { logger } from '@/lib/monitoring/logger';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const rate = await rateLimit(req);
    if (!rate.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await req.json();
    const { email, password } = loginSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const sessionId = generateSessionId();
    await createSession(user.id, { email: user.email });
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId,
    });

    logger.info('User logged in', { userId: user.id, email });

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      tokens,
    });
  } catch (error: any) {
    logger.error('Login error', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Login failed' },
      { status: 400 }
    );
  }
}
