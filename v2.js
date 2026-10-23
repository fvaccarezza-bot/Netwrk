// v2 only (index-v2.html): About reveals in 3 steps — "Philosophy", the
// lead line, then the paragraph — as the pinned section is scrolled, instead
// of script.js's word-by-word scrub (that one no-ops here: no .word spans).
(() => {
  const section = document.querySelector('.about');
  const steps = document.querySelectorAll('[data-about-steps] .about-step');
  if (!section || !steps.length) return;

  const reduce = typeof reduceMotion !== 'undefined' && reduceMotion;
  if (reduce) { steps.forEach(el => el.classList.add('is-on')); return; }

  // Pin progress at which each step comes in. Section is 260vh (v2.css), so
  // these land at ~11vh / 66vh / 121vh of scroll, same as before, leaving a
  // short hold after the last one instead of a long dead stretch.
  const THRESHOLDS = [0.07, 0.41, 0.76];
  let ticking = false;

  const update = () => {
    const scrollable = section.offsetHeight - window.innerHeight;
    const progress = scrollable > 0
      ? Math.min(Math.max(-section.getBoundingClientRect().top / scrollable, 0), 1)
      : 0;
    steps.forEach((el, i) => el.classList.toggle('is-on', progress >= THRESHOLDS[i]));
    ticking = false;
  };

  const onScroll = () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();

// v2 only: "The Team" rides with the rings — blurs/grows in at the start of
// the team pin, holds in the rings' center, then blurs out and grows past
// the camera as the rings zoom away, just before the cards slide in.
(() => {
  const section = document.querySelector('#team');
  const title = section && section.querySelector('.mid-lead-title');
  if (!title) return;
  if (typeof reduceMotion !== 'undefined' && reduceMotion) return;
  const IN_END = 0.14, OUT_START = 0.36, OUT_END = 0.5; // pin progress
  const ss = (x) => x * x * (3 - 2 * x);
  let ticking = false;
  const update = () => {
    const scrollable = section.offsetHeight - window.innerHeight;
    const p = scrollable > 0
      ? Math.min(Math.max(-section.getBoundingClientRect().top / scrollable, 0), 1)
      : 0;
    const inP = ss(Math.min(p / IN_END, 1));
    const outP = ss(Math.min(Math.max((p - OUT_START) / (OUT_END - OUT_START), 0), 1));
    const blur = Math.max((1 - inP) * 18, outP * 18);
    title.style.opacity = String(inP * (1 - outP));
    title.style.filter = blur > 0.5 ? `blur(${blur}px)` : 'none';
    title.style.transform = `translate(-50%,-50%) scale(${0.8 + 0.2 * inP + 0.35 * outP})`;
    ticking = false;
  };
  const onScroll = () => { if (!ticking) { requestAnimationFrame(update); ticking = true; } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();

// Which effect fills the section between Portfolio and Co-Investors:
// 'web' = the 3D network growing from one node, 'logo' = the isotype in nodes.
const WEAVE_MODE = 'web';

// v2 only: weave between Portfolio and Co-Investors — a 3D network that
// grows out of a single node at the center. Nodes live in real 3D space and
// are perspective-projected: the web slowly turns (plus a scroll-driven turn
// and a camera push-in), nearer nodes are bigger/brighter, farther ones fade
// into fog. As you scroll, links grow out of every lit node to its
// neighbours (arrival = shortest path distance from the seed), each node
// being cast outward from the center as it lands. Scrolling up un-builds it.
// Dissolves before Co-Investors.
(() => {
  if (WEAVE_MODE !== 'web') return;
  const section = document.querySelector('.v2-weave');
  const canvas = section && section.querySelector('.v2-weave-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
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
  const progress = () => {
    const vh = window.innerHeight;
    const top = section.getBoundingClientRect().top;
    if (top > 0) return 0.24 * clamp01(1 - top / vh);
    const b = clamp01(-top / Math.max(runway ? runway.offsetHeight : vh, 1));
    const c = coEl ? clamp01(1 - coEl.getBoundingClientRect().top / vh) : 0;
    return 0.24 + 0.32 * b + 0.2 * c;
  };

  const draw = (now) => {
    const t = now / 1000;
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    pSmooth += (p - pSmooth) * (reduce ? 1 : 0.12);
    const q = reduce ? 0.78 : pSmooth;

    const grow = clamp01((q - GROW_START) / (GROW_END - GROW_START)) * 1.02;
    // Before anything grows, the lone seed node scrolls up into the center.
    const enter = reduce ? 1 : ss(clamp01((q - ENTER_START) / (GROW_START - ENTER_START)));
    // Blurs and fades out as Co-Investors rises over it.
    const out = reduce ? 0 : ss(clamp01((q - 0.56) / 0.18));
    canvas.style.opacity = String(1 - out * 0.8); // settles at 20%, blurred, behind Portfolio
    canvas.style.filter = out > 0.01 ? `blur(${out * 14}px)` : 'none';

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
      ctx.shadowBlur = (6 + flash * 14) * P.fog;
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
  section.addEventListener('mousemove', e => {
    mouse.tx = e.clientX / window.innerWidth - 0.5;
    mouse.ty = e.clientY / window.innerHeight - 0.5;
  });
  p = progress();
  const loop = (now) => { if (visible) draw(now); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
})();

// v2 only: ALTERNATIVE to the weave above (WEAVE_MODE = 'logo') — the Netwrk
// isotype drawn with nodes. Points are sampled from the SVG (denser along its
// edges so the shape reads), start scattered through a 3D cloud, and converge
// into the logo as you scroll, linked hero-style (every pair within reach,
// fading with distance). It turns to face the camera as it forms, follows the
// mouse a little, and blurs/fades out as Co-Investors rises over it.
(() => {
  if (WEAVE_MODE !== 'logo') return;
  const section = document.querySelector('.v2-weave');
  const canvas = section && section.querySelector('.v2-weave-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const reduce = typeof reduceMotion !== 'undefined' && reduceMotion;
  const ss = (x) => x * x * (3 - 2 * x);
  const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
  const FOCAL = 900;
  const runway = section.querySelector('.v2-weave-runway');
  const coEl = section.querySelector(':scope > section'); // the section that rises over the canvas (Portfolio)
  let w = 0, h = 0, size = 0, nodes = [], linkDist = 60;
  let mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  let p = 0, pSmooth = 0, visible = false, ready = false;

  // Same virtual timeline as the weave: 0 -> 0.24 section scrolls in,
  // 0.24 -> 0.56 pinned runway (logo forms), 0.56 -> 0.76 Co-Investors rises.
  const progress = () => {
    const vh = window.innerHeight;
    const top = section.getBoundingClientRect().top;
    if (top > 0) return 0.24 * clamp01(1 - top / vh);
    const b = clamp01(-top / Math.max(runway ? runway.offsetHeight : vh, 1));
    const c = coEl ? clamp01(1 - coEl.getBoundingClientRect().top / vh) : 0;
    return 0.24 + 0.32 * b + 0.2 * c;
  };

  // Sample target points from the isotype: rasterize it, then pick edge and
  // interior pixels with a minimum spacing so the nodes spread evenly.
  const img = new Image();
  img.src = 'svg/iso-logo.svg';
  const sample = () => {
    const S = 240;
    const off = document.createElement('canvas');
    off.width = off.height = S;
    const o = off.getContext('2d');
    o.drawImage(img, 0, 0, S, S);
    const data = o.getImageData(0, 0, S, S).data;
    const inside = (x, y) => x >= 0 && y >= 0 && x < S && y < S && data[(y * S + x) * 4 + 3] > 128;
    const edge = [], fill = [];
    for (let y = 0; y < S; y += 2) for (let x = 0; x < S; x += 2) {
      if (!inside(x, y)) continue;
      const isEdge = !inside(x - 3, y) || !inside(x + 3, y) || !inside(x, y - 3) || !inside(x, y + 3);
      (isEdge ? edge : fill).push([x / S - 0.5, y / S - 0.5]);
    }
    const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const picked = [];
    const pick = (pool, minD, max) => {
      for (const pt of shuffle(pool)) {
        if (picked.length >= max) break;
        if (picked.every(q => Math.hypot(q[0] - pt[0], q[1] - pt[1]) > minD)) picked.push(pt);
      }
    };
    pick(edge, 0.045, 120);   // outline first, so the silhouette is crisp
    pick(fill, 0.075, 175);   // then a lighter interior mesh
    return picked;
  };

  const build = () => {
    const r = canvas.getBoundingClientRect();
    w = r.width; h = r.height;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    size = Math.min(w, h) * 0.56;     // logo diameter on screen
    linkDist = size * 0.11;
    if (!ready) return;
    const R = Math.max(w, h) * 0.55;  // scatter cloud radius
    nodes = sample().map(([x, y]) => {
      let sx, sy, sz;
      do { sx = Math.random() * 2 - 1; sy = Math.random() * 2 - 1; sz = Math.random() * 2 - 1; }
      while (sx * sx + sy * sy + sz * sz > 1);
      return {
        tx: x * size, ty: y * size, tz: (Math.random() - 0.5) * 30, // logo target (slight depth)
        sx: sx * R, sy: sy * R * 0.7, sz: sz * R,                   // scattered start
        delay: Math.random() * 0.35,                                // staggered arrival
        ph: Math.random() * Math.PI * 2, sp: 0.2 + Math.random() * 0.3,
        big: Math.random() < 0.1
      };
    });
  };

  const draw = (now) => {
    if (!nodes.length) return;
    const t = now / 1000;
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    pSmooth += (p - pSmooth) * (reduce ? 1 : 0.12);
    const q = reduce ? 0.6 : pSmooth;

    const appear = reduce ? 1 : ss(clamp01((q - 0.06) / 0.18));   // scattered nodes fade in
    const form = reduce ? 1 : clamp01((q - 0.22) / 0.32);         // 0 -> 1 converging into the logo
    const out = reduce ? 0 : ss(clamp01((q - 0.56) / 0.18));      // Co-Investors rising
    canvas.style.opacity = String(appear * (1 - out * 0.8)); // settles at 20%, blurred
    canvas.style.filter = out > 0.01 ? `blur(${out * 14}px)` : 'none';

    // Turns to face the camera as it forms; the mouse keeps a little tilt.
    const formEase = ss(form);
    const rotY = (1 - formEase) * 1.3 + (reduce ? 0 : mouse.x * 0.35 + Math.sin(t * 0.3) * 0.04);
    const rotX = (1 - formEase) * 0.4 + (reduce ? 0 : mouse.y * 0.25);
    const cyR = Math.cos(rotY), syR = Math.sin(rotY), cxR = Math.cos(rotX), sxR = Math.sin(rotX);
    const camZ = size * (1.2 - 0.25 * formEase);

    const pts = nodes.map(n => {
      const k = ss(clamp01((form - n.delay) / (1 - n.delay * 0.9)));
      const wob = reduce ? 0 : (1 - k * 0.7) * 10;
      const x = n.sx + (n.tx - n.sx) * k + Math.sin(t * n.sp + n.ph) * wob;
      const y = n.sy + (n.ty - n.sy) * k + Math.cos(t * n.sp * 0.8 + n.ph) * wob;
      const z = n.sz + (n.tz - n.sz) * k;
      const x1 = x * cyR + z * syR, z1 = -x * syR + z * cyR;
      const y1 = y * cxR - z1 * sxR, z2 = y * sxR + z1 * cxR;
      const s = FOCAL / Math.max(FOCAL + z2 + camZ - size, 60);
      return { x: w / 2 + x1 * s, y: h / 2 + y1 * s, s, k, fog: clamp01(0.3 + (s - 0.5) * 1.1) };
    });

    ctx.clearRect(0, 0, w, h);
    // Links: hero-style, every pair within reach (reach grows a bit while
    // scattered so the cloud still reads as a network).
    const reach = linkDist * (1 + (1 - formEase) * 1.4);
    ctx.lineWidth = 1;
    for (let i = 0; i < pts.length; i++) {
      const A = pts[i];
      for (let j = i + 1; j < pts.length; j++) {
        const B = pts[j];
        const dx = A.x - B.x, dy = A.y - B.y;
        if (Math.abs(dx) > reach || Math.abs(dy) > reach) continue;
        const d = Math.hypot(dx, dy);
        if (d >= reach) continue;
        ctx.strokeStyle = `rgba(255,255,255,${0.3 * (1 - d / reach) * (A.fog + B.fog) / 2})`;
        ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
      }
    }
    pts.forEach((P, i) => {
      const r = ((nodes[i].big ? 2.2 : 1.4) + P.k * 0.4) * P.s;
      ctx.fillStyle = `rgba(255,255,255,${(0.55 + 0.4 * P.k) * P.fog})`;
      ctx.beginPath(); ctx.arc(P.x, P.y, r, 0, Math.PI * 2); ctx.fill();
    });
  };

  const start = () => {
    ready = true;
    build();
    window.addEventListener('resize', build);
    if (reduce) { draw(0); window.addEventListener('resize', () => draw(0)); return; }
    new IntersectionObserver(en => { visible = en[0].isIntersecting; }).observe(section);
    window.addEventListener('scroll', () => { p = progress(); }, { passive: true });
    section.addEventListener('mousemove', e => {
      mouse.tx = e.clientX / window.innerWidth - 0.5;
      mouse.ty = e.clientY / window.innerHeight - 0.5;
    });
    p = progress();
    const loop = (now) => { if (visible) draw(now); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  };
  if (img.complete && img.naturalWidth) start(); else img.addEventListener('load', start);
})();

// v2 only (desktop): Portfolio lock — the section is pinned (v2.css) for a
// stretch of scroll. Cards cascade in as it scrolls up into place (done by
// the moment it locks), hold, then the whole block eases out with a soft
// fade/blur/lift over the last part of the pin. Scrubbed, so it reverses.
(() => {
  const section = document.querySelector('.portfolio');
  const pin = section && section.querySelector('.portfolio-pin');
  const cards = section ? section.querySelectorAll('.card') : [];
  if (!pin || !cards.length) return;
  if ((typeof reduceMotion !== 'undefined' && reduceMotion) ||
      !window.matchMedia('(min-width:901px)').matches) return;
  const parts = pin.querySelectorAll(':scope > .section-title, :scope > .carousel');
  // Cascade spread over the whole scroll-in and into the pin (~7vh of scroll
  // per card), so something is always arriving: no idle stretch. Short hold
  // (still slowly growing), then the soft exit.
  const CARD_START = -0.9, CARD_STEP = 0.105; // pin progress (negative = still scrolling in)
  const OUT_START = 0.7;
  const GROW_FROM = 0.97, GROW_TO = 1.03; // subtle scale across entry + hold
  const ss = (x) => x * x * (3 - 2 * x);
  let ticking = false;
  const update = () => {
    const scrollable = Math.max(section.offsetHeight - window.innerHeight, 1);
    const p = -section.getBoundingClientRect().top / scrollable;
    cards.forEach((c, i) => c.classList.toggle('is-visible', p >= CARD_START + i * CARD_STEP));
    const out = ss(Math.min(Math.max((p - OUT_START) / (1 - OUT_START), 0), 1));
    // Slow push-in: grows a touch from scroll-in through the whole hold.
    const grow = Math.min(Math.max((p - CARD_START) / (OUT_START - CARD_START), 0), 1);
    const scale = (GROW_FROM + (GROW_TO - GROW_FROM) * grow) * (1 - out * 0.03);
    parts.forEach(el => {
      el.style.opacity = String(1 - out * 0.75);
      el.style.filter = out > 0.01 ? `blur(${out * 6}px)` : '';
      el.style.transform = `translateY(${-out * 40}px) scale(${scale})`;
    });
    ticking = false;
  };
  const onScroll = () => { if (!ticking) { requestAnimationFrame(update); ticking = true; } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();

// v2 only (desktop): Co-Investors lock — same as Portfolio above. Pinned
// (v2.css); eyebrow, the 8 cards and the outro cascade in one after another
// as it scrolls into place (finishing shortly after it locks), short hold
// with a slow push-in, then a soft fade/blur/lift out. Scrubbed, reverses.
(() => {
  const section = document.querySelector('.co-investors');
  const pin = section && section.querySelector('.co-investors-pin');
  if (!pin) return;
  if ((typeof reduceMotion !== 'undefined' && reduceMotion) ||
      !window.matchMedia('(min-width:901px)').matches) return;
  const intro = pin.querySelector(':scope > .co-investors-intro:not(.co-investors-outro)');
  const outro = pin.querySelector(':scope > .co-investors-outro');
  const cards = pin.querySelectorAll('.co-investor-card');
  // Cascade order: eyebrow, cards, outro (each toggles its own reveal class).
  const items = [
    ...(intro ? [[intro, 'is-visible']] : []),
    ...Array.from(cards, c => [c, 'is-in']),
    ...(outro ? [[outro, 'is-visible']] : []),
  ];
  const START = -0.9, STEP = 0.11; // pin progress (negative = still scrolling in)
  const OUT_START = 0.7;
  const GROW_FROM = 0.97, GROW_TO = 1.03;
  const ss = (x) => x * x * (3 - 2 * x);
  let ticking = false;
  const update = () => {
    const scrollable = Math.max(section.offsetHeight - window.innerHeight, 1);
    const p = -section.getBoundingClientRect().top / scrollable;
    items.forEach(([el, cls], i) => el.classList.toggle(cls, p >= START + i * STEP));
    const out = ss(Math.min(Math.max((p - OUT_START) / (1 - OUT_START), 0), 1));
    const grow = Math.min(Math.max((p - START) / (OUT_START - START), 0), 1);
    const scale = (GROW_FROM + (GROW_TO - GROW_FROM) * grow) * (1 - out * 0.03);
    // On the pin itself (not its children): intro/outro own their opacity
    // and transform for their reveal, inline styles there would override it.
    pin.style.opacity = String(1 - out * 0.75);
    pin.style.filter = out > 0.01 ? `blur(${out * 6}px)` : '';
    pin.style.transform = `translateY(${-out * 40}px) scale(${scale})`;
    ticking = false;
  };
  const onScroll = () => { if (!ticking) { requestAnimationFrame(update); ticking = true; } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();
