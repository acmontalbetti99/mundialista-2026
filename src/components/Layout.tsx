import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth, useLang } from '@/store';

export function Layout() {
  const { profile, signOut } = useAuth();
  const { lang, setLang, t } = useLang();

  const links = [
    { to: '/', label: t.nav.dashboard, end: true },
    { to: '/predictions', label: t.nav.predictions },
    { to: '/bracket', label: t.nav.bracket },
    { to: '/leaderboard', label: t.nav.leaderboard },
    { to: '/results', label: t.nav.results },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-ink-700 bg-ink-900/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 mr-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cup-gold to-orange-500 flex items-center justify-center text-ink-900 font-black text-sm">
              ⚽
            </div>
            <span className="font-display text-xl tracking-wider text-cup-gold hidden sm:inline">MUNDIALISTA</span>
          </Link>

          <nav className="flex-1 flex items-center gap-1 overflow-x-auto">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive ? 'bg-cup-gold/10 text-cup-gold' : 'text-ink-200 hover:text-white hover:bg-ink-800'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
            {profile?.is_admin && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive ? 'bg-cup-red/15 text-cup-red' : 'text-cup-red/80 hover:text-cup-red hover:bg-ink-800'
                  }`
                }
              >
                {t.nav.admin}
              </NavLink>
            )}
          </nav>

          <button
            onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
            className="text-xs font-mono uppercase text-ink-400 hover:text-cup-gold transition-colors px-2 py-1"
            aria-label="Toggle language"
          >
            {lang === 'es' ? 'EN' : 'ES'}
          </button>

          {profile && (
            <div className="flex items-center gap-2">
              {profile.avatar_url && (
                <img src={profile.avatar_url} alt="" className="w-7 h-7 rounded-full" />
              )}
              <span className="text-sm font-medium hidden md:inline">{profile.display_name}</span>
              <button onClick={signOut} className="text-xs text-ink-400 hover:text-cup-red transition-colors">
                ↗
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 animate-fade-in">
        <Outlet />
      </main>

      <footer className="border-t border-ink-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 text-xs text-ink-400 flex justify-between">
          <span>{t.appName}</span>
          <span className="font-mono">v0.1</span>
        </div>
      </footer>
    </div>
  );
}
