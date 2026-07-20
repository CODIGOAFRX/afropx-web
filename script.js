(() => {
  const body = document.body;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = document.querySelector('[data-header]');

  window.addEventListener('load', () => {
    window.setTimeout(() => body.classList.add('is-loaded'), reduceMotion ? 0 : 250);
  });
  window.setTimeout(() => body.classList.add('is-loaded'), 2200);

  document.querySelectorAll('[data-year]').forEach((node) => {
    node.textContent = new Date().getFullYear();
  });

  const releaseLinks = window.AFROPX_RELEASE_LINKS || {};
  document.querySelectorAll('[data-release-link]').forEach((link) => {
    const url = String(releaseLinks[link.dataset.releaseLink] || link.getAttribute('href') || '').trim();
    const note = link.querySelector('[data-release-note]');

    if (url) {
      link.href = url;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.classList.remove('is-unavailable');
      link.removeAttribute('aria-disabled');
      if (note) note.textContent = link.dataset.readyLabel || 'Abrir enlace';
      return;
    }

    link.removeAttribute('href');
    link.classList.add('is-unavailable');
    link.setAttribute('aria-disabled', 'true');
    if (note) note.textContent = 'Disponible pronto';
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
    if (open) header?.classList.remove('is-hidden');
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

  let previousY = window.scrollY;
  let ticking = false;

  const updateHeader = () => {
    const currentY = window.scrollY;
    const movingDown = currentY > previousY && currentY > 140;
    const artistHasLeftTop = body.classList.contains('artist-page') && currentY > 80;
    if (!body.classList.contains('nav-open')) {
      header?.classList.toggle('is-hidden', artistHasLeftTop || movingDown);
    }
    previousY = currentY;
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(updateHeader);
      ticking = true;
    }
  }, { passive: true });
  window.requestAnimationFrame(updateHeader);

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
