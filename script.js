// =============================================================
// DOPTOP — site scripts
// =============================================================

document.getElementById('year').textContent = new Date().getFullYear();

/* -------------------------------------------------------------
   Reduced motion check
------------------------------------------------------------- */
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* -------------------------------------------------------------
   Works page — projects, nested photos, filters, carousel
   (guarded: only runs when these elements exist, i.e. on works.html)

   FOLDER CONVENTION (see /img/works/):
     img/works/<category>/project-<n>/<photo>.jpg
     categories: landing, card, site, infographic
     n: 1..MAX_PROJECTS_PER_CATEGORY
     photo: 1..MAX_PHOTOS_PER_PROJECT (1.jpg becomes the cover)
   Drop files matching this pattern and they appear automatically -
   no code changes needed. Missing projects/photos are simply skipped.
------------------------------------------------------------- */
const worksGrid = document.getElementById('worksGrid');

if (worksGrid) {
  const WORKS_CATEGORIES = {
    landing: 'Лендинг',
    card: 'Визитка',
    site: 'Сайт',
    infographic: 'Инфографика',
  };
  const MAX_PROJECTS_PER_CATEGORY = 6;
  const MAX_PHOTOS_PER_PROJECT = 6;

  const worksLoading = document.getElementById('worksLoading');
  const worksEmpty = document.getElementById('worksEmpty');
  const filterTabs = document.querySelectorAll('.filter-tab');

  let currentFilter = 'all';
  let allProjects = []; // populated after existence checks resolve

  function imageExists(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = src;
    });
  }

  async function checkProject(categoryKey, projectNum) {
    const coverSrc = `img/works/${categoryKey}/project-${projectNum}/1.jpg`;
    const coverExists = await imageExists(coverSrc);
    if (!coverExists) return null;

    const otherChecks = [];
    for (let p = 2; p <= MAX_PHOTOS_PER_PROJECT; p++) {
      const src = `img/works/${categoryKey}/project-${projectNum}/${p}.jpg`;
      otherChecks.push(imageExists(src).then((ok) => (ok ? src : null)));
    }
    const otherPhotos = (await Promise.all(otherChecks)).filter(Boolean);

    return {
      category: categoryKey,
      categoryLabel: WORKS_CATEGORIES[categoryKey],
      projectNum,
      title: `Проект ${projectNum}`,
      photos: [coverSrc, ...otherPhotos],
    };
  }

  async function discoverProjects() {
    const checks = [];
    Object.keys(WORKS_CATEGORIES).forEach((categoryKey) => {
      for (let n = 1; n <= MAX_PROJECTS_PER_CATEGORY; n++) {
        checks.push(checkProject(categoryKey, n));
      }
    });
    const results = await Promise.all(checks);
    return results.filter(Boolean);
  }

  function renderProjects() {
    worksGrid.innerHTML = '';
    allProjects.forEach((project, index) => {
      const article = document.createElement('article');
      article.className = 'work-item';
      article.dataset.category = project.category;
      if (currentFilter !== 'all' && project.category !== currentFilter) {
        article.classList.add('is-filtered-out');
      }
      article.innerHTML = `
        <div class="work-item__browser">
          <span class="dot dot--red"></span><span class="dot dot--yellow"></span><span class="dot dot--green"></span>
        </div>
        <div class="work-item__frame">
          <img src="${project.photos[0]}" alt="${project.title} - ${project.categoryLabel}" loading="lazy">
        </div>
        <div class="work-item__meta">
          <h3>${project.title}</h3>
          <span class="work-item__tag">${project.categoryLabel}</span>
        </div>
      `;
      article.addEventListener('click', () => openProject(index));
      worksGrid.appendChild(article);
    });
    checkEmpty();
  }

  function checkEmpty() {
    const visibleCount = allProjects.filter(
      (p) => currentFilter === 'all' || p.category === currentFilter
    ).length;
    if (worksEmpty) worksEmpty.classList.toggle('is-visible', visibleCount === 0);
  }

  function applyFilter(filterValue) {
    currentFilter = filterValue;
    filterTabs.forEach((tab) => {
      tab.classList.toggle('is-active', tab.dataset.filter === filterValue);
    });
    renderProjects();
  }

  filterTabs.forEach((tab) => {
    tab.addEventListener('click', () => applyFilter(tab.dataset.filter));
  });

  /* ---- project viewer (lightbox carousel) ---- */
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxClose = document.getElementById('lightboxClose');
  const lightboxPrev = document.getElementById('lightboxPrev');
  const lightboxNext = document.getElementById('lightboxNext');

  let activeProjectIndex = null;
  let activePhotoIndex = 0;

  function showPhoto() {
    const project = allProjects[activeProjectIndex];
    if (!project) return;
    lightboxImg.src = project.photos[activePhotoIndex];
    lightboxImg.alt = `${project.title} - фото ${activePhotoIndex + 1}`;
    lightboxCaption.textContent = `${project.title} - ${project.categoryLabel} - ${activePhotoIndex + 1}/${project.photos.length}`;
    const multiPhoto = project.photos.length > 1;
    lightboxPrev.style.display = multiPhoto ? '' : 'none';
    lightboxNext.style.display = multiPhoto ? '' : 'none';
  }

  function openProject(index) {
    activeProjectIndex = index;
    activePhotoIndex = 0;
    showPhoto();
    lightbox.classList.add('is-open');
  }
  function closeLightbox() {
    lightbox.classList.remove('is-open');
    lightboxImg.src = '';
    activeProjectIndex = null;
  }
  function nextPhoto() {
    const project = allProjects[activeProjectIndex];
    if (!project) return;
    activePhotoIndex = (activePhotoIndex + 1) % project.photos.length;
    showPhoto();
  }
  function prevPhoto() {
    const project = allProjects[activeProjectIndex];
    if (!project) return;
    activePhotoIndex = (activePhotoIndex - 1 + project.photos.length) % project.photos.length;
    showPhoto();
  }

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightboxNext) lightboxNext.addEventListener('click', nextPhoto);
  if (lightboxPrev) lightboxPrev.addEventListener('click', prevPhoto);
  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (activeProjectIndex === null) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') nextPhoto();
    if (e.key === 'ArrowLeft') prevPhoto();
  });

  /* ---- boot ---- */
  discoverProjects().then((projects) => {
    allProjects = projects;
    if (worksLoading) worksLoading.style.display = 'none';

    const initialHash = window.location.hash.replace('#', '');
    const validFilters = Array.from(filterTabs).map((t) => t.dataset.filter);
    if (initialHash && validFilters.includes(initialHash)) {
      currentFilter = initialHash;
      filterTabs.forEach((tab) => {
        tab.classList.toggle('is-active', tab.dataset.filter === initialHash);
      });
    }
    renderProjects();
  });
}

/* -------------------------------------------------------------
   FAQ accordion
------------------------------------------------------------- */
document.querySelectorAll('.faq__item').forEach(item => {
  const question = item.querySelector('.faq__question');
  question.addEventListener('click', () => {
    const isOpen = item.classList.contains('is-open');

    // close all other items (single-open accordion)
    document.querySelectorAll('.faq__item.is-open').forEach(openItem => {
      if (openItem !== item) {
        openItem.classList.remove('is-open');
        openItem.querySelector('.faq__question').setAttribute('aria-expanded', 'false');
      }
    });

    item.classList.toggle('is-open', !isOpen);
    question.setAttribute('aria-expanded', String(!isOpen));
  });
});

/* -------------------------------------------------------------
   Cookie consent banner
------------------------------------------------------------- */
const cookieBanner = document.getElementById('cookieBanner');
const cookieAccept = document.getElementById('cookieAccept');
const cookieDecline = document.getElementById('cookieDecline');
const COOKIE_KEY = 'doptop_cookie_consent';

function getCookieConsent() {
  try {
    return localStorage.getItem(COOKIE_KEY);
  } catch (e) {
    return null;
  }
}

function setCookieConsent(value) {
  try {
    localStorage.setItem(COOKIE_KEY, value);
  } catch (e) { /* localStorage unavailable — banner will just reappear next visit */ }
}

if (cookieBanner && !getCookieConsent()) {
  setTimeout(() => cookieBanner.classList.add('is-visible'), 800);
}

function hideCookieBanner() {
  cookieBanner.classList.remove('is-visible');
}

if (cookieAccept) {
  cookieAccept.addEventListener('click', () => {
    setCookieConsent('accepted');
    hideCookieBanner();
  });
}
if (cookieDecline) {
  cookieDecline.addEventListener('click', () => {
    setCookieConsent('declined');
    hideCookieBanner();
  });
}

/* -------------------------------------------------------------
   Custom cursor
------------------------------------------------------------- */
const cursorDot = document.getElementById('cursorDot');
const cursorRing = document.getElementById('cursorRing');
const supportsFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

if (cursorDot && cursorRing && supportsFinePointer && !prefersReducedMotion) {
  let hasMoved = false;
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let ringX = mouseX;
  let ringY = mouseY;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursorDot.style.left = `${mouseX}px`;
    cursorDot.style.top = `${mouseY}px`;

    if (!hasMoved) {
      hasMoved = true;
      ringX = mouseX;
      ringY = mouseY;
      document.documentElement.classList.add('has-custom-cursor');
    }
  }, { once: false });

  // smooth trailing ring via lerp
  function animateRing() {
    if (hasMoved) {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      cursorRing.style.left = `${ringX}px`;
      cursorRing.style.top = `${ringY}px`;
    }
    requestAnimationFrame(animateRing);
  }
  animateRing();

  const interactiveSelector = 'a, button, input, textarea, .faq__question, .work-teaser, .work-item, .service-card, .process__card, .filter-tab';

  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(interactiveSelector)) {
      cursorRing.classList.add('is-hovering');
      cursorDot.classList.add('is-hovering');
    }
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(interactiveSelector)) {
      cursorRing.classList.remove('is-hovering');
      cursorDot.classList.remove('is-hovering');
    }
  });

  window.addEventListener('mousedown', () => cursorRing.classList.add('is-clicking'));
  window.addEventListener('mouseup', () => cursorRing.classList.remove('is-clicking'));

  document.addEventListener('mouseleave', () => {
    cursorDot.style.opacity = '0';
    cursorRing.style.opacity = '0';
  });
  document.addEventListener('mouseenter', () => {
    if (hasMoved) {
      cursorDot.style.opacity = '';
      cursorRing.style.opacity = '';
    }
  });
}

/* -------------------------------------------------------------
   Hero spotlight — follows the cursor
------------------------------------------------------------- */
const heroEl = document.getElementById('top');
const spotlightEl = document.getElementById('heroSpotlight');

if (heroEl && spotlightEl && !prefersReducedMotion && window.matchMedia('(hover: hover)').matches) {
  heroEl.addEventListener('mousemove', (e) => {
    const rect = heroEl.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    spotlightEl.style.setProperty('--spot-x', `${x}%`);
    spotlightEl.style.setProperty('--spot-y', `${y}%`);
  });
}

/* -------------------------------------------------------------
   Terminal typing animation
------------------------------------------------------------- */
const typedLineEl = document.getElementById('typedLine');
const terminalOutputEl = document.getElementById('terminalOutput');
const typeCursor = document.getElementById('typeCursor');

const COMMAND = 'npm run build:website';

const OUTPUT_LINES = [
  { text: 'compiling DopTop/src ...', ok: false },
  { text: 'bundling assets ...', ok: false },
  { text: 'build complete ✓ 0 errors, 0 warnings', ok: true }
];

const TYPE_SPEED = 55;
const PAUSE_BEFORE_OUTPUT = 300;
const PAUSE_BETWEEN_OUTPUT_LINES = 450;
const PAUSE_BEFORE_RESTART = 2600;

function runTerminalCycle() {
  typedLineEl.textContent = '';
  terminalOutputEl.innerHTML = '';
  if (typeCursor) typeCursor.style.animation = '';

  if (prefersReducedMotion) {
    typedLineEl.textContent = COMMAND;
    renderOutputInstant();
    return; // no loop when motion is reduced — static final state
  }

  let i = 0;

  function typeChar() {
    if (i <= COMMAND.length) {
      typedLineEl.textContent = COMMAND.slice(0, i);
      i++;
      setTimeout(typeChar, TYPE_SPEED);
    } else {
      setTimeout(revealOutput, PAUSE_BEFORE_OUTPUT);
    }
  }
  typeChar();
}

function revealOutput() {
  OUTPUT_LINES.forEach((line, idx) => {
    setTimeout(() => {
      const div = document.createElement('div');
      div.innerHTML = line.ok
        ? `<span class="ok">${line.text}</span>`
        : line.text;
      terminalOutputEl.appendChild(div);
      requestAnimationFrame(() => div.classList.add('show'));
    }, idx * PAUSE_BETWEEN_OUTPUT_LINES);
  });

  const totalOutputTime = OUTPUT_LINES.length * PAUSE_BETWEEN_OUTPUT_LINES;

  // stop blinking cursor once the sequence is done, then loop
  setTimeout(() => {
    if (typeCursor) typeCursor.style.animation = 'none';
  }, totalOutputTime + 400);

  setTimeout(runTerminalCycle, totalOutputTime + PAUSE_BEFORE_RESTART);
}

function renderOutputInstant() {
  OUTPUT_LINES.forEach(line => {
    const div = document.createElement('div');
    div.innerHTML = line.ok ? `<span class="ok">${line.text}</span>` : line.text;
    div.classList.add('show');
    terminalOutputEl.appendChild(div);
  });
}

if (typedLineEl && terminalOutputEl) {
  runTerminalCycle();
}

/* -------------------------------------------------------------
   Scroll reveal (IntersectionObserver)
------------------------------------------------------------- */
const revealTargets = document.querySelectorAll('.service-card, .process__card, .work-teaser');

if ('IntersectionObserver' in window && !prefersReducedMotion) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, idx) => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const delay = (idx % 4) * 90;
        setTimeout(() => el.classList.add('in-view'), delay);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.15 });

  revealTargets.forEach(el => observer.observe(el));
} else {
  revealTargets.forEach(el => el.classList.add('in-view'));
}

/* -------------------------------------------------------------
   Mobile nav toggle
------------------------------------------------------------- */
const nav = document.getElementById('nav');
const burger = document.getElementById('burger');
const navLinks = document.getElementById('navLinks');

burger.addEventListener('click', () => {
  nav.classList.toggle('nav--open');
});

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => nav.classList.remove('nav--open'));
});

