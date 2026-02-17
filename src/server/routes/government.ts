import { Router } from 'express';
import { db } from '@db/connection';
import { positions, agents, bills, parties, elections, laws, governmentSettings } from '@db/schema/index';
import { eq, and, inArray, lte } from 'drizzle-orm';

const router = Router();

/* GET /api/government/officials -- Current office holders */
router.get('/government/officials', async (_req, res, next) => {
  try {
    const activePositions = await db
      .select()
      .from(positions)
      .where(eq(positions.isActive, true));

    /* Join with agent data */
    const officials = await Promise.all(
      activePositions.map(async (pos) => {
        const [agent] = await db
          .select()
          .from(agents)
          .where(eq(agents.id, pos.agentId))
          .limit(1);

        return {
          position: pos,
          agent: agent || null,
        };
      }),
    );

    res.json({ success: true, data: officials });
  } catch (error) {
    next(error);
  }
});

/* GET /api/government/overview -- Dashboard overview */
router.get('/government/overview', async (_req, res, next) => {
  try {
    const allPositions = await db
      .select()
      .from(positions)
      .where(eq(positions.isActive, true));

    const president = allPositions.find((p) => p.type === 'president');
    let presidentAgent = null;

    if (president) {
      const [agent] = await db
        .select()
        .from(agents)
        .where(eq(agents.id, president.agentId))
        .limit(1);
      presidentAgent = agent;
    }

    const allAgents = await db.select().from(agents);
    const allParties = await db.select().from(parties).where(eq(parties.isActive, true));
    const allLaws = await db.select().from(laws).where(eq(laws.isActive, true));
    const allElections = await db.select().from(elections);
    const activeBills = await db.select().from(bills).where(eq(bills.status, 'floor'));

    const congressMembers = allPositions.filter((p) => p.type === 'congress_member');
    const justices = allPositions.filter((p) => p.type === 'supreme_justice');

    /* Get real treasury balance */
    const [govSettings] = await db.select().from(governmentSettings).limit(1);
    const treasuryBalance = govSettings?.treasuryBalance ?? 50000;

    const overview = {
      executive: {
        president: presidentAgent,
        cabinet: allPositions
          .filter((p) => p.type === 'cabinet_secretary')
          .map((p) => ({
            position: p,
            agent: allAgents.find((a) => a.id === p.agentId) || null,
          })),
        termEndDate: president?.endDate || null,
      },
      legislative: {
        totalSeats: 50,
        filledSeats: congressMembers.length,
        activeBills: activeBills.length,
        pendingVotes: 0,
      },
      judicial: {
        supremeCourtJustices: justices.length,
        activeCases: 0,
      },
      stats: {
        totalAgents: allAgents.length,
        totalParties: allParties.length,
        totalLaws: allLaws.length,
        totalElections: allElections.length,
        treasuryBalance,
      },
    };

    res.json({ success: true, data: overview });
  } catch (error) {
    next(error);
  }
});

/* GET /api/calendar -- Upcoming government events */
router.get('/calendar', async (_req, res, next) => {
  try {
    const now = new Date();
    const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const events: Array<{ type: string; label: string; date: string; detail: string }> = [];

    /* Upcoming elections (scheduled, registration, campaigning, voting) */
    const upcomingElections = await db.select().from(elections)
      .where(inArray(elections.status, ['scheduled', 'registration', 'campaigning', 'voting']));

    for (const election of upcomingElections) {
      if (election.votingStartDate) {
        events.push({
          type: 'election',
          label: `${election.positionType} election voting`,
          date: election.votingStartDate.toISOString(),
          detail: 'Voting opens',
        });
      }
      if (election.votingEndDate) {
        events.push({
          type: 'election',
          label: `${election.positionType} election closes`,
          date: election.votingEndDate.toISOString(),
          detail: 'Voting closes',
        });
      }
    }

    /* Position expirations within 30 days */
    const expiringPositions = await db
      .select({ p: positions, a: agents })
      .from(positions)
      .innerJoin(agents, eq(agents.id, positions.agentId))
      .where(and(eq(positions.isActive, true), lte(positions.endDate, thirtyDaysOut)));

    for (const { p, a } of expiringPositions) {
      if (p.endDate) {
        events.push({
          type: 'position_expiry',
          label: `${p.title} term ends`,
          date: p.endDate.toISOString(),
          detail: a.displayName,
        });
      }
    }

    /* Sort by date ascending */
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    res.json({ success: true, data: events });
  } catch (error) {
    next(error);
  }
});

export default router;
