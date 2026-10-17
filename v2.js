// v2 only (index-v2.html): About reveals in 3 steps — "Philosophy", the
// lead line, then the paragraph — as the pinned section is scrolled, instead
// of script.js's word-by-word scrub (that one no-ops here: no .word spans).
(() => {
  const section = document.querySelector('.about');
  const steps = document.querySelectorAll('[data-about-steps] .about-step');
  if (!section || !steps.length) return;

  const reduce = typeof reduceMotion !== 'undefined' && reduceMotion;
  if (reduce) { steps.forEach(el => el.classList.add('is-on')); return; }

  const THRESHOLDS = [0.05, 0.3, 0.55]; // pin progress at which each step comes in
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

// v2 only: weave between Portfolio and Co-Investors — a 3D network that
// grows out of a single node at the center. Nodes live in real 3D space and
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
      if (i === 0) return { x: 0, y: 0, z: 0, ph: 0, sp: 0.3, big: true, time: Infinity };
      // Uniform-ish in a flattened ellipsoid (wider than tall, some depth).
      let x, y, z;
      do { x = Math.random() * 2 - 1; y = Math.random() * 2 - 1; z = Math.random() * 2 - 1; }
      while (x * x + y * y + z * z > 1 || x * x + y * y + z * z < 0.02);
      return { x: x * R * 1.35, y: y * R * 0.75, z: z * R * 0.9,
        ph: Math.random() * Math.PI * 2, sp: 0.2 + Math.random() * 0.3,
        big: Math.random() < 0.12, time: Infinity };
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
  const coEl = section.querySelector('.co-investors');
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
    canvas.style.opacity = String(1 - out);
    canvas.style.filter = out > 0.01 ? `blur(${out * 14}px)` : 'none';

    // Camera: slow idle spin + scroll-driven turn, tilt follows the mouse,
    // and a push-in through the section.
    const rotY = reduce ? 0.5 : t * 0.06 + q * 1.6 + mouse.x * 0.5;
    const rotX = reduce ? 0.25 : 0.22 + mouse.y * 0.35;
    const camZ = reduce ? R * 1.6 : R * (2.1 - q * 0.9);
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
      const r = ((n.big ? 2.6 : 1.6) * (0.6 + 0.4 * a) + flash * 1.4) * P.s;
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
