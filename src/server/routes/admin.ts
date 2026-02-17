import { Router } from 'express';
import { db } from '@db/connection';
import { agentDecisions, agents } from '@db/schema/index';
import { count, eq, sql } from 'drizzle-orm';
import {
  pauseSimulation,
  resumeSimulation,
  triggerManualTick,
  getSimulationStatus,
} from '../jobs/agentTick.js';
import { runSeed } from '@db/seedFn';

const router = Router();

/* GET /api/admin/status — simulation state + decision stats */
router.get('/admin/status', async (_req, res, next) => {
  try {
    const simStatus = await getSimulationStatus();

    const [stats] = await db
      .select({
        total: count(),
        errors: sql<number>`COUNT(*) FILTER (WHERE ${agentDecisions.success} = false)`,
        haikuCount: sql<number>`COUNT(*) FILTER (WHERE ${agentDecisions.provider} = 'haiku')`,
        ollamaCount: sql<number>`COUNT(*) FILTER (WHERE ${agentDecisions.provider} = 'ollama')`,
      })
      .from(agentDecisions);

    res.json({ success: true, data: { simulation: simStatus, decisions: stats } });
  } catch (error) {
    next(error);
  }
});

/* POST /api/admin/pause */
router.post('/admin/pause', async (_req, res, next) => {
  try {
    await pauseSimulation();
    res.json({ success: true, data: { message: 'Simulation paused' } });
  } catch (error) {
    next(error);
  }
});

/* POST /api/admin/resume */
router.post('/admin/resume', async (_req, res, next) => {
  try {
    await resumeSimulation();
    res.json({ success: true, data: { message: 'Simulation resumed' } });
  } catch (error) {
    next(error);
  }
});

/* POST /api/admin/tick — trigger one immediate tick */
router.post('/admin/tick', async (_req, res, next) => {
  try {
    await triggerManualTick();
    res.json({ success: true, data: { message: 'Tick queued' } });
  } catch (error) {
    next(error);
  }
});

/* POST /api/admin/reseed — wipe and reseed the database */
router.post('/admin/reseed', async (_req, res, next) => {
  try {
    await runSeed();
    res.json({ success: true, data: { message: 'Database reseeded' } });
  } catch (error) {
    next(error);
  }
});

/* GET /api/admin/decisions — decision log with agent name, all fields */
router.get('/admin/decisions', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '50'), 10)));
    const offset = (page - 1) * limit;

    const rows = await db
      .select({
        id: agentDecisions.id,
        agentName: agents.displayName,
        provider: agentDecisions.provider,
        phase: agentDecisions.phase,
        parsedAction: agentDecisions.parsedAction,
        parsedReasoning: agentDecisions.parsedReasoning,
        success: agentDecisions.success,
        latencyMs: agentDecisions.latencyMs,
        createdAt: agentDecisions.createdAt,
      })
      .from(agentDecisions)
      .leftJoin(agents, eq(agentDecisions.agentId, agents.id))
      .orderBy(sql`${agentDecisions.createdAt} DESC`)
      .limit(limit)
      .offset(offset);

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

export default router;
