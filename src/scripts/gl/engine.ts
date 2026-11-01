import * as THREE from 'three';

export type Tick = (time: number, dt: number) => void;

export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const lowTier =
  matchMedia('(pointer: coarse)').matches || innerWidth < 768 || (navigator.hardwareConcurrency || 8) <= 4;

/**
 * One persistent renderer behind the DOM. The perspective camera is calibrated so
 * that 1 world unit = 1 CSS pixel on the z=0 plane, origin at the viewport centre,
 * y up — which lets WebGL planes sit exactly on top of DOM rectangles.
 */
export class Engine {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(35, 1, 1, 10000);
  w = innerWidth;
  h = innerHeight;
  dpr = 1;
  /** pointer in world px (origin centre, y up) */
  pointer = new THREE.Vector2(0, 0);
  pointerActive = false;
  private ticks = new Set<Tick>();
  private resizers = new Set<() => void>();
  private running = false;
  private last = performance.now();
  private start = performance.now();

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 0);
    this.resize();
    let rt = 0;
    // on touch devices the address bar showing/hiding changes only the height: ignore that,
    // otherwise every scroll direction change would rebuild the scene (the visible "re-alignment")
    const touch = matchMedia('(pointer: coarse)').matches;
    addEventListener('resize', () => {
      if (touch && innerWidth === this.w) return; // height-only change = address bar
      clearTimeout(rt); rt = window.setTimeout(() => this.resize(), 120);
    });
    addEventListener('pointermove', (e) => {
      this.pointer.set(e.clientX - this.w / 2, this.h / 2 - e.clientY);
      this.pointerActive = e.pointerType === 'mouse' || e.pointerType === 'pen';
    }, { passive: true });
    document.addEventListener('pointerleave', () => (this.pointerActive = false));
  }

  get time() { return (performance.now() - this.start) / 1000; }

  /** height of the large viewport (address bar hidden) — the canvas is sized with 100lvh */
  private lvh() {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;top:0;height:100lvh;width:0;visibility:hidden;pointer-events:none';
    document.body.appendChild(probe);
    const h = probe.offsetHeight || innerHeight;
    probe.remove();
    return h;
  }

  resize() {
    this.w = innerWidth;
    this.h = matchMedia('(pointer: coarse)').matches ? this.lvh() : innerHeight;
    this.dpr = Math.min(devicePixelRatio || 1, lowTier ? 1.25 : 1.75);
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(this.w, this.h, false);
    this.camera.aspect = this.w / this.h;
    this.camera.position.z = this.h / 2 / Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    this.camera.near = 1;
    this.camera.far = this.camera.position.z * 6;
    this.camera.updateProjectionMatrix();
    this.resizers.forEach((fn) => fn());
  }

  onTick(fn: Tick) { this.ticks.add(fn); return () => this.ticks.delete(fn); }
  onResize(fn: () => void) { this.resizers.add(fn); return () => this.resizers.delete(fn); }

  /** CSS rect → world centre */
  rectToWorld(r: DOMRect) {
    return { x: r.left + r.width / 2 - this.w / 2, y: this.h / 2 - r.top - r.height / 2 };
  }

  /** call once per frame from the app's ticker (after scroll + tweens have updated the DOM) */
  render() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const t = this.time;
    this.ticks.forEach((fn) => fn(t, dt));
    this.renderer.render(this.scene, this.camera);
  }

  run() {
    if (this.running || document.hidden) return;
    this.running = true;
    this.last = performance.now();
    const loop = () => {
      if (!this.running) return;
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  stop() { this.running = false; }
}

export function createEngine(canvas: HTMLCanvasElement): Engine | null {
  try {
    const test = document.createElement('canvas');
    if (!(test.getContext('webgl2') || test.getContext('webgl'))) return null;
    return new Engine(canvas);
  } catch (e) {
    console.warn('[gl]', e);
    return null;
  }
}
