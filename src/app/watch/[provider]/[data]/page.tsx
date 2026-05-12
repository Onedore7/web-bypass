'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Stream { url: string; label: string; type?: string; }
interface Subtitle { url: string; label: string; }

// CSS to inject into iframes to hide common ad elements
const AD_BLOCK_CSS = `
  /* Hide common ad containers, popups, overlays */
  [class*="ad-"], [class*="ads-"], [class*="adsbygoogle"],
  [id*="ad-"], [id*="ads-"], [id*="adsbygoogle"],
  [class*="popup"], [class*="overlay"], [class*="modal"],
  [class*="banner"], [class*="sponsor"],
  [class*="preroll"], [class*="midroll"],
  iframe[src*="ads"], iframe[src*="doubleclick"],
  iframe[src*="googlesyndication"], iframe[src*="adservice"],
  div[class*="close-btn"], div[class*="skip"],
  .popunder, .pop-under, .clickunder,
  [class*="vast-"], [id*="vast-"],
  [class*="vpaid"], [id*="vpaid"],
  div[style*="z-index: 2147483647"],
  div[style*="z-index:2147483647"],
  div[style*="z-index: 999999"],
  div[style*="z-index:999999"] {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
    width: 0 !important;
    height: 0 !important;
    position: absolute !important;
    overflow: hidden !important;
  }

  /* Prevent new windows/tabs from ad scripts */
  a[target="_blank"][rel*="nofollow"],
  a[onclick*="window.open"],
  a[href*="redirect"],
  a[href*="tracking"] {
    pointer-events: none !important;
    display: none !important;
  }
`;

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

  // Ad bypass: inject CSS into iframe and block popups
  const handleIframeLoad = useCallback(() => {
    if (!iframeRef.current) return;
    try {
      const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
      if (iframeDoc) {
        // Inject ad-blocking CSS
        const style = iframeDoc.createElement('style');
        style.textContent = AD_BLOCK_CSS;
        iframeDoc.head?.appendChild(style);

        // Block window.open calls (popup ads)
        const iframeWindow = iframeRef.current.contentWindow;
        if (iframeWindow) {
          (iframeWindow as Window & { open: typeof window.open }).open = () => null;
        }

        // Remove ad-related elements periodically
        const cleanup = () => {
          try {
            if (!iframeDoc) return;
            // Remove elements with ad-related attributes
            const adSelectors = [
              '[class*="ad"]', '[id*="ad"]', '[class*="popup"]',
              '[class*="overlay"]:not(.player-overlay)', '[class*="banner"]',
              'iframe[src*="ads"]', 'iframe[src*="doubleclick"]',
            ];
            adSelectors.forEach(sel => {
              iframeDoc.querySelectorAll(sel).forEach((el: Element) => {
                const htmlEl = el as HTMLElement;
                // Don't remove the video player itself
                if (!htmlEl.querySelector('video') && !htmlEl.closest('video')) {
                  const rect = htmlEl.getBoundingClientRect();
                  // Only hide elements that look like overlays (covering large areas)
                  if (rect.width > 200 && rect.height > 200 && htmlEl.style.zIndex && parseInt(htmlEl.style.zIndex) > 1000) {
                    htmlEl.style.display = 'none';
                  }
                }
              });
            });
          } catch { /* cross-origin, ignore */ }
        };

        // Run cleanup periodically for dynamically injected ads
        const interval = setInterval(cleanup, 2000);
        return () => clearInterval(interval);
      }
    } catch {
      // Cross-origin iframe — can't inject directly, sandboxing handles it
    }
  }, []);

  // Block page-level popup/redirect attempts
  useEffect(() => {
    const blockPopups = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'A') {
        const link = target as HTMLAnchorElement;
        if (link.target === '_blank' && (
          link.href.includes('ads') || link.href.includes('redirect') ||
          link.href.includes('tracking') || link.href.includes('click')
        )) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };
    document.addEventListener('click', blockPopups, true);
    return () => document.removeEventListener('click', blockPopups, true);
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
            <div className="relative w-full" style={{ paddingBottom: '56.25%', background: '#000' }}>
              {isEmbed ? (
                <iframe
                  ref={iframeRef}
                  src={activeStream.url}
                  className="absolute inset-0 w-full h-full"
                  allowFullScreen
                  allow="autoplay; encrypted-media; picture-in-picture"
                  referrerPolicy="no-referrer"
                  onLoad={handleIframeLoad}
                  style={{ border: 'none' }}
                />
              ) : isM3U8 ? (
                <HLSPlayer src={activeStream.url} subtitles={subtitles} />
              ) : (
                <iframe
                  ref={iframeRef}
                  src={activeStream.url}
                  className="absolute inset-0 w-full h-full"
                  allowFullScreen
                  allow="autoplay; encrypted-media"
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
