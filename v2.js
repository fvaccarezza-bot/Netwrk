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
