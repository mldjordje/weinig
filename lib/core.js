import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin, ScrambleTextPlugin, SplitText);
// a phone's address bar sliding away must not re-measure every pinned scene
ScrollTrigger.config({ ignoreMobileResize: true });

// The page language, set on <html> by its root layout; every text drawn from script picks its version here.
export const tr = (de, en) => (document.documentElement.lang === 'en' ? en : de);
export const locale = () => (document.documentElement.lang === 'en' ? 'en-GB' : 'de-DE');
export const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isMobile = () => innerWidth <= 760;
export const pr = (cap = 1.75) => Math.min(devicePixelRatio, cap);
// Same test as the (max-aspect-ratio: 1/1) stage layout in globals.css.
export const stacked = () => innerWidth <= innerHeight;
// Slides the picture out from under the copy without bending the perspective.
export const TEXT_ZONE = .21;
export function frameStage(camera, w, h, side, up = TEXT_ZONE) {
  if (stacked()) camera.setViewOffset(w, h, 0, h * up, w, h); else camera.setViewOffset(w, h, -w * side, 0, w, h);
}

// One WebGL context draws every scene. The picture is then copied into the section's own canvas,
// so it stays attached to the page while scrolling: a single fixed canvas would trail the DOM on phones.
let shared = null, bufW = 1, bufH = 1;
export function glContext() {
  if (shared) return shared;
  shared = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  shared.setPixelRatio(1); shared.setScissorTest(true);
  shared.localClippingEnabled = true;
  shared.shadowMap.enabled = true; shared.shadowMap.type = THREE.PCFSoftShadowMap;
  return shared;
}
const KEEP_CLEAR = new THREE.Color(0, 0, 0);
export function stageView(canvas) {
  const gl = glContext(), ctx = canvas.getContext('2d');
  let ratio = 1, w = 1, h = 1, clearAlpha = 0;
  const clearColor = KEEP_CLEAR.clone();
  const view = {
    gl, toneMapping: THREE.NoToneMapping, toneMappingExposure: 1,
    setPixelRatio(r) { ratio = r; },
    getPixelRatio: () => ratio,
    setSize(cw, ch) {
      w = Math.max(1, Math.floor(cw * ratio)); h = Math.max(1, Math.floor(ch * ratio));
      canvas.width = w; canvas.height = h;
      // the buffer only grows: reallocating it for each scene would cost more than the spare pixels
      if (w > bufW || h > bufH) { bufW = Math.max(w, bufW); bufH = Math.max(h, bufH); gl.setSize(bufW, bufH, false); }
    },
    getDrawingBufferSize(v) { return v.set(w, h); },
    setClearColor(c, a = 1) { clearColor.copy(c); clearAlpha = a; },
    render(scene, camera) {
      gl.toneMapping = view.toneMapping; gl.toneMappingExposure = view.toneMappingExposure;
      gl.setViewport(0, 0, w, h); gl.setScissor(0, 0, w, h); gl.setClearColor(clearColor, clearAlpha);
      gl.clear(); gl.render(scene, camera);
      ctx.globalCompositeOperation = 'copy';
      ctx.drawImage(gl.domElement, 0, bufH - h, w, h, 0, 0, w, h);
    },
    // Compiles every shader and uploads every buffer and texture now, including parts hidden until later in the scroll.
    async warm(scene, camera) {
      const hidden = [], culled = [];
      scene.traverse((o) => { if (!o.visible) { hidden.push(o); o.visible = true; } if (o.frustumCulled) { culled.push(o); o.frustumCulled = false; } });
      gl.toneMapping = view.toneMapping; gl.toneMappingExposure = view.toneMappingExposure;
      await Promise.race([gl.compileAsync(scene, camera).catch(() => {}), new Promise((r) => setTimeout(r, 4000))]);
      gl.setViewport(0, 0, 2, 2); gl.setScissor(0, 0, 2, 2); gl.render(scene, camera);
      hidden.forEach((o) => { o.visible = false; }); culled.forEach((o) => { o.frustumCulled = true; });
    },
  };
  return view;
}
// Scenes to warm, filled as they are built. main.js decides which of them hold the preloader.
export const warmups = [];
export function queueWarm(name, view, scene, camera, el) { warmups.push({ name, el, run: () => view.warm(scene, camera) }); }

// Scroll settles gently on the moments worth reading. Only once the visitor stops, so it never fights a swipe.
export const settleOn = (values) => (reduce ? undefined : { snapTo: values, duration: { min: .25, max: .7 }, delay: .12, ease: 'power2.inOut', inertia: false, directional: false });

export const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
addEventListener('pointermove', (e) => {
  pointer.tx = (e.clientX / innerWidth) * 2 - 1;
  pointer.ty = -((e.clientY / innerHeight) * 2 - 1);
}, { passive: true });
gsap.ticker.add(() => { pointer.x += (pointer.tx - pointer.x) * .06; pointer.y += (pointer.ty - pointer.y) * .06; });

// Renders only while the section is on screen, so five WebGL scenes never run at once.
export function whileVisible(el, fn) {
  let on = false;
  ScrollTrigger.create({ trigger: el, start: 'top bottom', end: 'bottom top', onToggle: (s) => { on = s.isActive; } });
  let time = 0;
  gsap.ticker.add((_, delta) => {
    if (!on) return;
    const dt = Math.min(delta / 1000, .05);
    if (!reduce) time += dt;
    fn(time, dt);
  });
}

// Which panel is showing inside a pinned stage. Each panel assembles itself once it arrives; fast scrolling finishes an unfinished one at once.
export function panelSwitcher(articles) {
  let cur = -1, drop = () => {};
  const assemble = (el, delay) => {
    const h2 = el.querySelector('h2'), code = el.querySelector('.code'), figure = code?.querySelector('b'), img = el.querySelector('img'), count = el.querySelector('.total.small b'), bars = el.querySelectorAll('.split i, .key i');
    const rest = [...el.children].filter((c) => c !== h2 && c !== code && c !== img);
    const split = SplitText.create(h2, { type: 'lines', mask: 'lines' });
    const tl = gsap.timeline({ delay, defaults: { ease: 'expo.out' } })
      .fromTo(split.lines, { yPercent: 110 }, { yPercent: 0, stagger: .08, duration: 1 }, .08)
      .fromTo(rest, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, stagger: .08, duration: .8 }, .28);
    if (code) tl.fromTo(code, { '--rule': 0 }, { '--rule': 1, duration: .9, ease: 'power3.inOut' }, 0)
      .to(figure, { scrambleText: { text: figure.textContent, chars: '0123456789', speed: .5 }, duration: .6, ease: 'none' }, 0);
    if (count) tl.from(count, { textContent: 0, snap: { textContent: 1 }, duration: .9, ease: 'power2.out' }, .1);
    if (bars.length) tl.fromTo(bars, { scaleX: 0 }, { scaleX: 1, stagger: .08, duration: .9 }, .35);
    if (img) tl.fromTo(img, { clipPath: 'inset(0 100% 0 0)', scale: 1.06 }, { clipPath: 'inset(0 0% 0 0)', scale: 1, duration: 1.2 }, .3);
    return () => { tl.progress(1).kill(); split.revert(); };
  };
  return (i) => {
    if (i === cur) return;
    const prev = articles[cur], next = articles[i], down = i > cur;
    cur = i;
    drop(); drop = () => {};
    if (prev) gsap.to(prev, { autoAlpha: 0, y: down ? -20 : 20, duration: reduce ? 0 : .25, ease: 'power2.in', overwrite: true });
    if (!next) return;
    gsap.fromTo(next, { autoAlpha: 0, y: 0 }, { autoAlpha: 1, y: 0, duration: reduce ? 0 : .2, delay: prev && !reduce ? .2 : 0, ease: 'none', overwrite: true });
    if (!reduce) drop = assemble(next, prev ? .2 : 0);
  };
}

// How far through a pinned stage the visitor is, along its bottom edge.
export function stageProgress(stage, tl) {
  const bar = document.createElement('i'); bar.className = 'stage-progress'; bar.setAttribute('aria-hidden', 'true'); stage.append(bar);
  const set = gsap.quickSetter(bar, 'scaleX');
  tl.eventCallback('onUpdate', () => set(tl.progress()));
}
