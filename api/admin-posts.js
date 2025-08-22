import { createClient } from 'redis';

export default async function handler(request) {
  const method = request.method;
  let client;

  // Handle CORS
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  try {
    client = createClient({
      url: process.env.REDIS_URL || 'redis://default:M4L4KWbQF8Vu9ERqYtTfJji9gugjPfuh@redis-11404.c300.eu-central-1-1.ec2.redns.redis-cloud.com:11404'
    });
    
    await client.connect();

    if (method === 'GET') {
      // Get all posts
      const postsStr = await client.get('posts');
      const posts = postsStr ? JSON.parse(postsStr) : [];
      const publishedPosts = posts.filter(post => post.is_published !== false);
      
      await client.quit();
      
      return new Response(JSON.stringify(publishedPosts), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
      });
    }

    if (method === 'POST') {
      // Check if admin
      const clientIP = request.headers.get('x-forwarded-for') || 
                       request.headers.get('x-real-ip') || 
                       'unknown';
      
      const adminIPsStr = await client.get('admin_ips');
      const adminIPs = adminIPsStr ? JSON.parse(adminIPsStr) : ['127.0.0.1', '::1'];
      const normalizedIP = clientIP.split(',')[0].trim();
      
      if (!adminIPs.includes(normalizedIP)) {
        await client.quit();
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 403,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
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

      const postsStr = await client.get('posts');
      const posts = postsStr ? JSON.parse(postsStr) : [];
      posts.unshift(newPost);
      await client.set('posts', JSON.stringify(posts));
      
      await client.quit();

      return new Response(JSON.stringify(newPost), {
        status: 201,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
      });
    }

    await client.quit();
    
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
    });
  } catch (error) {
    if (client) {
      try {
        await client.quit();
      } catch (e) {
        console.error('Error closing Redis connection:', e);
      }
    }
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