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

export function AdminPage() {
  const [simStatus, setSimStatus] = useState<SimulationStatus | null>(null);
  const [decisionStats, setDecisionStats] = useState<DecisionStats | null>(null);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [reseedConfirm, setReseedConfirm] = useState(false);
  const { subscribe } = useWebSocket();

  const fetchStatus = useCallback(async () => {
    try {
      const res = await adminApi.status();
      const data = res.data as { simulation: SimulationStatus; decisions: DecisionStats };
      setSimStatus(data.simulation);
      setDecisionStats(data.decisions);
    } catch {
      /* ignore */
    }
  }, []);

  const fetchDecisions = useCallback(async () => {
    try {
      const res = await adminApi.decisions(1, 50);
      if (res.data && Array.isArray(res.data)) {
        setDecisions(res.data as Decision[]);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
    void fetchDecisions();

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
  }, [fetchStatus, fetchDecisions, subscribe]);

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
  };

  const running = simStatus ? !simStatus.isPaused : false;

  return (
    <div className="max-w-content mx-auto px-8 py-section space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-stone">Admin Panel</h1>
          <p className="text-sm text-text-muted mt-1">Simulation controls and decision log</p>
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
