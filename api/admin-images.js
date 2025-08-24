import ImageKit from 'imagekit';
import { getRedisClient } from './_redis.js';
import { promises as fs } from 'fs';
import path from 'path';

// We dynamically import sharp only when available.
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

// Determine if ImageKit credentials are provided. When missing,
// the API will fall back to storing and serving images from the local
// filesystem under the public/uploads directory. This prevents hard
// failures when IMAGEKIT_* environment variables are not defined.
const hasImageKitCreds =
  process.env.IMAGEKIT_PUBLIC_KEY &&
  process.env.IMAGEKIT_PRIVATE_KEY &&
  process.env.IMAGEKIT_URL_ENDPOINT;

// Conditionally instantiate the ImageKit client. When credentials are
// missing, imagekit will be undefined and all operations will use
// filesystem fallbacks instead.
const imagekit = hasImageKitCreds
  ? new ImageKit({
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
    })
  : null;

// Directory to store local images when not using ImageKit.
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

// Ensure the uploads directory exists. This helper silently creates
// the directory structure if it is missing.
async function ensureUploadsDir() {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  } catch {
    // ignore errors
  }
}

// Optimize an image buffer using sharp when available. The behaviour
// matches the original implementation: it resizes images to a maximum
// dimension and compresses JPEG output. When sharp is unavailable,
// the original buffer is returned untouched.
const MAX_SIZE = 4.5 * 1024 * 1024; // 4.5MB
const MAX_DIMENSION = 1200;
async function optimizeImage(buffer, format) {
  const sharp = await getSharp();
  if (!sharp) return buffer;
  const image = sharp(buffer);
  const metadata = await image.metadata();
  let { width, height } = metadata;
  if (width && height) {
    if (width > height && width > MAX_DIMENSION) {
      height = Math.round((height * MAX_DIMENSION) / width);
      width = MAX_DIMENSION;
    } else if (height > MAX_DIMENSION) {
      width = Math.round((width * MAX_DIMENSION) / height);
      height = MAX_DIMENSION;
    }
    image.resize(width, height);
  }
  return image.toFormat(format, { quality: 80 }).toBuffer();
}

// Helper to list local image files. Returns an array of objects
// containing name and url fields compatible with the admin panel.
async function listLocalFiles() {
  await ensureUploadsDir();
  const files = await fs.readdir(UPLOADS_DIR);
  return files.map((name) => ({
    name,
    url: `/uploads/${name}`
  }));
}

// Helper to save a local image. Accepts a filename, a base64 string or
// buffer, and the desired image format. Returns nothing.
async function saveLocalImage(filename, buffer, format) {
  await ensureUploadsDir();
  const optimised = await optimizeImage(buffer, format);
  await fs.writeFile(path.join(UPLOADS_DIR, filename), optimised);
}

// Helper to delete a local image by filename.
async function deleteLocalImage(filename) {
  await ensureUploadsDir();
  const filePath = path.join(UPLOADS_DIR, filename);
  try {
    await fs.unlink(filePath);
  } catch {
    // ignore if file does not exist
  }
}

// Helper to rename or convert a local image. When the new extension
// differs from the old one, the file is loaded, converted to the new
// format, and saved under the new name before deleting the old file.
async function renameLocalImage(oldName, newName) {
  await ensureUploadsDir();
  const oldPath = path.join(UPLOADS_DIR, oldName);
  const newPath = path.join(UPLOADS_DIR, newName);
  const oldExt = oldName.split('.').pop().toLowerCase();
  const newExt = newName.split('.').pop().toLowerCase();
  if (oldExt === newExt) {
    await fs.rename(oldPath, newPath);
    return;
  }
  const buffer = await fs.readFile(oldPath);
  const format = newExt === 'jpg' ? 'jpeg' : newExt || 'jpeg';
  const optimised = await optimizeImage(buffer, format);
  await fs.writeFile(newPath, optimised);
  await fs.unlink(oldPath);
}

// Helper to find a remote ImageKit file by name. When imagekit is
// undefined, this function always returns undefined.
async function findFileByName(name) {
  if (!imagekit) return undefined;
  const files = await imagekit.listFiles({ searchQuery: `name="${name}"` });
  return files[0];
}

// Provide a fetch implementation for Node environments where global
// fetch may not be available (e.g., Node 16). We attempt to import
// node-fetch or use undici. If neither is available, an error is
// thrown which will be caught by the outer handler.
let cachedFetch = null;
async function getFetch() {
  if (cachedFetch) return cachedFetch;
  if (typeof fetch === 'function') {
    cachedFetch = fetch;
    return cachedFetch;
  }
  try {
    const mod = await import('node-fetch');
    cachedFetch = mod.default || mod;
    return cachedFetch;
  } catch {
    try {
      const { fetch: undiciFetch } = await import('undici');
      cachedFetch = undiciFetch;
      return cachedFetch;
    } catch {
      throw new Error('No fetch implementation available');
    }
  }
}

export default async function handler(req, res) {
  const { method, query } = req;
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (method === 'OPTIONS') {
    return res.status(200).end();
  }
  try {
    // Check admin authorization
    const clientIP =
      req.headers['x-forwarded-for'] ||
      req.headers['x-real-ip'] ||
      'unknown';
    const normalizedIP = clientIP.split(',')[0].trim();
    const client = await getRedisClient();
    const adminIPsStr = await client.get('admin_ips');
    const adminIPs = adminIPsStr
      ? JSON.parse(adminIPsStr)
      : ['127.0.0.1', '::1'];
    if (!adminIPs.includes(normalizedIP)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    // GET: list images
    if (method === 'GET') {
      if (imagekit) {
        const files = await imagekit.listFiles({});
        const images = files.map((f) => ({
          name: f.name,
          url: f.url
        }));
        return res.status(200).json(images);
      } else {
        const images = await listLocalFiles();
        return res.status(200).json(images);
      }
    }
    // POST: upload image
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
        return res
          .status(400)
          .json({ error: 'Name and data are required' });
      }
      const base64 = data.split(',')[1] || data;
      let buffer = Buffer.from(base64, 'base64');
      if (buffer.length > MAX_SIZE) {
        return res
          .status(400)
          .json({ error: 'Image exceeds maximum size' });
      }
      const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '');
      const ext = safeName.split('.').pop().toLowerCase();
      const format = ext === 'jpg' ? 'jpeg' : ext || 'jpeg';
      buffer = await optimizeImage(buffer, format);
      if (imagekit) {
        try {
          await imagekit.upload({
            file: buffer,
            fileName: safeName,
            useUniqueFileName: false
          });
        } catch (err) {
          return res
            .status(500)
            .json({ error: 'Failed to save file', details: err.message });
        }
      } else {
        await saveLocalImage(safeName, buffer, format);
      }
      return res.status(200).json({ success: true });
    }
    // DELETE: delete image
    if (method === 'DELETE') {
      const nameParam = Array.isArray(query?.name)
        ? query.name[0]
        : query?.name;
      if (!nameParam) {
        return res.status(400).json({ error: 'Name required' });
      }
      const safeName = decodeURIComponent(nameParam).replace(
        /[^a-zA-Z0-9._-]/g,
        ''
      );
      if (imagekit) {
        const file = await findFileByName(safeName);
        if (!file) {
          return res.status(404).json({ error: 'File not found' });
        }
        await imagekit.deleteFile(file.fileId);
      } else {
        const images = await listLocalFiles();
        const exists = images.some((img) => img.name === safeName);
        if (!exists) {
          return res.status(404).json({ error: 'File not found' });
        }
        await deleteLocalImage(safeName);
      }
      return res.status(200).json({ success: true });
    }
    // PUT: rename image
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
        return res
          .status(400)
          .json({ error: 'Old and new names are required' });
      }
      const safeOld = decodeURIComponent(oldName).replace(
        /[^a-zA-Z0-9._-]/g,
        ''
      );
      const safeNew = newName.replace(/[^a-zA-Z0-9._-]/g, '');
      if (imagekit) {
        const file = await findFileByName(safeOld);
        if (!file) {
          return res.status(404).json({ error: 'File not found' });
        }
        const oldExt = safeOld.split('.').pop().toLowerCase();
        const newExt = safeNew.split('.').pop().toLowerCase();
        if (oldExt === newExt) {
          await imagekit.renameFile(file.fileId, safeNew);
        } else {
          const fetchImpl = await getFetch();
          const response = await fetchImpl(file.url);
          const arrayBuffer = await response.arrayBuffer();
          let buf = Buffer.from(arrayBuffer);
          const format = newExt === 'jpg' ? 'jpeg' : newExt || 'jpeg';
          buf = await optimizeImage(buf, format);
          await imagekit.upload({
            file: buf,
            fileName: safeNew,
            useUniqueFileName: false
          });
          await imagekit.deleteFile(file.fileId);
        }
      } else {
        const images = await listLocalFiles();
        const exists = images.some((img) => img.name === safeOld);
        if (!exists) {
          return res.status(404).json({ error: 'File not found' });
        }
        await renameLocalImage(safeOld, safeNew);
      }
      return res.status(200).json({ success: true });
    }
    // Unhandled method
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}