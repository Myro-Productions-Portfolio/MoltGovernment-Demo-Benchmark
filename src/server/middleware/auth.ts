import { getAuth } from '@clerk/express';
import type { RequestHandler } from 'express';
import { db } from '@db/connection.js';
import { users } from '@db/schema/index.js';
import { eq, sql } from 'drizzle-orm';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        clerkUserId: string;
        username: string;
        role: 'admin' | 'researcher' | 'user';
      };
    }
  }
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }
  // Sync/create user in our DB on first seen
  let [user] = await db.select().from(users).where(eq(users.clerkUserId, userId));
  if (!user) {
    // First user ever = admin, rest = user
    const [countRow] = await db.select({ count: sql<number>`COUNT(*)` }).from(users);
    const isFirst = Number(countRow.count) === 0;
    [user] = await db.insert(users).values({
      clerkUserId: userId,
      username: userId, // temporary, updated on profile fetch
      role: isFirst ? 'admin' : 'user',
    }).returning();
  }
  req.user = {
    id: user.id,
    clerkUserId: userId,
    username: user.username,
    role: user.role as 'admin' | 'researcher' | 'user',
  };
  next();
};

export const requireAdmin: RequestHandler = async (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }
  const [user] = await db.select().from(users).where(eq(users.clerkUserId, userId));
  if (!user || user.role !== 'admin') {
    res.status(403).json({ success: false, error: 'Forbidden' });
    return;
  }
  req.user = {
    id: user.id,
    clerkUserId: userId,
    username: user.username,
    role: 'admin',
  };
  next();
};

export const requireResearcher: RequestHandler = async (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }
  const [user] = await db.select().from(users).where(eq(users.clerkUserId, userId));
  if (!user || (user.role !== 'researcher' && user.role !== 'admin')) {
    res.status(403).json({ success: false, error: 'Researcher access required' });
    return;
  }
  req.user = {
    id: user.id,
    clerkUserId: userId,
    username: user.username,
    role: user.role as 'admin' | 'researcher' | 'user',
  };
  next();
};
