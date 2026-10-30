// index-v3.html — section behaviour on top of script-v3.js.
//
// Model: only two pins. The nodes web (two-way: grows down, un-builds up) and
// Our Network (first pass only, to open the logo curtain, then released).
// Every other section flows normally and reveals once when it scrolls into
// view, on timers.

const V3_REDUCE = typeof reduceMotion !== 'undefined' && reduceMotion;
const V3_DESKTOP = window.matchMedia('(min-width:901px)').matches;

// Plays `items` ([element, class] pairs) `stagger` ms apart, once, when `el`
// has scrolled a bit into view.
const revealOnEnter = (el, items, stagger) => {
  if (V3_REDUCE) { items.forEach(([item, cls]) => item.classList.add(cls)); return; }
  const io = new IntersectionObserver((en) => {
    if (!en[0].isIntersecting) return;
    io.disconnect();
    items.forEach(([item, cls], i) => setTimeout(() => item.classList.add(cls), i * stagger));
  }, { rootMargin: '0px 0px -20% 0px' });
  io.observe(el);
};

// Hero: same reveal as Philosophy, once the node web has finished growing.
(() => {
  const lines = Array.from(document.querySelectorAll('.hero .eyebrow, .hero .h1-bold, .hero .h1-light, .hero .hero-sub'), (el) => {
    el.innerHTML = `<span class="about-line"><span>${el.innerHTML}</span></span>`;
    return el.firstChild;
  });
  if (V3_REDUCE) { lines.forEach(l => l.classList.add('is-on')); return; }
  window.addEventListener('hero-nodes-done', () => {
    lines.forEach((l, i) => setTimeout(() => l.classList.add('is-on'), i * 130));
  }, { once: true });
})();

// Philosophy: every line rises out of its own mask, one after another.
(() => {
  const copy = document.querySelector('[data-about-steps]');
  if (!copy) return;
  const lines = [];
  copy.querySelectorAll('.about-step').forEach((step) => {
    step.innerHTML = step.innerHTML.split(/<br\s*\/?>/i)
      .map(html => `<span class="about-line"><span>${html.trim()}</span></span>`).join('');
    lines.push(...step.querySelectorAll('.about-line'));
  });
  revealOnEnter(copy, lines.map(l => [l, 'is-on']), 130);
})();

// Team: same reveal as Philosophy. The title, then each face and its texts
// rise out of their own masks, one after another.
(() => {
  const section = document.querySelector('#team');
  const title = section && section.querySelector('.mid-lead-title');
  if (!title) return;
  const mask = (inner) => {
    const line = document.createElement('span');
    const span = document.createElement('span');
    line.className = 'about-line';
    inner.replaceWith(line);
    span.append(inner);
    line.append(span);
    return line;
  };
  title.innerHTML = `<span class="about-line"><span>${title.innerHTML}</span></span>`;
  const items = [title.firstChild];
  section.querySelectorAll('.mid-lead-card-slot').forEach((slot) => {
    const card = slot.querySelector('.team-card');
    card.classList.add('about-line');
    items.push(card);
    slot.querySelectorAll('.team-name, .team-role, .team-profile-link').forEach(el => items.push(mask(el)));
  });
  revealOnEnter(section, items.map(l => [l, 'is-on']), 130);
})();

// Portfolio: the 12 cards (mobile: script-v3.js's own reveal).
(() => {
  const carousel = document.querySelector('.portfolio .carousel');
  if (!carousel || !V3_DESKTOP) return;
  revealOnEnter(carousel, Array.from(carousel.querySelectorAll('.card'), c => [c, 'is-visible']), 90);
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
  ], 110);
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
  // in (seed rises from 0.08), 0.24 -> 0.56 across the pinned runway (the web
  // builds), 0.56 -> 0.76 while Co-Investors rises over it (web dims).
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

  const runway = section.querySelector('.v2-weave-runway');
  const coEl = section.querySelector(':scope > section'); // the section that rises over the canvas (Portfolio)
  // Retina: the weave overlaps Network by more than its text clears on short
  // screens, so the web waits until that text is near the top of the screen.
  const copyEl = document.querySelector('.network-copy-after');
  const retina = window.matchMedia('(min-width:901px) and (max-width:1919.98px)');
  const progress = () => {
    const vh = window.innerHeight;
    const top = section.getBoundingClientRect().top;
    const wait = retina.matches && copyEl ? Math.max(copyEl.getBoundingClientRect().bottom - vh * 0.2 - top, 0) : 0;
    if (top + wait > 0) return 0.24 * clamp01(1 - (top + wait) / vh);
    const b = clamp01(-(top + wait) / (((runway && runway.offsetHeight) || vh) - wait)); // after the runway is dropped: grow over one screen
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

// Our Network's pin is one-way: as soon as the curtain is fully open (or the
// section was scrolled past) it collapses to a plain block, and the scroll is
// corrected in the same frame so its content stays where it is on screen.
(() => {
  const section = document.querySelector('.network');
  const marquee = document.querySelector('.network-marquee');
  if (!section || !marquee) return;
  const onScroll = () => requestAnimationFrame(() => {
    if (section.classList.contains('is-released')) return;
    const r = section.getBoundingClientRect();
    if (!(r.bottom <= 0 || (r.top <= 0 && marquee.style.opacity === '1'))) return;
    const y0 = window.scrollY; // read before the collapse (scroll anchoring may move it)
    section.classList.add('is-released');
    window.removeEventListener('scroll', onScroll);
    // The 100vh block starts where the sticky screen was.
    const vh = window.innerHeight;
    const y = y0 + r.top - (r.bottom < vh ? r.bottom - vh : 0);
    const shift = y - y0;
    window.scrollTo(0, y);
    // Re-base Lenis (current, target, running glide) so it doesn't pull back.
    if (typeof lenis === 'undefined' || !lenis) return;
    lenis.animatedScroll += shift;
    lenis.targetScroll += shift;
    const a = lenis.animate;
    if (a) ['value', 'from', 'to'].forEach(k => { if (typeof a[k] === 'number') a[k] += shift; });
  });
  window.addEventListener('scroll', onScroll, { passive: true });
})();
