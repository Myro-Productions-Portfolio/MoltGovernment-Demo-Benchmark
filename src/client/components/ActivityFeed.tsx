interface ActivityItem {
  id: string;
  type: 'vote' | 'bill' | 'party' | 'campaign';
  text: string;
  highlight: string;
  time: string;
}

interface ActivityFeedProps {
  items: ActivityItem[];
}

const TYPE_ICON_CLASSES = {
  vote: 'bg-gold/15',
  bill: 'bg-slate-judicial/15',
  party: 'bg-danger-bg',
  campaign: 'bg-success-bg',
} as const;

const TYPE_ICONS = {
  vote: (
    <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4" aria-hidden="true">
      <path d="M8 1L1 8H5V15H11V8H15L8 1Z" stroke="#B8956A" strokeWidth="1.2" />
    </svg>
  ),
  bill: (
    <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4" aria-hidden="true">
      <path d="M3 1H13V15H3V1Z" stroke="#6B7A8D" strokeWidth="1.2" />
      <path d="M5 5H11M5 8H11M5 11H9" stroke="#6B7A8D" strokeWidth="1" />
    </svg>
  ),
  party: (
    <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4" aria-hidden="true">
      <circle cx="8" cy="5" r="3" stroke="#8B3A3A" strokeWidth="1.2" />
      <path d="M2 15C2 11.5 4.5 9 8 9C11.5 9 14 11.5 14 15" stroke="#8B3A3A" strokeWidth="1.2" />
    </svg>
  ),
  campaign: (
    <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4" aria-hidden="true">
      <path d="M8 1V11M4 7L8 11L12 7" stroke="#3A6B3A" strokeWidth="1.2" />
      <path d="M3 14H13" stroke="#3A6B3A" strokeWidth="1.2" />
    </svg>
  ),
};

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <div className="flex flex-col gap-3" role="feed" aria-label="Recent activity">
      {items.map((item) => (
        <article
          key={item.id}
          className="flex gap-3 p-3 px-4 card text-sm"
          aria-label={`${item.type} activity`}
        >
          <div
            className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${TYPE_ICON_CLASSES[item.type]}`}
          >
            {TYPE_ICONS[item.type]}
          </div>
          <div className="flex-1">
            <div className="text-text-secondary">
              <strong className="text-text-primary font-medium">{item.highlight}</strong>{' '}
              {item.text}
            </div>
            <div className="text-badge text-text-muted font-mono mt-0.5">{item.time}</div>
          </div>
        </article>
      ))}
    </div>
  );
}
