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
  const [clickShieldActive, setClickShieldActive] = useState(true);
  const [clickCount, setClickCount] = useState(0);
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

  // Reset click shield when stream changes
  useEffect(() => {
    setClickShieldActive(true);
    setClickCount(0);
  }, [activeStream?.url]);

  // =============== AGGRESSIVE AD BYPASS ===============

  // 1. Block ALL popups globally — override window.open entirely
  useEffect(() => {
    const originalOpen = window.open;
    window.open = function(...args: Parameters<typeof window.open>) {
      // Only allow popups we explicitly trigger (none)
      console.log('[PPK AdBlock] Blocked popup:', args[0]);
      return null;
    };

    // Block any click that tries to open a new tab/window
    const blockAllPopupClicks = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (anchor) {
        const href = anchor.href || '';
        // Block ALL target=_blank links and suspicious links
        if (anchor.target === '_blank' || 
            href.includes('ads') || href.includes('redirect') || 
            href.includes('tracking') || href.includes('click') ||
            href.includes('pop') || href.includes('banner') ||
            href.includes('sponsor') || href.includes('promo') ||
            href.includes('offer') || href.includes('deal')) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          console.log('[PPK AdBlock] Blocked ad link:', href);
          return false;
        }
      }
    };

    // Block at capture phase to catch before any handler
    document.addEventListener('click', blockAllPopupClicks, true);
    window.addEventListener('click', blockAllPopupClicks, true);

    // 2. Block beforeunload/unload redirects
    const blockUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', blockUnload);

    // 3. Override window.location setter to prevent sneaky redirects
    // (can't fully override, but we monitor)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    history.pushState = function(...args) {
      const url = args[2] as string;
      if (url && (typeof url === 'string') && 
          (url.includes('ads') || url.includes('redirect') || url.includes('click'))) {
        console.log('[PPK AdBlock] Blocked pushState redirect:', url);
        return;
      }
      return originalPushState.apply(this, args);
    };
    history.replaceState = function(...args) {
      const url = args[2] as string;
      if (url && (typeof url === 'string') && 
          (url.includes('ads') || url.includes('redirect') || url.includes('click'))) {
        console.log('[PPK AdBlock] Blocked replaceState redirect:', url);
        return;
      }
      return originalReplaceState.apply(this, args);
    };

    // 4. MutationObserver — kill any dynamically injected ad elements on the page
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            const el = node as HTMLElement;
            const tag = el.tagName?.toLowerCase();
            const cls = el.className?.toString?.() || '';
            const id = el.id || '';
            const style = el.getAttribute('style') || '';
            
            // Kill injected iframes (ad iframes)
            if (tag === 'iframe' && el !== iframeRef.current) {
              const src = el.getAttribute('src') || '';
              if (src.includes('ads') || src.includes('doubleclick') || 
                  src.includes('googlesyndication') || src.includes('pop') ||
                  src.includes('banner') || !src.includes(window.location.hostname)) {
                el.remove();
                console.log('[PPK AdBlock] Removed injected iframe:', src);
              }
            }
            
            // Kill fixed/absolute overlays with very high z-index
            if (style.includes('z-index') && style.includes('position')) {
              const zMatch = style.match(/z-index\s*:\s*(\d+)/);
              if (zMatch && parseInt(zMatch[1]) > 9000) {
                el.remove();
                console.log('[PPK AdBlock] Removed overlay with z-index:', zMatch[1]);
              }
            }
            
            // Kill elements with ad-related classes
            if (/\b(ad[s-_]?|popup|popunder|overlay|sponsor|banner|preroll)\b/i.test(cls) ||
                /\b(ad[s-_]?|popup|popunder|overlay|sponsor|banner)\b/i.test(id)) {
              el.remove();
              console.log('[PPK AdBlock] Removed ad element:', cls || id);
            }

            // Kill scripts from ad domains
            if (tag === 'script') {
              const src = el.getAttribute('src') || '';
              if (src.includes('ads') || src.includes('doubleclick') || 
                  src.includes('googlesyndication') || src.includes('popads') ||
                  src.includes('propellerads') || src.includes('adsterra') ||
                  src.includes('clickadu') || src.includes('exoclick') ||
                  src.includes('juicyads') || src.includes('trafficjunky') ||
                  src.includes('popcash') || src.includes('hilltopads')) {
                el.remove();
                console.log('[PPK AdBlock] Removed ad script:', src);
              }
            }
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // 5. Periodic cleanup for sneaky ads that evade MutationObserver
    const cleanupInterval = setInterval(() => {
      // Remove any full-screen overlays
      document.querySelectorAll('div, section').forEach((el) => {
        const htmlEl = el as HTMLElement;
        const computed = window.getComputedStyle(htmlEl);
        const zIndex = parseInt(computed.zIndex) || 0;
        const position = computed.position;
        
        if (zIndex > 9000 && (position === 'fixed' || position === 'absolute')) {
          const rect = htmlEl.getBoundingClientRect();
          if (rect.width > window.innerWidth * 0.5 && rect.height > window.innerHeight * 0.5) {
            // This looks like a full-screen ad overlay
            if (!htmlEl.querySelector('video') && !htmlEl.closest('video')) {
              htmlEl.remove();
              console.log('[PPK AdBlock] Removed full-screen overlay');
            }
          }
        }
      });

      // Remove rogue iframes
      document.querySelectorAll('iframe').forEach((iframe) => {
        if (iframe === iframeRef.current) return;
        const src = iframe.src || '';
        const parent = iframe.parentElement;
        // If it's not our player iframe, check if it's suspicious
        if (!parent?.closest('[data-player-container]')) {
          if (iframe.style.display !== 'none' && 
              (src.includes('ads') || src.includes('pop') || src === '' || src === 'about:blank')) {
            iframe.remove();
            console.log('[PPK AdBlock] Removed rogue iframe');
          }
        }
      });
    }, 1500);

    return () => {
      window.open = originalOpen;
      document.removeEventListener('click', blockAllPopupClicks, true);
      window.removeEventListener('click', blockAllPopupClicks, true);
      window.removeEventListener('beforeunload', blockUnload);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      observer.disconnect();
      clearInterval(cleanupInterval);
    };
  }, []);

  // Handle click shield — absorbs first clicks that would trigger ads
  const handleShieldClick = useCallback(() => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    // After 2 clicks, remove shield and let user interact with player
    if (newCount >= 2) {
      setClickShieldActive(false);
    }
  }, [clickCount]);

  // Try to inject ad-blocking into iframe (works only for same-origin)
  const handleIframeLoad = useCallback(() => {
    if (!iframeRef.current) return;
    try {
      const iframeWin = iframeRef.current.contentWindow;
      if (iframeWin) {
        // Block popups inside iframe
        (iframeWin as typeof window).open = () => null;
      }
    } catch { /* cross-origin, expected */ }
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
                <>
                  <iframe
                    ref={iframeRef}
                    src={activeStream.url}
                    className="absolute inset-0 w-full h-full"
                    allowFullScreen
                    allow="autoplay; encrypted-media; picture-in-picture"
                    referrerPolicy="no-referrer"
                    onLoad={handleIframeLoad}
                    style={{ border: 'none', zIndex: 1 }}
                  />
                  {/* Click shield — absorbs ad-triggering clicks */}
                  {clickShieldActive && (
                    <div
                      onClick={handleShieldClick}
                      className="absolute inset-0 flex items-center justify-center cursor-pointer"
                      style={{
                        zIndex: 10,
                        background: clickCount === 0 
                          ? 'rgba(0,0,0,0.6)' 
                          : 'rgba(0,0,0,0.3)',
                        transition: 'background 0.3s ease',
                      }}
                    >
                      <div className="text-center">
                        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                          style={{ background: 'rgba(108,99,255,0.8)', boxShadow: '0 0 40px rgba(108,99,255,0.4)' }}>
                          <svg width="32" height="32" fill="white" viewBox="0 0 16 16">
                            <path d="M11.596 8.697L4.504 12.47A.75.75 0 013.5 11.794V4.206a.75.75 0 011.004-.703l7.092 3.773a.75.75 0 010 1.421z"/>
                          </svg>
                        </div>
                        <p className="text-white font-semibold text-lg mb-1">
                          {clickCount === 0 ? 'Click to Play' : 'Click Again to Start'}
                        </p>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
                          🛡️ Ad Shield — blocking ads
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : isM3U8 ? (
                <HLSPlayer src={activeStream.url} subtitles={subtitles} />
              ) : (
                <>
                  <iframe
                    ref={iframeRef}
                    src={activeStream.url}
                    className="absolute inset-0 w-full h-full"
                    allowFullScreen
                    allow="autoplay; encrypted-media"
                    referrerPolicy="no-referrer"
                    onLoad={handleIframeLoad}
                    style={{ border: 'none', zIndex: 1 }}
                  />
                  {clickShieldActive && (
                    <div
                      onClick={handleShieldClick}
                      className="absolute inset-0 flex items-center justify-center cursor-pointer"
                      style={{
                        zIndex: 10,
                        background: clickCount === 0 
                          ? 'rgba(0,0,0,0.6)' 
                          : 'rgba(0,0,0,0.3)',
                        transition: 'background 0.3s ease',
                      }}
                    >
                      <div className="text-center">
                        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                          style={{ background: 'rgba(108,99,255,0.8)', boxShadow: '0 0 40px rgba(108,99,255,0.4)' }}>
                          <svg width="32" height="32" fill="white" viewBox="0 0 16 16">
                            <path d="M11.596 8.697L4.504 12.47A.75.75 0 013.5 11.794V4.206a.75.75 0 011.004-.703l7.092 3.773a.75.75 0 010 1.421z"/>
                          </svg>
                        </div>
                        <p className="text-white font-semibold text-lg mb-1">
                          {clickCount === 0 ? 'Click to Play' : 'Click Again to Start'}
                        </p>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
                          🛡️ Ad Shield — blocking ads
                        </p>
                      </div>
                    </div>
                  )}
                </>
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
              Click shield absorbs ad triggers. Popups and redirects are blocked.
            </p>
            {clickShieldActive && (
              <p className="text-xs mt-1" style={{ color: 'rgba(245,158,11,0.8)' }}>
                ⚡ Shield active — click play button to dismiss
              </p>
            )}
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
