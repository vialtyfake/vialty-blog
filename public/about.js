// About page interactions
const menuButton = document.getElementById('menuButton');
const navMenu = document.getElementById('navMenu');
const navClose = document.getElementById('navClose');
const navLinks = document.querySelectorAll('.nav-link');

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    animateOnScroll();
});

function setupEventListeners() {
    if (menuButton) {
        menuButton.addEventListener('click', () => {
            navMenu.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }

    if (navClose) {
        navClose.addEventListener('click', closeNav);
    }

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            // allow default navigation but close the menu
            closeNav();
        });
    });
}

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

    const elements = document.querySelectorAll('.glass-card, .timeline-item');
    elements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        element.style.transition = 'all 0.6s ease';
        observer.observe(element);
    });
}
