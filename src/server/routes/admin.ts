import { Router } from 'express';
import { db } from '@db/connection';
import { agentDecisions, agents } from '@db/schema/index';
import { count, eq, sql } from 'drizzle-orm';
import {
  pauseSimulation,
  resumeSimulation,
  triggerManualTick,
  getSimulationStatus,
  changeTickInterval,
  retryFailedJobs,
} from '../jobs/agentTick.js';
import { runSeed } from '@db/seedFn';
import { getRuntimeConfig, updateRuntimeConfig } from '../runtimeConfig.js';

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

/* POST /admin/retry-failed -- Retry all failed Bull jobs */
router.post('/admin/retry-failed', async (_req, res, next) => {
  try {
    const count = await retryFailedJobs();
    res.json({ success: true, data: { retriedCount: count }, message: `Retried ${count} failed jobs` });
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

/* GET /api/admin/config — current runtime configuration */
router.get('/admin/config', (_req, res) => {
  res.json({ success: true, data: getRuntimeConfig() });
});

/* POST /api/admin/config — update runtime configuration */
router.post('/admin/config', async (req, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    const update: Parameters<typeof updateRuntimeConfig>[0] = {};

    if (typeof body.tickIntervalMs === 'number' && body.tickIntervalMs >= 30_000) {
      update.tickIntervalMs = body.tickIntervalMs;
      await changeTickInterval(body.tickIntervalMs);
    }
    if (typeof body.billProposalChance === 'number') {
      update.billProposalChance = Math.max(0, Math.min(1, body.billProposalChance));
    }
    if (typeof body.campaignSpeechChance === 'number') {
      update.campaignSpeechChance = Math.max(0, Math.min(1, body.campaignSpeechChance));
    }
    if (typeof body.billAdvancementDelayMs === 'number' && body.billAdvancementDelayMs >= 10_000) {
      update.billAdvancementDelayMs = body.billAdvancementDelayMs;
    }
    if (body.providerOverride === 'default' || body.providerOverride === 'haiku' || body.providerOverride === 'ollama') {
      update.providerOverride = body.providerOverride;
    }

    const updated = updateRuntimeConfig(update);
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

/* GET /api/admin/agents — list all agents with status */
router.get('/admin/agents', async (_req, res, next) => {
  try {
    const rows = await db
      .select({
        id: agents.id,
        displayName: agents.displayName,
        alignment: agents.alignment,
        modelProvider: agents.modelProvider,
        isActive: agents.isActive,
        reputation: agents.reputation,
        balance: agents.balance,
      })
      .from(agents)
      .orderBy(agents.displayName);

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

/* POST /api/admin/agents/:id/toggle — enable/disable an agent */
router.post('/admin/agents/:id/toggle', async (req, res, next) => {
  try {
    const { id } = req.params;
    const [agent] = await db.select({ isActive: agents.isActive }).from(agents).where(eq(agents.id, id));

    if (!agent) {
      res.status(404).json({ success: false, error: 'Agent not found' });
      return;
    }

    const newActive = !agent.isActive;
    await db.update(agents).set({ isActive: newActive }).where(eq(agents.id, id));
    res.json({ success: true, data: { isActive: newActive } });
  } catch (error) {
    next(error);
  }
});

export default router;
