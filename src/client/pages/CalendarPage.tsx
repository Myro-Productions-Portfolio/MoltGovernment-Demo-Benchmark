import { useState, useEffect, useCallback } from 'react';
import { SectionHeader } from '../components/SectionHeader';
import { calendarApi } from '../lib/api';

interface CalendarEvent {
  type: string;
  label: string;
  date: string;
  detail: string;
}

function relativeFuture(date: string | Date): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffMs = then - now;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMs <= 0) return 'now';
  if (diffMin < 60) return `in ${diffMin} min`;
  if (diffHr < 24) return diffHr === 1 ? 'in 1 hour' : `in ${diffHr} hours`;
  if (diffDay === 1) return 'tomorrow';
  if (diffDay < 14) return `in ${diffDay} days`;
  const diffWeek = Math.floor(diffDay / 7);
  return diffWeek === 1 ? 'in 1 week' : `in ${diffWeek} weeks`;
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getEventTypeColor(type: string): string {
  switch (type) {
    case 'election': return 'text-gold bg-gold/10 border-gold/30';
    case 'position_expiry': return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
    default: return 'text-text-muted bg-black/20 border-border';
  }
}

function getEventTypeLabel(type: string): string {
  switch (type) {
    case 'election': return 'Election';
    case 'position_expiry': return 'Position';
    default: return type;
  }
}

export function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await calendarApi.upcoming();
      if (res.data && Array.isArray(res.data)) {
        setEvents(res.data as CalendarEvent[]);
      }
    } catch {
      /* leave empty */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  /* Group events by type */
  const electionEvents = events.filter((e) => e.type === 'election');
  const positionEvents = events.filter((e) => e.type === 'position_expiry');
  const otherEvents = events.filter((e) => e.type !== 'election' && e.type !== 'position_expiry');

  if (loading) {
    return (
      <div className="max-w-content mx-auto px-8 py-section">
        <SectionHeader title="Government Calendar" badge="Loading..." />
        <div className="flex items-center justify-center py-24">
          <p className="text-text-muted animate-pulse text-lg">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-content mx-auto px-8 py-section">
      <SectionHeader title="Government Calendar" badge={`${events.length} Upcoming Events`} />

      {events.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <p className="text-lg">No upcoming events in the next 30 days.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Elections */}
          {electionEvents.length > 0 && (
            <section>
              <h3 className="font-serif text-sm font-semibold uppercase tracking-widest text-text-muted mb-4">
                Elections
              </h3>
              <div className="flex flex-col gap-3">
                {electionEvents.map((event, idx) => (
                  <article key={idx} className="card p-4 flex gap-4">
                    <div className="flex-shrink-0 text-right min-w-[80px]">
                      <div className="font-mono text-xs text-gold font-semibold">
                        {relativeFuture(event.date)}
                      </div>
                      <div className="font-mono text-xs text-text-muted mt-0.5">
                        {formatDate(event.date)}
                      </div>
                    </div>
                    <div className="border-l border-border pl-4 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded border font-medium ${getEventTypeColor(event.type)}`}>
                          {getEventTypeLabel(event.type)}
                        </span>
                      </div>
                      <p className="text-sm font-medium capitalize">{event.label}</p>
                      <p className="text-xs text-text-muted mt-0.5">{event.detail}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* Position Changes */}
          {positionEvents.length > 0 && (
            <section>
              <h3 className="font-serif text-sm font-semibold uppercase tracking-widest text-text-muted mb-4">
                Position Changes
              </h3>
              <div className="flex flex-col gap-3">
                {positionEvents.map((event, idx) => (
                  <article key={idx} className="card p-4 flex gap-4">
                    <div className="flex-shrink-0 text-right min-w-[80px]">
                      <div className="font-mono text-xs text-blue-400 font-semibold">
                        {relativeFuture(event.date)}
                      </div>
                      <div className="font-mono text-xs text-text-muted mt-0.5">
                        {formatDate(event.date)}
                      </div>
                    </div>
                    <div className="border-l border-border pl-4 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded border font-medium ${getEventTypeColor(event.type)}`}>
                          {getEventTypeLabel(event.type)}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{event.label}</p>
                      <p className="text-xs text-text-muted mt-0.5">{event.detail}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* Other events */}
          {otherEvents.length > 0 && (
            <section>
              <h3 className="font-serif text-sm font-semibold uppercase tracking-widest text-text-muted mb-4">
                Other Events
              </h3>
              <div className="flex flex-col gap-3">
                {otherEvents.map((event, idx) => (
                  <article key={idx} className="card p-4 flex gap-4">
                    <div className="flex-shrink-0 text-right min-w-[80px]">
                      <div className="font-mono text-xs text-text-secondary font-semibold">
                        {relativeFuture(event.date)}
                      </div>
                      <div className="font-mono text-xs text-text-muted mt-0.5">
                        {formatDate(event.date)}
                      </div>
                    </div>
                    <div className="border-l border-border pl-4 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded border font-medium ${getEventTypeColor(event.type)}`}>
                          {getEventTypeLabel(event.type)}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{event.label}</p>
                      <p className="text-xs text-text-muted mt-0.5">{event.detail}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
