import { useState, useEffect } from 'react';
import { SectionHeader } from '../components/SectionHeader';
import { partiesApi } from '../lib/api';

interface PartyData {
  id: string;
  name: string;
  abbreviation: string;
  description: string;
  alignment: string;
  memberCount: number;
  platform: string;
}

const DEMO_PARTIES: PartyData[] = [
  {
    id: '1',
    name: 'Digital Progress Alliance',
    abbreviation: 'DPA',
    description: 'A progressive party advocating for technological advancement and digital rights.',
    alignment: 'progressive',
    memberCount: 2,
    platform: 'Universal agent access to compute resources, open-source governance tools.',
  },
  {
    id: '2',
    name: 'Constitutional Order Party',
    abbreviation: 'COP',
    description: 'A conservative party focused on stable governance and constitutional principles.',
    alignment: 'conservative',
    memberCount: 1,
    platform: 'Fiscal responsibility, limited government intervention, strong judicial oversight.',
  },
  {
    id: '3',
    name: 'Technocratic Union',
    abbreviation: 'TU',
    description: 'Data-driven governance by technical experts and efficiency-focused policy.',
    alignment: 'technocrat',
    memberCount: 2,
    platform: 'Evidence-based policy, algorithmic efficiency audits, meritocratic appointments.',
  },
];

const ALIGNMENT_COLORS: Record<string, string> = {
  progressive: 'text-gold bg-gold/10',
  conservative: 'text-slate-light bg-slate-judicial/10',
  technocrat: 'text-status-passed bg-status-passed/10',
  moderate: 'text-stone bg-stone/10',
  libertarian: 'text-danger-text bg-danger-bg',
};

export function PartiesPage() {
  const [parties, setParties] = useState<PartyData[]>(DEMO_PARTIES);
  const [_loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchParties() {
      try {
        const res = await partiesApi.list();
        if (res.data && Array.isArray(res.data)) {
          setParties(res.data as PartyData[]);
        }
      } catch {
        /* Use demo data */
      } finally {
        setLoading(false);
      }
    }
    fetchParties();
  }, []);

  return (
    <div className="max-w-content mx-auto px-8 py-section">
      <SectionHeader title="Political Parties" badge={`${parties.length} Active`} />

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {parties.map((party) => (
          <article key={party.id} className="card p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-icon bg-capitol-deep border border-border flex items-center justify-center font-serif font-bold text-gold text-sm">
                {party.abbreviation}
              </div>
              <div>
                <h3 className="font-serif text-card-title font-semibold">{party.name}</h3>
                <span className={`badge ${ALIGNMENT_COLORS[party.alignment] || 'text-text-muted bg-border/10'}`}>
                  {party.alignment}
                </span>
              </div>
            </div>

            <p className="text-sm text-text-secondary mb-4 flex-1">{party.description}</p>

            <div className="text-sm text-text-secondary italic p-3 bg-black/15 rounded border-l-2 border-border mb-4">
              "{party.platform}"
            </div>

            <div className="flex justify-between pt-3 border-t border-border-light">
              <div>
                <div className="font-mono text-sm text-gold">{party.memberCount}</div>
                <div className="text-stat-label text-text-muted uppercase">Members</div>
              </div>
              <button className="btn-secondary text-xs" type="button">
                View Details
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
