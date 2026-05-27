import { useAuth, useLang } from '@/store';

export function SignIn() {
  const { signInWithGoogle } = useAuth();
  const { lang, setLang, t } = useLang();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-4 right-4">
        <button
          onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
          className="text-xs font-mono uppercase text-ink-400 hover:text-cup-gold transition-colors px-2 py-1 border border-ink-700 rounded"
        >
          {lang === 'es' ? 'EN' : 'ES'}
        </button>
      </div>

      {/* Decorative pitch lines */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
        <svg className="w-full h-full" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
          <rect x="0" y="0" width="800" height="600" fill="none" stroke="white" strokeWidth="2"/>
          <line x1="400" y1="0" x2="400" y2="600" stroke="white" strokeWidth="2"/>
          <circle cx="400" cy="300" r="80" fill="none" stroke="white" strokeWidth="2"/>
          <rect x="0" y="200" width="120" height="200" fill="none" stroke="white" strokeWidth="2"/>
          <rect x="680" y="200" width="120" height="200" fill="none" stroke="white" strokeWidth="2"/>
        </svg>
      </div>

      <div className="card-glow p-8 sm:p-12 max-w-md w-full text-center relative animate-slide-up">
        <div className="text-7xl mb-4">🏆</div>
        <h1 className="font-display text-5xl sm:text-6xl tracking-wider text-cup-gold mb-2">
          MUNDIALISTA
        </h1>
        <div className="font-mono text-xs tracking-[0.3em] text-ink-400 mb-8">2 · 0 · 2 · 6</div>
        <p className="text-ink-200 mb-8 text-sm leading-relaxed">{t.tagline}</p>

        <button onClick={signInWithGoogle} className="btn-primary w-full text-base py-3">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {t.signIn}
        </button>

        <div className="mt-8 text-xs text-ink-400 font-mono uppercase tracking-wider">
          5 pts · 2 pts · 1 pt
        </div>
      </div>
    </div>
  );
}
