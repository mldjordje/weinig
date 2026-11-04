// The log behind the preloader: it grows a ring for every bit of the site that loads, then is scanned and sawn into boards.
// It runs off the main thread so it stays smooth while the page builds its scenes.
const VS = `#version 300 es
void main() { vec2 p = vec2(gl_VertexID == 1 ? 3. : -1., gl_VertexID == 2 ? 3. : -1.); gl_Position = vec4(p, 0, 1); }`;

const FS = `#version 300 es
precision highp float;
#define S smoothstep
uniform vec2 uRes; uniform float uT, uP, uF, uYaw, uPitch, uPulse; uniform sampler2D uLogo;
out vec4 o;

const float HL = 1.05, BARK = .06, RINGS = 24.;
float R, cutC, fallC, scanY, scanOn, stamp; int gId;
vec3 off[5];
const vec2 B[5] = vec2[5](vec2(-9., -.48), vec2(-.48, -.16), vec2(-.16, .16), vec2(.16, .48), vec2(.48, 9.));

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + 1.), f.x), f.y); }
float fbm(vec2 p) { float s = 0., a = .5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 7.1; a *= .5; } return s; }

// the outline wanders a little, as a real trunk does; the bark relief is in the colour, not the distance
float logR(vec3 q) { float a = atan(q.y, q.x); return R * (1. + .035 * (vnoise(vec2(a * 1.6 + 2., q.z * .7)) - .5)) + .012 * (vnoise(vec2(a * 9., q.z * 3.)) - .5); }
float logSd(vec3 q) { return max(length(q.xy) - logR(q), abs(q.z) - HL); }

float map(vec3 p) {
  if (cutC <= 0.) { gId = 2; return logSd(p) * .9; }
  float d = 1e3;
  for (int i = 0; i < 5; i++) {
    vec3 q = p - off[i];
    float s = max(logSd(q), max(B[i].x - q.x, q.x - B[i].y));
    if (s < d) { d = s; gId = i; }
  }
  return d * .9;
}
vec3 normalAt(vec3 p) {
  vec2 e = vec2(.0012, -.0012);
  return normalize(e.xyy * map(p + e.xyy) + e.yyx * map(p + e.yyx) + e.yxy * map(p + e.yxy) + e.xxx * map(p + e.xxx));
}

// growth rings: fixed in the wood, so a growing trunk adds new ones at the edge and keeps the old ones where they were
vec3 wood(vec3 q, vec3 n) {
  vec2 wob = .02 * vec2(vnoise(vec2(q.z * 1.3, 3.)) - .5, vnoise(vec2(q.z * 1.1, -5.)) - .5) + .012 * (vec2(fbm(q.xy * 3.), fbm(q.yx * 3. + 4.)) - .5);
  float r = length(q.xy + wob), fr = fract(r * RINGS);
  // earlywood fades slowly into a sharp latewood band, as in spruce and pine
  float late = pow(S(.35, .9, fr), 2.2) * S(1., .93, fr);
  float sap = S(.45, .7, r / max(R, .01));
  vec3 early = mix(vec3(.72, .46, .26), vec3(.9, .74, .5), sap), lw = mix(vec3(.42, .22, .1), vec3(.62, .4, .2), sap);
  vec3 c = mix(early, lw, late);
  c *= .88 + .24 * fbm(vec2(r * 18., q.z * .9 + atan(q.y, q.x) * .4));
  float cap = S(.8, .95, abs(n.z));
  // end grain: a little darker, the pith, two drying checks
  c *= mix(1., .9, cap);
  c = mix(c, vec3(.25, .15, .08), S(.022, .008, r) * cap);
  for (int i = 0; i < 2; i++) {
    float a = i == 0 ? 2.2 : -.6, len = R * (i == 0 ? .62 : .4);
    vec2 dir = vec2(cos(a), sin(a));
    float along = dot(q.xy, dir), w = .0035 * (1. - along / len);
    float crack = S(w, w * .3, abs(dot(q.xy, vec2(-dir.y, dir.x)) + .006 * sin(along * 40.))) * step(.03, along) * step(along, len);
    c = mix(c, vec3(.12, .07, .04), crack * cap * .9);
  }
  // a click sends a light ring out from the pith
  float ripple = (1. - uPulse) * R;
  c += vec3(.35, .3, .14) * uPulse * S(.03, 0., abs(r - ripple)) * cap;
  return c;
}
vec3 bark(vec3 q) {
  float a = atan(q.y, q.x);
  // long vertical plates split by deep fissures, stretched along the trunk
  float plates = fbm(vec2(a * 7., q.z * 1.1)), fiss = S(.5, .38, plates) + .5 * S(.06, .0, abs(vnoise(vec2(a * 22., q.z * .9)) - .5));
  vec3 c = mix(vec3(.2, .13, .09), vec3(.36, .27, .2), fbm(vec2(a * 40., q.z * 14.)));
  return c * (1. - clamp(fiss, 0., 1.) * .8) * .75;
}

vec3 env(vec3 d) {
  vec3 c = vec3(.02, .024, .022);
  c += vec3(1., .96, .9) * 1.2 * S(.55, .85, d.y);
  c += vec3(.6, .7, .8) * .25 * S(.6, .9, -d.x) * S(-.2, .3, d.y);
  return c;
}

void main() {
  // the trunk grows quickly at first, then slower, like a real one
  float g = 1. - pow(1. - uP, 2.2);
  R = mix(.14, .86, g);
  scanOn = S(.0, .05, uF) * S(.5, .44, uF);
  scanY = mix(R + .15, -R - .15, S(.02, .42, uF));
  cutC = S(.46, .66, uF);
  fallC = S(.58, .9, uF);
  stamp = S(.74, .92, uF);
  float fw = S(.3, 1., cutC);
  off[2] = vec3(0, 0, .8 * fw);
  off[1] = vec3(-.05 * cutC, 0, .32 * fw);
  off[3] = vec3(.05 * cutC, 0, .32 * fw);
  // the outer slabs drop away to the sides, clear of the camera
  off[0] = vec3(-.1 * cutC - 1.6 * fallC, -5. * fallC * fallC, -1.2 * fallC);
  off[4] = vec3(.1 * cutC + 1.6 * fallC, -5. * fallC * fallC, -1.2 * fallC);

  vec2 uv = (gl_FragCoord.xy - .5 * uRes) / uRes.y;
  float yaw = uYaw, pitch = uPitch;
  vec3 ta = vec3(0, -.02, mix(.25, .85, stamp));
  // the camera backs off as the trunk thickens, then moves in on the board
  float D = mix(mix(5.2, 7.4, g), 5.6, S(.5, 1., uF));
  vec3 ro = ta + D * vec3(sin(yaw) * cos(pitch), sin(pitch), cos(yaw) * cos(pitch));
  vec3 fw3 = normalize(ta - ro), rt = normalize(cross(fw3, vec3(0, 1, 0))), up = cross(rt, fw3);
  vec3 rd = normalize(fw3 * 2.1 + uv.x * rt + uv.y * up);

  // backdrop: a dark hall with a soft pool of light behind the trunk
  vec3 col = vec3(.004, .005, .0045) + vec3(.03, .032, .028) * exp(-dot(uv, uv) * 3.);
  float t = .5, hit = 0.;
  for (int i = 0; i < 110; i++) {
    float d = map(ro + rd * t);
    if (d < .0007 * t) { hit = 1.; break; }
    t += d;
    if (t > 12.) break;
  }
  if (hit > .5) {
    vec3 p = ro + rd * t, n = normalAt(p);
    int id = gId;
    vec3 q = p - off[id];
    float rl = logR(q), rr = length(q.xy);
    float isBark = S(rl - BARK - .004, rl - BARK + .004, rr);
    vec3 base = mix(wood(q, n), bark(q), isBark);
    // a fresh, thin cambium layer between wood and bark
    base = mix(base, vec3(.93, .82, .56), S(.01, 0., abs(rr - (rl - BARK))) * .6 * (1. - isBark));
    float cap = S(.8, .95, n.z);
    // the brand burnt into the face of the centre board
    if (id == 2 && stamp > 0.) {
      vec2 lu = q.xy / .24 + .5;
      if (all(greaterThan(lu, vec2(0))) && all(lessThan(lu, vec2(1)))) {
        vec3 lg = texture(uLogo, vec2(lu.x, 1. - lu.y)).rgb;
        float m = (1. - S(.75, .95, dot(lg, vec3(.33)))) * cap * stamp;
        base = mix(base, lg * .9, m);
      }
    }
    vec3 L = normalize(vec3(-.55, .75, .6)), H = normalize(L - rd);
    float dif = max(dot(n, L), 0.), fill = max(dot(n, normalize(vec3(.8, .2, .4))), 0.);
    float ao = 1.;
    for (int k = 1; k < 4; k++) { float h = .05 * float(k); ao -= (h - map(p + n * h)) * (1.2 / float(k)); }
    ao = clamp(ao, .25, 1.);
    float spec = pow(max(dot(n, H), 0.), 24.) * mix(.15, .03, isBark);
    col = base * (dif * vec3(1.15, 1.05, .92) + fill * vec3(.2, .24, .3) + .12) * ao + spec;
    col += env(reflect(rd, n)) * .04 * (1. - isBark);
    float rim = pow(1. - max(dot(n, -rd), 0.), 4.);
    col += vec3(.5, .55, .6) * rim * .12;
    // the scan line, and the cut plan it leaves behind it on the end grain
    col += vec3(.15, 1., .45) * 2.4 * S(.014, .0, abs(p.y - scanY)) * scanOn;
    float plan = 0.;
    for (int k = 0; k < 2; k++) plan = max(plan, S(.009, .0, abs(abs(q.x) - (k == 0 ? .16 : .48))));
    col = mix(col, vec3(.2, 1., .5), plan * cap * step(scanY, p.y) * S(.02, .1, uF) * (1. - cutC) * (1. - isBark) * .9);
    // fresh saw cuts glow for a moment as they open
    float kerf = S(.8, .95, abs(n.x)) * S(.0, .3, cutC) * S(1., .6, cutC);
    col += vec3(.15, 1., .45) * kerf * .03;
  }
  // the scanner's light sheet, drawn where the ray passes through it before the wood
  float ts = (scanY - ro.y) / rd.y;
  if (scanOn > 0. && ts > 0. && (hit < .5 || ts < t)) {
    vec3 ps = ro + rd * ts;
    float a = S(1.6, .2, abs(ps.x)) * S(-1.6, -.6, ps.z) * S(2.2, 1.2, ps.z);
    col += vec3(.1, .8, .35) * .07 * a * scanOn;
  }
  col = col / (col + .55) * 1.55;
  col = pow(col, vec3(1. / 2.2));
  col *= 1. - .35 * dot(uv, uv);
  o = vec4(col, 1);
}`;

const MIN_LOAD = 4.2, FINISH = 3.6, HOLD = .35;

let gl, canvas, u, css = { w: 1, h: 1 }, scale = 1, maxScale = 1;
let target = 0, finished = false, p = 0, f = 0, hold = 0, doneSent = false, sentP = -1, sentF = -1;
let slow = 0, fast = 0, stalls = 0, then = 0, frozen = null;
const ptr = { tx: 0, ty: 0, x: 0, y: 0, pulse: 0 };
const fail = () => { postMessage({ fail: true }); close(); };
const tick = self.requestAnimationFrame ? (fn) => requestAnimationFrame(fn) : (fn) => setTimeout(() => fn(performance.now()), 16);

function compile(type, src) {
  const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  return s;
}
function resize() {
  canvas.width = Math.round(css.w * scale); canvas.height = Math.round(css.h * scale);
  gl.viewport(0, 0, canvas.width, canvas.height);
}
async function loadLogo(tex) {
  try {
    const img = await createImageBitmap(await (await fetch('/img/logo.png')).blob());
    gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  } catch { /* a board without the brand is still a board */ }
}
function start(msg) {
  canvas = msg.canvas; css = msg;
  gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) return fail();
  // no real GPU: the log would starve the scenes the page is preparing on the same CPU
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  if (info && /swiftshader|llvmpipe|software|basic render/i.test(gl.getParameter(info.UNMASKED_RENDERER_WEBGL))) return fail();
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return fail();
  gl.useProgram(prog);
  u = Object.fromEntries(['uRes', 'uT', 'uP', 'uF', 'uYaw', 'uPitch', 'uPulse', 'uLogo'].map((n) => [n, gl.getUniformLocation(prog, n)]));
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
  loadLogo(tex);
  // Above 1x so edges stay clean on ordinary monitors; the frame loop lowers it on a slow GPU.
  scale = maxScale = Math.min(Math.max(msg.dpr, 1.25), 1.5);
  resize();
  then = performance.now();
  tick(frame);
}
function frame(now) {
  const raw = now - then, dt = Math.min(raw / 1000, .1); then = now;
  // one long stall is a shader compile or a hidden tab and says nothing about the GPU; several in a row do
  if (raw > 250) { if (++stalls > 4) return fail(); } else {
    stalls = 0;
    if (dt > .03) {
      fast = 0;
      if (++slow > 20) { slow = 0; if (scale > .55) { scale *= .85; resize(); } else return fail(); }
    } else if (dt < .018) { slow = 0; if (++fast > 45 && scale < maxScale) { scale = Math.min(maxScale, scale * 1.15); fast = 0; resize(); } }
  }
  // The trunk chases real progress at a set pace: work finishes in bursts, a tree does not.
  if (frozen !== null) { p = 1; f = frozen; finished = false; }
  const goal = finished ? 1 : target;
  if (p < goal) p = Math.min(goal, p + dt / MIN_LOAD);
  if (finished && p === 1) f = Math.min(1, f + dt / FINISH);
  if (f === 1 && !doneSent && (hold += dt) > HOLD) { doneSent = true; postMessage({ done: true }); }
  if (Math.round(p * 100) !== sentP || f !== sentF) { sentP = Math.round(p * 100); sentF = f; postMessage({ p: sentP, f }); }

  ptr.x += (ptr.tx - ptr.x) * Math.min(dt * 3, 1); ptr.y += (ptr.ty - ptr.y) * Math.min(dt * 3, 1);
  ptr.pulse *= Math.exp(-dt * 1.6);
  const t = now / 1000, settle = Math.min(f * 1.6, 1);
  // three-quarter view while it grows, turning to face the board once it is sawn
  const yaw = (.62 + Math.sin(t * .25) * .06) * (1 - settle) + .18 * settle + ptr.x * .35, pitch = .2 + ptr.y * .12 - settle * .08;
  gl.uniform2f(u.uRes, canvas.width, canvas.height);
  gl.uniform1f(u.uT, t); gl.uniform1f(u.uP, p); gl.uniform1f(u.uF, f);
  gl.uniform1f(u.uYaw, yaw); gl.uniform1f(u.uPitch, pitch); gl.uniform1f(u.uPulse, ptr.pulse);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  tick(frame);
}
onmessage = ({ data: m }) => {
  if (m.canvas) start(m);
  else if (m.target !== undefined) target = m.target;
  else if (m.finish) finished = true;
  else if (m.freeze !== undefined) frozen = m.freeze;
  else if (m.x !== undefined) { ptr.tx = m.x; ptr.ty = -m.y; }
  else if (m.press) ptr.pulse = 1;
  else if (m.w && gl) { css = m; resize(); }
};
