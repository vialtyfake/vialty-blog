/* ==========================================
   SHARED ADMIN SIDEBAR FUNCTIONALITY
   ========================================== */

// Admin state
let isAdmin = false;
let currentUserIP = '';

// Initialize admin access check and sidebar
document.addEventListener('DOMContentLoaded', async () => {
    await checkAdminAccess();
    initializeSidebar();
});

// Check if user has admin access
async function checkAdminAccess() {
    try {
        const response = await fetch('/api/admin-check');
        const data = await response.json();
        
        isAdmin = data.isAdmin;
        currentUserIP = data.ip;
        
        // Update UI based on access
        const accessCheck = document.getElementById('accessCheck');
        const accessDenied = document.getElementById('accessDenied');
        const adminDashboard = document.getElementById('adminDashboard');
        
        if (accessCheck) accessCheck.style.display = 'none';
        
        if (isAdmin) {
            // Show admin dashboard
            if (adminDashboard) {
                adminDashboard.style.display = 'flex';
                // Add entrance animation
                adminDashboard.classList.add('fade-in');
            }
            
            // Update admin IP display
            const adminIPElement = document.getElementById('adminIP');
            if (adminIPElement) {
                adminIPElement.textContent = currentUserIP;
            }
        } else {
            // Show access denied
            if (accessDenied) {
                accessDenied.style.display = 'flex';
                accessDenied.classList.add('modal-scale-in');
            }
            
            const userIPElement = document.getElementById('userIP');
            if (userIPElement) {
                userIPElement.textContent = currentUserIP;
            }
        }
    } catch (error) {
        console.error('Error checking admin access:', error);
        
        // Show access denied on error
        const accessCheck = document.getElementById('accessCheck');
        const accessDenied = document.getElementById('accessDenied');
        
        if (accessCheck) accessCheck.style.display = 'none';
        if (accessDenied) {
            accessDenied.style.display = 'flex';
            accessDenied.classList.add('modal-scale-in');
        }
        
        const userIPElement = document.getElementById('userIP');
        if (userIPElement) {
            userIPElement.textContent = 'Unable to verify';
        }
    }
}

// Initialize sidebar functionality
function initializeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    
    if (!sidebar || !sidebarToggle || !sidebarOverlay) return;
    
    // Mobile sidebar toggle functionality
    const toggleSidebar = () => {
        const isOpen = sidebar.classList.contains('open');
        
        if (isOpen) {
            // Close sidebar
            sidebar.classList.remove('open');
            sidebar.classList.add('sidebar-slide-out');
            sidebarOverlay.classList.remove('active');
            document.body.style.overflow = '';
            
            // Update toggle button aria
            sidebarToggle.setAttribute('aria-expanded', 'false');
        } else {
            // Open sidebar
            sidebar.classList.add('open');
            sidebar.classList.remove('sidebar-slide-out');
            sidebar.classList.add('sidebar-slide-in');
            sidebarOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Update toggle button aria
            sidebarToggle.setAttribute('aria-expanded', 'true');
        }
    };
    
    const closeSidebar = () => {
        if (sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
            sidebar.classList.add('sidebar-slide-out');
            sidebarOverlay.classList.remove('active');
            document.body.style.overflow = '';
            sidebarToggle.setAttribute('aria-expanded', 'false');
        }
    };
    
    // Event listeners
    sidebarToggle.addEventListener('click', toggleSidebar);
    sidebarOverlay.addEventListener('click', closeSidebar);
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeSidebar();
        }
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 1024) {
            // Desktop view - reset mobile sidebar state
            sidebar.classList.remove('open', 'sidebar-slide-out', 'sidebar-slide-in');
            sidebarOverlay.classList.remove('active');
            document.body.style.overflow = '';
            sidebarToggle.style.display = 'none';
        } else {
            // Mobile view - show toggle button
            sidebarToggle.style.display = 'block';
        }
    });
    
    // Initial setup
    if (window.innerWidth <= 1024) {
        sidebarToggle.style.display = 'block';
    }
    
    // Enhanced navigation with animations
    enhanceNavigation();
}

// Enhance navigation with advanced animations and interactions
function enhanceNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach((item, index) => {
        // Add staggered entrance animation
        item.style.animationDelay = `${index * 0.1}s`;
        item.classList.add('slide-up');
        
        // Enhanced hover effects
        item.addEventListener('mouseenter', () => {
            if (!item.classList.contains('active')) {
                item.style.transform = 'translateX(8px)';
                item.style.transition = 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
            }
        });
        
        item.addEventListener('mouseleave', () => {
            if (!item.classList.contains('active')) {
                item.style.transform = 'translateX(0)';
            }
        });
        
        // Click animation
        item.addEventListener('click', (e) => {
            // Add ripple effect
            createRippleEffect(e, item);
            
            // Update active state if it's a page navigation
            if (item.getAttribute('href') && item.getAttribute('href').includes('.html')) {
                updateActiveNavigation(item);
            }
        });
    });
}

// Create ripple effect on navigation click
function createRippleEffect(event, element) {
    const ripple = document.createElement('span');
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 0.6s linear;
        pointer-events: none;
        z-index: 1;
    `;
    
    element.style.position = 'relative';
    element.appendChild(ripple);
    
    // Remove ripple after animation
    setTimeout(() => {
        ripple.remove();
    }, 600);
}

// Update active navigation state
function updateActiveNavigation(activeItem) {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.classList.remove('active');
        item.style.transform = 'translateX(0)';
    });
    
    activeItem.classList.add('active');
    activeItem.style.transform = 'translateX(8px)';
}

// Enhanced notification system
function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification ${type} notification-slide-in`;
    
    // Enhanced styling
    const colors = {
        success: 'linear-gradient(135deg, var(--success), rgba(0, 200, 83, 0.9))',
        error: 'linear-gradient(135deg, var(--error), rgba(255, 23, 68, 0.9))',
        warning: 'linear-gradient(135deg, var(--warning), rgba(255, 171, 0, 0.9))',
        info: 'linear-gradient(135deg, #2196F3, rgba(33, 150, 243, 0.9))'
    };
    
    notification.style.cssText = `
        position: fixed;
        top: 24px;
        right: 24px;
        max-width: 400px;
        padding: 16px 20px;
        border-radius: 16px;
        color: white;
        font-weight: 500;
        backdrop-filter: var(--blur-medium);
        -webkit-backdrop-filter: var(--blur-medium);
        border: 1px solid rgba(255, 255, 255, 0.2);
        z-index: 10000;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        background: ${colors[type] || colors.info};
        cursor: pointer;
        transition: all 0.3s ease;
    `;
    
    notification.textContent = message;
    
    // Click to dismiss
    notification.addEventListener('click', () => {
        dismissNotification(notification);
    });
    
    // Auto dismiss with progress bar
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        background: rgba(255, 255, 255, 0.5);
        border-radius: 0 0 16px 16px;
        width: 100%;
        transform-origin: left;
        animation: progressShrink ${duration}ms linear;
    `;
    
    notification.appendChild(progressBar);
    document.body.appendChild(notification);
    
    // Auto dismiss
    setTimeout(() => {
        dismissNotification(notification);
    }, duration);
    
    return notification;
}

// Dismiss notification with animation
function dismissNotification(notification) {
    if (notification && notification.parentNode) {
        notification.classList.remove('notification-slide-in');
        notification.classList.add('notification-slide-out');
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

// Loading state management
function setLoadingState(element, isLoading) {
    if (!element) return;
    
    if (isLoading) {
        element.classList.add('loading-pulse');
        element.style.pointerEvents = 'none';
        element.style.opacity = '0.7';
    } else {
        element.classList.remove('loading-pulse');
        element.style.pointerEvents = '';
        element.style.opacity = '';
    }
}

// Add required CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    @keyframes progressShrink {
        from { transform: scaleX(1); }
        to { transform: scaleX(0); }
    }
    
    .site-footer {
        background: var(--glass-bg);
        backdrop-filter: var(--blur-medium);
        -webkit-backdrop-filter: var(--blur-medium);
        border-top: 1px solid var(--glass-border);
        text-align: center;
        padding: 32px;
        font-size: 0.9rem;
        color: var(--text-secondary);
        margin-top: 60px;
    }
    
    .site-footer a {
        color: var(--accent);
        text-decoration: none;
        font-weight: 500;
        transition: var(--transition-normal);
    }
    
    .site-footer a:hover {
        text-decoration: underline;
        opacity: 0.9;
    }
    
    @media (max-width: 1024px) {
        .site-footer {
            margin-left: 0 !important;
        }
    }
`;

if (!document.getElementById('admin-sidebar-styles')) {
    style.id = 'admin-sidebar-styles';
    document.head.appendChild(style);
}

// Export functions for use in other modules
window.adminSidebar = {
    showNotification,
    dismissNotification,
    setLoadingState,
    escapeHtml,
    isAdmin: () => isAdmin,
    getCurrentUserIP: () => currentUserIP
};
