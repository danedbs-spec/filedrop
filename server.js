/**
 * FileDrop — Minimal Signaling Server
 * Fungsi: relay offer/answer/ICE antar dua peer via room code
 * Tidak menyimpan file apapun — hanya teks sinyal kecil
 */

const http  = require('http');
const fs    = require('fs');
const path  = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;

// ── HTTP server: sajikan index.html ──────────────────────
const server = http.createServer((req, res) => {
  const filePath = path.join(__dirname, 'public', 'index.html');
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(data);
  });
});

// ── WebSocket signaling ──────────────────────────────────
const wss = new WebSocketServer({ server });

// rooms: { code: { sender: ws, receiver: ws } }
const rooms = new Map();

// Cleanup room setelah 30 menit (tidak ada aktifitas)
const ROOM_TTL = 30 * 60 * 1000;

function cleanRoom(code) {
  const room = rooms.get(code);
  if (!room) return;
  ['sender','receiver'].forEach(role => {
    try { if (room[role]) room[role].close(); } catch(_) {}
  });
  rooms.delete(code);
  console.log(`Room ${code} cleaned up. Active rooms: ${rooms.size}`);
}

wss.on('connection', (ws) => {
  let myCode = null;
  let myRole = null;
  let cleanTimer = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    const { type, code, role, data } = msg;

    // ── JOIN room ──
    if (type === 'join') {
      myCode = code;
      myRole = role; // 'sender' | 'receiver'

      if (!rooms.has(code)) rooms.set(code, {});
      const room = rooms.get(code);
      room[role] = ws;

      console.log(`[${code}] ${role} joined. Room: ${JSON.stringify(Object.keys(room))}`);

      // Beri tahu pengirim bahwa penerima sudah join
      if (role === 'receiver' && room.sender) {
        safeSend(room.sender, { type: 'peer-joined' });
      }
      // Beri tahu penerima bahwa pengirim sudah ada (jika join duluan)
      if (role === 'sender' && room.receiver) {
        safeSend(room.receiver, { type: 'peer-joined' });
      }

      ws.send(JSON.stringify({ type: 'joined', code }));

      // Auto-cleanup timer
      if (cleanTimer) clearTimeout(cleanTimer);
      cleanTimer = setTimeout(() => cleanRoom(code), ROOM_TTL);
      return;
    }

    // ── RELAY: offer / answer / ice ──
    if (['offer','answer','ice'].includes(type)) {
      if (!myCode || !rooms.has(myCode)) return;
      const room = rooms.get(myCode);
      const target = myRole === 'sender' ? room.receiver : room.sender;
      if (target) safeSend(target, { type, data });
      return;
    }

    // ── DONE: transfer selesai, bersihkan room ──
    if (type === 'done') {
      setTimeout(() => cleanRoom(myCode), 5000);
      return;
    }
  });

  ws.on('close', () => {
    if (!myCode || !rooms.has(myCode)) return;
    const room = rooms.get(myCode);
    // Beritahu peer lain jika ada
    const other = myRole === 'sender' ? room.receiver : room.sender;
    if (other) safeSend(other, { type: 'peer-left' });
    delete room[myRole];
    if (!room.sender && !room.receiver) {
      rooms.delete(myCode);
      console.log(`Room ${myCode} removed. Active rooms: ${rooms.size}`);
    }
  });

  ws.on('error', () => {});
});

function safeSend(ws, obj) {
  try {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
  } catch(_) {}
}

server.listen(PORT, () => {
  console.log(`FileDrop server running on port ${PORT}`);
  console.log(`Open: http://localhost:${PORT}`);
});
