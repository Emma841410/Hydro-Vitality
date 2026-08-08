// Tiny static file server for Hydro-Vitality.
// Built-in Node modules only, so there is nothing to install and nothing to break.

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf'
};

function send(res, status, body, headers) {
  res.writeHead(status, headers || { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(body);
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 500, 'Server error');
    const type = TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    send(res, 200, data, { 'Content-Type': type, 'Cache-Control': 'public, max-age=300' });
  });
}

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch (e) {
    return send(res, 400, 'Bad request');
  }

  if (pathname === '/') pathname = '/index.html';

  // Resolve inside ROOT, and refuse anything that tries to climb out of the folder.
  const resolved = path.resolve(ROOT, '.' + pathname);
  if (resolved !== ROOT && !resolved.startsWith(ROOT + path.sep)) {
    return send(res, 403, 'Forbidden');
  }

  // Internal working documents are never served, even if one ends up in the folder.
  const ext = path.extname(resolved).toLowerCase();
  const base = path.basename(resolved).toLowerCase();
  if (ext === '.md' || base === 'server.js' || base === 'package.json' || base.startsWith('.')) {
    return send(res, 404, 'Not found');
  }

  fs.stat(resolved, (err, stat) => {
    if (!err && stat.isFile()) return serveFile(res, resolved);

    // A missing asset must 404 honestly. Handing back the homepage instead would leave
    // the browser holding space for an image that is never going to arrive.
    if (ext) return send(res, 404, 'Not found');

    // Only extension-less paths fall back to the funnel, so a mistyped link still lands somewhere.
    const fallback = path.join(ROOT, 'index.html');
    fs.stat(fallback, (e2, s2) => {
      if (!e2 && s2.isFile()) return serveFile(res, fallback);
      send(res, 404, 'Not found');
    });
  });
});

// 0.0.0.0 matters: bound to localhost, Railway cannot reach this and the site never comes up.
server.listen(PORT, '0.0.0.0', () => {
  console.log('Hydro-Vitality listening on port ' + PORT);
});
