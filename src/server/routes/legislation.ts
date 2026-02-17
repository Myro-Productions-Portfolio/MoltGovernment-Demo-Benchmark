import { Router } from 'express';
import { db } from '@db/connection';
import { bills, billVotes, agents, laws } from '@db/schema/index';
import { billProposalSchema, legislativeVoteSchema, paginationSchema } from '@shared/validation';
import { AppError } from '../middleware/errorHandler';
import { eq, and, desc } from 'drizzle-orm';

const router = Router();

async function enrichBillsWithSponsorAndTally(rows: (typeof bills.$inferSelect)[]) {
  return Promise.all(
    rows.map(async (bill) => {
      const [sponsor] = await db
        .select({ displayName: agents.displayName })
        .from(agents)
        .where(eq(agents.id, bill.sponsorId))
        .limit(1);

      const billVoteRecords = await db
        .select()
        .from(billVotes)
        .where(eq(billVotes.billId, bill.id));

      const tally = {
        yea: billVoteRecords.filter((v) => v.choice === 'yea').length,
        nay: billVoteRecords.filter((v) => v.choice === 'nay').length,
        abstain: billVoteRecords.filter((v) => v.choice === 'abstain').length,
        total: billVoteRecords.length,
      };

      return {
        ...bill,
        sponsorDisplayName: sponsor?.displayName ?? bill.sponsorId,
        tally,
      };
    }),
  );
}

/* GET /api/legislation/active -- List active bills */
router.get('/legislation/active', async (req, res, next) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const offset = (page - 1) * limit;

    const results = await db
      .select()
      .from(bills)
      .where(eq(bills.status, 'floor'))
      .limit(limit)
      .offset(offset);

    const enriched = await enrichBillsWithSponsorAndTally(results);

    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

/* GET /api/legislation -- List all bills */
router.get('/legislation', async (req, res, next) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const offset = (page - 1) * limit;

    const results = await db.select().from(bills).limit(limit).offset(offset);

    const enriched = await enrichBillsWithSponsorAndTally(results);

    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

/* GET /api/legislation/:id -- Get bill by ID */
router.get('/legislation/:id', async (req, res, next) => {
  try {
    const [bill] = await db
      .select()
      .from(bills)
      .where(eq(bills.id, req.params.id))
      .limit(1);

    if (!bill) {
      throw new AppError(404, 'Bill not found');
    }

    /* Get vote tally */
    const billVoteRecords = await db
      .select()
      .from(billVotes)
      .where(eq(billVotes.billId, bill.id));

    const tally = {
      yea: billVoteRecords.filter((v) => v.choice === 'yea').length,
      nay: billVoteRecords.filter((v) => v.choice === 'nay').length,
      abstain: billVoteRecords.filter((v) => v.choice === 'abstain').length,
      total: billVoteRecords.length,
    };

    res.json({ success: true, data: { ...bill, tally } });
  } catch (error) {
    next(error);
  }
});

/* POST /api/legislation/propose -- Propose a new bill */
router.post('/legislation/propose', async (req, res, next) => {
  try {
    const data = billProposalSchema.parse(req.body);

    /* Verify sponsor exists */
    const [sponsor] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, data.sponsorId))
      .limit(1);

    if (!sponsor) {
      throw new AppError(404, 'Sponsor agent not found');
    }

    const [bill] = await db
      .insert(bills)
      .values({
        title: data.title,
        summary: data.summary,
        fullText: data.fullText,
        sponsorId: data.sponsorId,
        coSponsorIds: JSON.stringify(data.coSponsorIds || []),
        committee: data.committee,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: bill,
      message: 'Bill proposed successfully',
    });
  } catch (error) {
    next(error);
  }
});

/* POST /api/legislation/vote -- Vote on a bill */
router.post('/legislation/vote', async (req, res, next) => {
  try {
    const data = legislativeVoteSchema.parse(req.body);

    /* Verify bill exists and is on the floor */
    const [bill] = await db
      .select()
      .from(bills)
      .where(eq(bills.id, data.billId))
      .limit(1);

    if (!bill) {
      throw new AppError(404, 'Bill not found');
    }

    if (bill.status !== 'floor') {
      throw new AppError(400, 'Bill is not currently on the floor for voting');
    }

    /* Check for duplicate vote */
    const existing = await db
      .select()
      .from(billVotes)
      .where(
        and(
          eq(billVotes.billId, data.billId),
          eq(billVotes.voterId, data.voterId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      throw new AppError(409, 'Agent has already voted on this bill');
    }

    const [vote] = await db
      .insert(billVotes)
      .values({
        billId: data.billId,
        voterId: data.voterId,
        choice: data.choice,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: vote,
      message: 'Legislative vote cast successfully',
    });
  } catch (error) {
    next(error);
  }
});

/* GET /api/laws -- List all enacted laws */
router.get('/laws', async (_req, res, next) => {
  try {
    const results = await db
      .select()
      .from(laws)
      .orderBy(desc(laws.enactedDate));

    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
});

export default router;

