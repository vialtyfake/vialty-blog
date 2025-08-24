/*
 * Markdown and image enhancement for the main blog page
 *
 * This script augments the existing blog rendering logic by adding
 * Markdown parsing (including headings, bold/italic text, lists,
 * links and images) and by ensuring images embedded in blog posts
 * uploaded through the admin dashboard render correctly on the
 * public-facing site. It overrides the default `createPostElement`
 * and `openPostView` functions when they are available. If those
 * functions are not yet defined when this script runs, it does
 * nothing; therefore it should be included after the original
 * `script.js` to take effect.
 */

(function() {
  /**
   * Convert a subset of Markdown to HTML. Supports headings (H1–H3),
   * bold, italic, unordered lists, links and images. Unhandled
   * Markdown is left intact. Images are styled for a clean look.
   *
   * @param {string} md The Markdown text to convert
   * @returns {string} HTML string
   */
  function parseMarkdown(md) {
    let html = md || '';
    // Images ![alt](url)
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,
      '<img src="$2" alt="$1" style="max-width:100%;border-radius:12px;margin:1rem 0;">');
    // Headings ###, ## and # at start of lines
    html = html.replace(/^### (.*)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*)$/gm, '<h1>$1</h1>');
    // Bold **text**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic _text_
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');
    // Unordered list items starting with '- '
    html = html.replace(/^(\s*)- (.*)$/gm, function(_, indent, item) {
      return `${indent}<ul><li>${item}</li></ul>`;
    });
    // Links [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    // Convert double newlines to paragraph breaks
    html = html.replace(/\n{2,}/g, '</p><p>');
    // Single newlines become <br> for line breaks
    html = html.replace(/\n/g, '<br>');
    // Wrap overall content in a paragraph to ensure proper structure
    return '<p>' + html + '</p>';
  }

  // Only proceed if createPostElement and openPostView are defined
  if (typeof createPostElement === 'function') {
    const origCreate = createPostElement;
    window.createPostElement = function(post) {
      const article = document.createElement('article');
      article.className = 'blog-post';
      // Parse tags
      let tags = [];
      try {
        tags = typeof post.tags === 'string' ? JSON.parse(post.tags || '[]') : post.tags || [];
      } catch {
        tags = [];
      }
      const category = tags[0] || 'General';
      // Extract first image for preview
      const imgMatch = (post.content || '').match(/!\[[^\]]*\]\(([^)]+)\)/);
      const imgHTML = imgMatch ? `<img src="${imgMatch[1]}" alt="" class="post-thumbnail" style="width:100%;max-height:200px;object-fit:cover;border-radius:12px;margin-bottom:1rem;">` : '';
      // Strip images from content for snippet
      const stripped = (post.content || '').replace(/!\[[^\]]*\]\([^)]*\)/g, '');
      const snippet = stripped.replace(/\s+/g, ' ').trim().substring(0, 150);
      article.innerHTML = `
        <div class="post-header">
          <span class="post-date">${formatDate(new Date(post.created_at))}</span>
          <span class="post-category">${escapeHtml(category)}</span>
        </div>
        ${imgHTML}
        <h3>${escapeHtml(post.title)}</h3>
        <p>${escapeHtml(snippet)}...</p>
        <div class="post-tags">${tags.slice(0, 3).map(tag => ` #${escapeHtml(tag)} `).join('')}</div>
        <a href="#" class="read-more">Read more →</a>
      `;
      article.addEventListener('click', (e) => {
        e.preventDefault();
        openPostView(post);
      });
      return article;
    };
  }
  if (typeof openPostView === 'function') {
    window.openPostView = function(post) {
      const modal = document.getElementById('postViewModal');
      const modalBody = document.getElementById('postModalBody');
      if (!modal || !modalBody) return;
      // Parse tags
      let tags = [];
      try {
        tags = typeof post.tags === 'string' ? JSON.parse(post.tags || '[]') : post.tags || [];
      } catch {
        tags = [];
      }
      modalBody.innerHTML = `
        <h2>${escapeHtml(post.title)}</h2>
        <div class="meta">
          <span>📅 ${formatDate(new Date(post.created_at))}</span>
          <span>📝 ${post.content.split(' ').length} words</span>
          <span>⏱️ ${Math.ceil(post.content.split(' ').length / 200)} min read</span>
        </div>
        <div class="content">${parseMarkdown(post.content)}</div>
        ${tags.length ? `<div class="tags">${tags.map(tag => ` #${escapeHtml(tag)} `).join('')}</div>` : ''}
      `;
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      modalBody.style.opacity = '0';
      modalBody.style.transform = 'translateY(20px)';
      setTimeout(() => {
        modalBody.style.transition = 'all 0.4s ease';
        modalBody.style.opacity = '1';
        modalBody.style.transform = 'translateY(0)';
      }, 100);
    };
  }
})();