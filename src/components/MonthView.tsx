import { useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  parseISO,
} from 'date-fns';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../store/useStore';

const DAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

export function MonthView() {
  const { currentDate, events, categories, activeCategories, openModal, setCurrentDate, setView } =
    useStore(useShallow((s) => ({
      currentDate: s.currentDate,
      events: s.events,
      categories: s.categories,
      activeCategories: s.activeCategories,
      openModal: s.openModal,
      setCurrentDate: s.setCurrentDate,
      setView: s.setView,
    })));
  const date = useMemo(() => parseISO(currentDate), [currentDate]);

  const weeks = useMemo(() => {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calStart, end: calEnd });
    const result: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  }, [date]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, typeof events>();
    for (const e of events) {
      if (e.categoryId && !activeCategories.includes(e.categoryId)) continue;
      const list = map.get(e.date);
      if (list) list.push(e);
      else map.set(e.date, [e]);
    }
    for (const [, dayEvents] of map) {
      dayEvents.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [events, activeCategories]);

  const categoryMap = useMemo(() => {
    const map = new Map<string, (typeof categories)[number]>();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden rounded-2xl">
      {/* Day headers — sticky */}
      <div className="grid grid-cols-7 border-b border-white/30 flex-shrink-0 sticky top-0 z-10">
        {DAY_LABELS.map((label, i) => (
          <div
            key={label}
            className={`text-center py-2.5 text-[11px] font-semibold uppercase tracking-wide ${
              i >= 5 ? 'text-emerald-500/70' : 'text-gray-400'
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Month grid — scrollable, rows auto-height */}
      <div className="flex-1 overflow-y-auto">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-white/20">
            {week.map((day, di) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const dayEvents = eventsByDay.get(dayStr) ?? [];
              const inMonth = isSameMonth(day, date);
              const today = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  className={`
                    border-r border-white/20 p-1.5 cursor-pointer
                    hover:bg-white/30 transition-all
                    ${di === 6 ? 'border-r-0' : ''}
                    ${!inMonth ? 'bg-black/[0.02]' : ''}
                  `}
                  style={{ minHeight: 88 }}
                  onClick={() => {
                    setCurrentDate(day);
                    setView('day');
                  }}
                >
                  {/* Date number */}
                  <div className="flex justify-start mb-1">
                    <span
                      className={`w-6 h-6 flex items-center justify-center text-xs rounded-full font-semibold ${
                        today
                          ? 'bg-emerald-500/90 text-white shadow-sm shadow-emerald-500/20'
                          : inMonth
                          ? di >= 5
                            ? 'text-emerald-500/70'
                            : 'text-gray-700'
                          : 'text-gray-300'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                  </div>

                  {/* All events — no truncation */}
                  <div className="space-y-0.5">
                    {dayEvents.map((event) => {
                      const cat = event.categoryId ? categoryMap.get(event.categoryId) ?? null : null;
                      const color = cat?.color ?? '#6b7280';
                      return (
                        <div
                          key={event.id}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] cursor-pointer hover:opacity-80 transition-opacity"
                          style={{
                            backgroundColor: `${color}22`,
                            color,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            openModal({ event });
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="font-medium truncate flex-1 min-w-0">
                            {event.title}
                          </span>
                          <span className="text-[9px] opacity-60 flex-shrink-0 ml-0.5">
                            {event.startTime}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
