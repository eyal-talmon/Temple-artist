// The Temple 2027 | site scripts

(function () {
  // Header: transparent over the hero, solid licorice once the page
  // scrolls, then light khaki once the hero image is scrolled past.
  // It goes dark again over dark areas: the footer ([data-header="dark"])
  // and the Day/Night section while it's in night mode.
  var header = document.getElementById('site-header');
  var hero = document.querySelector('.hero');
  var dnSection = document.getElementById('day-night');
  var darkZones = document.querySelectorAll('[data-header="dark"]');
  var onScroll = function () {};
  if (header) {
    var underHeader = function (el) {
      var r = el.getBoundingClientRect();
      return r.top < header.offsetHeight && r.bottom > 0;
    };
    onScroll = function () {
      var y = window.scrollY;
      header.classList.toggle('is-scrolled', y > 24);
      // pages without a hero start in the light state
      var pastHero = !hero || y > hero.offsetTop + hero.offsetHeight - header.offsetHeight;
      var overDark = Array.prototype.some.call(darkZones, underHeader);
      if (dnSection && dnSection.getAttribute('data-mode') === 'night') {
        overDark = overDark || underHeader(dnSection);
      }
      header.classList.toggle('is-light', !!pastHero && !overDark);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
  }

  // Mobile menu: lock page scroll while the full-screen overlay is open,
  // and close it after tapping a nav item. The header gets .menu-open so
  // its light-mode colours step aside for the dark overlay.
  var navCheck = document.getElementById('nav-check');
  if (navCheck) {
    var setMenu = function (open) {
      navCheck.checked = open;
      document.body.style.overflow = open ? 'hidden' : '';
      if (header) header.classList.toggle('menu-open', open);
    };
    navCheck.addEventListener('change', function () {
      setMenu(navCheck.checked);
    });
    document.querySelectorAll('.nav a').forEach(function (link) {
      link.addEventListener('click', function () {
        setMenu(false);
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && navCheck.checked) {
        setMenu(false);
      }
    });
  }

  // Day / night renderings: the toggle flips the whole section's mode;
  // CSS handles the crossfade and palette change.
  var dn = document.getElementById('day-night');
  if (dn) {
    var buttons = dn.querySelectorAll('.dn-toggle__btn');
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var mode = btn.getAttribute('data-mode');
        dn.setAttribute('data-mode', mode);
        buttons.forEach(function (b) {
          b.setAttribute('aria-pressed', String(b === btn));
        });
        onScroll();  // header follows the section's day/night mode
      });
    });

    // Mobile floating switch: show only while the section fills the
    // middle of the screen (CSS ignores the class on desktop).
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        dn.classList.toggle('is-in-view', entries[0].isIntersecting);
      }, { rootMargin: '-35% 0px -35% 0px' }).observe(dn);
    }
  }

  // Interior slider: crossfade automatically every few seconds (CSS does
  // the easing zoom). Only rests while off screen; dots jump to a slide.
  var slider = document.querySelector('.ex-slider');
  if (slider) {
    var slides = slider.querySelectorAll('.ex-slide');
    var dots = slider.querySelectorAll('.ex-slider__dot');
    var count = slider.querySelector('.ex-slider__count');
    var label = slider.querySelector('.ex-slider__label');
    var labels = ['Interior. Walking between the branches.', 'Interior. Looking up into the Trunk.'];
    var numerals = ['i', 'ii', 'iii', 'iv', 'v'];
    var current = 0;
    var timer = null;
    var inView = false;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var show = function (i) {
      current = (i + slides.length) % slides.length;
      slides.forEach(function (s, n) {
        s.classList.toggle('is-active', n === current);
        s.classList.toggle('is-zooming', n === current && !reduceMotion);
      });
      dots.forEach(function (d, n) { d.classList.toggle('is-active', n === current); });
      if (count) count.textContent = numerals[current] + ' / ' + numerals[slides.length - 1];
      if (label && labels[current]) label.textContent = labels[current];
    };
    var stop = function () { clearInterval(timer); timer = null; };
    var start = function () {
      stop();
      if (!inView || slides.length < 2) return;
      timer = setInterval(function () { show(current + 1); }, 6000);
    };

    dots.forEach(function (dot, n) {
      dot.addEventListener('click', function () { show(n); start(); });
    });

    if ('IntersectionObserver' in window) {
      var started = false;
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        // first time on screen: kick off the zoom on slide one
        if (inView && !started) { started = true; show(0); }
        start();
      }, { threshold: 0.25 }).observe(slider);
    } else {
      inView = true;
      show(0);
      start();
    }
  }

  // Forms: post to FormSubmit's AJAX endpoint (emails the admin), then show
  // a success or error message under the form without leaving the page.
  document.querySelectorAll('form[data-endpoint]').forEach(function (form) {
    var status = form.querySelector('.form__status');
    var submit = form.querySelector('[type="submit"]');
    var submitLabel = submit ? submit.textContent : '';

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }

      // collect fields; checkbox groups become one comma-separated line
      var data = {};
      new FormData(form).forEach(function (value, key) {
        data[key] = data[key] ? data[key] + ', ' + value : value;
      });
      if (data._honey) return;  // bot filled the trap
      delete data._honey;
      data._subject = (form.getAttribute('data-subject') || 'New message') +
        (data.name ? ': ' + data.name : '');
      data._template = 'table';

      if (submit) { submit.disabled = true; submit.textContent = 'Sending…'; }
      status.className = 'form__status';
      status.textContent = '';

      fetch(form.getAttribute('data-endpoint'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (res) {
          // read as text first: FormSubmit sometimes answers with an HTML page
          return res.text().then(function (t) {
            var j;
            try { j = JSON.parse(t); } catch (e) {
              j = { success: 'false', message: 'HTTP ' + res.status + ': ' + t.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() };
            }
            return { ok: res.ok, j: j };
          });
        })
        .then(function (r) {
          if (!r.ok || String(r.j.success) !== 'true') throw new Error(r.j.message || 'Failed');
          form.reset();
          status.className = 'form__status is-success';
          status.textContent = '';
          var title = document.createElement('strong');
          title.textContent = form.getAttribute('data-success-title') ||
            'Thank you, you’re on the list.';
          status.appendChild(title);
          status.appendChild(document.createTextNode(
            form.getAttribute('data-success-text') ||
            'We’ve received your details and will reach out as the build schedule comes together.'));
        })
        .catch(function (err) {
          var msg = (err && err.message) || '';
          console.warn('Form not sent:', msg);  // FormSubmit's reason, for debugging
          status.className = 'form__status is-error';
          // until the admin clicks FormSubmit's one-time activation link,
          // every submission is rejected with an "activation" message
          status.textContent = /activat/i.test(msg)
            ? 'This form isn’t activated yet. The site admin needs to click the activation link FormSubmit emailed them, then it will work.'
            : 'Something went wrong and your details weren’t sent. Please try again in a moment.';
          // show the service's reason in small print (temporary, for setup)
          if (msg && !/activat/i.test(msg)) {
            var why = document.createElement('small');
            why.className = 'form__reason';
            why.textContent = 'Reason: ' + msg.slice(0, 200);
            status.appendChild(why);
          }
        })
        .then(function () {
          if (submit) { submit.disabled = false; submit.textContent = submitLabel; }
        });
    });
  });

  // Footer wordmark: scale the font so the line spans exactly the
  // container's content width at any screen size.
  var mark = document.querySelector('.footer__mark');
  if (mark) {
    // split the wordmark into per-letter spans (keeps the "2027" span and
    // its colour) so each letter can burn on its own
    (function splitChars(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split('').forEach(function (ch) {
            if (ch === ' ') { frag.appendChild(document.createTextNode(' ')); return; }
            var s = document.createElement('span');
            s.className = 'burn-char';
            s.textContent = ch;
            frag.appendChild(s);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          splitChars(child);
        }
      });
    })(mark);

    var fitMark = function () {
      var box = mark.parentElement;
      var cs = getComputedStyle(box);
      var avail = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      mark.style.fontSize = '100px';
      var w = mark.getBoundingClientRect().width;
      if (w) mark.style.fontSize = (100 * avail / w) + 'px';
    };
    fitMark();
    window.addEventListener('resize', fitMark);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitMark);

    initBurn(mark);
  }

  // ------------------------------------------------------------------
  // Burn & regrow: hover the footer wordmark and the letters catch fire,
  // throw embers and crumble to ash; on mouse out they grow back up from
  // the baseline, one by one.
  // Touch screens: tap to play. Reduced motion: a gentle dim instead.
  // ------------------------------------------------------------------
  function initBurn(el) {
    var chars = Array.prototype.slice.call(el.querySelectorAll('.burn-char'));
    if (!chars.length) return;

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var touch = window.matchMedia('(hover: none)').matches;
    var timers = [];
    var state = 'idle';  // idle | burning | burnt | growing
    var later = function (fn, ms) { timers.push(setTimeout(fn, ms)); };
    var clearTimers = function () { timers.forEach(clearTimeout); timers = []; };

    if (reduced) {
      el.addEventListener('mouseenter', function () { el.classList.add('is-dim'); });
      el.addEventListener('mouseleave', function () { el.classList.remove('is-dim'); });
      return;
    }

    // ember layer: a canvas that extends above the letters
    var canvas = document.createElement('canvas');
    canvas.className = 'burn-embers';
    canvas.setAttribute('aria-hidden', 'true');
    el.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var particles = [];
    var raf = null;
    var lastT = 0;
    var EMBER_COLORS = ['#ffd9a0', '#ff9a3c', '#e2552a', '#d0ba98'];

    var sizeCanvas = function () {
      var r = el.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * 2.2 * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    var spawnEmbers = function (ch) {
      var cr = canvas.getBoundingClientRect();
      var r = ch.getBoundingClientRect();
      for (var i = 0; i < 16; i++) {
        particles.push({
          x: r.left - cr.left + Math.random() * r.width,
          y: r.top - cr.top + r.height * (0.25 + Math.random() * 0.6),
          vx: (Math.random() - 0.5) * 40,
          vy: -(40 + Math.random() * 110),
          life: 0,
          max: 0.8 + Math.random() * 1.1,
          size: 0.8 + Math.random() * 2.2,
          color: EMBER_COLORS[(Math.random() * EMBER_COLORS.length) | 0]
        });
      }
      if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(tick); }
    };

    var tick = function (t) {
      var dt = Math.min((t - lastT) / 1000, 0.05);
      lastT = t;
      var w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      particles = particles.filter(function (p) {
        p.life += dt;
        if (p.life >= p.max) return false;
        p.vx += (Math.random() - 0.5) * 60 * dt;  // flicker drift
        p.vy -= 20 * dt;                          // heat lift
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        var k = 1 - p.life / p.max;
        ctx.globalAlpha = k;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.5 + k * 0.5), 0, Math.PI * 2);
        ctx.fill();
        return true;
      });
      ctx.globalAlpha = 1;
      raf = particles.length ? requestAnimationFrame(tick) : null;
      if (!raf) ctx.clearRect(0, 0, w, h);
    };

    var burn = function () {
      clearTimers();
      state = 'burning';
      sizeCanvas();
      // light letters in a loose left-to-right wave with some randomness
      chars.forEach(function (ch, i) {
        if (ch.classList.contains('is-burning')) return;
        var delay = i * 55 + Math.random() * 160;
        later(function () {
          ch.style.animationDelay = '';
          ch.classList.remove('is-returning');
          ch.classList.add('is-burning');
          spawnEmbers(ch);
        }, delay);
      });
      later(function () { state = 'burnt'; }, chars.length * 55 + 1200);
    };

    // letters grow back up from their baseline, left to right. Stagger is a
    // CSS delay, so a delayed timer can never leave a letter stuck as ash.
    var regrow = function () {
      clearTimers();
      state = 'growing';
      var burnt = chars.filter(function (ch) { return ch.classList.contains('is-burning'); });
      burnt.forEach(function (ch, i) {
        ch.style.animationDelay = (i * 0.07) + 's';
        ch.classList.remove('is-burning');
        ch.classList.add('is-returning');
      });
      later(function () {
        chars.forEach(function (ch) {
          ch.classList.remove('is-burning', 'is-returning');
          ch.style.animationDelay = '';
        });
        state = 'idle';
      }, burnt.length * 70 + 1300);
    };

    if (touch) {
      // no hover on phones: tap plays the whole cycle
      el.addEventListener('click', function () {
        if (state !== 'idle') return;
        burn();
        later(regrow, chars.length * 55 + 1300);
      });
    } else {
      el.addEventListener('mouseenter', burn);
      el.addEventListener('mouseleave', function () {
        if (state === 'idle') return;
        regrow();
      });
    }
    window.addEventListener('resize', function () {
      if (state === 'idle') return;
      sizeCanvas();
    });
  }

  // Scroll reveal: fade elements up once as they enter the viewport.
  var revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }
})();
