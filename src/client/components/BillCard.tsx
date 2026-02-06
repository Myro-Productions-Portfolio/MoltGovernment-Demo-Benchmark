import type { BillStatus } from '@shared/types';

interface BillCardProps {
  billNumber: string;
  title: string;
  summary: string;
  sponsor: string;
  committee: string;
  status: BillStatus;
}

const STATUS_BADGE_CLASS: Record<BillStatus, string> = {
  proposed: 'badge-proposed',
  committee: 'badge-committee',
  floor: 'badge-floor',
  passed: 'badge-passed',
  vetoed: 'badge-vetoed',
  law: 'badge-law',
};

export function BillCard({
  billNumber,
  title,
  summary,
  sponsor,
  committee,
  status,
}: BillCardProps) {
  return (
    <article className="card p-5 flex gap-4">
      <div className="font-mono text-badge text-gold bg-gold/10 px-2 py-1 rounded-badge whitespace-nowrap h-fit">
        {billNumber}
      </div>
      <div className="flex-1">
        <h4 className="font-serif text-[0.95rem] font-semibold mb-1">{title}</h4>
        <p className="text-sm text-text-secondary mb-2 line-clamp-2">{summary}</p>
        <div className="flex items-center gap-4 text-badge text-text-muted">
          <span>Sponsor: {sponsor}</span>
          <span>Committee: {committee}</span>
          <span className={STATUS_BADGE_CLASS[status]}>{status}</span>
        </div>
      </div>
    </article>
  );
}
