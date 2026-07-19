import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  isThisWeek,
  isThisMonth,
  getISOWeek,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../store/useStore';
import { CalendarEvent } from '../types';

// ── helpers ───────────────────────────────────────────────────────────────────

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ── stats calc ────────────────────────────────────────────────────────────────

interface StatsResult {
  byCategoryId: Map<string | null, number>;
  byBusinessLineId: Map<string | null, number>;
  totalMinutes: number;
  effectiveMinutes: Map<string, number>;
  rangeEvents: CalendarEvent[];
}

function calcStats(events: CalendarEvent[], startDate: Date, endDate: Date): StatsResult {
  const startStr = format(startDate, 'yyyy-MM-dd');
  const endStr = format(endDate, 'yyyy-MM-dd');
  const rangeEvents = events.filter((e) => e.date >= startStr && e.date <= endStr);

  const byDate = new Map<string, CalendarEvent[]>();
  for (const ev of rangeEvents) {
    if (!byDate.has(ev.date)) byDate.set(ev.date, []);
    byDate.get(ev.date)!.push(ev);
  }

  const effectiveMinutes = new Map<string, number>();
  for (const dayEvents of byDate.values()) {
    const sorted = [...dayEvents].sort(
      (a, b) =>
        timeToMinutes(a.endTime) - timeToMinutes(a.startTime) -
        (timeToMinutes(b.endTime) - timeToMinutes(b.startTime))
    );
    const slotOwner = new Map<number, string>();
    for (const ev of sorted) {
      const s = timeToMinutes(ev.startTime);
      const e = timeToMinutes(ev.endTime);
      for (let m = s; m < e; m++) if (!slotOwner.has(m)) slotOwner.set(m, ev.id);
    }
    for (const [, id] of slotOwner)
      effectiveMinutes.set(id, (effectiveMinutes.get(id) ?? 0) + 1);
  }

  const byCategoryId = new Map<string | null, number>();
  const byBusinessLineId = new Map<string | null, number>();
  for (const ev of rangeEvents) {
    const mins = effectiveMinutes.get(ev.id) ?? 0;
    if (!mins) continue;
    byCategoryId.set(ev.categoryId ?? null, (byCategoryId.get(ev.categoryId ?? null) ?? 0) + mins);
    byBusinessLineId.set(ev.businessLineId ?? null, (byBusinessLineId.get(ev.businessLineId ?? null) ?? 0) + mins);
  }

  return {
    byCategoryId,
    byBusinessLineId,
    totalMinutes: Array.from(byCategoryId.values()).reduce((a, b) => a + b, 0),
    effectiveMinutes,
    rangeEvents,
  };
}

// ── donut chart (path-based, hoverable) ───────────────────────────────────────

interface DonutSeg {
  key: string | null;
  color: string;
  minutes: number;
}

function polarToCart(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function annularSector(cx: number, cy: number, r1: number, r2: number, a1: number, a2: number) {
  const sweep = a2 - a1;
  if (sweep >= 359.99) {
    // full ring — two arcs
    const mid = a1 + 180;
    const p1 = polarToCart(cx, cy, r2, a1);
    const p2 = polarToCart(cx, cy, r2, mid);
    const p3 = polarToCart(cx, cy, r1, mid);
    const p4 = polarToCart(cx, cy, r1, a1);
    return (
      `M${p1.x},${p1.y} A${r2},${r2},0,1,1,${p2.x},${p2.y} A${r2},${r2},0,1,1,${p1.x},${p1.y} Z ` +
      `M${p4.x},${p4.y} A${r1},${r1},0,1,0,${p3.x},${p3.y} A${r1},${r1},0,1,0,${p4.x},${p4.y} Z`
    );
  }
  const large = sweep > 180 ? 1 : 0;
  const p1 = polarToCart(cx, cy, r2, a1);
  const p2 = polarToCart(cx, cy, r2, a2);
  const p3 = polarToCart(cx, cy, r1, a2);
  const p4 = polarToCart(cx, cy, r1, a1);
  return `M${p1.x},${p1.y} A${r2},${r2},0,${large},1,${p2.x},${p2.y} L${p3.x},${p3.y} A${r1},${r1},0,${large},0,${p4.x},${p4.y} Z`;
}

interface DonutChartProps {
  segs: DonutSeg[];
  total: number;
  hoveredKey: string | null | undefined;
  onSegmentEnter: (key: string | null) => void;
  onMouseLeave: () => void;
}

function DonutChart({ segs, total, hoveredKey, onSegmentEnter, onMouseLeave }: DonutChartProps) {
  const CX = 50, CY = 50, R1 = 26, R2 = 44;
  const GAP_DEG = 2;

  let cumDeg = 0;
  const arcs = segs
    .filter((s) => s.minutes > 0)
    .map((seg) => {
      const deg = (seg.minutes / total) * 360;
      const a1 = cumDeg + GAP_DEG / 2;
      const a2 = cumDeg + deg - GAP_DEG / 2;
      cumDeg += deg;
      return { ...seg, a1, a2, deg };
    })
    .filter((s) => s.a2 > s.a1);

  const h = Math.floor(total / 60);
  const m = total % 60;
  const isHovering = hoveredKey !== undefined;

  return (
    <div className="relative flex-shrink-0" style={{ width: 100, height: 100 }}>
      <svg
        width={100} height={100} viewBox="0 0 100 100"
        onMouseLeave={onMouseLeave}
      >
        {/* track */}
        <circle cx={CX} cy={CY} r={(R1 + R2) / 2} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={R2 - R1} />
        {arcs.map((arc, i) => {
          const isThis = hoveredKey === arc.key;
          const dimmed = isHovering && !isThis;
          return (
            <path
              key={i}
              d={annularSector(CX, CY, R1, R2, arc.a1, arc.a2)}
              fill={arc.color}
              opacity={dimmed ? 0.25 : 1}
              style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
              onMouseEnter={() => onSegmentEnter(arc.key)}
            />
          );
        })}
      </svg>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center leading-none pointer-events-none"
      >
        <span className="text-[13px] font-bold text-gray-800 tabular-nums">{h}h</span>
        {m > 0 && <span className="text-[10px] text-gray-400 tabular-nums mt-0.5">{m}m</span>}
      </div>
    </div>
  );
}

// ── event popup ───────────────────────────────────────────────────────────────

interface PopoverState {
  key: string | null;
  label: string;
  color: string;
  events: CalendarEvent[];
  effectiveMinutes: Map<string, number>;
}

function EventPopover({
  state,
  onMouseEnter,
  onMouseLeave,
}: {
  state: PopoverState;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const sorted = [...state.events].sort((a, b) =>
    a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)
  );

  const grouped = new Map<string, CalendarEvent[]>();
  for (const ev of sorted) {
    if (!grouped.has(ev.date)) grouped.set(ev.date, []);
    grouped.get(ev.date)!.push(ev);
  }

  return (
    <div
      className="absolute z-50 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden"
      style={{ left: 116, top: 0 }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-gray-100 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: state.color }} />
        <span className="text-xs font-semibold text-gray-700 flex-1 truncate">{state.label}</span>
        <span className="text-[10px] text-gray-400 tabular-nums">
          {formatDuration(sorted.reduce((a, ev) => a + (state.effectiveMinutes.get(ev.id) ?? 0), 0))}
        </span>
      </div>

      {/* Event list */}
      <div className="max-h-64 overflow-y-auto py-1">
        {[...grouped.entries()].map(([date, evs]) => (
          <div key={date}>
            <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 bg-white/30 sticky top-0">
              {format(new Date(date + 'T00:00:00'), 'M月d日 EEE', { locale: zhCN })}
            </div>
            {evs.map((ev) => {
              const mins = state.effectiveMinutes.get(ev.id) ?? 0;
              return (
                <div key={ev.id} className="flex items-start gap-2 px-3 py-1.5 hover:bg-white/30">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-gray-700 truncate">{ev.title}</p>
                    <p className="text-[10px] text-gray-400 tabular-nums">
                      {ev.startTime} – {ev.endTime}
                    </p>
                  </div>
                  {mins > 0 && (
                    <span className="text-[10px] text-gray-400 tabular-nums flex-shrink-0 pt-0.5">
                      {formatDuration(mins)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        {sorted.length === 0 && (
          <p className="px-3 py-4 text-xs text-gray-300 text-center">无事件</p>
        )}
      </div>
    </div>
  );
}

// ── bar row ───────────────────────────────────────────────────────────────────

interface BarRowProps {
  label: string;
  emoji: string;
  color: string;
  minutes: number;
  total: number;
  hovered: boolean;
  dimmed: boolean;
  onMouseEnter: (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
}

function BarRow({ label, emoji, color, minutes, total, hovered, dimmed, onMouseEnter, onMouseLeave }: BarRowProps) {
  const pct = total > 0 ? Math.round((minutes / total) * 100) : 0;
  const barPct = total > 0 ? (minutes / total) * 100 : 0;

  return (
    <div
      className="space-y-1 rounded-lg px-2 py-1.5 -mx-2 cursor-default transition-all"
      style={{
        opacity: dimmed ? 0.3 : 1,
        backgroundColor: hovered ? `${color}12` : 'transparent',
        transition: 'opacity 0.15s, background-color 0.15s',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <span className="text-[11px] leading-none flex-shrink-0">{emoji}</span>
        <span className="text-xs text-gray-600 flex-1 truncate">{label}</span>
        <span className="text-[11px] text-gray-500 tabular-nums font-medium">{formatDuration(minutes)}</span>
        <span className="text-[11px] text-gray-300 tabular-nums w-7 text-right">{pct}%</span>
      </div>
      <div className="h-1.5 bg-white/30 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${barPct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ── section ───────────────────────────────────────────────────────────────────

interface RowData {
  key: string | null;
  label: string;
  emoji: string;
  color: string;
  minutes: number;
}

interface SectionProps {
  title: string;
  total: number;
  rows: RowData[];
  emptyText: string;
  rangeEvents: CalendarEvent[];
  effectiveMinutes: Map<string, number>;
  filterField: 'categoryId' | 'businessLineId';
}

function Section({ title, total, rows, emptyText, rangeEvents, effectiveMinutes, filterField }: SectionProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null | undefined>(undefined);
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const closeTimer = useRef<number | null>(null);

  // Clear timer on unmount
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  const cancelClose = useCallback(() => {
    if (closeTimer.current !== null) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => {
      setHoveredKey(undefined);
      setPopover(null);
    }, 200);
  }, [cancelClose]);

  const openRow = useCallback((key: string | null, row: RowData) => {
    cancelClose();
    setHoveredKey(key);
    const evs = rangeEvents
      .filter((ev) => {
        const val = filterField === 'categoryId' ? ev.categoryId : (ev.businessLineId ?? null);
        return (val ?? null) === key;
      })
      .filter((ev) => (effectiveMinutes.get(ev.id) ?? 0) > 0);
    setPopover({ key, label: row.label, color: row.color, events: evs, effectiveMinutes });
  }, [rangeEvents, effectiveMinutes, filterField, cancelClose]);

  const isHovering = hoveredKey !== undefined;

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">{title}</span>
        <span className="text-xs text-gray-400 tabular-nums">{formatDuration(total)}</span>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-gray-300 pl-1">{emptyText}</p>
      ) : (
        <div className="flex items-start gap-6">
          {/* Donut */}
          <DonutChart
            segs={rows}
            total={total}
            hoveredKey={hoveredKey}
            onSegmentEnter={(key) => {
              const row = rows.find((r) => r.key === key);
              if (row) openRow(key, row);
            }}
            onMouseLeave={scheduleClose}
          />
          {/* Bar list */}
          <div className="flex-1 min-w-0">
            {rows.map((r) => (
              <BarRow
                key={r.key ?? '__none__'}
                label={r.label}
                emoji={r.emoji}
                color={r.color}
                minutes={r.minutes}
                total={total}
                hovered={hoveredKey === r.key}
                dimmed={isHovering && hoveredKey !== r.key}
                onMouseEnter={() => openRow(r.key, r)}
                onMouseLeave={scheduleClose}
              />
            ))}
          </div>
        </div>
      )}

      {/* Popover: absolutely positioned, right of the donut */}
      {popover && (
        <EventPopover
          state={popover}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        />
      )}
    </div>
  );
}

// ── main ──────────────────────────────────────────────────────────────────────

export function StatsView() {
  const { events, categories, businessLines } = useStore(
    useShallow((s) => ({ events: s.events, categories: s.categories, businessLines: s.businessLines }))
  );
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [refDate, setRefDate] = useState(new Date());

  const { startDate, endDate, periodLabel } = useMemo(() => {
    if (period === 'week') {
      const s = startOfWeek(refDate, { weekStartsOn: 1 });
      const e = endOfWeek(refDate, { weekStartsOn: 1 });
      return {
        startDate: s, endDate: e,
        periodLabel: `${format(s, 'M月d日')} – ${format(e, 'M月d日')}  第 ${getISOWeek(s)} 周`,
      };
    }
    const s = startOfMonth(refDate), e = endOfMonth(refDate);
    return { startDate: s, endDate: e, periodLabel: format(refDate, 'yyyy年M月', { locale: zhCN }) };
  }, [period, refDate]);

  const isCurrentPeriod = useMemo(
    () => period === 'week' ? isThisWeek(refDate, { weekStartsOn: 1 }) : isThisMonth(refDate),
    [period, refDate]
  );

  const goBack = () => setRefDate((d) => period === 'week' ? subWeeks(d, 1) : subMonths(d, 1));
  const goForward = () => setRefDate((d) => period === 'week' ? addWeeks(d, 1) : addMonths(d, 1));

  const stats = useMemo(() => calcStats(events, startDate, endDate), [events, startDate, endDate]);

  const categoryRows = useMemo((): RowData[] => {
    const rows: RowData[] = [];
    for (const [key, mins] of stats.byCategoryId) {
      if (key === null) rows.push({ key: null, label: '无分类', emoji: '📌', color: '#9ca3af', minutes: mins });
      else {
        const cat = categories.find((c) => c.id === key);
        if (cat) rows.push({ key, label: cat.name, emoji: cat.emoji, color: cat.color, minutes: mins });
      }
    }
    return rows.sort((a, b) => b.minutes - a.minutes);
  }, [stats.byCategoryId, categories]);

  const blRows = useMemo((): RowData[] => {
    const rows: RowData[] = [];
    for (const [key, mins] of stats.byBusinessLineId) {
      if (key !== null) {
        const bl = businessLines.find((b) => b.id === key);
        if (bl) rows.push({ key, label: bl.name, emoji: bl.emoji, color: bl.color, minutes: mins });
      }
    }
    return rows.sort((a, b) => b.minutes - a.minutes);
  }, [stats.byBusinessLineId, businessLines]);

  const blTotal = useMemo(() => blRows.reduce((a, r) => a + r.minutes, 0), [blRows]);
  const hasData = stats.totalMinutes > 0;

  return (
    <div className="flex flex-col flex-1 overflow-hidden rounded-2xl">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-5 py-2.5 border-b border-white/30 flex-shrink-0">
        <div className="flex rounded-lg bg-white/30 p-0.5">
          {(['week', 'month'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                period === p ? 'bg-emerald-500/90 text-white shadow-sm shadow-emerald-500/20' : 'text-gray-500 hover:text-gray-700 hover:bg-white/40'
              }`}
            >
              {p === 'week' ? '按周' : '按月'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-0.5">
          <button onClick={goBack} className="p-1.5 rounded-lg hover:bg-white/50 text-gray-400">
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => setRefDate(new Date())}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              isCurrentPeriod ? 'bg-emerald-500/15 text-emerald-600' : 'text-gray-500 hover:bg-white/50'
            }`}
          >
            今
          </button>
          <button onClick={goForward} className="p-1.5 rounded-lg hover:bg-white/50 text-gray-400">
            <ChevronRight size={14} />
          </button>
        </div>

        <span className="text-xs text-gray-500 flex-1">{periodLabel}</span>

        {hasData && (
          <span className="text-xs text-gray-400 tabular-nums">
            合计 <span className="font-semibold text-gray-600">{formatDuration(stats.totalMinutes)}</span>
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!hasData ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-sm text-gray-400">该时段暂无数据</p>
            <p className="text-xs text-gray-300 mt-1">新建事件后可在此查看统计</p>
          </div>
        ) : (
          <div className="px-8 py-7 space-y-10">
            <Section
              title="分类"
              total={stats.totalMinutes}
              rows={categoryRows}
              emptyText="无数据"
              rangeEvents={stats.rangeEvents}
              effectiveMinutes={stats.effectiveMinutes}
              filterField="categoryId"
            />
            <div className="border-t border-white/30" />
            <Section
              title="业务线"
              total={blTotal}
              rows={blRows}
              emptyText={businessLines.length === 0 ? '尚未创建业务线' : '该时段无业务线数据'}
              rangeEvents={stats.rangeEvents}
              effectiveMinutes={stats.effectiveMinutes}
              filterField="businessLineId"
            />
          </div>
        )}
      </div>
    </div>
  );
}
