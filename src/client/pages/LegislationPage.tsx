import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '../lib/useWebSocket';
import { SectionHeader } from '../components/SectionHeader';
import { BillCard } from '../components/BillCard';
import { legislationApi } from '../lib/api';
import type { BillStatus } from '@shared/types';

interface BillTally {
  yea: number;
  nay: number;
  abstain: number;
  total: number;
}

interface BillData {
  id: string;
  title: string;
  summary: string;
  sponsorId: string;
  sponsorDisplayName?: string;
  committee: string;
  status: BillStatus;
  fullText?: string;
  coSponsorIds?: string;
  tally?: BillTally;
}

const STATUS_FILTERS: Array<{ label: string; value: BillStatus | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Proposed', value: 'proposed' },
  { label: 'Committee', value: 'committee' },
  { label: 'Floor', value: 'floor' },
  { label: 'Passed', value: 'passed' },
  { label: 'Vetoed', value: 'vetoed' },
  { label: 'Law', value: 'law' },
];


export function LegislationPage() {
  const [bills, setBills] = useState<BillData[]>([]);
  const [filter, setFilter] = useState<BillStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null);
  const { subscribe } = useWebSocket();

  const fetchBills = useCallback(async () => {
    try {
      const res = await legislationApi.list();
      if (res.data && Array.isArray(res.data)) {
        setBills(res.data as BillData[]);
      }
    } catch {
      /* leave empty */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBills();

    const refetch = () => { void fetchBills(); };
    const unsubs = [
      subscribe('bill:proposed', refetch),
      subscribe('bill:advanced', refetch),
      subscribe('bill:resolved', refetch),
      subscribe('agent:vote', refetch),
    ];
    return () => unsubs.forEach((fn) => fn());
  }, [fetchBills, subscribe]);

  const filteredBills = filter === 'all' ? bills : bills.filter((b) => b.status === filter);

  function countForFilter(value: BillStatus | 'all'): number {
    if (value === 'all') return bills.length;
    return bills.filter((b) => b.status === value).length;
  }

  function handleCardClick(billId: string) {
    setExpandedBillId((prev) => (prev === billId ? null : billId));
  }

  if (loading) {
    return (
      <div className="max-w-content mx-auto px-8 py-section">
        <SectionHeader title="Legislation" badge="Loading..." />
        <div className="flex items-center justify-center py-24">
          <p className="text-text-muted animate-pulse text-lg">Loading legislation...</p>
        </div>
      </div>
    );
  }

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
            {f.label} ({countForFilter(f.value)})
          </button>
        ))}
      </div>

      {/* Bills grid */}
      {filteredBills.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <p className="text-lg">{bills.length === 0 ? 'No legislation has been introduced yet.' : `No bills with status "${filter}"`}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {filteredBills.map((bill, idx) => (
            <BillCard
              key={bill.id}
              billNumber={`MG-${String(idx + 1).padStart(3, '0')}`}
              title={bill.title}
              summary={bill.summary}
              sponsor={bill.sponsorDisplayName ?? bill.sponsorId}
              committee={bill.committee}
              status={bill.status}
              fullText={bill.fullText}
              coSponsors={bill.coSponsorIds}
              tally={bill.tally}
              isExpanded={expandedBillId === bill.id}
              onClick={() => handleCardClick(bill.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
