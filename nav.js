// Mobile hamburger toggle
const toggle = document.getElementById('navToggle');
const links  = document.getElementById('navLinks');

if (toggle && links) {
  toggle.addEventListener('click', () => links.classList.toggle('open'));
  links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => links.classList.remove('open'));
  });
}

// Shrink nav on scroll
window.addEventListener('scroll', () => {
  const nav = document.querySelector('nav.topnav');
  if (!nav) return;
  if (window.scrollY > 50) {
    nav.style.borderBottomColor = 'rgba(0,241,253,0.6)';
  } else {
    nav.style.borderBottomColor = '';
  }
});
