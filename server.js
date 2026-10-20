// Relay server for multiplayer. Runs inside the Electron main process of the host.
// It forwards messages, keeps the roster/scores/teams/bans, measures ping,
// and runs the host console commands. Players simulate themselves.
//
// SECURITY MODEL: a joiner only ever talks to this relay through a small set of JSON messages.
// Nothing a joiner sends is executed, evaluated or written to disk; every field is validated,
// clamped and rebuilt into a fresh object before it is forwarded. Host-only actions (console,
// settings, start/stop) require the secret host token, which only the host's own game window
// receives (via Electron IPC). Joiners never see each other's IP addresses.
const { WebSocketServer } = require('ws');
const crypto = require('crypto');
const fs = require('fs');

const MAPS = ['random', 'dungeon', 'cavern', 'lab', 'crypt', 'manor', 'foundry', 'city', 'mineshaft', 'coliseum', 'station', 'ctf', 'custom', 'royale'];
const MODES = ['classic', 'team', 'brighton', 'ctf', 'coop', 'cash', 'defuse', 'gungame', 'arms', 'infection', 'oitc', 'airhockey', 'royale'];
const MODE_ALIAS = { arsenal: 'brighton' };
const MODE_NAMES = { classic: 'Classic Deathmatch', team: 'Team Deathmatch', brighton: 'Brighton Deathmatch', ctf: 'Capture the Flag', coop: 'Co-op', cash: 'Cash Deathmatch', defuse: 'Bomb Defusal', infection: 'Infection', gungame: 'Gun Game', arms: 'Arms Race', oitc: 'One in the Chamber' , airhockey: 'Air Hockey (1v1)', royale: 'Battle Royale'};
const teamy = m => m === 'team' || m === 'ctf' || m === 'defuse';
// Capture the Flag: the CTF map is a fixed layout, so flag homes are constants shared with the game.
const CTF_FLAGS = [{ x: 3.5, y: 16 }, { x: 28.5, y: 16 }];
// the coliseum map (40x40 arena): one team defends the north end, the other the south end
const COL_FLAGS = [{ x: 20.5, y: 8.5 }, { x: 20.5, y: 31.5 }];
const FLAG_GRAB = 1.3, FLAG_CAP = 1.5, FLAG_RETURN_MS = 20000, FLAG_DZ = 1.5;
const TEAM_NAMES = ['Red', 'Blue'];
const MAX_PLAYERS = 16;
// Battle Royale: 30 s to pick a spawn point, then a storm that shrinks in stages (radius in tiles on the 256x256 map)
const BR_PICK_MS = 30000, BR_R = [185, 120, 75, 42, 20, 6], BR_HOLD = [90, 60, 50, 40, 30], BR_SHRINK = [45, 40, 35, 30, 25], BR_CHESTS = 600;
const BOT_MAX = 12;             // bots the host's game can add (each is a normal connection from the host's own machine)
const PRE_ROUND = 20; // seconds of loadout picking in Brighton
// Bomb Defusal (plant / defuse, best of 5): times in milliseconds
// money: start CASH_START; round win / loss payouts (loss bonus grows with each loss in a row), kills, plant, defuse
const DF_WIN_CASH = 1000, DF_LOSS_CASH = 700, DF_STREAK_CASH = 150, DF_KILL_CASH = 100, DF_OBJ_CASH = 200, DF_CASH_MAX = 3000, DF_WAIT = 6000;
const DF_FREEZE = 15000, DF_LIVE = 115000, DF_PLANT = 3000, DF_DEFUSE = 10000, DF_FUSE = 40000, DF_OVER = 6000, DF_SWAP_AFTER = 3;
const CASH_PRE = 20, CASH_START = 500, CASH_KILL = 100; // Cash Deathmatch: shopping time, starting money, money per player kill
const MSG_MAX = 2048;           // bytes for every message except a skin upload; real messages are well under 300
const BG_MAX = 42000;           // profile background: a 400x225 jpeg data URL
const BGRE = /^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/;
const SKIN_MAX = 20000;         // a 64x64 skin image as a data URL is ~3-19 KB
const MAP_MAX = 2000; // map data is never relayed; only file IDs
const SPR_MAX = 72000;          // custom spray: a 100x100 png data URL (worst case a noisy photo is ~55 KB)
const SPRE = /^data:image\/png;base64,[A-Za-z0-9+\/=]+$/;
const MAX_PAYLOAD = Math.max(MAP_MAX, SKIN_MAX, BG_MAX, SPR_MAX) + 3000;
const SKRE = /^data:image\/(png|jpeg);base64,[A-Za-z0-9+\/=]+$/;
const MAX_SOCKETS = 40;         // joined + still-joining connections
const MAX_PER_IP = 3;           // simultaneous connections per remote IP
const JOIN_TIMEOUT = 5000;      // ms to send a valid join
const RATE = 90, BURST = 180;   // messages/second sustained and burst, per connection
const HIT_RATE = 30;            // damage messages per second per attacker
const RESPAWN_MS = 2500;        // minimum time between deaths / hits from a dead player
const CREDIT_MS = 4000;         // a kill is credited to whoever hit the victim within this window

// flag homes [x,y,z] and capture-zone boxes [x0,y0,z0,x1,y1,z1] of an imported map, checked number by number
const okn = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
const cleanCtf = c => {
  if (!c || typeof c !== 'object' || !Array.isArray(c.f) || c.f.length !== 2 || !Array.isArray(c.z) || c.z.length !== 2) return null;
  const f = [];
  for (const p of c.f) { if (!p || !okn(p.x, 0, 400) || !okn(p.y, 0, 400) || !okn(p.z, -400, 800)) return null; f.push({ x: p.x, y: p.y, z: p.z }); }
  const z = [[], []];
  for (let t = 0; t < 2; t++) {
    if (!Array.isArray(c.z[t])) return null;
    for (const q of c.z[t].slice(0, 6)) {
      if (!Array.isArray(q) || q.length !== 6 || !q.every((v, i) => okn(v, i % 3 === 2 ? -400 : -1, i % 3 === 2 ? 800 : 400))) return null;
      z[t].push(q.slice());
    }
  }
  return { f, z };
};
// bomb sites of an imported map (func_bomb_target boxes), checked number by number
const cleanBomb = b => {
  if (!b || typeof b !== 'object' || !Array.isArray(b.s) || b.s.length < 1 || b.s.length > 4) return null;
  const s = [];
  for (const q of b.s) { if (!Array.isArray(q) || q.length !== 6 || !q.every((v, i) => okn(v, i % 3 === 2 ? -400 : -1, i % 3 === 2 ? 800 : 400))) return null; s.push(q.slice()); }
  return { s };
};
const num = (v, lo, hi, def = 0) => (typeof v === 'number' && Number.isFinite(v)) ? Math.max(lo, Math.min(hi, v)) : def;
const txt = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069<>&"'`\\]/g, '').trim().slice(0, n);
const ctxt = (v, n) => Array.from(String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, '').replace(/\s+/g, ' ').trim()).slice(0, n).join('');
const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

const HELP = [
  'Console commands (host only):',
  '  help                          show this list',
  '  players                       list players: id, name, IP, ping, kills/deaths, team',
  '  ip <player>                   show a player\'s IP address',
  '  kick <player>                 remove a player (they can rejoin)',
  '  ban <player|ip>               ban an IP address and kick anyone using it',
  '  unban <ip>                    remove an IP ban',
  '  banlist                       show banned IPs',
  '  map <name>                    load a map type (lobby: sets the next map; in a match: reloads the arena)',
  '  maps                          list map types',
  '  mode <classic|team|brighton|ctf|coop|cash|defuse|gungame|arms|infection|oitc>  set the game mode (lobby only; ctf plays on the ctf map, or on an imported map that has flags)',
  '  limit <n>                     set kills (captures in ctf) needed to win',
  '  team <player> <red|blue|spec> move a player to a team, or make them a spectator (lobby only)',
  '  start                         start the match from the lobby',
  '  end                           end the current match and show the result',
  '  lobby                         send everyone back to the lobby',
  '  say <text>                    broadcast a message to everyone',
  '  clear                         clear this console',
  '<player> can be a player id (from "players") or part of a name.'
];

// messages a spectator may send
const SPEC_OK = new Set(['chat', 'pong', 'skin', 'prof', 'team', 'cfg', 'cmd', 'start', 'stop', 'mapid', 'maphash', 'bsites', 'move', 'kick']);
const cleanIp = a => String(a || '?').replace(/^::ffff:/, '');

function startServer(port, hostToken, opts) {
  const statsFile = opts && typeof opts.statsFile === 'string' ? opts.statsFile : null;
  if (typeof hostToken !== 'string' || hostToken.length < 16) throw new Error('host token required');
  return new Promise((resolve, reject) => {
    const wss = new WebSocketServer({ port, maxPayload: MAX_PAYLOAD, perMessageDeflate: false, clientTracking: true });
    const pending = new Set();
    const players = new Map();
    const medkits = new Map(); let mkId = 1;
    const bans = new Set();
    const cfg = { mode: 'classic', map: 'random', limit: 20, rand: false };
    const chatLog = [];
    // Imported maps: the server never sees map data. The host reports the SHA-256 of its .bsp file (plus the
    // importer version) and every other player must pick a file with the identical ID before the match starts.
    let custom = null, loading = null, loadTimer = null; const pendJoin = new Set();
    const HEX64 = /^[0-9a-f]{64}$/;
    const mapExtra = () => ({});
    let flags = [], caps = [0, 0];
    // On an imported map the flag homes and capture zones come from the map file itself (sent by the host, who imported it).
    const ctfMap = () => (cfg.map === 'custom' && custom && custom.ctf) ? custom.ctf : null;
    const flagHome = t => { const c = ctfMap(); if (!c && cfg.map === 'coliseum') return { x: COL_FLAGS[t].x, y: COL_FLAGS[t].y, z: 0 }; return c ? c.f[t] : { x: CTF_FLAGS[t].x, y: CTF_FLAGS[t].y, z: 0 }; };
    const homeFlag = t => { const h = flagHome(t); flags[t] = { s: 0, c: 0, x: h.x, y: h.y, z: h.z, dt: 0 }; };
    const resetFlags = () => { caps = [0, 0]; homeFlag(0); homeFlag(1); };
    resetFlags();
    let nextId = 1, hostId = 0, running = false, seed = 0, closed = false;
    // Gun Game: the weapon ladder (same for everyone, shuffled at match start when cfg.rand is on) and who finished it
    let ggOrder = [], ggWin = 0, oiWin = 0;
    const ahSimId = () => { const h = players.get(hostId); if (h && !h.spec) return hostId; const l = [...players.entries()].filter(([, q]) => !q.spec).map(([i]) => i).sort((a, b) => a - b); return l.length ? l[0] : hostId; }; // air hockey: the player whose game runs the table
    const isGG = () => cfg.mode === 'gungame' || cfg.mode === 'arms';
    const ggMake = () => {
      const sh = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
      const ranged = STAT_W.slice(0, 11), melee = STAT_W.slice(11);
      if (cfg.mode === 'arms') return ARMS_ORDER.slice();   // Arms Race: best weapon first, melee last
      return cfg.rand ? sh(STAT_W.slice()) : ranged.concat(melee);   // fixed order ends with the melee weapons; random order mixes all 15
    };
    // Co-op: the floor everyone is on, and whether the exit portal is open (reported by the host, who runs the monsters)
    let cfl = 1, cOpen = false;

    const list = () => [...players.entries()].map(([id, p]) =>
      ({ id, name: p.name, k: p.k, d: p.d, team: p.spec ? 2 : p.team, ping: p.ping, g: p.gl | 0, a: p.as | 0, pl: p.pl | 0, df: p.df | 0, cp: p.cp | 0, rt: p.rt | 0, inf: p.inf | 0, lv: p.lv == null ? (cfg.mode === 'royale' ? 1 : 3) : p.lv, bot: p.bot ? 1 : 0 }));
    const flagMsg = () => ({ t: 'flags', f: flags.map(f => ({ s: f.s, c: f.c, x: +f.x.toFixed(2), y: +f.y.toFixed(2), z: +(f.z || 0).toFixed(2) })), cap: caps });
    const send = (ws, o) => { if (ws.readyState === 1) ws.send(JSON.stringify(o)); };
    const all = (o, except) => { for (const [id, p] of players) if (id !== except) send(p.ws, o); };
    const fixMap = () => { if (cfg.mode === 'royale') cfg.map = 'royale'; else if (cfg.map === 'royale') cfg.map = 'random'; };
    const roster = () => { fixMap(); all({ t: 'roster', host: hostId, players: list(), cfg }); };
    const toHost = lines => { const h = players.get(hostId); if (h) send(h.ws, { t: 'con', lines: [].concat(lines) }); };
    const teamTotals = () => { const t = [0, 0]; for (const p of players.values()) if (!p.spec) t[p.team] += p.k; return t; };
    const balance = () => { let i = 0; for (const p of players.values()) if (!p.spec) p.team = (i++) & 1; };
    const setMode = m => {
      const was = cfg.mode; cfg.mode = m;
      if (m === 'coop') for (const [bid, bp] of players) if (bp.bot) dropSocket(bp.ws, 'Bots are not available in co-op.');
      if (m === 'coop') { const h = players.get(hostId); if (h && h.spec) { h.spec = false; note('Co-op needs the host to play, so the host is no longer spectating.'); } } // the host runs the monsters
      if (teamy(m) && !teamy(was)) balance();
      if (m === 'ctf') { cfg.map = (custom && custom.ctf) ? 'custom' : (cfg.map === 'coliseum' ? 'coliseum' : 'ctf'); cfg.limit = 3; }
      else if (was === 'ctf') { if (cfg.map === 'ctf') cfg.map = 'random'; cfg.limit = 20; }
      if (m === 'coop' && (cfg.map === 'ctf' || cfg.map === 'station')) cfg.map = 'random';
      if (m === 'defuse') { cfg.limit = 3; if (cfg.map === 'ctf') cfg.map = 'random'; }
      else if (was === 'defuse') cfg.limit = 20;
      if (m === 'airhockey') { cfg.limit = 5; cfg.map = 'random'; for (const [bid, bp] of players) if (bp.bot) dropSocket(bp.ws, 'Bots are not available in air hockey.'); }
      else if (was === 'airhockey') cfg.limit = 20;
      if (m === 'royale') { cfg.map = 'royale'; cfg.limit = 1; const h = players.get(hostId); if (h && h.spec) { h.spec = false; note('The host cannot spectate in battle royale.'); } }
      else if (was === 'royale') { cfg.limit = 20; if (cfg.map === 'royale') cfg.map = 'random'; }
    };
    const smallerTeam = () => { const c = [0, 0]; for (const p of players.values()) if (!p.spec) c[p.team]++; return c[0] <= c[1] ? 0 : 1; };

    const dropSocket = (ws, reason) => {
      send(ws, { t: 'kicked', reason });
      setTimeout(() => { try { ws.close(); } catch (e) {} }, 60);
      setTimeout(() => { try { ws.terminate(); } catch (e) {} }, 800);
    };
    const dropPlayer = (id, reason) => { const p = players.get(id); if (p) dropSocket(p.ws, reason); };

    const find = arg => {
      if (!arg) return null;
      const n = Number(arg);
      if (Number.isInteger(n) && players.has(n)) return n;
      const low = arg.toLowerCase();
      for (const [id, p] of players) if (p.name.toLowerCase() === low) return id;
      for (const [id, p] of players) if (p.name.toLowerCase().startsWith(low)) return id;
      return null;
    };

    // Infection: after INF_PRE a random player turns into a zombie (hands only). A zombie that melees a human infects them.
    // Humans win if one is still human INF_TIME after the outbreak; zombies win when nobody is human any more.
    const INF_PRE = 10000, INF_TIME = 180000;
    const AR = { ph: 'off', n: 0, at: 0, end: 0 };
    const INF = { ph: 'off', at: 0, end: 0, z: new Set(), res: 0, h: new Map() };
    const INF_HITS = 2; // a human has to be hit by a zombie this many times in total (any zombie, any amount of time between) before they turn
    const infMsg = extra => Object.assign({ t: 'inf', ph: INF.ph, z: [...INF.z], left: INF.ph === 'wait' ? Math.max(0, INF.at - Date.now()) : INF.ph === 'live' ? Math.max(0, INF.end - Date.now()) : 0 }, extra || {});
    const infLive = () => cfg.mode === 'infection' && running && INF.ph === 'live';
    const infHumans = () => [...players.entries()].filter(([pid, p]) => !p.spec && !INF.z.has(pid));
    // Play of the Game: the best 6 seconds of the match = most damage dealt (plus medkit healing given to teammates), and it has to include a kill.
    // Everyone is told whenever a new best appears so their games can save that stretch; the winner's id is sent with the match result.
    const POTG_MS = 6000, MEDKIT_HEAL = 50;
    let potg = null;
    const pgAdd = (p, pid, kind, v, now) => {
      if (!p) return;
      const a = p.pg || (p.pg = []);
      a.push({ t: now, k: kind, v });
      while (a.length && now - a[0].t > POTG_MS) a.shift();
      let dmg = 0, heal = 0, kills = 0;
      for (const e of a) { if (e.k === 'd') dmg += e.v; else if (e.k === 'h') heal += e.v; else kills++; }
      const sc = dmg + heal;
      if (kills >= 1 && sc > 0 && (!potg || sc > potg.score)) {
        potg = { id: pid, score: sc, dmg: Math.round(dmg), heal: Math.round(heal), kills };
        all({ t: 'potg', id: pid, dmg: potg.dmg, heal: potg.heal, k: kills });
      }
    };
    const endMatch = () => {
      running = false; DF.ph = 'off'; AR.ph = 'off'; BR.ph = 'off';
      medkits.clear();
      const pl = list();
      let winner = 0, team = -1;
      if (teamy(cfg.mode)) {
        let t = (cfg.mode === 'ctf' || cfg.mode === 'defuse') ? caps : teamTotals();
        if (t[0] === t[1]) t = teamTotals();
        if (t[0] !== t[1]) team = t[0] > t[1] ? 0 : 1;
      } else if (cfg.mode === 'coop' || cfg.mode === 'infection') {
        winner = 0;
      } else if (cfg.mode === 'airhockey') {
        const ap = pl.filter(x => x.team !== 2).sort((a, b) => b.k - a.k);
        winner = ap.length && (ap.length < 2 || ap[0].k > ap[1].k) ? ap[0].id : 0;
      } else if (cfg.mode === 'oitc' || cfg.mode === 'royale') {
        const top = pl.filter(x => x.team !== 2).sort((a, b) => (b.lv - a.lv) || (b.k - a.k));
        winner = oiWin && players.has(oiWin) ? oiWin : (top.length && (top.length < 2 || top[0].lv > top[1].lv || (top[0].lv === top[1].lv && top[0].k > top[1].k)) ? top[0].id : 0);
      } else {
        const top = pl.filter(x => x.team !== 2).sort((a, b) => isGG() ? (b.g - a.g || b.k - a.k) : b.k - a.k);
        if (isGG() && ggWin && players.has(ggWin)) winner = ggWin;
        else if (top.length && (top.length < 2 || (isGG() ? (top[0].g > top[1].g || (top[0].g === top[1].g && top[0].k > top[1].k)) : top[0].k > top[1].k))) winner = top[0].id;
      }
      if (cfg.mode !== 'coop' && cfg.mode !== 'defuse' && cfg.mode !== 'infection') statResult(p => teamy(cfg.mode) ? (team < 0 ? 0 : p.team === team ? 1 : -1) : (winner ? (players.get(winner) === p ? 1 : -1) : 0));
      else if (cfg.mode === 'defuse') statSave();
      all({ t: 'end', winner, team, players: pl, cfg, cap: caps, fl: cfg.mode === 'coop' ? cfl : 0, inf: cfg.mode === 'infection' ? INF.res | 0 : 0, potg: potg ? potg.id : 0 });
      INF.ph = 'off';;
    };

    const infEnd = res => { INF.res = res; INF.ph = 'over'; endMatch(); };
    const infCheck = () => { if (infLive() && !infHumans().length) infEnd(2); };
    const infInfect = (vid, by) => {
      if (INF.z.has(vid) || !players.has(vid)) return;
      INF.z.add(vid);
      const v = players.get(vid), b = players.get(by);
      if (b) b.inf = (b.inf | 0) + 1; // infections are counted separately, never as kills
      all(infMsg({ v: vid, by: by || 0, players: list() }));
      note(b ? `${b.name} infected ${v.name}!` : `${v.name} was infected!`);
      infCheck();
    };
    const infTick = () => {
      if (cfg.mode !== 'infection' || !running) { INF.ph = 'off'; return; }
      const now = Date.now();
      if (INF.ph === 'wait' && now >= INF.at) {
        const c = [...players.entries()].filter(([, p]) => !p.spec);
        if (c.length < 2) { INF.at = now + 2000; return; }
        const [zid, zp] = c[Math.floor(Math.random() * c.length)];
        INF.ph = 'live'; INF.end = now + INF_TIME; INF.z = new Set([zid]);
        all(infMsg({ v: zid, by: 0, first: 1, players: list() }));
        note(`${zp.name} is the first zombie! Survive for 3 minutes.`);
      } else if (INF.ph === 'live') {
        if (now >= INF.end) { infEnd(1); return; }
        if (!INF.z.size) { // the only zombie left: pick a new one from the humans
          const h = infHumans();
          if (h.length >= 2) { const [zid, zp] = h[Math.floor(Math.random() * h.length)]; INF.z.add(zid); all(infMsg({ v: zid, by: 0, first: 1, players: list() })); note(`${zp.name} is the new first zombie!`); }
        }
        infCheck();
      }
    };
    const infIv = setInterval(infTick, 250);

    // Co-op ends when every player is down at the same time
    const coopWipeCheck = () => {
      if (!running || cfg.mode !== 'coop' || !players.size) return;
      for (const p of players.values()) if (!p.spec && !p.dead) return;
      endMatch();
    };
    const startMatch = () => {
      if (![...players.values()].some(p => !p.spec)) { note('Nobody is playing: everyone is spectating. Move a player off the Spectators team first.'); return false; }
      if (cfg.mode === 'infection' && [...players.values()].filter(p => !p.spec).length < 2) { note('Infection needs at least 2 players.'); return false; }
      if (cfg.mode === 'royale' && [...players.values()].filter(p => !p.spec).length < 2) { note('Battle Royale needs at least 2 players. Add a bot or wait for someone to join.'); return false; }
      if (cfg.mode === 'airhockey') { const np = [...players.values()].filter(p => !p.spec).length; if (np < 2) { note('Air Hockey needs exactly 2 players. Wait for an opponent to join.'); return false; } if (np > 2) { note('Air Hockey is 1v1. Move the extra players to the Spectators team first.'); return false; } }
      medkits.clear();
      running = true;
      if (cfg.mode === 'ctf' && !(cfg.map === 'custom' && custom && custom.ctf) && cfg.map !== 'coliseum') cfg.map = 'ctf';
      if (cfg.map === 'custom' && !custom) cfg.map = 'random';
      seed = (Math.random() * 1e9) | 0;
      for (const p of players.values()) { p.k = 0; p.d = 0; p.as = 0; p.pl = 0; p.df = 0; p.cp = 0; p.rt = 0; p.inf = 0; p.hitBy = {}; p.dead = 0; p.cash = CASH_START; p.per = {}; p.gl = 0; p.pg = []; p.lv = cfg.mode === 'royale' ? 1 : 3; p.omT = 0; p.ahEnd = 0; p.brOk = 0; }
      BR.ph = cfg.mode === 'royale' ? 'pick' : 'off'; BR.at = Date.now() + BR_PICK_MS; BR.pick = new Map(); BR.opened = new Set(); BR.n0 = [...players.values()].filter(p => !p.spec).length;
      potg = null;
      ggWin = 0; oiWin = 0; ggOrder = ggMake();
      cfl = 1; cOpen = false;
      if (cfg.mode === 'coop' && (cfg.map === 'ctf' || cfg.map === 'station')) cfg.map = 'random';
      resetFlags();
      const go = (only) => {
        if (!only && cfg.mode === 'defuse') dfStart();
        if (!only && cfg.mode === 'arms') arStart();
        if (only && isGG()) { const q = [...players.values()].find(x => x.ws === only); if (q) { const o2 = [...players.values()].filter(x => x !== q && !x.spec); q.gl = o2.length ? Math.min(...o2.map(x => x.gl | 0)) : 0; } }
        const mq = only && isGG() ? [...players.values()].find(x => x.ws === only) : null;
        const m = { t: 'start', go: isGG() ? ggOrder : undefined, gl: mq ? mq.gl : 0, seed, cfg, map: cfg.map, pre: cfg.mode === 'brighton' ? PRE_ROUND : cfg.mode === 'cash' ? CASH_PRE : 0, fl: cfl, players: list() };
        if (cfg.mode === 'cash') { for (const [pid, p] of players) if (!only || only === p.ws) send(p.ws, { t: 'cash', c: p.cash }); }
        if (only) send(only, m); else all(m);
        if (cfg.mode === 'ctf') (only ? send(only, flagMsg()) : all(flagMsg()));
        if (cfg.mode === 'infection') { if (!only) { INF.ph = 'wait'; INF.at = Date.now() + INF_PRE; INF.z = new Set(); INF.h = new Map(); INF.res = 0; } if (only) send(only, infMsg()); else all(infMsg()); }
      };
      if (cfg.map === 'custom') beginLoad(go); else go();
      return true;
    };
    // Everyone except the host must show the same map file before the match begins.
    const beginLoad = (go) => {
      clearTimeout(loadTimer);
      loading = { go, wait: new Set([...players.keys()].filter(i => i !== hostId)) };
      finishLoad(); // nobody else to wait for (host alone): start straight away
      loadTimer = setTimeout(() => { if (loading) for (const i of [...loading.wait]) dropPlayer(i, 'You did not pick the map file in time.'); finishLoad(); }, 120000);
    };
    const announceLoad = () => { if (loading) all({ t: 'load', name: custom ? custom.name : 'the custom map', v: custom ? custom.v : '', wait: [...loading.wait] }); };
    const finishLoad = () => {
      if (!loading || loading.wait.size) { announceLoad(); return; }
      const g = loading.go; loading = null; clearTimeout(loadTimer);
      g();
    };

    const note = text => all({ t: 'note', text });
    const dropCarried = (id, x, y, z) => {
      let ch = false;
      for (let t = 0; t < 2; t++) if (flags[t].s === 1 && flags[t].c === id) {
        const p = players.get(id), nm = p ? p.name : 'A player';
        const h = flagHome(t);
        flags[t] = { s: 2, c: 0, x: Number.isFinite(x) ? x : h.x, y: Number.isFinite(y) ? y : h.y, z: Number.isFinite(z) ? z : h.z, dt: Date.now() };
        note(`${nm} dropped the ${TEAM_NAMES[t]} flag!`); ch = true;
      }
      if (ch) all(flagMsg());
    };
    // Flag rules run on the server from each player's reported position, so a client can't just claim a capture.
    const ctfTick = (id, me) => {
      if (!running || cfg.mode !== 'ctf' || me.dead || me.x == null) return;
      const mine = me.team, en = 1 - mine, cm = ctfMap();
      const near = (a, b, r) => Math.hypot(a.x - b.x, a.y - b.y) < r && (!cm || Math.abs((a.z || 0) - (b.z || 0)) < FLAG_DZ);
      // your own capture zone (a box taken from the map), or a circle around your flag's home when the map has none
      const inZone = () => {
        const zs = cm ? cm.z[mine] : [];
        if (!zs.length) return near(me, flagHome(mine), FLAG_CAP);
        return zs.some(q => me.x >= q[0] - .3 && me.x <= q[3] + .3 && me.y >= q[1] - .3 && me.y <= q[4] + .3 && (me.z || 0) >= q[2] - .6 && (me.z || 0) <= q[5] + .6);
      };
      let ch = false;
      if (flags[en].s !== 1 && near(me, flags[en], FLAG_GRAB)) {
        flags[en] = { s: 1, c: id, x: me.x, y: me.y, z: me.z || 0, dt: 0 }; ch = true; note(`${me.name} took the ${TEAM_NAMES[en]} flag!`);
      }
      if (flags[mine].s === 2 && near(me, flags[mine], FLAG_GRAB)) {
        me.rt = (me.rt | 0) + 1; roster(); homeFlag(mine); ch = true; note(`${me.name} returned the ${TEAM_NAMES[mine]} flag.`);
      }
      if (flags[en].s === 1 && flags[en].c === id && flags[mine].s === 0 && inZone()) {
        caps[mine]++; me.cp = (me.cp | 0) + 1; roster(); homeFlag(en); ch = true;
        note(`${me.name} captured the ${TEAM_NAMES[en]} flag! ${TEAM_NAMES[0]} ${caps[0]} - ${caps[1]} ${TEAM_NAMES[1]}`);
        if (caps[mine] >= cfg.limit) { all(flagMsg()); return endMatch(); }
      }
      if (ch) all(flagMsg());
    };

    // ---- Bomb Defusal: the server runs the rounds, the bomb and the plant / defuse timers; clients only report position and "holding use" ----
    let DF = { ph: 'off', n: 0, atk: 0, rs: [0, 0], at: 0, liveEnd: 0, ls: [0, 0], bomb: { s: 0, c: 0, x: 0, y: 0, z: 0, site: -1, boom: 0 }, act: null, sites: null, decided: false, warned: false };
    const dfSites = () => (cfg.map === 'custom' && custom && custom.bomb) ? custom.bomb.s.map(b => ({ box: b })) : (DF.sites || []);
    const inSite = (s, p) => s.box
      ? (p.x >= s.box[0] - .3 && p.x <= s.box[3] + .3 && p.y >= s.box[1] - .3 && p.y <= s.box[4] + .3 && (p.z || 0) >= s.box[2] - .8 && (p.z || 0) <= s.box[5] + .8)
      : Math.hypot(p.x - s.x, p.y - s.y) <= s.r;
    const siteAt = p => dfSites().findIndex(s => inSite(s, p));
    const dfAlive = t => { let n = 0; for (const p of players.values()) if (!p.spec && p.team === t && !p.dead) n++; return n; };
    const bombMsg = () => { const b = DF.bomb; return { t: 'bomb', s: b.s, c: b.c, x: +(+b.x).toFixed(2), y: +(+b.y).toFixed(2), z: +(+b.z).toFixed(2), site: b.site, rem: b.s === 3 ? +Math.max(0, (b.boom - Date.now()) / 1000).toFixed(1) : 0 }; };
    const cancelAct = () => { const a = DF.act; DF.act = null; if (a) { const p = players.get(a.id); if (p) send(p.ws, { t: 'bact', on: 0 }); } };
    const addCash = (p, amt) => { p.cash = Math.max(0, Math.min(DF_CASH_MAX, p.cash + amt)); send(p.ws, { t: 'cash', c: p.cash }); };
    const dfStart = () => {
      DF = { ph: 'wait', n: 0, atk: Math.random() < .5 ? 0 : 1, rs: [0, 0], at: Date.now() + DF_WAIT, liveEnd: 0, ls: [0, 0], bomb: { s: 0, c: 0, x: 0, y: 0, z: 0, site: -1, boom: 0 }, act: null, sites: null, decided: false, warned: false };
      caps = [0, 0];
    };
    const dfNewRound = () => {
      const now = Date.now(), ids = [...players.entries()].filter(([, p]) => !p.spec);
      if (!ids.some(([, p]) => p.team === DF.atk) || !ids.some(([, p]) => p.team !== DF.atk)) {
        DF.ph = 'wait'; DF.at = now + 2000;
        if (!DF.warned) { DF.warned = true; note('Bomb Defusal needs at least one player on each team.'); }
        return;
      }
      DF.warned = false; DF.n++; DF.act = null; medkits.clear();
      if (DF.n === DF_SWAP_AFTER + 1) { DF.atk = 1 - DF.atk; note('Halftime: the teams swap sides.'); }
      for (const [, p] of ids) { p.dead = 0; p.per = {}; }
      const atkIds = ids.filter(([, p]) => p.team === DF.atk).map(([id]) => id), carrier = atkIds[Math.floor(Math.random() * atkIds.length)];
      DF.bomb = { s: 0, c: carrier, x: 0, y: 0, z: 0, site: -1, boom: 0 };
      DF.ph = 'freeze'; DF.at = now + DF_FREEZE;
      all({ t: 'rnd', n: DF.n, atk: DF.atk, rs: DF.rs, bomber: carrier, fz: DF_FREEZE / 1000, lv: DF_LIVE / 1000 });
      all(bombMsg());
    };
    const dfEnd = (win, why) => {
      if (DF.ph !== 'live') return;
      DF.ph = 'over'; DF.rs[win]++; caps = [DF.rs[0], DF.rs[1]]; cancelAct();
      statResult(p => p.team === win ? 1 : -1);
      DF.ls[win] = 0; DF.ls[1 - win] = Math.min(4, DF.ls[1 - win] + 1);
      for (const p of players.values()) addCash(p, p.team === win ? DF_WIN_CASH : DF_LOSS_CASH + DF_STREAK_CASH * Math.min(3, DF.ls[p.team] - 1));
      if (why === 'boom') DF.bomb.s = 5; else if (why === 'defused') DF.bomb.s = 4;
      all({ t: 'rend', w: win, why, rs: DF.rs, n: DF.n });
      if (why === 'boom' || why === 'defused') all(bombMsg());
      DF.decided = DF.rs[win] >= cfg.limit; DF.at = Date.now() + DF_OVER;
    };
    const dfCheck = () => {
      if (!running || cfg.mode !== 'defuse' || DF.ph !== 'live') return;
      const a = dfAlive(DF.atk), d = dfAlive(1 - DF.atk);
      if (d === 0) dfEnd(DF.atk, 'elim');
      else if (a === 0 && DF.bomb.s !== 3) dfEnd(1 - DF.atk, 'elim');
    };
    const dfDrop = (id, me) => {
      const b = DF.bomb;
      if (cfg.mode !== 'defuse' || !running || b.s !== 0 || b.c !== id) return;
      DF.bomb = { s: 1, c: 0, x: me.x || 0, y: me.y || 0, z: me.z || 0, site: -1, boom: 0 };
      note(me.name + ' dropped the bomb.'); all(bombMsg());
    };
    const dfPos = (id, me) => {
      const b = DF.bomb;
      if (!running || cfg.mode !== 'defuse' || DF.ph !== 'live' || me.dead || me.x == null) return;
      if (b.s === 1 && me.team === DF.atk && Math.hypot(me.x - b.x, me.y - b.y) < 1.3 && Math.abs((me.z || 0) - b.z) < 1.5) {
        DF.bomb = { s: 0, c: id, x: 0, y: 0, z: 0, site: -1, boom: 0 }; note(me.name + ' picked up the bomb.'); all(bombMsg());
      }
    };
    const dfTick = () => {
      if (!running || cfg.mode !== 'defuse') return;
      const now = Date.now();
      if (DF.ph === 'wait') {
        if (now < DF.at) return;
        if (!dfSites().length) { if (now > DF.at + 40000) { note('No bomb sites could be set up on this map.'); endMatch(); } return; }
        dfNewRound();
      } else if (DF.ph === 'freeze') {
        if (now >= DF.at) { DF.ph = 'live'; DF.liveEnd = now + DF_LIVE; all({ t: 'rlive', lv: DF_LIVE / 1000 }); dfCheck(); }
      } else if (DF.ph === 'live') {
        const b = DF.bomb;
        if (b.s === 3 && now >= b.boom) return dfEnd(DF.atk, 'boom');
        if (b.s !== 3 && now >= DF.liveEnd) return dfEnd(1 - DF.atk, 'time');
        const a = DF.act;
        if (a) {
          const p = players.get(a.id);
          if (!p || p.dead || Math.hypot(p.x - a.x, p.y - a.y) > .8) cancelAct();
          else if (now - a.t >= a.need) {
            if (a.kind === 'plant') {
              DF.act = null;
              DF.bomb = { s: 3, c: 0, x: p.x, y: p.y, z: p.z || 0, site: a.site, boom: now + DF_FUSE };
              p.pl++; note(p.name + ' planted the bomb at site ' + 'ABCD'[a.site] + '!'); all(bombMsg()); addCash(p, DF_OBJ_CASH);
            } else { p.df++; note(p.name + ' defused the bomb!'); addCash(p, DF_OBJ_CASH); dfEnd(1 - DF.atk, 'defused'); }
          }
        }
      } else if (DF.ph === 'over') {
        if (now < DF.at) return;
        if (DF.decided) { DF.ph = 'off'; endMatch(); } else dfNewRound();
      }
    };
    const dfIv = setInterval(dfTick, 250);
    // Arms Race: Gun Game's weapon ladder (best weapon first), played in rounds. Everyone starts each round alive with their current weapon;
    // a kill upgrades the killer's weapon, and anyone who dies sits out until the round ends. A round ends when one player is left standing (or on time).
    const AR_LIVE = 90000, AR_OVER = 5000, AR_WAIT = 4000;
    const arAlive = () => [...players.entries()].filter(([, p]) => !p.spec && !p.dead);
    // One in the Chamber: last player with lives left wins
    // ---- Battle Royale: spawn pick, then live until one player is left ----
    const BR = { ph: 'off', at: 0, pick: new Map(), opened: new Set(), z: [], t0: 0, n0: 0 };
    const brZones = () => {
      let c = [128, 128], z = [[c[0], c[1], BR_R[0]]];
      for (let i = 1; i < BR_R.length; i++) {
        const room = Math.max(0, BR_R[i - 1] - BR_R[i]) * 0.85, a = Math.random() * 6.2832, d = Math.sqrt(Math.random()) * room;
        c = [Math.max(10, Math.min(246, c[0] + Math.cos(a) * d)), Math.max(10, Math.min(246, c[1] + Math.sin(a) * d))];
        z.push([+c[0].toFixed(1), +c[1].toFixed(1), BR_R[i]]);
      }
      return z;
    };
    const brGo = () => {
      if (BR.ph !== 'pick') return;
      BR.ph = 'live'; BR.t0 = Date.now(); BR.z = brZones();
      for (const [pid, p] of players) {
        if (p.spec) continue;
        const pk = BR.pick.get(pid);
        send(p.ws, { t: 'brgo', x: pk ? pk.x : -1, y: pk ? pk.y : -1, z: BR.z, h: BR_HOLD, s: BR_SHRINK });
      }
    };
    const brTick = () => {
      if (!running || cfg.mode !== 'royale') return;
      if (BR.ph === 'pick') {
        const humans = [...players.values()].filter(p => !p.spec && !p.bot);
        const all2 = humans.length && humans.every(p => p.brOk);
        if (Date.now() >= BR.at || (all2 && Date.now() >= BR.at - BR_PICK_MS + 4000)) brGo();
      }
    };
    const brIv = setInterval(brTick, 250);
    const brCheck = () => {
      if (!running || cfg.mode !== 'royale' || BR.ph !== 'live') return;
      const pl = [...players.entries()].filter(([, p]) => !p.spec);
      const al = pl.filter(([, p]) => (p.lv == null ? 1 : p.lv) > 0);
      if (BR.n0 >= 2 && al.length <= 1) { oiWin = al.length ? al[0][0] : 0; endMatch(); }
    };
    const oiCheck = () => {
      if (!running || cfg.mode !== 'oitc') return;
      const pl = [...players.entries()].filter(([, p]) => !p.spec);
      const al = pl.filter(([, p]) => (p.lv == null ? 3 : p.lv) > 0);
      if (pl.length >= 2 && al.length <= 1) { oiWin = al.length ? al[0][0] : 0; endMatch(); }
    };
    const arStart = () => { AR.ph = 'wait'; AR.at = Date.now() + AR_WAIT; AR.n = 0; };
    const arNewRound = () => {
      AR.n++; AR.ph = 'live'; AR.end = Date.now() + AR_LIVE;
      for (const p of players.values()) p.dead = 0;
      medkits.clear();
      all({ t: 'arr', n: AR.n, lv: AR_LIVE / 1000, players: list() });
    };
    const arEnd = (win, why) => {
      if (AR.ph !== 'live') return;
      AR.ph = 'over'; AR.at = Date.now() + AR_OVER;
      all({ t: 'arend', w: win || 0, why, n: AR.n });
    };
    const arCheck = () => {
      if (!running || cfg.mode !== 'arms' || AR.ph !== 'live') return;
      const tot = [...players.values()].filter(p => !p.spec).length, al = arAlive();
      if (tot >= 2 && al.length <= 1) arEnd(al.length ? al[0][0] : 0, 'elim');
    };
    const arTick = () => {
      if (cfg.mode !== 'arms' || !running) { AR.ph = 'off'; return; }
      const now = Date.now();
      if (AR.ph === 'wait') { if (now >= AR.at) arNewRound(); }
      else if (AR.ph === 'live') { if (now >= AR.end) arEnd(0, 'time'); }
      else if (AR.ph === 'over') { if (now >= AR.at) arNewRound(); }
    };
    const arIv = setInterval(arTick, 250);
    const arJoin = (ws, me) => {
      if (!running || cfg.mode !== 'arms') return;
      if (AR.ph === 'live' || AR.ph === 'over') me.dead = 1;
      send(ws, { t: 'arstate', ph: AR.ph, n: AR.n, lv: AR_LIVE / 1000, rem: AR.ph === 'live' ? Math.max(0, (AR.end - Date.now()) / 1000) : 0 });
    };
    // a player who joins mid-match sits out the current round
    const dfJoin = (ws, me) => {
      if (!running || cfg.mode !== 'defuse') return;
      if (DF.ph !== 'wait') me.dead = 1;
      send(ws, { t: 'rstate', ph: DF.ph, n: DF.n, atk: DF.atk, rs: DF.rs, fz: DF_FREEZE / 1000, lv: DF_LIVE / 1000, rem: DF.ph === 'live' ? Math.max(0, (DF.liveEnd - Date.now()) / 1000) : DF.ph === 'freeze' ? Math.max(0, (DF.at - Date.now()) / 1000) : 0 });
      send(ws, bombMsg()); send(ws, { t: 'cash', c: me.cash });
    };

    const runCmd = line => {
      const parts = line.trim().split(/\s+/);
      const c = (parts.shift() || '').toLowerCase();
      const arg = parts.join(' ');
      switch (c) {
        case 'help': case '?': return HELP;
        case 'players': case 'status': {
          const out = [`${MODE_NAMES[cfg.mode]} | map ${cfg.map} | limit ${cfg.limit} | ${running ? 'match running' : 'lobby'}`];
          for (const [id, p] of players)
            out.push(`  #${id} ${p.name}  ${p.ip}  ${p.ping == null ? '--' : p.ping + 'ms'}  K${p.k}/D${p.d}` +
              (p.spec ? '  Spectator' : teamy(cfg.mode) ? '  ' + TEAM_NAMES[p.team] : '') + (id === hostId ? '  (host)' : ''));
          return out;
        }
        case 'ip': {
          const id = find(arg); if (id == null) return ['No such player. Use: ip <player>'];
          const p = players.get(id); return [`${p.name}: ${p.ip}`];
        }
        case 'kick': {
          const id = find(arg); if (id == null) return ['No such player. Use: kick <player>'];
          if (id === hostId) return ['You can\'t kick yourself.'];
          const name = players.get(id).name; dropPlayer(id, 'You were kicked by the host.'); return [`Kicked ${name}.`];
        }
        case 'ban': {
          let ip = null; const id = find(arg);
          if (id != null) { if (id === hostId) return ['You can\'t ban yourself.']; ip = players.get(id).ip; }
          else if (/^[0-9a-fA-F:.]{3,45}$/.test(arg)) ip = cleanIp(arg);
          if (!ip) return ['Use: ban <player|ip>'];
          const hostIp = players.get(hostId) && players.get(hostId).ip;
          if (ip === hostIp || ip === '127.0.0.1' || ip === '::1') return ['That is your own address, not banned.'];
          bans.add(ip);
          let n = 0;
          for (const [pid, p] of players) if (p.ip === ip && pid !== hostId) { dropPlayer(pid, 'You are banned from this server.'); n++; }
          return [`Banned ${ip}${n ? ' and kicked ' + n + ' player' + (n > 1 ? 's' : '') : ''}. (Bans last until you stop hosting.)`];
        }
        case 'unban': {
          const ip = cleanIp(arg);
          return bans.delete(ip) ? [`Unbanned ${ip}.`] : [`${ip} is not banned.`];
        }
        case 'banlist': return bans.size ? ['Banned IPs:', ...[...bans].map(i => '  ' + i)] : ['No banned IPs.'];
        case 'maps': return ['Map types: ' + MAPS.join(', ')];
        case 'map': {
          const m = arg.toLowerCase();
          if (!m) return [`Current map: ${cfg.map}`, 'Map types: ' + MAPS.join(', ')];
          if (!MAPS.includes(m)) return [`Unknown map "${m}". Map types: ` + MAPS.join(', ')];
          if (m === 'custom' && !custom) return ['No imported map: import a .bsp in the lobby first (Import .bsp button).'];
          if (cfg.mode === 'coop' && (m === 'ctf' || m === 'station')) return ['Co-op is not played on the ' + m + ' map.'];
          if (cfg.mode === 'ctf' && m !== 'ctf' && m !== 'coliseum' && !(m === 'custom' && custom && custom.ctf)) return ['Capture the Flag is played on the ctf map, the coliseum, or on an imported map that has flags. Change the mode first.'];
          cfg.map = m;
          if (running) { seed = (Math.random() * 1e9) | 0; if (m === 'custom') { startMatch(); } else all({ t: 'map', seed, map: m }); }
          roster();
          return [running ? `Loading ${m} for everyone...` : `Next map: ${m}.`];
        }
        case 'mode': {
          const m = MODE_ALIAS[arg.toLowerCase()] || arg.toLowerCase();
          if (!m) return [`Current mode: ${cfg.mode}`, 'Modes: ' + MODES.join(', ')];
          if (!MODES.includes(m)) return ['Modes: ' + MODES.join(', ')];
          if (running) return ['Can\'t change the mode during a match. Use "end" or "lobby" first.'];
          setMode(m); roster();
          return [`Mode set to ${MODE_NAMES[m]}.`];
        }
        case 'limit': {
          const n = parseInt(arg, 10);
          if (!(n >= 1 && n <= 200)) return ['Use: limit <1-200>'];
          cfg.limit = n; roster(); return [`Kills to win: ${n}.`];
        }
        case 'team': {
          const toks = arg.split(/\s+/); const col = (toks.pop() || '').toLowerCase();
          const id = find(toks.join(' '));
          if (id == null || !['red', 'blue', 'spec', 'spectator'].includes(col)) return ['Use: team <player> <red|blue|spec>'];
          if (running) return ['Teams can only be changed in the lobby.'];
          const tp = players.get(id);
          if (col === 'spec' || col === 'spectator') {
            if (id === hostId && cfg.mode === 'coop') return ['The host cannot spectate in co-op (the host runs the monsters).'];
            tp.spec = true; roster(); return [`${tp.name} is now spectating.`];
          }
          tp.spec = false; if (teamy(cfg.mode)) tp.team = col === 'red' ? 0 : 1; roster();
          return [teamy(cfg.mode) ? `${tp.name} is now on the ${col} team.` : `${tp.name} is now playing.`];
        }
        case 'start':
          if (running) return ['A match is already running.'];
          return startMatch() ? ['Match started.'] : ['Nobody is playing: everyone is spectating.'];
        case 'end':
          if (!running) return ['No match is running.'];
          endMatch(); return ['Match ended.'];
        case 'lobby':
          running = false; all({ t: 'lobby', host: hostId, players: list(), cfg }); return ['Everyone sent back to the lobby.'];
        case 'say':
          if (!arg) return ['Use: say <text>'];
          all({ t: 'say', text: txt(arg, 200) }); return ['Sent.'];
        default:
          return [`Unknown command "${c}". Type help.`];
      }
    };

    // ---- Weapon statistics for the host (written to stats.txt). Multiplayer only; co-op is not tracked. ----
    const ARMS_ORDER = ['Sniper', 'Marksman', 'Rattler', 'Flamethrower', 'Hand cannon', 'Lance', 'Scattergun', 'Twin fang', 'Fan gun', 'Needler', 'Pistol', 'Ninja sword', 'Reaper axe', 'Quake hammer', 'Twin daggers'];
    const STAT_W = ['Pistol', 'Scattergun', 'Rattler', 'Lance', 'Twin fang', 'Hand cannon', 'Fan gun', 'Needler', 'Marksman', 'Sniper', 'Flamethrower', 'Reaper axe', 'Twin daggers', 'Quake hammer', 'Ninja sword'];
    const ST = {}; for (const w of STAT_W) ST[w] = { t: 0, k: 0, d: 0, w: 0, l: 0 };
    let stDirty = false, stLast = Date.now();
    if (statsFile) {
      try {
        const m = /^#data (.+)$/m.exec(fs.readFileSync(statsFile, 'utf8'));
        if (m) { const j = JSON.parse(m[1]); for (const w of STAT_W) if (j[w]) for (const k of ['t', 'k', 'd', 'w', 'l']) { const v = Number(j[w][k]); if (Number.isFinite(v) && v >= 0) ST[w][k] = v; } }
      } catch (e) {}
    }
    const statOn = () => !!statsFile && running && cfg.mode !== 'coop' && cfg.mode !== 'infection' && ![...players.values()].some(p => p.bot); // matches with bots are not counted
    const fmtT = s => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m ${String(s % 60).padStart(2, '0')}s`; };
    const statText = () => {
      const tot = STAT_W.reduce((a, w) => a + ST[w].t, 0), rows = STAT_W.slice().sort((a, b) => ST[b].t - ST[a].t || STAT_W.indexOf(a) - STAT_W.indexOf(b));
      const L = [];
      L.push('ARBERIA DEATHMATCH - WEAPON STATS', 'Updated: ' + new Date().toLocaleString(), '',
        'Multiplayer games hosted from this game folder (co-op is not counted). Totals keep adding up between sessions;',
        'delete this file to start over.',
        'Use %    = share of all player time spent holding that weapon (alive players, sampled twice a second),',
        '           not "ever used it".',
        'Kills    = player kills with that weapon. Deaths = times a player died while holding it.',
        'K/D      = kills divided by deaths (deaths count as 1 when there are none yet).',
        'Wins/Losses = one per round in Bomb Defusal, one per match in the other modes, credited to the weapon',
        '           the player held the most during that round or match. Ties and abandoned matches are not counted.', '');
      const pad = (v, n) => String(v).padStart(n), name = (v) => String(v).padEnd(14);
      L.push(name('Weapon') + pad('Use %', 8) + pad('Time held', 12) + pad('Kills', 8) + pad('Deaths', 8) + pad('K/D', 8) + pad('Wins', 7) + pad('Losses', 8));
      for (const w of rows) {
        const x = ST[w], pc = tot ? (100 * x.t / tot).toFixed(1) + '%' : '0.0%', kd = (x.k / Math.max(1, x.d)).toFixed(2);
        L.push(name(w) + pad(pc, 8) + pad(fmtT(x.t), 12) + pad(x.k, 8) + pad(x.d, 8) + pad(kd, 8) + pad(x.w, 7) + pad(x.l, 8));
      }
      L.push('', 'Total player time: ' + fmtT(tot), '', '#data ' + JSON.stringify(ST), '');
      return L.join('\r\n');
    };
    const statSave = (sync) => {
      if (!statsFile || !stDirty) return;
      stDirty = false;
      try { if (sync) fs.writeFileSync(statsFile, statText()); else fs.writeFile(statsFile, statText(), () => {}); } catch (e) {}
    };
    const statsIv = setInterval(() => {
      const now = Date.now(), dt = Math.min(2000, now - stLast) / 1000; stLast = now;
      if (!statOn()) return;
      const live = cfg.mode !== 'defuse' || DF.ph === 'freeze' || DF.ph === 'live';
      if (live) for (const p of players.values()) if (p.wk && !p.dead) { ST[p.wk].t += dt; p.per[p.wk] = (p.per[p.wk] || 0) + dt; stDirty = true; }
    }, 500);
    const statSaveIv = setInterval(() => statSave(), 30000);
    const statResult = verdict => { // verdict(player) -> 1 win, -1 loss, 0 nothing
      if (!statsFile) return;
      for (const p of players.values()) {
        let best = null, bt = 0; for (const w in p.per) if (p.per[w] > bt) { bt = p.per[w]; best = w; }
        p.per = {};
        const v = verdict(p);
        if (best && v) { ST[best][v > 0 ? 'w' : 'l']++; stDirty = true; }
      }
      statSave();
    };

    const pingTimer = setInterval(() => {
      const ts = Date.now(), p = {};
      for (const [id, pl] of players) { send(pl.ws, { t: 'ping', ts }); if (pl.ping != null) p[id] = pl.ping; }
      all({ t: 'pings', p });
    }, 2000);

    const flagTimer = setInterval(() => {
      if (!running || cfg.mode !== 'ctf') return;
      let ch = false;
      for (let t = 0; t < 2; t++) if (flags[t].s === 2 && Date.now() - flags[t].dt > FLAG_RETURN_MS) { homeFlag(t); ch = true; note(`The ${TEAM_NAMES[t]} flag returned to its base.`); }
      if (ch) all(flagMsg());
    }, 1000);

    wss.on('listening', () => {
      resolve({
        close() {
          closed = true;
          clearInterval(pingTimer); clearInterval(flagTimer); clearInterval(dfIv); clearInterval(arIv); clearInterval(infIv); clearInterval(brIv); clearInterval(statsIv); clearInterval(statSaveIv); statSave(true);
          for (const c of wss.clients) c.terminate();
          wss.close();
        }
      });
    });
    wss.on('error', reject);

    wss.on('connection', (ws, req) => {
      const ip = cleanIp(req && req.socket && req.socket.remoteAddress);
      ws.on('error', () => {});
      if (closed) return ws.terminate();
      if (bans.has(ip)) return dropSocket(ws, 'You are banned from this server.');
      if (players.size >= MAX_PLAYERS || wss.clients.size > MAX_SOCKETS) return dropSocket(ws, 'The server is full.');
      // Per-IP cap (loopback is exempt: the host, and tunnel services such as Tailscale/ngrok, all arrive as 127.0.0.1).
      if (ip !== '127.0.0.1' && ip !== '::1') {
        let n = 0; for (const c of wss.clients) if (c !== ws && c._ip === ip) n++;
        if (n >= MAX_PER_IP) return dropSocket(ws, 'Too many connections from your address.');
      }
      ws._ip = ip;

      let id = 0, joined = false, tokens = BURST, tLast = Date.now(), hitTok = HIT_RATE, strikes = 0;
      pending.add(ws);
      const joinTimer = setTimeout(() => { if (!joined) { pending.delete(ws); ws.terminate(); } }, JOIN_TIMEOUT);

      ws.on('message', (raw, isBinary) => {
        if (isBinary) return ws.terminate();
        // token bucket: flooding gets the connection dropped instead of burning the host's CPU
        const now = Date.now();
        tokens = Math.min(BURST, tokens + (now - tLast) / 1000 * RATE); tLast = now;
        if (--tokens < 0) return ws.terminate();
        let o; try { o = JSON.parse(raw.toString('utf8')); } catch (e) { return; }
        if (!o || typeof o !== 'object' || Array.isArray(o) || typeof o.t !== 'string') return;
        if (raw.length > MSG_MAX && o.t !== 'skin' && o.t !== 'prof' && o.t !== 'spr') return ws.terminate();
        if (o.t === 'spr' && raw.length > SPR_MAX + 200) return ws.terminate();
        if (o.t === 'prof' && raw.length > BG_MAX + 300) return ws.terminate();
        if (o.t === 'skin' && raw.length > SKIN_MAX + 200) return ws.terminate();

        if (!joined) {
          if (o.t !== 'join') return;
          let asHost = false, asBot = false;
          if (o.token !== undefined) {
            if (typeof o.token !== 'string' || !same(o.token, hostToken)) return dropSocket(ws, 'Invalid host credentials.');
            if (o.bot === true) { // a bot: only the host's own game knows the token, and the host must already be here
              if (!hostId) return dropSocket(ws, 'The host is not ready yet.');
              if (cfg.mode === 'coop') return dropSocket(ws, 'Bots are not available in co-op.');
              if (cfg.mode === 'airhockey') return dropSocket(ws, 'Bots are not available in air hockey.');
              let nb = 0; for (const p of players.values()) if (p.bot) nb++;
              if (nb >= BOT_MAX) return dropSocket(ws, 'Too many bots.');
              asBot = true;
            } else { if (hostId) return dropSocket(ws, 'Invalid host credentials.'); asHost = true; }
          }
          if (!asHost && !hostId) return dropSocket(ws, 'The host is not ready yet. Try again in a moment.');
          if (players.size >= MAX_PLAYERS) return dropSocket(ws, 'The server is full.');
          if (running && cfg.mode === 'airhockey') return dropSocket(ws, 'An air hockey match is in progress. Try again when it ends.');
          if (running && cfg.mode === 'royale') return dropSocket(ws, 'A battle royale is in progress. Try again when it ends.');
          joined = true; clearTimeout(joinTimer); pending.delete(ws);
          id = nextId++;
          const me = { ws, ip, bot: asBot, spec: false, name: txt(o.name, 16) || 'Player' + id, k: 0, d: 0, team: smallerTeam(), ping: null, deadAt: 0, lastHit: null, hitBy: {}, as: 0, pl: 0, df: 0, cash: CASH_START, wk: '', per: {} };
          players.set(id, me);
          if (asHost) hostId = id;
          send(ws, { t: 'welcome', id, host: hostId, running, players: list(), cfg });
          if (running && loading) { if (id !== hostId) loading.wait.add(id); announceLoad(); }
          else if (running && cfg.map === 'custom' && id !== hostId) { pendJoin.add(id); send(ws, { t: 'load', name: custom ? custom.name : 'the custom map', v: custom ? custom.v : '', wait: [id] }); }
          else if (running) { send(ws, { t: 'start', go: isGG() ? ggOrder : undefined, gl: me.gl | 0, seed, cfg, map: cfg.map, pre: 0, fl: cfl, players: list() }); if (cfg.mode === 'cash') send(ws, { t: 'cash', c: me.cash }); if (cfg.mode === 'infection') { if (INF.ph === 'live') INF.z.add(id); all(infMsg({ players: list() })); } }
          if (running && cfg.mode === 'ctf') send(ws, flagMsg());
          if (running && cfg.mode === 'defuse' && !(loading || (cfg.map === 'custom' && id !== hostId))) dfJoin(ws, me);
          if (running && cfg.mode === 'arms' && !(loading || (cfg.map === 'custom' && id !== hostId))) arJoin(ws, me);
          roster();
          if (chatLog.length) send(ws, { t: 'chatlog', lines: chatLog });
          if (!asBot) { const jm = { id, name: me.name, text: 'joined the game', sys: 1, tm: 0, team: me.team, sp: 0 }; chatLog.push(jm); if (chatLog.length > 40) chatLog.shift(); all({ t: 'chat', ...jm }); }
          for (const [pid, p] of players) if (pid !== id && p.skin) send(ws, { t: 'skin', id: pid, d: p.skin });
          for (const [pid, p] of players) if (pid !== id && p.prof) send(ws, { t: 'prof', id: pid, ...p.prof });
          for (const [pid, p] of players) if (pid !== id && p.spr) send(ws, { t: 'spr', id: pid, d: p.spr });
          toHost(`[join] #${id} ${me.name} from ${me.ip}`);
          return;
        }

        const me = players.get(id); if (!me) return;
        if (me.spec && !SPEC_OK.has(o.t)) return; // spectators only chat, change team and (host) run the lobby: no gameplay messages are accepted from them
        switch (o.t) {
          case 'mapid': { // host only: the file ID of the imported map
            if (id !== hostId || running) break;
            if (typeof o.h === 'string' && HEX64.test(o.h) && (typeof o.v === 'string' || typeof o.v === 'number') && /^[\w.]{1,12}(\/\d{1,2},\d{1,2},\d{1,2},\d{1,2})?$/.test(String(o.v))) custom = { h: o.h, v: String(o.v), name: txt(o.name, 24) || 'Imported map', ctf: cleanCtf(o.ctf), bomb: cleanBomb(o.bomb) };
            if (cfg.mode === 'ctf' && cfg.map === 'custom' && !custom.ctf) cfg.map = 'ctf';
            resetFlags(); roster();
            break;
          }
          case 'maphash': { // a player's own copy of the file: must match the host's exactly
            if (!custom || !(loading ? loading.wait.has(id) : pendJoin.has(id))) break;
            if (typeof o.h !== 'string' || o.h !== custom.h || String(o.v) !== custom.v) { dropPlayer(id, 'Your map file is not the same as the host\'s. Use the exact same .bsp.'); break; }
            if (loading) { loading.wait.delete(id); finishLoad(); }
            else { pendJoin.delete(id); send(me.ws, { t: 'start', go: isGG() ? ggOrder : undefined, gl: me.gl | 0, seed, cfg, map: cfg.map, pre: 0, fl: cfl, players: list() }); if (cfg.mode === 'ctf') send(me.ws, flagMsg()); if (cfg.mode === 'cash') send(me.ws, { t: 'cash', c: me.cash }); if (cfg.mode === 'infection') { if (INF.ph === 'live') INF.z.add(id); all(infMsg({ players: list() })); } dfJoin(me.ws, me); arJoin(me.ws, me); }
            break;
          }
          case 'skin': { // small validated image only; relayed untouched to the others
            if (now - (me.skinT || 0) < 5000) break;
            const d = typeof o.d === 'string' ? o.d : '';
            if (d && (d.length > SKIN_MAX || !SKRE.test(d))) break;
            me.skinT = now; me.skin = d;
            all({ t: 'skin', id, d }, id);
            break;
          }
          case 'spr': { // custom spray image (100x100 png), validated and relayed untouched
            if (me.bot || now - (me.sprT || 0) < 3000) break;
            const d = typeof o.d === 'string' ? o.d : '';
            if (d && (d.length > SPR_MAX || !SPRE.test(d))) break;
            me.sprT = now; me.spr = d;
            all({ t: 'spr', id, d }, id);
            break;
          }
          case 'spray': { // someone sprayed a wall: only a position is relayed (the image was sent once with 'spr')
            if (!running || me.bot || me.dead || !me.spr || now - (me.sprayT || 0) < 2500) break;
            me.sprayT = now;
            all({ t: 'spray', id, x: num(o.x, -1, 400), y: num(o.y, -1, 400), z: num(o.z, -400, 800), nx: num(o.nx, -1, 1), ny: num(o.ny, -1, 1) }, id);
            break;
          }
          case 'prof': { // profile card numbers and an optional small jpeg background; validated, then relayed
            if (now - (me.profT || 0) < 3000) break;
            const d = typeof o.d === 'string' ? o.d : '';
            if (d && (d.length > BG_MAX || !BGRE.test(d))) break;
            me.profT = now; me.prof = { c: Math.round(num(o.c, 0, 99)), f: Math.round(num(o.f, 0, 99999)), d, tt: Math.round(num(o.tt, 0, 9999)) };
            all({ t: 'prof', id, ...me.prof }, id);
            break;
          }
          case 'chat': { // 100 characters, rate limited; team channel only reaches your own team
            if (now - (me.chatT || 0) < 700) break;
            const text = ctxt(o.text, 100); if (!text) break;
            me.chatT = now;
            const tm = teamy(cfg.mode) && o.team && !me.spec ? 1 : 0; // spectators have no team channel
            const m = { id, name: me.name, text, tm, team: me.team, sp: me.spec ? 1 : 0 };
            if (tm) { for (const p of players.values()) if (!p.spec && p.team === me.team) send(p.ws, { t: 'chat', ...m }); }
            else { chatLog.push(m); if (chatLog.length > 40) chatLog.shift(); all({ t: 'chat', ...m }); }
            break;
          }
          case 'pong':
            if (typeof o.ts === 'number') me.ping = Math.max(0, Math.min(9999, Date.now() - o.ts));
            break;
          case 'cfg':
            if (id !== hostId || running) break;
            const om = MODE_ALIAS[o.mode] || o.mode;
            const modeChanged = MODES.includes(om) && om !== cfg.mode;
            if (modeChanged) setMode(om);
            if (MAPS.includes(o.map) && (cfg.mode !== 'coop' || (o.map !== 'ctf' && o.map !== 'station')) && (cfg.mode !== 'defuse' || o.map !== 'ctf') && (cfg.mode !== 'ctf' || o.map === 'ctf' || o.map === 'coliseum' || (o.map === 'custom' && custom && custom.ctf)) && (o.map !== 'custom' || custom)) cfg.map = o.map;
            // a mode switch sets its own default limit; the limit sent with that message is the old mode's, so ignore it
            if (typeof o.rand === 'boolean') cfg.rand = o.rand;
            if (!modeChanged && Number.isFinite(o.limit) && o.limit >= 1 && o.limit <= 200) cfg.limit = o.limit | 0;
            roster();
            break;
          case 'team':
            if (running) break;
            if (o.team === 2) { // join the Spectators
              if (id === hostId && cfg.mode === 'coop') { send(ws, { t: 'note', text: 'The host cannot spectate in this mode (the host runs the game).' }); break; }
              me.spec = true; roster();
            } else { me.spec = false; if (teamy(cfg.mode)) me.team = o.team ? 1 : 0; roster(); }
            break;
          case 'move': { // host only, lobby only: put a player on a team (0 red, 1 blue) or among the spectators (2)
            if (id !== hostId || running) break;
            const tp = players.get(o.to | 0); if (!tp) break;
            if (o.team === 2) {
              if ((o.to | 0) === hostId && cfg.mode === 'coop') { send(ws, { t: 'note', text: 'The host cannot spectate in this mode (the host runs the game).' }); break; }
              tp.spec = true;
            } else { tp.spec = false; if (teamy(cfg.mode)) tp.team = o.team ? 1 : 0; }
            roster();
            break;
          }
          case 'kick': { // host only: remove a player (they can rejoin)
            if (id !== hostId) break;
            const kid = o.to | 0; if (kid === hostId || !players.has(kid)) break;
            dropPlayer(kid, 'You were kicked by the host.');
            break;
          }
          case 'cmd':
            if (id === hostId && typeof o.line === 'string') toHost(runCmd(o.line.slice(0, 300)));
            break;
          case 'start':
            if (id !== hostId || running) break;
            if (cfg.mode === 'defuse' && cfg.map === 'custom' && !(custom && custom.bomb)) { send(ws, { t: 'note', text: 'That map has no bomb sites. Pick a de_ map like de_dust2, or a generated map.' }); break; }
            startMatch();
            break;
          case 'stop':
            if (id === hostId) { running = false; BR.ph = 'off'; loading = null; clearTimeout(loadTimer); pendJoin.clear(); all({ t: 'lobby', host: hostId, players: list(), cfg }); }
            break;
          case 's':   // position/state: rebuilt from validated fields only
            if (running && !(cfg.mode === 'royale' && BR.ph !== 'live')) {
              me.x = num(o.x, -1, 400); me.y = num(o.y, -1, 400); me.z = num(o.z, -400, 800); if (cfg.mode === 'oitc' || cfg.mode === 'royale') me.dead = (o.d || (me.lv != null && me.lv <= 0)) ? 1 : 0; else if (cfg.mode !== 'defuse' && cfg.mode !== 'arms') me.dead = o.d ? 1 : 0; if (typeof o.k === 'string' && STAT_W.includes(o.k)) me.wk = o.k;
              all({ t: 's', id, l: 0, cr: o.cr ? 1 : 0, zm: Math.round(num(o.zm, 0, 1) * 20) / 20, cs: Math.round(num(o.cs, 0, 9)), z: num(o.z, -400, 800), fz: cfg.mode === 'royale' ? Math.round(num(o.fz, -5, 30) * 100) / 100 : 0, x: me.x, y: me.y, a: num(o.a, -1e4, 1e4), pt: Math.round(num(o.pt, -1, 1) * 100) / 100, hp: num(o.hp, 0, 9999), k: txt(o.k, 24), hh: (n => (n >= 1 && n <= 9) || (n >= 16 && n <= 60) ? n : 0)(Math.round(num(o.hh, 0, 60))), hc: (n => (n >= 10 && n <= 15) || n === 42 ? n : 0)(Math.round(num(o.hc, 0, 60))), ht: (n => n >= 1 && n <= 200 ? n : 0)(Math.round(num(o.ht, 0, 200))), rl: Math.round(num(o.rl, 0, 1) * 50) / 50, d: me.dead }, id);
              ctfTick(id, me); dfPos(id, me);
            }
            break;
          case 'brp': { // battle royale: a player's chosen spawn point. Only the server ever sees it; it goes back to that player alone when the match goes live
            if (!running || cfg.mode !== 'royale' || BR.ph !== 'pick' || me.spec || me.bot) break;
            BR.pick.set(id, { x: num(o.x, 1, 255), y: num(o.y, 1, 255) }); me.brOk = o.ok ? 1 : 0;
            break;
          }
          case 'brc': { // battle royale: someone opens a chest; the first message wins, then everyone hears who got it (the loot is worked out from the chest's number)
            if (!running || cfg.mode !== 'royale' || BR.ph !== 'live' || me.dead || me.spec) break;
            const ci = Math.round(num(o.i, -1, BR_CHESTS));
            if (ci < 0 || BR.opened.has(ci) || BR.opened.size > BR_CHESTS) break;
            BR.opened.add(ci); all({ t: 'brc', i: ci, by: id });
            break;
          }
          case 'ahs': { // air hockey: the host's game sends the table; rebuilt from clamped numbers, then relayed
            if (!running || cfg.mode !== 'airhockey' || id !== ahSimId()) break;
            const a2 = (v, w, h) => (Array.isArray(v) ? [num(v[0], -50, w), num(v[1], -50, h)] : [0, 0]);
            const uu = Array.isArray(o.u) ? [num(o.u[0], -50, 500), num(o.u[1], -50, 700), num(o.u[2], -2000, 2000), num(o.u[3], -2000, 2000)] : [180, 280, 0, 0];
            const sc = Array.isArray(o.s) ? [num(o.s[0], 0, 200) | 0, num(o.s[1], 0, 200) | 0] : [0, 0];
            const ev = (Array.isArray(o.e) ? o.e : []).slice(0, 8).map(v => num(v, 0, 9) | 0);
            const other = [...players.entries()].find(([pid, q]) => pid !== id && !q.spec);
            const hp = players.get(id); if (hp) hp.k = sc[0]; if (other) other[1].k = sc[1];
            all({ t: 'ahs', u: uu, p: a2(o.p, 400, 700), m: a2(o.m, 400, 700), s: sc, h: num(o.h, 0, 5), o: sc[0] >= cfg.limit || sc[1] >= cfg.limit ? 1 : 0, e: ev }, id);
            if ((sc[0] >= cfg.limit || sc[1] >= cfg.limit) && hp && !hp.ahEnd) { hp.ahEnd = 1; setTimeout(() => { if (running && cfg.mode === 'airhockey') endMatch(); }, 1800); }
            break;
          }
          case 'ahp': { // air hockey: the other player's paddle goes to the host only
            if (!running || cfg.mode !== 'airhockey' || me.spec || id === ahSimId()) break;
            const hp2 = players.get(ahSimId()); if (hp2) send(hp2.ws, { t: 'ahp', x: num(o.x, 0, 400), y: num(o.y, 0, 700) });
            break;
          }
          case 'emote':
            if (running && !me.dead && now - (me.emT || 0) > 400) { me.emT = now; all({ t: 'emote', id, i: Math.round(num(o.i, 0, 5)) }, id); }
            break;
          case 'shot':
            if (running) all({ t: 'shot', id, l: 0, z: num(o.z, -400, 800), pt: num(o.pt, -2, 2), x: num(o.x, -1, 400), y: num(o.y, -1, 400), a: num(o.a, -1e4, 1e4),
              n: Math.round(num(o.n, 0, 12)), sp: num(o.sp, 0, 2) }, id);
            break;
          case 'mk': { // a player dropped a medkit (team modes and co-op only)
            if (!running || !(teamy(cfg.mode) || cfg.mode === 'coop') || me.dead || now - (me.mkT || 0) < 5000) break;
            me.mkT = now;
            for (const [k, m] of medkits) if (now - m.t > 70000) medkits.delete(k);
            while (medkits.size >= 16) medkits.delete(medkits.keys().next().value);
            const m = { id: mkId++, o: id, x: num(o.x, 0, 400), y: num(o.y, 0, 400), z: num(o.z, -400, 800), t: now, team: me.team };
            medkits.set(m.id, m);
            all({ t: 'mk', id: m.id, o: id, x: m.x, y: m.y, z: m.z });
            break;
          }
          case 'mkp': { // a player walked over a medkit: one person gets it, everyone sees it vanish
            const m = medkits.get(o.id | 0);
            if (!running || !m || me.dead) break;
            if (cfg.mode !== 'coop' && me.team !== m.team) break;
            if (Math.hypot((me.x || 0) - m.x, (me.y || 0) - m.y) > (cfg.map === 'custom' ? 16 : 4)) break;
            medkits.delete(m.id);
            all({ t: 'mkx', id: m.id, by: id });
            if (m.o !== id && cfg.mode !== 'coop') pgAdd(players.get(m.o), m.o, 'h', MEDKIT_HEAL, now); // a teammate's medkit healed someone else
            break;
          }
          case 'tur': // a player placed a sentry turret: tell everyone else so they can see it (damage is still reported through 'hit')
            if (running && now - (me.turT || 0) > 1500) {
              me.turT = now;
              all({ t: 'tur', id, x: num(o.x, 0, 400), y: num(o.y, 0, 400), life: num(o.life, 1, 60), n: Math.round(num(o.n, 1, 9)), sup: o.sup ? 1 : 0 }, id);
            }
            break;
          case 'dp': // a player placed a shield dispenser (clients simulate it; damage and pickups are relayed below)
            if (running && !me.dead && now - (me.dpT || 0) > 1500) {
              me.dpT = now;
              all({ t: 'dp', id, x: num(o.x, 0, 400), y: num(o.y, 0, 400), z: o.z === undefined ? undefined : num(o.z, -400, 800) }, id);
            }
            break;
          case 'dph': // someone shot a dispenser (o = its owner)
            if (running && !me.dead) all({ t: 'dph', o: o.o | 0, a: num(o.a, 0, 300), by: id }, id);
            break;
          case 'tuh': // someone shot a player's sentry turret (o = its owner)
            if (running && !me.dead) all({ t: 'tuh', o: o.o | 0, a: num(o.a, 0, 300), by: id }, id);
            break;
          case 'tux': // a sentry turret was destroyed
            if (running) all({ t: 'tux', o: o.o | 0, by: id }, id);
            break;
          case 'dpx': // a dispenser was broken
            if (running) all({ t: 'dpx', o: o.o | 0, by: id }, id);
            break;
          case 'dpu': // a dispenser gave out its shield: everyone restarts its 6s timer
            if (running && now - (me.dpuT || 0) > 200) { me.dpuT = now; all({ t: 'dpu', o: o.o | 0 }, id); }
            break;
          case 'gr': // a player threw a frag grenade: everyone else draws it (the thrower's game works out who it hurts)
            if (running && now - (me.grT || 0) > 800) {
              me.grT = now;
              all({ t: 'gr', id, x: num(o.x, 0, 400), y: num(o.y, 0, 400), z: num(o.z, -400, 800), vx: num(o.vx, -80, 80), vy: num(o.vy, -80, 80), vz: num(o.vz, -80, 80), f: num(o.f, 0.05, 3.5) }, id);
            }
            break;
          case 'sm': // a player threw a smoke bomb: everyone else draws the cloud
            if (running && now - (me.smT || 0) > 1000) {
              me.smT = now;
              all({ t: 'sm', id, x: num(o.x, 0, 400), y: num(o.y, 0, 400), l: num(o.l, 1, 30) }, id);
            }
            break;
          case 'wl': // a player deployed a barrier projector: tell everyone else (each client blocks the owner's enemies' shots)
            if (running && now - (me.wlT || 0) > 1000) {
              me.wlT = now;
              all({ t: 'wl', id, x: num(o.x, 0, 400), y: num(o.y, 0, 400), a: num(o.a, -20, 20), mhp: Math.round(num(o.mhp, 1, 60)), z: o.z === undefined ? undefined : num(o.z, -1e4, 1e4) }, id);
            }
            break;
          case 'wh': // a barrier took a hit (shot by an enemy, or by a co-op monster on the host)
            if (running && players.has(o.o)) {
              if (now - (me.whT || 0) > 1000) { me.whT = now; me.whN = 0; }
              if (++me.whN <= 80) all({ t: 'wh', o: o.o | 0 }, id);
            }
            break;
          case 'bsites': // generated maps: the host's game works the bomb sites out from the map and reports them
            if (id === hostId && running && cfg.mode === 'defuse' && DF.ph === 'wait' && Array.isArray(o.s)) {
              const sites = [];
              for (const q of o.s.slice(0, 4)) if (q && okn(q.x, 0, 400) && okn(q.y, 0, 400) && okn(q.r, .5, 8)) sites.push({ x: q.x, y: q.y, r: q.r });
              if (sites.length >= 2) DF.sites = sites;
            }
            break;
          case 'bz': { // holding the use key: plant (attacker with the bomb, inside a site) or defuse (defender beside the planted bomb)
            if (!running || cfg.mode !== 'defuse' || DF.ph !== 'live' || me.dead || me.x == null) break;
            if (!o.on) { if (DF.act && DF.act.id === id) DF.act = null; break; }
            if (DF.act || now - (me.bzT || 0) < 200) break;
            me.bzT = now;
            const b = DF.bomb;
            if (me.team === DF.atk) {
              const si = siteAt(me);
              if (b.s === 0 && b.c === id && si >= 0) { DF.act = { id, kind: 'plant', site: si, t: now, x: me.x, y: me.y, need: DF_PLANT }; note(me.name + ' is planting the bomb...'); }
            } else if (b.s === 3 && Math.hypot(me.x - b.x, me.y - b.y) < 1.6 && Math.abs((me.z || 0) - b.z) < 1.5) {
              DF.act = { id, kind: 'defuse', t: now, x: me.x, y: me.y, need: DF_DEFUSE }; note(me.name + ' is defusing the bomb...');
            }
            break;
          }
          case 'ts': // a turret fired (visual only)
            if (running && now - (me.tsT || 0) > 40) {
              me.tsT = now;
              all({ t: 'ts', id, x: num(o.x, 0, 400), y: num(o.y, 0, 400), tx: num(o.tx, 0, 400), ty: num(o.ty, 0, 400) }, id);
            }
            break;
          case 'hit': {
            const to = players.get(o.to);
            if (!running || !to || o.to === id || now - me.deadAt < RESPAWN_MS || cfg.mode === 'coop') break;
            if (teamy(cfg.mode) && to.team === me.team) break; // no friendly fire
            if (cfg.mode === 'defuse' && (DF.ph !== 'live' || me.dead)) break; // no damage in the freeze time or between rounds
            if (cfg.mode === 'arms' && (AR.ph !== 'live' || me.dead || to.dead)) break; // no damage between rounds or from/to the dead
            if (cfg.mode === 'royale' && (BR.ph !== 'live' || me.dead || to.dead)) break; // no fighting while spawns are picked, none from or to the eliminated
            if (cfg.mode === 'oitc' && ((me.lv != null && me.lv <= 0) || (to.lv != null && to.lv <= 0))) break; // eliminated players neither hit nor get hit
            if (cfg.mode === 'oitc' && o.m) { // quick melee: 2 second cooldown, and the target has to be right next to you
              if (now - (me.omT || 0) < 1900) break;
              if (cfg.map !== 'custom' && me.x != null && to.x != null && Math.hypot(me.x - to.x, me.y - to.y) > 3.2) break;
              me.omT = now;
            }
            hitTok = Math.min(HIT_RATE, hitTok + (now - (me.hitT || now)) / 1000 * HIT_RATE); me.hitT = now;
            if (--hitTok < 0) { if (++strikes > 20) ws.terminate(); break; }
            if (cfg.mode === 'infection') {
              if (INF.ph !== 'live' || me.dead || to.dead) break;
              const az = INF.z.has(id), tz = INF.z.has(o.to);
              if (az === tz) break; // humans can't hurt humans, zombies can't hurt zombies
              if (az) { // a zombie touched a human: they turn, no damage; has to be right on them
                if (!o.m) break;
                if (cfg.map !== 'custom' && me.x != null && to.x != null && Math.hypot(me.x - to.x, me.y - to.y) > 3.5) break;
                const nh = (INF.h.get(o.to) || 0) + 1;
                if (nh >= INF_HITS) { INF.h.delete(o.to); infInfect(o.to, id); }
                else { INF.h.set(o.to, nh); send(to.ws, { t: 'hit', from: id, d: 0, m: 1, z: 0 }); }
                break;
              }
            }
            to.lastHit = { by: id, t: now, w: me.wk }; to.hitBy[id] = now; // everyone who hurt them lately, for assists
            const zn = Math.round(num(o.z, 0, 3)); // hit zone the shooter saw: 3 head, 1 leg (0/2 plain), so kill replays can show the same marker
            send(to.ws, { t: 'hit', from: id, d: cfg.mode === 'oitc' ? 500 : num(o.d, 0, 500), m: o.m ? 1 : 0, z: zn });
            all({ t: 'hm', from: id, to: o.to, z: zn }, id);
            pgAdd(me, id, 'd', num(o.d, 0, 500), now);
            break;
          }
          // ---- Co-op: the host runs the monsters; everything here is checked and rebuilt before it is relayed ----
          case 'es': { // monster positions + hostile bullets, host only
            if (id !== hostId || !running || cfg.mode !== 'coop' || !Array.isArray(o.e) || !Array.isArray(o.b)) break;
            const e = o.e.slice(0, 36).filter(r => Array.isArray(r) && r.length >= 7).map(r => [num(r[0], 0, 99999) | 0, +num(r[1], -1, 400).toFixed(2), +num(r[2], -1, 400).toFixed(2), +num(r[3], -400, 800).toFixed(2), Math.round(num(r[4], -1, 99999)), +num(r[5], -10, 10).toFixed(2), num(r[6], 0, 1023) | 0]);
            const b = o.b.slice(0, 26).filter(r => Array.isArray(r) && r.length >= 4).map(r => [+num(r[0], -1, 400).toFixed(2), +num(r[1], -1, 400).toFixed(2), +num(r[2], -60, 60).toFixed(1), +num(r[3], -60, 60).toFixed(1), +num(r[4], -400, 800).toFixed(2)]);
            all({ t: 'es', fl: num(o.fl, 0, 9999) | 0, e, b }, id);
            break;
          }
          case 'rk': { // the floor-10 Knight picks up a rock (k 0) or throws it (k 1), host only
            if (id !== hostId || !running || cfg.mode !== 'coop') break;
            if (num(o.k, 0, 1) | 0) all({ t: 'rk', fl: num(o.fl, 0, 9999) | 0, k: 1, x: +num(o.x, -1, 400).toFixed(2), y: +num(o.y, -1, 400).toFixed(2), z: +num(o.z, -50, 50).toFixed(2), vx: +num(o.vx, -60, 60).toFixed(2), vy: +num(o.vy, -60, 60).toFixed(2), vz: +num(o.vz, -60, 60).toFixed(2), d: Math.round(num(o.d, 0, 500)) }, id);
            else all({ t: 'rk', fl: num(o.fl, 0, 9999) | 0, k: 0, i: num(o.i, 0, 99) | 0 }, id);
            break;
          }
          case 'en': { // how to build monsters the others do not have yet (a seed makes the copy identical)
            if (id !== hostId || !running || cfg.mode !== 'coop' || !Array.isArray(o.e)) break;
            const e = o.e.slice(0, 12).filter(r => r && typeof r === 'object').map(r => ({ n: num(r.n, 0, 99999) | 0, x: +num(r.x, -1, 400).toFixed(2), y: +num(r.y, -1, 400).toFixed(2), z: +num(r.z, -400, 800).toFixed(2), sd: num(r.sd, 0, 2e9) | 0, f: num(r.f, 0, 999) | 0, k: num(r.k, 0, 3) | 0, p: num(r.p, -1, 99999) | 0, hp: Math.round(num(r.hp, 0, 99999)), sc: +num(r.sc, .1, 4).toFixed(2) }));
            all({ t: 'en', fl: num(o.fl, 0, 9999) | 0, e }, id);
            break;
          }
          case 'ek': { // a monster died: credit the player the host says, tell everyone else
            if (id !== hostId || !running || cfg.mode !== 'coop') break;
            const by = players.has(o.by) ? o.by : 0;
            if (by) { players.get(by).k++; }
            all({ t: 'ek', fl: num(o.fl, 0, 9999) | 0, n: num(o.n, 0, 99999) | 0, by }, id);
            if (by) roster();
            break;
          }
          case 'po': // the exit portal opened (host only)
            if (id !== hostId || !running || cfg.mode !== 'coop' || o.fl !== cfl) break;
            cOpen = !!o.o; all({ t: 'po', fl: cfl, o: cOpen ? 1 : 0 }, id);
            break;
          case 'ec': { // damage to a monster, from a player to the host who owns it
            if (!running || cfg.mode !== 'coop' || id === hostId || me.dead) break;
            const h = players.get(hostId); if (!h) break;
            hitTok = Math.min(HIT_RATE * 3, hitTok + (now - (me.hitT || now)) / 1000 * HIT_RATE * 3); me.hitT = now;
            if (--hitTok < 0) { if (++strikes > 60) ws.terminate(); break; }
            send(h.ws, { t: 'ec', id, fl: num(o.fl, 0, 9999) | 0, n: num(o.n, 0, 99999) | 0, d: Math.round(num(o.d, 0, 20000)) });
            break;
          }
          case 'ehit': { // a monster hit a player: the host reports it to that player
            if (id !== hostId || !running || cfg.mode !== 'coop') break;
            const to = players.get(o.to); if (!to || to.dead || o.to === id) break;
            hitTok = Math.min(HIT_RATE * 3, hitTok + (now - (me.hitT || now)) / 1000 * HIT_RATE * 3); me.hitT = now;
            if (--hitTok < 0) { if (++strikes > 60) ws.terminate(); break; }
            send(to.ws, { t: 'hit', from: 0, d: num(o.d, 0, 500) });
            break;
          }
          case 'nx': { // someone reached the open portal: the whole group moves to the next floor and the fallen get up
            if (!running || cfg.mode !== 'coop' || !cOpen || o.fl !== cfl || me.dead) break;
            cfl++; cOpen = false;
            for (const p of players.values()) p.dead = 0;
            all({ t: 'floor', fl: cfl, by: id, players: list() });
            break;
          }
          case 'buy': { // Cash Deathmatch: the price is checked against the balance the server keeps
            if (!running || !(cfg.mode === 'cash' || (cfg.mode === 'defuse' && DF.ph === 'freeze')) || now - (me.buyT || 0) < 150) break;
            me.buyT = now;
            const c = Math.round(num(o.c, 0, 100000, -1));
            if (c < 0 || c > me.cash) { send(ws, { t: 'cash', c: me.cash }); break; }
            me.cash -= c; send(ws, { t: 'cash', c: me.cash, b: 1 });
            break;
          }
          case 'dead': {
            if (!running || now - me.deadAt < RESPAWN_MS) break;
            me.deadAt = now; me.d++;
            // Kill credit comes from the server's own record of who damaged this player, never from the message.
            let killer = (me.lastHit && now - me.lastHit.t < CREDIT_MS) ? players.get(me.lastHit.by) : null;
            const hitW = me.lastHit && me.lastHit.w;
            me.lastHit = null;
            if (killer && (killer === me || (teamy(cfg.mode) && killer.team === me.team))) killer = null;
            if (cfg.mode === 'coop') { me.dead = 1; killer = null; }
            if (cfg.mode === 'infection' && INF.ph === 'live' && killer && INF.z.has(killer === me ? -1 : [...players.entries()].find(([, p]) => p === killer)[0]) && !INF.z.has(id)) killer = null; // a zombie getting a human is an infection, not a kill
            else if (killer) for (const hid in me.hitBy) { const ap = players.get(+hid); if (ap && ap !== killer && ap !== me && now - me.hitBy[hid] < CREDIT_MS && !(teamy(cfg.mode) && ap.team === me.team)) ap.as++; } // assist: hurt them recently but did not get the kill
            me.hitBy = {};
            if (statOn()) { if (me.wk) { ST[me.wk].d++; stDirty = true; } const kw = STAT_W.includes(hitW) ? hitW : killer && killer.wk; if (killer && kw) ST[kw].k++; }
            if (killer) { killer.k++; if (cfg.mode === 'cash') { killer.cash += CASH_KILL; send(killer.ws, { t: 'cash', c: killer.cash }); } else if (cfg.mode === 'defuse') addCash(killer, DF_KILL_CASH); }
            const kid = killer ? [...players.entries()].find(([, p]) => p === killer)[0] : 0;
            if (killer) pgAdd(killer, kid, 'k', 1, now);
            if (isGG() && killer) { killer.gl = (killer.gl | 0) + 1; if (killer.gl < ggOrder.length) send(killer.ws, { t: 'gg', l: killer.gl }); }
            if (cfg.mode === 'oitc') { me.lv = Math.max(0, (me.lv == null ? 3 : me.lv) - 1); if (me.lv <= 0) me.dead = 1; send(me.ws, { t: 'lv', l: me.lv }); }
            if (cfg.mode === 'royale') { me.lv = 0; me.dead = 1; send(me.ws, { t: 'lv', l: 0 }); }
            all({ t: 'feed', k: kid, v: id, players: list() });
            if (cfg.mode === 'ctf') { me.dead = 1; dropCarried(id, me.x, me.y, me.z); }
            if (cfg.mode === 'defuse') { me.dead = 1; dfDrop(id, me); if (DF.act && DF.act.id === id) DF.act = null; dfCheck(); }
            if (cfg.mode === 'infection' && INF.ph === 'live' && !INF.z.has(id)) infInfect(id, 0);
            if (cfg.mode === 'coop') coopWipeCheck();
            else if (cfg.mode === 'oitc') oiCheck();
            else if (cfg.mode === 'royale') brCheck();
            else if (isGG()) { if (killer && killer.gl >= ggOrder.length) { ggWin = kid; endMatch(); } else if (cfg.mode === 'arms') { me.dead = 1; arCheck(); } }
            else if (killer && cfg.mode !== 'ctf' && cfg.mode !== 'defuse' && cfg.mode !== 'infection' && cfg.mode !== 'royale') {
              const score = teamy(cfg.mode) ? teamTotals()[killer.team] : killer.k;
              if (score >= cfg.limit) endMatch();
            }
            break;
          }
        }
      });

      ws.on('close', () => {
        clearTimeout(joinTimer); pending.delete(ws);
        if (!joined) return;
        const p = players.get(id);
        if (p && cfg.mode === 'ctf') dropCarried(id, p.x, p.y, p.z);
        if (p && cfg.mode === 'defuse') { dfDrop(id, p); if (DF.act && DF.act.id === id) DF.act = null; }
        players.delete(id); INF.z.delete(id); pendJoin.delete(id); if (loading) { loading.wait.delete(id); if (id !== hostId) finishLoad(); }
        if (id === hostId) {
          loading = null; clearTimeout(loadTimer);
          // The host's own window is the only thing that can run the console; if it goes, the session ends.
          hostId = 0;
          for (const [pid] of players) dropPlayer(pid, 'The host left the game.');
          running = false;
          return;
        }
        if (p) toHost(`[leave] #${id} ${p.name}`);
        if (p && !p.bot) { const lm = { id, name: p.name, text: 'left the game', sys: 1, tm: 0, team: p.team, sp: 0 }; chatLog.push(lm); if (chatLog.length > 40) chatLog.shift(); all({ t: 'chat', ...lm }); }
        if (running && cfg.mode === 'coop' && players.size) coopWipeCheck();
        if (running && cfg.mode === 'defuse') dfCheck();
        if (running && cfg.mode === 'arms') arCheck();
        if (running && cfg.mode === 'oitc') oiCheck();
        if (running && cfg.mode === 'royale') brCheck();
        if (running && cfg.mode === 'airhockey' && !p.spec) { const rest = [...players.values()].find(q => !q.spec); if (rest) rest.k = Math.max(rest.k | 0, cfg.limit); endMatch(); }
        if (!players.size) running = false;
        roster();
      });
    });
  });
}

module.exports = { startServer };
