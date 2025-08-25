/* ==========================================
   DASHBOARD-SPECIFIC FUNCTIONALITY
   ========================================== */

// Dashboard data
let dashboardData = {
    posts: [],
    projects: [],
    images: [],
    adminIPs: [],
    stats: {
        totalPosts: 0,
        publishedPosts: 0,
        draftPosts: 0,
        totalProjects: 0,
        totalImages: 0,
        totalIPs: 0
    }
};

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for admin access check to complete
    setTimeout(initializeDashboard, 100);
});

// Initialize dashboard functionality
async function initializeDashboard() {
    if (!window.adminSidebar?.isAdmin()) {
        return; // Exit if not admin
    }
    
    try {
        // Load all dashboard data
        await Promise.all([
            loadDashboardStats(),
            loadRecentActivity()
        ]);
        
        // Add interactivity enhancements
        enhanceDashboardInteractivity();
        
        // Start real-time updates
        startRealTimeUpdates();
        
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        window.adminSidebar?.showNotification('Failed to load dashboard data', 'error');
    }
}

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        // Load all data in parallel for better performance
        const [postsResponse, projectsResponse, imagesResponse, ipsResponse] = await Promise.all([
            fetch('/api/admin-posts').catch(() => ({ json: () => [] })),
            fetch('/api/admin-projects').catch(() => ({ json: () => [] })),
            fetch('/api/admin-images').catch(() => ({ json: () => [] })),
            fetch('/api/admin-ips').catch(() => ({ json: () => [] }))
        ]);
        
        // Parse responses
        dashboardData.posts = await postsResponse.json() || [];
        dashboardData.projects = await projectsResponse.json() || [];
        dashboardData.images = await imagesResponse.json() || [];
        dashboardData.adminIPs = await ipsResponse.json() || [];
        
        // Calculate statistics
        calculateStats();
        
        // Update UI with animations
        updateStatsDisplay();
        
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        
        // Show placeholder data
        updateStatsDisplay();
    }
}

// Calculate statistics from loaded data
function calculateStats() {
    const posts = dashboardData.posts;
    const projects = dashboardData.projects;
    const images = dashboardData.images;
    const adminIPs = dashboardData.adminIPs;
    
    dashboardData.stats = {
        totalPosts: posts.length,
        publishedPosts: posts.filter(post => post.is_published !== false).length,
        draftPosts: posts.filter(post => post.is_published === false).length,
        totalProjects: projects.length,
        totalImages: images.length,
        totalIPs: adminIPs.length || 1 // At least current admin
    };
}

// Update statistics display with animations
function updateStatsDisplay() {
    const stats = dashboardData.stats;
    
    // Animate counters
    animateCounter('totalPosts', stats.totalPosts);
    animateCounter('totalProjects', stats.totalProjects);
    animateCounter('totalImages', stats.totalImages);
    animateCounter('totalIPs', stats.totalIPs);
    
    // Add pulsing effect for zero values
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach((card, index) => {
        const value = Object.values(stats)[index];
        if (value === 0) {
            card.classList.add('loading-pulse');
            setTimeout(() => card.classList.remove('loading-pulse'), 2000);
        }
    });
}

// Animate counter with easing
function animateCounter(elementId, targetValue, duration = 1000) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const startValue = 0;
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
            
            // Add completion animation
            element.style.transform = 'scale(1.1)';
            setTimeout(() => {
                element.style.transform = 'scale(1)';
            }, 200);
        }
    }
    
    requestAnimationFrame(updateCounter);
}

// Load and display recent activity
async function loadRecentActivity() {
    try {
        const activities = generateRecentActivities();
        displayRecentActivity(activities);
    } catch (error) {
        console.error('Error loading recent activity:', error);
        displayRecentActivity([]);
    }
}

// Generate recent activities based on data
function generateRecentActivities() {
    const activities = [];
    const posts = dashboardData.posts;
    const projects = dashboardData.projects;
    const images = dashboardData.images;
    
    // Add recent posts
    posts.slice(0, 3).forEach(post => {
        activities.push({
            type: 'post',
            icon: 'file-text',
            text: `Blog post "${post.title}" ${post.is_published !== false ? 'published' : 'saved as draft'}`,
            time: formatRelativeTime(post.created_at),
            timestamp: new Date(post.created_at)
        });
    });
    
    // Add recent projects
    projects.slice(0, 2).forEach(project => {
        activities.push({
            type: 'project',
            icon: 'folder',
            text: `Project "${project.title}" updated`,
            time: formatRelativeTime(project.created_at || Date.now()),
            timestamp: new Date(project.created_at || Date.now())
        });
    });
    
    // Add recent images
    images.slice(0, 2).forEach(image => {
        activities.push({
            type: 'image',
            icon: 'image',
            text: `Image "${image.name}" uploaded`,
            time: formatRelativeTime(image.created_at || Date.now()),
            timestamp: new Date(image.created_at || Date.now())
        });
    });
    
    // Sort by timestamp (most recent first)
    activities.sort((a, b) => b.timestamp - a.timestamp);
    
    return activities.slice(0, 5); // Show only 5 most recent
}

// Display recent activity with animations
function displayRecentActivity(activities) {
    const activityList = document.getElementById('activityList');
    if (!activityList) return;
    
    if (activities.length === 0) {
        activityList.innerHTML = `
            <div class="activity-item">
                <div class="activity-icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="6" stroke="white" stroke-width="2"/>
                        <path d="M8 4v4l2 2" stroke="white" stroke-width="2"/>
                    </svg>
                </div>
                <div class="activity-content">
                    <div class="activity-text">No recent activity</div>
                    <div class="activity-time">Start creating content to see activity here</div>
                </div>
            </div>
        `;
        return;
    }
    
    // Clear existing activities
    activityList.innerHTML = '';
    
    // Add activities with staggered animation
    activities.forEach((activity, index) => {
        const activityElement = createActivityElement(activity);
        activityElement.style.opacity = '0';
        activityElement.style.transform = 'translateY(20px)';
        activityElement.classList.add(`list-item-${index + 1}`);
        
        activityList.appendChild(activityElement);
        
        // Animate in
        setTimeout(() => {
            activityElement.style.opacity = '1';
            activityElement.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// Create activity element
function createActivityElement(activity) {
    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item hover-lift';
    
    const iconSvg = getActivityIcon(activity.icon);
    
    activityItem.innerHTML = `
        <div class="activity-icon">
            ${iconSvg}
        </div>
        <div class="activity-content">
            <div class="activity-text">${window.adminSidebar?.escapeHtml(activity.text)}</div>
            <div class="activity-time">${activity.time}</div>
        </div>
    `;
    
    return activityItem;
}

// Get SVG icon for activity type
function getActivityIcon(iconType) {
    const icons = {
        'file-text': `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 2h6l2 2v10H4V2z" stroke="white" stroke-width="1.5"/>
                <path d="M6 6h4M6 8h4M6 10h2" stroke="white" stroke-width="1.5"/>
            </svg>
        `,
        'folder': `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 4h4l2-2h6v10H2V4z" stroke="white" stroke-width="1.5"/>
            </svg>
        `,
        'image': `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="12" rx="1" stroke="white" stroke-width="1.5"/>
                <path d="M6 8l2 2 4-4" stroke="white" stroke-width="1.5"/>
                <circle cx="5.5" cy="5.5" r="1" stroke="white" stroke-width="1.5"/>
            </svg>
        `,
        'default': `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="white" stroke-width="1.5"/>
                <path d="M8 4v4l2 2" stroke="white" stroke-width="1.5"/>
            </svg>
        `
    };
    
    return icons[iconType] || icons.default;
}

// Format relative time
function formatRelativeTime(dateInput) {
    const date = new Date(dateInput);
    const now = new Date();
    const diff = now - date;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
        return `${days} day${days === 1 ? '' : 's'} ago`;
    } else if (hours > 0) {
        return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    } else if (minutes > 0) {
        return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    } else {
        return 'Just now';
    }
}

// Enhance dashboard interactivity
function enhanceDashboardInteractivity() {
    // Add keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Add hover effects to stats cards
    enhanceStatsCards();
    
    // Add hover effects to action cards
    enhanceActionCards();
    
    // Add parallax effect on scroll
    addParallaxEffect();
}

// Handle keyboard shortcuts
function handleKeyboardShortcuts(event) {
    // Only handle shortcuts when not in an input field
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
    }
    
    // Ctrl/Cmd + shortcuts
    if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
            case '1':
                event.preventDefault();
                window.location.href = 'posts.html';
                break;
            case '2':
                event.preventDefault();
                window.location.href = 'projects.html';
                break;
            case '3':
                event.preventDefault();
                window.location.href = 'images.html';
                break;
            case '4':
                event.preventDefault();
                window.location.href = 'ips.html';
                break;
            case 'r':
                event.preventDefault();
                refreshDashboard();
                break;
        }
    }
}

// Enhance stats cards with advanced interactions
function enhanceStatsCards() {
    const statCards = document.querySelectorAll('.stat-card');
    
    statCards.forEach((card, index) => {
        // Add click handler for navigation
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
            const pages = ['posts.html', 'projects.html', 'images.html', 'ips.html'];
            if (pages[index]) {
                window.location.href = pages[index];
            }
        });
        
        // Add enhanced hover effect
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-8px) scale(1.02)';
            card.style.boxShadow = 'var(--glass-shadow-hover)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0) scale(1)';
            card.style.boxShadow = 'var(--glass-shadow)';
        });
    });
}

// Enhance action cards
function enhanceActionCards() {
    const actionCards = document.querySelectorAll('.action-card');
    
    actionCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-4px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0) scale(1)';
        });
    });
}

// Add subtle parallax effect
function addParallaxEffect() {
    let ticking = false;
    
    function updateParallax() {
        const scrolled = window.pageYOffset;
        const parallaxElements = document.querySelectorAll('.stat-card, .action-card');
        
        parallaxElements.forEach((element, index) => {
            const speed = 0.5 + (index * 0.1);
            const yPos = -(scrolled * speed);
            element.style.transform = `translateY(${yPos}px)`;
        });
        
        ticking = false;
    }
    
    function requestTick() {
        if (!ticking) {
            requestAnimationFrame(updateParallax);
            ticking = true;
        }
    }
    
    window.addEventListener('scroll', requestTick);
}

// Refresh dashboard data
async function refreshDashboard() {
    window.adminSidebar?.showNotification('Refreshing dashboard...', 'info', 1000);
    
    try {
        await loadDashboardStats();
        await loadRecentActivity();
        window.adminSidebar?.showNotification('Dashboard refreshed', 'success');
    } catch (error) {
        console.error('Error refreshing dashboard:', error);
        window.adminSidebar?.showNotification('Failed to refresh dashboard', 'error');
    }
}

// Start real-time updates
function startRealTimeUpdates() {
    // Refresh dashboard every 5 minutes
    setInterval(refreshDashboard, 5 * 60 * 1000);
    
    // Update relative times every minute
    setInterval(() => {
        const activities = generateRecentActivities();
        displayRecentActivity(activities);
    }, 60 * 1000);
}

// Add dashboard-specific styles
const dashboardStyles = document.createElement('style');
dashboardStyles.textContent = `
    .stat-card {
        transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    }
    
    .stat-card:hover .stat-value {
        color: var(--accent);
    }
    
    .action-card {
        transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    }
    
    .activity-item {
        transition: all 0.3s ease;
    }
    
    .activity-item:hover .activity-icon {
        transform: scale(1.1);
        box-shadow: 0 4px 16px var(--accent-light);
    }
    
    /* Keyboard shortcut hints */
    .keyboard-hint {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--glass-bg);
        backdrop-filter: var(--blur-medium);
        border: 1px solid var(--glass-border);
        border-radius: 12px;
        padding: 8px 16px;
        font-size: 0.8rem;
        color: var(--text-secondary);
        opacity: 0;
        transition: opacity 0.3s ease;
        z-index: 1000;
    }
    
    .keyboard-hint.show {
        opacity: 1;
    }
`;

if (!document.getElementById('dashboard-styles')) {
    dashboardStyles.id = 'dashboard-styles';
    document.head.appendChild(dashboardStyles);
}

// Export dashboard functions
window.dashboard = {
    refreshDashboard,
    loadDashboardStats,
    loadRecentActivity
};
