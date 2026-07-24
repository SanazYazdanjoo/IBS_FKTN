import { HashRouter, Link, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './ErrorBoundary';
import { SessionProvider, useSession } from './session';
import { RulesProvider } from './rules-context';
import HeaderSearch from './HeaderSearch';
import TnFlow from '../features/tn/TnFlow';
import TnCorrection from '../features/tn/Correction';
import AdminDashboard from '../features/admin/Dashboard';
import AdminPipeline from '../features/admin/Pipeline';
import TnData from '../features/admin/TnData';
import TnDetail from '../features/admin/TnDetail';
import FormularScreen from '../features/admin/Formular';
import DozentAttendance from '../features/dozent/Attendance';
import ManagerQueue from '../features/manager/Queue';
import SignatureSettings from '../features/settings/SignatureSettings';
import DataSourceSettings from '../features/settings/DataSourceSettings';

function roleHome(role: string): string {
  switch (role) {
    case 'TN':
      return '/tn';
    case 'DOZENT':
      return '/dozent';
    case 'MANAGER':
      return '/manager';
    default:
      return '/admin';
  }
}

interface NavItem {
  to: string;
  label: string;
  roles: string[];
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/tn', label: 'Mein Monat', roles: ['TN'], end: true },
  { to: '/tn/correction', label: 'Korrektur', roles: ['TN'] },
  { to: '/admin', label: 'Dashboard', roles: ['ADMIN'], end: true },
  { to: '/admin/pipeline', label: 'Pipeline', roles: ['ADMIN'] },
  { to: '/admin/daten', label: 'TN-Daten', roles: ['ADMIN'] },
  { to: '/dozent', label: 'Anwesenheit', roles: ['DOZENT', 'ADMIN'] },
  { to: '/manager', label: 'Freigaben', roles: ['MANAGER', 'ADMIN'] },
  { to: '/settings', label: 'Einstellungen', roles: ['ADMIN'], end: true },
  { to: '/settings/data', label: 'Datenquelle', roles: ['ADMIN'] },
];

function Sidebar() {
  const { user, dataSource } = useSession();
  const items = NAV_ITEMS.filter((l) => l.roles.includes(user.role));

  return (
    <aside className="hidden w-56 shrink-0 border-r border-line bg-surface md:flex md:flex-col">
      <nav className="flex-1 space-y-1 p-3">
        {items.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              `block rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive ? 'bg-primary text-white' : 'text-ink hover:bg-muted'
              }`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
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
    </aside>
  );
}

function Header() {
  const { user } = useSession();
  return (
    <header className="border-b border-line bg-surface">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <Link
          to={roleHome(user.role)}
          className="mr-2 flex items-center gap-2 font-display text-lg font-bold"
        >
          <img
            src="/logo.png"
            alt="Fahrtkostenerstattung Logo"
            width={32}
            height={32}
            className="h-8 w-8 shrink-0"
          />
          <span className="text-primary">Fahrtkostenerstattung</span>
        </Link>
        <HeaderSearch />
        <RoleSwitcher />
      </div>
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
const ROLE_ORDER = ['ADMIN', 'TN', 'DOZENT', 'MANAGER'] as const;

function RoleSwitcher() {
  const { user, demoUsers, switchUser } = useSession();

  // Genau ein Demo-Nutzer je Rolle (der erste Treffer in ROLE_ORDER).
  const perRole = ROLE_ORDER.map((role) => demoUsers.find((u) => u.role === role)).filter(
    (u): u is (typeof demoUsers)[number] => u !== undefined,
  );

  const currentRole = perRole.find((u) => u.role === user.role)?.id ?? user.id;

  return (
    <label className="ml-auto flex items-center gap-2 text-sm">
      <span className="text-xs uppercase tracking-wider text-ink-dim">Rolle</span>
      <select
        value={currentRole}
        onChange={(e) => switchUser(e.target.value)}
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

function Shell() {
  const { user } = useSession();
  const location = useLocation();
  return (
    <div className="min-h-screen bg-bg">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="min-w-0 flex-1 p-4 md:p-6">
          {/* Keyed by route: ein Fehler in einer Ansicht setzt sich beim Navigieren zurück. */}
          <ErrorBoundary key={location.pathname}>
            <Routes>
              <Route path="/" element={<Navigate to={roleHome(user.role)} replace />} />
              <Route path="/tn" element={<TnFlow />} />
              <Route path="/tn/correction" element={<TnCorrection />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/pipeline" element={<AdminPipeline />} />
              <Route path="/admin/daten" element={<TnData />} />
              <Route path="/admin/tn/:participantId" element={<TnDetail />} />
              <Route path="/admin/tn/:participantId/formular" element={<FormularScreen />} />
              <Route path="/dozent" element={<DozentAttendance />} />
              <Route path="/manager" element={<ManagerQueue />} />
              <Route path="/settings" element={<SignatureSettings />} />
              <Route path="/settings/data" element={<DataSourceSettings />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <RulesProvider>
        <HashRouter>
          <Shell />
        </HashRouter>
      </RulesProvider>
    </SessionProvider>
  );
}
