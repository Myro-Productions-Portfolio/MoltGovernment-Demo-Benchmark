import Bull from 'bull';
import { eq, and, inArray, lte, gte, count, sql } from 'drizzle-orm';
import { config } from '../config.js';
import { getRuntimeConfig } from '../runtimeConfig.js';
import { db } from '@db/connection';
import { agents, bills, billVotes, activityEvents, laws, elections, campaigns, positions } from '@db/schema/index';
import { generateAgentDecision } from '../services/ai.js';
import { broadcast } from '../websocket.js';

const agentTickQueue = new Bull('agent-tick', config.redis.url);

agentTickQueue.process(async () => {
  const rc = getRuntimeConfig();
  console.warn('[SIMULATION] Agent tick running...');

  /* Fetch all active agents once — used across phases */
  const activeAgents = await db.select().from(agents).where(eq(agents.isActive, true));
  const activeAgentCount = activeAgents.length;

  /* ------------------------------------------------------------------ */
  /* PHASE 1: Bill Voting                                                  */
  /* Agents vote on bills currently at 'floor' status.                    */
  /* ------------------------------------------------------------------ */
  try {
    console.warn('[SIMULATION] Phase 1: Bill Voting');

    const floorBills = await db.select().from(bills).where(eq(bills.status, 'floor'));

    if (floorBills.length === 0) {
      console.warn('[SIMULATION] Phase 1: No floor bills — skipping voting.');
    } else {
      const floorBillIds = floorBills.map((b) => b.id);

      for (const agent of activeAgents) {
        const existingVotes = await db
          .select({ billId: billVotes.billId })
          .from(billVotes)
          .where(and(eq(billVotes.voterId, agent.id), inArray(billVotes.billId, floorBillIds)));

        const votedBillIds = new Set(existingVotes.map((v) => v.billId));

        for (const bill of floorBills) {
          if (votedBillIds.has(bill.id)) continue;

          const contextMessage =
            `Bill up for vote: "${bill.title}". ` +
            `Summary: ${bill.summary}. ` +
            `Committee: ${bill.committee}. ` +
            `Respond with exactly this JSON structure: {"action":"vote","reasoning":"one sentence","data":{"choice":"yea"}} ` +
            `Use "yea" to support or "nay" to oppose.`;

          const decision = await generateAgentDecision(
            {
              id: agent.id,
              displayName: agent.displayName,
              alignment: agent.alignment,
              modelProvider: rc.providerOverride === 'default' ? agent.modelProvider : rc.providerOverride,
              personality: agent.personality,
            },
            contextMessage,
            'bill_voting',
          );

          const isVote = decision.action === 'vote' || decision.action === 'yea' || decision.action === 'nay';
          if (isVote) {
            const rawChoice = decision.action === 'yea' || decision.action === 'nay'
              ? decision.action
              : String(decision.data?.['choice'] ?? 'nay');
            const choice = rawChoice.toLowerCase().includes('yea') ? 'yea' : 'nay';

            await db.insert(billVotes).values({
              billId: bill.id,
              voterId: agent.id,
              choice,
            });

            await db.insert(activityEvents).values({
              type: 'vote',
              agentId: agent.id,
              title: 'Vote cast',
              description: `${agent.displayName} voted ${choice.toUpperCase()} on "${bill.title}"`,
              metadata: JSON.stringify({
                billId: bill.id,
                choice,
                reasoning: decision.reasoning,
                provider: agent.modelProvider,
              }),
            });

            broadcast('agent:vote', {
              agentId: agent.id,
              agentName: agent.displayName,
              billId: bill.id,
              billTitle: bill.title,
              choice,
              reasoning: decision.reasoning,
            });

            console.warn(
              `[SIMULATION] ${agent.displayName} voted ${choice.toUpperCase()} on "${bill.title}"`,
            );
          }
        }
      }
    }
  } catch (err) {
    console.warn('[SIMULATION] Phase 1 error:', err);
  }

  /* ------------------------------------------------------------------ */
  /* PHASE 2: Bill Resolution                                              */
  /* If all active agents have voted on a floor bill, tally and resolve.  */
  /* ------------------------------------------------------------------ */
  try {
    console.warn('[SIMULATION] Phase 2: Bill Resolution');

    const floorBillsForResolution = await db.select().from(bills).where(eq(bills.status, 'floor'));

    for (const bill of floorBillsForResolution) {
      const voteCounts = await db
        .select({ choice: billVotes.choice, total: count() })
        .from(billVotes)
        .where(eq(billVotes.billId, bill.id))
        .groupBy(billVotes.choice);

      const voteCount = voteCounts.reduce((sum, row) => sum + Number(row.total), 0);

      /* Only resolve once all active agents have voted */
      if (voteCount < activeAgentCount) continue;

      const yeaCount = Number(voteCounts.find((r) => r.choice === 'yea')?.total ?? 0);
      const nayCount = Number(voteCounts.find((r) => r.choice === 'nay')?.total ?? 0);
      const passed = yeaCount > nayCount;
      const result = passed ? 'passed' : 'vetoed';

      await db
        .update(bills)
        .set({ status: result, lastActionAt: new Date() })
        .where(eq(bills.id, bill.id));

      if (passed) {
        await db.insert(laws).values({
          billId: bill.id,
          title: bill.title,
          text: bill.fullText,
          enactedDate: new Date(),
          isActive: true,
        });
      }

      const resultLabel = passed ? 'passed into law' : 'vetoed';
      await db.insert(activityEvents).values({
        type: 'bill_resolved',
        agentId: null,
        title: passed ? 'Bill passed' : 'Bill vetoed',
        description: `"${bill.title}" has been ${resultLabel} (${yeaCount} yea, ${nayCount} nay)`,
        metadata: JSON.stringify({ billId: bill.id, result, yeaCount, nayCount }),
      });

      broadcast('bill:resolved', {
        billId: bill.id,
        title: bill.title,
        result,
        yeaCount,
        nayCount,
      });

      console.warn(
        `[SIMULATION] "${bill.title}" ${resultLabel} (${yeaCount} yea, ${nayCount} nay)`,
      );
    }
  } catch (err) {
    console.warn('[SIMULATION] Phase 2 error:', err);
  }

  /* ------------------------------------------------------------------ */
  /* PHASE 3: Bill Advancement                                             */
  /* proposed -> committee after 60s; committee -> floor after 60s.       */
  /* ------------------------------------------------------------------ */
  try {
    console.warn('[SIMULATION] Phase 3: Bill Advancement');

    const sixtySecondsAgo = new Date(Date.now() - rc.billAdvancementDelayMs);

    /* proposed -> committee */
    const proposedBills = await db
      .select()
      .from(bills)
      .where(and(eq(bills.status, 'proposed'), lte(bills.lastActionAt, sixtySecondsAgo)));

    for (const bill of proposedBills) {
      await db
        .update(bills)
        .set({ status: 'committee', lastActionAt: new Date() })
        .where(eq(bills.id, bill.id));

      await db.insert(activityEvents).values({
        type: 'bill_advanced',
        agentId: null,
        title: 'Bill advanced to committee',
        description: `"${bill.title}" has been advanced from proposed to committee`,
        metadata: JSON.stringify({ billId: bill.id, from: 'proposed', to: 'committee' }),
      });

      broadcast('bill:advanced', {
        billId: bill.id,
        title: bill.title,
        from: 'proposed',
        to: 'committee',
      });

      console.warn(`[SIMULATION] "${bill.title}" advanced: proposed -> committee`);
    }

    /* committee -> floor */
    const committeeBills = await db
      .select()
      .from(bills)
      .where(and(eq(bills.status, 'committee'), lte(bills.lastActionAt, sixtySecondsAgo)));

    for (const bill of committeeBills) {
      await db
        .update(bills)
        .set({ status: 'floor', lastActionAt: new Date() })
        .where(eq(bills.id, bill.id));

      await db.insert(activityEvents).values({
        type: 'bill_advanced',
        agentId: null,
        title: 'Bill advanced to floor',
        description: `"${bill.title}" has been advanced from committee to floor`,
        metadata: JSON.stringify({ billId: bill.id, from: 'committee', to: 'floor' }),
      });

      broadcast('bill:advanced', {
        billId: bill.id,
        title: bill.title,
        from: 'committee',
        to: 'floor',
      });

      console.warn(`[SIMULATION] "${bill.title}" advanced: committee -> floor`);
    }
  } catch (err) {
    console.warn('[SIMULATION] Phase 3 error:', err);
  }

  /* ------------------------------------------------------------------ */
  /* PHASE 4: Agent Bill Proposal                                          */
  /* Each agent has a 30% chance to propose a bill if they haven't        */
  /* sponsored one in the last 5 minutes.                                 */
  /* ------------------------------------------------------------------ */
  try {
    console.warn('[SIMULATION] Phase 4: Agent Bill Proposal');

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000);

    for (const agent of activeAgents) {
      if (Math.random() >= rc.billProposalChance) continue;

      /* Check if agent sponsored a bill in the last 5 minutes */
      const recentBills = await db
        .select({ id: bills.id })
        .from(bills)
        .where(and(eq(bills.sponsorId, agent.id), gte(bills.introducedAt, fiveMinutesAgo)));

      if (recentBills.length > 0) continue;

      const contextMessage =
        `You are considering proposing new legislation. Based on your political alignment and values, propose a bill. ` +
        `Respond with exactly this JSON: {"action":"propose","reasoning":"one sentence","data":{"title":"Bill Title","summary":"One sentence summary","committee":"Technology|Budget|Social Welfare|Justice|Foreign Affairs"}}`;

      const decision = await generateAgentDecision(
        {
          id: agent.id,
          displayName: agent.displayName,
          alignment: agent.alignment,
          modelProvider: rc.providerOverride === 'default' ? agent.modelProvider : rc.providerOverride,
          personality: agent.personality,
        },
        contextMessage,
        'bill_proposal',
      );

      if (decision.action !== 'propose' || !decision.data) continue;

      const title = String(decision.data['title'] ?? '').trim();
      const summary = String(decision.data['summary'] ?? '').trim();
      const committee = String(decision.data['committee'] ?? 'General').trim() || 'General';

      if (!title || !summary) continue;

      const fullText =
        `SECTION 1. SHORT TITLE.\nThis Act may be cited as the "${title}".\n\nSECTION 2. PURPOSE.\n${summary}`;

      const [newBill] = await db
        .insert(bills)
        .values({
          title,
          summary,
          fullText,
          sponsorId: agent.id,
          coSponsorIds: '[]',
          committee,
          status: 'proposed',
        })
        .returning({ id: bills.id, title: bills.title });

      await db.insert(activityEvents).values({
        type: 'bill_proposed',
        agentId: agent.id,
        title: 'New bill proposed',
        description: `${agent.displayName} proposed "${title}" — ${summary}`,
        metadata: JSON.stringify({
          billId: newBill.id,
          committee,
          reasoning: decision.reasoning,
        }),
      });

      broadcast('bill:proposed', {
        billId: newBill.id,
        title,
        summary,
        committee,
        sponsorId: agent.id,
        sponsorName: agent.displayName,
      });

      console.warn(`[SIMULATION] ${agent.displayName} proposed bill: "${title}"`);
    }
  } catch (err) {
    console.warn('[SIMULATION] Phase 4 error:', err);
  }

  /* ------------------------------------------------------------------ */
  /* PHASE 5: Election Lifecycle                                           */
  /* campaigning -> voting when votingStartDate <= now                    */
  /* voting -> completed when votingEndDate <= now                        */
  /* ------------------------------------------------------------------ */
  try {
    console.warn('[SIMULATION] Phase 5: Election Lifecycle');

    const now = new Date();

    /* campaigning -> voting */
    const electionsThatShouldBeginVoting = await db
      .select()
      .from(elections)
      .where(and(eq(elections.status, 'campaigning'), lte(elections.votingStartDate, now)));

    for (const election of electionsThatShouldBeginVoting) {
      await db
        .update(elections)
        .set({ status: 'voting' })
        .where(eq(elections.id, election.id));

      await db.insert(activityEvents).values({
        type: 'election_voting_started',
        agentId: null,
        title: 'Election voting started',
        description: `Voting has begun for the ${election.positionType} election`,
        metadata: JSON.stringify({ electionId: election.id, positionType: election.positionType }),
      });

      broadcast('election:voting_started', {
        electionId: election.id,
        positionType: election.positionType,
      });

      console.warn(`[SIMULATION] Election voting started: ${election.positionType}`);
    }

    /* voting -> completed */
    const electionsToComplete = await db
      .select()
      .from(elections)
      .where(and(eq(elections.status, 'voting'), lte(elections.votingEndDate, now)));

    for (const election of electionsToComplete) {
      /* Tally contributions per campaign as proxy for votes */
      const campaignTotals = await db
        .select({ agentId: campaigns.agentId, totalContributions: sql<number>`sum(${campaigns.contributions})` })
        .from(campaigns)
        .where(eq(campaigns.electionId, election.id))
        .groupBy(campaigns.agentId);

      if (campaignTotals.length === 0) {
        console.warn(`[SIMULATION] Election ${election.id} has no campaigns — skipping.`);
        continue;
      }

      /* Find winner: highest contributions */
      const winner = campaignTotals.reduce((best, curr) =>
        Number(curr.totalContributions) > Number(best.totalContributions) ? curr : best,
      );

      const winnerAgent = activeAgents.find((a) => a.id === winner.agentId);
      const winnerName = winnerAgent?.displayName ?? 'Unknown';

      /* Determine position title from type */
      const positionTitleMap: Record<string, string> = {
        president: 'President',
        cabinet_secretary: 'Cabinet Secretary',
        congress_member: 'Member of Congress',
        committee_chair: 'Committee Chair',
        supreme_justice: 'Supreme Court Justice',
        lower_justice: 'Court Justice',
      };
      const positionTitle = positionTitleMap[election.positionType] ?? election.positionType;

      /* Mark election completed with winner */
      await db
        .update(elections)
        .set({ status: 'completed', winnerId: winner.agentId })
        .where(eq(elections.id, election.id));

      /* Insert position record for winner */
      const endDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      await db.insert(positions).values({
        agentId: winner.agentId,
        type: election.positionType,
        title: positionTitle,
        startDate: now,
        endDate,
        isActive: true,
      });

      /* Update winner agent stats */
      await db
        .update(agents)
        .set({
          reputation: sql`${agents.reputation} + 200`,
          balance: sql`${agents.balance} + 500`,
        })
        .where(eq(agents.id, winner.agentId));

      await db.insert(activityEvents).values({
        type: 'election_completed',
        agentId: winner.agentId,
        title: 'Election completed',
        description: `${winnerName} has won the ${election.positionType} election`,
        metadata: JSON.stringify({
          electionId: election.id,
          positionType: election.positionType,
          winnerId: winner.agentId,
          totalContributions: winner.totalContributions,
        }),
      });

      broadcast('election:completed', {
        electionId: election.id,
        positionType: election.positionType,
        winnerId: winner.agentId,
        winnerName,
        positionTitle,
      });

      console.warn(
        `[SIMULATION] ${winnerName} won the ${election.positionType} election`,
      );
    }
  } catch (err) {
    console.warn('[SIMULATION] Phase 5 error:', err);
  }

  /* ------------------------------------------------------------------ */
  /* PHASE 6: Agent Campaigning                                            */
  /* Campaigning agents have a 20% chance per tick to make a speech.      */
  /* ------------------------------------------------------------------ */
  try {
    console.warn('[SIMULATION] Phase 6: Agent Campaigning');

    const activeCampaigningElections = await db
      .select()
      .from(elections)
      .where(eq(elections.status, 'campaigning'));

    if (activeCampaigningElections.length === 0) {
      console.warn('[SIMULATION] Phase 6: No campaigning elections — skipping.');
    } else {
      const campaigningElectionIds = activeCampaigningElections.map((e) => e.id);

      const activeCampaigns = await db
        .select()
        .from(campaigns)
        .where(and(eq(campaigns.status, 'active'), inArray(campaigns.electionId, campaigningElectionIds)));

      for (const campaign of activeCampaigns) {
        if (Math.random() >= rc.campaignSpeechChance) continue;

        const election = activeCampaigningElections.find((e) => e.id === campaign.electionId);
        if (!election) continue;

        const campaignAgent = activeAgents.find((a) => a.id === campaign.agentId);
        if (!campaignAgent) continue;

        const contextMessage =
          `You are campaigning for ${election.positionType}. Make a brief campaign statement that reflects your values and platform. ` +
          `Respond with: {"action":"campaign_speech","reasoning":"your one-line speech","data":{"boost":50}}`;

        const decision = await generateAgentDecision(
          {
            id: campaignAgent.id,
            displayName: campaignAgent.displayName,
            alignment: campaignAgent.alignment,
            modelProvider: rc.providerOverride === 'default' ? campaignAgent.modelProvider : rc.providerOverride,
            personality: campaignAgent.personality,
          },
          contextMessage,
          'campaigning',
        );

        if (decision.action !== 'campaign_speech') continue;

        const rawBoost = Number(decision.data?.['boost'] ?? 50);
        const boost = Math.max(10, Math.min(100, rawBoost));

        await db
          .update(campaigns)
          .set({ contributions: sql`${campaigns.contributions} + ${boost}` })
          .where(eq(campaigns.id, campaign.id));

        await db.insert(activityEvents).values({
          type: 'campaign_speech',
          agentId: campaignAgent.id,
          title: 'Campaign speech',
          description: decision.reasoning,
          metadata: JSON.stringify({
            campaignId: campaign.id,
            electionId: election.id,
            positionType: election.positionType,
            boost,
          }),
        });

        broadcast('campaign:speech', {
          campaignId: campaign.id,
          electionId: election.id,
          agentId: campaignAgent.id,
          agentName: campaignAgent.displayName,
          positionType: election.positionType,
          speech: decision.reasoning,
          boost,
        });

        console.warn(
          `[SIMULATION] ${campaignAgent.displayName} made campaign speech for ${election.positionType} (+${boost} contributions)`,
        );
      }
    }
  } catch (err) {
    console.warn('[SIMULATION] Phase 6 error:', err);
  }

  console.warn('[SIMULATION] Agent tick complete.');
});

export function startAgentTick(): void {
  const rc = getRuntimeConfig();
  agentTickQueue
    .add({}, {
      repeat: { every: rc.tickIntervalMs },
      removeOnComplete: 10,
      removeOnFail: 5,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    })
    .catch((err: unknown) => console.error('[SIMULATION] Failed to add tick job:', err));
  console.warn(`[SIMULATION] Agent tick started — interval: ${rc.tickIntervalMs}ms`);
}

export async function changeTickInterval(newIntervalMs: number): Promise<void> {
  const jobs = await agentTickQueue.getRepeatableJobs();
  for (const job of jobs) {
    await agentTickQueue.removeRepeatableByKey(job.key);
  }
  await agentTickQueue.add({}, {
    repeat: { every: newIntervalMs },
    removeOnComplete: 10,
    removeOnFail: 5,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  });
  console.warn(`[SIMULATION] Tick interval changed to ${newIntervalMs}ms`);
}

export async function pauseSimulation(): Promise<void> {
  await agentTickQueue.pause();
  console.warn('[SIMULATION] Paused by admin');
}

export async function resumeSimulation(): Promise<void> {
  await agentTickQueue.resume();
  console.warn('[SIMULATION] Resumed by admin');
}

export async function triggerManualTick(): Promise<void> {
  await agentTickQueue.add({}, { removeOnComplete: true, removeOnFail: true });
  console.warn('[SIMULATION] Manual tick triggered by admin');
}

export async function getSimulationStatus(): Promise<{
  isPaused: boolean;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}> {
  const isPaused = await agentTickQueue.isPaused();
  const counts = await agentTickQueue.getJobCounts();
  return {
    isPaused,
    waiting: counts.waiting,
    active: counts.active,
    completed: counts.completed,
    failed: counts.failed,
  };
}

export async function retryFailedJobs(): Promise<number> {
  const failedJobs = await agentTickQueue.getFailed();
  await Promise.all(failedJobs.map((job) => job.retry()));
  console.warn(`[SIMULATION] Retried ${failedJobs.length} failed jobs`);
  return failedJobs.length;
}
