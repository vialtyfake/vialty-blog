import { kv } from '@vercel/kv';

export default async function handler(request) {
  const url = new URL(request.url);
  const method = request.method;
  const ipId = url.searchParams.get('id');

  // Handle CORS
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  try {
    // Check if admin
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    const adminIPs = await kv.get('admin_ips') || ['127.0.0.1', '::1'];
    const normalizedIP = clientIP.split(',')[0].trim();
    
    if (!adminIPs.includes(normalizedIP)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
      });
    }

    if (method === 'GET') {
      // Get admin IPs list with details
      const ipsList = await kv.get('admin_ips_list') || [];
      return new Response(JSON.stringify(ipsList), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
      });
    }

    if (method === 'POST') {
      // Add new admin IP
      const body = await request.json();
      const { ip_address, name } = body;
      
      // Add to simple list
      const currentIPs = await kv.get('admin_ips') || ['127.0.0.1', '::1'];
      if (!currentIPs.includes(ip_address)) {
        currentIPs.push(ip_address);
        await kv.set('admin_ips', currentIPs);
      }

      // Add to detailed list
      const ipsList = await kv.get('admin_ips_list') || [];
      const newIP = {
        id: crypto.randomUUID(),
        ip_address,
        name: name || 'Admin',
        created_at: new Date().toISOString(),
        is_active: true,
      };
      ipsList.push(newIP);
      await kv.set('admin_ips_list', ipsList);

      return new Response(JSON.stringify(newIP), {
        status: 201,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
      });
    }

    if (method === 'DELETE' && ipId) {
      // Remove admin IP
      const ipsList = await kv.get('admin_ips_list') || [];
      const ipToRemove = ipsList.find(ip => ip.id === ipId);
      
      if (ipToRemove) {
        // Remove from simple list
        const currentIPs = await kv.get('admin_ips') || [];
        const filteredIPs = currentIPs.filter(ip => ip !== ipToRemove.ip_address);
        await kv.set('admin_ips', filteredIPs);
        
        // Remove from detailed list
        const filteredList = ipsList.filter(ip => ip.id !== ipId);
        await kv.set('admin_ips_list', filteredList);
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
    });
  } catch (error) {
    console.error('API Error:', error);
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