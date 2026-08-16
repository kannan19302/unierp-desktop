import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, 'public');

const PORT = parseInt(process.env.PORT || '4010', 10);
const HOST = process.env.HOST || '0.0.0.0';

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // Health check endpoint
  if (pathname === '/health' || pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', platform: 'P10 Desktop App', port: PORT }));
  }

  // Standalone login route
  if (pathname === '/login') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(`
      <!DOCTYPE html>
      <html>
      <head><title>Desktop App (P10) — Login</title><style>body{font-family:sans-serif;background:#0b0f19;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}.box{background:#111827;padding:2rem;border-radius:12px;border:1px solid #334155;width:320px;text-align:center;}input{width:100%;padding:10px;margin:8px 0;border-radius:6px;border:1px solid #475569;background:#1e293b;color:#fff;box-sizing:border-box;}button{width:100%;padding:10px;background:#38bdf8;border:none;border-radius:6px;font-weight:bold;cursor:pointer;margin-top:10px;}</style></head>
      <body>
        <div class="box">
          <h2>Desktop Client Login</h2>
          <p style="font-size:0.8rem;color:#94a3b8;margin-bottom:1rem;">Sign in with your UniERP Account</p>
          <input type="email" placeholder="Work Email" value="sarah.chen@acme-corp.com" />
          <input type="password" placeholder="Password" value="••••••••" />
          <button onclick="window.location.href='/'">Sign In</button>
        </div>
      </body>
      </html>
    `);
  }

  // Serve static files
  let filePath = path.join(PUBLIC_DIR, pathname === '/' || pathname === '/sso' ? 'index.html' : pathname);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }

  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(content);
  } catch (err) {
    res.writeHead(500);
    res.end('Internal Server Error: ' + err.message);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`💻 UniERP Desktop App (P10) Web Preview listening on http://${HOST}:${PORT}`);
});
