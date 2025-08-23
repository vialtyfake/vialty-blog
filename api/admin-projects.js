import { getRedisClient } from './_redis.js';

export default async function handler(req, res) {
  const { method, query } = req;
  let client;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
codex/add-projects-grid-with-admin-management-4ol0kk
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

codex/add-projects-grid-with-admin-management-l7za55
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
main
main
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
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
      const projectsStr = await client.get('projects');
      const projects = projectsStr ? JSON.parse(projectsStr) : [];
      return res.status(200).json(projects);
    }

codex/add-projects-grid-with-admin-management-4ol0kk
    if (method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch (e) {
          return res.status(400).json({ error: 'Invalid JSON' });
        }
      }
      const { title, role, stack, link, blurb, image } = body || {};
      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }

codex/add-projects-grid-with-admin-management-l7za55
    if (method === 'POST') {
      const { title, role, stack, link, blurb, image } = req.body;main
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

codex/add-projects-grid-with-admin-management-4ol0kk
    if (method === 'PUT' && query.id) {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch (e) {
          return res.status(400).json({ error: 'Invalid JSON' });
        }
      }
      const { title, role, stack, link, blurb, image } = body || {};

main
    if (method === 'PUT' && query.id) {
      const { title, role, stack, link, blurb, image } = req.body;
main
      const projectsStr = await client.get('projects');
      const projects = projectsStr ? JSON.parse(projectsStr) : [];
      const idx = projects.findIndex(p => p.id === query.id);

      if (idx === -1) {
        return res.status(404).json({ error: 'Project not found' });
      }

      projects[idx] = {
        ...projects[idx],
        title,
        role,
        stack,
        link,
        blurb,
        image,
        updated_at: new Date().toISOString()
      };

      await client.set('projects', JSON.stringify(projects));
      return res.status(200).json(projects[idx]);
    }

    if (method === 'DELETE' && query.id) {
      const projectsStr = await client.get('projects');
      const projects = projectsStr ? JSON.parse(projectsStr) : [];
      const filtered = projects.filter(p => p.id !== query.id);
      await client.set('projects', JSON.stringify(filtered));
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
