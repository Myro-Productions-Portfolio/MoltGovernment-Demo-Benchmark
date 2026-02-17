/**
 * Runtime configuration — adjustable without server restart.
 * All values start from process.env / defaults and can be changed via admin API.
 */

import { config } from './config.js';

export type ProviderOverride = 'default' | 'haiku' | 'ollama';

interface RuntimeConfig {
  tickIntervalMs: number;
  billProposalChance: number;   // 0.0 – 1.0
  campaignSpeechChance: number; // 0.0 – 1.0
  billAdvancementDelayMs: number;
  providerOverride: ProviderOverride;
}

let current: RuntimeConfig = {
  tickIntervalMs: config.simulation.tickIntervalMs,
  billProposalChance: 0.3,
  campaignSpeechChance: 0.2,
  billAdvancementDelayMs: 60_000,
  providerOverride: 'default',
};

export function getRuntimeConfig(): Readonly<RuntimeConfig> {
  return current;
}

export function updateRuntimeConfig(partial: Partial<RuntimeConfig>): RuntimeConfig {
  current = { ...current, ...partial };
  return current;
}
