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
      const projectsStr = await client.get('projects');
      const projects = projectsStr ? JSON.parse(projectsStr) : [];
      return res.status(200).json(projects);
    }

    if (method === 'POST') {
      const clientIP = req.headers['x-forwarded-for'] ||
                       req.headers['x-real-ip'] ||
                       'unknown';
      const normalizedIP = clientIP.split(',')[0].trim();

      const adminIPsStr = await client.get('admin_ips');
      const adminIPs = adminIPsStr ? JSON.parse(adminIPsStr) : ['127.0.0.1', '::1'];

      if (!adminIPs.includes(normalizedIP)) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const { title, role, stack, link, blurb, image } = req.body;
      const newProject = {
        id: Date.now().toString(),
        title,
        role,
        stack,
        link,
        blurb,
        image,
        created_at: new Date().toISOString()
      };

      const projectsStr = await client.get('projects');
      const projects = projectsStr ? JSON.parse(projectsStr) : [];
      projects.unshift(newProject);
      await client.set('projects', JSON.stringify(projects));

      return res.status(201).json(newProject);
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
