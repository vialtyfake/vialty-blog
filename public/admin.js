// Update the loadPosts function to remove views column
async function loadPosts() {
    try {
        const response = await fetch('/api/admin-posts');
        const posts = await response.json();
        
        const tbody = document.getElementById('postsTableBody');
        tbody.innerHTML = '';
        
        let totalCount = 0;
        let publishedCount = 0;
        let draftCount = 0;
        
        posts.forEach(post => {
            totalCount++;
            if (post.is_published) {
                publishedCount++;
            } else {
                draftCount++;
            }
            
            const tags = JSON.parse(post.tags || '[]');
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="post-title-cell">
                    <div class="post-title">${post.title}</div>
                    <div class="post-excerpt">${post.content.substring(0, 100)}...</div>
                </td>
                <td>
                    <span class="status-badge ${post.is_published ? 'published' : 'draft'}">
                        ${post.is_published ? 'Published' : 'Draft'}
                    </span>
                </td>
                <td>
                    <div class="tags-cell">
                        ${tags.map(tag => `<span class="tag-badge">${tag}</span>`).join('')}
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
        
        // Update stats
        document.getElementById('totalPosts').textContent = totalCount;
        document.getElementById('publishedPosts').textContent = publishedCount;
        document.getElementById('draftPosts').textContent = draftCount;
        
    } catch (error) {
        console.error('Error loading posts:', error);
        showNotification('Failed to load posts', 'error');
    }
}