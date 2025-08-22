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

  // Check if admin
  const clientIP = req.headers['x-forwarded-for'] || 
                   req.headers['x-real-ip'] || 
                   'unknown';
  const normalizedIP = clientIP.split(',')[0].trim();

  try {
    const client = await getRedisClient();
    const adminIPsStr = await client.get('admin_ips');
    const adminIPs = adminIPsStr ? JSON.parse(adminIPsStr) : ['127.0.0.1', '::1'];
    
    if (!adminIPs.includes(normalizedIP)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get stats
    const postsStr = await client.get('posts');
    const posts = postsStr ? JSON.parse(postsStr) : [];
    
    const totalPosts = posts.length;
    const publishedPosts = posts.filter(p => p.is_published).length;
    const draftPosts = posts.filter(p => !p.is_published).length;
    
    // Get total views
    let totalViews = 0;
    for (const post of posts) {
      const viewsStr = await client.get(`views:${post.id}`);
      totalViews += viewsStr ? parseInt(viewsStr) : 0;
    }
    
    // Get popular posts
    const postsWithViews = await Promise.all(posts.map(async (post) => {
      const viewsStr = await client.get(`views:${post.id}`);
      return {
        ...post,
        views: viewsStr ? parseInt(viewsStr) : 0
      };
    }));
    
    const popularPosts = postsWithViews
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);
    
    // Get recent posts
    const recentPosts = [...posts]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);
    
    // Get tag statistics
    const tagCounts = {};
    posts.forEach(post => {
      try {
        const tags = JSON.parse(post.tags || '[]');
        tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      } catch (e) {
        // Invalid tags format
      }
    });
    
    const stats = {
      totalPosts,
      publishedPosts,
      draftPosts,
      totalViews,
      popularPosts,
      recentPosts,
      tagCounts,
      lastUpdated: new Date().toISOString()
    };

    return res.status(200).json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}