/**
 * Welcome to Cloudflare Workers! This is your serverless API.
 * 
 * BINDINGS:
 * - DATABASE_URL: Your Neon Connection String (e.g. postgres://user:pass@ep-xyz.aws.neon.tech/neondb)
 */

import { Client } from '@neondatabase/serverless';

export default {
  async fetch(request, env, ctx) {
    // CORS Headers to allow your React app to talk to this worker
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*', // In production, change this to your Vercel/Pages domain
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // ROUTE: GET /pianos (Fetch user's pianos)
    if (url.pathname === '/pianos' && request.method === 'GET') {
      try {
        const client = new Client(env.DATABASE_URL);
        await client.connect();
        
        // Mock User ID (In real app, extract from "Authorization" header token)
        const userId = "mock-user-123"; 

        const { rows } = await client.query('SELECT * FROM pianos WHERE user_id = $1', [userId]);
        ctx.waitUntil(client.end());
        
        return new Response(JSON.stringify(rows), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // ROUTE: POST /pianos (Save a new piano)
    if (url.pathname === '/pianos' && request.method === 'POST') {
      try {
        const data = await request.json();
        const client = new Client(env.DATABASE_URL);
        await client.connect();
        
        const userId = "mock-user-123"; // Replace with verified auth token logic

        const query = 'INSERT INTO pianos (user_id, name, speaking_length_mm) VALUES ($1, $2, $3) RETURNING *';
        const values = [userId, data.name, data.speakingLength];

        const { rows } = await client.query(query, values);
        ctx.waitUntil(client.end());

        return new Response(JSON.stringify(rows[0]), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  },
};
