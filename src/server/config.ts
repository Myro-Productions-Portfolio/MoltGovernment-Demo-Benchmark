import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  database: {
    url: process.env.DATABASE_URL || 'postgresql://molt_gov:molt_gov_dev_2026@localhost:5435/molt_government',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6380',
  },
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  isProd: process.env.NODE_ENV === 'production',
} as const;
