/** Session-Kontext: aktueller Benutzer und austauschbarer Storage-Adapter. */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { createMockAuth, createMockStorage, type MockStorageAdapter } from '../adapters/mock/mockAdapters';
import type { AuthAdapter, StorageAdapter } from '../adapters/types';
import type { MonthRecord, SessionUser } from '../domain/types';
import { MONTH as DEFAULT_MONTH } from '../adapters/mock/seed';
import type { AttendanceWorkbook } from '../adapters/excel/attendanceWorkbook';
import type { ExcelPersistence } from '../adapters/excel/excelStorage';
import { REVIEW_BUILD } from './reviewBuild';

/** Storage-Oberfläche; get-or-create existiert nur im Demo-Adapter. */
export type AppStorage = StorageAdapter & {
  getOrCreateMonthRecord?: MockStorageAdapter['getOrCreateMonthRecord'];
  /** Nur Adapter, die eine externe Anwesenheitsquelle überlagern können. */
  setAttendanceOverlay?: MockStorageAdapter['setAttendanceOverlay'];
};

export type DataSource =
  | { kind: 'MOCK' }
  | { kind: 'EXCEL'; fileName: string; month: number; year: number };

export interface AttendanceSource {
  workbook: AttendanceWorkbook;
  persistence: ExcelPersistence;
  fileName: string;
}

export interface FormularContext {
  templateBuffer: ArrayBuffer;
  formulareDir: FileSystemDirectoryHandle;
}

interface SessionContextValue {
  user: SessionUser;
  auth: AuthAdapter;
  storage: AppStorage;
  dataSource: DataSource;
  demoUsers: SessionUser[];
  switchUser: (userId: string) => void;
  setExcelStorage: (storage: AppStorage, source: Extract<DataSource, { kind: 'EXCEL' }>) => void;
  attendanceSource: AttendanceSource | null;
  setAttendanceSource: (src: AttendanceSource | null) => void;
  formularContext: FormularContext | null;
  setFormularContext: (ctx: FormularContext | null) => void;
  resetToMock: () => void;
  /** Erhöht sich bei Quellenwechsel; Ansichten laden dann neu. */
  storageVersion: number;
  /** Ansichten neu laden lassen, ohne die Quelle zu wechseln. */
  refreshStorage: () => void;
  /** Jahre, für die Anwesenheitsdaten geladen sind (aus den Blattnamen). */
  attendanceYears: number[];
  setAttendanceYears: (years: number[]) => void;
  /** Global gewählter Monat ('YYYY-MM') — Kopfzeilen-Auswahl, gilt für alle Ansichten. */
  month: string;
  setMonth: (ym: string) => void;
  /**
   * Gesamtübersicht statt Einzelmonat — steuert Dashboard & Pipeline.
   * Andere Ansichten (Anwesenheitsliste, TN-Detail, Formular) brauchen
   * immer einen konkreten Monat und ignorieren dieses Flag.
   */
  showAllMonths: boolean;
  setShowAllMonths: (v: boolean) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const auth = useMemo(() => createMockAuth('u-mira'), []);
  const mock = useMemo(() => createMockStorage(), []);
  const [user, setUser] = useState<SessionUser>(auth.currentUser());
  const [storage, setStorage] = useState<AppStorage>(mock);
  const [dataSource, setDataSource] = useState<DataSource>({ kind: 'MOCK' });
  const [storageVersion, setStorageVersion] = useState(0);
  const [attendanceYears, setAttendanceYears] = useState<number[]>([]);
  const [attendanceSource, setAttendanceSourceState] = useState<AttendanceSource | null>(null);
  const [formularContext, setFormularContext] = useState<FormularContext | null>(null);
  const [month, setMonth] = useState<string>(DEFAULT_MONTH);
  /** Start in der Gesamtübersicht — Dashboard/Pipeline zeigen erst die Summe über alle Monate. */
  const [showAllMonths, setShowAllMonths] = useState(true);

  const switchUser = (userId: string) => {
    auth.switchUser?.(userId);
    setUser(auth.currentUser());
  };

  const setExcelStorage: SessionContextValue['setExcelStorage'] = (next, source) => {
    // Review build: mock data only, no matter what a caller passes in —
    // the last line of defense behind the disabled UI in DataSourceSettings.
    if (REVIEW_BUILD) return;
    setStorage(next);
    setDataSource(source);
    setMonth(`${source.year}-${String(source.month).padStart(2, '0')}`);
    setStorageVersion((v) => v + 1);
  };

  const setAttendanceSource = (src: AttendanceSource | null) => {
    setAttendanceSourceState(src);
    setStorageVersion((v) => v + 1);
  };

  const resetToMock = () => {
    setStorage(mock);
    setMonth(DEFAULT_MONTH);
    setShowAllMonths(true);
    setDataSource({ kind: 'MOCK' });
    setAttendanceSourceState(null);
    setFormularContext(null);
    setStorageVersion((v) => v + 1);
  };

  const value: SessionContextValue = {
    user,
    auth,
    storage,
    dataSource,
    demoUsers: auth.listDemoUsers?.() ?? [],
    switchUser,
    setExcelStorage,
    attendanceSource,
    setAttendanceSource,
    formularContext,
    setFormularContext,
    resetToMock,
    storageVersion,
    refreshStorage: () => setStorageVersion((v) => v + 1),
    attendanceYears,
    setAttendanceYears,
    month,
    setMonth,
    showAllMonths,
    setShowAllMonths,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}

export type { MonthRecord };
