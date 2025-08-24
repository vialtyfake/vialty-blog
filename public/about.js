// About page: navigation + projects loader and modal

function resolveImageUrl(image) {
  if (!image) return '';
  if (image.startsWith('http')) return image;
  if (image.startsWith('/')) return image;
  return `/uploads/${image}`;
}

let projects = [];

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

function formatDate(date) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

document.addEventListener('DOMContentLoaded', async () => {
  // Navigation
  const menuButton = document.getElementById('menuButton');
  const navMenu = document.getElementById('navMenu');
  const navClose = document.getElementById('navClose');
  const navLinks = document.querySelectorAll('.nav-link');

  if (menuButton) {
    menuButton.addEventListener('click', () => {
      navMenu.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  }

  const closeNav = () => {
    navMenu.classList.remove('active');
    document.body.style.overflow = 'auto';
  };

  if (navClose) navClose.addEventListener('click', closeNav);
  navLinks.forEach(link => link.addEventListener('click', closeNav));

  // Load projects for About page
  await loadProjects();
});

async function loadProjects() {
  const projectsGrid = document.getElementById('projectsGrid');
  if (!projectsGrid) return;

  const skeleton = `
    <div class="project-card skeleton">
      <div class="skeleton-thumb"></div>
      <div class="skeleton-lines"><span></span><span></span></div>
    </div>`;
  projectsGrid.innerHTML = new Array(6).fill(0).map(() => skeleton).join('');

  try {
    const response = await fetch('/api/projects');
    projects = await response.json();
    renderProjects();
  } catch (error) {
    console.error('Error loading projects:', error);
    projectsGrid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:40px;color:rgba(255,255,255,0.5);">
        Unable to load projects. Please try again later.
      </div>`;
  }
}

function renderProjects() {
  const projectsGrid = document.getElementById('projectsGrid');
  if (!projectsGrid) return;

  if (projects.length === 0) {
    projectsGrid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:40px;color:rgba(255,255,255,0.5);">
        No projects added yet.
      </div>`;
    return;
  }

  const html = projects.map(project => {
    const imageUrl = resolveImageUrl(project.image);
    const title = escapeHtml(project.title || 'Untitled');
    const role = project.role ? escapeHtml(project.role) : '';
    const stack = project.stack ? escapeHtml(project.stack) : '';
    const dateRange = project.startDate ? `${formatDate(new Date(project.startDate))} - ${project.endDate ? formatDate(new Date(project.endDate)) : 'Present'}` : '';
    const initial = title.charAt(0).toUpperCase();

    return `
    <div class="project-card" role="button" tabindex="0" aria-label="Open project: ${title}" onclick="openProject('${project.id}')" onkeypress="if(event.key==='Enter'||event.key===' '){openProject('${project.id}')}" >
      <div class="project-media">
        ${project.image ? `<img src="${imageUrl}" alt="${title}" class="project-image"/>` : `<div class="project-placeholder" aria-hidden="true">${initial}</div>`}
        <span class="project-shine" aria-hidden="true"></span>
        <div class="project-badges">
          ${role ? `<span class="project-badge role">${role}</span>` : ''}
          ${stack ? `<span class="project-badge stack">${stack}</span>` : ''}
        </div>
        <div class="project-overlay">
          <h3 class="project-title">${title}</h3>
          ${dateRange ? `<p class="project-dates">${escapeHtml(dateRange)}</p>` : ''}
        </div>
      </div>
      <div class="project-footer">
        <span class="project-cta">View details</span>
        <span class="project-arrow" aria-hidden="true">→</span>
      </div>
    </div>`;
  }).join('');

  projectsGrid.innerHTML = html;
}

window.openProject = function(projectId) {
  const project = projects.find(p => p.id === projectId);
  if (project) openProjectView(project);
}

function openProjectView(project) {
  const modal = document.getElementById('projectViewModal');
  const body = document.getElementById('projectModalBody');
  if (!modal || !body) return;
  const imageUrl = resolveImageUrl(project.image);
  const dateRange = project.startDate ? `${formatDate(new Date(project.startDate))} - ${project.endDate ? formatDate(new Date(project.endDate)) : 'Present'}` : '';
  body.innerHTML = `
    ${project.image ? `<img src="${imageUrl}" alt="${escapeHtml(project.title)}" class="modal-project-image"/>` : ''}
    <h1 class="modal-project-title">${escapeHtml(project.title)}</h1>
    <p class="modal-project-meta">${escapeHtml(project.role || '')} · ${escapeHtml(project.stack || '')}</p>
    ${dateRange ? `<p class="modal-project-dates">${escapeHtml(dateRange)}</p>` : ''}
    <p class="modal-project-blurb">${escapeHtml(project.blurb || '')}</p>
    ${project.link ? `<a href="${project.link}" class="project-link" target="_blank" rel="noopener">Visit Project</a>` : ''}
  `;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

window.closeProjectView = function() {
  const modal = document.getElementById('projectViewModal');
  if (modal) modal.classList.remove('active');
  document.body.style.overflow = 'auto';
}
