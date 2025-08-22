export const config = {
  runtime: 'edge',
};

import { kv } from '@vercel/kv';

export default async function handler(request) {
  const { searchParams } = new URL(request.url);
  const method = request.method;

  try {
    if (method === 'GET') {
      // Get all posts
      const posts = await kv.get('posts') || [];
      const publishedPosts = posts.filter(post => post.is_published !== false);
      
      return new Response(JSON.stringify(publishedPosts), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'POST') {
      // Check if admin
      const clientIP = request.headers.get('x-forwarded-for') || 
                       request.headers.get('x-real-ip') || 
                       'unknown';
      
      const adminIPs = await kv.get('admin_ips') || ['127.0.0.1', '::1'];
      const normalizedIP = clientIP.split(',')[0].trim();
      
      if (!adminIPs.includes(normalizedIP)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Create new post
      const body = await request.json();
      const newPost = {
        id: crypto.randomUUID(),
        title: body.title,
        content: body.content,
        tags: JSON.stringify(body.tags || []),
        created_at: new Date().toISOString(),
        is_published: body.is_published !== false,
      };

      const posts = await kv.get('posts') || [];
      posts.unshift(newPost);
      await kv.set('posts', posts);

      return new Response(JSON.stringify(newPost), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}