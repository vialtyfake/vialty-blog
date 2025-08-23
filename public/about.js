document.addEventListener('DOMContentLoaded', () => {
  const menuButton = document.getElementById('menuButton');
  const navMenu = document.getElementById('navMenu');
  const navClose = document.getElementById('navClose');
  const navLinks = document.querySelectorAll('.nav-link');

  function openNav() {
    navMenu.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeNav() {
    navMenu.classList.remove('active');
    document.body.style.overflow = 'auto';
  }

  menuButton?.addEventListener('click', openNav);
  navClose?.addEventListener('click', closeNav);
  navLinks.forEach(link => link.addEventListener('click', closeNav));
});
