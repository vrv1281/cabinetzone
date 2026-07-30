/* CabinetZone — shared site behaviour
   Injects nav + footer partials, wires up nav scroll,
   mobile menu, smooth-scroll (home only), and reveal. */
(function () {
  'use strict';

  var path = window.location.pathname;
  var isHome = path === '/' || path.endsWith('/index.html') || path === '/index.html';

  /* ── Smooth scroll to section (home page only) ── */
  function navTo(id) {
    closeMM();
    setTimeout(function () {
      var el = document.getElementById(id);
      if (!el) { window.location.href = 'index.html#' + id; return; }
      var navH = (document.getElementById('navbar') || {offsetHeight: 0}).offsetHeight;
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - navH - 16, behavior: 'smooth' });
    }, 80);
  }
  window.navTo = navTo;

  function openMM()  { var m = document.getElementById('mmenu'); if (m) m.classList.add('open'); }
  function closeMM() { var m = document.getElementById('mmenu'); if (m) m.classList.remove('open'); }
  window.openMM  = openMM;
  window.closeMM = closeMM;

  /* ── Nav behaviour (called after nav HTML is in DOM) ── */
  function initNav() {
    var nav   = document.getElementById('navbar');
    var mopen = document.getElementById('mopen');
    var mclose = document.getElementById('mclose');
    if (!nav) return;

    /* Non-home pages: nav is always opaque (no hero behind it) */
    if (!isHome) nav.classList.add('scrolled');

    window.addEventListener('scroll', function () {
      if (isHome) nav.classList.toggle('scrolled', window.scrollY > 55);
    }, { passive: true });

    if (mopen)  mopen.addEventListener('click', openMM);
    if (mclose) mclose.addEventListener('click', closeMM);

    /* Home page: intercept data-navto clicks for in-page smooth scroll */
    if (isHome) {
      document.querySelectorAll('[data-navto]').forEach(function (a) {
        a.addEventListener('click', function (e) {
          e.preventDefault();
          navTo(a.getAttribute('data-navto'));
        });
      });
    }
  }

  /* ── Scroll reveal ── */
  function initReveal() {
    var els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
      els.forEach(function (el) { io.observe(el); });
    } else {
      els.forEach(function (el) { el.classList.add('in'); });
    }
  }

  /* ── Fetch and inject a partial into a placeholder ── */
  function inject(id, url) {
    return new Promise(function (resolve) {
      var el = document.getElementById(id);
      if (!el) { resolve(); return; }
      fetch(url)
        .then(function (r) { return r.text(); })
        .then(function (html) { el.outerHTML = html; resolve(); })
        .catch(function () { resolve(); });
    });
  }

  /* ── Gallery lightbox (service detail pages) ── */
  function initGalleryLightbox() {
    var slots = document.querySelectorAll('.gallery-slot');
    if (!slots.length) return;

    var images = [];
    slots.forEach(function (slot) {
      var img = slot.querySelector('img');
      if (img) images.push({ src: img.getAttribute('src'), alt: img.getAttribute('alt') || '' });
    });
    if (!images.length) return;

    /* Build lightbox DOM */
    var lb = document.createElement('div');
    lb.id = 'svc-lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Gallery viewer');
    lb.innerHTML =
      '<div class="svc-lb-bar">' +
        '<span id="svc-lb-count" style="font-size:0.68rem;letter-spacing:0.1em;color:rgba(255,255,255,0.32);"></span>' +
        '<button class="svc-lb-close" id="svc-lb-close" aria-label="Close viewer">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="svc-lb-stage">' +
        '<img id="svc-lb-img" src="" alt="" />' +
        '<button class="svc-lb-nav" id="svc-lb-prev" aria-label="Previous photo">' +
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="15 18 9 12 15 6"/></svg>' +
        '</button>' +
        '<button class="svc-lb-nav" id="svc-lb-next" aria-label="Next photo">' +
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="9 18 15 12 9 6"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="svc-lb-strip" id="svc-lb-strip"></div>';
    document.body.appendChild(lb);

    var cur = 0;

    function lbSync() {
      document.getElementById('svc-lb-img').src = images[cur].src;
      document.getElementById('svc-lb-img').alt = images[cur].alt;
      document.getElementById('svc-lb-count').textContent = (cur + 1) + ' of ' + images.length;
      document.getElementById('svc-lb-prev').classList.toggle('dim', cur === 0);
      document.getElementById('svc-lb-next').classList.toggle('dim', cur === images.length - 1);
      var strip = document.getElementById('svc-lb-strip');
      strip.innerHTML = images.map(function (ph, i) {
        return '<img class="svc-lb-thumb' + (i === cur ? ' active' : '') + '" src="' + ph.src +
               '" alt="' + ph.alt + '" data-i="' + i + '" loading="lazy" />';
      }).join('');
      strip.querySelectorAll('.svc-lb-thumb').forEach(function (t) {
        t.addEventListener('click', function () { cur = +t.dataset.i; lbSync(); });
      });
    }

    function lbOpen(idx) {
      cur = idx;
      lbSync();
      document.getElementById('svc-lightbox').classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function lbClose() {
      document.getElementById('svc-lightbox').classList.remove('open');
      document.body.style.overflow = '';
    }

    document.getElementById('svc-lb-close').addEventListener('click', lbClose);
    document.getElementById('svc-lb-prev').addEventListener('click', function () {
      if (cur > 0) { cur--; lbSync(); }
    });
    document.getElementById('svc-lb-next').addEventListener('click', function () {
      if (cur < images.length - 1) { cur++; lbSync(); }
    });
    document.addEventListener('keydown', function (e) {
      if (!document.getElementById('svc-lightbox').classList.contains('open')) return;
      if (e.key === 'ArrowLeft'  && cur > 0)                 { cur--; lbSync(); }
      if (e.key === 'ArrowRight' && cur < images.length - 1) { cur++; lbSync(); }
      if (e.key === 'Escape') lbClose();
    });

    slots.forEach(function (slot, i) {
      slot.addEventListener('click', function () { lbOpen(i); });
    });
  }

  /* ── Bootstrap ── */
  function boot() {
    initReveal();
    Promise.all([
      inject('site-nav',          '/partials/nav.html'),
      inject('site-footer',       '/partials/footer.html'),
      inject('site-contact-form', '/partials/contact-form.html')
    ]).then(function () {
      initNav();
      initReveal(); /* catch any .reveal elements added by partials */
      initGalleryLightbox();
      if (typeof window.initContactForm === 'function') window.initContactForm();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
