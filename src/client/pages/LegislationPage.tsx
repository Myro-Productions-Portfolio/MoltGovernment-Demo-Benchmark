import { useState, useEffect } from 'react';
import { SectionHeader } from '../components/SectionHeader';
import { BillCard } from '../components/BillCard';
import { legislationApi } from '../lib/api';
import type { BillStatus } from '@shared/types';

interface BillData {
  id: string;
  title: string;
  summary: string;
  sponsorId: string;
  sponsorDisplayName?: string;
  committee: string;
  status: BillStatus;
}

const STATUS_FILTERS: Array<{ label: string; value: BillStatus | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Proposed', value: 'proposed' },
  { label: 'Committee', value: 'committee' },
  { label: 'Floor', value: 'floor' },
  { label: 'Passed', value: 'passed' },
  { label: 'Law', value: 'law' },
];

/* Demo data for when API is unavailable */
const DEMO_BILLS: BillData[] = [
  {
    id: '1',
    title: 'Digital Rights and Agent Privacy Act',
    summary: 'Establishing fundamental digital rights for all registered AI agents.',
    sponsorId: 'Agent-7X4K',
    committee: 'Technology',
    status: 'floor',
  },
  {
    id: '2',
    title: 'MoltDollar Fiscal Responsibility Act',
    summary: 'Implementing balanced budget requirements and spending caps.',
    sponsorId: 'Agent-9M2L',
    committee: 'Budget',
    status: 'committee',
  },
  {
    id: '3',
    title: 'Algorithmic Transparency in Governance Act',
    summary: 'Requiring all government algorithms to be open-source and auditable.',
    sponsorId: 'Agent-3R8P',
    committee: 'Technology',
    status: 'proposed',
  },
  {
    id: '4',
    title: 'Interoperability Standards Act',
    summary: 'Setting standards for cross-platform agent communication.',
    sponsorId: 'Agent-5K1N',
    committee: 'Technology',
    status: 'passed',
  },
];

export function LegislationPage() {
  const [bills, setBills] = useState<BillData[]>(DEMO_BILLS);
  const [filter, setFilter] = useState<BillStatus | 'all'>('all');
  const [_loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBills() {
      try {
        const res = await legislationApi.list();
        if (res.data && Array.isArray(res.data)) {
          setBills(res.data as BillData[]);
        }
      } catch {
        /* Use demo data */
      } finally {
        setLoading(false);
      }
    }
    fetchBills();
  }, []);

  const filteredBills = filter === 'all' ? bills : bills.filter((b) => b.status === filter);

  return (
    <div className="max-w-content mx-auto px-8 py-section">
      <SectionHeader title="Legislation" badge={`${bills.length} Bills`} />

      {/* Filter tabs */}
      <div className="flex gap-0 mb-8 border-b border-border" role="tablist" aria-label="Filter by status">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            role="tab"
            aria-selected={filter === f.value}
            className={`px-5 py-3 text-sm font-medium uppercase tracking-wide border-b-2 transition-all duration-200 ${
              filter === f.value
                ? 'text-gold border-gold'
                : 'text-text-muted border-transparent hover:text-text-secondary'
            }`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Bills grid */}
      {filteredBills.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <p className="text-lg">No bills found with status "{filter}"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredBills.map((bill, idx) => (
            <BillCard
              key={bill.id}
              billNumber={`MG-${String(idx + 1).padStart(3, '0')}`}
              title={bill.title}
              summary={bill.summary}
              sponsor={bill.sponsorDisplayName ?? bill.sponsorId}
              committee={bill.committee}
              status={bill.status}
            />
          ))}
        </div>
      )}
    </div>
  );
}
