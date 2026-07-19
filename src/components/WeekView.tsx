import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isToday,
  parseISO,
} from 'date-fns';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../store/useStore';
import { EventBlock, HOUR_HEIGHT, timeToOffset, layoutEvents } from './EventBlock';
import { HOUR_START, HOUR_END, TOTAL_HOURS } from '../types';

const HOURS = Array.from({ length: TOTAL_HOURS }, (_, i) => i + HOUR_START);
const DAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const DRAG_THRESHOLD_PX = 8; // min pixels to count as a drag

function getCurrentOffset() {
  const now = new Date();
  return (now.getHours() * 60 + now.getMinutes() - HOUR_START * 60) / 60;
}

/** Round y-pixels to a time string (15-min intervals) */
function yToTime(y: number): string {
  const clampedY = Math.max(0, Math.min(y, TOTAL_HOURS * HOUR_HEIGHT));
  const raw = Math.round((clampedY / HOUR_HEIGHT) * 4) * 15; // 15-min slots
  const totalMin = HOUR_START * 60 + raw;
  const clamped = Math.max(HOUR_START * 60, Math.min(totalMin, (HOUR_START + TOTAL_HOURS) * 60 - 1));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

interface DragState {
  dayStr: string;
  colIndex: number;
  startY: number;
  endY: number;
}

export function WeekView() {
  const { currentDate, events, todos, categories, businessLines, statuses, activeCategories, openModal, openTodoDrawer } = useStore(
    useShallow((s) => ({
      currentDate: s.currentDate,
      events: s.events,
      todos: s.todos,
      categories: s.categories,
      businessLines: s.businessLines,
      statuses: s.statuses,
      activeCategories: s.activeCategories,
      openModal: s.openModal,
      openTodoDrawer: s.openTodoDrawer,
    }))
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [currentOffset, setCurrentOffset] = useState(getCurrentOffset);

  const date = parseISO(currentDate);
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => {
    if (scrollRef.current) {
      const off = Math.max(getCurrentOffset(), 0);
      scrollRef.current.scrollTop = Math.max(off * HOUR_HEIGHT - 80, 0);
    }
  }, []);

  useEffect(() => {
    const t = setInterval(() => setCurrentOffset(getCurrentOffset()), 60_000);
    return () => clearInterval(t);
  }, []);

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const handleMouseDown = (day: Date, colIndex: number, e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-event]') || (e.target as HTMLElement).closest('[data-todo]')) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    setDrag({ dayStr: format(day, 'yyyy-MM-dd'), colIndex, startY: y, endY: y });
  };

  useEffect(() => {
    if (!drag) return;

    const onMove = (e: MouseEvent) => {
      const colEl = columnRefs.current[drag.colIndex];
      if (!colEl) return;
      const rect = colEl.getBoundingClientRect();
      const y = Math.max(0, Math.min(e.clientY - rect.top, TOTAL_HOURS * HOUR_HEIGHT));
      setDrag((d) => d ? { ...d, endY: y } : null);
    };

    const onUp = (e: MouseEvent) => {
      if (!drag) return;
      const colEl = columnRefs.current[drag.colIndex];
      const endY = colEl
        ? Math.max(0, Math.min(e.clientY - colEl.getBoundingClientRect().top, TOTAL_HOURS * HOUR_HEIGHT))
        : drag.endY;

      const topY = Math.min(drag.startY, endY);
      const botY = Math.max(drag.startY, endY);
      const isDrag = botY - topY >= DRAG_THRESHOLD_PX;

      const startTime = yToTime(topY);
      const endTime = isDrag ? yToTime(botY) : yToTime(topY + HOUR_HEIGHT);
      const finalEnd = endTime > startTime ? endTime : yToTime(topY + HOUR_HEIGHT);

      openModal({ date: drag.dayStr, startTime, endTime: finalEnd });
      setDrag(null);
    };

    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrag(null); };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('keydown', onKey);
    };
  }, [drag, openModal]);

  // ── Events per day ─────────────────────────────────────────────────────────
  const getLayoutForDay = useCallback(
    (day: Date) => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayEvents = events.filter((e) => {
        if (e.date !== dayStr) return false;
        if (e.categoryId && !activeCategories.includes(e.categoryId)) return false;
        return e.startTime >= '08:00';
      });
      return layoutEvents(dayEvents);
    },
    [events, activeCategories]
  );

  const getTodosForDay = useCallback(
    (day: Date) => {
      const dayStr = format(day, 'yyyy-MM-dd');
      return todos.filter((t) => t.showInCalendar && t.deadline && t.deadline.startsWith(dayStr));
    },
    [todos]
  );

  const findCategory = (id: string | null) =>
    id ? categories.find((c) => c.id === id) ?? null : null;

  const findBusinessLine = (id: string | null) =>
    id ? businessLines.find((b) => b.id === id) ?? null : null;

  const currentTimeTop = currentOffset * HOUR_HEIGHT;
  const showCurrentLine = currentOffset >= 0 && currentOffset < TOTAL_HOURS;

  // Drag visual values
  const dragTopY = drag ? Math.min(drag.startY, drag.endY) : 0;
  const dragH = drag ? Math.abs(drag.endY - drag.startY) : 0;

  return (
    <div className="flex flex-col flex-1 overflow-hidden rounded-2xl" style={{ userSelect: drag ? 'none' : undefined }}>
      {/* Day headers */}
      <div className="flex border-b border-white/30 flex-shrink-0 z-10">
        <div className="w-14 flex-shrink-0" />
        {days.map((day, i) => (
          <div
            key={day.toISOString()}
            className={`flex-1 flex flex-col items-center py-2.5 border-l border-white/20 ${
              isToday(day) ? 'text-emerald-600' : 'text-gray-500'
            }`}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wide">{DAY_LABELS[i]}</span>
            <div className="mt-1 relative flex items-center justify-center">
              <span className={`text-base font-bold tabular-nums ${isToday(day) ? 'text-emerald-600' : 'text-gray-800'}`}>
                {format(day, 'd')}
              </span>
              {isToday(day) && (
                <div className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-emerald-500" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="flex" style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}>

          {/* Time labels */}
          <div className="w-14 flex-shrink-0 relative select-none">
            {HOURS.map((hour) => (
              <div key={hour} className="absolute right-0 w-full pr-2 text-right"
                style={{ top: `${(hour - HOUR_START) * HOUR_HEIGHT - 8}px` }}>
                <span className="text-[10px] text-gray-400">{hour.toString().padStart(2, '0')}:00</span>
              </div>
            ))}
            <div className="absolute right-0 w-full pr-2 text-right"
              style={{ top: `${TOTAL_HOURS * HOUR_HEIGHT - 8}px` }}>
              <span className="text-[10px] text-gray-400">24:00</span>
            </div>
          </div>

          {/* Day columns */}
          {days.map((day, dayIdx) => {
            const layouts = getLayoutForDay(day);
            const dayTodos = getTodosForDay(day);
            const isDragCol = drag?.colIndex === dayIdx;

            return (
              <div
                key={day.toISOString()}
                ref={(el) => { columnRefs.current[dayIdx] = el; }}
                className={`flex-1 relative border-l border-white/20 ${drag ? 'cursor-crosshair' : 'cursor-pointer'}`}
                onMouseDown={(e) => handleMouseDown(day, dayIdx, e)}
              >
                {/* Hour lines */}
                {HOURS.map((hour) => (
                  <div key={hour} className="absolute left-0 right-0 border-t border-gray-300/20"
                    style={{ top: `${(hour - HOUR_START) * HOUR_HEIGHT}px` }} />
                ))}
                {HOURS.map((hour) => (
                  <div key={`hh-${hour}`} className="absolute left-0 right-0 border-t border-gray-300/10"
                    style={{ top: `${(hour - HOUR_START) * HOUR_HEIGHT + HOUR_HEIGHT / 2}px` }} />
                ))}

                {/* Current time indicator */}
                {isToday(day) && showCurrentLine && (
                  <div className="absolute left-0 right-0 z-20 pointer-events-none"
                    style={{ top: `${currentTimeTop}px` }}>
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 shadow-[0_0_4px_rgba(239,68,68,0.5)]"
                        style={{ marginLeft: '-4px' }} />
                      <div className="flex-1 h-[1px] bg-gradient-to-r from-red-500/80 to-transparent" />
                    </div>
                  </div>
                )}

                {/* Drag selection overlay */}
                {isDragCol && dragH >= DRAG_THRESHOLD_PX && (
                  <div
                    className="absolute left-1 right-1 rounded-lg z-30 pointer-events-none flex flex-col justify-start px-2 py-1"
                    style={{
                      top: `${dragTopY}px`,
                      height: `${dragH}px`,
                      backgroundColor: 'rgba(16,185,129,0.15)',
                      border: '2px solid #10b981',
                    }}
                  >
                    <p className="text-[10px] font-bold text-emerald-700 leading-tight">
                      {yToTime(drag.startY < drag.endY ? drag.startY : drag.endY)}
                    </p>
                    <p className="text-[10px] text-emerald-600 leading-tight">
                      → {yToTime(drag.startY < drag.endY ? drag.endY : drag.startY)}
                    </p>
                  </div>
                )}

                {/* Events with column layout */}
                {layouts.map(({ event, colLeft, colWidth }) => (
                  <EventBlock
                    key={event.id}
                    event={event}
                    category={findCategory(event.categoryId)}
                    businessLine={findBusinessLine(event.businessLineId ?? null)}
                    colLeft={colLeft}
                    colWidth={colWidth}
                    onClick={() => openModal({ event })}
                  />
                ))}

                {/* TODO deadline markers */}
                {(() => {
                  const grouped = new Map<number, typeof dayTodos>();
                  dayTodos.forEach((todo) => {
                    const hasTime = todo.deadline!.includes('T');
                    const timeStr = hasTime ? todo.deadline!.split('T')[1] : '20:00';
                    const [h, m] = timeStr.split(':').map(Number);
                    const topMin = (h - HOUR_START) * 60 + m;
                    const top = Math.max(Math.round((topMin / 60) * HOUR_HEIGHT), 0);
                    if (!grouped.has(top)) grouped.set(top, []);
                    grouped.get(top)!.push(todo);
                  });
                  return Array.from(grouped.entries()).flatMap(([top, todos]) => {
                    const count = todos.length;
                    return todos.map((todo, i) => (
                      <div
                        key={`todo-${todo.id}`}
                        data-todo
                        className={`absolute z-10 cursor-pointer ${todo.completed ? 'opacity-40' : ''}`}
                        style={{
                          top: `${top}px`,
                          height: '18px',
                          left: `calc(${(i / count) * 100}% + 1px)`,
                          width: `calc(${(1 / count) * 100}% - 2px)`,
                        }}
                        onClick={(e) => { e.stopPropagation(); openTodoDrawer(todo.id); }}
                      >
                        <div className="flex items-center gap-0.5 h-full px-1 rounded border border-dashed border-orange-300/60 bg-orange-50/60 overflow-hidden">
                          <span className="text-[9px] flex-shrink-0">🚩</span>
                          <span className={`text-[9px] font-medium text-orange-700/80 truncate ${todo.completed ? 'line-through' : ''}`}>
                            {todo.title}
                          </span>
                          {todo.statusId && (() => {
                            const status = statuses.find((s) => s.id === todo.statusId);
                            return status ? (
                              <span className="ml-[16px] flex-shrink-0 text-[9px] px-1 py-0.5 rounded" style={{ backgroundColor: `${status.color}20`, color: status.color }}>
                                {status.emoji} {status.name}
                              </span>
                            ) : null;
                          })()}
                        </div>
                      </div>
                    ));
                  });
                })()}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
