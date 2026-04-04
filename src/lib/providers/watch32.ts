import axios from 'axios';
import * as cheerio from 'cheerio';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CheerioEl = any;

const BASE = 'https://watch32.sx';
const TMDB = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p/original';
const TMDB_KEY = process.env.TMDB_API || '05b5d26f15aa1f76b35187c5cc129256';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Referer': BASE + '/',
};

const HOME_ROWS = [
  { path: '/movie?page=', name: 'Popular Movies' },
  { path: '/tv-show?page=', name: 'Popular TV Shows' },
  { path: '/top-imdb?page=', name: 'Top IMDB' },
  { path: '/coming-soon?page=', name: 'Coming Soon' },
];

function parseCards($: cheerio.CheerioAPI) {
  return $('div.flw-item').map((_: number, el: CheerioEl) => {
    const title = $(el).find('h2.film-name > a').attr('title') || $(el).find('h2.film-name > a').text().trim();
    const href = $(el).find('h2.film-name > a').attr('href') || '';
    const poster = $(el).find('img.film-poster-img').attr('data-src') || $(el).find('img.film-poster-img').attr('src') || '';
    const quality = $(el).find('div.pick.film-poster-quality').text().trim();
    if (!title || !href) return null;
    const fullUrl = href.startsWith('http') ? href : BASE + href;
    return { id: fullUrl, title, poster, quality, provider: 'watch32' };
  }).get().filter(Boolean);
}

export async function getHome(page = 1) {
  const results = await Promise.all(
    HOME_ROWS.map(async (row) => {
      try {
        const { data } = await axios.get(`${BASE}${row.path}${page}`, { headers: HEADERS, timeout: 10000 });
        const $ = cheerio.load(data);
        const items = parseCards($);
        return { name: row.name, items };
      } catch { return { name: row.name, items: [] }; }
    })
  );
  return results;
}

export async function search(query: string) {
  const slug = query.replace(/\s+/g, '-');
  const { data } = await axios.get(`${BASE}/search/${encodeURIComponent(slug)}`, { headers: HEADERS, timeout: 10000 });
  const $ = cheerio.load(data);
  return parseCards($);
}

async function fetchTmdbId(title: string, isMovie: boolean): Promise<number | null> {
  try {
    const { data } = await axios.get(
      `${TMDB}/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(title)}`,
      { timeout: 5000 }
    );
    const targetType = isMovie ? 'movie' : 'tv';
    for (const item of data.results || []) {
      if (item.media_type !== targetType) continue;
      const t = isMovie ? item.title : item.name;
      if (t?.toLowerCase() === title.toLowerCase()) return item.id;
    }
    // fuzzy fallback: return first match of right type
    return data.results?.find((i: { media_type: string; id: number }) => i.media_type === targetType)?.id ?? null;
  } catch { return null; }
}

export async function getDetail(url: string) {
  const { data } = await axios.get(url, { headers: HEADERS, timeout: 10000 });
  const $ = cheerio.load(data);

  const contentId = $('div.detail_page-watch').attr('data-id') || '';
  const name = $('h2.heading-name > a').text().trim();
  const poster = $('div.film-poster > img').attr('src') || '';
  const plot = $('div.description').text().trim();
  const year = $('div.row-line:has(> span.type > strong:contains(Released))').text().replace('Released:', '').trim().split('-')[0].trim();
  const genres = $('div.row-line:has(> span.type > strong:contains(Genre)) a').map((_: number, e: CheerioEl) => $(e).text()).get();
  const actors = $('div.row-line:has(> span.type > strong:contains(Casts)) a').map((_: number, e: CheerioEl) => $(e).text().trim()).get();
  const trailerSrc = $('iframe#iframe-trailer').attr('data-src') || '';
  const isMovie = url.includes('/movie/');

  // Fetch TMDB metadata
  const tmdbId = await fetchTmdbId(name, isMovie);
  let tmdbPoster = poster;
  let tmdbBackdrop = '';
  let rating = '';
  let cast: { name: string; photo?: string; role?: string }[] = [];

  if (tmdbId) {
    try {
      const type = isMovie ? 'movie' : 'tv';
      const { data: td } = await axios.get(
        `${TMDB}/${type}/${tmdbId}?api_key=${TMDB_KEY}&append_to_response=credits,images`,
        { timeout: 6000 }
      );
      tmdbPoster = td.poster_path ? `${TMDB_IMG}${td.poster_path}` : poster;
      tmdbBackdrop = td.backdrop_path ? `${TMDB_IMG}${td.backdrop_path}` : '';
      rating = td.vote_average?.toFixed(1) || '';
      cast = (td.credits?.cast || []).slice(0, 8).map((c: { name: string; profile_path?: string; character?: string }) => ({
        name: c.name, photo: c.profile_path ? `${TMDB_IMG}${c.profile_path}` : undefined, role: c.character,
      }));
    } catch { /* use scraped data */ }
  }

  const isSeries = !isMovie;
  const episodes: { name: string; href: string; episode: number; season: number; id: string }[] = [];

  if (isSeries && contentId) {
    try {
      const { data: seasonsHtml } = await axios.get(`${BASE}/ajax/season/list/${contentId}`, { headers: HEADERS, timeout: 8000 });
      const $s = cheerio.load(seasonsHtml);
      const seasonLinks = $s('a.ss-item').toArray();

      for (const seasonEl of seasonLinks) {
        const seasonId = $s(seasonEl).attr('data-id') || '';
        const seasonNum = parseInt($s(seasonEl).text().replace('Season', '').trim()) || 1;
        if (!seasonId) continue;

        const { data: epsHtml } = await axios.get(`${BASE}/ajax/season/episodes/${seasonId}`, { headers: HEADERS, timeout: 8000 });
        const $e = cheerio.load(epsHtml);
        $e('a.eps-item, div.eps-item').each((_: number, epEl: CheerioEl) => {
          const epId = $e(epEl).attr('data-id') || '';
          const titleAttr = $e(epEl).attr('title') || $e(epEl).find('img').attr('title') || '';
          const match = titleAttr.match(/(?:Eps|Episode)\s*(\d+):\s*(.+)/);
          if (!match || !epId) return;
          const [, epNum, epName] = match;
          episodes.push({ name: epName.trim(), href: `servers/${epId}`, episode: parseInt(epNum), season: seasonNum, id: epId });
        });
      }
    } catch { /* no episodes */ }
  }

  return {
    title: name, poster: tmdbPoster, backdrop: tmdbBackdrop, description: plot,
    year, rating, genres, cast, actors,
    type: isMovie ? 'movie' : 'series',
    trailer: trailerSrc,
    episodes, contentId, url, provider: 'watch32',
  };
}

export async function getStreams(data: string) {
  // data is either "list/{contentId}" for movies or "servers/{epId}" for episodes
  const streams: { url: string; label: string; type: string }[] = [];
  try {
    const endpoint = data.startsWith('servers/') ? data : data;
    const { data: serversHtml } = await axios.get(`${BASE}/ajax/episode/${endpoint}`, { headers: HEADERS, timeout: 8000 });
    const $ = cheerio.load(serversHtml);
    const serverLinks = $('a.link-item').toArray();

    await Promise.all(serverLinks.map(async (el: CheerioEl, i: number) => {
      const linkId = $(el).attr('data-linkid') || $(el).attr('data-id') || '';
      const label = $(el).text().trim() || `Server ${i + 1}`;
      if (!linkId) return;
      try {
        const { data: srcData } = await axios.get(
          `${BASE}/ajax/episode/sources/${linkId}`,
          { headers: HEADERS, timeout: 5000 }
        );
        if (srcData?.link) {
          streams.push({ url: srcData.link, label, type: srcData.link.includes('.m3u8') ? 'm3u8' : 'embed' });
        }
      } catch { /* skip */ }
    }));
  } catch { /* return empty */ }
  return streams;
}
