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

// Blog posts storage (in production, this would be a database)
let blogPosts = [
    {
        id: 1,
        title: "Welcome to My Digital Space",
        content: "This is my first post on this new platform. I'm excited to share my thoughts and experiences with you all.",
        date: new Date('2024-01-15'),
        tags: ["introduction", "personal"]
    },
    {
        id: 2,
        title: "Exploring Frosted Glass Design",
        content: "The beauty of frosted glass effects in modern web design creates an elegant and sophisticated user experience.",
        date: new Date('2024-01-20'),
        tags: ["design", "web", "ui/ux"]
    }
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    renderBlogPosts();
    setupEventListeners();
});

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
    newPostBtn.addEventListener('click', () => {
        postModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    modalClose.addEventListener('click', closeModal);
    cancelPost.addEventListener('click', closeModal);

    // Close modal when clicking outside
    postModal.addEventListener('click', (e) => {
        if (e.target === postModal) {
            closeModal();
        }
    });

    // Form submission
    postForm.addEventListener('submit', handlePostSubmit);
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
    
    // Sort posts by date (newest first)
    const sortedPosts = [...blogPosts].sort((a, b) => b.date - a.date);
    
    sortedPosts.forEach(post => {
        const postElement = createPostElement(post);
        blogGrid.appendChild(postElement);
    });
}

function createPostElement(post) {
    const article = document.createElement('article');
    article.className = 'blog-post';
    article.innerHTML = `
        <div class="post-header">
            <p class="post-date">${formatDate(post.date)}</p>
            <h3 class="post-title">${escapeHtml(post.title)}</h3>
        </div>
        <p class="post-content">${escapeHtml(post.content)}</p>
        <div class="post-tags">
            ${post.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
        </div>
    `;
    
    // Add click event for future expansion (e.g., full post view)
    article.addEventListener('click', () => {
        console.log('Post clicked:', post.id);
        // Future: Open full post view
    });
    
    return article;
}

function handlePostSubmit(e) {
    e.preventDefault();
    
    const title = document.getElementById('postTitle').value;
    const content = document.getElementById('postContent').value;
    const tagsInput = document.getElementById('postTags').value;
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()) : [];
    
    const newPost = {
        id: Date.now(),
        title,
        content,
        date: new Date(),
        tags
    };
    
    blogPosts.push(newPost);
    renderBlogPosts();
    closeModal();
    
    // Animate new post
    setTimeout(() => {
        const newPostElement = document.querySelector('.blog-post');
        newPostElement.style.animation = 'slideInFade 0.5s ease';
    }, 100);
}

// Utility functions
function formatDate(date) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Add animation for new posts
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInFade {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);