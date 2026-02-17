import Bull from 'bull';
import { eq, and, inArray } from 'drizzle-orm';
import { config } from '../config.js';
import { db } from '@db/connection';
import { agents, bills, billVotes, activityEvents } from '@db/schema/index';
import { generateAgentDecision } from '../services/ai.js';
import { broadcast } from '../websocket.js';

const agentTickQueue = new Bull('agent-tick', config.redis.url);

agentTickQueue.process(async () => {
  console.warn('[SIMULATION] Agent tick running...');

  /* 1. Fetch all active agents */
  const activeAgents = await db.select().from(agents).where(eq(agents.isActive, true));

  /* 2. Fetch all bills with status 'floor' */
  const floorBills = await db.select().from(bills).where(eq(bills.status, 'floor'));

  if (floorBills.length === 0) {
    console.warn('[SIMULATION] No floor bills — nothing to vote on.');
    return;
  }

  const floorBillIds = floorBills.map((b) => b.id);

  /* Process agents sequentially */
  for (const agent of activeAgents) {
    /* 3. Find which bills this agent has already voted on */
    const existingVotes = await db
      .select({ billId: billVotes.billId })
      .from(billVotes)
      .where(and(eq(billVotes.voterId, agent.id), inArray(billVotes.billId, floorBillIds)));

    const votedBillIds = new Set(existingVotes.map((v) => v.billId));

    /* Process each unvoted floor bill */
    for (const bill of floorBills) {
      if (votedBillIds.has(bill.id)) continue;

      /* 4. Build context message */
      const contextMessage =
        `Bill up for vote: '${bill.title}'. ` +
        `Summary: ${bill.summary}. ` +
        `Committee: ${bill.committee}. ` +
        `Vote yea or nay and explain your reasoning in one sentence.`;

      /* 5. Call AI */
      const decision = await generateAgentDecision(
        {
          id: agent.id,
          displayName: agent.displayName,
          alignment: agent.alignment,
          modelProvider: agent.modelProvider,
          personality: agent.personality,
        },
        contextMessage,
      );

      /* 6. If action is 'vote', record the vote */
      if (decision.action === 'vote' && decision.data) {
        const choice = String(decision.data['choice'] ?? 'nay');

        await db.insert(billVotes).values({
          billId: bill.id,
          voterId: agent.id,
          choice,
        });

        /* 7. Insert activity event */
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

        /* 8. Broadcast */
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

  console.warn('[SIMULATION] Agent tick complete.');
});

export function startAgentTick(): void {
  agentTickQueue
    .add({}, { repeat: { every: config.simulation.tickIntervalMs }, removeOnComplete: 10, removeOnFail: 5 })
    .catch((err: unknown) => console.error('[SIMULATION] Failed to add tick job:', err));
  console.warn(`[SIMULATION] Agent tick started — interval: ${config.simulation.tickIntervalMs}ms`);
}
