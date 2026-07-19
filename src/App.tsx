import { useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from './store/useStore';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { WeekView } from './components/WeekView';
import { DayView } from './components/DayView';
import { MonthView } from './components/MonthView';
import { StatsView } from './components/StatsView';
import { EventModal } from './components/EventModal';
import { CategoryModal } from './components/CategoryModal';
import { BusinessLineModal } from './components/BusinessLineModal';
import { ImportModal } from './components/ImportModal';
import { TodoDrawer } from './components/TodoDrawer';

declare global {
  interface Window {
    electronAPI?: {
      platform: string;
      loadData: () => Promise<Record<string, unknown> | null>;
      saveData: (data: Record<string, unknown>) => Promise<boolean>;
      dataPath: () => Promise<string>;
      scanActivities: (date: string) => Promise<{
        ok: boolean;
        activities: import('./types').DetectedActivity[];
        error?: string;
      }>;
      onOpenImport: (callback: (date: string) => void) => void;
      calendarAuth: () => Promise<{ ok: boolean; error?: string }>;
      calendarScan: (date: string) => Promise<{
        ok: boolean;
        activities: import('./types').DetectedActivity[];
        error?: string;
      }>;
      calendarStatus: () => Promise<{ authed: boolean; reason?: string }>;
      calendarLogout: () => Promise<{ ok: boolean }>;
    };
  }
}

export default function App() {
  const { view, modal, categoryModalOpen, businessLineModalOpen, importModalOpen, todoDrawerOpen } = useStore(
    useShallow((s) => ({
      view: s.view,
      modal: s.modal,
      categoryModalOpen: s.categoryModalOpen,
      businessLineModalOpen: s.businessLineModalOpen,
      importModalOpen: s.importModalOpen,
      todoDrawerOpen: s.todoDrawerOpen,
    }))
  );
  const [hydrated, setHydrated] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load persisted data on mount ────────────────────────────────────────
  useEffect(() => {
    async function init() {
      if (window.electronAPI) {
        try {
          const saved = await window.electronAPI.loadData();
          if (saved) {
            useStore.setState((s) => ({
              events: Array.isArray(saved.events) ? (saved.events as typeof s.events) : s.events,
              categories: Array.isArray(saved.categories) ? (saved.categories as typeof s.categories) : s.categories,
              businessLines: Array.isArray(saved.businessLines) ? (saved.businessLines as typeof s.businessLines) : s.businessLines,
              statuses: Array.isArray(saved.statuses) ? (saved.statuses as typeof s.statuses) : s.statuses,
              todos: Array.isArray(saved.todos) ? (saved.todos as typeof s.todos) : s.todos,
              view: (saved.view as typeof s.view) ?? s.view,
              activeCategories: Array.isArray(saved.activeCategories)
                ? (saved.activeCategories as typeof s.activeCategories)
                : s.activeCategories,
            }));
          }
        } catch (e) {
          console.warn('Could not load persisted data:', e);
        }
      }
      setHydrated(true);
    }
    init();
  }, []);

  // ── Listen for scheduled scan notification clicks ──────────────────────
  useEffect(() => {
    if (!window.electronAPI?.onOpenImport) return;
    window.electronAPI.onOpenImport(() => {
      useStore.getState().openImportModal();
    });
  }, []);

  // ── Auto-save on every state change (debounced 600ms) ──────────────────
  useEffect(() => {
    if (!hydrated || !window.electronAPI) return;

    const unsub = useStore.subscribe((state) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        window.electronAPI!.saveData({
          events: state.events,
          categories: state.categories,
          businessLines: state.businessLines,
          statuses: state.statuses,
          todos: state.todos,
          view: state.view,
          activeCategories: state.activeCategories,
        });
      }, 600);
    });

    return () => {
      unsub();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [hydrated]);

  return (
    <div className="flex flex-col h-screen select-none">
      {/* macOS traffic light drag region */}
      <div className="h-7 drag-region bg-transparent flex-shrink-0" />

      <div className="flex flex-1 overflow-hidden px-3 pb-3 gap-3">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden gap-0">
          <Header />
          <main className="flex-1 overflow-hidden flex flex-col glass-card rounded-2xl mt-2">
            {view === 'week' && <WeekView />}
            {view === 'day' && <DayView />}
            {view === 'month' && <MonthView />}
            {view === 'stats' && <StatsView />}
          </main>
        </div>
      </div>

      {modal.open && <EventModal />}
      {categoryModalOpen && <CategoryModal />}
      {businessLineModalOpen && <BusinessLineModal />}
      {importModalOpen && <ImportModal />}
      {todoDrawerOpen && <TodoDrawer />}
    </div>
  );
}
