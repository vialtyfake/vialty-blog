import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const normalizedIP = clientIP?.replace(/^::ffff:/, '') || '';
  
  const adminIPs = await kv.get('admin_ips') || ['127.0.0.1', '::1'];
  const isAdmin = adminIPs.includes(normalizedIP);
  
  return res.status(200).json({ isAdmin, ip: normalizedIP });
}