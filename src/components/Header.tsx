import { ChevronLeft, ChevronRight, Plus, BarChart2 } from 'lucide-react';
import {
  format,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  parseISO,
  isToday,
  isThisWeek,
  isThisMonth,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../store/useStore';

export function Header() {
  const { currentDate, view, setCurrentDate, openModal } = useStore(
    useShallow((s) => ({
      currentDate: s.currentDate,
      view: s.view,
      setCurrentDate: s.setCurrentDate,
      openModal: s.openModal,
    }))
  );
  const date = parseISO(currentDate);

  const goBack = () => {
    if (view === 'day') setCurrentDate(subDays(date, 1));
    else if (view === 'week') setCurrentDate(subWeeks(date, 1));
    else setCurrentDate(subMonths(date, 1));
  };

  const goForward = () => {
    if (view === 'day') setCurrentDate(addDays(date, 1));
    else if (view === 'week') setCurrentDate(addWeeks(date, 1));
    else setCurrentDate(addMonths(date, 1));
  };

  const goToday = () => setCurrentDate(new Date());

  const getTitle = () => {
    if (view === 'stats') return '数据统计';
    if (view === 'day') {
      return format(date, 'yyyy年M月d日 EEEE', { locale: zhCN });
    }
    if (view === 'week') {
      const start = startOfWeek(date, { weekStartsOn: 1 });
      const end = endOfWeek(date, { weekStartsOn: 1 });
      if (start.getMonth() === end.getMonth()) {
        return `${format(start, 'yyyy年M月d日')} – ${format(end, 'd日')}`;
      }
      return `${format(start, 'yyyy年M月d日')} – ${format(end, 'M月d日')}`;
    }
    return format(date, 'yyyy年M月', { locale: zhCN });
  };

  const isCurrentPeriod = () => {
    if (view === 'day') return isToday(date);
    if (view === 'week') return isThisWeek(date, { weekStartsOn: 1 });
    return isThisMonth(date);
  };

  const isStats = view === 'stats';

  return (
    <header className="flex items-center gap-3 px-4 py-2.5 glass rounded-2xl flex-shrink-0 no-drag z-10">
      {isStats ? (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white/50 flex items-center justify-center">
            <BarChart2 size={14} className="text-gray-500" />
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <button
            onClick={goBack}
            className="p-1.5 rounded-lg hover:bg-white/50 text-gray-500"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={goToday}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isCurrentPeriod()
                ? 'bg-emerald-500/15 text-emerald-600'
                : 'text-gray-500 hover:bg-white/50'
            }`}
          >
            今天
          </button>
          <button
            onClick={goForward}
            className="p-1.5 rounded-lg hover:bg-white/50 text-gray-500"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      <h1 className="text-sm font-semibold text-gray-800 flex-1">{getTitle()}</h1>

      {!isStats && (
        <button
          onClick={() => openModal()}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500/90 text-white rounded-xl text-xs font-semibold hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 no-drag transition-all"
        >
          <Plus size={14} />
          新建事件
        </button>
      )}
    </header>
  );
}
