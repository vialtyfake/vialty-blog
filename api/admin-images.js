import fs from 'fs/promises';
import path from 'path';
import { getRedisClient } from './_redis.js';

export default async function handler(req, res) {
  const { method } = req;
  let client;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
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
      const imagesDir = path.join(process.cwd(), 'public', 'images');
      let files = [];
      try {
        files = await fs.readdir(imagesDir);
      } catch {
        files = [];
      }
      const images = files.filter(file => /\.(png|jpe?g|gif|webp|svg)$/i.test(file));
      return res.status(200).json(images);
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
