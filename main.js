// Electron wrapper: runs the game's HTML unchanged in a desktop window
// and (for multiplayer) can host a small relay server for deathmatch.
const { app, BrowserWindow, ipcMain, net, dialog, screen, shell } = require('electron');
const texvpk = require('./texvpk');
const mcjar = require('./mcjar');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { startServer } = require('./server');
// Steam invites (see steam.js). Only switched on when the game was started from Steam (as a non-Steam shortcut), when started with
// --steam, or when settings.json has "steam": true. Anything wrong with Steam just leaves it off.
let steam = null, steamPendingJoin = null;
try {
  const sf = path.join(app.getPath('userData'), 'settings.json');
  let st = {}; try { st = JSON.parse(require('fs').readFileSync(sf, 'utf8')) || {}; } catch (x) {}
  const fromSteam = !!(process.env.SteamGameId || process.env.SteamAppId || process.env.STEAM_COMPAT_APP_ID || process.argv.includes('--steam'));
  if (st.steam !== false && (fromSteam || st.steam === true)) {
    steam = require('./steam').create({
      appId: Number.isInteger(st.steamAppId) && st.steamAppId > 0 ? st.steamAppId : 480,
      log: s => console.log('[steam] ' + s),
      onJoin: r => {
        steamPendingJoin = r && r.ok ? { ok: true, port: r.port } : { ok: false, error: String(r && r.error || 'Could not join.') };
        for (const w of BrowserWindow.getAllWindows()) { try { w.webContents.send('steam:join', steamPendingJoin); } catch (x) {} }
      }
    });
    steam.init();
  }
} catch (x) { steam = null; }
// the game was renamed from "Loaded Dice": keep using the old data folder when it exists so saves, settings and the profile carry over
try { const fsx = require('fs'), ad = app.getPath('appData'), oldD = path.join(ad, 'Loaded Dice'), newD = path.join(ad, 'Arberia Deathmatch'); if (fsx.existsSync(oldD) && !fsx.existsSync(newD)) app.setPath('userData', oldD); } catch (e) {}

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
if (process.platform === 'linux') {
  // Chromium's sandbox stays ON. It is only switched off when this system can't run it at all
  // (no user namespaces and no SUID helper), or when you ask: --no-sandbox / ARBERIA_NOSANDBOX=1.
  // The window only ever loads the game's own local file, with scripts locked down by a strict CSP.
  const rd = f => { try { return fs0.readFileSync(f, 'utf8').trim(); } catch (e) { return null; } };
  const fs0 = require('fs');
  const noUserns = rd('/proc/sys/kernel/unprivileged_userns_clone') === '0' || rd('/proc/sys/user/max_user_namespaces') === '0';
  if (process.argv.includes('--no-sandbox') || process.env.ARBERIA_NOSANDBOX === '1' || process.env.LOADEDDICE_NOSANDBOX === '1' || noUserns)
    app.commandLine.appendSwitch('no-sandbox');
  // Use /tmp instead of /dev/shm for shared memory (fixes 'Unable to access /dev/shm' crashes).
  app.commandLine.appendSwitch('disable-dev-shm-usage');
}

// Rendering mode. Hardware (GPU) rendering is the default. In Settings the player can switch to software rendering and pick which GPU; the choice is stored in settings.json and applied here, before Chromium starts.
// Overrides: --disable-gpu or ARBERIA_NOGPU=1 force software; --enable-gpu forces hardware.
const fs = require('fs');
const settingsPath0 = path.join(app.getPath('userData'), 'settings.json');
const readSettings0 = () => { try { return JSON.parse(fs.readFileSync(settingsPath0, 'utf8')) || {}; } catch (e) { return {}; } };
const gcfg = (() => { const g = readSettings0().gpu; return g && typeof g === 'object' ? g : {}; })();
const forceSoft = process.argv.includes('--disable-gpu') || process.env.ARBERIA_NOGPU === '1' || process.env.LOADEDDICE_NOGPU === '1';
const wantHw = !forceSoft;   // graphics card rendering is the only mode; a saved 'software' choice from older versions is ignored (only the --disable-gpu launch flag, used for headless servers, still forces the old path)
const API_OK = ['d3d11', 'gl', 'vulkan'];   // Windows graphics backends the player can choose between (empty = automatic)
// Frame rate above the monitor's refresh rate: Chromium's limiter and vsync are switched off at start-up when the player asked for a high cap.
const FPS_UNLOCK = readSettings0().fpsUnlock === true;
if (FPS_UNLOCK) { app.commandLine.appendSwitch('disable-frame-rate-limit'); app.commandLine.appendSwitch('disable-gpu-vsync'); }
const gApi = (process.platform === 'win32' && API_OK.includes(gcfg.api)) ? gcfg.api : '';
const GPU_RUN = { hw: wantHw, forced: forceSoft ? 'software' : '', pick: null, api: wantHw ? gApi : '' };
const num = v => (typeof v === 'number' && isFinite(v)) ? v : null;
if (!wantHw) {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('disable-gpu');
} else {
  const p = gcfg.pick;
  if (gApi) app.commandLine.appendSwitch('use-angle', gApi);   // the player chose DirectX 11, OpenGL or Vulkan
  if (p && num(p.vendorId) !== null && num(p.deviceId) !== null) {
    GPU_RUN.pick = p;
    if (process.platform === 'win32') {
      // Automatic = Direct3D 11 backend; if the adapter's LUID is known (DirectX only), ask for exactly that adapter.
      if (!gApi) app.commandLine.appendSwitch('use-angle', 'd3d11');
      if ((!gApi || gApi === 'd3d11') && p.luid && num(p.luid.high) !== null && num(p.luid.low) !== null)
        app.commandLine.appendSwitch('use-adapter-luid', (p.luid.high | 0) + ',' + (p.luid.low >>> 0));
    } else if (process.platform === 'linux' && !p.active) {
      // Not the GPU the system uses by default: ask the driver to render on this one (PRIME render offload).
      if (p.vendorId === 0x10de) { process.env.__NV_PRIME_RENDER_OFFLOAD = '1'; process.env.__GLX_VENDOR_LIBRARY_NAME = 'nvidia'; process.env.__VK_LAYER_NV_optimus = 'NVIDIA_only'; }
      else process.env.DRI_PRIME = '1';
    }
  }
}
let gpuRetried = false;
app.on('child-process-gone', (_e, details) => {
  // The graphics process died: retry once with the OpenGL backend (Windows) instead of dropping to software.
  if (details.type === 'GPU' && GPU_RUN.hw && !gpuRetried && process.platform === 'win32' && gApi !== 'gl') {
    gpuRetried = true;
    try {
      const st = readSettings0(); st.gpu = { mode: 'hardware', pick: (st.gpu && st.gpu.pick) || null, api: 'gl', note: 'The graphics process crashed with the previous graphics API, so the game switched to OpenGL.' };
      fs.mkdirSync(path.dirname(settingsPath0), { recursive: true }); fs.writeFileSync(settingsPath0, JSON.stringify(st));
    } catch (e) {}
    app.relaunch({ args: process.argv.slice(1).filter(a => a !== '--enable-gpu') });
    app.exit(0);
  }
});

let server = null;
// Discord Rich Presence (see discord.js). Needs an Application ID; settings.json "discord": false turns it off.
let discord = null, discordPendingJoin = null;
try {
  const st = (() => { try { return JSON.parse(require('fs').readFileSync(path.join(app.getPath('userData'), 'settings.json'), 'utf8')) || {}; } catch (x) { return {}; } })();
  if (st.discord !== false) { const d = require('./discord').create({ onJoin: sec => { discordPendingJoin = sec; for (const w of BrowserWindow.getAllWindows()) { try { w.webContents.send('discord:join', sec); } catch (x) {} } }, appId: process.env.ARBERIA_DISCORD_APP_ID || st.discordAppId, log: s => console.log('[discord] ' + s) }); if (d.enabled()) discord = d; }
} catch (x) { discord = null; }
const stopServer = () => { if (steam) { try { steam.stopHost(); } catch (e) {} } if (server) { try { server.close(); } catch (e) {} server = null; } };

// Only our own local game page may use these. (Defence in depth: nothing a remote player sends can reach this,
// but if a foreign page ever got into a window, it still couldn't start a server or learn the host token.)
const GAME_URL = require('url').pathToFileURL(path.join(__dirname, 'game', 'index.html')).href;
// Is this message from our own game page (the local game/index.html, in the top frame)? Compared as normalised file paths, not raw
// URL text, because Windows can spell the same file differently (drive letter case, %-encoding, \ vs /), which used to make every
// check fail for some players and left the file picker silently doing nothing.
const normFile = u => { try { let p = path.resolve(require('url').fileURLToPath(String(u).split(/[?#]/)[0])); return (process.platform === 'win32' || process.platform === 'darwin') ? p.toLowerCase() : p; } catch (x) { return ''; } };
const GAME_NORM = normFile(GAME_URL);
const frameUrl = e => { try { return (e.senderFrame && e.senderFrame.url) || e.sender.getURL() || ''; } catch (x) { return ''; } };
const trusted = e => {
  try {
    if (!GAME_NORM || normFile(frameUrl(e)) !== GAME_NORM) return false;
    const f = e.senderFrame, mf = e.sender && e.sender.mainFrame;
    return !f || !mf || (f.routingId === mf.routingId && f.processId === mf.processId);
  } catch (x) { return false; }
};
// What the page is told when a call is refused (it only shows addresses of local files; nothing secret). Also noted in a log file.
const denied = e => {
  const msg = 'The app did not recognise the game window (security check). Page: ' + frameUrl(e).slice(0, 200) + '  Expected: ' + GAME_URL.slice(0, 200);
  try { const lf = path.join(app.getPath('userData'), 'ipc-denied.txt'); if (!fs.existsSync(lf) || fs.statSync(lf).size < 4000) fs.appendFileSync(lf, new Date().toISOString() + ' ' + msg + '\n'); } catch (x) {}
  return msg;
};

ipcMain.handle('host', async (e, port) => {
  if (!trusted(e)) return { ok: false, error: 'untrusted sender' };
  stopServer();
  const p = Number.isInteger(port) && port >= 1024 && port <= 65535 ? port : 7777;
  // Secret that proves "this is the host's own game window". It is handed only to the game page here,
  // never sent over the network except as the first message to the local server, so remote players can't become host.
  const token = crypto.randomBytes(32).toString('hex');
  try {
    server = await startServer(p, token, { statsFile: statsFile() });
    let sr = { ok: false, error: 'Steam is off.' };
    if (steam && steam.available()) { try { sr = await steam.startHost(p, app.getVersion()); } catch (x) { sr = { ok: false, error: String(x && x.message || x) }; } }
    return { ok: true, token, port: p, steam: sr };
  }
  catch (err) { return { ok: false, error: String(err && err.message || err) }; }
});
ipcMain.handle('steam:status', e => trusted(e) ? (steam ? steam.status() : { ok: false, error: 'Steam is off. Add the game to Steam as a non-Steam game and start it from there.' }) : null);
ipcMain.handle('steam:invite', e => trusted(e) ? (steam ? steam.invite() : { ok: false, error: 'Steam is off.' }) : { ok: false });
ipcMain.handle('steam:pending', e => { if (!trusted(e)) return null; const p = steamPendingJoin; steamPendingJoin = null; return p; });
ipcMain.handle('presence', (e, p) => { if (!trusted(e) || !discord) return false; try { discord.set(p && typeof p === 'object' ? { details: p.details, state: p.state, cat: p.cat, join: p.join, party: p.party } : null); } catch (x) {} return true; });
ipcMain.handle('discord:pending', e => { if (!trusted(e)) return null; const p = discordPendingJoin; discordPendingJoin = null; return p; });
ipcMain.handle('stop', e => { if (trusted(e)) stopServer(); });
ipcMain.handle('app:quit', e => { if (trusted(e)) { try { BrowserWindow.getAllWindows().forEach(w => w.destroy()); } catch (x) {} app.quit(); } });
ipcMain.handle('ips', e => !trusted(e) ? [] :
  Object.values(os.networkInterfaces()).flat()
    .filter(i => i && i.family === 'IPv4' && !i.internal).map(i => i.address));

// Looks up your public IP (one request to api.ipify.org, only when you host).
ipcMain.handle('publicIp', async e => {
  if (!trusted(e)) return '';
  try {
    const r = await net.fetch('https://api.ipify.org', { signal: AbortSignal.timeout(5000) });
    const t = (await r.text()).trim();
    return /^[0-9a-fA-F:.]{3,45}$/.test(t) ? t : '';
  } catch (e) { return ''; }
});

// ---- Source game textures: the player points the app at their TF2 folder once, and the choice is remembered ----
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');
const readSettings = () => { try { return JSON.parse(fs.readFileSync(settingsFile(), 'utf8')) || {}; } catch (x) { return {}; } };
const writeSettings = o => { try { fs.mkdirSync(path.dirname(settingsFile()), { recursive: true }); fs.writeFileSync(settingsFile(), JSON.stringify(o)); } catch (x) {} };
let texSrc = null, texInfo = { dir: '', vpks: 0, files: 0, problems: [] };
const texCache = new Map();
const texOpen = dir => {
  if (texSrc) texSrc.close();
  texSrc = null; texCache.clear(); meshCache.clear(); texInfo = { dir: dir || '', vpks: 0, files: 0, problems: [] };
  if (!dir) return;
  try {
    const { src, problems } = texvpk.openFolder(dir);
    texSrc = src; texInfo = { dir, vpks: src.vpks.length, files: src.count, loose: src.dirs.length, problems };
  } catch (x) { texInfo.problems = [String(x && x.message || x)]; }
};
app.whenReady().then(() => texOpen(readSettings().texDir || ''));
// ---- Counter-Strike: Global Offensive game files: found by themselves in the Steam libraries ("csgo legacy", or the older "Counter-Strike Global Offensive" folder) ----
let csSrc = null, csInfo = { dir: '', vpks: 0, files: 0 }, csDone = false;
const csTex = new Map(), csMesh = new Map();
const csCandidates = () => {
  const out = [], add = p => { if (p && !out.includes(p)) out.push(p); };
  const st = readSettings(); if (st.csDir) add(st.csDir);
  const names = ['csgo legacy', 'Counter-Strike Global Offensive', 'csgo'];
  try { for (const lib of (arenaMod && arenaMod.libraries ? arenaMod.libraries() : [])) for (const n of names) add(path.join(lib, 'steamapps', 'common', n)); } catch (x) {}
  if (process.platform === 'win32') {
    const roots = [process.env['ProgramFiles(x86)'], process.env.ProgramFiles, 'C:\\Program Files (x86)', 'C:\\Program Files'].filter(Boolean).map(r => path.join(r, 'Steam'));
    for (const L of 'DEFGHIJ') for (const f of ['SteamLibrary', 'Steam', 'Games\\Steam', 'Games\\SteamLibrary']) roots.push(L + ':\\' + f);
    for (const r of roots) for (const n of names) add(path.join(r, 'steamapps', 'common', n));
  } else {
    const h = os.homedir();
    for (const r of [path.join(h, '.steam/steam'), path.join(h, '.local/share/Steam'), path.join(h, 'Library/Application Support/Steam')]) for (const n of names) add(path.join(r, 'steamapps', 'common', n));
  }
  return out;
};
const csDirs = root => {   // every folder at or just below root that holds pak01_dir.vpk
  const out = [];
  const walk = (d, depth) => {
    let ents; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch (x) { return; }
    if (ents.some(e => e.isFile() && /^pak01_dir\.vpk$/i.test(e.name))) { out.push(d); return; }
    if (depth >= 3) return;
    for (const e of ents) if (e.isDirectory() && !/^(bin|platform|sound|maps|media|resource|scripts|cfg|download|custom|screenshots|sourcetv|sdktools|steamapps)$/i.test(e.name)) walk(path.join(d, e.name), depth + 1);
  };
  walk(root, 0);
  return out;
};
let csLast = 0;
const csGet = () => {
  if (csSrc) return csSrc;
  if (Date.now() - csLast < 4000) return null;   // looked a moment ago
  csLast = Date.now();
  const tried = [];
  for (const root of csCandidates()) {
    try { if (!fs.statSync(root).isDirectory()) continue; } catch (x) { continue; }
    tried.push(root);
    for (const d of csDirs(root)) {
      try {
        const { src, problems } = texvpk.openFolder(d);
        if (src.count > 0 || src.dirs.length) { csSrc = src; csInfo = { dir: d, vpks: src.vpks.length, files: src.count, problems, tried }; return csSrc; }
        src.close();
      } catch (x) {}
    }
  }
  csInfo = { dir: '', vpks: 0, files: 0, tried };
  return null;
};
// which game files a request should use: Counter-Strike maps use CS:GO's own files when they are installed, everything else the folder the player linked
const srcFor = w => w === 'cs' ? (csGet() || texSrc) : texSrc;
const cachesFor = src => src === texSrc ? { tex: texCache, mesh: meshCache } : { tex: csTex, mesh: csMesh };
// First run: hardware is the default, but a computer with only integrated or software graphics (no dedicated card) is switched to software for the next start.
app.whenReady().then(async () => {
  try {
    const st = readSettings();
    if (st.gpu && st.gpu.mode) return;
    await new Promise(r => setTimeout(r, 4000));
    const l = await gpuList();
    const dedicated = l.some(x => x.vendorId !== 0x8086 && x.vendorId !== 0x1414 && x.vendorId !== 0x15ad && x.vendorId !== 0x106b);
    const st2 = readSettings();
    if (!(st2.gpu && st2.gpu.mode)) { st2.gpu = { mode: dedicated ? 'hardware' : 'software', pick: null, api: '', note: dedicated ? '' : 'No dedicated graphics card was found, so Software was chosen.' }; writeSettings(st2); }
  } catch (e) {}
});

// File picker for map files and skin images. Uses the system's own open-file dialog from the main process,
// because the web page's <input type=file> picker does not open on some Linux setups.
ipcMain.handle('pick:file', async (e, accept) => {
  if (!trusted(e)) return { denied: true, error: denied(e) };
  const win = BrowserWindow.fromWebContents(e.sender);
  const exts = String(accept || '').split(',').map(s => s.trim().replace(/^\./, '').toLowerCase()).filter(s => /^[a-z0-9]{1,5}$/.test(s));
  const isImg = exts.includes('png');
  const r = await dialog.showOpenDialog(win, {
    title: isImg ? 'Choose a skin image (PNG or JPG)' : 'Choose a map file (.bsp, .pk3, .zip or .mca)',
    properties: ['openFile'],
    filters: exts.length ? [{ name: isImg ? 'Images' : 'Map files', extensions: isImg ? ['png', 'jpg', 'jpeg'] : exts }, { name: 'All files', extensions: ['*'] }] : undefined
  });
  if (r.canceled || !r.filePaths[0]) return null;
  const p = r.filePaths[0];
  try {
    const st = await fs.promises.stat(p);
    if (st.size > 1.5e9) return { error: 'That file is too large.' };
    return { name: path.basename(p), data: await fs.promises.readFile(p) };
  } catch (x) { return { error: String(x && x.message || x) }; }
});

// In-game file browser (used on Linux, where the system dialog may not open): lists folders and picks files
// without any OS dialog. Only the game page can call these, and only map/skin file types can be read.
const PICK_RE = /\.(bsp|pk3|zip|mca|png|jpe?g)$/i;
const pickExts = accept => String(accept || '').split(',').map(s => s.trim().replace(/^\./, '').toLowerCase()).filter(s => /^[a-z0-9]{1,5}$/.test(s));
const pickPlaces = async () => {
  const h = os.homedir(), out = [], win = process.platform === 'win32';
  const add = (n, p) => { try { if (p && fs.statSync(p).isDirectory() && !out.some(o => o.path.toLowerCase() === p.toLowerCase())) out.push({ name: n, path: p }); } catch (x) {} };
  const known = k => { try { return app.getPath(k); } catch (x) { return ''; } };
  add('Home', h); add('Desktop', known('desktop') || path.join(h, 'Desktop')); add('Downloads', known('downloads') || path.join(h, 'Downloads'));
  add('Documents', known('documents') || path.join(h, 'Documents'));
  if (win) {
    for (const pf of [process.env['ProgramFiles(x86)'], process.env.ProgramFiles, 'C:\\Program Files (x86)', 'C:\\Program Files'])
      if (pf) add('Steam', path.join(pf, 'Steam', 'steamapps', 'common'));
    add('Minecraft', path.join(process.env.APPDATA || path.join(h, 'AppData', 'Roaming'), '.minecraft', 'saves'));
    // drives (checked in parallel; a disconnected network drive can't hold things up for long)
    const probe = L => Promise.race([fs.promises.stat(L + ':\\').then(() => L + ':\\', () => null), new Promise(r => setTimeout(() => r(null), 700))]);
    for (const d of await Promise.all('CDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(probe))) if (d) out.push({ name: d.slice(0, 2) + ' drive', path: d });
  } else {
    add('Steam', path.join(h, '.steam/steam/steamapps/common')); add('Steam', path.join(h, '.local/share/Steam/steamapps/common'));
    add('Steam', path.join(h, 'Library/Application Support/Steam/steamapps/common'));
    add('Minecraft', path.join(h, '.minecraft/saves')); add('Minecraft', path.join(h, 'Library/Application Support/minecraft/saves'));
    add('/mnt', '/mnt'); add('/media', '/media'); add('/run/media', '/run/media'); add('/Volumes', '/Volumes'); add('/ (root)', path.parse(h).root || '/');
  }
  return out;
};
ipcMain.handle('fb:list', async (e, dir, accept) => {
  if (!trusted(e)) return { denied: true, error: denied(e), dir: '', parent: null, entries: [], places: [] };
  const st = readSettings();
  let want = typeof dir === 'string' && dir ? dir.trim().replace(/^"|"$/g, '') : (st.pickDir && fs.existsSync(st.pickDir) ? st.pickDir : os.homedir());
  if (process.platform === 'win32' && /^[A-Za-z]:$/.test(want)) want += '\\';
  let d = path.resolve(want);
  const exts = pickExts(accept), res = { dir: d, parent: path.dirname(d) !== d ? path.dirname(d) : null, entries: [], places: await pickPlaces() };
  try {
    const ents = await fs.promises.readdir(d, { withFileTypes: true });
    for (const en of ents) {
      if ((en.name[0] === '.' && en.name !== '.minecraft') || en.name[0] === '$') continue;
      let isDir = en.isDirectory(), isFile = en.isFile();
      if (en.isSymbolicLink()) { try { const s = fs.statSync(path.join(d, en.name)); isDir = s.isDirectory(); isFile = s.isFile(); } catch (x) { continue; } }
      let mt = 0; try { mt = Math.floor(fs.statSync(path.join(d, en.name)).mtimeMs); } catch (x) {}
      if (isDir) res.entries.push({ name: en.name, dir: true, mt });
      else if (isFile && (!exts.length || exts.includes(path.extname(en.name).slice(1).toLowerCase()))) {
        let size = 0; try { size = fs.statSync(path.join(d, en.name)).size; } catch (x) {}
        res.entries.push({ name: en.name, dir: false, size, mt });
      }
      if (res.entries.length > 8000) break;
    }
    res.entries.sort((a, b) => (b.dir - a.dir) || a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    st.pickDir = d; writeSettings(st);
  } catch (x) { res.error = 'Cannot open this folder (' + (x && x.code || 'error') + ').'; }
  return res;
});
ipcMain.handle('fb:read', async (e, p) => {
  if (!trusted(e)) return { denied: true, error: denied(e) };
  if (typeof p !== 'string') return null;
  p = p.trim().replace(/^["']|["']$/g, '');
  if (p === '~' || p.startsWith('~/') || p.startsWith('~\\')) p = path.join(os.homedir(), p.slice(1));
  p = path.resolve(p);
  if (!PICK_RE.test(p)) return { error: 'That file type cannot be opened here.' };
  try {
    const s = await fs.promises.stat(p);
    if (!s.isFile()) return { error: 'Not a file.' };
    if (s.size > 1.5e9) return { error: 'That file is too large.' };
    return { name: path.basename(p), data: await fs.promises.readFile(p) };
  } catch (x) { return { error: x && x.code === 'ENOENT' ? 'That file was not found.' : x && (x.code === 'EACCES' || x.code === 'EPERM') ? 'No permission to read that file.' : String(x && x.message || x) }; }
});

// ---- backup.txt: map paths the player typed in by hand. When a multiplayer match asks for a map file that is listed here,
// the game loads it straight from that path instead of showing the file picker. One "name = path" per line; # starts a comment.
const BACKUP_TEMPLATE = [
  '# Arberia Deathmatch - backup.txt',
  '#',
  '# If a multiplayer match asks you for a map file, the game looks here first. When the map is listed below it is',
  '# loaded from the path you wrote, and you are not asked to pick a file.',
  '#',
  '# Format:   mapname = full path to the file        (lines starting with # are ignored)',
  '# The map name is the file name without ".bsp". Quotes around the path are fine.',
  '#',
  '# Examples (remove the # and fix the path):',
  '# ctf_2fort = C:\\Program Files (x86)\\Steam\\steamapps\\common\\Team Fortress 2\\tf\\maps\\ctf_2fort.bsp',
  '# de_dust2  = C:\\Program Files (x86)\\Steam\\steamapps\\common\\Counter-Strike Global Offensive\\game\\csgo\\maps\\de_dust2.bsp',
  '# Linux:   ctf_2fort = ~/.steam/steam/steamapps/common/Team Fortress 2/tf/maps/ctf_2fort.bsp',
  '',
  'ctf_2fort = ',
  'de_dust2 = ',
  ''
].join('\r\n');
const backupDirs = () => {
  const d = [];
  if (process.env.PORTABLE_EXECUTABLE_DIR) d.push(process.env.PORTABLE_EXECUTABLE_DIR);   // next to the portable .exe
  d.push(app.isPackaged ? path.dirname(process.execPath) : __dirname);                    // next to the app
  d.push(app.getPath('userData'));                                                        // always-writable fallback
  return d.filter((x, i) => x && d.indexOf(x) === i);
};
const backupFile = () => {
  const dirs = backupDirs();
  for (const d of dirs) { const f = path.join(d, 'backup.txt'); try { if (fs.statSync(f).isFile()) return f; } catch (x) {} }
  for (const d of dirs) { const f = path.join(d, 'backup.txt'); try { fs.writeFileSync(f, BACKUP_TEMPLATE, { flag: 'wx' }); return f; } catch (x) {} }
  return null;
};
// stats.txt (weapon usage numbers for hosted games) lives next to the game, like backup.txt
const statsFile = () => {
  const dirs = backupDirs();
  for (const d of dirs) { const f = path.join(d, 'stats.txt'); try { if (fs.statSync(f).isFile()) return f; } catch (x) {} }
  for (const d of dirs) { const f = path.join(d, 'stats.txt'); try { fs.writeFileSync(f, '', { flag: 'wx' }); return f; } catch (x) {} }
  return null;
};
// profile.txt (loot boxes, cosmetics, best floor) lives next to the game so it can be copied between versions
const profile = require('./profile');
const profileDirs = () => { const d = []; try { if (process.env.APPIMAGE) d.push(path.dirname(process.env.APPIMAGE)); } catch (x) {} d.push(...backupDirs()); return d.filter((x, i) => x && d.indexOf(x) === i); };
ipcMain.handle('profile:read', e => trusted(e) ? profile.read(profileDirs()) : { denied: true, error: denied(e) });
ipcMain.handle('profile:write', (e, text) => trusted(e) && typeof text === 'string' ? profile.write(profileDirs(), text) : { denied: true });
const mapKey = s => String(s || '').trim().replace(/^["']|["']$/g, '').split(/[\\/]/).pop().replace(/\.(bsp|pk3|zip|mca)$/i, '').toLowerCase();
const backupParse = txt => {
  const m = new Map();
  for (let line of String(txt).replace(/^\uFEFF/, '').split(/\r?\n/)) {
    line = line.trim(); if (!line || line[0] === '#' || line[0] === ';') continue;
    const i = line.indexOf('='); if (i < 1) continue;
    const k = mapKey(line.slice(0, i)), v = line.slice(i + 1).trim().replace(/^["']|["']$/g, '').trim();
    if (k && v && !m.has(k)) m.set(k, v);
  }
  return m;
};
ipcMain.handle('backup:read', async (e, name) => {
  if (!trusted(e)) return { denied: true, error: denied(e) };
  const file = backupFile(), key = mapKey(name);
  let map = new Map();
  if (file) { try { map = backupParse(await fs.promises.readFile(file, 'utf8')); } catch (x) {} }
  let p = map.get(key);
  if (!p && /^[a-z0-9_\-]{1,64}$/.test(key)) {
    // not listed: use a copy of the map sitting in the same folder as the game (or its "maps" subfolder)
    for (const d of backupDirs()) for (const sub of ['', 'maps']) for (const ext of ['.bsp', '.pk3'])
      { const c = path.join(d, sub, key + ext); try { if (!p && fs.statSync(c).isFile()) p = c; } catch (x) {} }
  }
  if (!p) return { none: true, where: file || '' };
  if (p === '~' || p.startsWith('~/') || p.startsWith('~\\')) p = path.join(os.homedir(), p.slice(1));
  p = path.resolve(p);
  if (!/\.(bsp|pk3|zip|mca)$/i.test(p)) return { error: 'backup.txt: "' + p + '" is not a map file (.bsp, .pk3, .zip or .mca).', where: file || "" };
  try {
    const s = await fs.promises.stat(p);
    if (!s.isFile()) return { error: 'backup.txt: "' + p + '" is not a file.', where: file || "" };
    if (s.size > 1.5e9) return { error: 'backup.txt: that file is too large.', where: file || "" };
    return { name: path.basename(p), data: await fs.promises.readFile(p), where: file || "" };
  } catch (x) { return { error: 'backup.txt: ' + (x && x.code === 'ENOENT' ? 'the file "' + p + '" was not found.' : x && (x.code === 'EACCES' || x.code === 'EPERM') ? 'no permission to read "' + p + '".' : String(x && x.message || x)), where: file || "" }; }
});

// ---- Rendering settings (software / hardware + GPU choice) ----
const VENDORS = { 0x10de: 'NVIDIA', 0x1002: 'AMD', 0x1022: 'AMD', 0x8086: 'Intel', 0x106b: 'Apple', 0x1414: 'Microsoft', 0x15ad: 'VMware', 0x1af4: 'Virtio', 0x5143: 'Qualcomm', 0x13b5: 'ARM' };
const hex4 = n => (n >>> 0).toString(16).padStart(4, '0');
async function gpuList() {
  let info = null;
  for (const kind of GPU_RUN.hw ? ['complete', 'basic'] : ['basic']) {
    try {
      info = await Promise.race([app.getGPUInfo(kind), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3500))]);
      if (info && info.gpuDevice && info.gpuDevice.length) break;
    } catch (e) {}
  }
  const devs = (info && Array.isArray(info.gpuDevice)) ? info.gpuDevice : [];
  return devs.slice(0, 8).map((d, i) => {
    const vid = num(d.vendorId) | 0, did = num(d.deviceId) | 0, vn = VENDORS[vid] || ('Vendor ' + hex4(vid));
    let name = String(d.deviceString || '').slice(0, 70).trim();
    if (!name) name = vn + ' GPU ' + hex4(did);
    else if (!name.toLowerCase().includes(vn.toLowerCase())) name = vn + ' ' + name;
    const lu = d.luid && num(d.luid.high) !== null && num(d.luid.low) !== null ? { high: d.luid.high | 0, low: d.luid.low >>> 0 } : null;
    return { key: vid + ':' + did + ':' + i, vendorId: vid, deviceId: did, active: !!d.active, name, luid: lu, driver: String(d.driverVersion || '').slice(0, 40) };
  });
}
ipcMain.handle('gpu:status', async e => {
  if (!trusted(e)) return null;
  const st = readSettings().gpu || {};
  let feat = {}; try { feat = app.getGPUFeatureStatus() || {}; } catch (x) {}
  return {
    platform: process.platform,
    running: GPU_RUN.hw ? 'hardware' : 'software', forced: GPU_RUN.forced,
    mode: st.mode === 'software' ? 'software' : 'hardware',
    api: API_OK.includes(st.api) ? st.api : '', runApi: GPU_RUN.api,
    pick: st.pick ? st.pick.key || '' : '', note: st.note || '',
    gpus: await gpuList(),
    features: { canvas: String(feat['2d_canvas'] || ''), compositing: String(feat.gpu_compositing || ''), raster: String(feat.rasterization || '') }
  };
});
ipcMain.handle('gpu:set', async (e, mode, key, api) => {
  if (!trusted(e)) return null;
  mode = 'hardware';
  const st = readSettings(); const old = st.gpu || {};
  let pick = null;
  if (typeof key === 'string' && key) {
    const g = (await gpuList()).find(x => x.key === key);
    if (g) pick = g;
  }
  api = (process.platform === 'win32' && API_OK.includes(api)) ? api : '';
  st.gpu = { mode, pick: pick || (mode === 'hardware' ? null : old.pick || null), api, note: '' };
  writeSettings(st);
  return { ok: true, needsRestart: (mode === 'hardware') !== GPU_RUN.hw || (mode === 'hardware' && (JSON.stringify(pick && pick.key) !== JSON.stringify(GPU_RUN.pick && GPU_RUN.pick.key) || api !== GPU_RUN.api)) };
});
ipcMain.handle('fps:unlock', (e, v) => {
  if (!trusted(e)) return null;
  // Only lift Chromium's frame limiter and vsync when the cap is really above the monitor's refresh rate; doing it for
  // ordinary caps (120/144 on a 144 Hz screen) only made some PCs run at a very low frame rate.
  let hz = 60;
  try { const w = BrowserWindow.fromWebContents(e.sender); hz = (screen.getDisplayMatching(w.getBounds()).displayFrequency | 0) || 60; } catch (x) {}
  v = Number(v) > hz + 2;
  const st = readSettings(); st.fpsUnlock = v; writeSettings(st);
  return { needsRestart: v !== FPS_UNLOCK };
});
ipcMain.handle('gpu:restart', e => {
  if (!trusted(e)) return false;
  stopServer();
  app.relaunch({ args: process.argv.slice(1).filter(a => a !== '--enable-gpu') });
  app.exit(0);
  return true;
});
// ---- The Elder Scrolls: Arena on an arcade cabinet: the player's own Steam copy is run by a DOSBox inside the game window (see arena.js and game/emu) ----
let arenaMod = null; try { arenaMod = require('./arena'); } catch (x) {}
// Looking through Steam folders and packing the game is slow and blocking, so it runs on a worker thread (arena-worker.js), never on the thread that keeps the window alive.
let arenaW = null, arenaN = 0; const arenaP = new Map();
function arenaFail(err) { for (const p of arenaP.values()) p.rej(err); arenaP.clear(); arenaW = null; }
function arenaCall(cmd, arg) {
  return new Promise((res, rej) => {
    try {
      if (!arenaW) {
        const { Worker } = require('worker_threads'); const w = arenaW = new Worker(path.join(__dirname, 'arena-worker.js'));
        w.on('message', m => { const p = arenaP.get(m.id); if (!p) return; arenaP.delete(m.id); m.err ? p.rej(new Error(m.err)) : p.res(m.r); });
        w.on('error', x => { if (arenaW === w) arenaFail(x); });
        w.on('exit', () => { if (arenaW === w) arenaFail(new Error('The Arena helper stopped.')); });
      }
      const id = ++arenaN; arenaP.set(id, { res, rej }); arenaW.postMessage(Object.assign({ id, cmd }, arg || {}));
    } catch (x) { rej(x); }
  });
}
const arenaSaveFile = () => path.join(app.getPath('userData'), 'arena-saves.zip');
ipcMain.handle('arena:status', async e => {
  if (!trusted(e) || !arenaMod) return { found: false };
  try { const i = await arenaCall('find', { force: false }); return i.found ? { found: true, name: i.name } : { found: false }; } catch (x) { return { found: false }; }
});
ipcMain.handle('arena:load', async e => {
  if (!trusted(e) || !arenaMod) return { ok: false, error: 'Not available.' };
  try {
    const info = await arenaCall('find', { force: true });   // look again, in case it was installed or moved since the last check
    if (!info.found) return { ok: false, error: 'The Elder Scrolls: Arena was not found in your Steam library.' };
    const dir = path.join(__dirname, 'game', 'emu'), rd = f => fs.readFileSync(path.join(dir, f));
    const bundles = [Buffer.from(await arenaCall('bundle', { info }))];
    try { const sv = fs.readFileSync(arenaSaveFile()); if (arenaMod.readZip(sv).length) bundles.push(sv); } catch (x) {}
    return { ok: true, info: { conf: info.confUsed || '(none found, used defaults)', run: (info.autoexec || []).join(' / '), exe: info.exe }, files: { 'wdosbox.js': rd('wdosbox.js').toString('utf8'), 'wlibzip.js': rd('wlibzip.js').toString('utf8'), 'wdosbox.wasm': rd('wdosbox.wasm'), 'wlibzip.wasm': rd('wlibzip.wasm') }, bundles };
  } catch (x) { return { ok: false, error: String(x && x.message || x) }; }
});
ipcMain.handle('arena:save', (e, data) => {
  if (!trusted(e) || !arenaMod) return false;
  try {
    const nb = data instanceof ArrayBuffer ? Buffer.from(data) : ArrayBuffer.isView(data) ? Buffer.from(data.buffer, data.byteOffset, data.byteLength) : null;
    if (!nb || nb.length > 200 * 1024 * 1024) return false;
    let ob = null; try { ob = fs.readFileSync(arenaSaveFile()); } catch (x) {}
    const out = arenaMod.mergeSaves(ob, nb); if (!out) return false;
    fs.mkdirSync(path.dirname(arenaSaveFile()), { recursive: true }); fs.writeFileSync(arenaSaveFile(), out);
    return true;
  } catch (x) { return false; }
});
ipcMain.handle('tex:status', e => { if (!trusted(e)) return null; csGet(); return Object.assign({}, texInfo, { cs: csInfo }); });
ipcMain.handle('tex:choose', async e => {
  if (!trusted(e)) return null;
  const win = BrowserWindow.fromWebContents(e.sender);
  const r = await dialog.showOpenDialog(win, { title: 'Pick your Team Fortress 2 folder (or the "tf" folder inside it)', properties: ['openDirectory'] });
  if (r.canceled || !r.filePaths[0]) return texInfo;
  texOpen(r.filePaths[0]);
  const st = readSettings(); st.texDir = r.filePaths[0]; writeSettings(st);
  return texInfo;
});
ipcMain.handle('tex:clear', e => {
  if (!trusted(e)) return null;
  texOpen(''); const st = readSettings(); delete st.texDir; writeSettings(st); return texInfo;
});
// model name -> { b: [minx,miny,minz,maxx,maxy,maxz], mats: [material names] } read from the .mdl headers (null when not found)
ipcMain.handle('tex:models', async (e, names, which) => {
  const src = trusted(e) ? srcFor(which) : null;
  if (!src || !Array.isArray(names)) return {};
  const out = {};
  for (const nm of names.slice(0, 80)) {
    if (typeof nm !== 'string' || nm.length > 200 || nm.includes('..') || !/^models\/[\w\/.\-]+\.mdl$/i.test(nm)) continue;
    try { out[nm] = texvpk.modelInfo(src, nm.toLowerCase()); } catch (x) { out[nm] = null; }
  }
  return out;
});
// model name -> triangles per material (lowest level of detail), or null; asked for in small batches
const meshCache = new Map();
ipcMain.handle('tex:meshes', async (e, names, which) => {
  const src = trusted(e) ? srcFor(which) : null;
  if (!src || !Array.isArray(names)) return {};
  const mc = cachesFor(src).mesh, why_ = {};
  const out = {}; let n = 0;
  for (const nm of names.slice(0, 40)) {
    if (typeof nm !== 'string' || nm.length > 200 || nm.includes('..') || !/^models\/[\w\/.\-]+\.mdl$/i.test(nm)) continue;
    const k = nm.toLowerCase();
    if (!mc.has(k)) { let r = null, why = ''; try { r = texvpk.modelMesh(src, k); why = r ? '' : texvpk.modelMeshWhy(); } catch (x) { why = 'error: ' + String(x && x.message || x).slice(0, 60); } mc.set(k, r); if (why) why_[why] = (why_[why] || 0) + 1; }
    out[nm] = mc.get(k);
    if (++n % 8 === 0) await new Promise(r => setImmediate(r));
  }
  if (Object.keys(why_).length) out.__why = why_;
  return out;
});
// names -> { name: Uint32Array(128*128) + whether it has see-through pixels } (null when the files are not there)
ipcMain.handle('tex:load', async (e, names, which) => {
  const src = trusted(e) ? srcFor(which) : null;
  if (!src || !Array.isArray(names)) return {};
  const tc = cachesFor(src).tex;
  const out = {};
  let n = 0;
  for (const nm of names.slice(0, 1200)) {
    if (typeof nm !== 'string' || nm.length > 200) continue;
    if (!tc.has(nm)) { let r = null; try { r = texvpk.loadTile(src, nm, 1.22); } catch (x) {} tc.set(nm, r); }
    out[nm] = tc.get(nm);
    if (++n % 12 === 0) await new Promise(r => setImmediate(r));
  }
  return out;
});

// ---- Minecraft block textures: the player points the app at the .minecraft folder (or a client .jar); the choice is remembered ----
let mcSrc = null, mcInfo = { dir: '', version: '', files: 0, problems: [] };
const mcCache = new Map(), mcPng = new Map();
const mcOpen = dir => {
  if (mcSrc) mcjar.close(mcSrc);
  mcSrc = null; mcCache.clear(); mcPng.clear(); mcInfo = { dir: dir || '', version: '', files: 0, problems: [] };
  if (!dir) return;
  try {
    const r = mcjar.openFolder(dir);
    mcSrc = r.j; mcInfo = { dir, version: r.version, files: r.count, problems: r.problems };
  } catch (x) { mcInfo.problems = [String(x && x.message || x)]; }
};
app.whenReady().then(() => mcOpen(readSettings().mcDir || ''));
ipcMain.handle('mc:status', e => trusted(e) ? mcInfo : null);
ipcMain.handle('mc:choose', async e => {
  if (!trusted(e)) return null;
  const win = BrowserWindow.fromWebContents(e.sender);
  const def = process.platform === 'win32' ? path.join(process.env.APPDATA || '', '.minecraft') : process.platform === 'darwin' ? path.join(app.getPath('home'), 'Library', 'Application Support', 'minecraft') : path.join(app.getPath('home'), '.minecraft');
  const r = await dialog.showOpenDialog(win, { title: 'Pick your Minecraft folder (.minecraft)', defaultPath: fs.existsSync(def) ? def : undefined, properties: ['openDirectory'] });
  if (r.canceled || !r.filePaths[0]) return mcInfo;
  mcOpen(r.filePaths[0]);
  const st = readSettings(); st.mcDir = r.filePaths[0]; writeSettings(st);
  return mcInfo;
});
ipcMain.handle('mc:clear', e => {
  if (!trusted(e)) return null;
  mcOpen(''); const st = readSettings(); delete st.mcDir; writeSettings(st); return mcInfo;
});
ipcMain.handle('mc:load', async (e, keys) => {
  if (!trusted(e) || !mcSrc || !Array.isArray(keys)) return {};
  const out = {};
  let n = 0;
  for (const k of keys.slice(0, 800)) {
    if (typeof k !== 'string' || k.length > 120 || k.indexOf('#') < 0) continue;
    if (!mcCache.has(k)) { let r = null; try { r = mcjar.loadTile(mcSrc, mcPng, k); } catch (x) {} mcCache.set(k, r); }
    out[k] = mcCache.get(k);
    if (++n % 10 === 0) await new Promise(r => setImmediate(r));
  }
  return out;
});

// Match the window to the game's aspect ratio (the resolution setting). The window keeps its width and changes height,
// stays inside the screen, and then keeps that ratio while being resized by hand.
ipcMain.handle('win:aspect', (e, ratio) => {
  if (!trusted(e)) return false;
  const r = Number(ratio);
  if (!(r >= 0.5 && r <= 4)) return false;
  const win = BrowserWindow.fromWebContents(e.sender);
  if (!win || win.isDestroyed()) return false;
  try {
    const [ww, wh] = win.getSize(), [cw, ch] = win.getContentSize();
    win.setAspectRatio(r, { width: ww - cw, height: wh - ch });
    if (win.isFullScreen() || win.isMaximized() || win.isMinimized()) return true;
    const wa = screen.getDisplayMatching(win.getBounds()).workArea;
    let w = cw, h = Math.round(w / r);
    const maxW = wa.width - (ww - cw), maxH = wa.height - (wh - ch);
    if (h > maxH) { h = maxH; w = Math.round(h * r); }
    if (w > maxW) { w = maxW; h = Math.round(w / r); }
    win.setContentSize(Math.max(320, w), Math.max(200, h));
    const b = win.getBounds();
    win.setPosition(Math.min(Math.max(b.x, wa.x), Math.max(wa.x, wa.x + wa.width - b.width)), Math.min(Math.max(b.y, wa.y), Math.max(wa.y, wa.y + wa.height - b.height)));
    return true;
  } catch (x) { return false; }
});

// Window mode: windowed, or borderless fullscreen (a frameless window covering the whole screen; F11 does the same).
ipcMain.handle('win:mode', (e, mode) => {
  if (!trusted(e)) return false;
  const win = BrowserWindow.fromWebContents(e.sender);
  if (!win || win.isDestroyed()) return false;
  win.setFullScreen(mode === 'borderless');
  return true;
});
ipcMain.handle('win:getmode', e => {
  if (!trusted(e)) return 'windowed';
  const win = BrowserWindow.fromWebContents(e.sender);
  return win && !win.isDestroyed() && win.isFullScreen() ? 'borderless' : 'windowed';
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 320, minHeight: 320,
    backgroundColor: '#0e0d14', title: 'Arberia Deathmatch', autoHideMenuBar: true,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true,
      allowRunningInsecureContent: false, webviewTag: false, backgroundThrottling: false
    }
  });
  win.removeMenu();
  // Lock the window to the local game file: no navigating away, no pop-up windows, no permission prompts.
  const wc = win.webContents;
  wc.setWindowOpenHandler(() => ({ action: 'deny' }));
  wc.on('will-navigate', e => { if (e.url.split(/[?#]/)[0] !== GAME_URL) e.preventDefault(); });
  wc.on('will-redirect', e => e.preventDefault());
  wc.on('will-attach-webview', e => e.preventDefault());
  // Mouselook needs pointer lock (and F11/fullscreen), so those are the only permissions granted.
  const OK = new Set(['pointerLock', 'fullscreen', 'keyboardLock']);
  wc.session.setPermissionRequestHandler((_w, perm, cb) => cb(OK.has(perm)));
  wc.session.setPermissionCheckHandler((_w, perm) => OK.has(perm));
  // The page is a local file, which sends no Referer. YouTube's embedded player (used for the optional background music) wants one.
  wc.session.webRequest.onBeforeSendHeaders({ urls: ['https://www.youtube-nocookie.com/*', 'https://www.youtube.com/*'] }, (d, cb) => {
    const h = d.requestHeaders; if (!h.Referer && !h.referer) h.Referer = 'https://arberia-deathmatch.local/'; cb({ requestHeaders: h });
  });
  // When the window is closed it disappears at once (nothing left to show in Alt-Tab), and if the program has not ended by itself 2.5 s later it is killed outright.
  win.on('close', () => { try { win.hide(); } catch (x) {} setTimeout(() => { try { process.kill(process.pid, 'SIGKILL'); } catch (x) { process.exit(0); } }, 2500).unref(); });
  win.loadFile(path.join(__dirname, 'game', 'index.html'));
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
  });
}

app.on('web-contents-created', (_e, wc) => {
  wc.on('will-attach-webview', e => e.preventDefault());
});
// Update check at start: asks GitHub for the newest release and offers to install it. Turn it off with "autoUpdate": false in settings.json,
// or the ARBERIA_NO_UPDATE=1 environment variable. Skipped for builds packed in an .asar archive (use Updater.exe there).
async function checkForUpdate() {
  try {
    if (process.env.ARBERIA_NO_UPDATE === '1' || readSettings().autoUpdate === false) return;
    const appDir = app.getAppPath();
    const packed = /\.asar$/i.test(appDir) || !fs.existsSync(path.join(appDir, 'game', 'index.html'));
    const up = require('./update.js'), cur = up.norm(app.getVersion()), f = (u, o) => net.fetch(u, o);
    const rel = await up.latest(f, process.env.ARBERIA_UPDATE_API);
    if (!rel || rel.version === cur || !/^\d+(\.\d+)*$/.test(rel.version)) return;
    const win = BrowserWindow.getAllWindows()[0];
    if (packed) {   // single-file builds (AppImage, portable .exe) are read-only: tell the player instead of installing
      const q = await dialog.showMessageBox(win, { type: 'info', buttons: ['Open download page', 'Later'], defaultId: 0, cancelId: 1, title: 'Update available',
        message: 'Arberia Deathmatch ' + rel.version + ' is available (you have ' + cur + ').', detail: 'This build is a single packed file, so it cannot update itself. Download the new version from the releases page. (On Linux, ./BUILD.sh now makes a folder build that updates itself.)' });
      if (q.response === 0) shell.openExternal('https://github.com/EffDeeArr/ad/releases/latest');
      return;
    }
    const r = await dialog.showMessageBox(win, { type: 'question', buttons: ['Update and restart', 'Later'], defaultId: 0, cancelId: 1, title: 'Update available',
      message: 'Arberia Deathmatch ' + rel.version + ' is available (you have ' + cur + ').', detail: 'The new files are downloaded from github.com/EffDeeArr/ad, checked, and your old ones are backed up. The game restarts afterwards.' });
    if (r.response !== 0) return;
    const n = await up.install(f, appDir, rel, cur);
    stopServer();
    app.relaunch({ args: process.argv.slice(1) });
    app.exit(0);
  } catch (x) { /* offline or no release yet: stay quiet */ }
}

// ---- optional native Vulkan renderer (arb-rt) -------------------------------------------------------------------
const ARBN = { child: null, url: '', device: '', err: '', exe: '', pack: '' };
function arbnPaths() {
  const base = __dirname.replace('app.asar', 'app.asar.unpacked'); const fs = require('fs');
  for (const d of [path.join(base, 'native', 'bin'), path.join(base, 'native')]) {
    const exe = path.join(d, process.platform === 'win32' ? 'arb-rt.exe' : 'arb-rt'), pack = path.join(base, 'native', 'shaders.pack');
    if (fs.existsSync(exe) && fs.existsSync(pack)) return { exe, pack };
  }
  return null;
}
function arbnStart() {
  return new Promise(res => {
  const done = () => res(); setTimeout(done, 7000);
  const st = readSettings(); if (!(st.native && st.native.on) || process.platform !== 'win32') return done();
  const p = arbnPaths(); if (!p) { ARBN.err = 'the native renderer is not built (run native\\BUILD-NATIVE.bat)'; return done(); }
  ARBN.exe = p.exe;
  const crypto = require('crypto'), token = crypto.randomBytes(12).toString('hex'), port = 20000 + (crypto.randomBytes(2).readUInt16BE(0) % 40000);
  try {
    const cp = require('child_process').spawn(p.exe, ['--serve', '--shaders', p.pack, '--port', String(port), '--token', token], { cwd: path.dirname(p.exe), windowsHide: true });
    ARBN.child = cp; let buf = '';
    const onOut = d => { buf += d.toString(); const m = /ARB-RT READY (\d+) (\S+) ?(.*)/.exec(buf); if (m && !ARBN.url) { ARBN.url = 'ws://127.0.0.1:' + m[1] + '/?t=' + m[2]; ARBN.device = (m[3] || '').trim(); done(); } const f = /ARB-RT FAILED (.*)/.exec(buf); if (f) { ARBN.err = f[1]; done(); } if (buf.length > 4000) buf = buf.slice(-1000); };
    cp.stdout.on('data', onOut); cp.stderr.on('data', d => { ARBN.err = d.toString().slice(0, 300); });
    cp.on('exit', () => { ARBN.child = null; ARBN.url = ''; done(); });
    cp.on('error', e => { ARBN.err = String(e.message || e); ARBN.child = null; done(); });
  } catch (e) { ARBN.err = String(e.message || e); done(); }
  });
}
function arbnStop() { try { if (ARBN.child) ARBN.child.kill(); } catch (e) {} ARBN.child = null; }
ipcMain.on('arbn:url', e => { e.returnValue = trusted(e) ? ARBN.url : ''; });
ipcMain.handle('arbn:status', e => {
  if (!trusted(e)) return null;
  const st = readSettings();
  return { platform: process.platform, built: !!arbnPaths(), on: !!(st.native && st.native.on), running: !!ARBN.url, device: ARBN.device, err: ARBN.err };
});
ipcMain.handle('arbn:set', (e, on) => {
  if (!trusted(e)) return null;
  const st = readSettings(); st.native = { on: !!on }; writeSettings(st);
  return { needsRestart: !!on !== !!ARBN.url };
});
app.whenReady().then(async () => {
  try { await arbnStart(); } catch (e) {}
  createWindow();
  setTimeout(checkForUpdate, 6000);
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
let cleaned = false;
function cleanup() { if (cleaned) return; cleaned = true; try { if (arenaW) arenaW.terminate(); } catch (e) {} if (discord) { try { discord.shutdown(); } catch (e) {} } try { stopServer(); } catch (e) {} arbnStop(); if (steam) { try { steam.shutdown(); } catch (e) {} } }
app.on('before-quit', cleanup);
// Closing the window must end every process of the game. Quit normally, but if anything (the music iframe, Steam, Discord, a socket) keeps the program alive, force it to exit so no ghost window is left in Alt-Tab.
app.on('window-all-closed', () => {
  cleanup();
  setTimeout(() => { try { app.exit(0); } catch (e) {} process.exit(0); }, 1500).unref();
  app.quit();
});
