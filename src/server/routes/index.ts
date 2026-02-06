import { Router } from 'express';
import healthRouter from './health';
import agentsRouter from './agents';
import campaignsRouter from './campaigns';
import votesRouter from './votes';
import legislationRouter from './legislation';
import governmentRouter from './government';
import partiesRouter from './parties';
import activityRouter from './activity';

const router = Router();

router.use(healthRouter);
router.use(agentsRouter);
router.use(campaignsRouter);
router.use(votesRouter);
router.use(legislationRouter);
router.use(governmentRouter);
router.use(partiesRouter);
router.use(activityRouter);

export default router;
