import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check if admin
  const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const normalizedIP = clientIP?.replace(/^::ffff:/, '') || '';
  const adminIPs = await kv.get('admin_ips') || ['127.0.0.1', '::1'];
  
  if (!adminIPs.includes(normalizedIP)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    if (req.method === 'GET') {
      // Get all posts (including unpublished)
      const posts = await kv.get('posts') || [];
      return res.status(200).json(posts);
    }

    if (req.method === 'PUT') {
      const { id } = req.query;
      const { title, content, tags, is_published } = req.body;
      
      const posts = await kv.get('posts') || [];
      const postIndex = posts.findIndex(p => p.id === id);
      
      if (postIndex === -1) {
        return res.status(404).json({ error: 'Post not found' });
      }

      posts[postIndex] = {
        ...posts[postIndex],
        title,
        content,
        tags: JSON.stringify(tags || []),
        is_published,
        updated_at: new Date().toISOString()
      };

      await kv.set('posts', posts);
      return res.status(200).json(posts[postIndex]);
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      
      const posts = await kv.get('posts') || [];
      const filteredPosts = posts.filter(p => p.id !== id);
      
      await kv.set('posts', posts);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}