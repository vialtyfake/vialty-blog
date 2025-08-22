import { kv } from '@vercel/kv';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check if admin
  const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const normalizedIP = clientIP?.replace(/^::ffff:/, '') || '';
  const adminIPs = await kv.get('admin_ips') || ['127.0.0.1', '::1'];
  
  if (!adminIPs.includes(normalizedIP)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    if (req.method === 'GET') {
      const ips = await kv.get('admin_ips_list') || [];
      return res.status(200).json(ips);
    }

    if (req.method === 'POST') {
      const { ip_address, name } = req.body;
      
      // Add to admin IPs
      const currentIPs = await kv.get('admin_ips') || ['127.0.0.1', '::1'];
      if (!currentIPs.includes(ip_address)) {
        currentIPs.push(ip_address);
        await kv.set('admin_ips', currentIPs);
      }

      // Add to detailed list
      const ipsList = await kv.get('admin_ips_list') || [];
      const newIP = {
        id: uuidv4(),
        ip_address,
        name: name || 'Admin',
        created_at: new Date().toISOString(),
        is_active: true
      };
      ipsList.push(newIP);
      await kv.set('admin_ips_list', ipsList);

      return res.status(201).json(newIP);
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      
      // Remove from detailed list
      const ipsList = await kv.get('admin_ips_list') || [];
      const ipToRemove = ipsList.find(ip => ip.id === id);
      
      if (ipToRemove) {
        // Remove from admin IPs
        const currentIPs = await kv.get('admin_ips') || [];
        const filteredIPs = currentIPs.filter(ip => ip !== ipToRemove.ip_address);
        await kv.set('admin_ips', filteredIPs);
        
        // Remove from list
        const filteredList = ipsList.filter(ip => ip.id !== id);
        await kv.set('admin_ips_list', filteredList);
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}