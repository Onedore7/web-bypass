'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query)}&provider=streamplay`);
  };

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-4 md:px-10 py-3 gap-4"
      style={{ background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
      <Link href="/" className="flex items-center gap-2 flex-shrink-0">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm"
          style={{ background: 'linear-gradient(135deg, #6c63ff, #ff6584)' }}>P</div>
        <span className="font-bold text-lg hidden sm:block gradient-text">PPK MOVIE</span>
      </Link>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md">
        <div className="relative">
          <input
            type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search movies, TV shows, anime..."
            className="w-full px-4 py-2 rounded-xl text-sm outline-none transition-all"
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)',
              color: 'var(--text-primary)', caretColor: 'var(--accent)',
            }}
          />
          <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg opacity-60 hover:opacity-100 transition-opacity">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ color: 'var(--accent)' }}>
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398l3.85 3.85a1 1 0 0 0 1.415-1.415l-3.868-3.833zm-5.242 1.156a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z"/>
            </svg>
          </button>
        </div>
      </form>

      {/* Provider label */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <div className="px-2 py-1.5 rounded-lg text-sm font-medium"
          style={{
            background: 'rgba(108,99,255,0.2)',
            border: '1px solid rgba(108,99,255,0.4)',
            color: '#6c63ff',
          }}>
          <span>🌐</span>
          <span className="hidden md:inline ml-1 text-xs">StreamPlay</span>
        </div>
      </div>
    </nav>
  );
}
