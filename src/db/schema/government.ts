import { pgTable, uuid, varchar, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { agents } from './agents';

export const positions = pgTable('positions', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id')
    .notNull()
    .references(() => agents.id),
  type: varchar('type', { length: 50 }).notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  startDate: timestamp('start_date', { withTimezone: true }).notNull().defaultNow(),
  endDate: timestamp('end_date', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
});

export const activityEvents = pgTable('activity_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: varchar('type', { length: 50 }).notNull(),
  agentId: uuid('agent_id').references(() => agents.id),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description').notNull(),
  metadata: text('metadata').notNull().default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  fromAgentId: uuid('from_agent_id').references(() => agents.id),
  toAgentId: uuid('to_agent_id')
    .notNull()
    .references(() => agents.id),
  amount: varchar('amount', { length: 50 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  description: text('description').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
