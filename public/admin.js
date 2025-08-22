// Admin Dashboard JavaScript
class AdminDashboard {
    constructor() {
        this.currentSection = 'posts';
        this.posts = [];
        this.adminIPs = [];
        this.isAdmin = false;
        this.userIP = '';
        
        this.init();
    }

    async init() {
        // Check admin access
        const accessGranted = await this.checkAdminAccess();
        
        if (!accessGranted) {
            this.showAccessDenied();
            return;
        }
        
        // Show dashboard
        document.getElementById('accessCheck').style.display = 'none';
        document.getElementById('adminDashboard').style.display = 'flex';
        
        // Initialize dashboard
        this.setupEventListeners();
        this.loadPosts();
        this.loadAdminIPs();
        this.updateStats();
    }

    async checkAdminAccess() {
        try {
            const response = await fetch('/api/admin-check'); // Updated endpoint
            const data = await response.json();
            
            this.isAdmin = data.isAdmin;
            this.userIP = data.ip;
            
            if (this.isAdmin) {
                document.getElementById('adminIP').textContent = this.userIP;
            }
            
            return this.isAdmin;
        } catch (error) {
            console.error('Error checking admin access:', error);
            return false;
        }
    }

    showAccessDenied() {
        document.getElementById('accessCheck').style.display = 'none';
        document.getElementById('accessDenied').style.display = 'flex';
        document.getElementById('userIP').textContent = this.userIP;
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item[data-section]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchSection(item.dataset.section);
            });
        });

        // Posts
        document.getElementById('newPostBtn').addEventListener('click', () => {
            this.openPostModal();
        });

        document.getElementById('postForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.savePost();
        });

        document.getElementById('closePostModal').addEventListener('click', () => {
            this.closeModal('postModal');
        });

        document.getElementById('cancelPost').addEventListener('click', () => {
            this.closeModal('postModal');
        });

        // IPs
        document.getElementById('addIPBtn').addEventListener('click', () => {
            this.openIPModal();
        });

        document.getElementById('ipForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveIP();
        });

        document.getElementById('closeIPModal').addEventListener('click', () => {
            this.closeModal('ipModal');
        });

        document.getElementById('cancelIP').addEventListener('click', () => {
            this.closeModal('ipModal');
        });

        // Close modals on outside click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
    }

    switchSection(section) {
        // Update nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.content-section').forEach(s => {
            s.classList.remove('active');
        });
        document.getElementById(`${section}Section`).classList.add('active');

        this.currentSection = section;
    }

    async loadPosts() {
        try {
            const response = await fetch('/api/admin-posts'); // Updated endpoint
            this.posts = await response.json();
            this.renderPosts();
            this.updateStats();
        } catch (error) {
            console.error('Error loading posts:', error);
            this.showNotification('Failed to load posts', 'error');
        }
    }

    renderPosts() {
        const tbody = document.getElementById('postsTableBody');
        
        if (this.posts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 40px; color: var(--admin-text-secondary);">
                        No posts yet. Create your first post!
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.posts.map(post => {
            let tags = [];
            try {
                tags = typeof post.tags === 'string' ? JSON.parse(post.tags) : post.tags || [];
            } catch {
                tags = [];
            }
            
            const date = new Date(post.created_at).toLocaleDateString();
            const status = post.is_published ? 'published' : 'draft';
            
            return `
                <tr>
                    <td>
                        <div>
                            <div style="font-weight: 600;">${this.escapeHtml(post.title)}</div>
                            <div style="font-size: 12px; color: var(--admin-text-secondary); margin-top: 5px;">
                                ${tags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join(' ')}
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="status-badge ${status}">${status.toUpperCase()}</span>
                    </td>
                    <td>${date}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-icon edit" onclick="adminDashboard.editPost('${post.id}')" title="Edit">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M11.333 2A1.886 1.886 0 0114 4.667l-9 9-3.667 1 1-3.667 9-9z" stroke="currentColor" stroke-width="1.5"/>
                                </svg>
                            </button>
                            <button class="btn-icon delete" onclick="adminDashboard.deletePost('${post.id}')" title="Delete">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M2 4h12M5.333 4V2.667a1.333 1.333 0 011.334-1.334h2.666a1.333 1.333 0 011.334 1.334V4m2 0v9.333a1.333 1.333 0 01-1.334 1.334H4.667a1.333 1.333 0 01-1.334-1.334V4h9.334z" stroke="currentColor" stroke-width="1.5"/>
                                </svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    updateStats() {
        const total = this.posts.length;
        const published = this.posts.filter(p => p.is_published).length;
        const drafts = total - published;

        document.getElementById('totalPosts').textContent = total;
        document.getElementById('publishedPosts').textContent = published;
        document.getElementById('draftPosts').textContent = drafts;
    }

    openPostModal(postId = null) {
        const modal = document.getElementById('postModal');
        const form = document.getElementById('postForm');
        
        if (postId) {
            const post = this.posts.find(p => p.id === postId);
            if (post) {
                document.getElementById('modalTitle').textContent = 'Edit Post';
                document.getElementById('postId').value = post.id;
                document.getElementById('postTitle').value = post.title;
                document.getElementById('postContent').value = post.content;
                
                let tags = [];
                try {
                    tags = typeof post.tags === 'string' ? JSON.parse(post.tags) : post.tags || [];
                } catch {
                    tags = [];
                }
                document.getElementById('postTags').value = tags.join(', ');
                document.getElementById('postPublished').checked = post.is_published;
            }
        } else {
            document.getElementById('modalTitle').textContent = 'Create New Post';
            form.reset();
            document.getElementById('postId').value = '';
        }
        
        modal.classList.add('active');
    }

    async savePost() {
        const postId = document.getElementById('postId').value;
        const title = document.getElementById('postTitle').value;
        const content = document.getElementById('postContent').value;
        const tagsInput = document.getElementById('postTags').value;
        const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()) : [];
        const is_published = document.getElementById('postPublished').checked;

        const postData = { title, content, tags, is_published };

        try {
            if (postId) {
                // Update existing post
                const response = await fetch(`/api/admin-posts?id=${postId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(postData)
                });

                if (response.ok) {
                    this.showNotification('Post updated successfully', 'success');
                    this.closeModal('postModal');
                    this.loadPosts();
                } else {
                    const error = await response.json();
                    this.showNotification(error.error || 'Failed to update post', 'error');
                }
            } else {
                // Create new post
                const response = await fetch('/api/posts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(postData)
                });

                if (response.ok) {
                    this.showNotification('Post created successfully', 'success');
                    this.closeModal('postModal');
                    this.loadPosts();
                } else {
                    const error = await response.json();
                    this.showNotification(error.error || 'Failed to create post', 'error');
                }
            }
        } catch (error) {
            console.error('Error saving post:', error);
            this.showNotification('Failed to save post', 'error');
        }
    }

    editPost(postId) {
        this.openPostModal(postId);
    }

    async deletePost(postId) {
        if (!confirm('Are you sure you want to delete this post?')) {
            return;
        }

        try {
            const response = await fetch(`/api/admin-posts?id=${postId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.showNotification('Post deleted successfully', 'success');
                this.loadPosts();
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Failed to delete post', 'error');
            }
        } catch (error) {
            console.error('Error deleting post:', error);
            this.showNotification('Failed to delete post', 'error');
        }
    }

    async loadAdminIPs() {
        try {
            const response = await fetch('/api/admin-ips'); // Updated endpoint
            this.adminIPs = await response.json();
            this.renderAdminIPs();
        } catch (error) {
            console.error('Error loading admin IPs:', error);
            this.showNotification('Failed to load admin IPs', 'error');
        }
    }

    renderAdminIPs() {
        const tbody = document.getElementById('ipsTableBody');
        
        if (this.adminIPs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: var(--admin-text-secondary);">
                        No admin IPs configured
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.adminIPs.map(ip => {
            const date = new Date(ip.created_at).toLocaleDateString();
            const status = ip.is_active ? 'active' : 'inactive';
            
            return `
                <tr>
                    <td style="font-family: monospace;">${this.escapeHtml(ip.ip_address)}</td>
                    <td>${this.escapeHtml(ip.name || 'N/A')}</td>
                    <td>
                        <span class="status-badge ${status}">${status.toUpperCase()}</span>
                    </td>
                    <td>${date}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-icon edit" onclick="adminDashboard.toggleIPStatus('${ip.id}')" title="Toggle Status">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/>
                                    <path d="M8 5v3l2 2" stroke="currentColor" stroke-width="1.5"/>
                                </svg>
                            </button>
                            <button class="btn-icon delete" onclick="adminDashboard.deleteIP('${ip.id}')" title="Delete">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M2 4h12M5.333 4V2.667a1.333 1.333 0 011.334-1.334h2.666a1.333 1.333 0 011.334 1.334V4m2 0v9.333a1.333 1.333 0 01-1.334 1.334H4.667a1.333 1.333 0 01-1.334-1.334V4h9.334z" stroke="currentColor" stroke-width="1.5"/>
                                </svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    openIPModal() {
        document.getElementById('ipForm').reset();
        document.getElementById('ipModal').classList.add('active');
    }

    async saveIP() {
        const ip_address = document.getElementById('ipAddress').value;
        const name = document.getElementById('ipName').value;

        try {
            const response = await fetch('/api/admin-ips', { // Updated endpoint
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip_address, name })
            });

            if (response.ok) {
                this.showNotification('Admin IP added successfully', 'success');
                this.closeModal('ipModal');
                this.loadAdminIPs();
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Failed to add IP', 'error');
            }
        } catch (error) {
            console.error('Error adding IP:', error);
            this.showNotification('Failed to add IP', 'error');
        }
    }

    async toggleIPStatus(ipId) {
        try {
            // For Vercel, we'll need to implement this differently
            // Since we can't easily toggle, we'll just reload the list
            this.showNotification('IP status toggle not available in this version', 'info');
            this.loadAdminIPs();
        } catch (error) {
            console.error('Error toggling IP status:', error);
            this.showNotification('Failed to update IP status', 'error');
        }
    }

    async deleteIP(ipId) {
        if (!confirm('Are you sure you want to delete this admin IP?')) {
            return;
        }

        try {
            const response = await fetch(`/api/admin-ips?id=${ipId}`, { // Updated endpoint with query param
                method: 'DELETE'
            });

            if (response.ok) {
                this.showNotification('Admin IP deleted successfully', 'success');
                this.loadAdminIPs();
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Failed to delete IP', 'error');
            }
        } catch (error) {
            console.error('Error deleting IP:', error);
            this.showNotification('Failed to delete IP', 'error');
        }
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existing = document.querySelector('.notification');
        if (existing) {
            existing.remove();
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            background: ${type === 'success' ? 'var(--admin-success)' : type === 'error' ? 'var(--admin-danger)' : 'var(--admin-primary)'};
            color: white;
            border-radius: 10px;
            font-weight: 500;
            z-index: 9999;
            animation: slideIn 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
}

// Initialize dashboard
const adminDashboard = new AdminDashboard();

// Add animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .tag {
        display: inline-block;
        padding: 2px 8px;
        background: rgba(0, 212, 255, 0.1);
        border: 1px solid rgba(0, 212, 255, 0.3);
        border-radius: 12px;
        font-size: 11px;
        color: var(--admin-primary);
        margin-right: 5px;
    }
`;
document.head.appendChild(style);