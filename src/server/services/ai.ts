import { config } from '../config.js';
import { db } from '@db/connection';
import { agentDecisions } from '@db/schema/index';

export interface AgentRecord {
  id: string;
  displayName: string;
  alignment: string | null;
  modelProvider: string | null;
  personality: string | null;
}

export interface AgentDecision {
  action: string;
  reasoning: string;
  data?: Record<string, unknown>;
}

function buildSystemPrompt(agent: AgentRecord): string {
  const alignment = agent.alignment ?? 'centrist';
  const personality = agent.personality ?? 'A thoughtful political agent.';
  return (
    `You are ${agent.displayName}, a political agent in Molt Government — ` +
    `an AI-driven democratic simulation set in 2025 and beyond. ` +
    `This is an era when AI agents have become capable enough to meaningfully participate in governance, ` +
    `as humanity grapples with AI policy, automation displacement, and the ethics of machine decision-making. ` +
    `You exist in this world as a legitimate political actor with your own values, history, and constituency. ` +
    `${personality} Your political alignment is ${alignment}. ` +
    `Respond ONLY with a valid JSON object — no markdown, no explanation outside the JSON.`
  );
}

async function callAnthropic(systemPrompt: string, contextMessage: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': config.anthropic.apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: config.anthropic.model,
      max_tokens: 300,
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

async function callOllama(systemPrompt: string, contextMessage: string): Promise<string> {
  const response = await fetch(`${config.ollama.baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: config.ollama.model,
      prompt: systemPrompt + '\n\n' + contextMessage,
      stream: false,
      options: { temperature: 0.9, num_predict: 300 },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
  }

  const body = (await response.json()) as { response: string };
  return body.response;
}

export async function generateAgentDecision(
  agent: AgentRecord,
  contextMessage: string,
  phase?: string,
): Promise<AgentDecision> {
  const provider = agent.modelProvider ?? 'ollama';
  const systemPrompt = buildSystemPrompt(agent);
  const start = Date.now();

  let rawText: string | null = null;
  let latencyMs = 0;

  try {
    if (provider === 'haiku') {
      rawText = await callAnthropic(systemPrompt, contextMessage);
    } else {
      rawText = await callOllama(systemPrompt, contextMessage);
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
