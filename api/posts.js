import { getRedisClient } from './_redis.js';

export default async function handler(req, res) {
  const { method } = req;
  let client;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    client = await getRedisClient();

    if (method === 'GET') {
      // Get all posts from Redis
      const postsStr = await client.get('posts');
      const posts = postsStr ? JSON.parse(postsStr) : [];
      const publishedPosts = posts.filter(post => post.is_published !== false);
      
      return res.status(200).json(publishedPosts);
    }

    if (method === 'POST') {
      // Check if admin
      const clientIP = req.headers['x-forwarded-for'] || 
                       req.headers['x-real-ip'] || 
                       'unknown';
      const normalizedIP = clientIP.split(',')[0].trim();
      
      const adminIPsStr = await client.get('admin_ips');
      const adminIPs = adminIPsStr ? JSON.parse(adminIPsStr) : ['127.0.0.1', '::1'];
      
      if (!adminIPs.includes(normalizedIP)) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Create new post
      const { title, content, tags, images = [], is_published = true } = req.body;
      const limitedImages = Array.isArray(images) ? images.slice(0, 3) : [];
      const newPost = {
        id: Date.now().toString(),
        title,
        content,
        tags: JSON.stringify(tags || []),
        images: limitedImages,
        created_at: new Date().toISOString(),
        is_published,
        author_ip: normalizedIP
      };

      // Get existing posts and add new one
      const postsStr = await client.get('posts');
      const posts = postsStr ? JSON.parse(postsStr) : [];
      posts.unshift(newPost);
      
      // Save back to Redis
      await client.set('posts', JSON.stringify(posts));
      
      return res.status(201).json(newPost);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}