import { kv } from '@vercel/kv';

export default async function handler(request) {
  const url = new URL(request.url);
  const method = request.method;
  const postId = url.searchParams.get('id');

  // Handle CORS
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  try {
    // Check if admin
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    const adminIPs = await kv.get('admin_ips') || ['127.0.0.1', '::1'];
    const normalizedIP = clientIP.split(',')[0].trim();
    
    if (!adminIPs.includes(normalizedIP)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
      });
    }

    if (method === 'GET') {
      // Get all posts (including unpublished)
      const posts = await kv.get('posts') || [];
      return new Response(JSON.stringify(posts), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
      });
    }

    if (method === 'PUT' && postId) {
      // Update post
      const body = await request.json();
      const posts = await kv.get('posts') || [];
      const postIndex = posts.findIndex(p => p.id === postId);
      
      if (postIndex === -1) {
        return new Response(JSON.stringify({ error: 'Post not found' }), {
          status: 404,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
        });
      }

      posts[postIndex] = {
        ...posts[postIndex],
        title: body.title,
        content: body.content,
        tags: JSON.stringify(body.tags || []),
        is_published: body.is_published,
        updated_at: new Date().toISOString(),
      };

      await kv.set('posts', posts);
      
      return new Response(JSON.stringify(posts[postIndex]), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
      });
    }

    if (method === 'DELETE' && postId) {
      // Delete post
      const posts = await kv.get('posts') || [];
      const filteredPosts = posts.filter(p => p.id !== postId);
      await kv.set('posts', filteredPosts);
      
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
    });
  }
}

export const config = {
  runtime: 'edge',
};