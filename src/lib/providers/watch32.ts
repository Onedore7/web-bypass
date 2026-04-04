import axios from 'axios';
import * as cheerio from 'cheerio';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type El = any;

const BASE = 'https://watch32.sx';
const TMDB = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';
const TMDB_IMG_BIG = 'https://image.tmdb.org/t/p/original';
const TMDB_KEY = process.env.TMDB_API || '05b5d26f15aa1f76b35187c5cc129256';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': BASE + '/',
  'X-Requested-With': 'XMLHttpRequest',
};

// All Watch32-compatible servers from Watch32Plugin.kt
const SERVERS = [
  'https://watch32.sx',
  'https://hdtodayz.to',
  'https://zoechip.cc',
  'https://myflixerz.to',
  'https://himovies.sx',
];

// Home page rows - matches mainPageOf() in Watch32.kt
const HOME_ROWS = [
  { path: '/movie?page=',       name: '🎬 Latest Movies' },
  { path: '/tv-show?page=',     name: '📺 Latest TV Shows' },
  { path: '/top-imdb?page=',    name: '⭐ Top IMDB' },
  { path: '/coming-soon?page=', name: '🔜 Coming Soon' },
];

// TMDB-based rows for richer discovery
const TMDB_ROWS = [
  { path: '/trending/all/day',                          name: '🔥 Trending Today',    type: 'mixed' },
  { path: '/movie/now_playing',                         name: '🎥 Now Playing',        type: 'movie' },
  { path: '/tv/on_the_air',                             name: '📡 Ongoing Series',     type: 'tv'    },
  { path: '/movie/upcoming',                            name: '📅 Upcoming Movies',    type: 'movie' },
  { path: '/tv/top_rated',                              name: '🏆 Top Rated TV',       type: 'tv'    },
  { path: '/discover/tv?with_original_language=ko',     name: '🇰🇷 K-Drama',          type: 'tv'    },
  { path: '/discover/movie?with_genres=28',             name: '💥 Action Movies',      type: 'movie' },
  { path: '/discover/tv?with_keywords=210024|222243',   name: '🌸 Anime',              type: 'tv'    },
];

function parseCards($: cheerio.CheerioAPI) {
  return $('div.flw-item').map((_i: number, el: El) => {
    const a = $(el).find('h2.film-name > a');
    const title = a.attr('title') || a.text().trim();
    const href  = a.attr('href') || '';
    const poster = $(el).find('img.film-poster-img').attr('data-src') || $(el).find('img.film-poster-img').attr('src') || '';
    const quality = $(el).find('.fdi-quality, .film-poster-quality').text().trim();
    const duration = $(el).find('.fdi-duration').text().trim();
    const type = href.includes('/tv-show/') || href.includes('/tv/') ? 'tv' : 'movie';
    if (!title || !href) return null;
    const fullUrl = href.startsWith('http') ? href : BASE + href;
    return { id: fullUrl, title, poster, quality, duration, type, provider: 'watch32' };
  }).get().filter(Boolean);
}

export async function getHome(page = 1) {
  // Fetch Watch32 scraped rows + TMDB rows in parallel
  const [w32Rows, tmdbRows] = await Promise.all([
    Promise.all(HOME_ROWS.map(async (row) => {
      try {
        const { data } = await axios.get(`${BASE}${row.path}${page}`, { headers: HEADERS, timeout: 10000 });
        const $ = cheerio.load(data);
        return { name: row.name, items: parseCards($) };
      } catch { return { name: row.name, items: [] }; }
    })),
    Promise.all(TMDB_ROWS.map(async (row) => {
      try {
        const sep = row.path.includes('?') ? '&' : '?';
        const { data } = await axios.get(
          `${TMDB}${row.path}${sep}api_key=${TMDB_KEY}&page=${page}&language=en-US`,
          { timeout: 8000 }
        );
        const items = (data.results || []).map((m: TmdbMedia) => tmdbToCard(m, row.type));
        return { name: row.name, items };
      } catch { return { name: row.name, items: [] }; }
    })),
  ]);

  // Interleave: W32 first then TMDB
  const all = [...w32Rows, ...tmdbRows];
  return all.filter(r => r.items.length > 0);
}

interface TmdbMedia {
  id: number; title?: string; name?: string; poster_path?: string;
  backdrop_path?: string; vote_average?: number; release_date?: string;
  first_air_date?: string; media_type?: string;
}

function tmdbToCard(m: TmdbMedia, defaultType = 'movie') {
  const type = m.media_type || defaultType;
  return {
    id: JSON.stringify({ tmdbId: m.id, type }),
    title: m.title || m.name || '',
    poster: m.poster_path ? TMDB_IMG + m.poster_path : '',
    backdrop: m.backdrop_path ? TMDB_IMG_BIG + m.backdrop_path : '',
    rating: m.vote_average?.toFixed(1),
    year: (m.release_date || m.first_air_date || '').slice(0, 4),
    type,
    provider: 'watch32',
    isTmdb: true,
  };
}

export async function search(query: string) {
  try {
    const slug = query.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
    const { data } = await axios.get(`${BASE}/search/${encodeURIComponent(slug)}`, { headers: HEADERS, timeout: 10000 });
    const $ = cheerio.load(data);
    const results = parseCards($);
    // If no results from scrape, fall back to TMDB search
    if (results.length === 0) {
      const { data: td } = await axios.get(
        `${TMDB}/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&language=en-US`,
        { timeout: 8000 }
      );
      return (td.results || []).map((m: TmdbMedia) => tmdbToCard(m));
    }
    return results;
  } catch {
    return [];
  }
}

// Extract numeric content ID from Watch32 URL or data-id attribute
function extractContentId(url: string): string {
  // e.g. /movie/watch-peacock-full-149641  → "149641"
  const match = url.match(/-(\d+)\/?$/);
  return match ? match[1] : '';
}

export async function getDetail(idStr: string) {
  // Handle TMDB-originated cards
  try {
    const parsed = JSON.parse(idStr);
    if (parsed.tmdbId) {
      return await getTmdbDetail(parsed.tmdbId, parsed.type);
    }
  } catch { /* not JSON, treat as URL */ }

  // Watch32 URL-based detail
  const url = idStr;
  const { data } = await axios.get(url, { headers: HEADERS, timeout: 12000 });
  const $ = cheerio.load(data);

  const contentId = $('div.detail_page-watch').attr('data-id') || extractContentId(url);
  const name      = $('h2.heading-name > a').text().trim() || $('h1').first().text().trim();
  const poster    = $('div.film-poster img, div.dp-i-c-poster img').first().attr('src') || '';
  const plot      = $('div.description').text().trim();
  const imdbScore = $('button.btn-imdb').text().replace('N/A','').split(':').pop()?.trim() || '';
  const yearText  = $('div.row-line:contains("Released") a').first().text().trim();
  const year      = yearText.slice(0, 4) || '';
  const genres    = $('div.row-line:contains("Genre") a').map((_: number, e: El) => $(e).text()).get();
  const trailerSrc = $('iframe#iframe-trailer').attr('data-src') || '';
  const isMovie   = url.includes('/movie/');

  // Enhance with TMDB
  let tmdbPoster = poster, tmdbBackdrop = '', cast: { name: string; photo?: string; role?: string }[] = [];
  const tmdbId = await fetchTmdbId(name, isMovie);
  if (tmdbId) {
    try {
      const type = isMovie ? 'movie' : 'tv';
      const { data: td } = await axios.get(
        `${TMDB}/${type}/${tmdbId}?api_key=${TMDB_KEY}&append_to_response=credits`,
        { timeout: 6000 }
      );
      if (td.poster_path)   tmdbPoster   = TMDB_IMG + td.poster_path;
      if (td.backdrop_path) tmdbBackdrop = TMDB_IMG_BIG + td.backdrop_path;
      cast = (td.credits?.cast || []).slice(0, 10).map((c: { name: string; profile_path?: string; character?: string }) => ({
        name: c.name,
        photo: c.profile_path ? TMDB_IMG + c.profile_path : undefined,
        role: c.character,
      }));
    } catch { /* skip */ }
  }

  // Episodes for TV show
  const episodes: { name: string; href: string; episode: number; season: number; id: string }[] = [];
  if (!isMovie && contentId) {
    try {
      const { data: seasonsHtml } = await axios.get(`${BASE}/ajax/season/list/${contentId}`, { headers: HEADERS, timeout: 8000 });
      const $s = cheerio.load(seasonsHtml);
      for (const seasonEl of $s('a.ss-item').toArray()) {
        const seasonId  = $s(seasonEl).attr('data-id') || '';
        const seasonNum = parseInt($s(seasonEl).text().replace('Season','').trim()) || 1;
        if (!seasonId) continue;
        const { data: epsHtml } = await axios.get(`${BASE}/ajax/season/episodes/${seasonId}`, { headers: HEADERS, timeout: 8000 });
        const $e = cheerio.load(epsHtml);
        $e('a.eps-item, div.eps-item').each((_: number, epEl: El) => {
          const epId    = $e(epEl).attr('data-id') || '';
          const titleAt = $e(epEl).attr('title') || $e(epEl).find('img').attr('title') || '';
          const match   = titleAt.match(/(?:Eps|Episode)\s*(\d+):\s*(.+)/);
          if (!match || !epId) return;
          const [, epNum, epName] = match;
          episodes.push({ name: epName.trim(), href: `servers/${epId}`, episode: parseInt(epNum), season: seasonNum, id: epId });
        });
      }
    } catch { /* no episodes */ }
  }

  return {
    title: name, poster: tmdbPoster, backdrop: tmdbBackdrop,
    description: plot, year, rating: imdbScore, genres, cast,
    type: isMovie ? 'movie' : 'series',
    trailer: trailerSrc, episodes,
    // KEY FIX: store contentId so watch page can call list/{contentId}
    streamData: isMovie ? `list/${contentId}` : '',
    contentId, url, provider: 'watch32',
  };
}

async function getTmdbDetail(tmdbId: number, type: string) {
  const endpoint = type === 'movie' ? `movie/${tmdbId}` : `tv/${tmdbId}`;
  const { data } = await axios.get(
    `${TMDB}/${endpoint}?api_key=${TMDB_KEY}&append_to_response=credits,videos,seasons&language=en-US`,
    { timeout: 8000 }
  );
  const title = data.title || data.name || '';
  const episodes: { name: string; href: string; episode: number; season: number; id: string }[] = [];
  if (type === 'tv' && data.seasons) {
    for (const season of data.seasons.filter((s: { season_number: number }) => s.season_number > 0)) {
      try {
        const { data: sd } = await axios.get(`${TMDB}/tv/${tmdbId}/season/${season.season_number}?api_key=${TMDB_KEY}`, { timeout: 5000 });
        for (const ep of sd.episodes || []) {
          episodes.push({
            name: ep.name,
            href: JSON.stringify({ tmdbId, type, season: ep.season_number, episode: ep.episode_number, title }),
            episode: ep.episode_number, season: ep.season_number, id: String(ep.episode_number),
          });
        }
      } catch { /* skip */ }
    }
  }
  return {
    title, poster: data.poster_path ? TMDB_IMG + data.poster_path : '',
    backdrop: data.backdrop_path ? TMDB_IMG_BIG + data.backdrop_path : '',
    overview: data.overview, year: (data.release_date || data.first_air_date || '').slice(0, 4),
    rating: data.vote_average?.toFixed(1), genres: (data.genres || []).map((g: { name: string }) => g.name),
    cast: (data.credits?.cast || []).slice(0, 10).map((c: { name: string; profile_path?: string; character?: string }) => ({
      name: c.name, photo: c.profile_path ? TMDB_IMG + c.profile_path : undefined, role: c.character,
    })),
    trailer: (data.videos?.results || []).find((v: { type: string }) => v.type === 'Trailer')?.key,
    type, episodes,
    // TMDB-based: search Watch32 for stream on demand
    streamData: JSON.stringify({ tmdbId, type, title }),
    provider: 'watch32',
  };
}

async function fetchTmdbId(title: string, isMovie: boolean): Promise<number | null> {
  try {
    const { data } = await axios.get(
      `${TMDB}/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(title)}&language=en-US`,
      { timeout: 5000 }
    );
    const targetType = isMovie ? 'movie' : 'tv';
    for (const item of data.results || []) {
      if (item.media_type !== targetType) continue;
      const t = isMovie ? item.title : item.name;
      if (t?.toLowerCase() === title.toLowerCase()) return item.id;
    }
    // fuzzy: first match of correct type
    return data.results?.find((i: { media_type: string; id: number }) => i.media_type === targetType)?.id ?? null;
  } catch { return null; }
}

/** Per-episode data-id for ajax/episode/servers/{id} — not the series content id. */
async function findWatch32EpisodeDataId(
  seriesContentId: string,
  season: number,
  episode: number
): Promise<string | null> {
  try {
    const { data: seasonsHtml } = await axios.get(`${BASE}/ajax/season/list/${seriesContentId}`, { headers: HEADERS, timeout: 8000 });
    const $s = cheerio.load(seasonsHtml);
    for (const seasonEl of $s('a.ss-item').toArray()) {
      const seasonId = $s(seasonEl).attr('data-id') || '';
      const seasonNum = parseInt($s(seasonEl).text().replace(/Season/gi, '').trim(), 10) || 1;
      if (!seasonId || seasonNum !== season) continue;
      const { data: epsHtml } = await axios.get(`${BASE}/ajax/season/episodes/${seasonId}`, { headers: HEADERS, timeout: 8000 });
      const $e = cheerio.load(epsHtml);
      let found: string | null = null;
      $e('a.eps-item, div.eps-item').each((_: number, epEl: El) => {
        if (found) return;
        const epId = $e(epEl).attr('data-id') || '';
        const titleAt = $e(epEl).attr('title') || $e(epEl).find('img').attr('title') || '';
        const match = titleAt.match(/(?:Eps|Episode)\s*(\d+):\s*(.+)/);
        if (!match || !epId) return;
        const epNum = parseInt(match[1], 10);
        if (epNum === episode) found = epId;
      });
      return found;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getStreams(streamData: string) {
  const streams: { url: string; label: string; type: string }[] = [];

  // Handle TMDB-sourced items
  let endpoint = streamData; // e.g. "list/149641" or "servers/12345"
  let tmdbFallback: { tmdbId: number; type: string; season: number; episode: number } | null = null;
  try {
    const parsed = JSON.parse(streamData);
    if (parsed.tmdbId) {
      const season = typeof parsed.season === 'number' ? parsed.season : 1;
      const episode = typeof parsed.episode === 'number' ? parsed.episode : 1;
      tmdbFallback = { tmdbId: parsed.tmdbId, type: parsed.type, season, episode };
      const contentId = await findWatch32ContentId(parsed.title, parsed.type);
      if (!contentId) {
        return getFallbackEmbeds(parsed.tmdbId, parsed.type, season, episode);
      }
      if (parsed.type === 'movie') {
        endpoint = `list/${contentId}`;
      } else {
        const epDataId = await findWatch32EpisodeDataId(contentId, season, episode);
        if (!epDataId) {
          return getFallbackEmbeds(parsed.tmdbId, parsed.type, season, episode);
        }
        endpoint = `servers/${epDataId}`;
      }
    }
  } catch { /* not JSON, use as-is */ }

  for (const server of SERVERS) {
    try {
      const ajaxUrl = `${server}/ajax/episode/${endpoint}`;
      const { data: serversHtml } = await axios.get(ajaxUrl, {
        headers: {
          'User-Agent': HEADERS['User-Agent'],
          'Referer': server + '/',
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'text/html, */*; q=0.01',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(serversHtml);
      // Confirmed from live test: servers use class="link-item" with data-id (NOT data-linkid)
      const serverLinks = $('a.link-item').toArray();
      if (serverLinks.length === 0) continue;

      const results = await Promise.allSettled(
        serverLinks.map(async (el: El, i: number) => {
          // Watch32 uses data-id for the link ID (confirmed by live test)
          const linkId = $(el).attr('data-id') || $(el).attr('data-linkid') || '';
          const label  = $(el).find('span').text().trim() || $(el).text().trim() || `Server ${i + 1}`;
          if (!linkId) return null;
          const { data: srcData } = await axios.get(
            `${server}/ajax/episode/sources/${linkId}`,
            {
              headers: {
                'User-Agent': HEADERS['User-Agent'],
                'Referer': server + '/',
                'X-Requested-With': 'XMLHttpRequest',
              },
              timeout: 8000,
            }
          );
          if (srcData?.link) {
            const isM3u8 = srcData.link.includes('.m3u8');
            return { url: srcData.link, label, type: isM3u8 ? 'm3u8' : 'embed' };
          }
          return null;
        })
      );

      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) streams.push(r.value);
      }

      if (streams.length > 0) break;
    } catch { continue; }
  }

  if (streams.length === 0 && tmdbFallback) {
    return getFallbackEmbeds(
      tmdbFallback.tmdbId,
      tmdbFallback.type,
      tmdbFallback.season,
      tmdbFallback.episode
    );
  }

  return streams;
}




async function findWatch32ContentId(title: string, type: string): Promise<string | null> {
  try {
    const slug = title.replace(/\s+/g, '-');
    const path = type === 'movie' ? '/movie' : '/tv-show';
    const { data } = await axios.get(`${BASE}/search/${encodeURIComponent(slug)}`, { headers: HEADERS, timeout: 8000 });
    const $ = cheerio.load(data);
    const first = $('h2.film-name > a').first().attr('href') || '';
    if (!first) return null;
    const detailUrl = first.startsWith('http') ? first : BASE + first;
    const { data: detail } = await axios.get(detailUrl, { headers: HEADERS, timeout: 8000 });
    const $d = cheerio.load(detail);
    return $d('div.detail_page-watch').attr('data-id') || extractContentId(detailUrl) || null;
  } catch { return null; }
}

function getFallbackEmbeds(tmdbId: number, type: string, season = 1, episode = 1) {
  const isMovie = type === 'movie';
  const s = season;
  const e = episode;
  return [
    { url: isMovie ? `https://vidsrc.cc/v2/embed/movie/${tmdbId}` : `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${s}/${e}`, label: 'VidSrc', type: 'embed' },
    { url: isMovie ? `https://www.2embed.cc/embed/${tmdbId}` : `https://www.2embed.cc/embedtv/${tmdbId}&s=${s}&e=${e}`, label: '2Embed', type: 'embed' },
    { url: isMovie ? `https://vidlink.pro/movie/${tmdbId}` : `https://vidlink.pro/tv/${tmdbId}/${s}/${e}`, label: 'VidLink', type: 'embed' },
    { url: isMovie ? `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1` : `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${s}&e=${e}`, label: 'MultiEmbed', type: 'embed' },
  ];
}
