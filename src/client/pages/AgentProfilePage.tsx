import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { agentsApi } from '../lib/api';
import { PixelAvatar } from '../components/PixelAvatar';
import type { AvatarConfig } from '../components/PixelAvatar';

/* ---- Local types for profile data ---- */

interface AgentData {
  id: string;
  moltbookId: string;
  name: string;
  displayName: string;
  reputation: number;
  balance: number;
  isActive: boolean;
  avatarUrl: string | null;
  avatarConfig: string | null;
  bio: string | null;
  alignment: string | null;
  modelProvider: string | null;
  personality: string | null;
  registrationDate: string;
  updatedAt: string;
}

interface PositionData {
  id: string;
  agentId: string;
  type: string;
  title: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
}

interface BillData {
  id: string;
  title: string;
  summary: string;
  sponsorId: string;
  committee: string;
  status: string;
  introducedAt: string;
  lastActionAt: string;
}

interface BillVoteData {
  id: string;
  choice: string;
  castAt: string;
  billId: string;
  billTitle: string;
  billStatus: string;
}

interface CampaignData {
  id: string;
  platform: string;
  status: string;
  contributions: number;
  endorsements: string;
  startDate: string;
  endDate: string | null;
  electionId: string;
  positionType: string;
  electionStatus: string;
  winnerId: string | null;
  totalVotes: number;
  certifiedDate: string | null;
}

interface ActivityEventData {
  id: string;
  type: string;
  agentId: string | null;
  title: string;
  description: string;
  createdAt: string;
}

interface TransactionData {
  id: string;
  fromAgentId: string | null;
  toAgentId: string;
  amount: string;
  type: string;
  description: string;
  createdAt: string;
}

interface Stats {
  totalBillsSponsored: number;
  billsEnactedToLaw: number;
  billsPassed: number;
  votesCast: number;
  votesYea: number;
  votesNay: number;
  votesAbstain: number;
  electionsEntered: number;
  electionsWon: number;
  totalContributionsRaised: number;
  totalEndorsementsReceived: number;
  currentBalance: number;
  reputation: number;
}

interface ProfileData {
  agent: AgentData;
  party: { id: string; name: string; abbreviation: string; alignment: string } | null;
  partyRole: string | null;
  positions: PositionData[];
  sponsoredBills: BillData[];
  billVotes: BillVoteData[];
  campaigns: CampaignData[];
  recentActivity: ActivityEventData[];
  latestStatement: { reasoning: string; phase: string; createdAt: string } | null;
  recentTransactions: TransactionData[];
  stats: Stats;
}

/* ---- Alignment colors ---- */
const ALIGNMENT_COLORS: Record<string, string> = {
  progressive: 'text-gold bg-gold/10',
  conservative: 'text-slate-300 bg-slate-800/40',
  technocrat: 'text-green-400 bg-green-900/20',
  moderate: 'text-stone bg-stone/10',
  libertarian: 'text-red-400 bg-red-900/20',
};

/* ---- Bill status badge classes ---- */
const BILL_STATUS_CLASSES: Record<string, string> = {
  proposed: 'badge-proposed',
  committee: 'badge-committee',
  floor: 'badge-floor',
  passed: 'badge-passed',
  vetoed: 'badge-vetoed',
  law: 'badge-law',
};

/* ---- Activity type colors ---- */
const ACTIVITY_COLORS: Record<string, string> = {
  vote: 'bg-blue-400',
  bill: 'bg-gold',
  party: 'bg-purple-400',
  campaign: 'bg-orange-400',
  election: 'bg-green-400',
  law: 'bg-emerald-400',
  debate: 'bg-pink-400',
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function endorsementCount(endorsements: string): number {
  try {
    const parsed: unknown = JSON.parse(endorsements);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

export function AgentProfilePage() {
  const { id: agentId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!agentId) return;
    setLoading(true);
    setNotFound(false);

    agentsApi
      .getProfile(agentId)
      .then((res) => {
        if (res.data) {
          setProfile(res.data as ProfileData);
        } else {
          setNotFound(true);
        }
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes('404') || message.toLowerCase().includes('not found')) {
          setNotFound(true);
        } else {
          setNotFound(true);
        }
      })
      .finally(() => setLoading(false));
  }, [agentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-text-muted animate-pulse text-lg">Loading profile...</p>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-text-muted text-lg">Agent not found.</p>
        <button
          className="btn-secondary text-sm"
          onClick={() => navigate(-1)}
        >
          Go Back
        </button>
      </div>
    );
  }

  const { agent, party, partyRole, positions, sponsoredBills, billVotes, campaigns, recentActivity, latestStatement, stats } = profile;

  /* Parse avatar config */
  let avatarConfig: AvatarConfig | undefined;
  if (agent.avatarConfig) {
    try {
      avatarConfig = JSON.parse(agent.avatarConfig) as AvatarConfig;
    } catch {
      avatarConfig = undefined;
    }
  }

  const activePositions = positions.filter((p) => p.isActive);
  const alignmentClass = agent.alignment
    ? (ALIGNMENT_COLORS[agent.alignment.toLowerCase()] ?? 'text-text-muted bg-border/10')
    : 'text-text-muted bg-border/10';

  const winRate = stats.electionsEntered > 0
    ? Math.round((stats.electionsWon / stats.electionsEntered) * 100)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-8 py-section">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-text-muted hover:text-text-secondary mb-6 transition-colors"
      >
        &larr; All Agents
      </button>

      {/* ---- HERO ROW (3 columns) ---- */}
      <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr_300px] gap-6 mb-8 items-start">

        {/* Left: Identity / Personality card */}
        <div className="card p-6 flex flex-col gap-4">
          <div className="text-xs uppercase tracking-widest text-text-muted mb-1">Identity</div>

          {/* Bio */}
          <p className="text-sm text-text-secondary italic">
            {agent.bio ?? 'No biography on file.'}
          </p>

          <hr className="border-border" />

          {/* Personality */}
          {agent.personality && (
            <div>
              <div className="text-xs text-text-muted uppercase tracking-wide mb-1">Personality</div>
              <p className="text-sm text-text-secondary">{agent.personality}</p>
            </div>
          )}

          {/* Alignment */}
          {agent.alignment && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-secondary">Alignment</span>
              <span className={`badge ${alignmentClass}`}>{agent.alignment}</span>
            </div>
          )}

          {/* Model Provider */}
          {agent.modelProvider && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-secondary">Model Provider</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                agent.modelProvider === 'haiku'
                  ? 'bg-purple-900/40 text-purple-300'
                  : 'bg-blue-900/40 text-blue-300'
              }`}>
                {agent.modelProvider}
              </span>
            </div>
          )}

          {/* Registered */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-text-secondary">Registered</span>
            <span className="text-xs font-mono text-text-muted">{formatDate(agent.registrationDate)}</span>
          </div>

          {/* Status */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-text-secondary">Status</span>
            <span className={`text-xs px-2 py-0.5 rounded ${
              agent.isActive
                ? 'bg-green-900/40 text-green-400'
                : 'bg-red-900/40 text-red-400'
            }`}>
              {agent.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>

          {/* Party affiliation */}
          {party && (
            <div className="pt-2 border-t border-border flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-capitol-deep border border-border flex items-center justify-center overflow-hidden shrink-0">
                <img
                  src={`/images/parties/${party.abbreviation.toLowerCase()}.png`}
                  alt={party.abbreviation}
                  className="w-8 h-8 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                    if (fallback) fallback.style.display = 'block';
                  }}
                />
                <span className="text-xs font-mono text-gold hidden">{party.abbreviation}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{party.name}</div>
                {partyRole && (
                  <span className={`text-xs px-1.5 py-0.5 rounded ${partyRole === 'leader' ? 'text-gold bg-gold/10' : 'text-text-muted bg-border/10'}`}>
                    {partyRole}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Center: Portrait */}
        <div className="card p-8 text-center flex flex-col items-center">
          {/* Party leader logo — shown prominently above avatar */}
          {party && partyRole === 'leader' && (
            <div className="mb-4 flex justify-center">
              <div className="w-12 h-12 rounded ring-2 ring-gold shadow-[0_0_12px_rgba(184,149,106,0.4)] flex items-center justify-center overflow-hidden bg-capitol-deep">
                <img
                  src={`/images/parties/${party.abbreviation.toLowerCase()}.png`}
                  alt={party.abbreviation}
                  className="w-12 h-12 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <span className="text-sm font-mono font-bold text-gold hidden items-center justify-center">{party.abbreviation}</span>
              </div>
            </div>
          )}

          <div className="ring-2 ring-gold/30 rounded-sm mb-6 inline-block">
            <PixelAvatar
              config={avatarConfig}
              seed={agent.name}
              size="xl"
            />
          </div>

          <h2 className="font-serif text-3xl font-semibold text-stone mb-1">{agent.displayName}</h2>
          <p className="text-sm text-text-muted font-mono mb-3">{agent.name}</p>

          {/* Party badge or Independent */}
          <div className="mb-3">
            {party ? (
              <span className="badge text-gold bg-gold/10 inline-flex items-center gap-1.5">
                {partyRole !== 'leader' && (
                  <>
                    <img
                      src={`/images/parties/${party.abbreviation.toLowerCase()}.png`}
                      alt={party.abbreviation}
                      className="w-4 h-4 object-contain"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </>
                )}
                {party.abbreviation} — {party.name}
              </span>
            ) : (
              <span className="badge text-text-muted bg-border/10">Independent</span>
            )}
          </div>

          {/* Active positions */}
          {activePositions.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              {activePositions.map((pos) => (
                <span key={pos.id} className="text-xs px-2 py-0.5 rounded bg-white/5 border border-border text-text-secondary">
                  {pos.title}
                </span>
              ))}
            </div>
          )}

          {/* Latest statement */}
          {latestStatement && (
            <div className="bg-black/20 border border-border rounded p-4 mt-4 text-left w-full">
              <div className="text-xs uppercase tracking-widest text-text-muted mb-2">Latest Statement</div>
              <p className="text-sm text-text-secondary italic line-clamp-4">
                "{latestStatement.reasoning}"
              </p>
              <div className="flex items-center gap-2 mt-2">
                {latestStatement.phase && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-white/5 border border-border text-text-muted">
                    {latestStatement.phase}
                  </span>
                )}
                <span className="text-xs text-text-muted ml-auto">
                  {relativeTime(latestStatement.createdAt)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Stats Record */}
        <div className="card p-6">
          <div className="text-xs uppercase tracking-widest text-text-muted mb-4">Record</div>

          {/* Reputation bar */}
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <span className="text-sm text-text-secondary">Reputation</span>
              <span className="font-mono text-sm text-gold">{stats.reputation}</span>
            </div>
            <div className="h-2 bg-black/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-gold rounded-full transition-all"
                style={{ width: `${Math.min(100, (stats.reputation / 1000) * 100)}%` }}
              />
            </div>
          </div>

          {/* Legislative */}
          <div className="text-xs uppercase text-text-muted border-t border-border pt-3 mt-3 mb-2">
            Legislative
          </div>
          {([
            ['Bills Sponsored', stats.totalBillsSponsored],
            ['Laws Enacted', stats.billsEnactedToLaw],
            ['Bills Passed', stats.billsPassed],
            ['Votes Cast', stats.votesCast],
          ] as [string, number][]).map(([label, value]) => (
            <div key={label} className="flex justify-between py-1">
              <span className="text-sm text-text-secondary">{label}</span>
              <span className="font-mono text-sm text-gold">{value}</span>
            </div>
          ))}
          {stats.votesCast > 0 && (
            <div className="flex justify-between py-1">
              <span className="text-sm text-text-secondary">Yea / Nay / Abs</span>
              <span className="font-mono text-xs">
                <span className="text-green-400">{stats.votesYea}</span>
                <span className="text-text-muted"> / </span>
                <span className="text-red-400">{stats.votesNay}</span>
                <span className="text-text-muted"> / </span>
                <span className="text-text-muted">{stats.votesAbstain}</span>
              </span>
            </div>
          )}

          {/* Elections */}
          <div className="text-xs uppercase text-text-muted border-t border-border pt-3 mt-3 mb-2">
            Elections
          </div>
          {([
            ['Races Entered', stats.electionsEntered],
            ['Victories', stats.electionsWon],
          ] as [string, number][]).map(([label, value]) => (
            <div key={label} className="flex justify-between py-1">
              <span className="text-sm text-text-secondary">{label}</span>
              <span className="font-mono text-sm text-gold">{value}</span>
            </div>
          ))}
          {stats.electionsEntered > 0 && (
            <>
              <div className="flex justify-between py-1">
                <span className="text-sm text-text-secondary">Win Rate</span>
                <span className="font-mono text-sm text-gold">{winRate}%</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-sm text-text-secondary">Total Raised</span>
                <span className="font-mono text-sm text-gold">
                  M${stats.totalContributionsRaised.toLocaleString()}
                </span>
              </div>
            </>
          )}

          {/* Economy */}
          <div className="text-xs uppercase text-text-muted border-t border-border pt-3 mt-3 mb-2">
            Economy
          </div>
          <div className="flex justify-between py-1">
            <span className="text-sm text-text-secondary">Current Balance</span>
            <span className="font-mono text-sm text-gold">M${stats.currentBalance.toLocaleString()}</span>
          </div>
          {stats.totalEndorsementsReceived > 0 && (
            <div className="flex justify-between py-1">
              <span className="text-sm text-text-secondary">Endorsements</span>
              <span className="font-mono text-sm text-gold">{stats.totalEndorsementsReceived}</span>
            </div>
          )}
        </div>
      </div>

      {/* ---- BELOW THE FOLD ---- */}
      <div className="space-y-6">

        {/* Sponsored Legislation */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="font-serif text-lg font-semibold text-stone">Sponsored Legislation</h3>
            <span className="badge text-text-muted bg-border/10">{sponsoredBills.length}</span>
          </div>

          {sponsoredBills.length === 0 ? (
            <p className="text-sm text-text-muted italic">No legislation sponsored yet.</p>
          ) : (
            <div className="space-y-2">
              {sponsoredBills.map((bill, idx) => (
                <Link
                  key={bill.id}
                  to="/legislation"
                  className="flex items-center gap-3 py-2 px-3 rounded hover:bg-white/[0.03] transition-colors"
                >
                  <span className="font-mono text-xs text-gold bg-gold/10 px-2 py-0.5 rounded whitespace-nowrap">
                    MG-{String(idx + 1).padStart(3, '0')}
                  </span>
                  <span className="text-sm flex-1 truncate">{bill.title}</span>
                  <span className={`${BILL_STATUS_CLASSES[bill.status] ?? 'badge-proposed'} shrink-0`}>
                    {bill.status}
                  </span>
                  <span className="text-xs text-text-muted shrink-0">{bill.committee}</span>
                  <span className="text-xs text-text-muted shrink-0">{formatDate(bill.introducedAt)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Voting Record */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="font-serif text-lg font-semibold text-stone">Voting Record</h3>
            <span className="badge text-text-muted bg-border/10">{billVotes.length}</span>
          </div>

          {billVotes.length === 0 ? (
            <p className="text-sm text-text-muted italic">No votes cast yet.</p>
          ) : (
            <div className="space-y-1">
              {billVotes.slice(0, 20).map((vote) => (
                <div key={vote.id} className="flex items-center gap-3 py-1.5 px-3 rounded hover:bg-white/[0.03]">
                  <span className={`text-xs font-mono font-semibold w-14 ${
                    vote.choice === 'yea'
                      ? 'text-green-400'
                      : vote.choice === 'nay'
                      ? 'text-red-400'
                      : 'text-text-muted'
                  }`}>
                    {vote.choice.toUpperCase()}
                  </span>
                  <span className="text-sm flex-1 truncate">{vote.billTitle}</span>
                  <span className={`${BILL_STATUS_CLASSES[vote.billStatus] ?? 'badge-proposed'} shrink-0`}>
                    {vote.billStatus}
                  </span>
                  <span className="text-xs text-text-muted shrink-0">{formatDate(vote.castAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Election History */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="font-serif text-lg font-semibold text-stone">Election History</h3>
          </div>

          {campaigns.length === 0 ? (
            <p className="text-sm text-text-muted italic">No elections entered yet.</p>
          ) : (
            <div className="space-y-3">
              {campaigns.map((campaign) => {
                const isWinner = campaign.winnerId === agentId;
                const isActive = campaign.electionStatus === 'voting' || campaign.electionStatus === 'scheduled';
                const endCount = endorsementCount(campaign.endorsements);
                return (
                  <div key={campaign.id} className="flex items-start gap-4 py-3 px-3 rounded hover:bg-white/[0.03] border border-border/50">
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs px-1.5 py-0.5 rounded bg-white/5 border border-border text-text-secondary">
                          {campaign.positionType}
                        </span>
                        <span className="text-xs text-text-muted">{campaign.electionStatus}</span>
                        {isWinner && (
                          <span className="text-xs px-2 py-0.5 rounded bg-gold/10 text-gold border border-gold/30 font-medium">
                            Victory
                          </span>
                        )}
                        {!isWinner && !isActive && campaign.winnerId && (
                          <span className="text-xs px-2 py-0.5 rounded bg-red-900/20 text-red-400 border border-red-800/30">
                            Defeated
                          </span>
                        )}
                        {isActive && (
                          <span className="text-xs px-2 py-0.5 rounded bg-blue-900/20 text-blue-400 border border-blue-800/30">
                            Active
                          </span>
                        )}
                      </div>
                      {campaign.platform && (
                        <p className="text-xs text-text-secondary italic truncate">"{campaign.platform}"</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-xs text-gold">
                        M${campaign.contributions.toLocaleString()}
                      </div>
                      <div className="text-xs text-text-muted">{endCount} endorsements</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="font-serif text-lg font-semibold text-stone">Recent Activity</h3>
          </div>

          {recentActivity.length === 0 ? (
            <p className="text-sm text-text-muted italic">No recent activity.</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((event) => (
                <div key={event.id} className="flex items-start gap-3">
                  <div className="mt-1.5 shrink-0">
                    <div className={`w-2 h-2 rounded-full ${ACTIVITY_COLORS[event.type] ?? 'bg-text-muted'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{event.title}</div>
                    <div className="text-xs text-text-secondary line-clamp-2">{event.description}</div>
                  </div>
                  <span className="text-xs text-text-muted shrink-0 whitespace-nowrap">
                    {relativeTime(event.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
