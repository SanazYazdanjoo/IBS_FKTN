import { useState, type ReactNode } from 'react';
import {
  HashRouter,
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { ErrorBoundary } from './ErrorBoundary';
import { SessionProvider, useSession } from './session';
import { RulesProvider } from './rules-context';
import { VmtFaresProvider } from './vmt-fares-context';
import { VmtTariffProvider } from './vmt-tariff-context';
import { ParticipantNamesProvider } from './participant-names';
import { LocaleProvider, useLocale } from '../i18n/LocaleContext';
import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from '../i18n/translations';
import HeaderSearch from './HeaderSearch';
import { LoggingProvider, useScreenLog } from '../logging/react.tsx';
import { DevPanel } from '../logging/DevPanel.tsx';
import { screenForPath, SCREEN_DICT } from '../logging/events.ts';
import { version as appVersion } from '../../package.json';
import { REVIEW_BUILD, GIT_SHA } from './reviewBuild';
import LoggingSettings from '../features/settings/LoggingSettings';
import TnFlow from '../features/tn/TnFlow';
import TnCorrection from '../features/tn/Correction';
import Uebersicht from '../features/admin/Uebersicht';
import YearOverview from '../features/admin/YearOverview';
import YearCalendar from '../features/admin/YearCalendar';
import CalendarOverlay from './CalendarOverlay';
import { AutoReminderEmails, Documentation } from '../features/docs/Placeholders';
import Vergleichsrechnung from '../features/admin/Vergleichsrechnung';
import RatesManagement from '../features/admin/RatesManagement';
import TnData from '../features/admin/TnData';
import AuditLogScreen from '../features/admin/AuditLog';
import TnDetail from '../features/admin/TnDetail';
import FormularScreen from '../features/admin/Formular';
import DozentAttendance from '../features/dozent/Attendance';
import ManagerQueue from '../features/manager/Queue';
import SignatureSettings from '../features/settings/SignatureSettings';
import DataSourceSettings from '../features/settings/DataSourceSettings';
import TaskBar from '../features/review-tasks/TaskBar';
import ReviewFeedbackScreen from '../features/review-tasks/FeedbackScreen';
import FeedbackButton from '../features/feedback/FeedbackButton';
import FeedbackLog from '../features/feedback/FeedbackLog';
import { RoleChip } from './ui';

function roleHome(role: string): string {
  switch (role) {
    case 'TN':
      return '/tn';
    case 'DOZENT':
      return '/dozent';
    case 'MANAGER':
      return '/manager';
    case 'ACCOUNTING':
      return '/admin';
    default:
      return '/admin';
  }
}

interface NavItem {
  to: string;
  label: string;
  roles: string[];
  end?: boolean;
  /** Noch nicht fertig — gedaempft dargestellt, aber erreichbar. */
  pending?: boolean;
  /** Ans untere Ende der Navigation. */
  footer?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/tn', label: 'Mein Monat', roles: ['TN'], end: true },
  { to: '/tn/correction', label: 'Korrektur', roles: ['TN'] },
  { to: '/admin', label: 'Übersicht', roles: ['ADMIN', 'ACCOUNTING'], end: true },
  { to: '/dozent', label: 'Anwesenheit', roles: ['DOZENT', 'ADMIN'] },
  { to: '/admin/daten', label: 'TN-Daten', roles: ['ADMIN', 'DOZENT'] },
  { to: '/vergleichsrechnung', label: 'Vergleichsrechnung', roles: ['ADMIN', 'ACCOUNTING'] },
  { to: '/admin/raten', label: 'Raten & Tarife', roles: ['ADMIN', 'ACCOUNTING'] },
  { to: '/manager', label: 'Freigaben', roles: ['MANAGER', 'ADMIN'] },
  { to: '/reminder', label: '(WIP) Auto-Reminder Emails', roles: ['ADMIN'], pending: true },
  { to: '/settings', label: '(WIP) Einstellungen', roles: ['ADMIN'], end: true, pending: true },
  { to: '/settings/data', label: '(WIP) Datenquelle', roles: ['ADMIN'], pending: true },
  { to: '/admin/protokoll', label: 'Log History', roles: ['ADMIN'] },
  {
    to: '/settings/logging',
    label: '(WIP) Datenschutz & Protokoll',
    roles: ['TN', 'ADMIN', 'DOZENT', 'MANAGER', 'ACCOUNTING'],
    footer: true,
  },
  {
    to: '/dokumentation',
    label: '(WIP) Documentation',
    roles: ['ADMIN', 'DOZENT', 'MANAGER', 'ACCOUNTING'],
    footer: true,
  },
  // Review build only — where collected feedback is reviewed/exported afterwards.
  ...(REVIEW_BUILD
    ? [{ to: '/review/log', label: 'Feedback-Protokoll', roles: ['ADMIN'], footer: true } as NavItem]
    : []),
];

/**
 * Ein Navigationseintrag. Unfertige Bereiche sind gedaempft und mit einem
 * Titel versehen — erreichbar, aber erkennbar noch nicht fertig.
 */
function SidebarLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      title={item.pending ? `${item.label} — in Arbeit` : undefined}
      className={({ isActive }) =>
        `block rounded-lg px-3 py-2 text-sm font-medium transition ${
          isActive
            ? 'bg-primary text-white'
            : item.pending
              ? 'text-ink-dim/60 hover:bg-muted hover:text-ink-dim'
              : 'text-ink hover:bg-muted'
        }`
      }
    >
      {item.label}
    </NavLink>
  );
}

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { user, dataSource } = useSession();
  const items = NAV_ITEMS.filter((l) => l.roles.includes(user.role));
  const main = items.filter((l) => !l.footer);
  const footer = items.filter((l) => l.footer);

  return (
    <aside
      className={`hidden shrink-0 border-r border-line bg-surface transition-[width] duration-200 md:flex md:flex-col ${
        collapsed ? 'w-12' : 'w-56'
      }`}
    >
      <div className={`flex items-center p-3 ${collapsed ? 'justify-center' : 'justify-end'}`}>
        <button
          type="button"
          onClick={onToggle}
          title={collapsed ? 'Navigation einblenden' : 'Navigation ausblenden'}
          aria-label={collapsed ? 'Navigation einblenden' : 'Navigation ausblenden'}
          className="rounded-lg p-1.5 text-ink-dim hover:bg-muted hover:text-ink"
        >
          {collapsed ? '»' : '«'}
        </button>
      </div>
      {!collapsed && (
        <>
          <nav className="flex-1 space-y-1 p-3 pt-0">
            {main.map((l) => (
              <SidebarLink key={l.to} item={l} />
            ))}
          </nav>
          {footer.length > 0 && (
            <nav className="space-y-1 border-t border-line p-3">
              {footer.map((l) => (
                <SidebarLink key={l.to} item={l} />
              ))}
            </nav>
          )}
          <div className="border-t border-line p-3 text-xs text-ink-dim">
            Datenquelle:{' '}
            {dataSource.kind === 'MOCK' ? (
              'Demo'
            ) : (
              <span className="font-semibold text-ink">
                {dataSource.fileName} · {dataSource.month}/{dataSource.year}
              </span>
            )}
          </div>
        </>
      )}
    </aside>
  );
}

function Header() {
  const { user } = useSession();
  const [calendarOpen, setCalendarOpen] = useState(false);
  return (
    <header className="border-b border-line bg-surface">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <Link
          to={roleHome(user.role)}
          className="mr-2 flex items-center gap-2 font-display text-lg font-bold"
        >
          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt="Fahrtkostenerstattung Logo"
            width={32}
            height={32}
            className="h-8 w-8 shrink-0"
          />
          <span className="text-primary">Fahrtkostenerstattung</span>
        </Link>
        <HeaderSearch />
        <button
          type="button"
          onClick={() => setCalendarOpen(true)}
          title="Feiertage und Arbeitstage nachschlagen"
          className="rounded-full border border-line px-3 py-1.5 text-sm text-ink-dim hover:bg-muted hover:text-ink"
        >
          Kalender
        </button>
        <LanguageSwitcher />
        <RoleSwitcher />
      </div>
      <CalendarOverlay open={calendarOpen} onClose={() => setCalendarOpen(false)} />
      {/* Mobile-Navigation */}
      <MobileNav />
    </header>
  );
}

/**
 * Rollen-Auswahl statt einzelner TN-Buttons: genau eine Option je Rolle
 * (Admin, TN, Dozent, Manager) — nicht mehr pro Demo-Nutzer, damit die
 * Auswahl klar auf „welche Rolle simuliere ich gerade" abzielt.
 */
const ROLE_ORDER = ['ADMIN', 'TN', 'DOZENT', 'MANAGER', 'ACCOUNTING'] as const;

function RoleSwitcher() {
  const { user, demoUsers, switchUser } = useSession();
  const navigate = useNavigate();

  // Genau ein Demo-Nutzer je Rolle (der erste Treffer in ROLE_ORDER).
  const perRole = ROLE_ORDER.map((role) => demoUsers.find((u) => u.role === role)).filter(
    (u): u is (typeof demoUsers)[number] => u !== undefined,
  );

  const currentRole = perRole.find((u) => u.role === user.role)?.id ?? user.id;

  // Ein Rollenwechsel kann auf einer Seite passieren, die es in der neuen
  // Rolle gar nicht in der Navigation gibt (z. B. Admin-Übersicht → TN).
  // Ohne Navigation bliebe der Inhalt stehen, obwohl die Seitenleiste sich
  // schon geändert hat — deshalb hier immer zur neuen Rollen-Startseite.
  const handleChange = (id: string) => {
    switchUser(id);
    const nextRole = perRole.find((u) => u.id === id)?.role;
    if (nextRole) navigate(roleHome(nextRole));
  };

  return (
    <label className="ml-auto flex items-center gap-2 text-sm">
      <span className="text-xs uppercase tracking-label text-ink-dim">Rolle</span>
      <RoleChip role={user.role} />
      <select
        value={currentRole}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-semibold"
      >
        {perRole.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Sprachumschalter (FR-15, P1). Wirkt aktuell nur auf den TN-Bereich — die
 * i18n-Extraktion ist bewusst auf `src/features/tn/` begrenzt (siehe
 * REQUIREMENTS.md); im Header, weil dort jede Rolle sie findet, unabhängig
 * davon, welche Ansicht gerade offen ist.
 */
function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  return (
    <label className="flex items-center gap-1 text-sm" title="Sprache / Language">
      <span aria-hidden="true">🌐</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        aria-label="Sprache / Language"
        className="rounded-full border border-line bg-surface px-2 py-1.5 text-sm"
      >
        {SUPPORTED_LOCALES.map((l) => (
          <option key={l} value={l}>
            {LOCALE_LABELS[l]}
          </option>
        ))}
      </select>
    </label>
  );
}

function MobileNav() {
  const { user } = useSession();
  const items = NAV_ITEMS.filter((l) => l.roles.includes(user.role));
  return (
    <nav className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden">
      {items.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.end}
          className={({ isActive }) =>
            `whitespace-nowrap rounded-full px-3 py-1 text-sm ${
              isActive ? 'bg-primary text-white' : 'text-ink-dim hover:bg-muted'
            }`
          }
        >
          {l.label}
        </NavLink>
      ))}
    </nav>
  );
}

/**
 * Persistent, non-dismissable — reviewers must never mistake this build for
 * live operation. Doubles as the unobtrusive version/sha readout so feedback
 * can be tied to a specific build.
 */
function ReviewBanner() {
  return (
    <div className="flex items-center justify-between gap-2 bg-highlight px-4 py-1.5 text-xs font-semibold text-ink">
      <span>Demofassung · Testdaten · kein Echtbetrieb</span>
      <span className="font-mono font-normal text-ink-dim">
        v{appVersion} · {GIT_SHA}
      </span>
    </div>
  );
}

function Shell() {
  const { user } = useSession();
  const location = useLocation();
  const screen = screenForPath(location.pathname);
  useScreenLog(screen);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1',
  );
  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      return next;
    });
  };
  return (
    <div className="min-h-screen bg-bg">
      {REVIEW_BUILD && <ReviewBanner />}
      {REVIEW_BUILD && <TaskBar key={user.role} />}
      {REVIEW_BUILD && <FeedbackButton />}
      <Header />
      <div className="flex">
        <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
        <main className="min-w-0 flex-1 p-4 md:p-6">
          {/* Keyed by route: ein Fehler in einer Ansicht setzt sich beim Navigieren zurück. */}
          <ErrorBoundary key={location.pathname} screenName={SCREEN_DICT[screen]?.name}>
            <Routes>
              <Route path="/" element={<Navigate to={roleHome(user.role)} replace />} />
              <Route path="/tn" element={<TnFlow />} />
              <Route path="/tn/correction" element={<TnCorrection />} />
              <Route path="/admin" element={<Uebersicht />} />
              {/* Alter Pipeline-Link bleibt gueltig und oeffnet die
                  Uebersicht direkt in der Pipeline-Darstellung. */}
              <Route
                path="/admin/pipeline"
                element={<Uebersicht initialLayout="pipeline" />}
              />
              <Route path="/admin/jahr" element={<YearOverview />} />
              <Route path="/admin/kalender" element={<YearCalendar />} />
              <Route path="/reminder" element={<AutoReminderEmails />} />
              <Route path="/vergleichsrechnung" element={<Vergleichsrechnung />} />
              <Route path="/admin/raten" element={<RatesManagement />} />
              <Route path="/dokumentation" element={<Documentation />} />
              <Route path="/admin/daten" element={<TnData />} />
              <Route path="/admin/protokoll" element={<AuditLogScreen />} />
              <Route path="/admin/tn/:participantId" element={<TnDetail />} />
              <Route path="/admin/tn/:participantId/formular" element={<FormularScreen />} />
              <Route path="/dozent" element={<DozentAttendance />} />
              <Route path="/manager" element={<ManagerQueue />} />
              <Route path="/settings" element={<SignatureSettings />} />
              <Route path="/settings/data" element={<DataSourceSettings />} />
              <Route path="/settings/logging" element={<LoggingSettings />} />
              <Route path="/review/feedback" element={<ReviewFeedbackScreen />} />
              {REVIEW_BUILD && <Route path="/review/log" element={<FeedbackLog />} />}
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
      <DevPanel />
    </div>
  );
}

/** Bridges session state into the logging provider — role/actorId/env are read from useSession(), so this has to live inside SessionProvider. */
function LoggingBridge({ children }: { children: ReactNode }) {
  const { user, dataSource } = useSession();
  return (
    <LoggingProvider role={user.role} actorId={user.id} env={dataSource.kind} appVersion={appVersion}>
      {children}
    </LoggingProvider>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <LoggingBridge>
        <RulesProvider>
          <VmtFaresProvider>
          <VmtTariffProvider>
          <ParticipantNamesProvider>
          <LocaleProvider>
          <HashRouter>
            <Shell />
          </HashRouter>
          </LocaleProvider>
          </ParticipantNamesProvider>
          </VmtTariffProvider>
          </VmtFaresProvider>
        </RulesProvider>
      </LoggingBridge>
    </SessionProvider>
  );
}
