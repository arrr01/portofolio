/**
 * OPTIONAL BACKEND SERVER & JSON DATABASE (server.js)
 * Menggunakan modul bawaan Node.js (http, fs, path, crypto) tanpa perlu install library tambahan.
 * Menyediakan:
 * 1. Static Web Server untuk menjalankan website secara lokal.
 * 2. Autentikasi Server-Side (POST /api/auth/login) menggunakan crypto.scryptSync.
 * 3. Penyimpanan Permanen ke file data/portfolio-data.json (GET & PUT /api/data).
 *
 * Cara menjalankan:
 *   node server.js
 * Atau dengan mengatur password admin kustom:
 *   $env:ADMIN_PASSWORD="passwordAnda"; node server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'portfolio-data.json');

// Buat hash password di memori server saat startup (tidak pernah diekspos ke client JS)
const SECRET_SALT = crypto.randomBytes(16).toString('hex');
const RAW_ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin2026';
const SERVER_PASS_HASH = crypto.scryptSync(RAW_ADMIN_PASS, SECRET_SALT, 64).toString('hex');

const activeTokens = new Set();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 15 * 1024 * 1024) {
        reject(new Error('Payload terlalu besar'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // --- API: GET /api/data ---
  if (pathname === '/api/data' && req.method === 'GET') {
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(raw);
    } catch (err) {
      sendJson(res, 500, { error: 'Gagal membaca database JSON.' });
    }
    return;
  }

  // --- API: POST /api/auth/login ---
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const candidate = String(body.password || '');
      const candidateHash = crypto.scryptSync(candidate, SECRET_SALT, 64).toString('hex');

      const isMatch = crypto.timingSafeEqual(
        Buffer.from(candidateHash, 'hex'),
        Buffer.from(SERVER_PASS_HASH, 'hex')
      );

      if (!isMatch) {
        sendJson(res, 401, { error: 'Kata sandi pengelola salah.' });
        return;
      }

      const token = crypto.randomBytes(24).toString('hex');
      activeTokens.add(token);
      sendJson(res, 200, { ok: true, token });
    } catch (err) {
      sendJson(res, 400, { error: 'Permintaan tidak valid.' });
    }
    return;
  }

  // --- API: PUT /api/data ---
  if (pathname === '/api/data' && req.method === 'PUT') {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!activeTokens.has(token)) {
      sendJson(res, 401, { error: 'Tidak terautentikasi.' });
      return;
    }

    try {
      const newData = await parseRequestBody(req);
      if (!newData || !newData.profile) {
        sendJson(res, 400, { error: 'Format data tidak valid.' });
        return;
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(newData, null, 2), 'utf8');
      sendJson(res, 200, { ok: true, message: 'Data berhasil disimpan ke data/portfolio-data.json' });
    } catch (err) {
      sendJson(res, 500, { error: 'Gagal menyimpan data ke server.' });
    }
    return;
  }

  // --- STATIC FILE SERVER ---
  let safePath = path.normalize(pathname === '/' ? '/index.html' : pathname).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(__dirname, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 - Halaman atau file tidak ditemukan.');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log('==========================================================');
  console.log(`🚀 Personal Portfolio & Digital CV Server Aktif!`);
  console.log(`🌐 Buka di browser: http://localhost:${PORT}`);
  console.log(`💾 Penyimpanan Database JSON: data/portfolio-data.json`);
  console.log('==========================================================');
});
