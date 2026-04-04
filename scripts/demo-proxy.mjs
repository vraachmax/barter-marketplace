import http from 'node:http';
import httpProxy from 'http-proxy';

const WEB_TARGET = 'http://127.0.0.1:3000';
const API_TARGET = 'http://127.0.0.1:3001';
const PORT = Number(process.env.DEMO_PROXY_PORT ?? 4000);

const apiOnlyPrefixes = ['/categories', '/listings', '/chats', '/reviews', '/users', '/uploads', '/health', '/socket.io'];

function hasJsonHeaders(req) {
  const contentType = String(req.headers['content-type'] ?? '').toLowerCase();
  const accept = String(req.headers.accept ?? '').toLowerCase();
  return contentType.includes('application/json') || accept.includes('application/json');
}

function shouldProxyToApi(req) {
  const url = req.url ?? '/';
  if (apiOnlyPrefixes.some((prefix) => url === prefix || url.startsWith(`${prefix}/`))) return true;

  // These paths exist both as web pages and API endpoints.
  // Route to API only for explicit JSON/fetch requests.
  if (url === '/auth' || url.startsWith('/auth/')) return hasJsonHeaders(req);
  if (url === '/favorites' || url.startsWith('/favorites/')) return hasJsonHeaders(req);

  return false;
}

const webProxy = httpProxy.createProxyServer({
  target: WEB_TARGET,
  ws: true,
});

const apiProxy = httpProxy.createProxyServer({
  target: API_TARGET,
  ws: true,
});

for (const proxy of [webProxy, apiProxy]) {
  proxy.on('error', (err, req, res) => {
    if (res && !res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    }
    if (res) res.end(`Proxy error: ${err.message}`);
    else console.error('Proxy socket error:', err.message);
  });
}

const server = http.createServer((req, res) => {
  const fwdProto = req.headers['x-forwarded-proto'] ?? 'http';
  req.headers['x-forwarded-proto'] = fwdProto;
  const toApi = shouldProxyToApi(req);
  const target = toApi ? 'API' : 'WEB';
  console.log(`[${target}] ${req.method} ${req.url} ct=${req.headers['content-type'] ?? '-'}`);
  const proxy = toApi ? apiProxy : webProxy;
  proxy.web(req, res);
});

server.on('upgrade', (req, socket, head) => {
  const url = req.url ?? '/';
  const toApi = url.startsWith('/socket.io');
  const proxy = toApi ? apiProxy : webProxy;
  proxy.ws(req, socket, head);
});

server.listen(PORT, () => {
  console.log(`Demo proxy is running on http://127.0.0.1:${PORT}`);
  console.log(`Web target: ${WEB_TARGET}`);
  console.log(`API target: ${API_TARGET}`);
});

