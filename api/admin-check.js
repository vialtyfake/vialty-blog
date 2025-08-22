import { createClient } from 'redis';

export default async function handler(request) {
  let client;
  
  try {
    // Create Redis client using your REDIS_URL
    client = createClient({
      url: process.env.REDIS_URL || 'redis://default:M4L4KWbQF8Vu9ERqYtTfJji9gugjPfuh@redis-11404.c300.eu-central-1-1.ec2.redns.redis-cloud.com:11404'
    });
    
    client.on('error', err => console.log('Redis Client Error', err));
    
    await client.connect();
    
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    const normalizedIP = clientIP.split(',')[0].trim();
    
    // Get admin IPs from Redis
    let adminIPsStr = await client.get('admin_ips');
    let adminIPs = adminIPsStr ? JSON.parse(adminIPsStr) : ['127.0.0.1', '::1'];
    
    // Initialize if not exists
    if (!adminIPsStr) {
      await client.set('admin_ips', JSON.stringify(adminIPs));
    }
    
    const isAdmin = adminIPs.includes(normalizedIP);
    
    await client.quit();
    
    return new Response(JSON.stringify({ isAdmin, ip: normalizedIP }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
    });
  } catch (error) {
    if (client) {
      try {
        await client.quit();
      } catch (e) {
        console.error('Error closing Redis connection:', e);
      }
    }
    console.error('Error in admin-check:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
    });
  }
}