import axios from 'axios';
import { generateKkey } from '../kisskh-kkey';

const BASE = 'https://kisskh.ovh';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Referer': BASE + '/',
};

const CATEGORIES = [
  { params: '&type=0&sub=0&country=0&status=0&order=2', name: 'Latest' },
  { params: '&type=0&sub=0&country=2&status=0&order=1', name: 'Top K-Drama' },
  { params: '&type=0&sub=0&country=1&status=0&order=1', name: 'Top C-Drama' },
  { params: '&type=2&sub=0&country=2&status=0&order=1', name: 'Top Movies' },
  { params: '&type=3&sub=0&country=0&status=0&order=1', name: 'Anime Popular' },
  { params: '&type=4&sub=0&country=0&status=0&order=1', name: 'Hollywood' },
];

function mediaToCard(m: KKMedia) {
  return {
    id: `${m.title}/${m.id}`,
    title: m.title || '',
    poster: m.thumbnail || '',
    episodes: m.episodesCount,
    provider: 'kisskh',
  };
}

interface KKMedia { id: number; title: string; thumbnail: string; episodesCount: number; label: string; }
interface KKEpisode { id: number; number: number; sub: number; }
interface KKDetail {
  id: number; title: string; description: string; thumbnail: string;
  releaseDate: string; status: string; type: string; country: string;
  episodes: KKEpisode[];
}

export async function getHome(page = 1) {
  const results = await Promise.all(
    CATEGORIES.map(async (cat) => {
      try {
        const { data } = await axios.get(
          `${BASE}/api/DramaList/List?page=${page}${cat.params}`,
          { headers: HEADERS, timeout: 8000 }
        );
        const items = (data?.data || []).map(mediaToCard);
        return { name: cat.name, items };
      } catch { return { name: cat.name, items: [] }; }
    })
  );
  return results;
}

export async function search(query: string) {
  const { data } = await axios.get(
    `${BASE}/api/DramaList/Search?q=${encodeURIComponent(query)}&type=0`,
    { headers: { ...HEADERS, Referer: BASE + '/' }, timeout: 8000 }
  );
  return (Array.isArray(data) ? data : []).map(mediaToCard);
}

export async function getDetail(idStr: string) {
  const id = idStr.split('/').pop();
  const { data } = await axios.get<KKDetail>(
    `${BASE}/api/DramaList/Drama/${id}?isq=false`,
    { headers: HEADERS, timeout: 8000 }
  );
  const episodes = (data.episodes || []).reverse().map((ep) => ({
    id: ep.id,
    number: ep.number,
    sub: ep.sub,
    name: `Episode ${Math.floor(ep.number)}`,
    href: `${data.title}/${data.id}/ep/${ep.id}`,
  }));
  return {
    title: data.title,
    poster: data.thumbnail,
    description: data.description,
    year: data.releaseDate?.slice(0, 4),
    status: data.status,
    type: data.type,
    country: data.country,
    episodes,
    id: data.id,
    provider: 'kisskh',
  };
}

export async function getStreams(episodeId: number | string) {
  const epId = String(episodeId);
  const kkey = generateKkey(epId);
  const { data } = await axios.get(
    `${BASE}/api/DramaList/Episode/${epId}.png?err=false&ts=null&time=null&kkey=${kkey}`,
    { headers: HEADERS, timeout: 10000 }
  );
  const streams: { url: string; label: string; type: string }[] = [];
  if (data?.Video) streams.push({ url: data.Video, label: 'Main (M3U8)', type: 'm3u8' });
  if (data?.ThirdParty) streams.push({ url: data.ThirdParty, label: 'Third Party', type: 'embed' });
  return streams;
}

export async function getSubtitles(episodeId: number | string) {
  const epId = String(episodeId);
  const kkey = generateKkey(epId);
  try {
    const { data } = await axios.get(
      `${BASE}/api/Sub/${epId}?kkey=${kkey}`,
      { headers: HEADERS, timeout: 8000 }
    );
    return Array.isArray(data) ? data.map((s: { src: string; label: string }) => ({ url: s.src, label: s.label })) : [];
  } catch { return []; }
}
