// Store posts in memory (will reset on each deployment)
// This is temporary until we fix the database
let posts = [
  {
    id: '1',
    title: 'Welcome to My Blog',
    content: 'This is your first blog post. Edit or delete it from the admin panel.',
    tags: JSON.stringify(['welcome', 'first-post']),
    created_at: new Date().toISOString(),
    is_published: true
  }
];

export default async function handler(req, res) {
  const { method } = req;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (method === 'GET') {
    // Return only published posts
    const publishedPosts = posts.filter(post => post.is_published);
    return res.status(200).json(publishedPosts);
  }

  if (method === 'POST') {
    // For testing, allow all posts (remove this in production)
    const { title, content, tags } = req.body;
    
    const newPost = {
      id: Date.now().toString(),
      title,
      content,
      tags: JSON.stringify(tags || []),
      created_at: new Date().toISOString(),
      is_published: true
    };
    
    posts.unshift(newPost);
    return res.status(201).json(newPost);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}