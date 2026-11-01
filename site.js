(() => {
  const layout = document.querySelector('.site-layout');
  const desktop = matchMedia('(min-width:1024px)');
  const reduce = matchMedia('(prefers-reduced-motion:reduce)');
  const identity = layout?.querySelector('.identity');
  const identityContent = identity?.firstElementChild;
  const description = identity?.querySelector('.identity-description');
  if (!layout) return;
  let frame = 0;
  function update() {
    frame = 0;
    if (!desktop.matches) {
      layout.style.removeProperty('--sidebar-fr');
      layout.style.removeProperty('--content-fr');
      ['--identity-x', '--identity-name-size', '--identity-zh-size', '--identity-nav-size', '--identity-nav-space', '--identity-nav-gap', '--identity-description-scale', '--identity-description-opacity'].forEach(key => layout.style.removeProperty(key));
      if (description) description.hidden = false;
      return;
    }
    const scrollProgress = Math.min(1, Math.max(0, scrollY / (innerHeight * .5)));
    const progress = reduce.matches ? 1 : scrollProgress;
    const eased = progress * progress * (3 - 2 * progress);
    const descriptionProgress = reduce.matches ? Number(scrollProgress >= 1) : eased;
    layout.style.setProperty('--identity-description-scale', String(1 - .98 * descriptionProgress));
    layout.style.setProperty('--identity-description-opacity', String(1 - descriptionProgress * descriptionProgress));
    if (description) description.hidden = descriptionProgress >= 1;
    layout.style.setProperty('--sidebar-fr', `${.5 - .25 * eased}fr`);
    layout.style.setProperty('--content-fr', `${.5 + .25 * eased}fr`);
    layout.style.setProperty('--identity-name-size', `${64 - 16 * eased}px`);
    layout.style.setProperty('--identity-zh-size', `${24 - 4 * eased}px`);
    layout.style.setProperty('--identity-nav-size', `${16 - 2 * eased}px`);
    layout.style.setProperty('--identity-nav-space', `${40 - 8 * eased}px`);
    layout.style.setProperty('--identity-nav-gap', `${4 - 1 * eased}px`);
    if (identity && identityContent) {
      const centerX = Math.max(0, (identity.clientWidth - identityContent.offsetWidth) / 2);
      layout.style.setProperty('--identity-x', `${centerX * (1 - eased)}px`);
    }
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }
  window.addEventListener('scroll', schedule, {passive:true});
  window.addEventListener('resize', schedule, {passive:true});
  window.addEventListener('pageshow', schedule);
  document.fonts.ready.then(schedule);
  desktop.addEventListener('change', schedule);
  reduce.addEventListener('change', schedule);
  update();
})();

(() => {
  const button = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#primary-nav');
  const compact = matchMedia('(max-width:1023px)');
  if (!button || !nav) return;
  function setOpen(open) {
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? '關閉導覽選單' : '開啟導覽選單');
    nav.classList.toggle('is-open', open);
  }
  button.hidden = false;
  nav.classList.add('menu-ready');
  button.addEventListener('click', () => setOpen(button.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link || !compact.matches) return;
    setOpen(false);
    // Keep keyboard focus at the destination when the clicked link is hidden.
    document.querySelector(link.hash)?.focus({preventScroll:true});
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && compact.matches && button.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      button.focus();
    }
  });
  document.addEventListener('click', event => {
    if (!nav.contains(event.target) && !button.contains(event.target)) setOpen(false);
  });
  compact.addEventListener('change', () => {
    const focusWasInNav = nav.contains(document.activeElement);
    setOpen(false);
    if (compact.matches && focusWasInNav) button.focus();
    else if (!compact.matches && document.activeElement === button) nav.querySelector('a').focus();
  });
})();

(() => {
  const sections = [...document.querySelectorAll('main > section[id], .experience-group[id]')];
  const links = [...document.querySelectorAll('.identity nav a')];
  const experienceLink = document.querySelector('.nav-group > a[aria-controls="experience-nav"]');
  const experienceNav = document.querySelector('#experience-nav');
  let anchorTarget = sections.find(section => `#${section.id}` === location.hash);
  let anchorSettledY = null;
  let requestedExpansion = false;
  let pending = false;
  function setExperienceExpanded(expanded) {
    if (!experienceNav || !experienceLink) return;
    // Move focus to the parent before hiding a focused child link.
    if (!expanded && experienceNav.contains(document.activeElement)) experienceLink.focus({preventScroll:true});
    experienceNav.inert = !expanded;
    experienceNav.setAttribute('aria-hidden', String(!expanded));
    experienceNav.classList.toggle('is-expanded', expanded);
    experienceLink.setAttribute('aria-expanded', String(expanded));
  }
  function updateNavigation() {
    pending = false;
    const marker = Math.min(160, innerHeight * .25);
    let active = sections[0];
    sections.forEach(section => {
      const heading = section.querySelector('h2, h3');
      if ((heading || section).getBoundingClientRect().top <= marker) active = section;
    });
    if (anchorSettledY !== null && Math.abs(scrollY - anchorSettledY) > 2) anchorTarget = undefined;
    if (anchorTarget) active = anchorTarget;
    const experienceRect = document.querySelector('#experience')?.getBoundingClientRect();
    // Short mobile pages may reach the bottom before the section can reach the marker.
    const inExperience = experienceRect && experienceRect.top <= innerHeight * .5 && experienceRect.bottom > marker;
    if (inExperience) requestedExpansion = false;
    setExperienceExpanded(inExperience || requestedExpansion);
    links.forEach(link => {
      if (link !== experienceLink && link.hash === `#${active.id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
      link.classList.toggle('is-active-group', link === experienceLink && (active.id === 'experience' || active.classList.contains('experience-group')));
    });
  }
  function schedule() {
    if (!pending) { pending = true; requestAnimationFrame(updateNavigation); }
  }
  window.addEventListener('scroll', schedule, {passive:true});
  window.addEventListener('resize', schedule, {passive:true});
  window.addEventListener('hashchange', () => {
    anchorSettledY = null;
    anchorTarget = sections.find(section => `#${section.id}` === location.hash);
    schedule();
  });
  document.addEventListener('toggle', schedule, true);
  document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', () => {
    anchorSettledY = null;
    anchorTarget = sections.find(section => `#${section.id}` === link.hash);
    requestedExpansion = ['#experience', '#work-experience', '#learning-experience'].includes(link.hash);
    if (requestedExpansion) setExperienceExpanded(true);
    schedule();
  }));
  function cancelRequestedExpansion() {
    requestedExpansion = false;
    schedule();
  }
  function resumeScrollTracking() {
    anchorTarget = undefined;
    cancelRequestedExpansion();
  }
  window.addEventListener('wheel', resumeScrollTracking, {passive:true});
  window.addEventListener('touchstart', resumeScrollTracking, {passive:true});
  window.addEventListener('keydown', event => {
    if (['Home', 'End', 'PageUp', 'PageDown', 'ArrowUp', 'ArrowDown', ' '].includes(event.key)) resumeScrollTracking();
  });
  window.addEventListener('scrollend', () => {
    anchorSettledY = scrollY;
    cancelRequestedExpansion();
  });
  updateNavigation();
})();

(() => {
  // Experience groups start open; only explicit clicks can close them.
  const groups = [...document.querySelectorAll('.experience-group')];
  if (!groups.length) return;
  function setExpanded(group, expanded) {
    const button = group.querySelector('.timeline-toggle');
    const details = group.querySelector('.timeline-details');
    if (!button || !details) return;
    if (!expanded && details.contains(document.activeElement)) button.focus({preventScroll:true});
    group.classList.toggle('is-revealed', expanded);
    button.setAttribute('aria-expanded', String(expanded));
    details.inert = !expanded;
    details.setAttribute('aria-hidden', String(!expanded));
  }
  groups.forEach(group => {
    const button = group.querySelector('.timeline-toggle');
    if (!button) return;
    button.disabled = false;
    group.classList.add('timeline-ready');
    setExpanded(group, true);
    button.addEventListener('click', () => setExpanded(group, button.getAttribute('aria-expanded') !== 'true'));
  });
  // Navigation may reveal the selected group, without changing other disclosures.
  function prepareAnchor(hash) {
    const target = document.getElementById(hash.slice(1));
    const group = target?.closest('.experience-group') ||
      (target?.id === 'experience' ? groups[0] : null);
    if (!group) return;
    group.classList.add('is-instant');
    setExpanded(group, true);
    group.getBoundingClientRect();
    group.classList.remove('is-instant');
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (link && !event.defaultPrevented && !event.metaKey && !event.ctrlKey &&
        !event.shiftKey && !event.altKey && event.button === 0) prepareAnchor(link.hash);
  }, true);
  window.addEventListener('hashchange', () => prepareAnchor(location.hash));
  const initialHash = location.hash;
  let initialNavigationCancelled = false;
  ['wheel','touchstart','pointerdown','keydown'].forEach(type => {
    window.addEventListener(type, () => { initialNavigationCancelled = true; }, {once:true,passive:true});
  });
  if (initialHash) {
    document.fonts.ready.then(() => requestAnimationFrame(() => {
      if (!initialNavigationCancelled && location.hash === initialHash) {
        document.getElementById(initialHash.slice(1))?.scrollIntoView({behavior:'instant',block:'start'});
      }
    }));
  }
})();

(() => {
  // Mouse hover previews details; native click and keyboard toggles remain available.
  const hover = matchMedia('(hover:hover) and (pointer:fine)');
  document.querySelectorAll('.experience-timeline .entry-more').forEach(details => {
    const entry = details.closest('.entry');
    const summary = details.querySelector('summary');
    let openedByHover = false;
    function closePreview() {
      if (!openedByHover || details.contains(document.activeElement)) return;
      details.open = false;
      openedByHover = false;
    }
    entry.addEventListener('pointerenter', event => {
      if (!hover.matches || event.pointerType !== 'mouse' || details.open) return;
      openedByHover = true;
      details.open = true;
    });
    entry.addEventListener('pointerleave', closePreview);
    summary.addEventListener('click', () => { openedByHover = false; });
    details.addEventListener('focusout', () => queueMicrotask(() => {
      if (!entry.matches(':hover')) closePreview();
    }));
    hover.addEventListener('change', () => { if (!hover.matches) closePreview(); });
  });
})();

(() => {
  // Section transitions keep their hues; projects return to the home background.
  const root = document.documentElement;
  const base = [11, 18, 36];
  const stops = [
    ['work-experience', [7, 26, 54]],
    ['learning-experience', [27, 11, 53]],
    ['projects', base],
    ['contact', base],
  ].map(([id, color]) => ({element: document.getElementById(id), color}))
    .filter(stop => stop.element);
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  const forced = matchMedia('(forced-colors:active)');
  let frame = 0;
  let lastColor = '';
  function update() {
    frame = 0;
    if (forced.matches) {
      root.style.removeProperty('--background');
      lastColor = '';
      return;
    }
    let color = base;
    for (const stop of stops) {
      const top = stop.element.getBoundingClientRect().top;
      const progress = reduced.matches ? Number(top <= innerHeight * .5) :
        Math.min(1, Math.max(0, (innerHeight * .85 - top) / (innerHeight * .65)));
      if (!progress) break;
      const eased = progress * progress * (3 - 2 * progress);
      color = color.map((channel, index) => channel + (stop.color[index] - channel) * eased);
      if (progress < 1) break;
    }
    const value = `rgb(${color.map(channel => channel.toFixed(2)).join(', ')})`;
    if (value !== lastColor) {
      root.style.setProperty('--background', value);
      lastColor = value;
    }
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(update); }
  window.addEventListener('scroll', schedule, {passive:true});
  window.addEventListener('resize', schedule, {passive:true});
  window.addEventListener('pageshow', schedule);
  document.addEventListener('toggle', schedule, true);
  reduced.addEventListener('change', schedule);
  forced.addEventListener('change', schedule);
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(schedule);
    document.querySelectorAll('main, .timeline-details').forEach(element => observer.observe(element));
  }
  document.fonts.ready.then(schedule);
  update();
})();

(() => {
  // Category titles light up only inside the middle third of the viewport.
  const headings = [...document.querySelectorAll('.experience-category > h3')];
  if (!headings.length) return;
  let frame = 0;
  function update() {
    frame = 0;
    const bandTop = innerHeight / 3;
    const bandBottom = innerHeight * 2 / 3;
    const active = headings.map(heading => {
      const rect = heading.getBoundingClientRect();
      const details = heading.closest('.timeline-details');
      const center = rect.top + rect.height / 2;
      return !details?.inert && rect.height > 0 && center >= bandTop && center <= bandBottom;
    });
    headings.forEach((heading, index) => heading.classList.toggle('is-in-reading-band', active[index]));
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(update); }
  window.addEventListener('scroll', schedule, {passive:true});
  window.addEventListener('resize', schedule, {passive:true});
  window.addEventListener('pageshow', schedule);
  document.addEventListener('toggle', schedule, true);
  document.querySelectorAll('.timeline-details').forEach(details => details.addEventListener('transitionend', schedule));
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(schedule);
    document.querySelectorAll('.timeline-details').forEach(details => observer.observe(details));
  }
  document.fonts.ready.then(schedule);
  update();
})();

(() => {
  // The introduction copy exits to the right as its reading position moves up.
  const copy = document.querySelector('.about-copy');
  const profile = document.querySelector('.about-profile');
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  if (!copy || !profile) return;
  let frame = 0;
  let currentX = 0;
  const clamp = value => Math.min(1, Math.max(0, value));
  function update() {
    frame = 0;
    if (reduced.matches || copy.contains(document.activeElement)) {
      copy.classList.remove('is-scroll-exit');
      ['--about-copy-x','--about-copy-opacity','will-change'].forEach(key => copy.style.removeProperty(key));
      currentX = 0;
      return;
    }
    const rect = copy.getBoundingClientRect();
    const naturalLeft = rect.left - currentX;
    const naturalTop = rect.top + scrollY;
    // Start after the copy reaches the upper reading band; phone copy can enter
    // naturally before it starts departing. Horizontal transforms never reflow it.
    const start = Math.max(0, naturalTop - innerHeight * .3);
    const duration = Math.max(220, Math.min(360, innerHeight * .45));
    const progress = clamp((scrollY - start) / duration);
    const eased = progress * progress * (3 - 2 * progress);
    const distance = Math.max(rect.width + 24, innerWidth - naturalLeft + 24);
    currentX = distance * eased;
    copy.classList.add('is-scroll-exit');
    copy.style.setProperty('--about-copy-x', `${currentX.toFixed(2)}px`);
    copy.style.setProperty('--about-copy-opacity', String(1 - eased * .8));
    if (progress > 0 && progress < 1) copy.style.willChange = 'transform, opacity';
    else copy.style.removeProperty('will-change');
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(update); }
  window.addEventListener('scroll', schedule, {passive:true});
  window.addEventListener('resize', schedule, {passive:true});
  window.addEventListener('pageshow', schedule);
  copy.addEventListener('focusin', schedule);
  copy.addEventListener('focusout', schedule);
  reduced.addEventListener('change', schedule);
  document.fonts.ready.then(schedule);
  if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(profile);
  update();
})();

(() => {
  // Fade across a wider reading band, without changing layout or scale.
  const items = [...document.querySelectorAll('.about-profile, .experience-timeline .entry, #projects .entry, #contact .entry')];
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  if (!items.length) return;
  let frame = 0;
  const clamp = value => Math.min(1, Math.max(0, value));
  const fade = value => {
    const progress = clamp(value);
    const eased = progress * progress * (3 - 2 * progress);
    return eased * eased;
  };
  function update() {
    frame = 0;
    if (reduced.matches) {
      items.forEach(item => item.style.removeProperty('--scroll-opacity'));
      return;
    }
    const entranceDistance = innerHeight * .6;
    const exitDistance = innerHeight * .45;
    // Read all geometry first, then update opacity; text and image sizes stay fixed.
    const values = items.map(item => {
      const rect = item.getBoundingClientRect();
      return Math.min(fade((innerHeight - rect.top) / entranceDistance),
        fade(rect.bottom / exitDistance));
    });
    items.forEach((item, index) => item.style.setProperty('--scroll-opacity', values[index].toFixed(3)));
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }
  items.forEach(item => item.classList.add('scroll-fade'));
  window.addEventListener('scroll', schedule, {passive:true});
  window.addEventListener('resize', schedule, {passive:true});
  document.addEventListener('toggle', schedule, true);
  document.querySelectorAll('.timeline-details').forEach(details => {
    details.addEventListener('transitionend', schedule);
  });
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(schedule);
    items.forEach(item => observer.observe(item));
  }
  document.fonts.ready.then(schedule);
  reduced.addEventListener('change', schedule);
  update();
})();

(() => {
  const shade = document.querySelector('.torch-shade');
  if (!shade) return;
  const supported = matchMedia('(hover:hover) and (pointer:fine) and (min-width:701px)');
  const highContrast = matchMedia('(forced-colors:active)');
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  let x = 0;
  let y = 0;
  let frame = 0;
  const available = () => supported.matches && !highContrast.matches && !reduced.matches;
  function paint() {
    frame = 0;
    shade.style.setProperty('--torch-x', `${x}px`);
    shade.style.setProperty('--torch-y', `${y}px`);
  }
  function position(clientX, clientY) {
    x = clientX;
    y = clientY;
    if (!frame) frame = requestAnimationFrame(paint);
  }
  function homePosition() {
    const rect = document.querySelector('h1').getBoundingClientRect();
    position(Math.min(innerWidth - 40, Math.max(40, rect.left + Math.min(rect.width, 160) / 2)),
      Math.min(innerHeight - 40, Math.max(40, rect.top + rect.height / 2)));
  }
  function render() {
    shade.hidden = !available();
  }
  window.addEventListener('pointermove', event => {
    if (!shade.hidden && event.pointerType !== 'touch') position(event.clientX, event.clientY);
  }, {passive:true});
  // Mouse-following coordinates stay in the viewport; resize clamps the light.
  window.addEventListener('resize', () => {
    position(Math.min(x, innerWidth), Math.min(y, innerHeight));
  }, {passive:true});
  supported.addEventListener('change', render);
  highContrast.addEventListener('change', render);
  reduced.addEventListener('change', render);
  homePosition();
  render();
})();
