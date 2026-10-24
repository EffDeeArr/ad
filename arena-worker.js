'use strict';
// Runs the slow, blocking parts of the Arena arcade feature (looking through Steam folders, reading and packing the game) on a separate thread,
// so the game window never freezes while it works. (A frozen window is what makes Windows draw "Not Responding" ghost windows in Alt-Tab.)
const { parentPort } = require('worker_threads');
const A = require('./arena');
parentPort.on('message', m => {
  try {
    if (m.cmd === 'find') parentPort.postMessage({ id: m.id, r: A.find(!!m.force) });
    else if (m.cmd === 'bundle') {
      const b = A.buildBundle(m.info), ab = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
      parentPort.postMessage({ id: m.id, r: ab }, [ab]);
    }
  } catch (e) { parentPort.postMessage({ id: m.id, err: String(e && e.message || e) }); }
});
