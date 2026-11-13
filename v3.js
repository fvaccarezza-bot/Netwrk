// index.html (v3) — section behaviour on top of script-v3.js.
//
// Model: no pins. Every section flows normally and reveals once when it
// scrolls into view, on timers. The nodes web is a fixed backdrop behind
// Portfolio / Co-Investors that builds (and un-builds) with the scroll.

const V3_REDUCE = typeof reduceMotion !== 'undefined' && reduceMotion;
const V3_DESKTOP = window.matchMedia('(min-width:901px)').matches;

// Plays `items` ([element, class] pairs) `stagger` ms apart, once, when `el`
// has scrolled a bit into view (`margin`: IntersectionObserver rootMargin).
const revealOnEnter = (el, items, stagger, margin = '0px 0px -10% 0px') => {
  if (V3_REDUCE) { items.forEach(([item, cls]) => item.classList.add(cls)); return; }
  const io = new IntersectionObserver((en) => {
    if (!en[0].isIntersecting) return;
    io.disconnect();
    items.forEach(([item, cls], i) => setTimeout(() => item.classList.add(cls), i * stagger));
  }, { rootMargin: margin });
  io.observe(el);
};

// Mobile: the body copy has desktop-placed <br>s that read as random breaks
// on a phone — swap them for spaces (headlines keep theirs).
if (!V3_DESKTOP) {
  document.querySelectorAll('.network-subcopy-inline br, .network-subcopy br, .co-investors-intro-copy br')
    .forEach(br => br.replaceWith(' '));
}

// Hero: same reveal as Philosophy, once the node web has finished growing.
(() => {
  const lines = Array.from(document.querySelectorAll('.hero .eyebrow, .hero .h1-bold, .hero .h1-light, .hero .hero-sub'), (el) => {
    el.innerHTML = `<span class="about-line"><span>${el.innerHTML}</span></span>`;
    return el.firstChild;
  });
  if (V3_REDUCE) { lines.forEach(l => l.classList.add('is-on')); return; }
  const play = () => lines.forEach((l, i) => setTimeout(() => l.classList.add('is-on'), i * 130));
  if (V3_DESKTOP) { window.addEventListener('hero-nodes-done', play, { once: true }); return; }
  // Mobile: waiting for the whole web felt slow; the text starts 0.8s after
  // the loader is gone, while the nodes are still growing.
  const start = () => setTimeout(play, 800);
  if (!document.body.classList.contains('is-loading')) { start(); return; }
  const mo = new MutationObserver(() => {
    if (document.body.classList.contains('is-loading')) return;
    mo.disconnect();
    start();
  });
  mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
})();

// Philosophy (v2's reveal, pinned): "Philosophy", the lead line, then the
// paragraph blur in at points of the pin's scroll. One-way: they stay on.
(() => {
  const section = document.querySelector('.about');
  const steps = section ? Array.from(section.querySelectorAll('.about-step')) : [];
  if (!steps.length) return;
  if (V3_REDUCE) { steps.forEach(s => s.classList.add('is-on')); return; }
  // Mobile: no pin (v3.css). Releasing it meant a scroll correction that
  // shows as a jump under touch momentum, and scroll-placed steps came in
  // unevenly. The steps play on a timer, evenly, once the section is in.
  if (!V3_DESKTOP) {
    const check = () => {
      if (section.getBoundingClientRect().top > window.innerHeight * 0.9) return;
      window.removeEventListener('scroll', check);
      steps.forEach((s, i) => setTimeout(() => s.classList.add('is-on'), i * 300));
    };
    window.addEventListener('scroll', check, { passive: true });
    check();
    return;
  }
  const AT = [0, 0.3, 0.6]; // pin progress per step; the last third is the hold
  let ticking = false, done = false;
  // Pinned on the first pass only: once the section has fully scrolled out
  // above, its runway is removed and the scroll moves up by the same amount
  // (native + Lenis' own positions), so nothing on screen jumps.
  const unpin = () => {
    done = true;
    steps.forEach(s => s.classList.add('is-on'));
    const run = section.offsetHeight - window.innerHeight;
    const y = window.scrollY;
    section.style.height = 'auto';
    window.scrollTo(0, y - run);
    if (typeof lenis !== 'undefined' && lenis) {
      lenis.animatedScroll -= run;
      lenis.targetScroll -= run;
      // A running glide (e.g. a menu link's scrollTo) keeps its own from/to;
      // shift them too, or it lands `run` px past its target.
      const a = lenis.animate;
      if (a && a.isRunning) ['value', 'from', 'to'].forEach(k => { if (typeof a[k] === 'number') a[k] -= run; });
    }
  };
  const update = () => {
    ticking = false;
    if (done) return;
    if (section.getBoundingClientRect().bottom <= 0) { unpin(); return; }
    const run = section.offsetHeight - window.innerHeight;
    const top = section.getBoundingClientRect().top;
    // Mobile starts the steps while the section is still rising (no blank screen after the hero).
    if (top > window.innerHeight * (V3_DESKTOP ? 0.25 : 0.6)) return; // not in place yet
    const p = run > 0 ? Math.min(Math.max(-top / run, 0), 1) : 1;
    steps.forEach((s, i) => { if (p >= AT[i]) s.classList.add('is-on'); });
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();

// Team (v2's slide-in, no pin): the two faces slide in from opposite sides
// with the scroll — from 320px out, blurred and transparent, to rest by the
// time the cards reach the middle of the screen. Scrubbed, one-way, once.
(() => {
  const cards = document.querySelector('#team .mid-lead-cards');
  if (!cards) return;
  const slots = Array.from(cards.querySelectorAll('.mid-lead-card-slot'));
  const PUSH = 320;
  if (V3_REDUCE) { slots.forEach(s => { s.style.opacity = '1'; }); return; }
  // Mobile: same slide, but on a timer, each face on its own as it comes
  // into view (they're stacked), not tied to the scroll.
  if (!V3_DESKTOP) {
    slots.forEach((s) => {
      const dir = s.classList.contains('mid-lead-card-slot-left') ? -1 : 1;
      s.style.opacity = '0';
      s.style.filter = 'blur(18px)';
      s.style.transform = `translateX(${dir * PUSH}px)`;
    });
    // Vertical position only: the start offset pushes each face sideways
    // out of the (clipped) section, so an IntersectionObserver may never see it.
    const pending = new Set(slots);
    const check = () => {
      pending.forEach((s) => {
        if (s.getBoundingClientRect().top > window.innerHeight * 0.85) return;
        pending.delete(s);
        s.style.transition = 'opacity 1.3s var(--ease), filter 1.3s var(--ease), transform 1.5s var(--ease)'; // a bit slower
        s.style.opacity = '1';
        s.style.filter = 'none';
        s.style.transform = 'none';
      });
      if (!pending.size) window.removeEventListener('scroll', check);
    };
    window.addEventListener('scroll', check, { passive: true });
    check();
    return;
  }
  const ss = (x) => x * x * (3 - 2 * x);
  let ticking = false, pMax = 0; // one-way: scrolling up never undoes it
  const update = () => {
    ticking = false;
    if (pMax >= 1) return; // played once, done
    const vh = window.innerHeight, r = cards.getBoundingClientRect();
    const end = vh / 2 - r.height / 2; // cards centered on screen
    pMax = Math.max(pMax, Math.min(Math.max((vh - r.top) / Math.max(vh - end, 1), 0), 1));
    const p = ss(pMax);
    slots.forEach((s) => {
      const dir = s.classList.contains('mid-lead-card-slot-left') ? -1 : 1;
      const blur = (1 - p) * 18;
      s.style.opacity = String(p);
      s.style.filter = blur > 0.5 ? `blur(${blur}px)` : 'none';
      s.style.transform = p < 1 ? `translateX(${dir * (1 - p) * PUSH}px)` : 'none';
    });
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();

// Mobile: "View All" sits in the middle of the network logos (it opens with
// the curtain since it lives inside the marquee).
(() => {
  const btn = document.querySelector('.network-copy .btn');
  const marquee = document.querySelector('.network-marquee');
  if (!btn || !marquee || V3_DESKTOP) return;
  btn.classList.add('network-view-all');
  marquee.append(btn);
  // No hover on touch: every 5s it widens on its own (text left, arrow
  // right, like the desktop hover) and the logos zoom in with it, then both
  // settle back.
  if (V3_REDUCE) return;
  setInterval(() => {
    // Each column scales around the screen center (vertical: the block's
    // middle), so together they inflate as one block around the button.
    const cx = window.innerWidth / 2 - marquee.getBoundingClientRect().left;
    marquee.querySelectorAll('.marquee-col').forEach((col) => {
      col.style.transformOrigin = `${cx - col.offsetLeft}px ${marquee.offsetHeight / 2 - col.offsetTop}px`;
    });
    marquee.classList.add('is-pushed');
    setTimeout(() => marquee.classList.remove('is-pushed'), 1400);
  }, 5000);
})();

// Mobile footer wordmark: a banner more than twice the screen wide that
// scrolls right to left on a loop (two copies in a track, so it's seamless).
// It's wider than the screen, so the shared "half of it visible" reveal
// can't fire; the strip itself is watched instead.
(() => {
  const logo = document.querySelector('.footer-logo');
  if (!logo || V3_DESKTOP) return;
  const track = document.createElement('div');
  track.className = 'footer-track';
  logo.src = 'svg/netwrk-footer-logo-full.svg'; // uncropped glyphs (the desktop file trims the n and the baseline)
  logo.replaceWith(track);
  const copy = logo.cloneNode();
  copy.removeAttribute('data-reveal');
  copy.alt = '';
  track.append(logo, copy);
  const imgs = [logo, copy];
  if (V3_REDUCE) { imgs.forEach(i => i.classList.add('is-revealed')); return; }
  const io = new IntersectionObserver((en) => {
    if (en[0].intersectionRatio < 0.5) return;
    io.disconnect();
    imgs.forEach(i => i.classList.add('is-revealed'));
  }, { threshold: [0.5] });
  io.observe(track.parentElement);
})();

// Mobile Portfolio and Co-Investors: the cards start stacked at the top of
// their grid like a card file (each one peeking 18px below the one behind it,
// the whole stack lifted up to 70px, clear of the title, so even the first
// card falls), and drop into place in a cascade as soon as the grid is on
// screen. Timed, not tied to the scroll.
const v3Deck = (grid, cardSel, title) => {
  if (!grid || V3_DESKTOP || V3_REDUCE) return;
  const cards = Array.from(grid.querySelectorAll(cardSel));
  const n = cards.length, STEP = 18;
  const room = title ? grid.getBoundingClientRect().top - title.getBoundingClientRect().bottom - 8 : 70;
  const LIFT = Math.max(0, Math.min(70, room));
  const tops = cards.map(c => c.offsetTop);
  cards.forEach((c, i) => {
    c.classList.add('is-visible');
    c.style.transition = 'none';
    c.style.transform = `translateY(${tops[0] - LIFT + i * STEP - tops[i]}px) scale(${1 - (n - 1 - i) * 0.012})`;
  });
  // Front card first (the last one sits on top of the stack), then the ones
  // behind it. The farther a card travels, the longer it takes, and each one
  // eases in and out (accelerates, then settles) like a drop.
  const deploy = () => {
    cards.forEach((c, i) => {
      const dur = 1400 + i * 110, delay = (n - 1 - i) * 160;
      c.style.transition = `transform ${dur}ms cubic-bezier(.65,0,.25,1) ${delay}ms`;
      c.style.transform = '';
      setTimeout(() => { c.style.transition = ''; }, dur + delay);
    });
  };
  const check = () => {
    if (grid.getBoundingClientRect().top > window.innerHeight * 0.85) return;
    window.removeEventListener('scroll', check);
    deploy();
  };
  window.addEventListener('scroll', check, { passive: true });
  check();
};
v3Deck(document.querySelector('.portfolio .grid-track'), '.card', document.querySelector('.portfolio .section-title'));
v3Deck(document.querySelector('.co-investors-grid'), '.co-investor-card', document.querySelector('.co-investors-intro:not(.co-investors-outro)'));

// Portfolio: the 12 cards (mobile: script-v3.js's own reveal).
(() => {
  const carousel = document.querySelector('.portfolio .carousel');
  if (!carousel || !V3_DESKTOP) return;
  revealOnEnter(carousel, Array.from(carousel.querySelectorAll('.card'), c => [c, 'is-visible']), 45, '0px 0px 15% 0px'); // starts just before it's on screen
})();

// Co-Investors: eyebrow, the 8 cards, then the outro.
(() => {
  const section = document.querySelector('.co-investors');
  const pin = section && section.querySelector('.co-investors-pin');
  if (!pin || !V3_DESKTOP) return;
  const intro = pin.querySelector(':scope > .co-investors-intro:not(.co-investors-outro)');
  const outro = pin.querySelector(':scope > .co-investors-outro');
  revealOnEnter(pin, [
    ...(intro ? [[intro, 'is-visible']] : []),
    ...Array.from(pin.querySelectorAll('.co-investor-card'), c => [c, 'is-in']),
    ...(outro ? [[outro, 'is-visible']] : []),
  ], 60, '0px 0px 15% 0px');
})();

// The nodes web (section between Our Network and Portfolio, behind Portfolio /
// Co-Investors): a 3D network that grows out of a single node at the center.
// Nodes live in real 3D space and
// are perspective-projected: the web slowly turns (plus a scroll-driven turn
// and a camera push-in), nearer nodes are bigger/brighter, farther ones fade
// into fog. As you scroll, links grow out of every lit node to its
// neighbours (arrival = shortest path distance from the seed), each node
// being cast outward from the center as it lands. Scrolling up un-builds it.
// Dissolves before Co-Investors.
(() => {
  const section = document.querySelector('.v2-weave');
  const canvas = section && section.querySelector('.v2-weave-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const reduce = typeof reduceMotion !== 'undefined' && reduceMotion;
  const ss = (x) => x * x * (3 - 2 * x);
  const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
  const ENTER_START = 0.08;                // seed node starts rising in from below
  // Virtual timeline q (see progress()): 0 -> 0.24 while the section scrolls
  // in (seed rises from 0.08), 0.24 -> 0.56 over the next screen, behind
  // Portfolio (the web builds), 0.56 -> 0.76 while Co-Investors comes in (web dims).
  const GROW_START = 0.24, GROW_END = 0.56; // section progress over which it spreads
  const FOCAL = 900;                        // perspective focal length (px)
  let w = 0, h = 0, R = 0, linkDist = 1, nodes = [], edges = [];
  let mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  let p = 0, pSmooth = 0, visible = false;
  const off = { x: 0, y: 0 }; // eased recentering offset (see draw)
  let growMax = 0;

  const build = () => {
    const r = canvas.getBoundingClientRect();
    w = r.width; h = r.height;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R = Math.min(w * 0.48, h * 0.62, 760); // radius of the node cloud
    const count = Math.round(Math.min(70, Math.max(30, (w * h) / 22000)));
    nodes = Array.from({ length: count }, (_, i) => {
      // Node radius matches the hero's (script.js makeNodes): 1.6–3.4px, or
      // 2.4–5.0px at >=1920. The seed takes the top of that range.
      const isUW = window.innerWidth >= 1920;
      const heroSize = (top) => (isUW ? 2.4 : 1.6) + (top ? 1 : Math.random()) * (isUW ? 2.6 : 1.8);
      if (i === 0) return { x: 0, y: 0, z: 0, ph: 0, sp: 0.3, size: heroSize(true), time: Infinity };
      // Uniform-ish in a flattened ellipsoid (wider than tall, some depth).
      let x, y, z;
      do { x = Math.random() * 2 - 1; y = Math.random() * 2 - 1; z = Math.random() * 2 - 1; }
      while (x * x + y * y + z * z > 1 || x * x + y * y + z * z < 0.02);
      return { x: x * R * 1.35, y: y * R * 0.75, z: z * R * 0.9,
        ph: Math.random() * Math.PI * 2, sp: 0.2 + Math.random() * 0.3,
        size: heroSize(false), time: Infinity };
    });

    // Graph, hero-style: every pair closer than LINK_DIST is linked (line
    // alpha fades with distance, like the hero), plus each node's nearest
    // neighbour so nothing is left stranded.
    linkDist = R * 0.48;
    const adj = nodes.map(() => []);
    const seen = new Set();
    edges = [];
    const link = (i, jj, d) => {
      const key = Math.min(i, jj) + '-' + Math.max(i, jj);
      if (seen.has(key)) return;
      seen.add(key);
      edges.push({ a: i, b: jj, d });
      adj[i].push({ j: jj, d });
      adj[jj].push({ j: i, d });
    };
    nodes.forEach((n, i) => {
      let best = -1, bestD = Infinity;
      nodes.forEach((m, jj) => {
        if (jj === i) return;
        const d = Math.hypot(m.x - n.x, m.y - n.y, m.z - n.z);
        if (d < linkDist) link(i, jj, d);
        if (d < bestD) { bestD = d; best = jj; }
      });
      if (best >= 0) link(i, best, bestD);
    });

    // Arrival time = shortest path distance from the seed (Dijkstra, small n).
    nodes[0].time = 0;
    const done = new Set();
    while (done.size < nodes.length) {
      let u = -1;
      nodes.forEach((n, i) => { if (!done.has(i) && (u < 0 || n.time < nodes[u].time)) u = i; });
      if (!isFinite(nodes[u].time)) break;
      done.add(u);
      adj[u].forEach(({ j, d }) => { if (nodes[u].time + d < nodes[j].time) nodes[j].time = nodes[u].time + d; });
    }
    const maxT = Math.max(...nodes.filter(n => isFinite(n.time)).map(n => n.time)) || 1;
    nodes.forEach(n => { n.time = isFinite(n.time) ? n.time / maxT : 2; });
    edges.forEach(e => {
      if (nodes[e.b].time < nodes[e.a].time) { const t = e.a; e.a = e.b; e.b = t; }
      e.t0 = nodes[e.a].time;
      e.t1 = Math.max(nodes[e.b].time, e.t0 + 0.02);
    });
  };

  const coEl = document.querySelector('.co-investors'); // the web dims as it comes in
  const progress = () => {
    const vh = window.innerHeight;
    const top = section.getBoundingClientRect().top;
    if (top > 0) return 0.24 * clamp01(1 - top / vh);
    const b = clamp01(-top / vh); // grows over one screen
    const c = coEl ? clamp01(1 - coEl.getBoundingClientRect().top / vh) : 0;
    return 0.24 + 0.32 * b + 0.2 * c;
  };

  const draw = (now) => {
    const t = now / 1000;
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    pSmooth += (p - pSmooth) * (reduce ? 1 : 0.12);
    const q = reduce ? 0.78 : pSmooth;

    const grow = clamp01((q - GROW_START) / (GROW_END - GROW_START)) * 1.02; // two-way again: un-builds on scroll up
    // Before anything grows, the lone seed node scrolls up into the center.
    const enter = reduce ? 1 : ss(clamp01((q - ENTER_START) / (GROW_START - ENTER_START)));
    // Blurs and fades out as Co-Investors rises over it.
    const out = reduce ? 0 : ss(clamp01((q - 0.56) / 0.18));
    canvas.style.opacity = String(1 - out * 0.8); // settles at 20%, behind Portfolio / Co-Investors
    canvas.style.filter = 'none'; // no blur on the way out (client): fade only

    // Camera: slow idle spin + scroll-driven turn, tilt follows the mouse,
    // and a push-in through the section.
    const rotY = reduce ? 0.5 : t * 0.06 + q * 1.6 + mouse.x * 0.5;
    const rotX = reduce ? 0.25 : 0.22 + mouse.y * 0.35;
    const camZ = reduce ? R * 1.6 : R * (2.1 - q * 0.9);
    const s0 = FOCAL / (FOCAL + camZ - R); // depth scale at the cloud's middle plane
    const cyR = Math.cos(rotY), syR = Math.sin(rotY), cxR = Math.cos(rotX), sxR = Math.sin(rotX);

    const pts = nodes.map(n => {
      const open = reduce ? 1 : ss(clamp01((grow - n.time) / 0.22)); // cast out from the center
      const k = 0.35 + 0.65 * open;
      const x = n.x * k + (reduce ? 0 : Math.sin(t * n.sp + n.ph) * 8);
      const y = n.y * k + (reduce ? 0 : Math.cos(t * n.sp * 0.8 + n.ph) * 8);
      const z = n.z * k;
      // rotate around Y, then X
      const x1 = x * cyR + z * syR, z1 = -x * syR + z * cyR;
      const y1 = y * cxR - z1 * sxR, z2 = y * sxR + z1 * cxR;
      const s = FOCAL / Math.max(FOCAL + z2 + camZ - R, 60);
      const rise = n === nodes[0] ? (1 - enter) * (h / 2 + 30) : 0;
      return { x: w / 2 + x1 * s, y: h / 2 + y1 * s + rise, s,
        fog: clamp01(0.25 + (s - 0.45) * 1.1) }; // nearer = brighter
    });

    // Keep what's been revealed so far centered on screen: the random 3D
    // cloud grows lopsided and turns, so its mass drifts off to one side.
    // Eased toward the centroid of the visible nodes (none -> no offset).
    if (!reduce) {
      let sx = 0, sy = 0, cnt = 0;
      nodes.forEach((n, i) => {
        if (i !== 0 && n.time <= grow) { sx += pts[i].x; sy += pts[i].y; cnt++; } // seed excluded so its rise-in isn't cancelled
      });
      const tx = cnt ? sx / cnt - w / 2 : 0, ty = cnt ? sy / cnt - h / 2 : 0;
      off.x += (tx - off.x) * 0.06;
      off.y += (ty - off.y) * 0.06;
      pts.forEach(P => { P.x -= off.x; P.y -= off.y; });
    }

    ctx.clearRect(0, 0, w, h);
    edges.forEach(e => {
      if (grow <= e.t0) return;
      const k = clamp01((grow - e.t0) / (e.t1 - e.t0));
      const A = pts[e.a], B = pts[e.b];
      const x = A.x + (B.x - A.x) * k, y = A.y + (B.y - A.y) * k;
      const fog = (A.fog + B.fog) / 2;
      ctx.lineWidth = Math.max(0.6, Math.min(1.6, (A.s + B.s) / 2));
      ctx.strokeStyle = `rgba(255,255,255,${0.34 * Math.max(0.15, 1 - e.d / linkDist) * (0.4 + 0.6 * k) * fog})`;
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(x, y); ctx.stroke();
      if (k < 1) { // growing tip
        const rr = 7 * A.s;
        const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
        g.addColorStop(0, `rgba(255,255,255,${0.9 * fog})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill();
      }
    });

    // Far nodes first so near ones sit on top.
    const order = nodes.map((_, i) => i).sort((a, b) => pts[a].s - pts[b].s);
    order.forEach(i => {
      const n = nodes[i], P = pts[i];
      const age = i === 0 ? (enter > 0 ? 1 : 0) : (grow - n.time) / 0.05;
      if (age <= 0) return;
      const a = clamp01(age);
      const flash = clamp01(1 - (grow - n.time) / 0.12);
      const r = (n.size * (0.6 + 0.4 * a) + flash * 1.4) * Math.min(Math.max(P.s / s0, 0.6), 1.25); // hero size on the middle plane, depth kept subtle
      ctx.shadowBlur = flash > 0.05 ? (6 + flash * 14) * P.fog : 0;
      ctx.shadowColor = 'rgba(255,255,255,.85)';
      ctx.fillStyle = `rgba(255,255,255,${0.9 * a * P.fog})`;
      ctx.beginPath(); ctx.arc(P.x, P.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    });
  };

  build();
  window.addEventListener('resize', build);
  if (reduce) { draw(0); window.addEventListener('resize', () => draw(0)); return; }

  new IntersectionObserver(en => { visible = en[0].isIntersecting; }).observe(section);
  window.addEventListener('scroll', () => { p = progress(); }, { passive: true });
  window.addEventListener('mousemove', e => { // window: the section itself ignores pointer events (v2.css)
    mouse.tx = e.clientX / window.innerWidth - 0.5;
    mouse.ty = e.clientY / window.innerHeight - 0.5;
  });
  p = progress();
  let frame = 0;
  const loop = (now) => {
    const dimmed = parseFloat(canvas.style.opacity || '1') < 0.25;
    if (visible && (!dimmed || frame++ % 2 === 0)) draw(now);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
})();

// Preload: once the page has loaded, decode every image up front so the
// first pass down doesn't pay for it when a section reveals.
window.addEventListener('load', () => {
  document.querySelectorAll('img').forEach((img) => {
    img.loading = 'eager';
    if (img.decode) img.decode().catch(() => {});
  });
});

// Mobile: section eyebrows (Philosophy, The Team, Our Network, Portfolio,
// Co-Investors, General Inquiries) get an underline that draws in with the
// scroll, full once the eyebrow reaches the middle of the screen. Runs after
// the reveals above, which wrap their text in masks first.
(() => {
  if (V3_DESKTOP) return;
  const els = document.querySelectorAll('main .eyebrow:not(.hero .eyebrow), .portfolio .section-title h2, .co-investors-intro-eyebrow, .footer-contact .eyebrow');
  const lines = Array.from(els, (el, i) => {
    const host = el.querySelector('.about-line > span') || el;
    // Numbered "01." … in page order, underlined with the title.
    host.innerHTML = `<span class="eyebrow-u"><span class="eyebrow-n">${String(i + 1).padStart(2, "0")}.</span>${host.innerHTML}</span>`;
    return host.lastChild;
  });
  if (V3_REDUCE) { lines.forEach(l => l.style.setProperty('--u', '1')); return; }
  let ticking = false;
  const update = () => {
    ticking = false;
    const vh = window.innerHeight;
    lines.forEach((l) => {
      const top = l.getBoundingClientRect().top;
      const u = Math.min(Math.max((vh * 0.95 - top) / (vh * 0.45), 0), 1);
      l.style.setProperty('--u', u.toFixed(3));
    });
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
})();
