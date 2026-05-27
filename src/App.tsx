import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/store';
import { Layout } from '@/components/Layout';
import { SignIn } from '@/pages/SignIn';
import { Dashboard } from '@/pages/Dashboard';
import { Predictions } from '@/pages/Predictions';
import { Bracket } from '@/pages/Bracket';
import { Leaderboard } from '@/pages/Leaderboard';
import { Results } from '@/pages/Results';
import { Admin } from '@/pages/Admin';

export default function App() {
  const { session, loading, init } = useAuth();

  useEffect(() => {
    init();
  }, [init]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-ink-400 font-mono text-sm">
        Loading...
      </div>
    );
  }

  if (!session) return <SignIn />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="/predictions" element={<Predictions />} />
        <Route path="/bracket" element={<Bracket />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/results" element={<Results />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
