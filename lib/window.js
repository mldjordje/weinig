// The window. Four glued window scantlings go into a SOLID CNC CR, are clamped, profiled and given their tenons in one set-up,
// then come out and join into a sash, and the glass goes in. Scroll drives it all, the same on a phone as with a mouse.
import * as THREE from 'three';
import gsap from 'gsap';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { reduce, isMobile, pr, stacked, frameStage, whileVisible, stageView, queueWarm, panelSwitcher, stageProgress, sectionHud, tr } from './core.js';
import { woodCanvas, endGrainCanvas } from './wood.js';

const STEPS = 5, CLAMP_Y = .85;
// a sash scantling, 78 x 68 mm, glued from three lamellas; centred on its own axis, z across, y through the depth
const W = .078, D = .068, ZA = -W / 2, YA = -D / 2;
const KANTEL = [[0, 0], [.06, 0], [.06, .012], [.078, .012], [.078, .062], [.072, .068], [.022, .068], [.022, .05], [0, .05]].map(([z, y]) => [z + ZA, y + YA]);
const RAW = [[ZA, YA], [-ZA, YA], [-ZA, -YA], [ZA, -YA]];
// the sash: 1000 x 1300 mm outside; the rails sit between the stiles and reach into them with their tenons
const FW = 1, FH = 1.3, TEN = .05, RAIL = FW - 2 * W;
// above the loading table, so the sash stands clear of it
const FRAME = new THREE.Vector3(0, 1.6, 1.55);
// where each part's own axes end up in the sash; the glazing rebate always faces the opening
const basis = (x, y, z) => new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(...x), new THREE.Vector3(...y), new THREE.Vector3(...z)));
const PARTS = [
  { len: FH, at: [-(FW - W) / 2, 0, 0], q: basis([0, -1, 0], [0, 0, 1], [-1, 0, 0]) },
  { len: FH, at: [(FW - W) / 2, 0, 0], q: basis([0, 1, 0], [0, 0, 1], [1, 0, 0]) },
  { len: RAIL, tenon: true, at: [0, -(FH - W) / 2, 0], q: basis([1, 0, 0], [0, 0, 1], [0, -1, 0]) },
  { len: RAIL, tenon: true, at: [0, (FH - W) / 2, 0], q: basis([-1, 0, 0], [0, 0, 1], [0, 1, 0]) },
];
// the order on the machine: each part has its own stretch of scroll under the spindle, the first one slow enough to follow
const CUT = [[1, 1.9], [2, 2.2], [2.2, 2.4], [2.4, 2.6]];
const CLAMP_Z = [-.5, -.3, -.1, .1];

const S = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
const lerp = THREE.MathUtils.lerp;
const RB = (w, h, d, r = .02) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2));

function tex(canvas, view) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = view.gl.capabilities.getMaxAnisotropy();
  return t;
}

// One cross-section pushed out along the part, centred on x.
function kantelGeometry(pts, len) {
  const shape = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(-z, y)));
  const g = toCreasedNormals(new THREE.ExtrudeGeometry(shape, { depth: len, bevelEnabled: false, curveSegments: 1 }).rotateY(Math.PI / 2).translate(-len / 2, 0, 0), .5);
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i)), nz = Math.abs(n.getZ(i));
    if (nx > .5) uv.setXY(i, z / W + .5, y / D + .5);
    else uv.setXY(i, x / 1.4 + .5, (ny > nz ? z : y) / .1 + .5);
  }
  return g;
}

// Where a clipping plane opens the wood, its back faces show: painted as solid wood, they draw the cut.
function solidBack(m) {
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\nif (!gl_FrontFacing) diffuseColor.rgb = vec3(.52, .34, .19);'); };
  return m;
}

export function initWindow() {
  const root = document.getElementById('fenster'), stage = root.querySelector('.stage'), canvas = stage.querySelector('canvas');
  const view = stageView(canvas);
  view.setPixelRatio(pr(1.5));
  view.toneMapping = THREE.ACESFilmicToneMapping; view.toneMappingExposure = 1.05;
  view.setClearColor(new THREE.Color(0x070908), 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x070908, 8, 22);
  const pm = new THREE.PMREMGenerator(view.gl);
  scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture;
  pm.dispose();
  const camera = new THREE.PerspectiveCamera(32, 1, .03, 50);

  scene.add(new THREE.HemisphereLight(0xbfc8c2, 0x1b1712, .4));
  const key = new THREE.DirectionalLight(0xfff1dc, 2.4);
  key.position.set(-2.5, 6, 5); key.target.position.set(0, 1, .5);
  key.castShadow = true; key.shadow.mapSize.set(isMobile() ? 1024 : 2048, isMobile() ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 3.5, bottom: -3, near: 1, far: 16 }); key.shadow.bias = -.0004; key.shadow.normalBias = .02;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xb8d4ff, 1.1); rim.position.set(3, 3, -5); scene.add(rim);
  const inner = new THREE.PointLight(0xffffff, 0, 3.5, 1.6); inner.position.set(0, 1.6, .2); scene.add(inner);

  const M = {
    floor: new THREE.MeshStandardMaterial({ color: 0x141715, roughness: .82 }),
    body: new THREE.MeshStandardMaterial({ color: 0xdfe2e1, roughness: .4, metalness: .05 }),
    base: new THREE.MeshStandardMaterial({ color: 0x3a3f3e, roughness: .5, metalness: .3 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x2b302e, roughness: .55, metalness: .4 }),
    green: new THREE.MeshStandardMaterial({ color: 0x009835, roughness: .4, metalness: .05 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xc4c9cb, roughness: .25, metalness: .9 }),
    slat: new THREE.MeshStandardMaterial({ color: 0x8a8f90, roughness: .4, metalness: .6 }),
    knife: new THREE.MeshStandardMaterial({ color: 0xeef2f4, roughness: .12, metalness: 1 }),
    screen: new THREE.MeshBasicMaterial({ color: new THREE.Color(.18, .55, .32), toneMapped: false }),
    pane: new THREE.MeshStandardMaterial({ color: 0xbfe3d2, roughness: .04, metalness: .1, transparent: true, opacity: .38, depthWrite: false }),
  };
  // the cabin's front clears while the parts are inside, so it gets its own materials
  const F = { body: M.body.clone(), green: M.green.clone(), glass: new THREE.MeshStandardMaterial({ color: 0x0b1110, roughness: .06, metalness: .3, transparent: true, opacity: .4, depthWrite: false }) };
  Object.values(F).forEach((m) => { m.transparent = true; });

  const part = (parent, geo, mat, x, y, z, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (shadow) m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 24), M.floor); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const lineMat = new THREE.MeshBasicMaterial({ color: 0x0c6b2c });
  for (const z of [-1.5, 2.6]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(22, .06), lineMat); m.rotation.x = -Math.PI / 2; m.position.set(0, .002, z); scene.add(m); }
  for (let x = -10; x <= 10; x += 6.5) part(scene, new THREE.BoxGeometry(.4, 8, .4), M.dark, x, 4, -6);

  // SOLID CNC CR 400 V, after the product photo: a closed cabin, light above and dark below, a green band between, glass doors in front
  const CX0 = -1.7, CX1 = 1.7, CZ0 = -.95, CZ1 = .55, CH = 2.3, BAND = .75, CW = CX1 - CX0;
  part(scene, RB(CW, BAND, CZ1 - CZ0), M.base, 0, BAND / 2, (CZ0 + CZ1) / 2);
  // dark inside, so the wood reads against it
  part(scene, RB(CW, CH - BAND, .04), M.dark, 0, (BAND + CH) / 2, CZ0 + .02);
  part(scene, RB(CW, .04, CZ1 - CZ0), M.body, 0, CH, (CZ0 + CZ1) / 2);
  for (const x of [CX0 + .02, CX1 - .02]) part(scene, RB(.04, CH - BAND, CZ1 - CZ0), M.body, x, (BAND + CH) / 2, (CZ0 + CZ1) / 2);
  const front = new THREE.Group(); scene.add(front);
  const D0 = -1.25, D1 = .95, G0 = BAND + .12, G1 = CH - .28;
  part(front, RB(CW, G0 - BAND, .03), F.body, 0, (BAND + G0) / 2, CZ1);
  part(front, RB(CW, CH - G1, .03), F.body, 0, (G1 + CH) / 2, CZ1);
  part(front, RB(D0 - CX0, G1 - G0, .03), F.body, (CX0 + D0) / 2, (G0 + G1) / 2, CZ1);
  part(front, RB(CX1 - D1, G1 - G0, .03), F.body, (D1 + CX1) / 2, (G0 + G1) / 2, CZ1);
  part(front, RB(.06, G1 - G0, .03), F.body, (D0 + D1) / 2, (G0 + G1) / 2, CZ1);
  part(front, new THREE.BoxGeometry(D1 - D0, G1 - G0, .006), F.glass, (D0 + D1) / 2, (G0 + G1) / 2, CZ1, false);
  part(front, new THREE.BoxGeometry(CW, .03, .01), F.green, 0, BAND + .015, CZ1 + .018, false);
  const plateCv = document.createElement('canvas'); plateCv.width = 1024; plateCv.height = 96;
  const pc = plateCv.getContext('2d'); pc.fillStyle = '#dfe2e1'; pc.fillRect(0, 0, 1024, 96);
  pc.fillStyle = '#1b1f1c'; pc.font = '600 58px Archivo, Arial, sans-serif'; pc.fillText('SOLID CNC CR 400 V', 20, 70);
  const plateMat = new THREE.MeshStandardMaterial({ map: tex(plateCv, view), roughness: .45, transparent: true });
  part(front, new THREE.PlaneGeometry(.72, .068), plateMat, CX0 + .62, CH - .13, CZ1 + .018, false);
  const logoMat = new THREE.MeshStandardMaterial({ roughness: .45, transparent: true });
  new THREE.TextureLoader().load('/img/logo.png', (t) => { t.colorSpace = THREE.SRGBColorSpace; logoMat.map = t; logoMat.needsUpdate = true; });
  part(front, new THREE.PlaneGeometry(.1, .1), logoMat, CX0 + .16, CH - .13, CZ1 + .018, false);
  const fadeMats = [...Object.values(F), plateMat, logoMat], baseOpacity = fadeMats.map((m) => m.opacity);
  // the operator's screen on its arm, beside the doors
  const arm = new THREE.Group(); arm.position.set(CX1 - .3, 0, CZ1 + .25); arm.rotation.y = -.5; scene.add(arm);
  part(arm, new THREE.CylinderGeometry(.03, .03, 1.35, 12), M.dark, 0, .68, 0);
  part(arm, RB(.46, .3, .04, .012), M.dark, 0, 1.45, 0);
  part(arm, new THREE.PlaneGeometry(.4, .24), M.screen, 0, 1.45, .021, false);

  // the loading table in front, dark frame and grey slats
  const LZ0 = 1.0, LZ1 = 2.0, LT = .82;
  part(scene, RB(2.0, .08, LZ1 - LZ0, .01), M.dark, .1, LT - .04, (LZ0 + LZ1) / 2);
  for (let i = 0; i < 7; i++) part(scene, new THREE.BoxGeometry(.05, .02, LZ1 - LZ0 - .04), M.slat, -.8 + i * .3, LT + .01, (LZ0 + LZ1) / 2);
  for (const [x, z] of [[-.85, LZ0 + .05], [1.05, LZ0 + .05], [-.85, LZ1 - .05], [1.05, LZ1 - .05]]) part(scene, new THREE.BoxGeometry(.04, LT - .08, .04), M.steel, x, (LT - .08) / 2, z);

  // inside: the clamp table, a gantry over it, and the spindle on its ram
  part(scene, RB(2.6, .06, 1.0, .01), M.dark, 0, CLAMP_Y - D / 2 - .1, -.2);
  const clamps = [];
  CLAMP_Z.forEach((z, k) => {
    const xs = PARTS[k].len > 1 ? [-.55, -.2, .2, .55] : [-.3, 0, .3];
    xs.forEach((x) => {
      part(scene, RB(.07, .07, .1, .01), M.green, x, CLAMP_Y - D / 2 - .035, z);
      clamps.push({ k, jaw: part(scene, RB(.06, .025, .06, .008), M.dark, x, 0, z) });
    });
  });
  const beam = new THREE.Group(); scene.add(beam);
  part(beam, RB(CW - .2, .12, .14), M.body, 0, 1.95, 0);
  const ram = new THREE.Group(); beam.add(ram);
  part(ram, RB(.2, .3, .2), M.body, 0, 1.75, 0);
  part(ram, RB(.16, .5, .16), M.green, 0, 1.38, 0);
  part(ram, new THREE.CylinderGeometry(.02, .02, .2, 12), M.steel, 0, 1.04, 0);
  const tool = new THREE.Group(); tool.position.y = CLAMP_Y; ram.add(tool);
  tool.add(new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .075, 32), M.dark));
  for (let k = 0; k < 4; k++) { const kn = new THREE.Mesh(new THREE.BoxGeometry(.012, .074, .004), M.knife); const a = k * Math.PI / 2; kn.position.set(Math.cos(a) * .05, 0, Math.sin(a) * .05); kn.rotation.y = -a; tool.add(kn); }
  const TOOL_R = .055;

  // the four scantlings: each a raw blank and its finished part, cut over at the spindle by a pair of clipping planes
  const endCv = endGrainCanvas({ wid: W, thick: D, seed: 4 });
  const ec = endCv.getContext('2d'); ec.fillStyle = 'rgba(60,38,20,.9)';
  for (const f of [1 / 3, 2 / 3]) ec.fillRect(0, Math.round(endCv.height * f), endCv.width, 1);
  const endTex = tex(endCv, view), sideTex = tex(woodCanvas({ len: 1.4, wid: .1, px: 1024, rows: 96, seed: 9 }), view);
  const parts = PARTS.map((pt, k) => {
    const g = new THREE.Group(); scene.add(g);
    const at = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 1e3), beyond = new THREE.Plane(new THREE.Vector3(1, 0, 0), 1e3);
    const mats = (planes) => [solidBack(new THREE.MeshStandardMaterial({ map: endTex, roughness: .7, side: THREE.DoubleSide, clippingPlanes: planes })),
      solidBack(new THREE.MeshStandardMaterial({ map: sideTex, roughness: .45, side: THREE.DoubleSide, clippingPlanes: planes }))];
    const done = mats([at]), raw = mats([beyond]);
    // the blank is as long as the part with its tenons
    const full = pt.len + (pt.tenon ? 2 * TEN : 0);
    const blank = new THREE.Mesh(kantelGeometry(RAW, full), raw); blank.castShadow = blank.receiveShadow = true; g.add(blank);
    const fin = new THREE.Group(); g.add(fin);
    const body = new THREE.Mesh(kantelGeometry(KANTEL, pt.len), done); body.castShadow = body.receiveShadow = true; fin.add(body);
    if (pt.tenon) for (const s of [-1, 1]) { const t = new THREE.Mesh(new THREE.BoxGeometry(TEN, D / 3, W - .036), done[1]); t.position.set(s * (pt.len + TEN) / 2, 0, .004); t.castShadow = true; fin.add(t); }
    return { ...pt, k, g, at, beyond, half: full / 2, frameQ: pt.q, framePos: FRAME.clone().add(new THREE.Vector3(...pt.at)) };
  });

  // the glass, lowered into the glazing rebate at the end
  const glass = part(scene, new THREE.BoxGeometry(FW - 2 * W + .024, FH - 2 * W + .024, .024), M.pane, 0, 0, FRAME.z + D / 2 - .012, false);

  // chips off the tool while it cuts
  const CN = isMobile() ? 70 : 150, chipU = { uT: { value: 0 }, uOn: { value: 0 }, uPR: { value: view.getPixelRatio() * 2.2 }, uO: { value: new THREE.Vector3() } };
  const chipGeo = new THREE.BufferGeometry(); chipGeo.setAttribute('position', new THREE.BufferAttribute(Float32Array.from({ length: CN * 3 }, Math.random), 3));
  const chips = new THREE.Points(chipGeo, new THREE.ShaderMaterial({ uniforms: chipU, transparent: true, depthWrite: false,
    vertexShader: `uniform float uT, uOn, uPR; uniform vec3 uO; varying float vA;
      void main() { float life = fract(uT * 1.7 + position.x);
        vec3 v = vec3(position.y - .9, .5 + position.z * .6, .4 + position.x * .5);
        vec3 p = uO + v * life * .5 + vec3(0., -.4, 0.) * life * life;
        vA = uOn * (1. - life); vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * mv; gl_PointSize = uPR * (1.2 + 2.2 * position.z) / -mv.z; }`,
    fragmentShader: 'varying float vA; void main(){ float d = length(gl_PointCoord - .5); if (d > .5) discard; gl_FragColor = vec4(vec3(.96, .84, .62), vA * (1. - d * 2.)); }' }));
  chips.frustumCulled = false; scene.add(chips);

  const KEYS = [
    { pos: [4.4, 2.5, 6.6], look: [.7, 1.0, .5] },
    { pos: [-1.7, 1.95, 2.3], look: [-.25, .88, -.25] },
    { pos: [.9, 2.3, 2.7], look: [0, .9, -.2] },
    { pos: [2.8, 2.1, 5.0], look: [0, 1.35, 1.2] },
    { pos: [1.5, 2.0, 6.6], look: [0, 1.55, 1.55] },
    { pos: [.7, 1.75, 6.0], look: [0, 1.55, 1.55] },
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

  const state = { p: 0 }, ident = new THREE.Quaternion(), lying = new THREE.Vector3();
  let lastT = 0;
  function update(t) {
    const p = state.p, dt = Math.min(Math.max(t - lastT, 0), .05);
    lastT = t;
    // where the spindle is: over the part it is cutting, or on its way to the next
    let k = CUT.findIndex(([, b]) => p < b), hx, hz;
    if (k < 0) k = 3;
    const [a0, a1] = CUT[k], pk = parts[k], u = Math.min(Math.max((p - a0) / (a1 - a0), 0), 1);
    hx = lerp(-pk.half - .12, pk.half + .12, u); hz = CLAMP_Z[k] + W / 2 + TOOL_R - .02;
    if (p < a0) { const prev = k ? CLAMP_Z[k - 1] + W / 2 + TOOL_R - .02 : .4, q = S(a0 - (k ? .02 : .2), a0, p); hz = lerp(prev, hz, q); hx = lerp(k ? parts[k - 1].half + .12 : 0, -pk.half - .12, q); }
    if (p > CUT[3][1]) { const q = S(CUT[3][1], CUT[3][1] + .2, p); hx = lerp(hx, 0, q); hz = lerp(hz, .35, q); }
    const cutting = p > a0 && p < a1 ? 1 : 0;
    beam.position.z = hz; ram.position.x = hx;
    tool.rotation.y += reduce ? 0 : dt * 38;
    chipU.uT.value = t; chipU.uOn.value += (cutting - chipU.uOn.value) * .15; chipU.uO.value.set(hx, CLAMP_Y + .02, hz - TOOL_R);

    parts.forEach((pt) => {
      // the cut runs with the spindle; done parts keep no planes so they can turn freely
      const [c0, c1] = CUT[pt.k], cu = Math.min(Math.max((p - c0) / (c1 - c0), 0), 1);
      const sx = cu <= 0 ? -1e3 : cu >= 1 ? 1e3 : lerp(-pt.half - .12, pt.half + .12, cu) - TOOL_R * .6;
      // loaded from the table, slid in under the clamps, then lifted out to the sash
      const zIn = lerp(LZ0 + .25 + pt.k * .2, CLAMP_Z[pt.k], S(.45, .95, p));
      const yIn = lerp(LT + D / 2 + .01, CLAMP_Y, S(.45, .95, p));
      lying.set(0, yIn, zIn);
      const go = S(2.7 + pt.k * .12, 3.45 + pt.k * .12, p);
      pt.g.position.copy(lying).lerp(pt.framePos, go); pt.g.position.y += Math.sin(go * Math.PI) * .45;
      pt.g.quaternion.copy(ident).slerp(pt.frameQ, S(.15, .85, go));
      const world = go > 0 ? 1e3 : sx;
      pt.at.constant = world; pt.beyond.constant = -world;
    });
    const jawUp = 1 - S(.9, 1.0, p) + S(2.62, 2.72, p);
    clamps.forEach((c) => { c.jaw.position.y = CLAMP_Y + D / 2 + .013 + Math.min(jawUp, 1) * .08; });
    glass.position.y = FRAME.y + (1 - S(3.75, 4.3, p)) * 1.6;
    glass.visible = p > 3.5;

    // the front clears while the parts are inside, and closes only once the last part is out, so nothing passes through it
    const frontK = Math.min(1 - S(.4, .85, p) + S(3.85, 4.25, p), 1);
    fadeMats.forEach((m, i) => { m.opacity = baseOpacity[i] * frontK; m.depthWrite = frontK > .98 && m !== F.glass; });
    front.visible = frontK > .01;
    inner.intensity = (1 - frontK) * 2.4;
    route(p); camera.position.copy(pos); camera.lookAt(look);
  }

  // the scantling's cross-section beside the film: glued blank, then the profile with its glazing rebate
  const hud = sectionHud(stage), glue = [1 / 3, 2 / 3].map((f) => [[ZA, YA + D * f], [-ZA, YA + D * f]]);
  const hudState = (i) => (i === 0 ? { shape: RAW, raw: RAW, lines: glue, caption: tr('78 × 68 mm · drei Lamellen verleimt', '78 × 68 mm · three lamellas glued') }
    : i < 3 ? { shape: KANTEL, raw: RAW, lines: glue, caption: tr('Profil mit Glasfalz', 'Profile with glazing rebate') } : null);

  const panels = [...stage.querySelectorAll('.panels article')], show = panelSwitcher(panels);
  const tl = gsap.to(state, { p: STEPS, ease: 'none', scrollTrigger: { trigger: root, start: 'top top', end: () => `+=${innerHeight * 6}`, pin: stage, scrub: reduce ? true : 1, anticipatePin: 1 } });
  stageProgress(stage, tl);
  show(0);
  update(0);
  whileVisible(root, (t) => { update(t); const i = state.p < .6 ? 0 : state.p < 1.6 ? 1 : state.p < 2.65 ? 2 : state.p < 3.7 ? 3 : 4; show(i); hud(hudState(i)); view.render(scene, camera); });
  queueWarm('window', view, scene, camera, root);
  view.render(scene, camera);
}
