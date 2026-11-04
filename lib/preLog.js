// Starts the preloader's log in a worker. Kept free of three and gsap so it runs before the heavy page code has loaded.
let handle;
export function startLog() {
  if (handle !== undefined) return handle; // React Strict Mode runs effects twice in development
  handle = null;
  const canvas = document.getElementById('preGl'), pre = document.getElementById('pre');
  if (!canvas?.transferControlToOffscreen || matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
  let worker;
  try { worker = new Worker('/pre-log.worker.js'); } catch { return null; }

  let resolveDone;
  const done = new Promise((r) => { resolveDone = r; });
  const move = (e) => worker.postMessage({ x: e.clientX / innerWidth * 2 - 1, y: e.clientY / innerHeight * 2 - 1 });
  const press = () => worker.postMessage({ press: true });
  const resize = () => worker.postMessage({ w: innerWidth, h: innerHeight });
  const logo = pre.querySelector('.pre-inner img');
  const m = {
    active: true, done, onProgress: () => {}, onFail: () => {},
    target: (v) => worker.postMessage({ target: v }),
    finish: () => worker.postMessage({ finish: true }),
    stop() {
      worker.terminate();
      removeEventListener('pointermove', move); removeEventListener('resize', resize); pre.removeEventListener('pointerdown', press);
    },
  };
  // Anything going wrong, a slow GPU included, drops back to the plain count and bar.
  const fail = () => { if (!m.active) return; m.active = false; m.stop(); pre.classList.remove('live'); canvas.style.display = 'none'; logo.style.opacity = ''; resolveDone(); m.onFail(); };
  worker.onerror = fail;
  worker.onmessage = ({ data }) => {
    if (data.fail) fail();
    else if (data.done) resolveDone();
    else { m.onProgress(data.p, data.f); logo.style.opacity = 1 - Math.min(Math.max(data.f - .6, 0) * 6, 1); } // the mark moves onto the board
  };
  const off = canvas.transferControlToOffscreen();
  pre.classList.add('live');
  worker.postMessage({ canvas: off, w: innerWidth, h: innerHeight, dpr: devicePixelRatio }, [off]);
  // tuning aid: ?pre=0.7 holds the saw-up at that point and keeps the curtains shut
  const hold = new URLSearchParams(location.search).get('pre');
  if (hold !== null) { m.frozen = true; worker.postMessage({ freeze: +hold }); }
  addEventListener('pointermove', move, { passive: true }); addEventListener('resize', resize); pre.addEventListener('pointerdown', press);
  return handle = m;
}
