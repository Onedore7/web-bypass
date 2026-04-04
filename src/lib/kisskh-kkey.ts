// KissKh kkey generator — ported directly from kisskh.co/common.js
// Original: window._0x54b991 (obfuscated AES-based block cipher)

function strToWordArray(str: string): [number[], number] {
  const len = str.length;
  const words: number[] = [];
  for (let i = 0; i < len; i++) {
    words[i >>> 2] |= (0xff & str.charCodeAt(i)) << (24 - (i % 4) * 8);
  }
  return [words, len];
}

function wordArrayToHex(words: number[], len: number): string {
  const out: string[] = [];
  for (let i = 0; i < len; i++) {
    out.push(((words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff).toString(16).padStart(2, '0'));
  }
  return out.join('');
}

function truncate48(s: string | undefined): string {
  return (s || '').substring(0, 0x30);
}

function djb2(s: string): number {
  let h = 0;
  const len = s.length;
  for (let i = 0; i < len; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}

function pkcs16Pad(s: string): string {
  const pad = 16 - (s.length % 16);
  for (let i = 0; i < pad; i++) s += String.fromCharCode(pad);
  return s;
}

// AES S-box and round tables (initialised once)
const _tables = (() => {
  const sbox: number[] = [];
  const mixT: number[][] = [[], [], [], []];
  const mixTi: number[][] = [[], [], [], []];
  const gmul: number[] = [];
  for (let i = 0; i < 256; i++) {
    gmul[i] = i < 128 ? i << 1 : (i << 1) ^ 0x11b;
  }
  let x = 0, xi = 0;
  for (let i = 0; i < 256; i++) {
    const sx = xi ^ (xi << 1) ^ (xi << 2) ^ (xi << 3) ^ (xi << 4);
    const s = (sx >>> 8) ^ (0xff & sx) ^ 0x63;
    sbox[x] = s;
    const x2 = gmul[x], x4 = gmul[x2], x8 = gmul[x4];
    const m = (0x101 * gmul[s]) ^ (0x1010100 * s);
    mixT[0][x] = (m << 24) | (m >>> 8);
    mixT[1][x] = (m << 16) | (m >>> 16);
    mixT[2][x] = (m << 8) | (m >>> 24);
    mixT[3][x] = m;
    mixTi[0][x] = s;
    if (i !== 0) {
      x = x2 ^ gmul[gmul[gmul[x8 ^ x2]]];
      xi ^= gmul[gmul[xi]];
    } else {
      x = xi = 1;
    }
  }
  return { sbox, mixT, mixTi };
})();

function aesEncryptBlock(words: number[], offset: number) {
  const { sbox, mixT, mixTi } = _tables;
  const rcon = [0x1504af3, 0x56e619cf, 0x2e42bba6, -0x73c08f07];
  let prev: number[];
  if (offset === 0) {
    prev = rcon;
  } else {
    prev = words.slice(offset - 4, offset);
  }
  for (let j = 0; j < 4; j++) words[offset + j] ^= prev[j];

  let a0 = words[offset] ^ mixT[0][0];
  let a1 = words[offset + 1] ^ mixT[0][1];
  let a2 = words[offset + 2] ^ mixT[0][2];
  let a3 = words[offset + 3] ^ mixT[0][3];
  let ki = 4;
  const rounds = 10;
  for (let r = 1; r < rounds; r++) {
    const b0 = mixT[0][a0 >>> 24] ^ mixT[1][(a1 >>> 16) & 0xff] ^ mixT[2][(a2 >>> 8) & 0xff] ^ mixT[3][0xff & a3] ^ mixT[0][ki++];
    const b1 = mixT[0][a1 >>> 24] ^ mixT[1][(a2 >>> 16) & 0xff] ^ mixT[2][(a3 >>> 8) & 0xff] ^ mixT[3][0xff & a0] ^ mixT[0][ki++];
    const b2 = mixT[0][a2 >>> 24] ^ mixT[1][(a3 >>> 16) & 0xff] ^ mixT[2][(a0 >>> 8) & 0xff] ^ mixT[3][0xff & a1] ^ mixT[0][ki++];
    a3 = mixT[0][a3 >>> 24] ^ mixT[1][(a0 >>> 16) & 0xff] ^ mixT[2][(a1 >>> 8) & 0xff] ^ mixT[3][0xff & a2] ^ mixT[0][ki++];
    a0 = b0; a1 = b1; a2 = b2;
  }
  words[offset] = (sbox[a0 >>> 24] << 24 | sbox[(a1 >>> 16) & 0xff] << 16 | sbox[(a2 >>> 8) & 0xff] << 8 | sbox[0xff & a3]) ^ mixT[0][ki++];
  words[offset + 1] = (sbox[a1 >>> 24] << 24 | sbox[(a2 >>> 16) & 0xff] << 16 | sbox[(a3 >>> 8) & 0xff] << 8 | sbox[0xff & a0]) ^ mixT[0][ki++];
  words[offset + 2] = (sbox[a2 >>> 24] << 24 | sbox[(a3 >>> 16) & 0xff] << 16 | sbox[(a0 >>> 8) & 0xff] << 8 | sbox[0xff & a1]) ^ mixT[0][ki++];
  words[offset + 3] = (sbox[a3 >>> 24] << 24 | sbox[(a0 >>> 16) & 0xff] << 16 | sbox[(a1 >>> 8) & 0xff] << 8 | sbox[0xff & a2]) ^ mixT[0][ki++];
}

export function generateKkey(
  episodeId: string | number,
  err: string = 'false',
  ts: string = 'null',
  time: string = 'null',
  version: string = '2.8.10',
  url: string = 'https://kisskh.co/',
  referrer: string = '',
  platform: string = 'Win32',
  appCodeName: string = 'Mozilla',
  appName: string = 'Netscape',
  appVersion: string = '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
): string {
  const salt = 'mg3c3b04ba';
  const parts = [
    '', String(episodeId), String(err), salt,
    String(ts), String(time), String(version),
    truncate48(url),
    truncate48(referrer.toLowerCase()),
    truncate48(platform),
    appCodeName, appName, appVersion,
    '00', ''
  ];
  // insert djb2 hash at position 1
  parts.splice(1, 0, String(djb2(parts.join('|'))));
  const plaintext = pkcs16Pad(parts.join('|'));
  const [words, len] = strToWordArray(plaintext);
  for (let i = 0; i < len; i += 4) aesEncryptBlock(words, i);
  return wordArrayToHex(words, len).toUpperCase();
}
