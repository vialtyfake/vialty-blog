import fs from 'fs/promises';
import path from 'path';

import { getRedisClient } from './_redis.js';

let sharpLib = null;

async function getSharp() {
  if (!sharpLib) {
    try {
      const mod = await import('sharp');
      sharpLib = mod.default || mod;
    } catch (err) {
      console.warn('sharp not available, skipping optimization');
      sharpLib = null;
    }
  }
  return sharpLib;
}

const IMAGE_DIR = path.join(process.cwd(), 'public', 'uploads');
const MAX_SIZE = 4.5 * 1024 * 1024; // 4.5MB
const MAX_DIMENSION = 1200;

async function ensureDir() {
  await fs.mkdir(IMAGE_DIR, { recursive: true });
}

async function optimizeImage(buffer, format) {
  const sharp = await getSharp();
  if (!sharp) {
    return buffer;
  }
  const image = sharp(buffer);
  const metadata = await image.metadata();

  let { width, height } = metadata;
  if (width && height) {
    if (width > height && width > MAX_DIMENSION) {
      height = Math.round(height * (MAX_DIMENSION / width));
      width = MAX_DIMENSION;
    } else if (height > MAX_DIMENSION) {
      width = Math.round(width * (MAX_DIMENSION / height));
      height = MAX_DIMENSION;
    }
    image.resize(width, height);
  }

  return image.toFormat(format, { quality: 80 }).toBuffer();
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

    await ensureDir();

    if (method === 'GET') {
      const files = await fs.readdir(IMAGE_DIR);
      const images = files.map(name => ({
        name,
        url: `/uploads/${encodeURIComponent(name)}`
      }));
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
        if (buffer.length > MAX_SIZE) {
          return res.status(400).json({ error: 'Image exceeds maximum size' });
        }

        const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '');
        const ext = path.extname(safeName).slice(1).toLowerCase();
        const format = ext === 'jpg' ? 'jpeg' : ext || 'jpeg';
        buffer = await optimizeImage(buffer, format);

        await fs.writeFile(path.join(IMAGE_DIR, safeName), buffer);
      } catch (err) {
        return res.status(500).json({ error: 'Failed to save file', details: err.message });
      }
      return res.status(200).json({ success: true });
    }

    if (method === 'DELETE') {
      const nameParam = Array.isArray(query?.name) ? query.name[0] : query?.name;
      if (!nameParam) {
        return res.status(400).json({ error: 'Name required' });
      }

      const safeName = decodeURIComponent(nameParam).replace(/[^a-zA-Z0-9._-]/g, '');
      try {
        await fs.unlink(path.join(IMAGE_DIR, safeName));
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

      const safeOld = decodeURIComponent(oldName).replace(/[^a-zA-Z0-9._-]/g, '');
      const safeNew = newName.replace(/[^a-zA-Z0-9._-]/g, '');
      const oldPath = path.join(IMAGE_DIR, safeOld);
      const newPath = path.join(IMAGE_DIR, safeNew);

      try {
        const oldExt = path.extname(safeOld).toLowerCase();
        const newExt = path.extname(safeNew).toLowerCase();

        if (oldExt === newExt) {
          await fs.rename(oldPath, newPath);
        } else {
          let buffer = await fs.readFile(oldPath);
          const format = newExt.slice(1) === 'jpg' ? 'jpeg' : newExt.slice(1) || 'jpeg';
          buffer = await optimizeImage(buffer, format);
          await fs.writeFile(newPath, buffer);
          await fs.unlink(oldPath);
        }
      } catch (err) {
        if (err.code === 'ENOENT') {
          return res.status(404).json({ error: 'File not found' });
        }
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
  } finally {
    if (client && client.quit) {
      await client.quit();
    }
  }
}

