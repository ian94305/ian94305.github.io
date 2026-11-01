// Local trial: a small, dependency-free Canvas layer behind the original site.
(() => {
  const canvas = document.querySelector('.starfield');
  if (!canvas) return;
  let context;
  try { context = canvas.getContext('2d', {alpha:true}); } catch { return; }
  if (!context) return;

  const reduce = matchMedia('(prefers-reduced-motion:reduce)');
  const contrast = matchMedia('(forced-colors:active)');
  const mobile = matchMedia('(max-width:700px)');
  const print = matchMedia('print');
  const frameInterval = 1000 / 30;
  const colors = ['184,205,229', '211,224,240', '239,211,164'];
  let width = 0;
  let height = 0;
  let pixels = 1;
  let stars = [];
  let frame = 0;
  let lastPaint = 0;
  let elapsed = 0;
  let resizeTimer = 0;

  function randomStar() {
    const depth = Math.random();
    return {
      x:Math.random() * width,
      y:Math.random() * height,
      radius:.45 + depth * 1.15,
      speed:(4 + depth * 9) * (mobile.matches ? .75 : 1),
      opacity:.28 + depth * .42,
      phase:Math.random() * Math.PI * 2,
      twinkleSpeed:1.25 + Math.random() * .9,
      color:colors[Math.random() < .08 ? 2 : Math.random() < .5 ? 1 : 0]
    };
  }

  function paint(delta = 0) {
    elapsed += delta;
    context.clearRect(0, 0, width, height);
    const moving = delta > 0;
    for (const star of stars) {
      if (moving) {
        star.x = (star.x + star.speed * delta) % (width + 6);
        star.y = (star.y + star.speed * delta * .32) % (height + 6);
      }
      // Each star breathes independently over roughly 3–5 seconds. The stronger
      // dim-to-bright range makes twinkling visible without rapid flashing.
      const shimmer = .55 + Math.sin(elapsed * star.twinkleSpeed + star.phase) * .45;
      context.fillStyle = `rgba(${star.color},${(star.opacity * shimmer).toFixed(3)})`;
      context.beginPath();
      context.arc(star.x - 3, star.y - 3, star.radius, 0, Math.PI * 2);
      context.fill();
    }
  }

  function running() {
    return !reduce.matches && !contrast.matches && !print.matches && !document.hidden;
  }

  function tick(now) {
    frame = 0;
    if (!running()) return;
    if (!lastPaint) lastPaint = now;
    const delta = now - lastPaint;
    if (delta >= frameInterval) {
      // Limit work to 30 draws/sec even on high-refresh displays. Never catch up
      // across a hidden tab or long task: resume gently at the current position.
      paint(Math.min(delta, 100) / 1000);
      lastPaint = now - delta % frameInterval;
    }
    frame = requestAnimationFrame(tick);
  }

  function synchronize() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    lastPaint = 0;
    canvas.hidden = contrast.matches || print.matches;
    canvas.dataset.state = document.hidden ? 'hidden' : contrast.matches || print.matches ? 'disabled' : reduce.matches ? 'static' : 'running';
    if (!canvas.hidden && !document.hidden) paint();
    if (running()) frame = requestAnimationFrame(tick);
  }

  function resize() {
    width = Math.max(1, document.documentElement.clientWidth);
    height = Math.max(1, innerHeight);
    pixels = Math.min(devicePixelRatio || 1, mobile.matches ? 1 : 1.25);
    canvas.width = Math.round(width * pixels);
    canvas.height = Math.round(height * pixels);
    context.setTransform(pixels, 0, 0, pixels, 0, 0);
    const count = mobile.matches ? 65 : Math.min(200, Math.max(100, Math.round(width * height / 7000)));
    stars = Array.from({length:count}, randomStar);
    synchronize();
  }

  document.addEventListener('visibilitychange', synchronize);
  window.addEventListener('pagehide', () => { if (frame) cancelAnimationFrame(frame); frame = 0; });
  window.addEventListener('pageshow', synchronize);
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  }, {passive:true});
  reduce.addEventListener('change', synchronize);
  contrast.addEventListener('change', synchronize);
  print.addEventListener('change', synchronize);
  resize();
})();
