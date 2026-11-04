// Wood surfaces painted in code: grain that bends around its knots, cracks, blue stain, saw marks.
// The same defect list drives the picture, the scanner's markers and the digital twin, so they always agree.

function noise2(seed) {
  const h = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453; return s - Math.floor(s); };
  const n = (x, y) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const a = h(ix, iy), b = h(ix + 1, iy), c = h(ix, iy + 1), d = h(ix + 1, iy + 1);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  };
  return (x, y, oct = 3) => { let s = 0, a = .5; for (let i = 0; i < oct; i++) { s += a * n(x, y); x = x * 2.03 + 7.1; y = y * 2.03 + 3.7; a *= .5; } return s; };
}
const sm = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;

// len and wid in metres; u runs along the board from its left end, v across it from -wid/2 (canvas top) to +wid/2.
export function woodCanvas({ len, wid, px = 2048, rows = 128, defects = [], seed = 1, rough = false }) {
  const W = px, H = rows, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d'), img = ctx.createImageData(W, H), d = img.data, fbm = noise2(seed);
  const knots = defects.filter((k) => k.type === 'knot'), cracks = defects.filter((k) => k.type === 'crack'), stains = defects.filter((k) => k.type === 'stain');
  for (let y = 0; y < H; y++) {
    const v = (y / (H - 1) - .5) * wid;
    for (let x = 0; x < W; x++) {
      const u = (x / (W - 1)) * len;
      // flat-sawn grain: long lines that wander, pushed aside by every knot
      let ph = v * 70 + 2.4 * fbm(u * .45, v * 5) + .5 * fbm(u * 3, v * 40, 2);
      let kd = 9;
      for (const k of knots) {
        const dx = (u - k.u) * .55, dy = v - k.v, dd = dx * dx + dy * dy;
        ph += (k.r * 60 * dy) / (dd + k.r * k.r * 3);
        const dk = Math.sqrt((u - k.u) ** 2 * .45 + dy * dy) / k.r;
        if (dk < kd) kd = dk;
      }
      const ring = ph - Math.floor(ph), late = sm(.5, .86, ring) * sm(1, .9, ring);
      let r = mix(228, 178, late), g = mix(192, 124, late), b = mix(142, 74, late);
      const pore = .93 + .1 * fbm(u * 60, v * 400, 2);
      r *= pore; g *= pore; b *= pore;
      // knot: dark core with its own rings and a darker rim
      if (kd < 1.25) {
        const core = sm(1.08, .9, kd), rim = sm(.75, .95, kd) * sm(1.2, 1, kd);
        const kr = .75 + .25 * Math.sin(kd * 22 + fbm(u * 50, v * 50) * 4);
        r = mix(r, 118 * kr, core); g = mix(g, 66 * kr, core); b = mix(b, 30 * kr, core);
        r = mix(r, 70, rim * .6); g = mix(g, 40, rim * .6); b = mix(b, 22, rim * .6);
      }
      for (const c of cracks) {
        if (u < c.u0 || u > c.u1) continue;
        const t = (u - c.u0) / (c.u1 - c.u0), w = .0028 * Math.sin(Math.PI * t) + .0004;
        const cv2 = c.v + .006 * Math.sin(u * 37) + .003 * (fbm(u * 20, 1) - .5);
        const k = sm(w, w * .3, Math.abs(v - cv2));
        r = mix(r, 38, k); g = mix(g, 24, k); b = mix(b, 16, k);
      }
      // blue stain: a fungus, grey-blue and patchy, following the grain
      for (const s of stains) {
        const dd = Math.sqrt(((u - s.u) / (s.r * 2.2)) ** 2 + ((v - s.v) / (wid * .6)) ** 2);
        const k = sm(1, .3, dd + (fbm(u * 14, v * 60) - .5) * .7) * (.6 + .4 * fbm(u * 40, v * 3));
        r = mix(r, 96, k * .8); g = mix(g, 108, k * .8); b = mix(b, 118, k * .8);
      }
      if (rough) {
        // band saw marks across the board, a grey cast and torn fibres
        const marks = .93 + .07 * Math.sin(u * 210 + v * 9 + fbm(u * 4, v * 4) * 3);
        const fur = .9 + .16 * fbm(u * 90, v * 300, 2);
        const grey = (r + g + b) / 3;
        r = mix(r, grey, .35) * marks * fur * .86; g = mix(g, grey, .35) * marks * fur * .86; b = mix(b, grey, .35) * marks * fur * .86;
      }
      const i = (y * W + x) * 4;
      d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

// End grain of a flat-sawn board: arcs of a trunk whose pith sits below the board.
export function endGrainCanvas({ wid, thick, seed = 2, px = 256 }) {
  const W = px, H = Math.max(32, Math.round(px * thick / wid)), cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d'), img = ctx.createImageData(W, H), d = img.data, fbm = noise2(seed);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const px2 = (x / W - .5) * wid, py = (1 - y / H) * thick + .09;
    const rr = Math.sqrt(px2 * px2 + py * py) * 70 + fbm(x * .05, y * .05) * .6, ring = rr - Math.floor(rr);
    const late = sm(.55, .85, ring) * sm(1, .9, ring), n = .85 + .2 * fbm(x * .3, y * .3, 2);
    const i = (y * W + x) * 4;
    d[i] = mix(200, 140, late) * n; d[i + 1] = mix(160, 92, late) * n; d[i + 2] = mix(112, 52, late) * n; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}
