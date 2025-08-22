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

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await checkAdminStatus();
    await loadBlogPosts();
    setupEventListeners();
});

// Check if user is admin
async function checkAdminStatus() {
    try {
        const response = await fetch('/api/admin-check'); // Updated endpoint
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
    
    article.innerHTML = `
        <div class="post-header">
            <p class="post-date">${formatDate(new Date(post.created_at))}</p>
            <h3 class="post-title">${escapeHtml(post.title)}</h3>
        </div>
        <p class="post-content">${escapeHtml(post.content)}</p>
        ${tags.length > 0 ? `
            <div class="post-tags">
                ${tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
            </div>
        ` : ''}
    `;
    
    // Add click event for future expansion (e.g., full post view)
    article.addEventListener('click', () => {
        console.log('Post clicked:', post.id);
        // Future: Open full post view
    });
    
    return article;
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
        background: ${type === 'success' ? '#00ff88' : type === 'error' ? '#ff4444' : '#00d4ff'};
        color: white;
        border-radius: 10px;
        font-weight: 500;
        z-index: 9999;
        animation: slideInFade 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
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