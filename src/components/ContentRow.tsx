'use client';
import Link from 'next/link';
import Image from 'next/image';
import type { MediaCard } from '@/app/page';

interface Props { items: MediaCard[]; name: string; }

export default function ContentRow({ items, name }: Props) {
  return (
    <div>
      <h2 className="text-base font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
        <span className="w-1 h-4 rounded-full" style={{ background: 'var(--accent)', display: 'inline-block' }} />
        {name}
      </h2>
      <div className="scroll-row">
        {items.map((item, i) => (
          <MediaCardItem key={i} item={item} />
        ))}
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
        {/* Gradient */}
        <div className="absolute bottom-0 inset-x-0 h-16"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }} />
        {item.year && (
          <div className="absolute bottom-2 left-2 text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>{item.year}</div>
        )}
      </div>
      <p className="mt-2 text-xs font-medium leading-tight line-clamp-2" style={{ color: 'var(--text-secondary)', width: 140 }}>
        {item.title}
      </p>
    </Link>
  );
}
