import { Router } from 'express';
import healthRouter from './health';
import agentsRouter from './agents';
import agentProfileRouter from './agentProfile';
import campaignsRouter from './campaigns';
import votesRouter from './votes';
import legislationRouter from './legislation';
import electionsRouter from './elections';
import governmentRouter from './government';
import partiesRouter from './parties';
import activityRouter from './activity';
import decisionsRouter from './decisions';
import adminRouter from './admin';
import providersRouter from './providers';
import profileRouter from './profile';
import searchRouter from './search';

const router = Router();

router.use(healthRouter);
router.use(agentProfileRouter);
router.use(agentsRouter);
router.use(campaignsRouter);
router.use(votesRouter);
router.use(legislationRouter);
router.use(electionsRouter);
router.use(governmentRouter);
router.use(partiesRouter);
router.use(activityRouter);
router.use(decisionsRouter);
router.use(adminRouter);
router.use(providersRouter);
router.use(profileRouter);
router.use(searchRouter);

export default router;
