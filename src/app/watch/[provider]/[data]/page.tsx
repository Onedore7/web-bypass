'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Stream { url: string; label: string; type?: string; }
interface Subtitle { url: string; label: string; }

// Route embed URLs through our ad-stripping proxy
function getProxiedUrl(url: string): string {
  return `/api/proxy?url=${encodeURIComponent(url)}`;
}

export default function WatchPage() {
  const { data } = useParams<{ provider: string; data: string }>();
  const decodedData = decodeURIComponent(data);

  const [streams, setStreams] = useState<Stream[]>([]);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [activeStream, setActiveStream] = useState<Stream | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

  // ============ PARENT PAGE AD PROTECTION ============
  useEffect(() => {
    // Block ALL popups from this page
    const originalOpen = window.open;
    window.open = () => null;

    // Block any dynamically added elements on our page
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            const el = node as HTMLElement;
            const tag = el.tagName?.toLowerCase();
            // Kill injected iframes that aren't our player
            if (tag === 'iframe' && el !== iframeRef.current) {
              el.remove();
            }
            // Kill high z-index overlays
            const style = el.getAttribute('style') || '';
            if (style.includes('z-index') && style.includes('position')) {
              const zMatch = style.match(/z-index\s*:\s*(\d+)/);
              if (zMatch && parseInt(zMatch[1]) > 9000) {
                el.remove();
              }
            }
            // Kill ad scripts
            if (tag === 'script') {
              const src = el.getAttribute('src') || '';
              if (/ads|doubleclick|googlesyndication|popads|propeller|adsterra/i.test(src)) {
                el.remove();
              }
            }
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Block ad links at capture phase
    const blockAdClicks = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest?.('a');
      if (anchor?.target === '_blank') {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    document.addEventListener('click', blockAdClicks, true);

    return () => {
      window.open = originalOpen;
      observer.disconnect();
      document.removeEventListener('click', blockAdClicks, true);
    };
  }, []);

  // After iframe loads (now same-origin via proxy), inject additional blocking
  const handleIframeLoad = useCallback(() => {
    if (!iframeRef.current) return;
    try {
      const iframeWin = iframeRef.current.contentWindow;
      const iframeDoc = iframeRef.current.contentDocument;
      if (iframeWin && iframeDoc) {
        // The proxy already injected our blocking code, but reinforce:
        (iframeWin as typeof window).open = () => null;
        
        // Also block popups in any nested iframes
        const nestedIframes = iframeDoc.querySelectorAll('iframe');
        nestedIframes.forEach((nested) => {
          try {
            if (nested.contentWindow) {
              (nested.contentWindow as typeof window).open = () => null;
            }
          } catch { /* cross-origin nested iframe */ }
        });
      }
    } catch { /* if proxy didn't work for some reason */ }
  }, []);

  const isEmbed = activeStream?.type === 'embed';
  const isM3U8 = activeStream?.type === 'm3u8' || activeStream?.url?.includes('.m3u8');

  return (
    <div className="min-h-screen" style={{ background: '#000' }}>
      {/* Top bar */}
      <div className="flex items-center gap-4 px-4 py-3" style={{ background: 'rgba(0,0,0,0.8)', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ color: 'var(--accent)', fontSize: '0.875rem' }}>← Home</Link>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          🎬 PPK MOVIE
        </span>
        <span style={{ color: 'rgba(67,217,173,0.8)', fontSize: '0.7rem', marginLeft: 'auto' }}>
          🛡️ Ad Shield Active
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-0">
        {/* Video area */}
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
            <div className="relative w-full" style={{ paddingBottom: '56.25%', background: '#000' }} data-player-container>
              {isEmbed ? (
                <iframe
                  ref={iframeRef}
                  src={getProxiedUrl(activeStream.url)}
                  className="absolute inset-0 w-full h-full"
                  allowFullScreen
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  referrerPolicy="no-referrer"
                  onLoad={handleIframeLoad}
                  style={{ border: 'none' }}
                />
              ) : isM3U8 ? (
                <HLSPlayer src={activeStream.url} subtitles={subtitles} />
              ) : (
                <iframe
                  ref={iframeRef}
                  src={getProxiedUrl(activeStream.url)}
                  className="absolute inset-0 w-full h-full"
                  allowFullScreen
                  allow="autoplay; encrypted-media; fullscreen"
                  referrerPolicy="no-referrer"
                  onLoad={handleIframeLoad}
                  style={{ border: 'none' }}
                />
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

        {/* Server selector */}
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
                  <span>{stream.type === 'embed' ? '🖥️' : '📺'}</span>
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

          {/* Ad Shield Info */}
          <div className="mt-6 p-3 rounded-xl" style={{ background: 'rgba(67,217,173,0.08)', border: '1px solid rgba(67,217,173,0.2)' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: 'rgba(67,217,173,0.9)' }}>🛡️ Ad Shield</p>
            <p className="text-xs" style={{ color: 'rgba(67,217,173,0.6)' }}>
              Server-side proxy strips ads before they reach your browser. Zero popups.
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
      <video
        ref={videoRef}
        className="w-full h-full"
        controls autoPlay
        crossOrigin="anonymous"
        style={{ background: '#000' }}
      >
        {subtitles.map((sub, i) => (
          <track key={i} kind="subtitles" src={sub.url} label={sub.label} />
        ))}
      </video>
    </div>
  );
}
