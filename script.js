/* UB MBA Consulting Group, site v2: menu, reveals, scroll filled statement,
   count up numbers, pinned process, card spotlight, hiding nav.
   Every motion effect is skipped when the visitor prefers reduced motion. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* Mobile menu */
  var menuBtn = $('.nav__menu'), sheet = $('.nav__sheet');
  function setMenu(open) {
    sheet.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuBtn.textContent = open ? 'Close' : 'Menu';
  }
  if (menuBtn) {
    menuBtn.addEventListener('click', function () { setMenu(!sheet.classList.contains('open')); });
    sheet.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sheet.classList.contains('open')) { setMenu(false); menuBtn.focus(); }
    });
  }

  /* Reveal on view: adds .is-in once */
  var revealEls = $$('[data-rise], [data-pop], [data-lines]');
  $$('[data-stagger]').forEach(function (g) {
    $$(':scope > *', g).forEach(function (c, i) { c.style.setProperty('--i', i); });
  });
  if (reduce || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -5% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* Count up: animates the digits already in the page, never changes the final value */
  function countUp(el) {
    var end = parseInt(el.getAttribute('data-count'), 10), t0 = null, dur = 1400;
    function step(t) {
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(end * e);
      if (p < 1) requestAnimationFrame(step); else el.textContent = end;
    }
    requestAnimationFrame(step);
  }
  if (!reduce && 'IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { countUp(en.target); cio.unobserve(en.target); }
      });
    }, { threshold: 0.6 });
    $$('[data-count]').forEach(function (el) { cio.observe(el); });
  }

  /* Statement: split into words, light them as the block scrolls through the viewport */
  var statements = $$('.statement__text').map(function (el) {
    var hot = (el.getAttribute('data-hot') || '').split(' ').filter(Boolean);
    var words = el.textContent.trim().split(/\s+/);
    var hotStart = hot.length ? words.length - hot.length : words.length;
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words.map(function (w, i) {
      return '<span class="w' + (i >= hotStart ? ' hot' : '') + (reduce ? ' lit' : '') + '" aria-hidden="true">' + w + '</span>';
    }).join(' ');
    return { el: el, words: $$('.w', el) };
  });

  /* Pinned process */
  var procs = $$('.proc').map(function (sec) {
    var steps = $$('.pstep', sec), sts = $$('.st', sec);
    var p = { sec: sec, steps: steps, sts: sts, fill: $('.dia__fill', sec), status: $('.dia__status-t', sec), count: $('.dia__count', sec), active: -1 };
    steps.forEach(function (b, i) {
      b.addEventListener('click', function () {
        if (!sec.classList.contains('proc--pin') || window.innerWidth < 1000) return;
        var total = sec.offsetHeight - window.innerHeight;
        var y = sec.getBoundingClientRect().top + window.scrollY + total * ((i + 0.5) / steps.length);
        window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
      });
    });
    return p;
  });
  function setStep(p, n) {
    if (n === p.active) return;
    p.active = n;
    p.steps.forEach(function (s, i) { s.classList.toggle('on', i === n); s.classList.toggle('done', i < n); s.setAttribute('aria-current', i === n ? 'step' : 'false'); });
    p.sts.forEach(function (s, i) { s.classList.toggle('on', i === n); s.classList.toggle('done', i < n); });
    if (p.fill) p.fill.style.transform = 'translateY(-50%) scaleX(' + ((n + 0.5) / p.steps.length + 0.05).toFixed(3) + ')';
    if (p.status) p.status.textContent = p.steps[n].getAttribute('data-title');
    if (p.count) p.count.textContent = ('0' + (n + 1)).slice(-2);
  }
  procs.forEach(function (p) { setStep(p, 0); });

  /* Card spotlight follows the pointer */
  if (window.matchMedia('(hover: hover)').matches) {
    $$('.card').forEach(function (c) {
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect();
        c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        c.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  /* Scroll frame: statement fill, process step, nav hide on scroll down */
  var nav = $('.nav'), lastY = window.scrollY, ticking = false;
  function frame() {
    var y = window.scrollY, vh = window.innerHeight;
    if (!reduce) {
      statements.forEach(function (s) {
        var r = s.el.getBoundingClientRect();
        var prog = (vh * 0.85 - r.top) / (r.height + vh * 0.4);
        var n = Math.round(Math.max(0, Math.min(1, prog)) * s.words.length);
        s.words.forEach(function (w, i) { w.classList.toggle('lit', i < n); });
      });
    }
    procs.forEach(function (p) {
      if (!p.sec.classList.contains('proc--pin') || window.innerWidth < 1000) return;
      var r = p.sec.getBoundingClientRect(), total = r.height - vh;
      var prog = total > 0 ? Math.max(0, Math.min(0.999, -r.top / total)) : 0;
      setStep(p, Math.floor(prog * p.steps.length));
    });
    if (nav && !sheet.classList.contains('open')) {
      if (y > lastY + 6 && y > 400) nav.classList.add('is-hidden');
      else if (y < lastY - 6 || y < 400) nav.classList.remove('is-hidden');
    }
    lastY = y; ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
  window.addEventListener('resize', frame);
  frame();
})();
