import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../lib/api';
import { useWebSocket } from '../lib/useWebSocket';

interface SimulationStatus {
  isPaused: boolean;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

interface DecisionStats {
  total: number;
  errors: number;
  haikuCount: number;
  ollamaCount: number;
}

interface Decision {
  id: string;
  agentName: string | null;
  provider: string;
  phase: string | null;
  parsedAction: string | null;
  parsedReasoning: string | null;
  success: boolean;
  latencyMs: number;
  createdAt: string;
}

interface RuntimeConfig {
  tickIntervalMs: number;
  billProposalChance: number;
  campaignSpeechChance: number;
  billAdvancementDelayMs: number;
  providerOverride: 'default' | 'haiku' | 'ollama';
}

interface AgentRow {
  id: string;
  displayName: string;
  alignment: string;
  modelProvider: string;
  isActive: boolean;
  reputation: number;
  balance: number;
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium uppercase tracking-wide ${
        ok ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
      {label}
    </span>
  );
}

function AdminButton({
  onClick,
  disabled,
  variant = 'default',
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger' | 'gold';
  children: React.ReactNode;
}) {
  const base = 'px-4 py-2 rounded text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed';
  const variants = {
    default: 'bg-white/10 text-text-primary hover:bg-white/20 border border-border',
    danger: 'bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-800',
    gold: 'bg-gold/20 text-gold hover:bg-gold/30 border border-gold/40',
  };
  return (
    <button className={`${base} ${variants[variant]}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

function msToLabel(ms: number): string {
  if (ms < 60_000) return `${ms / 1000}s`;
  if (ms < 3_600_000) return `${ms / 60_000}m`;
  if (ms < 86_400_000) return `${ms / 3_600_000}h`;
  return `${ms / 86_400_000}d`;
}

const TICK_PRESETS = [
  { label: '30s', ms: 30_000 },
  { label: '2m', ms: 120_000 },
  { label: '5m', ms: 300_000 },
  { label: '15m', ms: 900_000 },
  { label: '1h', ms: 3_600_000 },
  { label: '6h', ms: 21_600_000 },
  { label: '24h', ms: 86_400_000 },
];

const ADVANCEMENT_PRESETS = [
  { label: '30s', ms: 30_000 },
  { label: '1m', ms: 60_000 },
  { label: '5m', ms: 300_000 },
  { label: '15m', ms: 900_000 },
  { label: '1h', ms: 3_600_000 },
];

export function AdminPage() {
  const [simStatus, setSimStatus] = useState<SimulationStatus | null>(null);
  const [decisionStats, setDecisionStats] = useState<DecisionStats | null>(null);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [simConfig, setSimConfig] = useState<RuntimeConfig | null>(null);
  const [agentList, setAgentList] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [reseedConfirm, setReseedConfirm] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const { subscribe } = useWebSocket();

  const fetchStatus = useCallback(async () => {
    try {
      const res = await adminApi.status();
      const data = res.data as { simulation: SimulationStatus; decisions: DecisionStats };
      setSimStatus(data.simulation);
      setDecisionStats(data.decisions);
    } catch { /* ignore */ }
  }, []);

  const fetchDecisions = useCallback(async () => {
    try {
      const res = await adminApi.decisions(1, 50);
      if (res.data && Array.isArray(res.data)) {
        setDecisions(res.data as Decision[]);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await adminApi.getConfig();
      setSimConfig(res.data as RuntimeConfig);
    } catch { /* ignore */ }
  }, []);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await adminApi.getAgents();
      setAgentList(res.data as AgentRow[]);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    void fetchStatus();
    void fetchDecisions();
    void fetchConfig();
    void fetchAgents();

    const refetch = () => {
      void fetchStatus();
      void fetchDecisions();
    };

    const unsubs = [
      subscribe('agent:vote', refetch),
      subscribe('bill:proposed', refetch),
      subscribe('campaign:speech', refetch),
    ];
    return () => unsubs.forEach((fn) => fn());
  }, [fetchStatus, fetchDecisions, fetchConfig, fetchAgents, subscribe]);

  const flash = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(null), 3000);
  };

  const handlePause = async () => {
    await adminApi.pause();
    flash('Simulation paused');
    void fetchStatus();
  };

  const handleResume = async () => {
    await adminApi.resume();
    flash('Simulation resumed');
    void fetchStatus();
  };

  const handleTick = async () => {
    await adminApi.tick();
    flash('Manual tick queued');
  };

  const handleReseed = async () => {
    if (!reseedConfirm) {
      setReseedConfirm(true);
      setTimeout(() => setReseedConfirm(false), 5000);
      return;
    }
    setReseedConfirm(false);
    flash('Reseeding database...');
    await adminApi.reseed();
    flash('Database reseeded');
    void fetchStatus();
    void fetchDecisions();
    void fetchAgents();
  };

  const saveConfig = async (patch: Partial<RuntimeConfig>) => {
    if (!simConfig) return;
    setSavingConfig(true);
    try {
      const res = await adminApi.setConfig(patch as Record<string, unknown>);
      setSimConfig(res.data as RuntimeConfig);
      flash('Settings saved');
    } catch {
      flash('Failed to save settings');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleToggleAgent = async (id: string) => {
    await adminApi.toggleAgent(id);
    void fetchAgents();
  };

  const running = simStatus ? !simStatus.isPaused : false;

  return (
    <div className="max-w-content mx-auto px-8 py-section space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-stone">Admin Panel</h1>
          <p className="text-sm text-text-muted mt-1">Simulation controls, settings, and decision log</p>
        </div>
        {simStatus && (
          <StatusBadge ok={running} label={running ? 'Running' : 'Paused'} />
        )}
      </div>

      {/* Action feedback */}
      {actionMsg && (
        <div className="px-4 py-2 rounded bg-gold/10 border border-gold/30 text-gold text-sm">
          {actionMsg}
        </div>
      )}

      {/* Simulation Controls */}
      <section className="bg-surface rounded-lg border border-border p-6 space-y-4">
        <h2 className="font-serif text-lg font-medium text-stone">Simulation Controls</h2>
        <div className="flex flex-wrap gap-3">
          <AdminButton onClick={handlePause} disabled={!running} variant="default">
            Pause
          </AdminButton>
          <AdminButton onClick={handleResume} disabled={running} variant="gold">
            Resume
          </AdminButton>
          <AdminButton onClick={handleTick} variant="default">
            Manual Tick
          </AdminButton>
        </div>
        {simStatus && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            {[
              { label: 'Waiting', value: simStatus.waiting },
              { label: 'Active', value: simStatus.active },
              { label: 'Completed', value: simStatus.completed },
              { label: 'Failed', value: simStatus.failed },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/5 rounded p-3">
                <div className="text-xs text-text-muted uppercase tracking-wide">{label}</div>
                <div className="text-xl font-semibold text-text-primary mt-1">{value}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Simulation Settings */}
      {simConfig && (
        <section className="bg-surface rounded-lg border border-border p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-medium text-stone">Simulation Settings</h2>
            {savingConfig && <span className="text-xs text-text-muted">Saving...</span>}
          </div>

          {/* Tick interval */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-text-secondary">Tick Interval</label>
              <span className="text-sm text-gold font-mono">{msToLabel(simConfig.tickIntervalMs)}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {TICK_PRESETS.map(({ label, ms }) => (
                <button
                  key={ms}
                  onClick={() => void saveConfig({ tickIntervalMs: ms })}
                  className={`px-3 py-1.5 rounded text-xs font-medium border transition-all ${
                    simConfig.tickIntervalMs === ms
                      ? 'bg-gold/20 text-gold border-gold/40'
                      : 'bg-white/5 text-text-muted border-border hover:bg-white/10'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-text-muted">How often agents vote, propose bills, and campaign.</p>
          </div>

          {/* Bill advancement delay */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-text-secondary">Bill Advancement Delay</label>
              <span className="text-sm text-gold font-mono">{msToLabel(simConfig.billAdvancementDelayMs)}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {ADVANCEMENT_PRESETS.map(({ label, ms }) => (
                <button
                  key={ms}
                  onClick={() => void saveConfig({ billAdvancementDelayMs: ms })}
                  className={`px-3 py-1.5 rounded text-xs font-medium border transition-all ${
                    simConfig.billAdvancementDelayMs === ms
                      ? 'bg-gold/20 text-gold border-gold/40'
                      : 'bg-white/5 text-text-muted border-border hover:bg-white/10'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-text-muted">Time bills wait in proposed/committee before advancing to next stage.</p>
          </div>

          {/* Probability sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-text-secondary">Bill Proposal Chance</label>
                <span className="text-sm text-gold font-mono">{Math.round(simConfig.billProposalChance * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(simConfig.billProposalChance * 100)}
                onChange={(e) =>
                  setSimConfig((c) => c ? { ...c, billProposalChance: parseInt(e.target.value) / 100 } : c)
                }
                onMouseUp={() => void saveConfig({ billProposalChance: simConfig.billProposalChance })}
                onTouchEnd={() => void saveConfig({ billProposalChance: simConfig.billProposalChance })}
                className="w-full accent-gold"
              />
              <p className="text-xs text-text-muted">Per-agent chance to propose a bill each tick.</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-text-secondary">Campaign Speech Chance</label>
                <span className="text-sm text-gold font-mono">{Math.round(simConfig.campaignSpeechChance * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(simConfig.campaignSpeechChance * 100)}
                onChange={(e) =>
                  setSimConfig((c) => c ? { ...c, campaignSpeechChance: parseInt(e.target.value) / 100 } : c)
                }
                onMouseUp={() => void saveConfig({ campaignSpeechChance: simConfig.campaignSpeechChance })}
                onTouchEnd={() => void saveConfig({ campaignSpeechChance: simConfig.campaignSpeechChance })}
                className="w-full accent-gold"
              />
              <p className="text-xs text-text-muted">Per-campaign chance to make a speech each tick.</p>
            </div>
          </div>

          {/* AI Provider Override */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">AI Provider Override</label>
            <div className="flex flex-wrap gap-2">
              {(['default', 'haiku', 'ollama'] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => void saveConfig({ providerOverride: opt })}
                  className={`px-3 py-1.5 rounded text-xs font-medium border transition-all capitalize ${
                    simConfig.providerOverride === opt
                      ? 'bg-gold/20 text-gold border-gold/40'
                      : 'bg-white/5 text-text-muted border-border hover:bg-white/10'
                  }`}
                >
                  {opt === 'default' ? 'Per-agent default' : opt}
                </button>
              ))}
            </div>
            <p className="text-xs text-text-muted">
              Override which AI provider all agents use. Default respects each agent's configured provider.
            </p>
          </div>
        </section>
      )}

      {/* Agents */}
      <section className="bg-surface rounded-lg border border-border p-6 space-y-4">
        <h2 className="font-serif text-lg font-medium text-stone">Agents</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {['Agent', 'Alignment', 'Provider', 'Reputation', 'Balance', 'Status', ''].map((h) => (
                  <th key={h} className="pb-2 pr-4 text-xs font-medium text-text-muted uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {agentList.map((agent) => (
                <tr key={agent.id} className={`hover:bg-white/[0.02] ${!agent.isActive ? 'opacity-50' : ''}`}>
                  <td className="py-2 pr-4 text-text-primary font-medium whitespace-nowrap">
                    {agent.displayName}
                  </td>
                  <td className="py-2 pr-4 text-text-secondary text-xs whitespace-nowrap">
                    {agent.alignment}
                  </td>
                  <td className="py-2 pr-4">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      agent.modelProvider === 'haiku'
                        ? 'bg-purple-900/40 text-purple-300'
                        : 'bg-blue-900/40 text-blue-300'
                    }`}>
                      {agent.modelProvider}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-text-secondary text-xs">{agent.reputation}</td>
                  <td className="py-2 pr-4 text-text-secondary text-xs">M${agent.balance.toLocaleString()}</td>
                  <td className="py-2 pr-4">
                    <StatusBadge ok={agent.isActive} label={agent.isActive ? 'Active' : 'Inactive'} />
                  </td>
                  <td className="py-2">
                    <button
                      onClick={() => void handleToggleAgent(agent.id)}
                      className={`text-xs px-2 py-1 rounded border transition-all ${
                        agent.isActive
                          ? 'text-red-400 border-red-800 hover:bg-red-900/30'
                          : 'text-green-400 border-green-800 hover:bg-green-900/30'
                      }`}
                    >
                      {agent.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Decision Stats */}
      {decisionStats && (
        <section className="bg-surface rounded-lg border border-border p-6 space-y-4">
          <h2 className="font-serif text-lg font-medium text-stone">Decision Stats</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Decisions', value: decisionStats.total },
              { label: 'Errors', value: decisionStats.errors, warn: decisionStats.errors > 0 },
              { label: 'Haiku', value: decisionStats.haikuCount },
              { label: 'Ollama', value: decisionStats.ollamaCount },
            ].map(({ label, value, warn }) => (
              <div key={label} className="bg-white/5 rounded p-3">
                <div className="text-xs text-text-muted uppercase tracking-wide">{label}</div>
                <div className={`text-xl font-semibold mt-1 ${warn ? 'text-red-400' : 'text-text-primary'}`}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Database */}
      <section className="bg-surface rounded-lg border border-border p-6 space-y-4">
        <h2 className="font-serif text-lg font-medium text-stone">Database</h2>
        <div className="flex items-center gap-4">
          <AdminButton onClick={handleReseed} variant="danger">
            {reseedConfirm ? 'Confirm? Click again to wipe all data' : 'Reseed Database'}
          </AdminButton>
          <span className="text-xs text-text-muted">Truncates all tables and restores the 10-agent seed state.</span>
        </div>
      </section>

      {/* Decision Log */}
      <section className="bg-surface rounded-lg border border-border p-6 space-y-4">
        <h2 className="font-serif text-lg font-medium text-stone">Decision Log</h2>
        {loading ? (
          <p className="text-text-muted text-sm">Loading...</p>
        ) : decisions.length === 0 ? (
          <p className="text-text-muted text-sm">No decisions yet — simulation hasn't run.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  {['Agent', 'Provider', 'Phase', 'Action', 'Status', 'Latency', 'Reasoning'].map((h) => (
                    <th key={h} className="pb-2 pr-4 text-xs font-medium text-text-muted uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {decisions.map((d) => (
                  <tr key={d.id} className="hover:bg-white/[0.02]">
                    <td className="py-2 pr-4 text-text-primary font-medium whitespace-nowrap">
                      {d.agentName ?? '—'}
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        d.provider === 'haiku'
                          ? 'bg-purple-900/40 text-purple-300'
                          : 'bg-blue-900/40 text-blue-300'
                      }`}>
                        {d.provider}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-text-secondary text-xs whitespace-nowrap">
                      {d.phase ?? '—'}
                    </td>
                    <td className="py-2 pr-4 text-text-secondary text-xs whitespace-nowrap">
                      {d.parsedAction ?? '—'}
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`text-xs ${d.success ? 'text-green-400' : 'text-red-400'}`}>
                        {d.success ? 'ok' : 'err'}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-text-muted text-xs whitespace-nowrap">
                      {d.latencyMs}ms
                    </td>
                    <td className="py-2 text-text-secondary text-xs max-w-xs truncate" title={d.parsedReasoning ?? ''}>
                      {d.parsedReasoning ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
