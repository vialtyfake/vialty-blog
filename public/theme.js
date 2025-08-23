(function() {
  const root = document.documentElement;
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  function applyTheme(theme) {
    let active = theme;
    if (theme === 'system') {
      active = mediaQuery.matches ? 'dark' : 'light';
    }
    root.setAttribute('data-theme', active);
  }

  const saved = localStorage.getItem('theme') || 'system';
  applyTheme(saved);

  mediaQuery.addEventListener('change', () => {
    if ((localStorage.getItem('theme') || 'system') === 'system') {
      applyTheme('system');
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    const selector = document.getElementById('themeSelector');
    if (!selector) return;
    selector.value = saved;
    selector.addEventListener('change', (e) => {
      const choice = e.target.value;
      localStorage.setItem('theme', choice);
      applyTheme(choice);
    });
  });
})();
