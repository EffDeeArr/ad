'use strict';
/* Minecraft block textures, read from the player's own game files (a client .jar is a zip file).
   Nothing is copied or uploaded; tiles are made in memory (128 x 128, ABGR) for the game's renderer. */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PREFIX = 'assets/minecraft/textures/block/';

// ---- zip directory (only the block textures are kept) ----
function openJar(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const size = fs.fstatSync(fd).size;
    const tl = Math.min(size, 70000), tail = Buffer.alloc(tl);
    fs.readSync(fd, tail, 0, tl, size - tl);
    let e = -1;
    for (let i = tl - 22; i >= 0; i--) if (tail.readUInt32LE(i) === 0x06054b50) { e = i; break; }
    if (e < 0) throw new Error('not a zip file');
    const cnt = tail.readUInt16LE(e + 10), csz = tail.readUInt32LE(e + 12), cof = tail.readUInt32LE(e + 16);
    if (cof + csz > size || cnt > 200000) throw new Error('unreadable zip directory');
    const cd = Buffer.alloc(csz); fs.readSync(fd, cd, 0, csz, cof);
    const ent = new Map();
    let o = 0;
    for (let i = 0; i < cnt && o + 46 <= cd.length; i++) {
      if (cd.readUInt32LE(o) !== 0x02014b50) break;
      const meth = cd.readUInt16LE(o + 10), cs = cd.readUInt32LE(o + 20), us = cd.readUInt32LE(o + 24);
      const nl = cd.readUInt16LE(o + 28), xl = cd.readUInt16LE(o + 30), cl = cd.readUInt16LE(o + 32), lo = cd.readUInt32LE(o + 42);
      const nm = cd.toString('latin1', o + 46, o + 46 + nl);
      o += 46 + nl + xl + cl;
      if (nm.startsWith(PREFIX) && nm.endsWith('.png') && us < 4 * 1024 * 1024) ent.set(nm.slice(PREFIX.length, -4), { meth, cs, us, lo });
    }
    return { fd, ent, file };
  } catch (x) { fs.closeSync(fd); throw x; }
}
function readEntry(j, e) {
  const lh = Buffer.alloc(30); fs.readSync(j.fd, lh, 0, 30, e.lo);
  if (lh.readUInt32LE(0) !== 0x04034b50) return null;
  const st = e.lo + 30 + lh.readUInt16LE(26) + lh.readUInt16LE(28);
  const raw = Buffer.alloc(e.cs); fs.readSync(j.fd, raw, 0, e.cs, st);
  if (e.meth === 0) return raw;
  if (e.meth === 8) return zlib.inflateRawSync(raw);
  return null;
}

// ---- PNG (8 bit, not interlaced: what the game uses) ----
function decodePng(b) {
  if (b.length < 33 || b.readUInt32BE(0) !== 0x89504e47) return null;
  let p = 8, w = 0, h = 0, depth = 0, ct = 0, il = 0, pal = null, trns = null;
  const idat = [];
  while (p + 12 <= b.length) {
    const len = b.readUInt32BE(p), ty = b.toString('latin1', p + 4, p + 8), d = b.subarray(p + 8, p + 8 + len);
    if (ty === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); depth = d[8]; ct = d[9]; il = d[12]; }
    else if (ty === 'PLTE') pal = d;
    else if (ty === 'tRNS') trns = d;
    else if (ty === 'IDAT') idat.push(d);
    else if (ty === 'IEND') break;
    p += 12 + len;
  }
  if (!w || !h || w > 4096 || h > 65536 || il || (depth !== 8 && !(ct === 3 && depth <= 8))) return null;
  const ch = ct === 6 ? 4 : ct === 2 ? 3 : ct === 4 ? 2 : 1;
  const bpp = ct === 3 ? 1 : ch, bits = ct === 3 ? depth : 8 * ch;
  const stride = Math.ceil(w * bits / 8);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  if (raw.length < (stride + 1) * h) return null;
  const px = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], ro = y * (stride + 1) + 1, po = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[po + x - bpp] : 0, up = y ? px[po - stride + x] : 0, c = (x >= bpp && y) ? px[po - stride + x - bpp] : 0;
      let v = raw[ro + x];
      if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1;
      else if (f === 4) { const pp = a + up - c, pa = Math.abs(pp - a), pb = Math.abs(pp - up), pc = Math.abs(pp - c); v += (pa <= pb && pa <= pc) ? a : pb <= pc ? up : c; }
      px[po + x] = v & 255;
    }
  }
  const rgba = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4;
    if (ct === 6) { const s = y * stride + x * 4; rgba[o] = px[s]; rgba[o + 1] = px[s + 1]; rgba[o + 2] = px[s + 2]; rgba[o + 3] = px[s + 3]; }
    else if (ct === 2) { const s = y * stride + x * 3; rgba[o] = px[s]; rgba[o + 1] = px[s + 1]; rgba[o + 2] = px[s + 2]; rgba[o + 3] = 255; }
    else if (ct === 0) { const v = px[y * stride + x]; rgba[o] = rgba[o + 1] = rgba[o + 2] = v; rgba[o + 3] = 255; }
    else if (ct === 4) { const s = y * stride + x * 2; rgba[o] = rgba[o + 1] = rgba[o + 2] = px[s]; rgba[o + 3] = px[s + 1]; }
    else if (ct === 3 && pal) {
      let i;
      if (depth === 8) i = px[y * stride + x]; else { const per = 8 / depth, by = px[y * stride + ((x / per) | 0)], sh = 8 - depth - (x % per) * depth; i = (by >> sh) & ((1 << depth) - 1); }
      rgba[o] = pal[i * 3]; rgba[o + 1] = pal[i * 3 + 1]; rgba[o + 2] = pal[i * 3 + 2]; rgba[o + 3] = trns && i < trns.length ? trns[i] : 255;
    }
  }
  return { w, h, rgba };
}

// ---- which texture goes with which block ----
const GRASS = [124, 189, 107], FOLIAGE = [119, 171, 47], WATER = [63, 118, 228];
const WOODS = /^(oak|spruce|birch|jungle|acacia|dark_oak|mangrove|cherry|bamboo|crimson|warped|pale_oak)$/;
const DOUBLE = /^(tall_grass|large_fern|rose_bush|peony|lilac|pitcher_plant)$/;
function baseOf(n) {
  const b = n.replace(/_(stairs|slab|wall|fence|fence_gate|pane|button|pressure_plate)$/, '');
  if (b === n) return n;
  if (WOODS.test(b)) return b + '_planks';
  if (/^(stone_brick|brick|nether_brick|mud_brick|end_stone_brick|red_nether_brick|deepslate_brick|deepslate_tile|polished_blackstone_brick|tuff_brick)$/.test(b)) return b + 's';
  return b;
}
// returns { names: [candidate texture names in order], tint, overlay }
function plan(key) {
  const hash = key.indexOf('#'), n0 = key.slice(0, hash), face = +key.slice(hash + 1);
  const n = n0.replace(/^minecraft:/, '');
  let m;
  const R = (names, tint, overlay) => ({ names, tint: tint || null, overlay: overlay || null });
  if (n === 'grass_block') return face === 0 ? R(['grass_block_top'], GRASS) : face === 1 ? R(['dirt']) : R(['grass_block_side'], null, ['grass_block_side_overlay', GRASS]);
  if (/^(podzol|mycelium|dirt_path)$/.test(n)) return face === 0 ? R([n + '_top']) : face === 1 ? R(['dirt']) : R([n + '_side']);
  if (n === 'farmland') return face === 0 ? R(['farmland']) : R(['dirt']);
  if (n === 'water' || /^(kelp|kelp_plant|seagrass|tall_seagrass|bubble_column)$/.test(n)) return R(['water_still'], WATER);
  if (n === 'lava') return R(['lava_still']);
  if (n === 'snow' || n === 'snow_block') return R(['snow']);
  if (m = /^(stripped_)?(\w+?)_(log|wood|stem|hyphae)$/.exec(n)) {
    const base = (m[1] || '') + m[2] + (m[3] === 'wood' || m[3] === 'log' ? '_log' : '_stem');
    return (m[3] === 'wood' || m[3] === 'hyphae' || face === 2) ? R([base]) : R([base + '_top', base]);
  }
  if (m = /^(\w+?)_leaves$/.exec(n)) return R([n], /^(azalea|flowering_azalea|cherry)$/.test(m[1]) ? null : m[1] === 'spruce' ? [97, 153, 97] : m[1] === 'birch' ? [128, 167, 85] : FOLIAGE);
  if (/^(short_grass|grass|tall_grass|fern|large_fern|sugar_cane)$/.test(n)) return R(n === 'short_grass' ? ['short_grass', 'grass'] : DOUBLE.test(n) ? [n + '_top', n] : [n], GRASS);
  if (n === 'bamboo') return R(['bamboo_stalk']);
  if (n === 'sunflower') return R(['sunflower_front', 'sunflower_top']);
  if (DOUBLE.test(n)) return R([n + '_top', n]);
  if (/^(wheat)$/.test(n)) return R(['wheat_stage7']);
  if (/^(carrots|potatoes|beetroots|sweet_berry_bush)$/.test(n)) return R([n + '_stage3']);
  if (/glass_pane$/.test(n)) return R([n.replace(/_pane$/, '')]);
  if (n === 'iron_bars') return R(['iron_bars']);
  if (m = /^(\w+)_bed$/.exec(n)) return face === 1 ? R(['oak_planks']) : R([m[1] + '_wool']);
  if (/(^|_)chest$/.test(n) || /shulker_box$/.test(n)) return R([]);
  if ((face === 1 && n === 'crafting_table') || (face < 2 && n === 'bookshelf')) return R(['oak_planks']);
  if (face === 3) return R([n + '_front', n + '_side']);
  const b = baseOf(n), sfx = face === 0 ? '_top' : face === 1 ? '_bottom' : '_side';
  const names = [];
  for (const q of b === n ? [n] : [n, b]) {
    if (face === 2) names.push(q + '_side', q);
    else names.push(q + sfx, q + '_top', q, q + '_side');
  }
  if (b === 'smooth_stone') names.push('smooth_stone');
  return R(names);
}

function toTile(png, tint) {
  const s = png.w, t = new Uint32Array(16384);
  // an animated strip is taller than it is wide: use its first frame
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    const o = (((y * s) >> 7) * png.w + ((x * s) >> 7)) * 4;
    let r = png.rgba[o], g = png.rgba[o + 1], bl = png.rgba[o + 2];
    const a = png.rgba[o + 3];
    if (tint) { r = r * tint[0] / 255 | 0; g = g * tint[1] / 255 | 0; bl = bl * tint[2] / 255 | 0; }
    t[y * 128 + x] = ((a << 24) | (bl << 16) | (g << 8) | r) >>> 0;
  }
  return t;
}

const NONSOLID = /(^|_)(short_grass|grass|tall_grass|fern|large_fern|dandelion|poppy|orchid|allium|bluet|tulip|cornflower|daisy|peony|lilac|sunflower|sapling|dead_bush|sugar_cane|berry_bush|wheat|carrots|potatoes|beetroots|torchflower|pitcher_plant|mushroom|roots|petals|bamboo|vine|lichen|kelp|seagrass|bars|pane|leaves)$|glass|^rose_bush|^lily_of_the_valley/;
function getPng(j, cache, name) {
  if (cache.has(name)) return cache.get(name);
  let r = null;
  const e = j.ent.get(name);
  if (e) { try { const b = readEntry(j, e); r = b ? decodePng(b) : null; } catch (x) { r = null; } }
  cache.set(name, r);
  return r;
}
// keys like "grass_block#0" -> { tile: Uint32Array(16384) }
function loadTile(j, cache, key) {
  const p = plan(key);
  let png = null;
  for (const nm of p.names) { png = getPng(j, cache, nm); if (png) break; }
  if (!png) return null;
  let tile = toTile(png, p.tint);
  if (p.overlay) {
    // grass sides: the dirt picture first, then the side picture and the tinted fringe over it (see-through pixels never show black)
    const dirt = getPng(j, cache, 'dirt'), out = dirt ? toTile(dirt, null) : new Uint32Array(16384).fill(0xff2b4060);
    for (let i = 0; i < 16384; i++) { out[i] = (out[i] | 0xff000000) >>> 0; if (tile[i] >>> 24 > 127) out[i] = (tile[i] | 0xff000000) >>> 0; }
    const ov = getPng(j, cache, p.overlay[0]);
    if (ov) { const o2 = toTile(ov, p.overlay[1]); for (let i = 0; i < 16384; i++) if (o2[i] >>> 24 > 127) out[i] = (o2[i] | 0xff000000) >>> 0; }
    tile = out;
  }
  // a solid block never has holes: any see-through pixel takes the picture's average colour (instead of showing black/sky behind it)
  const nm = key.slice(0, key.indexOf('#')).replace(/^minecraft:/, '');
  if (!NONSOLID.test(nm)) {
    let r = 0, g = 0, b2 = 0, c = 0;
    for (let i = 0; i < 16384; i++) if (tile[i] >>> 24 > 127) { r += tile[i] & 255; g += (tile[i] >> 8) & 255; b2 += (tile[i] >> 16) & 255; c++; }
    const fill = c ? ((255 << 24) | ((b2 / c | 0) << 16) | ((g / c | 0) << 8) | (r / c | 0)) >>> 0 : 0xff808080;
    for (let i = 0; i < 16384; i++) if (tile[i] >>> 24 <= 127) tile[i] = fill;
  }
  return { tile };
}

// ---- finding the game files: the .minecraft folder (versions/<v>/<v>.jar), a folder with a jar, or the jar itself ----
function findJars(dir) {
  const out = [];
  const add = f => { try { const st = fs.statSync(f); if (st.isFile() && /\.jar$/i.test(f)) out.push({ f, t: st.mtimeMs }); } catch (x) {} };
  try {
    const st = fs.statSync(dir);
    if (st.isFile()) { add(dir); return out; }
    for (const base of [dir, path.join(dir, 'versions'), path.join(dir, '.minecraft', 'versions')]) {
      let names = [];
      try { names = fs.readdirSync(base); } catch (x) { continue; }
      for (const nm of names) {
        const p = path.join(base, nm);
        add(p);
        try { if (fs.statSync(p).isDirectory()) for (const f of fs.readdirSync(p)) add(path.join(p, f)); } catch (x) {}
      }
    }
  } catch (x) {}
  return out.sort((a, b) => b.t - a.t);
}
function openFolder(dir) {
  const problems = [];
  for (const c of findJars(dir)) {
    try {
      const j = openJar(c.f);
      if (j.ent.has('stone') && j.ent.has('dirt')) return { j, version: path.basename(c.f, '.jar'), count: j.ent.size, problems };
      fs.closeSync(j.fd);
    } catch (x) { problems.push(path.basename(c.f) + ': ' + (x && x.message || x)); }
  }
  return { j: null, version: '', count: 0, problems };
}
function close(j) { try { if (j) fs.closeSync(j.fd); } catch (x) {} }

module.exports = { openFolder, loadTile, close, decodePng, plan, findJars };
