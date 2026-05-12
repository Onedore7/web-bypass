'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ContentRow from '@/components/ContentRow';
import Navbar from '@/components/Navbar';

export interface MediaCard {
  id: string;
  title: string;
  poster: string;
  backdrop?: string;
  rating?: string;
  year?: string;
  quality?: string;
  episodes?: number;
  type?: string;
  provider: string;
}

interface HomeRow { name: string; items: MediaCard[]; }

export default function HomePage() {
  const [rows, setRows] = useState<HomeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [hero, setHero] = useState<MediaCard | null>(null);

  const loadHome = useCallback(async () => {
    setLoading(true);
    setRows([]);
    try {
      const res = await fetch(`/api/home?provider=streamplay&page=1`);
      const json = await res.json();
      if (json.ok && json.data) {
        setRows(json.data);
        const first = json.data[0]?.items?.find((i: MediaCard) => i.backdrop || i.poster);
        if (first) setHero(first);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadHome(); }, [loadHome]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Navbar />

      {/* Hero Banner */}
      <div className="relative h-[420px] md:h-[520px] overflow-hidden" style={{ background: '#0a0a0f' }}>

        {/* MR. PPK Logo — centered in upper area */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: hero ? '110px' : 0,
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/mr-ppk-logo.png"
            alt="MR. PPK"
            style={{
              maxWidth: '55%',
              maxHeight: '75%',
              objectFit: 'contain',
              filter: 'drop-shadow(0 4px 40px rgba(0,0,0,0.9))',
            }}
          />
        </div>

        {/* Movie info at bottom */}
        {hero && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 3, padding: '0 24px 24px' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="provider-badge" style={{ background: 'rgba(108,99,255,0.2)', color: '#6c63ff', border: '1px solid rgba(108,99,255,0.3)' }}>
                🎬 PPK MOVIE
              </span>
              {hero.year && <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{hero.year}</span>}
              {hero.rating && <span style={{ color: '#f59e0b', fontSize: '0.8rem' }}>⭐ {hero.rating}/5</span>}
            </div>
            <h1 className="text-2xl md:text-4xl font-bold mb-2 leading-tight" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}>
              {hero.title}
            </h1>
            <Link
              href={`/detail/streamplay/${encodeURIComponent(hero.id)}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 hover:scale-105 active:scale-95"
              style={{ background: 'var(--accent)', color: '#fff', boxShadow: '0 8px 24px rgba(108,99,255,0.4)' }}
            >
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M11.596 8.697L4.504 12.47A.75.75 0 013.5 11.794V4.206a.75.75 0 011.004-.703l7.092 3.773a.75.75 0 010 1.421z"/></svg>
              Click Here
            </Link>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 md:px-10 pb-16">
        {loading ? (
          <div className="space-y-10 mt-6">
            {[1,2,3].map(i => (
              <div key={i}>
                <div className="shimmer h-5 w-40 rounded mb-4" />
                <div className="flex gap-3">
                  {[1,2,3,4,5,6].map(j => (
                    <div key={j} className="shimmer rounded-xl flex-shrink-0" style={{ width: 140, height: 210 }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-10 mt-6">
            {rows.map((row, i) => (
              row.items.length > 0 && (
                <ContentRow key={i} name={row.name} items={row.items} />
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
