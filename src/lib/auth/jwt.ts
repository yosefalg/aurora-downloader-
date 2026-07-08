import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-change-me';
const JWT_EXPIRES_IN = '7d';
const REFRESH_EXPIRES_IN = '30d';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  sessionId: string;
}

export function generateTokens(payload: TokenPayload) {
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign(
    { userId: payload.userId, sessionId: payload.sessionId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );
  return { accessToken, refreshToken };
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): { userId: string; sessionId: string } {
  const decoded = jwt.verify(token, JWT_SECRET) as any;
  if (decoded.type !== 'refresh') throw new Error('Invalid token type');
  return { userId: decoded.userId, sessionId: decoded.sessionId };
}

export function generateSessionId(): string {
  return randomUUID();
}
