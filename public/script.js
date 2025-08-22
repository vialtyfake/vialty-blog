// DOM Elements
const menuButton = document.getElementById('menuButton');
const navMenu = document.getElementById('navMenu');
const navClose = document.getElementById('navClose');
const navLinks = document.querySelectorAll('.nav-link');
const newPostBtn = document.getElementById('newPostBtn');
const postModal = document.getElementById('postModal');
const modalClose = document.getElementById('modalClose');
const cancelPost = document.getElementById('cancelPost');
const postForm = document.getElementById('postForm');
const blogGrid = document.getElementById('blogGrid');

// State
let blogPosts = [];
let isAdmin = false;
window.posts = []; // Global for search

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await checkAdminStatus();
    await loadBlogPosts();
    setupEventListeners();
    setupSearch();
});

// Check if user is admin
async function checkAdminStatus() {
    try {
        const response = await fetch('/api/admin-check');
        const data = await response.json();
        isAdmin = data.isAdmin;
        
        // Show/hide new post button based on admin status
        if (newPostBtn) {
            newPostBtn.style.display = isAdmin ? 'flex' : 'none';
        }
        
        // Add admin link to navigation if user is admin
        if (isAdmin) {
            const existingAdminLink = document.querySelector('.nav-link[href="/admin"]');
            if (!existingAdminLink) {
                const adminLink = document.createElement('li');
                adminLink.innerHTML = '<a href="/admin" class="nav-link">Admin Panel</a>';
                document.querySelector('.nav-links').appendChild(adminLink);
            }
        }
    } catch (error) {
        console.error('Error checking admin status:', error);
        // Hide new post button on error
        if (newPostBtn) {
            newPostBtn.style.display = 'none';
        }
    }
}

// Load posts from server
async function loadBlogPosts() {
    try {
        const response = await fetch('/api/posts');
        blogPosts = await response.json();
        window.posts = blogPosts; // Store globally for search
        renderBlogPosts();
    } catch (error) {
        console.error('Error loading posts:', error);
        // Show fallback message
        blogGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">
                Unable to load posts. Please try again later.
            </div>
        `;
    }
}

// Setup search functionality
function setupSearch() {
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    
    if (!searchInput) return;
    
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value;
        
        if (query.length < 2) {
            searchResults.innerHTML = '';
            return;
        }
        
        searchTimeout = setTimeout(async () => {
            try {
                const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
                const results = await response.json();
                
                if (results.length === 0) {
                    searchResults.innerHTML = '<p style="color: #999; text-align: center; padding: 1rem;">No results found</p>';
                } else {
                    const html = results.map(post => `
                        <div class="search-result" onclick="displaySinglePost('${post.id}')">
                            <h3 style="margin: 0 0 0.5rem 0; color: white;">${escapeHtml(post.title)}</h3>
                            <p style="margin: 0; color: #999; font-size: 0.9rem;">
                                ${escapeHtml(post.content.substring(0, 150))}...
                            </p>
                        </div>
                    `).join('');
                    searchResults.innerHTML = html;
                }
            } catch (error) {
                console.error('Search error:', error);
                searchResults.innerHTML = '<p style="color: #f44; text-align: center;">Search error occurred</p>';
            }
        }, 300);
    });
}

// Event Listeners
function setupEventListeners() {
    // Navigation menu
    menuButton.addEventListener('click', () => {
        navMenu.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    navClose.addEventListener('click', closeNav);

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            // Don't prevent default for admin link
            if (link.getAttribute('href') === '/admin') {
                return;
            }
            
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            closeNav();
            
            // Smooth scroll to section
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth' });
            }
            
            // Update active link
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });

    // Modal controls
    if (newPostBtn) {
        newPostBtn.addEventListener('click', () => {
            if (isAdmin) {
                postModal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        });
    }

    if (modalClose) {
        modalClose.addEventListener('click', closeModal);
    }
    
    if (cancelPost) {
        cancelPost.addEventListener('click', closeModal);
    }

    // Close modal when clicking outside
    if (postModal) {
        postModal.addEventListener('click', (e) => {
            if (e.target === postModal) {
                closeModal();
            }
        });
    }

    // Form submission
    if (postForm) {
        postForm.addEventListener('submit', handlePostSubmit);
    }
    
    // ESC key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const postViewModal = document.getElementById('postViewModal');
            if (postViewModal && postViewModal.classList.contains('active')) {
                closePostView();
            }
            if (postModal && postModal.classList.contains('active')) {
                closeModal();
            }
        }
    });
}

// Navigation functions
function closeNav() {
    navMenu.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Modal functions
function closeModal() {
    postModal.classList.remove('active');
    document.body.style.overflow = 'auto';
    postForm.reset();
}

// Blog post functions
function renderBlogPosts() {
    blogGrid.innerHTML = '';
    
    if (blogPosts.length === 0) {
        blogGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">
                No posts yet. ${isAdmin ? 'Click "New Post" to create your first post!' : 'Check back soon!'}
            </div>
        `;
        return;
    }
    
    blogPosts.forEach(post => {
        const postElement = createPostElement(post);
        blogGrid.appendChild(postElement);
    });
}

// Create modern blog post element
function createPostElement(post) {
    const article = document.createElement('article');
    article.className = 'blog-post';
    
    // Parse tags
    let tags = [];
    try {
        tags = typeof post.tags === 'string' ? JSON.parse(post.tags || '[]') : post.tags || [];
    } catch {
        tags = [];
    }
    
    // Get first tag as category
    const category = tags[0] || 'General';
    
    article.innerHTML = `
        <div class="post-card-header">
            <div class="post-meta">
                <span class="post-date">${formatDate(new Date(post.created_at))}</span>
                <span class="post-category">${escapeHtml(category)}</span>
            </div>
            <h3 class="post-title">${escapeHtml(post.title)}</h3>
        </div>
        <p class="post-excerpt">${escapeHtml(post.content.substring(0, 150))}...</p>
        <div class="post-card-footer">
            <div class="post-tags">
                ${tags.slice(0, 3).map(tag => `<span class="post-tag">#${escapeHtml(tag)}</span>`).join('')}
            </div>
            <span class="read-more">Read more →</span>
        </div>
    `;
    
    // Add click event to display full post in modal
    article.addEventListener('click', (e) => {
        e.preventDefault();
        openPostView(post);
    });
    
    return article;
}

// Open post in modal
function openPostView(post) {
    const modal = document.getElementById('postViewModal');
    const modalBody = document.getElementById('postModalBody');
    
    // Parse tags
    let tags = [];
    try {
        tags = typeof post.tags === 'string' ? JSON.parse(post.tags || '[]') : post.tags || [];
    } catch {
        tags = [];
    }
    
    modalBody.innerHTML = `
        <div class="modal-post-header">
            <h1 class="modal-post-title">${escapeHtml(post.title)}</h1>
            <div class="modal-post-meta">
                <span>📅 ${formatDate(new Date(post.created_at))}</span>
                <span>📝 ${post.content.split(' ').length} words</span>
                <span>⏱️ ${Math.ceil(post.content.split(' ').length / 200)} min read</span>
            </div>
        </div>
        <div class="modal-post-content">
            ${escapeHtml(post.content).replace(/\n/g, '<br>')}
        </div>
        ${tags.length > 0 ? `
            <div class="modal-post-tags">
                ${tags.map(tag => `<span class="modal-tag">#${escapeHtml(tag)}</span>`).join('')}
            </div>
        ` : ''}
    `;
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Animate content
    modalBody.style.opacity = '0';
    modalBody.style.transform = 'translateY(20px)';
    setTimeout(() => {
        modalBody.style.transition = 'all 0.4s ease';
        modalBody.style.opacity = '1';
        modalBody.style.transform = 'translateY(0)';
    }, 100);
}

// Close post view modal
window.closePostView = function() {
    const modal = document.getElementById('postViewModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Display single post (for search results)
window.displaySinglePost = function(postId) {
    const post = blogPosts.find(p => p.id === postId);
    if (post) {
        openPostView(post);
        // Clear search
        const searchInput = document.getElementById('search-input');
        const searchResults = document.getElementById('search-results');
        if (searchInput) searchInput.value = '';
        if (searchResults) searchResults.innerHTML = '';
    }
}

async function handlePostSubmit(e) {
    e.preventDefault();
    
    if (!isAdmin) {
        showNotification('You do not have permission to create posts.', 'error');
        return;
    }
    
    const title = document.getElementById('postTitle').value;
    const content = document.getElementById('postContent').value;
    const tagsInput = document.getElementById('postTags').value;
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()) : [];
    
    try {
        const response = await fetch('/api/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, content, tags })
        });
        
        if (response.ok) {
            const newPost = await response.json();
            closeModal();
            await loadBlogPosts(); // Reload posts from server
            
            // Show success message
            showNotification('Post published successfully!', 'success');
        } else {
            const error = await response.json();
            showNotification(error.error || 'Failed to create post', 'error');
        }
    } catch (error) {
        console.error('Error creating post:', error);
        showNotification('Failed to create post. Please try again.', 'error');
    }
}

// Utility functions
function formatDate(date) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? 'linear-gradient(135deg, #00ff88 0%, #00d4ff 100%)' : 
                      type === 'error' ? 'linear-gradient(135deg, #ff4444 0%, #ff6666 100%)' : 
                      'linear-gradient(135deg, #00d4ff 0%, #667eea 100%)'};
        color: white;
        border-radius: 10px;
        font-weight: 600;
        z-index: 9999;
        animation: slideInFade 0.3s ease;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutFade 0.3s ease';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInFade {
        from {
            opacity: 0;
            transform: translateX(100px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOutFade {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100px);
        }
    }
`;
document.head.appendChild(style);