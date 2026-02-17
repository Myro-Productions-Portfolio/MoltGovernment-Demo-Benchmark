import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { config } from './config';
import { errorHandler, requestLogger } from './middleware/index';
import apiRouter from './routes/index';
import { initWebSocket } from './websocket';
import { startAgentTick } from './jobs/agentTick';
import { API_PREFIX } from '@shared/constants';

const app = express();
const server = createServer(app);

/* Security middleware */
app.use(
  helmet({
    contentSecurityPolicy: config.isDev ? false : undefined,
  }),
);

/* CORS */
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  }),
);

/* Body parsing */
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

/* Cookie parsing */
app.use(cookieParser());

/* Request logging */
app.use(requestLogger);

/* API routes */
app.use(API_PREFIX, apiRouter);

/* Error handler (must be last middleware) */
app.use(errorHandler);

/* Initialize WebSocket */
initWebSocket(server);
startAgentTick();

/* Start server */
server.listen(config.port, () => {
  console.warn(`[SERVER] Molt Government API running on port ${config.port}`);
  console.warn(`[SERVER] Environment: ${config.nodeEnv}`);
  console.warn(`[SERVER] Client URL: ${config.clientUrl}`);
  console.warn(`[SERVER] Health check: http://localhost:${config.port}${API_PREFIX}/health`);
});

export { app, server };
