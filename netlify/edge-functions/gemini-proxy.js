// Netlify Edge Function — Gemini Proxy
// Runs on Netlify's Deno edge runtime, bypasses AI Gateway interception.
// Registered via: export const config = { path: '/api/gemini' }

const GEMINI_KEY = 'AIzaSyCr9Zc-uS2D4wCICU6qWmBk0_wvezA7RAk';
const MODELS = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash-latest'];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export default async function handler(request) {
  // Preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: CORS });
  }

  let body;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: CORS });
  }

  const { prompt } = body;
  if (!prompt) {
    return new Response(JSON.stringify({ error: 'Missing prompt' }), { status: 400, headers: CORS });
  }

  let lastError = 'All models failed';

  for (const model of MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
        }),
      });

      if (res.status === 404) { lastError = `Model ${model} not found`; continue; }
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        lastError = (e.error && e.error.message) || `HTTP ${res.status}`;
        continue;
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) { lastError = 'Empty response'; continue; }

      return new Response(JSON.stringify({ text, model }), { status: 200, headers: CORS });
    } catch (e) {
      lastError = e.message;
      continue;
    }
  }

  return new Response(JSON.stringify({ error: lastError }), { status: 502, headers: CORS });
}

export const config = { path: '/api/gemini' };
