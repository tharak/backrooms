const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }
});

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
    if (!env.GITHUB_CLIENT_ID) return json({ error: 'broker_not_configured' }, 500);
    const endpoint = new URL(request.url).pathname === '/device' ? 'https://github.com/login/device/code' : new URL(request.url).pathname === '/token' ? 'https://github.com/login/oauth/access_token' : null;
    if (!endpoint) return json({ error: 'not_found' }, 404);
    const form = new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID });
    if (endpoint.endsWith('/device/code')) form.set('scope', 'public_repo');
    else {
      const { device_code } = await request.json().catch(() => ({}));
      if (!device_code) return json({ error: 'missing_device_code' }, 400);
      form.set('device_code', device_code);
      form.set('grant_type', 'urn:ietf:params:oauth:grant-type:device_code');
    }
    const response = await fetch(endpoint, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: form });
    return json(await response.json(), response.status);
  }
};
