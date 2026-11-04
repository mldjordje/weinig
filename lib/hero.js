// Hero: WEINIG's own photos as a living frame. Slides change under a scanner line; the cursor shows what the scanner sees; scrolling scans the frame away.
import * as THREE from 'three';
import gsap from 'gsap';
import { reduce, isMobile, pr, whileVisible, stageView, queueWarm } from './core.js';

const SLIDES = ['/img/hero-halle.jpg', '/img/hero-fenster.jpg', '/img/system.jpg', '/img/hero-banner.jpg'];

const FRAG = `
  uniform sampler2D tA, tB; uniform vec2 uRes, uMouse, uSizeA, uSizeB;
  uniform float uMix, uScan, uT, uZoom, uAmt;
  varying vec2 vUv;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5); }
  float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(hash(i), hash(i + vec2(1,0)), f.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y); }
  vec2 cover(vec2 uv, vec2 size){ float ra = uRes.x / uRes.y, ri = size.x / size.y; vec2 s = ra > ri ? vec2(1., ri / ra) : vec2(ra / ri, 1.); return (uv - .5) * s / uZoom + .5; }
  vec3 grade(vec3 c){ float l = dot(c, vec3(.3, .59, .11)); c = mix(vec3(l), c, 1.08); return mix(c * c * (3. - 2. * c), c, .4); }
  vec3 laser(float x){ return mix(vec3(0., .36, .12), mix(vec3(.1, .88, .4), vec3(.86, 1., .9), smoothstep(.55, 1., x)), smoothstep(.1, .6, x)); }
  float lum(vec3 c){ return dot(c, vec3(.3, .59, .11)); }
  vec3 photo(vec2 q, float s){ return mix(texture2D(tB, cover(q, uSizeB)).rgb, texture2D(tA, cover(q, uSizeA)).rgb, s); }
  // what the scanner sees: grey wood, its edges traced in green, a fine measuring grid
  vec3 scanned(vec2 q, float s){
    vec2 px = 1.6 / uRes;
    float c = lum(photo(q, s)), gx = lum(photo(q + vec2(px.x, 0.), s)) - lum(photo(q - vec2(px.x, 0.), s)), gy = lum(photo(q + vec2(0., px.y), s)) - lum(photo(q - vec2(0., px.y), s));
    float edge = smoothstep(.05, .22, length(vec2(gx, gy)));
    vec2 g = abs(fract(q * uRes / 28.) - .5);
    float grid = smoothstep(.47, .5, max(g.x, g.y)) * .18;
    return vec3(c * .32) + vec3(.12, .95, .45) * (edge * .85 + grid);
  }
  void main(){
    float ra = uRes.x / uRes.y; vec2 p = vUv, ar = vec2(ra, 1.);
    // the next photo is scanned in from the top, a line at a time
    float front = uMix * 1.12 - .06, line = 1. - p.y + (noise(vec2(p.x * 6., uT)) - .5) * .004;
    float s = smoothstep(front - .002, front + .002, line);
    vec3 col = grade(photo(p, s));
    float seamD = line - front;
    col += laser(exp(-seamD * seamD * 9e4)) * exp(-seamD * seamD * 2e4) * step(.001, uMix) * step(uMix, .999) * 1.4;
    // the cursor is the scanner's window
    float near = smoothstep(.2, .14, length((p - uMouse) * ar)) * uAmt;
    col = mix(col, scanned(p, s), near);
    col += vec3(.1, .9, .4) * smoothstep(.006, .0, abs(length((p - uMouse) * ar) - .17)) * uAmt * .7;
    // cinematic frame: falloff to the corners, weight along the bottom for the type
    float vig = smoothstep(1.25, .25, length((p - .5) * vec2(1.05, 1.15)) * 1.5);
    col *= mix(.36, 1.04, vig);
    col *= mix(.32, 1., smoothstep(.0, .62, p.y));
    // scroll: a scanner line climbs the frame; above it the photo, just behind it its scanned image, below it the clean page
    float f = uScan * 1.12 - .06, edge = p.y - f;
    float alpha = smoothstep(.0, .003, edge);
    float band = smoothstep(.14, .0, edge) * step(.0005, uScan);
    col = mix(col, scanned(p, s), band * .9);
    col += laser(exp(-edge * edge * 6e4)) * exp(-edge * edge * 1.2e4) * step(.0005, uScan) * 1.6;
    gl_FragColor = vec4(col * alpha, alpha);
  }`;

export async function initHero() {
  const root = document.getElementById('hero'), canvas = root.querySelector('canvas');
  const renderer = stageView(canvas);
  renderer.setPixelRatio(pr(1.5));
  const loader = new THREE.TextureLoader();
  const load = (url) => new Promise((res, rej) => loader.load(url, (t) => { t.colorSpace = THREE.NoColorSpace; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; res(t); }, undefined, rej));
  // the frame must be ready before the curtains open, never pop in after them
  const textures = await Promise.all(SLIDES.map(load));
  const size = (t) => new THREE.Vector2(t.image.width, t.image.height);

  const U = {
    tA: { value: textures[0] }, tB: { value: textures[1] }, uSizeA: { value: size(textures[0]) }, uSizeB: { value: size(textures[1]) },
    uRes: { value: new THREE.Vector2() }, uMouse: { value: new THREE.Vector2(.5, .5) }, uMix: { value: 0 }, uScan: { value: 0 }, uT: { value: 0 }, uZoom: { value: 1.3 }, uAmt: { value: 0 },
  };
  const scene = new THREE.Scene(), cam = new THREE.Camera();
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: U, depthTest: false, depthWrite: false, blending: THREE.NoBlending, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }', fragmentShader: FRAG })));

  // fine dust drifting through the hall light, thinning out as the frame is scanned away
  const M = isMobile() ? 90 : 200, seeds = new Float32Array(M * 3);
  for (let i = 0; i < M * 3; i++) seeds[i] = Math.random();
  const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(seeds, 3));
  const dust = new THREE.Points(eg, new THREE.ShaderMaterial({ uniforms: { uT: U.uT, uScan: U.uScan, uPR: { value: renderer.getPixelRatio() } }, transparent: true, depthTest: false, depthWrite: false,
    vertexShader: `uniform float uT, uScan, uPR; varying float vA;
      void main(){ float l = fract(uT * (.012 + position.y * .025) + position.z * 9.);
        vec2 p = vec2(position.x * 2. - 1. + sin(l * 5. + position.z * 40.) * .06, -1.05 + l * 2.2);
        vA = sin(l * 3.14) * (.25 + position.z * .35) * (1. - smoothstep(.2, .7, uScan)); gl_Position = vec4(p, 0., 1.); gl_PointSize = uPR * (.8 + position.y * 2.2); }`,
    fragmentShader: 'varying float vA; void main(){ float d = length(gl_PointCoord - .5); if (d > .5) discard; gl_FragColor = vec4(1., .93, .8, vA * (1. - d * 2.)); }' }));
  dust.frustumCulled = false; scene.add(dust);

  const fit = () => { renderer.setSize(root.clientWidth, root.clientHeight, false); renderer.getDrawingBufferSize(U.uRes.value); };
  addEventListener('resize', fit); fit();

  // With no cursor the scanner window patrols the photo on its own; a tap sends it to the finger for a while.
  const touch = matchMedia('(hover: none)').matches;
  let tx = .5, ty = .5, seen = touch, tapUntil = 0;
  addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; tx = e.clientX / innerWidth; ty = 1 - e.clientY / innerHeight; seen = true; }, { passive: true });
  root.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') return; tx = e.clientX / innerWidth; ty = 1 - e.clientY / innerHeight; tapUntil = performance.now() + 2500; }, { passive: true });

  let at = 0;
  const reel = () => gsap.to(U.uMix, { value: 1, duration: 2.2, ease: 'power1.inOut', delay: 4.4, onComplete: () => {
    at = (at + 1) % textures.length;
    const next = (at + 1) % textures.length;
    U.tA.value = textures[at]; U.uSizeA.value = size(textures[at]); U.tB.value = textures[next]; U.uSizeB.value = size(textures[next]);
    U.uMix.value = 0; reel();
  } });

  const title = root.querySelector('#heroTitle'), foot = root.querySelector('.hero-foot');
  const tl = gsap.timeline({ scrollTrigger: { trigger: root, start: 'top top', end: () => `+=${innerHeight * 1.9}`, pin: true, scrub: reduce ? true : .8, anticipatePin: 1 }, defaults: { ease: 'none' } });
  tl.to(U.uScan, { value: 1, duration: 1 }, .05)
    .to(foot, { autoAlpha: 0, y: -24, duration: .16 }, .02)
    .to(title, { scale: .9, yPercent: -46, duration: 1, transformOrigin: 'left bottom' }, 0)
    // the scan line passes the title about here, and the page behind it is light
    .to(title, { color: '#121512', duration: .18 }, .5)
    .to('#heroAfter', { autoAlpha: 1, y: 0, duration: .22 }, .7);

  whileVisible(root.parentElement, (t, dt) => {
    if (touch && performance.now() > tapUntil) { tx = .5 + .3 * Math.sin(t * .32); ty = .52 + .16 * Math.sin(t * .51 + 1); }
    const k = 1 - Math.exp(-dt * (touch ? 2.5 : 5));
    U.uMouse.value.x += (tx - U.uMouse.value.x) * k; U.uMouse.value.y += (ty - U.uMouse.value.y) * k;
    U.uAmt.value += ((seen ? 1 : 0) - U.uAmt.value) * k;
    U.uT.value = t;
    renderer.render(scene, cam);
  });
  queueWarm('hero', renderer, scene, cam, root);
  renderer.render(scene, cam);

  return () => {
    if (reduce) { U.uZoom.value = 1.04; return; }
    gsap.to(U.uZoom, { value: 1.04, duration: 3.6, ease: 'expo.out' });
    reel();
  };
}
