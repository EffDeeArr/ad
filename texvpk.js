'use strict';
/* Reads Source engine game files from a folder the player points at (desktop app only):
   .vpk archives (versions 1 and 2, with or without split _000.vpk parts), loose materials/ folders,
   .vmt material files (including "patch" materials) and .vtf textures (DXT1/3/5 and the common raw formats).
   Everything is read-only, and the lookups are by name inside the archives, so no path from a map ever touches the disk. */
const fs = require('fs');
const path = require('path');

const TEX = 128;                       // the game draws every texture as TEX x TEX
const MAXMIP = 512;                    // never decode more than this on either side

/* ---------- VPK ---------- */
function readVpkDir(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const hb = Buffer.alloc(28);
    const n = fs.readSync(fd, hb, 0, 28, 0);
    if (n < 12 || hb.readUInt32LE(0) !== 0x55aa1234) throw new Error('not a vpk');
    const ver = hb.readUInt32LE(4), treeSize = hb.readUInt32LE(8);
    if (ver !== 1 && ver !== 2) throw new Error('unsupported vpk version ' + ver);
    const hsz = ver === 1 ? 12 : 28;
    if (treeSize <= 0 || treeSize > 512 * 1024 * 1024) throw new Error('bad vpk tree');
    const tree = Buffer.alloc(treeSize);
    fs.readSync(fd, tree, 0, treeSize, hsz);
    const out = new Map();
    let p = 0;
    const str = () => { let e = tree.indexOf(0, p); if (e < 0) throw new Error('bad vpk tree'); const s = tree.toString('latin1', p, e); p = e + 1; return s; };
    for (;;) {
      const ext = str(); if (ext === '') break;
      for (;;) {
        const dir = str(); if (dir === '') break;
        for (;;) {
          const name = str(); if (name === '') break;
          if (p + 18 > treeSize) throw new Error('bad vpk tree');
          const preload = tree.readUInt16LE(p + 4), arch = tree.readUInt16LE(p + 6), off = tree.readUInt32LE(p + 8), len = tree.readUInt32LE(p + 12);
          const pre = p + 18;
          p = pre + preload;
          const lx = ext.toLowerCase();
          if (lx !== 'vmt' && lx !== 'vtf' && lx !== 'mdl' && lx !== 'vvd' && lx !== 'vtx') continue;
          const d = dir === ' ' ? '' : dir.replace(/\\/g, '/').toLowerCase(), nm = name === ' ' ? '' : name.toLowerCase();
          out.set((d ? d + '/' : '') + nm + '.' + lx, { arch, off, len, preload, preAt: pre });
        }
      }
    }
    return { file, hsz, treeSize, ver, tree, entries: out };
  } finally { fs.closeSync(fd); }
}

class Source {
  constructor() { this.vpks = []; this.dirs = []; this.fds = new Map(); this.count = 0; }
  addVpk(file) {
    const v = readVpkDir(file); this.vpks.push(v); this.count += v.entries.size; return v;
  }
  fd(f) { let x = this.fds.get(f); if (x === undefined) { try { x = fs.openSync(f, 'r'); } catch (e) { x = null; } this.fds.set(f, x); } return x; }
  close() { for (const x of this.fds.values()) if (x != null) try { fs.closeSync(x); } catch (e) {} this.fds.clear(); }
  /* file contents by lowercase relative path ('materials/concrete/x.vmt') or null */
  read(rel) {
    rel = rel.toLowerCase().replace(/\\/g, '/').replace(/^\/+/, '');
    if (rel.includes('..')) return null;
    for (const d of this.dirs) {
      const f = path.join(d, rel);
      try { if (fs.statSync(f).isFile()) return fs.readFileSync(f); } catch (e) {}
    }
    for (const v of this.vpks) {
      const e = v.entries.get(rel); if (!e) continue;
      const total = e.preload + e.len;
      if (total <= 0 || total > 64 * 1024 * 1024) continue;
      const buf = Buffer.alloc(total);
      if (e.preload) v.tree.copy(buf, 0, e.preAt, e.preAt + e.preload);
      if (e.len) {
        let f, base = 0;
        if (e.arch === 0x7fff) { f = v.file; base = v.hsz + v.treeSize; }
        else f = v.file.replace(/_dir\.vpk$/i, '_' + String(e.arch).padStart(3, '0') + '.vpk');
        const fd = this.fd(f); if (fd == null) continue;
        const got = fs.readSync(fd, buf, e.preload, e.len, base + e.off);
        if (got < e.len) continue;
      }
      return buf;
    }
    return null;
  }
}

/* look for *_dir.vpk files and a loose materials/ folder in the chosen folder and just below it */
function openFolder(root) {
  const src = new Source(), seen = new Set(), problems = [];
  const visit = (dir, depth) => {
    let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
    for (const e of ents) {
      const f = path.join(dir, e.name);
      if (e.isFile() && /_dir\.vpk$/i.test(e.name) && !/sound|_vo_|^vo_/i.test(e.name) && !seen.has(f)) {
        seen.add(f);
        try { src.addVpk(f); } catch (x) { problems.push(e.name + ': ' + x.message); }
      } else if (e.isDirectory()) {
        if (e.name.toLowerCase() === 'materials') { src.dirs.push(dir); continue; }
        if (depth < 3 && !/^(bin|platform|sound|maps|media|resource|scripts|cfg|download|custom_?|screenshots|sourcemods?)$/i.test(e.name)) visit(f, depth + 1);
      }
    }
  };
  visit(root, 0);
  // a Team Fortress 2 install: the game lives in a "tf" folder next to hl2
  return { src, problems };
}

/* ---------- VMT ---------- */
function parseKv(text) {
  const t = text.replace(/\/\/[^\n]*/g, '');
  let i = 0;
  const tok = () => {
    while (i < t.length && /\s/.test(t[i])) i++;
    if (i >= t.length) return null;
    if (t[i] === '"') { const e = t.indexOf('"', i + 1); const s = t.slice(i + 1, e < 0 ? t.length : e); i = e < 0 ? t.length : e + 1; return { s }; }
    if (t[i] === '{' || t[i] === '}') return { b: t[i++] };
    let s = ''; while (i < t.length && !/[\s{}"]/.test(t[i])) s += t[i++]; return { s };
  };
  const block = () => {
    const o = {};
    for (;;) {
      const k = tok(); if (!k || k.b === '}') return o;
      if (k.b) continue;
      const v = tok(); if (!v) return o;
      if (v.b === '{') o[k.s.toLowerCase()] = block(); else if (v.b === '}') return o; else o[k.s.toLowerCase()] = v.s;
    }
  };
  const root = {};
  for (;;) { const k = tok(); if (!k) break; const v = tok(); if (!v) break; if (v.b === '{') root[k.s.toLowerCase()] = block(); }
  return root;
}
function loadVmt(src, rel, depth) {
  const b = src.read(rel); if (!b) return null;
  let kv; try { kv = parseKv(b.toString('latin1')); } catch (e) { return null; }
  const shader = Object.keys(kv)[0]; if (!shader) return null;
  let p = kv[shader]; if (typeof p !== 'object') return null;
  if (shader === 'patch' && (depth || 0) < 4 && typeof p.include === 'string') {
    let inc = p.include.toLowerCase().replace(/\\/g, '/'); if (!/\.vmt$/.test(inc)) inc += '.vmt';
    const base = loadVmt(src, inc, (depth || 0) + 1);
    const out = Object.assign({}, base ? base.params : {});
    for (const sec of ['insert', 'replace']) if (p[sec] && typeof p[sec] === 'object') for (const k in p[sec]) if (typeof p[sec][k] === 'string') out[k] = p[sec][k];
    return { shader: base ? base.shader : shader, params: out };
  }
  return { shader, params: p };
}
const flag = v => v !== undefined && /^(1|true|yes)$/i.test(String(v));

/* ---------- VTF ---------- */
const BPP = { 0: 4, 1: 4, 2: 3, 3: 3, 4: 2, 5: 1, 6: 2, 8: 1, 11: 4, 12: 4, 16: 4, 17: 2, 18: 2, 19: 2, 21: 2, 22: 2 };
const isDxt = f => f === 13 || f === 14 || f === 15 || f === 20;
function imgSize(f, w, h) {
  if (isDxt(f)) return Math.max(1, (w + 3) >> 2) * Math.max(1, (h + 3) >> 2) * (f === 13 || f === 20 ? 8 : 16);
  const b = BPP[f]; return b ? w * h * b : -1;
}
const c565 = (v, o) => { o[0] = ((v >> 11) & 31) * 255 / 31 | 0; o[1] = ((v >> 5) & 63) * 255 / 63 | 0; o[2] = (v & 31) * 255 / 31 | 0; };
function decodeDxt(buf, at, w, h, fmt) {
  const out = new Uint8Array(w * h * 4), bw = (w + 3) >> 2, bh = (h + 3) >> 2, bs = fmt === 13 || fmt === 20 ? 8 : 16;
  const pal = new Uint8Array(16), ca = [0, 0, 0], cb = [0, 0, 0], al = new Uint8Array(16);
  for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) {
    const o = at + (by * bw + bx) * bs, co = fmt === 13 || fmt === 20 ? o : o + 8;
    const c0 = buf.readUInt16LE(co), c1 = buf.readUInt16LE(co + 2);
    c565(c0, ca); c565(c1, cb);
    for (let k = 0; k < 3; k++) { pal[k] = ca[k]; pal[4 + k] = cb[k]; }
    pal[3] = pal[7] = 255; pal[11] = pal[15] = 255;
    if (c0 > c1 || (fmt !== 13 && fmt !== 20)) { for (let k = 0; k < 3; k++) { pal[8 + k] = (2 * ca[k] + cb[k]) / 3 | 0; pal[12 + k] = (ca[k] + 2 * cb[k]) / 3 | 0; } }
    else { for (let k = 0; k < 3; k++) { pal[8 + k] = (ca[k] + cb[k]) >> 1; pal[12 + k] = 0; } pal[15] = fmt === 20 ? 0 : 255; }
    if (fmt === 14) { for (let k = 0; k < 8; k++) { const b = buf[o + k]; al[k * 2] = (b & 15) * 17; al[k * 2 + 1] = (b >> 4) * 17; } }
    else if (fmt === 15) {
      const a0 = buf[o], a1 = buf[o + 1], A = [a0, a1];
      if (a0 > a1) for (let k = 1; k < 7; k++) A.push(((7 - k) * a0 + k * a1) / 7 | 0); else { for (let k = 1; k < 5; k++) A.push(((5 - k) * a0 + k * a1) / 5 | 0); A.push(0, 255); }
      let lo = buf.readUInt32LE(o + 2), hi = buf.readUInt16LE(o + 6), bits = BigInt(lo) | (BigInt(hi) << 32n);
      for (let k = 0; k < 16; k++) { al[k] = A[Number(bits & 7n)]; bits >>= 3n; }
    }
    const ix = buf.readUInt32LE(co + 4);
    for (let k = 0; k < 16; k++) {
      const x = bx * 4 + (k & 3), y = by * 4 + (k >> 2); if (x >= w || y >= h) continue;
      const c = (ix >> (k * 2)) & 3, d = (y * w + x) * 4;
      out[d] = pal[c * 4]; out[d + 1] = pal[c * 4 + 1]; out[d + 2] = pal[c * 4 + 2];
      out[d + 3] = fmt === 13 ? 255 : fmt === 20 ? pal[c * 4 + 3] : al[k];
    }
  }
  return out;
}
function decodeRaw(buf, at, w, h, f) {
  const out = new Uint8Array(w * h * 4), n = w * h;
  for (let i = 0; i < n; i++) {
    let r = 0, g = 0, b = 0, a = 255; const d = i * 4;
    switch (f) {
      case 0: r = buf[at + d]; g = buf[at + d + 1]; b = buf[at + d + 2]; a = buf[at + d + 3]; break;
      case 1: a = buf[at + d]; b = buf[at + d + 1]; g = buf[at + d + 2]; r = buf[at + d + 3]; break;
      case 2: r = buf[at + i * 3]; g = buf[at + i * 3 + 1]; b = buf[at + i * 3 + 2]; break;
      case 3: b = buf[at + i * 3]; g = buf[at + i * 3 + 1]; r = buf[at + i * 3 + 2]; break;
      case 4: { const v = buf.readUInt16LE(at + i * 2); r = ((v >> 11) & 31) * 255 / 31 | 0; g = ((v >> 5) & 63) * 255 / 63 | 0; b = (v & 31) * 255 / 31 | 0; break; }
      case 17: { const v = buf.readUInt16LE(at + i * 2); b = ((v >> 11) & 31) * 255 / 31 | 0; g = ((v >> 5) & 63) * 255 / 63 | 0; r = (v & 31) * 255 / 31 | 0; break; }
      case 5: r = g = b = buf[at + i]; break;
      case 6: r = g = b = buf[at + i * 2]; a = buf[at + i * 2 + 1]; break;
      case 8: r = g = b = 255; a = buf[at + i]; break;
      case 11: a = buf[at + d]; r = buf[at + d + 1]; g = buf[at + d + 2]; b = buf[at + d + 3]; break;
      case 12: b = buf[at + d]; g = buf[at + d + 1]; r = buf[at + d + 2]; a = buf[at + d + 3]; break;
      case 16: b = buf[at + d]; g = buf[at + d + 1]; r = buf[at + d + 2]; break;
      case 22: r = buf[at + i * 2]; g = buf[at + i * 2 + 1]; b = 128; break;
      default: r = g = b = 128;
    }
    out[d] = r; out[d + 1] = g; out[d + 2] = b; out[d + 3] = a;
  }
  return out;
}
/* the biggest mip (up to MAXMIP on a side) of frame 0, as RGBA */
function decodeVtf(buf) {
  if (buf.length < 64 || buf.toString('latin1', 0, 4) !== 'VTF\0') return null;
  const hdr = buf.readUInt32LE(12), W = buf.readUInt16LE(16), H = buf.readUInt16LE(18), flags = buf.readUInt32LE(20), frames = Math.max(1, buf.readUInt16LE(24));
  const fmt = buf.readInt32LE(52), mips = buf[56], lowF = buf.readInt32LE(57), lw = buf[61], lh = buf[62];
  const minor = buf.readUInt32LE(8), depth = minor >= 2 ? Math.max(1, buf.readUInt16LE(63)) : 1;
  const faces = flags & 0x4000 ? (minor < 5 ? 7 : 6) : 1;
  if (!W || !H || !mips || imgSize(fmt, 1, 1) < 0) return null;
  let at = hdr;
  if (lowF >= 0 && lw && lh) { const s = imgSize(lowF, lw, lh); if (s > 0) at += s; }
  const dim = m => [Math.max(1, W >> m), Math.max(1, H >> m)];
  let pick = 0; while (pick < mips - 1 && (dim(pick)[0] > MAXMIP || dim(pick)[1] > MAXMIP)) pick++;
  for (let m = mips - 1; m > pick; m--) { const [w, h] = dim(m); at += imgSize(fmt, w, h) * frames * faces * depth; }
  const [w, h] = dim(pick), sz = imgSize(fmt, w, h);
  if (at + sz > buf.length) return null;
  const rgba = isDxt(fmt) ? decodeDxt(buf, at, w, h, fmt) : decodeRaw(buf, at, w, h, fmt);
  return { w, h, rgba, flags };
}
/* resample to TEX x TEX: box filter down, bilinear up */
function toTile(img, keepAlpha, gain) {
  const { w, h, rgba } = img, out = new Uint32Array(TEX * TEX);
  const sx = w / TEX, sy = h / TEX;
  for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
    let r = 0, g = 0, b = 0, a = 0, n = 0;
    if (sx > 1 || sy > 1) {
      const x0 = Math.floor(x * sx), x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx)), y0 = Math.floor(y * sy), y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy));
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { const o = (yy * w + xx) * 4, al = rgba[o + 3]; r += rgba[o] * al; g += rgba[o + 1] * al; b += rgba[o + 2] * al; a += al; n++; }
      if (a > 0) { r /= a; g /= a; b /= a; } a = a / n;
    } else {
      const fx = Math.min(w - 1, (x + .5) * sx - .5), fy = Math.min(h - 1, (y + .5) * sy - .5), x0 = Math.max(0, Math.floor(fx)), y0 = Math.max(0, Math.floor(fy)), x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1), tx = Math.max(0, fx - x0), ty = Math.max(0, fy - y0);
      for (let k = 0; k < 4; k++) {
        const v = (rgba[(y0 * w + x0) * 4 + k] * (1 - tx) + rgba[(y0 * w + x1) * 4 + k] * tx) * (1 - ty) + (rgba[(y1 * w + x0) * 4 + k] * (1 - tx) + rgba[(y1 * w + x1) * 4 + k] * tx) * ty;
        if (k === 0) r = v; else if (k === 1) g = v; else if (k === 2) b = v; else a = v;
      }
    }
    const A = keepAlpha ? (a >= 128 ? 255 : 0) : 255;
    out[y * TEX + x] = ((A << 24) | (Math.min(255, b * gain) << 16) | (Math.min(255, g * gain) << 8) | Math.min(255, r * gain)) >>> 0;
  }
  return out;
}

/* ---------- name -> tile ---------- */
function cleanName(n) {
  n = String(n).toLowerCase().replace(/\\/g, '/').replace(/^\/+/, '').replace(/\.vmt$/, '');
  return n;
}
/* a map can carry its own copies of materials ("maps/<map>/tile/floor_001a_-521_-2705_-161"); the original is the name without that decoration */
function originalName(n) {
  const m = /^maps\/[^\/]+\/(.+?)_-?\d+_-?\d+_-?\d+$/.exec(n);
  return m ? m[1] : null;
}
function loadTile(src, name, gain) {
  const n = cleanName(name);
  if (!n || n.includes('..')) return null;
  const tries = [n]; const o = originalName(n); if (o) tries.push(o);
  for (const t of tries) {
    const vm = loadVmt(src, 'materials/' + t + '.vmt');
    let tex = vm && vm.params['$basetexture'];
    if (typeof tex !== 'string' || !tex) {
      if (!vm) { const direct = src.read('materials/' + t + '.vtf'); if (direct) { const img = decodeVtf(direct); if (img) return { tile: toTile(img, false, gain), alpha: false }; } }
      continue;
    }
    tex = tex.toLowerCase().replace(/\\/g, '/').replace(/\.vtf$/, '');
    const vt = src.read('materials/' + tex + '.vtf'); if (!vt) continue;
    const img = decodeVtf(vt); if (!img) continue;
    const alpha = flag(vm.params['$alphatest']) || flag(vm.params['$translucent']);
    return { tile: toTile(img, alpha, gain), alpha };
  }
  return null;
}


/* ---------- model files (.mdl): only the size of the model and the name of its material, so props can be drawn as boxes of the right size ---------- */
function modelInfo(src, rel) {
  const b = src.read(rel); if (!b || b.length < 232 || b.readInt32LE(0) !== 0x54534449) return null;
  const f = o => b.readFloatLE(o);
  let box = [f(104), f(108), f(112), f(116), f(120), f(124)];
  if (!box.every(Number.isFinite) || box[3] - box[0] < .5 || box[4] - box[1] < .5 || box[5] - box[2] < .5) {
    box = [f(128), f(132), f(136), f(140), f(144), f(148)];
    if (!box.every(Number.isFinite) || box[3] - box[0] < .5) return null;
  }
  const str = o => { if (o < 0 || o >= b.length) return ''; let e = o; while (e < b.length && b[e] && e - o < 200) e++; return b.toString('latin1', o, e); };
  const mats = [];
  try {
    const nt = b.readInt32LE(204), ti = b.readInt32LE(208), nd = b.readInt32LE(212), di = b.readInt32LE(216);
    const dirs = []; for (let i = 0; i < Math.min(nd, 8); i++) dirs.push(str(b.readInt32LE(di + i * 4)));
    for (let i = 0; i < Math.min(nt, 8); i++) {
      const at = ti + i * 64, nm = str(at + b.readInt32LE(at));
      for (const d of dirs.length ? dirs : ['']) {
        const c = (d + nm).toLowerCase().replace(/\\/g, '/').replace(/^\/+/, '');
        if (!mats.includes(c) && src.read('materials/' + c + '.vmt')) mats.push(c);
      }
    }
  } catch (e) {}
  return { b: box.map(v => +v.toFixed(2)), mats };
}


/* ---------- model meshes: .mdl + .vvd + .vtx -> triangles (lowest level of detail), per material ---------- */
function modelMesh(src, rel) {
  const base = rel.replace(/\.mdl$/i, '');
  const mdl = src.read(base + '.mdl'), vvd = src.read(base + '.vvd');
  let vtx = null; for (const ext of ['.dx90.vtx', '.dx80.vtx', '.sw.vtx']) { vtx = src.read(base + ext); if (vtx) break; }
  if (!mdl || !vvd || !vtx || mdl.length < 240 || vvd.length < 64 || vtx.length < 36) return null;
  if (mdl.readInt32LE(0) !== 0x54534449 || vvd.readInt32LE(0) !== 0x56534449) return null;
  const mv = mdl.readInt32LE(4); if (mv < 44 || mv > 49 || vvd.readInt32LE(4) !== 4 || vtx.readInt32LE(0) !== 7) return null;
  const hull = [mdl.readFloatLE(104), mdl.readFloatLE(108), mdl.readFloatLE(112), mdl.readFloatLE(116), mdl.readFloatLE(120), mdl.readFloatLE(124)];
  if (!hull.every(Number.isFinite)) return null;
  const str = (b, o) => { if (o < 0 || o >= b.length) return ''; let e = o; while (e < b.length && b[e] && e - o < 200) e++; return b.toString('latin1', o, e); };
  // vertices (with the fix-up table that stitches the level-of-detail 0 list together)
  const totalV = vvd.readInt32LE(16), nfix = vvd.readInt32LE(48), fixOff = vvd.readInt32LE(52), vOff = vvd.readInt32LE(56);
  if (totalV <= 0 || totalV > 200000 || vOff + totalV * 48 > vvd.length) return null;
  const ids = [];
  if (nfix > 0 && nfix < 100000) { for (let i = 0; i < nfix; i++) { const lod = vvd.readInt32LE(fixOff + i * 12), s0 = vvd.readInt32LE(fixOff + i * 12 + 4), n = vvd.readInt32LE(fixOff + i * 12 + 8); if (lod >= 0) for (let k = 0; k < n && ids.length < 400000; k++) ids.push(s0 + k); } }
  else for (let i = 0; i < totalV; i++) ids.push(i);
  const nV = ids.length, pos = new Float32Array(nV * 3), uv = new Float32Array(nV * 2);
  for (let i = 0; i < nV; i++) { const o = vOff + ids[i] * 48; if (o + 48 > vvd.length) return null; pos[i * 3] = vvd.readFloatLE(o + 16); pos[i * 3 + 1] = vvd.readFloatLE(o + 20); pos[i * 3 + 2] = vvd.readFloatLE(o + 24); uv[i * 2] = vvd.readFloatLE(o + 40); uv[i * 2 + 1] = vvd.readFloatLE(o + 44); }
  // materials: skin families, then the texture each mesh uses
  const nt = mdl.readInt32LE(204), ti = mdl.readInt32LE(208), nd = mdl.readInt32LE(212), di = mdl.readInt32LE(216);
  const nsr = mdl.readInt32LE(220), nsf = Math.max(1, Math.min(8, mdl.readInt32LE(224))), si = mdl.readInt32LE(228);
  if (nt < 0 || nt > 64 || nd < 0 || nd > 16 || nsr < 0 || nsr > 64) return null;
  const dirs = []; for (let i = 0; i < nd; i++) dirs.push(str(mdl, mdl.readInt32LE(di + i * 4)));
  const texName = []; for (let i = 0; i < nt; i++) { const at = ti + i * 64; texName.push(str(mdl, at + mdl.readInt32LE(at))); }
  const matOf = idx => {
    const nm = texName[idx]; if (!nm) return null; let first = null;
    for (const d of dirs.length ? dirs : ['']) { const c = (d + nm).toLowerCase().replace(/\\/g, '/').replace(/^\/+/, ''); if (!first) first = c; if (src.read('materials/' + c + '.vmt')) return c; }
    return first;
  };
  const skinTex = (fam, m) => { const o = si + (Math.min(fam, nsf - 1) * nsr + m) * 2; return (m >= 0 && m < nsr && o + 2 <= mdl.length) ? mdl.readInt16LE(o) : -1; };
  // mesh layout from the .mdl: bodypart -> model 0 -> meshes
  const nbp = mdl.readInt32LE(232), bpo = mdl.readInt32LE(236); if (nbp <= 0 || nbp > 32) return null;
  const meshes = []; // per bodypart: [{mat, vbase}]
  for (let b = 0; b < nbp; b++) {
    const bp = bpo + b * 16, nm = mdl.readInt32LE(bp + 4), mo = bp + mdl.readInt32LE(bp + 12); if (nm < 1) { meshes.push([]); continue; }
    const nmesh = mdl.readInt32LE(mo + 72), mi = mo + mdl.readInt32LE(mo + 76), vi = mdl.readInt32LE(mo + 84), arr = [];
    if (nmesh < 0 || nmesh > 64) return null;
    for (let k = 0; k < nmesh; k++) { const m = mi + k * 116; arr.push({ m: mdl.readInt32LE(m), vbase: (vi / 48 | 0) + mdl.readInt32LE(m + 12) }); }
    meshes.push(arr);
  }
  // triangles from the .vtx: pick the lowest level of detail that still has triangles
  const nlod = vtx.readInt32LE(16), nvb = vtx.readInt32LE(24), vbo = vtx.readInt32LE(28); if (nlod < 1 || nlod > 8) return null;
  const build = lod => {
    const parts = []; let tris = 0;
    for (let b = 0; b < Math.min(nvb, nbp); b++) {
      const bp = vbo + b * 8; if (vtx.readInt32LE(bp) < 1) continue;
      const mo = bp + vtx.readInt32LE(bp + 4), lo = mo + vtx.readInt32LE(mo + 4) + lod * 12; if (lo + 12 > vtx.length) return null;
      const nm = vtx.readInt32LE(lo), mo2 = lo + vtx.readInt32LE(lo + 4);
      for (let k = 0; k < nm && k < (meshes[b] || []).length; k++) {
        const mh = mo2 + k * 9, nsg = vtx.readInt32LE(mh), sgo = mh + vtx.readInt32LE(mh + 4), mesh = meshes[b][k], tri = [];
        for (let g = 0; g < nsg; g++) {
          const sg = sgo + g * 25, nvv = vtx.readInt32LE(sg), vo = sg + vtx.readInt32LE(sg + 4), nix = vtx.readInt32LE(sg + 8), io = sg + vtx.readInt32LE(sg + 12), nst = vtx.readInt32LE(sg + 16), so = sg + vtx.readInt32LE(sg + 20);
          if (nvv < 0 || nix < 0 || nst < 0 || vo + nvv * 9 > vtx.length || io + nix * 2 > vtx.length) return null;
          const gv = i => vtx.readUInt16LE(vo + i * 9 + 4);
          for (let s2 = 0; s2 < nst; s2++) {
            const st = so + s2 * 27, ni = vtx.readInt32LE(st), ioff = vtx.readInt32LE(st + 4), fl = vtx[st + 18];
            const ix = j => { const v = vtx.readUInt16LE(io + (ioff + j) * 2); return v < nvv ? mesh.vbase + gv(v) : -1; };
            if (fl & 1) { for (let j = 0; j + 2 < ni; j += 3) tri.push(ix(j), ix(j + 1), ix(j + 2)); }
            else if (fl & 2) { for (let j = 0; j + 2 < ni; j++) { const a = ix(j), b2 = ix(j + 1), c = ix(j + 2); if (j & 1) tri.push(b2, a, c); else tri.push(a, b2, c); } }
          }
        }
        if (tri.length) { parts.push({ mesh: mesh.m, tri }); tris += tri.length / 3; }
      }
    }
    return { parts, tris };
  };
  let pick = null; for (let l = nlod - 1; l >= 0 && !pick; l--) { const r = build(l); if (r && r.tris > 0) pick = r; }
  if (!pick || pick.tris > 20000) return null;
  const out = [];
  for (const pt of pick.parts) {
    const n = pt.tri.length / 3, p = new Float32Array(n * 9), t = new Float32Array(n * 6); let ok = 0;
    for (let i = 0; i < pt.tri.length; i++) { const v = pt.tri[i]; if (v < 0 || v >= nV) continue; p[ok * 3] = pos[v * 3]; p[ok * 3 + 1] = pos[v * 3 + 1]; p[ok * 3 + 2] = pos[v * 3 + 2]; t[ok * 2] = uv[v * 2]; t[ok * 2 + 1] = uv[v * 2 + 1]; ok++; }
    if (ok < 3) continue;
    const mats = []; for (let f = 0; f < nsf && f < 4; f++) mats.push(matOf(skinTex(f, pt.mesh)));
    out.push({ mats, p: p.subarray(0, ok * 3), t: t.subarray(0, ok * 2) });
  }
  if (!out.length) return null;
  // the positions must sit near the model's own bounding box, otherwise the index layout was misread
  const m = 0.35 * Math.max(hull[3] - hull[0], hull[4] - hull[1], hull[5] - hull[2], 8);
  for (const pt of out) for (let i = 0; i < pt.p.length; i += 3) if (pt.p[i] < hull[0] - m || pt.p[i] > hull[3] + m || pt.p[i + 1] < hull[1] - m || pt.p[i + 1] > hull[4] + m || pt.p[i + 2] < hull[2] - m || pt.p[i + 2] > hull[5] + m) return null;
  return { b: hull.map(v => +v.toFixed(2)), parts: out };
}

module.exports = { modelMesh, modelInfo, TEX, openFolder, loadTile, readVpkDir, parseKv, loadVmt, decodeVtf, toTile, Source };
