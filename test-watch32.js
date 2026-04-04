const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
fs.writeFileSync('watch32-test-output.txt', '');
const log = (...a) => { const s = a.map(x=>typeof x==='object'?JSON.stringify(x,null,2):String(x)).join(' ')+'\n'; fs.appendFileSync('watch32-test-output.txt', s); };

async function test() {
  const BASE = 'https://watch32.sx';
  const H = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE + '/',
    'X-Requested-With': 'XMLHttpRequest',
    'Accept': '*/*',
  };

  log('=== Test 1: Get movie detail page ===');
  const detailUrl = BASE + '/movie/watch-peacock-full-149641';
  const r0 = await axios.get(detailUrl, { headers: H, timeout: 10000 });
  const $0 = cheerio.load(r0.data);
  const contentId = $0('div.detail_page-watch').attr('data-id');
  log('contentId from detail page:', contentId);

  log('\n=== Test 2: Get server list ===');
  const r1 = await axios.get(BASE + '/ajax/episode/list/' + (contentId || '149641'), { headers: H, timeout: 10000 });
  log('Status:', r1.status);
  log('RAW response (first 1200):', r1.data.toString().substring(0, 1200));
  const $ = cheerio.load(r1.data);
  const links = [];
  $('a.link-item').each((i, el) => {
    links.push({ linkid: $(el).attr('data-linkid'), id: $(el).attr('data-id'), text: $(el).text().trim() });
  });
  log('Server links (a.link-item):', links);

  if (links.length === 0) {
    log('No a.link-item found. Trying other selectors...');
    const allLinks = [];
    $('[data-linkid]').each((i, el) => allLinks.push({ linkid: $(el).attr('data-linkid'), tag: el.name, text: $(el).text().trim().substring(0,30) }));
    $('[data-id]').each((i, el) => allLinks.push({ id: $(el).attr('data-id'), tag: el.name, class: $(el).attr('class') }));
    log('All elements with data-linkid or data-id:', allLinks.slice(0, 15));
    return;
  }

  const linkId = links[0].linkid || links[0].id;
  log('\n=== Test 3: Get source for linkId:', linkId, '===');
  const r2 = await axios.get(BASE + '/ajax/episode/sources/' + linkId, { headers: H, timeout: 8000 });
  log('Source result:', r2.data);
}

test().catch(e => {
  fs.appendFileSync('watch32-test-output.txt', 'ERROR: ' + e.message + '\n');
  if (e.response) fs.appendFileSync('watch32-test-output.txt', 'HTTP: ' + e.response.status + ' | ' + String(e.response.data).substring(0,300) + '\n');
});

