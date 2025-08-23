import fs from 'fs/promises';
import path from 'path';
import { getRedisClient } from './_redis.js';

export default async function handler(req, res) {
  const { method, query } = req;
  let client;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
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

    const imagesDir = path.join(process.cwd(), 'public', 'images');

    if (method === 'GET') {
      let files = [];
      try {
        files = await fs.readdir(imagesDir);
      } catch {
        files = [];
      }
      const images = files.filter(file => /\.(png|jpe?g|gif|webp|svg)$/i.test(file));
      return res.status(200).json(images);
    }

    if (method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {
          return res.status(400).json({ error: 'Invalid JSON' });
        }
      }

      const { name, data } = body || {};
      if (!name || !data) {
        return res.status(400).json({ error: 'Name and data are required' });
      }

      try {
        await fs.mkdir(imagesDir, { recursive: true });
        const base64 = data.split(',')[1] || data;
        const buffer = Buffer.from(base64, 'base64');
        const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '');
        await fs.writeFile(path.join(imagesDir, safeName), buffer);
      } catch (err) {
        return res.status(500).json({ error: 'Failed to save file', details: err.message });
      }
      return res.status(200).json({ success: true });
    }

    if (method === 'DELETE') {
      const nameParam = Array.isArray(query?.name) ? query.name[0] : query?.name;
      if (!nameParam) return res.status(400).json({ error: 'Name required' });

      const safeName = decodeURIComponent(nameParam).replace(/[^a-zA-Z0-9._-]/g, '');
      const filePath = path.join(imagesDir, safeName);

      try {
        await fs.unlink(filePath);
      } catch (err) {
        return res.status(err.code === 'ENOENT' ? 404 : 500).json({
          error: err.code === 'ENOENT' ? 'File not found' : 'Failed to delete file'
        });
      }
      return res.status(200).json({ success: true });
    }

    if (method === 'PUT') {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {
          return res.status(400).json({ error: 'Invalid JSON' });
        }
      }
      const { oldName, newName } = body || {};
      if (!oldName || !newName) {
        return res.status(400).json({ error: 'Old and new names are required' });
      }
      const safeNew = newName.replace(/[^a-zA-Z0-9._-]/g, '');
      const safeOld = decodeURIComponent(oldName).replace(/[^a-zA-Z0-9._-]/g, '');
      try {
        await fs.rename(path.join(imagesDir, safeOld), path.join(imagesDir, safeNew));
      } catch (err) {
        return res.status(err.code === 'ENOENT' ? 404 : 500).json({
          error: err.code === 'ENOENT' ? 'File not found' : 'Failed to rename file'
        });
      }
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
