'use strict';
// Discord Rich Presence ("Playing Arberia Deathmatch"), talking straight to the Discord desktop app over its local IPC socket.
// No packages needed. If Discord is not running, or no Application ID is set, nothing happens and the game is unaffected.
//
// SETUP (once, by whoever builds the game): create an application at https://discord.com/developers/applications, copy its
// Application ID into APP_ID below (or into settings.json as "discordAppId", or the ARBERIA_DISCORD_APP_ID environment variable),
// set the app's NAME to "Arberia Deathmatch" (that is the "Playing ..." text) and upload build/icon.png under
// Rich Presence > Art Assets with the key  icon  (that is the big picture on the card).
const net = require('net');
const path = require('path');

const APP_ID = '1559897247800369242';
const ASSET = 'icon';
const SECRET_RE = /^[A-Za-z0-9.\-]{1,100}:\d{1,5}$/;   // the only thing a join secret may be: host:port

function create(opts) {
  opts = opts || {};
  const log = opts.log || (() => {});
  const onJoin = opts.onJoin || (() => {});
  const appId = String(opts.appId || APP_ID || '').trim();
  let sock = null, ready = false, joinSecret = '', buf = Buffer.alloc(0), closed = false, retry = null, connecting = false;
  let want = null, wantCat = '', sentJson = '', startTs = 0, lastCat = '', lastSend = 0, flush = null, nonce = 0, pending = false;

  const frame = (op, obj) => { const b = Buffer.from(JSON.stringify(obj), 'utf8'), h = Buffer.alloc(8); h.writeInt32LE(op, 0); h.writeInt32LE(b.length, 4); return Buffer.concat([h, b]); };
  const paths = () => {
    const out = [];
    for (let i = 0; i < 10; i++) {
      if (process.platform === 'win32') { out.push('\\\\?\\pipe\\discord-ipc-' + i); continue; }
      const dirs = [process.env.XDG_RUNTIME_DIR, process.env.TMPDIR, process.env.TMP, process.env.TEMP, '/tmp'].filter(Boolean);
      for (const d of dirs) { out.push(path.join(d, 'discord-ipc-' + i), path.join(d, 'snap.discord', 'discord-ipc-' + i), path.join(d, 'app', 'com.discordapp.Discord', 'discord-ipc-' + i)); }
    }
    return [...new Set(out)];
  };

  function drop() { ready = false; connecting = false; sentJson = ''; if (sock) { try { sock.destroy(); } catch (e) {} sock = null; } buf = Buffer.alloc(0); if (!closed && appId) schedule(15000); }
  function schedule(ms) { if (retry || closed) return; retry = setTimeout(() => { retry = null; connect(); }, ms); }

  function tryPath(list, i) {
    if (closed) return;
    if (i >= list.length) { connecting = false; schedule(15000); return; }
    const s = net.connect(list[i]);
    let ok = false;
    s.once('connect', () => { ok = true; sock = s; buf = Buffer.alloc(0); s.write(frame(0, { v: 1, client_id: appId })); });
    s.on('data', d => {
      buf = Buffer.concat([buf, d]);
      while (buf.length >= 8) {
        const op = buf.readInt32LE(0), len = buf.readInt32LE(4);
        if (len < 0 || len > 1 << 20) return drop();
        if (buf.length < 8 + len) break;
        let m = null; try { m = JSON.parse(buf.slice(8, 8 + len).toString('utf8')); } catch (e) {}
        buf = buf.slice(8 + len);
        if (op === 3) { try { s.write(frame(4, m || {})); } catch (e) {} }          // ping -> pong
        else if (op === 2) return drop();                                           // close
        else if (m && m.evt === 'READY') {
          ready = true; connecting = false; log('connected to Discord');
          for (const evt of ['ACTIVITY_JOIN', 'ACTIVITY_JOIN_REQUEST']) { try { s.write(frame(1, { cmd: 'SUBSCRIBE', evt, args: {}, nonce: 'sub-' + evt })); } catch (e) {} }
          push(true);
        }
        else if (m && m.evt === 'ACTIVITY_JOIN' && m.data) { const sec = String(m.data.secret || ''); if (SECRET_RE.test(sec)) { try { onJoin(sec); } catch (e) {} } }
        else if (m && m.evt === 'ACTIVITY_JOIN_REQUEST' && m.data && m.data.user) {   // someone pressed "Ask to join": invite them if we are in a joinable game, otherwise dismiss
          const uid = String(m.data.user.id || '');
          if (/^\d{1,25}$/.test(uid)) { try { s.write(frame(1, { cmd: joinSecret ? 'SEND_ACTIVITY_JOIN_INVITE' : 'CLOSE_ACTIVITY_JOIN_REQUEST', args: { user_id: uid }, nonce: 'req-' + (++nonce) })); } catch (e) {} }
        }
      }
    });
    s.on('error', () => { if (!ok) tryPath(list, i + 1); });
    s.on('close', () => { if (ok && sock === s) { log('Discord closed the connection'); drop(); } });
  }
  function connect() { if (closed || !appId || sock || connecting) return; connecting = true; tryPath(paths(), 0); }

  function activity() {
    if (!want) { joinSecret = ''; return null; }
    const a = { details: want.details || undefined, state: want.state || undefined, assets: { large_image: ASSET, large_text: 'Arberia Deathmatch' }, timestamps: { start: startTs }, instance: false };
    if (want.join && want.party) { a.party = { id: want.party.id, size: [want.party.n, want.party.max] }; a.secrets = { join: want.join }; }
    joinSecret = want.join || '';
    return a;
  }
  // Discord allows 5 updates per 15 seconds: send at most one every 4 seconds, always the newest.
  function push(force) {
    if (!ready || !sock || closed) return;
    const act = activity(), j = JSON.stringify(act);
    if (!force && j === sentJson) return;
    const wait = lastSend + 4000 - Date.now();
    if (wait > 0) { if (!flush) flush = setTimeout(() => { flush = null; push(false); }, wait); return; }
    lastSend = Date.now(); sentJson = j;
    try { sock.write(frame(1, { cmd: 'SET_ACTIVITY', args: { pid: process.pid, activity: act }, nonce: String(++nonce) })); } catch (e) { drop(); }
  }

  const clean = v => typeof v === 'string' ? Array.from(v.replace(/[\u0000-\u001f\u007f-\u009f]/g, '')).slice(0, 100).join('') : '';
  return {
    enabled: () => !!appId,
    // p: { details, state, cat } or null to clear. cat changes (menu / single / multi) restart the elapsed timer.
    set(p) {
      if (!appId || closed) return;
      if (!p || typeof p !== 'object') want = null;
      else { want = { details: clean(p.details), state: clean(p.state) }; { const sec = typeof p.join === 'string' && SECRET_RE.test(p.join) ? p.join : '', pt = p.party; if (sec && pt && /^[A-Za-z0-9\-]{1,40}$/.test(String(pt.id))) { const mx = Math.max(1, Math.min(64, pt.max | 0)); want.join = sec; want.party = { id: String(pt.id), n: Math.max(1, Math.min(mx, pt.n | 0)), max: mx }; } } const c = clean(p.cat); if (c !== lastCat || !startTs) { lastCat = c; startTs = Math.floor(Date.now() / 1000); } }
      if (!sock && !connecting) connect();
      push(false);
    },
    shutdown() {
      closed = true; clearTimeout(retry); clearTimeout(flush);
      try { if (ready && sock) sock.write(frame(1, { cmd: 'SET_ACTIVITY', args: { pid: process.pid, activity: null }, nonce: 'bye' })); } catch (e) {}
      setTimeout(() => { try { sock && sock.destroy(); } catch (e) {} }, 100);
    }
  };
}
module.exports = { create };
