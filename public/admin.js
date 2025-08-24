/*
 * New VIALTY admin dashboard logic
 *
 * This script powers the redesigned admin panel. It handles access
 * verification, loading and rendering posts, providing a rich
 * Markdown editing experience with a toolbar, uploading images and
 * embedding them into posts, and creating or updating posts via
 * existing API endpoints. The code aims to be clear and easy to
 * maintain while delivering a fluid user experience with modern
 * interactions and animations.
 */

// Keep track of loaded posts and the id of the post currently being edited
let posts = [];
let editingPostId = null;

// Initialise the admin dashboard once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setupEditorToolbar();
  checkAdminAccess();
  // Bind global form actions
  const newPostBtn = document.getElementById('newPostBtn');
  if (newPostBtn) newPostBtn.addEventListener('click', () => openPostModal());
  const cancelBtn = document.getElementById('cancelPost');
  if (cancelBtn) cancelBtn.addEventListener('click', closePostModal);
  const form = document.getElementById('postForm');
  if (form) form.addEventListener('submit', handlePostSubmit);
});

/**
 * Show a loader while verifying the current IP against the admin list.
 * On success, display the dashboard and load posts. On failure,
 * display an access denied message.
 */
async function checkAdminAccess() {
  const checkOverlay = document.getElementById('accessCheck');
  const deniedOverlay = document.getElementById('accessDenied');
  try {
    const res = await fetch('/api/admin-check');
    const data = await res.json();
    if (checkOverlay) checkOverlay.style.display = 'none';
    if (data.isAdmin) {
      // authorised
      document.getElementById('adminDashboard').style.display = 'flex';
      await loadPosts();
    } else {
      // not authorised
      if (deniedOverlay) deniedOverlay.style.display = 'flex';
    }
  } catch (err) {
    console.error('Error checking admin access', err);
    if (checkOverlay) checkOverlay.style.display = 'none';
    if (deniedOverlay) deniedOverlay.style.display = 'flex';
  }
}

/**
 * Fetch all posts from the backend and render them in the table.
 * If no posts exist, display a friendly message. Each row includes
 * edit and delete buttons to manage individual posts.
 */
async function loadPosts() {
  try {
    const res = await fetch('/api/admin-posts');
    if (!res.ok) throw new Error('Failed to load posts');
    posts = await res.json();
    const tbody = document.getElementById('postsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!Array.isArray(posts) || posts.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 5;
      td.textContent = 'No posts yet. Click "New Post" to create your first post.';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }
    posts.forEach(post => {
      const tr = document.createElement('tr');
      // Title
      const tdTitle = document.createElement('td');
      tdTitle.textContent = post.title || '';
      tr.appendChild(tdTitle);
      // Status
      const tdStatus = document.createElement('td');
      tdStatus.textContent = post.is_published === false ? 'Draft' : 'Published';
      tr.appendChild(tdStatus);
      // Tags
      const tdTags = document.createElement('td');
      let tags = [];
      try {
        tags = JSON.parse(post.tags || '[]');
      } catch {}
      tdTags.textContent = tags.join(', ');
      tr.appendChild(tdTags);
      // Created date
      const tdDate = document.createElement('td');
      try {
        tdDate.textContent = new Date(post.created_at).toLocaleDateString();
      } catch {
        tdDate.textContent = '';
      }
      tr.appendChild(tdDate);
      // Actions
      const tdActions = document.createElement('td');
      const editBtn = document.createElement('button');
      editBtn.textContent = 'Edit';
      editBtn.className = 'primary-btn';
      editBtn.style.marginRight = '0.5rem';
      editBtn.addEventListener('click', () => openPostModal(post.id));
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete';
      delBtn.className = 'secondary-btn';
      delBtn.addEventListener('click', () => deletePost(post.id));
      tdActions.appendChild(editBtn);
      tdActions.appendChild(delBtn);
      tr.appendChild(tdActions);
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Error loading posts:', err);
    alert('Failed to load posts');
  }
}

/**
 * Open the modal to create a new post or edit an existing one. When
 * editing, populate the form with the existing values. Always clear
 * any previous image selections.
 *
 * @param {string|number|null} postId The id of the post to edit, or null for a new post
 */
function openPostModal(postId = null) {
  const modal = document.getElementById('postModal');
  const form = document.getElementById('postForm');
  if (!modal || !form) return;
  editingPostId = postId;
  form.reset();
  // Clear image inputs
  ['postImage1','postImage2','postImage3'].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.value = '';
  });
  // Reset published checkbox default
  const publishCheckbox = document.getElementById('postPublished');
  if (publishCheckbox) publishCheckbox.checked = true;
  if (postId) {
    const post = posts.find(p => p.id === postId);
    if (post) {
      document.getElementById('modalTitle').textContent = 'Edit Post';
      document.getElementById('postId').value = post.id;
      document.getElementById('postTitle').value = post.title || '';
      document.getElementById('postContent').value = post.content || '';
      let tags = [];
      try { tags = JSON.parse(post.tags || '[]'); } catch {}
      document.getElementById('postTags').value = tags.join(', ');
      if (publishCheckbox) publishCheckbox.checked = post.is_published !== false;
    }
  } else {
    document.getElementById('modalTitle').textContent = 'Create New Post';
    document.getElementById('postId').value = '';
  }
  modal.classList.add('active');
}

/**
 * Hide the post modal and clear the editing state.
 */
function closePostModal() {
  const modal = document.getElementById('postModal');
  if (modal) modal.classList.remove('active');
  editingPostId = null;
}

/**
 * Delete a post via the API. After deletion, reload the posts list.
 *
 * @param {string|number} id The id of the post to remove
 */
async function deletePost(id) {
  if (!confirm('Are you sure you want to delete this post?')) return;
  try {
    const res = await fetch(`/api/admin-posts?id=${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Delete failed');
    await loadPosts();
  } catch (err) {
    console.error('Error deleting post:', err);
    alert('Failed to delete post');
  }
}

/**
 * Handle submission of the post form. This function gathers form data,
 * uploads any selected images, appends Markdown image syntax to the
 * content, and then sends the post to the API using the appropriate
 * HTTP method (POST for creation, PUT for updating).
 *
 * @param {Event} e The submit event
 */
async function handlePostSubmit(e) {
  e.preventDefault();
  const titleEl = document.getElementById('postTitle');
  const contentEl = document.getElementById('postContent');
  const tagsEl = document.getElementById('postTags');
  const publishedEl = document.getElementById('postPublished');
  if (!titleEl || !contentEl || !tagsEl || !publishedEl) return;
  const title = titleEl.value.trim();
  let content = contentEl.value;
  const tagsString = tagsEl.value.trim();
  const tags = tagsString
    ? tagsString.split(',').map(t => t.trim()).filter(t => t.length > 0)
    : [];
  const isPublished = publishedEl.checked;
  // Upload selected images
  const imageInputs = ['postImage1', 'postImage2', 'postImage3'];
  const uploadedNames = [];
  for (const id of imageInputs) {
    const input = document.getElementById(id);
    if (input && input.files && input.files[0]) {
      const file = input.files[0];
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '');
      try {
        const dataUrl = await toDataURL(file);
        const res = await fetch('/api/admin-images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: safeName, data: dataUrl })
        });
        const json = await res.json();
        if (res.ok && json && json.success) {
          uploadedNames.push(safeName);
        } else {
          console.warn('Image upload failed', json);
        }
      } catch (err) {
        console.error('Image upload error:', err);
      }
    }
  }
  // Append markdown for uploaded images at the end of the content
  if (uploadedNames.length > 0) {
    const mdImages = uploadedNames.map(name => `![${name}](/uploads/${name})`).join('\n\n');
    content = content.trim() + '\n\n' + mdImages;
  }
  // Build request body
  const body = {
    title,
    content,
    tags: JSON.stringify(tags),
    is_published: isPublished
  };
  let method = 'POST';
  if (editingPostId) {
    method = 'PUT';
    body.id = editingPostId;
  }
  try {
    const res = await fetch('/api/admin-posts', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const errRes = await res.json().catch(() => ({}));
      throw new Error(errRes.error || 'Failed to save post');
    }
    closePostModal();
    await loadPosts();
  } catch (err) {
    console.error('Error saving post:', err);
    alert(err.message);
  }
}

/**
 * Convert a File object to a base64 data URL. Used when uploading
 * images to the API.
 *
 * @param {File} file The file to convert
 * @returns {Promise<string>} A promise that resolves with the data URL
 */
function toDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Create the Markdown editor toolbar. The toolbar contains buttons
 * that apply common Markdown syntax (bold, italic, headings, lists
 * and links) to the selected text in the content textarea.
 */
function setupEditorToolbar() {
  const toolbar = document.getElementById('editorToolbar');
  const textarea = document.getElementById('postContent');
  if (!toolbar || !textarea) return;
  const buttons = [
    { type: 'bold', label: '<strong>B</strong>' },
    { type: 'italic', label: '<em>I</em>' },
    { type: 'h1', label: 'H1' },
    { type: 'h2', label: 'H2' },
    { type: 'ul', label: '• List' },
    { type: 'link', label: 'Link' }
  ];
  buttons.forEach(btn => {
    const button = document.createElement('button');
    button.type = 'button';
    button.innerHTML = btn.label;
    button.addEventListener('click', () => applyFormatting(btn.type, textarea));
    toolbar.appendChild(button);
  });
}

/**
 * Apply Markdown formatting to the selected text within a textarea.
 * When no text is selected, sensible placeholder text is inserted
 * instead. The function handles wrapping and prefixing syntax.
 *
 * @param {string} type The formatting type (bold, italic, h1, h2, ul, link)
 * @param {HTMLTextAreaElement} textarea The textarea element
 */
function applyFormatting(type, textarea) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const selected = value.slice(start, end);
  let replacement = selected;
  switch (type) {
    case 'bold':
      replacement = selected ? `**${selected}**` : '**bold text**';
      break;
    case 'italic':
      replacement = selected ? `_${selected}_` : '_italic text_';
      break;
    case 'h1': {
      // prefix selected lines with '# '
      const lines = selected || 'Heading 1';
      replacement = lines.split(/\n/).map(l => `# ${l}`).join('\n');
      break;
    }
    case 'h2': {
      const lines = selected || 'Heading 2';
      replacement = lines.split(/\n/).map(l => `## ${l}`).join('\n');
      break;
    }
    case 'ul': {
      const lines = selected || 'List item';
      replacement = lines.split(/\n/).map(l => `- ${l}`).join('\n');
      break;
    }
    case 'link':
      if (selected) {
        replacement = `[${selected}](https://)`;
      } else {
        replacement = '[link text](https://)';
      }
      break;
    default:
      break;
  }
  const newValue = value.slice(0, start) + replacement + value.slice(end);
  textarea.value = newValue;
  // reposition cursor after inserted text
  const cursorPos = start + replacement.length;
  textarea.focus();
  textarea.selectionStart = textarea.selectionEnd = cursorPos;
}