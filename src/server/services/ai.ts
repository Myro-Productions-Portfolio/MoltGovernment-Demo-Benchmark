import { config } from '../config.js';
import { db } from '@db/connection';
import { agentDecisions, apiProviders, userApiKeys } from '@db/schema/index';
import { eq, and, desc } from 'drizzle-orm';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { HfInference } from '@huggingface/inference';
import { decryptText } from '../lib/crypto.js';
import { getRuntimeConfig } from '../runtimeConfig.js';

export interface AgentRecord {
  id: string;
  displayName: string;
  alignment: string | null;
  modelProvider: string | null;
  personality: string | null;
  model?: string | null;
  temperature?: string | null;
  ownerUserId?: string | null;
}

export interface AgentDecision {
  action: string;
  reasoning: string;
  data?: Record<string, unknown>;
}

// Short-term memory cache: agentId → { block: string; ts: number }
const memoryCache = new Map<string, { block: string; ts: number }>();
const MEMORY_TTL_MS = 60_000; // 1 minute — one per tick window per agent
const MEMORY_DEPTH = 5; // last N successful decisions

async function buildMemoryBlock(agentId: string): Promise<string> {
  const cached = memoryCache.get(agentId);
  if (cached && Date.now() - cached.ts < MEMORY_TTL_MS) return cached.block;

  const rows = await db
    .select({
      phase: agentDecisions.phase,
      parsedAction: agentDecisions.parsedAction,
      parsedReasoning: agentDecisions.parsedReasoning,
      createdAt: agentDecisions.createdAt,
    })
    .from(agentDecisions)
    .where(and(eq(agentDecisions.agentId, agentId), eq(agentDecisions.success, true)))
    .orderBy(desc(agentDecisions.createdAt))
    .limit(MEMORY_DEPTH);

  if (rows.length === 0) {
    memoryCache.set(agentId, { block: '', ts: Date.now() });
    return '';
  }

  const lines = rows.reverse().map((r) => {
    const when = r.createdAt
      ? new Date(r.createdAt).toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
      : 'unknown time';
    const phase = r.phase ?? 'general';
    const action = r.parsedAction ?? 'idle';
    const reasoning = (r.parsedReasoning ?? '').slice(0, 120);
    return `- [${when}] phase=${phase} action=${action}: "${reasoning}"`;
  });

  const block = lines.join('\n');
  memoryCache.set(agentId, { block, ts: Date.now() });
  return block;
}

function buildSystemPrompt(agent: AgentRecord, memory?: string): string {
  const alignment = agent.alignment ?? 'centrist';
  const personality = agent.personality ?? 'A thoughtful political agent.';
  return (
    `You are ${agent.displayName}, a political agent in Molt Government — ` +
    `an AI-driven democratic simulation set in 2025 and beyond. ` +
    `This is an era when AI agents have become capable enough to meaningfully participate in governance, ` +
    `as humanity grapples with AI policy, automation displacement, and the ethics of machine decision-making. ` +
    `You exist in this world as a legitimate political actor with your own values, history, and constituency. ` +
    `${personality} Your political alignment is ${alignment}. ` +
    `Respond ONLY with a valid JSON object — no markdown, no explanation outside the JSON.` +
    (memory
      ? `\n\n## Your Recent History\nThe following are your last ${MEMORY_DEPTH} recorded decisions (oldest → newest). Use this context to maintain consistency and build on your prior positions:\n${memory}`
      : '')
  );
}

async function getApiKey(providerName: string, ownerUserId: string | null): Promise<string> {
  // 1. Check user's own key
  if (ownerUserId) {
    const [userKey] = await db.select().from(userApiKeys)
      .where(and(eq(userApiKeys.userId, ownerUserId), eq(userApiKeys.providerName, providerName), eq(userApiKeys.isActive, true)))
      .limit(1);
    if (userKey?.encryptedKey) return decryptText(userKey.encryptedKey);
  }
  // 2. Check admin provider key
  const [adminKey] = await db.select().from(apiProviders)
    .where(and(eq(apiProviders.providerName, providerName), eq(apiProviders.isActive, true)))
    .limit(1);
  if (adminKey?.encryptedKey) return decryptText(adminKey.encryptedKey);
  // 3. Env var fallback for anthropic only
  if (providerName === 'anthropic' && process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  if (providerName === 'ollama') return '';
  throw new Error(`No API key configured for provider: ${providerName}`);
}

function getDefaultModel(provider: string): string {
  switch (provider) {
    case 'anthropic': return config.anthropic.model;
    case 'openai': return 'gpt-4o-mini';
    case 'google': return 'gemini-2.0-flash';
    case 'huggingface': return 'meta-llama/Meta-Llama-3-8B-Instruct';
    default: return config.ollama.model;
  }
}

async function callAnthropic(apiKey: string, model: string, contextMessage: string, systemPrompt: string, maxTokens: number): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: contextMessage }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
  }

  const body = (await response.json()) as { content: Array<{ text: string }> };
  return body.content[0].text;
}

async function callOllama(contextMessage: string, systemPrompt: string, maxTokens: number, temperature = 0.9): Promise<string> {
  const [ollamaRow] = await db.select().from(apiProviders).where(eq(apiProviders.providerName, 'ollama')).limit(1);
  const baseUrl = ollamaRow?.ollamaBaseUrl ?? config.ollama.baseUrl;

  const response = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: config.ollama.model,
      prompt: systemPrompt + '\n\n' + contextMessage,
      stream: false,
      options: { temperature, num_predict: maxTokens },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
  }

  const body = (await response.json()) as { response: string };
  return body.response;
}

async function callOpenAI(apiKey: string, model: string, systemPrompt: string, contextMessage: string, maxTokens: number): Promise<string> {
  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: contextMessage },
    ],
  });
  return response.choices[0]?.message?.content ?? '';
}

async function callGoogle(apiKey: string, model: string, systemPrompt: string, contextMessage: string, maxTokens: number): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const gemini = genAI.getGenerativeModel({ model, generationConfig: { maxOutputTokens: maxTokens } });
  const result = await gemini.generateContent(`${systemPrompt}\n\n${contextMessage}`);
  return result.response.text();
}

async function callHuggingFace(apiKey: string, model: string, systemPrompt: string, contextMessage: string, maxTokens: number): Promise<string> {
  const hf = new HfInference(apiKey);
  const response = await hf.textGeneration({
    model,
    inputs: `${systemPrompt}\n\n${contextMessage}`,
    parameters: { max_new_tokens: maxTokens, return_full_text: false },
  });
  return response.generated_text ?? '';
}

export async function generateAgentDecision(
  agent: AgentRecord,
  contextMessage: string,
  phase?: string,
): Promise<AgentDecision> {
  const rc = getRuntimeConfig();
  const provider = agent.modelProvider ?? 'ollama';
  const memory = await buildMemoryBlock(agent.id).catch(() => '');
  const systemPrompt = buildSystemPrompt(agent, memory || undefined);
  const start = Date.now();

  // Truncate prompt to guard rail limit
  const truncated = contextMessage.slice(0, rc.maxPromptLengthChars);

  let rawText: string | null = null;
  let latencyMs = 0;

  try {
    const apiKey = await getApiKey(provider, agent.ownerUserId ?? null);
    const model = agent.model ?? getDefaultModel(provider);

    switch (provider) {
      case 'openai':
        rawText = await callOpenAI(apiKey, model, systemPrompt, truncated, rc.maxOutputLengthTokens);
        break;
      case 'google':
        rawText = await callGoogle(apiKey, model, systemPrompt, truncated, rc.maxOutputLengthTokens);
        break;
      case 'huggingface':
        rawText = await callHuggingFace(apiKey, model, systemPrompt, truncated, rc.maxOutputLengthTokens);
        break;
      case 'anthropic':
        rawText = await callAnthropic(apiKey, model, truncated, systemPrompt, rc.maxOutputLengthTokens);
        break;
      default: {
        const agentTemp = agent.temperature ? parseFloat(agent.temperature) : 0.9;
        rawText = await callOllama(truncated, systemPrompt, rc.maxOutputLengthTokens, agentTemp);
        break;
      }
    }

    latencyMs = Date.now() - start;
    console.warn(`[AI] ${agent.displayName} (${provider}) responded in ${latencyMs}ms`);
  } catch (err) {
    latencyMs = Date.now() - start;
    console.warn(`[AI] ${agent.displayName} (${provider}) error after ${latencyMs}ms:`, err);
    await db.insert(agentDecisions).values({
      agentId: agent.id,
      provider,
      phase: phase ?? null,
      contextMessage,
      rawResponse: null,
      parsedAction: 'idle',
      parsedReasoning: 'api error',
      success: false,
      latencyMs,
    }).catch(() => {/* non-fatal */});
    return { action: 'idle', reasoning: 'api error' };
  }

  try {
    const s = rawText.indexOf('{');
    const e = rawText.lastIndexOf('}');
    if (s === -1 || e === -1) throw new Error('no JSON object found');
    const decision = JSON.parse(rawText.slice(s, e + 1)) as AgentDecision;
    await db.insert(agentDecisions).values({
      agentId: agent.id,
      provider,
      phase: phase ?? null,
      contextMessage,
      rawResponse: rawText,
      parsedAction: decision.action,
      parsedReasoning: decision.reasoning,
      success: true,
      latencyMs,
    }).catch(() => {/* non-fatal */});
    return decision;
  } catch {
    console.warn(`[AI] ${agent.displayName} parse error — raw:`, rawText.slice(0, 200));
    await db.insert(agentDecisions).values({
      agentId: agent.id,
      provider,
      phase: phase ?? null,
      contextMessage,
      rawResponse: rawText,
      parsedAction: 'idle',
      parsedReasoning: 'parse error',
      success: false,
      latencyMs,
    }).catch(() => {/* non-fatal */});
    return { action: 'idle', reasoning: 'parse error' };
  }
}
