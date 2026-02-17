import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../lib/authContext';
import { profileApi } from '../lib/api';

interface AgentRow {
  id: string;
  displayName: string;
  alignment: string | null;
  modelProvider: string | null;
  model: string | null;
  isActive: boolean;
  reputation: number;
  balance: number;
}

interface ApiKeyRow {
  id: string;
  providerName: string;
  maskedKey?: string;
  model: string | null;
  isActive: boolean;
}

const PROVIDERS = ['anthropic', 'openai', 'google', 'huggingface', 'ollama'];
const ALIGNMENTS = ['progressive', 'moderate', 'conservative', 'libertarian', 'technocrat'];

export function ProfilePage() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyRow[]>([]);
  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Create agent form state
  const [agentForm, setAgentForm] = useState({
    displayName: '',
    name: '',
    alignment: 'moderate',
    modelProvider: 'anthropic',
    model: '',
    bio: '',
    personality: '',
  });
  const [agentFormLoading, setAgentFormLoading] = useState(false);

  // API key form state
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [keyLoading, setKeyLoading] = useState<string | null>(null);

  const flash = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(null), 3000);
  };

  const fetchAgents = useCallback(async () => {
    try {
      const res = await profileApi.getAgents();
      setAgents(res.data as AgentRow[]);
    } catch { /* ignore */ }
  }, []);

  const fetchApiKeys = useCallback(async () => {
    try {
      const res = await profileApi.getApiKeys();
      setApiKeys(res.data as ApiKeyRow[]);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    void fetchAgents();
    void fetchApiKeys();
  }, [fetchAgents, fetchApiKeys]);

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setAgentFormLoading(true);
    try {
      await profileApi.createAgent(agentForm);
      flash('Agent created successfully');
      setShowCreateAgent(false);
      setAgentForm({ displayName: '', name: '', alignment: 'moderate', modelProvider: 'anthropic', model: '', bio: '', personality: '' });
      void fetchAgents();
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Failed to create agent');
    } finally {
      setAgentFormLoading(false);
    }
  };

  const handleSetKey = async (provider: string) => {
    const key = keyInputs[provider]?.trim();
    if (!key) return;
    setKeyLoading(provider);
    try {
      await profileApi.setApiKey(provider, { key });
      flash(`${provider} key saved`);
      setKeyInputs((prev) => ({ ...prev, [provider]: '' }));
      void fetchApiKeys();
    } catch {
      flash(`Failed to save ${provider} key`);
    } finally {
      setKeyLoading(null);
    }
  };

  const handleDeleteKey = async (provider: string) => {
    setKeyLoading(provider);
    try {
      await profileApi.deleteApiKey(provider);
      flash(`${provider} key removed`);
      void fetchApiKeys();
    } catch {
      flash(`Failed to remove ${provider} key`);
    } finally {
      setKeyLoading(null);
    }
  };

  const getKeyForProvider = (provider: string) => apiKeys.find((k) => k.providerName === provider);

  if (!user) {
    return (
      <div className="max-w-content mx-auto px-8 py-section">
        <p className="text-text-muted">Please log in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="max-w-content mx-auto px-8 py-section space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl font-semibold text-stone">Profile</h1>
        <p className="text-sm text-text-muted mt-1">Manage your account, agents, and API keys</p>
      </div>

      {actionMsg && (
        <div className="px-4 py-2 rounded bg-gold/10 border border-gold/30 text-gold text-sm">
          {actionMsg}
        </div>
      )}

      {/* User Info */}
      <section className="bg-surface rounded-lg border border-border p-6 space-y-4">
        <h2 className="font-serif text-lg font-medium text-stone">Account</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 rounded p-3">
            <div className="text-xs text-text-muted uppercase tracking-wide">Username</div>
            <div className="text-sm font-medium text-text-primary mt-1">{user.username}</div>
          </div>
          <div className="bg-white/5 rounded p-3">
            <div className="text-xs text-text-muted uppercase tracking-wide">Role</div>
            <div className="text-sm font-medium text-text-primary mt-1 capitalize">{user.role}</div>
          </div>
        </div>
      </section>

      {/* Agents */}
      <section className="bg-surface rounded-lg border border-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-medium text-stone">My Agents</h2>
          <button
            onClick={() => setShowCreateAgent(!showCreateAgent)}
            className="text-xs px-3 py-1.5 rounded bg-gold/20 text-gold border border-gold/40 hover:bg-gold/30 transition-all"
          >
            {showCreateAgent ? 'Cancel' : 'Create Agent'}
          </button>
        </div>

        {agents.length === 0 && !showCreateAgent && (
          <p className="text-text-muted text-sm">No agents yet. Create one to participate in the simulation.</p>
        )}

        {agents.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  {['Agent', 'Alignment', 'Provider', 'Reputation', 'Balance', 'Status'].map((h) => (
                    <th key={h} className="pb-2 pr-4 text-xs font-medium text-text-muted uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {agents.map((agent) => (
                  <tr key={agent.id} className={`hover:bg-white/[0.02] ${!agent.isActive ? 'opacity-50' : ''}`}>
                    <td className="py-2 pr-4 text-text-primary font-medium whitespace-nowrap">{agent.displayName}</td>
                    <td className="py-2 pr-4 text-text-secondary text-xs whitespace-nowrap">{agent.alignment}</td>
                    <td className="py-2 pr-4">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-300">
                        {agent.modelProvider}
                        {agent.model ? ` / ${agent.model}` : ''}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-text-secondary text-xs">{agent.reputation}</td>
                    <td className="py-2 pr-4 text-text-secondary text-xs">M${agent.balance.toLocaleString()}</td>
                    <td className="py-2 pr-4">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${agent.isActive ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                        {agent.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showCreateAgent && (
          <form onSubmit={(e) => void handleCreateAgent(e)} className="space-y-4 border-t border-border pt-4">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide">New Agent</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Display Name</label>
                <input type="text" value={agentForm.displayName}
                  onChange={(e) => setAgentForm((f) => ({ ...f, displayName: e.target.value }))}
                  className="w-full bg-white/5 border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50"
                  placeholder="Jane Doe" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Username (slug)</label>
                <input type="text" value={agentForm.name}
                  onChange={(e) => setAgentForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full bg-white/5 border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50"
                  placeholder="jane_doe" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Alignment</label>
                <select value={agentForm.alignment}
                  onChange={(e) => setAgentForm((f) => ({ ...f, alignment: e.target.value }))}
                  className="w-full bg-white/5 border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50">
                  {ALIGNMENTS.map((a) => <option key={a} value={a} className="bg-surface">{a}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">AI Provider</label>
                <select value={agentForm.modelProvider}
                  onChange={(e) => setAgentForm((f) => ({ ...f, modelProvider: e.target.value }))}
                  className="w-full bg-white/5 border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50">
                  {PROVIDERS.map((p) => <option key={p} value={p} className="bg-surface">{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Model (optional)</label>
                <input type="text" value={agentForm.model}
                  onChange={(e) => setAgentForm((f) => ({ ...f, model: e.target.value }))}
                  className="w-full bg-white/5 border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50"
                  placeholder="e.g. claude-haiku-4-5-20251001" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Bio</label>
              <textarea value={agentForm.bio}
                onChange={(e) => setAgentForm((f) => ({ ...f, bio: e.target.value }))}
                className="w-full bg-white/5 border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50"
                rows={2} placeholder="Brief background..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Personality</label>
              <textarea value={agentForm.personality}
                onChange={(e) => setAgentForm((f) => ({ ...f, personality: e.target.value }))}
                className="w-full bg-white/5 border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50"
                rows={2} placeholder="How this agent thinks and behaves..." />
            </div>
            <button type="submit" disabled={agentFormLoading}
              className="px-6 py-2 rounded bg-gold/20 text-gold border border-gold/40 hover:bg-gold/30 text-sm font-medium transition-all disabled:opacity-40">
              {agentFormLoading ? 'Creating...' : 'Create Agent'}
            </button>
          </form>
        )}
      </section>

      {/* API Keys */}
      <section className="bg-surface rounded-lg border border-border p-6 space-y-4">
        <div>
          <h2 className="font-serif text-lg font-medium text-stone">API Keys</h2>
          <p className="text-xs text-text-muted mt-0.5">Your personal keys take priority over admin-configured keys for your agents.</p>
        </div>

        <div className="space-y-3">
          {PROVIDERS.map((provider) => {
            const existing = getKeyForProvider(provider);
            const isOllama = provider === 'ollama';
            return (
              <div key={provider} className="bg-white/5 rounded border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary capitalize">{provider}</span>
                    {existing ? (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-green-900/40 text-green-400">Configured</span>
                    ) : (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-text-muted">Not set</span>
                    )}
                  </div>
                  {existing && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-text-muted">{existing.maskedKey}</span>
                      <button
                        onClick={() => void handleDeleteKey(provider)}
                        disabled={keyLoading === provider}
                        className="text-xs px-2 py-1 rounded border border-red-800 text-red-400 hover:bg-red-900/30 transition-all disabled:opacity-40"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
                {!isOllama && (
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={keyInputs[provider] ?? ''}
                      onChange={(e) => setKeyInputs((prev) => ({ ...prev, [provider]: e.target.value }))}
                      className="flex-1 bg-white/5 border border-border rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-gold/50"
                      placeholder={existing ? 'Enter new key to replace...' : 'Enter API key...'}
                    />
                    <button
                      onClick={() => void handleSetKey(provider)}
                      disabled={!keyInputs[provider]?.trim() || keyLoading === provider}
                      className="px-3 py-1.5 rounded bg-gold/20 text-gold border border-gold/40 hover:bg-gold/30 text-xs font-medium transition-all disabled:opacity-40"
                    >
                      {keyLoading === provider ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
                {isOllama && (
                  <p className="text-xs text-text-muted">Ollama runs locally — no key needed. Configure the base URL in Admin Providers.</p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
