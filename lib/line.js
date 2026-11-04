// The production line, scene A of the landing. Station 1: a raw board runs through a SOLID SCAN C 4000 and comes out as data.
// Station 2: a SOLID CUT TF 2000 takes the defects out along the plan the scan produced.
// Station 3: a SOLID JOINT PS 2000 finger-joints the clear pieces into an endless lamella, which leaves to the right for scene B.
// Everything is driven by scroll position, so it plays the same on a phone as with a mouse.
import * as THREE from 'three';
import gsap from 'gsap';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { reduce, isMobile, pr, stacked, frameStage, whileVisible, stageView, queueWarm, panelSwitcher, stageProgress, pointer } from './core.js';
import { woodCanvas, endGrainCanvas } from './wood.js';

// 4000 × 140 × 45 mm: inside what the PS 2000 takes (width to 150 mm, thickness to 50 mm, pieces 150 to 700 mm long)
const L = 4, BW = .14, BT = .045, TABLE = .75, STEPS = 8, X_SAW = 6.5, SAW0 = -.66, SAW1 = .44;
// station 3: right and left fence of the package, the two cutters, the press line and its infeed; 15 mm vertical fingers
const XR = 12.6, XL = XR - .82, ZR = -.95, ZL = -1.65, ZP = -2.45, XJ = XR, FL = .015, NF = 24, GAP = .1;
// one board, its defects in board coordinates: u from the left end, v across the face
const TOP = [
  { type: 'knot', u: .78, v: .035, r: .022, name: 'Ast', tag: 'Ast · Ø 44 mm' },
  { type: 'crack', u0: 1.92, u1: 2.36, v: -.04, name: 'Riss', tag: 'Riss · 440 mm' },
  { type: 'knot', u: 3.18, v: -.05, r: .016, name: 'Ast', tag: 'Ast · Ø 32 mm' },
];
const BOTTOM = [
  { type: 'stain', u: 1.25, v: 0, r: .14, name: 'Bläue', tag: 'Bläue · Unterseite' },
  { type: 'knot', u: 2.85, v: .04, r: .018, name: 'Ast', tag: 'Ast · Unterseite' },
];
const ALL = [...TOP, ...BOTTOM];
const at = (k) => (k.type === 'crack' ? (k.u0 + k.u1) / 2 : k.u);
const COLORS = { Ast: '#ffb547', Riss: '#ff5d4f', Bläue: '#79b4ff' };
// The optimiser's answer for this board: defect zones out, pieces too short to use go with them, none longer than the 700 mm the PS 2000 takes.
// dest is where each good piece comes to rest on the outfeed, measured from the saw.
const PIECES = [[0, .7, 1.9], [.7, 1.45], [1.45, 1.89, 2.75], [1.89, 2.39], [2.39, 2.8, 3.5], [2.8, 3.3], [3.3, L, 4.4]]
  .map(([u0, u1, dest]) => ({ u0, u1, good: dest !== undefined, dest: X_SAW + (dest ?? 0), mm: Math.round((u1 - u0) * 1000) }));
// the saw meets the cuts from the right end of the board, because that end goes in first
const CUTS = PIECES.slice(1).map((pc) => pc.u0).sort((a, b) => b - a);
const GOOD_MM = PIECES.filter((pc) => pc.good).reduce((s, pc) => s + pc.mm, 0);
const ROWS = [{ y: 100, h: 150 }, { y: 284, h: 150 }, { y: 468, h: 48 }, { y: 550, h: 48 }], TX0 = 200, TX1 = 1240;

const S = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
const lerp = THREE.MathUtils.lerp;

function tex(canvas, view, srgb = true) {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, view.gl.capabilities.getMaxAnisotropy());
  return t;
}

// The scanner's view of the board: all four faces unrolled, every defect boxed and named.
function twinCanvas(top, bottom, side) {
  const W = 1280, H = 720, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  const x0 = 200, x1 = W - 40, rows = [
    { label: 'OBERSEITE', img: top, h: 150, defects: TOP },
    { label: 'UNTERSEITE', img: bottom, h: 150, defects: BOTTOM },
    { label: 'KANTE VORNE', img: side, h: 48, defects: [] },
    { label: 'KANTE HINTEN', img: side, h: 48, defects: [] },
  ];
  c.font = '500 26px "IBM Plex Mono", ui-monospace, monospace';
  c.fillStyle = 'rgba(160, 255, 200, .85)';
  c.fillText(`SOLID SCAN  ·  BRETT 0001  ·  ${L * 1000} × ${Math.round(BW * 1000)} × ${Math.round(BT * 1000)} mm`, x0, 58);
  let y = 100;
  for (const r of rows) {
    c.drawImage(r.img, x0, y, x1 - x0, r.h);
    // grey it out: the scanner sees structure, the colour goes to the defects
    c.globalCompositeOperation = 'saturation'; c.fillStyle = '#808080'; c.fillRect(x0, y, x1 - x0, r.h);
    c.globalCompositeOperation = 'multiply'; c.fillStyle = '#c4e6d0'; c.fillRect(x0, y, x1 - x0, r.h);
    c.globalCompositeOperation = 'source-over';
    c.strokeStyle = 'rgba(120, 255, 170, .5)'; c.lineWidth = 2; c.strokeRect(x0, y, x1 - x0, r.h);
    c.fillStyle = 'rgba(200, 255, 220, .8)'; c.font = '500 20px "IBM Plex Mono", ui-monospace, monospace';
    c.fillText(r.label, 24, y + Math.min(r.h, 60) / 2 + 8);
    for (const d of r.defects) {
      const px = (u) => x0 + (u / L) * (x1 - x0), py = (v) => y + (v / BW + .5) * r.h;
      let bx, by, bw, bh;
      if (d.type === 'crack') { bx = px(d.u0) - 6; bw = px(d.u1) - px(d.u0) + 12; by = py(d.v) - 14; bh = 28; }
      else { const rr = d.type === 'stain' ? d.r : d.r * 1.6; bx = px(d.u - rr * 1.4); bw = px(d.u + rr * 1.4) - bx; by = py(d.v - (d.type === 'stain' ? BW * .45 : rr * 1.3)); bh = py(d.v + (d.type === 'stain' ? BW * .45 : rr * 1.3)) - by; }
      c.strokeStyle = COLORS[d.name]; c.lineWidth = 4; c.strokeRect(bx, by, bw, bh);
      c.fillStyle = COLORS[d.name]; c.font = '600 22px "IBM Plex Mono", ui-monospace, monospace';
      c.fillText(d.name.toUpperCase(), bx, by - 10);
    }
    y += r.h + 34;
  }
  return cv;
}

// The cut plan laid over the twin: zones that go to waste, the cuts, the length of every good piece.
function planCanvas() {
  const cv = document.createElement('canvas');
  cv.width = 1280; cv.height = 720;
  const c = cv.getContext('2d'), px = (u) => TX0 + (u / L) * (TX1 - TX0), top = ROWS[0].y, bottom = ROWS[3].y + ROWS[3].h;
  for (const pc of PIECES) {
    const x = px(pc.u0), w = px(pc.u1) - x;
    if (!pc.good) {
      for (const r of ROWS) {
        c.fillStyle = 'rgba(255, 70, 60, .16)'; c.fillRect(x, r.y, w, r.h);
        c.save(); c.beginPath(); c.rect(x, r.y, w, r.h); c.clip();
        c.strokeStyle = 'rgba(255, 110, 95, .4)'; c.lineWidth = 2;
        for (let k = -r.h; k < w; k += 16) { c.beginPath(); c.moveTo(x + k, r.y + r.h); c.lineTo(x + k + r.h, r.y); c.stroke(); }
        c.restore();
      }
    } else {
      c.fillStyle = 'rgba(150, 255, 190, .95)'; c.font = '600 24px "IBM Plex Mono", ui-monospace, monospace';
      c.fillText(`${pc.mm}`, x + 8, bottom + 34);
      c.fillStyle = 'rgba(80, 255, 140, .9)'; c.fillRect(x + 2, bottom + 6, w - 4, 4);
    }
  }
  c.strokeStyle = 'rgba(110, 255, 160, 1)'; c.lineWidth = 3; c.setLineDash([10, 8]);
  for (const u of CUTS) { c.beginPath(); c.moveTo(px(u), top - 14); c.lineTo(px(u), bottom + 4); c.stroke(); }
  c.setLineDash([]); c.font = '500 22px "IBM Plex Mono", ui-monospace, monospace'; c.fillStyle = 'rgba(160, 255, 200, .9)';
  c.fillText(`SCHNITTPLAN  ·  ${CUTS.length} SCHNITTE  ·  ${GOOD_MM} MM FEHLERFREI`, TX0, 690);
  return cv;
}

const TWIN_FRAG = `
  uniform sampler2D map, plan; uniform float uReveal, uOn, uT, uPlan; varying vec2 vUv;
  void main(){
    vec4 c = texture2D(map, vUv);
    // the rows fill in from the end that leaves the scanner first; labels and frame are there from the start
    float rx = (vUv.x - .156) / (.969 - .156);
    float shown = rx < 0. ? 1. : step(1. - uReveal, rx);
    float edge = exp(-pow((rx - (1. - uReveal)) * 160., 2.)) * step(.001, uReveal) * step(uReveal, .999) * step(0., rx);
    vec3 bg = vec3(.02, .07, .045);
    float scan = .92 + .08 * sin(vUv.y * 900. + uT * 3.);
    float a = .62 + c.a * shown * .38;
    vec3 col = mix(bg, c.rgb * 1.15, c.a * shown) * scan + vec3(.2, 1., .5) * edge * 1.5;
    // a thin rule around the panel
    vec2 b = min(vUv, 1. - vUv); float frame = smoothstep(.004, .0, min(b.x * 1.78, b.y));
    col += vec3(.15, .75, .4) * frame;
    // the plan draws in from left to right once the optimiser has run
    vec4 pl = texture2D(plan, vUv) * step(vUv.x, uPlan * 1.1);
    col = mix(col, pl.rgb, pl.a);
    gl_FragColor = vec4(col, max(a + frame, pl.a) * uOn);
  }`;

const DUST_VERT = `
  uniform float uT, uOn, uPR, uSide; uniform vec3 uO; varying float vA;
  void main(){
    // chips thrown up and back off the blade, falling under their own weight
    float life = fract(uT * 1.9 + position.x * 5.);
    vec3 v = vec3((-.6 - position.y * 1.4) * uSide, .9 + position.z * 1.5, (position.x - .5) * 1.2);
    vec3 p = uO + v * life * .55 + vec3(0., -1.4 * life * life, 0.);
    vA = (1. - life) * uOn;
    vec4 mv = modelViewMatrix * vec4(p, 1.);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uPR * (1.5 + position.z * 2.5) * (5. / -mv.z);
  }`;

const CHIP_FRAG = 'varying float vA; void main(){ float d = length(gl_PointCoord - .5); if (d > .5) discard; gl_FragColor = vec4(vec3(.95, .82, .6), vA * (1. - d * 2.)); }';

const AIR_VERT = `
  uniform float uT, uOn, uPR; uniform vec3 uO; varying float vA;
  void main(){
    // a burst of air from the nozzle, spreading as it crosses the table toward the back
    float life = fract(uT * 3.1 + position.x * 7.);
    vec3 p = uO + vec3((position.y - .5) * .3 * life, (position.z - .5) * .12 * life, -life * .9);
    vA = (1. - life) * uOn * .5;
    vec4 mv = modelViewMatrix * vec4(p, 1.);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uPR * (2. + life * 6.) * (5. / -mv.z);
  }`;

// A piece seen from above with its ends straight or fingered. Right tips sit on even steps, left tips on odd ones,
// so a right end slides into the next piece's left end. Mapped onto the same stretch of the board texture as before.
function fingerGeo(pc, right, left) {
  const l = pc.u1 - pc.u0, n = NF * 2, s = new THREE.Shape();
  const xr = (j) => l / 2 - (right && j % 2 ? FL : 0), xl = (j) => -l / 2 + (left && j % 2 === 0 ? FL : 0), y = (j) => (j / n - .5) * BW;
  s.moveTo(xl(0), y(0));
  for (let j = 0; j <= n; j++) s.lineTo(xr(j), y(j));
  for (let j = n; j > 0; j--) s.lineTo(xl(j), y(j));
  const u = (x) => (pc.u0 + l / 2 + x) / L;
  const UVGenerator = {
    generateTopUV: (g, v, a, b, c) => [a, b, c].map((i) => new THREE.Vector2(u(v[i * 3]), .5 - v[i * 3 + 1] / BW)),
    generateSideWallUV: (g, v, a, b, c, d) => [a, b, c, d].map((i) => new THREE.Vector2(u(v[i * 3]), v[i * 3 + 2] / BT)),
  };
  return new THREE.ExtrudeGeometry(s, { depth: BT, bevelEnabled: false, UVGenerator }).rotateX(-Math.PI / 2).translate(0, -BT / 2, 0);
}

const SHAFT_VERT = `
  varying vec2 vUv; varying vec3 vN, vV;
  void main(){ vUv = uv; vN = normalMatrix * normal; vec4 mv = modelViewMatrix * vec4(position, 1.); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`;
const SHAFT_FRAG = `
  uniform float uI; varying vec2 vUv; varying vec3 vN, vV;
  void main(){
    // haze in the light: brightest under the lamp, fading toward the floor and toward the cone's outline
    float edge = pow(abs(dot(normalize(vN), normalize(vV))), 1.5);
    gl_FragColor = vec4(vec3(1., .94, .82) * uI * vUv.y * vUv.y * edge, 1.);
  }`;
const MOTE_VERT = `
  uniform float uT, uPR; varying float vA;
  void main(){
    vec3 p = position;
    p.y = mod(p.y + uT * .05, 4.3) + .2;
    p.x += sin(uT * .3 + position.z * 3.) * .15; p.z += cos(uT * .23 + position.x * 2.) * .15;
    vec4 mv = modelViewMatrix * vec4(p, 1.);
    vA = smoothstep(22., 3., -mv.z) * .5;
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uPR * 1.6 * (4. / -mv.z);
  }`;

const SHEET_FRAG = `
  uniform float uOn, uT; varying vec2 vUv;
  void main(){
    // a fan of laser light, narrow at the emitter (v = 1), opening toward the wood (v = 0)
    float w = mix(.5, .04, vUv.y), d = abs(vUv.x - .5);
    float a = smoothstep(w, w * .55, d) * mix(.9, .25, vUv.y) * (.85 + .15 * sin(uT * 40. + vUv.y * 30.));
    gl_FragColor = vec4(vec3(.15, 1., .45) * a * uOn, 1.);
  }`;

export function initLine() {
  const root = document.getElementById('linie'), stage = root.querySelector('.stage'), canvas = stage.querySelector('canvas');
  const view = stageView(canvas);
  view.setPixelRatio(pr(isMobile() ? 1.5 : 1.75));
  view.toneMapping = THREE.ACESFilmicToneMapping; view.toneMappingExposure = 1.05;
  view.setClearColor(new THREE.Color(0x070908), 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x070908, 9, 24);
  const pm = new THREE.PMREMGenerator(view.gl);
  scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture;
  pm.dispose();
  const camera = new THREE.PerspectiveCamera(32, 1, .05, 60);

  // light: a warm key from the hall roof, a cool rim from behind, green from inside the scanner
  scene.add(new THREE.HemisphereLight(0xbfc8c2, 0x1b1712, .35));
  const key = new THREE.DirectionalLight(0xfff1dc, 2.6);
  key.position.set(2, 7, 4.5); key.target.position.set(5, TABLE, -1);
  key.castShadow = true; key.shadow.mapSize.set(isMobile() ? 1024 : 2048, isMobile() ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -12, right: 12, top: 5, bottom: -5, near: 1, far: 25 }); key.shadow.bias = -.0004; key.shadow.normalBias = .02;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xb8d4ff, 1.2); rim.position.set(2, 3, -5); scene.add(rim);
  const glow = new THREE.PointLight(0x2bff7a, 0, 1.6, 2); glow.position.set(0, TABLE + .3, .15); scene.add(glow);
  // a pool of light over each machine, the rest of the hall falls away into the dark
  const POOLS = [[0, .2], [X_SAW, .2], [XR - .3, -1.2], [XJ + 1, ZP]];
  const shaftMat = new THREE.ShaderMaterial({ uniforms: { uI: { value: isMobile() ? .07 : .09 } }, vertexShader: SHAFT_VERT, fragmentShader: SHAFT_FRAG, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3();
  for (const [x, z] of POOLS) {
    const s = new THREE.SpotLight(0xfff1dc, 14, 8, .45, .7, 1.6); s.position.set(x, 5.2, z + 1.2); s.target.position.set(x, 0, z); scene.add(s, s.target);
    const len = s.position.distanceTo(s.target.position), cone = new THREE.Mesh(new THREE.ConeGeometry(1.5, len, 32, 1, true), shaftMat);
    cone.position.copy(s.position).lerp(s.target.position, .5); cone.quaternion.setFromUnitVectors(up, dir.copy(s.position).sub(s.target.position).normalize());
    scene.add(cone);
  }
  const MN = isMobile() ? 300 : 700, mp = new Float32Array(MN * 3);
  for (let i = 0; i < MN; i++) { const [x, z] = POOLS[i % POOLS.length]; mp.set([x + (Math.random() - .5) * 3, Math.random() * 4.3, z + (Math.random() - .5) * 3], i * 3); }
  const moteGeo = new THREE.BufferGeometry(); moteGeo.setAttribute('position', new THREE.BufferAttribute(mp, 3));
  const moteU = { uT: { value: 0 }, uPR: { value: pr(isMobile() ? 1.5 : 1.75) * 2 } };
  const motes = new THREE.Points(moteGeo, new THREE.ShaderMaterial({ uniforms: moteU, vertexShader: MOTE_VERT, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    fragmentShader: 'varying float vA; void main(){ float d = length(gl_PointCoord - .5); if (d > .5) discard; gl_FragColor = vec4(vec3(1., .9, .75) * vA * (1. - d * 2.), 1.); }' }));
  motes.frustumCulled = false; scene.add(motes);

  // materials
  const M = {
    floor: new THREE.MeshStandardMaterial({ color: 0x141715, roughness: .82, metalness: 0 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xb9bec0, roughness: .28, metalness: .9 }),
    frame: new THREE.MeshStandardMaterial({ color: 0x2c312e, roughness: .55, metalness: .4 }),
    body: new THREE.MeshStandardMaterial({ color: 0xe9ece9, roughness: .38, metalness: .05 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x232725, roughness: .5, metalness: .3 }),
    green: new THREE.MeshStandardMaterial({ color: 0x009835, roughness: .4, metalness: .05 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x9fd8b8, roughness: .05, metalness: 0, transparent: true, opacity: .1, depthWrite: false }),
    laser: new THREE.MeshBasicMaterial({ color: new THREE.Color(.5, 3.2, 1.3), toneMapped: false }),
    lens: new THREE.MeshBasicMaterial({ color: new THREE.Color(.3, 2, .8), toneMapped: false }),
    tint: new THREE.MeshStandardMaterial({ color: 0x0b1110, roughness: .08, metalness: .3, transparent: true, opacity: .42, depthWrite: false }),
    alu: new THREE.MeshStandardMaterial({ color: 0xc9ced1, roughness: .35, metalness: .8 }),
    cam: new THREE.MeshStandardMaterial({ color: 0x41474c, roughness: .45, metalness: .35 }),
    belt: new THREE.MeshStandardMaterial({ color: 0x1b1d1d, roughness: .9, metalness: 0 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x2b302d, roughness: .75, metalness: 0 }),
    cast: new THREE.MeshStandardMaterial({ color: 0xd3d7d5, roughness: .5, metalness: .1 }),
  };
  // polished concrete in 4 m slabs
  const flCv = document.createElement('canvas'); flCv.width = flCv.height = 512;
  const fc = flCv.getContext('2d'); fc.fillStyle = '#5a5e5b'; fc.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) { const sz = 2 + Math.random() * 30; fc.fillStyle = `rgba(${Math.random() < .5 ? '0,0,0' : '255,255,255'},${Math.random() * .05})`; fc.fillRect(Math.random() * 512, Math.random() * 512, sz, sz); }
  fc.fillStyle = 'rgba(0,0,0,.5)'; fc.fillRect(0, 0, 512, 2); fc.fillRect(0, 0, 2, 512);
  const flTex = tex(flCv, view); flTex.wrapS = flTex.wrapT = THREE.RepeatWrapping; flTex.repeat.set(15, 7.5);
  Object.assign(M.floor, { color: new THREE.Color(0x4a4f4c), map: flTex, roughness: .5, metalness: .1 });
  // yellow and black guard stripes, as on the jointing machine
  const hazCv = document.createElement('canvas'); hazCv.width = 256; hazCv.height = 32;
  const hc = hazCv.getContext('2d'); hc.fillStyle = '#f2c200'; hc.fillRect(0, 0, 256, 32); hc.fillStyle = '#151515';
  for (let x = -32; x < 256; x += 32) { hc.beginPath(); hc.moveTo(x, 32); hc.lineTo(x + 16, 32); hc.lineTo(x + 48, 0); hc.lineTo(x + 32, 0); hc.fill(); }
  const hazMat = new THREE.MeshStandardMaterial({ map: tex(hazCv, view), roughness: .5 });
  // name plates as on the machines: logo, name, a green rule, the model
  const logoImg = new Image(); logoImg.src = '/img/logo.png';
  const namePlate = (title, model, w) => {
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 256;
    const c = cv.getContext('2d'), t = tex(cv, view);
    const draw = () => {
      c.fillStyle = '#e9ece9'; c.fillRect(0, 0, 1024, 256);
      if (logoImg.complete && logoImg.naturalWidth) c.drawImage(logoImg, 24, 40, 176, 176);
      c.fillStyle = '#1b1f1c'; c.font = '600 76px Archivo, Arial, sans-serif'; c.fillText(title, 230, 128);
      c.fillStyle = '#009835'; c.fillRect(230, 150, 760, 8);
      c.fillStyle = '#5b625e'; c.font = '500 44px Archivo, Arial, sans-serif'; c.fillText(model, 230, 212);
      t.needsUpdate = true;
    };
    draw(); if (!logoImg.complete) logoImg.addEventListener('load', draw);
    return new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshStandardMaterial({ map: t, roughness: .45 }));
  };

  // the hall: floor, green walkway lines, columns fading into the dark
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), M.floor);
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const lineMat = new THREE.MeshBasicMaterial({ color: 0x0c6b2c });
  for (const z of [1.5, -3.1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(40, .06), lineMat); m.rotation.x = -Math.PI / 2; m.position.set(5, .002, z); scene.add(m); }
  const tapeMat = new THREE.MeshStandardMaterial({ color: 0xc9a512, roughness: .6 });
  const tape = (x0, z0, x1, z1) => {
    for (const [w, d, x, z] of [[x1 - x0, .05, (x0 + x1) / 2, z0], [x1 - x0, .05, (x0 + x1) / 2, z1], [.05, z1 - z0, x0, (z0 + z1) / 2], [.05, z1 - z0, x1, (z0 + z1) / 2]]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), tapeMat); m.rotation.x = -Math.PI / 2; m.position.set(x, .003, z); m.receiveShadow = true; scene.add(m);
    }
  };
  tape(-.9, -.95, 1.45, 1.35); tape(X_SAW - .85, -1.6, X_SAW + .9, .65); tape(XL - .95, ZL - .55, XR + .95, -.3);
  const colGeo = new THREE.BoxGeometry(.4, 8, .4);
  for (let x = -14; x <= 21; x += 7) { const c = new THREE.Mesh(colGeo, M.dark); c.position.set(x, 4, -7); scene.add(c); }
  const winMat = new THREE.MeshBasicMaterial({ color: 0x1b2a31 }), winGeo = new THREE.PlaneGeometry(2.6, 1.5);
  for (let x = -12.5; x <= 20; x += 3.5) { const w = new THREE.Mesh(winGeo, winMat); w.position.set(x, 5.3, -7.25); scene.add(w); }

  // belt conveyors in and out of the scanner, as in the brochure, then the roller table through the saw and out to the buffer
  const BELT = 2.7, BELT_P = .05, beltLen = BELT - .56;
  const ribCv = document.createElement('canvas'); ribCv.width = 64; ribCv.height = 8;
  const rc = ribCv.getContext('2d'); rc.fillStyle = '#2a2d2c'; rc.fillRect(0, 0, 64, 8); rc.fillStyle = '#161817'; rc.fillRect(0, 0, 10, 8);
  const ribTex = tex(ribCv, view); ribTex.wrapS = THREE.RepeatWrapping; ribTex.repeat.set(beltLen / BELT_P, 1);
  M.belt.map = ribTex;
  for (const sx of [-1, 1]) {
    const cx = sx * (.56 + beltLen / 2);
    const belt = new THREE.Mesh(new THREE.BoxGeometry(beltLen, .04, .3), M.belt); belt.position.set(cx, TABLE - .02, 0); belt.receiveShadow = true; scene.add(belt);
    for (const z of [-.17, .17]) { const f = new THREE.Mesh(new THREE.BoxGeometry(beltLen + .06, .09, .03), M.body); f.position.set(cx, TABLE - .04, z); f.castShadow = f.receiveShadow = true; scene.add(f); }
    for (const lx of [-1, 1]) for (const z of [-.17, .17]) { const l = new THREE.Mesh(new THREE.BoxGeometry(.04, TABLE - .085, .04), M.frame); l.position.set(cx + lx * (beltLen / 2 - .1), (TABLE - .085) / 2, z); l.castShadow = true; scene.add(l); }
  }
  const ROLL = .045, rollGeo = new THREE.CylinderGeometry(ROLL, ROLL, .46, 20).rotateX(Math.PI / 2);
  const xs = []; for (let x = -9; x <= XR - .1; x += .3) if (Math.abs(x) > BELT + .05 && (x < X_SAW + SAW0 - .05 || x > X_SAW + SAW1 + .05)) xs.push(x);
  const rollers = new THREE.InstancedMesh(rollGeo, M.steel, xs.length);
  const tmp = new THREE.Object3D();
  xs.forEach((x, i) => { tmp.position.set(x, TABLE - ROLL, 0); tmp.updateMatrix(); rollers.setMatrixAt(i, tmp.matrix); });
  rollers.receiveShadow = true; scene.add(rollers);
  for (const [x0, x1] of [[-9.2, -BELT], [BELT, X_SAW + SAW0], [X_SAW + SAW1, XR + .06]]) for (const z of [-.26, .26]) { const r = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, .07, .04), M.frame); r.position.set((x0 + x1) / 2, TABLE - .07, z); r.castShadow = r.receiveShadow = true; scene.add(r); }
  const legGeo = new THREE.BoxGeometry(.05, TABLE - .1, .05), legs = [];
  for (let x = -8.6; x <= XR - .2; x += 1.8) if (Math.abs(x) > BELT + .1 && Math.abs(x - X_SAW) > .8) for (const z of [-.26, .26]) legs.push([x, z]);
  const legMesh = new THREE.InstancedMesh(legGeo, M.frame, legs.length);
  legs.forEach(([x, z], i) => { tmp.position.set(x, (TABLE - .1) / 2, z); tmp.updateMatrix(); legMesh.setMatrixAt(i, tmp.matrix); });
  legMesh.castShadow = true; scene.add(legMesh);

  // the board
  const topCv = woodCanvas({ len: L, wid: BW, defects: TOP, seed: 3, rough: true });
  const botCv = woodCanvas({ len: L, wid: BW, defects: BOTTOM, seed: 7, rough: true });
  const sideCv = woodCanvas({ len: L, wid: BT, rows: 48, seed: 11, rough: true });
  const endCv = endGrainCanvas({ wid: BW, thick: BT });
  const woodMat = (cv) => { const t = tex(cv, view); return new THREE.MeshStandardMaterial({ map: t, bumpMap: t, bumpScale: 1.5, roughness: .78, metalness: 0 }); };
  const endMat = woodMat(endCv), sideMat = woodMat(sideCv);
  // The board is already its pieces, each mapped onto its own stretch of the same surface, so it reads as one board until the saw parts them.
  const boardMats = [endMat, endMat, woodMat(topCv), woodMat(botCv), sideMat, sideMat];
  const pieceGeo = (u0, u1) => {
    const len = u1 - u0, g = new THREE.BoxGeometry(len, BT, BW), p = g.attributes.position, uv = g.attributes.uv;
    // faces 2 to 5 (top, bottom, sides) run along the length; some of them run backwards
    for (let i = 8; i < 24; i++) { const x = p.getX(i), f = (u0 + x + len / 2) / L; uv.setX(i, (uv.getX(i) > .5) === (x > 0) ? f : 1 - f); }
    return g;
  };
  for (const pc of PIECES) {
    pc.mesh = new THREE.Mesh(pieceGeo(pc.u0, pc.u1), boardMats);
    pc.mesh.castShadow = pc.mesh.receiveShadow = true;
    pc.local = -L / 2 + (pc.u0 + pc.u1) / 2;
    scene.add(pc.mesh);
  }
  const board = new THREE.Group(); scene.add(board);
  // the plan, drawn on the wood once it is known
  const cutLines = CUTS.map((u) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(.006, .002, BW + .004), new THREE.MeshBasicMaterial({ color: new THREE.Color(.4, 2.6, 1.1), toneMapped: false, transparent: true, opacity: 0 }));
    m.position.set(-L / 2 + u, BT / 2 + .002, 0); board.add(m);
    return m;
  });

  // what the scanner marks on the top face, in the board's own space so the marks travel with it
  const marks = TOP.map((d) => {
    const w = d.type === 'crack' ? d.u1 - d.u0 + .05 : d.r * 3.2, h = d.type === 'crack' ? .035 : d.r * 2.8;
    const g = new THREE.EdgesGeometry(new THREE.PlaneGeometry(w, h)).rotateX(-Math.PI / 2);
    const m = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: new THREE.Color(COLORS[d.name]).multiplyScalar(1.6), transparent: true, opacity: 0, toneMapped: false }));
    m.position.set(-L / 2 + at(d), BT / 2 + .002, d.v);
    board.add(m);
    return m;
  });

  // SOLID SCAN C 4000, after the brochure photo: a tall white cabinet across the line, the board entering through a small
  // dark window in its end wall, tinted glass doors on the long side. Inside, an aluminium portal carries four camera heads.
  const scanner = new THREE.Group(); scene.add(scanner);
  const RB = (w, h, d, r = .025) => new RoundedBoxGeometry(w, h, d, 3, r);
  const part = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; scanner.add(m); return m; };
  const SX = 1.05, SZ = 1.3, PL = .12, ROOF = TABLE * 2.3, WALL = .08;
  const rrect = (p, x, y, w, h, r) => { p.moveTo(x + r, y); p.lineTo(x + w - r, y); p.quadraticCurveTo(x + w, y, x + w, y + r); p.lineTo(x + w, y + h - r); p.quadraticCurveTo(x + w, y + h, x + w - r, y + h); p.lineTo(x + r, y + h); p.quadraticCurveTo(x, y + h, x, y + h - r); p.lineTo(x, y + r); p.quadraticCurveTo(x, y, x + r, y); return p; };
  // a flat panel in the plane across the line, with the board's window cut out of it; extruded along +x
  const OW = .3, OH = .18, OY = TABLE + BT / 2;
  const holed = (w, h, y0, r, depth, bevel) => {
    const s = rrect(new THREE.Shape(), -w / 2, y0, w, h, r);
    s.holes.push(rrect(new THREE.Path(), -OW / 2, OY - OH / 2, OW, OH, .05));
    return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 6 }).rotateY(Math.PI / 2);
  };
  part(RB(SX - .06, PL, SZ - .06, .02), M.dark, 0, PL / 2 + .03, 0);
  for (const fx of [-1, 1]) for (const fz of [-1, 1]) part(new THREE.CylinderGeometry(.025, .03, .04, 12), M.steel, fx * (SX / 2 - .1), .02, fz * (SZ / 2 - .1));
  const wallGeo = holed(SZ - .02, ROOF - PL - .03 - .02, PL + .03, .04, WALL - .02, .012), ringGeo = holed(OW + .08, OH + .08, OY - OH / 2 - .04, .07, .03, .006);
  for (const sx of [-1, 1]) {
    part(wallGeo, M.body, sx < 0 ? -SX / 2 + .01 : SX / 2 - WALL + .01, 0, 0);
    part(ringGeo, M.dark, sx < 0 ? -SX / 2 - .015 : SX / 2 - .015, 0, 0);
  }
  part(RB(SX, .1, SZ, .03), M.body, 0, ROOF - .05, 0);
  const DOOR = SX - 2 * WALL, DH = ROOF - .1 - PL - .03;
  part(new THREE.BoxGeometry(DOOR, DH, .02), M.dark, 0, PL + .03 + DH / 2, -SZ / 2 + .03);
  // two tinted glass doors facing the visitor, framed, each with its long handle at the middle seam
  for (const sx of [-1, 1]) {
    const cx = sx * DOOR / 4, cy = PL + .03 + DH / 2, z = SZ / 2 - .03;
    const pane = new THREE.Mesh(new THREE.BoxGeometry(DOOR / 2 - .05, DH - .06, .008), M.tint); pane.position.set(cx, cy, z); scanner.add(pane);
    for (const fy of [-1, 1]) part(new THREE.BoxGeometry(DOOR / 2 - .01, .03, .025), M.dark, cx, cy + fy * (DH / 2 - .015), z);
    for (const fx of [-1, 1]) part(new THREE.BoxGeometry(.03, DH, .025), M.dark, cx + fx * (DOOR / 4 - .015), cy, z);
    part(new THREE.CylinderGeometry(.009, .009, .34, 10), M.steel, sx * .06, cy + .1, z + .045);
    for (const hy of [-.16, .16]) part(new THREE.BoxGeometry(.012, .012, .04), M.steel, sx * .06, cy + .1 + hy, z + .025);
  }
  // inside: the portal and the four heads, one per face, each a camera with its line laser beside it
  const portal = (w, h, d, x, y, z) => part(new THREE.BoxGeometry(w, h, d), M.alu, x, y, z);
  const PT = TABLE + BT + .44, PB = PL + .05, PZ = .44;
  for (const z of [-PZ, PZ]) portal(.04, PT - PB, .04, 0, (PT + PB) / 2, z);
  for (const y of [PB, PT]) portal(.04, .04, 2 * PZ + .04, 0, y, 0);
  const head = (x, y, z, rx) => {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.x = rx; scanner.add(g);
    const b = new THREE.Mesh(RB(.2, .12, .16, .012), M.cam); b.castShadow = true; g.add(b);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(.026, .03, .03, 20), M.dark); lens.position.set(-.04, -.07, 0); g.add(lens);
    const glassL = new THREE.Mesh(new THREE.CircleGeometry(.02, 20).rotateX(Math.PI / 2), M.lens); glassL.position.set(-.04, -.086, 0); g.add(glassL);
    const em = new THREE.Mesh(new THREE.BoxGeometry(.012, .008, .1), M.lens); em.position.set(.06, -.064, 0); g.add(em);
  };
  // heads look along their local -y at the board
  head(-.04, PT - .1, 0, 0);
  head(-.04, PB + .1, 0, Math.PI);
  head(-.04, OY, PZ - .1, -Math.PI / 2);
  head(-.04, OY, -PZ + .1, Math.PI / 2);
  // the name plate on the infeed end, as on the machine
  const plate = namePlate('SOLID SCAN', 'C 4000', .6);
  plate.rotation.y = -Math.PI / 2; plate.position.set(-SX / 2 - .004, ROOF - .3, -.22); scanner.add(plate);
  // signal tower on the roof; its green light is lit while a board is in the scanner
  part(new THREE.CylinderGeometry(.012, .012, .2, 8), M.steel, -.2, ROOF + .1, -.35);
  const tower = [0x7a1712, 0x7a5a10].map((c, i) => part(new THREE.CylinderGeometry(.034, .034, .055, 16), new THREE.MeshStandardMaterial({ color: c, roughness: .3 }), -.2, ROOF + .3 - i * .058, -.35));
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(.034, .034, .055, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(.1, .6, .25), toneMapped: false }));
  lamp.position.set(-.2, ROOF + .3 - 2 * .058, -.35); scanner.add(lamp);
  tower.push(part(new THREE.CylinderGeometry(.036, .036, .02, 16), M.dark, -.2, ROOF + .337, -.35));

  // four laser fans, one per face, from each head's emitter to the wood
  const sheetU = { uOn: { value: 0 }, uT: { value: 0 } };
  const sheetMat = new THREE.ShaderMaterial({ uniforms: sheetU, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }', fragmentShader: SHEET_FRAG });
  const fan = (len, wide, from, rotZ, rotX) => {
    const g = new THREE.Group(), m = new THREE.Mesh(new THREE.PlaneGeometry(wide, len).translate(0, len / 2, 0), sheetMat);
    m.rotation.y = Math.PI / 2; g.add(m);
    g.position.copy(from); g.rotation.set(rotX, 0, rotZ); scanner.add(g);
  };
  // fans point from the emitter toward the board (their local +y), so each is rotated to face it
  fan(PT - .164 - TABLE - BT, BW + .08, new THREE.Vector3(.02, PT - .164, 0), Math.PI, 0);
  fan(TABLE - PB - .164, BW + .08, new THREE.Vector3(.02, PB + .164, 0), 0, 0);
  fan(PZ - .164 - BW / 2, BT + .06, new THREE.Vector3(.02, OY, -PZ + .164), 0, Math.PI / 2);
  fan(PZ - .164 - BW / 2, BT + .06, new THREE.Vector3(.02, OY, PZ - .164), 0, -Math.PI / 2);

  // the lines the lasers draw on the wood, at the scanner's plane
  const lines = new THREE.Group(); scene.add(lines);
  const lb = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M.laser); m.position.set(x, y, z); lines.add(m); };
  lb(.005, .002, BW + .002, 0, TABLE + BT + .001, 0);
  lb(.005, BT + .002, .002, 0, TABLE + BT / 2, BW / 2 + .001);
  lb(.005, BT + .002, .002, 0, TABLE + BT / 2, -BW / 2 - .001);

  // the digital twin above the outfeed
  const twinTex = tex(twinCanvas(topCv, botCv, sideCv), view);
  const twinU = { map: { value: twinTex }, plan: { value: tex(planCanvas(), view) }, uReveal: { value: 0 }, uOn: { value: 0 }, uPlan: { value: 0 }, uT: sheetU.uT };
  const twin = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.4625), new THREE.ShaderMaterial({ uniforms: twinU, transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }', fragmentShader: TWIN_FRAG }));
  twin.position.set(2.5, TABLE + .98, -.95); twin.rotation.y = -.12; scene.add(twin);
  // the operator terminal beside the scanner, on its wheeled column; its screen shows the same twin
  const term = new THREE.Group(); term.position.set(1.0, 0, 1.0); term.rotation.y = -.45; scene.add(term);
  const tpart = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; term.add(m); return m; };
  for (const r of [0, Math.PI / 2]) tpart(new THREE.BoxGeometry(.42, .03, .05), M.dark, 0, .05, 0).rotation.y = r;
  tpart(new THREE.CylinderGeometry(.035, .04, 1.05, 16), M.dark, 0, .58, 0);
  tpart(RB(.5, .32, .05, .012), M.dark, 0, 1.2, .02).rotation.x = -.2;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(.45, .253), twin.material); screen.position.set(0, 1.205, .05); screen.rotation.x = -.2; term.add(screen);
  // light thread from the scanner up to the twin: the data leaving the machine
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.004, .004, 1, 6), M.laser);
  scene.add(beam);
  const beamFrom = new THREE.Vector3(.3, ROOF, -.3), beamTo = new THREE.Vector3(1.22, TABLE + .4, -.9);
  beam.position.copy(beamFrom).lerp(beamTo, .5); beam.scale.y = beamFrom.distanceTo(beamTo);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), beamTo.clone().sub(beamFrom).normalize());

  // SOLID CUT TF 2000, an optimising cross-cut saw. Five driven rollers below and pressure rollers above carry the board to
  // each cut, the Ø 500 mm blade rises pneumatically from under the table, and compressed air blows the waste off the back.
  const saw = new THREE.Group(); saw.position.x = X_SAW; scene.add(saw);
  const spart = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; saw.add(m); return m; };
  const CW = SAW1 - SAW0, CM = (SAW0 + SAW1) / 2, CZ = .9, G0 = TABLE - .08, G1 = TABLE + .14, UH = .6;
  // lower cabinet, black and glazed at the front, so the blade and its cylinder show
  spart(RB(CW - .04, .1, CZ - .04, .02), M.dark, CM, .05, 0);
  spart(new THREE.BoxGeometry(CW, G0 - .1, .03), M.dark, CM, (G0 + .1) / 2, -CZ / 2 + .015);
  for (const x of [SAW0 + .02, SAW1 - .02]) spart(RB(.04, G0 - .1, CZ, .012), M.dark, x, (G0 + .1) / 2, 0);
  for (const [x0, x1] of [[SAW0, -.015], [.015, SAW1]]) spart(new THREE.BoxGeometry(x1 - x0, .03, CZ), M.frame, (x0 + x1) / 2, G0 - .015, 0);
  const lowPane = new THREE.Mesh(new THREE.BoxGeometry(CW - .08, G0 - .18, .008), M.tint); lowPane.position.set(CM, (G0 + .1) / 2, CZ / 2 - .01); saw.add(lowPane);
  // corner posts carry the upper housing over the tunnel the board runs through
  for (const x of [SAW0 + .03, SAW1 - .03]) for (const z of [-CZ / 2 + .03, CZ / 2 - .03]) spart(new THREE.BoxGeometry(.05, G1 - G0 + .02, .05), M.dark, x, (G0 + G1) / 2, z);
  // upper housing, white, with a window over the feed and the cut
  spart(RB(CW, UH, .04, .015), M.body, CM, G1 + UH / 2, -CZ / 2 + .02);
  for (const x of [SAW0 + .02, SAW1 - .02]) spart(RB(.04, UH, CZ, .015), M.body, x, G1 + UH / 2, 0);
  spart(RB(CW + .02, .06, CZ + .02, .02), M.body, CM, G1 + UH + .03, 0);
  spart(RB(CW + .03, .02, CZ + .03, .008), M.green, CM, G1 + UH - .01, 0);
  spart(RB(CW, .05, .04, .012), M.body, CM, G1 + .025, CZ / 2 - .02);
  spart(RB(CW, .17, .04, .012), M.body, CM, G1 + UH - .085, CZ / 2 - .02);
  const upPane = new THREE.Mesh(new THREE.BoxGeometry(CW - .08, UH - .22, .008), M.tint); upPane.position.set(CM, G1 + .05 + (UH - .22) / 2, CZ / 2 - .02); saw.add(upPane);
  const sawPlate = namePlate('SOLID CUT', 'TF 2000', .5); sawPlate.position.set(SAW0 + .32, G1 + UH - .085, CZ / 2 + .001); saw.add(sawPlate);
  const sawLamp = new THREE.PointLight(0xfff0d8, 1.4, 1.6, 2); sawLamp.position.set(-.1, TABLE + .4, .25); saw.add(sawLamp);
  const sawLamp2 = new THREE.PointLight(0xfff0d8, 1, 1.2, 2); sawLamp2.position.set(0, .35, .3); saw.add(sawLamp2);
  // the feed: five driven rollers under the board, three pressure rollers on pneumatic arms above it
  const FR = .04, spin = [];
  const roller = (x, y, len, mat, dir) => { const m = spart(new THREE.CylinderGeometry(FR, FR, len, 20).rotateX(Math.PI / 2), mat, x, y, 0); spin.push([m, dir]); };
  for (let i = 0; i < 5; i++) roller(-.6 + i * .1, TABLE - FR, .3, M.rubber, -1);
  for (const x of [.14, .28]) roller(x, TABLE - FR, .3, M.steel, -1);
  for (const x of [-.55, -.4, -.25]) {
    roller(x, TABLE + BT + FR, .16, M.rubber, 1);
    for (const z of [-.095, .095]) spart(new THREE.BoxGeometry(.05, .09, .01), M.frame, x, TABLE + BT + FR + .025, z);
    spart(new THREE.BoxGeometry(.06, .02, .2), M.frame, x, TABLE + BT + FR + .075, 0);
    spart(new THREE.CylinderGeometry(.012, .012, .12, 10), M.steel, x, TABLE + BT + FR + .14, 0);
    spart(new THREE.CylinderGeometry(.028, .028, .16, 16), M.alu, x, TABLE + BT + FR + .28, 0);
  }
  // the hold-down over the cut
  const press = spart(RB(.1, .12, .3, .02), M.dark, 0, TABLE + .3, 0);
  spart(new THREE.CylinderGeometry(.03, .03, .2, 16), M.alu, 0, G1 + .36, 0);
  // the blade, Ø 500 mm, in the plane across the board; motor and carriage ride on the cylinder's rod
  const BR = .25, teeth = 56, blShape = new THREE.Shape();
  for (let i = 0; i <= teeth * 2; i++) { const ang = (i / (teeth * 2)) * Math.PI * 2, r = i % 2 ? BR - .022 : BR; const fn = i ? 'lineTo' : 'moveTo'; blShape[fn](Math.cos(ang + (i % 2 ? .03 : 0)) * r, Math.sin(ang) * r); }
  blShape.holes.push(new THREE.Path().absarc(0, 0, .03, 0, Math.PI * 2, true));
  const bladeGeo = new THREE.ExtrudeGeometry(blShape, { depth: .005, bevelEnabled: false, curveSegments: 4 }).translate(0, 0, -.0025).rotateY(Math.PI / 2);
  const carriage = new THREE.Group(); saw.add(carriage);
  const blade = new THREE.Group(); carriage.add(blade);
  const bladeDisc = new THREE.Mesh(bladeGeo, new THREE.MeshStandardMaterial({ color: 0xd7dcde, roughness: .22, metalness: 1 })); bladeDisc.castShadow = true; blade.add(bladeDisc);
  blade.add(new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .03, 24).rotateZ(Math.PI / 2), M.green));
  const motor = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, .2, 24).rotateZ(Math.PI / 2), M.dark); motor.position.x = .13; carriage.add(motor);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(.08, .05, .05), M.frame); arm.position.x = .27; carriage.add(arm);
  const rod = spart(new THREE.CylinderGeometry(.012, .012, 1, 10), M.steel, .27, 0, 0);
  spart(new THREE.CylinderGeometry(.035, .035, .2, 16), M.alu, .27, .22, 0);
  const BLADE_DOWN = TABLE - .36, BLADE_UP = TABLE - .18, ROD0 = .32;
  // chips thrown off the blade
  const DN = isMobile() ? 120 : 260, dseed = new Float32Array(DN * 3);
  for (let i = 0; i < DN * 3; i++) dseed[i] = Math.random();
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dseed, 3));
  const chips = (origin, side) => {
    const u = { uT: sheetU.uT, uOn: { value: 0 }, uPR: { value: view.getPixelRatio() * 2 }, uSide: { value: side }, uO: { value: origin } };
    const pts = new THREE.Points(dg, new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, vertexShader: DUST_VERT, fragmentShader: CHIP_FRAG }));
    pts.frustumCulled = false; scene.add(pts);
    return u;
  };
  const dustU = chips(new THREE.Vector3(X_SAW, TABLE + .06, 0), 1);
  // compressed air: the nozzle in front of the outfeed blows each defect piece off the back of the table
  spart(new THREE.CylinderGeometry(.012, .012, .16, 10).rotateX(Math.PI / 2), M.steel, .2, TABLE + .07, CZ / 2 - .12);
  const airU = { uT: sheetU.uT, uOn: { value: 0 }, uPR: dustU.uPR, uO: { value: new THREE.Vector3(X_SAW + .2, TABLE + .07, CZ / 2 - .2) } };
  const air = new THREE.Points(dg, new THREE.ShaderMaterial({ uniforms: airU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexShader: AIR_VERT,
    fragmentShader: 'varying float vA; void main(){ float d = length(gl_PointCoord - .5); if (d > .5) discard; gl_FragColor = vec4(vec3(.75, .85, .9) * vA * (1. - d * 2.), 1.); }' }));
  air.frustumCulled = false; scene.add(air);
  // the chute behind the machine and the waste bin at its foot
  spart(new THREE.BoxGeometry(.7, .015, .6), M.steel, .25, TABLE - .17, -CZ / 2 - .25).rotation.x = -.55;
  const bin = new THREE.Group(); bin.position.set(X_SAW + .3, 0, -1.15); scene.add(bin);
  const bpart = (w, h, d, x, y, z, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; bin.add(m); };
  bpart(1.1, .04, .7, 0, .02, 0, M.dark);
  bpart(1.1, .5, .03, 0, .25, .335, M.green); bpart(1.1, .5, .03, 0, .25, -.335, M.green);
  bpart(.03, .5, .7, -.535, .25, 0, M.green); bpart(.03, .5, .7, .535, .25, 0, M.green);

  // SOLID JOINT PS 2000, after the photos on its product page: the clear pieces stand on edge as a package and pass a scoring
  // saw and the finger cutter, first at their right ends, then at their left, get glue, and the press pushes them into one lamella.
  const joint = new THREE.Group(); scene.add(joint);
  const jpart = (geo, mat, x, y, z, parent = joint) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
  // package table: a plate with two chains, and a fence for each end
  const TZ0 = -.2, TZ1 = ZL - .45, TX = (XL + XR) / 2;
  jpart(new THREE.BoxGeometry(XR - XL + .12, .03, TZ0 - TZ1), M.frame, TX, TABLE - .015, (TZ0 + TZ1) / 2);
  for (const x of [XL + .18, XR - .18]) jpart(new THREE.BoxGeometry(.03, .012, TZ0 - TZ1), M.dark, x, TABLE - .004, (TZ0 + TZ1) / 2);
  for (const x of [XL - .02, XR + .02]) for (const z of [TZ0 - .05, (TZ0 + TZ1) / 2, TZ1 + .05]) jpart(new THREE.BoxGeometry(.05, TABLE - .03, .05), M.frame, x, (TABLE - .03) / 2, z);
  jpart(new THREE.BoxGeometry(.025, .07, .47), M.steel, XR + .0125, TABLE + .035, -.435);
  jpart(new THREE.BoxGeometry(.025, .07, .4), M.steel, XL - .0125, TABLE + .035, -1.2);
  // the finger cutter: a stack of discs, one ridge per finger, turning on a vertical spindle
  const RC = .1, prof = [new THREE.Vector2(.03, -BW / 2 - .01)];
  for (let j = 0; j <= NF * 2; j++) prof.push(new THREE.Vector2(j % 2 ? RC - FL : RC, (j / (NF * 2) - .5) * BW));
  prof.push(new THREE.Vector2(.03, BW / 2 + .01));
  const cutterGeo = new THREE.LatheGeometry(prof, 40), scorerGeo = new THREE.CylinderGeometry(.075, .075, .004, 40);
  const glueMat = () => new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, .95, .35), toneMapped: false, transparent: true, opacity: .15 });
  // side 1 works the right ends against XR, side -1 the left ends against XL
  const unit = (side, z) => {
    const xe = side > 0 ? XR : XL, g = new THREE.Group(); g.position.set(xe, 0, z); joint.add(g);
    const up = (geo, mat, x, y, zz) => jpart(geo, mat, side * x, y, zz, g);
    up(RB(.62, 1.3, .8, .03), M.cast, .53, .65, 0);
    up(RB(.48, .3, .46, .03), M.cast, .2, TABLE + BW + .2, 0);
    up(new THREE.CylinderGeometry(.02, .02, .06, 12), M.steel, RC - FL, TABLE + BW + .03, 0);
    up(new THREE.CylinderGeometry(.04, .05, TABLE - .02, 16), M.cast, RC - FL, (TABLE - .02) / 2, 0);
    up(new THREE.BoxGeometry(.6, .07, .004), hazMat, .53, TABLE + .12, .402);
    up(new THREE.BoxGeometry(.06, .1, .06), M.cast, .075, TABLE + BW + .06, .22);
    up(new THREE.BoxGeometry(.05, BW + .03, .06), M.dark, .045, TABLE + BW / 2, -.22);
    const badge = namePlate('SOLID JOINT', 'PS 2000', .44); badge.position.set(side * .53, 1.08, .402); g.add(badge);
    const cut = new THREE.Mesh(cutterGeo, M.steel); cut.position.set(side * (RC - FL), TABLE + BW / 2, 0); cut.castShadow = true; g.add(cut);
    for (let k = 0; k < 6; k++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(.012, BW + .004, .03), M.dark), a = (k / 6) * Math.PI * 2;
      s.position.set(Math.cos(a) * (RC - .012), 0, Math.sin(a) * (RC - .012)); s.rotation.y = -a; cut.add(s);
    }
    const scorer = new THREE.Mesh(scorerGeo, M.steel); scorer.position.set(side * (.075 - FL / 2), TABLE + BW - .01, .22); g.add(scorer);
    const notch = new THREE.Mesh(new THREE.BoxGeometry(.03, .006, .01), M.dark); notch.position.x = .06; scorer.add(notch);
    const glue = new THREE.Mesh(new THREE.BoxGeometry(.006, BW, .02), glueMat()); glue.position.set(side * .012, TABLE + BW / 2, -.22); g.add(glue);
    return { cut, scorer, glue, z, chips: chips(new THREE.Vector3(xe + side * .02, TABLE + BW / 2, z), -side) };
  };
  const UR = unit(1, ZR), UL = unit(-1, ZL);
  // the press: a roller bed, a hold-down beam over the back of the lamella, a pusher at the infeed
  const PX0 = XJ - 1.3, PX1 = XJ + 7.5;
  const pxs = []; for (let x = PX0 + .1; x < PX1; x += .25) pxs.push(x);
  const bed = new THREE.InstancedMesh(rollGeo, M.steel, pxs.length);
  pxs.forEach((x, i) => { tmp.position.set(x, TABLE - ROLL, ZP); tmp.updateMatrix(); bed.setMatrixAt(i, tmp.matrix); });
  bed.receiveShadow = true; scene.add(bed);
  for (const z of [ZP - .26, ZP + .26]) jpart(new THREE.BoxGeometry(PX1 - PX0, .09, .04), M.cast, (PX0 + PX1) / 2, TABLE - .06, z);
  for (let x = PX0 + .2; x < PX1; x += 1.4) for (const z of [ZP - .26, ZP + .26]) jpart(new THREE.BoxGeometry(.05, TABLE - .1, .05), M.frame, x, (TABLE - .1) / 2, z);
  const hold = new THREE.Group(); joint.add(hold);
  jpart(new THREE.BoxGeometry(PX1 - PX0 - .4, .04, .05), M.steel, (PX0 + PX1) / 2, 0, ZP - .045, hold);
  for (let x = PX0 + .5; x < PX1; x += 1.4) {
    jpart(new THREE.CylinderGeometry(.03, .03, .3, 16), M.alu, x, .17, ZP - .045, hold);
    jpart(new THREE.BoxGeometry(.06, TABLE + .45, .06), M.cast, x, (TABLE + .45) / 2, ZP - .32);
    jpart(new THREE.BoxGeometry(.06, .05, .32), M.cast, x, TABLE + .42, ZP - .18);
  }
  const pusher = jpart(RB(.08, .08, .18, .015), M.green, XJ - 1, TABLE + .05, ZP);
  jpart(new THREE.CylinderGeometry(.03, .03, .5, 16).rotateZ(Math.PI / 2), M.alu, PX0 - .15, TABLE + .05, ZP);
  // the lamella already in the press, jointed from earlier boards
  const lamMat = [woodMat(woodCanvas({ len: L, wid: BW, seed: 23, rough: true })), sideMat];
  let lu = 0;
  const OLD = [.62, .55, .68, .47, .6, .58].map((len) => { const o = { u0: lu, u1: lu + len, len }; lu += len; return o; });
  OLD.forEach((o, k) => {
    o.c = k ? OLD[k - 1].c + (OLD[k - 1].len + o.len) / 2 - FL : XJ + o.len / 2;
    o.mesh = new THREE.Mesh(fingerGeo(o, true, true), lamMat); o.mesh.castShadow = o.mesh.receiveShadow = true; scene.add(o.mesh);
  });

  // labels on the physical board, in the page so they stay sharp and readable
  const tagLayer = stage.querySelector('.tags');
  const makeTag = (text, color) => { const el = document.createElement('span'); el.className = 'tag'; el.textContent = text; el.style.setProperty('--c', color); tagLayer.append(el); return el; };
  const tags = TOP.map((d) => makeTag(d.tag, COLORS[d.name]));
  PIECES.forEach((pc) => { pc.tag = makeTag(pc.good ? `${pc.mm} mm` : 'Ausschuss', pc.good ? '#3ee07a' : '#ff5d4f'); });
  const tagZ = makeTag('Vertikalzinken · 15 mm', '#3ee07a'), tagLam = makeTag(`Lamelle · ${Math.round(BW * 1000)} × ${Math.round(BT * 1000)} mm`, '#3ee07a');

  // the camera's route, one key per step; phones stand further back so the machine fits under the copy
  const KEYS = [
    { p: 0, pos: [-6.4, 1.55, 3.2], look: [-3.6, .62, 0] },
    { p: 1, pos: [-3.7, 1.95, 3.9], look: [-.15, 1.0, 0] },
    { p: 2, pos: [.9, 1.85, 4.9], look: [1.6, 1.2, -.4] },
    { p: 3, pos: [2.05, 1.7, 4.1], look: [2.4, 1.32, -.7] },
    { p: 4, pos: [X_SAW - 1.7, 1.55, 3.1], look: [X_SAW + .1, .85, 0], lens: .92 },
    { p: 5, pos: [X_SAW + 1.8, 2.4, 4.2], look: [X_SAW + 3.4, .7, -.3] },
    { p: 5.5, pos: [XR + 1.3, 1.75, 1.3], look: [XR - .3, .85, -.6] },
    { p: 5.95, pos: [XR - .75, 1.35, 0], look: [XR - .02, .84, ZR], lens: .9 },
    { p: 6.45, pos: [XL + .9, 1.4, -.3], look: [XL - .05, .86, ZL], lens: .88 },
    { p: 7.05, pos: [XJ - .35, 1.75, -.7], look: [XJ + .15, .78, ZP], lens: .85 },
    { p: 7.45, pos: [XJ + 1.6, 2.1, -.75], look: [XJ + 1.5, .8, ZP] },
    { p: 8, pos: [XJ + 2.8, 1.8, -.3], look: [XJ + 4.2, .78, ZP] },
  ];
  const pos = new THREE.Vector3(), look = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3();
  const posPath = new THREE.CatmullRomCurve3(KEYS.map((k) => new THREE.Vector3(...k.pos)), false, 'centripetal');
  const lookPath = new THREE.CatmullRomCurve3(KEYS.map((k) => new THREE.Vector3(...k.look)), false, 'centripetal');
  let lens = 1, baseFov = 32;
  const route = (p) => {
    let i = 0; while (i < KEYS.length - 2 && p >= KEYS[i + 1].p) i++;
    const k0 = KEYS[i], k1 = KEYS[i + 1], f = THREE.MathUtils.clamp((p - k0.p) / (k1.p - k0.p), 0, 1);
    // eased inside each shot so the camera settles where the copy points, yet never stops dead at a key
    const u = (i + lerp(f, S(0, 1, f), .6)) / (KEYS.length - 1);
    posPath.getPoint(u, pos); lookPath.getPoint(u, look);
    lens = lerp(k0.lens ?? 1, k1.lens ?? 1, S(0, 1, f));
    if (stacked()) pos.sub(look).multiplyScalar(1.85).add(look);
  };

  const fit = () => {
    const w = stage.clientWidth, h = stage.clientHeight;
    view.setSize(w, h); camera.aspect = w / h;
    camera.fov = baseFov = stacked() ? 40 : 32;
    frameStage(camera, w, h, .16, -.16);
    camera.updateProjectionMatrix();
  };
  addEventListener('resize', fit); fit();

  // counters in the panel
  const counts = { Ast: stage.querySelector('#nAst'), Riss: stage.querySelector('#nRiss'), Bläue: stage.querySelector('#nBlaeue') };
  let lastFound = '';

  const state = { p: 0 };
  // Saw timing: after a run-in, one slot per cut. In each slot the board is pushed until the cut sits over the blade, then the blade rises.
  const CUT_AT = 3.4, SLOT = .2, Y = TABLE + BT / 2;
  const cxCut = (k) => X_SAW + L / 2 - CUTS[k];
  const cutDone = (k) => CUT_AT + k * SLOT + SLOT * .75;
  const boardX = (p) => {
    if (p < 3) return p < 1 ? lerp(-5.4, -2.15, S(0, 1, p)) : p < 2 ? lerp(-2.15, 2.2, p - 1) : lerp(2.2, 2.55, S(0, 1, p - 2));
    if (p < CUT_AT) return lerp(2.55, cxCut(0), S(0, 1, (p - 3) / (CUT_AT - 3)));
    const k = Math.min(Math.floor((p - CUT_AT) / SLOT), CUTS.length - 1), tau = (p - CUT_AT - k * SLOT) / SLOT;
    return k === 0 || tau >= .5 ? cxCut(k) : lerp(cxCut(k - 1), cxCut(k), S(0, .5, tau));
  };
  const bladeLift = (p) => {
    const k = Math.floor((p - CUT_AT) / SLOT), tau = (p - CUT_AT - k * SLOT) / SLOT;
    return k < 0 || k >= CUTS.length || tau < .5 ? 0 : Math.sin(Math.PI * (tau - .5) / .5);
  };
  // a piece is free once the cut on its left is made; the first piece once the last cut frees the rest
  PIECES.forEach((pc) => { pc.k = CUTS.indexOf(pc.u0 > 0 ? pc.u0 : pc.u1); pc.free = cutDone(pc.k); });
  const WASTE = PIECES.filter((pc) => !pc.good);
  // Station 3 timing. The pieces leave the outfeed in the order they lie, furthest first, and stand on edge in the package;
  // the package passes the right cutter, is pushed against the left fence, passes the left cutter, then each piece enters the press.
  const J_IN = 5, J_R = [5.62, 6], J_AL = [6, 6.12], J_L = [6.14, 6.5], J_P = 6.56, J_PS = .14, EXIT = [7.5, 8];
  const G = PIECES.filter((pc) => pc.good).sort((m, n) => n.dest - m.dest), fingMat = [boardMats[2], sideMat];
  G.forEach((pc, i) => {
    Object.assign(pc, { gi: i, len: pc.u1 - pc.u0, tIn: J_IN + i * .11, tP: J_P + i * J_PS, slot: -.32 - (G.length - 1 - i) * (BT + .012), fing: 0 });
    pc.gR = fingerGeo(pc, true, false); pc.gB = fingerGeo(pc, true, true);
  });
  // how far the lamella has moved on: each new piece, once home, carries the line forward by its length less the finger overlap
  const advance = (p, from = 0) => G.slice(from).reduce((s, q) => s + (q.len - FL) * S(q.tP + .09, q.tP + .14, p), 0);
  function jointPose(pc, p, m, exitX) {
    const a = S(pc.tIn, pc.tIn + .1, p), b = S(pc.tIn + .1, pc.tIn + .22, p);
    let x = lerp(lerp(pc.dest, XR - pc.len / 2, a), XL + pc.len / 2, S(J_AL[0], J_AL[1], p));
    let z = lerp(0, pc.slot, b) - .8 * S(J_R[0], J_R[1], p) - .66 * S(J_L[0], J_L[1], p), y = lerp(Y, TABLE + BW / 2, b), rx = Math.PI / 2 * b;
    const e1 = S(pc.tP, pc.tP + .05, p), e2 = S(pc.tP + .05, pc.tP + .08, p);
    if (e1 > 0) {
      // down onto the press bed beside the infeed, pushed home into the tail, then on with the lamella
      x = lerp(lerp(x, XJ - GAP - pc.len / 2, e1), XJ + FL - pc.len / 2, e2) + advance(p, pc.gi) + exitX;
      z = lerp(z, ZP, e1); y = lerp(y, Y, e1); rx = lerp(rx, 0, e1);
    }
    m.position.set(x, y, z); m.rotation.set(rx, 0, 0);
    // the fingers are there once the piece has passed each cutter
    const f = z < ZL ? 2 : z < ZR ? 1 : 0;
    if (f !== pc.fing) { pc.fing = f; m.geometry = f === 2 ? pc.gB : pc.gR; m.material = fingMat; }
  }
  const v3 = new THREE.Vector3();
  function update(t) {
    const p = state.p, cx = boardX(p);
    board.position.set(cx, Y, 0);
    // the belts run with the board
    ribTex.offset.x = -cx / BELT_P;
    const w = stage.clientWidth, h = stage.clientHeight, exitX = 7 * Math.max(0, Math.min(1, (p - EXIT[0]) / (EXIT[1] - EXIT[0]))) ** 2;
    let air = 0;
    const project = (x, y, z, el, o) => { v3.set(x, y, z).project(camera); el.style.opacity = o; el.style.transform = `translate(${((v3.x + 1) / 2 * w).toFixed(1)}px, ${((1 - v3.y) / 2 * h).toFixed(1)}px)`; };
    for (const pc of PIECES) {
      const m = pc.mesh, dt = p - pc.free;
      if (dt < 0) { m.position.set(cx + pc.local, Y, 0); m.rotation.set(0, 0, 0); }
      else if (pc.good && p >= pc.tIn) jointPose(pc, p, m, exitX);
      else {
        const xf = cxCut(pc.k) + pc.local;
        if (pc.good) { m.position.set(lerp(xf, pc.dest, S(0, .35, dt)), Y, 0); m.rotation.set(0, 0, 0); }
        else {
          // compressed air blows the waste off the back of the table, down the chute into the bin
          const d = S(0, .1, dt), n = WASTE.indexOf(pc);
          m.position.set(xf + .06 * d, lerp(Y, .065 + .05 * n, S(.3, 1, d)) + .1 * Math.sin(Math.PI * Math.min(d / .5, 1)), lerp(0, -1.15, S(0, .85, d)));
          m.rotation.set(-Math.PI * S(0, .9, d), .2 * d, .3 * d * (n % 2 ? 1 : -1));
          if (dt < .07) air = 1;
        }
      }
      project(m.position.x, m.position.y + .06, m.position.z, pc.tag, S(0, .05, dt) * (pc.good ? 1 - S(J_IN, J_IN + .1, p) : 1 - S(.12, .2, dt)));
    }
    const lift = bladeLift(p), by = lerp(BLADE_DOWN, BLADE_UP, lift);
    carriage.position.y = by; rod.position.y = (ROD0 + by - .025) / 2; rod.scale.y = Math.max(by - .025 - ROD0, .001);
    blade.rotation.x = -t * 28;
    press.position.y = TABLE + BT + .06 + (1 - Math.min(lift * 3, 1)) * .08;
    dustU.uOn.value = S(.4, .9, lift);
    airU.uOn.value += (air - airU.uOn.value) * .3;
    for (const [m, d] of spin) m.rotation.z = (d * cx) / FR;
    // station 3: cutters turn, chips fly and glue shows while a piece passes, the press closes, the lamella leaves
    for (const u of [UR, UL]) {
      u.cut.rotation.y = t * 30; u.scorer.rotation.y = -t * 40;
      const near = (zz) => G.some((pc) => p >= pc.tIn && p < pc.tP && Math.abs(pc.mesh.position.z - zz) < .07);
      u.chips.uOn.value += ((near(u.z) ? 1 : 0) - u.chips.uOn.value) * .3;
      u.glue.material.opacity = near(u.z - .22) ? .95 : .15;
    }
    const pulse = S(7.12, 7.17, p) * (1 - S(7.27, 7.33, p));
    hold.position.y = TABLE + BT + .02 + .04 * (1 - pulse);
    const lam = advance(p) + exitX;
    OLD.forEach((o) => o.mesh.position.set(o.c + lam, Y, ZP));
    let push = XJ - 1;
    for (const pc of G) {
      const k = S(pc.tP + .03, pc.tP + .05, p) * (1 - S(pc.tP + .14, pc.tP + .17, p));
      if (k > 0) push = lerp(XJ - 1, pc.mesh.position.x - pc.len / 2 - .045, k);
    }
    pusher.position.x = push;
    project(XR - .02, TABLE + BW + .05, ZR, tagZ, S(5.66, 5.72, p) * (1 - S(6.02, 6.1, p)));
    project(XJ + .5, Y + .06, ZP, tagLam, S(7.12, 7.2, p) * (1 - S(7.45, 7.55, p)));
    cutLines.forEach((m, k) => { m.material.opacity = S(2.75, 2.95, p) * (p < cutDone(k) ? 1 : 0); });
    twinU.uPlan.value = S(2.55, 2.95, p);
    const scanning = cx - L / 2 < 0 && cx + L / 2 > 0, on = scanning ? 1 : 0;
    sheetU.uOn.value += (on - sheetU.uOn.value) * .2;
    lines.visible = scanning;
    glow.intensity = sheetU.uOn.value * 1.4;
    lamp.material.color.setRGB(.08, .5 + sheetU.uOn.value * 1.8, .18 + sheetU.uOn.value * .25);
    twinU.uReveal.value = THREE.MathUtils.clamp((cx + L / 2) / L, 0, 1);
    twinU.uOn.value = S(.85, 1.25, p);
    beam.visible = scanning;
    // a defect counts as found once it has passed the laser plane
    const found = { Ast: 0, Riss: 0, Bläue: 0 };
    ALL.forEach((d) => { if (cx - L / 2 + at(d) > 0) found[d.name]++; });
    const key = JSON.stringify(found);
    if (key !== lastFound) { lastFound = key; for (const n in found) if (counts[n]) counts[n].textContent = found[n]; }
    TOP.forEach((d, i) => {
      const passed = cx - L / 2 + at(d), shown = S(0, .15, passed) * (1 - S(2.6, 2.9, p));
      marks[i].material.opacity = shown;
      project(cx - L / 2 + at(d), TABLE + BT + .05, d.v, tags[i], shown);
    });
    route(p);
    // a little life from the pointer on desktop; phones get none and lose nothing
    if (!reduce) pos.add(v3.set(Math.sin(t * .37) * .035, Math.sin(t * .51) * .02, Math.cos(t * .29) * .03));
    camera.position.copy(pos).add(v3.set(pointer.x * .25, pointer.y * .12, 0));
    camera.lookAt(look);
    camera.fov = baseFov * lens; camera.updateProjectionMatrix();
    moteU.uT.value = t;
    sheetU.uT.value = t;
  }

  // scroll drives the whole station
  const panels = [...stage.querySelectorAll('.panels article')], show = panelSwitcher(panels);
  const tl = gsap.to(state, { p: STEPS, ease: 'none', scrollTrigger: { trigger: root, start: 'top top', end: () => `+=${innerHeight * 11}`, pin: stage, scrub: reduce ? true : 1, anticipatePin: 1 } });
  stageProgress(stage, tl);
  show(0);

  update(0);
  // the copy follows the picture, which trails the scroll by the scrub, so it is switched from the frame loop
  whileVisible(root, (t) => { update(t); show(state.p < .55 ? 0 : state.p < 1.45 ? 1 : state.p < 2.4 ? 2 : state.p < 3.3 ? 3 : state.p < 4.65 ? 4 : state.p < 5.45 ? 5 : state.p < 6.6 ? 6 : 7); view.render(scene, camera); });
  queueWarm('line', view, scene, camera, root);
  view.render(scene, camera);
}
