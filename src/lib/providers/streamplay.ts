import axios from 'axios';

const TMDB = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p/w500';
const IMGBIG = 'https://image.tmdb.org/t/p/original';
// Public TMDB key (same one hardcoded in KissKh Utils.kt)
const API_KEY = process.env.TMDB_API || '05b5d26f15aa1f76b35187c5cc129256';

const PUBLIC_SOURCES = [
  { id: 'vidsrc', label: 'VidSrc', movie: (id: number) => `https://vidsrc.cc/v2/embed/movie/${id}`, tv: (id: number, s: number, e: number) => `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}` },
  { id: '2embed', label: '2Embed', movie: (id: number) => `https://www.2embed.cc/embed/${id}`, tv: (id: number, s: number, e: number) => `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}` },
  { id: 'vidlink', label: 'VidLink', movie: (id: number) => `https://vidlink.pro/movie/${id}`, tv: (id: number, s: number, e: number) => `https://vidlink.pro/tv/${id}/${s}/${e}` },
  { id: 'multiembed', label: 'MultiEmbed', movie: (id: number) => `https://multiembed.mov/?video_id=${id}&tmdb=1`, tv: (id: number, s: number, e: number) => `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}` },
  { id: 'vidfast', label: 'VidFast', movie: (id: number) => `https://vidfast.pro/movie/${id}`, tv: (id: number, s: number, e: number) => `https://vidfast.pro/tv/${id}/${s}/${e}` },
];

const HOME_ROWS = [
  { path: '/trending/all/day', name: 'Trending Today', type: 'mixed' },
  { path: '/trending/movie/week', name: 'Popular Movies', type: 'movie' },
  { path: '/trending/tv/week', name: 'Popular TV Shows', type: 'tv' },
  { path: '/movie/top_rated', name: 'Top Rated Movies', type: 'movie' },
  { path: '/tv/top_rated', name: 'Top Rated TV Shows', type: 'tv' },
  { path: '/discover/tv?with_networks=213', name: 'Netflix', type: 'tv' },
  { path: '/discover/tv?with_networks=1024', name: 'Amazon Prime', type: 'tv' },
  { path: '/discover/tv?with_networks=2739', name: 'Disney+', type: 'tv' },
  { path: '/discover/tv?with_original_language=ko', name: 'K-Drama', type: 'tv' },
  { path: '/discover/tv?with_keywords=210024|222243&sort_by=popularity.desc', name: 'Anime', type: 'tv' },
];

interface TmdbMedia {
  id: number; title?: string; name?: string; original_title?: string;
  poster_path?: string; backdrop_path?: string; vote_average?: number;
  media_type?: string; overview?: string; release_date?: string; first_air_date?: string;
}

function toCard(m: TmdbMedia, defaultType = 'movie') {
  const type = m.media_type || defaultType;
  return {
    id: JSON.stringify({ id: m.id, type }),
    title: m.title || m.name || '',
    poster: m.poster_path ? IMG + m.poster_path : '',
    backdrop: m.backdrop_path ? IMGBIG + m.backdrop_path : '',
    rating: m.vote_average ? (m.vote_average / 2).toFixed(1) : undefined,
    year: (m.release_date || m.first_air_date || '').slice(0, 4),
    type,
    provider: 'streamplay',
  };
}

export async function getHome(page = 1) {
  const results = await Promise.all(
    HOME_ROWS.map(async (row) => {
      try {
        const sep = row.path.includes('?') ? '&' : '?';
        const url = `${TMDB}${row.path}${sep}api_key=${API_KEY}&page=${page}&language=en-US`;
        const { data } = await axios.get(url, { timeout: 8000 });
        const items = (data.results || []).map((m: TmdbMedia) => toCard(m, row.type === 'movie' ? 'movie' : 'tv'));
        return { name: row.name, items };
      } catch { return { name: row.name, items: [] }; }
    })
  );
  return results.filter(r => r.items.length > 0);
}

export async function search(query: string, page = 1) {
  const { data } = await axios.get(
    `${TMDB}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}&page=${page}&language=en-US`,
    { timeout: 8000 }
  );
  return (data.results || []).map((m: TmdbMedia) => toCard(m));
}

export async function getDetail(dataStr: string) {
  const parsed = JSON.parse(dataStr);
  const { id, type } = parsed;
  const endpoint = type === 'movie' ? `movie/${id}` : `tv/${id}`;
  const { data } = await axios.get(
    `${TMDB}/${endpoint}?api_key=${API_KEY}&append_to_response=credits,videos,external_ids,seasons&language=en-US`,
    { timeout: 8000 }
  );
  const episodes: { season: number; episode: number; name: string; href: string }[] = [];
  if (type === 'tv' && data.seasons) {
    for (const season of data.seasons.filter((s: { season_number: number }) => s.season_number > 0)) {
      try {
        const { data: sd } = await axios.get(
          `${TMDB}/tv/${id}/season/${season.season_number}?api_key=${API_KEY}`,
          { timeout: 5000 }
        );
        for (const ep of sd.episodes || []) {
          const href = JSON.stringify({ id, type, season: ep.season_number, episode: ep.episode_number, imdbId: data.external_ids?.imdb_id });
          episodes.push({ season: ep.season_number, episode: ep.episode_number, name: ep.name, href });
        }
      } catch { /* skip */ }
    }
  }
  return {
    title: data.title || data.name,
    poster: data.poster_path ? IMG + data.poster_path : '',
    backdrop: data.backdrop_path ? IMGBIG + data.backdrop_path : '',
    overview: data.overview,
    year: (data.release_date || data.first_air_date || '').slice(0, 4),
    rating: data.vote_average ? (data.vote_average / 2).toFixed(1) : undefined,
    genres: (data.genres || []).map((g: { name: string }) => g.name),
    cast: (data.credits?.cast || []).slice(0, 8).map((c: { name: string; profile_path?: string; character?: string }) => ({
      name: c.name, photo: c.profile_path ? IMG + c.profile_path : '', role: c.character,
    })),
    trailer: (data.videos?.results || []).find((v: { type: string; key: string }) => v.type === 'Trailer')?.key,
    type,
    id,
    imdbId: data.external_ids?.imdb_id,
    episodes,
    provider: 'streamplay',
  };
}

export async function getStreams(dataStr: string) {
  const { id, type, season, episode } = JSON.parse(dataStr);
  const isMovie = type === 'movie';
  return PUBLIC_SOURCES.map((src) => ({
    url: isMovie ? src.movie(id) : src.tv(id, season, episode),
    label: src.label,
    type: 'embed',
    id: src.id,
  }));
}
