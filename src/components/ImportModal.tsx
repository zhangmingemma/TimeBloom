import { useState, useCallback, useMemo, memo, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, GitBranch, Calendar, Check, ScanLine, AlertCircle, LogIn, LogOut } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../store/useStore';
import { CalendarEvent, DetectedActivity } from '../types';

function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

const SOURCE_CONFIG = {
  git:      { label: 'Git',  color: '#10b981', icon: GitBranch },
  manual:   { label: '手动', color: '#6b7280', icon: GitBranch },
  calendar: { label: '日历', color: '#10b981', icon: Calendar },
} as const;

type ImportTab = 'git' | 'calendar';
type ImportStatus = 'new' | 'imported' | 'updatable';

interface ActivityItemProps {
  activity: DetectedActivity;
  selected: boolean;
  status: ImportStatus;
  categoryId: string | null;
  businessLineId: string | null;
  onToggle: () => void;
  onCategoryChange: (id: string | null) => void;
  onBusinessLineChange: (id: string | null) => void;
}

const ActivityItem = memo(function ActivityItem({
  activity, selected, status, categoryId, businessLineId,
  onToggle, onCategoryChange, onBusinessLineChange,
}: ActivityItemProps) {
  const { categories, businessLines } = useStore(
    useShallow((s) => ({ categories: s.categories, businessLines: s.businessLines }))
  );
  const [expanded, setExpanded] = useState(false);
  const cfg = SOURCE_CONFIG[activity.source as keyof typeof SOURCE_CONFIG] || SOURCE_CONFIG.manual;
  const Icon = cfg.icon;
  const imported = status === 'imported';
  const updatable = status === 'updatable';

  return (
    <div
      className={`rounded-xl transition-all ${
        imported
          ? 'opacity-50 bg-white/20 border border-white/20'
          : selected
            ? 'bg-white/40 border border-white/50 shadow-sm'
            : 'bg-white/25 border border-white/30 hover:bg-white/35'
      }`}
    >
      <div className="flex items-start gap-3 p-3">
        {/* Left color bar + checkbox */}
        <div className="flex flex-col items-center gap-1 pt-0.5">
          <button
            onClick={onToggle}
            disabled={imported}
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${
              imported
                ? 'border-gray-300/60 bg-gray-200/40'
                : selected
                  ? 'border-transparent text-white shadow-sm'
                  : 'border-white/50 hover:border-white/70 bg-white/20'
            }`}
            style={selected && !imported ? { backgroundColor: updatable ? '#d97706' : cfg.color } : {}}
          >
            {(selected || imported) && <Check size={12} />}
          </button>
          <div className="w-0.5 flex-1 rounded-full min-h-[20px]" style={{ backgroundColor: cfg.color + '30' }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-white/90 shadow-sm"
              style={{ backgroundColor: cfg.color + 'cc' }}
            >
              <Icon size={10} />
              {cfg.label}
            </span>
            {imported && (
              <span className="text-[10px] font-semibold text-gray-500/70 bg-white/30 px-1.5 py-0.5 rounded">
                已导入
              </span>
            )}
            {updatable && (
              <span className="text-[10px] font-semibold text-amber-700/90 bg-amber-100/60 px-1.5 py-0.5 rounded">
                时间已变更
              </span>
            )}
          </div>

          <h4 className="text-sm font-semibold text-gray-800/90 truncate">{activity.title}</h4>

          <div className="flex items-center gap-2 mt-1 text-xs text-gray-600/70">
            <span className="font-mono">{activity.startTime}</span>
            <span className="text-gray-400/60">→</span>
            <span className="font-mono">{activity.endTime}</span>
            {activity.commitCount && (
              <span className="text-gray-500/60">| {activity.commitCount} 次提交</span>
            )}
          </div>

          {/* Category & Business Line selectors (only for selectable items) */}
          {selected && status !== 'imported' && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => onCategoryChange(categoryId === cat.id ? null : cat.id)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all ${
                    categoryId === cat.id
                      ? 'text-white shadow-sm'
                      : 'bg-white/30 text-gray-600/80 hover:bg-white/50'
                  }`}
                  style={categoryId === cat.id ? { backgroundColor: cat.color } : {}}
                >
                  {cat.emoji} {cat.name}
                </button>
              ))}
              {businessLines.map((bl) => (
                <button
                  key={bl.id}
                  onClick={() => onBusinessLineChange(businessLineId === bl.id ? null : bl.id)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all border ${
                    businessLineId === bl.id
                      ? 'text-white border-transparent shadow-sm'
                      : 'bg-white/25 text-gray-600/80 border-white/40 hover:bg-white/40'
                  }`}
                  style={businessLineId === bl.id ? { backgroundColor: bl.color } : {}}
                >
                  {bl.emoji} {bl.name}
                </button>
              ))}
            </div>
          )}

          {/* Expandable notes */}
          {activity.notes && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[11px] text-gray-500/70 hover:text-gray-700/80 mt-1.5 transition-colors"
            >
              {expanded ? '收起详情 ▴' : '展开详情 ▾'}
            </button>
          )}
          {expanded && activity.notes && (
            <pre className="mt-1.5 text-[11px] text-gray-600/70 bg-white/20 rounded-lg p-2 whitespace-pre-wrap font-mono leading-relaxed border border-white/30">
              {activity.notes}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
});

export function ImportModal() {
  const { events, categories, businessLines, closeImportModal, batchAddEvents, updateEvent, setCurrentDate, setView } = useStore(
    useShallow((s) => ({
      events: s.events,
      categories: s.categories,
      businessLines: s.businessLines,
      closeImportModal: s.closeImportModal,
      batchAddEvents: s.batchAddEvents,
      updateEvent: s.updateEvent,
      setCurrentDate: s.setCurrentDate,
      setView: s.setView,
    }))
  );
  const [activeTab, setActiveTab] = useState<ImportTab>('git');
  const [scanDate, setScanDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [activities, setActivities] = useState<DetectedActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [categoryMap, setCategoryMap] = useState<Record<string, string | null>>({});
  const [blMap, setBlMap] = useState<Record<string, string | null>>({});
  const [hasScanned, setHasScanned] = useState(false);
  const [calendarAuthed, setCalendarAuthed] = useState<boolean | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Check calendar auth status on mount
  useEffect(() => {
    if (window.electronAPI?.calendarStatus) {
      window.electronAPI.calendarStatus().then((s) => setCalendarAuthed(s.authed));
    }
  }, []);

  // Map from sourceId → stored event, used to detect updates
  const importedEventMap = useMemo(() => {
    const map = new Map<string, CalendarEvent>();
    events.forEach((e) => {
      if (e.sourceId) map.set(e.sourceId, e);
    });
    return map;
  }, [events]);

  const getStatus = useCallback((a: DetectedActivity): ImportStatus => {
    const existing = importedEventMap.get(a.sourceId);
    if (!existing) return 'new';
    if (existing.startTime !== a.startTime || existing.endTime !== a.endTime) return 'updatable';
    return 'imported';
  }, [importedEventMap]);

  const isSelectable = useCallback((a: DetectedActivity): boolean => {
    return getStatus(a) !== 'imported';
  }, [getStatus]);

  const findMeetingCategory = useCallback(() => {
    return categories.find((c) => c.name === '会议')?.id ?? null;
  }, [categories]);

  const matchBusinessLine = useCallback((title: string) => {
    for (const bl of businessLines) {
      if (title.toLowerCase().includes(bl.name.toLowerCase())) {
        return bl.id;
      }
    }
    return null;
  }, [businessLines]);

  const scan = useCallback(async (date: string) => {
    if (!window.electronAPI?.scanActivities) {
      setError('扫描功能仅在桌面应用中可用');
      return;
    }
    setLoading(true);
    setError('');
    setActivities([]);
    setSelected(new Set());
    setCategoryMap({});
    setBlMap({});
    try {
      const result = await window.electronAPI.scanActivities(date);
      if (result.ok) {
        setActivities(result.activities);
        const currentEvents = useStore.getState().events;
        const eventMap = new Map<string, CalendarEvent>();
        currentEvents.forEach((e) => { if (e.sourceId) eventMap.set(e.sourceId, e); });

        const newSelected = new Set<string>();
        result.activities.forEach((a: DetectedActivity) => {
          const existing = eventMap.get(a.sourceId);
          if (!existing) {
            newSelected.add(a.id);
          } else if (existing.startTime !== a.startTime || existing.endTime !== a.endTime) {
            newSelected.add(a.id);
          }
        });
        setSelected(newSelected);
      } else {
        setError(result.error || '扫描失败');
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
      setHasScanned(true);
    }
  }, []);

  const scanCalendar = useCallback(async (date: string) => {
    if (!window.electronAPI?.calendarScan) {
      setError('日历功能仅在桌面应用中可用');
      return;
    }
    setLoading(true);
    setError('');
    setActivities([]);
    setSelected(new Set());
    try {
      const result = await window.electronAPI.calendarScan(date);
      if (result.ok) {
        setActivities(result.activities);
        const currentEvents = useStore.getState().events;
        const eventMap = new Map<string, CalendarEvent>();
        currentEvents.forEach((e) => { if (e.sourceId) eventMap.set(e.sourceId, e); });

        const meetingCatId = findMeetingCategory();
        const newSelected = new Set<string>();
        const newCatMap: Record<string, string | null> = {};
        const newBlMap: Record<string, string | null> = {};

        result.activities.forEach((a: DetectedActivity) => {
          const existing = eventMap.get(a.sourceId);
          if (!existing) {
            newSelected.add(a.id);
            newCatMap[a.id] = meetingCatId;
            newBlMap[a.id] = matchBusinessLine(a.title);
          } else if (existing.startTime !== a.startTime || existing.endTime !== a.endTime) {
            newSelected.add(a.id);
          }
        });
        setSelected(newSelected);
        setCategoryMap(newCatMap);
        setBlMap(newBlMap);
      } else {
        if (result.error?.includes('未授权')) {
          setCalendarAuthed(false);
        }
        setError(result.error || '获取日历失败');
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
      setHasScanned(true);
    }
  }, [findMeetingCategory, matchBusinessLine]);

  const handleAuth = async () => {
    if (!window.electronAPI?.calendarAuth) return;
    setAuthLoading(true);
    setError('');
    try {
      const result = await window.electronAPI.calendarAuth();
      if (result.ok) {
        setCalendarAuthed(true);
      } else {
        setError(result.error || '授权失败');
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!window.electronAPI?.calendarLogout) return;
    await window.electronAPI.calendarLogout();
    setCalendarAuthed(false);
    setActivities([]);
    setHasScanned(false);
  };

  const switchTab = (tab: ImportTab) => {
    setActiveTab(tab);
    setActivities([]);
    setHasScanned(false);
    setError('');
    setSelected(new Set());
    setCategoryMap({});
    setBlMap({});
  };

  const goDate = (delta: number) => {
    const d = delta > 0 ? addDays(new Date(scanDate), delta) : subDays(new Date(scanDate), -delta);
    setScanDate(format(d, 'yyyy-MM-dd'));
    setHasScanned(false);
    setActivities([]);
  };

  const toggleItem = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectableCount = activities.filter(isSelectable).length;
  const selectedCount = [...selected].filter((id) => {
    const a = activities.find((x) => x.id === id);
    return a && isSelectable(a);
  }).length;

  const toggleAll = () => {
    if (selectedCount === selectableCount) {
      setSelected(new Set());
    } else {
      const all = new Set<string>();
      activities.forEach((a) => {
        if (isSelectable(a)) all.add(a.id);
      });
      setSelected(all);
    }
  };

  const handleImport = () => {
    const toImport: CalendarEvent[] = [];
    for (const a of activities) {
      if (!selected.has(a.id)) continue;

      const existing = importedEventMap.get(a.sourceId);
      if (existing) {
        if (existing.startTime !== a.startTime || existing.endTime !== a.endTime) {
          updateEvent(existing.id, {
            startTime: a.startTime,
            endTime: a.endTime,
            notes: a.notes || undefined,
          });
        }
        continue;
      }

      toImport.push({
        id: generateId(),
        title: a.title,
        date: a.date,
        startTime: a.startTime,
        endTime: a.endTime,
        categoryId: categoryMap[a.id] ?? null,
        businessLineId: blMap[a.id] ?? null,
        notes: a.notes || undefined,
        source: a.source as 'manual' | 'git',
        sourceId: a.sourceId,
      });
    }
    if (toImport.length > 0) batchAddEvents(toImport);

    setCurrentDate(new Date(scanDate + 'T00:00:00'));
    setView('day');
    closeImportModal();
  };

  const dateLabel = format(new Date(scanDate), 'M月d日 EEEE', { locale: zhCN });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/25" onClick={closeImportModal} />

      <div className="relative glass-modal rounded-2xl w-full max-w-lg mx-4 overflow-hidden no-drag flex flex-col max-h-[85vh]" style={{ borderTopWidth: 0 }}>
        {/* Header bar — static gradient or streaming animation */}
        <div className="h-1 w-full flex-shrink-0 relative overflow-hidden bg-white/20">
          {loading ? (
            <>
              <div className="stream-bar" />
              <style>{`
                .stream-bar {
                  position: absolute;
                  inset: 0;
                  background: linear-gradient(90deg, transparent 0%, #10b981 20%, #3b82f6 50%, #8b5cf6 80%, transparent 100%);
                  background-size: 200% 100%;
                  animation: stream-flow 1.5s ease-in-out infinite;
                }
                @keyframes stream-flow {
                  0%   { background-position: 100% 0; }
                  100% { background-position: -100% 0; }
                }
              `}</style>
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/80 via-blue-400/80 to-purple-400/80" />
          )}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/20 flex-shrink-0">
          <div className="flex items-center gap-2">
            <ScanLine size={16} className="text-emerald-500" />
            <h2 className="text-sm font-bold text-gray-800/90">导入活动</h2>
          </div>
          <button onClick={closeImportModal} className="p-1.5 rounded-lg hover:bg-white/30 text-gray-400/80 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex px-5 pt-3 gap-2 flex-shrink-0">
          <button
            onClick={() => switchTab('git')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'git'
                ? 'bg-emerald-500/15 text-emerald-700 border border-emerald-300/30'
                : 'text-gray-500/80 hover:bg-white/30'
            }`}
          >
            <GitBranch size={12} />
            扫描活动
          </button>
          <button
            onClick={() => switchTab('calendar')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'calendar'
                ? 'bg-emerald-500/15 text-emerald-700 border border-emerald-300/30'
                : 'text-gray-500/80 hover:bg-white/30'
            }`}
          >
            <Calendar size={12} />
            导入日历
          </button>
          {activeTab === 'calendar' && calendarAuthed && (
            <button
              onClick={handleLogout}
              className="ml-auto text-[10px] text-gray-400/70 hover:text-red-500/80 flex items-center gap-1 transition-colors"
            >
              <LogOut size={10} />
              退出登录
            </button>
          )}
        </div>

        {/* Date navigator */}
        <div className="flex items-center justify-between px-5 py-3 bg-white/10 border-b border-white/20 flex-shrink-0 mt-2">
          <button onClick={() => goDate(-1)} className="p-1.5 rounded-lg hover:bg-white/30 text-gray-500/80 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <div className="text-center">
            <span className="text-sm font-semibold text-gray-700/90">{dateLabel}</span>
            {scanDate !== format(new Date(), 'yyyy-MM-dd') && (
              <button
                onClick={() => setScanDate(format(new Date(), 'yyyy-MM-dd'))}
                className="ml-2 text-[10px] text-emerald-600/90 hover:text-emerald-700 font-semibold"
              >
                回到今天
              </button>
            )}
          </div>
          <button onClick={() => goDate(1)} className="p-1.5 rounded-lg hover:bg-white/30 text-gray-500/80 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <span className="text-xs text-gray-400/80">
                {activeTab === 'git' ? '正在扫描活动记录…' : '正在获取日历事件…'}
              </span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-400/10 border border-red-300/20 rounded-xl text-xs text-red-600/80">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {/* Git tab: initial state */}
          {activeTab === 'git' && !loading && !hasScanned && !error && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400/70">
              <ScanLine size={28} className="mb-3 opacity-40" />
              <span className="text-xs mb-4">点击扫描以检测当天的活动记录</span>
              <button
                onClick={() => scan(scanDate)}
                className="px-5 py-2 bg-emerald-500/90 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 transition-colors flex items-center gap-1.5"
              >
                <ScanLine size={13} />
                扫描活动
              </button>
            </div>
          )}

          {/* Calendar tab: not authed */}
          {activeTab === 'calendar' && !loading && !calendarAuthed && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400/70">
              <Calendar size={28} className="mb-3 opacity-40 text-emerald-400" />
              <span className="text-xs mb-1">连接飞书日历以导入会议事件</span>
              <span className="text-[10px] mb-4 text-gray-400/50">授权后可获取你的日程安排</span>
              <button
                onClick={handleAuth}
                disabled={authLoading}
                className="px-5 py-2 bg-emerald-500/90 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                <LogIn size={13} />
                {authLoading ? '授权中…' : '授权飞书'}
              </button>
            </div>
          )}

          {/* Calendar tab: authed, initial state */}
          {activeTab === 'calendar' && !loading && calendarAuthed && !hasScanned && !error && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400/70">
              <Calendar size={28} className="mb-3 opacity-40 text-emerald-400" />
              <span className="text-xs mb-4">点击获取当天的日历事件</span>
              <button
                onClick={() => scanCalendar(scanDate)}
                className="px-5 py-2 bg-emerald-500/90 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 transition-colors flex items-center gap-1.5"
              >
                <Calendar size={13} />
                获取日历
              </button>
            </div>
          )}

          {/* Scanned but empty */}
          {!loading && hasScanned && !error && activities.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400/70">
              <ScanLine size={28} className="mb-2 opacity-40" />
              <span className="text-xs">
                {activeTab === 'git' ? '当天未检测到活动记录' : '当天没有日历事件'}
              </span>
              {activeTab === 'git' && (
                <span className="text-[10px] mt-1 text-gray-400/50">
                  确保 ~/Desktop 下有 Git 仓库
                </span>
              )}
              <button
                onClick={() => activeTab === 'git' ? scan(scanDate) : scanCalendar(scanDate)}
                className="mt-3 px-4 py-1.5 text-emerald-600/80 hover:text-emerald-700 hover:bg-white/30 rounded-lg text-[11px] font-semibold transition-colors"
              >
                重新获取
              </button>
            </div>
          )}

          {activities.map((a) => (
            <ActivityItem
              key={a.id}
              activity={a}
              selected={selected.has(a.id)}
              status={getStatus(a)}
              categoryId={categoryMap[a.id] ?? null}
              businessLineId={blMap[a.id] ?? null}
              onToggle={() => toggleItem(a.id)}
              onCategoryChange={(id) => setCategoryMap((m) => ({ ...m, [a.id]: id }))}
              onBusinessLineChange={(id) => setBlMap((m) => ({ ...m, [a.id]: id }))}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 pb-4 pt-3 flex items-center justify-between border-t border-white/20 flex-shrink-0">
          <div className="flex items-center gap-3">
            {hasScanned && !loading && (
              <button
                onClick={() => activeTab === 'git' ? scan(scanDate) : scanCalendar(scanDate)}
                className="text-[11px] text-emerald-600/70 hover:text-emerald-700/90 font-semibold transition-colors flex items-center gap-1"
              >
                <ScanLine size={11} />
                {activeTab === 'git' ? '重新扫描' : '重新获取'}
              </button>
            )}
            {selectableCount > 0 && (
              <>
                <button
                  onClick={() => {
                    const all = new Set<string>();
                    activities.forEach((a) => { if (isSelectable(a)) all.add(a.id); });
                    setSelected(all);
                  }}
                  disabled={selectedCount === selectableCount}
                  className="text-[11px] text-gray-500/80 hover:text-gray-700/90 font-semibold transition-colors disabled:opacity-40"
                >
                  全选
                </button>
                <button
                  onClick={() => setSelected(new Set())}
                  disabled={selectedCount === 0}
                  className="text-[11px] text-gray-500/80 hover:text-gray-700/90 font-semibold transition-colors disabled:opacity-40"
                >
                  全不选
                </button>
              </>
            )}
            <span className="text-[11px] text-gray-400/70">
              {selectedCount} / {selectableCount} 项
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={closeImportModal}
              className="px-4 py-2 text-gray-500/70 hover:bg-white/30 rounded-xl text-xs font-semibold transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleImport}
              disabled={selectedCount === 0}
              className="px-5 py-2 bg-emerald-500/90 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-500/90 transition-colors"
            >
              导入 {selectedCount > 0 ? `${selectedCount} 项` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
