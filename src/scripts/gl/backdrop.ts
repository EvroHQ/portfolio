import * as THREE from "three";
import { type Engine, lowTier, reduceMotion } from "./engine";

/**
 * The site's background, drawn first in the shared canvas:
 * warm drifting smoke, a blueprint dot grid revealed by a light that follows the cursor,
 * a per-section mood (smoke amount, ember glow rising from the bottom) and a vignette.
 */

const vert = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const frag = /* glsl */ `
precision highp float;
uniform vec2 uRes;
uniform float uTime, uScroll, uSmoke, uGlow, uEmber, uLightOn, uPortrait;
uniform sampler2D uPortraitTex;
uniform vec2 uLight;          // cursor, CSS px from the top-left
varying vec2 vUv;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < OCTAVES; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}

void main(){
  vec2 px = vec2(vUv.x, 1.0 - vUv.y) * uRes;       // CSS px, top-left origin
  vec2 uv = px / uRes.y;
  vec3 night = vec3(0.047, 0.039, 0.035);           // #0c0a09
  vec3 ember = vec3(1.0, 0.353, 0.122);             // #ff5a1f
  vec3 ivory = vec3(0.949, 0.925, 0.886);
  vec3 col = night;

  // warm smoke drifting slowly, a little parallax with the scroll
  #if OCTAVES > 0
  float t = uTime * 0.018;
  vec2 q = uv * 1.6 + vec2(t, -uScroll * 0.00012);
  float sm = fbm(q + fbm(q * 0.7 + t * 1.3) * 1.6);
  sm = smoothstep(0.35, 0.95, sm);
  col += mix(ember * 0.55, ivory * 0.2, 0.35) * sm * 0.095 * uSmoke;
  #endif

  // ember glow rising from the bottom (stronger in the closing sections)
  col += ember * pow(1.0 - vUv.y, 3.0) * 0.16 * uGlow;
  col += ember * 0.018 * uEmber;

  // cursor light
  float d = length(px - uLight);
  float light = exp(-d / 360.0) * uLightOn;
  col += mix(ember, ivory, 0.35) * light * 0.07;

  // blueprint dot grid, almost invisible, revealed by the light
  float gap = 30.0;
  vec2 g = px + vec2(0.0, mod(uScroll * 0.35, gap));
  vec2 cell = mod(g, gap) - gap * 0.5;
  float pt = smoothstep(1.35, 0.35, length(cell));
  float reveal = 0.06 + light * 0.9;
  col += ivory * pt * reveal * 0.32;

  // halftone portrait (home hero): a finer dot screen, centred, each dot sized by the photo's brightness;
  // it rises with the scroll at half speed and fades out as the hero leaves, brighter under the cursor light
  if (uPortrait > 0.001) {
    float S = uRes.y * 0.96;
    vec2 o = vec2((uRes.x - S) * 0.5, (uRes.y - S) * 0.5 - uScroll * 0.5);
    float hg = max(6.0, floor(uRes.y / 120.0));          // ~120 rows over the screen height
    vec2 hc = (floor((px - o) / hg) + 0.5) * hg;          // this cell's centre, in portrait px
    vec2 hp = hc / S;
    float scrollOut = 1.0 - smoothstep(0.0, uRes.y * 0.8, uScroll);
    if (hp.x > 0.0 && hp.x < 1.0 && hp.y > 0.0 && hp.y < 1.0) {
      float lum = texture2D(uPortraitTex, vec2(hp.x, 1.0 - hp.y)).r;
      lum = smoothstep(0.03, 0.55, lum);                  // low-key photo: only the highlights carry it
      float r = hg * 0.5 * sqrt(lum) * 0.95;
      float hd = smoothstep(r + 0.7, r - 0.7, length(px - o - hc));
      float fade = scrollOut * smoothstep(1.0, 0.86, hp.y); // scroll out; soft bottom edge
      col += mix(ivory, ember, 0.25) * hd * (0.2 + light * 0.4) * fade * uPortrait;
    }
  }

  // vignette
  vec2 c = vUv - 0.5;
  col *= 1.0 - dot(c * vec2(1.1, 1.3), c * vec2(1.1, 1.3)) * 0.85;

  gl_FragColor = vec4(col, 1.0);
}`;

export class Backdrop {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  /** smoothed by tick() */
  target = { smoke: 1, glow: 0, ember: 0 };
  /** 1 on the home page (the halftone portrait behind the hero), 0 elsewhere; smoothed by tick() */
  portrait = 0;

  constructor(private engine: Engine) {
    const mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      defines: { OCTAVES: lowTier ? 0 : 4 },
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uRes: { value: new THREE.Vector2(engine.w, engine.h) },
        uTime: { value: 0 },
        uScroll: { value: 0 },
        uSmoke: { value: 1 },
        uGlow: { value: 0 },
        uEmber: { value: 0 },
        uLight: { value: new THREE.Vector2(engine.w * 0.6, engine.h * 0.4) },
        uLightOn: { value: 0 },
        uPortrait: { value: 0 },
        uPortraitTex: { value: null },
      },
    });
    // the halftone portrait's source: a small grayscale photo, sampled per dot (shows once loaded)
    new THREE.TextureLoader().load(
      `${import.meta.env.BASE_URL.replace(/\/$/, "")}/portrait.png`,
      (tex) => {
        tex.minFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        mat.uniforms.uPortraitTex.value = tex;
      },
    );
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    this.mesh.renderOrder = -10;
    this.mesh.frustumCulled = false;
    engine.scene.add(this.mesh);
    this.fit();
    engine.onResize(() => this.fit());
    engine.onTick((t, dt) => this.tick(t, dt));
  }

  /** the plane sits on z=0, where 1 unit = 1 CSS px: just make it the viewport's size */
  private fit() {
    this.mesh.scale.set(this.engine.w, this.engine.h, 1);
    (this.mesh.material.uniforms.uRes.value as THREE.Vector2).set(
      this.engine.w,
      this.engine.h,
    );
  }

  private tick(t: number, dt: number) {
    const u = this.mesh.material.uniforms;
    const k = 1 - Math.pow(0.02, dt);
    u.uTime.value = reduceMotion ? 0 : t;
    u.uScroll.value = scrollY;
    u.uSmoke.value += (this.target.smoke - u.uSmoke.value) * k;
    u.uGlow.value += (this.target.glow - u.uGlow.value) * k;
    u.uEmber.value += (this.target.ember - u.uEmber.value) * k;
    const p = u.uPortraitTex.value ? this.portrait : 0;
    u.uPortrait.value += (p - u.uPortrait.value) * (1 - Math.pow(0.15, dt));
    const e = this.engine;
    const on = e.pointerActive && !reduceMotion ? 1 : 0;
    u.uLightOn.value += (on - u.uLightOn.value) * (1 - Math.pow(0.1, dt));
    // pointer is world px (centre origin, y up) → CSS px (top-left origin), followed lazily
    const L = u.uLight.value as THREE.Vector2;
    L.lerp(
      new THREE.Vector2(e.pointer.x + e.w / 2, e.h / 2 - e.pointer.y),
      1 - Math.pow(0.03, dt),
    );
  }
}
