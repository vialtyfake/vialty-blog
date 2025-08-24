import { getRedisClient } from './_redis.js';

export default async function handler(req, res) {
  const { method, query } = req;
  let client;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Check if admin
    const clientIP = req.headers['x-forwarded-for'] || 
                     req.headers['x-real-ip'] || 
                     'unknown';
    const normalizedIP = clientIP.split(',')[0].trim();
    
    client = await getRedisClient();
    const adminIPsStr = await client.get('admin_ips');
    const adminIPs = adminIPsStr ? JSON.parse(adminIPsStr) : ['127.0.0.1', '::1'];
    
    if (!adminIPs.includes(normalizedIP)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (method === 'GET') {
      // Get all posts (including unpublished)
      const postsStr = await client.get('posts');
      const posts = postsStr ? JSON.parse(postsStr) : [];
      return res.status(200).json(posts);
    }

    if (method === 'PUT' && query.id) {
      // Update post
      const { title, content, tags, images = [], is_published } = req.body;
      const postsStr = await client.get('posts');
      const posts = postsStr ? JSON.parse(postsStr) : [];
      const postIndex = posts.findIndex(p => p.id === query.id);
      
      if (postIndex === -1) {
        return res.status(404).json({ error: 'Post not found' });
      }

      const limitedImages = Array.isArray(images) ? images.slice(0, 3) : [];
      posts[postIndex] = {
        ...posts[postIndex],
        title,
        content,
        tags: JSON.stringify(tags || []),
        images: limitedImages,
        is_published,
        updated_at: new Date().toISOString()
      };

      await client.set('posts', JSON.stringify(posts));
      return res.status(200).json(posts[postIndex]);
    }

    if (method === 'DELETE' && query.id) {
      // Delete post
      const postsStr = await client.get('posts');
      const posts = postsStr ? JSON.parse(postsStr) : [];
      const filteredPosts = posts.filter(p => p.id !== query.id);
      await client.set('posts', JSON.stringify(filteredPosts));
      return res.status(200).json({ success: true });
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