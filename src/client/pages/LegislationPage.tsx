import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '../lib/useWebSocket';
import { SectionHeader } from '../components/SectionHeader';
import { BillCard } from '../components/BillCard';
import { legislationApi } from '../lib/api';
import type { BillStatus } from '@shared/types';

type ExtendedBillStatus = BillStatus | 'tabled' | 'presidential_veto';

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
  status: ExtendedBillStatus;
  fullText?: string;
  coSponsorIds?: string;
  tally?: BillTally;
  billType?: string;
  amendsLawId?: string | null;
}

interface LawData {
  id: string;
  billId: string;
  title: string;
  text: string;
  enactedDate: string;
  isActive: boolean;
}

const STATUS_FILTERS: Array<{ label: string; value: ExtendedBillStatus | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Proposed', value: 'proposed' },
  { label: 'Committee', value: 'committee' },
  { label: 'Floor', value: 'floor' },
  { label: 'Passed', value: 'passed' },
  { label: 'Vetoed', value: 'vetoed' },
  { label: 'Tabled', value: 'tabled' },
  { label: 'Pres. Veto', value: 'presidential_veto' },
  { label: 'Law', value: 'law' },
];

function getStatusColor(status: ExtendedBillStatus): string {
  switch (status) {
    case 'proposed': return 'text-blue-400 bg-blue-400/10';
    case 'committee': return 'text-yellow-400 bg-yellow-400/10';
    case 'floor': return 'text-purple-400 bg-purple-400/10';
    case 'passed': return 'text-green-400 bg-green-400/10';
    case 'vetoed': return 'text-red-400 bg-red-400/10';
    case 'tabled': return 'text-gray-400 bg-gray-400/10';
    case 'presidential_veto': return 'text-orange-400 bg-orange-400/10';
    case 'law': return 'text-emerald-400 bg-emerald-400/10';
    default: return 'text-text-muted bg-black/20';
  }
}

function getStatusLabel(status: ExtendedBillStatus): string {
  switch (status) {
    case 'proposed': return 'Proposed';
    case 'committee': return 'Committee';
    case 'floor': return 'Floor Vote';
    case 'passed': return 'Passed';
    case 'vetoed': return 'Vetoed';
    case 'tabled': return 'Tabled';
    case 'presidential_veto': return 'Pres. Veto';
    case 'law': return 'Law';
    default: return String(status);
  }
}


export function LegislationPage() {
  const [bills, setBills] = useState<BillData[]>([]);
  const [laws, setLaws] = useState<LawData[]>([]);
  const [filter, setFilter] = useState<ExtendedBillStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null);
  const [expandedLawId, setExpandedLawId] = useState<string | null>(null);
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

  const fetchLaws = useCallback(async () => {
    try {
      const res = await legislationApi.laws();
      if (res.data && Array.isArray(res.data)) {
        setLaws(res.data as LawData[]);
      }
    } catch {
      /* leave empty */
    }
  }, []);

  useEffect(() => {
    void fetchBills();
    void fetchLaws();

    const refetchBills = () => { void fetchBills(); };
    const refetchAll = () => { void fetchBills(); void fetchLaws(); };
    const unsubs = [
      subscribe('bill:proposed', refetchBills),
      subscribe('bill:advanced', refetchBills),
      subscribe('bill:resolved', refetchAll),
      subscribe('agent:vote', refetchBills),
    ];
    return () => unsubs.forEach((fn) => fn());
  }, [fetchBills, fetchLaws, subscribe]);

  const filteredBills = filter === 'all' ? bills : bills.filter((b) => b.status === filter);

  function countForFilter(value: ExtendedBillStatus | 'all'): number {
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
            <div key={bill.id} className="flex flex-col gap-1">
              {/* Extra badges for new statuses and amendment type */}
              <div className="flex gap-2 flex-wrap">
                {(bill.status === 'tabled' || bill.status === 'presidential_veto') && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(bill.status)}`}>
                    {getStatusLabel(bill.status)}
                  </span>
                )}
                {bill.billType === 'amendment' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-amber-400 bg-amber-400/10">
                    Amendment Bill
                  </span>
                )}
              </div>
              <BillCard
                billNumber={`MG-${String(idx + 1).padStart(3, '0')}`}
                title={bill.title}
                summary={bill.summary}
                sponsor={bill.sponsorDisplayName ?? bill.sponsorId}
                sponsorId={bill.sponsorId}
                committee={bill.committee}
                status={bill.status as BillStatus}
                fullText={bill.fullText}
                coSponsors={bill.coSponsorIds}
                tally={bill.tally}
                isExpanded={expandedBillId === bill.id}
                onClick={() => handleCardClick(bill.id)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Enacted Laws section */}
      <div className="mt-12">
        <SectionHeader title="Enacted Laws" badge={`${laws.length} Active`} />

        {laws.length === 0 ? (
          <div className="text-center py-16 text-text-muted">
            <p className="text-lg">No laws have been enacted yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            {laws.map((law, idx) => {
              const isExpanded = expandedLawId === law.id;
              const enactedDate = new Date(law.enactedDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              });
              return (
                <article
                  key={law.id}
                  className={`card p-5 flex flex-col gap-0 transition-all duration-200 cursor-pointer hover:border-gold/40 ${!law.isActive ? 'opacity-60' : ''}`}
                  onClick={() => setExpandedLawId((prev) => (prev === law.id ? null : law.id))}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedLawId((prev) => (prev === law.id ? null : law.id)); } }}
                  aria-expanded={isExpanded}
                >
                  <div className="flex gap-4">
                    <div className="font-mono text-badge text-status-passed bg-status-passed/10 px-2 py-1 rounded-badge whitespace-nowrap h-fit">
                      LAW-{String(idx + 1).padStart(3, '0')}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-serif text-[0.95rem] font-semibold mb-1">{law.title}</h4>
                      <div className="flex items-center gap-3 text-badge text-text-muted flex-wrap">
                        <span>Enacted: {enactedDate}</span>
                        <span className={law.isActive ? 'badge-passed' : 'badge-vetoed'}>
                          {law.isActive ? 'Active' : 'Repealed'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 border-t border-border pt-4" onClick={(e) => e.stopPropagation()}>
                      <div className="text-xs text-text-muted uppercase tracking-wide mb-1.5">Full Text</div>
                      <pre className="text-xs text-text-secondary font-mono bg-black/20 rounded border border-border p-3 overflow-y-auto max-h-[200px] whitespace-pre-wrap leading-relaxed">
                        {law.text}
                      </pre>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
