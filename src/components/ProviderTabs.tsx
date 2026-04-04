'use client';
import type { Provider } from '@/app/page';

interface Props { active: Provider; onChange: (p: Provider) => void; }
const PROVIDERS: { id: Provider; label: string; emoji: string; desc: string }[] = [
  { id: 'streamplay', label: 'StreamPlay', emoji: '🌐', desc: 'Global Movies & TV' },
  { id: 'kisskh', label: 'KissKh', emoji: '🎭', desc: 'K-Drama & Anime' },
  { id: 'pencurimovie', label: 'PencuriMovie', emoji: '🎬', desc: 'Asian Cinema' },
];

export default function ProviderTabs({ active, onChange }: Props) {
  return (
    <div className="flex gap-3 mt-6 mb-2">
      {PROVIDERS.map(p => (
        <button key={p.id} onClick={() => onChange(p.id)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105"
          style={{
            background: active === p.id ? 'rgba(108,99,255,0.15)' : 'rgba(255,255,255,0.04)',
            border: active === p.id ? '1px solid rgba(108,99,255,0.5)' : '1px solid var(--border)',
            color: active === p.id ? '#a599ff' : 'var(--text-secondary)',
            boxShadow: active === p.id ? '0 4px 16px rgba(108,99,255,0.2)' : 'none',
          }}>
          <span>{p.emoji}</span>
          <div className="text-left hidden sm:block">
            <div style={{ color: active === p.id ? '#fff' : 'inherit', fontWeight: active === p.id ? 600 : 400 }}>{p.label}</div>
            <div style={{ fontSize: '0.65rem', opacity: 0.6 }}>{p.desc}</div>
          </div>
          <span className="sm:hidden">{p.label}</span>
        </button>
      ))}
    </div>
  );
}
