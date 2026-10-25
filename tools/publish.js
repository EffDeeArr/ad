#!/usr/bin/env node
// One-click publisher: pushes the game's files to GitHub and makes a release (with the update files attached).
// Run it with PUBLISH.bat (Windows) or PUBLISH.sh. First run asks for a GitHub token once.
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process'), zlib = require('zlib'), readline = require('readline');
const root = path.resolve(__dirname, '..');
const REPO = 'EffDeeArr/ad';
const API = process.env.ARBERIA_GH_API || 'https://api.github.com';
const REMOTE = process.env.ARBERIA_GIT_REMOTE || 'https://github.com/' + REPO + '.git';
const TOKEN_FILE = path.join(require('os').homedir(), '.arberia-publish-token');   // in your user folder, so a freshly downloaded game folder still finds it
const OLD_TOKEN_FILE = path.join(root, '.publish-token');
const norm = v => /^0\.\d+\.0$/.test(v) ? v.slice(0, -2) : v;
const ask = q => new Promise(r => { const rl = readline.createInterface({ input: process.stdin, output: process.stdout }); rl.question(q, a => { rl.close(); r(a.trim()); }); });
const say = s => console.log(s);
function die(s) { console.error('\nSTOPPED: ' + s); process.exit(1); }

async function gh(method, url, token, body, raw) {
  const r = await fetch(url.startsWith('http') ? url : API + url, { method, headers: Object.assign({ 'User-Agent': 'ArberiaPublisher', Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + token }, raw ? { 'Content-Type': 'application/octet-stream' } : body ? { 'Content-Type': 'application/json' } : {}), body: raw ? raw : body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {}
  return { status: r.status, json: j, text: t };
}
function git(args, token, opts) {
  const pre = ['-c', 'user.name=EffDeeArr', '-c', 'user.email=EffDeeArr@users.noreply.github.com'];
  if (token && /^https:/.test(REMOTE)) pre.push('-c', 'http.extraheader=Authorization: basic ' + Buffer.from('x-access-token:' + token).toString('base64'));
  const r = cp.spawnSync('git', pre.concat(args), Object.assign({ cwd: root, encoding: 'utf8' }, opts || {}));
  if (r.error) die('Git is not installed (or not in PATH). Install it from https://git-scm.com/downloads and run this again.');
  return r;
}
// ---- zip (deflate) ----
function crc32(b) { let c, t = crc32.t; if (!t) { t = crc32.t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } } c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = t[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function zipOf(ents) {
  const parts = [], cen = []; let off = 0;
  for (const [n, d] of ents) {
    const nb = Buffer.from(n), z = zlib.deflateRawSync(d), c = crc32(d);
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x800, 6); lh.writeUInt16LE(8, 8); lh.writeUInt32LE(c, 14); lh.writeUInt32LE(z.length, 18); lh.writeUInt32LE(d.length, 22); lh.writeUInt16LE(nb.length, 26);
    parts.push(lh, nb, z);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x800, 8); ch.writeUInt16LE(8, 10); ch.writeUInt32LE(c, 16); ch.writeUInt32LE(z.length, 20); ch.writeUInt32LE(d.length, 24); ch.writeUInt16LE(nb.length, 28); ch.writeUInt32LE(off, 42);
    cen.push(ch, nb); off += 30 + nb.length + z.length;
  }
  const cd = Buffer.concat(cen), eo = Buffer.alloc(22); eo.writeUInt32LE(0x06054b50, 0); eo.writeUInt16LE(ents.length, 8); eo.writeUInt16LE(ents.length, 10); eo.writeUInt32LE(cd.length, 12); eo.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cd, eo]);
}
const SKIP = /^(node_modules|dist|\.node|\.git|tools\/history)(\/|$)|\.zip$|^patch-.*\.exe$|^Patch-to-.*\.exe$|^Updater\.exe$|^\.publish-token$/;
function walk(rel, out) { for (const e of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) { const q = rel ? rel + '/' + e.name : e.name; if (SKIP.test(q)) continue; e.isDirectory() ? walk(q, out) : out.push(q); } return out; }

(async () => {
  say('Arberia Deathmatch publisher\n');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')), ver = norm(pkg.version), tag = 'v' + ver;
  say('Version in package.json: ' + ver + '  ->  release ' + tag);

  // 1. token
  let token = process.env.GITHUB_TOKEN || ''; try { if (!token) token = fs.readFileSync(TOKEN_FILE, 'utf8').trim(); } catch (e) {}
  try { if (!token) token = fs.readFileSync(OLD_TOKEN_FILE, 'utf8').trim(); } catch (e) {}
  if (!token) {
    say('\nFirst time: this needs a GitHub access token (a password just for this tool).\n  1. Open https://github.com/settings/personal-access-tokens/new (log in as EffDeeArr)\n  2. Name: Arberia publisher. Expiration: 1 year. Repository access: "Only select repositories" -> ad\n  3. Under Repository permissions set  Contents: Read and write  (nothing else needed)\n  4. Click Generate token and copy it (it starts with github_pat_)\n');
    token = await ask('Paste the token here and press Enter: ');
  }
  const me = await gh('GET', '/user', token).catch(e => ({ status: 0, text: String(e) }));
  if (me.status !== 200) die('GitHub did not accept the token (' + me.status + '). Check that you copied all of it, then delete the file .arberia-publish-token in your user folder and run this again.');
  fs.writeFileSync(TOKEN_FILE, token + '\n'); say('Logged in to GitHub as ' + me.json.login + ' (token saved in your user folder as .arberia-publish-token; it is never uploaded).');
  const rp = await gh('GET', '/repos/' + REPO, token);
  if (rp.status !== 200) die('Cannot see the repository ' + REPO + ' (' + rp.status + '). Make sure it exists and the token has access to it.');

  // 2. build the update files
  say('\nBuilding the update files...');
  const mk = cp.spawnSync(process.execPath, [path.join(__dirname, 'make-patch.js')], { cwd: root, stdio: 'inherit', env: Object.assign({}, process.env, { PATCH_SKIP_UPDATER_IF_NO_GO: '1' }) });
  if (mk.status !== 0) die('Building the update files failed (see above).');
  const gf = path.join(root, 'game-files.zip'); if (!fs.existsSync(gf)) die('game-files.zip was not made.');
  const full = path.join(root, 'ArberiaDeathmatch-Desktop-v' + ver + '.zip');
  const top = 'ArberiaDeathmatch-Desktop/';
  fs.writeFileSync(full, zipOf(walk('', []).map(f => [top + f, fs.readFileSync(path.join(root, f))])));
  say('Made ' + path.basename(full));

  // 3. push the files
  say('\nUploading the game files to GitHub...');
  if (!fs.existsSync(path.join(root, '.git'))) { git(['init', '-b', 'main']); }
  const rem = git(['remote', 'get-url', 'origin']); if (rem.status !== 0) git(['remote', 'add', 'origin', REMOTE]); else if (rem.stdout.trim() !== REMOTE) git(['remote', 'set-url', 'origin', REMOTE]);
  const br = git(['branch', '--show-current']).stdout.trim() || 'main'; if (br !== 'main') git(['checkout', '-B', 'main']);
  git(['add', '-A']);
  const msg = (() => { try { const t = fs.readFileSync(path.join(root, 'README.txt'), 'utf8'), i = t.lastIndexOf('\n' + ver + ' - '); return i >= 0 ? t.slice(i + 1).split('\n')[0] : 'Version ' + ver; } catch (e) { return 'Version ' + ver; } })();
  const st = git(['status', '--porcelain']).stdout.trim();
  if (st) { const c = git(['commit', '-m', 'Version ' + ver + '\n\n' + msg]); if (c.status !== 0) die('git commit failed:\n' + c.stdout + c.stderr); } else say('(no file changes since the last upload)');
  // first upload of a repo that already has files (a README made on github.com): merge them in rather than overwrite
  git(['fetch', 'origin', 'main'], token); const hasRemote = git(['rev-parse', '--verify', 'origin/main']).status === 0;
  if (hasRemote && git(['merge-base', '--is-ancestor', 'origin/main', 'HEAD']).status !== 0) {
    const mg = git(['merge', '--allow-unrelated-histories', '-X', 'ours', '-m', 'Merge GitHub starter files', 'origin/main']); if (mg.status !== 0) die('Could not combine with what is already on GitHub:\n' + mg.stdout + mg.stderr);
  }
  const ps = git(['push', '-u', 'origin', 'main'], token); if (ps.status !== 0) die('Upload failed:\n' + ps.stdout + ps.stderr);
  say('Files uploaded.');

  // 4. release
  say('\nMaking release ' + tag + '...');
  const notes = (() => { try { const t = fs.readFileSync(path.join(root, 'README.txt'), 'utf8'), i = t.lastIndexOf('\n' + ver + ' - '); return i >= 0 ? t.slice(i + 1).split('\n\n')[0].trim() : ''; } catch (e) { return ''; } })();
  let rel = await gh('GET', '/repos/' + REPO + '/releases/tags/' + tag, token);
  if (rel.status === 200) { say('Release ' + tag + ' already exists - replacing its files.'); for (const a of rel.json.assets || []) await gh('DELETE', '/repos/' + REPO + '/releases/assets/' + a.id, token); }
  else { rel = await gh('POST', '/repos/' + REPO + '/releases', token, { tag_name: tag, target_commitish: 'main', name: 'Arberia Deathmatch ' + ver, body: notes, draft: false, prerelease: false }); if (rel.status !== 201) die('Could not create the release (' + rel.status + '): ' + rel.text); }
  const up = String(rel.json.upload_url).replace(/\{.*$/, '');
  const assets = [gf, full]; const upd = path.join(root, 'Updater.exe'); if (fs.existsSync(upd)) assets.push(upd); else say('(Updater.exe not found - not attached; it only needs attaching once)');
  for (const f of assets) {
    const r = await gh('POST', up + '?name=' + encodeURIComponent(path.basename(f)), token, null, fs.readFileSync(f));
    if (r.status !== 201) die('Uploading ' + path.basename(f) + ' failed (' + r.status + '): ' + r.text);
    say('  attached ' + path.basename(f));
  }
  say('\nDone! Release page: https://github.com/' + REPO + '/releases/tag/' + tag + '\nPlayers with 0.46 or newer will be offered the update the next time they start the game.');
})().catch(e => die(String(e && e.stack || e)));
