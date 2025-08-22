const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Database initialization
const db = new sqlite3.Database('./blog.db');

// Create tables if they don't exist
db.serialize(() => {
    // Blog posts table
    db.run(`CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT,
        author_ip TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_published BOOLEAN DEFAULT 1
    )`);

    // Admin IPs table
    db.run(`CREATE TABLE IF NOT EXISTS admin_ips (
        id TEXT PRIMARY KEY,
        ip_address TEXT UNIQUE NOT NULL,
        name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1
    )`);

    // Admin sessions table
    db.run(`CREATE TABLE IF NOT EXISTS admin_sessions (
        id TEXT PRIMARY KEY,
        ip_address TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Add default admin IP (localhost for development)
    const defaultAdminIP = '::1'; // IPv6 localhost
    const defaultAdminIPv4 = '127.0.0.1'; // IPv4 localhost
    
    db.run(`INSERT OR IGNORE INTO admin_ips (id, ip_address, name) VALUES (?, ?, ?)`,
        [uuidv4(), defaultAdminIP, 'Local Admin IPv6']);
    db.run(`INSERT OR IGNORE INTO admin_ips (id, ip_address, name) VALUES (?, ?, ?)`,
        [uuidv4(), defaultAdminIPv4, 'Local Admin IPv4']);
});

// Utility functions
function getClientIP(req) {
    return req.headers['x-forwarded-for'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null);
}

function isAdminIP(ip) {
    return new Promise((resolve, reject) => {
        // Normalize IP address
        const normalizedIP = ip.replace(/^::ffff:/, '');
        
        db.get(
            `SELECT * FROM admin_ips WHERE ip_address = ? AND is_active = 1`,
            [normalizedIP],
            (err, row) => {
                if (err) reject(err);
                else resolve(!!row);
            }
        );
    });
}

// Middleware to check admin access
async function requireAdmin(req, res, next) {
    const clientIP = getClientIP(req);
    const normalizedIP = clientIP.replace(/^::ffff:/, '');
    
    try {
        const isAdmin = await isAdminIP(normalizedIP);
        if (!isAdmin) {
            return res.status(403).json({ error: 'Access denied. IP not authorized.' });
        }
        req.isAdmin = true;
        req.clientIP = normalizedIP;
        next();
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
}

// API Routes

// Check admin status - FIXED ENDPOINT
app.get('/api/admin-check', async (req, res) => {
    const clientIP = getClientIP(req);
    const normalizedIP = clientIP.replace(/^::ffff:/, '');
    
    try {
        const isAdmin = await isAdminIP(normalizedIP);
        res.json({ isAdmin, ip: normalizedIP });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Search posts
app.get('/api/search', (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.json([]);
    }
    
    db.all(
        `SELECT * FROM posts 
         WHERE is_published = 1 
         AND (title LIKE ? OR content LIKE ? OR tags LIKE ?)
         ORDER BY created_at DESC
         LIMIT 10`,
        [`%${query}%`, `%${query}%`, `%${query}%`],
        (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json(rows);
            }
        }
    );
});

// Get all published posts (public)
app.get('/api/posts', (req, res) => {
    db.all(
        `SELECT * FROM posts WHERE is_published = 1 ORDER BY created_at DESC`,
        [],
        (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json(rows);
            }
        }
    );
});

// Get single post (public)
app.get('/api/posts/:id', (req, res) => {
    db.get(
        `SELECT * FROM posts WHERE id = ? AND is_published = 1`,
        [req.params.id],
        (err, row) => {
            if (err) {
                res.status(500).json({ error: err.message });
            } else if (!row) {
                res.status(404).json({ error: 'Post not found' });
            } else {
                res.json(row);
            }
        }
    );
});

// Create new post (admin only)
app.post('/api/posts', requireAdmin, (req, res) => {
    const { title, content, tags } = req.body;
    const id = uuidv4();
    
    db.run(
        `INSERT INTO posts (id, title, content, tags, author_ip) VALUES (?, ?, ?, ?, ?)`,
        [id, title, content, JSON.stringify(tags || []), req.clientIP],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json({ id, title, content, tags, created_at: new Date() });
            }
        }
    );
});

// Update post (admin only)
app.put('/api/posts/:id', requireAdmin, (req, res) => {
    const { title, content, tags, is_published } = req.body;
    
    db.run(
        `UPDATE posts SET title = ?, content = ?, tags = ?, is_published = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [title, content, JSON.stringify(tags || []), is_published !== false ? 1 : 0, req.params.id],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else if (this.changes === 0) {
                res.status(404).json({ error: 'Post not found' });
            } else {
                res.json({ success: true });
            }
        }
    );
});

// Delete post (admin only)
app.delete('/api/posts/:id', requireAdmin, (req, res) => {
    db.run(
        `DELETE FROM posts WHERE id = ?`,
        [req.params.id],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else if (this.changes === 0) {
                res.status(404).json({ error: 'Post not found' });
            } else {
                res.json({ success: true });
            }
        }
    );
});

// Get all admin IPs (admin only) - FIXED ENDPOINT
app.get('/api/admin-ips', requireAdmin, (req, res) => {
    db.all(
        `SELECT * FROM admin_ips ORDER BY created_at DESC`,
        [],
        (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json(rows);
            }
        }
    );
});

// Add admin IP (admin only) - FIXED ENDPOINT
app.post('/api/admin-ips', requireAdmin, (req, res) => {
    const { ip_address, name } = req.body;
    const id = uuidv4();
    
    db.run(
        `INSERT INTO admin_ips (id, ip_address, name) VALUES (?, ?, ?)`,
        [id, ip_address, name || 'Admin'],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    res.status(400).json({ error: 'IP address already exists' });
                } else {
                    res.status(500).json({ error: err.message });
                }
            } else {
                res.json({ id, ip_address, name });
            }
        }
    );
});

// Delete admin IP (admin only) - FIXED ENDPOINT
app.delete('/api/admin-ips', requireAdmin, (req, res) => {
    const { id } = req.query;
    
    db.run(
        `DELETE FROM admin_ips WHERE id = ?`,
        [id],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else if (this.changes === 0) {
                res.status(404).json({ error: 'IP not found' });
            } else {
                res.json({ success: true });
            }
        }
    );
});

// Get all posts for admin (including unpublished) - FIXED ENDPOINT
app.get('/api/admin-posts', requireAdmin, (req, res) => {
    const { id } = req.query;
    
    if (id) {
        // Get single post for editing
        db.get(
            `SELECT * FROM posts WHERE id = ?`,
            [id],
            (err, row) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                } else if (!row) {
                    res.status(404).json({ error: 'Post not found' });
                } else {
                    res.json(row);
                }
            }
        );
    } else {
        // Get all posts
        db.all(
            `SELECT * FROM posts ORDER BY created_at DESC`,
            [],
            (err, rows) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                } else {
                    res.json(rows);
                }
            }
        );
    }
});

// Update post (admin only) - FIXED ENDPOINT
app.put('/api/admin-posts', requireAdmin, (req, res) => {
    const { id } = req.query;
    const { title, content, tags, is_published } = req.body;
    
    db.run(
        `UPDATE posts SET title = ?, content = ?, tags = ?, is_published = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [title, content, JSON.stringify(tags || []), is_published !== false ? 1 : 0, id],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else if (this.changes === 0) {
                res.status(404).json({ error: 'Post not found' });
            } else {
                res.json({ success: true });
            }
        }
    );
});

// Delete post (admin only) - FIXED ENDPOINT
app.delete('/api/admin-posts', requireAdmin, (req, res) => {
    const { id } = req.query;
    
    db.run(
        `DELETE FROM posts WHERE id = ?`,
        [id],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else if (this.changes === 0) {
                res.status(404).json({ error: 'Post not found' });
            } else {
                res.json({ success: true });
            }
        }
    );
});

// Page Routes - MUST COME BEFORE STATIC FILES
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'about.html'));
});

// Serve static files AFTER specific routes
app.use(express.static(path.join(__dirname)));

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`Admin panel at http://localhost:${PORT}/admin`);
    console.log(`About page at http://localhost:${PORT}/about`);
});