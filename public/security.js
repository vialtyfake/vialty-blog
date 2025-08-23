// Simple navigation controls for Security page

document.addEventListener('DOMContentLoaded', () => {
  const menuButton = document.getElementById('menuButton');
  const navMenu = document.getElementById('navMenu');
  const navClose = document.getElementById('navClose');
  const navLinks = document.querySelectorAll('.nav-link');

  menuButton.addEventListener('click', () => {
    navMenu.classList.add('active');
    document.body.style.overflow = 'hidden';
  });

  const closeNav = () => {
    navMenu.classList.remove('active');
    document.body.style.overflow = 'auto';
  };

  navClose.addEventListener('click', closeNav);
  navLinks.forEach(link => link.addEventListener('click', closeNav));
});

