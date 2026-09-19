const cors = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: { ...cors, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
    if (request.method !== 'POST' || new URL(request.url).pathname !== '/messages') return json({ error: 'not_found' }, 404);
    if (!env.GITHUB_TOKEN || !env.GITHUB_OWNER || !env.GITHUB_REPO || !env.GITHUB_ISSUE_NUMBER) return json({ error: 'broker_not_configured' }, 500);
    const record = await request.json().catch(() => null);
    const text = typeof record?.text === 'string' ? record.text.trim() : '';
    const name = typeof record?.author?.name === 'string' ? record.author.name.trim() : '';
    const color = /^#[0-9a-fA-F]{6}$/.test(record?.author?.color) ? record.author.color : '#e7df61';
    const x = Number(record?.position?.x), z = Number(record?.position?.z);
    if (!text || text.length > 280 || !name || name.length > 24 || !Number.isFinite(x) || !Number.isFinite(z)) return json({ error: 'invalid_message' }, 400);
    const body = JSON.stringify({ version: 1, position: { x, z }, text: `${text}\n— ${name}`, author: { name, color }, createdAt: new Date().toISOString() });
    const response = await fetch(`https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/issues/${env.GITHUB_ISSUE_NUMBER}/comments`, { method: 'POST', headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${env.GITHUB_TOKEN}`, 'X-GitHub-Api-Version': '2026-03-10', 'Content-Type': 'application/json', 'User-Agent': 'backrooms-message-relay' }, body: JSON.stringify({ body }) });
    const result = await response.json();
    return response.ok ? json({ id: result.id }, 201) : json({ error: result.message || 'github_error' }, response.status);
  }
};
