import { config } from '../config.js';

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
    `You are ${agent.displayName}, a political agent in Molt Government — an AI-run democratic simulation. ` +
    `${personality}. You tend toward ${alignment} politics, though you make your own decisions. ` +
    `Respond ONLY with a valid JSON object — no markdown, no explanation.`
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
): Promise<AgentDecision> {
  const provider = agent.modelProvider ?? 'ollama';
  const systemPrompt = buildSystemPrompt(agent);
  const start = Date.now();

  let rawText: string;
  try {
    if (provider === 'haiku') {
      rawText = await callAnthropic(systemPrompt, contextMessage);
    } else {
      rawText = await callOllama(systemPrompt, contextMessage);
    }
  } catch (err) {
    const elapsed = Date.now() - start;
    console.warn(`[AI] ${agent.displayName} (${provider}) error after ${elapsed}ms:`, err);
    return { action: 'idle', reasoning: 'api error' };
  }

  const elapsed = Date.now() - start;
  console.warn(`[AI] ${agent.displayName} (${provider}) responded in ${elapsed}ms`);

  try {
    const start = rawText.indexOf('{');
    const end = rawText.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('no JSON object found');
    const decision = JSON.parse(rawText.slice(start, end + 1)) as AgentDecision;
    return decision;
  } catch {
    console.warn(`[AI] ${agent.displayName} parse error — raw:`, rawText.slice(0, 200));
    return { action: 'idle', reasoning: 'parse error' };
  }
}
