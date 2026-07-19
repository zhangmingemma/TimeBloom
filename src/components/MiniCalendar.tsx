import { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
  isToday,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../store/useStore';

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

export function MiniCalendar() {
  const { currentDate, setCurrentDate, setView, events } = useStore(
    useShallow((s) => ({
      currentDate: s.currentDate,
      setCurrentDate: s.setCurrentDate,
      setView: s.setView,
      events: s.events,
    }))
  );
  const parsedDate = parseISO(currentDate);
  const [displayMonth, setDisplayMonth] = useState(parsedDate);

  const monthStart = startOfMonth(displayMonth);
  const monthEnd = endOfMonth(displayMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const eventDays = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) set.add(e.date);
    return set;
  }, [events]);

  const handleDayClick = (day: Date) => {
    setCurrentDate(day);
    setView('day');
  };

  return (
    <div className="p-2.5">
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setDisplayMonth(subMonths(displayMonth, 1))}
          className="p-1 rounded hover:bg-white/50 text-gray-400 no-drag"
        >
          <ChevronLeft size={12} />
        </button>
        <span className="text-xs font-semibold text-gray-600">
          {format(displayMonth, 'yyyy年M月', { locale: zhCN })}
        </span>
        <button
          onClick={() => setDisplayMonth(addMonths(displayMonth, 1))}
          className="p-1 rounded hover:bg-white/50 text-gray-400 no-drag"
        >
          <ChevronRight size={12} />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-0.5">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-[10px] text-gray-400 py-0.5">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const isSelected = isSameDay(day, parsedDate);
          const inMonth = isSameMonth(day, displayMonth);
          const today = isToday(day);

          return (
              <button
              key={day.toISOString()}
              onClick={() => handleDayClick(day)}
              className={`
                relative flex flex-col items-center justify-center w-7 h-7 mx-auto rounded-full text-[11px]
                no-drag transition-all
                ${!inMonth ? 'text-gray-300' : today && !isSelected ? 'text-emerald-600 font-bold' : 'text-gray-600'}
                ${isSelected ? 'bg-emerald-500/90 text-white font-bold shadow-sm shadow-emerald-500/20' : 'hover:bg-white/50'}
              `}
            >
              {format(day, 'd')}
              {eventDays.has(format(day, 'yyyy-MM-dd')) && !isSelected && inMonth && (
                <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-emerald-400" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
