import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { reduce, warmups, tr, locale } from './core.js';
import { initHero } from './hero.js';
import { initLine } from './line.js';
import { initPlaner } from './planer.js';
import { initWindow } from './window.js';

gsap.registerPlugin(SplitText);
gsap.defaults({ ease: 'power3.out' });

const PHRASES = tr(['Holz wächst', 'Jahresring um Jahresring', 'Scannen', 'Einschnitt optimiert'], ['Wood grows', 'Ring by ring', 'Scanning', 'Cut optimised']);

// Split-curtain preloader from engitec. The count follows work actually finished.
function progressMeter(live) {
  const count = document.querySelector('.pre-count'), phrase = document.querySelector('.pre-phrase'), bar = document.querySelector('.pre-bar');
  const c = { v: 0 };
  let last = 0, done = 0, total = 1, finishing = false;
  const say = (i) => { if (i === last) return; last = i; phrase.textContent = PHRASES[i]; gsap.fromTo(phrase, { autoAlpha: 0, y: 6 }, { autoAlpha: .9, y: 0, duration: .3 }); };
  const show = (v, f = 0) => {
    count.textContent = String(v).padStart(3, '0');
    bar.style.transform = `scaleX(${v / 100})`;
    // the words follow the picture: growing, then scanned, then sawn
    say(f > .45 ? 3 : f > 0 ? 2 : v < 45 ? 0 : 1);
  };
  const paint = () => { if (live?.active) live.target(c.v / 100); else show(Math.round(c.v)); };
  if (live) { live.onProgress = show; live.onFail = paint; }
  return {
    plan(n) { total = n; },
    // scenes still warming after the deadline must not overwrite the closing tween, or the page never opens
    tick() { done++; if (finishing) return; gsap.to(c, { v: Math.min(done / total, .99) * 100, duration: reduce ? 0 : .5, ease: 'power2.out', overwrite: true, onUpdate: paint }); },
    finish: () => new Promise((resolve) => {
      finishing = true;
      gsap.to(c, { v: 100, duration: reduce ? 0 : .4, ease: 'power2.out', overwrite: true, onUpdate: paint, onComplete: () => {
        if (!live?.active) return resolve();
        live.finish();
        // a worker that dies or a hidden tab must not hold the page shut
        Promise.race([live.done, new Promise((r) => setTimeout(r, SAW_ENDS_BY))]).then(resolve);
      } });
    }),
  };
}

const breathe = () => new Promise((r) => setTimeout(r));
const SAW_ENDS_BY = 5000;
// A cold-mail visitor gives the intro seconds, not a minute: open on time and let slow warmups finish behind the hero.
const openBy = (live) => (!live?.active ? 5000 : matchMedia("(pointer: coarse)").matches ? 5000 : 6000);

function splitCurtains(onOpen, live) {
  const pre = document.getElementById('pre');
  const unlock = () => { document.documentElement.style.overflow = ''; gsap.set(pre, { display: 'none' }); if (live?.active) live.stop(); };
  if (reduce) { unlock(); onOpen(); return; }
  gsap.timeline({ onComplete: unlock })
    .to('.pre-inner, .pre-gl', { autoAlpha: 0, scale: .94, duration: .45, ease: 'power2.in' }, 0)
    .fromTo('.seam', { scaleX: 0, autoAlpha: 1 }, { scaleX: 1, duration: .45, ease: 'power3.inOut' }, .15)
    .to('.curtain.top', { yPercent: -101, duration: 1.05, ease: 'power4.inOut' }, .45)
    .to('.curtain.bot', { yPercent: 101, duration: 1.05, ease: 'power4.inOut' }, .45)
    .to('.seam', { autoAlpha: 0, duration: .5, ease: 'power2.out' }, .6)
    .call(onOpen, null, .55);
}

function heroIntro() {
  const title = SplitText.create('#heroTitle', { type: 'lines', mask: 'lines' });
  const sub = SplitText.create('#heroSub', { type: 'lines', mask: 'lines' });
  if (reduce) return;
  gsap.timeline()
    .from(title.lines, { yPercent: 115, stagger: .14, duration: 1.5, ease: 'expo.out' }, .3)
    .from(sub.lines, { yPercent: 110, stagger: .08, duration: 1.1, ease: 'expo.out' }, .9)
    .from('.hero-foot .btn, #nav', { autoAlpha: 0, duration: .9, ease: 'none' }, 1);
}

function wirePage() {
  const nav = document.getElementById('nav'), hero = document.getElementById('hero');
  // section heights change on rotation, so hold the place inside a pinned scene rather than the pixel offset
  let resume = null;
  ScrollTrigger.addEventListener('refreshInit', () => { const t = ScrollTrigger.getAll().find((s) => s.pin && s.isActive); resume = t && { t, p: t.progress }; });
  ScrollTrigger.addEventListener('refresh', () => { if (resume) scrollTo(0, resume.t.start + resume.p * (resume.t.end - resume.t.start)); resume = null; });
  // A settling pin scrolls back by up to half a stop; only a real move up, longer than that, brings the bar back.
  let peak = 0;
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (s) => {
    // the bar turns light once the scanner line has taken the photo off the top of the screen
    nav.classList.toggle('solid', hero.parentElement.getBoundingClientRect().bottom < innerHeight * .2 || scrollY > innerHeight * 1.7);
    peak = s.direction > 0 ? scrollY : Math.max(peak, scrollY);
    nav.classList.toggle('hide', scrollY > innerHeight && peak - scrollY <= innerHeight * .35);
  } });
  const menu = document.getElementById('navMenu'), panel = menu.querySelector('.menu-panel'), links = [...menu.querySelectorAll('.menu-links a')], foot = menu.querySelector('.menu-foot');
  const lock = (on) => { document.documentElement.style.overflow = on ? 'hidden' : ''; };
  const shut = () => { if (!menu.open) return; lock(false); if (reduce) { menu.open = false; return; } gsap.to(panel, { clipPath: 'inset(0 0 100% 0)', duration: .45, ease: 'power3.in', overwrite: true, onComplete: () => { menu.open = false; } }); };
  menu.querySelector('summary').addEventListener('click', (e) => { if (menu.open) { e.preventDefault(); shut(); } });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') shut(); });
  menu.addEventListener('toggle', () => {
    if (!menu.open) return;
    lock(true);
    if (reduce) return;
    gsap.fromTo(panel, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: .7, ease: 'expo.out', overwrite: true });
    gsap.fromTo([...links, foot], { y: 28, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: .045, duration: .7, delay: .1, ease: 'expo.out', overwrite: true });
  });
  document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const href = a.getAttribute('href'), el = href === '#top' ? document.body : document.querySelector(href);
    // sections still to be built: let the link do nothing rather than throw
    if (!el) { e.preventDefault(); return; }
    e.preventDefault();
    if (menu.open) { lock(false); gsap.killTweensOf(panel); menu.open = false; }
    const y = href === '#top' ? 0 : (ScrollTrigger.getAll().find((t) => t.pin && el.contains(t.pin))?.start ?? el.getBoundingClientRect().top + scrollY);
    gsap.to(window, { duration: reduce ? 0 : 1.4, scrollTo: y, ease: 'power3.inOut' });
  }));

  document.querySelectorAll('.scrubtext').forEach((el) => {
    const split = SplitText.create(el, { type: 'words' });
    gsap.fromTo(split.words, { opacity: .16 }, { opacity: 1, stagger: .05, ease: 'none', scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 50%', scrub: reduce ? true : .6 } });
  });
}

function wireLowerPage() {
  if (reduce) return;
  document.querySelectorAll('.reveal').forEach((el) => {
    SplitText.create(el, { type: 'lines', mask: 'lines', autoSplit: true, onSplit: (s) => gsap.from(s.lines, { yPercent: 110, stagger: .1, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } }) });
  });
  // each figure counts up as its rule draws in
  document.querySelectorAll('.ledger li').forEach((li) => {
    const b = li.querySelector('b'), text = b.textContent, n = parseFloat(text.replace(/[.,]/g, '')), tail = text.replace(/^[\d.,]+/, '');
    const c = { v: 0 }, fmt = (v) => Math.round(v).toLocaleString(locale()) + tail;
    gsap.timeline({ scrollTrigger: { trigger: li, start: 'top 85%', once: true } })
      .from(li.querySelector('span'), { y: 20, autoAlpha: 0, duration: .9 }, .15)
      .to(c, { v: n, duration: 1.4, ease: 'power3.out', onUpdate: () => { b.textContent = fmt(c.v); } }, 0);
  });
}

let started = false;
export async function boot(live) {
  if (started) return; // React Strict Mode runs effects twice in development
  started = true;
  document.documentElement.style.overflow = 'hidden';
  const meter = progressMeter(live);
  // software WebGL draws about three frames a second, so those machines get the plain page
  const hasGL = (() => { try { const gl = document.createElement('canvas').getContext('webgl2'), info = gl?.getExtension('WEBGL_debug_renderer_info'); return !!gl && !/swiftshader|llvmpipe|software|basic render/i.test(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : ''); } catch { return false; } })();
  let openHero = () => {};

  // page order matters: each pin pushes everything below it, so triggers must refresh top to bottom
  const builds = [() => document.fonts.ready];
  if (hasGL) builds.push(() => { document.documentElement.classList.add('webgl-on'); }, async () => { openHero = await initHero(); });
  else builds.push(() => { document.documentElement.classList.add('nogl'); });
  builds.push(wirePage);
  if (hasGL) builds.push(initLine, initPlaner, initWindow);
  builds.push(wireLowerPage);
  meter.plan(builds.length + (hasGL ? 4 : 0));
  for (const step of builds) { await step(); meter.tick(); await breathe(); }
  addEventListener('load', () => ScrollTrigger.refresh());
  ScrollTrigger.refresh();

  const warming = (async () => { for (const job of warmups) { await job.run().catch(() => {}); meter.tick(); await breathe(); } })();
  await Promise.race([warming, new Promise((r) => setTimeout(r, Math.max(0, openBy(live) - performance.now())))]);

  if (live?.frozen) return;
  await meter.finish();
  splitCurtains(() => { heroIntro(); openHero(); }, live);
}
