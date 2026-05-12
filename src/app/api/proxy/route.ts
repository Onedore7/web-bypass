import { NextRequest, NextResponse } from 'next/server';

// Comprehensive ad-blocking script injected into proxied pages
const AD_BLOCK_INJECT = `
<script>
(function() {
  'use strict';

  // ===== 1. BLOCK ALL POPUPS =====
  window.open = function() { return null; };
  
  // Override on any nested frames too
  var origCreateElement = document.createElement.bind(document);
  document.createElement = function(tag) {
    var el = origCreateElement(tag);
    if (tag.toLowerCase() === 'iframe') {
      // Monitor iframe for popup overrides
      setTimeout(function() {
        try {
          if (el.contentWindow) {
            el.contentWindow.open = function() { return null; };
          }
        } catch(e) {}
      }, 100);
    }
    if (tag.toLowerCase() === 'script') {
      // Block known ad scripts
      var origSetAttribute = el.setAttribute.bind(el);
      el.setAttribute = function(name, value) {
        if (name === 'src' && typeof value === 'string') {
          var adDomains = [
            'doubleclick', 'googlesyndication', 'googleadservices',
            'popads', 'propellerads', 'adsterra', 'clickadu',
            'exoclick', 'juicyads', 'trafficjunky', 'popcash',
            'hilltopads', 'adcash', 'admaven', 'richpush',
            'evadav', 'pushground', 'monetag', 'galaksion',
            'a-ads', 'bitmedia', 'coinzilla', 'adxxx',
            'trafficstars', 'clickaine', 'revcontent',
            'mgid', 'taboola', 'outbrain', 'criteo',
            'ad.plus', 'adblockanalytics', 'adpushup',
            'bidvertiser', 'popunder', 'clicksor', 
            'adf.ly', 'shorte.st', 'bc.vc',
            'surfe.be', 'linkvertise', 'ouo.io'
          ];
          for (var i = 0; i < adDomains.length; i++) {
            if (value.toLowerCase().indexOf(adDomains[i]) !== -1) {
              value = 'data:text/javascript,//blocked';
              break;
            }
          }
        }
        return origSetAttribute(name, value);
      };
    }
    return el;
  };

  // ===== 2. BLOCK EVENT-BASED AD TRIGGERS =====
  // Many ad scripts add click listeners on document/body to hijack clicks
  var origAddEventListener = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(type, listener, options) {
    // Block suspicious click/mousedown/pointerdown listeners on document/body/window
    if ((this === document || this === document.body || this === window) &&
        (type === 'click' || type === 'mousedown' || type === 'pointerdown' || type === 'mouseup' || type === 'pointerup')) {
      var listenerStr = listener.toString();
      // Block if the listener mentions window.open, popup, or ad-related terms
      if (listenerStr.indexOf('window.open') !== -1 ||
          listenerStr.indexOf('_blank') !== -1 ||
          listenerStr.indexOf('popup') !== -1 ||
          listenerStr.indexOf('popunder') !== -1 ||
          listenerStr.indexOf('click_') !== -1 ||
          listenerStr.indexOf('openTab') !== -1 ||
          listenerStr.indexOf('openWindow') !== -1 ||
          listenerStr.indexOf('pop_') !== -1 ||
          listenerStr.length > 2000) {
        // Likely an ad click handler, block it
        return;
      }
    }
    // Block visibility/blur/focus listeners used for tab detection
    if ((this === document || this === window) &&
        (type === 'visibilitychange' || type === 'blur' || type === 'focus') &&
        listener.toString().indexOf('window.open') !== -1) {
      return;
    }
    return origAddEventListener.call(this, type, listener, options);
  };

  // ===== 3. BLOCK EVAL AND FUNCTION CONSTRUCTOR (ad script injection) =====
  var origEval = window.eval;
  window.eval = function(code) {
    if (typeof code === 'string' && 
        (code.indexOf('popunder') !== -1 || 
         code.indexOf('window.open') !== -1 ||
         code.indexOf('_blank') !== -1 ||
         code.indexOf('clickunder') !== -1)) {
      return undefined;
    }
    return origEval.call(window, code);
  };

  // ===== 4. BLOCK NAVIGATION/REDIRECTS =====
  // Prevent location changes from ad scripts
  var allowedHosts = [window.location.hostname];
  
  // Override anchor clicks
  document.addEventListener('click', function(e) {
    var anchor = e.target.closest ? e.target.closest('a') : null;
    if (anchor && anchor.target === '_blank') {
      var href = anchor.href || '';
      if (href.indexOf(window.location.hostname) === -1) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    }
  }, true);

  // ===== 5. PERIODIC CLEANUP =====
  setInterval(function() {
    // Remove elements with extremely high z-index (ad overlays)
    var allEls = document.querySelectorAll('*');
    for (var i = 0; i < allEls.length; i++) {
      var el = allEls[i];
      var style = window.getComputedStyle(el);
      var zIndex = parseInt(style.zIndex) || 0;
      var position = style.position;
      
      if (zIndex > 9000 && (position === 'fixed' || position === 'absolute')) {
        var rect = el.getBoundingClientRect();
        if (rect.width > 100 && rect.height > 100) {
          if (!el.querySelector('video') && el.tagName !== 'VIDEO' && 
              !el.closest('.jw-wrapper') && !el.closest('.plyr') && 
              !el.closest('[class*="player"]') && !el.closest('[id*="player"]')) {
            el.style.display = 'none';
            el.style.visibility = 'hidden';
            el.style.pointerEvents = 'none';
          }
        }
      }
    }

    // Remove rogue iframes
    var iframes = document.querySelectorAll('iframe');
    for (var j = 0; j < iframes.length; j++) {
      var iframe = iframes[j];
      var src = iframe.src || '';
      var w = iframe.offsetWidth;
      var h = iframe.offsetHeight;
      
      // Tiny hidden iframes or ad iframes
      if ((w <= 1 && h <= 1) || (w === 0 && h === 0)) {
        iframe.remove();
        continue;
      }
      if (src.indexOf('doubleclick') !== -1 || src.indexOf('googlesyndication') !== -1 ||
          src.indexOf('ads') !== -1 || src.indexOf('pop') !== -1) {
        iframe.remove();
      }
    }
  }, 1000);

  // ===== 6. OVERRIDE setTimeout/setInterval for ad timers =====
  var origSetTimeout = window.setTimeout;
  window.setTimeout = function(fn, delay) {
    if (typeof fn === 'string' && 
        (fn.indexOf('window.open') !== -1 || fn.indexOf('popup') !== -1)) {
      return 0;
    }
    return origSetTimeout.apply(window, arguments);
  };

  var origSetInterval = window.setInterval;
  window.setInterval = function(fn, delay) {
    if (typeof fn === 'string' && 
        (fn.indexOf('window.open') !== -1 || fn.indexOf('popup') !== -1)) {
      return 0;
    }
    return origSetInterval.apply(window, arguments);
  };

})();
</script>
<style>
  /* Nuclear CSS ad blocking */
  [class*="ad-"], [class*="ads-"], [class*="adsbygoogle"],
  [id*="ad-"], [id*="ads-"], [id*="adsbygoogle"],
  [class*="popup"], [class*="popunder"], [class*="pop-up"],
  [class*="overlay"]:not([class*="player"]):not([class*="video"]),
  [class*="banner"]:not([class*="player"]):not([class*="video"]),
  [class*="sponsor"], [class*="preroll"], [class*="midroll"],
  [class*="vast-"], [id*="vast-"], [class*="vpaid"],
  iframe[src*="ads"], iframe[src*="doubleclick"],
  iframe[src*="googlesyndication"], iframe[src*="adservice"],
  .popunder, .pop-under, .clickunder,
  div[onclick*="window.open"], a[onclick*="window.open"],
  div[style*="z-index: 2147483647"], div[style*="z-index:2147483647"],
  div[style*="z-index: 999999"], div[style*="z-index:999999"],
  div[style*="z-index: 99999"], div[style*="z-index:99999"],
  [class*="close-btn"]:not([class*="player"]),
  [class*="skip-ad"], [class*="ad-skip"],
  [id*="overlay"]:not([id*="player"]):not([id*="video"]) {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
    width: 0 !important;
    height: 0 !important;
    max-height: 0 !important;
    max-width: 0 !important;
    overflow: hidden !important;
    position: absolute !important;
    left: -9999px !important;
    top: -9999px !important;
  }
  
  /* Ensure video player is always visible */
  video, .jw-wrapper, .plyr, [class*="player"], [id*="player"] {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
  }
</style>
`;

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  try {
    const targetUrl = new URL(url);
    
    // Fetch the embed page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': targetUrl.origin,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return new NextResponse('Failed to fetch embed', { status: response.status });
    }

    let html = await response.text();

    // Inject our ad-blocking code as the FIRST thing in <head>
    if (html.includes('<head>')) {
      html = html.replace('<head>', '<head>' + AD_BLOCK_INJECT);
    } else if (html.includes('<HEAD>')) {
      html = html.replace('<HEAD>', '<HEAD>' + AD_BLOCK_INJECT);
    } else {
      // No head tag, prepend
      html = AD_BLOCK_INJECT + html;
    }

    // Remove known ad script tags entirely from the HTML
    const adScriptPatterns = [
      /<script[^>]*src="[^"]*(?:popads|propellerads|adsterra|clickadu|exoclick|juicyads|trafficjunky|popcash|hilltopads|adcash|admaven|doubleclick|googlesyndication|googleadservices|popunder|clicksor)[^"]*"[^>]*><\/script>/gi,
      /<script[^>]*src="[^"]*(?:monetag|galaksion|a-ads|bitmedia|coinzilla|trafficstars|clickaine|adblockanalytics|bidvertiser|revcontent|mgid|taboola|outbrain|criteo)[^"]*"[^>]*><\/script>/gi,
    ];
    
    for (const pattern of adScriptPatterns) {
      html = html.replace(pattern, '<!-- ad script removed -->');
    }

    // Remove inline scripts that contain ad-related code
    html = html.replace(/<script[^>]*>\s*(?:.*(?:popunder|pop_under|clickunder|window\.open\s*\([^)]*(?:ads|redirect|tracking)).*)\s*<\/script>/gi, '<!-- ad inline script removed -->');

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'X-Frame-Options': 'ALLOWALL',
        // Don't cache to ensure fresh ad-blocking
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (e: unknown) {
    return new NextResponse(`Proxy error: ${String(e)}`, { status: 500 });
  }
}
