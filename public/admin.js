// Admin state
let isAdmin = false;
let currentUserIP = '';
let posts = [];
let adminIPs = [];
let projects = [];
let projectImages = [];
let images = [];

function resolveImageUrl(image) {
  if (!image) return '';
  if (image.startsWith('http')) return image;
  if (image.startsWith('/')) return image;
  return `/uploads/${image}`;
}

// Initialize admin panel
document.addEventListener('DOMContentLoaded', async () => {
    await checkAdminAccess();
});

// Check if user has admin access
async function checkAdminAccess() {
    try {
        const response = await fetch('/api/admin-check');
        const data = await response.json();
        
        isAdmin = data.isAdmin;
        currentUserIP = data.ip;
        
        // Update UI based on access
        document.getElementById('accessCheck').style.display = 'none';
        
        if (isAdmin) {
            // Show admin dashboard
            document.getElementById('adminDashboard').style.display = 'flex';
            document.getElementById('adminIP').textContent = currentUserIP;
            
            // Initialize dashboard
            initializeDashboard();
            await loadPosts();
            await loadProjects();
            await loadImages();
            await loadAdminIPs();
        } else {
            // Show access denied
            document.getElementById('accessDenied').style.display = 'flex';
            document.getElementById('userIP').textContent = currentUserIP;
        }
    } catch (error) {
        console.error('Error checking admin access:', error);
        // Show access denied on error
        document.getElementById('accessCheck').style.display = 'none';
        document.getElementById('accessDenied').style.display = 'flex';
        document.getElementById('userIP').textContent = 'Unable to verify';
    }
}

// Initialize dashboard
function initializeDashboard() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    const closeSidebar = () => {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
        document.body.classList.remove('sidebar-open');
        sidebarToggle.setAttribute('aria-expanded', 'false');
    };

    sidebarToggle.addEventListener('click', () => {
        const isActive = sidebar.classList.toggle('active');
        sidebarOverlay.classList.toggle('active', isActive);
        document.body.classList.toggle('sidebar-open', isActive);
        sidebarToggle.setAttribute('aria-expanded', String(isActive));
    });

    sidebarOverlay.addEventListener('click', closeSidebar);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar.classList.contains('active')) {
            closeSidebar();
        }
    });

    // Navigation
    document.querySelectorAll('.nav-item[data-section]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            switchSection(section);
            if (window.innerWidth <= 1024) {
                closeSidebar();
            }
        });
    });

    // Post modal
    document.getElementById('newPostBtn').addEventListener('click', () => {
        openPostModal();
    });
    
    document.getElementById('closePostModal').addEventListener('click', () => {
        closePostModal();
    });
    
    document.getElementById('cancelPost').addEventListener('click', () => {
        closePostModal();
    });
    
    document.getElementById('postForm').addEventListener('submit', handlePostSubmit);

    // Project modal
    document.getElementById('newProjectBtn').addEventListener('click', () => {
        openProjectModal();
    });
    document.getElementById('closeProjectModal').addEventListener('click', () => {
        closeProjectModal();
    });
    document.getElementById('cancelProject').addEventListener('click', () => {
        closeProjectModal();
    });
    document.getElementById('projectForm').addEventListener('submit', handleProjectSubmit);

    // Image modal
    document.getElementById('newImageBtn').addEventListener('click', () => {
        openImageModal();
    });
    document.getElementById('closeImageModal').addEventListener('click', () => {
        closeImageModal();
    });
    document.getElementById('cancelImage').addEventListener('click', () => {
        closeImageModal();
    });
    document.getElementById('imageForm').addEventListener('submit', handleImageSubmit);

    document.getElementById('closeRenameModal').addEventListener('click', () => {
        closeRenameModal();
    });
    document.getElementById('cancelRename').addEventListener('click', () => {
        closeRenameModal();
    });
    document.getElementById('renameForm').addEventListener('submit', handleRenameSubmit);

    // IP modal
    document.getElementById('addIPBtn').addEventListener('click', () => {
        openIPModal();
    });
    
    document.getElementById('closeIPModal').addEventListener('click', () => {
        closeIPModal();
    });
    
    document.getElementById('cancelIP').addEventListener('click', () => {
        closeIPModal();
    });
    
    document.getElementById('ipForm').addEventListener('submit', handleIPSubmit);
}

// Switch between sections
function switchSection(section) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`.nav-item[data-section="${section}"]`).classList.add('active');
    
    // Update content
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.remove('active');
    });
    
    if (section === 'posts') {
        document.getElementById('postsSection').classList.add('active');
    } else if (section === 'projects') {
        document.getElementById('projectsSection').classList.add('active');
    } else if (section === 'images') {
        document.getElementById('imagesSection').classList.add('active');
        loadImages();
    } else if (section === 'ips') {
        document.getElementById('ipsSection').classList.add('active');
    }
}

// Load posts
async function loadPosts() {
    try {
        const response = await fetch('/api/admin-posts');
        if (!response.ok) throw new Error('Failed to load posts');
        
        posts = await response.json();
        
        const tbody = document.getElementById('postsTableBody');
        tbody.innerHTML = '';
        
        let totalCount = 0;
        let publishedCount = 0;
        let draftCount = 0;
        
        if (posts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 2rem; color: #999;">
                        No posts yet. Click "New Post" to create your first post.
                    </td>
                </tr>
            `;
        } else {
            posts.forEach(post => {
                totalCount++;
                if (post.is_published !== false) {
                    publishedCount++;
                } else {
                    draftCount++;
                }
                
                let tags = [];
                try {
                    tags = JSON.parse(post.tags || '[]');
                } catch (e) {
                    tags = [];
                }
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="post-title-cell">
                        <div class="post-title">${escapeHtml(post.title)}</div>
                        <div class="post-excerpt">${escapeHtml(post.content.substring(0, 100))}...</div>
                    </td>
                    <td>
                        <span class="status-badge ${post.is_published !== false ? 'published' : 'draft'}">
                            ${post.is_published !== false ? 'Published' : 'Draft'}
                        </span>
                    </td>
                    <td>
                        <div class="tags-cell">
                            ${tags.map(tag => `<span class="tag-badge">${escapeHtml(tag)}</span>`).join('')}
                        </div>
                    </td>
                    <td>${new Date(post.created_at).toLocaleDateString()}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-icon" onclick="editPost('${post.id}')" title="Edit">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M11.333 2A1.886 1.886 0 0114 4.667l-9 9-3.667 1 1-3.667 9-9z" 
                                          stroke="currentColor" stroke-width="1.5"/>
                                </svg>
                            </button>
                            <button class="btn-icon delete" onclick="deletePost('${post.id}')" title="Delete">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M2 4h12M5.333 4V2.667a1.333 1.333 0 011.334-1.334h2.666a1.333 1.333 0 011.334 1.334V4m2 0v9.333a1.333 1.333 0 01-1.334 1.334H4.667a1.333 1.333 0 01-1.334-1.334V4h9.334z" 
                                          stroke="currentColor" stroke-width="1.5"/>
                                </svg>
                            </button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
        
        // Update stats
        document.getElementById('totalPosts').textContent = totalCount;
        document.getElementById('publishedPosts').textContent = publishedCount;
        document.getElementById('draftPosts').textContent = draftCount;
        
    } catch (error) {
        console.error('Error loading posts:', error);
        showNotification('Failed to load posts', 'error');
    }
}

// Load projects
async function loadProjects() {
    try {
        const response = await fetch('/api/admin-projects');
        if (!response.ok) throw new Error('Failed to load projects');

        projects = await response.json();
        const tbody = document.getElementById('projectsTableBody');
        tbody.innerHTML = '';

        if (projects.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="5" style="text-align:center;padding:20px;color:var(--admin-text-secondary);">No projects found</td>`;
            tbody.appendChild(row);
            return;
        }

        projects.forEach(project => {
            const row = document.createElement('tr');
            const dateRange = project.startDate ? `${project.startDate} - ${project.endDate || 'Present'}` : '';
            row.innerHTML = `
                <td>${escapeHtml(project.title)}</td>
                <td>${escapeHtml(project.role || '')}</td>
                <td>${escapeHtml(project.stack || '')}</td>
                <td>${escapeHtml(dateRange)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon" onclick="editProject('${project.id}')" title="Edit">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M11.333 2A1.886 1.886 0 0114 4.667l-9 9-3.667 1 1-3.667 9-9z" stroke="currentColor" stroke-width="1.5"/>
                            </svg>
                        </button>
                        <button class="btn-icon delete" onclick="deleteProject('${project.id}')" title="Delete">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M2 4h12M6 4V2h4v2m-5 2v7a1 1 0 001 1h4a1 1 0 001-1V6H5z" stroke="currentColor" stroke-width="1.5"/>
                            </svg>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading projects:', error);
    }
}

async function loadProjectImages() {
    try {
        const response = await fetch('/api/admin-images');
        if (!response.ok) throw new Error('Failed to load images');
        projectImages = await response.json();
        const select = document.getElementById('projectImage');
        select.innerHTML = '<option value="">Select image</option>' +
            projectImages.map(img => `<option value="${img.url}">${escapeHtml(img.name)}</option>`).join('');
    } catch (error) {
        console.error('Error loading images:', error);
    }
}

async function loadImages() {
    try {
        const response = await fetch('/api/admin-images');
        if (!response.ok) throw new Error('Failed to load images');
        images = await response.json();
        const tbody = document.getElementById('imagesTableBody');
        tbody.innerHTML = '';

        if (images.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="3" style="text-align:center;padding:20px;color:var(--admin-text-secondary);">No images found</td>`;
            tbody.appendChild(row);
            return;
        }

        images.forEach(img => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><img src="${img.url}" alt="${escapeHtml(img.name)}" class="image-thumb"/></td>
                <td>${escapeHtml(img.name)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon" onclick="openRenameModal('${img.name}')" title="Rename">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M11.333 2A1.886 1.886 0 0114 4.667l-9 9-3.667 1 1-3.667 9-9z" stroke="currentColor" stroke-width="1.5"/>
                            </svg>
                        </button>
                        <button class="btn-icon delete" onclick="deleteImage('${img.name}')" title="Delete">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M2 4h12M6 4V2h4v2m-5 2v7a1 1 0 001 1h4a1 1 0 001-1V6H5z" stroke="currentColor" stroke-width="1.5"/>
                            </svg>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading images:', error);
    }
}

function populatePostImageSelects(selected = []) {
    const selects = [
        document.getElementById('postImage1'),
        document.getElementById('postImage2'),
        document.getElementById('postImage3')
    ];
    selects.forEach((select, index) => {
        if (!select) return;
        select.innerHTML = '<option value="">No image</option>' +
            images.map(img => `<option value="${img.name}">${escapeHtml(img.name)}</option>`).join('');
        select.value = selected[index] || '';
    });
}

async function openProjectModal(projectId = null) {
    await loadProjectImages();
    const modal = document.getElementById('projectModal');
    modal.classList.add('active');
    document.getElementById('projectForm').reset();

    if (projectId) {
        const project = projects.find(p => p.id === projectId);
        if (project) {
            document.getElementById('projectModalTitle').textContent = 'Edit Project';
            document.getElementById('projectId').value = project.id;
            document.getElementById('projectTitle').value = project.title || '';
            document.getElementById('projectRole').value = project.role || '';
            document.getElementById('projectStack').value = project.stack || '';
            document.getElementById('projectLink').value = project.link || '';
            const imageSelect = document.getElementById('projectImage');
            imageSelect.value = project.image ? resolveImageUrl(project.image) : '';
            document.getElementById('projectBlurb').value = project.blurb || '';
            document.getElementById('projectStart').value = project.startDate || '';
            document.getElementById('projectEnd').value = project.endDate || '';
        }
    } else {
        document.getElementById('projectModalTitle').textContent = 'Create New Project';
        document.getElementById('projectId').value = '';
    }
}

function closeProjectModal() {
    const modal = document.getElementById('projectModal');
    modal.classList.remove('active');
}

async function handleProjectSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('projectId').value;
    const title = document.getElementById('projectTitle').value;
    const role = document.getElementById('projectRole').value;
    const stack = document.getElementById('projectStack').value;
    const link = document.getElementById('projectLink').value;
    const image = document.getElementById('projectImage').value;
    const blurb = document.getElementById('projectBlurb').value;
    const startDate = document.getElementById('projectStart').value;
    const endDate = document.getElementById('projectEnd').value;

    try {
        const response = await fetch(`/api/admin-projects${id ? `?id=${id}` : ''}`, {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, role, stack, link, image, blurb, startDate, endDate })
        });

        if (response.ok) {
            closeProjectModal();
            await loadProjects();
            showNotification('Project saved successfully', 'success');
        } else {
            let errorMessage = 'Failed to save project';
            try {
                const text = await response.text();
                try {
                    const err = JSON.parse(text);
                    errorMessage = err.error || errorMessage;
                } catch {
                    if (text) errorMessage = text;
                }
            } catch {
                // ignore
            }
            showNotification(errorMessage, 'error');
        }
    } catch (error) {
        console.error('Error saving project:', error);
        showNotification('Failed to save project', 'error');
    }
}

window.editProject = function(projectId) {
    openProjectModal(projectId);
}

window.deleteProject = async function(projectId) {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
        const response = await fetch(`/api/admin-projects?id=${projectId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            await loadProjects();
            showNotification('Project deleted successfully', 'success');
        } else {
            throw new Error('Failed to delete project');
        }
    } catch (error) {
        console.error('Error deleting project:', error);
        showNotification('Failed to delete project', 'error');
    }
}

function openImageModal() {
    const modal = document.getElementById('imageModal');
    document.getElementById('imageForm').reset();
    modal.classList.add('active');
}

function closeImageModal() {
    document.getElementById('imageModal').classList.remove('active');
}

async function handleImageSubmit(e) {
    e.preventDefault();
    const fileInput = document.getElementById('imageFile');
    const nameInput = document.getElementById('imageName').value.trim();
    const file = fileInput.files[0];
    if (!file) return;

    try {
        const dataUrl = await optimizeImage(file);
        const name = nameInput || file.name;
        const response = await fetch('/api/admin-images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, data: dataUrl })
        });
        if (!response.ok) throw new Error('Upload failed');
        closeImageModal();
        await loadImages();
        await loadProjectImages();
        showNotification('Image uploaded successfully', 'success');
    } catch (error) {
        console.error('Error uploading image:', error);
        showNotification('Failed to upload image', 'error');
    }
}

function openRenameModalInternal(name) {
    document.getElementById('oldImageName').value = name;
    document.getElementById('newImageName').value = name;
    document.getElementById('renameImageModal').classList.add('active');
}

window.openRenameModal = openRenameModalInternal;

function closeRenameModal() {
    document.getElementById('renameImageModal').classList.remove('active');
}

async function handleRenameSubmit(e) {
    e.preventDefault();
    const oldName = document.getElementById('oldImageName').value;
    const newName = document.getElementById('newImageName').value;
    try {
        const response = await fetch('/api/admin-images', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldName, newName })
        });
        if (!response.ok) throw new Error('Rename failed');
        closeRenameModal();
        await loadImages();
        await loadProjectImages();
        showNotification('Image renamed successfully', 'success');
    } catch (error) {
        console.error('Error renaming image:', error);
        showNotification('Failed to rename image', 'error');
    }
}

window.deleteImage = async function(name) {
    if (!confirm('Are you sure you want to delete this image?')) return;
    try {
        const response = await fetch(`/api/admin-images?name=${encodeURIComponent(name)}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Delete failed');
        await loadImages();
        await loadProjectImages();
        showNotification('Image deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting image:', error);
        showNotification('Failed to delete image', 'error');
    }
};

function optimizeImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;
                const maxSize = 1200;
                if (width > height && width > maxSize) {
                    height = Math.round(height * (maxSize / width));
                    width = maxSize;
                } else if (height > maxSize) {
                    width = Math.round(width * (maxSize / height));
                    height = maxSize;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(blob => {
                    const reader2 = new FileReader();
                    reader2.onload = () => resolve(reader2.result);
                    reader2.onerror = reject;
                    reader2.readAsDataURL(blob);
                }, 'image/jpeg', 0.8);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Load admin IPs
async function loadAdminIPs() {
    try {
        const response = await fetch('/api/admin-ips');
        if (!response.ok) throw new Error('Failed to load IPs');
        
        adminIPs = await response.json();
        
        const tbody = document.getElementById('ipsTableBody');
        tbody.innerHTML = '';
        
        if (adminIPs.length === 0) {
            // Just show current IP
            tbody.innerHTML = `
                <tr>
                    <td>${currentUserIP}</td>
                    <td>Current Admin</td>
                    <td><span class="status-badge published">Active</span></td>
                    <td>${new Date().toLocaleDateString()}</td>
                    <td>-</td>
                </tr>
            `;
        } else {
            adminIPs.forEach(ip => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${ip.ip_address}</td>
                    <td>${ip.name || 'Admin'}</td>
                    <td>
                        <span class="status-badge ${ip.is_active !== false ? 'published' : 'draft'}">
                            ${ip.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td>${new Date(ip.created_at).toLocaleDateString()}</td>
                    <td>
                        ${ip.ip_address !== currentUserIP ? `
                            <button class="btn-icon delete" onclick="removeIP('${ip.id}')" title="Remove">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.5"/>
                                </svg>
                            </button>
                        ` : '-'}
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (error) {
        console.error('Error loading IPs:', error);
        // Show current IP as fallback
        const tbody = document.getElementById('ipsTableBody');
        tbody.innerHTML = `
            <tr>
                <td>${currentUserIP}</td>
                <td>Current Admin</td>
                <td><span class="status-badge published">Active</span></td>
                <td>${new Date().toLocaleDateString()}</td>
                <td>-</td>
            </tr>
        `;
    }
}

// Post modal functions
function openPostModal(postId = null) {
    const modal = document.getElementById('postModal');
    const form = document.getElementById('postForm');
    
    if (postId) {
        // Edit mode
        const post = posts.find(p => p.id === postId);
        if (post) {
            document.getElementById('modalTitle').textContent = 'Edit Post';
            document.getElementById('postId').value = post.id;
            document.getElementById('postTitle').value = post.title;
            document.getElementById('postContent').value = post.content;
            
            let tags = [];
            try {
                tags = JSON.parse(post.tags || '[]');
            } catch (e) {
                tags = [];
            }
            document.getElementById('postTags').value = tags.join(', ');
            document.getElementById('postPublished').checked = post.is_published !== false;
            populatePostImageSelects(post.images || []);
        }
    } else {
        // Create mode
        document.getElementById('modalTitle').textContent = 'Create New Post';
        form.reset();
        document.getElementById('postId').value = '';
        populatePostImageSelects();
    }
    
    modal.classList.add('active');
}

function closePostModal() {
    const modal = document.getElementById('postModal');
    modal.classList.remove('active');
    document.getElementById('postForm').reset();
}

async function handlePostSubmit(e) {
    e.preventDefault();

    const postId = document.getElementById('postId').value;
    if (!isAdmin) {
        showNotification('You do not have permission to create posts.', 'error');
        return;
    }

    const title = document.getElementById('postTitle').value;
    const content = document.getElementById('postContent').value;
    const tagsInput = document.getElementById('postTags').value;
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()) : [];

    const imagesSelected = [
        document.getElementById('postImage1').value,
        document.getElementById('postImage2').value,
        document.getElementById('postImage3').value
    ].filter(Boolean);

    const is_published = document.getElementById('postPublished').checked;
    
    try {
        let response;
        
        if (postId) {
            // Update existing post
            response = await fetch(`/api/admin-posts?id=${postId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content, tags, images: imagesSelected, is_published })
            });
        } else {
            // Create new post
            response = await fetch('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content, tags, images: imagesSelected, is_published })
            });
        }
        
        if (response.ok) {
            closePostModal();
            await loadPosts();
            showNotification(postId ? 'Post updated successfully' : 'Post created successfully', 'success');
        } else {
            throw new Error('Failed to save post');
        }
    } catch (error) {
        console.error('Error saving post:', error);
        showNotification('Failed to save post', 'error');
    }
}

// IP modal functions
function openIPModal() {
    const modal = document.getElementById('ipModal');
    modal.classList.add('active');
}

function closeIPModal() {
    const modal = document.getElementById('ipModal');
    modal.classList.remove('active');
    document.getElementById('ipForm').reset();
}

async function handleIPSubmit(e) {
    e.preventDefault();
    
    const ip_address = document.getElementById('ipAddress').value;
    const name = document.getElementById('ipName').value;
    
    try {
        const response = await fetch('/api/admin-ips', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ip_address, name })
        });
        
        if (response.ok) {
            closeIPModal();
            await loadAdminIPs();
            showNotification('Admin IP added successfully', 'success');
        } else {
            throw new Error('Failed to add IP');
        }
    } catch (error) {
        console.error('Error adding IP:', error);
        showNotification('Failed to add IP', 'error');
    }
}

// Delete functions
window.editPost = function(postId) {
    openPostModal(postId);
}

window.deletePost = async function(postId) {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    try {
        const response = await fetch(`/api/admin-posts?id=${postId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            await loadPosts();
            showNotification('Post deleted successfully', 'success');
        } else {
            throw new Error('Failed to delete post');
        }
    } catch (error) {
        console.error('Error deleting post:', error);
        showNotification('Failed to delete post', 'error');
    }
}

window.removeIP = async function(ipId) {
    if (!confirm('Are you sure you want to remove this admin IP?')) return;
    
    try {
        const response = await fetch(`/api/admin-ips?id=${ipId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            await loadAdminIPs();
            showNotification('Admin IP removed successfully', 'success');
        } else {
            throw new Error('Failed to remove IP');
        }
    } catch (error) {
        console.error('Error removing IP:', error);
        showNotification('Failed to remove IP', 'error');
    }
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
