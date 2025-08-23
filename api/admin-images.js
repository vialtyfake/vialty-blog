import path from 'path';
import sharp from 'sharp';
import { list, put, del } from '@vercel/blob';
import { getRedisClient } from './_redis.js';

const STORE = 'vialty-blog-images';
const MAX_SIZE = 4.5 * 1024 * 1024; // 4.5MB

async function optimizeImage(buffer, format) {
  if (buffer.length <= MAX_SIZE) return buffer;

  let quality = 80;
  let optimized = buffer;
  while (optimized.length > MAX_SIZE && quality > 10) {
    optimized = await sharp(buffer).toFormat(format, { quality }).toBuffer();
    quality -= 10;
  }
  if (optimized.length > MAX_SIZE) {
    throw new Error('Image exceeds maximum size after optimization');
  }
  return optimized;
}

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

    const token = process.env.BLOB_READ_WRITE_TOKEN;

    if (method === 'GET') {
      const { blobs } = await list({ token, prefix: `${STORE}/` });
      const images = blobs.map(b => b.pathname.replace(`${STORE}/`, ''));
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
        const base64 = data.split(',')[1] || data;
        let buffer = Buffer.from(base64, 'base64');
        const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '');
        const ext = path.extname(safeName).slice(1).toLowerCase();
        const format = ext === 'jpg' ? 'jpeg' : ext || 'jpeg';
        buffer = await optimizeImage(buffer, format);
        await put(`${STORE}/${safeName}`, buffer, {
          access: 'public',
          token,
          contentType: `image/${format}`
        });
      } catch (err) {
        return res.status(500).json({ error: 'Failed to save file', details: err.message });
      }
      return res.status(200).json({ success: true });
    }

    if (method === 'DELETE') {
      const nameParam = Array.isArray(query?.name) ? query.name[0] : query?.name;
      if (!nameParam) return res.status(400).json({ error: 'Name required' });

      const safeName = decodeURIComponent(nameParam).replace(/[^a-zA-Z0-9._-]/g, '');
      try {
        await del(`${STORE}/${safeName}`, { token });
      } catch {
        return res.status(404).json({ error: 'File not found' });
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
      const oldPath = `${STORE}/${safeOld}`;
      const newPath = `${STORE}/${safeNew}`;

      try {
        const { blobs } = await list({ token, prefix: oldPath });
        const blob = blobs.find(b => b.pathname === oldPath);
        if (!blob) return res.status(404).json({ error: 'File not found' });

        const response = await fetch(blob.downloadUrl || blob.url);
        let buffer = Buffer.from(await response.arrayBuffer());
        const ext = path.extname(safeNew).slice(1).toLowerCase();
        const format = ext === 'jpg' ? 'jpeg' : ext || 'jpeg';
        buffer = await optimizeImage(buffer, format);
        await put(newPath, buffer, {
          access: 'public',
          token,
          contentType: `image/${format}`
        });
        await del(oldPath, { token });
      } catch (err) {
        return res.status(500).json({ error: 'Failed to rename file', details: err.message });
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

