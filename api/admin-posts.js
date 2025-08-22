// Use the same in-memory storage
let posts = [];

export default async function handler(req, res) {
  const { method, query } = req;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  // For now, skip admin check to test
  // const isAdmin = true; // Temporary

  if (method === 'GET') {
    // Return all posts (including unpublished)
    return res.status(200).json(posts);
  }

  if (method === 'PUT' && query.id) {
    const { title, content, tags, is_published } = req.body;
    const postIndex = posts.findIndex(p => p.id === query.id);
    
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

    return res.status(200).json(posts[postIndex]);
  }

  if (method === 'DELETE' && query.id) {
    posts = posts.filter(p => p.id !== query.id);
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}