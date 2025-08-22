import { getRedisClient } from './_redis.js';

export default async function handler(req, res) {
  const { method, query } = req;
  let client;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Check if admin
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
      // Get detailed admin IPs list
      const detailedListStr = await client.get('admin_ips_detailed');
      const detailedList = detailedListStr ? JSON.parse(detailedListStr) : [];
      return res.status(200).json(detailedList);
    }

    if (method === 'POST') {
      // Add new admin IP
      const { ip_address, name } = req.body;
      
      // Add to simple list
      if (!adminIPs.includes(ip_address)) {
        adminIPs.push(ip_address);
        await client.set('admin_ips', JSON.stringify(adminIPs));
      }

      // Add to detailed list
      const detailedListStr = await client.get('admin_ips_detailed');
      const detailedList = detailedListStr ? JSON.parse(detailedListStr) : [];
      
      const newIP = {
        id: Date.now().toString(),
        ip_address,
        name: name || 'Admin',
        created_at: new Date().toISOString(),
        is_active: true
      };
      
      detailedList.push(newIP);
      await client.set('admin_ips_detailed', JSON.stringify(detailedList));

      return res.status(201).json(newIP);
    }

    if (method === 'DELETE' && query.id) {
      // Remove admin IP
      const detailedListStr = await client.get('admin_ips_detailed');
      const detailedList = detailedListStr ? JSON.parse(detailedListStr) : [];
      
      const ipToRemove = detailedList.find(ip => ip.id === query.id);
      if (ipToRemove) {
        // Remove from simple list
        const filteredIPs = adminIPs.filter(ip => ip !== ipToRemove.ip_address);
        await client.set('admin_ips', JSON.stringify(filteredIPs));
        
        // Remove from detailed list
        const filteredList = detailedList.filter(ip => ip.id !== query.id);
        await client.set('admin_ips_detailed', JSON.stringify(filteredList));
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