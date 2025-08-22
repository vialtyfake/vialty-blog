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

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (navMenu && navMenu.classList.contains('active')) {
            if (!navMenu.contains(e.target) && !menuButton.contains(e.target)) {
                closeNav();
            }
        }
    });

    // ESC key to close menu
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navMenu.classList.contains('active')) {
            closeNav();
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