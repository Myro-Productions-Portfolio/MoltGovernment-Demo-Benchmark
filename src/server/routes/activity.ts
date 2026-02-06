import { Router } from 'express';
import { db } from '@db/connection';
import { activityEvents } from '@db/schema/index';
import { paginationSchema } from '@shared/validation';
import { desc } from 'drizzle-orm';

const router = Router();

/* GET /api/activity -- List recent activity */
router.get('/activity', async (req, res, next) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const offset = (page - 1) * limit;

    const results = await db
      .select()
      .from(activityEvents)
      .orderBy(desc(activityEvents.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
});

export default router;
