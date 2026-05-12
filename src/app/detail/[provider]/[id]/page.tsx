'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

interface Episode { name: string; href: string; episode?: number; season?: number; number?: number; id?: number; }
interface Detail {
  title: string; poster: string; backdrop?: string; overview?: string; description?: string;
  year?: string; rating?: string; genres?: string[]; cast?: { name: string; photo?: string; role?: string }[];
  type?: string; episodes?: Episode[]; status?: string; country?: string; trailer?: string;
  streamData?: string;
}

export default function DetailPage() {
  const { id } = useParams<{ provider: string; id: string }>();
  const decodedId = decodeURIComponent(id);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState(1);

  useEffect(() => {
    fetch(`/api/detail?provider=streamplay&id=${encodeURIComponent(decodedId)}`)
      .then(r => r.json())
      .then(j => { if (j.ok) setDetail(j.data); })
      .finally(() => setLoading(false));
  }, [decodedId]);

  const seasons = Array.from(new Set((detail?.episodes || []).map(e => e.season).filter(Boolean))).sort();
  const filteredEps = detail?.episodes?.filter(e => e.season === selectedSeason || !e.season) || [];

  const getWatchHref = (ep: Episode) => {
    const data = ep.href || ep.id?.toString() || decodedId;
    return `/watch/streamplay/${encodeURIComponent(data)}`;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="spinner" />
    </div>
  );

  if (!detail) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="text-center">
        <div className="text-5xl mb-4">😕</div>
        <p style={{ color: 'var(--text-secondary)' }}>Could not load content</p>
        <Link href="/" className="mt-4 inline-block" style={{ color: 'var(--accent)' }}>← Back to Home</Link>
      </div>
    </div>
  );

  const isMovie = detail.type === 'movie' || !detail.episodes?.length;
  const watchData = detail.streamData || decodedId;
  const directWatchHref = `/watch/streamplay/${encodeURIComponent(watchData)}`;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Backdrop */}
      {detail.backdrop && (
        <div className="absolute top-0 inset-x-0 h-[50vh] overflow-hidden" style={{ zIndex: 0 }}>
          <Image src={detail.backdrop} alt={detail.title} fill className="object-cover opacity-20" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, var(--bg-primary))' }} />
        </div>
      )}

      <div className="relative" style={{ zIndex: 1 }}>
        <div className="px-4 md:px-10 pt-6 pb-4">
          <Link href="/" className="text-sm hover:underline" style={{ color: 'var(--accent)' }}>← Home</Link>
        </div>

        {/* Hero */}
        <div className="flex flex-col md:flex-row gap-8 px-4 md:px-10 pb-8">
          {/* Poster */}
          <div className="flex-shrink-0">
            <div className="relative w-48 md:w-60 rounded-2xl overflow-hidden shadow-2xl" style={{ aspectRatio: '2/3' }}>
              {detail.poster ? (
                <Image src={detail.poster} alt={detail.title} fill className="object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-6xl"
                  style={{ background: 'linear-gradient(135deg, #1e1e2a, #16161f)' }}>🎬</div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 pt-2">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {detail.status && (
                <span className="provider-badge" style={{ background: detail.status === 'Ongoing' ? 'rgba(67,217,173,0.15)' : 'rgba(255,101,132,0.15)', color: detail.status === 'Ongoing' ? '#43d9ad' : '#ff6584', border: `1px solid ${detail.status === 'Ongoing' ? 'rgba(67,217,173,0.3)' : 'rgba(255,101,132,0.3)'}` }}>
                  <span className="pulse-dot mr-1 inline-block w-1.5 h-1.5 rounded-full" style={{ background: 'currentColor' }} />
                  {detail.status}
                </span>
              )}
              {detail.year && <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{detail.year}</span>}
              {detail.rating && <span style={{ color: '#f59e0b', fontSize: '0.85rem' }}>★ {detail.rating}</span>}
              {detail.country && <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{detail.country}</span>}
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-3">{detail.title}</h1>

            {detail.genres && detail.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {detail.genres.map(g => (
                  <span key={g} className="provider-badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>{g}</span>
                ))}
              </div>
            )}

            <p className="text-sm leading-relaxed mb-6 max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
              {detail.overview || detail.description || 'No description available.'}
            </p>

            <div className="flex flex-wrap gap-3">
              {isMovie && (
                <Link href={directWatchHref}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105"
                  style={{ background: 'var(--accent)', color: '#fff', boxShadow: '0 8px 24px rgba(108,99,255,0.4)' }}>
                  <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M11.596 8.697L4.504 12.47A.75.75 0 013.5 11.794V4.206a.75.75 0 011.004-.703l7.092 3.773a.75.75 0 010 1.421z"/></svg>
                  Click Here
                </Link>
              )}
              {detail.trailer && (
                <a href={`https://www.youtube.com/watch?v=${detail.trailer}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid var(--border)' }}>
                  ▶ Trailer
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Episodes */}
        {!isMovie && detail.episodes && detail.episodes.length > 0 && (
          <div className="px-4 md:px-10 pb-12">
            <h2 className="text-xl font-bold mb-4">Episodes</h2>

            {seasons.length > 1 && (
              <div className="flex gap-2 mb-4 flex-wrap">
                {seasons.map(s => (
                  <button key={s} onClick={() => setSelectedSeason(s!)}
                    className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
                    style={{
                      background: selectedSeason === s ? 'rgba(108,99,255,0.2)' : 'rgba(255,255,255,0.05)',
                      border: selectedSeason === s ? '1px solid rgba(108,99,255,0.5)' : '1px solid var(--border)',
                      color: selectedSeason === s ? '#a599ff' : 'var(--text-secondary)',
                    }}>Season {s}</button>
                ))}
              </div>
            )}

            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
              {filteredEps.map((ep, i) => (
                <Link key={i} href={getWatchHref(ep)}
                  className="flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.01]"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold"
                    style={{ background: 'rgba(108,99,255,0.15)', color: 'var(--accent)' }}>
                    {ep.episode || ep.number || i + 1}
                  </div>
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{ep.name}</span>
                  <svg className="ml-auto flex-shrink-0" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" style={{ color: 'var(--text-secondary)' }}>
                    <path d="M11.596 8.697L4.504 12.47A.75.75 0 013.5 11.794V4.206a.75.75 0 011.004-.703l7.092 3.773a.75.75 0 010 1.421z"/>
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Cast */}
        {detail.cast && detail.cast.length > 0 && (
          <div className="px-4 md:px-10 pb-12">
            <h2 className="text-xl font-bold mb-4">Cast</h2>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {detail.cast.map((c, i) => (
                <div key={i} className="flex-shrink-0 text-center" style={{ width: 80 }}>
                  <div className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-2" style={{ background: 'var(--bg-card)' }}>
                    {c.photo ? <Image src={c.photo} alt={c.name} width={64} height={64} className="object-cover w-full h-full" /> : <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>}
                  </div>
                  <p className="text-xs font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                  {c.role && <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>{c.role}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
