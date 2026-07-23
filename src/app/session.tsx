/** Session-Kontext: aktueller Benutzer und austauschbarer Storage-Adapter. */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { createMockAuth, createMockStorage, type MockStorageAdapter } from '../adapters/mock/mockAdapters';
import type { AuthAdapter, StorageAdapter } from '../adapters/types';
import type { MonthRecord, SessionUser } from '../domain/types';
import type { AttendanceWorkbook } from '../adapters/excel/attendanceWorkbook';
import type { ExcelPersistence } from '../adapters/excel/excelStorage';

/** Storage-Oberfläche; get-or-create existiert nur im Demo-Adapter. */
export type AppStorage = StorageAdapter & {
  getOrCreateMonthRecord?: MockStorageAdapter['getOrCreateMonthRecord'];
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
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const auth = useMemo(() => createMockAuth('u-selin'), []);
  const mock = useMemo(() => createMockStorage(), []);
  const [user, setUser] = useState<SessionUser>(auth.currentUser());
  const [storage, setStorage] = useState<AppStorage>(mock);
  const [dataSource, setDataSource] = useState<DataSource>({ kind: 'MOCK' });
  const [storageVersion, setStorageVersion] = useState(0);
  const [attendanceSource, setAttendanceSourceState] = useState<AttendanceSource | null>(null);
  const [formularContext, setFormularContext] = useState<FormularContext | null>(null);

  const switchUser = (userId: string) => {
    auth.switchUser?.(userId);
    setUser(auth.currentUser());
  };

  const setExcelStorage: SessionContextValue['setExcelStorage'] = (next, source) => {
    setStorage(next);
    setDataSource(source);
    setStorageVersion((v) => v + 1);
  };

  const setAttendanceSource = (src: AttendanceSource | null) => {
    setAttendanceSourceState(src);
    setStorageVersion((v) => v + 1);
  };

  const resetToMock = () => {
    setStorage(mock);
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
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}

export type { MonthRecord };
