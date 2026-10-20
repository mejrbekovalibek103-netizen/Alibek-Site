/* =========================================================
   Alibek — personal site
   Чистый JavaScript, без фреймворков: каждый эффект написан вручную.
   ========================================================= */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const html = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
  const wait = ms => new Promise(r => setTimeout(r, ms));

  // localStorage может быть недоступен (приватный режим) — не ломаемся
  const store = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, val) { try { localStorage.setItem(key, val); } catch { /* ignore */ } },
  };

  /* ---------- Тексты, которые меняет JS ---------- */
  const i18n = {
    lang: 'ru',
    roles: {
      ru: ['разработчик', 'программист', 'студент', 'разработчик с ИИ', 'IT-специалист'],
      en: ['a developer', 'a programmer', 'a student', 'a developer with AI', 'an IT professional'],
    },
    ui: {
      ru: {
        title: 'Алибек - разработчик и программист',
        copied: 'Email скопирован ✓',
        copyFail: 'Не получилось скопировать — выдели вручную',
        soon: 'Ссылка скоро появится ✦',
        langLabel: 'Switch language to English',
        menu: 'Меню',
      },
      en: {
        title: 'Alibek - Developer & Programmer',
        copied: 'Email copied ✓',
        copyFail: 'Copy failed — please select it manually',
        soon: 'Link coming soon ✦',
        langLabel: 'Переключить на русский',
        menu: 'Menu',
      },
    },
  };
  const t = key => i18n.ui[i18n.lang][key];

  /* =========================================================
     1. Разбивка текста на буквы и слова
     ========================================================= */
  function splitName() {
    const el = $('[data-split]');
    if (!el) return;
    const text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    el.innerHTML = [...text]
      .map((ch, i) => `<span class="char-wrap" aria-hidden="true"><span class="char" style="--i:${i}">${ch}</span></span>`)
      .join('');
  }

  // Оборачивает каждое слово в <span class="word">, сохраняя вложенные теги (<em>)
  let litWords = [];
  function splitWords() {
    const el = $('[data-words]');
    if (!el) return;
    const walk = node => {
      [...node.childNodes].forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const span = document.createElement('span');
            span.className = 'word';
            span.textContent = part;
            frag.appendChild(span);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child);
        }
      });
    };
    walk(el);
    litWords = $$('.word', el);
  }

  function updateLitWords() {
    const el = $('[data-words]');
    if (!el || !litWords.length) return;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const start = vh * 0.85;
    const end = vh * 0.35;
    const progress = clamp((start - r.top) / (start - end + r.height * 0.6), 0, 1);
    const count = Math.round(progress * litWords.length);
    litWords.forEach((w, i) => w.classList.toggle('is-lit', i < count));
  }

  /* =========================================================
     2. Эффект «расшифровки» текста (scramble)
     ========================================================= */
  class Scramble {
    constructor(el) {
      this.el = el;
      this.glyphs = '!_\\/[]{}—=+*^?#01$%';
      this.update = this.update.bind(this);
    }
    setText(next) {
      const prev = this.el.textContent;
      const len = Math.max(prev.length, next.length);
      this.queue = [];
      for (let i = 0; i < len; i++) {
        const start = Math.floor(Math.random() * 24);
        this.queue.push({ from: prev[i] || '', to: next[i] || '', start, end: start + 10 + Math.floor(Math.random() * 24) });
      }
      cancelAnimationFrame(this.raf);
      this.frame = 0;
      return new Promise(resolve => { this.resolve = resolve; this.update(); });
    }
    update() {
      let out = '';
      let done = 0;
      for (const q of this.queue) {
        if (this.frame >= q.end) { done++; out += q.to; }
        else if (this.frame >= q.start) {
          if (!q.glyph || Math.random() < 0.3) q.glyph = this.glyphs[Math.floor(Math.random() * this.glyphs.length)];
          out += `<span class="dud">${q.glyph}</span>`;
        } else out += q.from;
      }
      this.el.innerHTML = out;
      if (done === this.queue.length) this.resolve();
      else { this.frame++; this.raf = requestAnimationFrame(this.update); }
    }
  }

  const scrambleEl = $('#scramble');
  const scramble = scrambleEl ? new Scramble(scrambleEl) : null;
  let scrambleTimer = 0;
  let scrambleRun = 0;
  let scrambleStarted = false;

  function startScramble() {
    if (!scramble) return;
    scrambleStarted = true;
    clearTimeout(scrambleTimer);
    const run = ++scrambleRun;
    let i = 0;
    const next = () => {
      if (run !== scrambleRun) return;
      const roles = i18n.roles[i18n.lang];
      const word = roles[i % roles.length];
      const show = reduceMotion ? Promise.resolve(scrambleEl.textContent = word) : scramble.setText(word);
      show.then(() => {
        if (run !== scrambleRun) return;
        i++;
        scrambleTimer = setTimeout(next, 2300);
      });
    };
    next();
  }

  /* =========================================================
     3. Терминал с печатающимся кодом
     ========================================================= */
  const CODE = [
    ['c', '// about.js — quick intro\n'],
    ['k', 'const '], ['v', 'alibek'], ['n', ' = {\n'],
    ['p', '  role'], ['n', ': '], ['s', '"Developer & Programmer"'], ['n', ',\n'],
    ['p', '  stack'], ['n', ': ['], ['s', '"HTML"'], ['n', ', '], ['s', '"CSS"'], ['n', ', '], ['s', '"JS"'], ['n', ', '], ['s', '"AI"'], ['n', '],\n'],
    ['p', '  projects'], ['n', ': ['], ['s', '"English site"'], ['n', ', '], ['s', '"App"'], ['n', ', '], ['s', '"Web game"'], ['n', '],\n'],
    ['p', '  workflow'], ['n', ': '], ['s', '"prompt → understand → improve"'], ['n', ',\n'],
    ['n', '};\n\n'],
    ['v', 'alibek'], ['n', '.'], ['f', 'build'], ['n', '();  '], ['c', '// always shipping 🚀'],
  ];
  const escapeHTML = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const codeToHTML = tokens => tokens.map(([c, s]) => `<span class="tk-${c}">${escapeHTML(s)}</span>`).join('');

  function initTerminal() {
    const ghost = $('#codeGhost');
    const typed = $('#codeTyped');
    if (!ghost || !typed) return () => {};
    ghost.innerHTML = codeToHTML(CODE); // невидимая копия держит размер — без «прыжков» вёрстки
    const caret = document.createElement('span');
    caret.className = 'caret';

    if (reduceMotion) {
      typed.innerHTML = codeToHTML(CODE);
      typed.appendChild(caret);
      return () => {};
    }

    return function type() {
      typed.innerHTML = '';
      typed.appendChild(caret);
      let tokenIndex = 0;
      let charIndex = 0;
      let span = null;
      const step = () => {
        if (tokenIndex >= CODE.length) return;
        const [cls, str] = CODE[tokenIndex];
        if (!span) {
          span = document.createElement('span');
          span.className = `tk-${cls}`;
          typed.insertBefore(span, caret);
        }
        const ch = [...str][charIndex];
        span.textContent += ch;
        charIndex++;
        if (charIndex >= [...str].length) { tokenIndex++; charIndex = 0; span = null; }
        const delay = ch === '\n' ? 90 : 6 + Math.random() * 18;
        setTimeout(step, delay);
      };
      step();
    };
  }

  /* =========================================================
     4. WebGL-фон: «аврора» на шейдере, реагирует на мышь
     ========================================================= */
  function initShader() {
    const canvas = $('#bgCanvas');
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) { html.classList.add('no-webgl'); return; }

    const vert = `
      attribute vec2 a_pos;
      void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;

    const frag = `
      precision mediump float;
      uniform vec2 u_res;
      uniform float u_time;
      uniform vec2 u_mouse;

      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }
      float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
        for (int i = 0; i < 5; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
        return v;
      }
      void main() {
        vec2 uv = gl_FragCoord.xy / u_res;
        float aspect = u_res.x / u_res.y;
        vec2 p = vec2(uv.x * aspect, uv.y);
        vec2 m = vec2(u_mouse.x * aspect, u_mouse.y);
        float t = u_time * 0.06;

        vec2 q = vec2(fbm(p * 1.4 + vec2(0.0, t)), fbm(p * 1.4 + vec2(5.2, -t)));
        vec2 r = vec2(fbm(p * 1.8 + 2.2 * q + vec2(1.7, 9.2) + 0.6 * t + (m - p) * 0.3),
                      fbm(p * 1.8 + 2.2 * q + vec2(8.3, 2.8) - 0.4 * t));
        float f = fbm(p * 1.6 + 2.0 * r);

        vec3 bg = vec3(0.024, 0.024, 0.040);
        vec3 violet = vec3(0.486, 0.361, 1.0);
        vec3 cyan = vec3(0.133, 0.827, 0.933);
        vec3 pink = vec3(1.0, 0.361, 0.659);

        vec3 col = bg;
        col = mix(col, violet * 0.6, smoothstep(0.35, 0.95, f));
        col = mix(col, cyan * 0.55, smoothstep(0.5, 1.0, r.y) * 0.6);
        col = mix(col, pink * 0.5, smoothstep(0.55, 1.0, q.x) * 0.35);

        float glow = exp(-5.0 * dot(p - m, p - m));
        col += mix(violet, cyan, uv.x) * glow * 0.14;

        float vign = smoothstep(1.35, 0.2, length((uv - vec2(0.62, 0.62)) * vec2(1.0, 1.25)));
        col = mix(bg, col, vign);
        gl_FragColor = vec4(col, 1.0);
      }`;

    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
      return s;
    };
    const vs = compile(gl.VERTEX_SHADER, vert);
    const fs = compile(gl.FRAGMENT_SHADER, frag);
    const prog = gl.createProgram();
    if (!vs || !fs) { html.classList.add('no-webgl'); return; }
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { html.classList.add('no-webgl'); return; }
    gl.useProgram(prog);

    // Один большой треугольник покрывает весь экран
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'u_res');
    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uMouse = gl.getUniformLocation(prog, 'u_mouse');

    const SCALE = 0.5; // рендерим в половинном разрешении: аврора мягкая, а GPU отдыхает
    const resize = () => {
      canvas.width = Math.max(1, Math.round(window.innerWidth * SCALE));
      canvas.height = Math.max(1, Math.round(window.innerHeight * SCALE));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };
    resize();
    let resizeTimer;
    window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 150); });

    const mouse = { x: 0.7, y: 0.6, tx: 0.7, ty: 0.6 };
    window.addEventListener('pointermove', e => {
      mouse.tx = e.clientX / window.innerWidth;
      mouse.ty = 1 - e.clientY / window.innerHeight;
    }, { passive: true });

    const draw = time => {
      mouse.x = lerp(mouse.x, mouse.tx, 0.04);
      mouse.y = lerp(mouse.y, mouse.ty, 0.04);
      gl.uniform1f(uTime, (time / 1000) % 1000);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    if (reduceMotion) { draw(20000); return; }
    const loop = time => { draw(time); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  /* =========================================================
     5. Курсор, магнитные кнопки, 3D-наклон, подсветка карточек
     ========================================================= */
  function initCursor() {
    if (!finePointer || reduceMotion) return;
    html.classList.add('has-cursor');
    const cursor = $('.cursor');
    const dot = $('.cursor__dot');
    const triangle = $('.cursor__triangle');
    const shape = $('.cursor__shape');
    const label = $('.cursor__label');
    if (!cursor || !dot || !triangle || !shape) return; // разметку курсора поменяли — просто оставляем обычный
    let mx = -100, my = -100, rx = -100, ry = -100;
    let angle = 0;

    window.addEventListener('pointermove', e => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      cursor.classList.remove('is-hidden');
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', () => cursor.classList.add('is-hidden'));

    const follow = () => {
      const dx = mx - rx;
      const dy = my - ry;
      rx = lerp(rx, mx, 0.18);
      ry = lerp(ry, my, 0.18);
      triangle.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;

      // Вершина треугольника смотрит туда, куда движется мышь.
      // На карточке с надписью выравниваем его вершиной вверх, чтобы текст влез.
      let target = angle;
      if (cursor.classList.contains('is-label')) target = 0;
      else if (dx * dx + dy * dy > 4) target = Math.atan2(dy, dx) * 180 / Math.PI + 90;
      const diff = ((target - angle + 540) % 360) - 180; // кратчайший путь поворота
      angle += diff * 0.15;
      shape.style.transform = `rotate(${angle.toFixed(1)}deg)`;

      requestAnimationFrame(follow);
    };
    follow();

    document.addEventListener('mouseover', e => {
      // сначала ищем карточку с подписью: внутри неё вся площадь — растянутая ссылка
      const target = e.target.closest('[data-cursor]') || e.target.closest('a, button');
      const text = target && target.dataset.cursor;
      cursor.classList.toggle('is-label', !!text);
      cursor.classList.toggle('is-hover', !!target && !text);
      if (text) label.textContent = i18n.lang === 'en' ? (target.dataset.cursorEn || text) : text;
    });
  }

  function initMagnetic() {
    if (!finePointer || reduceMotion) return;
    $$('[data-magnetic]').forEach(el => {
      const strength = parseFloat(el.dataset.magnetic) || 0.3;
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  function initTilt() {
    if (!finePointer || reduceMotion) return;
    $$('[data-tilt]').forEach(el => {
      const max = parseFloat(el.dataset.tilt) || 6;
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(1100px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  function initSpotlight() {
    if (!finePointer) return;
    $$('[data-spotlight]').forEach(group => {
      const items = $$('.spot', group);
      group.addEventListener('pointermove', e => {
        items.forEach(item => {
          const r = item.getBoundingClientRect();
          item.style.setProperty('--mx', `${e.clientX - r.left}px`);
          item.style.setProperty('--my', `${e.clientY - r.top}px`);
        });
      });
    });
  }

  /* =========================================================
     6. Появление элементов, счётчики, активный пункт меню
     ========================================================= */
  function initReveal() {
    $$('[data-stagger]').forEach(group => {
      $$(':scope > .reveal', group).forEach((el, i) => el.style.setProperty('--d', `${(i % 4) * 0.08}s`));
    });

    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        io.unobserve(el);
        el.classList.add('is-visible');
        // после анимации снимаем служебные классы, чтобы не мешать 3D-наклону
        const delay = parseFloat(getComputedStyle(el).getPropertyValue('--d')) || 0;
        setTimeout(() => el.classList.remove('reveal', 'is-visible'), 1100 + delay * 1000);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    $$('.reveal').forEach(el => io.observe(el));
  }

  function initCounters() {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        io.unobserve(el);
        const to = Number(el.dataset.count);
        const pad = v => String(v).padStart(2, '0');
        if (reduceMotion) { el.textContent = pad(to); return; }
        const t0 = performance.now();
        const dur = 1400;
        const tick = now => {
          const p = clamp((now - t0) / dur, 0, 1);
          el.textContent = pad(Math.round(to * (1 - Math.pow(1 - p, 4))));
          if (p < 1) requestAnimationFrame(tick);
        };
        el.textContent = pad(0);
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.6 });
    $$('[data-count]').forEach(el => io.observe(el));
  }

  function initActiveNav() {
    const links = $$('.nav__links a');
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const id = `#${entry.target.id}`;
        links.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === id));
      });
    }, { rootMargin: '-45% 0px -54% 0px' });
    $$('main section[id]').forEach(s => io.observe(s));
  }

  /* =========================================================
     7. Скролл: Lenis, прогресс, навбар, таймлайн
     ========================================================= */
  let lenis = null;
  function initSmoothScroll() {
    if (reduceMotion || typeof window.Lenis !== 'function') return;
    lenis = new window.Lenis({ duration: 1.15, smoothWheel: true });
    const raf = time => { lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  function scrollToTarget(target) {
    if (lenis) lenis.scrollTo(target, { duration: 1.4 });
    else target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  const nav = $('#nav');
  const progress = $('.scroll-progress span');
  const bgCanvas = $('#bgCanvas');
  const scrollHint = $('.scroll-hint');
  const timelineList = $('.timeline__list');
  const timelineItems = $$('.tl-item');
  let lastY = window.scrollY;
  let ticking = false;
  let menuOpen = false;

  function onScroll() {
    const y = window.scrollY;
    const vh = window.innerHeight;
    const max = document.documentElement.scrollHeight - vh;

    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    nav.classList.toggle('is-scrolled', y > 40);
    nav.classList.toggle('is-hidden', y > lastY && y > 500 && !menuOpen);
    scrollHint && scrollHint.classList.toggle('is-gone', y > 80);
    bgCanvas.style.opacity = String(1 - clamp(y / (vh * 1.2), 0, 1) * 0.55);
    lastY = y;

    updateLitWords();

    if (timelineList) {
      const r = timelineList.getBoundingClientRect();
      const mid = vh * 0.6;
      timelineList.style.setProperty('--p', clamp((mid - r.top) / r.height, 0, 1).toFixed(3));
      timelineItems.forEach(item => item.classList.toggle('is-active', item.getBoundingClientRect().top + 12 < mid));
    }
    ticking = false;
  }

  // Линия таймлайна заканчивается ровно на последней точке
  function sizeTimeline() {
    const line = $('.timeline__line');
    const last = timelineItems[timelineItems.length - 1];
    if (!line || !last) return;
    line.style.bottom = 'auto';
    line.style.height = `${last.offsetTop + 4}px`;
  }

  function initScroll() {
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
    }, { passive: true });
    window.addEventListener('resize', () => { sizeTimeline(); onScroll(); });
    sizeTimeline();
    onScroll();

    // Плавные якорные ссылки
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#"]');
      if (!a || a.classList.contains('skip-link')) return;
      const href = a.getAttribute('href');
      e.preventDefault();
      if (href === '#') { toast(t('soon')); return; } // заглушка для ещё не добавленных ссылок
      const target = $(href);
      if (!target) return;
      setMenu(false);
      scrollToTarget(target);
    });
  }

  /* =========================================================
     8. Мобильное меню, язык, копирование email, тост
     ========================================================= */
  const burger = $('#burger');
  const mobileMenu = $('#mobileMenu');

  function setMenu(open) {
    if (!burger || menuOpen === open) return;
    menuOpen = open;
    burger.setAttribute('aria-expanded', String(open));
    mobileMenu.classList.toggle('is-open', open);
    mobileMenu.setAttribute('aria-hidden', String(!open));
    if (lenis) open ? lenis.stop() : lenis.start();
    if (open) nav.classList.remove('is-hidden');
  }

  function initMenu() {
    if (!burger) return;
    burger.addEventListener('click', () => setMenu(!menuOpen));
    window.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  }

  let toastTimer = 0;
  function toast(message) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-show'), 2400);
  }

  function initEmailCopy() {
    const btn = $('#emailCopy');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      const email = btn.dataset.email;
      try {
        await navigator.clipboard.writeText(email);
        toast(t('copied'));
      } catch {
        // запасной вариант для file:// и старых браузеров
        const area = document.createElement('textarea');
        area.value = email;
        area.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand('copy');
        area.remove();
        toast(ok ? t('copied') : t('copyFail'));
      }
    });
  }

  // Каждый элемент с data-en хранит английскую версию; русская сохраняется при старте
  function captureOriginals() {
    $$('[data-en]').forEach(el => { el.dataset.ru = el.innerHTML; });
  }

  function applyLang(lang) {
    i18n.lang = lang;
    html.lang = lang;
    document.title = t('title');
    $$('[data-en]').forEach(el => { el.innerHTML = lang === 'en' ? el.dataset.en : el.dataset.ru; });

    const toggle = $('#langToggle');
    toggle.classList.toggle('is-en', lang === 'en');
    toggle.setAttribute('aria-label', t('langLabel'));
    const [ru, en] = toggle.children;
    ru.classList.toggle('is-active', lang === 'ru');
    en.classList.toggle('is-active', lang === 'en');
    burger && burger.setAttribute('aria-label', t('menu'));

    // текст поменялся — заново режем на буквы/слова и перезапускаем эффекты
    splitName();
    splitWords();
    updateLitWords();
    sizeTimeline();
    if (scrambleStarted) startScramble();
    else if (scrambleEl) scrambleEl.textContent = i18n.roles[lang][0];
    store.set('lang', lang);
  }

  function initLang() {
    const toggle = $('#langToggle');
    if (!toggle) return;
    toggle.addEventListener('click', () => applyLang(i18n.lang === 'ru' ? 'en' : 'ru'));
  }

  /* =========================================================
     9. Прелоадер и запуск
     ========================================================= */
  async function runPreloader() {
    const pre = $('#preloader');
    if (!pre) return;
    if (reduceMotion) { pre.remove(); return; }

    const countEl = $('#preloaderCount');
    const bar = $('.preloader__bar span');
    const duration = 1300;
    const t0 = performance.now();

    await new Promise(resolve => {
      const tick = now => {
        const p = clamp((now - t0) / duration, 0, 1);
        const v = Math.round((1 - Math.pow(1 - p, 3)) * 100);
        countEl.textContent = v;
        bar.style.width = `${v}%`;
        if (p < 1) requestAnimationFrame(tick); else resolve();
      };
      requestAnimationFrame(tick);
    });
    // ждём шрифты, но не дольше 1.2 секунды
    await Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), wait(1200)]);

    pre.classList.add('is-done');
    setTimeout(() => pre.remove(), 1200);
  }

  async function init() {
    captureOriginals();
    if (store.get('lang') === 'en') applyLang('en');
    else { splitName(); splitWords(); }

    const typeCode = initTerminal();
    initShader();
    initSmoothScroll();
    initScroll();
    initMenu();
    initLang();
    initCursor();
    initMagnetic();
    initTilt();
    initSpotlight();
    initReveal();
    initCounters();
    initActiveNav();
    initEmailCopy();

    const year = $('#year');
    if (year) year.textContent = new Date().getFullYear();

    window.__siteReady = true;

    await runPreloader();
    html.classList.add('is-loaded');
    setTimeout(typeCode, 900);
    setTimeout(startScramble, 1500);
    // после появления hero убираем классы анимации, чтобы работал 3D-наклон терминала
    setTimeout(() => $$('.reveal-hero').forEach(el => el.classList.remove('reveal-hero')), 2400);
  }

  init();

  console.log('%cПривет, разработчик! 👋', 'font: 700 18px sans-serif; color: #7c5cff');
  console.log('%cЭтот сайт написан на чистом HTML, CSS и JavaScript: WebGL-шейдер, анимации и интерактив — без фреймворков.', 'color: #a0a0b8');
})();
