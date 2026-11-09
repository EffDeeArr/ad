'use strict';
// Steam invites and Steam Networking for Arberia Deathmatch.
//
// Works for a game added to Steam as a "non-Steam game": it has no AppID of its own, so Steam is initialised with the shared
// test AppID 480 ("Spacewar"). Steam then provides lobbies, the friends invite dialog and relayed peer-to-peer packets (no port
// forwarding needed). The game's own network code is not touched: the host's normal WebSocket server stays as it is, and this
// module tunnels each remote player's WebSocket through Steam packets:
//
//   joiner's game --ws--> 127.0.0.1:<local port> --Steam packets--> host --ws--> host's game server
//
// Everything is optional. If the steamworks.js package, the Steam client or the overlay is missing, available() is false and the
// rest of the game behaves exactly as before.
const { WebSocket, WebSocketServer } = require('ws');

const K_WHOLE = 0, K_FIRST = 1, K_MID = 2, K_LAST = 3, K_OPEN = 4, K_CLOSE = 5;
const CHUNK = 300000;           // Steam's reliable packets are limited to 1 MB; stay well below
const MAX_MSG = 3 * 1024 * 1024; // bigger than the game's largest message (map/skin), a safety cap against runaway buffers
const MAX_QUEUE = 64;           // messages held for a peer's socket while it is still connecting
const LOBBY_FRIENDS = 1;

function create(opts) {
  opts = opts || {};
  const log = opts.log || (() => {});
  const load = opts.load || (() => require('steamworks.js'));
  const appId = opts.appId || 480;
  const onJoin = opts.onJoin || (() => {});
  let sw = null, err = '', timer = null, selfName = '', selfId = '0';
  let lobby = null, lobbyIsHost = false;
  let hostPort = 0;
  const peers = new Map();       // host side: steamId64 string -> { ws, queue, asm }
  let tun = null;                // joiner side: { srv, owner, sock, asm, closed }
  let joining = false;

  const idStr = v => { try { return BigInt(v).toString(); } catch (e) { return ''; } };
  const idOf = p => p == null ? '' : (typeof p === 'object' ? idStr(p.steamId64 !== undefined ? p.steamId64 : p.steam_id64) : idStr(p));
  const reliable = () => { try { const t = sw.networking.SendType; if (t && t.Reliable !== undefined) return t.Reliable; } catch (e) {} return 2; };

  function send(to, kind, bin, payload) {
    const body = payload || Buffer.alloc(0);
    const out = Buffer.allocUnsafe(2 + body.length);
    out[0] = kind; out[1] = bin ? 1 : 0; body.copy(out, 2);
    try { return sw.networking.sendP2PPacket(BigInt(to), reliable(), out); } catch (e) { log('send failed: ' + e.message); return false; }
  }
  function sendMsg(to, data, isBinary) {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
    if (buf.length <= CHUNK) return send(to, K_WHOLE, isBinary, buf);
    let off = 0;
    while (off < buf.length) {
      const end = Math.min(buf.length, off + CHUNK);
      send(to, off === 0 ? K_FIRST : end >= buf.length ? K_LAST : K_MID, isBinary, buf.subarray(off, end));
      off = end;
    }
    return true;
  }
  // Collects chunks back into whole messages; returns { data, bin } when one is complete.
  function assemble(st, kind, bin, body) {
    if (kind === K_WHOLE) return { data: Buffer.from(body), bin };
    if (kind === K_FIRST) { st.parts = [Buffer.from(body)]; st.size = body.length; return null; }
    if (!st.parts) return null;
    st.size += body.length;
    if (st.size > MAX_MSG) { st.parts = null; return null; }
    st.parts.push(Buffer.from(body));
    if (kind === K_LAST) { const data = Buffer.concat(st.parts); st.parts = null; return { data, bin }; }
    return null;
  }

  // ---------- host side ----------
  function peerOpen(id) {
    if (!hostPort || peers.has(id)) return;
    if (lobby && lobbyIsHost) {
      let ok = false;
      try { ok = lobby.getMembers().some(m => idOf(m) === id); } catch (e) { ok = true; }
      if (!ok) { log('ignored a Steam user who is not in the lobby: ' + id); return; }
    }
    const st = { ws: null, queue: [], asm: {}, open: false };
    peers.set(id, st);
    let ws;
    try { ws = new WebSocket('ws://127.0.0.1:' + hostPort, { perMessageDeflate: false, maxPayload: MAX_MSG }); } catch (e) { peers.delete(id); send(id, K_CLOSE, 0); return; }
    st.ws = ws;
    ws.on('open', () => { st.open = true; for (const m of st.queue) ws.send(m.data, { binary: m.bin }); st.queue = []; });
    ws.on('message', (data, isBin) => { if (peers.get(id) === st) sendMsg(id, data, isBin); });
    ws.on('close', () => { if (peers.get(id) === st) { peers.delete(id); send(id, K_CLOSE, 0); } });
    ws.on('error', () => {});
  }
  function hostPacket(id, kind, bin, body) {
    if (kind === K_OPEN) return peerOpen(id);
    const st = peers.get(id);
    if (!st) return;
    if (kind === K_CLOSE) { peers.delete(id); try { st.ws.close(); } catch (e) {} return; }
    const m = assemble(st.asm, kind, bin, body);
    if (!m) return;
    if (st.open) { try { st.ws.send(m.bin ? m.data : m.data.toString('utf8'), { binary: !!m.bin }); } catch (e) {} }
    else if (st.queue.length < MAX_QUEUE) st.queue.push({ data: m.bin ? m.data : m.data.toString('utf8'), bin: !!m.bin });
  }

  // ---------- joiner side ----------
  function tunnelPacket(id, kind, bin, body) {
    if (!tun || id !== tun.owner) return;
    if (kind === K_CLOSE) { if (tun.sock) try { tun.sock.close(); } catch (e) {} return; }
    const m = assemble(tun.asm, kind, bin, body);
    if (!m || !tun.sock || tun.sock.readyState !== 1) return;
    try { tun.sock.send(m.bin ? m.data : m.data.toString('utf8'), { binary: !!m.bin }); } catch (e) {}
  }

  function pump() {
    if (!sw) return;
    let n = 0;
    try {
      while (n++ < 400) {
        const size = sw.networking.isP2PPacketAvailable();
        if (!size) break;
        const pk = sw.networking.readP2PPacket(size);
        if (!pk || !pk.data || pk.data.length < 2) continue;
        const id = idOf(pk.steamId), kind = pk.data[0], bin = pk.data[1] === 1, body = pk.data.subarray(2);
        if (tun && id === tun.owner) tunnelPacket(id, kind, bin, body);
        else if (hostPort) hostPacket(id, kind, bin, body);
      }
    } catch (e) { log('pump: ' + e.message); }
  }

  function closeTunnel() {
    if (!tun) return;
    const t = tun; tun = null;
    try { if (t.sock && t.sock.readyState <= 1) { send(t.owner, K_CLOSE, 0); t.sock.close(); } } catch (e) {}
    try { t.srv.close(); } catch (e) {}
  }
  function leaveLobby() { if (lobby) { try { lobby.leave(); } catch (e) {} lobby = null; lobbyIsHost = false; } }

  // ---------- public ----------
  const api = {
    available: () => !!sw,
    status: () => ({ ok: !!sw, name: selfName, id: selfId, error: sw ? '' : err, appId, hosting: !!(lobby && lobbyIsHost), joined: !!tun }),

    init() {
      if (sw) return api.status();
      try {
        const mod = load();
        sw = mod.init(appId);
        try { const lp = sw.localplayer; selfName = String(lp.getName()); selfId = idStr(lp.getSteamId().steamId64); } catch (e) {}
        const c = sw.callback, E = c && c.SteamCallback;
        if (c && E) {
          c.register(E.P2PSessionRequest, v => { try { sw.networking.acceptP2PSession(BigInt(idOf(v.remote !== undefined ? v.remote : v))); } catch (e) {} });
          c.register(E.GameLobbyJoinRequested, v => {
            const lid = v && (v.lobby_steam_id !== undefined ? v.lobby_steam_id : v.lobby);
            if (lid !== undefined) api.joinLobby(lid).then(r => onJoin(r)).catch(e => onJoin({ ok: false, error: String(e && e.message || e) }));
          });
        }
        timer = setInterval(pump, 15);
        if (timer.unref) timer.unref();
        try { if (typeof mod.electronEnableSteamOverlay === 'function' && opts.overlay !== false) mod.electronEnableSteamOverlay(); } catch (e) {}
        log('Steam ready as ' + selfName);
      } catch (e) { sw = null; err = String(e && e.message || e); log('Steam unavailable: ' + err); }
      return api.status();
    },

    // The host's game server is up on this port: open a friends-only lobby so people can be invited, and accept their packets.
    async startHost(port, label) {
      if (!sw) return { ok: false, error: err || 'Steam is not available.' };
      api.stopHost();
      hostPort = port;
      try {
        lobby = await sw.matchmaking.createLobby(LOBBY_FRIENDS, 16);
        lobbyIsHost = true;
        try { lobby.setData('game', 'arberia-deathmatch'); lobby.setData('host', selfName || ''); if (label) lobby.setData('ver', String(label)); } catch (e) {}
        return { ok: true };
      } catch (e) { hostPort = 0; return { ok: false, error: String(e && e.message || e) }; }
    },
    stopHost() {
      hostPort = 0;
      for (const [id, st] of peers) { try { send(id, K_CLOSE, 0); st.ws.close(); } catch (e) {} }
      peers.clear();
      if (lobbyIsHost) leaveLobby();
    },
    invite() {
      if (!sw || !lobby || !lobbyIsHost) return { ok: false, error: 'Host a game first.' };
      try { lobby.openInviteDialog(); return { ok: true }; } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
    },

    // Join a friend's lobby and give back a local port the game can connect its WebSocket to.
    async joinLobby(lobbyId) {
      if (!sw) return { ok: false, error: err || 'Steam is not available.' };
      if (joining) return { ok: false, error: 'Already joining.' };
      joining = true;
      try {
        api.stopHost(); closeTunnel(); leaveLobby();
        lobby = await sw.matchmaking.joinLobby(BigInt(lobbyId));
        lobbyIsHost = false;
        const owner = idOf(lobby.getOwner());
        if (!owner) throw new Error('The lobby has no host.');
        const srv = new WebSocketServer({ host: '127.0.0.1', port: 0, perMessageDeflate: false, maxPayload: MAX_MSG });
        await new Promise((res, rej) => { srv.once('listening', res); srv.once('error', rej); });
        const t = tun = { srv, owner, sock: null, asm: {} };
        srv.on('connection', ws => {
          if (tun !== t || t.sock) { try { ws.close(); } catch (e) {} return; }
          t.sock = ws;
          send(owner, K_OPEN, 0);
          ws.on('message', (data, isBin) => sendMsg(owner, data, isBin));
          ws.on('close', () => { if (tun === t) { send(owner, K_CLOSE, 0); closeTunnel(); leaveLobby(); } });
          ws.on('error', () => {});
        });
        return { ok: true, port: srv.address().port, host: lobby.getData('host') || '' };
      } catch (e) { closeTunnel(); leaveLobby(); return { ok: false, error: String(e && e.message || e) }; }
      finally { joining = false; }
    },
    leave() { closeTunnel(); api.stopHost(); leaveLobby(); },
    shutdown() { api.leave(); if (timer) clearInterval(timer); timer = null; }
  };
  return api;
}

module.exports = { create };
