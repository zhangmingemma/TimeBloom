import { useState } from 'react';
import { X, Trash2, Clock, Tag, FileText, Plus, Check, Layers } from 'lucide-react';
import { format } from 'date-fns';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../store/useStore';
import { CalendarEvent, UserCategory, UserBusinessLine, CATEGORY_COLORS, BUSINESS_COLORS, EMOJI_GROUPS } from '../types';

const CAT_EMOJI_GROUPS = EMOJI_GROUPS.filter((g) => !g.label.startsWith('😊'));
const CAT_ALL_EMOJIS = CAT_EMOJI_GROUPS.flatMap((g) => g.emojis);

function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

function addOneHour(time: string): string {
  const [h, m] = time.split(':').map(Number);
  return `${Math.min(h + 1, 23).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function clampTime(time: string): string {
  if (time < '08:00') return '08:00';
  if (time > '23:59') return '23:59';
  return time;
}

// Flatten all emojis for the quick picker
const ALL_EMOJIS = EMOJI_GROUPS.flatMap((g) => g.emojis);

// ── Custom TimeInput ──────────────────────────────────────────────────────────
// Uses text inputs with local buffering during focus so the user can freely
// type digits (e.g. "1" then "3" → "13") without intermediate clamping.
interface TimeInputProps {
  value: string;
  onChange: (v: string) => void;
  minHour?: number;
  maxHour?: number;
}

function TimeInput({ value, onChange, minHour = 8, maxHour = 23 }: TimeInputProps) {
  const [hStr, mStr] = value.split(':');
  const h = parseInt(hStr) || minHour;
  const m = parseInt(mStr) || 0;

  // Local draft while the field is focused
  const [draftH, setDraftH] = useState<string | null>(null);
  const [draftM, setDraftM] = useState<string | null>(null);

  const commitH = (raw: string) => {
    const num = parseInt(raw);
    const clamped = isNaN(num) ? minHour : Math.max(minHour, Math.min(maxHour, num));
    onChange(`${clamped.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    setDraftH(null);
  };

  const commitM = (raw: string) => {
    const num = parseInt(raw);
    const clamped = isNaN(num) ? 0 : Math.max(0, Math.min(59, num));
    onChange(`${h.toString().padStart(2, '0')}:${clamped.toString().padStart(2, '0')}`);
    setDraftM(null);
  };

  return (
    <div className="flex-1 flex items-center px-3 py-2 glass-input rounded-xl focus-within:border-emerald-400 transition-colors">
      <input
        type="text"
        inputMode="numeric"
        value={draftH ?? h.toString().padStart(2, '0')}
        maxLength={2}
        onFocus={(e) => { setDraftH(h.toString().padStart(2, '0')); e.target.select(); }}
        onChange={(e) => setDraftH(e.target.value.replace(/\D/g, '').slice(0, 2))}
        onBlur={(e) => commitH(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        className="w-6 text-center bg-transparent text-sm font-medium outline-none text-gray-700 tabular-nums"
      />
      <span className="text-gray-400 font-bold text-sm select-none px-0.5">:</span>
      <input
        type="text"
        inputMode="numeric"
        value={draftM ?? m.toString().padStart(2, '0')}
        maxLength={2}
        onFocus={(e) => { setDraftM(m.toString().padStart(2, '0')); e.target.select(); }}
        onChange={(e) => setDraftM(e.target.value.replace(/\D/g, '').slice(0, 2))}
        onBlur={(e) => commitM(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        className="w-6 text-center bg-transparent text-sm font-medium outline-none text-gray-700 tabular-nums"
      />
    </div>
  );
}

// ── Inline quick-create category form ──────────────────────────────────────
interface QuickCategoryFormProps {
  onCreated: (cat: UserCategory) => void;
  onCancel: () => void;
}

function QuickCategoryForm({ onCreated, onCancel }: QuickCategoryFormProps) {
  const addCategory = useStore((s) => s.addCategory);
  const [name, setName] = useState('');
  const [color, setColor] = useState(CATEGORY_COLORS[5]);
  const [emoji, setEmoji] = useState('📌');

  const handleCreate = () => {
    if (!name.trim()) return;
    const cat: UserCategory = { id: generateId(), name: name.trim(), color, emoji };
    addCategory(cat);
    onCreated(cat);
  };

  return (
    <div className="mt-2 p-3 rounded-xl border-2 border-dashed space-y-2.5"
      style={{ borderColor: color, backgroundColor: `${color}0d` }}>
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0 font-bold"
          style={{ backgroundColor: `${color}22`, border: `2px solid ${color}` }}
        >
          {emoji}
        </div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') onCancel(); }}
          placeholder="分类名称…"
          maxLength={12}
          autoFocus
          className="flex-1 px-2.5 py-1.5 bg-white/60 rounded-lg text-sm border border-white/50 focus:outline-none focus:border-emerald-400 font-medium"
        />
      </div>

      <div className="flex flex-wrap gap-1.5 mb-1">
        {CATEGORY_COLORS.map((c) => (
          <button key={c} onClick={() => setColor(c)}
            className="w-5 h-5 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
            style={{ backgroundColor: c }}>
            {color === c && <Check size={10} className="text-white drop-shadow" />}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-10 gap-0.5 max-h-16 overflow-y-auto">
        {CAT_ALL_EMOJIS.map((e) => (
          <button
            key={e}
            onClick={() => setEmoji(e)}
            className={`text-lg h-7 rounded flex items-center justify-center transition-all hover:scale-110 ${
              emoji === e ? 'scale-110' : 'hover:bg-white/40'
            }`}
            style={emoji === e ? { outline: `2px solid ${color}`, backgroundColor: `${color}22`, borderRadius: 6 } : {}}
          >
            {e}
          </button>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-3 py-1 text-gray-400 hover:bg-white/50 rounded-lg text-xs font-semibold transition-colors"
        >
          取消
        </button>
        <button
          onClick={handleCreate}
          disabled={!name.trim()}
          className="px-3 py-1 text-white rounded-lg text-xs font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
          style={{ backgroundColor: color }}
        >
          创建分类
        </button>
      </div>
    </div>
  );
}

// ── Inline quick-create business line form ─────────────────────────────────
interface QuickBusinessLineFormProps {
  onCreated: (bl: UserBusinessLine) => void;
  onCancel: () => void;
}

function QuickBusinessLineForm({ onCreated, onCancel }: QuickBusinessLineFormProps) {
  const addBusinessLine = useStore((s) => s.addBusinessLine);
  const [name, setName] = useState('');
  const [color, setColor] = useState(BUSINESS_COLORS[11]);
  const [emoji, setEmoji] = useState('🚀');

  const handleCreate = () => {
    if (!name.trim()) return;
    const bl: UserBusinessLine = { id: generateId(), name: name.trim(), color, emoji };
    addBusinessLine(bl);
    onCreated(bl);
  };

  return (
    <div className="mt-2 p-3 rounded-xl border-2 border-dashed space-y-2.5"
      style={{ borderColor: color, backgroundColor: `${color}0d` }}>
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0 font-bold"
          style={{ backgroundColor: `${color}22`, border: `2px solid ${color}` }}
        >
          {emoji}
        </div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') onCancel(); }}
          placeholder="业务线名称…"
          maxLength={12}
          autoFocus
          className="flex-1 px-2.5 py-1.5 bg-white/60 rounded-lg text-sm border border-white/50 focus:outline-none focus:border-blue-400 font-medium"
        />
      </div>

      <div className="flex flex-wrap gap-1.5 mb-1">
        {BUSINESS_COLORS.map((c) => (
          <button key={c} onClick={() => setColor(c)}
            className="w-5 h-5 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
            style={{ backgroundColor: c }}>
            {color === c && <Check size={10} className="text-white drop-shadow" />}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-10 gap-0.5 max-h-16 overflow-y-auto">
        {ALL_EMOJIS.map((e) => (
          <button
            key={e}
            onClick={() => setEmoji(e)}
            className={`text-lg h-7 rounded flex items-center justify-center transition-all hover:scale-110 ${
              emoji === e ? 'scale-110' : 'hover:bg-white/40'
            }`}
            style={emoji === e ? { outline: `2px solid ${color}`, backgroundColor: `${color}22`, borderRadius: 6 } : {}}
          >
            {e}
          </button>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-3 py-1 text-gray-400 hover:bg-white/50 rounded-lg text-xs font-semibold transition-colors"
        >
          取消
        </button>
        <button
          onClick={handleCreate}
          disabled={!name.trim()}
          className="px-3 py-1 text-white rounded-lg text-xs font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
          style={{ backgroundColor: color }}
        >
          创建业务线
        </button>
      </div>
    </div>
  );
}

// ── Main EventModal ─────────────────────────────────────────────────────────
export function EventModal() {
  const { modal, categories, businessLines, closeModal, addEvent, updateEvent, deleteEvent } = useStore(
    useShallow((s) => ({
      modal: s.modal,
      categories: s.categories,
      businessLines: s.businessLines,
      closeModal: s.closeModal,
      addEvent: s.addEvent,
      updateEvent: s.updateEvent,
      deleteEvent: s.deleteEvent,
    }))
  );
  const { event, defaultDate, defaultStartTime, defaultEndTime } = modal;

  const today = format(new Date(), 'yyyy-MM-dd');
  const rawStart = event?.startTime ?? defaultStartTime ?? '09:00';
  const initialStart = clampTime(rawStart);
  const rawEnd = event?.endTime ?? defaultEndTime ?? addOneHour(rawStart);
  const initialEnd = clampTime(rawEnd > rawStart ? rawEnd : addOneHour(rawStart));

  const [title, setTitle] = useState(event?.title ?? '');
  const [date, setDate] = useState(event?.date ?? defaultDate ?? today);
  const [startTime, setStartTime] = useState(initialStart);
  const [endTime, setEndTime] = useState(initialEnd);
  const [categoryId, setCategoryId] = useState<string | null>(
    event?.categoryId ?? (categories[0]?.id ?? null)
  );
  const [businessLineId, setBusinessLineId] = useState<string | null>(
    event?.businessLineId ?? null
  );
  const [notes, setNotes] = useState(event?.notes ?? '');
  const [error, setError] = useState('');
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [showQuickCreateBL, setShowQuickCreateBL] = useState(false);

  const isEditing = !!event && !!event.id;
  const selectedCat = categories.find((c) => c.id === categoryId) ?? null;
  const accentColor = selectedCat?.color ?? '#10b981';

  const handleStartChange = (val: string) => {
    setStartTime(val);
    setError('');
    if (val >= endTime) setEndTime(addOneHour(val));
  };

  const handleSave = () => {
    if (!title.trim()) { setError('请输入事件标题'); return; }
    if (startTime >= endTime) { setError('结束时间必须晚于开始时间'); return; }

    const payload: CalendarEvent = {
      id: event?.id || generateId(),
      title: title.trim(),
      date,
      startTime,
      endTime,
      categoryId,
      businessLineId: businessLineId ?? null,
      notes: notes.trim() || undefined,
    };
    if (isEditing) updateEvent(event.id, payload);
    else addEvent(payload);
    closeModal();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.target instanceof HTMLInputElement) handleSave();
    if (e.key === 'Escape') closeModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onKeyDown={handleKey}>
      <div className="absolute inset-0 bg-black/25" onClick={closeModal} />

      <div className="relative glass-modal rounded-2xl w-full max-w-sm mx-4 overflow-hidden no-drag flex flex-col max-h-[90vh]">
        {/* Color accent */}
        <div className="h-1 w-full flex-shrink-0" style={{ backgroundColor: accentColor }} />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/30 flex-shrink-0">
          <h2 className="text-sm font-bold text-gray-800">{isEditing ? '编辑事件' : '新建事件'}</h2>
          <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-white/50 text-gray-400">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable form body */}
        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setError(''); }}
            placeholder="事件标题…"
            autoFocus
            className="w-full text-base font-semibold border-0 border-b-2 border-white/40 focus:border-emerald-400 outline-none pb-2 transition-colors placeholder:text-gray-300 bg-transparent"
          />

          {/* Category */}
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              <Tag size={10} /> 分类
            </label>

            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setCategoryId(null)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition-all border ${
                  categoryId === null
                    ? 'bg-gray-700/80 text-white border-gray-700/50'
                    : 'bg-white/40 text-gray-500 border-white/50 hover:bg-white/60'
                }`}
              >
                📌 无分类
              </button>

              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setCategoryId(cat.id); setShowQuickCreate(false); }}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition-all border ${
                    categoryId === cat.id
                      ? 'text-white shadow-sm scale-105 border-transparent'
                      : 'bg-white/40 text-gray-500 border-white/50 hover:bg-white/60'
                  }`}
                  style={categoryId === cat.id ? { backgroundColor: cat.color } : {}}
                >
                  {cat.emoji} {cat.name}
                </button>
              ))}

              {!showQuickCreate && (
                <button
                  onClick={() => setShowQuickCreate(true)}
                  className="flex items-center gap-0.5 px-2.5 py-1.5 rounded-full text-[11px] font-semibold text-emerald-600 bg-emerald-50/50 hover:bg-emerald-100/50 border border-dashed border-emerald-300/50 transition-colors"
                >
                  <Plus size={11} /> 新建分类
                </button>
              )}
            </div>

            {showQuickCreate && (
              <QuickCategoryForm
                onCreated={(cat) => { setCategoryId(cat.id); setShowQuickCreate(false); }}
                onCancel={() => setShowQuickCreate(false)}
              />
            )}
          </div>

          {/* Business Line */}
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              <Layers size={10} /> 业务线
            </label>

            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setBusinessLineId(null)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition-all border ${
                  businessLineId === null
                    ? 'bg-gray-700/80 text-white border-gray-700/50'
                    : 'bg-white/40 text-gray-500 border-white/50 hover:bg-white/60'
                }`}
              >
                — 无业务线
              </button>

              {businessLines.map((bl) => (
                <button
                  key={bl.id}
                  onClick={() => { setBusinessLineId(bl.id); setShowQuickCreateBL(false); }}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition-all border ${
                    businessLineId === bl.id
                      ? 'text-white shadow-sm scale-105 border-transparent'
                      : 'bg-white/40 text-gray-500 border-white/50 hover:bg-white/60'
                  }`}
                  style={businessLineId === bl.id ? { backgroundColor: bl.color } : {}}
                >
                  {bl.emoji} {bl.name}
                </button>
              ))}

              {!showQuickCreateBL && (
                <button
                  onClick={() => setShowQuickCreateBL(true)}
                  className="flex items-center gap-0.5 px-2.5 py-1.5 rounded-full text-[11px] font-semibold text-blue-600 bg-blue-50/50 hover:bg-blue-100/50 border border-dashed border-blue-300/50 transition-colors"
                >
                  <Plus size={11} /> 新建业务线
                </button>
              )}
            </div>

            {showQuickCreateBL && (
              <QuickBusinessLineForm
                onCreated={(bl) => { setBusinessLineId(bl.id); setShowQuickCreateBL(false); }}
                onCancel={() => setShowQuickCreateBL(false)}
              />
            )}
          </div>

          {/* Date & Time */}
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              <Clock size={10} /> 时间
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 glass-input rounded-xl text-sm focus:outline-none focus:border-emerald-400 mb-2"
            />
            <div className="flex items-center gap-2">
              <TimeInput value={startTime} onChange={handleStartChange} />
              <span className="text-gray-300">→</span>
              <TimeInput value={endTime} onChange={(v) => { setEndTime(v); setError(''); }} />
            </div>
            <p className="text-[10px] text-gray-400 mt-1 pl-1">时间范围：08:00 – 23:59</p>
          </div>

          {/* Notes */}
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              <FileText size={10} /> 备注（可选）
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="添加备注…"
              rows={2}
              className="w-full px-3 py-2 glass-input rounded-xl text-sm focus:outline-none focus:border-emerald-400 resize-none placeholder:text-gray-300"
            />
          </div>

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 flex items-center justify-between border-t border-white/30 flex-shrink-0">
          {isEditing ? (
            <button
              onClick={() => { deleteEvent(event.id); closeModal(); }}
              className="flex items-center gap-1.5 px-3 py-2 text-red-400 hover:bg-red-50/50 rounded-xl text-xs font-semibold"
            >
              <Trash2 size={13} /> 删除
            </button>
          ) : <div />}

          <div className="flex gap-2">
            <button onClick={closeModal} className="px-4 py-2 text-gray-400 hover:bg-white/50 rounded-xl text-xs font-semibold">
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 text-white rounded-xl text-xs font-semibold shadow-sm hover:opacity-90"
              style={{ backgroundColor: accentColor }}
            >
              {isEditing ? '保存' : '创建'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
