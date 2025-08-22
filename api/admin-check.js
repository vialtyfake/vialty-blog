import { getRedisClient } from './_redis.js';

export default async function handler(req, res) {
  let client;
  
  try {
    const clientIP = req.headers['x-forwarded-for'] || 
                     req.headers['x-real-ip'] || 
                     req.connection?.remoteAddress || 
                     'unknown';
    
    const normalizedIP = clientIP.split(',')[0].trim();
    
    // Try to get admin IPs from Redis
    try {
      client = await getRedisClient();
      let adminIPsStr = await client.get('admin_ips');
      
      if (!adminIPsStr) {
        // Initialize with default IPs (add your IP here!)
        const defaultAdminIPs = [
          '127.0.0.1',
          '::1',
          '185.135.181.172',
        ];
        await client.set('admin_ips', JSON.stringify(defaultAdminIPs));
        adminIPsStr = JSON.stringify(defaultAdminIPs);
      }
      
      const adminIPs = JSON.parse(adminIPsStr);
      const isAdmin = adminIPs.includes(normalizedIP);
      
      res.status(200).json({ 
        isAdmin, 
        ip: normalizedIP,
        source: 'redis'
      });
    } catch (redisError) {
      // Fallback to hardcoded IPs if Redis fails
      console.error('Redis error:', redisError);
      const fallbackAdminIPs = ['127.0.0.1', '::1']; // Add your IP here too
      const isAdmin = fallbackAdminIPs.includes(normalizedIP);
      
      res.status(200).json({ 
        isAdmin, 
        ip: normalizedIP,
        source: 'fallback',
        error: redisError.message
      });
    }
  } catch (error) {
    console.error('Error in admin-check:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}