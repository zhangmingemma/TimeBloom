import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format } from 'date-fns';
import { CalendarEvent, UserCategory, UserBusinessLine, UserStatus, ViewType, TodoItem, Priority } from '../types';

interface ModalState {
  open: boolean;
  event: CalendarEvent | null;
  defaultDate: string | null;
  defaultStartTime: string | null;
  defaultEndTime: string | null;
}

interface StoreState {
  events: CalendarEvent[];
  categories: UserCategory[];
  businessLines: UserBusinessLine[];
  statuses: UserStatus[];
  todos: TodoItem[];
  currentDate: string;
  view: ViewType;
  activeCategories: string[];
  modal: ModalState;
  categoryModalOpen: boolean;
  businessLineModalOpen: boolean;
  importModalOpen: boolean;
  todoDrawerOpen: boolean;
  editingTodoId: string | null;

  addEvent: (event: CalendarEvent) => void;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  batchAddEvents: (events: CalendarEvent[]) => void;

  addCategory: (cat: UserCategory) => void;
  updateCategory: (id: string, updates: Partial<UserCategory>) => void;
  deleteCategory: (id: string) => void;

  addBusinessLine: (bl: UserBusinessLine) => void;
  updateBusinessLine: (id: string, updates: Partial<UserBusinessLine>) => void;
  deleteBusinessLine: (id: string) => void;

  addStatus: (st: UserStatus) => void;
  updateStatus: (id: string, updates: Partial<UserStatus>) => void;
  deleteStatus: (id: string) => void;

  addTodo: (todo: TodoItem) => void;
  updateTodo: (id: string, updates: Partial<TodoItem>) => void;
  deleteTodo: (id: string) => void;
  toggleTodoComplete: (id: string) => void;

  setCurrentDate: (date: Date) => void;
  setView: (view: ViewType) => void;
  toggleCategory: (id: string) => void;
  setActiveCategories: (ids: string[]) => void;

  openModal: (opts?: {
    event?: CalendarEvent;
    date?: string;
    startTime?: string;
    endTime?: string;
  }) => void;
  closeModal: () => void;
  openCategoryModal: () => void;
  closeCategoryModal: () => void;
  openBusinessLineModal: () => void;
  closeBusinessLineModal: () => void;
  openImportModal: () => void;
  closeImportModal: () => void;
  openTodoDrawer: (editingTodoId?: string) => void;
  closeTodoDrawer: () => void;
}

const CLOSED_MODAL: ModalState = {
  open: false,
  event: null,
  defaultDate: null,
  defaultStartTime: null,
  defaultEndTime: null,
};

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      events: [],
      categories: [
        { id: 'dev', name: '开发', color: '#3b82f6', emoji: '💻' },
        { id: 'meeting', name: '会议', color: '#f59e0b', emoji: '🤝' },
        { id: 'learn', name: '学习', color: '#10b981', emoji: '📚' },
        { id: 'life', name: '生活', color: '#8b5cf6', emoji: '🏠' },
        { id: 'exercise', name: '运动', color: '#ef4444', emoji: '💪' },
      ],
      businessLines: [
        { id: 'frontend', name: '前端', color: '#3b82f6', emoji: '🎨' },
        { id: 'backend', name: '后端', color: '#10b981', emoji: '⚙️' },
        { id: 'infra', name: '基建', color: '#6366f1', emoji: '🏗️' },
        { id: 'product', name: '产品', color: '#f59e0b', emoji: '📦' },
      ],
      statuses: [],
      todos: [],
      currentDate: format(new Date(), 'yyyy-MM-dd'),
      view: 'week',
      activeCategories: [],
      modal: CLOSED_MODAL,
      categoryModalOpen: false,
      businessLineModalOpen: false,
      importModalOpen: false,
      todoDrawerOpen: false,
      editingTodoId: null,

      addEvent: (event) =>
        set((s) => ({ events: [...s.events, event] })),

      batchAddEvents: (events) =>
        set((s) => ({ events: [...s.events, ...events] })),

      updateEvent: (id, updates) =>
        set((s) => ({
          events: s.events.map((e) => (e.id === id ? { ...e, ...updates } : e)),
        })),

      deleteEvent: (id) =>
        set((s) => ({ events: s.events.filter((e) => e.id !== id) })),

      addCategory: (cat) =>
        set((s) => ({
          categories: [...s.categories, cat],
          activeCategories: [...s.activeCategories, cat.id],
        })),

      updateCategory: (id, updates) =>
        set((s) => ({
          categories: s.categories.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),

      deleteCategory: (id) =>
        set((s) => ({
          categories: s.categories.filter((c) => c.id !== id),
          activeCategories: s.activeCategories.filter((cid) => cid !== id),
          events: s.events.map((e) =>
            e.categoryId === id ? { ...e, categoryId: null } : e
          ),
        })),

      addBusinessLine: (bl) =>
        set((s) => ({ businessLines: [...s.businessLines, bl] })),

      updateBusinessLine: (id, updates) =>
        set((s) => ({
          businessLines: s.businessLines.map((bl) =>
            bl.id === id ? { ...bl, ...updates } : bl
          ),
        })),

      deleteBusinessLine: (id) =>
        set((s) => ({
          businessLines: s.businessLines.filter((bl) => bl.id !== id),
          events: s.events.map((e) =>
            e.businessLineId === id ? { ...e, businessLineId: null } : e
          ),
        })),

      addStatus: (st) =>
        set((s) => ({ statuses: [...s.statuses, st] })),

      updateStatus: (id, updates) =>
        set((s) => ({
          statuses: s.statuses.map((st) =>
            st.id === id ? { ...st, ...updates } : st
          ),
        })),

      deleteStatus: (id) =>
        set((s) => ({
          statuses: s.statuses.filter((st) => st.id !== id),
          todos: s.todos.map((t) =>
            t.statusId === id ? { ...t, statusId: null } : t
          ),
        })),

      addTodo: (todo) =>
        set((s) => ({ todos: [...s.todos, todo] })),

      updateTodo: (id, updates) =>
        set((s) => ({
          todos: s.todos.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),

      deleteTodo: (id) =>
        set((s) => ({ todos: s.todos.filter((t) => t.id !== id) })),

      toggleTodoComplete: (id) =>
        set((s) => ({
          todos: s.todos.map((t) => {
            if (t.id !== id) return t;
            const completed = !t.completed;
            return {
              ...t,
              completed,
              completedAt: completed ? format(new Date(), 'yyyy-MM-dd') : undefined,
              showInCalendar: completed ? false : t.showInCalendar,
            };
          }),
        })),

      setCurrentDate: (date) =>
        set({ currentDate: format(date, 'yyyy-MM-dd') }),

      setView: (view) => set({ view }),

      toggleCategory: (id) =>
        set((s) => ({
          activeCategories: s.activeCategories.includes(id)
            ? s.activeCategories.filter((c) => c !== id)
            : [...s.activeCategories, id],
        })),

      setActiveCategories: (ids) => set({ activeCategories: ids }),

      openModal: (opts = {}) =>
        set({
          modal: {
            open: true,
            event: opts.event ?? null,
            defaultDate: opts.date ?? null,
            defaultStartTime: opts.startTime ?? null,
            defaultEndTime: opts.endTime ?? null,
          },
        }),

      closeModal: () => set({ modal: CLOSED_MODAL }),

      openCategoryModal: () => set({ categoryModalOpen: true }),
      closeCategoryModal: () => set({ categoryModalOpen: false }),
      openBusinessLineModal: () => set({ businessLineModalOpen: true }),
      closeBusinessLineModal: () => set({ businessLineModalOpen: false }),
      openImportModal: () => set({ importModalOpen: true }),
      closeImportModal: () => set({ importModalOpen: false }),
      openTodoDrawer: (editingTodoId?: string) => set({ todoDrawerOpen: true, editingTodoId: editingTodoId || null }),
      closeTodoDrawer: () => set({ todoDrawerOpen: false, editingTodoId: null }),
    }),
    {
      name: 'timebloom-data-v2',
      partialize: (s) => ({
        events: s.events,
        categories: s.categories,
        businessLines: s.businessLines,
        statuses: s.statuses,
        todos: s.todos,
        view: s.view,
        activeCategories: s.activeCategories,
      }),
    }
  )
);
