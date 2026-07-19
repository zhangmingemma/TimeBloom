import { CalendarEvent, UserCategory, UserBusinessLine, HOUR_START } from '../types';

export const HOUR_HEIGHT = 64; // pixels per hour

export function timeToOffset(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h - HOUR_START) * 60 + m; // minutes since 08:00
}

interface EventBlockProps {
  event: CalendarEvent;
  category: UserCategory | null;
  businessLine: UserBusinessLine | null;
  onClick: () => void;
  /** Column left position as fraction 0–1 (default 0) */
  colLeft?: number;
  /** Column width as fraction 0–1 (default 1) */
  colWidth?: number;
}

const FALLBACK_COLOR = '#78838e';
const PADDING_PX = 2;

export function EventBlock({ event, category, businessLine, onClick, colLeft = 0, colWidth = 1 }: EventBlockProps) {
  const color = category?.color ?? FALLBACK_COLOR;
  const emoji = category?.emoji ?? '📌';

  const startOffset = timeToOffset(event.startTime);
  const endOffset = timeToOffset(event.endTime);
  const duration = Math.max(endOffset - startOffset, 15);
  const heightPx = Math.max((duration / 60) * HOUR_HEIGHT - 2, 18);

  const isNarrow  = colWidth < 0.4;
  const inlineTag = duration <= 30; // ≤30min: always tag inline (no vertical room for block)
  const showTime  = duration >= 30 && heightPx >= 42 && !isNarrow;

  const blTag = (size: 'inline' | 'block') => businessLine ? (
    <span
      className="inline-flex items-center gap-0.5 px-1 py-px rounded text-[9px] font-semibold flex-shrink-0"
      style={{ backgroundColor: businessLine.color, color: '#1a1a1a' }}
    >
      <span className="text-[9px] leading-none">{businessLine.emoji}</span>
      <span className={`truncate ${size === 'inline' ? 'max-w-[56px]' : 'max-w-[72px]'}`}>
        {businessLine.name}
      </span>
    </span>
  ) : null;

  return (
    <div
      className="absolute rounded-lg overflow-hidden cursor-pointer z-10 transition-all event-block-hover"
      style={{
        top: `${(startOffset / 60) * HOUR_HEIGHT}px`,
        height: `${heightPx}px`,
        left: `calc(${colLeft * 100}% + ${PADDING_PX}px)`,
        width: `calc(${colWidth * 100}% - ${PADDING_PX * 2}px)`,
        backgroundColor: `${color}20`,
        borderLeft: `3px solid ${color}`,
        boxShadow: `0 2px 8px -2px ${color}15`,
      }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      data-event="true"
    >
      <div className="px-1.5 py-0.5 h-full flex flex-col justify-start overflow-hidden">
        {/* Title row */}
        <div className="flex items-center min-w-0 gap-1">
          <span className="text-[11px] leading-none flex-shrink-0">{emoji}</span>
          <span className="text-[11px] font-semibold truncate leading-snug min-w-0" style={{ color }}>
            {event.title}
          </span>
          {inlineTag && businessLine && (
            <span className="flex-shrink-0 ml-4">{blTag('inline')}</span>
          )}
        </div>

        {/* Time — tall events only */}
        {showTime && (
          <p className="text-[10px] truncate mt-0.5 leading-none" style={{ color, opacity: 0.55 }}>
            {event.startTime} – {event.endTime}
          </p>
        )}

        {/* Business line tag — always shown when available */}
        {!inlineTag && businessLine && (
          <div className="mt-0.5 min-w-0">
            {blTag('block')}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Layout algorithm ────────────────────────────────────────────────────────

export interface EventLayout {
  event: CalendarEvent;
  colLeft: number;
  colWidth: number;
}

export function layoutEvents(events: CalendarEvent[]): EventLayout[] {
  if (events.length === 0) return [];

  const sorted = [...events].sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Group into clusters (overlapping or transitively overlapping)
  const clusters: CalendarEvent[][] = [];
  const clusterEnds: string[] = [];

  for (const event of sorted) {
    let placed = false;
    for (let ci = 0; ci < clusters.length; ci++) {
      if (event.startTime < clusterEnds[ci]) {
        clusters[ci].push(event);
        if (event.endTime > clusterEnds[ci]) clusterEnds[ci] = event.endTime;
        placed = true;
        break;
      }
    }
    if (!placed) {
      clusters.push([event]);
      clusterEnds.push(event.endTime);
    }
  }

  const result: EventLayout[] = [];

  for (const cluster of clusters) {
    // Greedy column assignment
    const colEnds: string[] = [];
    const assignments: number[] = [];

    for (const event of cluster) {
      let col = colEnds.findIndex((et) => event.startTime >= et);
      if (col === -1) { col = colEnds.length; colEnds.push(''); }
      colEnds[col] = event.endTime;
      assignments.push(col);
    }

    const totalCols = colEnds.length;
    cluster.forEach((event, i) => {
      result.push({
        event,
        colLeft: assignments[i] / totalCols,
        colWidth: 1 / totalCols,
      });
    });
  }

  return result;
}
