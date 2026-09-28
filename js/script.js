/* ============================================================
   ISEM PORTFOLIO — SCRIPT
   ------------------------------------------------------------
   TABLE OF CONTENTS
   01. Utilities
   02. Theme Toggle
   03. Mobile Menu (slide-in panel)
   04. Navigation (scroll spy + smooth scroll)
   05. Header Scroll Shadow
   06. Reveal on Scroll
   07. Blog Filter + Load More
   08. Contact Form
   09. Boot
   ============================================================ */

(function () {
  'use strict';

  /* ============================================================
     01. UTILITIES
     ============================================================ */

  /** Debounce — limits how often a function runs. */
  function debounce(fn, wait = 100) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  /** Safe localStorage access (private mode can throw). */
  const storage = {
    get(key) {
      try { return localStorage.getItem(key); }
      catch { return null; }
    },
    set(key, value) {
      try { localStorage.setItem(key, value); }
      catch { /* ignore */ }
    }
  };

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));


  /* ============================================================
     02. THEME TOGGLE
     ============================================================ */
  function initTheme() {
    const toggle = $('#theme-toggle');
    if (!toggle) return;

    const icon = toggle.querySelector('i');
    const root = document.documentElement;

    // Apply saved theme (or system preference on first visit)
    const saved = storage.get('theme');
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    const isLight = saved ? saved === 'light' : prefersLight;

    applyTheme(isLight);

    toggle.addEventListener('click', () => {
      const next = !root.classList.contains('light-theme');
      applyTheme(next);
      storage.set('theme', next ? 'light' : 'dark');
    });

    function applyTheme(light) {
      root.classList.toggle('light-theme', light);
      toggle.setAttribute('aria-pressed', String(light));
      if (icon) {
        icon.classList.toggle('bx-sun', !light);
        icon.classList.toggle('bx-moon', light);
      }
    }
  }


  /* ============================================================
     03. MOBILE MENU (slide-in from right)
     ============================================================ */
  function initMobileMenu() {
    const btn  = $('#menu-icon');
    const nav  = $('#navbar');
    if (!btn || !nav) return;

    const icon = btn.querySelector('i');

    function open() {
      nav.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      btn.setAttribute('aria-label', 'Close navigation menu');
      icon?.classList.replace('bx-menu', 'bx-x');
      document.body.style.overflow = 'hidden';
    }

    function close() {
      nav.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', 'Open navigation menu');
      icon?.classList.replace('bx-x', 'bx-menu');
      document.body.style.overflow = '';
    }

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      nav.classList.contains('open') ? close() : open();
    });

    // Close when a nav link is clicked
    $$('.nav-link', nav).forEach(link => link.addEventListener('click', close));

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!nav.classList.contains('open')) return;
      if (!nav.contains(e.target) && !btn.contains(e.target)) close();
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('open')) close();
    });

    // Reset on resize to desktop
    window.addEventListener('resize', debounce(() => {
      if (window.innerWidth > 768) close();
    }, 150));
  }


  /* ============================================================
     04. NAVIGATION — scroll spy + smooth scroll
     ============================================================ */
  function initNavigation() {
    const links    = $$('.nav-link');
    const sections = $$('section[id]');
    const logo     = $('.logo');

    // Smooth scroll
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        const id = link.getAttribute('href');
        if (!id || !id.startsWith('#')) return;
        const target = document.querySelector(id);
        if (!target) return;

        e.preventDefault();
        const offset = target.getBoundingClientRect().top + window.scrollY - 60;
        window.scrollTo({ top: offset, behavior: 'smooth' });

        history.replaceState(null, '', id);
      });
    });

    // Logo → top
    if (logo) {
      logo.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        history.replaceState(null, '', '#home');
      });
    }

    // Scroll spy (debounced for performance)
    const setActive = debounce(() => {
      const pos = window.scrollY + 120;
      let currentId = 'home';

      sections.forEach(sec => {
        if (pos >= sec.offsetTop) currentId = sec.id;
      });

      links.forEach(link => {
        const match = link.getAttribute('href') === `#${currentId}`;
        link.classList.toggle('active', match);
      });
    }, 80);

    window.addEventListener('scroll', setActive, { passive: true });
    setActive();
  }


  /* ============================================================
     05. HEADER SCROLL SHADOW
     ============================================================ */
  function initHeaderShadow() {
    const header = $('#header');
    if (!header) return;

    const onScroll = debounce(() => {
      header.classList.toggle('scrolled', window.scrollY > 20);
    }, 50);

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }


  /* ============================================================
     06. REVEAL ON SCROLL
     ============================================================ */
  function initReveal() {
    const items = $$('.reveal');
    if (!items.length || !('IntersectionObserver' in window)) {
      items.forEach(el => el.classList.add('in-view'));
      return;
    }

    const io = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          // Small stagger for grouped cards
          entry.target.style.transitionDelay = `${Math.min(i * 60, 240)}ms`;
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -60px 0px'
    });

    items.forEach(el => io.observe(el));
  }


  /* ============================================================
     07. BLOG FILTER + LOAD MORE
     ============================================================ */
  function initBlog() {
    const filterBtns = $$('.filter-btn');
    const cards      = $$('.blog-card');
    const loadMore   = $('#load-more-posts');
    if (!filterBtns.length || !cards.length) return;

    let visibleCount = 3;
    const step = 3;

    function applyVisibility() {
      // First hide ALL based on current filter, then reveal by count
      const activeFilter = $('.filter-btn.active')?.dataset.filter || 'all';
      let shown = 0;

      cards.forEach(card => {
        const matches = activeFilter === 'all' || card.dataset.category === activeFilter;
        const within  = shown < visibleCount;

        if (matches && within) {
          card.classList.remove('hide');
          card.style.display = '';
          shown++;
        } else {
          card.classList.add('hide');
          card.style.display = 'none';
        }
      });

      // Show/hide Load More button
      if (loadMore) {
        const totalMatching = cards.filter(c =>
          activeFilter === 'all' || c.dataset.category === activeFilter
        ).length;
        loadMore.style.display = shown >= totalMatching ? 'none' : '';
      }
    }

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');

        visibleCount = step;
        applyVisibility();
      });
    });

    if (loadMore) {
      loadMore.addEventListener('click', () => {
        visibleCount += step;
        applyVisibility();
      });
    }

    applyVisibility();
  }


  /* ============================================================
     08. CONTACT FORM
     ============================================================ */
  function initContactForm() {
    const form   = $('#contactForm');
    const status = $('#statusMsg');
    if (!form || !status) return;

    const ENDPOINT = 'https://formspree.io/f/xdklrlyr';

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const btn = form.querySelector('button[type="submit"]');
      const originalHTML = btn.innerHTML;

      btn.disabled = true;
      btn.innerHTML = 'Sending…';
      setStatus('', '');

      try {
        const data = Object.fromEntries(new FormData(form).entries());

        const res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(data)
        });

        if (res.ok) {
          setStatus('✅ Message sent! I\'ll get back to you within 24 hours.', 'success');
          form.reset();
        } else {
          const body = await res.json().catch(() => ({}));
          const msg = body?.errors?.[0]?.message || 'Something went wrong. Please try again.';
          setStatus(`❌ ${msg}`, 'error');
        }
      } catch {
        setStatus('⚠️ Network error. Please check your connection.', 'warning');
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
      }
    });

    function setStatus(msg, type) {
      status.textContent = msg;
      status.className = '';
      if (type) status.classList.add(type);
    }
  }


  /* ============================================================
     09. BOOT
     ============================================================ */
  function boot() {
    initTheme();
    initMobileMenu();
    initNavigation();
    initHeaderShadow();
    initReveal();
    initBlog();
    initContactForm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();