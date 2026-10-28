/**
 * Cloudflare Worker API for Resonance Tuner (Neon Postgres Serverless Backend)
 *
 * BINDINGS:
 * - DATABASE_URL: Neon Connection String (postgres://user:pass@ep-xyz.aws.neon.tech/neondb)
 */

import { Client } from '@neondatabase/serverless';

export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // ROUTE: GET /pianos (Fetch user's saved tuning profiles)
    if (url.pathname === '/pianos' && request.method === 'GET') {
      try {
        const client = new Client(env.DATABASE_URL);
        await client.connect();

        const userId = 'mock-user-123';

        const { rows } = await client.query(
          'SELECT id, name, type, instrument, data, created_at FROM tuning_profiles WHERE user_id = $1 ORDER BY created_at DESC',
          [userId]
        );
        ctx.waitUntil(client.end());

        return new Response(JSON.stringify(rows), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // ROUTE: POST /pianos (Save a new Piano or Guitar tuning profile)
    if (url.pathname === '/pianos' && request.method === 'POST') {
      try {
        const body = await request.json();
        const client = new Client(env.DATABASE_URL);
        await client.connect();

        const userId = 'mock-user-123';
        const name = String(body.name || 'Untitled Profile').slice(0, 120);
        const type = String(body.type || 'INHARMONICITY');
        const instrument = String(body.instrument || 'PIANO');
        const data = Array.isArray(body.data) ? JSON.stringify(body.data) : '[]';

        const query = `
          INSERT INTO tuning_profiles (user_id, name, type, instrument, data)
          VALUES ($1, $2, $3, $4, $5::jsonb)
          RETURNING id, name, type, instrument, data, created_at
        `;
        const values = [userId, name, type, instrument, data];

        const { rows } = await client.query(query, values);
        ctx.waitUntil(client.end());

        return new Response(JSON.stringify(rows[0]), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  },
};
