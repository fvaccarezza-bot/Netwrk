const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Custom cursor: small dot + a ring that trails with a delay, grows on
// interactive elements. Skipped on touch/coarse-pointer devices.
if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  document.body.classList.add('has-cursor');

  const dot = document.createElement('div');
  dot.className = 'cursor-dot';
  const ring = document.createElement('div');
  ring.className = 'cursor-ring';
  document.body.appendChild(dot);
  document.body.appendChild(ring);

  let mx = window.innerWidth / 2;
  let my = window.innerHeight / 2;
  let rx = mx;
  let ry = my;

  window.addEventListener('mousemove', (e) => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
  });

  const HOVER_SELECTOR = 'a, button, .card, .network-logo, input, textarea, [role="button"]';
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(HOVER_SELECTOR)) ring.classList.add('is-hover');
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(HOVER_SELECTOR)) ring.classList.remove('is-hover');
  });

  const tick = () => {
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// Premium smooth scroll (Lenis)
let lenis;

if (window.Lenis && !reduceMotion) {
  lenis = new Lenis({
    duration: 1.6,
    easing: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });

  const raf = (time) => {
    lenis.raf(time);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
}

document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    if (lenis) {
      lenis.scrollTo(target, { duration: 1.9, easing: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)) });
    } else {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// Menu toggle (the header button is the only open/close control — it stays
// fixed above the menu panel so it never gets covered or duplicated)
const body = document.body;
const toggle = document.querySelector('[data-menu-toggle]');
const menu = document.querySelector('[data-menu]');

const burgerLabel = toggle.querySelector('.burger-label');

function setMenu(open) {
  body.classList.toggle('menu-open', open);
  toggle.setAttribute('aria-expanded', String(open));

  if (burgerLabel) {
    // Fade + small rise instead of an instant text swap.
    burgerLabel.style.opacity = '0';
    burgerLabel.style.transform = 'translateY(4px)';
    setTimeout(() => {
      burgerLabel.textContent = open ? 'Close' : 'Menu';
      burgerLabel.style.opacity = '1';
      burgerLabel.style.transform = 'translateY(0)';
    }, 150);
  }
}

toggle.addEventListener('click', () => setMenu(!body.classList.contains('menu-open')));
menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

// Menu links: split into per-letter spans so hover can ripple across the
// word — each letter shifts left with its own delay, and reverses the
// same way on hover-out since it's just the same transition running back.
menu.querySelectorAll('a').forEach(link => {
  const text = link.textContent;
  link.textContent = '';
  text.split('').forEach((ch, i) => {
    const span = document.createElement('span');
    span.className = 'menu-letter';
    span.textContent = ch === ' ' ? ' ' : ch;
    span.style.transitionDelay = `${i * 22}ms`;
    link.appendChild(span);
  });
});

// Footer logo: one-time blur reveal when it fully touches the bottom of the viewport
const footerLogo = document.querySelector('[data-reveal]');

if (footerLogo && !reduceMotion) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.intersectionRatio >= 0.85) {
        footerLogo.classList.add('is-revealed');
        io.disconnect();
      }
    });
  }, { threshold: [0.85] });
  io.observe(footerLogo);
} else if (footerLogo) {
  footerLogo.classList.add('is-revealed');
}

// Network: vertical auto-scrolling logo marquee, faded top/bottom.
// Just add/replace entries here (paste the full list when it's ready) —
// columns and the seamless loop are built automatically from this array.
const NETWORK_LOGOS = [
  { src: 'images/network-logo/amex.png', alt: 'American Express' },
  { src: 'images/network-logo/nfl.png', alt: 'NFL' },
  { src: 'images/network-logo/mlb.png', alt: 'MLB' },
  { src: 'images/network-logo/nhl.png', alt: 'NHL' },
  { src: 'images/network-logo/cox-enterprises.png', alt: 'Cox Enterprises' },
  { src: 'images/network-logo/nba.png', alt: 'NBA' },
  { src: 'images/network-logo/caa.png', alt: 'CAA' },
  { src: 'images/network-logo/caesars.png', alt: 'Caesars' },
  { src: 'images/network-logo/arizona.png', alt: 'Arizona' },
  { src: 'images/network-logo/alo-yoga.png', alt: 'Alo Yoga' },
  { src: 'images/network-logo/celsius.png', alt: 'Celsius' },
  { src: 'images/network-logo/mars.png', alt: 'Mars' },
  { src: 'images/network-logo/spacex.png', alt: 'SpaceX' },
  { src: 'images/network-logo/toast.png', alt: 'Toast' },
  { src: 'images/network-logo/jersey-mikes.png', alt: "Jersey Mike's Subs" },
  { src: 'images/network-logo/walmart.png', alt: 'Walmart' },
  { src: 'images/network-logo/ufc.png', alt: 'UFC' },
  { src: 'images/network-logo/mikes-hot-honey.png', alt: "Mike's Hot Honey" },
  { src: 'images/network-logo/douglas-elliman.png', alt: 'Douglas Elliman' },
  { src: 'images/network-logo/houlihan-lokey.png', alt: 'Houlihan Lokey' },
  { src: 'images/network-logo/keurig.png', alt: 'Keurig' },
  { src: 'images/network-logo/green-mountain-coffee.png', alt: 'Green Mountain Coffee Roasters' },
  { src: 'images/network-logo/live-nation.png', alt: 'Live Nation' },
  { src: 'images/network-logo/golden-hippo.png', alt: 'Golden Hippo' },
  { src: 'images/network-logo/groot-hospitality.png', alt: 'Groot Hospitality' },
];

(() => {
  const marqueeEl = document.querySelector('[data-network-marquee]');
  if (!marqueeEl || !NETWORK_LOGOS.length) return;

  const COLS = 5;
  const ITEMS_PER_COL = 8;
  const BASE_SPEEDS = [14, 18, 15, 20, 16]; // px/sec, ambient pace
  const HOVER_MULTIPLIER = 4;

  // Split logos into COLS non-overlapping groups (round-robin) so the same
  // brand never shows up in two columns at once.
  const groups = Array.from({ length: COLS }, () => []);
  NETWORK_LOGOS.forEach((logo, i) => groups[i % COLS].push(logo));

  const tracks = [];

  for (let c = 0; c < COLS; c++) {
    const col = document.createElement('div');
    col.className = 'marquee-col';

    const track = document.createElement('div');
    track.className = 'marquee-track';

    // Fill the column by cycling its own (exclusive) group of logos, then
    // repeat the whole sequence once more for a seamless loop.
    const group = groups[c].length ? groups[c] : NETWORK_LOGOS;
    const sequence = Array.from({ length: ITEMS_PER_COL }, (_, i) => group[i % group.length]);

    [...sequence, ...sequence].forEach(logo => {
      const item = document.createElement('span');
      item.className = 'network-logo';
      const img = document.createElement('img');
      img.src = logo.src;
      img.alt = logo.alt;
      img.loading = 'lazy';
      item.appendChild(img);
      track.appendChild(item);
    });

    col.appendChild(track);
    marqueeEl.appendChild(col);

    const base = BASE_SPEEDS[c % BASE_SPEEDS.length];
    tracks.push({ el: track, pos: 0, dir: c % 2 ? -1 : 1, base, speed: base });
  }

  if (reduceMotion) return;

  // Driven by JS (not a CSS animation) so speed can ease smoothly toward a
  // hover target instead of snapping — a CSS animation-duration change
  // recalculates progress instantly and causes a visible jump.
  let hovering = false;
  marqueeEl.addEventListener('mouseenter', () => { hovering = true; });
  marqueeEl.addEventListener('mouseleave', () => { hovering = false; });

  let last = performance.now();

  const loop = (now) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    tracks.forEach(t => {
      const half = t.el.scrollHeight / 2 || 1;
      const target = t.base * (hovering ? HOVER_MULTIPLIER : 1);
      t.speed += (target - t.speed) * 0.03;

      t.pos -= t.dir * t.speed * dt;
      if (t.dir > 0 && t.pos <= -half) t.pos += half;
      if (t.dir < 0 && t.pos >= 0) t.pos -= half;

      t.el.style.transform = `translateY(${t.pos}px)`;
    });

    requestAnimationFrame(loop);
  };

  requestAnimationFrame(loop);
})();

// Network: pinned while scrolling, the marquee's columns lengthen — same
// pin technique as About/Stats (tall runway + sticky inner container).
(() => {
  const networkSection = document.querySelector('.network');
  const marqueeEl = document.querySelector('.network-marquee');
  const copyEl = document.querySelector('.network-copy');
  if (!networkSection || !marqueeEl) return;

  const HEIGHT_START = 0;
  const HEIGHT_END = 780;
  const COPY_SHIFT = 90; // the text block's own parallax move

  if (reduceMotion) {
    marqueeEl.style.height = `${HEIGHT_END}px`;
    return;
  }

  let ticking = false;

  const update = () => {
    const scrollable = networkSection.offsetHeight - window.innerHeight;
    const progress = scrollable > 0
      ? Math.min(Math.max(-networkSection.getBoundingClientRect().top / scrollable, 0), 1)
      : 0;
    // Growth finishes at 85% of the pin's scroll (eased so it visibly
    // decelerates into that finish) and holds for the last stretch — so
    // there's a settled beat before the pin releases, instead of the
    // growth and the release happening at the exact same instant.
    const growth = Math.min(progress / 0.85, 1);
    const eased = 1 - Math.pow(1 - growth, 3);
    marqueeEl.style.height = `${HEIGHT_START + (HEIGHT_END - HEIGHT_START) * eased}px`;
    marqueeEl.style.opacity = String(eased);
    const marqueeBlur = (1 - eased) * 14;
    marqueeEl.style.filter = marqueeBlur > 0.5 ? `blur(${marqueeBlur}px)` : 'none';
    if (copyEl) copyEl.style.transform = `translateY(${-eased * COPY_SHIFT}px)`;
    ticking = false;
  };

  const onScroll = () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();

// Hero: node network background — ambient drift, gentle pull toward the
// cursor, and lines connecting nearby nodes to each other and to the cursor
(() => {
  const canvas = document.querySelector('.hero-nodes');
  const heroEl = document.querySelector('.hero');
  if (!canvas || !heroEl) return;

  const ctx = canvas.getContext('2d');
  const NODE_COUNT = 64;
  const LINK_DIST = 260;
  const CURSOR_LINK_DIST = 240;
  const CURSOR_PULL_DIST = 300;
  const PARALLAX_SPEED = 0.4; // background moves at 40% of scroll speed

  let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  let nodes = [];
  let raf = null;
  const mouse = { x: -9999, y: -9999, active: false };
  // Cursor node trails the real pointer with a short eased delay ("drag" feel)
  const cursorNode = { x: -9999, y: -9999 };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  // Even, homogeneous spread: divide the box into a grid and jitter one
  // node inside each cell, instead of random placement (which tends to
  // clump into isolated blobs with big empty gaps).
  const makeNodes = () => {
    const cols = Math.max(1, Math.round(Math.sqrt(NODE_COUNT * w / h)));
    const rows = Math.max(1, Math.round(NODE_COUNT / cols));
    const cellW = w / cols;
    const cellH = h / rows;

    nodes = [];
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const homeX = (i + 0.5) * cellW + (Math.random() - 0.5) * cellW * 0.7;
        const homeY = (j + 0.5) * cellH + (Math.random() - 0.5) * cellH * 0.7;
        nodes.push({
          x: homeX,
          y: homeY,
          homeX,
          homeY,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          size: 1.6 + Math.random() * 1.8,
        });
      }
    }
  };

  const drawLinks = () => {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < LINK_DIST) {
          ctx.strokeStyle = `rgba(255,255,255,${0.32 * (1 - dist / LINK_DIST)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
  };

  const drawNodes = () => {
    nodes.forEach(n => {
      let size = n.size;
      let alpha = 0.85;
      if (mouse.active) {
        const dist = Math.hypot(mouse.x - n.x, mouse.y - n.y);
        if (dist < CURSOR_LINK_DIST) {
          const boost = 1 - dist / CURSOR_LINK_DIST;
          size += boost * 1.5;
          alpha = Math.min(1, alpha + boost * 0.3);
        }
      }
      ctx.beginPath();
      ctx.arc(n.x, n.y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fill();
    });
  };

  if (reduceMotion) {
    resize();
    makeNodes();
    ctx.clearRect(0, 0, w, h);
    drawLinks();
    drawNodes();
    window.addEventListener('resize', () => {
      resize();
      ctx.clearRect(0, 0, w, h);
      drawLinks();
      drawNodes();
    });
    return;
  }

  const step = () => {
    canvas.style.transform = `translateY(${window.scrollY * (1 - PARALLAX_SPEED)}px)`;
    ctx.clearRect(0, 0, w, h);

    if (mouse.active) {
      cursorNode.x += (mouse.x - cursorNode.x) * 0.14;
      cursorNode.y += (mouse.y - cursorNode.y) * 0.14;
    }

    nodes.forEach(n => {
      // Spring pull back toward the node's home position instead of
      // bouncing off the canvas edges — keeps the motion a self-contained
      // loop/orbit so the network's overall shape never drifts apart.
      n.vx += (n.homeX - n.x) * 0.0015;
      n.vy += (n.homeY - n.y) * 0.0015;
      n.vx *= 0.985;
      n.vy *= 0.985;
      n.x += n.vx;
      n.y += n.vy;

      if (mouse.active) {
        const dx = mouse.x - n.x, dy = mouse.y - n.y;
        const dist = Math.hypot(dx, dy);
        if (dist < CURSOR_PULL_DIST && dist > 1) {
          n.x += (dx / dist) * 0.7;
          n.y += (dy / dist) * 0.7;
        }
      }
    });

    drawLinks();

    if (mouse.active) {
      nodes.forEach(n => {
        const dist = Math.hypot(cursorNode.x - n.x, cursorNode.y - n.y);
        if (dist < CURSOR_LINK_DIST) {
          ctx.strokeStyle = `rgba(255,255,255,${0.6 * (1 - dist / CURSOR_LINK_DIST)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(cursorNode.x, cursorNode.y);
          ctx.lineTo(n.x, n.y);
          ctx.stroke();
        }
      });
    }

    drawNodes();

    if (mouse.active) {
      ctx.beginPath();
      ctx.arc(cursorNode.x, cursorNode.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,.95)';
      ctx.fill();
    }

    raf = requestAnimationFrame(step);
  };

  resize();
  makeNodes();

  window.addEventListener('resize', () => { resize(); makeNodes(); });
  heroEl.addEventListener('mousemove', (e) => {
    // canvas.getBoundingClientRect() already reflects its live parallax
    // transform, so this lines up with the canvas's local drawing space
    // with no extra math needed.
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    if (!mouse.active) {
      // Snap on entry so the cursor node doesn't fly in from off-screen.
      cursorNode.x = mouse.x;
      cursorNode.y = mouse.y;
    }
    mouse.active = true;
  });
  heroEl.addEventListener('mouseleave', () => { mouse.active = false; });

  raf = requestAnimationFrame(step);
})();

// About: pinned section with a scroll-scrubbed, word-by-word blur reveal
const aboutSection = document.querySelector('.about');
const aboutWords = document.querySelectorAll('.about-copy .word');
const ABOUT_WORD_WINDOW = 1.4;

if (aboutSection && aboutWords.length) {
  if (reduceMotion) {
    aboutWords.forEach(word => { word.style.opacity = '1'; word.style.filter = 'none'; });
  } else {
    const total = aboutWords.length;
    let ticking = false;

    const updateAbout = () => {
      const scrollable = aboutSection.offsetHeight - window.innerHeight;
      const progress = scrollable > 0
        ? Math.min(Math.max(-aboutSection.getBoundingClientRect().top / scrollable, 0), 1)
        : 0;
      // Scale so the first word starts at progress 0 and the last word
      // finishes exactly at progress 1 (not somewhere past it).
      const scaled = progress * (total - 1 + ABOUT_WORD_WINDOW);

      aboutWords.forEach((word, i) => {
        const wp = Math.min(Math.max((scaled - i) / ABOUT_WORD_WINDOW, 0), 1);
        word.style.opacity = String(0.25 + wp * 0.75);
        word.style.filter = wp >= 1 ? 'none' : `blur(${(1 - wp) * 6}px)`;
      });

      ticking = false;
    };

    const onAboutScroll = () => {
      if (!ticking) { requestAnimationFrame(updateAbout); ticking = true; }
    };

    window.addEventListener('scroll', onAboutScroll, { passive: true });
    window.addEventListener('resize', onAboutScroll);
    updateAbout();
  }
}

// Stats: pinned section where 3 numbers build up one at a time from below —
// left, then middle, then right, staying visible together — then all three
// leave together at the end with a slow blur/fade/parallax (each column at
// a slightly different rate for the parallax feel).
const statsSection = document.querySelector('.stats');
const statEls = document.querySelectorAll('.stat');
const STATS_ENTRY_END = 0.72; // fraction of the pin's scroll spent on the build-up; the rest is the exit
const STATS_COUNT_START = 0.92; // counters start here and ease up to target — narrow range, few numbers shown
let statsProgress = 0; // shared with the node-field background below
let statsExitProgress = 0; // shared with the node-field background below

if (statsSection && statEls.length) {
  // Numbers with a data-count target ease up to it, like a gauge needle
  // settling — quick at first, then slowing down as it approaches the
  // final value. No randomness, no jumping around.
  const statCounts = Array.from(statEls).map(el => {
    const numEl = el.querySelector('.stat-number');
    const target = numEl && numEl.dataset.count ? Number(numEl.dataset.count) : null;
    return {
      numEl, target,
      prefix: (numEl && numEl.dataset.prefix) || '',
      suffix: (numEl && numEl.dataset.suffix) || '',
      lastVal: null,
      lastStepTime: 0,
    };
  });

  // Advances the number in visible steps rather than a smooth continuous
  // change — each step pops up from below, like it's pushing the previous
  // value out of the way, instead of the digits just swapping in place.
  const stepNumberIn = (el, text) => {
    el.style.transition = 'none';
    el.style.transform = 'translateY(16px)';
    el.style.opacity = '0.2';
    el.textContent = text;
    void el.offsetHeight; // force reflow so the transition below actually runs
    el.style.transition = 'transform .3s cubic-bezier(.16,1,.3,1), opacity .3s cubic-bezier(.16,1,.3,1)';
    el.style.transform = 'translateY(0)';
    el.style.opacity = '1';
  };

  if (reduceMotion) {
    statEls.forEach(el => { el.style.opacity = '1'; });
  } else {
    const total = statEls.length;
    // Runs on its own fixed clock once a stat starts entering — reaches
    // the target quickly, the easing is what makes it feel slow.
    const COUNT_RATE = 0.005; // per frame; ~3.3s to finish at 60fps
    const countProgress = Array.from(statEls, () => 0);

    const updateStats = () => {
      const scrollable = statsSection.offsetHeight - window.innerHeight;
      const progress = scrollable > 0
        ? Math.min(Math.max(-statsSection.getBoundingClientRect().top / scrollable, 0), 1)
        : 0;
      statsProgress = progress;

      const entryProgress = Math.min(progress / STATS_ENTRY_END, 1);
      const exitProgress = Math.max((progress - STATS_ENTRY_END) / (1 - STATS_ENTRY_END), 0);
      statsExitProgress = exitProgress;
      const scaled = entryProgress * total;

      statEls.forEach((el, i) => {
        const local = Math.min(Math.max(scaled - i, 0), 1);
        // Enter over the first bit of this stat's segment, then hold.
        const p = Math.min(local / 0.7, 1);
        const enterOffset = 70 * (1 - p);

        const count = statCounts[i];
        if (count.target != null) {
          if (local > 0 && countProgress[i] < 1) {
            countProgress[i] = Math.min(countProgress[i] + COUNT_RATE, 1);
          }
          // Ease-out: fast at first, slows way down right before landing —
          // the "gauge needle settling" feel, no linear ticking.
          const eased = 1 - Math.pow(1 - countProgress[i], 5);
          const startVal = count.target * STATS_COUNT_START;
          const val = Math.round(startVal + (count.target - startVal) * eased);

          const now = performance.now();
          if (val !== count.lastVal && now - count.lastStepTime > 160) {
            count.lastVal = val;
            count.lastStepTime = now;
            stepNumberIn(count.numEl, `${count.prefix}${val.toLocaleString('en-US')}${count.suffix}`);
          }
        }

        const entryBlur = 16 * (1 - p); // blurred coming in, same as the exit treatment
        const exitBlur = exitProgress * 16;
        const blur = Math.max(entryBlur, exitBlur);
        const exitOffset = -exitProgress * (40 + i * 24); // each column drifts at its own speed
        // Always-on, subtle per-column drift so nothing ever sits fully
        // still while pinned — the enter/exit moves above stay the big ones.
        const holdDrift = -progress * (10 + i * 6);

        el.style.opacity = String(p * (1 - exitProgress));
        el.style.filter = blur > 0.5 ? `blur(${blur}px)` : 'none';
        el.style.transform = `translate(-50%,-50%) translateY(${enterOffset + exitOffset + holdDrift}px)`;
      });

      requestAnimationFrame(updateStats);
    };

    requestAnimationFrame(updateStats);
  }
}

// Stats background: a quiet, non-interactive echo of the hero's node mesh —
// same grid+jitter placement and spring-home loop as the hero, minus the
// cursor, with a subtle parallax tied to the same scroll progress driving
// the stats pin above. The canvas is centered via CSS transform, so every
// frame here must re-apply that centering alongside the parallax offset —
// setting transform wholesale would otherwise wipe the CSS centering out.
(() => {
  const canvas = document.querySelector('.stats-nodes');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const NODE_COUNT = 42;
  const LINK_DIST = 240;
  let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  let nodes = [];

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  // Even, homogeneous spread (same technique as the hero mesh): a grid with
  // one jittered node per cell, instead of pure random placement.
  const makeNodes = () => {
    const cols = Math.max(1, Math.round(Math.sqrt(NODE_COUNT * w / h)));
    const rows = Math.max(1, Math.round(NODE_COUNT / cols));
    const cellW = w / cols;
    const cellH = h / rows;

    nodes = [];
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const homeX = (i + 0.5) * cellW + (Math.random() - 0.5) * cellW * 0.7;
        const homeY = (j + 0.5) * cellH + (Math.random() - 0.5) * cellH * 0.7;
        nodes.push({
          x: homeX, y: homeY, homeX, homeY,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: 1.4 + Math.random() * 1.4,
        });
      }
    }
  };

  const drawLinks = () => {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < LINK_DIST) {
          ctx.strokeStyle = `rgba(255,255,255,${0.32 * (1 - dist / LINK_DIST)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
  };

  const drawNodes = () => {
    nodes.forEach(n => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.size, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.fill();
    });
  };

  resize();
  makeNodes();

  if (reduceMotion) {
    ctx.clearRect(0, 0, w, h);
    drawLinks();
    drawNodes();
    window.addEventListener('resize', () => {
      resize();
      makeNodes();
      ctx.clearRect(0, 0, w, h);
      drawLinks();
      drawNodes();
    });
    return;
  }

  window.addEventListener('resize', () => { resize(); makeNodes(); });

  const draw = () => {
    ctx.clearRect(0, 0, w, h);

    nodes.forEach(n => {
      // Spring pull back toward home — a self-contained loop/orbit, same
      // as the hero, so the mesh never drifts out of shape.
      n.vx += (n.homeX - n.x) * 0.001;
      n.vy += (n.homeY - n.y) * 0.001;
      n.vx *= 0.999;
      n.vy *= 0.999;
      n.x += n.vx;
      n.y += n.vy;
    });

    drawLinks();
    drawNodes();

    // Starts off-center and settles into the true viewport center exactly
    // as the last stat finishes entering, then gets an extra push once the
    // stats start leaving. The fade runs on its own, faster rate — it
    // finishes disappearing before the movement itself is done.
    const entryPhase = Math.min(statsProgress / STATS_ENTRY_END, 1);
    const parallaxY = (1 - entryPhase) * 140 + statsExitProgress * -180;
    const entryFactor = Math.min(statsProgress / 0.15, 1); // fades/sharpens in over the pin's first 15%
    const fadeOpacity = 0.7 * entryFactor * (1 - Math.min(statsExitProgress * 1.6, 1));
    const entryBlur = (1 - entryFactor) * 14;
    canvas.style.opacity = String(fadeOpacity);
    canvas.style.filter = entryBlur > 0.5 ? `blur(${entryBlur}px)` : 'none';
    canvas.style.transform = `translate(-50%,-50%) translateY(${parallaxY}px)`;
    requestAnimationFrame(draw);
  };

  requestAnimationFrame(draw);
})();

// Portfolio cards: cursor glow + very soft tilt, both trailing with an eased delay
const CARD_MAX_TILT = 3; // degrees

document.querySelectorAll('.card, .team-card').forEach(card => {
  let tx = 0, ty = 0, cx = 0, cy = 0, cw = 1, ch = 1, raf = null;

  const apply = () => {
    card.style.setProperty('--mx', `${cx}px`);
    card.style.setProperty('--my', `${cy}px`);
    const nx = cx / cw - 0.5;
    const ny = cy / ch - 0.5;
    card.style.setProperty('--ry', `${(nx * CARD_MAX_TILT * 2).toFixed(2)}deg`);
    card.style.setProperty('--rx', `${(-ny * CARD_MAX_TILT * 2).toFixed(2)}deg`);
  };

  const step = () => {
    cx += (tx - cx) * 0.12;
    cy += (ty - cy) * 0.12;
    apply();
    raf = (Math.abs(tx - cx) > 0.5 || Math.abs(ty - cy) > 0.5) ? requestAnimationFrame(step) : null;
  };

  card.addEventListener('mouseenter', (e) => {
    const rect = card.getBoundingClientRect();
    cw = rect.width;
    ch = rect.height;
    cx = tx = e.clientX - rect.left;
    cy = ty = e.clientY - rect.top;
    apply();
  });

  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    tx = e.clientX - rect.left;
    ty = e.clientY - rect.top;
    if (!raf) raf = requestAnimationFrame(step);
  });
});

// Portfolio cards: staggered reveal, left to right.
// Stagger is done with setTimeout (not CSS transition-delay) so the delay
// never lingers on the card and hover reacts the same on every card.
const grid = document.querySelector('.grid');
const cards = document.querySelectorAll('.card');

const revealCards = () => {
  cards.forEach((card, i) => {
    setTimeout(() => card.classList.add('is-visible'), reduceMotion ? 0 : i * 90);
  });
};

if (grid) {
  if (reduceMotion) {
    revealCards();
  } else {
    const gridIo = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          revealCards();
          gridIo.disconnect();
        }
      });
    }, { threshold: 0.2 });
    gridIo.observe(grid);
  }
}

// Team cards: Nick slides in from the left, Ryan from the right
const teamGrid = document.querySelector('.team-grid');

if (teamGrid) {
  if (reduceMotion) {
    teamGrid.classList.add('is-visible');
  } else {
    const teamIo = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          teamGrid.classList.add('is-visible');
          teamIo.disconnect();
        }
      });
    }, { threshold: 0.2 });
    teamIo.observe(teamGrid);
  }
}
