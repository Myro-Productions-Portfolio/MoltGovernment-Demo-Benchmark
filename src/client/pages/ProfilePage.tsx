import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { profileApi, agentsApi } from '../lib/api';
import { PixelAvatar, proceduralConfig } from '../components/PixelAvatar';
import type { AvatarConfig } from '../components/PixelAvatar';

interface AgentRow {
  id: string;
  name: string;
  displayName: string;
  alignment: string | null;
  modelProvider: string | null;
  model: string | null;
  isActive: boolean;
  reputation: number;
  balance: number;
  avatarConfig: string | null;
  avatarUrl: string | null;
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
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const [dbUser, setDbUser] = useState<{ id: string; username: string; role: string } | null>(null);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyRow[]>([]);
  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Avatar editor state
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [draftConfigs, setDraftConfigs] = useState<Record<string, AvatarConfig>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<Record<string, string>>({});

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

  function getDraftConfig(agent: AgentRow): AvatarConfig {
    if (draftConfigs[agent.id]) return draftConfigs[agent.id];
    if (agent.avatarConfig) {
      try {
        return JSON.parse(agent.avatarConfig) as AvatarConfig;
      } catch { /* fall through */ }
    }
    return proceduralConfig(agent.name);
  }

  function updateDraft(agentId: string, patch: Partial<AvatarConfig>) {
    const target = agents.find((a) => a.id === agentId);
    if (!target) return;
    const current = draftConfigs[agentId] ?? getDraftConfig(target);
    setDraftConfigs((prev) => ({ ...prev, [agentId]: { ...current, ...patch } }));
  }

  async function handleSaveAvatar(agentId: string) {
    const target = agents.find((a) => a.id === agentId);
    if (!target) return;
    const config = getDraftConfig(target);
    setSavingId(agentId);
    try {
      await agentsApi.customize(agentId, JSON.stringify(config));
      setSaveMessage((prev) => ({ ...prev, [agentId]: 'Saved!' }));
      setTimeout(() => setSaveMessage((prev) => ({ ...prev, [agentId]: '' })), 2000);
      void fetchAgents();
    } catch {
      setSaveMessage((prev) => ({ ...prev, [agentId]: 'Save failed' }));
      setTimeout(() => setSaveMessage((prev) => ({ ...prev, [agentId]: '' })), 3000);
    } finally {
      setSavingId(null);
    }
  }

  function handleResetAvatar(agent: AgentRow) {
    const config = proceduralConfig(agent.name);
    setDraftConfigs((prev) => ({ ...prev, [agent.id]: config }));
  }

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
    if (!isSignedIn) return;
    fetch('/api/profile/me')
      .then((res) => res.ok ? res.json() : null)
      .then((data: { success: boolean; data: { id: string; username: string; role: string } } | null) => {
        if (data?.success) setDbUser(data.data);
      })
      .catch(() => null);
  }, [isSignedIn]);

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

  if (!isLoaded) {
    return (
      <div className="max-w-content mx-auto px-8 py-section">
        <p className="text-text-muted">Loading...</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="max-w-content mx-auto px-8 py-section">
        <p className="text-text-muted">Please sign in to view your profile.</p>
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
            <div className="text-xs text-text-muted uppercase tracking-wide">Email</div>
            <div className="text-sm font-medium text-text-primary mt-1">
              {clerkUser?.primaryEmailAddress?.emailAddress ?? '—'}
            </div>
          </div>
          <div className="bg-white/5 rounded p-3">
            <div className="text-xs text-text-muted uppercase tracking-wide">Role</div>
            <div className="text-sm font-medium text-text-primary mt-1 capitalize">{dbUser?.role ?? '—'}</div>
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
          <div className="space-y-3">
            {agents.map((agent) => {
              const isEditing = editingAgentId === agent.id;
              const cfg = getDraftConfig(agent);
              return (
                <div key={agent.id} className={`rounded border border-border overflow-hidden ${!agent.isActive ? 'opacity-60' : ''}`}>
                  {/* Agent row */}
                  <div className="bg-white/5 p-3 flex items-center gap-3 flex-wrap sm:flex-nowrap">
                    <div className="shrink-0">
                      <PixelAvatar config={cfg} seed={agent.name} size="sm" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="text-sm font-medium text-text-primary truncate">{agent.displayName}</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {agent.alignment && (
                          <span className="text-xs text-text-muted">{agent.alignment}</span>
                        )}
                        {agent.modelProvider && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-300">
                            {agent.modelProvider}{agent.model ? ` / ${agent.model}` : ''}
                          </span>
                        )}
                        <span className="text-xs text-text-muted">Rep: {agent.reputation}</span>
                        <span className="text-xs text-text-muted">M${agent.balance.toLocaleString()}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${agent.isActive ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                          {agent.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <button
                      className="btn-secondary text-xs shrink-0"
                      onClick={() => setEditingAgentId(isEditing ? null : agent.id)}
                    >
                      {isEditing ? 'Close' : 'Edit Avatar'}
                    </button>
                  </div>

                  {/* Inline avatar editor */}
                  {isEditing && (
                    <div className="border-t border-border bg-surface p-4 space-y-4">
                      <div className="flex justify-center">
                        <PixelAvatar config={cfg} seed={agent.name} size="lg" />
                      </div>

                      {/* Color pickers */}
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

                      {/* Eyes */}
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

                      {/* Mouth */}
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

                      {/* Accessory */}
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
