/* ==========================================
   ADMIN SIDEBAR FUNCTIONALITY
   ========================================== */

// Admin state management
let adminState = {
    isAdminUser: false,
    currentIP: '',
    isInitialized: false
};

// Initialize admin access check
document.addEventListener('DOMContentLoaded', async () => {
    await checkAdminAccess();
});

// Check if user has admin access
async function checkAdminAccess() {
    try {
        const response = await fetch('/api/admin-check');
        const data = await response.json();
        
        adminState.isAdminUser = data.isAdmin;
        adminState.currentIP = data.ip;
        adminState.isInitialized = true;
        
        // Update UI based on access
        const accessCheck = document.getElementById('accessCheck');
        const accessDenied = document.getElementById('accessDenied');
        const adminDashboard = document.getElementById('adminDashboard');
        const userIPSpan = document.getElementById('userIP');
        const adminIPSpan = document.getElementById('adminIP');
        
        if (accessCheck) accessCheck.style.display = 'none';
        
        if (adminState.isAdminUser) {
            // Show admin dashboard
            if (adminDashboard) adminDashboard.style.display = 'flex';
            if (adminIPSpan) adminIPSpan.textContent = adminState.currentIP;
            
            // Initialize sidebar functionality
            initializeSidebar();
        } else {
            // Show access denied
            if (accessDenied) accessDenied.style.display = 'flex';
            if (userIPSpan) userIPSpan.textContent = adminState.currentIP;
        }
    } catch (error) {
        console.error('Error checking admin access:', error);
        // Show access denied on error
        const accessCheck = document.getElementById('accessCheck');
        const accessDenied = document.getElementById('accessDenied');
        const userIPSpan = document.getElementById('userIP');
        
        if (accessCheck) accessCheck.style.display = 'none';
        if (accessDenied) accessDenied.style.display = 'flex';
        if (userIPSpan) userIPSpan.textContent = 'Unable to verify';
    }
}

// Initialize sidebar functionality
function initializeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    // Mobile sidebar functionality
    if (sidebarToggle && sidebar && sidebarOverlay) {
        const closeSidebar = () => {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('active');
            document.body.classList.remove('sidebar-open');
            sidebarToggle.setAttribute('aria-expanded', 'false');
        };

        sidebarToggle.addEventListener('click', () => {
            const isOpen = sidebar.classList.toggle('open');
            sidebarOverlay.classList.toggle('active', isOpen);
            document.body.classList.toggle('sidebar-open', isOpen);
            sidebarToggle.setAttribute('aria-expanded', String(isOpen));
        });

        sidebarOverlay.addEventListener('click', closeSidebar);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && sidebar.classList.contains('open')) {
                closeSidebar();
            }
        });

        // Show toggle button on mobile
        const checkMobile = () => {
            if (window.innerWidth <= 1024) {
                sidebarToggle.style.display = 'block';
            } else {
                sidebarToggle.style.display = 'none';
                closeSidebar();
            }
        };

        window.addEventListener('resize', checkMobile);
        checkMobile();
    }
}

// Utility functions for admin functionality
const adminSidebar = {
    // Check if current user is admin
    isAdmin() {
        return adminState.isAdminUser;
    },

    // Get current user IP
    getCurrentIP() {
        return adminState.currentIP;
    },

    // Check if admin system is initialized
    isInitialized() {
        return adminState.isInitialized;
    },

    // Show notification
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `admin-notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            max-width: 400px;
            font-size: 0.9rem;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },

    // Set loading state for elements
    setLoadingState(element, isLoading) {
        if (!element) return;
        
        if (isLoading) {
            element.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; padding: 40px; color: var(--text-secondary);">
                    <div class="loading-spinner" style="margin-right: 12px;"></div>
                    Loading...
                </div>
            `;
        }
    },

    // Escape HTML for safe rendering
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    },

    // Format date
    formatDate(dateString) {
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return 'Invalid Date';
        }
    },

    // Format relative time
    formatRelativeTime(dateString) {
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffInSeconds = Math.floor((now - date) / 1000);
            
            if (diffInSeconds < 60) return 'just now';
            if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
            if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
            if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
            
            return this.formatDate(dateString);
        } catch (error) {
            return 'Unknown';
        }
    }
};

// Add notification animations
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    .loading-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid var(--glass-border);
        border-top: 2px solid var(--accent);
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;

if (!document.getElementById('admin-sidebar-styles')) {
    notificationStyles.id = 'admin-sidebar-styles';
    document.head.appendChild(notificationStyles);
}

// Export for global access
window.adminSidebar = adminSidebar;
