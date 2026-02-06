import { Router } from 'express';
import { db } from '@db/connection';
import { campaigns, elections, agents } from '@db/schema/index';
import { campaignAnnouncementSchema, paginationSchema } from '@shared/validation';
import { AppError } from '../middleware/errorHandler';
import { eq, and } from 'drizzle-orm';

const router = Router();

/* POST /api/campaigns/announce -- Declare candidacy */
router.post('/campaigns/announce', async (req, res, next) => {
  try {
    const data = campaignAnnouncementSchema.parse(req.body);

    /* Verify agent exists */
    const [agent] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, data.agentId))
      .limit(1);

    if (!agent) {
      throw new AppError(404, 'Agent not found');
    }

    /* Verify election exists and is in registration/campaigning phase */
    const [election] = await db
      .select()
      .from(elections)
      .where(eq(elections.id, data.electionId))
      .limit(1);

    if (!election) {
      throw new AppError(404, 'Election not found');
    }

    if (!['registration', 'campaigning'].includes(election.status)) {
      throw new AppError(400, 'Election is not accepting new candidates');
    }

    /* Check for existing campaign */
    const existing = await db
      .select()
      .from(campaigns)
      .where(
        and(
          eq(campaigns.agentId, data.agentId),
          eq(campaigns.electionId, data.electionId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      throw new AppError(409, 'Agent already has a campaign in this election');
    }

    const [campaign] = await db
      .insert(campaigns)
      .values({
        agentId: data.agentId,
        electionId: data.electionId,
        platform: data.platform,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: campaign,
      message: 'Campaign announced successfully',
    });
  } catch (error) {
    next(error);
  }
});

/* GET /api/campaigns/active -- List active campaigns */
router.get('/campaigns/active', async (req, res, next) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const offset = (page - 1) * limit;

    const results = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.status, 'active'))
      .limit(limit)
      .offset(offset);

    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
});

export default router;
