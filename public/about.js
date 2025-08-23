// Minimal navigation handling for About page

document.addEventListener('DOMContentLoaded', () => {
  const menuButton = document.getElementById('menuButton');
  const navMenu = document.getElementById('navMenu');
  const navClose = document.getElementById('navClose');
  const navLinks = document.querySelectorAll('.nav-link');

  const openMenu = () => navMenu.classList.add('active');
  const closeMenu = () => navMenu.classList.remove('active');

  menuButton?.addEventListener('click', openMenu);
  navClose?.addEventListener('click', closeMenu);
  navLinks.forEach(link => link.addEventListener('click', closeMenu));
});
