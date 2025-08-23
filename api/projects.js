import { getRedisClient } from './_redis.js';

export default async function handler(req, res) {
  const { method } = req;
  let client;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    client = await getRedisClient();

    if (method === 'GET') {
      const projectsStr = await client.get('projects');
      const projects = projectsStr ? JSON.parse(projectsStr) : [];
      return res.status(200).json(projects);
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
