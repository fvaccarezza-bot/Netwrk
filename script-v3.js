// Reduced motion: respects prefers-reduced-motion for genuine accessibility
// needs, but allows an explicit local override for environments where the
// OS/browser reports `reduce` without a real user preference behind it (e.g.
// Remote Desktop sessions disable Windows animations, so Chromium reports
// `reduce` on every RDP'd machine regardless of what the user actually wants).
// Visit once with ?motion=on / ?motion=off to set the override; it persists
// in localStorage. With no override set, the OS preference wins exactly as
// before, so nothing changes for real reduced-motion users.
function resolveReducedMotion() {
  try {
    const param = new URLSearchParams(location.search).get('motion');
    if (param === 'on') localStorage.setItem('nk-motion', 'no-preference');
    else if (param === 'off') localStorage.setItem('nk-motion', 'reduce');
    const stored = localStorage.getItem('nk-motion');
    if (stored === 'no-preference') return false;
    if (stored === 'reduce') return true;
  } catch (e) {}
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
const reduceMotion = resolveReducedMotion();
document.body.classList.toggle('motion-on', !reduceMotion);

// Page loader: the hero's own node-network canvas doubles as the loading
// indicator — shown centered in the viewport (full opacity, no mask) while
// the page loads, then slides right into its normal hero position as the
// loader fades away. Skipped entirely under reduced motion (page just
// appears normally, no loader).
if (!reduceMotion) {
  const loaderEl = document.querySelector('.page-loader');
  const nodesEl = document.querySelector('.hero-nodes');
  if (loaderEl && nodesEl) {
    document.body.classList.add('is-loading');
    // Measure the canvas's natural (home) position before shifting it, so
    // the offset works at any viewport size without hardcoding numbers.
    requestAnimationFrame(() => {
      const rect = nodesEl.getBoundingClientRect();
      const naturalCenterX = rect.left + rect.width / 2;
      const viewportCenterX = window.innerWidth / 2;
      nodesEl.style.setProperty('--loader-x', `${viewportCenterX - naturalCenterX}px`);

      // Real progress readout — waits one frame first so every <img> the
      // rest of script.js builds (the logo marquee, etc.) already exists
      // in the DOM to be counted, not just what's in the static HTML.
      const imgs = Array.from(document.images);
      const total = imgs.length || 1;
      const update = () => { loaderLoaded++; loaderReal = Math.min(1, loaderLoaded / total); };
      imgs.forEach(img => {
        if (img.complete) update();
        else { img.addEventListener('load', update); img.addEventListener('error', update); }
      });
    });

    // Odometer counter: 3 digit strips rolled by transform. Each strip is a
    // long monotonic run (digit k sits at index floor(v / 10^(2-k)), cells
    // repeat 0-9), so 9 -> 0 keeps rolling up instead of rewinding down.
    // The shown value eases toward max(real image progress, a time-based
    // floor) so it always visibly counts up — cached loads would otherwise
    // jump 0 -> 100.
    let loaderLoaded = 0, loaderReal = 0, loaderShown = 0, loaderDone = false, onLoaderFull = null;
    const pctEl = loaderEl.querySelector('[data-loader-pct]');
    const barEl = loaderEl.querySelector('.page-loader-bar');
    const strips = [];
    if (pctEl) {
      for (let k = 0; k < 3; k++) {
        const digit = document.createElement('span');
        digit.className = 'pl-digit';
        const strip = document.createElement('span');
        strip.className = 'pl-strip';
        const cells = Math.floor(100 / Math.pow(10, 2 - k)) + 1;
        let html = '';
        for (let i = 0; i < cells; i++) html += `<span>${i % 10}</span>`;
        strip.innerHTML = html;
        digit.appendChild(strip);
        pctEl.appendChild(digit);
        strips.push(strip);
      }
      const pct = document.createElement('span');
      pct.className = 'pl-pct';
      pct.textContent = '%';
      pctEl.appendChild(pct);
    }
    const renderCount = (v) => {
      strips.forEach((strip, k) => strip.style.setProperty('--d', Math.floor(v / Math.pow(10, 2 - k))));
      if (barEl) barEl.style.setProperty('--p', (v / 100).toFixed(3));
    };
    renderCount(0);

    // ?loader=5000 forces a longer minimum (ms) for testing, e.g.
    // index.html?loader=5000 — normal visits are unaffected.
    const loaderParam = parseInt(new URLSearchParams(location.search).get('loader'), 10);
    const MIN_LOADER_MS = Number.isFinite(loaderParam) ? loaderParam : 1600;
    const loadStart = performance.now();

    const tickCount = () => {
      const t = Math.min(1, (performance.now() - loadStart) / MIN_LOADER_MS);
      const floor = (1 - Math.pow(1 - t, 2)) * 0.92;
      const target = loaderDone ? 100 : Math.min(99, Math.max(loaderReal, floor) * 100);
      loaderShown += (target - loaderShown) * 0.09;
      if (target - loaderShown < 0.5) loaderShown = target;
      const v = Math.floor(loaderShown);
      renderCount(v);
      if (v >= 100) { if (onLoaderFull) onLoaderFull(); return; }
      requestAnimationFrame(tickCount);
    };
    requestAnimationFrame(tickCount);

    // Exit sequence: counter lands on 100 -> loader fades out while the
    // canvas slides home -> hero reveal fires once the page is uncovered.
    const release = () => {
      const wait = Math.max(0, MIN_LOADER_MS - (performance.now() - loadStart));
      setTimeout(() => {
        onLoaderFull = () => {
          setTimeout(() => {
            document.body.classList.remove('is-loading');
            nodesEl.style.setProperty('--loader-x', '0px');
            setTimeout(() => document.body.classList.add('hero-loaded'), 400);
            setTimeout(() => { loaderEl.remove(); }, 900);
          }, 250);
        };
        loaderDone = true;
      }, wait);
    };
    if (document.readyState === 'complete') release();
    else window.addEventListener('load', release);
  }
}
// Ease-in-out for 0-1 progress ramps, so reveals/holds settle in and out
// instead of hitting their start/end point at full speed (a linear ramp
// looks like it gets cut off right at the boundary).
const smoothstep = (x) => x * x * (3 - 2 * x);

// Hero: staggered load-in reveal (CSS handles the per-element transitions —
// this just flips the trigger class one frame after the hidden state has
// actually painted, so the transition is guaranteed to be visible instead
// of possibly collapsing into the same frame as the initial paint).
// While the page loader is up, the loader's exit sequence fires this
// instead, so the reveal plays after the curtain lifts, not hidden under it.
if (!document.body.classList.contains('is-loading')) {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.body.classList.add('hero-loaded');
  }));
}

// Custom cursor: small dot + a ring that trails with a delay, grows on
// interactive elements. Skipped on touch/coarse-pointer devices.
if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  document.body.classList.add('has-cursor');

  const dot = document.createElement('div');
  dot.className = 'cursor-dot';
  const ring = document.createElement('div');
  ring.className = 'cursor-ring';
  ring.innerHTML = '<span>View all</span>';
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

  const HOVER_SELECTOR = 'a, button, .card, .network-logo, .network-marquee, .mid-lead-pin, input, textarea, [role="button"]';
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
    let dest = target;
    if (link.getAttribute('href') === '#network') {
      // Landing right at the pin's top shows the marquee still
      // collapsed/closed — jump partway into its scroll range instead so
      // the curtain is already open and the logos already grown in.
      const scrollable = target.offsetHeight - window.innerHeight;
      if (scrollable > 0) dest = target.offsetTop + scrollable * 0.6;
    } else if (link.getAttribute('href') === '#team') {
      // Same idea for the team pin (index-v2): land with the cards already in.
      const scrollable = target.offsetHeight - window.innerHeight;
      if (scrollable > 0) dest = target.offsetTop + scrollable * 0.95;
    }
    if (lenis) {
      lenis.scrollTo(dest, { duration: 1.9, easing: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)) });
    } else if (typeof dest === 'number') {
      window.scrollTo({ top: dest, behavior: 'smooth' });
    } else {
      dest.scrollIntoView({ behavior: 'smooth' });
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

// Network closing line + subcopy, and the Team section title: simple
// one-time fade+blur reveal, not tied to any pin's scroll progress. (The
// Portfolio title is handled inside updatePortfolio below, scrubbed off
// that pin's own scroll progress instead.)
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
  { src: 'images/our-network-logos/home/amex.png', alt: 'American Express' },
  { src: 'images/our-network-logos/home/arizona.png', alt: 'Arizona' },
  { src: 'images/our-network-logos/home/caa.png', alt: 'CAA' },
  { src: 'images/our-network-logos/home/caesars.png', alt: 'Caesars' },
  { src: 'images/our-network-logos/home/cox.png', alt: 'Cox Enterprises' },
  { src: 'images/our-network-logos/home/douglas.png', alt: 'Douglas Elliman' },
  { src: 'images/our-network-logos/home/fanatics.png', alt: 'Fanatics' },
  { src: 'images/our-network-logos/home/groot.png', alt: 'Groot Hospitality' },
  { src: 'images/our-network-logos/home/houlihan.png', alt: 'Houlihan Lokey' },
  { src: 'images/our-network-logos/home/hwood.png', alt: 'The h.wood Group' },
  { src: 'images/our-network-logos/home/keurig.png', alt: 'Keurig' },
  { src: 'images/our-network-logos/home/live-nation.png', alt: 'Live Nation' },
  { src: 'images/our-network-logos/home/mlb.png', alt: 'MLB' },
  { src: 'images/our-network-logos/home/nba.png', alt: 'NBA' },
  { src: 'images/our-network-logos/home/nfl.png', alt: 'NFL' },
  { src: 'images/our-network-logos/home/bausch.png', alt: 'Bausch + Lomb' },
  { src: 'images/our-network-logos/home/pnc.png', alt: 'PNC' },
  { src: 'images/our-network-logos/home/prime.png', alt: 'PRIME' },
  { src: 'images/our-network-logos/home/ripple.png', alt: 'Ripple' },
  { src: 'images/our-network-logos/home/rolling.png', alt: 'Rolling Loud' },
  { src: 'images/our-network-logos/home/skechers.png', alt: 'Skechers' },
  { src: 'images/our-network-logos/home/uta.png', alt: 'UTA' },
  { src: 'images/our-network-logos/home/tesla.png', alt: 'Tesla' },
  { src: 'images/our-network-logos/home/netflix.png', alt: 'Netflix' },
  { src: 'images/our-network-logos/home/spotify.png', alt: 'Spotify' },
  { src: 'images/our-network-logos/home/coca-cola.png', alt: 'Coca-Cola' },
  { src: 'images/our-network-logos/home/reddit.png', alt: 'Reddit' },
  { src: 'images/our-network-logos/home/salesforce.png', alt: 'Salesforce' },
  { src: 'images/our-network-logos/home/hulu.png', alt: 'Hulu' },
  { src: 'images/our-network-logos/home/ford.png', alt: 'Ford' },
  { src: 'images/our-network-logos/home/toyota.png', alt: 'Toyota' },
  { src: 'images/our-network-logos/home/delta.png', alt: 'Delta Air Lines' },
  { src: 'images/our-network-logos/home/walmart.png', alt: 'Walmart' },
  { src: 'images/our-network-logos/home/adobe.png', alt: 'Adobe' },
  { src: 'images/our-network-logos/home/verkada.png', alt: 'Verkada' },
  { src: 'images/our-network-logos/home/formula1.png', alt: 'Formula 1' },
  { src: 'images/our-network-logos/home/lowes.png', alt: "Lowe's" },
  { src: 'images/our-network-logos/home/planet-fitness.png', alt: 'Planet Fitness' },
  { src: 'images/our-network-logos/home/intuit.png', alt: 'Intuit' },
  { src: 'images/our-network-logos/home/prizepicks.png', alt: 'PrizePicks' },
  { src: 'images/our-network-logos/home/moonpay.png', alt: 'MoonPay' },
  { src: 'images/our-network-logos/home/mars.png', alt: 'Mars Inc.' },
  { src: 'images/our-network-logos/home/hard-rock.png', alt: 'Hard Rock International' },
  { src: 'images/our-network-logos/home/celsius.png', alt: 'Celsius' },
  { src: 'images/our-network-logos/home/abbvie.png', alt: 'AbbVie' },
  { src: 'images/our-network-logos/home/mikes-hot-honey.png', alt: "Mike's Hot Honey" },
  { src: 'images/our-network-logos/home/champion.png', alt: 'Champion' },
  { src: 'images/our-network-logos/home/burger-king.png', alt: 'Burger King' },
  { src: 'images/our-network-logos/home/reebok.png', alt: 'Reebok' },
  { src: 'images/our-network-logos/home/ufc.png', alt: 'UFC' },
];

// All-logos page: full network roster, one 200px tile per logo.
// Superset of NETWORK_LOGOS (the curated homepage marquee) plus every
// additional sourced logo — used only by network-partners.html.
// Alphabetical by company name — this array drives the "View All" grid.
const ALL_NETWORK_LOGOS = [
  { src: 'images/our-network-logos/view-all/abbvie-white.png', alt: 'AbbVie' },
  { src: 'images/our-network-logos/view-all/adidas-white.png', alt: 'Adidas' },
  { src: 'images/our-network-logos/view-all/adobe-white.png', alt: 'Adobe' },
  { src: 'images/our-network-logos/view-all/alo-yoga.png', alt: 'Alo Yoga' },
  { src: 'images/our-network-logos/view-all/amex-white.png', alt: 'American Express' },
  { src: 'images/our-network-logos/view-all/anduril.png', alt: 'Anduril' },
  { src: 'images/our-network-logos/view-all/arizona-white.png', alt: 'Arizona' },
  { src: 'images/our-network-logos/view-all/barstool.png', alt: 'Barstool Sports' },
  { src: 'images/our-network-logos/view-all/bausch-white.png', alt: 'Bausch + Lomb' },
  { src: 'images/our-network-logos/view-all/bergdorf.png', alt: 'Bergdorf Goodman' },
  { src: 'images/our-network-logos/view-all/beta-tech.png', alt: 'BETA Technologies' },
  { src: 'images/our-network-logos/view-all/betr.png', alt: 'Betr' },
  { src: 'images/our-network-logos/view-all/billabong.png', alt: 'Billabong' },
  { src: 'images/our-network-logos/view-all/brooks-brothers.png', alt: 'Brooks Brothers' },
  { src: 'images/our-network-logos/view-all/burger-king-white.png', alt: 'Burger King' },
  { src: 'images/our-network-logos/view-all/caa-white.png', alt: 'CAA' },
  { src: 'images/our-network-logos/view-all/caesars-white.png', alt: 'Caesars' },
  { src: 'images/our-network-logos/view-all/celsius-white.png', alt: 'Celsius' },
  { src: 'images/our-network-logos/view-all/champion-white.png', alt: 'Champion' },
  { src: 'images/our-network-logos/view-all/coca-cola-white.png', alt: 'Coca-Cola' },
  { src: 'images/our-network-logos/view-all/cox-white.png', alt: 'Cox Enterprises' },
  { src: 'images/our-network-logos/view-all/dc-shoes.png', alt: 'DC Shoes' },
  { src: 'images/our-network-logos/view-all/delta-white.png', alt: 'Delta Air Lines' },
  { src: 'images/our-network-logos/view-all/dicks.png', alt: "DICK'S Sporting Goods" },
  { src: 'images/our-network-logos/view-all/discovery.png', alt: 'Discovery Land Company' },
  { src: 'images/our-network-logos/view-all/disney-white.png', alt: 'Disney' },
  { src: 'images/our-network-logos/view-all/douglas-white.png', alt: 'Douglas Elliman' },
  { src: 'images/our-network-logos/view-all/e11even.png', alt: 'E11EVEN' },
  { src: 'images/our-network-logos/view-all/eddie-bauer.png', alt: 'Eddie Bauer' },
  { src: 'images/our-network-logos/view-all/erebor.png', alt: 'Erebor' },
  { src: 'images/our-network-logos/view-all/erewhon.png', alt: 'Erewhon' },
  { src: 'images/our-network-logos/view-all/fanatics-white.png', alt: 'Fanatics' },
  { src: 'images/our-network-logos/view-all/fishwife.png', alt: 'Fishwife' },
  { src: 'images/our-network-logos/view-all/fisker.png', alt: 'Fisker' },
  { src: 'images/our-network-logos/view-all/ford-white.png', alt: 'Ford' },
  { src: 'images/our-network-logos/view-all/formula1-white.png', alt: 'Formula 1' },
  { src: 'images/our-network-logos/view-all/fruitist.png', alt: 'Fruitist' },
  { src: 'images/our-network-logos/view-all/gecko.png', alt: 'Gecko Robotics' },
  { src: 'images/our-network-logos/view-all/goldenhipo.png', alt: 'Golden Hippo' },
  { src: 'images/our-network-logos/view-all/green.png', alt: 'Green Mountain Coffee Roasters' },
  { src: 'images/our-network-logos/view-all/groot-white.png', alt: 'Groot Hospitality' },
  { src: 'images/our-network-logos/view-all/guess.png', alt: 'GUESS' },
  { src: 'images/our-network-logos/view-all/gusto-white.png', alt: 'Gusto' },
  { src: 'images/our-network-logos/view-all/hard-rock-white.png', alt: 'Hard Rock International' },
  { src: 'images/our-network-logos/view-all/houlihan-white.png', alt: 'Houlihan Lokey' },
  { src: 'images/our-network-logos/view-all/hulu-white.png', alt: 'Hulu' },
  { src: 'images/our-network-logos/view-all/intuit-white.png', alt: 'Intuit' },
  { src: 'images/our-network-logos/view-all/jersey-mikes.png', alt: "Jersey Mike's" },
  { src: 'images/our-network-logos/view-all/kay.png', alt: "Kay Jewelers" },
  { src: 'images/our-network-logos/view-all/keurig-white.png', alt: 'Keurig' },
  { src: 'images/our-network-logos/view-all/kith.png', alt: 'KITH' },
  { src: 'images/our-network-logos/view-all/lexus.png', alt: 'Lexus' },
  { src: 'images/our-network-logos/view-all/lightning.png', alt: 'Lightning Labs' },
  { src: 'images/our-network-logos/view-all/liv.png', alt: 'LIV Golf' },
  { src: 'images/our-network-logos/view-all/live-nation-white.png', alt: 'Live Nation' },
  { src: 'images/our-network-logos/view-all/lowes.png', alt: "Lowe's" },
  { src: 'images/our-network-logos/view-all/lucky-brand.png', alt: 'Lucky Brand' },
  { src: 'images/our-network-logos/view-all/lucky-strike.png', alt: 'Lucky Strike Entertainment' },
  { src: 'images/our-network-logos/view-all/mars-white.png', alt: 'Mars Inc.' },
  { src: 'images/our-network-logos/view-all/mikes-hot-honey.png', alt: "Mike's Hot Honey" },
  { src: 'images/our-network-logos/view-all/mlb-white.png', alt: 'MLB' },
  { src: 'images/our-network-logos/view-all/moonpay-white.png', alt: 'MoonPay' },
  { src: 'images/our-network-logos/view-all/nautica.png', alt: 'Nautica' },
  { src: 'images/our-network-logos/view-all/nba-white.png', alt: 'NBA' },
  { src: 'images/our-network-logos/view-all/neiman-marcus.png', alt: 'Neiman Marcus' },
  { src: 'images/our-network-logos/view-all/netflix-white.png', alt: 'Netflix' },
  { src: 'images/our-network-logos/view-all/neuralink.png', alt: 'Neuralink' },
  { src: 'images/our-network-logos/view-all/nfl-white.png', alt: 'NFL' },
  { src: 'images/our-network-logos/view-all/nhl.png', alt: 'NHL' },
  { src: 'images/our-network-logos/view-all/nike-white.png', alt: 'Nike' },
  { src: 'images/our-network-logos/view-all/nine-west.png', alt: 'Nine West' },
  { src: 'images/our-network-logos/view-all/nksfb.png', alt: 'NKSFB' },
  { src: 'images/our-network-logos/view-all/omnicom.png', alt: 'Omnicom' },
  { src: 'images/our-network-logos/view-all/openai.png', alt: 'OpenAI' },
  { src: 'images/our-network-logos/view-all/palantir.png', alt: 'Palantir' },
  { src: 'images/our-network-logos/view-all/ptc.png', alt: 'Palm Tree Crew' },
  { src: 'images/our-network-logos/view-all/peregrine.png', alt: 'Peregrine Technologies' },
  { src: 'images/our-network-logos/view-all/planet-fitness.png', alt: 'Planet Fitness' },
  { src: 'images/our-network-logos/view-all/pnc-white.png', alt: 'PNC' },
  { src: 'images/our-network-logos/view-all/prime-white.png', alt: 'PRIME' },
  { src: 'images/our-network-logos/view-all/prizepicks.png', alt: 'PrizePicks' },
  { src: 'images/our-network-logos/view-all/quiksilver.png', alt: 'Quiksilver' },
  { src: 'images/our-network-logos/view-all/reddit-white.png', alt: 'Reddit' },
  { src: 'images/our-network-logos/view-all/reebok-white.png', alt: 'Reebok' },
  { src: 'images/our-network-logos/view-all/ripple-white.png', alt: 'Ripple' },
  { src: 'images/our-network-logos/view-all/rolling-white.png', alt: 'Rolling Loud' },
  { src: 'images/our-network-logos/view-all/rvca.png', alt: 'RVCA' },
  { src: 'images/our-network-logos/view-all/saks.png', alt: 'Saks Global' },
  { src: 'images/our-network-logos/view-all/salesforce-white.png', alt: 'Salesforce' },
  { src: 'images/our-network-logos/view-all/science.png', alt: 'Science Corp.' },
  { src: 'images/our-network-logos/view-all/skechers-white.png', alt: 'Skechers' },
  { src: 'images/our-network-logos/view-all/sothebys.png', alt: "Sotheby's" },
  { src: 'images/our-network-logos/view-all/spacex-white.png', alt: 'SpaceX' },
  { src: 'images/our-network-logos/view-all/spotify-white.png', alt: 'Spotify' },
  { src: 'images/our-network-logos/view-all/superpower.png', alt: 'Superpower' },
  { src: 'images/our-network-logos/view-all/tesla-white.png', alt: 'Tesla' },
  { src: 'images/our-network-logos/view-all/hwood-white.png', alt: 'The h.wood Group' },
  { src: 'images/our-network-logos/view-all/toyota-white.png', alt: 'Toyota' },
  { src: 'images/our-network-logos/view-all/ufc-white.png', alt: 'UFC' },
  { src: 'images/our-network-logos/view-all/umg.png', alt: 'Universal Music Group' },
  { src: 'images/our-network-logos/view-all/uta-white.png', alt: 'United Talent Agency' },
  { src: 'images/our-network-logos/view-all/verkada-white.png', alt: 'Verkada' },
  { src: 'images/our-network-logos/view-all/vince.png', alt: 'Vince' },
  { src: 'images/our-network-logos/view-all/vincecamuto.png', alt: 'Vince Camuto' },
  { src: 'images/our-network-logos/view-all/volcom.png', alt: 'Volcom' },
  { src: 'images/our-network-logos/view-all/walmart-white.png', alt: 'Walmart' },
  { src: 'images/our-network-logos/view-all/wme.png', alt: 'WME' },
];

// All-logos page: one 200px tile per network logo.
(() => {
  const gridEl = document.querySelector('[data-logo-grid]');
  if (!gridEl) return;
  ALL_NETWORK_LOGOS.forEach((logo, i) => {
    const tile = document.createElement('div');
    tile.className = 'logo-tile';
    if (logo.src) {
      const img = document.createElement('img');
      img.src = logo.src;
      img.alt = logo.alt;
      img.loading = 'lazy';
      tile.appendChild(img);
      const label = document.createElement('span');
      label.className = 'logo-tile-label';
      label.textContent = logo.alt;
      tile.appendChild(label);
    } else {
      tile.classList.add('logo-tile-text');
      const span = document.createElement('span');
      span.textContent = logo.alt;
      tile.appendChild(span);
    }
    gridEl.appendChild(tile);
    tile.style.setProperty('--d', (0.45 + Math.min(i, 40) * 0.045) + 's');
    requestAnimationFrame(() => requestAnimationFrame(() => tile.classList.add('is-in')));
  });
})();

(() => {
  const marqueeEl = document.querySelector('[data-network-marquee]');
  if (!marqueeEl || !NETWORK_LOGOS.length) return;

  const isRetinaBand = window.matchMedia('(min-width:901px) and (max-width:1919.98px)').matches;
  const isUW = window.matchMedia('(min-width:1920px)').matches;
  const COLS = isRetinaBand ? 9 : (isUW ? 10 : 4);
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
    const sequence = groups[c].length ? groups[c] : NETWORK_LOGOS;

    [...sequence, ...sequence].forEach(logo => {
      const item = document.createElement('span');
      item.className = 'network-logo';
      if (logo.src) {
        const img = document.createElement('img');
        img.src = logo.src;
        img.alt = logo.alt;
        img.loading = 'lazy';
        item.appendChild(img);
      } else {
        item.classList.add('network-logo-text');
        const span = document.createElement('span');
        span.textContent = logo.alt;
        item.appendChild(span);
      }
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
  const cursorRing = document.querySelector('.cursor-ring');
  if (cursorRing) {
    marqueeEl.addEventListener('mouseenter', () => { cursorRing.classList.add('is-cta'); });
    marqueeEl.addEventListener('mouseleave', () => { cursorRing.classList.remove('is-cta'); });
  }
  marqueeEl.addEventListener('click', (e) => {
    const go = () => { window.location.href = 'network-partners.html'; };
    if (reduceMotion) return go();
    try { sessionStorage.setItem('pt-enter', '1'); } catch (_) {}
    const ov = document.createElement('div');
    ov.className = 'pt-overlay';
    ov.style.setProperty('--x', e.clientX + 'px');
    ov.style.setProperty('--y', e.clientY + 'px');
    document.body.appendChild(ov);
    requestAnimationFrame(() => requestAnimationFrame(() => ov.classList.add('is-on')));
    setTimeout(go, 800);
  });

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
  // Pre-reveal ("closed") sliver is thin everywhere the curtain trick is
  // used, so the gap before it opens doesn't read as dead space.
  const CURTAIN_HEIGHT = isRetinaBand ? 16 : (isUW ? 16 : 120); // one row, opened via clip-path so logos never get squashed
  // Rows shown are capped to the smallest column's actual unique-logo count
  // (round-robin split, so that's floor(total/COLS)) — never more than that,
  // so no column can ever show the same logo twice at once, regardless of
  // how many logos NETWORK_LOGOS ends up with.
  const MARQUEE_COLS = isRetinaBand ? 9 : (isUW ? 10 : 4);
  const minGroupSize = Math.max(1, Math.floor(NETWORK_LOGOS.length / MARQUEE_COLS));
  const desiredRows = isRetinaBand ? 3.6 : (isUW ? 4 : 6.5); // 6.5 ≈ 780/120 at the old mobile constant; retina's 3.6 (was 4) trims the max reveal ~10% without touching logo size
  const safeRows = Math.min(desiredRows, minGroupSize);
  const HEIGHT_END = isRetinaBand || isUW ? logoH * safeRows + 12 * (safeRows - 1) : 780;
  const CURTAIN_END = 0.3; // fraction of eased spent just opening the curtain on that first row
  const COPY_DROP = 90; // starts this far above its natural spot; one constant rate down to 0

  if (reduceMotion) {
    marqueeEl.style.height = `${HEIGHT_END}px`;
    if (copyEl) { copyEl.style.opacity = '1'; copyEl.style.filter = 'none'; }
    if (copyAfterEl) { copyAfterEl.style.opacity = '1'; copyAfterEl.style.transform = 'none'; }
    return;
  }

  let ticking = false;
  // One-way: once the curtain has opened it stays open (v3 reveals once).
  let netMax = 0, copyMax = 0;

  const update = () => {
    const scrollable = networkSection.offsetHeight - window.innerHeight;
    const progress = scrollable > 0
      ? Math.min(Math.max(-networkSection.getBoundingClientRect().top / scrollable, 0), 1)
      : 0;
    // Growth finishes at 85% of the pin's scroll (eased so it visibly
    // decelerates into that finish).
    netMax = Math.max(netMax, Math.min(progress / 0.85, 1));
    const growth = netMax;
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
      copyMax = Math.max(copyMax, preProgress); // one-way
      const copyIn = smoothstep(Math.min(copyMax / 0.8, 1));
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
  // Entrance (same idea as v2's weave): only a seed node shows while the
  // loader is up; once it lifts, links grow out of every lit node to its
  // neighbours (arrival = shortest path distance from the seed) and each
  // node is cast outward from the seed as it lands.
  const WAVE_SPAN = 1800; // ms for the growth to reach the furthest node
  const NODE_FADE = 350; // ms for one node's own fade/grow-in once a link reaches it
  const CAST_MS = 750; // ms for a node to travel out from its contracted spot to home
  // 3D entrance: nodes get a z from their depth and are perspective-
  // projected; the web starts turned and pushed back, then swings flat and
  // comes forward, landing exactly on the 2D layout (so physics are untouched).
  const ENTRANCE_3D_MS = 3600; // long ease-out (quint): most of the turn early, a very soft landing
  const easeOutQuint = (x) => 1 - Math.pow(1 - x, 5);
  const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
  const ROT_Y0 = 0.9, ROT_X0 = 0.35; // starting turn (rad)
  const Z_SPAN = 900, CAM0 = 700, FOCAL = 900;
  const REVEAL_BLUR = 12, REVEAL_BLUR_MS = 1400; // whole field sharpens from a blur
  const IDLE_ROT_Y = 0.12, IDLE_ROT_X = 0.05; // resting sway amplitude (rad)
  const MOUSE_ROT_Y = 0.25, MOUSE_ROT_X = 0.18; // tilt per half-viewport of mouse travel (rad)
  const rot = { x: 0, y: 0, tx: 0, ty: 0 };
  const ENTRANCE_GLOW_DECAY_MS = 900; // once a node finishes growing in, its glow fades out over this long
  const PULSE_INTERVAL = 4000; // ms between recurring ripples through the field
  const PULSE_SWEEP_MS = 1800; // ms for one ripple to sweep from center to the furthest node — slow
  const PULSE_KICK = 0.55; // outward velocity nudge a node gets once the ripple reaches it
  const PULSE_LEAD_MS = 250; // fires this much before the entrance reveal fully finishes
  let maxNodeDist = 1; // set once in makeNodes, reused every frame for the ripple's timing

  let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  const loadStart = performance.now();
  let revealStart = null; // set the first frame the page loader is gone
  let seedNode = null;
  let nodes = [];
  let raf = null;
  const mouse = { x: -9999, y: -9999, active: false };
  // Cursor node trails the real pointer with a short eased delay ("drag" feel)
  const cursorNode = { x: -9999, y: -9999 };
  // index-v2 only (body.v2): fake 3D — each node gets a depth and is drawn
  // with a mouse-driven parallax offset (near and far layers slide opposite
  // ways) plus depth-scaled size/brightness. The physics stay flat/untouched.
  const HERO_3D = document.body.classList.contains('v2');
  const HERO_3D_SHIFT = 70; // px of parallax between the nearest and mid layer
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  const bx = (n) => HERO_3D ? n.x + tilt.x * HERO_3D_SHIFT * (n.depth - 0.85) : n.x;
  const by = (n) => HERO_3D ? n.y + tilt.y * HERO_3D_SHIFT * (n.depth - 0.85) : n.y;
  // Drawn position/scale: computed once per frame in step() (cast-out from
  // the seed + the entrance's 3D turn); plain positions when not animating.
  const px = (n) => (n.drawX !== undefined ? n.drawX : bx(n));
  const py = (n) => (n.drawY !== undefined ? n.drawY : by(n));
  const fogK = (n) => (n.drawS !== undefined ? Math.min(1, 0.3 + 0.7 * n.drawS) : 1); // farther = dimmer
  const depthK = (d) => HERO_3D ? 0.45 + 0.45 * d : 1; // near = bigger/brighter

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
          depth: 0.35 + Math.random(),
          reveal: reduceMotion ? 1 : 0,
          cast: 1,
        });
      }
    }

    // Entrance: grows out of the node nearest the field's center, along the
    // link graph — arrival time = shortest path distance from that seed
    // (Dijkstra, small n), so links visibly travel node to node.
    if (!reduceMotion) {
      const cx = w / 2, cy = h / 2;
      let maxDist = 1;
      nodes.forEach(n => {
        n.dist = Math.hypot(n.homeX - cx, n.homeY - cy);
        if (n.dist > maxDist) maxDist = n.dist;
      });
      maxNodeDist = maxDist;
      seedNode = nodes.reduce((a, b) => (b.dist < a.dist ? b : a));
      seedNode.depth = 0.85; // z = 0: stays put while the web turns around it

      const adj = nodes.map(() => []);
      nodes.forEach((a, i) => {
        let best = -1, bestD = Infinity;
        nodes.forEach((b, j) => {
          if (i === j) return;
          const d = Math.hypot(a.homeX - b.homeX, a.homeY - b.homeY);
          if (d < LINK_DIST) adj[i].push({ j, d });
          if (d < bestD) { bestD = d; best = j; }
        });
        if (best >= 0) { adj[i].push({ j: best, d: bestD }); adj[best].push({ j: i, d: bestD }); }
      });
      const time = nodes.map(n => (n === seedNode ? 0 : Infinity));
      const done = new Set();
      while (done.size < nodes.length) {
        let u = -1;
        time.forEach((t, i) => { if (!done.has(i) && (u < 0 || t < time[u])) u = i; });
        if (!isFinite(time[u])) break;
        done.add(u);
        adj[u].forEach(({ j, d }) => { if (time[u] + d < time[j]) time[j] = time[u] + d; });
      }
      const maxT = Math.max(...time.filter(isFinite)) || 1;

      nodes.forEach((n, i) => {
        // Unreachable leftovers (rare) just land last, by plain distance.
        n.waveDelay = (isFinite(time[i]) ? time[i] / maxT : 1 + n.dist / maxDist * 0.1) * WAVE_SPAN;
        n.cast = n === seedNode ? 1 : 0;
        n.lastPulseCycle = -1;
        // Recurring ripple sweeps left to right (by x position), independent
        // of the center-out entrance wave above.
        n.pulseFrac = n.homeX / w;
      });
    }
  };

  // growElapsed: ms since the entrance started (null = finished / reduced
  // motion, links drawn whole). While growing, each link extends from its
  // earlier-lit end toward the later one, with a glowing tip.
  let growElapsed = null;
  const drawLinks = () => {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        let a = nodes[i], b = nodes[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist >= LINK_DIST) continue;
        let k = 1;
        if (growElapsed !== null) {
          if (b.waveDelay < a.waveDelay) { const t = a; a = b; b = t; }
          const t0 = a.waveDelay, t1 = Math.max(b.waveDelay, t0 + 60);
          k = Math.min(Math.max((growElapsed - t0) / (t1 - t0), 0), 1);
          if (k <= 0) continue;
        }
        const ax = px(a), ay = py(a);
        const x = ax + (px(b) - ax) * k, y = ay + (py(b) - ay) * k;
        ctx.strokeStyle = `rgba(255,255,255,${0.32 * (1 - dist / LINK_DIST) * (0.4 + 0.6 * k) * depthK((a.depth + b.depth) / 2) * (fogK(a) + fogK(b)) / 2})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(x, y);
        ctx.stroke();
        if (k < 1) {
          const g = ctx.createRadialGradient(x, y, 0, x, y, 7);
          g.addColorStop(0, 'rgba(255,255,255,.9)');
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, 7, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  };

  const drawNodes = () => {
    const entranceNow = revealStart === null ? 0 : performance.now() - revealStart;
    nodes.forEach(n => {
      if (n.reveal <= 0) return;
      // Grows from nothing (not just a subtle size bump) alongside the fade.
      let size = n.size * n.reveal;
      let alpha = 0.85 * n.reveal;
      let glow = 0;
      // Glows while it's still actively growing in, then that glow fades
      // back out over ENTRANCE_GLOW_DECAY_MS once it's settled — makes the
      // load-in itself the notable moment, not just a size/alpha ramp.
      const settleElapsed = entranceNow - n.waveDelay - NODE_FADE;
      const entranceGlow = smoothstep(Math.min(Math.max(1 - settleElapsed / ENTRANCE_GLOW_DECAY_MS, 0), 1));
      if (entranceGlow > glow) glow = entranceGlow;
      if (mouse.active) {
        const dist = Math.hypot(mouse.x - px(n), mouse.y - py(n));
        if (dist < CURSOR_LINK_DIST) {
          const boost = 1 - dist / CURSOR_LINK_DIST;
          size += boost * 1.5;
          alpha = Math.min(1, alpha + boost * 0.3);
          if (boost > glow) glow = boost;
        }
      }
      ctx.beginPath();
      ctx.arc(px(n), py(n), size * depthK(n.depth) * (n.drawS !== undefined ? n.drawS : 1), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${Math.min(1, alpha * depthK(n.depth) * fogK(n))})`;
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

  // The CSS transition on .hero-nodes only exists for the loader exit. Left
  // on, it also eases the per-frame scroll transform/opacity below, so the
  // canvas trails the scroll and lands off-position when you come back up.
  // Dropped for good once the loader has been gone long enough to finish it.
  let settled = false, unloadedAt = null;
  const settle = (now) => {
    if (settled || document.body.classList.contains('is-loading')) return;
    if (unloadedAt === null) unloadedAt = now;
    if (now - unloadedAt > 1500) { canvas.style.transition = 'none'; settled = true; }
  };

  const step = () => {
    settle(performance.now());
    if (HERO_3D) {
      if (pendingClientX !== null) {
        tilt.tx = pendingClientX / window.innerWidth - 0.5;
        tilt.ty = pendingClientY / window.innerHeight - 0.5;
      }
      tilt.x += (tilt.tx - tilt.x) * 0.06;
      tilt.y += (tilt.ty - tilt.y) * 0.06;
    }
    canvas.style.transform = `translateY(${window.scrollY * (1 - PARALLAX_SPEED)}px)`;
    // Hover (cursor node, links, pull) stays off until the entrance has
    // finished, so the two effects don't fight each other.
    const entranceDone = revealStart !== null &&
      performance.now() - revealStart > Math.max(WAVE_SPAN * 1.2 + CAST_MS, ENTRANCE_3D_MS * 0.7);
    if (!entranceDone) {
      mouse.active = false;
    } else if (pendingClientX !== null) {
      const heroRect = heroEl.getBoundingClientRect();
      if (pendingClientY < heroRect.top || pendingClientY > heroRect.bottom) {
        mouse.active = false;
      } else {
        // canvas.getBoundingClientRect() already reflects its live parallax
        // transform, so this lines up with the canvas's local drawing space
        // with no extra math needed.
        const rect = canvas.getBoundingClientRect();
        const nx = pendingClientX - rect.left;
        const ny = pendingClientY - rect.top;
        if (!mouse.active) {
          // Snap on entry so the cursor node doesn't fly in from off-screen.
          cursorNode.x = nx;
          cursorNode.y = ny;
        }
        mouse.x = nx;
        mouse.y = ny;
        mouse.active = true;
      }
    }
    // Fades and blurs out over the first viewport height of scroll, so the
    // node field dissolves away as it parallax-scrolls out of the hero
    // instead of just sliding off with a hard edge.
    const heroFadeProgress = Math.min(window.scrollY / window.innerHeight, 1);
    const now = performance.now();
    const loadIn = smoothstep(Math.min((now - loadStart) / LOAD_IN_MS, 1));
    canvas.style.opacity = String((1 - heroFadeProgress) * loadIn);
    // Entrance clock starts once the page loader is gone (straight away on
    // pages without one). Until then only the seed shows, softly breathing.
    if (revealStart === null && !document.body.classList.contains('is-loading')) revealStart = now;
    const elapsed = revealStart === null ? -1 : now - revealStart;
    nodes.forEach(n => {
      if (revealStart === null) {
        n.reveal = n === seedNode ? 2.2 + 0.4 * Math.sin(now / 320) : 0; // oversized: sits under the entrance blur
        return;
      }
      const t = (elapsed - n.waveDelay) / NODE_FADE;
      n.reveal = n === seedNode
        ? 1 + 1.2 * (1 - smoothstep(Math.min(elapsed / 600, 1))) // eases down from its loader size
        : smoothstep(Math.min(Math.max(t, 0), 1));
      n.cast = n === seedNode ? 1 : easeOutCubic(Math.min(Math.max((elapsed - n.waveDelay) / CAST_MS, 0), 1));
    });
    growElapsed = (revealStart !== null && elapsed > WAVE_SPAN * 1.2 + CAST_MS) ? null : elapsed;
    // Entrance blur: held while the loader is up (the seed reads as a soft
    // glow), then the whole field sharpens as the web grows in.
    const revealBlur = revealStart === null ? REVEAL_BLUR
      : REVEAL_BLUR * (1 - smoothstep(Math.min(elapsed / REVEAL_BLUR_MS, 1)));
    const blurPx = Math.max(heroFadeProgress * 16, revealBlur);
    canvas.style.filter = blurPx > 0.1 ? `blur(${blurPx}px)` : 'none';
    ctx.clearRect(0, 0, w, h);

    if (mouse.active) {
      cursorNode.x += (mouse.x - cursorNode.x) * 0.14;
      cursorNode.y += (mouse.y - cursorNode.y) * 0.14;
    }

    // Recurring ripple: every PULSE_INTERVAL, a wave sweeps left to right
    // across the field (by x position, not distance from center) — each
    // node gets a single small outward velocity kick exactly once, the
    // moment the ripple reaches it. The existing spring pull + damping
    // below carries it back out and home on its own, so this only needs to
    // nudge, not animate, the motion. Clocked off the reveal finishing (not
    // raw page-load time), so the very first ripple fires right as the
    // node field's own entrance wave completes, not mid-way through it.
    const pulseClock = Math.max(0, elapsed - (WAVE_SPAN + NODE_FADE - PULSE_LEAD_MS));
    const pulseCycle = Math.floor(pulseClock / PULSE_INTERVAL);
    const pulseElapsed = pulseClock % PULSE_INTERVAL;
    const cx = w / 2, cy = h / 2;

    nodes.forEach(n => {
      if (elapsed >= WAVE_SPAN + NODE_FADE - PULSE_LEAD_MS && n.lastPulseCycle !== pulseCycle) {
        const arrival = n.pulseFrac * PULSE_SWEEP_MS;
        if (pulseElapsed >= arrival) {
          n.lastPulseCycle = pulseCycle;
          const dx = n.homeX - cx, dy = n.homeY - cy;
          const d = Math.hypot(dx, dy) || 1;
          n.vx += (dx / d) * PULSE_KICK;
          n.vy += (dy / d) * PULSE_KICK;
        }
      }

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

    // Drawn positions for this frame: cast out from the seed, then the 3D
    // entrance projection (identity once e3 reaches 1).
    const e3 = revealStart === null ? 0 : easeOutQuint(Math.min(elapsed / ENTRANCE_3D_MS, 1));
    const inv = 1 - e3;
    // After the entrance it keeps living in 3D: a slow idle sway plus a
    // tilt that follows the mouse (eased), blended in as the entrance ends.
    if (pendingClientX !== null) {
      rot.tx = pendingClientX / window.innerWidth - 0.5;
      rot.ty = pendingClientY / window.innerHeight - 0.5;
    }
    rot.x += (rot.tx - rot.x) * 0.05;
    rot.y += (rot.ty - rot.y) * 0.05;
    const ts = now / 1000;
    const ry = ROT_Y0 * inv + e3 * (IDLE_ROT_Y * Math.sin(ts * 0.25) + rot.x * MOUSE_ROT_Y);
    const rx = ROT_X0 * inv + e3 * (IDLE_ROT_X * Math.sin(ts * 0.19 + 1) + rot.y * MOUSE_ROT_X);
    const zK = Z_SPAN * (0.35 + 0.65 * inv); // full depth while turning in, shallower at rest
    const cRY = Math.cos(ry), sRY = Math.sin(ry);
    const cRX = Math.cos(rx), sRX = Math.sin(rx);
    const sx0 = seedNode ? bx(seedNode) : 0, sy0 = seedNode ? by(seedNode) : 0;
    nodes.forEach(n => {
      let x = bx(n), y = by(n), s = 1;
      if (seedNode && n.cast < 1) {
        const k = 0.35 + 0.65 * n.cast;
        x = sx0 + (x - sx0) * k;
        y = sy0 + (y - sy0) * k;
      }
      const dx = x - cx, dy = y - cy, z = (n.depth - 0.85) * zK;
      const x1 = dx * cRY + z * sRY, z1 = -dx * sRY + z * cRY;
      const y1 = dy * cRX - z1 * sRX, z2 = dy * sRX + z1 * cRX;
      s = FOCAL / Math.max(FOCAL + z2 + CAM0 * inv, 80);
      x = cx + x1 * s;
      y = cy + y1 * s;
      n.drawX = x; n.drawY = y; n.drawS = s;
    });

    drawLinks();

    if (mouse.active) {
      nodes.forEach(n => {
        const dist = Math.hypot(cursorNode.x - px(n), cursorNode.y - py(n));
        if (dist < CURSOR_LINK_DIST) {
          ctx.strokeStyle = `rgba(255,255,255,${0.6 * (1 - dist / CURSOR_LINK_DIST)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(cursorNode.x, cursorNode.y);
          ctx.lineTo(px(n), py(n));
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
  // Only stores the raw pointer position here (no layout read) — resolving
  // it against the live rects happens once per animation frame in step()
  // instead of on every single mousemove, which was forcing a layout read
  // per pixel of mouse travel.
  let pendingClientX = null, pendingClientY = null;
  window.addEventListener('mousemove', (e) => {
    pendingClientX = e.clientX;
    pendingClientY = e.clientY;
  });
  window.addEventListener('mouseout', (e) => {
    if (!e.relatedTarget) { mouse.active = false; pendingClientX = null; }
  });

  raf = requestAnimationFrame(step);

  // Pauses the whole per-frame node simulation (O(n^2) link checks) while
  // the hero is scrolled out of view, instead of burning CPU forever.
  new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        if (!raf) {
          // The canvas's transform sat frozen at its stale pre-pause value
          // while paused; .hero-nodes has a CSS transition on transform
          // (for the one-time load reveal) that would otherwise ease that
          // big stale->current jump over ~1s, reading as "nodes land in the
          // wrong spot, then drift back". Snap it instantly first.
          canvas.style.transition = 'none';
          canvas.style.transform = `translateY(${window.scrollY * (1 - PARALLAX_SPEED)}px)`;
          void canvas.offsetHeight;
          if (!settled) canvas.style.transition = '';
          raf = requestAnimationFrame(step);
        }
      } else if (raf) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    });
  }).observe(heroEl);
})();

// Hero content (eyebrow/h1/sub/button, as one block): fades and blurs out
// over the first viewport height of scroll — same duration as the node
// canvas's own fade above — with a slow upward parallax drift and a faint
// scale-down eased in underneath, so it reads as a soft exhale rather than
// a flat dissolve.
(() => {
  const heroEl = document.querySelector('.hero');
  const heroContent = document.querySelectorAll('.hero > *:not(.hero-nodes)');
  if (!heroEl || !heroContent.length || reduceMotion) return;

  let ticking = false;
  const update = () => {
    const progress = Math.min(window.scrollY / window.innerHeight, 1);
    const eased = smoothstep(progress);
    const blur = eased * 14;
    heroContent.forEach(el => {
      // These elements also carry a CSS transition for their page-load
      // reveal — left in place, it would fight this per-frame scroll-scrub
      // (every inline update animating smoothly over ~1s instead of
      // tracking scroll immediately), so it's cut once scroll-driven
      // updates take over.
      el.style.transition = 'none';
      el.style.opacity = String(1 - eased);
      el.style.filter = blur > 0.5 ? `blur(${blur}px)` : 'none';
      el.style.transform = `translateY(${-window.scrollY * 0.3}px) scale(${1 - eased * 0.05})`;
    });
    ticking = false;
  };
  // Not run eagerly on load: at scrollY 0 this would resolve to the same
  // "fully visible" values the page-load CSS reveal ends at anyway, but
  // running it immediately would stamp that as an inline style before the
  // load-in transition (opacity 0 → 1, blurred → sharp) ever gets to play,
  // skipping it outright. Only reacting to real scroll events sidesteps
  // that — nothing here touches these elements until the user has
  // actually scrolled.
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }, { passive: true });
})();

// Portfolio carousel: cards move into an inner track that's moved by
// transform (not native scroll) — see the carousel block further down.
document.querySelectorAll('[data-carousel]').forEach(viewport => {
  const inner = document.createElement('div');
  inner.className = 'grid-track';
  [...viewport.children].forEach(card => inner.appendChild(card));
  viewport.appendChild(inner);
});

// Portfolio cards: cursor glow + very soft tilt, both trailing with an eased delay
const CARD_MAX_TILT = 3; // degrees

document.querySelectorAll('.card, .team-card, .co-investor-card').forEach(card => {
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

// Portfolio: not pinned — the grid and its title reveal themselves, left to
// right, the moment the grid enters the viewport (IntersectionObserver),
// then a plain staggered cascade across the cards in DOM order (01 first,
// ... 06 last), blur+fade+rise via the CSS transition already on .card.
const grid = document.querySelector('.grid');
const cards = document.querySelectorAll('.card');
const portfolioTitleEl = document.querySelector('.portfolio .section-title h2');
const CARD_STAGGER_MS = 110;

if (portfolioTitleEl) {
  if (reduceMotion) {
    portfolioTitleEl.classList.add('is-visible');
  } else {
    const titleIo = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          portfolioTitleEl.classList.add('is-visible');
          titleIo.disconnect();
        }
      });
    }, { threshold: 0 });
    titleIo.observe(portfolioTitleEl);
  }
}

// v2 desktop pins Portfolio and scrubs this cascade off scroll (v2.js).
const portfolioScrubbed = document.body.classList.contains('v2') && !reduceMotion &&
  window.matchMedia('(min-width:901px)').matches;
if (grid && cards.length && !portfolioScrubbed) {
  const revealCards = () => {
    cards.forEach((card, i) => {
      setTimeout(() => card.classList.add('is-visible'), reduceMotion ? 0 : i * CARD_STAGGER_MS);
    });
  };

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
    }, { threshold: 0 });
    gridIo.observe(grid);
  }
}


// Co-Investors grid: simple fade/blur/rise reveal, same pattern as the team grid.
const coInvestorsGrid = document.querySelector('.co-investors-grid');

// v2 desktop pins Co-Investors and scrubs its cascade off scroll (v2.js).
if (coInvestorsGrid && !portfolioScrubbed) {
  if (reduceMotion) {
    coInvestorsGrid.classList.add('is-visible');
    document.querySelectorAll('.co-investors-intro').forEach(el => el.classList.add('is-visible'));
  } else {
    const coInvestorsIo = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          coInvestorsGrid.classList.add('is-visible');
          document.querySelectorAll('.co-investors-intro').forEach(el => el.classList.add('is-visible'));
          coInvestorsIo.disconnect();
        }
      });
    }, { threshold: 0 });
    coInvestorsIo.observe(coInvestorsGrid);
  }
}

// Arriving from the home "View all" transition: the cover (html.pt-enter,
// set in <head>) fades out once the page is ready.
if (document.documentElement.classList.contains('pt-enter')) {
  const done = () => requestAnimationFrame(() => document.documentElement.classList.add('pt-reveal'));
  if (document.readyState === 'complete') done(); else window.addEventListener('load', done);
}

// Portfolio carousel: drifts on its own, bouncing between the two ends (no
// loop). Both the first and last card can be brought to the center. Grab it
// and it follows the pointer 1:1 (rubber-band past the ends); let go and it
// keeps the momentum of the throw, then eases back into the slow drift.
// Position is a float applied via transform, so motion stays subpixel-smooth.
(() => {
  const viewport = document.querySelector('[data-carousel]');
  const track = viewport && viewport.querySelector('.grid-track');
  const portfolioSection = document.querySelector('.portfolio');
  if (!track) return;
  if (window.matchMedia('(min-width:901px)').matches) return;
  const DRIFT = 38;       // px/sec idle drift
  const EASE_BACK = 1.6;  // how quickly momentum settles back to the drift
  const cards = track.querySelectorAll('.card');
  // Range of `pos` (px the track is shifted left): first card at the left
  // edge of the grid ... last card at the right edge (no centering).
  const bounds = () => {
    return { min: 0, max: Math.max(0, track.scrollWidth - viewport.clientWidth) };
  };

  let { min, max } = bounds();
  let pos = min, vel = 0, dir = 1;
  let grabbing = false, startX = 0, startPos = 0, lastX = 0, lastT = 0;
  const RUBBER = 0.35;

  // Visual position indicator: a hairline with a thumb that slides from one
  // end to the other as the carousel moves.
  const ind = document.createElement('div');
  ind.className = 'carousel-ind';
  ind.setAttribute('aria-hidden', 'true');
  const thumb = document.createElement('i');
  ind.appendChild(thumb);
  viewport.parentElement.appendChild(ind);

  const render = () => {
    track.style.transform = `translate3d(${-pos}px,0,0)`;
    const share = Math.min(1, viewport.clientWidth / track.scrollWidth);
    const f = max > min ? Math.max(0, Math.min(1, (pos - min) / (max - min))) : 0;
    ind.style.setProperty('--tw', (share * 100).toFixed(2) + '%');
    thumb.style.setProperty('--f', f.toFixed(4));
  };

  // Once the user has actually grabbed the carousel during the pinned
  // scroll-follow phase, their drag/throw wins for the rest of that pass —
  // scroll-follow doesn't resume and snap it back just because they let go.
  // Re-armed the next time the section is approached from scratch (see
  // pinProgress's 'before' case below).
  let manualOverride = false;

  viewport.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    grabbing = true;
    manualOverride = true;
    viewport.classList.add('is-dragging');
    viewport.setPointerCapture(e.pointerId);
    startX = lastX = e.clientX;
    startPos = pos;
    lastT = performance.now();
    vel = 0;
  });
  viewport.addEventListener('pointermove', (e) => {
    if (!grabbing) return;
    const now = performance.now();
    const dt = (now - lastT) / 1000;
    let p = startPos - (e.clientX - startX);
    if (p < min) p = min - (min - p) * RUBBER;
    else if (p > max) p = max + (p - max) * RUBBER;
    pos = p;
    if (dt > 0) vel = vel * 0.5 + (-(e.clientX - lastX) / dt) * 0.5;
    lastX = e.clientX; lastT = now;
    render();
  });
  const drop = () => {
    if (!grabbing) return;
    grabbing = false;
    viewport.classList.remove('is-dragging');
    if (performance.now() - lastT > 200) vel = 0; // held still before letting go
    vel = Math.max(-4000, Math.min(4000, vel));
    if (reduceMotion) { vel = 0; pos = Math.max(min, Math.min(max, pos)); render(); }
    else if (Math.abs(vel) > 20) dir = vel > 0 ? 1 : -1;
  };
  viewport.addEventListener('pointerup', drop);
  viewport.addEventListener('pointercancel', drop);

  // Horizontal trackpad / shift-wheel pushes it too.
  viewport.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    if (reduceMotion) { pos = Math.max(min, Math.min(max, pos + e.deltaX)); render(); }
    else vel = e.deltaX * 30;
  }, { passive: false });

  window.addEventListener('resize', () => {
    ({ min, max } = bounds());
    pos = Math.max(min, Math.min(max, pos));
    render();
  });
  render();
  if (reduceMotion) return;

  let visible = true;
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; }).observe(viewport);
  let last = performance.now();
  // While the portfolio section is pinned (sticky, mid-scroll through its
  // runway), page scroll drives the carousel from its first card to its
  // last instead of the idle drift — grabbing it still overrides at any
  // point, pinned or not. `null` before the section is reached at all (not
  // just clamped to 0) so the carousel sits still at the first card instead
  // of drifting away before you've actually arrived; once the runway's
  // scroll is used up (raw progress >= 1) the pin has released and it goes
  // back to drifting/being dragged freely.
  const HOLD = 0.12; // fraction of the pin's scroll held at each end, so the
                      // first/last card gets a beat fully settled in view
                      // before the scroll-follow starts/stops moving it.
  const pinProgress = () => {
    if (!portfolioSection) return null;
    const scrollable = portfolioSection.offsetHeight - window.innerHeight;
    if (scrollable <= 0) return null;
    const p = -portfolioSection.getBoundingClientRect().top / scrollable;
    if (p <= 0) return 'before';
    if (p >= 1) return 'after';
    if (p < HOLD) return 0;
    if (p > 1 - HOLD) return 1;
    return (p - HOLD) / (1 - 2 * HOLD);
  };

  const loop = (now) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (visible && !grabbing) {
      const progress = pinProgress();
      if (progress === 'before') {
        manualOverride = false; // re-arm for the next approach
      } else if (typeof progress === 'number' && !manualOverride) {
        // Eased toward the scroll-mapped target, not snapped 1:1, so the
        // scrubbing feels smooth rather than rigid.
        const targetPos = min + progress * (max - min);
        pos += (targetPos - pos) * Math.min(1, dt * 6);
        vel = 0;
      } else {
        const over = pos < min ? pos - min : (pos > max ? pos - max : 0);
        if (over) {
          // Past an end: spring back in.
          vel += (-over * 90 - vel * 11) * dt;
        } else {
          if (pos >= max - 1) dir = -1;
          else if (pos <= min + 1) dir = 1;
          vel += (dir * DRIFT - vel) * (1 - Math.exp(-EASE_BACK * dt));
        }
        pos += vel * dt;
      }
      render();
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
})();
