// The planer. The lamella from the finger-jointing line runs through a SOLID PROFILE P 700 and comes out with all four sides finished.
// Each spindle is a plane across the feed: behind it the wood keeps its old cross-section, after it the new one. So the picture shows
// what every spindle takes off. Scroll drives it all, the same on a phone as with a mouse.
import * as THREE from 'three';
import gsap from 'gsap';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { tr, reduce, isMobile, pr, stacked, frameStage, whileVisible, stageView, queueWarm, panelSwitcher, stageProgress, sectionHud } from './core.js';
import { woodCanvas, endGrainCanvas } from './wood.js';

// the table height and the lamella match the end of the finger-jointing line
const TABLE = .75, LEN = 4.2, STEPS = 5;
// raw lamella 140 x 45 mm, planed to 132 x 40 mm; z runs across the feed, the fence is on the -z side
const Z0 = -.07, Z1 = .07, Z1P = .062, T0 = .045, T1 = .04;
// finger joints from the line before, every half metre or so: vertical fingers, 15 mm long, 24 across the width
const JOINTS = [.45, 1.0, 1.62, 2.2, 2.75, 3.4], FINGER = .015, FINGERS = 24, WID = .2;
// the spindles in the order the wood meets them: bottom, right (fence), left, top, profile
const SP = [
  { x: -1.15, name: tr('Unten · Abrichten', 'Bottom · Surfacing') },
  { x: -.75, name: tr('Rechts · Fügen', 'Right · Edging') },
  { x: -.35, name: tr('Links · Breite', 'Left · Width') },
  { x: .1, name: tr('Oben · Dicke', 'Top · Thickness') },
  { x: .65, name: tr('Profilspindel', 'Profile spindle') },
];
// which faces are planed behind each spindle: bottom, fence side, front side, top
const DONE = [[0, 0, 0, 0], [1, 0, 0, 0], [1, 1, 0, 0], [1, 1, 1, 0], [1, 1, 1, 1]];

// finished cross-sections in (z, y), z from 0 at the fence; shifted onto the fence below
const mm = (pts) => pts.map(([z, y]) => [z / 1000 + Z0, y / 1000]);
const PROFILES = [
  // floorboard: tongue and groove on the edges, two relief grooves underneath
  { name: 'Bodendiele', pts: mm([[0, 0], [30, 0], [30, 3], [42, 3], [42, 0], [90, 0], [90, 3], [102, 3], [102, 0], [124, 0], [124, 13], [132, 15], [132, 23], [124, 25], [124, 38], [122, 40], [2, 40], [0, 38], [0, 25], [8, 25], [8, 13], [0, 13]]) },
  // facade board with slanted edges, so rain runs off
  { name: 'Rhombusprofil', pts: mm([[0, 0], [118, 0], [132, 40], [14, 40]]) },
  // weatherboard: a wedge with a rebate under its thick edge, each board laps the one below
  { name: 'Stülpschalung', pts: mm([[0, 0], [110, 0], [110, 12], [132, 12], [132, 40], [0, 14]]) },
];

const S = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
const lerp = THREE.MathUtils.lerp;
const RB = (w, h, d, r = .02) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2));

function tex(canvas, view, srgb = true) {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = view.gl.capabilities.getMaxAnisotropy();
  return t;
}

// The glue line of each finger joint, drawn on the face as a zigzag across the width.
function jointed(cv) {
  const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, row = (z) => (z / WID + .5) * H;
  ctx.strokeStyle = 'rgba(70,44,22,.85)'; ctx.lineWidth = 1.2;
  for (const u of JOINTS) {
    ctx.beginPath();
    for (let k = 0; k <= FINGERS * 2; k++) { const z = lerp(Z0, Z1, k / (FINGERS * 2)), x = ((u + (k % 2 ? FINGER : 0)) / LEN) * W; ctx[k ? 'lineTo' : 'moveTo'](x, row(z)); }
    ctx.stroke();
  }
  return cv;
}

// A rough face is sawn, not flat: every edge broken into short steps that wander inward.
function roughen(pts, faces, seed) {
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const out = [];
  pts.forEach(([z, y], i) => {
    const [z2, y2] = pts[(i + 1) % pts.length];
    out.push([z, y]);
    if (!faces[i]) return;
    const n = Math.max(2, Math.round(Math.hypot(z2 - z, y2 - y) / .004));
    // the inward normal of this edge (the outline runs counter-clockwise)
    const len = Math.hypot(z2 - z, y2 - y), nz = -(y2 - y) / len, ny = (z2 - z) / len;
    for (let k = 1; k < n; k++) { const t = k / n, d = .0004 + rnd() * .0016; out.push([lerp(z, z2, t) + nz * d, lerp(y, y2, t) + ny * d]); }
  });
  return out;
}

// One cross-section, pushed out along the feed. The lead end sits at x = 0, so the mesh's x is where the front of the lamella is.
function lamellaGeometry(pts, crease) {
  const shape = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(-z, y)));
  let g = new THREE.ExtrudeGeometry(shape, { depth: LEN, bevelEnabled: false, curveSegments: 1 }).rotateY(Math.PI / 2).translate(-LEN, 0, 0);
  g = crease ? toCreasedNormals(g, .5) : g;
  // texture coordinates by hand: u along the length, v across whichever face this is
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i)), nz = Math.abs(n.getZ(i));
    if (nx > .5) uv.setXY(i, (z - Z0) / .15, y / .05);
    else uv.setXY(i, (x + LEN) / LEN, (ny > nz ? z : y - .02) / WID + .5);
  }
  return g;
}

// Rough and planed wood on one material: which faces are done is a uniform, read off the face's own normal.
// Faces seen from behind are where a clipping plane opened the wood: they show as solid end grain, which draws the cross-section at the spindle.
function woodMaterial(rough, smooth, done, planes) {
  const m = new THREE.MeshStandardMaterial({ map: smooth, roughness: .45, metalness: 0, side: THREE.DoubleSide, clippingPlanes: planes });
  m.userData.done = { value: new THREE.Vector4(...done) };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.roughMap = { value: rough }; sh.uniforms.uDone = m.userData.done;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vObjN;')
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nvObjN = objectNormal;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D roughMap; uniform vec4 uDone; varying vec3 vObjN;')
      .replace('#include <map_fragment>', `
        vec3 on = normalize(vObjN);
        float wSm = clamp(dot(uDone, vec4(step(.5, -on.y), step(.5, -on.z), step(.5, on.z), step(.5, on.y))) + uDone.x * uDone.y * uDone.z * uDone.w, 0., 1.);
        // sawn wood is duller and greyer than planed, so the change at each knife reads from a distance
        diffuseColor *= mix(texture2D(roughMap, vMapUv) * vec4(.72, .69, .66, 1.), texture2D(map, vMapUv) * vec4(1.08, 1.05, 1., 1.), wSm);
        if (!gl_FrontFacing) { diffuseColor.rgb = vec3(.52, .34, .19); wSm = 0.; }`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = mix(.92, .42, wSm);');
  };
  return m;
}

// A planing head: steel body, four knives, its axis along local y.
function cutterHead(R, len, M) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(R - .009, R - .009, len, 32), M.steelDark));
  for (let k = 0; k < 4; k++) {
    const kn = new THREE.Mesh(new THREE.BoxGeometry(.012, len * .98, .004), M.knife);
    const a = k * Math.PI / 2; kn.position.set(Math.cos(a) * (R - .006), 0, Math.sin(a) * (R - .006)); kn.rotation.y = -a;
    g.add(kn);
  }
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, len + .12, 12), M.steel));
  g.traverse((o) => { o.castShadow = true; });
  return g;
}

// The profile head is the negative of the profile: its radius is largest where the profile is lowest.
function topOf(pts, z) {
  let top = -1;
  pts.forEach(([z1, y1], i) => {
    const [z2, y2] = pts[(i + 1) % pts.length];
    if ((z < Math.min(z1, z2)) || (z > Math.max(z1, z2)) || z1 === z2) return;
    top = Math.max(top, lerp(y1, y2, (z - z1) / (z2 - z1)));
  });
  return top < 0 ? T1 : top;
}
const PR = .075;
function profileHead(pts, M) {
  const outline = [];
  for (let i = 0; i <= 64; i++) { const z = lerp(Z0 - .006, Z1P + .006, i / 64); outline.push([PR + T1 - topOf(pts, z), z]); }
  const g = new THREE.Group();
  const body = new THREE.LatheGeometry(outline.map(([r, z]) => new THREE.Vector2(r - .008, z)), 48).rotateX(Math.PI / 2);
  g.add(new THREE.Mesh(body, M.steelDark));
  const blade = new THREE.Shape([new THREE.Vector2(PR * .55, outline[0][1]), ...outline.map(([r, z]) => new THREE.Vector2(r, z)), new THREE.Vector2(PR * .55, outline[outline.length - 1][1])]);
  const bladeGeo = new THREE.ExtrudeGeometry(blade, { depth: .004, bevelEnabled: false }).translate(0, 0, -.002).rotateX(Math.PI / 2);
  for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(bladeGeo, M.knife); b.rotation.z = k * Math.PI / 2; g.add(b); }
  g.traverse((o) => { o.castShadow = true; });
  return g;
}

const CHIP_VERT = `
  uniform float uT, uOn, uPR; uniform vec3 uO, uV;
  varying float vA;
  void main() {
    float life = fract(uT * 1.7 + position.x);
    vec3 v = uV * (.5 + position.y) + (position.zxy - .5) * vec3(.6, .9, .7);
    vec3 p = uO + v * life * .5 + vec3(0., -1.6, 0.) * life * life * .25;
    vA = uOn * (1. - life);
    vec4 mv = modelViewMatrix * vec4(p, 1.);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uPR * (1.2 + 2.2 * position.z) / -mv.z;
  }`;

export function initPlaner() {
  const root = document.getElementById('hobeln'), stage = root.querySelector('.stage'), canvas = stage.querySelector('canvas');
  const view = stageView(canvas);
  view.setPixelRatio(pr(1.5));
  view.toneMapping = THREE.ACESFilmicToneMapping; view.toneMappingExposure = 1.05;
  view.setClearColor(new THREE.Color(0x070908), 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x070908, 7, 20);
  const pm = new THREE.PMREMGenerator(view.gl);
  scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture;
  pm.dispose();
  const camera = new THREE.PerspectiveCamera(32, 1, .03, 50);

  scene.add(new THREE.HemisphereLight(0xbfc8c2, 0x1b1712, .4));
  const key = new THREE.DirectionalLight(0xfff1dc, 2.4);
  key.position.set(-2, 6, 5); key.target.position.set(0, TABLE, 0);
  key.castShadow = true; key.shadow.mapSize.set(isMobile() ? 1024 : 2048, isMobile() ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 3, bottom: -3, near: 1, far: 16 }); key.shadow.bias = -.0004; key.shadow.normalBias = .02;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xb8d4ff, 1.1); rim.position.set(3, 3, -5); scene.add(rim);
  // the machine room's own lamp, which only matters once the hood is off
  const inner = new THREE.PointLight(0xffffff, 0, 3, 1.6); inner.position.set(-.2, TABLE + .55, .35); scene.add(inner);

  const M = {
    floor: new THREE.MeshStandardMaterial({ color: 0x141715, roughness: .82 }),
    body: new THREE.MeshStandardMaterial({ color: 0xe9ece9, roughness: .38, metalness: .05 }),
    band: new THREE.MeshStandardMaterial({ color: 0x5a5f5e, roughness: .45, metalness: .3 }),
    door: new THREE.MeshStandardMaterial({ color: 0x1c1f1e, roughness: .5, metalness: .2 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x2b302e, roughness: .55, metalness: .4 }),
    green: new THREE.MeshStandardMaterial({ color: 0x009835, roughness: .4, metalness: .05 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xc4c9cb, roughness: .25, metalness: .9 }),
    steelDark: new THREE.MeshStandardMaterial({ color: 0x7d8487, roughness: .3, metalness: .9 }),
    knife: new THREE.MeshStandardMaterial({ color: 0xeef2f4, roughness: .12, metalness: 1 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x2a2d2c, roughness: .85, metalness: 0 }),
    red: new THREE.MeshStandardMaterial({ color: 0xd2261d, roughness: .4 }),
    screen: new THREE.MeshBasicMaterial({ color: new THREE.Color(.18, .55, .32), toneMapped: false }),
  };
  // the hood fades away to show the spindles, so its parts get their own materials
  const H = {
    body: M.body.clone(), green: M.green.clone(),
    glass: new THREE.MeshStandardMaterial({ color: 0x0b1110, roughness: .06, metalness: .3, transparent: true, opacity: .38, depthWrite: false }),
  };
  Object.values(H).forEach((m) => { m.transparent = true; });

  const part = (parent, geo, mat, x, y, z, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (shadow) m.castShadow = m.receiveShadow = true; parent.add(m); return m; };

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 24), M.floor); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const lineMat = new THREE.MeshBasicMaterial({ color: 0x0c6b2c });
  for (const z of [-1.4, 1.4]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(22, .06), lineMat); m.rotation.x = -Math.PI / 2; m.position.set(0, .002, z); scene.add(m); }
  for (let x = -10; x <= 10; x += 6.5) part(scene, new THREE.BoxGeometry(.4, 8, .4), M.dark, x, 4, -6);

  // SOLID PROFILE P 700, after the product photo: white hood with a long window over a grey control band and a black door
  const X_IN = -1.6, X_OUT = 1.1, MW = X_OUT - X_IN, MX = (X_IN + X_OUT) / 2, ZB = -.5, ZF = .46;
  const mach = new THREE.Group(); scene.add(mach);
  part(mach, RB(MW, TABLE - .1, ZF - ZB), M.dark, MX, (TABLE - .1) / 2 + .03, (ZB + ZF) / 2);
  part(mach, new THREE.BoxGeometry(MW - .04, .2, .01), M.band, MX, TABLE - .19, ZF + .002);
  part(mach, new THREE.BoxGeometry(MW - .34, .5, .01), M.door, MX + .05, .38, ZF + .002);
  const knobGeo = new THREE.CylinderGeometry(.016, .016, .02, 16).rotateX(Math.PI / 2);
  for (let i = 0; i < 9; i++) part(mach, knobGeo, M.door, X_IN + .45 + i * .26, TABLE - .19, ZF + .012, false);
  part(mach, RB(.06, .06, .02, .01), M.red, X_IN + .3, TABLE - .19, ZF + .012, false);

  const hood = new THREE.Group(); mach.add(hood);
  const HB = TABLE - .02, HT = 1.6, WIN0 = 1.02, WIN1 = 1.4, WX0 = X_IN + .25, WX1 = X_OUT - .55;
  part(hood, RB(MW, .04, ZF - ZB - .12), H.body, MX, HT, (ZB + ZF) / 2 - .06);
  const brow = part(hood, RB(MW, .2, .03), H.body, MX, HT - .09, ZF - .07); brow.rotation.x = -.65;
  // the back wall stays when the hood clears: dark, so the spindles stand out against it
  part(mach, RB(MW, HT - HB, .03), M.dark, MX, (HB + HT) / 2, ZB + .015);
  part(hood, RB(MW, WIN0 - HB, .03), H.body, MX, (HB + WIN0) / 2, ZF - .015);
  part(hood, RB(MW, .1, .03), H.body, MX, WIN1 + .05, ZF - .015);
  part(hood, RB(WX0 - X_IN, WIN1 - WIN0, .03), H.body, (X_IN + WX0) / 2, (WIN0 + WIN1) / 2, ZF - .015);
  part(hood, RB(X_OUT - WX1, WIN1 - WIN0, .03), H.body, (WX1 + X_OUT) / 2, (WIN0 + WIN1) / 2, ZF - .015);
  for (const x of [X_IN + .015, X_OUT - .015]) part(hood, RB(.03, HT - TABLE - .14, ZF - ZB), H.body, x, (TABLE + .14 + HT) / 2, (ZB + ZF) / 2);
  part(hood, new THREE.BoxGeometry(WX1 - WX0, WIN1 - WIN0, .006), H.glass, (WX0 + WX1) / 2, (WIN0 + WIN1) / 2, ZF - .01, false);
  part(hood, new THREE.BoxGeometry(WX1 - WX0 + .1, .012, .006), H.green, (WX0 + WX1) / 2 + .05, WIN0 - .05, ZF + .002, false);
  for (let i = 0; i < 6; i++) part(hood, knobGeo, M.door, WX1 + .09, WIN1 - .04 - i * .062, ZF + .006, false);
  // logo and name on the band under the window
  const plateCv = document.createElement('canvas'); plateCv.width = 1024; plateCv.height = 96;
  const pc = plateCv.getContext('2d'); pc.fillStyle = '#e9ece9'; pc.fillRect(0, 0, 1024, 96);
  pc.fillStyle = '#1b1f1c'; pc.font = '600 58px Archivo, Arial, sans-serif'; pc.textAlign = 'right'; pc.fillText('SOLID PROFILE P 700', 1010, 70);
  const plateMat = new THREE.MeshStandardMaterial({ map: tex(plateCv, view), roughness: .45, transparent: true });
  part(hood, new THREE.PlaneGeometry(.75, .07), plateMat, WX1 - .4, WIN0 - .1, ZF + .002, false);
  const logoMat = new THREE.MeshStandardMaterial({ roughness: .45, transparent: true });
  new THREE.TextureLoader().load('/img/logo.png', (t) => { t.colorSpace = THREE.SRGBColorSpace; logoMat.map = t; logoMat.needsUpdate = true; });
  part(hood, new THREE.PlaneGeometry(.09, .09), logoMat, WX0 + .02, WIN0 - .1, ZF + .002, false);
  const fadeMats = [...Object.values(H), plateMat, logoMat], baseOpacity = fadeMats.map((m) => m.opacity);

  // infeed and outfeed tables, the fence along the back of the wood, the control cabinet behind the infeed
  part(scene, new THREE.BoxGeometry(6.4 + X_IN, .03, .36), M.steel, (X_IN - 6.4) / 2, TABLE - .015, 0);
  part(scene, new THREE.BoxGeometry(SP[0].x - .08 - X_IN, .03, .36), M.steel, (X_IN + SP[0].x - .08) / 2, TABLE - .015, 0);
  part(scene, new THREE.BoxGeometry(3.4 - SP[0].x - .08, .03, .36), M.steel, (SP[0].x + .08 + 3.4) / 2, TABLE - .015, 0);
  part(scene, new THREE.BoxGeometry(9.8, .05, .012), M.steel, -1.5, TABLE + .025, Z0 - .006);
  part(scene, RB(.85, TABLE - .05, .6), M.body, X_IN - .45, (TABLE - .05) / 2, 0);
  part(scene, RB(1.1, TABLE - .05, .5), M.body, X_OUT + .7, (TABLE - .05) / 2, 0);
  const cab = new THREE.Group(); cab.position.set(X_IN - 1.1, 0, -.75); scene.add(cab);
  part(cab, RB(.8, 1.8, .45), M.body, 0, .9, 0);
  part(cab, new THREE.BoxGeometry(.42, .5, .01), M.steel, 0, 1.35, .23, false);
  part(cab, new THREE.PlaneGeometry(.14, .1), M.screen, .08, 1.5, .237, false);
  part(cab, new THREE.CylinderGeometry(.022, .022, .02, 16).rotateX(Math.PI / 2), M.red, -.12, 1.48, .245, false);

  // the spindles, each in its green housing, with a dust hose up to the hood
  const heads = [], R = .07;
  const b1 = cutterHead(R, .2, M); b1.rotation.x = Math.PI / 2; b1.position.set(SP[0].x, TABLE - R, -.0); scene.add(b1);
  part(scene, RB(.2, .28, .34), M.green, SP[0].x, TABLE - R - .2, .05);
  const b2 = cutterHead(R, .13, M); b2.position.set(SP[1].x, TABLE + .05, Z0 - R); scene.add(b2);
  // the side spindles are driven from below the table, so nothing hides the wood from the front
  part(scene, RB(.18, .3, .18), M.green, SP[1].x, TABLE - .2, Z0 - R);
  const b3 = cutterHead(R, .13, M); b3.position.set(SP[2].x, TABLE + .05, Z1P + R); scene.add(b3);
  part(scene, RB(.18, .3, .18), M.green, SP[2].x, TABLE - .2, Z1P + R);
  const b4 = cutterHead(R, .2, M); b4.rotation.x = Math.PI / 2; b4.position.set(SP[3].x, TABLE + T1 + R, 0); scene.add(b4);
  part(scene, RB(.24, .16, .3), M.green, SP[3].x, TABLE + T1 + 2 * R + .1, -.04);
  const b5 = new THREE.Group(); b5.position.set(SP[4].x, TABLE + T1 + PR, 0); scene.add(b5);
  part(scene, RB(.26, .16, .3), M.green, SP[4].x, TABLE + T1 + 2 * PR + .1, -.04);
  heads.push({ g: b1, axis: 'y' }, { g: b2, axis: 'y' }, { g: b3, axis: 'y' }, { g: b4, axis: 'y' }, { g: b5, axis: 'z' });
  const hoseCv = document.createElement('canvas'); hoseCv.width = 8; hoseCv.height = 2;
  const hc = hoseCv.getContext('2d'); hc.fillStyle = '#d9dddd'; hc.fillRect(0, 0, 8, 2); hc.fillStyle = '#8c9294'; hc.fillRect(0, 0, 3, 2);
  const hoseTex = tex(hoseCv, view); hoseTex.wrapS = THREE.RepeatWrapping; hoseTex.repeat.set(60, 1);
  const hoseMat = new THREE.MeshStandardMaterial({ map: hoseTex, roughness: .35, metalness: .7 });
  [[SP[3].x, TABLE + .38, -.04], [SP[4].x, TABLE + .39, -.04]].forEach(([x, y, z], i) => {
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(x, y, z), new THREE.Vector3(x - .05, y + .2, z - .1), new THREE.Vector3(x - .12 + i * .02, HT - .05, -.3)]);
    part(scene, new THREE.TubeGeometry(c, 24, .045, 12), hoseMat, 0, 0, 0);
  });

  // feed rollers pressing on the wood from above, driven with the feed
  const rollers = [], RR = .055;
  [[-1.42, T0], [-.95, T0], [-.55, T0], [-.12, T0], [.38, T1], [.95, T1]].forEach(([x, top]) => {
    const r = part(scene, new THREE.CylinderGeometry(RR, RR, .17, 28).rotateX(Math.PI / 2), M.rubber, x, TABLE + top + RR, 0); rollers.push(r);
    part(scene, RB(.04, .2, .03, .01), M.dark, x, TABLE + top + RR + .1, -.1);
  });

  // the lamella: one mesh per cross-section, each shown only between its two spindles
  const roughTex = tex(jointed(woodCanvas({ len: LEN, wid: WID, px: 2048, rows: 128, seed: 7, rough: true })), view);
  const smoothTex = tex(jointed(woodCanvas({ len: LEN, wid: WID, px: 2048, rows: 128, seed: 7 })), view);
  const endTex = tex(endGrainCanvas({ wid: .15, thick: .05, seed: 5 }), view);
  const box = (z1, t, faces, seed) => roughen([[Z0, 0], [z1, 0], [z1, t], [Z0, t]], faces, seed);
  // edges in outline order: bottom, front (+z), top, fence (-z)
  const SECTIONS = [box(Z1, T0, [1, 1, 1, 1], 11), box(Z1, T0, [0, 1, 1, 1], 11), box(Z1, T0, [0, 1, 1, 0], 11), box(Z1P, T0, [0, 0, 1, 0], 11), box(Z1P, T1, [0, 0, 0, 0], 11)];
  const lamella = new THREE.Group(); scene.add(lamella);
  const clip = (x0, x1) => [new THREE.Plane(new THREE.Vector3(1, 0, 0), -x0), new THREE.Plane(new THREE.Vector3(-1, 0, 0), x1)];
  const endMat = (planes) => new THREE.MeshStandardMaterial({ map: endTex, roughness: .7, clippingPlanes: planes });
  const addSection = (geo, done, planes) => {
    const m = new THREE.Mesh(geo, [endMat(planes), woodMaterial(roughTex, smoothTex, done, planes)]);
    m.castShadow = m.receiveShadow = true; lamella.add(m); return m;
  };
  SECTIONS.forEach((pts, i) => addSection(lamellaGeometry(pts, false), DONE[i], clip(i ? SP[i - 1].x : -1e3, SP[i].x)));
  // the finished profile twice over, so a new one can run in behind the old one
  const profileGeos = PROFILES.map((p) => lamellaGeometry(p.pts, true));
  const finals = [0, 1].map(() => addSection(profileGeos[0], [1, 1, 1, 1], clip(SP[4].x, 1e3)));
  finals[1].visible = false;

  // chips off every spindle while it has wood under it
  const CN = isMobile() ? 70 : 150, chips = [];
  const chipGeo = new THREE.BufferGeometry(); chipGeo.setAttribute('position', new THREE.BufferAttribute(Float32Array.from({ length: CN * 3 }, Math.random), 3));
  [[SP[0].x, TABLE - .005, .02, -.6, -.5, .3], [SP[1].x, TABLE + .04, Z0, -.6, .3, -.8], [SP[2].x, TABLE + .04, Z1P, -.6, .3, .8], [SP[3].x, TABLE + T1 + .005, 0, -.6, .9, .2], [SP[4].x, TABLE + T1, 0, -.6, .9, .3]].forEach(([x, y, z, vx, vy, vz]) => {
    const u = { uT: { value: 0 }, uOn: { value: 0 }, uPR: { value: view.getPixelRatio() * 2.2 }, uO: { value: new THREE.Vector3(x, y, z) }, uV: { value: new THREE.Vector3(vx, vy, vz) } };
    const pts = new THREE.Points(chipGeo, new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, vertexShader: CHIP_VERT,
      fragmentShader: 'varying float vA; void main(){ float d = length(gl_PointCoord - .5); if (d > .5) discard; gl_FragColor = vec4(vec3(.96, .84, .62), vA * (1. - d * 2.)); }' }));
    pts.frustumCulled = false; scene.add(pts); chips.push(u);
  });

  // spindle names, in the page so they stay sharp
  const tagLayer = stage.querySelector('.tags'), panelBox = stage.querySelector('.panels');
  const tags = SP.map((s, i) => { const el = document.createElement('span'); el.className = 'tag'; el.textContent = `${i + 1} · ${s.name}`; el.style.setProperty('--c', '#3ee07a'); tagLayer.append(el); return el; });
  const anchors = [[SP[0].x, TABLE - .01, .07], [SP[1].x, TABLE + .12, Z0 - .1], [SP[2].x, TABLE + .12, Z1P + .12], [SP[3].x, TABLE + T1 + .16, .06], [SP[4].x, TABLE + T1 + .17, .06]].map((a) => new THREE.Vector3(...a));

  // the camera: the whole machine, then inside past each pair of spindles, then face to face with the finished profile
  const KEYS = [
    { pos: [3.4, 2.29, 6.4], look: [.1, .79, 0] },
    { pos: [-2.2, 1.64, 1.85], look: [-.95, .77, 0] },
    { pos: [-.7, 1.69, 1.85], look: [-.15, .77, 0] },
    { pos: [1.55, 1.59, 1.75], look: [.6, .79, 0] },
    { pos: [2.85, .91, .36], look: [2.33, .79, 0] },
    { pos: [3.0, .95, .46], look: [2.43, .79, 0] },
  ];
  const pos = new THREE.Vector3(), look = new THREE.Vector3(), a = new THREE.Vector3();
  const route = (p) => {
    const i = Math.min(Math.floor(p), KEYS.length - 2), t = S(0, 1, p - i), k0 = KEYS[i], k1 = KEYS[i + 1];
    pos.set(...k0.pos).lerp(a.set(...k1.pos), t); look.set(...k0.look).lerp(a.set(...k1.look), t);
    if (stacked()) pos.sub(look).multiplyScalar(1.7).add(look);
  };
  const fit = () => {
    const w = stage.clientWidth, h = stage.clientHeight;
    view.setSize(w, h); camera.aspect = w / h;
    camera.fov = stacked() ? 40 : 32;
    frameStage(camera, w, h, .16, -.16);
    camera.updateProjectionMatrix();
  };
  addEventListener('resize', fit); fit();

  // the feed: steady, like a machine, the front of the lamella at each step
  const LEAD = [-2.1, -.55, .45, 1.65, 2.35, 2.45];
  const leadAt = (p) => { const i = Math.min(Math.floor(p), LEAD.length - 2); return lerp(LEAD[i], LEAD[i + 1], Math.min(Math.max(p - i, 0), 1)); };

  // choosing a profile: new knives on the spindle, then the new profile runs out behind the old one
  let cur = 0, front = 0, head = profileHead(PROFILES[0].pts, M); b5.add(head);
  const sweep = { x: 1e3 };
  // both materials of a mesh share its two planes
  const setFinalClips = () => { finals[front].material[1].clippingPlanes[1].constant = sweep.x; finals[1 - front].material[1].clippingPlanes[0].constant = -sweep.x; };
  const buttons = [...stage.querySelectorAll('.profiles button')];
  const choose = (i) => {
    if (i === cur) return;
    cur = i; buttons.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
    front = 1 - front;
    const nw = finals[front], old = finals[1 - front];
    nw.geometry = profileGeos[i]; nw.visible = old.visible = true;
    // the old one keeps its place beyond the sweep, the new one fills in behind it
    old.material[1].clippingPlanes[1].constant = 1e3;
    nw.material[1].clippingPlanes[0].constant = -SP[4].x;
    gsap.killTweensOf(sweep); gsap.killTweensOf(b5.scale);
    sweep.x = SP[4].x; setFinalClips();
    const swap = () => { b5.remove(head); head.traverse((o) => o.geometry?.dispose()); head = profileHead(PROFILES[i].pts, M); b5.add(head); };
    if (reduce) { swap(); sweep.x = 1e3; setFinalClips(); old.visible = false; return; }
    gsap.timeline()
      .to(b5.scale, { x: .2, y: .2, z: .2, duration: .22, ease: 'power2.in' })
      .call(swap)
      .to(b5.scale, { x: 1, y: 1, z: 1, duration: .3, ease: 'power2.out' })
      .to(sweep, { x: leadAt(state.p) + .05, duration: .9, ease: 'none', onUpdate: setFinalClips, onComplete: () => { old.visible = false; sweep.x = 1e3; setFinalClips(); } }, .4);
  };
  buttons.forEach((b, i) => b.addEventListener('click', () => choose(i)));

  const state = { p: 0 }, v3 = new THREE.Vector3();
  let lastT = 0;
  function update(t) {
    const p = state.p, lead = leadAt(p), tail = lead - LEN, dt = Math.min(Math.max(t - lastT, 0), .05);
    lastT = t;
    lamella.position.set(lead, TABLE, 0);
    rollers.forEach((r) => { r.rotation.z = -lead / RR; });
    // 7,000 rpm cannot be drawn; a fast turn reads as running
    heads.forEach((h) => { h.g.rotation[h.axis] += dt * 38; });
    chips.forEach((u, i) => {
      const on = lead > SP[i].x && tail < SP[i].x ? 1 : 0;
      u.uOn.value += (on - u.uOn.value) * .15; u.uT.value = t;
    });
    // the hood clears as the camera moves in
    const hoodK = 1 - S(.35, .95, p);
    fadeMats.forEach((m, i) => { m.opacity = baseOpacity[i] * hoodK; m.depthWrite = hoodK > .98 && m !== H.glass; });
    hood.visible = hoodK > .01;
    inner.intensity = (1 - hoodK) * 2.2;
    route(p); camera.position.copy(pos); camera.lookAt(look);
    const w = stage.clientWidth, h = stage.clientHeight, tagOn = S(.8, 1.1, p) * (1 - S(3.4, 3.8, p));
    // a tag never sits on the copy: the panel's box, with some air around it
    const sr = stage.getBoundingClientRect(), tr = panelBox.getBoundingClientRect();
    const bx0 = tr.left - sr.left - 24, bx1 = tr.right - sr.left + 160, by0 = tr.top - sr.top - 24, by1 = tr.bottom - sr.top + 24;
    tags.forEach((el, i) => {
      v3.copy(anchors[i]).project(camera);
      const x = (v3.x * .5 + .5) * w, y = (-v3.y * .5 + .5) * h;
      const vis = v3.z < 1 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1 && !(x > bx0 && x < bx1 && y > by0 && y < by1);
      el.style.opacity = vis ? tagOn : 0;
      el.style.transform = `translate(${x}px, ${y}px)`;
    });
  }

  // the cross-section beside the film: what each spindle has just taken off
  const hud = sectionHud(stage), rect = (z1, t) => [[Z0, 0], [z1, 0], [z1, t], [Z0, t]];
  const RAW_R = rect(Z1, T0), SIZED = rect(Z1P, T1), E = (a, b) => [a, b];
  const hudState = (i) => [
    { shape: RAW_R, raw: RAW_R, caption: tr('140 × 45 mm · sägerau', '140 × 45 mm · rough-sawn') },
    { shape: RAW_R, raw: RAW_R, planed: [E([Z0, 0], [Z1, 0]), E([Z0, 0], [Z0, T0])], caption: tr('Unterseite und Kante gehobelt', 'Underside and edge planed') },
    { shape: SIZED, raw: RAW_R, planed: [E([Z0, 0], [Z1P, 0]), E([Z1P, 0], [Z1P, T1]), E([Z1P, T1], [Z0, T1]), E([Z0, T1], [Z0, 0])], caption: tr('132 × 40 mm · auf Maß', '132 × 40 mm · to size') },
    { shape: PROFILES[cur].pts, raw: SIZED, caption: `${buttons[cur].textContent} · 132 × 40 mm` },
  ][Math.min(i, 3)];

  const panels = [...stage.querySelectorAll('.panels article')], show = panelSwitcher(panels);
  const tl = gsap.to(state, { p: STEPS, ease: 'none', scrollTrigger: { trigger: root, start: 'top top', end: () => `+=${innerHeight * 6}`, pin: stage, scrub: reduce ? true : 1, anticipatePin: 1 } });
  stageProgress(stage, tl);
  show(0);
  update(0);
  whileVisible(root, (t) => { update(t); const i = state.p < .55 ? 0 : state.p < 1.5 ? 1 : state.p < 2.5 ? 2 : state.p < 3.6 ? 3 : 4; show(i); hud(hudState(i)); view.render(scene, camera); });
  queueWarm('planer', view, scene, camera, root);
  view.render(scene, camera);
}
