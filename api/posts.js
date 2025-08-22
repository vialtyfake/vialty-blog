import { kv } from '@vercel/kv';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // Get all published posts
      const posts = await kv.get('posts') || [];
      const publishedPosts = posts.filter(post => post.is_published);
      return res.status(200).json(publishedPosts);
    }

    if (req.method === 'POST') {
      // Check if admin
      const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const isAdmin = await checkAdminIP(clientIP);
      
      if (!isAdmin) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Create new post
      const { title, content, tags } = req.body;
      const newPost = {
        id: uuidv4(),
        title,
        content,
        tags: JSON.stringify(tags || []),
        created_at: new Date().toISOString(),
        is_published: true
      };

      const posts = await kv.get('posts') || [];
      posts.unshift(newPost);
      await kv.set('posts', posts);

      return res.status(201).json(newPost);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function checkAdminIP(ip) {
  const adminIPs = await kv.get('admin_ips') || ['127.0.0.1', '::1'];
  const normalizedIP = ip?.replace(/^::ffff:/, '') || '';
  return adminIPs.includes(normalizedIP);
}