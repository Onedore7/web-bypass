import axios from 'axios';
import * as cheerio from 'cheerio';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CheerioEl = any;

const BASE = 'https://ww73.pencurimovie.bond';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Referer': BASE + '/',
};

function fixUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return BASE + path;
}

export async function getHome(page = 1) {
  const sections = [
    { path: `movies/page/${page}`, name: 'Latest Movies' },
    { path: `series/page/${page}`, name: 'TV Series' },
    { path: `most-rating/page/${page}`, name: 'Most Rated' },
    { path: `top-imdb/page/${page}`, name: 'Top IMDB' },
  ];
  const results = await Promise.all(
    sections.map(async (s) => {
      try {
        const { data } = await axios.get(`${BASE}/${s.path}`, { headers: HEADERS, timeout: 10000 });
        const $ = cheerio.load(data);
        const items = $('div.ml-item').map((_, el) => parseCard($, el)).get().filter(Boolean);
        return { name: s.name, items };
      } catch { return { name: s.name, items: [] }; }
    })
  );
  return results;
}

export async function search(query: string) {
  const { data } = await axios.get(`${BASE}/?s=${encodeURIComponent(query)}`, { headers: HEADERS, timeout: 10000 });
  const $ = cheerio.load(data);
  return $('div.ml-item').map((_, el) => parseCard($, el)).get().filter(Boolean);
}

function parseCard($: cheerio.CheerioAPI, el: CheerioEl) {
  const a = $(el).find('a');
  const title = a.attr('oldtitle')?.split('(')[0].trim() || $(el).find('.mli-info h2').text().trim();
  const href = fixUrl(a.attr('href') || '');
  const poster = fixUrl($(el).find('a img').attr('data-original') || $(el).find('a img').attr('src') || '');
  const quality = $(el).find('span.mli-quality').text().trim();
  if (!title || !href) return null;
  return { id: href, title, poster, quality, provider: 'pencurimovie' };
}

export async function getDetail(url: string) {
  const { data } = await axios.get(url, { headers: HEADERS, timeout: 10000 });
  const $ = cheerio.load(data);
  const title = $('div.mvic-desc h3').text().trim().split('(')[0].trim();
  const poster = $('meta[property="og:image"]').attr('content') || '';
  const description = $('div.desc p.f-desc').text().trim();
  const trailer = $('meta[itemprop="embedUrl"]').attr('content') || '';
  const genre = $('div.mvic-info p:contains(Genre)').find('a').map((_, e) => $(e).text()).get();
  const actors = $('div.mvic-info p:contains(Actors)').find('a').map((_, e) => $(e).text()).get();
  const year = parseInt($('div.mvic-info p:contains(Release)').find('a').first().text()) || null;
  const isSeries = url.includes('series');
  const episodes: { name: string; href: string; episode: number | null; season: number | null }[] = [];
  if (isSeries) {
    $('div.tvseason').each((_, block) => {
      const season = parseInt($(block).find('strong').text().replace('Season', '').trim()) || null;
      $(block).find('div.les-content a').each((_, a) => {
        const name = $(a).text().split('-').slice(1).join('-').trim();
        const href = fixUrl($(a).attr('href') || '');
        const epNum = parseInt($(a).text().replace('Episode', '').split('-')[0].trim()) || null;
        if (href) episodes.push({ name, href, episode: epNum, season });
      });
    });
  }
  return { title, poster, description, trailer, genre, actors, year, type: isSeries ? 'series' : 'movie', episodes, url };
}

export async function getStreams(url: string) {
  const { data } = await axios.get(url, { headers: HEADERS, timeout: 10000 });
  const $ = cheerio.load(data);
  const streams: { url: string; label: string }[] = [];
  $('div.movieplay iframe').each((_, el) => {
    const src = $(el).attr('data-src') || $(el).attr('src') || '';
    if (src) streams.push({ url: src, label: 'Server ' + (streams.length + 1) });
  });
  return streams;
}
