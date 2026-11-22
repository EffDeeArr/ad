// profile.txt: the player's loot boxes, cosmetics and best floor, stored as plain text next to the game
const fs = require('fs'), path = require('path');
const NAME = 'profile.txt';
const find = dirs => { for (const d of dirs) { const f = path.join(d, NAME); try { if (fs.statSync(f).isFile()) return f; } catch (x) {} } return null; };
function read(dirs) {
  const f = find(dirs);
  if (!f) return { none: true };
  try {
    if (fs.statSync(f).size > 65536) return { error: 'profile.txt is too large.', where: f };
    return { text: fs.readFileSync(f, 'utf8'), where: f };
  } catch (x) { return { error: 'Could not read profile.txt: ' + (x && x.code || x), where: f }; }
}
function write(dirs, text) {
  text = String(text == null ? '' : text).slice(0, 20000);
  const f = find(dirs), cand = f ? [f] : dirs.map(d => path.join(d, NAME));
  for (const c of cand) { try { fs.writeFileSync(c, text); return { ok: true, where: c }; } catch (x) {} }
  return { error: 'Could not write profile.txt', where: f || '' };
}
module.exports = { read, write, find, NAME };
