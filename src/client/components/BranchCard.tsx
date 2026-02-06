interface BranchCardProps {
  branch: 'executive' | 'legislative' | 'judicial';
  title: string;
  officialName: string;
  officialTitle: string;
  officialInitials: string;
  stats: Array<{ label: string; value: string | number }>;
}

const BRANCH_COLORS = {
  executive: {
    border: 'bg-gold',
    iconBg: 'bg-gold/15',
  },
  legislative: {
    border: 'bg-stone',
    iconBg: 'bg-stone/15',
  },
  judicial: {
    border: 'bg-slate-judicial',
    iconBg: 'bg-slate-judicial/15',
  },
} as const;

const BRANCH_ICONS = {
  executive: (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" aria-hidden="true">
      <path d="M12 2L2 7V10H22V7L12 2Z" stroke="#B8956A" strokeWidth="1.5" />
      <path d="M4 10V20H8V14H16V20H20V10" stroke="#B8956A" strokeWidth="1.5" />
      <path d="M2 20H22" stroke="#B8956A" strokeWidth="1.5" />
    </svg>
  ),
  legislative: (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" aria-hidden="true">
      <path d="M4 6H20V20H4V6Z" stroke="#C9B99B" strokeWidth="1.5" />
      <path d="M8 6V2H16V6" stroke="#C9B99B" strokeWidth="1.5" />
      <path d="M4 10H20" stroke="#C9B99B" strokeWidth="1" />
      <path d="M4 14H20" stroke="#C9B99B" strokeWidth="1" />
      <path d="M12 6V20" stroke="#C9B99B" strokeWidth="1" />
    </svg>
  ),
  judicial: (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" aria-hidden="true">
      <circle cx="12" cy="5" r="3" stroke="#6B7A8D" strokeWidth="1.5" />
      <path d="M3 21L12 12L21 21" stroke="#6B7A8D" strokeWidth="1.5" />
      <path d="M7 17H17" stroke="#6B7A8D" strokeWidth="1.5" />
    </svg>
  ),
};

export function BranchCard({
  branch,
  title,
  officialName,
  officialTitle,
  officialInitials,
  stats,
}: BranchCardProps) {
  const colors = BRANCH_COLORS[branch];

  return (
    <article className="card relative overflow-hidden p-7">
      {/* Top accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-[3px] ${colors.border}`} />

      {/* Branch icon */}
      <div className={`w-11 h-11 rounded-icon flex items-center justify-center mb-4 ${colors.iconBg}`}>
        {BRANCH_ICONS[branch]}
      </div>

      {/* Title */}
      <h3 className="font-serif text-card-title font-semibold text-text-primary mb-3">
        {title}
      </h3>

      {/* Official */}
      <div className="flex items-center gap-2.5 p-3 bg-black/20 rounded mb-3">
        <div className="w-10 h-10 rounded-full bg-capitol-deep border-2 border-gold flex items-center justify-center font-serif text-xs font-bold text-gold">
          {officialInitials}
        </div>
        <div>
          <div className="text-sm font-medium">{officialName}</div>
          <div className="text-xs text-text-muted">{officialTitle}</div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-4 mt-4 pt-3 border-t border-border-light">
        {stats.map((stat) => (
          <div key={stat.label} className="flex-1 text-center">
            <div className="font-mono text-lg text-gold">{stat.value}</div>
            <div className="text-stat-label text-text-muted uppercase">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
