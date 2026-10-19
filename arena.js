'use strict';
// "Play The Elder Scrolls: Arena in the arcade": finds the player's own Steam copy of the game and packs it for the DOSBox that runs inside the game window.
// Nothing is copied anywhere permanent and nothing is distributed with Arberia Deathmatch; the files are only read from the player's Steam folder.
const fs = require('fs'), path = require('path'), cp = require('child_process'), zlib = require('zlib');

const lc = s => String(s).toLowerCase();
const ls = d => { try { return fs.readdirSync(d, { withFileTypes: true }); } catch (e) { return []; } };
const exists = p => { try { fs.accessSync(p); return true; } catch (e) { return false; } };
const home = () => process.env.HOME || process.env.USERPROFILE || require('os').homedir();

function steamRoots() {
  const out = [];
  const add = p => { if (p && !out.includes(p) && exists(path.join(p, 'steamapps'))) out.push(p); };
  if (process.env.ARBERIA_STEAM_DIR) for (const p of process.env.ARBERIA_STEAM_DIR.split(path.delimiter)) add(p);
  const h = home();
  if (process.platform === 'win32') {
    for (const key of ['HKCU\\Software\\Valve\\Steam', 'HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam']) {
      for (const val of ['SteamPath', 'InstallPath']) {
        try {
          const r = cp.spawnSync('reg', ['query', key, '/v', val], { encoding: 'utf8', timeout: 4000, windowsHide: true });
          const m = /REG_SZ\s+(.+)/.exec(r.stdout || ''); if (m) add(path.normalize(m[1].trim()));
        } catch (e) {}
      }
    }
    for (const e of [process.env['ProgramFiles(x86)'], process.env.ProgramFiles, 'C:\\Program Files (x86)', 'C:\\Program Files']) if (e) add(path.join(e, 'Steam'));
  } else if (process.platform === 'darwin') {
    add(path.join(h, 'Library', 'Application Support', 'Steam'));
  } else {
    add(path.join(h, '.steam', 'steam')); add(path.join(h, '.steam', 'root')); add(path.join(h, '.local', 'share', 'Steam'));
    add(path.join(h, '.var', 'app', 'com.valvesoftware.Steam', '.local', 'share', 'Steam')); add(path.join(h, 'snap', 'steam', 'common', '.local', 'share', 'Steam'));
  }
  return out;
}

// every Steam library folder (the main one plus the extra drives listed in libraryfolders.vdf)
function libraries() {
  const libs = [], seen = new Set();
  const add = p => { try { const r = fs.realpathSync(p); if (!seen.has(r) && exists(path.join(r, 'steamapps'))) { seen.add(r); libs.push(r); } } catch (e) {} };
  for (const r of steamRoots()) {
    add(r);
    for (const f of [path.join(r, 'steamapps', 'libraryfolders.vdf'), path.join(r, 'config', 'libraryfolders.vdf')]) {
      let t = ''; try { t = fs.readFileSync(f, 'utf8'); } catch (e) { continue; }
      for (const m of t.matchAll(/"path"\s+"([^"]+)"/g)) add(m[1].replace(/\\\\/g, '\\'));
    }
  }
  return libs;
}

const isArenaName = n => /elder\s*scrolls/i.test(n) && /\barena\b/i.test(n) && !/online|legends|blades/i.test(n);

// the folder holding Arena's own data (GLOBAL.BSA), searched a few levels down
function gameRoot(dir, depth) {
  const ents = ls(dir);
  if (ents.some(e => e.isFile() && lc(e.name) === 'global.bsa')) return dir;
  if ((depth | 0) >= 4) return null;
  for (const e of ents) if (e.isDirectory() && !/^dosbox/i.test(e.name)) { const r = gameRoot(path.join(dir, e.name), (depth | 0) + 1); if (r) return r; }
  return null;
}

function pickExe(root) {
  const names = ls(root).filter(e => e.isFile()).map(e => e.name);
  for (const want of ['a.exe', 'acd.exe', 'arena.bat', 'arena.exe']) { const n = names.find(x => lc(x) === want); if (n) return n; }
  return '';
}

let cache = null;
function find(force) {
  if (cache && !force) return cache;
  let res = { found: false };
  try {
    for (const lib of libraries()) {
      const apps = path.join(lib, 'steamapps');
      const cands = [];
      for (const e of ls(apps)) {
        const m = /^appmanifest_(\d+)\.acf$/i.exec(e.name); if (!m) continue;
        let t = ''; try { t = fs.readFileSync(path.join(apps, e.name), 'utf8'); } catch (x) { continue; }
        const nm = /"name"\s+"([^"]*)"/i.exec(t), id = /"installdir"\s+"([^"]*)"/i.exec(t);
        if (nm && id && isArenaName(nm[1])) cands.push({ name: nm[1], dir: path.join(apps, 'common', id[1]) });
      }
      for (const e of ls(path.join(apps, 'common'))) if (e.isDirectory() && isArenaName(e.name) && !cands.some(c => c.dir === path.join(apps, 'common', e.name))) cands.push({ name: e.name, dir: path.join(apps, 'common', e.name) });
      for (const c of cands) {
        if (!exists(c.dir)) continue;
        const root = gameRoot(c.dir, 0); if (!root) continue;
        const exe = pickExe(root); if (!exe) continue;
        res = { found: true, name: c.name, dir: c.dir, root, exe }; break;
      }
      if (res.found) break;
    }
  } catch (e) { res = { found: false }; }
  return (cache = res);
}

// ---- a tiny zip writer (stored, no compression): the emulator unpacks this and mounts it as drive C: ----
let crcT = null;
function crc32(b) {
  if (!crcT) { crcT = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c; } }
  let c = -1; for (let i = 0; i < b.length; i++) c = crcT[(c ^ b[i]) & 255] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function zipStore(ents) {
  const parts = [], cen = []; let off = 0;
  for (const [n, d] of ents) {
    const nb = Buffer.from(n), c = crc32(d);
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(10, 4); lh.writeUInt16LE(0x800, 6); lh.writeUInt32LE(c, 14); lh.writeUInt32LE(d.length, 18); lh.writeUInt32LE(d.length, 22); lh.writeUInt16LE(nb.length, 26);
    parts.push(lh, nb, d);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(10, 6); ch.writeUInt16LE(0x800, 8); ch.writeUInt32LE(c, 16); ch.writeUInt32LE(d.length, 20); ch.writeUInt32LE(d.length, 24); ch.writeUInt16LE(nb.length, 28); ch.writeUInt32LE(off, 42);
    cen.push(ch, nb); off += 30 + nb.length + d.length;
  }
  const cd = Buffer.concat(cen), eo = Buffer.alloc(22); eo.writeUInt32LE(0x06054b50, 0); eo.writeUInt16LE(ents.length, 8); eo.writeUInt16LE(ents.length, 10); eo.writeUInt32LE(cd.length, 12); eo.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cd, eo]);
}

const MAX_FILE = 700 * 1024 * 1024, MAX_TOTAL = 1100 * 1024 * 1024;
const SKIP_DIR = /^(dosbox[\w .-]*|_commonredist|redist|steam_?[\w-]*|\.git|__macosx)$/i, SKIP_FILE = /\.(dll|so|dylib|pdb|msi)$/i;

// ---- the game's own DOSBox configuration (Steam's release ships .conf files; use their settings and launch lines) ----
function parseConf(text) {
  const secs = {}, order = []; let cur = '';
  for (const raw of String(text).split(/\r?\n/)) {
    const l = raw.trim(); if (!l || l[0] === '#' || l[0] === ';') continue;
    const m = /^\[([^\]]+)\]/.exec(l);
    if (m) { cur = m[1].toLowerCase(); if (!secs[cur]) { secs[cur] = cur === 'autoexec' ? [] : {}; order.push(cur); } continue; }
    if (!cur) continue;
    if (cur === 'autoexec') secs[cur].push(raw.replace(/\s+$/, ''));
    else { const k = l.indexOf('='); if (k > 0) secs[cur][l.slice(0, k).trim().toLowerCase()] = l.slice(k + 1).trim(); }
  }
  return secs;
}
function findConfs(dir) {
  const out = [];
  (function walk(d, depth) {
    for (const e of ls(d)) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (depth < 3 && !/^(_commonredist|redist|\.git)$/i.test(e.name)) walk(p, depth + 1); continue; }
      if (!e.isFile() || !/\.conf$/i.test(e.name)) continue;
      let t = ''; try { t = fs.readFileSync(p, 'utf8'); } catch (x) { continue; }
      if (t.length > 300000 || !/\[(sdl|dosbox|cpu|autoexec|mixer)\]/i.test(t)) continue;
      const sc = parseConf(t), ax = (sc.autoexec || []).filter(x => x.trim() && !/^\s*(@?echo\s+off|rem\b)/i.test(x));
      let score = (ax.length ? 10 : 0) + (/arena|acd|\ba\.exe/i.test(ax.join('\n')) ? 6 : 0) + (/arena|steam/i.test(e.name) ? 2 : 0) - depth * 0.1;
      out.push({ file: p, dir: d, secs: sc, ax, score });
    }
  })(dir, 0);
  return out.sort((a, b) => a.score - b.score);   // best last, so it wins when they are merged
}

// make a mount/imgmount path from the config point into the packed folder (relative to the Steam install folder)
function fixLine(line, info, confDir) {
  const m = /^(\s*)(mount|imgmount)\s+([a-z])\s+(.*)$/i.exec(line); if (!m) return line;
  const toks = []; const re = /"([^"]*)"|(\S+)/g; let t; const rest = m[4];
  while ((t = re.exec(rest))) toks.push(t[1] !== undefined ? t[1] : t[2]);
  if (!toks.length) return line;
  // imgmount can name several images; fix every token that looks like a path to an existing file or folder
  const base = info.dir, out = toks.map((tok, idx) => {
    if (/^-/.test(tok) || (idx > 0 && !/[\\/.]/.test(tok))) return tok;
    let q = tok.replace(/\\/g, '/');
    if (q.toLowerCase().startsWith(base.replace(/\\/g, '/').toLowerCase())) q = q.slice(base.length).replace(/^\/+/, '') || '.';
    for (const b of [base, confDir]) {
      const abs = path.resolve(b, q);
      if (exists(abs) && path.relative(base, abs).split(path.sep)[0] !== '..') { const rel = path.relative(base, abs).split(path.sep).join('/'); return rel || '.'; }
    }
    return tok.replace(/\\/g, '/');
  });
  return m[1] + m[2] + ' ' + m[3] + ' ' + out.map(x => /\s/.test(x) ? '"' + x + '"' : x).join(' ');
}

function conf(info) {
  const confs = findConfs(info.dir), keep = { dosbox: ['machine', 'memsize'], cpu: ['cputype', 'cycles', 'cycleup', 'cycledown'], midi: ['mpu401'], sblaster: null, gus: null, speaker: null, dos: null };
  const merged = { dosbox: { machine: 'svga_s3', memsize: '32' }, cpu: { core: 'auto', cputype: 'auto', cycles: 'auto' }, mixer: { nosound: 'false', rate: '44100', blocksize: '1024', prebuffer: '20' },
    midi: { mpu401: 'intelligent', mididevice: 'default' }, sblaster: { sbtype: 'sb16', sbbase: '220', irq: '7', dma: '1', hdma: '5' } };
  let ax = null, axConf = null;
  for (const c of confs) {
    for (const sec of Object.keys(keep)) {
      const src = c.secs[sec]; if (!src) continue; merged[sec] = merged[sec] || {};
      for (const k of Object.keys(src)) if (!keep[sec] || keep[sec].includes(k)) merged[sec][k] = src[k];
    }
    if (c.ax.length) { ax = c.ax; axConf = c; }
  }
  let run;
  if (ax) run = ax.map(l => fixLine(l, info, axConf.dir));
  else {
    const rel = path.relative(info.dir, info.root).split(path.sep).join('/') || '.';
    run = ['mount c ' + rel, 'c:', /\.bat$/i.test(info.exe) ? 'call ' + info.exe : info.exe, 'exit'];
  }
  const lines = ['[sdl]', 'autolock=false'];
  for (const sec of Object.keys(merged)) { lines.push('[' + sec + ']'); for (const k of Object.keys(merged[sec])) lines.push(k + '=' + merged[sec][k]); }
  lines.push('[render]', 'frameskip=0', 'aspect=false', 'scaler=none', '[autoexec]', ...run, '');
  return { text: lines.join('\r\n'), used: confs.length ? path.relative(info.dir, (axConf || confs[confs.length - 1]).file) : '', autoexec: run };
}

// pack the Steam install folder (the game's own folder layout, so its config's paths still work) into a bundle for the emulator
function buildBundle(info) {
  const ents = []; let total = 0;
  (function walk(dir, rel) {
    for (const e of ls(dir)) {
      const p = path.join(dir, e.name), r = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) { if (!SKIP_DIR.test(e.name)) walk(p, r); continue; }
      if (!e.isFile() || SKIP_FILE.test(e.name) || /\.conf$/i.test(e.name) && rel === '') continue;
      let st; try { st = fs.statSync(p); } catch (x) { continue; }
      if (st.size > MAX_FILE) continue;
      total += st.size; if (total > MAX_TOTAL) throw new Error('The game folder is unexpectedly large.');
      ents.push([r, fs.readFileSync(p)]);
    }
  })(info.dir, '');
  const c = conf(info);
  info.confUsed = c.used; info.autoexec = c.autoexec;
  ents.push(['.jsdos/dosbox.conf', Buffer.from(c.text)], ['.jsdos/jsdos.json', Buffer.from(JSON.stringify({ version: '7.0.0' }))]);
  return zipStore(ents);
}

// read a zip (stored or deflated entries): used to merge the saved-game files the emulator hands back with the ones saved earlier
function readZip(b) {
  const ents = []; let e = b.length - 22;
  while (e >= 0 && b.readUInt32LE(e) !== 0x06054b50) e--;
  if (e < 0) return ents;
  const n = b.readUInt16LE(e + 10); let p = b.readUInt32LE(e + 16);
  for (let i = 0; i < n; i++) {
    if (p + 46 > b.length || b.readUInt32LE(p) !== 0x02014b50) break;
    const meth = b.readUInt16LE(p + 10), csz = b.readUInt32LE(p + 20), usz = b.readUInt32LE(p + 24), nl = b.readUInt16LE(p + 28), el = b.readUInt16LE(p + 30), cl = b.readUInt16LE(p + 32), lo = b.readUInt32LE(p + 42);
    const name = b.toString('utf8', p + 46, p + 46 + nl); p += 46 + nl + el + cl;
    if (name.endsWith('/') || lo + 30 > b.length) continue;
    const ln = b.readUInt16LE(lo + 26), le = b.readUInt16LE(lo + 28), ds = lo + 30 + ln + le, raw = b.subarray(ds, ds + csz);
    let d = null; try { d = meth === 0 ? Buffer.from(raw) : meth === 8 ? zlib.inflateRawSync(raw) : null; } catch (x) {}
    if (d && d.length === usz) ents.push([name, d]);
  }
  return ents;
}
const SAFE = /^[A-Za-z0-9_!#$%&'()@^`{}~.\/-]+$/, MAX_SAVE = 64 * 1024 * 1024;
// old saved files + the ones just changed (the newer wins) -> one zip, or null if there is nothing usable
function mergeSaves(oldBuf, newBuf) {
  const m = new Map();
  for (const buf of [oldBuf, newBuf]) {
    if (!buf) continue;
    for (const [n, d] of readZip(buf)) if (SAFE.test(n) && !n.startsWith('.') && !n.startsWith('/') && !n.includes('..')) m.set(n, d);
  }
  let total = 0; for (const d of m.values()) total += d.length;
  if (!m.size || total > MAX_SAVE) return null;
  return zipStore([...m.entries()]);
}

module.exports = { find, buildBundle, conf, parseConf, findConfs, zipStore, readZip, mergeSaves, crc32, steamRoots, libraries };
