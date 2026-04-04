'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { MediaCard, Provider } from '@/app/page';

function SearchResults() {
  const params = useSearchParams();
  const q = params.get('q') || '';
  const provider = (params.get('provider') || 'streamplay') as Provider;
  const [results, setResults] = useState<MediaCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    setSearched(false);
    fetch(`/api/search?q=${encodeURIComponent(q)}&provider=${provider}`)
      .then(r => r.json())
      .then(j => { if (j.ok) setResults(j.data || []); })
      .finally(() => { setLoading(false); setSearched(true); });
  }, [q, provider]);

  const PROVIDER_LABEL: Record<Provider, string> = {
    streamplay: '🌐 StreamPlay', kisskh: '🎭 KissKh', watch32: '📺 Watch32',
  };

  return (
    <div className="min-h-screen px-4 md:px-10 pt-8 pb-16" style={{ background: 'var(--bg-primary)' }}>
      <div className="flex items-center gap-3 mb-2">
        <Link href="/" className="text-sm hover:underline" style={{ color: 'var(--accent)' }}>← Home</Link>
        <span style={{ color: 'var(--text-secondary)' }}>/</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Search</span>
      </div>
      <h1 className="text-2xl font-bold mb-1">
        {q ? `Results for "${q}"` : 'Search'}
      </h1>
      <div className="flex items-center gap-2 mb-6">
        <span className="provider-badge" style={{ background: 'rgba(108,99,255,0.15)', color: '#a599ff', border: '1px solid rgba(108,99,255,0.3)' }}>
          {PROVIDER_LABEL[provider]}
        </span>
        {searched && <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{results.length} results</span>}
      </div>

      {loading && (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="shimmer rounded-xl" style={{ height: 230 }} />
          ))}
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>No results found</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>Try a different search term</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="grid gap-4 fade-in" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
          {results.map((item, i) => (
            <Link key={i} href={`/detail/${encodeURIComponent(provider)}/${encodeURIComponent(item.id)}`}
              className="card-glow group">
              <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '2/3', background: 'var(--bg-card)' }}>
                {item.poster ? (
                  <Image src={item.poster} alt={item.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-5xl"
                    style={{ background: 'linear-gradient(135deg, #1e1e2a, #16161f)' }}>🎬</div>
                )}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  style={{ background: 'rgba(108,99,255,0.3)' }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(108,99,255,0.8)' }}>
                    <svg width="14" height="14" fill="white" viewBox="0 0 16 16"><path d="M11.596 8.697L4.504 12.47A.75.75 0 013.5 11.794V4.206a.75.75 0 011.004-.703l7.092 3.773a.75.75 0 010 1.421z"/></svg>
                  </div>
                </div>
                {item.rating && (
                  <div className="absolute top-2 right-2 provider-badge text-white" style={{ background: 'rgba(245,158,11,0.85)' }}>★ {item.rating}</div>
                )}
              </div>
              <p className="mt-2 text-xs font-medium line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{item.title}</p>
              {item.year && <p className="text-xs mt-0.5" style={{ color: 'rgba(160,160,184,0.5)' }}>{item.year}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchResults />
    </Suspense>
  );
}
