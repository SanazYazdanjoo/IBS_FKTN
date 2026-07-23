import { HashRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { SessionProvider, useSession } from './session';
import { RulesProvider } from './rules-context';
import TnFlow from '../features/tn/TnFlow';
import TnCorrection from '../features/tn/Correction';
import AdminDashboard from '../features/admin/Dashboard';
import AdminPipeline from '../features/admin/Pipeline';
import TnDetail from '../features/admin/TnDetail';
import DozentAttendance from '../features/dozent/Attendance';
import ManagerQueue from '../features/manager/Queue';
import SignatureSettings from '../features/settings/SignatureSettings';

function roleHome(role: string): string {
  switch (role) {
    case 'TN':
      return '/tn';
    case 'ADMIN':
      return '/admin';
    case 'DOZENT':
      return '/dozent';
    case 'MANAGER':
      return '/manager';
    default:
      return '/admin';
  }
}

function Nav() {
  const { user, demoUsers, switchUser } = useSession();
  const location = useLocation();

  const links: { to: string; label: string; roles: string[] }[] = [
    { to: '/tn', label: 'TN · Mein Monat', roles: ['TN'] },
    { to: '/tn/correction', label: 'TN · Korrektur', roles: ['TN'] },
    { to: '/admin', label: 'Admin · Dashboard', roles: ['ADMIN'] },
    { to: '/dozent', label: 'Dozent · Anwesenheit', roles: ['DOZENT'] },
    { to: '/manager', label: 'Kristin · Freigaben', roles: ['MANAGER'] },
    { to: '/settings', label: 'Einstellungen', roles: ['ADMIN'] },
  ];

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 p-4">
        <Link to={roleHome(user.role)} className="font-display text-lg font-bold">
          IBS <span className="text-primary">Fahrtkostenerstattung</span>
        </Link>
        <nav className="flex flex-wrap gap-2">
          {links
            .filter((l) => l.roles.includes(user.role))
            .map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`rounded-full px-3 py-1 text-sm ${
                  location.pathname === l.to
                    ? 'bg-primary text-white'
                    : 'text-ink-dim hover:bg-muted'
                }`}
              >
                {l.label}
              </Link>
            ))}
        </nav>
        <div className="flex flex-wrap gap-1">
          {demoUsers.map((u) => (
            <button
              key={u.id}
              onClick={() => switchUser(u.id)}
              title="Prototyp-Rollenwechsel — keine echte Anmeldung"
              className={`rounded-full border px-2 py-1 text-xs ${
                u.id === user.id ? 'border-primary bg-blush-weak' : 'border-line text-ink-dim'
              }`}
            >
              {u.name}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

function Shell() {
  const { user } = useSession();
  return (
    <div className="min-h-screen bg-bg">
      <Nav />
      <main className="mx-auto max-w-5xl p-4">
        <Routes>
          <Route path="/" element={<Navigate to={roleHome(user.role)} replace />} />
          <Route path="/tn" element={<TnFlow />} />
          <Route path="/tn/correction" element={<TnCorrection />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/pipeline" element={<AdminPipeline />} />
          <Route path="/admin/tn/:participantId" element={<TnDetail />} />
          <Route path="/dozent" element={<DozentAttendance />} />
          <Route path="/manager" element={<ManagerQueue />} />
          <Route path="/settings" element={<SignatureSettings />} />
        </Routes>
      </main>
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
