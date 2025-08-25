/* ==========================================
   POSTS PAGE FUNCTIONALITY
   ========================================== */

// Posts data
let posts = [];
let images = [];

// Initialize posts page when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for admin access check to complete
    setTimeout(initializePostsPage, 100);
});

// Initialize posts page functionality
async function initializePostsPage() {
    if (!window.adminSidebar?.isAdmin()) {
        return; // Exit if not admin
    }
    
    try {
        // Load posts data
        await loadPosts();
        await loadImages();
        
        // Initialize UI components
        initializePostModal();
        initializeKeyboardShortcuts();
        
        // Add enhanced interactions
        enhancePostsInteractivity();
        
    } catch (error) {
        console.error('Error initializing posts page:', error);
        window.adminSidebar?.showNotification('Failed to load posts data', 'error');
    }
}

// Load posts from API
async function loadPosts() {
    try {
        window.adminSidebar?.setLoadingState(document.getElementById('postsTableBody'), true);
        
        const response = await fetch('/api/admin-posts');
        if (!response.ok) throw new Error('Failed to load posts');
        
        posts = await response.json();
        
        // Update statistics
        updatePostsStats();
        
        // Render posts table
        renderPostsTable();
        
        window.adminSidebar?.setLoadingState(document.getElementById('postsTableBody'), false);
        
    } catch (error) {
        console.error('Error loading posts:', error);
        window.adminSidebar?.setLoadingState(document.getElementById('postsTableBody'), false);
        
        // Show empty state
        renderEmptyState();
        updatePostsStats();
    }
}

// Load images for post creation
async function loadImages() {
    try {
        const response = await fetch('/api/admin-images');
        if (response.ok) {
            images = await response.json();
        }
    } catch (error) {
        console.error('Error loading images:', error);
        images = [];
    }
}

// Update posts statistics
function updatePostsStats() {
    const totalCount = posts.length;
    const publishedCount = posts.filter(post => post.is_published !== false).length;
    const draftCount = posts.filter(post => post.is_published === false).length;
    
    // Animate counters
    animateCounter('totalPosts', totalCount);
    animateCounter('publishedPosts', publishedCount);
    animateCounter('draftPosts', draftCount);
}

// Animate counter with easing
function animateCounter(elementId, targetValue, duration = 800) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const startValue = parseInt(element.textContent) || 0;
    const startTime = performance.now();
    
    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-out-cubic)
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.floor(startValue + (targetValue - startValue) * easeProgress);
        
        element.textContent = currentValue;
        
        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = targetValue;
        }
    }
    
    requestAnimationFrame(updateCounter);
}

// Render posts table
function renderPostsTable() {
    const tbody = document.getElementById('postsTableBody');
    if (!tbody) return;
    
    if (posts.length === 0) {
        renderEmptyState();
        return;
    }
    
    // Clear existing content
    tbody.innerHTML = '';
    
    // Render posts with staggered animation
    posts.forEach((post, index) => {
        const row = createPostRow(post);
        row.style.opacity = '0';
        row.style.transform = 'translateY(20px)';
        row.classList.add('table-row-enter');
        
        tbody.appendChild(row);
        
        // Animate in with delay
        setTimeout(() => {
            row.style.opacity = '1';
            row.style.transform = 'translateY(0)';
        }, index * 50);
    });
}

// Create a post table row
function createPostRow(post) {
    const row = document.createElement('tr');
    row.className = 'table-row-hover';
    
    // Parse tags
    let tags = [];
    try {
        tags = JSON.parse(post.tags || '[]');
    } catch (e) {
        tags = [];
    }
    
    // Format date
    const createdDate = new Date(post.created_at).toLocaleDateString();
    
    // Truncate content for excerpt
    const excerpt = post.content.length > 100 
        ? post.content.substring(0, 100) + '...'
        : post.content;
    
    row.innerHTML = `
        <td class="post-title-cell">
            <div class="post-title">${window.adminSidebar?.escapeHtml(post.title)}</div>
            <div class="post-excerpt">${window.adminSidebar?.escapeHtml(excerpt)}</div>
        </td>
        <td>
            <span class="status-badge ${post.is_published !== false ? 'published' : 'draft'}">
                ${post.is_published !== false ? 'Published' : 'Draft'}
            </span>
        </td>
        <td class="tags-cell">
            <div class="tags-container">
                ${tags.map(tag => 
                    `<span class="tag-badge">${window.adminSidebar?.escapeHtml(tag)}</span>`
                ).join('')}
            </div>
        </td>
        <td>${createdDate}</td>
        <td>
            <div class="action-buttons">
                <button class="btn-icon" onclick="editPost('${post.id}')" title="Edit Post">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M11.333 2A1.886 1.886 0 0114 4.667l-9 9-3.667 1 1-3.667 9-9z" 
                              stroke="currentColor" stroke-width="1.5"/>
                    </svg>
                </button>
                <button class="btn-icon delete" onclick="deletePost('${post.id}')" title="Delete Post">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 4h12M5.333 4V2.667a1.333 1.333 0 011.334-1.334h2.666a1.333 1.333 0 011.334 1.334V4m2 0v9.333a1.333 1.333 0 01-1.334 1.334H4.667a1.333 1.333 0 01-1.334-1.334V4h9.334z" 
                              stroke="currentColor" stroke-width="1.5"/>
                    </svg>
                </button>
            </div>
        </td>
    `;
    
    return row;
}

// Render empty state
function renderEmptyState() {
    const tbody = document.getElementById('postsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="5" class="empty-state">
                <div class="empty-icon">
                    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                        <path d="M16 12h32v40H16V12z" stroke="currentColor" stroke-width="2"/>
                        <path d="M24 20h16M24 28h16M24 36h8" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </div>
                <div class="empty-title">No posts yet</div>
                <div class="empty-description">
                    Create your first blog post to get started with content management.
                </div>
                <button class="btn btn-primary" onclick="openPostModal()">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M10 4v12m-6-6h12" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    Create First Post
                </button>
            </td>
        </tr>
    `;
}

// Initialize post modal
function initializePostModal() {
    const newPostBtn = document.getElementById('newPostBtn');
    const closeModalBtn = document.getElementById('closePostModal');
    const cancelBtn = document.getElementById('cancelPost');
    const postForm = document.getElementById('postForm');
    
    if (newPostBtn) {
        newPostBtn.addEventListener('click', () => openPostModal());
    }
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closePostModal);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closePostModal);
    }
    
    if (postForm) {
        postForm.addEventListener('submit', handlePostSubmit);
    }
    
    // Close modal on overlay click
    const modal = document.getElementById('postModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closePostModal();
            }
        });
    }
    
    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal?.classList.contains('active')) {
            closePostModal();
        }
    });
}

// Open post modal
function openPostModal(postId = null) {
    const modal = document.getElementById('postModal');
    const modalTitle = document.getElementById('modalTitle');
    const postForm = document.getElementById('postForm');
    
    if (!modal || !modalTitle || !postForm) return;
    
    // Reset form
    postForm.reset();
    
    if (postId) {
        // Edit mode
        const post = posts.find(p => p.id === postId);
        if (post) {
            modalTitle.textContent = 'Edit Post';
            
            document.getElementById('postId').value = post.id;
            document.getElementById('postTitle').value = post.title;
            document.getElementById('postContent').value = post.content;
            document.getElementById('postPublished').checked = post.is_published !== false;
            
            // Handle tags
            let tags = [];
            try {
                tags = JSON.parse(post.tags || '[]');
            } catch (e) {
                tags = [];
            }
            document.getElementById('postTags').value = tags.join(', ');
        }
    } else {
        // Create mode
        modalTitle.textContent = 'Create New Post';
        document.getElementById('postId').value = '';
    }
    
    // Show modal with animation
    modal.classList.add('active');
    modal.classList.add('modal-scale-in');
    
    // Focus first input
    setTimeout(() => {
        document.getElementById('postTitle')?.focus();
    }, 300);
}

// Close post modal
function closePostModal() {
    const modal = document.getElementById('postModal');
    if (!modal) return;
    
    modal.classList.remove('active');
    modal.classList.remove('modal-scale-in');
}

// Handle post form submission
async function handlePostSubmit(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    try {
        // Show loading state
        submitBtn.textContent = 'Saving...';
        submitBtn.disabled = true;
        
        const postId = document.getElementById('postId').value;
        const title = document.getElementById('postTitle').value;
        const content = document.getElementById('postContent').value;
        const tagsInput = document.getElementById('postTags').value;
        const isPublished = document.getElementById('postPublished').checked;
        
        // Parse tags
        const tags = tagsInput 
            ? tagsInput.split(',').map(tag => tag.trim()).filter(Boolean)
            : [];
        
        const postData = {
            title,
            content,
            tags,
            is_published: isPublished
        };
        
        let response;
        if (postId) {
            // Update existing post
            response = await fetch(`/api/admin-posts?id=${postId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(postData)
            });
        } else {
            // Create new post
            response = await fetch('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(postData)
            });
        }
        
        if (!response.ok) {
            throw new Error('Failed to save post');
        }
        
        // Success
        closePostModal();
        await loadPosts();
        
        window.adminSidebar?.showNotification(
            postId ? 'Post updated successfully' : 'Post created successfully',
            'success'
        );
        
    } catch (error) {
        console.error('Error saving post:', error);
        window.adminSidebar?.showNotification('Failed to save post', 'error');
    } finally {
        // Reset button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Global functions for button actions
window.editPost = function(postId) {
    openPostModal(postId);
};

window.deletePost = async function(postId) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    
    if (!confirm(`Are you sure you want to delete "${post.title}"?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin-posts?id=${postId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete post');
        }
        
        await loadPosts();
        window.adminSidebar?.showNotification('Post deleted successfully', 'success');
        
    } catch (error) {
        console.error('Error deleting post:', error);
        window.adminSidebar?.showNotification('Failed to delete post', 'error');
    }
};

// Initialize keyboard shortcuts
function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Only handle shortcuts when not in an input field
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        // Ctrl/Cmd + shortcuts
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'n':
                    e.preventDefault();
                    openPostModal();
                    break;
                case 'r':
                    e.preventDefault();
                    loadPosts();
                    break;
            }
        }
    });
}

// Enhance posts page interactivity
function enhancePostsInteractivity() {
    // Add auto-save functionality for modal
    addAutoSave();
    
    // Add search/filter functionality
    addSearchFunctionality();
    
    // Add drag and drop for reordering (future feature)
    // addDragAndDrop();
}

// Add auto-save functionality
function addAutoSave() {
    const autoSaveKey = 'admin-post-draft';
    let autoSaveTimeout;
    
    const titleInput = document.getElementById('postTitle');
    const contentInput = document.getElementById('postContent');
    const tagsInput = document.getElementById('postTags');
    
    const inputs = [titleInput, contentInput, tagsInput].filter(Boolean);
    
    // Load saved draft
    function loadDraft() {
        try {
            const draft = localStorage.getItem(autoSaveKey);
            if (draft) {
                const data = JSON.parse(draft);
                if (titleInput) titleInput.value = data.title || '';
                if (contentInput) contentInput.value = data.content || '';
                if (tagsInput) tagsInput.value = data.tags || '';
            }
        } catch (error) {
            console.error('Error loading draft:', error);
        }
    }
    
    // Save draft
    function saveDraft() {
        try {
            const draft = {
                title: titleInput?.value || '',
                content: contentInput?.value || '',
                tags: tagsInput?.value || '',
                timestamp: Date.now()
            };
            localStorage.setItem(autoSaveKey, JSON.stringify(draft));
        } catch (error) {
            console.error('Error saving draft:', error);
        }
    }
    
    // Clear draft
    function clearDraft() {
        localStorage.removeItem(autoSaveKey);
    }
    
    // Auto-save on input
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            clearTimeout(autoSaveTimeout);
            autoSaveTimeout = setTimeout(saveDraft, 1000);
        });
    });
    
    // Clear draft on successful submit
    const postForm = document.getElementById('postForm');
    if (postForm) {
        postForm.addEventListener('submit', clearDraft);
    }
    
    // Load draft when opening new post modal
    const newPostBtn = document.getElementById('newPostBtn');
    if (newPostBtn) {
        newPostBtn.addEventListener('click', () => {
            setTimeout(loadDraft, 100);
        });
    }
}

// Add search functionality (basic implementation)
function addSearchFunctionality() {
    // This could be expanded to include a search input in the UI
    window.searchPosts = function(query) {
        const filteredPosts = posts.filter(post => 
            post.title.toLowerCase().includes(query.toLowerCase()) ||
            post.content.toLowerCase().includes(query.toLowerCase())
        );
        
        // Re-render table with filtered posts
        const originalPosts = posts;
        posts = filteredPosts;
        renderPostsTable();
        posts = originalPosts;
    };
}

// Add posts-specific styles
const postsStyles = document.createElement('style');
postsStyles.textContent = `
    .tags-container {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
    }
    
    .table-row-hover {
        transition: all 0.2s ease;
    }
    
    .table-row-hover:hover .post-title {
        color: var(--accent);
    }
    
    .table-row-hover:hover .btn-icon {
        transform: scale(1.1);
    }
    
    .modal-scale-in {
        animation: modalScaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    
    @keyframes modalScaleIn {
        from {
            opacity: 0;
            transform: scale(0.8) translateY(20px);
        }
        to {
            opacity: 1;
            transform: scale(1) translateY(0);
        }
    }
    
    /* Auto-save indicator */
    .auto-save-indicator {
        position: absolute;
        top: 10px;
        right: 10px;
        background: var(--success);
        color: white;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 0.75rem;
        opacity: 0;
        transition: opacity 0.3s ease;
    }
    
    .auto-save-indicator.show {
        opacity: 1;
    }
`;

if (!document.getElementById('posts-styles')) {
    postsStyles.id = 'posts-styles';
    document.head.appendChild(postsStyles);
}

// Export posts functions for global access
window.postsPage = {
    loadPosts,
    openPostModal,
    editPost: window.editPost,
    deletePost: window.deletePost
};
