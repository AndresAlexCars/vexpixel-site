// Proxy de /api/* hacia el servidor Express (Cloudflare Tunnel en Termux).
const ORIGIN = 'https://api.jordvex.xyz';

export async function onRequest(context) {
  const { request } = context;
  const incoming = new URL(request.url);
  const target = `${ORIGIN}${incoming.pathname}${incoming.search}`;

  const headers = new Headers(request.headers);
  headers.delete('host');

  const init = {
    method: request.method,
    headers,
    redirect: 'manual',
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
  }

  const upstream = await fetch(target, init);
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: upstream.headers,
  });
}
