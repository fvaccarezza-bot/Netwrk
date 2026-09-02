const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Ease-in-out for 0-1 progress ramps, so reveals/holds settle in and out
// instead of hitting their start/end point at full speed (a linear ramp
// looks like it gets cut off right at the boundary).
const smoothstep = (x) => x * x * (3 - 2 * x);

// Hero: staggered load-in reveal (CSS handles the per-element transitions —
// this just flips the trigger class one frame after the hidden state has
// actually painted, so the transition is guaranteed to be visible instead
// of possibly collapsing into the same frame as the initial paint).
requestAnimationFrame(() => requestAnimationFrame(() => {
  document.body.classList.add('hero-loaded');
}));

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

  const HOVER_SELECTOR = 'a, button, .card, .network-logo, .network-marquee, input, textarea, [role="button"]';
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
      if (entry.intersectionRatio >= 0.5) {
        footerLogo.classList.add('is-revealed');
        io.disconnect();
      }
    });
  }, { threshold: [0.5] });
  io.observe(footerLogo);
} else if (footerLogo) {
  footerLogo.classList.add('is-revealed');
}

// Network closing line + subcopy: simple one-time reveal, not tied to any
// pin's scroll progress.
document.querySelectorAll('.network-lead-after, .network-subcopy').forEach(el => {
  if (reduceMotion) {
    el.classList.add('is-visible');
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        el.classList.add('is-visible');
        io.disconnect();
      }
    });
  }, { threshold: 0.3 });
  io.observe(el);
});

// Network: vertical auto-scrolling logo marquee, faded top/bottom.
// Just add/replace entries here (paste the full list when it's ready) —
// columns and the seamless loop are built automatically from this array.
const NETWORK_LOGOS = [
  { src: 'images/network-logo/amex.png', alt: 'American Express' },
  { src: 'images/network-logo/arizona.png', alt: 'Arizona' },
  { src: 'images/network-logo/betr.png', alt: 'Betr' },
  { src: 'images/network-logo/caa.png', alt: 'CAA' },
  { src: 'images/network-logo/caesars.png', alt: 'Caesars' },
  { src: 'images/network-logo/cox.png', alt: 'Cox Enterprises' },
  { src: 'images/network-logo/douglas.png', alt: 'Douglas Elliman' },
  { src: 'images/network-logo/fanatics.png', alt: 'Fanatics' },
  { src: 'images/network-logo/fisker.png', alt: 'Fisker' },
  { src: 'images/network-logo/goldenhipo.png', alt: 'Golden Hippo' },
  { src: 'images/network-logo/green.png', alt: 'Green Mountain Coffee Roasters' },
  { src: 'images/network-logo/groot.png', alt: 'Groot Hospitality' },
  { src: 'images/network-logo/houlihan.png', alt: 'Houlihan Lokey' },
  { src: 'images/network-logo/hwood.png', alt: 'The h.wood Group' },
  { src: 'images/network-logo/keurig.png', alt: 'Keurig' },
  { src: 'images/network-logo/live-nation.png', alt: 'Live Nation' },
  { src: 'images/network-logo/mlb.png', alt: 'MLB' },
  { src: 'images/network-logo/nba.png', alt: 'NBA' },
  { src: 'images/network-logo/nfl.png', alt: 'NFL' },
  { src: 'images/network-logo/nhl.png', alt: 'NHL' },
  { src: 'images/network-logo/bausch.png', alt: 'Bausch + Lomb' },
  { src: 'images/network-logo/liv.png', alt: 'LIV Golf' },
  { src: 'images/network-logo/nksfb.png', alt: 'NKSFB' },
  { src: 'images/network-logo/pnc.png', alt: 'PNC' },
  { src: 'images/network-logo/prime.png', alt: 'PRIME' },
  { src: 'images/network-logo/ripple.png', alt: 'Ripple' },
  { src: 'images/network-logo/rolling.png', alt: 'Rolling Loud' },
  { src: 'images/network-logo/skechers.png', alt: 'Skechers' },
  { src: 'images/network-logo/uta.png', alt: 'UTA' },
];

(() => {
  const marqueeEl = document.querySelector('[data-network-marquee]');
  if (!marqueeEl || !NETWORK_LOGOS.length) return;

  const isRetinaBand = window.matchMedia('(min-width:901px) and (max-width:1919.98px)').matches;
  const isUW = window.matchMedia('(min-width:1920px)').matches;
  const COLS = isRetinaBand ? 9 : (isUW ? 9 : 4);
  const BASE_SPEEDS = [14, 18, 15, 20]; // px/sec, base pace
  const IDLE_MULTIPLIER = 4; // fast while not hovering
  const HOVER_MULTIPLIER = 1; // slows down to the base pace on hover

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

    // Each column's own sequence is exactly its group's logos, in order —
    // no wrapping/repeating within a single pass — then that sequence is
    // repeated once more back-to-back for the seamless scroll loop. As
    // long as a group has more items than fit in the visible height, the
    // same logo is never on screen twice at once.
    let group = groups[c].length ? groups[c] : NETWORK_LOGOS;
    // Pad short groups by repeating their own logos — a temporary stopgap
    // so every column has at least 5 rows worth of track to loop through.
    const MIN_PER_COLUMN = 5;
    if (group.length < MIN_PER_COLUMN) {
      const padded = [];
      for (let i = 0; i < MIN_PER_COLUMN; i++) padded.push(group[i % group.length]);
      group = padded;
    }
    const sequence = group;

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

  // Floating "View All" label that trails the cursor while hovering the
  // logo grid — purely decorative (pointer-events:none) so it never steals
  // the hover/click that the grid itself now handles as the click target.
  const marqueeCta = document.createElement('div');
  marqueeCta.className = 'marquee-cta';
  marqueeCta.innerHTML = '<span>View</span><span>All +</span>';
  document.body.appendChild(marqueeCta);

  marqueeEl.addEventListener('mousemove', (e) => {
    marqueeCta.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
  });
  marqueeEl.addEventListener('mouseenter', () => { marqueeCta.classList.add('is-visible'); });
  marqueeEl.addEventListener('mouseleave', () => { marqueeCta.classList.remove('is-visible'); });
  marqueeEl.addEventListener('click', () => { window.location.href = 'network-partners.html'; });

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
      const target = t.base * (hovering ? HOVER_MULTIPLIER : IDLE_MULTIPLIER);
      t.speed += (target - t.speed) * 0.03;

      t.pos -= t.dir * t.speed * dt;
      // Modulo wrap (not a single conditional +=/-= half) so a slow frame
      // that overshoots by more than one cycle still lands in range instead
      // of visibly skipping — this is what showed up as jumps on some
      // columns (their groups have fewer logos, so `half` is smaller and a
      // big frame gap was more likely to overshoot it).
      t.pos = ((t.pos % half) + half) % half - half;

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
  const copyAfterEl = document.querySelector('.network-copy-after');
  if (!networkSection || !marqueeEl) return;

  const marqueeIsFullBleed = window.matchMedia('(min-width:901px) and (max-width:1919.98px)').matches;
  // 3 rows tall in the retina band (measured off the actual rendered logo
  // frame, since its size is fluid there); the original fixed reveal
  // height everywhere else.
  const isRetinaBand = window.matchMedia('(min-width:901px) and (max-width:1919.98px)').matches;
  const isUW = window.matchMedia('(min-width:1920px)').matches;
  const sampleLogo = document.querySelector('.network-logo');
  const logoH = sampleLogo ? sampleLogo.getBoundingClientRect().height : 120;
  // UW: pre-reveal ("closed") sliver is much thinner (16px) so the gap
  // before the curtain opens doesn't read as dead space.
  const CURTAIN_HEIGHT = isRetinaBand ? logoH : (isUW ? 16 : 120); // one row, opened via clip-path so logos never get squashed
  const HEIGHT_END = isRetinaBand ? logoH * 4 + 12 * 3 : 780;
  const CURTAIN_END = 0.3; // fraction of eased spent just opening the curtain on that first row
  const COPY_DROP = 90; // starts this far above its natural spot; one constant rate down to 0

  if (reduceMotion) {
    marqueeEl.style.height = `${HEIGHT_END}px`;
    if (copyEl) { copyEl.style.opacity = '1'; copyEl.style.filter = 'none'; }
    if (copyAfterEl) { copyAfterEl.style.opacity = '1'; copyAfterEl.style.transform = 'none'; }
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
    // Phase 1: a horizontal curtain opens (clip-path, not scale — the logos
    // stay full size, never squashed) over the first row's fixed height.
    // Phase 2: once that curtain is fully open, height takes over and
    // extends the block downward to reveal the remaining rows.
    const curtainProgress = Math.min(eased / CURTAIN_END, 1);
    const growProgress = Math.max((eased - CURTAIN_END) / (1 - CURTAIN_END), 0);
    const currentHeight = CURTAIN_HEIGHT + (HEIGHT_END - CURTAIN_HEIGHT) * growProgress;
    marqueeEl.style.height = `${currentHeight}px`;
    const curtainInset = 50 * (1 - curtainProgress);
    marqueeEl.style.clipPath = `inset(${curtainInset}% 0 ${curtainInset}% 0)`;
    marqueeEl.style.transform = marqueeIsFullBleed ? 'translateX(-50%)' : 'none';
    marqueeEl.style.opacity = String(eased);
    const marqueeBlur = (1 - eased) * 14;
    marqueeEl.style.filter = marqueeBlur > 0.5 ? `blur(${marqueeBlur}px)` : 'none';
    if (copyEl) {
      // Reveals entirely BEFORE the pin engages — driven by the section's
      // normal scroll-into-view position, not the pinned progress — so by
      // the time the pin actually sticks, the text is already settled and
      // the pinned scroll is free to belong to the logo curtain/growth.
      const preRect = networkSection.getBoundingClientRect();
      const preProgress = Math.min(Math.max(1 - preRect.top / window.innerHeight, 0), 1);
      const copyIn = smoothstep(Math.min(preProgress / 0.8, 1));
      copyEl.style.opacity = String(copyIn);
      const copyBlur = (1 - copyIn) * 14;
      copyEl.style.filter = copyBlur > 0.5 ? `blur(${copyBlur}px)` : 'none';
      // Starts lower and rises into place as it reveals.
      copyEl.style.transform = `translateY(${(1 - copyIn) * COPY_DROP}px)`;

      // Headline/subcopy (UW: sits below the marquee) reveals in lockstep
      // with the eyebrow above — both settle before the pin engages, so the
      // icon curtain/grow animation between them is the only thing driven
      // by the pinned scroll.
      if (copyAfterEl) {
        copyAfterEl.style.opacity = String(copyIn);
        copyAfterEl.style.filter = copyBlur > 0.5 ? `blur(${copyBlur}px)` : 'none';
        copyAfterEl.style.transform = `translateY(${(1 - copyIn) * COPY_DROP}px)`;
      }
    }
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
  const PARALLAX_SPEED = 0.15; // background moves at 15% of scroll speed (more visible drift)
  const LOAD_IN_MS = 1400; // node field itself fades in on page load, alongside the text
  const WAVE_SPAN = 1000; // ms for the reveal wave to sweep from center to the furthest node
  const NODE_FADE = 450; // ms for one node's own fade/grow-in once the wave reaches it

  let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  const loadStart = performance.now();
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

    // UW (>=1920px) renders nodes larger — matches the protected UW baseline
    // sizing, doesn't touch retina band or mobile.
    const isUW = window.innerWidth >= 1920;
    const sizeBase = isUW ? 2.4 : 1.6;
    const sizeRange = isUW ? 2.6 : 1.8;

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
          size: sizeBase + Math.random() * sizeRange,
          reveal: reduceMotion ? 1 : 0,
        });
      }
    }

    // Entrance wave: nodes wake up in a ring expanding out from the field's
    // own center, instead of the whole mesh just fading in flat together.
    if (!reduceMotion) {
      const cx = w / 2, cy = h / 2;
      let maxDist = 1;
      nodes.forEach(n => {
        n.dist = Math.hypot(n.homeX - cx, n.homeY - cy);
        if (n.dist > maxDist) maxDist = n.dist;
      });
      nodes.forEach(n => { n.waveDelay = (n.dist / maxDist) * WAVE_SPAN; });
    }
  };

  const drawLinks = () => {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const linkReveal = Math.min(a.reveal, b.reveal);
        if (linkReveal <= 0) continue;
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < LINK_DIST) {
          ctx.strokeStyle = `rgba(255,255,255,${0.32 * (1 - dist / LINK_DIST) * linkReveal})`;
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
      if (n.reveal <= 0) return;
      // Subtle grow-in alongside the fade, not just an alpha snap.
      let size = n.size * (0.4 + 0.6 * n.reveal);
      let alpha = 0.85 * n.reveal;
      let glow = 0;
      if (mouse.active) {
        const dist = Math.hypot(mouse.x - n.x, mouse.y - n.y);
        if (dist < CURSOR_LINK_DIST) {
          const boost = 1 - dist / CURSOR_LINK_DIST;
          size += boost * 1.5;
          alpha = Math.min(1, alpha + boost * 0.3);
          glow = boost;
        }
      }
      ctx.beginPath();
      ctx.arc(n.x, n.y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      if (glow > 0) {
        ctx.shadowBlur = glow * 22;
        ctx.shadowColor = 'rgba(255,255,255,.95)';
      }
      ctx.fill();
      if (glow > 0) ctx.shadowBlur = 0;
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
    // Fades and blurs out over the first viewport height of scroll, so the
    // node field dissolves away as it parallax-scrolls out of the hero
    // instead of just sliding off with a hard edge.
    const heroFadeProgress = Math.min(window.scrollY / window.innerHeight, 1);
    const now = performance.now();
    const loadIn = smoothstep(Math.min((now - loadStart) / LOAD_IN_MS, 1));
    canvas.style.opacity = String((1 - heroFadeProgress) * loadIn);
    // Each node's own reveal — a wave sweeping out from center, computed
    // once per frame and reused by both drawLinks and drawNodes below.
    const elapsed = now - loadStart;
    nodes.forEach(n => {
      const t = (elapsed - n.waveDelay) / NODE_FADE;
      n.reveal = smoothstep(Math.min(Math.max(t, 0), 1));
    });
    canvas.style.filter = heroFadeProgress > 0 ? `blur(${heroFadeProgress * 16}px)` : 'none';
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
  // Listens on window (not heroEl) so the hover reach covers the full
  // viewport width, including the UW margins outside .wrap — only the
  // vertical range stays gated to the hero section's own bounds.
  window.addEventListener('mousemove', (e) => {
    const heroRect = heroEl.getBoundingClientRect();
    if (e.clientY < heroRect.top || e.clientY > heroRect.bottom) {
      mouse.active = false;
      return;
    }
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
  window.addEventListener('mouseout', (e) => {
    if (!e.relatedTarget) mouse.active = false;
  });

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
const statsIsUW = window.matchMedia('(min-width:1920px)').matches;
// UW: longer build-up and a longer fade-out, with a shorter hold between them.
const STATS_ENTRY_END = statsIsUW ? 0.68 : 0.6; // fraction of the pin's scroll spent on the build-up
const STATS_EXIT_START = statsIsUW ? 0.72 : 0.8; // all 3 stay fully visible until this fraction, then fade out
let statsProgress = 0; // shared with the node-field background below
let statsExitProgress = 0; // shared with the node-field background below

if (statsSection && statEls.length) {
  // Builds a real per-digit odometer: each digit gets its own vertical
  // reel (0 through the target digit), commas/prefix/suffix stay static
  // text. Returns the digit reels in right-to-left order, since that's
  // the order their roll speed is set in (rightmost fastest).
  const buildOdometer = (wrapEl, target, prefix, suffix) => {
    wrapEl.textContent = '';
    // Regular spaces can get collapsed away when the text node sits right
    // against an anonymous flex item (the digit spans) — use a
    // non-breaking space so "1 of 10" doesn't lose the gap before "10".
    if (prefix) wrapEl.appendChild(document.createTextNode(prefix.replace(/ /g, ' ')));

    const digits = [];
    target.toLocaleString('en-US').split('').forEach(ch => {
      if (ch < '0' || ch > '9') {
        wrapEl.appendChild(document.createTextNode(ch)); // comma etc.
        return;
      }
      const digitEl = document.createElement('span');
      digitEl.className = 'stat-digit';
      const strip = document.createElement('span');
      strip.className = 'stat-digit-strip';
      for (let d = 0; d <= 9; d++) {
        const cell = document.createElement('span');
        cell.className = 'stat-digit-cell';
        cell.textContent = String(d);
        strip.appendChild(cell);
      }
      // Start just a few steps before the target (wrapping around 0-9)
      // instead of always from 0 — a short, consistent roll no matter
      // the digit, instead of a long spin for anything close to 0.
      const startDigit = ((Number(ch) - 3) % 10 + 10) % 10;
      strip.style.transform = `translateY(-${startDigit * 10}%)`;
      digitEl.appendChild(strip);
      digitEl.dataset.target = ch;
      wrapEl.appendChild(digitEl);
      digits.push(digitEl);
    });

    if (suffix) wrapEl.appendChild(document.createTextNode(suffix));
    return digits.reverse(); // right-to-left
  };

  // Rolls every digit reel to its target at once, but the rightmost
  // (fastest, shortest duration) settles first and each one further left
  // takes progressively longer — same feel as a mechanical counter.
  const rollOdometer = (digitsRightToLeft) => {
    digitsRightToLeft.forEach((digitEl, i) => {
      const strip = digitEl.querySelector('.stat-digit-strip');
      const target = Number(digitEl.dataset.target);
      const duration = 0.55 + i * 0.3;
      strip.style.transition = `transform ${duration}s cubic-bezier(.16,1,.3,1)`;
      strip.style.transform = `translateY(-${target * 10}%)`;
    });
  };

  const statCounts = Array.from(statEls).map(el => {
    const numEl = el.querySelector('.stat-number');
    const target = numEl && numEl.dataset.count ? Number(numEl.dataset.count) : null;
    const digits = target != null
      ? buildOdometer(numEl, target, numEl.dataset.prefix || '', numEl.dataset.suffix || '')
      : null;
    return { digits, rolled: false };
  });

  if (reduceMotion) {
    // Show the final digits straight away, no rolling.
    statCounts.forEach(count => {
      if (count.digits) count.digits.forEach(d => {
        d.querySelector('.stat-digit-strip').style.transform = `translateY(-${Number(d.dataset.target) * 10}%)`;
      });
    });
    statEls.forEach(el => { el.style.opacity = '1'; });
    const titleElReduced = document.querySelector('.stats-title');
    if (titleElReduced) titleElReduced.style.opacity = '1';
  } else {
    const total = statEls.length;
    const titleEl = document.querySelector('.stats-title');

    const updateStats = () => {
      const scrollable = statsSection.offsetHeight - window.innerHeight;
      const progress = scrollable > 0
        ? Math.min(Math.max(-statsSection.getBoundingClientRect().top / scrollable, 0), 1)
        : 0;
      statsProgress = progress;

      if (titleEl) {
        // Reveals over the first bit of the pin, blurred and drifting down
        // into place, then drifts/blurs back out with the rest on exit.
        const titleIn = smoothstep(Math.min(progress / 0.15, 1));
        const titleExit = smoothstep(Math.max((progress - STATS_EXIT_START) / (1 - STATS_EXIT_START), 0));
        const titleBlur = Math.max(16 * (1 - titleIn), titleExit * 16);
        titleEl.style.opacity = String(titleIn * (1 - titleExit));
        titleEl.style.filter = titleBlur > 0.5 ? `blur(${titleBlur}px)` : 'none';
        titleEl.style.transform = `translateX(-50%) translateY(${(1 - titleIn) * -24 - titleExit * 30}px)`;
      }

      const entryProgress = Math.min(progress / STATS_ENTRY_END, 1);
      const exitProgress = Math.max((progress - STATS_EXIT_START) / (1 - STATS_EXIT_START), 0);
      statsExitProgress = exitProgress;
      const scaled = entryProgress * total;

      statEls.forEach((el, i) => {
        const local = Math.min(Math.max(scaled - i, 0), 1);
        // Enter over the first bit of this stat's segment, then hold.
        const p = Math.min(local / 0.7, 1);
        const enterOffset = 70 * (1 - p);

        const count = statCounts[i];
        if (count.digits && local > 0 && !count.rolled) {
          count.rolled = true;
          rollOdometer(count.digits);
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
  const statsPinEl = document.querySelector('.stats-pin');
  if (!canvas || !statsPinEl) return;

  const ctx = canvas.getContext('2d');
  const NODE_COUNT = 42;
  const LINK_DIST = 240;
  // Same reach as the hero's node field's hover interaction.
  const CURSOR_LINK_DIST = 240;
  const CURSOR_PULL_DIST = 300;
  let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  let nodes = [];
  const mouse = { x: -9999, y: -9999, active: false };
  const cursorNode = { x: -9999, y: -9999 };

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
      let size = n.size;
      let alpha = 0.85;
      let glow = 0;
      if (mouse.active) {
        const dist = Math.hypot(mouse.x - n.x, mouse.y - n.y);
        if (dist < CURSOR_LINK_DIST) {
          const boost = 1 - dist / CURSOR_LINK_DIST;
          size += boost * 1.5;
          alpha = Math.min(1, alpha + boost * 0.3);
          glow = boost;
        }
      }
      ctx.beginPath();
      ctx.arc(n.x, n.y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      if (glow > 0) {
        ctx.shadowBlur = glow * 22;
        ctx.shadowColor = 'rgba(255,255,255,.95)';
      }
      ctx.fill();
      if (glow > 0) ctx.shadowBlur = 0;
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

    if (mouse.active) {
      cursorNode.x += (mouse.x - cursorNode.x) * 0.14;
      cursorNode.y += (mouse.y - cursorNode.y) * 0.14;
    }

    nodes.forEach(n => {
      // Spring pull back toward home — a self-contained loop/orbit, same
      // as the hero, so the mesh never drifts out of shape.
      n.vx += (n.homeX - n.x) * 0.001;
      n.vy += (n.homeY - n.y) * 0.001;
      n.vx *= 0.999;
      n.vy *= 0.999;
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

    // Continuous parallax drift for the whole pin — never pins in place —
    // that crosses dead center exactly when the third stat finishes
    // entering, then keeps drifting past it as the section exits.
    const parallaxY = (STATS_ENTRY_END - statsProgress) * 220;
    const entryFactor = smoothstep(Math.min(statsProgress / 0.24, 1)); // fades/sharpens in over the pin's first 24%
    const fadeOpacity = 0.7 * entryFactor * (1 - Math.min(statsExitProgress * 1.1, 1));
    const entryBlur = (1 - entryFactor) * 14;
    canvas.style.opacity = String(fadeOpacity);
    canvas.style.filter = entryBlur > 0.5 ? `blur(${entryBlur}px)` : 'none';
    canvas.style.transform = `translate(-50%,-50%) translateY(${parallaxY}px)`;
    requestAnimationFrame(draw);
  };

  statsPinEl.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    if (!mouse.active) {
      cursorNode.x = mouse.x;
      cursorNode.y = mouse.y;
    }
    mouse.active = true;
  });
  statsPinEl.addEventListener('mouseleave', () => { mouse.active = false; });

  requestAnimationFrame(draw);
})();

let midLeadProgress = 0; // shared with the pulse-ring background below
let midLeadExitProgress = 0; // shared with the pulse-ring background below

// Mid-lead statement (between Portfolio and Team): pinned while the two
// lines fade/blur in staggered — one, then the other — hold, then fade/blur
// out together as the pin releases. Same technique as Stats.
(() => {
  const section = document.querySelector('.mid-lead');
  const lines = document.querySelectorAll('.mid-lead-light, .mid-lead-bold');
  if (!section || !lines.length) return;

  if (reduceMotion) {
    lines.forEach(el => { el.style.opacity = '1'; });
    return;
  }

  const ENTRY_END = 0.38; // fraction of the pin's scroll spent staggering the two lines in
  const EXIT_START = 0.78; // both lines stay fully visible until this fraction, then fade out together
  const total = lines.length;
  let ticking = false;

  const update = () => {
    const scrollable = section.offsetHeight - window.innerHeight;
    const progress = scrollable > 0
      ? Math.min(Math.max(-section.getBoundingClientRect().top / scrollable, 0), 1)
      : 0;

    const entryProgress = Math.min(progress / ENTRY_END, 1);
    const exitProgress = smoothstep(Math.max((progress - EXIT_START) / (1 - EXIT_START), 0));
    midLeadProgress = progress;
    midLeadExitProgress = exitProgress;
    const scaled = entryProgress * total;

    lines.forEach((el, i) => {
      const local = Math.min(Math.max(scaled - i, 0), 1);
      // Eased (not linear) and spread over nearly this whole line's segment,
      // so the entrance reads as a slow settle instead of a snap.
      const p = smoothstep(Math.min(local / 0.95, 1));
      const enterOffset = 46 * (1 - p);
      const entryBlur = 20 * (1 - p);
      const exitBlur = exitProgress * 20;
      const blur = Math.max(entryBlur, exitBlur);
      // Top line travels further/faster on exit than the bottom one, so it
      // clears out of the way instead of the bottom line catching up to it.
      const exitOffset = -exitProgress * (50 + (total - 1 - i) * 30);
      // Slow, always-on drift while pinned and fully visible — a subtle
      // parallax so the hold never reads as a dead stop.
      const holdDrift = -progress * (16 + i * 12);

      el.style.opacity = String(p * (1 - exitProgress));
      el.style.filter = blur > 0.5 ? `blur(${blur}px)` : 'none';
      el.style.transform = `translateY(${enterOffset + exitOffset + holdDrift}px)`;
    });

    ticking = false;
  };

  const onScroll = () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();

// Mid-lead background: rings settle in once, automatically, then sit still
// as a fixed target pattern (each ring also trails the cursor a little,
// accordion-style). Hovering doesn't add a new ring — it sends a subtle
// pulse through those same settled rings, center-out: each one briefly
// bulges outward (radius only, no color/brightness change), inner ring
// first. The whole canvas still fades/blurs/parallaxes with scroll
// progress, same treatment as the stats-nodes background.
(() => {
  const canvas = document.querySelector('.mid-lead-pulse');
  const pinEl = document.querySelector('.mid-lead-pin');
  if (!canvas || reduceMotion) return;

  const ctx = canvas.getContext('2d');
  const RING_COUNT = 6;
  const RADIUS_SCALE = 0.9; // resting radii stay inside this fraction of the canvas, leaving room for the pulse bulge + follow offset
  const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

  // One-time settle-in: each ring grows from the center out to its own
  // fixed resting radius, staggered slightly, decelerating hard into place
  // — then just stays there as a static pattern (no fade, no reset).
  const SETTLE_STAGGER = 160; // ms between each ring's settle start
  const SETTLE_DURATION = 1800; // ms for one ring to settle into place
  let settleStart = null;

  // Hover pulse: travels outward through the settled rings themselves
  // (inner to outer), each one bulging out (radius only — no brightness
  // change) as the pulse passes through it, then easing back to rest.
  const PULSE_STAGGER = 260; // ms before the pulse reaches the next ring out
  const PULSE_DURATION = 1300; // ms for one ring's bulge-and-back
  let pulses = [];

  let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);

  // Each ring trails the cursor on its own, accordion-style — the innermost
  // ring is the most flexible (follows closest), and each ring out from
  // there follows less, down to the outer ring which barely moves. Every
  // ring's own follow offset is still capped well under the gap between
  // ring radii, so even moving independently they never touch or cross.
  const FOLLOW_MAX = 60; // px, innermost ring's cap
  let mouseX = 0, mouseY = 0;
  const followX = new Array(RING_COUNT).fill(0);
  const followY = new Array(RING_COUNT).fill(0);

  if (pinEl) {
    pinEl.addEventListener('mouseenter', () => {
      pulses.push({ launch: performance.now() });
    });
  }
  // Tracked on window (not just while hovering the pin) so the rings keep
  // leaning toward wherever the cursor actually is, capped by each ring's
  // own follow distance either way.
  window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left - rect.width / 2;
    mouseY = e.clientY - rect.top - rect.height / 2;
  });

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const draw = (now) => {
    resize();
    ctx.clearRect(0, 0, w, h);

    const maxRadius = Math.min(w, h) / 2;
    const ringGap = maxRadius / RING_COUNT;

    // Kicks off automatically the first time the pin actually starts
    // engaging (not on page load, so it's timed with the section arriving).
    if (settleStart === null && midLeadProgress > 0.01) settleStart = now;

    const pulseDone = (RING_COUNT - 1) * PULSE_STAGGER + PULSE_DURATION;
    pulses = pulses.filter(p => now - p.launch < pulseDone);

    if (settleStart !== null) {
      for (let i = 0; i < RING_COUNT; i++) {
        // Accordion follow: innermost ring (i=0) is the most flexible,
        // each ring out from there follows less. Independent per-ring, but
        // every ring's cap is small next to the gap between ring radii, so
        // they never touch or cross regardless of direction.
        const followStrength = 0.08 + 0.92 * Math.pow(1 - i / (RING_COUNT - 1), 1.6);
        const cap = FOLLOW_MAX * followStrength;
        const targetX = Math.max(-cap, Math.min(cap, mouseX * 0.06 * followStrength));
        const targetY = Math.max(-cap, Math.min(cap, mouseY * 0.06 * followStrength));
        followX[i] += (targetX - followX[i]) * 0.07;
        followY[i] += (targetY - followY[i]) * 0.07;
        const cx = w / 2 + followX[i], cy = h / 2 + followY[i];

        // Resting radii stop short of the canvas edge (RADIUS_SCALE), so the
        // pulse bulge and the follow offset both have headroom to expand
        // into without the outer ring's stroke clipping against the frame.
        const target = ((i + 1) / RING_COUNT) * maxRadius * RADIUS_SCALE;
        const elapsed = now - settleStart - i * SETTLE_STAGGER;
        const t = Math.min(Math.max(elapsed / SETTLE_DURATION, 0), 1);
        let radius = easeOutQuart(t) * target;
        const alpha = 0.22 * (1 - i / RING_COUNT * 0.6);

        pulses.forEach(p => {
          const pElapsed = now - p.launch - i * PULSE_STAGGER;
          const pt = pElapsed / PULSE_DURATION;
          if (pt < 0 || pt > 1) return;
          // Rises to a peak mid-bulge, then eases back — radius only, no
          // brightness change, so it reads as a physical push, not a glow.
          const bump = Math.sin(pt * Math.PI);
          radius += bump * ringGap * 0.18;
        });

        if (radius <= 0) continue;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,255,255,${Math.min(alpha, 1)})`;
        ctx.lineWidth = 1;
        // A soft glow reads as a little lift/depth off the page, rather
        // than a flat drawn line.
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(255,255,255,.5)';
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    // The canvas is centered via CSS transform, so every frame here must
    // re-apply that centering alongside the parallax offset.
    const entryFactor = smoothstep(Math.min(midLeadProgress / 0.24, 1));
    const fadeOpacity = 0.8 * entryFactor * (1 - Math.min(midLeadExitProgress * 1.1, 1));
    const entryBlur = (1 - entryFactor) * 14;
    const parallaxY = (0.35 - midLeadProgress) * 140;
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

// Co-Investors grid: simple fade/blur/rise reveal, same pattern as the team grid.
const coInvestorsGrid = document.querySelector('.co-investors-grid');

if (coInvestorsGrid) {
  if (reduceMotion) {
    coInvestorsGrid.classList.add('is-visible');
  } else {
    const coInvestorsIo = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          coInvestorsGrid.classList.add('is-visible');
          coInvestorsIo.disconnect();
        }
      });
    }, { threshold: 0.2 });
    coInvestorsIo.observe(coInvestorsGrid);
  }
}
