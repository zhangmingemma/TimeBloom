import { Settings2, BarChart2, Layers, ScanLine, CheckSquare } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../store/useStore';
import { ViewType } from '../types';
import { MiniCalendar } from './MiniCalendar';

function ClockLogo() {
  // 10:10 position — classic symmetric watch display
  const cx = 16, cy = 16, faceR = 10;
  const hAngle = (10 / 12) * Math.PI * 2 - Math.PI / 2;
  const mAngle = (2 / 12) * Math.PI * 2 - Math.PI / 2;
  const hx = cx + Math.cos(hAngle) * faceR * 0.55;
  const hy = cy + Math.sin(hAngle) * faceR * 0.55;
  const mx = cx + Math.cos(mAngle) * faceR * 0.72;
  const my = cy + Math.sin(mAngle) * faceR * 0.72;

  return (
    <svg width="34" height="34" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#10b981" />
      <circle cx={cx} cy={cy} r={faceR} fill="white" fillOpacity="0.93" />
      {[0, 3, 6, 9].map((h) => {
        const a = (h / 12) * Math.PI * 2 - Math.PI / 2;
        return (
          <line key={h}
            x1={cx + Math.cos(a) * faceR * 0.78} y1={cy + Math.sin(a) * faceR * 0.78}
            x2={cx + Math.cos(a) * faceR * 0.93} y2={cy + Math.sin(a) * faceR * 0.93}
            stroke="#059669" strokeWidth="1.4" strokeLinecap="round" />
        );
      })}
      <line x1={cx} y1={cy} x2={hx} y2={hy} stroke="#059669" strokeWidth="1.9" strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={mx} y2={my} stroke="#10b981" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="1.6" fill="#059669" />
    </svg>
  );
}

const CALENDAR_VIEWS: { label: string; value: ViewType }[] = [
  { label: '日', value: 'day' },
  { label: '周', value: 'week' },
  { label: '月', value: 'month' },
];

export function Sidebar() {
  const {
    view,
    setView,
    categories,
    businessLines,
    activeCategories,
    toggleCategory,
    openModal,
    openCategoryModal,
    openBusinessLineModal,
    openImportModal,
    openTodoDrawer,
    todos,
  } = useStore(useShallow((s) => ({
    view: s.view,
    setView: s.setView,
    categories: s.categories,
    businessLines: s.businessLines,
    activeCategories: s.activeCategories,
    toggleCategory: s.toggleCategory,
    openModal: s.openModal,
    openCategoryModal: s.openCategoryModal,
    openBusinessLineModal: s.openBusinessLineModal,
    openImportModal: s.openImportModal,
    openTodoDrawer: s.openTodoDrawer,
    todos: s.todos,
  })));

  return (
    <aside className="w-56 flex-shrink-0 glass-sidebar rounded-2xl flex flex-col overflow-hidden">
      {/* Logo */}
      <div className="px-4 py-3 flex items-center gap-2.5">
        <ClockLogo />
        <div>
          <h1 className="text-sm font-bold text-gray-800 leading-tight">TimeBloom</h1>
          <p className="text-[10px] text-gray-400 leading-tight">时间管理大师</p>
        </div>
      </div>

      {/* New event button */}
      <div className="px-3 mb-3">
        <button
          onClick={() => openModal()}
          className="w-full py-2 bg-emerald-500/90 text-white rounded-xl text-xs font-semibold hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 no-drag transition-all hover:shadow-emerald-500/30"
        >
          + 新建事件
        </button>
      </div>

      {/* View switcher (calendar views) */}
      <div className="px-3 mb-2">
        <div className="flex rounded-xl bg-white/40 border border-white/50 p-0.5 no-drag">
          {CALENDAR_VIEWS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setView(opt.value)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all no-drag ${
                view === opt.value
                  ? 'bg-emerald-500/90 text-white shadow-sm shadow-emerald-500/20'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/40'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats view button */}
      <div className="px-3 mb-1.5">
        <button
          onClick={() => setView('stats')}
          className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold transition-all no-drag border ${
            view === 'stats'
              ? 'bg-emerald-500/90 text-white border-emerald-500/50 shadow-sm shadow-emerald-500/20'
              : 'bg-white/40 text-gray-500 border-white/50 hover:bg-white/60 hover:text-gray-700'
          }`}
        >
          <BarChart2 size={13} />
          数据统计
        </button>
      </div>

      {/* Import activities button */}
      <div className="px-3 mb-1.5">
        <button
          onClick={openImportModal}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold transition-all no-drag border bg-white/40 text-gray-500 border-white/50 hover:bg-white/60 hover:text-blue-600"
        >
          <ScanLine size={13} />
          导入活动
        </button>
      </div>

      {/* TODO button */}
      <div className="px-3 mb-3">
        <button
          onClick={() => openTodoDrawer()}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold transition-all no-drag border bg-white/40 text-gray-500 border-white/50 hover:bg-white/60 hover:text-gray-700"
        >
          <CheckSquare size={13} />
          TODO
          {todos.filter((t) => !t.completed).length > 0 && (
            <span className="text-[9px] text-gray-400/80 font-medium">
              {todos.filter((t) => !t.completed).length}
            </span>
          )}
        </button>
      </div>

      {/* Mini calendar */}
      <div className="mx-3 mb-3 bg-white/40 rounded-xl border border-white/50">
        <MiniCalendar />
      </div>

      {/* Category section */}
      <div className="px-3 flex-1 overflow-y-auto min-h-0">
        <div className="flex items-center justify-between mb-1.5 px-1">
          <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
            分类
          </h3>
          <button
            onClick={openCategoryModal}
            className="p-1 rounded hover:bg-white/50 text-gray-400 hover:text-gray-600 transition-colors no-drag"
            title="管理分类"
          >
            <Settings2 size={12} />
          </button>
        </div>

        {categories.length === 0 ? (
          <button
            onClick={openCategoryModal}
            className="w-full py-2.5 text-[11px] text-gray-400 hover:text-emerald-600 text-center border border-dashed border-white/50 rounded-xl hover:border-emerald-300 transition-colors no-drag hover:bg-white/30"
          >
            点击创建第一个分类 🌱
          </button>
        ) : (
          <div className="space-y-0.5">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all no-drag hover:bg-white/40 ${
                  activeCategories.includes(cat.id) ? 'text-gray-700' : 'text-gray-300'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-opacity"
                  style={{
                    backgroundColor: cat.color,
                    opacity: activeCategories.includes(cat.id) ? 1 : 0.3,
                  }}
                />
                <span className="flex-1 text-left font-medium truncate">{cat.name}</span>
                <span className="text-sm">{cat.emoji}</span>
              </button>
            ))}
          </div>
        )}

        {/* Business Line section */}
        <div className="flex items-center justify-between mt-3 mb-1.5 px-1">
          <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1">
            <Layers size={9} />
            业务线
          </h3>
          <button
            onClick={openBusinessLineModal}
            className="p-1 rounded hover:bg-white/50 text-gray-400 hover:text-gray-600 transition-colors no-drag"
            title="管理业务线"
          >
            <Settings2 size={12} />
          </button>
        </div>

        {businessLines.length === 0 ? (
          <button
            onClick={openBusinessLineModal}
            className="w-full py-2.5 text-[11px] text-gray-400 hover:text-blue-600 text-center border border-dashed border-white/50 rounded-xl hover:border-blue-300 transition-colors no-drag hover:bg-white/30"
          >
            点击创建第一条业务线 🚀
          </button>
        ) : (
          <div className="space-y-0.5">
            {businessLines.map((bl) => (
              <div
                key={bl.id}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-gray-700"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: bl.color }}
                />
                <span className="flex-1 text-left font-medium truncate">{bl.name}</span>
                <span className="text-sm">{bl.emoji}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 text-[10px] text-center text-gray-400/60 leading-relaxed">
        TimeBloom v1.0<br />
        <span className="text-emerald-500/70 font-medium">数据已自动保存到本地</span>
      </div>
    </aside>
  );
}
