// DOM Elements
const menuButton = document.getElementById('menuButton');
const navMenu = document.getElementById('navMenu');
const navClose = document.getElementById('navClose');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    animateOnScroll();
});

// Event Listeners
function setupEventListeners() {
    // Navigation menu
    if (menuButton) {
        menuButton.addEventListener('click', () => {
            navMenu.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }

    if (navClose) {
        navClose.addEventListener('click', closeNav);
    }

    if (navLinks) {
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                
                // Check if it's an external link
                if (link.classList.contains('external-link')) {
                    // Don't prevent default for external links
                    closeNav();
                    return;
                }
                
                // Check if it's the admin link
                if (href === '/admin') {
                    closeNav();
                    return;
                }
                
                // Handle hash navigation
                if (href && href.startsWith('#')) {
                    e.preventDefault();
                    const targetId = href.substring(1);
                    closeNav();
                    
                    // Smooth scroll to section
                    const targetSection = document.getElementById(targetId);
                    if (targetSection) {
                        targetSection.scrollIntoView({ behavior: 'smooth' });
                    }
                    
                    // Update active link
                    navLinks.forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                }
            });
        });
    }

    // Rest of your event listeners remain the same...
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

// Animate elements on scroll
function animateOnScroll() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe all glass cards and timeline items
    const elements = document.querySelectorAll('.glass-card, .timeline-item');
    elements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        element.style.transition = 'all 0.6s ease';
        observer.observe(element);
    });
}