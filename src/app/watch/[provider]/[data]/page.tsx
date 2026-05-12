'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Stream { url: string; label: string; type?: string; }
interface Subtitle { url: string; label: string; }

export default function WatchPage() {
  const { data } = useParams<{ provider: string; data: string }>();
  const decodedData = decodeURIComponent(data);

  const [streams, setStreams] = useState<Stream[]>([]);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [activeStream, setActiveStream] = useState<Stream | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shieldClicks, setShieldClicks] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setLoading(true);
    setError('');
    fetch(`/api/streams?provider=streamplay&data=${encodeURIComponent(decodedData)}`)
      .then(r => r.json())
      .then(j => {
        if (j.ok) {
          setStreams(j.streams || []);
          setSubtitles(j.subtitles || []);
          if (j.streams?.length > 0) setActiveStream(j.streams[0]);
        } else {
          setError(j.error || 'Failed to load streams');
        }
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [decodedData]);

  // Reset shield when switching servers
  useEffect(() => { setShieldClicks(0); }, [activeStream?.url]);

  // ============ AD PROTECTION ON PARENT PAGE ============
  useEffect(() => {
    // 1. Kill window.open completely
    const origOpen = window.open;
    window.open = () => null;

    // 2. MutationObserver — remove injected junk on parent page
    const obs = new MutationObserver((muts) => {
      for (const m of muts) {
        m.addedNodes.forEach((n) => {
          if (n.nodeType !== 1) return;
          const el = n as HTMLElement;
          const tag = el.tagName?.toLowerCase();
          // Remove rogue iframes
          if (tag === 'iframe' && el !== iframeRef.current) { el.remove(); return; }
          // Remove high z-index overlays
          const s = el.getAttribute('style') || '';
          if (/z-index\s*:\s*\d{5,}/.test(s) && /position\s*:\s*(fixed|absolute)/.test(s)) { el.remove(); return; }
          // Remove ad scripts
          if (tag === 'script' && /ads|double|syndication|pop|propeller|adsterra/i.test(el.getAttribute('src') || '')) { el.remove(); }
        });
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });

    // 3. Block _blank links
    const blockClicks = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.('a');
      if (a?.target === '_blank') { e.preventDefault(); e.stopImmediatePropagation(); }
    };
    document.addEventListener('click', blockClicks, true);

    // 4. Detect popup via blur — re-focus and re-shield
    const onBlur = () => { setTimeout(() => window.focus(), 50); };
    window.addEventListener('blur', onBlur);

    return () => {
      window.open = origOpen;
      obs.disconnect();
      document.removeEventListener('click', blockClicks, true);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  // Try injecting into iframe (works if same-origin, won't error if cross-origin)
  const handleIframeLoad = useCallback(() => {
    try {
      const w = iframeRef.current?.contentWindow;
      if (w) (w as typeof window).open = () => null;
    } catch { /* cross-origin */ }
  }, []);

  const shieldActive = shieldClicks < 2;
  const handleShieldClick = useCallback(() => setShieldClicks(c => c + 1), []);

  const isEmbed = activeStream?.type === 'embed';
  const isM3U8 = activeStream?.type === 'm3u8' || activeStream?.url?.includes('.m3u8');

  return (
    <div className="min-h-screen" style={{ background: '#000' }}>
      {/* Top bar */}
      <div className="flex items-center gap-4 px-4 py-3" style={{ background: 'rgba(0,0,0,0.8)', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ color: 'var(--accent)', fontSize: '0.875rem' }}>← Home</Link>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>🎬 PPK MOVIE</span>
        <span style={{ color: 'rgba(67,217,173,0.8)', fontSize: '0.7rem', marginLeft: 'auto' }}>🛡️ Ad Shield</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-0">
        <div className="flex-1">
          {loading && (
            <div className="flex items-center justify-center" style={{ height: '56.25vw', maxHeight: '70vh', background: '#000' }}>
              <div className="text-center">
                <div className="spinner mx-auto mb-4" />
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading streams...</p>
              </div>
            </div>
          )}

          {!loading && error && (
            <div className="flex items-center justify-center" style={{ height: '56.25vw', maxHeight: '70vh', background: '#000' }}>
              <div className="text-center px-4">
                <div className="text-5xl mb-4">⚠️</div>
                <p className="text-red-400 font-medium mb-2">Failed to load stream</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && activeStream && (
            <div className="relative w-full" style={{ paddingBottom: '56.25%', background: '#000' }}>
              {(isEmbed || !isM3U8) ? (
                <>
                  <iframe
                    ref={iframeRef}
                    src={activeStream.url}
                    className="absolute inset-0 w-full h-full"
                    allowFullScreen
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    referrerPolicy="no-referrer"
                    onLoad={handleIframeLoad}
                    style={{ border: 'none', zIndex: 1 }}
                  />
                  {/* Click shield — absorbs first 2 ad-trigger clicks */}
                  {shieldActive && (
                    <div
                      onClick={handleShieldClick}
                      className="absolute inset-0 flex items-center justify-center cursor-pointer"
                      style={{ zIndex: 10, background: shieldClicks === 0 ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.25)', transition: 'all 0.3s' }}
                    >
                      <div className="text-center">
                        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-3"
                          style={{ background: 'rgba(108,99,255,0.85)', boxShadow: '0 0 40px rgba(108,99,255,0.4)' }}>
                          <svg width="30" height="30" fill="white" viewBox="0 0 16 16">
                            <path d="M11.596 8.697L4.504 12.47A.75.75 0 013.5 11.794V4.206a.75.75 0 011.004-.703l7.092 3.773a.75.75 0 010 1.421z"/>
                          </svg>
                        </div>
                        <p className="text-white font-semibold">{shieldClicks === 0 ? 'Click to Play' : 'Click Again'}</p>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', marginTop: 4 }}>🛡️ Absorbing ads...</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <HLSPlayer src={activeStream.url} subtitles={subtitles} />
              )}
            </div>
          )}

          {!loading && !error && streams.length === 0 && (
            <div className="flex items-center justify-center" style={{ height: '56.25vw', maxHeight: '70vh', background: '#000' }}>
              <div className="text-center">
                <div className="text-5xl mb-4">🚫</div>
                <p style={{ color: 'var(--text-secondary)' }}>No streams available</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:w-64 p-4" style={{ background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border)', minHeight: '100vh' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>SERVERS</h3>
          <div className="space-y-2">
            {streams.map((stream, i) => (
              <button key={i} onClick={() => setActiveStream(stream)}
                className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: activeStream?.url === stream.url ? 'rgba(108,99,255,0.2)' : 'rgba(255,255,255,0.04)',
                  border: activeStream?.url === stream.url ? '1px solid rgba(108,99,255,0.5)' : '1px solid var(--border)',
                  color: activeStream?.url === stream.url ? '#a599ff' : 'var(--text-secondary)',
                }}>
                <div className="flex items-center gap-2">
                  <span>🖥️</span>
                  <span>{stream.label}</span>
                </div>
              </button>
            ))}
          </div>

          {subtitles.length > 0 && (
            <>
              <h3 className="text-sm font-semibold mt-6 mb-3" style={{ color: 'var(--text-secondary)' }}>SUBTITLES</h3>
              <div className="space-y-1">
                {subtitles.map((sub, i) => (
                  <a key={i} href={sub.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all hover:bg-white/5"
                    style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                    💬 {sub.label}
                  </a>
                ))}
              </div>
            </>
          )}

          <div className="mt-6 p-3 rounded-xl" style={{ background: 'rgba(67,217,173,0.08)', border: '1px solid rgba(67,217,173,0.2)' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: 'rgba(67,217,173,0.9)' }}>🛡️ Ad Shield</p>
            <p className="text-xs" style={{ color: 'rgba(67,217,173,0.6)' }}>
              Popup blocker + click shield active. If a server has too many ads, try another server.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function HLSPlayer({ src, subtitles }: { src: string; subtitles: Subtitle[] }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
    } else {
      import('hls.js').then(({ default: Hls }) => {
        if (Hls.isSupported()) {
          const hls = new Hls();
          hls.loadSource(src);
          hls.attachMedia(video);
          return () => hls.destroy();
        }
      });
    }
  }, [src]);

  return (
    <div className="absolute inset-0">
      <video ref={videoRef} className="w-full h-full" controls autoPlay crossOrigin="anonymous" style={{ background: '#000' }}>
        {subtitles.map((sub, i) => (
          <track key={i} kind="subtitles" src={sub.url} label={sub.label} />
        ))}
      </video>
    </div>
  );
}
