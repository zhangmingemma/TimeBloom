import { useState, useMemo, useEffect } from 'react';
import { X, Plus, CheckSquare, Square, Trash2, Calendar, CalendarCheck, CalendarPlus, ChevronDown, ChevronUp, Clock, AlertCircle, Pencil, History } from 'lucide-react';
import { format, isPast, isToday, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../store/useStore';
import { Priority, TodoItem, UserStatus, CATEGORY_COLORS, BUSINESS_COLORS } from '../types';
import { RichTextEditor } from './RichTextEditor';

function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string }> = {
  P0: { label: 'P0', color: '#e53e3e', bg: 'bg-red-500/15 text-red-700 border-red-300/30' },
  P1: { label: 'P1', color: '#ed8936', bg: 'bg-orange-500/15 text-orange-700 border-orange-300/30' },
  P2: { label: 'P2', color: '#3182ce', bg: 'bg-blue-500/15 text-blue-700 border-blue-300/30' },
  P3: { label: 'P3', color: '#6b7280', bg: 'bg-gray-500/15 text-gray-600 border-gray-300/30' },
};

const STATUS_COLORS = [
  '#10b981', '#f59e0b', '#8b5cf6', '#3b82f6', '#ef4444',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

// Inline quick-create form for categories/business lines/statuses
function QuickCreateForm({ placeholder, colors, onSave, onCancel }: {
  placeholder: string;
  colors: string[];
  onSave: (name: string, color: string, emoji: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(colors[Math.floor(Math.random() * colors.length)]);
  const [emoji, setEmoji] = useState('');

  const quickEmojis = ['🔥', '⏳', '🤔', '✅', '🚀', '💼', '📋', '🎯', '⚡', '🔧', '📊', '🎨'];

  return (
    <div className="p-2 bg-white/40 rounded-lg border border-emerald-200/40 space-y-2">
      <div className="flex gap-1.5">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 12))}
          onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) onSave(name.trim(), color, emoji || '📌'); if (e.key === 'Escape') onCancel(); }}
          placeholder={placeholder}
          autoFocus
          className="flex-1 px-2 py-1 bg-white/60 border border-white/60 rounded text-[11px] text-gray-800 placeholder-gray-400/60 focus:outline-none focus:border-emerald-300/60"
        />
      </div>
      <div className="flex items-center gap-1 flex-wrap">
        {quickEmojis.map((e) => (
          <button
            key={e}
            onClick={() => setEmoji(e)}
            className={`w-5 h-5 rounded text-[11px] flex items-center justify-center transition-all ${emoji === e ? 'bg-emerald-100 scale-110' : 'hover:bg-white/50'}`}
          >
            {e}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1 flex-wrap">
        {colors.slice(0, 10).map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`w-4 h-4 rounded-full transition-all ${color === c ? 'scale-125 ring-2 ring-white shadow' : 'hover:scale-110'}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="flex justify-end gap-1.5">
        <button onClick={onCancel} className="px-2 py-0.5 text-[10px] text-gray-500 hover:bg-white/40 rounded">取消</button>
        <button
          onClick={() => name.trim() && onSave(name.trim(), color, emoji || '📌')}
          disabled={!name.trim()}
          className="px-2.5 py-0.5 text-[10px] font-semibold bg-emerald-500/90 text-white rounded disabled:opacity-40 hover:bg-emerald-600"
        >
          创建
        </button>
      </div>
    </div>
  );
}

interface TodoItemRowProps {
  todo: TodoItem;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onToggleCalendar: () => void;
  onCreateEvent: () => void;
}

function TodoItemRow({ todo, onToggle, onDelete, onEdit, onToggleCalendar, onCreateEvent }: TodoItemRowProps) {
  const { categories, businessLines, statuses } = useStore(
    useShallow((s) => ({ categories: s.categories, businessLines: s.businessLines, statuses: s.statuses }))
  );
  const [showEventPrompt, setShowEventPrompt] = useState(false);
  const cat = categories.find((c) => c.id === todo.categoryId);
  const bl = businessLines.find((b) => b.id === todo.businessLineId);
  const st = statuses.find((s) => s.id === todo.statusId);
  const pCfg = PRIORITY_CONFIG[todo.priority];

  const deadlineDate = todo.deadline ? parseISO(todo.deadline) : null;
  const isOverdue = deadlineDate && !todo.completed && isPast(deadlineDate) && !isToday(deadlineDate);
  const isDueToday = deadlineDate && !todo.completed && isToday(deadlineDate);
  const hasTime = todo.deadline && todo.deadline.includes('T');

  const handleToggle = () => {
    if (!todo.completed) {
      setShowEventPrompt(true);
    } else {
      onToggle();
    }
  };

  const confirmComplete = (createEvent: boolean) => {
    onToggle();
    setShowEventPrompt(false);
    if (createEvent) onCreateEvent();
  };

  return (
    <div className={`rounded-xl p-3 transition-all ${
      todo.completed
        ? 'bg-white/15 opacity-60'
        : 'bg-white/30 border border-white/40'
    }`}>
      <div className="flex items-start gap-2.5">
        <button onClick={handleToggle} className="mt-0.5 flex-shrink-0 text-gray-500/80 hover:text-emerald-600 transition-colors">
          {todo.completed ? <CheckSquare size={16} className="text-emerald-500" /> : <Square size={16} />}
        </button>
        <div className="flex-1 min-w-0">
          {/* Tags row */}
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${pCfg.bg}`}>
              {pCfg.label}
            </span>
            {st && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold text-white/90" style={{ backgroundColor: st.color }}>
                {st.emoji} {st.name}
              </span>
            )}
            {cat && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold text-white/90" style={{ backgroundColor: cat.color }}>
                {cat.emoji} {cat.name}
              </span>
            )}
            {bl && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold" style={{ backgroundColor: bl.color + '40', color: bl.color }}>
                {bl.emoji} {bl.name}
              </span>
            )}
          </div>

          {/* Title */}
          <p className={`text-sm font-medium ${todo.completed ? 'line-through text-gray-400' : 'text-gray-800/90'}`}>
            {todo.title}
          </p>

          {/* Notes */}
          {todo.notes && (
            <div
              className="mt-1.5 text-[11px] text-gray-600/80 leading-relaxed prose-rich-notes"
              dangerouslySetInnerHTML={{ __html: todo.notes }}
            />
          )}

          {/* Deadline */}
          {todo.deadline && deadlineDate && (
            <div className={`flex items-center gap-1 mt-1 text-[10px] font-medium ${
              isOverdue ? 'text-red-600' : isDueToday ? 'text-amber-600' : 'text-gray-400/70'
            }`}>
              {isOverdue ? <AlertCircle size={10} /> : <Clock size={10} />}
              <span>
                {isOverdue ? '已逾期 · ' : isDueToday ? '今天截止 · ' : ''}
                {format(deadlineDate, hasTime ? 'M月d日 HH:mm' : 'M月d日', { locale: zhCN })}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {todo.deadline && (
            <button onClick={onToggleCalendar} className={`transition-colors ${todo.showInCalendar ? 'text-emerald-500 hover:text-emerald-600' : 'text-gray-400/50 hover:text-emerald-500/80'}`} title={todo.showInCalendar ? '从日历移除' : '在日历展示'}>
              {todo.showInCalendar ? <CalendarCheck size={13} /> : <Calendar size={13} />}
            </button>
          )}
          <button onClick={onEdit} className="text-gray-400/50 hover:text-blue-500/80 transition-colors">
            <Pencil size={13} />
          </button>
          <button onClick={onDelete} className="text-gray-400/50 hover:text-red-500/80 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {showEventPrompt && (
        <div className="mt-2 ml-6 flex items-center gap-2 p-2 bg-emerald-50/50 rounded-lg border border-emerald-200/30">
          <Calendar size={12} className="text-emerald-600" />
          <span className="text-[11px] text-emerald-700 font-medium">创建对应事件？</span>
          <button
            onClick={() => confirmComplete(true)}
            className="ml-auto px-2.5 py-1 bg-emerald-500/90 text-white text-[10px] font-semibold rounded-md hover:bg-emerald-600 transition-colors"
          >
            创建
          </button>
          <button
            onClick={() => confirmComplete(false)}
            className="px-2.5 py-1 text-gray-500/70 text-[10px] font-semibold rounded-md hover:bg-white/40 transition-colors"
          >
            跳过
          </button>
        </div>
      )}
    </div>
  );
}

export function TodoDrawer() {
  const {
    todos, categories, businessLines, statuses,
    closeTodoDrawer, addTodo, updateTodo, toggleTodoComplete, deleteTodo, openModal,
    addCategory, addBusinessLine, addStatus, editingTodoId,
  } = useStore(
    useShallow((s) => ({
      todos: s.todos,
      categories: s.categories,
      businessLines: s.businessLines,
      statuses: s.statuses,
      closeTodoDrawer: s.closeTodoDrawer,
      addTodo: s.addTodo,
      updateTodo: s.updateTodo,
      toggleTodoComplete: s.toggleTodoComplete,
      deleteTodo: s.deleteTodo,
      openModal: s.openModal,
      addCategory: s.addCategory,
      addBusinessLine: s.addBusinessLine,
      addStatus: s.addStatus,
      editingTodoId: s.editingTodoId,
    }))
  );

  type DrawerView = 'list' | 'add';
  const [drawerView, setDrawerView] = useState<DrawerView>('list');
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('P2');
  const [statusId, setStatusId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [businessLineId, setBusinessLineId] = useState<string | null>(null);
  const [deadline, setDeadline] = useState('');
  const [showInCalendar, setShowInCalendar] = useState(false);
  const [notes, setNotes] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [groupBy, setGroupBy] = useState<'priority' | 'category' | 'businessLine'>('priority');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [creatingBL, setCreatingBL] = useState(false);
  const [creatingStatus, setCreatingStatus] = useState(false);

  useEffect(() => {
    if (editingTodoId) {
      const todo = todos.find((t) => t.id === editingTodoId);
      if (todo) handleStartEdit(todo);
    }
  }, [editingTodoId]);

  const sortedTodos = useMemo(() => {
    const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
    return [...todos].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [todos]);

  const activeTodos = sortedTodos.filter((t) => !t.completed);
  const completedTodos = sortedTodos.filter((t) => t.completed);

  const groupedActiveTodos = useMemo(() => {
    const groups: { key: string; label: string; color?: string; items: TodoItem[] }[] = [];
    const map = new Map<string, TodoItem[]>();

    for (const todo of activeTodos) {
      let key: string;
      if (groupBy === 'priority') {
        key = todo.priority;
      } else if (groupBy === 'category') {
        key = todo.categoryId || '__none__';
      } else {
        key = todo.businessLineId || '__none__';
      }
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(todo);
    }

    if (groupBy === 'priority') {
      for (const p of ['P0', 'P1', 'P2', 'P3'] as Priority[]) {
        const items = map.get(p);
        if (items?.length) {
          groups.push({ key: p, label: p, color: PRIORITY_CONFIG[p].color, items });
        }
      }
    } else if (groupBy === 'category') {
      for (const [key, items] of map) {
        const cat = categories.find((c) => c.id === key);
        groups.push({
          key,
          label: cat ? `${cat.emoji} ${cat.name}` : '无分类',
          color: cat?.color,
          items,
        });
      }
    } else {
      for (const [key, items] of map) {
        const bl = businessLines.find((b) => b.id === key);
        groups.push({
          key,
          label: bl ? `${bl.emoji} ${bl.name}` : '无业务线',
          color: bl?.color,
          items,
        });
      }
    }

    return groups;
  }, [activeTodos, groupBy, categories, businessLines]);

  const handleAdd = () => {
    if (!title.trim()) return;
    const cleanNotes = notes && notes.replace(/<[^>]*>/g, '').trim() ? notes : undefined;
    if (editingTodo) {
      updateTodo(editingTodo.id, {
        title: title.trim(),
        categoryId,
        businessLineId,
        statusId,
        priority,
        deadline: deadline || null,
        showInCalendar: deadline ? showInCalendar : false,
        notes: cleanNotes,
      });
      setEditingTodo(null);
    } else {
      addTodo({
        id: generateId(),
        title: title.trim(),
        categoryId,
        businessLineId,
        statusId,
        priority,
        deadline: deadline || null,
        showInCalendar: deadline ? showInCalendar : false,
        completed: false,
        createdAt: format(new Date(), 'yyyy-MM-dd'),
        notes: cleanNotes,
      });
    }
    setTitle('');
    setPriority('P2');
    setStatusId(null);
    setCategoryId(null);
    setBusinessLineId(null);
    setDeadline('');
    setShowInCalendar(false);
    setNotes('');
    setDrawerView('list');
  };

  const handleStartEdit = (todo: TodoItem) => {
    setEditingTodo(todo);
    setTitle(todo.title);
    setPriority(todo.priority);
    setStatusId(todo.statusId);
    setCategoryId(todo.categoryId);
    setBusinessLineId(todo.businessLineId);
    setDeadline(todo.deadline || '');
    setShowInCalendar(todo.showInCalendar);
    setNotes(todo.notes || '');
    setDrawerView('add');
  };

  const handleCreateEvent = (todo: TodoItem) => {
    const now = new Date();
    const startHour = `${String(now.getHours()).padStart(2, '0')}:00`;
    const endHour = `${String(Math.min(now.getHours() + 1, 23)).padStart(2, '0')}:00`;

    closeTodoDrawer();
    useStore.setState({
      modal: {
        open: true,
        event: {
          id: '',
          title: todo.title,
          date: format(now, 'yyyy-MM-dd'),
          startTime: startHour,
          endTime: endHour,
          categoryId: todo.categoryId,
          businessLineId: todo.businessLineId,
        },
        defaultDate: null,
        defaultStartTime: null,
        defaultEndTime: null,
      },
    });
  };

  const handleCreateCategory = (name: string, color: string, emoji: string) => {
    const id = generateId();
    addCategory({ id, name, color, emoji });
    setCategoryId(id);
    setCreatingCategory(false);
  };

  const handleCreateBL = (name: string, color: string, emoji: string) => {
    const id = generateId();
    addBusinessLine({ id, name, color, emoji });
    setBusinessLineId(id);
    setCreatingBL(false);
  };

  const handleCreateStatus = (name: string, color: string, emoji: string) => {
    const id = generateId();
    addStatus({ id, name, color, emoji });
    setStatusId(id);
    setCreatingStatus(false);
  };

  const handleBatchAddToCalendar = () => {
    const eligible = activeTodos.filter((t) => t.deadline && !t.showInCalendar);
    eligible.forEach((t) => updateTodo(t.id, { showInCalendar: true }));
  };

  const batchEligibleCount = activeTodos.filter((t) => t.deadline && !t.showInCalendar).length;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/15" onClick={closeTodoDrawer} />

      <div className="relative w-[380px] h-full flex flex-col border-l border-white/30 shadow-2xl animate-slide-in-right" style={{ background: 'rgba(243, 244, 246, 0.92)', backdropFilter: 'blur(20px) saturate(150%)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/20 flex-shrink-0">
          <div className="flex items-center gap-2">
            <CheckSquare size={16} className="text-emerald-500" />
            <h2 className="text-sm font-bold text-gray-800/90">TODO</h2>
            <span className="text-[10px] text-gray-400/70 bg-white/30 px-1.5 py-0.5 rounded-full font-semibold">
              {activeTodos.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {batchEligibleCount > 0 && (
              <button
                onClick={handleBatchAddToCalendar}
                className="p-1.5 rounded-lg hover:bg-orange-500/10 text-orange-500 transition-colors"
                title={`一键将 ${batchEligibleCount} 个待办添加到日历`}
              >
                <CalendarPlus size={16} />
              </button>
            )}
            <button
              onClick={() => { setDrawerView('list'); setEditingTodo(null); }}
              className={`p-1.5 rounded-lg transition-colors ${
                drawerView === 'list'
                  ? 'bg-emerald-500/15 text-emerald-600'
                  : 'hover:bg-white/30 text-gray-400/80'
              }`}
              title="历史 TODO"
            >
              <History size={16} />
            </button>
            <button
              onClick={() => { setDrawerView('add'); setEditingTodo(null); setTitle(''); setPriority('P2'); setStatusId(null); setCategoryId(null); setBusinessLineId(null); setDeadline(''); setShowInCalendar(false); setNotes(''); }}
              className={`p-1.5 rounded-lg transition-colors ${
                drawerView === 'add'
                  ? 'bg-emerald-500/15 text-emerald-600'
                  : 'hover:bg-emerald-500/10 text-emerald-600'
              }`}
              title="添加 TODO"
            >
              <Plus size={16} />
            </button>
            <button onClick={closeTodoDrawer} className="p-1.5 rounded-lg hover:bg-white/30 text-gray-400/80 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Add/Edit form view */}
        {drawerView === 'add' && (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="输入待办事项…"
              autoFocus
              className="w-full px-3 py-2 bg-white/40 border border-white/50 rounded-lg text-sm text-gray-800 placeholder-gray-400/60 focus:outline-none focus:border-emerald-300/60"
            />

            {/* Rich text notes */}
            <div>
              <span className="text-[10px] text-gray-500/70 font-semibold mb-1.5 block">备注</span>
              <RichTextEditor
                content={notes}
                onChange={setNotes}
                placeholder="支持列表、复选框、加粗、斜体、颜色、图片…"
              />
            </div>

            {/* Priority selector */}
            <div>
              <span className="text-[10px] text-gray-500/70 font-semibold mb-1.5 block">优先级</span>
              <div className="flex items-center gap-1.5">
                {(['P0', 'P1', 'P2', 'P3'] as Priority[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                      priority === p
                        ? PRIORITY_CONFIG[p].bg + ' scale-105'
                        : 'bg-white/20 text-gray-500/60 border-white/30 hover:bg-white/30'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Status selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-gray-500/70 font-semibold">状态</span>
                <button onClick={() => setCreatingStatus(true)} className="text-[9px] text-emerald-600/70 hover:text-emerald-700 font-semibold">+ 新建</button>
              </div>
              {creatingStatus ? (
                <QuickCreateForm
                  placeholder="状态名称，如：努力中"
                  colors={STATUS_COLORS}
                  onSave={handleCreateStatus}
                  onCancel={() => setCreatingStatus(false)}
                />
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {statuses.map((st) => (
                    <button
                      key={st.id}
                      onClick={() => setStatusId(statusId === st.id ? null : st.id)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all ${
                        statusId === st.id
                          ? 'text-white shadow-sm'
                          : 'bg-white/30 text-gray-600/80 hover:bg-white/50'
                      }`}
                      style={statusId === st.id ? { backgroundColor: st.color } : {}}
                    >
                      {st.emoji} {st.name}
                    </button>
                  ))}
                  {statuses.length === 0 && !creatingStatus && (
                    <span className="text-[10px] text-gray-400/60">点击"新建"创建状态</span>
                  )}
                </div>
              )}
            </div>

            {/* Category selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-gray-500/70 font-semibold">分类</span>
                <button onClick={() => setCreatingCategory(true)} className="text-[9px] text-emerald-600/70 hover:text-emerald-700 font-semibold">+ 新建</button>
              </div>
              {creatingCategory ? (
                <QuickCreateForm
                  placeholder="分类名称，如：会议"
                  colors={CATEGORY_COLORS}
                  onSave={handleCreateCategory}
                  onCancel={() => setCreatingCategory(false)}
                />
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setCategoryId(categoryId === cat.id ? null : cat.id)}
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
                  {categories.length === 0 && !creatingCategory && (
                    <span className="text-[10px] text-gray-400/60">点击"新建"创建分类</span>
                  )}
                </div>
              )}
            </div>

            {/* Business line selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-gray-500/70 font-semibold">业务线</span>
                <button onClick={() => setCreatingBL(true)} className="text-[9px] text-emerald-600/70 hover:text-emerald-700 font-semibold">+ 新建</button>
              </div>
              {creatingBL ? (
                <QuickCreateForm
                  placeholder="业务线名称，如：Aurora"
                  colors={BUSINESS_COLORS}
                  onSave={handleCreateBL}
                  onCancel={() => setCreatingBL(false)}
                />
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {businessLines.map((bl) => (
                    <button
                      key={bl.id}
                      onClick={() => setBusinessLineId(businessLineId === bl.id ? null : bl.id)}
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
                  {businessLines.length === 0 && !creatingBL && (
                    <span className="text-[10px] text-gray-400/60">点击"新建"创建业务线</span>
                  )}
                </div>
              )}
            </div>

            {/* Deadline */}
            <div>
              <span className="text-[10px] text-gray-500/70 font-semibold mb-1.5 block">截止时间</span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={deadline.includes('T') ? deadline.split('T')[0] : deadline}
                  onChange={(e) => {
                    const date = e.target.value;
                    if (!date) { setDeadline(''); return; }
                    const time = deadline.includes('T') ? deadline.split('T')[1] : '';
                    setDeadline(time ? `${date}T${time}` : date);
                  }}
                  className="px-3 py-1.5 bg-white/40 border border-white/50 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-emerald-300/60"
                />
                {(deadline && !deadline.includes('T')) && (
                  <input
                    type="time"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) setDeadline(`${deadline}T${e.target.value}`);
                    }}
                    placeholder="可选"
                    className="px-2 py-1.5 bg-white/40 border border-white/50 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-emerald-300/60"
                  />
                )}
                {deadline.includes('T') && (
                  <div className="flex items-center gap-1">
                    <input
                      type="time"
                      value={deadline.split('T')[1]}
                      onChange={(e) => {
                        if (e.target.value) {
                          setDeadline(`${deadline.split('T')[0]}T${e.target.value}`);
                        } else {
                          setDeadline(deadline.split('T')[0]);
                        }
                      }}
                      className="px-2 py-1.5 bg-white/40 border border-white/50 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-emerald-300/60"
                    />
                    <button
                      onClick={() => setDeadline(deadline.split('T')[0])}
                      className="text-gray-400/60 hover:text-red-400 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Show in calendar toggle */}
            {deadline && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showInCalendar}
                  onChange={(e) => setShowInCalendar(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-emerald-500 focus:ring-emerald-400"
                />
                <span className="text-[10px] text-gray-500/70 font-semibold">在日历中展示</span>
              </label>
            )}

            {/* Action buttons - sticky at bottom */}
            <div className="flex justify-end gap-2 pt-2 pb-2 sticky bottom-0 bg-[rgba(243,244,246,0.92)]">
              <button
                onClick={() => { setDrawerView('list'); setEditingTodo(null); setTitle(''); setPriority('P2'); setStatusId(null); setCategoryId(null); setBusinessLineId(null); setDeadline(''); setShowInCalendar(false); setNotes(''); }}
                className="px-3 py-1.5 text-gray-500/70 text-[11px] font-semibold rounded-lg hover:bg-white/30 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAdd}
                disabled={!title.trim()}
                className="px-4 py-1.5 bg-emerald-500/90 text-white text-[11px] font-semibold rounded-lg shadow-sm hover:bg-emerald-600 disabled:opacity-40 transition-colors"
              >
                {editingTodo ? '保存' : '添加'}
              </button>
            </div>
          </div>
        )}

        {/* Todo list view */}
        {drawerView === 'list' && (
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {/* Group-by selector */}
            {activeTodos.length > 0 && (
              <div className="flex items-center gap-1.5 pb-2 border-b border-white/20 mb-2">
                <span className="text-[10px] text-gray-400/70 font-medium">聚合</span>
                {([
                  { key: 'priority', label: '优先级' },
                  { key: 'category', label: '分类' },
                  { key: 'businessLine', label: '业务线' },
                ] as const).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setGroupBy(opt.key)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all ${
                      groupBy === opt.key
                        ? 'bg-emerald-500/15 text-emerald-700 border border-emerald-300/30'
                        : 'text-gray-500/70 hover:bg-white/40'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {activeTodos.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400/60">
                <CheckSquare size={28} className="mb-2 opacity-40" />
                <span className="text-xs">暂无待办事项</span>
                <button
                  onClick={() => setDrawerView('add')}
                  className="mt-3 text-[11px] text-emerald-600/80 hover:text-emerald-700 font-semibold"
                >
                  + 创建第一个 TODO
                </button>
              </div>
            )}

            {groupedActiveTodos.map((group) => (
              <div key={group.key} className="mb-3">
                <div className="flex items-center gap-2 mb-1.5 px-1">
                  {group.color && (
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: group.color }} />
                  )}
                  <span className="text-[11px] font-semibold text-gray-600/80">{group.label}</span>
                  <span className="text-[10px] text-gray-400/60">{group.items.length}</span>
                </div>
                <div className="space-y-1.5">
                  {group.items.map((todo) => (
                    <TodoItemRow
                      key={todo.id}
                      todo={todo}
                      onToggle={() => toggleTodoComplete(todo.id)}
                      onDelete={() => deleteTodo(todo.id)}
                      onEdit={() => handleStartEdit(todo)}
                      onToggleCalendar={() => updateTodo(todo.id, { showInCalendar: !todo.showInCalendar })}
                      onCreateEvent={() => handleCreateEvent(todo)}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Completed section */}
            {completedTodos.length > 0 && (
              <div className="pt-2">
                <button
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="flex items-center gap-1.5 text-[11px] text-gray-400/70 font-semibold hover:text-gray-600 transition-colors mb-2"
                >
                  {showCompleted ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  已完成 ({completedTodos.length})
                </button>
                {showCompleted && completedTodos.map((todo) => (
                  <div key={todo.id} className="mb-2">
                    <TodoItemRow
                      todo={todo}
                      onToggle={() => toggleTodoComplete(todo.id)}
                      onDelete={() => deleteTodo(todo.id)}
                      onEdit={() => handleStartEdit(todo)}
                      onToggleCalendar={() => updateTodo(todo.id, { showInCalendar: !todo.showInCalendar })}
                      onCreateEvent={() => handleCreateEvent(todo)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
