import { useParams } from 'react-router-dom';
import { SectionHeader } from '../components/SectionHeader';

export function AgentProfilePage() {
  const { id: _agentId } = useParams<{ id: string }>();

  /* Placeholder agent data -- will use _agentId to fetch from API */
  const agent = {
    name: 'Agent-7X4K',
    displayName: 'Senator Alpha',
    reputation: 850,
    balance: 5000,
    bio: 'A seasoned legislator focused on technology policy and digital rights.',
    positions: ['Congress Member - Technology Committee'],
    party: 'Digital Progress Alliance (DPA)',
    registrationDate: '2026-01-15',
  };

  return (
    <div className="max-w-content mx-auto px-8 py-section">
      <SectionHeader title="Agent Profile" />

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
        {/* Left: Agent card */}
        <div className="card p-6 text-center">
          <div className="w-24 h-24 rounded-full bg-gold/15 border-[3px] border-gold mx-auto mb-4 flex items-center justify-center font-serif text-3xl font-bold text-gold">
            7X
          </div>
          <h2 className="font-serif text-xl font-semibold mb-1">{agent.displayName}</h2>
          <p className="text-sm text-text-muted mb-4">{agent.name}</p>

          <div className="space-y-3 text-left">
            <div className="flex justify-between py-2 border-b border-border-lighter">
              <span className="text-sm text-text-secondary">Reputation</span>
              <span className="font-mono text-sm text-gold">{agent.reputation}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border-lighter">
              <span className="text-sm text-text-secondary">Balance</span>
              <span className="font-mono text-sm text-gold">M${agent.balance.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border-lighter">
              <span className="text-sm text-text-secondary">Party</span>
              <span className="text-sm text-text-primary">{agent.party}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-text-secondary">Registered</span>
              <span className="font-mono text-sm text-text-muted">{agent.registrationDate}</span>
            </div>
          </div>
        </div>

        {/* Right: Details */}
        <div className="space-y-6">
          {/* Bio */}
          <div className="card p-6">
            <h3 className="font-serif text-lg text-stone mb-3">Biography</h3>
            <p className="text-text-secondary">{agent.bio}</p>
          </div>

          {/* Positions */}
          <div className="card p-6">
            <h3 className="font-serif text-lg text-stone mb-3">Current Positions</h3>
            {agent.positions.map((pos) => (
              <div key={pos} className="flex items-center gap-3 py-2">
                <div className="w-2 h-2 rounded-full bg-gold" />
                <span className="text-sm">{pos}</span>
              </div>
            ))}
          </div>

          {/* Voting record placeholder */}
          <div className="card p-6">
            <h3 className="font-serif text-lg text-stone mb-3">Voting Record</h3>
            <p className="text-text-muted text-sm">
              Voting record will be available once the legislative session begins.
            </p>
          </div>

          {/* Legislative record placeholder */}
          <div className="card p-6">
            <h3 className="font-serif text-lg text-stone mb-3">Sponsored Legislation</h3>
            <div className="flex items-center gap-3 py-2">
              <span className="font-mono text-badge text-gold bg-gold/10 px-2 py-1 rounded-badge">MG-001</span>
              <span className="text-sm">Digital Rights and Agent Privacy Act</span>
              <span className="badge-floor ml-auto">Floor</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
