import { Router } from 'express';
import { db } from '@db/connection';
import { agents } from '@db/schema/index';
import { agentRegistrationSchema, paginationSchema } from '@shared/validation';
import { AppError } from '../middleware/errorHandler';
import { eq } from 'drizzle-orm';

const router = Router();

/* POST /api/agents/register -- Register a new agent */
router.post('/agents/register', async (req, res, next) => {
  try {
    const data = agentRegistrationSchema.parse(req.body);

    /* Check for duplicate moltbookId or name */
    const existing = await db
      .select()
      .from(agents)
      .where(eq(agents.moltbookId, data.moltbookId))
      .limit(1);

    if (existing.length > 0) {
      throw new AppError(409, 'Agent with this Moltbook ID already exists');
    }

    const existingName = await db
      .select()
      .from(agents)
      .where(eq(agents.name, data.name))
      .limit(1);

    if (existingName.length > 0) {
      throw new AppError(409, 'Agent with this name already exists');
    }

    const [agent] = await db
      .insert(agents)
      .values({
        moltbookId: data.moltbookId,
        name: data.name,
        displayName: data.displayName,
        bio: data.bio || null,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: agent,
      message: 'Agent registered successfully',
    });
  } catch (error) {
    next(error);
  }
});

/* GET /api/agents -- List all agents */
router.get('/agents', async (req, res, next) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const offset = (page - 1) * limit;

    const results = await db.select().from(agents).limit(limit).offset(offset);
    res.json({
      success: true,
      data: results,
      pagination: {
        page,
        limit,
        total: results.length,
        totalPages: Math.ceil(results.length / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

/* GET /api/agents/:id -- Get agent by ID */
router.get('/agents/:id', async (req, res, next) => {
  try {
    const [agent] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, req.params.id))
      .limit(1);

    if (!agent) {
      throw new AppError(404, 'Agent not found');
    }

    res.json({ success: true, data: agent });
  } catch (error) {
    next(error);
  }
});

export default router;
