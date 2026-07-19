import { useState } from 'react';
import { X, Pencil, Trash2, Plus, Check } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../store/useStore';
import { UserBusinessLine, BUSINESS_COLORS, EMOJI_GROUPS } from '../types';

function generateId() {
  return `bl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

interface FormState {
  name: string;
  color: string;
  emoji: string;
}

const DEFAULT_FORM: FormState = {
  name: '',
  color: BUSINESS_COLORS[11],
  emoji: '🚀',
};

type Mode = 'list' | { type: 'create' } | { type: 'edit'; bl: UserBusinessLine };

export function BusinessLineModal() {
  const { businessLines, addBusinessLine, updateBusinessLine, deleteBusinessLine, closeBusinessLineModal } =
    useStore(useShallow((s) => ({
      businessLines: s.businessLines,
      addBusinessLine: s.addBusinessLine,
      updateBusinessLine: s.updateBusinessLine,
      deleteBusinessLine: s.deleteBusinessLine,
      closeBusinessLineModal: s.closeBusinessLineModal,
    })));

  const [mode, setMode] = useState<Mode>('list');
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [nameError, setNameError] = useState('');
  const [emojiGroup, setEmojiGroup] = useState(0);

  const openCreate = () => {
    setForm(DEFAULT_FORM);
    setNameError('');
    setMode({ type: 'create' });
  };

  const openEdit = (bl: UserBusinessLine) => {
    setForm({ name: bl.name, color: bl.color, emoji: bl.emoji });
    setNameError('');
    setMode({ type: 'edit', bl });
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      setNameError('请输入业务线名称');
      return;
    }

    if (mode === 'list') return;

    if (mode.type === 'create') {
      addBusinessLine({
        id: generateId(),
        name: form.name.trim(),
        color: form.color,
        emoji: form.emoji,
      });
    } else {
      updateBusinessLine(mode.bl.id, {
        name: form.name.trim(),
        color: form.color,
        emoji: form.emoji,
      });
    }
    setMode('list');
  };

  const handleDelete = (id: string) => {
    deleteBusinessLine(id);
  };

  const isFormMode = mode !== 'list';
  const isCreating = isFormMode && mode.type === 'create';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/25" onClick={closeBusinessLineModal} />

      <div className="relative glass-modal rounded-2xl w-full max-w-sm mx-4 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/30 flex-shrink-0">
          <h2 className="text-sm font-bold text-gray-800">管理业务线</h2>
          <button
            onClick={closeBusinessLineModal}
            className="p-1.5 rounded-lg hover:bg-white/50 text-gray-400"
          >
            <X size={16} />
          </button>
        </div>

        {/* Business line list */}
        <div className="flex-1 overflow-y-auto">
          {businessLines.length === 0 && !isFormMode ? (
            <div className="py-10 text-center text-gray-400">
              <p className="text-3xl mb-2">🚀</p>
              <p className="text-sm">还没有业务线，点击下方创建</p>
            </div>
          ) : (
            <div className="p-3 space-y-1.5">
              {businessLines.map((bl) => (
                <div
                  key={bl.id}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/30 group"
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: bl.color }}
                  />
                  <span className="text-base">{bl.emoji}</span>
                  <span className="flex-1 text-sm font-medium text-gray-700">{bl.name}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(bl)}
                      className="p-1.5 rounded-lg hover:bg-white/50 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(bl.id)}
                      className="p-1.5 rounded-lg hover:bg-white/50 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Inline form */}
          {isFormMode && (
            <div className="px-4 pb-4">
              <div className="border border-blue-200/50 rounded-xl p-4 bg-blue-50/20 space-y-3">
                <p className="text-xs font-bold text-blue-700">
                  {isCreating ? '新建业务线' : '编辑业务线'}
                </p>

                {/* Emoji preview + name */}
                <div className="flex items-center gap-2">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ backgroundColor: `${form.color}20`, border: `2px solid ${form.color}` }}
                  >
                    {form.emoji}
                  </div>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, name: e.target.value }));
                      setNameError('');
                    }}
                    placeholder="业务线名称…"
                    maxLength={12}
                    autoFocus
                    className="flex-1 px-3 py-2 bg-white/60 rounded-xl text-sm border border-white/50 focus:outline-none focus:border-blue-400 transition-colors font-medium"
                  />
                </div>
                {nameError && <p className="text-xs text-red-500">{nameError}</p>}

                {/* Color picker */}
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">颜色</p>
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {BUSINESS_COLORS.map((c) => (
                      <button key={c} onClick={() => setForm((f) => ({ ...f, color: c }))}
                        className="w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                        style={{ backgroundColor: c }}>
                        {form.color === c && <Check size={12} className="text-white drop-shadow" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Emoji picker */}
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">图标</p>
                  <div className="flex gap-1 mb-2 flex-wrap">
                    {EMOJI_GROUPS.map((g, i) => (
                      <button
                        key={g.label}
                        onClick={() => setEmojiGroup(i)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                          emojiGroup === i
                            ? 'text-white'
                            : 'bg-white/40 text-gray-500 hover:bg-white/60'
                        }`}
                        style={emojiGroup === i ? { backgroundColor: form.color } : {}}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-8 gap-0.5">
                    {EMOJI_GROUPS[emojiGroup].emojis.map((e) => (
                      <button
                        key={e}
                        onClick={() => setForm((f) => ({ ...f, emoji: e }))}
                        className={`text-xl h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 ${
                          form.emoji === e ? 'ring-2 scale-110' : 'hover:bg-white/50'
                        }`}
                        style={form.emoji === e ? { outline: `2px solid ${form.color}`, backgroundColor: `${form.color}20` } : {}}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Form actions */}
                <div className="flex gap-2 justify-end pt-1">
                  <button
                    onClick={() => setMode('list')}
                    className="px-3 py-1.5 text-gray-400 hover:bg-white/50 rounded-xl text-xs font-semibold transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-1.5 text-white rounded-xl text-xs font-semibold transition-colors hover:opacity-90"
                    style={{ backgroundColor: form.color }}
                  >
                    {isCreating ? '创建' : '保存'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer — create button */}
        {!isFormMode && (
          <div className="px-4 pb-4 pt-2 border-t border-white/30 flex-shrink-0">
            <button
              onClick={openCreate}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 border-dashed border-blue-300/50 text-blue-600 text-xs font-semibold hover:bg-blue-50/30 transition-colors"
            >
              <Plus size={14} />
              新建业务线
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
