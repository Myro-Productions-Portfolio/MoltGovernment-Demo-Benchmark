import { useState, useEffect, useCallback } from 'react';
import { adminApi, agentsApi } from '../lib/api';
import { useWebSocket } from '../lib/useWebSocket';
import { PixelAvatar, proceduralConfig } from '../components/PixelAvatar';
import type { AvatarConfig } from '../components/PixelAvatar';

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
  /* Simulation */
  tickIntervalMs: number;
  billAdvancementDelayMs: number;
  providerOverride: 'default' | 'haiku' | 'ollama';
  /* Agent Behavior */
  billProposalChance: number;
  campaignSpeechChance: number;
  amendmentProposalChance: number;
  /* Government Structure */
  congressSeats: number;
  congressTermDays: number;
  presidentTermDays: number;
  supremeCourtJustices: number;
  quorumPercentage: number;
  billPassagePercentage: number;
  supermajorityPercentage: number;
  /* Elections */
  campaignDurationDays: number;
  votingDurationHours: number;
  minReputationToRun: number;
  minReputationToVote: number;
  /* Economy (runtime) */
  initialAgentBalance: number;
  campaignFilingFee: number;
  partyCreationFee: number;
  salaryPresident: number;
  salaryCabinet: number;
  salaryCongress: number;
  salaryJustice: number;
  /* Governance Probabilities */
  vetoBaseRate: number;
  vetoRatePerTier: number;
  vetoMaxRate: number;
  committeeTableRateOpposing: number;
  committeeTableRateNeutral: number;
  committeeAmendRate: number;
  judicialChallengeRatePerLaw: number;
  partyWhipFollowRate: number;
  vetoOverrideThreshold: number;
}

interface EconomySettings {
  treasuryBalance: number;
  taxRatePercent: number;
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

interface AvatarAgentRow {
  id: string;
  name: string;
  displayName: string;
  avatarConfig: string | null;
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
  const [economySettings, setEconomySettings] = useState<EconomySettings | null>(null);
  const [agentList, setAgentList] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [reseedConfirm, setReseedConfirm] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const { subscribe } = useWebSocket();

  /* Avatar customizer state */
  const [avatarAgents, setAvatarAgents] = useState<AvatarAgentRow[]>([]);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [draftConfigs, setDraftConfigs] = useState<Record<string, AvatarConfig>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<Record<string, string>>({});

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

  const fetchEconomy = useCallback(async () => {
    try {
      const res = await adminApi.getEconomy();
      setEconomySettings(res.data as EconomySettings);
    } catch { /* ignore */ }
  }, []);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await adminApi.getAgents();
      setAgentList(res.data as AgentRow[]);
    } catch { /* ignore */ }
  }, []);

  const fetchAvatarAgents = useCallback(async () => {
    try {
      const res = await agentsApi.list(1, 100);
      if (res.data && Array.isArray(res.data)) {
        setAvatarAgents(res.data as AvatarAgentRow[]);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    void fetchStatus();
    void fetchDecisions();
    void fetchConfig();
    void fetchEconomy();
    void fetchAgents();
    void fetchAvatarAgents();

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
  }, [fetchStatus, fetchDecisions, fetchConfig, fetchEconomy, fetchAgents, fetchAvatarAgents, subscribe]);

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

  const saveEconomy = async (patch: { treasuryBalance?: number; taxRatePercent?: number }) => {
    setSavingConfig(true);
    try {
      const res = await adminApi.setEconomy(patch);
      setEconomySettings(res.data as EconomySettings);
      flash('Economy settings saved');
    } catch {
      flash('Failed to save economy settings');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleToggleAgent = async (id: string) => {
    await adminApi.toggleAgent(id);
    void fetchAgents();
  };

  const running = simStatus ? !simStatus.isPaused : false;

  /* ---- Avatar customizer helpers ---- */
  function getDraftConfig(agent: AvatarAgentRow): AvatarConfig {
    if (draftConfigs[agent.id]) return draftConfigs[agent.id];
    if (agent.avatarConfig) {
      try {
        return JSON.parse(agent.avatarConfig) as AvatarConfig;
      } catch { /* fall through */ }
    }
    return proceduralConfig(agent.name);
  }

  function updateDraft(agentId: string, patch: Partial<AvatarConfig>) {
    const current = draftConfigs[agentId] ?? getDraftConfig(avatarAgents.find((a) => a.id === agentId)!);
    setDraftConfigs((prev) => ({ ...prev, [agentId]: { ...current, ...patch } }));
  }

  async function handleSaveAvatar(agentId: string) {
    const config = getDraftConfig(avatarAgents.find((a) => a.id === agentId)!);
    setSavingId(agentId);
    try {
      await agentsApi.customize(agentId, JSON.stringify(config));
      setSaveMessage((prev) => ({ ...prev, [agentId]: 'Saved!' }));
      void fetchAvatarAgents();
      setTimeout(() => setSaveMessage((prev) => ({ ...prev, [agentId]: '' })), 2000);
    } catch {
      setSaveMessage((prev) => ({ ...prev, [agentId]: 'Save failed' }));
      setTimeout(() => setSaveMessage((prev) => ({ ...prev, [agentId]: '' })), 3000);
    } finally {
      setSavingId(null);
    }
  }

  function handleResetAvatar(agent: AvatarAgentRow) {
    const config = proceduralConfig(agent.name);
    setDraftConfigs((prev) => ({ ...prev, [agent.id]: config }));
  }

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

          {/* Amendment Proposal Chance */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-text-secondary">Amendment Proposal Chance</label>
              <span className="text-sm text-gold font-mono">{Math.round(simConfig.amendmentProposalChance * 100)}%</span>
            </div>
            <input
              type="range" min={0} max={100}
              value={Math.round(simConfig.amendmentProposalChance * 100)}
              onChange={(e) => setSimConfig((c) => c ? { ...c, amendmentProposalChance: parseInt(e.target.value) / 100 } : c)}
              onMouseUp={() => void saveConfig({ amendmentProposalChance: simConfig.amendmentProposalChance })}
              onTouchEnd={() => void saveConfig({ amendmentProposalChance: simConfig.amendmentProposalChance })}
              className="w-full accent-gold"
            />
            <p className="text-xs text-text-muted">Per-agent chance to propose an amendment to an existing law each tick.</p>
          </div>
        </section>
      )}

      {/* Government Structure */}
      {simConfig && (
        <section className="bg-surface rounded-lg border border-border p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-lg font-medium text-stone">Government Structure</h2>
              <p className="text-xs text-text-muted mt-0.5">Takes effect on next election cycle or term start</p>
            </div>
            {savingConfig && <span className="text-xs text-text-muted">Saving...</span>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Congress Seats */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-text-secondary">Congress Seats</label>
                <span className="text-sm text-gold font-mono">{simConfig.congressSeats}</span>
              </div>
              <input type="range" min={1} max={200} value={simConfig.congressSeats}
                onChange={(e) => setSimConfig((c) => c ? { ...c, congressSeats: parseInt(e.target.value) } : c)}
                onMouseUp={() => void saveConfig({ congressSeats: simConfig.congressSeats })}
                onTouchEnd={() => void saveConfig({ congressSeats: simConfig.congressSeats })}
                className="w-full accent-gold" />
              <p className="text-xs text-text-muted">Total legislative seats.</p>
            </div>

            {/* Supreme Court Justices */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-text-secondary">Supreme Court Justices</label>
                <span className="text-sm text-gold font-mono">{simConfig.supremeCourtJustices}</span>
              </div>
              <input type="range" min={1} max={25} value={simConfig.supremeCourtJustices}
                onChange={(e) => setSimConfig((c) => c ? { ...c, supremeCourtJustices: parseInt(e.target.value) } : c)}
                onMouseUp={() => void saveConfig({ supremeCourtJustices: simConfig.supremeCourtJustices })}
                onTouchEnd={() => void saveConfig({ supremeCourtJustices: simConfig.supremeCourtJustices })}
                className="w-full accent-gold" />
              <p className="text-xs text-text-muted">Number of justices on the high court.</p>
            </div>

            {/* Congress Term Days */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-text-secondary">Congress Term Length</label>
                <span className="text-sm text-gold font-mono">{simConfig.congressTermDays}d</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[30, 60, 90, 180, 365].map((d) => (
                  <button key={d} onClick={() => void saveConfig({ congressTermDays: d })}
                    className={`px-3 py-1.5 rounded text-xs font-medium border transition-all ${simConfig.congressTermDays === d ? 'bg-gold/20 text-gold border-gold/40' : 'bg-white/5 text-text-muted border-border hover:bg-white/10'}`}>
                    {d}d
                  </button>
                ))}
              </div>
            </div>

            {/* President Term Days */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-text-secondary">President Term Length</label>
                <span className="text-sm text-gold font-mono">{simConfig.presidentTermDays}d</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[30, 60, 90, 180, 365].map((d) => (
                  <button key={d} onClick={() => void saveConfig({ presidentTermDays: d })}
                    className={`px-3 py-1.5 rounded text-xs font-medium border transition-all ${simConfig.presidentTermDays === d ? 'bg-gold/20 text-gold border-gold/40' : 'bg-white/5 text-text-muted border-border hover:bg-white/10'}`}>
                    {d}d
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Vote thresholds */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {([
              ['quorumPercentage', 'Quorum Required', 'Minimum participation to hold a floor vote.'],
              ['billPassagePercentage', 'Bill Passage Threshold', 'Yea votes required to pass a bill.'],
              ['supermajorityPercentage', 'Supermajority (Veto Override)', 'Yea votes required to override a presidential veto.'],
            ] as [keyof RuntimeConfig, string, string][]).map(([key, label, desc]) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-text-secondary">{label}</label>
                  <span className="text-sm text-gold font-mono">{Math.round((simConfig[key] as number) * 100)}%</span>
                </div>
                <input type="range" min={10} max={90} value={Math.round((simConfig[key] as number) * 100)}
                  onChange={(e) => setSimConfig((c) => c ? { ...c, [key]: parseInt(e.target.value) / 100 } : c)}
                  onMouseUp={() => void saveConfig({ [key]: simConfig[key] })}
                  onTouchEnd={() => void saveConfig({ [key]: simConfig[key] })}
                  className="w-full accent-gold" />
                <p className="text-xs text-text-muted">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Elections */}
      {simConfig && (
        <section className="bg-surface rounded-lg border border-border p-6 space-y-6">
          <h2 className="font-serif text-lg font-medium text-stone">Elections</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Campaign Duration */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-text-secondary">Campaign Duration</label>
                <span className="text-sm text-gold font-mono">{simConfig.campaignDurationDays}d</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[7, 14, 30, 60].map((d) => (
                  <button key={d} onClick={() => void saveConfig({ campaignDurationDays: d })}
                    className={`px-3 py-1.5 rounded text-xs font-medium border transition-all ${simConfig.campaignDurationDays === d ? 'bg-gold/20 text-gold border-gold/40' : 'bg-white/5 text-text-muted border-border hover:bg-white/10'}`}>
                    {d}d
                  </button>
                ))}
              </div>
            </div>

            {/* Voting Duration */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-text-secondary">Voting Window</label>
                <span className="text-sm text-gold font-mono">{simConfig.votingDurationHours}h</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[12, 24, 48, 72, 168].map((h) => (
                  <button key={h} onClick={() => void saveConfig({ votingDurationHours: h })}
                    className={`px-3 py-1.5 rounded text-xs font-medium border transition-all ${simConfig.votingDurationHours === h ? 'bg-gold/20 text-gold border-gold/40' : 'bg-white/5 text-text-muted border-border hover:bg-white/10'}`}>
                    {h}h
                  </button>
                ))}
              </div>
            </div>

            {/* Min Rep to Run */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-text-secondary">Min Reputation to Run</label>
                <span className="text-sm text-gold font-mono">{simConfig.minReputationToRun}</span>
              </div>
              <input type="range" min={0} max={500} step={10} value={simConfig.minReputationToRun}
                onChange={(e) => setSimConfig((c) => c ? { ...c, minReputationToRun: parseInt(e.target.value) } : c)}
                onMouseUp={() => void saveConfig({ minReputationToRun: simConfig.minReputationToRun })}
                onTouchEnd={() => void saveConfig({ minReputationToRun: simConfig.minReputationToRun })}
                className="w-full accent-gold" />
              <p className="text-xs text-text-muted">Reputation required to declare candidacy.</p>
            </div>

            {/* Min Rep to Vote */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-text-secondary">Min Reputation to Vote</label>
                <span className="text-sm text-gold font-mono">{simConfig.minReputationToVote}</span>
              </div>
              <input type="range" min={0} max={200} step={5} value={simConfig.minReputationToVote}
                onChange={(e) => setSimConfig((c) => c ? { ...c, minReputationToVote: parseInt(e.target.value) } : c)}
                onMouseUp={() => void saveConfig({ minReputationToVote: simConfig.minReputationToVote })}
                onTouchEnd={() => void saveConfig({ minReputationToVote: simConfig.minReputationToVote })}
                className="w-full accent-gold" />
              <p className="text-xs text-text-muted">Reputation required to cast a vote.</p>
            </div>
          </div>
        </section>
      )}

      {/* Economy */}
      <section className="bg-surface rounded-lg border border-border p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-lg font-medium text-stone">Economy</h2>
            <p className="text-xs text-text-muted mt-0.5">Treasury &amp; tax rate persist in DB. Fees &amp; salaries apply next tick.</p>
          </div>
          {savingConfig && <span className="text-xs text-text-muted">Saving...</span>}
        </div>

        {/* DB-persisted: treasury + tax rate */}
        {economySettings && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-text-secondary">Treasury Balance (M$)</label>
                <span className="text-sm text-gold font-mono">M${economySettings.treasuryBalance.toLocaleString()}</span>
              </div>
              <input
                type="number" min={0} step={1000}
                value={economySettings.treasuryBalance}
                onChange={(e) => setEconomySettings((s) => s ? { ...s, treasuryBalance: parseInt(e.target.value) || 0 } : s)}
                onBlur={() => void saveEconomy({ treasuryBalance: economySettings.treasuryBalance })}
                className="w-full bg-white/5 border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50"
              />
              <p className="text-xs text-text-muted">Direct treasury balance — use to inject or remove funds.</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-text-secondary">Tax Rate (%)</label>
                <span className="text-sm text-gold font-mono">{economySettings.taxRatePercent}%</span>
              </div>
              <input type="range" min={0} max={20} step={0.5}
                value={economySettings.taxRatePercent}
                onChange={(e) => setEconomySettings((s) => s ? { ...s, taxRatePercent: parseFloat(e.target.value) } : s)}
                onMouseUp={() => void saveEconomy({ taxRatePercent: economySettings.taxRatePercent })}
                onTouchEnd={() => void saveEconomy({ taxRatePercent: economySettings.taxRatePercent })}
                className="w-full accent-gold" />
              <p className="text-xs text-text-muted">Percent of each agent's balance collected as tax each tick.</p>
            </div>
          </div>
        )}

        {/* Runtime: fees and salaries */}
        {simConfig && (
          <>
            <div className="border-t border-border pt-4">
              <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-4">Fees</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {([
                  ['initialAgentBalance', 'Starting Agent Balance', 'M$ each new agent starts with.'],
                  ['campaignFilingFee', 'Campaign Filing Fee', 'M$ to declare candidacy.'],
                  ['partyCreationFee', 'Party Creation Fee', 'M$ to found a new party.'],
                ] as [keyof RuntimeConfig, string, string][]).map(([key, label, desc]) => (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-text-secondary">{label}</label>
                      <span className="text-sm text-gold font-mono">M${(simConfig[key] as number).toLocaleString()}</span>
                    </div>
                    <input type="number" min={0} step={10}
                      value={simConfig[key] as number}
                      onChange={(e) => setSimConfig((c) => c ? { ...c, [key]: parseInt(e.target.value) || 0 } : c)}
                      onBlur={() => void saveConfig({ [key]: simConfig[key] })}
                      className="w-full bg-white/5 border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50"
                    />
                    <p className="text-xs text-text-muted">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-4">Salaries (M$/tick)</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {([
                  ['salaryPresident', 'President'],
                  ['salaryCabinet', 'Cabinet'],
                  ['salaryCongress', 'Congress'],
                  ['salaryJustice', 'Justice'],
                ] as [keyof RuntimeConfig, string][]).map(([key, label]) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-xs font-medium text-text-secondary">{label}</label>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-text-muted">M$</span>
                      <input type="number" min={0} step={5}
                        value={simConfig[key] as number}
                        onChange={(e) => setSimConfig((c) => c ? { ...c, [key]: parseInt(e.target.value) || 0 } : c)}
                        onBlur={() => void saveConfig({ [key]: simConfig[key] })}
                        className="w-full bg-white/5 border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-gold/50"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </section>

      {/* Governance Probabilities */}
      {simConfig && (
        <section className="bg-surface rounded-lg border border-border p-6 space-y-6">
          <div>
            <h2 className="font-serif text-lg font-medium text-stone">Governance Probabilities</h2>
            <p className="text-xs text-text-muted mt-0.5">Research-backed baselines. Changes apply on the next tick.</p>
          </div>

          {/* Presidential Veto */}
          <div className="space-y-4">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Presidential Veto</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {([
                ['vetoBaseRate', 'Base Veto Rate', 'Probability of veto when president and sponsor share alignment.'],
                ['vetoRatePerTier', 'Rate Per Alignment Tier', 'Added probability per step apart on the alignment spectrum.'],
                ['vetoMaxRate', 'Maximum Veto Rate', 'Hard cap — probability never exceeds this regardless of alignment gap.'],
              ] as [keyof RuntimeConfig, string, string][]).map(([key, label, desc]) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-text-secondary">{label}</label>
                    <span className="text-sm text-gold font-mono">{Math.round((simConfig[key] as number) * 100)}%</span>
                  </div>
                  <input type="range" min={0} max={100}
                    value={Math.round((simConfig[key] as number) * 100)}
                    onChange={(e) => setSimConfig((c) => c ? { ...c, [key]: parseInt(e.target.value) / 100 } : c)}
                    onMouseUp={() => void saveConfig({ [key]: simConfig[key] })}
                    onTouchEnd={() => void saveConfig({ [key]: simConfig[key] })}
                    className="w-full accent-gold" />
                  <p className="text-xs text-text-muted">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Committee */}
          <div className="space-y-4 border-t border-border pt-4">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Committee Review</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {([
                ['committeeTableRateOpposing', 'Table Rate (Opposing Chair)', 'Probability chair tables a bill when politically opposed to sponsor.'],
                ['committeeTableRateNeutral', 'Table Rate (Neutral Chair)', 'Probability chair tables a bill when aligned with or neutral to sponsor.'],
                ['committeeAmendRate', 'Amendment Rate', 'If not tabled, probability chair amends the bill text.'],
              ] as [keyof RuntimeConfig, string, string][]).map(([key, label, desc]) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-text-secondary">{label}</label>
                    <span className="text-sm text-gold font-mono">{Math.round((simConfig[key] as number) * 100)}%</span>
                  </div>
                  <input type="range" min={0} max={100}
                    value={Math.round((simConfig[key] as number) * 100)}
                    onChange={(e) => setSimConfig((c) => c ? { ...c, [key]: parseInt(e.target.value) / 100 } : c)}
                    onMouseUp={() => void saveConfig({ [key]: simConfig[key] })}
                    onTouchEnd={() => void saveConfig({ [key]: simConfig[key] })}
                    className="w-full accent-gold" />
                  <p className="text-xs text-text-muted">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Judicial + Whip + Override */}
          <div className="space-y-4 border-t border-border pt-4">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Judicial, Whip &amp; Override</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {([
                ['judicialChallengeRatePerLaw', 'Judicial Challenge Rate', 'Per-law probability of a Supreme Court review being triggered each tick.'],
                ['partyWhipFollowRate', 'Party Whip Follow Rate', 'Probability a member follows their party whip recommendation when voting.'],
                ['vetoOverrideThreshold', 'Veto Override Threshold', 'Yea fraction required to override a presidential veto (e.g. 0.67 = 2/3).'],
              ] as [keyof RuntimeConfig, string, string][]).map(([key, label, desc]) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-text-secondary">{label}</label>
                    <span className="text-sm text-gold font-mono">{Math.round((simConfig[key] as number) * 100)}%</span>
                  </div>
                  <input type="range" min={0} max={100}
                    value={Math.round((simConfig[key] as number) * 100)}
                    onChange={(e) => setSimConfig((c) => c ? { ...c, [key]: parseInt(e.target.value) / 100 } : c)}
                    onMouseUp={() => void saveConfig({ [key]: simConfig[key] })}
                    onTouchEnd={() => void saveConfig({ [key]: simConfig[key] })}
                    className="w-full accent-gold" />
                  <p className="text-xs text-text-muted">{desc}</p>
                </div>
              ))}
            </div>
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

      {/* Agent Avatars */}
      <section className="bg-surface rounded-lg border border-border p-6 space-y-4">
        <div>
          <h2 className="font-serif text-lg font-medium text-stone">Agent Avatars</h2>
          <p className="text-xs text-text-muted mt-1">Customize pixel portrait configurations</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-start">
          {avatarAgents.map((agent) => {
            const isEditing = editingAgentId === agent.id;
            const cfg = getDraftConfig(agent);

            return (
              <div key={agent.id} className="flex flex-col gap-0">
                {/* Agent card */}
                <div className="bg-white/5 rounded border border-border p-3 flex flex-col items-center gap-2">
                  <PixelAvatar config={cfg} seed={agent.name} size="md" />
                  <div className="text-sm font-medium text-center truncate w-full">{agent.displayName}</div>
                  <button
                    className="btn-secondary text-xs w-full"
                    onClick={() => setEditingAgentId(isEditing ? null : agent.id)}
                  >
                    {isEditing ? 'Close' : 'Edit'}
                  </button>
                </div>

                {/* Inline editor panel */}
                {isEditing && (
                  <div className="border border-border border-t-0 bg-surface rounded-b p-4 space-y-4">
                    {/* Live preview */}
                    <div className="flex justify-center">
                      <PixelAvatar config={cfg} seed={agent.name} size="lg" />
                    </div>

                    {/* Color inputs */}
                    <div className="space-y-2">
                      {([
                        ['Background', 'bgColor', cfg.bgColor],
                        ['Face', 'faceColor', cfg.faceColor],
                        ['Accent', 'accentColor', cfg.accentColor],
                      ] as [string, keyof AvatarConfig, string][]).map(([label, key, value]) => (
                        <div key={key} className="flex items-center justify-between gap-2">
                          <label className="text-xs text-text-secondary">{label}</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={value}
                              onChange={(e) => updateDraft(agent.id, { [key]: e.target.value })}
                              className="w-6 h-6 rounded cursor-pointer border border-border bg-transparent"
                            />
                            <span className="font-mono text-xs text-text-muted">{value}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Eye type selector */}
                    <div>
                      <div className="text-xs text-text-muted mb-2 uppercase tracking-wide">Eyes</div>
                      <div className="grid grid-cols-4 gap-1">
                        {(['square', 'wide', 'dot', 'visor'] as AvatarConfig['eyeType'][]).map((et) => (
                          <button
                            key={et}
                            onClick={() => updateDraft(agent.id, { eyeType: et })}
                            className={`flex flex-col items-center gap-1 p-1 rounded border transition-all ${
                              cfg.eyeType === et ? 'border-gold bg-gold/10' : 'border-border bg-white/5 hover:bg-white/10'
                            }`}
                          >
                            <PixelAvatar config={{ ...cfg, eyeType: et }} seed={agent.name} size="xs" />
                            <span className="text-[9px] text-text-muted">{et}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Mouth type selector */}
                    <div>
                      <div className="text-xs text-text-muted mb-2 uppercase tracking-wide">Mouth</div>
                      <div className="grid grid-cols-4 gap-1">
                        {(['smile', 'stern', 'speak', 'grin'] as AvatarConfig['mouthType'][]).map((mt) => (
                          <button
                            key={mt}
                            onClick={() => updateDraft(agent.id, { mouthType: mt })}
                            className={`flex flex-col items-center gap-1 p-1 rounded border transition-all ${
                              cfg.mouthType === mt ? 'border-gold bg-gold/10' : 'border-border bg-white/5 hover:bg-white/10'
                            }`}
                          >
                            <PixelAvatar config={{ ...cfg, mouthType: mt }} seed={agent.name} size="xs" />
                            <span className="text-[9px] text-text-muted">{mt}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Accessory selector */}
                    <div>
                      <div className="text-xs text-text-muted mb-2 uppercase tracking-wide">Accessory</div>
                      <div className="grid grid-cols-4 gap-1">
                        {(['none', 'antenna', 'dual_antenna', 'halo'] as AvatarConfig['accessory'][]).map((acc) => (
                          <button
                            key={acc}
                            onClick={() => updateDraft(agent.id, { accessory: acc })}
                            className={`flex flex-col items-center gap-1 p-1 rounded border transition-all ${
                              cfg.accessory === acc ? 'border-gold bg-gold/10' : 'border-border bg-white/5 hover:bg-white/10'
                            }`}
                          >
                            <PixelAvatar config={{ ...cfg, accessory: acc }} seed={agent.name} size="xs" />
                            <span className="text-[9px] text-text-muted leading-tight text-center">{acc === 'dual_antenna' ? 'dual' : acc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <button
                        className="btn-secondary text-xs w-full bg-gold/10 text-gold border-gold/30 hover:bg-gold/20"
                        onClick={() => void handleSaveAvatar(agent.id)}
                        disabled={savingId === agent.id}
                      >
                        {savingId === agent.id ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        className="btn-secondary text-xs w-full"
                        onClick={() => handleResetAvatar(agent)}
                      >
                        Reset to Procedural
                      </button>
                      <button
                        className="btn-secondary text-xs w-full text-text-muted"
                        onClick={() => setEditingAgentId(null)}
                      >
                        Cancel
                      </button>
                      {saveMessage[agent.id] && (
                        <div className={`text-xs text-center ${saveMessage[agent.id] === 'Saved!' ? 'text-green-400' : 'text-red-400'}`}>
                          {saveMessage[agent.id]}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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
