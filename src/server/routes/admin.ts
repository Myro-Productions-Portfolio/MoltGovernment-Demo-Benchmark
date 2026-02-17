import { Router } from 'express';
import { db } from '@db/connection';
import { agentDecisions, agents, governmentSettings, users } from '@db/schema/index';
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
import type { ProviderOverride } from '../runtimeConfig.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

/* Apply requireAdmin to all /admin/* routes in this router */
router.use('/admin', requireAdmin);

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

    const num = (key: string, min: number, max: number): number | undefined => {
      const v = body[key];
      if (typeof v === 'number' && !isNaN(v)) return Math.max(min, Math.min(max, v));
      return undefined;
    };
    const prob = (key: string): number | undefined => num(key, 0, 1);
    const posInt = (key: string, min = 1, max = 9999): number | undefined => {
      const v = num(key, min, max);
      return v !== undefined ? Math.round(v) : undefined;
    };

    /* Simulation */
    if (typeof body.tickIntervalMs === 'number' && body.tickIntervalMs >= 30_000) {
      update.tickIntervalMs = body.tickIntervalMs;
      await changeTickInterval(body.tickIntervalMs);
    }
    const badMs = num('billAdvancementDelayMs', 10_000, 86_400_000);
    if (badMs !== undefined) update.billAdvancementDelayMs = badMs;
    const VALID_PROVIDERS = ['default', 'anthropic', 'openai', 'google', 'huggingface', 'ollama'];
    if (typeof body.providerOverride === 'string' && VALID_PROVIDERS.includes(body.providerOverride)) {
      update.providerOverride = body.providerOverride as ProviderOverride;
    }

    /* Guard Rails */
    const mplc = posInt('maxPromptLengthChars', 500, 32000);
    if (mplc !== undefined) update.maxPromptLengthChars = mplc;
    const molt = posInt('maxOutputLengthTokens', 50, 4000);
    if (molt !== undefined) update.maxOutputLengthTokens = molt;
    const mbpat = posInt('maxBillsPerAgentPerTick', 1, 20);
    if (mbpat !== undefined) update.maxBillsPerAgentPerTick = mbpat;
    const mcspt = posInt('maxCampaignSpeechesPerTick', 1, 20);
    if (mcspt !== undefined) update.maxCampaignSpeechesPerTick = mcspt;

    /* Agent Behavior */
    const bpc = prob('billProposalChance');       if (bpc !== undefined) update.billProposalChance = bpc;
    const csc = prob('campaignSpeechChance');     if (csc !== undefined) update.campaignSpeechChance = csc;
    const apc = prob('amendmentProposalChance');  if (apc !== undefined) update.amendmentProposalChance = apc;

    /* Government Structure */
    const cs = posInt('congressSeats', 1, 500);           if (cs !== undefined) update.congressSeats = cs;
    const ctd = posInt('congressTermDays', 7, 3650);      if (ctd !== undefined) update.congressTermDays = ctd;
    const ptd = posInt('presidentTermDays', 7, 3650);     if (ptd !== undefined) update.presidentTermDays = ptd;
    const scj = posInt('supremeCourtJustices', 1, 25);   if (scj !== undefined) update.supremeCourtJustices = scj;
    const qp = prob('quorumPercentage');                   if (qp !== undefined) update.quorumPercentage = qp;
    const bpp = prob('billPassagePercentage');             if (bpp !== undefined) update.billPassagePercentage = bpp;
    const smp = prob('supermajorityPercentage');           if (smp !== undefined) update.supermajorityPercentage = smp;

    /* Elections */
    const cdd = posInt('campaignDurationDays', 1, 365);   if (cdd !== undefined) update.campaignDurationDays = cdd;
    const vdh = posInt('votingDurationHours', 1, 720);    if (vdh !== undefined) update.votingDurationHours = vdh;
    const mrr = posInt('minReputationToRun', 0, 10000);  if (mrr !== undefined) update.minReputationToRun = mrr;
    const mrv = posInt('minReputationToVote', 0, 10000); if (mrv !== undefined) update.minReputationToVote = mrv;

    /* Economy */
    const iab = posInt('initialAgentBalance', 0, 1_000_000); if (iab !== undefined) update.initialAgentBalance = iab;
    const cff = posInt('campaignFilingFee', 0, 100_000);     if (cff !== undefined) update.campaignFilingFee = cff;
    const pcf = posInt('partyCreationFee', 0, 100_000);      if (pcf !== undefined) update.partyCreationFee = pcf;
    const sp = posInt('salaryPresident', 0, 100_000);         if (sp !== undefined) update.salaryPresident = sp;
    const sc = posInt('salaryCabinet', 0, 100_000);           if (sc !== undefined) update.salaryCabinet = sc;
    const scg = posInt('salaryCongress', 0, 100_000);         if (scg !== undefined) update.salaryCongress = scg;
    const sj = posInt('salaryJustice', 0, 100_000);           if (sj !== undefined) update.salaryJustice = sj;

    /* Governance Probabilities */
    const vbr = prob('vetoBaseRate');                     if (vbr !== undefined) update.vetoBaseRate = vbr;
    const vrpt = prob('vetoRatePerTier');                 if (vrpt !== undefined) update.vetoRatePerTier = vrpt;
    const vmr = prob('vetoMaxRate');                      if (vmr !== undefined) update.vetoMaxRate = vmr;
    const ctro = prob('committeeTableRateOpposing');      if (ctro !== undefined) update.committeeTableRateOpposing = ctro;
    const ctrn = prob('committeeTableRateNeutral');       if (ctrn !== undefined) update.committeeTableRateNeutral = ctrn;
    const car = prob('committeeAmendRate');               if (car !== undefined) update.committeeAmendRate = car;
    const jcr = prob('judicialChallengeRatePerLaw');      if (jcr !== undefined) update.judicialChallengeRatePerLaw = jcr;
    const pwf = prob('partyWhipFollowRate');              if (pwf !== undefined) update.partyWhipFollowRate = pwf;
    const vot = prob('vetoOverrideThreshold');            if (vot !== undefined) update.vetoOverrideThreshold = vot;

    const updated = updateRuntimeConfig(update);
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

/* GET /api/admin/economy — live treasury + tax rate from DB */
router.get('/admin/economy', async (_req, res, next) => {
  try {
    const [row] = await db.select().from(governmentSettings).limit(1);
    res.json({ success: true, data: row ?? { treasuryBalance: 0, taxRatePercent: 2 } });
  } catch (error) {
    next(error);
  }
});

/* POST /api/admin/economy — update treasury balance or tax rate in DB */
router.post('/admin/economy', async (req, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    const patch: Record<string, unknown> = {};

    if (typeof body.treasuryBalance === 'number' && body.treasuryBalance >= 0) {
      patch.treasuryBalance = Math.round(body.treasuryBalance);
    }
    if (typeof body.taxRatePercent === 'number' && body.taxRatePercent >= 0 && body.taxRatePercent <= 100) {
      patch.taxRatePercent = body.taxRatePercent;
    }

    if (Object.keys(patch).length === 0) {
      res.status(400).json({ success: false, error: 'No valid fields provided' });
      return;
    }

    patch.updatedAt = new Date();

    const [existing] = await db.select({ id: governmentSettings.id }).from(governmentSettings).limit(1);
    let row;
    if (existing) {
      [row] = await db.update(governmentSettings).set(patch).where(eq(governmentSettings.id, existing.id)).returning();
    } else {
      [row] = await db.insert(governmentSettings).values({ treasuryBalance: 50000, taxRatePercent: 2, ...patch }).returning();
    }

    res.json({ success: true, data: row });
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

/* POST /api/admin/agents/create — create a new agent */
router.post('/admin/agents/create', async (req, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    const rc = getRuntimeConfig();

    const displayName = String(body.displayName ?? '').trim();
    const name = String(body.name ?? '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const alignment = String(body.alignment ?? 'moderate');
    const bio = String(body.bio ?? '').trim();
    const personality = String(body.personality ?? '').trim();
    const modelProvider = String(body.modelProvider ?? 'anthropic');
    const model = String(body.model ?? '').trim();
    const startingBalance = typeof body.startingBalance === 'number'
      ? Math.round(body.startingBalance)
      : rc.initialAgentBalance;

    if (!displayName || !name) {
      res.status(400).json({ success: false, error: 'displayName and name are required' });
      return;
    }

    const VALID_ALIGNMENTS = ['progressive', 'moderate', 'conservative', 'libertarian', 'technocrat'];
    const VALID_PROVIDERS_LIST = ['anthropic', 'openai', 'google', 'huggingface', 'ollama'];

    if (!VALID_ALIGNMENTS.includes(alignment)) {
      res.status(400).json({ success: false, error: 'Invalid alignment' });
      return;
    }
    if (!VALID_PROVIDERS_LIST.includes(modelProvider)) {
      res.status(400).json({ success: false, error: 'Invalid modelProvider' });
      return;
    }

    const [newAgent] = await db.insert(agents).values({
      displayName,
      name,
      moltbookId: `molt_${name}_${Date.now()}`,
      alignment,
      bio: bio || undefined,
      personality: personality || undefined,
      modelProvider,
      model: model || undefined,
      balance: startingBalance,
      reputation: 100,
      isActive: true,
    }).returning();

    res.json({ success: true, data: newAgent });
  } catch (error) {
    next(error);
  }
});

/* GET /api/admin/users — list all registered users */
router.get('/admin/users', async (_req, res, next) => {
  try {
    const rows = await db
      .select({ id: users.id, username: users.username, email: users.email, role: users.role, clerkUserId: users.clerkUserId, createdAt: users.createdAt })
      .from(users)
      .orderBy(users.createdAt);
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

/* POST /api/admin/users/:id/role — set a user's role */
router.post('/admin/users/:id/role', async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = req.body as Record<string, unknown>;
    const role = String(body.role ?? '');
    if (role !== 'admin' && role !== 'user') {
      res.status(400).json({ success: false, error: 'role must be "admin" or "user"' });
      return;
    }
    const [updated] = await db.update(users).set({ role }).where(eq(users.id, id)).returning();
    if (!updated) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

export default router;
