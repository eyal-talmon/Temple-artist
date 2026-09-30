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
    // checkboxes toggle on Space; let Enter open/close the menu as well
    navCheck.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); setMenu(!navCheck.checked); }
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
    var userPaused = false;  // the pause button (WCAG 2.2.2) overrides autoplay
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var pauseBtn2 = slider.querySelector('.ex-slider__pause');

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
      if (!inView || userPaused || slides.length < 2) return;
      timer = setInterval(function () { show(current + 1); }, 6000);
    };
    if (pauseBtn2) {
      pauseBtn2.addEventListener('click', function () {
        userPaused = !userPaused;
        pauseBtn2.setAttribute('aria-pressed', String(userPaused));
        pauseBtn2.setAttribute('aria-label', userPaused ? 'Play slideshow' : 'Pause slideshow');
        if (userPaused) stop(); else start();
      });
    }

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

  // Hero film: play once, then dissolve into the overview still. If the
  // visitor prefers reduced motion, or the browser refuses autoplay (e.g.
  // iPhone Low Power Mode), show the still instead and offer a Play button
  // so the film can still be watched on request.
  var heroVideo = document.getElementById('hero-video');
  if (heroVideo) {
    var heroEl = heroVideo.closest('.hero');
    var afterImg = heroEl && heroEl.querySelector('.hero__after');
    if (afterImg) afterImg.loading = 'eager';  // ready before the film ends
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    heroVideo.loop = false;
    heroVideo.muted = true;  // required for autoplay

    var pauseBtn = document.getElementById('hero-pause');
    var cursor = document.getElementById('hero-cursor');
    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var filmActive = false;  // true while the button / cursor control is useful

    // label the controls; the fallback uses "Play film" so it's self-explanatory
    var setState = function (paused, label) {
      var text = label || (paused ? 'Play' : 'Pause');
      if (pauseBtn) {
        pauseBtn.setAttribute('aria-pressed', String(paused));
        pauseBtn.setAttribute('aria-label', paused ? 'Play background video' : 'Pause background video');
        pauseBtn.querySelector('.hero__pause-label').textContent = text;
      }
      if (cursor) {
        cursor.classList.toggle('is-paused', paused);
        cursor.querySelector('.hero-cursor__label').textContent = text;
      }
    };
    var showControls = function () {
      filmActive = true;
      if (pauseBtn) pauseBtn.hidden = false;
      if (heroEl && finePointer) heroEl.classList.add('cursor-on');
    };
    var hideControls = function () {
      filmActive = false;
      if (pauseBtn) pauseBtn.hidden = true;
      if (heroEl) heroEl.classList.remove('cursor-on');
      if (cursor) cursor.classList.remove('is-visible');
    };

    // the overview still: fade it in (end of film / fallback) or out (replay)
    var fadeToStill = function (instant) {
      if (!heroEl) return;
      heroEl.classList.toggle('film-instant', !!instant);
      heroEl.classList.add('film-done');
    };
    // autoplay not possible: show the still and offer to play the film
    var showStill = function (instant) {
      heroVideo.pause();
      fadeToStill(instant);
      showControls();
      setState(true, 'Play film');
    };
    var playFilm = function () {
      if (heroEl) {
        heroEl.classList.add('user-played');           // lift the reduced-motion still
        heroEl.classList.remove('film-done', 'film-instant');
      }
      if (heroVideo.ended || heroVideo.currentTime >= heroVideo.duration - 0.05) heroVideo.currentTime = 0;
      heroVideo.preload = 'auto';
      var p = heroVideo.play();
      setState(false);
      if (p && p.catch) p.catch(function () { showStill(false); });
    };
    var toggleFilm = function () {
      if (!filmActive) return;
      if (heroVideo.paused) playFilm();
      else { heroVideo.pause(); setState(true); }
    };

    if (pauseBtn) pauseBtn.addEventListener('click', toggleFilm);
    heroVideo.addEventListener('playing', function () { showControls(); setState(false); });
    heroVideo.addEventListener('ended', function () {
      heroVideo.pause();   // hold the final frame...
      fadeToStill(false);  // ...and dissolve into the overview still
      hideControls();      // nothing left to pause
    });

    // cursor control (mouse / trackpad only)
    if (heroEl && cursor && finePointer) {
      var tx = 0, ty = 0, cx = 0, cy = 0, rafId = null;
      var glide = reducedMotion ? 1 : 0.25;  // no glide for reduced motion
      var follow = function () {
        cx += (tx - cx) * glide;
        cy += (ty - cy) * glide;
        cursor.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)';
        rafId = (Math.abs(tx - cx) > 0.2 || Math.abs(ty - cy) > 0.2) ? requestAnimationFrame(follow) : null;
      };
      // over links / buttons the normal pointer returns
      var overControl = function (el) { return !!(el && el.closest('a, button')); };
      heroEl.addEventListener('mousemove', function (e) {
        if (!filmActive) return;
        tx = e.clientX; ty = e.clientY;
        if (!cursor.classList.contains('is-visible')) { cx = tx; cy = ty; }
        cursor.classList.toggle('is-visible', !overControl(e.target));
        if (!rafId) rafId = requestAnimationFrame(follow);
      });
      heroEl.addEventListener('mouseleave', function () {
        cursor.classList.remove('is-visible');
      });
      heroEl.addEventListener('click', function (e) {
        if (overControl(e.target) || window.getSelection().toString()) return;
        toggleFilm();
      });
    }

    if (reducedMotion) {
      // the still is already showing (set before paint in <head>)
      heroVideo.preload = 'none';
      showStill(true);
    } else {
      // background tabs refuse autoplay: wait until the tab is visible, and
      // only fall back to the still if it's refused while being looked at
      var whenVisible = function (fn) {
        if (!document.hidden) { fn(); return; }
        var on = function () {
          if (document.hidden) return;
          document.removeEventListener('visibilitychange', on);
          fn();
        };
        document.addEventListener('visibilitychange', on);
      };
      var tryPlay = function () {
        var p = heroVideo.play();
        if (p && p.catch) {
          p.catch(function () {
            if (document.hidden) whenVisible(tryPlay);
            else showStill(false);  // gentle fade rather than a jump
          });
        }
      };
      whenVisible(tryPlay);
    }
  }

  // Hero parallax: the film / still layer scrolls at ~35% of page speed
  // behind the headline. Only while the hero is on screen; off for people
  // who prefer reduced motion.
  var heroMedia = document.getElementById('hero-media');
  if (heroMedia && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var heroBox = heroMedia.closest('.hero');
    var ticking = false;
    var PARALLAX = 0.35;
    var updateParallax = function () {
      ticking = false;
      var y = window.scrollY;
      if (y > heroBox.offsetTop + heroBox.offsetHeight) return;  // off screen
      heroMedia.style.transform = 'translate3d(0,' + (y * PARALLAX).toFixed(1) + 'px,0)';
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(updateParallax); }
    }, { passive: true });
    updateParallax();
  }

  // Multi-step Google Form (volunteer sign-up): one step at a time with a
  // progress bar, friendly inline validation, an auto-saved draft, and a
  // direct post into the Google Form's formResponse endpoint.
  document.querySelectorAll('form[data-gform]').forEach(function (form) {
    var steps = Array.prototype.slice.call(form.querySelectorAll('.step'));
    var bar = form.querySelector('.steps-progress__bar span');
    var labels = form.querySelectorAll('.steps-progress__labels li');
    var count = form.querySelector('.steps-count');
    var back = form.querySelector('.steps-nav__back');
    var next = form.querySelector('.steps-nav__next');
    var submit = form.querySelector('.steps-nav__submit');
    var status = form.querySelector('.form__status');
    var done = document.getElementById('volunteer-done');
    var draftKey = form.getAttribute('data-draft-key');
    var current = 0;

    // ---- draft: keep answers if the visitor refreshes or comes back ----
    var saveDraft = function () {
      if (!draftKey) return;
      var data = {};
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name) return;
        if (el.type === 'checkbox' || el.type === 'radio') {
          if (el.checked) (data[el.name] = data[el.name] || []).push(el.value);
        } else {
          data[el.name] = el.value;
        }
      });
      try { localStorage.setItem(draftKey, JSON.stringify(data)); } catch (e) {}
    };
    var loadDraft = function () {
      var data;
      try { data = JSON.parse(localStorage.getItem(draftKey) || 'null'); } catch (e) { data = null; }
      if (!data) return;
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || !(el.name in data)) return;
        if (el.type === 'checkbox' || el.type === 'radio') {
          el.checked = data[el.name].indexOf(el.value) !== -1;
        } else {
          el.value = data[el.name];
        }
      });
    };
    var clearDraft = function () { try { localStorage.removeItem(draftKey); } catch (e) {} };

    // ---- validation, per step, with plain-language messages ----
    var setError = function (field, msg) {
      if (!field) return;
      field.classList.toggle('is-invalid', !!msg);
      var err = field.querySelector('.field__error');
      if (err) err.textContent = msg || '';
      // tell screen readers which inputs are wrong, and why
      field.querySelectorAll('input, textarea, select').forEach(function (el) {
        if (msg) {
          el.setAttribute('aria-invalid', 'true');
          if (err) {
            if (!err.id) err.id = 'err-' + Math.random().toString(36).slice(2, 8);
            el.setAttribute('aria-errormessage', err.id);
          }
        } else {
          el.removeAttribute('aria-invalid');
          el.removeAttribute('aria-errormessage');
        }
      });
    };
    var validateStep = function (step) {
      var firstBad = null;
      step.querySelectorAll('input[required], textarea[required]').forEach(function (el) {
        var field = el.closest('.field');
        var msg = '';
        if (!el.value.trim()) msg = 'Please fill this in.';
        else if (el.type === 'email' && !el.checkValidity()) msg = 'Please enter a valid email, like name@example.com.';
        setError(field, msg);
        if (msg && !firstBad) firstBad = el;
      });
      step.querySelectorAll('[data-required-group]').forEach(function (group) {
        var ok = group.querySelector('input:checked');
        var isRadio = group.querySelector('input[type="radio"]');
        setError(group, ok ? '' : (isRadio ? 'Please choose one.' : 'Please pick at least one.'));
        if (!ok && !firstBad) firstBad = group.querySelector('input');
      });
      if (firstBad) firstBad.focus({ preventScroll: false });
      return !firstBad;
    };
    // clear an error as soon as it's fixed
    form.addEventListener('input', function (e) {
      var field = e.target.closest('.field');
      if (field && field.classList.contains('is-invalid')) {
        var ok = field.hasAttribute('data-required-group')
          ? !!field.querySelector('input:checked')
          : e.target.value.trim() && (e.target.type !== 'email' || e.target.checkValidity());
        if (ok) setError(field, '');
      }
      saveDraft();
    });
    form.addEventListener('change', saveDraft);

    // ---- step navigation ----
    var show = function (i, focus) {
      current = i;
      steps.forEach(function (s, n) {
        s.hidden = n !== i;
        s.classList.toggle('is-active', n === i);
      });
      labels.forEach(function (l, n) {
        l.classList.toggle('is-current', n === i);
        l.classList.toggle('is-done', n < i);
      });
      if (bar) bar.style.width = ((i + 1) / steps.length * 100) + '%';
      if (count) count.textContent = 'Step ' + (i + 1) + ' of ' + steps.length;
      back.hidden = i === 0;
      next.hidden = i === steps.length - 1;
      submit.hidden = i !== steps.length - 1;
      if (focus) {
        var top = form.getBoundingClientRect().top + window.scrollY - 110;
        if (window.scrollY > top) window.scrollTo({ top: top, behavior: 'smooth' });
        var first = steps[i].querySelector('input, textarea');
        if (first) first.focus({ preventScroll: true });
      }
    };
    next.addEventListener('click', function () {
      if (validateStep(steps[current])) show(current + 1, true);
    });
    back.addEventListener('click', function () { show(current - 1, true); });
    // Enter in a text field moves forward instead of submitting early
    form.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.tagName === 'INPUT' && current < steps.length - 1) {
        e.preventDefault();
        next.click();
      }
    });

    // ---- submit straight into the Google Form ----
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validateStep(steps[current])) return;
      var body = new URLSearchParams();
      new FormData(form).forEach(function (v, k) { body.append(k, v); });
      submit.disabled = true;
      submit.textContent = 'Sending…';
      status.className = 'form__status';
      status.textContent = '';
      // Google doesn't allow reading the reply cross-site (no-cors), so a
      // completed request counts as sent; only a network failure is an error.
      fetch(form.getAttribute('data-gform'), { method: 'POST', mode: 'no-cors', body: body })
        .then(function () {
          clearDraft();
          form.reset();
          form.hidden = true;
          if (done) { done.hidden = false; done.focus(); }
        })
        .catch(function () {
          status.className = 'form__status is-error';
          status.textContent = 'We couldn’t send your sign-up. Please check your connection and try again.';
        })
        .then(function () {
          submit.disabled = false;
          submit.textContent = 'Join the crew';
        });
    });

    loadDraft();
    show(0, false);
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

    // sparks leave from the flame edge; frac = how far up the letter the
    // burn line has climbed (0 = bottom, 1 = top)
    var spawnEmbers = function (ch, frac, n) {
      var cr = canvas.getBoundingClientRect();
      var r = ch.getBoundingClientRect();
      var lineY = r.bottom - cr.top - r.height * frac;
      for (var i = 0; i < (n || 6); i++) {
        particles.push({
          x: r.left - cr.left + r.width * (0.1 + Math.random() * 0.8),
          y: lineY + (Math.random() - 0.5) * r.height * 0.08,
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
        var delay = i * 12 + Math.random() * 35;
        later(function () {
          ch.style.animationDelay = '';
          ch.classList.remove('is-returning');
          ch.classList.add('is-burning');
          // follow the burn edge up the letter (matches the 0.35s CSS burn)
          [0, 0.15, 0.35, 0.55, 0.75, 0.95].forEach(function (frac, k) {
            later(function () { spawnEmbers(ch, frac, 6); }, 20 + k * 50);
          });
        }, delay);
      });
      later(function () { state = 'burnt'; }, chars.length * 12 + 420);
    };

    // letters grow back up from their baseline, all together (no
    // left-to-right stagger), so the whole word rises bottom to top.
    var regrow = function () {
      clearTimers();
      state = 'growing';
      var burnt = chars.filter(function (ch) { return ch.classList.contains('is-burning'); });
      burnt.forEach(function (ch) {
        ch.style.animationDelay = '';
        ch.classList.remove('is-burning');
        ch.classList.add('is-returning');
      });
      later(function () {
        chars.forEach(function (ch) {
          ch.classList.remove('is-burning', 'is-returning');
          ch.style.animationDelay = '';
        });
        state = 'idle';
      }, 1300);
    };

    if (touch) {
      // no hover on phones: tap plays the whole cycle
      el.addEventListener('click', function () {
        if (state !== 'idle') return;
        burn();
        later(regrow, chars.length * 12 + 500);
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

  // Big titles: when a title scrolls into view, the whole sentence is
  // revealed left to right in one continuous sweep: each word wipes in and
  // the next starts exactly when it finishes (duration scales with word
  // length). Only applied when the visitor allows motion.
  // every large headline on the site
  var titles = document.querySelectorAll('.display, .hero__title, .experiment__quote, .about-name__word');
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (titles.length && !calm && 'IntersectionObserver' in window) {
    var PER_CHAR = 38;   // ms of sweep per character...
    var MAX_SWEEP = 2000; // ...but a long sentence never takes over ~2s
    titles.forEach(function (t) {
      var chars = t.textContent.replace(/\s+/g, '').length;
      var perChar = Math.min(PER_CHAR, MAX_SWEEP / Math.max(chars, 1));
      // the hero title fades up on load first, so its sweep starts later
      var at = t.classList.contains('hero__title') ? 650 : 120;
      // walk every text node in order (so styled parts like <em> keep their
      // styling) and wrap each word; words stay whole, so screen readers
      // read the sentence normally
      var walker = document.createTreeWalker(t, NodeFilter.SHOW_TEXT);
      var nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(function (node) {
        var frag = document.createDocumentFragment();
        // split on normal spaces only, so &nbsp;-joined words stay together
        node.textContent.split(/([ \n\t]+)/).forEach(function (part) {
          if (!part) return;
          if (/^[ \n\t]+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          var outer = document.createElement('span');
          outer.className = 'tw';
          var inner = document.createElement('span');
          inner.className = 'tw__in';
          var dur = Math.max(120, part.length * perChar);
          inner.style.transitionDuration = dur + 'ms';
          inner.style.transitionDelay = at + 'ms';
          at += dur;
          inner.textContent = part;
          outer.appendChild(inner);
          frag.appendChild(outer);
        });
        node.parentNode.replaceChild(frag, node);
      });
      t.classList.add('tw-ready');
    });
    var tio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('tw-in');
          tio.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.2 });
    titles.forEach(function (t) { tio.observe(t); });
  }

  // Ceiling plan (volunteer page): the Temple grows like mushrooms. Each
  // round chamber swells up from its own centre, in branching order: the
  // Trunk, the hub, the three arms, six chambers, then the eighteen dark
  // caps at the tips. Then the canvas steps aside and the plain image holds.
  var plan = document.querySelector('.build-plan');
  if (plan && !calm && 'IntersectionObserver' in window) {
    var planImg = plan.querySelector('img');
    var planCanvas = plan.querySelector('.build-plan__canvas');
    var PLAN_W = 2000; // source image width
    // [x, y, radius] in image pixels, [start, duration] in seconds
    var PLAN_PARTS = [
      [968, 578, 120, 0.00, 1.00], // Trunk
      [968, 578, 290, 0.45, 1.20], // hub
      [971, 277, 175, 1.20, 1.00], // arms
      [707, 738, 175, 1.17, 1.00],
      [1237, 739, 175, 1.25, 1.00],
      [804, 222, 160, 1.81, 1.00], // chamber + its three caps
      [666, 265, 72, 2.65, 0.85],
      [753, 111, 72, 2.57, 0.85],
      [905, 103, 72, 2.44, 0.85],
      [1133, 221, 160, 1.90, 1.00],
      [1031, 103, 72, 2.52, 0.85],
      [1183, 111, 72, 2.70, 0.85],
      [1274, 260, 72, 2.53, 0.85],
      [1365, 616, 160, 1.87, 1.00],
      [1398, 478, 72, 2.66, 0.85],
      [1491, 630, 72, 2.84, 0.85],
      [1415, 760, 72, 2.53, 0.85],
      [1201, 904, 160, 1.89, 1.00],
      [1350, 873, 72, 2.77, 0.85],
      [1277, 1005, 72, 2.92, 0.85],
      [1101, 1005, 72, 2.75, 0.85],
      [744, 908, 160, 1.85, 1.00],
      [848, 1008, 72, 2.89, 0.85],
      [670, 1011, 72, 2.47, 0.85],
      [596, 879, 72, 2.84, 0.85],
      [578, 621, 160, 1.83, 1.00],
      [530, 767, 72, 2.49, 0.85],
      [453, 637, 72, 2.48, 0.85],
      [544, 483, 72, 2.57, 0.85]
    ];
    var PLAN_SETTLE = 3.3; // the whole plan fades up over the growth to fill the gaps...
    var PLAN_END = 4.0;    // ...and holds from here
    var layer = document.createElement('canvas');
    var lctx = layer.getContext('2d');
    var easeOut = function (u) { return 1 - Math.pow(1 - u, 3); };
    var easeBack = function (u) { return 1 + 2.3 * Math.pow(u - 1, 3) + 1.3 * Math.pow(u - 1, 2); }; // overshoots ~10%

    var drawPlan = function (sec) {
      var dpr = window.devicePixelRatio || 1;
      var cw = Math.round(planCanvas.clientWidth * dpr), ch = Math.round(planCanvas.clientHeight * dpr);
      if (planCanvas.width !== cw) { planCanvas.width = cw; planCanvas.height = ch; }
      var ctx = planCanvas.getContext('2d');
      var q = cw / PLAN_W; // device pixels per image pixel
      ctx.clearRect(0, 0, cw, ch);

      PLAN_PARTS.forEach(function (p) {
        var u = (sec - p[3]) / p[4];
        if (u <= 0) return;
        u = Math.min(u, 1);
        var R = p[2] * 1.2 * easeOut(u) * q; // reach, soft edge included
        if (R < 1) return;
        var s = 0.7 + 0.3 * easeBack(u);     // the cap swells up, overshoots, settles
        var D = Math.ceil(R * 2);
        layer.width = layer.height = D;
        var g = lctx.createRadialGradient(D / 2, D / 2, 0, D / 2, D / 2, R);
        g.addColorStop(0, '#000');
        g.addColorStop(0.72, '#000');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        lctx.fillStyle = g;
        lctx.fillRect(0, 0, D, D);
        lctx.globalCompositeOperation = 'source-in';
        var k = q * s, span = D / k; // image pixels across the layer
        lctx.drawImage(planImg, p[0] - span / 2, p[1] - span / 2, span, span, 0, 0, D, D);
        ctx.globalAlpha = Math.min(1, u * 2.2);
        ctx.drawImage(layer, p[0] * q - D / 2, p[1] * q - D / 2);
      });

      var fill = (sec - PLAN_SETTLE) / (PLAN_END - PLAN_SETTLE);
      if (fill > 0) {
        ctx.globalAlpha = Math.min(1, fill);
        ctx.drawImage(planImg, 0, 0, cw, ch);
      }
      ctx.globalAlpha = 1;
    };

    var buildPlan = function () {
      var t0 = null;
      var step = function (now) {
        if (t0 === null) t0 = now;
        var sec = (now - t0) / 1000;
        drawPlan(sec);
        if (sec < PLAN_END) requestAnimationFrame(step);
        else {
          plan.classList.remove('is-building'); // hold on the real image
          initWater();
        }
      };
      requestAnimationFrame(step);
    };


    // Water: once the plan has grown, moving the mouse over it sends out
    // ripples that bend the timber like a pond surface. A WebGL canvas
    // takes over from the <img> only while ripples are live.
    var initWater = function () {
      if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
      var wc = document.createElement('canvas');
      wc.className = 'build-plan__water';
      wc.setAttribute('aria-hidden', 'true');
      var gl = wc.getContext('webgl', { premultipliedAlpha: true });
      if (!gl) return;
      plan.appendChild(wc);

      var MAX_DROPS = 16, DROP_LIFE = 2.4; // seconds a ripple lasts
      var vsrc = 'attribute vec2 p; varying vec2 uv;' +
        'void main(){ uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }';
      var fsrc = 'precision mediump float;' +
        'uniform sampler2D img; uniform float now, aspect; uniform vec4 drops[' + MAX_DROPS + '];' +
        'varying vec2 uv;' +
        'void main(){' +
        '  vec2 off = vec2(0.0); float shine = 0.0;' +
        '  for (int i = 0; i < ' + MAX_DROPS + '; i++) {' +
        '    vec4 d = drops[i]; float age = now - d.z;' +
        '    if (d.w <= 0.0 || age < 0.0 || age > ' + DROP_LIFE.toFixed(1) + ') continue;' +
        '    vec2 v = (uv - d.xy) * vec2(aspect, 1.0); float dist = length(v);' +
        '    float x = dist - age * 0.32;' +                        // ring travelling outward
        '    float wave = sin(x * 60.0) * exp(-x * x * 55.0);' +   // a packet of crests around the ring
        '    float amp = d.w * exp(-age * 2.0) * 0.004;' +
        '    vec2 dir = dist > 0.0001 ? v / dist : vec2(0.0);' +
        '    off += dir * wave * amp / vec2(aspect, 1.0);' +
        '    shine += wave * amp;' +
        '  }' +
        '  vec4 c = texture2D(img, uv + off);' +
        '  c.rgb += shine * 3.0 * c.a;' +                          // light catching the crests
        '  gl_FragColor = c;' +
        '}';
      var sh = function (type, src) {
        var o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); return o;
      };
      var prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, vsrc));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fsrc));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { wc.remove(); return; }
      gl.useProgram(prog);

      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      var aP = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(aP);
      gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 0, 0);

      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, planImg);

      var uNow = gl.getUniformLocation(prog, 'now');
      var uAspect = gl.getUniformLocation(prog, 'aspect');
      var uDrops = gl.getUniformLocation(prog, 'drops');
      var drops = new Float32Array(MAX_DROPS * 4); // x, y, start time, strength
      var next = 0, lastDrop = null, running = false, t0 = performance.now();
      var clock = function () { return (performance.now() - t0) / 1000; };

      var render = function () {
        var dpr = window.devicePixelRatio || 1;
        var w = Math.round(plan.clientWidth * dpr), h = Math.round(plan.clientHeight * dpr);
        if (wc.width !== w || wc.height !== h) { wc.width = w; wc.height = h; }
        gl.viewport(0, 0, w, h);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        var now = clock(), live = false;
        for (var i = 0; i < MAX_DROPS; i++) {
          if (drops[i * 4 + 3] > 0 && now - drops[i * 4 + 2] < DROP_LIFE) live = true;
        }
        gl.uniform1f(uNow, now);
        gl.uniform1f(uAspect, w / h);
        gl.uniform4fv(uDrops, drops);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        if (live) requestAnimationFrame(render);
        else { running = false; plan.classList.remove('is-rippling'); } // back to the still image
      };

      plan.addEventListener('pointermove', function (e) {
        var r = plan.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width, y = 1 - (e.clientY - r.top) / r.height;
        var now = clock();
        // a new drop every ~70ms or every bit of travel, whichever comes first
        if (lastDrop && now - lastDrop.t < 0.07 &&
            Math.hypot(x - lastDrop.x, y - lastDrop.y) < 0.025) return;
        var speed = lastDrop ? Math.min(1, Math.hypot(x - lastDrop.x, y - lastDrop.y) / 0.04) : 1;
        lastDrop = { x: x, y: y, t: now };
        drops.set([x, y, now, 0.35 + 0.65 * speed], next * 4);
        next = (next + 1) % MAX_DROPS;
        if (!running) {
          running = true;
          plan.classList.add('is-rippling');
          requestAnimationFrame(render);
        }
      });
      plan.addEventListener('pointerleave', function () { lastDrop = null; });
    };

    plan.classList.add('is-building');
    planImg.addEventListener('error', function () { plan.classList.remove('is-building'); });
    var pio = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      pio.disconnect();
      var go = function () { setTimeout(buildPlan, 300); };
      if (planImg.complete && planImg.naturalWidth) go();
      else planImg.addEventListener('load', go);
    }, { threshold: 0.3 });
    pio.observe(plan);
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
