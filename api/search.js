import { getRedisClient } from './_redis.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q } = req.query;
  
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Search query must be at least 2 characters' });
  }

  try {
    const client = await getRedisClient();
    const postsStr = await client.get('posts');
    const posts = postsStr ? JSON.parse(postsStr) : [];
    
    // Search in title, content, and tags
    const searchTerm = q.toLowerCase();
    const results = posts.filter(post => {
      if (!post.is_published) return false;
      
      const titleMatch = post.title?.toLowerCase().includes(searchTerm);
      const contentMatch = post.content?.toLowerCase().includes(searchTerm);
      
      let tagsMatch = false;
      try {
        const tags = JSON.parse(post.tags || '[]');
        tagsMatch = tags.some(tag => tag.toLowerCase().includes(searchTerm));
      } catch (e) {
        // Invalid tags format
      }
      
      return titleMatch || contentMatch || tagsMatch;
    });

    return res.status(200).json(results);
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}