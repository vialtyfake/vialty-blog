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
        
        // Fetch view counts for each post
        for (let post of blogPosts) {
            try {
                const viewResponse = await fetch(`/api/views?postId=${post.id}`);
                const viewData = await viewResponse.json();
                post.views = viewData.views || 0;
            } catch (error) {
                post.views = 0;
            }
        }
        
        renderBlogPosts();
    } catch (error) {
        console.error('Error loading posts:', error);
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
                        <div class="search-result" style="padding: 1rem; margin-bottom: 0.5rem; 
                                                          background: rgba(255,255,255,0.05); 
                                                          border-radius: 8px; cursor: pointer;
                                                          transition: background 0.3s;"
                             onclick="displaySinglePost('${post.id}')"
                             onmouseover="this.style.background='rgba(255,255,255,0.1)'"
                             onmouseout="this.style.background='rgba(255,255,255,0.05)'">
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
            if (link.getAttribute('href') === '/admin') {
                return;
            }
            
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            closeNav();
            
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth' });
            }
            
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

    if (postModal) {
        postModal.addEventListener('click', (e) => {
            if (e.target === postModal) {
                closeModal();
            }
        });
    }

    if (postForm) {
        postForm.addEventListener('submit', handlePostSubmit);
    }
    
    // Back button for single post view
    const backBtn = document.getElementById('backToList');
    if (backBtn) {
        backBtn.addEventListener('click', backToList);
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

// Display single post with view tracking
function displaySinglePost(postId) {
    const post = blogPosts.find(p => p.id === postId);
    if (!post) return;
    
    // Hide blog grid
    blogGrid.style.display = 'none';
    
    // Clear search if any
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    if (searchInput) searchInput.value = '';
    if (searchResults) searchResults.innerHTML = '';
    
    // Create or show single post container
    let singlePost = document.getElementById('singlePost');
    if (!singlePost) {
        singlePost = document.createElement('div');
        singlePost.id = 'singlePost';
        singlePost.style.cssText = 'max-width: 800px; margin: 0 auto; padding: 2rem;';
        document.getElementById('blog').appendChild(singlePost);
    }
    singlePost.style.display = 'block';
    
    // Parse tags
    let tags = [];
    try {
        tags = typeof post.tags === 'string' ? JSON.parse(post.tags || '[]') : post.tags || [];
    } catch {
        tags = [];
    }
    
    singlePost.innerHTML = `
        <button onclick="backToList()" style="margin-bottom: 2rem; padding: 0.75rem 1.5rem; 
                                               background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                               color: white; border: none; 
                                               border-radius: 8px; cursor: pointer;
                                               font-weight: 600; transition: transform 0.2s;">
            ← Back to Posts
        </button>
        <article>
            <h1 style="color: white; margin-bottom: 1rem; font-size: 2.5rem; font-weight: 700;">
                ${escapeHtml(post.title)}
            </h1>
            <div style="color: #999; margin-bottom: 2rem; display: flex; gap: 2rem; flex-wrap: wrap; font-size: 0.95rem;">
                <span>📅 ${formatDate(new Date(post.created_at))}</span>
                <span id="viewCount-${postId}">👁️ Loading...</span>
                ${post.author_ip && isAdmin ? `<span>📍 ${post.author_ip}</span>` : ''}
            </div>
            ${tags.length > 0 ? `
                <div style="margin-bottom: 2rem;">
                    ${tags.map(tag => 
                        `<span style="display: inline-block; margin-right: 0.5rem; margin-bottom: 0.5rem;
                                      padding: 0.4rem 1rem; background: linear-gradient(135deg, #00d4ff 0%, #00ff88 100%);
                                      color: #000; border-radius: 20px; font-size: 0.9rem; font-weight: 600;">
                            ${escapeHtml(tag)}
                        </span>`
                    ).join('')}
                </div>
            ` : ''}
            <div style="color: #ddd; line-height: 1.8; font-size: 1.1rem; white-space: pre-wrap;">
                ${escapeHtml(post.content)}
            </div>
        </article>
    `;
    
    // Track the view!
    trackView(postId);
    
    // Scroll to top of post
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Track view function
async function trackView(postId) {
    try {
        const response = await fetch(`/api/views?postId=${postId}`, { method: 'POST' });
        const data = await response.json();
        
        // Update the view count display
        const viewElement = document.getElementById(`viewCount-${postId}`);
        if (viewElement) {
            viewElement.textContent = `👁️ ${data.views} views`;
        }
        
        // Update in our local posts array
        const post = blogPosts.find(p => p.id === postId);
        if (post) {
            post.views = data.views;
        }
    } catch (error) {
        console.error('Error tracking view:', error);
        const viewElement = document.getElementById(`viewCount-${postId}`);
        if (viewElement) {
            viewElement.textContent = `👁️ - views`;
        }
    }
}

// Back to list function
window.backToList = function() {
    const singlePost = document.getElementById('singlePost');
    if (singlePost) {
        singlePost.style.display = 'none';
    }
    blogGrid.style.display = 'grid';
    
    // Reload posts to show updated view counts
    loadBlogPosts();
}

// Make displaySinglePost globally available for search results
window.displaySinglePost = displaySinglePost;

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
            await loadBlogPosts();
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
    
    .blog-post {
        transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .blog-post:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
`;
document.head.appendChild(style);

