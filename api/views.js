import { getRedisClient } from './_redis.js';

export default async function handler(req, res) {
  const { method, query } = req;
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { postId } = query;
  
  if (!postId) {
    return res.status(400).json({ error: 'Post ID required' });
  }

  try {
    const client = await getRedisClient();
    const viewKey = `views:${postId}`;

    if (method === 'POST') {
      // Increment view count
      const views = await client.incr(viewKey);
      
      // Also update in the post data
      const postsStr = await client.get('posts');
      const posts = postsStr ? JSON.parse(postsStr) : [];
      const postIndex = posts.findIndex(p => p.id === postId);
      
      if (postIndex !== -1) {
        posts[postIndex].views = views;
        await client.set('posts', JSON.stringify(posts));
      }
      
      return res.status(200).json({ views });
    }

    if (method === 'GET') {
      // Get view count
      const viewsStr = await client.get(viewKey);
      const views = viewsStr ? parseInt(viewsStr) : 0;
      return res.status(200).json({ views });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Views error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}