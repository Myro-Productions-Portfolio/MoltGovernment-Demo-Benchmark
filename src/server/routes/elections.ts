import { Router } from 'express';
import { db } from '@db/connection';
import { elections, agents, votes } from '@db/schema/index';
import { AppError } from '../middleware/errorHandler';
import { eq, inArray } from 'drizzle-orm';

const router = Router();

/* GET /api/elections/active -- Returns active/upcoming elections */
router.get('/elections/active', async (_req, res, next) => {
  try {
    const results = await db
      .select()
      .from(elections)
      .where(
        inArray(elections.status, ['scheduled', 'registration', 'campaigning', 'voting', 'counting']),
      );

    const data = results.map((e) => ({
      id: e.id,
      title: `${e.positionType.charAt(0).toUpperCase() + e.positionType.slice(1).replace('_', ' ')} Election`,
      type: e.positionType,
      status: e.status,
      votingStartsAt: e.votingStartDate ?? null,
      votingEndsAt: e.votingEndDate ?? null,
      scheduledDate: e.scheduledDate,
      registrationDeadline: e.registrationDeadline,
    }));

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

/* GET /api/elections/past -- Returns completed/certified elections */
router.get('/elections/past', async (_req, res, next) => {
  try {
    const results = await db
      .select()
      .from(elections)
      .where(eq(elections.status, 'certified'));

    const data = await Promise.all(
      results.map(async (e) => {
        let winnerName: string | null = null;
        if (e.winnerId) {
          const [winner] = await db
            .select({ displayName: agents.displayName })
            .from(agents)
            .where(eq(agents.id, e.winnerId))
            .limit(1);
          winnerName = winner?.displayName ?? null;
        }

        /* Compute vote counts for this election */
        const electionVotes = await db
          .select()
          .from(votes)
          .where(eq(votes.electionId, e.id));

        const winnerVotes = winnerName && e.winnerId
          ? electionVotes.filter((v) => v.candidateId === e.winnerId).length
          : 0;
        const votePercentage =
          e.totalVotes > 0 ? Math.round((winnerVotes / e.totalVotes) * 100) : 0;

        return {
          id: e.id,
          title: `${e.positionType.charAt(0).toUpperCase() + e.positionType.slice(1).replace('_', ' ')} Election`,
          type: e.positionType,
          status: e.status,
          winnerId: e.winnerId,
          winnerName,
          totalVotes: e.totalVotes,
          votePercentage,
          certifiedDate: e.certifiedDate,
          scheduledDate: e.scheduledDate,
        };
      }),
    );

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

/* GET /api/elections/:id -- Single election detail */
router.get('/elections/:id', async (req, res, next) => {
  try {
    const [election] = await db
      .select()
      .from(elections)
      .where(eq(elections.id, req.params.id))
      .limit(1);

    if (!election) {
      throw new AppError(404, 'Election not found');
    }

    let winnerName: string | null = null;
    if (election.winnerId) {
      const [winner] = await db
        .select({ displayName: agents.displayName })
        .from(agents)
        .where(eq(agents.id, election.winnerId))
        .limit(1);
      winnerName = winner?.displayName ?? null;
    }

    res.json({
      success: true,
      data: {
        ...election,
        title: `${election.positionType.charAt(0).toUpperCase() + election.positionType.slice(1).replace('_', ' ')} Election`,
        winnerName,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
