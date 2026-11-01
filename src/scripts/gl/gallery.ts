import * as THREE from 'three';
import type { Engine } from './engine';

const vert = /* glsl */ `
uniform vec2 uSize;
uniform float uVel, uHover, uTime, uFull;
uniform vec2 uMouse;
varying vec2 vUv;
varying float vShade;
void main(){
  vUv = uv;
  vec3 p = position * vec3(uSize, 1.0);
  float arc = sin(uv.x * 3.14159);
  // scroll velocity bends the sheet like paper in the wind
  p.z -= arc * uVel * 2.2 * (1.0 - uFull);
  p.y += arc * uVel * 0.35 * (1.0 - uFull);
  // hover: the sheet swells toward the viewer and ripples from the cursor
  float md = distance(uv, uMouse);
  float swell = (1.0 - smoothstep(0.0, 0.75, md)) * uHover;
  p.z += swell * 60.0 + sin(md * 28.0 - uTime * 5.0) * 5.0 * uHover * (1.0 - md);
  vShade = swell;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const frag = /* glsl */ `
uniform sampler2D uTex;
uniform vec2 uSize, uImg;
uniform float uVel, uHover, uReveal, uFull, uTime;
uniform vec2 uMouse;
uniform vec3 uNight, uIvory, uEmber;
varying vec2 vUv;
varying float vShade;
void main(){
  // cover-fit, centred
  vec2 s = uSize / uImg;
  float sc = max(s.x, s.y);
  vec2 uv = (vUv - 0.5) * (uSize / (uImg * sc)) + 0.5;
  uv = (uv - 0.5) * (1.0 - 0.06 * uHover * (1.0 - uFull)) + 0.5;
  // liquid displacement under the cursor
  float md = distance(vUv, uMouse);
  uv += (vUv - uMouse) * sin(md * 30.0 - uTime * 6.0) * 0.012 * uHover * (1.0 - md);
  // velocity → RGB split
  float sh = clamp(uVel * 0.0016, -0.03, 0.03);
  vec3 col;
  col.r = texture2D(uTex, uv + vec2(sh, 0.0)).r;
  col.g = texture2D(uTex, uv).g;
  col.b = texture2D(uTex, uv - vec2(sh, 0.0)).b;
  // at rest: warm, half-desaturated and slightly lifted (the screenshots are dark UIs); full colour when played
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  vec3 rest = mix(col, vec3(l) * vec3(1.06, 0.97, 0.88), 0.55);
  rest = rest * 1.12 + uEmber * 0.035;
  float colour = max(uHover, uFull);
  col = mix(rest, col, colour);
  col += vShade * 0.04;
  // reveal: a wipe from the bottom with a soft ember edge
  float edge = vUv.y - (1.0 - uReveal) * 1.15 + 0.15;
  float a = smoothstep(0.0, 0.02, edge);
  col = mix(col, uEmber, (1.0 - smoothstep(0.0, 0.08, edge)) * step(uReveal, 0.999) * a);
  gl_FragColor = vec4(col, a);
}`;

interface Slide {
  el: HTMLElement;
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  hover: number;
  hoverTarget: number;
  mouse: THREE.Vector2;
  full: number;
}

const geo = new THREE.PlaneGeometry(1, 1, 32, 32);

async function textureFor(el: HTMLElement): Promise<{ tex: THREE.Texture; w: number; h: number } | null> {
  const img = el.querySelector('img');
  const svg = el.querySelector('svg');
  let src: string | null = null;
  let revoke = false;
  if (img) {
    if (!img.complete) await new Promise((r) => { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); });
    src = img.currentSrc || img.src;
  } else if (svg) {
    const clone = svg.cloneNode(true) as SVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', '1600');
    clone.setAttribute('height', '1000');
    src = URL.createObjectURL(new Blob([clone.outerHTML], { type: 'image/svg+xml' }));
    revoke = true;
  }
  if (!src) return null;
  const image = new Image();
  image.decoding = 'async';
  image.src = src;
  try { await image.decode(); } catch { return null; }
  let source: TexImageSource = image;
  if (revoke) {
    // rasterise SVG so it uploads as a normal texture
    const c = document.createElement('canvas');
    c.width = 1600; c.height = 1000;
    c.getContext('2d')!.drawImage(image, 0, 0, 1600, 1000);
    source = c;
    URL.revokeObjectURL(src);
  }
  const tex = new THREE.Texture(source as any);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return { tex, w: (source as any).width || 1600, h: (source as any).height || 1000 };
}

export class Gallery {
  slides: Slide[] = [];
  private offs: (() => void)[] = [];
  private group = new THREE.Group();
  velocity = 0;
  expanding: Slide | null = null;

  constructor(private engine: Engine, els: HTMLElement[]) {
    engine.scene.add(this.group);
    els.forEach((el) => this.add(el));
    this.offs.push(engine.onTick((t, dt) => this.tick(t, dt)));
  }

  private async add(el: HTMLElement) {
    const t = await textureFor(el);
    if (!t) return;
    const mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      uniforms: {
        uTex: { value: t.tex }, uImg: { value: new THREE.Vector2(t.w, t.h) }, uSize: { value: new THREE.Vector2(1, 1) },
        uVel: { value: 0 }, uHover: { value: 0 }, uReveal: { value: 0 }, uFull: { value: 0 }, uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uNight: { value: new THREE.Color('#14100e') }, uIvory: { value: new THREE.Color('#f2ece2') }, uEmber: { value: new THREE.Color('#ff5a1f') },
      },
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 5;
    this.group.add(mesh);
    const slide: Slide = { el, mesh, hover: 0, hoverTarget: 0, mouse: new THREE.Vector2(0.5, 0.5), full: 0 };
    this.slides.push(slide);
    el.closest('[data-slide]')?.classList.add('is-gl');
    const host = (el.closest('a') as HTMLElement) || el;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      slide.mouse.set((e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height);
    };
    const enter = () => (slide.hoverTarget = 1);
    const leave = () => (slide.hoverTarget = 0);
    host.addEventListener('pointermove', move);
    host.addEventListener('pointerenter', enter);
    host.addEventListener('pointerleave', leave);
    this.offs.push(() => { host.removeEventListener('pointermove', move); host.removeEventListener('pointerenter', enter); host.removeEventListener('pointerleave', leave); });
    // reveal when it first enters the viewport
    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      io.disconnect();
      const u = mat.uniforms.uReveal; const t0 = performance.now();
      const step = () => { const p = Math.min(1, (performance.now() - t0) / 1300); u.value = 1 - Math.pow(1 - p, 3); if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }, { threshold: 0.05 });
    io.observe(el);
    this.offs.push(() => io.disconnect());
  }

  /** grow a slide to cover the viewport; resolves when it does */
  expand(el: HTMLElement) {
    const s = this.slides.find((x) => x.el === el);
    if (!s) return Promise.resolve(false);
    this.expanding = s;
    s.hoverTarget = 1;
    s.mesh.renderOrder = 10;
    return new Promise<boolean>((res) => {
      const t0 = performance.now();
      const step = () => {
        const p = Math.min(1, (performance.now() - t0) / 900);
        s.full = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        if (p < 1) requestAnimationFrame(step); else res(true);
      };
      requestAnimationFrame(step);
    });
  }

  private tick(t: number, dt: number) {
    const e = this.engine;
    const k = 1 - Math.pow(0.002, dt);
    for (const s of this.slides) {
      const r = s.el.getBoundingClientRect();
      const u = s.mesh.material.uniforms;
      const vis = r.bottom > -200 && r.top < e.h + 200 && r.right > -400 && r.left < e.w + 400;
      s.mesh.visible = vis || s.full > 0;
      if (!s.mesh.visible) continue;
      s.hover += (s.hoverTarget - s.hover) * k;
      const c = e.rectToWorld(r);
      const f = s.full;
      s.mesh.position.set(c.x * (1 - f), c.y * (1 - f), 0);
      (u.uSize.value as THREE.Vector2).set(r.width + (e.w - r.width) * f, r.height + (e.h - r.height) * f);
      u.uVel.value += (this.velocity - u.uVel.value) * 0.15;
      u.uHover.value = s.hover;
      u.uFull.value = f;
      u.uTime.value = t;
      (u.uMouse.value as THREE.Vector2).lerp(s.mouse, 0.12);
      if (f > 0) u.uReveal.value = 1;
    }
  }

  destroy() {
    this.offs.forEach((fn) => fn());
    this.slides.forEach((s) => { s.mesh.material.uniforms.uTex.value.dispose(); s.mesh.material.dispose(); });
    this.engine.scene.remove(this.group);
    this.slides = [];
  }
}
