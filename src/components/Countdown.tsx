import { useEffect, useState } from 'react';
import { useLang } from '@/store';

interface Props {
  deadline: string | null;
  compact?: boolean;
}

function diff(deadline: string) {
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms <= 0) return null;
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  const secs = Math.floor((ms % 60_000) / 1000);
  return { days, hours, mins, secs };
}

export function Countdown({ deadline, compact }: Props) {
  const { t } = useLang();
  const [, setTick] = useState(0);

  useEffect(() => {
    const i = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(i);
  }, []);

  if (!deadline) return <span className="text-ink-400">—</span>;
  const d = diff(deadline);
  if (!d) return <span className="text-cup-red font-semibold uppercase tracking-wider text-xs">{t.time.ago}</span>;

  const urgent = d.days === 0 && d.hours < 6;

  if (compact) {
    return (
      <span className={`font-mono text-sm ${urgent ? 'text-cup-red' : 'text-cup-gold'}`}>
        {d.days > 0 && <>{d.days}{t.time.days} </>}
        {String(d.hours).padStart(2, '0')}:{String(d.mins).padStart(2, '0')}:{String(d.secs).padStart(2, '0')}
      </span>
    );
  }

  return (
    <div className={`flex gap-2 font-mono ${urgent ? 'text-cup-red' : 'text-cup-gold'}`}>
      {[
        { v: d.days, l: t.time.days },
        { v: d.hours, l: t.time.hours },
        { v: d.mins, l: t.time.minutes },
        { v: d.secs, l: t.time.seconds },
      ].map((x, i) => (
        <div key={i} className="text-center">
          <div className="text-3xl font-display leading-none">{String(x.v).padStart(2, '0')}</div>
          <div className="text-[10px] uppercase tracking-widest text-ink-400 mt-1">{x.l}</div>
        </div>
      ))}
    </div>
  );
}
