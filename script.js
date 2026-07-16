(() => {
  const body = document.body;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  window.addEventListener('load', () => {
    window.setTimeout(() => body.classList.add('is-loaded'), reduceMotion ? 0 : 250);
  });
  window.setTimeout(() => body.classList.add('is-loaded'), 2200);

  document.querySelectorAll('[data-year]').forEach((node) => {
    node.textContent = new Date().getFullYear();
  });

  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.site-nav');

  const closeMenu = () => {
    body.classList.remove('nav-open');
    menuButton?.setAttribute('aria-expanded', 'false');
  };

  menuButton?.addEventListener('click', () => {
    const open = body.classList.toggle('nav-open');
    menuButton.setAttribute('aria-expanded', String(open));
  });

  nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });

  const revealItems = document.querySelectorAll('.reveal, .image-reveal');
  if (reduceMotion) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  } else {
    window.requestAnimationFrame(() => {
      window.setTimeout(() => revealItems.forEach((item) => item.classList.add('is-visible')), 120);
    });
  }

  const header = document.querySelector('[data-header]');
  let previousY = window.scrollY;
  let ticking = false;

  const updateHeader = () => {
    const currentY = window.scrollY;
    const movingDown = currentY > previousY && currentY > 140;
    if (!body.classList.contains('nav-open')) header?.classList.toggle('is-hidden', movingDown);
    previousY = currentY;
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(updateHeader);
      ticking = true;
    }
  }, { passive: true });

  if (!reduceMotion) {
    const parallaxImages = document.querySelectorAll('.about-image img, .release-art img');
    window.addEventListener('scroll', () => {
      parallaxImages.forEach((image) => {
        const rect = image.parentElement.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) return;
        const offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * -0.025;
        image.style.translate = `0 ${offset}px`;
      });
    }, { passive: true });
  }
})();
