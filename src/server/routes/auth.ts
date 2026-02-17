import { Router } from 'express';
import { db } from '@db/connection';
import { users } from '@db/schema/index';
import { eq, count } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { signToken } from '../middleware/auth.js';

const router = Router();

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 3600 * 1000,
  path: '/',
};

/* POST /api/auth/register */
router.post('/auth/register', async (req, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    const username = String(body.username ?? '').trim();
    const password = String(body.password ?? '');
    const email = typeof body.email === 'string' ? body.email.trim() : undefined;

    if (!username || username.length < 3 || username.length > 50 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      res.status(400).json({ success: false, error: 'Username must be 3-50 alphanumeric/underscore chars' });
      return;
    }
    if (!password || password.length < 8) {
      res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
      return;
    }

    // First registration becomes admin
    const [{ value: userCount }] = await db.select({ value: count() }).from(users);
    const role = userCount === 0 ? 'admin' : 'user';

    const existing = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ success: false, error: 'Username already taken' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db.insert(users).values({ username, passwordHash, email, role }).returning({
      id: users.id, username: users.username, role: users.role,
    });

    const token = signToken({ id: user.id, username: user.username, role: user.role });
    res.cookie('molt_token', token, COOKIE_OPTS);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

/* POST /api/auth/login */
router.post('/auth/login', async (req, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    const username = String(body.username ?? '').trim();
    const password = String(body.password ?? '');

    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid username or password' });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ success: false, error: 'Invalid username or password' });
      return;
    }

    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

    const token = signToken({ id: user.id, username: user.username, role: user.role });
    res.cookie('molt_token', token, COOKIE_OPTS);
    res.json({ success: true, data: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    next(error);
  }
});

/* POST /api/auth/logout */
router.post('/auth/logout', (_req, res) => {
  res.clearCookie('molt_token', { path: '/' });
  res.json({ success: true, data: { message: 'Logged out' } });
});

/* GET /api/auth/me */
router.get('/auth/me', async (req, res, next) => {
  try {
    const token = req.cookies?.['molt_token'] as string | undefined;
    if (!token) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }
    const jwt = await import('jsonwebtoken');
    const secret = process.env.JWT_SECRET ?? 'molt-dev-secret-change-in-production';
    try {
      const payload = jwt.default.verify(token, secret) as { id: string; username: string; role: string };
      res.json({ success: true, data: { id: payload.id, username: payload.username, role: payload.role } });
    } catch {
      res.status(401).json({ success: false, error: 'Invalid token' });
    }
  } catch (error) {
    next(error);
  }
});

export default router;
