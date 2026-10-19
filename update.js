'use strict';
// Checks GitHub for a newer release and installs it (the same job as Updater.exe, done inside the game).
const fs = require('fs'), path = require('path'), zlib = require('zlib'), crypto = require('crypto');
const REPO = 'EffDeeArr/ad', ASSET = 'game-files.zip';
const norm = v => /^0\.\d+\.0$/.test(v) ? v.slice(0, -2) : v;
const sha1 = b => crypto.createHash('sha1').update(b).digest('hex');
const safe = n => typeof n === 'string' && n && !n.includes('..') && !n.startsWith('/') && !n.includes('\\') && !n.includes(':');

async function getBuf(f, url, limit) {
  const r = await f(url, { headers: { 'User-Agent': 'ArberiaDeathmatch', Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(120000) });
  if (!r.ok) throw new Error(url + ' answered ' + r.status);
  const b = Buffer.from(await r.arrayBuffer());
  if (b.length > limit) throw new Error('download too large');
  return b;
}
// newest release: { version, url } or null when there is none
async function latest(f, api) {
  const j = JSON.parse((await getBuf(f, (api || 'https://api.github.com') + '/repos/' + REPO + '/releases/latest', 4 << 20)).toString('utf8'));
  const a = (j.assets || []).find(x => x.name === ASSET);
  if (!j.tag_name || !a) return null;
  return { version: String(j.tag_name).replace(/^v/, ''), url: a.browser_download_url };
}
// reads every entry of a zip (stored or deflate) into a Map name -> Buffer
function unzip(buf) {
  let e = buf.length - 22;
  while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  if (e < 0) throw new Error('not a zip');
  const n = buf.readUInt16LE(e + 10);
  let p = buf.readUInt32LE(e + 16);
  const out = new Map();
  for (let i = 0; i < n; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('bad zip');
    const method = buf.readUInt16LE(p + 10), csz = buf.readUInt32LE(p + 20), nl = buf.readUInt16LE(p + 28), el = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32), lo = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nl);
    const ds = lo + 30 + buf.readUInt16LE(lo + 26) + buf.readUInt16LE(lo + 28), raw = buf.subarray(ds, ds + csz);
    if (!name.endsWith('/')) out.set(name, method === 8 ? zlib.inflateRawSync(raw) : raw);
    p += 46 + nl + el + cl;
  }
  return out;
}
// downloads the release and installs it into appDir; throws before touching anything if the download is not valid
async function install(f, appDir, rel, curVer) {
  const files = unzip(await getBuf(f, rel.url, 200 << 20));
  const m = JSON.parse((files.get('patch.json') || Buffer.from('{}')).toString('utf8'));
  if (m.to !== rel.version || !m.hashes) throw new Error('update file list does not match the release');
  for (const [name, data] of files) {
    if (name === 'patch.json') continue;
    if (!safe(name) || !m.hashes[name] || sha1(data) !== m.hashes[name]) throw new Error('checksum failed for ' + name);
  }
  const bak = path.join(path.dirname(appDir), 'app-backup-' + String(curVer).replace(/[\\/:]/g, '_'));
  let n = 0;
  for (const [name, data] of files) {
    if (name === 'patch.json') continue;
    const dst = path.join(appDir, ...name.split('/'));
    let old = null; try { old = fs.readFileSync(dst); } catch (e) {}
    if (old && sha1(old) === m.hashes[name]) continue;
    if (old) { const bp = path.join(bak, ...name.split('/')); fs.mkdirSync(path.dirname(bp), { recursive: true }); fs.writeFileSync(bp, old); }
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, data); n++;
  }
  for (const d of m.deleted || []) {
    if (!safe(d)) continue;
    const dst = path.join(appDir, ...d.split('/'));
    try { const old = fs.readFileSync(dst), bp = path.join(bak, ...d.split('/')); fs.mkdirSync(path.dirname(bp), { recursive: true }); fs.writeFileSync(bp, old); fs.unlinkSync(dst); } catch (e) {}
  }
  return n;
}
module.exports = { latest, install, norm, unzip };
