export default async function handler(req, res) {
  // Get client IP
  const clientIP = req.headers['x-forwarded-for'] || 
                   req.headers['x-real-ip'] || 
                   req.connection?.remoteAddress || 
                   'unknown';
  
  const normalizedIP = clientIP.split(',')[0].trim();
  
  // For now, just return the IP so you can see what it is
  // Once you know your IP, you can add it to the admin list
  const adminIPs = [
    '127.0.0.1',
    '::1',
    '185.135.181.172',
    // Add your actual IP here after you see it
  ];
  
  const isAdmin = adminIPs.includes(normalizedIP);
  
  res.status(200).json({ 
    isAdmin, 
    ip: normalizedIP,
    message: 'Simple version without database'
  });
}