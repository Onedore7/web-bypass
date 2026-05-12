'use client';
import { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { MediaCard } from '@/app/page';

interface Props { items: MediaCard[]; name: string; }

export default function ContentRow({ items, name }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = direction === 'left' ? -400 : 400;
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  return (
    <div className="relative group/row">
      <h2 className="text-base font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
        <span className="w-1 h-4 rounded-full" style={{ background: 'var(--accent)', display: 'inline-block' }} />
        {name}
      </h2>

      {/* Scroll arrows */}
      <button
        onClick={() => scroll('left')}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity duration-200"
        style={{ background: 'rgba(108,99,255,0.9)', boxShadow: '0 4px 16px rgba(0,0,0,0.5)', marginTop: '12px' }}
      >
        <svg width="16" height="16" fill="white" viewBox="0 0 16 16"><path d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/></svg>
      </button>
      <button
        onClick={() => scroll('right')}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity duration-200"
        style={{ background: 'rgba(108,99,255,0.9)', boxShadow: '0 4px 16px rgba(0,0,0,0.5)', marginTop: '12px' }}
      >
        <svg width="16" height="16" fill="white" viewBox="0 0 16 16"><path d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/></svg>
      </button>

      <div ref={scrollRef} className="scroll-row">
        {items.map((item, i) => (
          <MediaCardItem key={i} item={item} />
        ))}
        {/* Continue button at end of row */}
        <div className="flex-shrink-0 flex items-center justify-center rounded-xl" style={{ width: 140, height: 210, background: 'rgba(108,99,255,0.08)', border: '1px dashed rgba(108,99,255,0.3)' }}>
          <Link
            href={`/search?q=${encodeURIComponent(name)}&provider=streamplay`}
            className="flex flex-col items-center gap-3 w-full h-full justify-center rounded-xl transition-all duration-200 hover:scale-105"
            style={{ background: 'transparent' }}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(108,99,255,0.2)', border: '2px solid rgba(108,99,255,0.5)' }}>
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16" style={{ color: 'var(--accent)' }}>
                <path d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
              </svg>
            </div>
            <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>Continue</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function MediaCardItem({ item }: { item: MediaCard }) {
  const href = `/detail/streamplay/${encodeURIComponent(item.id)}`;
  return (
    <Link href={href} className="flex-shrink-0 card-glow group" style={{ width: 140 }}>
      <div className="relative rounded-xl overflow-hidden" style={{ width: 140, height: 210, background: 'var(--bg-card)' }}>
        {item.poster ? (
          <Image src={item.poster} alt={item.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-4xl"
            style={{ background: 'linear-gradient(135deg, #1e1e2a, #16161f)' }}>🎬</div>
        )}
        {/* Overlay on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center"
          style={{ background: 'rgba(108,99,255,0.3)' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(108,99,255,0.8)' }}>
            <svg width="14" height="14" fill="white" viewBox="0 0 16 16"><path d="M11.596 8.697L4.504 12.47A.75.75 0 013.5 11.794V4.206a.75.75 0 011.004-.703l7.092 3.773a.75.75 0 010 1.421z"/></svg>
          </div>
        </div>
        {/* Quality badge */}
        {item.quality && (
          <div className="absolute top-2 left-2 provider-badge text-white" style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}>
            {item.quality}
          </div>
        )}
        {/* Rating */}
        {item.rating && (
          <div className="absolute top-2 right-2 provider-badge" style={{ background: 'rgba(245,158,11,0.85)', color: '#fff' }}>
            ⭐ {item.rating}
          </div>
        )}
      </div>
      <p className="mt-2 text-xs font-medium leading-tight line-clamp-2" style={{ color: 'var(--text-secondary)', width: 140 }}>
        {item.title}
      </p>
      {item.year && (
        <p className="text-xs mt-0.5" style={{ color: 'rgba(160,160,184,0.5)' }}>{item.year}</p>
      )}
    </Link>
  );
}
