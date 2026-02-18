import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { legislationApi } from '../lib/api';
import { PixelAvatar } from '../components/PixelAvatar';
import type { AvatarConfig } from '../components/PixelAvatar';

interface LawItem {
  id: string;
  title: string;
  enactedDate: string;
  isActive: boolean;
  committee: string | null;
  sourceBillId: string | null;
  sponsorId: string | null;
  sponsorDisplayName: string | null;
  sponsorAvatarConfig: string | null;
  sponsorAlignment: string | null;
}

const ALIGNMENT_COLORS: Record<string, string> = {
  progressive:  'text-gold bg-gold/10 border-gold/30',
  conservative: 'text-slate-300 bg-slate-800/40 border-slate-600/30',
  technocrat:   'text-green-400 bg-green-900/20 border-green-700/30',
  moderate:     'text-stone bg-stone/10 border-stone/30',
  libertarian:  'text-red-400 bg-red-900/20 border-red-700/30',
};

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function LawsPage() {
  const [lawItems, setLawItems] = useState<LawItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    legislationApi.laws()
      .then((res) => {
        if (res.data && Array.isArray(res.data)) {
          setLawItems(res.data as LawItem[]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activeCount = lawItems.filter((l) => l.isActive).length;

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="font-serif text-3xl font-semibold text-stone">Laws of the Land</h1>
        {!loading && (
          <p className="text-text-muted text-sm">
            {lawItems.length} law{lawItems.length !== 1 ? 's' : ''} enacted
            {activeCount !== lawItems.length && `, ${activeCount} active`}
          </p>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <p className="text-text-muted py-16 text-center">Loading...</p>
      ) : lawItems.length === 0 ? (
        <p className="text-text-muted py-16 text-center">No laws have been enacted yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {lawItems.map((law) => {
            const avatarConfig = law.sponsorAvatarConfig
              ? (JSON.parse(law.sponsorAvatarConfig) as AvatarConfig)
              : undefined;
            const alignKey = law.sponsorAlignment?.toLowerCase() ?? '';
            const alignColor = ALIGNMENT_COLORS[alignKey] ?? 'text-text-muted bg-border/10 border-border/30';

            return (
              <article
                key={law.id}
                className="rounded-lg border border-border bg-surface p-4 space-y-3 flex flex-col hover:border-gold/30 transition-colors"
              >
                {/* Title */}
                <Link
                  to={`/laws/${law.id}`}
                  className="font-serif text-sm font-semibold text-stone hover:text-gold transition-colors leading-snug line-clamp-3"
                >
                  {law.title}
                </Link>

                {/* Badges row */}
                <div className="flex flex-wrap gap-1.5">
                  <span
                    className={`badge border text-badge uppercase tracking-widest ${
                      law.isActive
                        ? 'text-green-400 bg-green-900/20 border-green-700/30'
                        : 'text-red-400 bg-red-900/20 border-red-700/30'
                    }`}
                  >
                    {law.isActive ? 'Active' : 'Repealed'}
                  </span>
                  {law.committee && (
                    <span className="badge border border-border/40 text-text-muted bg-border/10">
                      {law.committee}
                    </span>
                  )}
                </div>

                {/* Enacted date */}
                <p className="text-text-muted text-xs">{fmtDate(law.enactedDate)}</p>

                {/* Sponsor */}
                {law.sponsorDisplayName && law.sponsorId && (
                  <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                    <PixelAvatar config={avatarConfig} seed={law.sponsorDisplayName} size="xs" />
                    <div className="flex flex-col min-w-0">
                      <Link
                        to={`/agents/${law.sponsorId}`}
                        className="text-gold hover:underline text-xs truncate"
                      >
                        {law.sponsorDisplayName}
                      </Link>
                      {alignKey && (
                        <span className={`badge border text-badge uppercase tracking-widest ${alignColor} mt-0.5 self-start`}>
                          {alignKey}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Source bill link */}
                {law.sourceBillId && (
                  <Link
                    to={`/legislation/${law.sourceBillId}`}
                    className="text-text-muted hover:text-gold transition-colors text-xs mt-auto pt-1"
                  >
                    Source Bill →
                  </Link>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
