import * as THREE from 'three';
import type { Engine } from './engine';

const vert = /* glsl */ `
uniform vec2 uSize;
uniform float uVel, uFull;
varying vec2 vUv;
void main(){
  vUv = uv;
  vec3 p = position * vec3(uSize, 1.0);
  float arc = sin(uv.x * 3.14159);
  // scroll velocity bends the sheet like paper in the wind
  float bend = clamp(uVel, -8.0, 8.0) * (1.0 - uFull);
  p.z -= arc * bend;
  p.y += arc * bend * 0.15;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const frag = /* glsl */ `
uniform sampler2D uTex;
uniform vec2 uSize, uImg;
uniform float uReveal;
uniform vec3 uEmber;
varying vec2 vUv;
void main(){
  // cover-fit, centred
  vec2 s = uSize / uImg;
  float sc = max(s.x, s.y);
  vec2 uv = (vUv - 0.5) * (uSize / (uImg * sc)) + 0.5;
  // Sample all channels together: no colour fringes or liquid distortion.
  vec3 col = texture2D(uTex, uv).rgb;
  // reveal: a wipe from the bottom with a soft ember edge
  float edge = vUv.y - (1.0 - uReveal) * 1.15 + 0.15;
  float a = smoothstep(0.0, 0.02, edge);
  col = mix(col, uEmber, (1.0 - smoothstep(0.0, 0.08, edge)) * step(uReveal, 0.999) * a);
  gl_FragColor = vec4(col, a);
  // Textures are decoded to linear RGB; match the original DOM image on output.
  #include <colorspace_fragment>
}`;

interface Slide {
  el: HTMLElement;
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
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
  private destroyed = false;
  private offs: (() => void)[] = [];
  private group = new THREE.Group();
  velocity = 0;
  expanding: Slide | null = null;

  constructor(private engine: Engine, els: HTMLElement[]) {
    engine.scene.add(this.group);
    els.forEach((el) => this.add(el));
    this.offs.push(engine.onTick((_t, dt) => this.tick(dt)));
  }

  private async add(el: HTMLElement) {
    const t = await textureFor(el);
    if (!t) return;
    if (this.destroyed) { t.tex.dispose(); return; }
    const mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      uniforms: {
        uTex: { value: t.tex }, uImg: { value: new THREE.Vector2(t.w, t.h) }, uSize: { value: new THREE.Vector2(1, 1) },
        uVel: { value: 0 }, uReveal: { value: 0 }, uFull: { value: 0 },
        uEmber: { value: new THREE.Color('#ff5a1f') },
      },
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 5;
    this.group.add(mesh);
    const slide: Slide = { el, mesh, full: 0 };
    this.slides.push(slide);
    el.closest('[data-slide]')?.classList.add('is-gl');
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

  private tick(dt: number) {
    const e = this.engine;
    const k = 1 - Math.pow(0.002, dt);
    // ScrollTrigger stops updating at rest; let the last impulse settle.
    this.velocity *= Math.exp(-12 * dt);
    for (const s of this.slides) {
      const r = s.el.getBoundingClientRect();
      const u = s.mesh.material.uniforms;
      const vis = r.bottom > -200 && r.top < e.h + 200 && r.right > -400 && r.left < e.w + 400;
      s.mesh.visible = vis || s.full > 0;
      if (!s.mesh.visible) continue;
      const c = e.rectToWorld(r);
      const f = s.full;
      s.mesh.position.set(c.x * (1 - f), c.y * (1 - f), 0);
      (u.uSize.value as THREE.Vector2).set(r.width + (e.w - r.width) * f, r.height + (e.h - r.height) * f);
      u.uVel.value += (this.velocity - u.uVel.value) * k;
      u.uFull.value = f;
      if (f > 0) u.uReveal.value = 1;
    }
  }

  destroy() {
    this.destroyed = true;
    this.offs.forEach((fn) => fn());
    this.slides.forEach((s) => {
      s.el.closest('[data-slide]')?.classList.remove('is-gl');
      s.mesh.material.uniforms.uTex.value.dispose();
      s.mesh.material.dispose();
    });
    this.engine.scene.remove(this.group);
    this.slides = [];
  }
}
