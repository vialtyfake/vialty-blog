export const config = {
  runtime: 'edge',
};

import { kv } from '@vercel/kv';

export default async function handler(request) {
  const clientIP = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
  
  const normalizedIP = clientIP.split(',')[0].trim();
  
  // Initialize admin IPs if not exists
  let adminIPs = await kv.get('admin_ips');
  if (!adminIPs) {
    // Set default admin IPs (add your own IP here)
    adminIPs = [
      '127.0.0.1',
      '::1',
      // Add your IP here after checking what it is
    ];
    await kv.set('admin_ips', adminIPs);
  }
  
  const isAdmin = adminIPs.includes(normalizedIP);
  
  return new Response(JSON.stringify({ isAdmin, ip: normalizedIP }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}