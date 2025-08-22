import { kv } from '@vercel/kv';

export default async function handler(request) {
  try {
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    const normalizedIP = clientIP.split(',')[0].trim();
    
    // Initialize admin IPs if not exists
    let adminIPs = await kv.get('admin_ips');
    if (!adminIPs) {
      // Set default admin IPs (add your own IP here after seeing it)
      adminIPs = [
        '127.0.0.1',
        '::1'
      ];
      await kv.set('admin_ips', adminIPs);
    }
    
    const isAdmin = adminIPs.includes(normalizedIP);
    
    return new Response(JSON.stringify({ isAdmin, ip: normalizedIP }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
    });
  } catch (error) {
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

export const config = {
  runtime: 'edge',
};