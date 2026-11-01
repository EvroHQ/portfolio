import * as THREE from 'three';
import { type Engine, lowTier, reduceMotion } from './engine';

/** Morph weights: name, code editor, dust, monogram */
export type Weights = [number, number, number, number];
export const STATES = {
  name: [1, 0, 0, 0] as Weights,
  editor: [0, 1, 0, 0] as Weights,
  dust: [0, 0, 1, 0] as Weights,
  mono: [0, 0, 0, 1] as Weights,
};

import { MARK_LETTERS, MARK_MATRIX } from '../../data/mark';

const RIPPLES = 10;

/** The code in the about-section editor: the shape of the AI mixing pipeline. */
const CODE = [
  "import { analyze, mix } from './engine'",
  "import { master } from './master'",
  "",
  "export async function render(stems) {",
  "  const genre = await analyze(stems)",
  "  const preset = presets[genre]",
  "",
  "  const bus = stems.map(balance)",
  "  const mixdown = mix(bus, preset)",
  "",
  "  return master(mixdown, {",
  "    lufs: preset.lufs,",
  "    truePeak: -1,",
  "  })",
  "}",
  "",
  "queue.process(async (job) => {",
  "  const out = await render(job.stems)",
  "  await storage.put(job.id, out)",
  "  return { lufs: out.lufs }",
  "})",
  "",
];

const vert = /* glsl */ `
uniform float uTime, uExplode, uSize, uDpr, uCamZ, uAlpha, uHeatBoost, uAssemble, uNameGrain, uSpread, uNameW;
uniform vec4 uW;
uniform vec2 uEdC, uEdSize;
uniform float uEdTop, uEdLineH, uEdContentH, uEdVisH, uEdScroll, uEdTilt, uEdCaret;
uniform vec2 uPointer;
uniform float uPointerOn;
uniform vec2 uPointerVel; // smoothed cursor velocity, px/s
uniform float uScr[20];   // per-letter glyph shown: 0 = the real letter, 1..3 = a scramble glyph
uniform vec2 uNameOffset;
uniform vec2 uMonoOffset;
uniform vec4 uRip[${RIPPLES}];
attribute vec3 aA;
attribute vec3 aB;
attribute vec3 aC;
attribute vec3 aD;
attribute vec4 aR;
attribute float aL; // which letter of the name this grain belongs to (-1: none)
attribute vec4 aG;  // this grain's spot in scramble glyphs 1 and 2 (name canvas coords)
attribute vec2 aG3; // ... and in scramble glyph 3
attribute vec2 aE; // editor: x = kind (0 chrome, 0.5 gutter, 1 token), y = 1 if it scrolls with the code
attribute vec3 aK; // editor: this grain's Evro Dark syntax colour
varying float vHeat;
varying float vAlpha;
varying vec3 vEd;
varying float vEdW;
varying vec3 vMono;
varying float vMonoW;
varying float vDecode;
varying float vGlint;
varying vec3 vHeatCol;

// MONOGRAM: the disc turns to face the cursor like a coin tilted in the hand (x: around the vertical axis, y: the horizontal one)
uniform vec2 uMonoTilt;
vec3 monoTilt(vec3 p){
  float cy = cos(uMonoTilt.x), sy = sin(uMonoTilt.x);
  p = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);
  float cx = cos(uMonoTilt.y), sx = sin(uMonoTilt.y);
  return vec3(p.x, p.y * cx - p.z * sx, p.y * sx + p.z * cx);
}

// CODE EDITOR: a window in perspective whose code (minimap-style token bars) scrolls; the hovered line lights up.
// b.xy = window-local px from the top-left (code grains: y is measured inside the scrolling content)
float hash1(float n){ return fract(sin(n * 12.9898) * 43758.5453); }

float edVis = 1.0;
float edGlow = 0.0;
vec3 editor(vec3 b){
  vec2 p = b.xy;
  float caret = 0.0;
  edVis = 1.0;
  if (aE.y > 0.5) {
    float yy = mod(p.y + uEdScroll, uEdContentH);
    edVis = step(yy, uEdVisH) * smoothstep(0.0, uEdLineH * 0.8, yy) * smoothstep(uEdVisH, uEdVisH - uEdLineH * 0.8, yy);
    float row = floor(p.y / uEdLineH); // the line of code itself, not the screen band it scrolls through
    caret = 1.0 - step(0.5, abs(row - uEdCaret));
    p.y = uEdTop + yy;
  }
  edGlow = caret * (aE.x > 0.75 ? 1.0 : 0.5);
  vec3 q = vec3(p.x - uEdSize.x * 0.5, uEdSize.y * 0.5 - p.y, 0.0);
  float c = cos(uEdTilt), s = sin(uEdTilt);
  q = vec3(q.x * c + q.z * s, q.y, -q.x * s + q.z * c);   // turn toward the text
  float cx = cos(0.12), sx = sin(0.12);
  q = vec3(q.x, q.y * cx - q.z * sx, q.y * sx + q.z * cx); // a touch from above
  return q + vec3(uEdC, 0.0);
}

void main(){
  vec3 dust = aC + vec3(sin(uTime * 0.11 + aR.x * 6.283) * 24.0, cos(uTime * 0.09 + aR.y * 6.283) * 24.0, 0.0);
  // HOVER — the hovered letter decodes: its grains snap through random glyphs, then back to the letter
  vec3 nameP = aA;
  float scr = 0.0;
  if (aL >= 0.0) {
    int li = int(aL + 0.5);
    for (int k = 0; k < 20; k++) { if (k == li) scr = uScr[k]; }
    if (scr > 2.5) nameP = vec3(aG3, aA.z);
    else if (scr > 1.5) nameP = vec3(aG.zw, aA.z);
    else if (scr > 0.5) nameP = vec3(aG.xy, aA.z);
  }
  vec3 pos = (nameP + vec3(uNameOffset, 0.0)) * uW.x + editor(aB) * uW.y + dust * uW.z + (monoTilt(aD) + vec3(uMonoOffset, 0.0)) * uW.w;

  // explosion: each grain flies along its own turbulent path, peaking mid-transition
  float e = uExplode * (0.55 + aR.w * 0.9);
  vec3 swirl = vec3(
    sin(aR.x * 12.0 + uTime * 0.5) + sin(pos.y * 0.004 + uTime * 0.7),
    cos(aR.y * 11.0 + uTime * 0.45) + sin(pos.x * 0.003 - uTime * 0.6),
    sin(aR.z * 9.0 + uTime * 0.4) * 2.0
  );
  pos += swirl * e * (260.0 + aR.w * 520.0) * uSpread;

  // assembly (loader): grains arrive from far away
  pos = mix(aC * vec3(1.6, 1.6, 1.0) + swirl * 300.0, pos, uAssemble);

  float heat = uHeatBoost * (0.3 + 0.7 * aR.z);
  // the hovered line takes Evro Dark's mint cursor colour
  vEd = mix(aK, vec3(0.463, 0.925, 0.718), edGlow * 0.9);
  vEdW = uW.y;
  // the mark burns in the site's ember: copper to bright ember grains, with a few ivory sparks
  vec3 monoCol = aR.y > 0.93 ? vec3(0.95, 0.925, 0.886) : mix(vec3(0.45, 0.16, 0.07), vec3(1.0, 0.353, 0.122), aR.z);
  // the name is ivory shot through with copper: ~55% of its grains, from deep copper to gold
  vec3 nameCol = aR.y < 0.55 ? mix(vec3(0.55, 0.27, 0.12), vec3(0.93, 0.62, 0.36), aR.z) : vec3(0.95, 0.925, 0.886);
  vMono = uW.x > uW.w ? nameCol : monoCol;
  // what heat (click, hold to charge) turns a grain into: copper on the name, ember everywhere else
  vHeatCol = mix(vec3(1.0, 0.353, 0.122), vec3(0.86, 0.5, 0.26), uW.x);
  vMonoW = uW.w + uW.x;
  // sparkle: now and then a grain of the name catches the light (a brief flash, never a move)
  float spark = pow(max(0.0, sin(uTime * (0.6 + aR.w * 1.4) + aR.x * 60.0)), 90.0) * uW.x * 0.7;
  vec3 disp = vec3(0.0);
  for (int i = 0; i < ${RIPPLES}; i++) {
    vec4 rp = uRip[i];
    float age = uTime - rp.z;
    if (rp.w <= 0.0 || age < 0.0 || age > 5.0) continue;
    vec2 d = pos.xy - rp.xy;
    float dist = length(d) + 0.001;
    float front = age * (190.0 + rp.w * 330.0);
    float width = 70.0 + rp.w * 100.0;
    float band = exp(-pow((dist - front) / width, 2.0));
    float amp = rp.w * band * exp(-age * 0.85);
    disp.xy += d / dist * amp * 68.0;
    disp.z += amp * 160.0 * (aR.x - 0.35);
    heat += amp * 1.4;
  }
  vDecode = step(0.5, scr) * uW.x; // decoding glyphs flash ivory against the ember name
  // idle glint: every 6s a soft diagonal band of light crosses the name in 1.8s; grains never move
  float gp = mod(uTime, 6.0) / 1.8;
  float gx = mix(-0.75, 0.75, gp) * uNameW;
  vGlint = gp < 1.0 ? exp(-pow((aA.x + aA.y * 0.45 - gx) / (uNameW * 0.06), 2.0)) * uW.x : 0.0;
  pos += disp;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  float persp = uCamZ / max(1.0, -mv.z);
  float grain = mix(0.55 + aR.y * 0.9, 0.62 + aR.y * 0.2, uW.y) * mix(1.0, uNameGrain, uW.x); // even, finer grains for readable code
  gl_PointSize = uSize * uDpr * persp * grain * (1.0 + min(heat, 1.5) * 0.5 * (1.0 - 0.6 * uW.y)) * (1.0 + spark * 0.9);
  vHeat = heat;
  float depth = clamp(persp, 0.25, 1.2);
  vAlpha = uAlpha * mix(0.45 + 0.55 * aR.z, 0.75 + 0.25 * aR.z, uW.x) * (1.0 - min(heat, 2.0) * 0.12) * mix(1.0, 0.55 * depth, uW.z) * mix(1.0, edVis * (aE.x < 0.25 ? 0.55 : 1.0), uW.y);
  vAlpha *= mix(1.0, step(aR.w, 0.4), uW.w); // the mark keeps only 40% of the grains: airier
  // the name's grains twinkle faintly, each at its own pace, and brighten as the glint passes
  vAlpha *= mix(1.0, 0.9 + 0.1 * sin(uTime * (1.2 + aR.x * 1.8) + aR.y * 40.0), uW.x) * (1.0 + vGlint * 0.45) + spark * 0.6;
  vGlint = max(vGlint, spark); // the flash is white-hot ivory, even on a copper grain
}`;

const frag = /* glsl */ `
uniform vec3 uIvory, uEmber, uAsh;
varying float vHeat;
varying float vAlpha;
varying vec3 vEd;
varying float vEdW;
varying vec3 vMono;
varying float vMonoW;
varying float vDecode;
varying float vGlint;
varying vec3 vHeatCol;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.12, d) * vAlpha;
  if (a < 0.01) discard;
  float h = clamp(vHeat, 0.0, 1.0);
  vec3 col = mix(mix(mix(mix(uIvory, vEd, vEdW), vMono, vMonoW), uIvory, max(vDecode, vGlint * 0.75)), vHeatCol, smoothstep(0.05, 0.75, h));
  col = mix(col, vec3(1.0, 0.93, 0.84), smoothstep(0.9, 1.7, vHeat) * 0.85); // white-hot core
  gl_FragColor = vec4(col, a);
}`;

/** Evro Dark (github.com/EvroHQ/EvroDark), the VS Code theme the editor is coloured with */
const EVRO = ['#ABB2BF', '#636D83', '#9D88D0', '#DBD594', '#76ECB7', '#F5B187', '#E06C75', '#959AA5'];
const [FG, GUTTER, KEYWORD, FUNC, STRING, CONST, PROP, VAR] = [0, 1, 2, 3, 4, 5, 6, 7];
const EVRO_RGB = EVRO.map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255));
const KEY = /^(import|export|from|async|function|const|await|return)$/;

/** Split a line of the snippet into [text, column, colour] the way Evro Dark colours JavaScript. */
function tokens(line: string, consts: Set<string>) {
  const out: [string, number, number][] = [];
  const isImport = /^import\b/.test(line);
  for (const m of line.matchAll(/'[^']*'|-?\d+|[A-Za-z_$][\w$]*|[()[\]]|[^\sA-Za-z_$'()[\]\d]+/g)) {
    const t = m[0], i = m.index!;
    const before = line.slice(0, i).trimEnd(), after = line.slice(i + t.length).trimStart();
    let c = FG;
    if (t[0] === "'" || /^-?\d/.test(t)) c = STRING;
    else if (/^[()[\]]$/.test(t)) c = KEYWORD;
    else if (/^[A-Za-z_$]/.test(t)) {
      if (KEY.test(t)) c = KEYWORD;
      else if (after.startsWith('(')) c = FUNC;
      else if (before.endsWith('.')) c = PROP;
      else if (after.startsWith(':')) c = FG;
      else if (isImport) c = FUNC;
      else if (/\bconst$/.test(before)) { consts.add(t); c = CONST; }
      else c = consts.has(t) ? CONST : VAR;
    }
    out.push([t, i, c]);
  }
  return out;
}

/** Sample filled pixels of a 2D drawing into points (centred, y up, in CSS px). */
function sample(draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, w: number, h: number, step: number) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w);
  c.height = Math.ceil(h);
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  draw(ctx, c.width, c.height);
  const data = ctx.getImageData(0, 0, c.width, c.height).data;
  const pts: number[] = [];
  for (let y = 0; y < c.height; y += step) {
    for (let x = 0; x < c.width; x += step) {
      if (data[(Math.floor(y) * c.width + Math.floor(x)) * 4 + 3] > 140) pts.push(x - c.width / 2, c.height / 2 - y);
    }
  }
  return pts;
}

/** Fill `out` (N×3) from candidate points, random pick, tiny jitter so stacks never look gridded. */
function fill(out: Float32Array, pts: number[], N: number, jitter: number, rnd: () => number) {
  const M = pts.length / 2;
  for (let i = 0; i < N; i++) {
    const k = M ? (rnd() * M) | 0 : 0;
    out[i * 3] = (M ? pts[k * 2] : 0) + (rnd() - 0.5) * jitter;
    out[i * 3 + 1] = (M ? pts[k * 2 + 1] : 0) + (rnd() - 0.5) * jitter;
    out[i * 3 + 2] = (rnd() - 0.5) * 6;
  }
}

export class Matter {
  N = reduceMotion ? 18000 : lowTier ? 14000 : 40000;
  points: THREE.Points;
  material: THREE.ShaderMaterial;
  geometry = new THREE.BufferGeometry();
  private rip = Array.from({ length: RIPPLES }, () => new THREE.Vector4(0, 0, -10, 0));
  private ripIdx = 0;
  /** smoothed values driven by the app */
  target = { w: [...STATES.name] as Weights, explode: 0, alpha: 1, heat: 0, tilt: -0.35, energy: 0 };
  private energy = 0;
  private w = [...STATES.name] as Weights;
  /** world-space boxes of the name's letters, and each letter's decode clock */
  private letters: { x0: number; x1: number; y0: number; y1: number; line: number }[] = [];
  private scr = new Array(20).fill(-1);
  private scrNext = new Array(20).fill(0);
  private wasIn = new Array(20).fill(false);
  private seed = 1;

  constructor(private engine: Engine, private nameLines: [string, string]) {
    const N = this.N;
    const rnd = this.rnd;
    const aR = new Float32Array(N * 4);
    for (let i = 0; i < N * 4; i++) aR[i] = rnd();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    this.geometry.setAttribute('aA', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    this.geometry.setAttribute('aB', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    this.geometry.setAttribute('aE', new THREE.BufferAttribute(new Float32Array(N * 2), 2));
    this.geometry.setAttribute('aK', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    this.geometry.setAttribute('aL', new THREE.BufferAttribute(new Float32Array(N).fill(-1), 1));
    this.geometry.setAttribute('aG', new THREE.BufferAttribute(new Float32Array(N * 4), 4));
    this.geometry.setAttribute('aG3', new THREE.BufferAttribute(new Float32Array(N * 2), 2));
    this.geometry.setAttribute('aC', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    this.geometry.setAttribute('aD', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    this.geometry.setAttribute('aR', new THREE.BufferAttribute(aR, 4));

    this.material = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uTime: { value: 0 }, uExplode: { value: 0 }, uSize: { value: lowTier ? 2.6 : 2.1 }, uDpr: { value: 1 }, uCamZ: { value: 1000 },
        uAlpha: { value: 1 }, uHeatBoost: { value: 0 }, uAssemble: { value: reduceMotion ? 1 : 0 }, uNameGrain: { value: 1.25 }, uSpread: { value: 1 }, uNameW: { value: 1000 },
        uW: { value: new THREE.Vector4(...STATES.name) },
        uEdC: { value: new THREE.Vector2() }, uEdSize: { value: new THREE.Vector2(600, 480) }, uEdTop: { value: 60 }, uEdLineH: { value: 18 },
        uEdContentH: { value: 500 }, uEdVisH: { value: 400 }, uEdScroll: { value: 0 }, uEdTilt: { value: -0.35 }, uEdCaret: { value: -10 },
        uPointer: { value: new THREE.Vector2(9999, 9999) }, uPointerOn: { value: 0 }, uPointerVel: { value: new THREE.Vector2() },
        uScr: { value: new Array(20).fill(0) },

        uNameOffset: { value: new THREE.Vector2() }, uMonoOffset: { value: new THREE.Vector2() }, uMonoTilt: { value: new THREE.Vector2() },
        uRip: { value: this.rip },
        uIvory: { value: new THREE.Color('#f2ece2') }, uEmber: { value: new THREE.Color('#ff5a1f') }, uAsh: { value: new THREE.Color('#8a8178') },
      },
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 0; // project planes draw over the matter
    engine.scene.add(this.points);
    this.layout();
    engine.onResize(() => this.layout());
    engine.onTick((t, dt) => this.tick(t, dt));
  }

  private rnd = () => ((this.seed = (this.seed * 16807) % 2147483647) - 1) / 2147483646;

  /** (Re)compute every target shape for the current viewport. */
  layout() {
    const { w: vw, h: vh } = this.engine;
    const N = this.N;
    this.seed = 7;
    const rnd = this.rnd;
    const small = vw < 768;
    // the composition frame (matches --fw in CSS): ultrawide screens compose in a centred 1.9:1 frame
    const fw = Math.min(vw, vh * 1.9);
    const step = small ? 2 : vw > 1600 ? 3 : 2;

    // NAME — a compact block sized by width AND height, never spread apart
    // the hero name is set in Syne ExtraBold (the rest of the site stays in Geist)
    const font = (s: number) => `700 ${s}px Syne, "Geist Variable", system-ui, sans-serif`;
    const probe = document.createElement('canvas').getContext('2d')!;
    probe.font = font(100);
    // @ts-ignore letterSpacing is supported in modern canvas
    probe.letterSpacing = '-4px';
    const widest = Math.max(...this.nameLines.map((l) => probe.measureText(l).width));
    // on phones the name runs gutter to gutter (matches --gutter in CSS)
    const gutter = Math.min(64, Math.max(20, vw * 0.04));
    let size = Math.min((small ? vw - gutter * 2 : fw * 0.86) / (widest / 100), vh * (small ? 0.13 : 0.28), 300);
    const lh = size * 0.84;
    const nameW = (widest / 100) * size + 40;
    const nameH = lh * 2 + size * 0.3;
    const name = sample((ctx, w, h) => {
      ctx.fillStyle = '#fff';
      ctx.font = font(size);
      // @ts-ignore
      ctx.letterSpacing = `${-0.04 * size}px`;
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = small ? 'left' : 'left';
      ctx.fillText(this.nameLines[0], 20, size * 0.88);
      ctx.fillText(this.nameLines[1], 20, size * 0.88 + lh);
    }, nameW, nameH, step);
    fill(this.attr('aA'), name, N, step * (small ? 0.5 : 0.9), rnd);
    // the small-screen name is thin-stroked: finer grains keep the letters crisp instead of pebbly
    this.material.uniforms.uNameGrain.value = small ? (lowTier ? 0.62 : 0.75) : 1.25;
    // the transition burst is sized for desktop: on a phone it would flood the whole screen
    this.material.uniforms.uSpread.value = small ? Math.max(0.3, vw / 1400) : 1;
    this.material.uniforms.uNameW.value = nameW;
    const nameOffset = this.material.uniforms.uNameOffset.value as THREE.Vector2;
    nameOffset.set(small ? -vw / 2 + nameW / 2 + gutter - 20 : 0, small ? vh * 0.06 : vh * 0.03);
    // LETTER MAP — draw each line's prefixes ("C", "CH", "CHR"…) with exactly the settings of the name:
    // the pixels that appear at step i belong to letter i. Kerning, tracking and overhangs match by construction.
    const cw2 = Math.ceil(nameW), ch2 = Math.ceil(nameH);
    const label = new Int16Array(cw2 * ch2).fill(-1);
    const glyphs: { ink0: number; ink1: number; top: number; bottom: number; line: number; base: number }[] = [];
    {
      const c = document.createElement('canvas');
      c.width = cw2; c.height = ch2;
      const g = c.getContext('2d', { willReadFrequently: true })!;
      g.fillStyle = '#fff';
      g.font = font(size);
      // @ts-ignore
      g.letterSpacing = `${-0.04 * size}px`;
      g.textBaseline = 'alphabetic';
      let idx = 0;
      this.nameLines.forEach((line, li) => {
        const base = size * 0.88 + li * lh;
        const y0 = Math.max(0, Math.floor(base - size * 1.0)), y1 = Math.min(ch2, Math.ceil(base + size * 0.25));
        for (let i = 0; i < line.length; i++, idx++) {
          g.clearRect(0, 0, cw2, ch2);
          g.fillText(line.slice(0, i + 1), 20, base);
          const d = g.getImageData(0, y0, cw2, y1 - y0).data;
          let ink0 = cw2, ink1 = 0, top = ch2, bottom = 0;
          for (let y = y0; y < y1; y++) {
            for (let x = 0; x < cw2; x++) {
              if (d[((y - y0) * cw2 + x) * 4 + 3] < 100) continue;
              const k = y * cw2 + x;
              if (label[k] !== -1) continue;    // already inked by an earlier letter
              label[k] = idx;
              if (x < ink0) ink0 = x; if (x > ink1) ink1 = x; if (y < top) top = y; if (y > bottom) bottom = y;
            }
          }
          glyphs.push({ ink0, ink1, top, bottom, line: li, base });
        }
      });
    }
    const labelAt = (x: number, y: number) => {
      const cx = Math.round(x), cy = Math.round(y);
      for (let r = 0; r <= 5; r++) {               // grains are jittered: look around for the nearest ink
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const xx = cx + dx, yy = cy + dy;
          if (xx < 0 || yy < 0 || xx >= cw2 || yy >= ch2) continue;
          const l = label[yy * cw2 + xx];
          if (l >= 0) return l;
        }
      }
      return -1;
    };
    {
      const aA = this.attr('aA'), aL = this.attr('aL');
      for (let i = 0; i < N; i++) aL[i] = labelAt(aA[i * 3] + cw2 / 2, ch2 / 2 - aA[i * 3 + 1]);
      // hover hit-boxes: each letter's real ink extent, in world space
      this.letters = glyphs.map((gl) => ({
        x0: gl.ink0 - cw2 / 2 + nameOffset.x, x1: gl.ink1 - cw2 / 2 + nameOffset.x,
        y0: ch2 / 2 - gl.bottom + nameOffset.y, y1: ch2 / 2 - gl.top + nameOffset.y, line: gl.line,
      }));
      // three scramble glyphs per letter, drawn in that letter's box with the same font
      const GLYPHS = '#%&@$?*+=<>/{}[]!';
      const pick = glyphs.map((gl) => [0, 1, 2].map(() => {
        const ch = GLYPHS[(rnd() * GLYPHS.length) | 0];
        const pts = sample((ctx) => {
          ctx.fillStyle = '#fff';
          ctx.font = font(size);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'alphabetic';
          ctx.fillText(ch, (gl.ink0 + gl.ink1) / 2, gl.base);
        }, cw2, ch2, step);
        return pts.length ? pts : [aA[0], aA[1]];
      }));
      const aG = this.attr('aG'), aG3 = this.attr('aG3');
      for (let i = 0; i < N; i++) {
        const b = aL[i];
        if (b < 0) { aG[i * 4] = aG[i * 4 + 2] = aG3[i * 2] = aA[i * 3]; aG[i * 4 + 1] = aG[i * 4 + 3] = aG3[i * 2 + 1] = aA[i * 3 + 1]; continue; }
        const [g1, g2, g3] = pick[b];
        const k1 = ((rnd() * g1.length) / 2 | 0) * 2, k2 = ((rnd() * g2.length) / 2 | 0) * 2, k3 = ((rnd() * g3.length) / 2 | 0) * 2;
        aG[i * 4] = g1[k1]; aG[i * 4 + 1] = g1[k1 + 1];
        aG[i * 4 + 2] = g2[k2]; aG[i * 4 + 3] = g2[k2 + 1];
        aG3[i * 2] = g3[k3]; aG3[i * 2 + 1] = g3[k3 + 1];
      }
    }
    // publish where the drawn name ends so DOM controls can sit right under it
    document.documentElement.style.setProperty('--name-bottom', `${Math.round(vh / 2 - (nameOffset.y - nameH / 2))}px`);
    document.documentElement.style.setProperty('--name-left', `${Math.round(vw / 2 + nameOffset.x - nameW / 2 + 20)}px`);

    // DUST — a deep field around the camera
    const aC = this.attr('aC');
    for (let i = 0; i < N; i++) {
      aC[i * 3] = (rnd() - 0.5) * vw * 1.8;
      aC[i * 3 + 1] = (rnd() - 0.5) * vh * 1.8;
      aC[i * 3 + 2] = -rnd() * 1600 + 200;
    }

    // MONOGRAM — the CK mark from v1
    // below 1024px the contact text takes the full width: the mark goes small, top-right, behind the title
    const narrow = vw < 1024;
    const S = narrow ? Math.min(vw * 0.5, vh * 0.32) : Math.min(fw * 0.24, vh * 0.44);
    const mono = sample((ctx, w) => {
      // a disc of grains with CK knocked out — the same mark as the nav and favicon
      const k = w / 1000;
      ctx.scale(k, k);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(500, 500, 498, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.setTransform(k * MARK_MATRIX[0], 0, 0, k * MARK_MATRIX[3], k * MARK_MATRIX[4], k * MARK_MATRIX[5]);
      ctx.fill(new Path2D(MARK_LETTERS));
    }, S, S, small ? 2 : 3);
    fill(this.attr('aD'), mono, N, 2, rnd);
    // top-right, beside the title: the email and the link list below stay clear
    (this.material.uniforms.uMonoOffset.value as THREE.Vector2).set(narrow ? vw / 2 - S / 2 - 12 : fw / 2 - S / 2 - fw * 0.06, narrow ? vh / 2 - S / 2 - 70 : vh / 2 - S / 2 - vh * 0.1);

    // CODE EDITOR placement + targets
    const u = this.material.uniforms;
    this.buildEditor(small ? vw * 0.9 : Math.min(fw * 0.38, vh * 0.78), rnd);
    (u.uEdC.value as THREE.Vector2).set(small ? 0 : fw * 0.215, small ? -vh * 0.16 : -vh * 0.02);
    u.uCamZ.value = this.engine.camera.position.z;
    u.uDpr.value = this.engine.dpr;

    for (const k of ['aA', 'aB', 'aC', 'aD', 'aE', 'aK', 'aL', 'aG', 'aG3']) (this.geometry.getAttribute(k) as THREE.BufferAttribute).needsUpdate = true;
  }

  /** Lay out an editor window of width W: the frame from rects, the code from real Geist Mono glyphs. */
  private buildEditor(W: number, rnd: () => number) {
    const N = this.N;
    const H = W * 0.82;
    const top = W * 0.075; // title bar
    const gutter = W * 0.085;
    const cols = 39;
    const cw = (W - gutter - W * 0.04) / cols;
    const fontPx = cw / 0.6; // Geist Mono advance ≈ 0.6em
    const lineH = fontPx * 1.55;
    const contentH = CODE.length * lineH;

    // chrome as thin rects
    const t = 1.6;
    const rects = [
      [0, 0, W, t], [0, H - t, W, t], [0, 0, t, H], [W - t, 0, t, H],
      [0, top, W, 1.2], [gutter - fontPx * 0.5, top, 1, H - top],
    ];
    // window buttons in the theme's red, yellow and green
    const dots = [PROP, FUNC, STRING].map((col, i) => [W * 0.035 + i * W * 0.03 + top * 0.12, top * 0.5, top * 0.12, col]);

    // code as glyphs: each token is drawn with its palette index in the red channel, read back per pixel
    const pts: number[] = []; // x, y, palette index
    {
      const c = document.createElement('canvas');
      c.width = Math.ceil(W);
      c.height = Math.ceil(contentH);
      const ctx = c.getContext('2d', { willReadFrequently: true })!;
      ctx.textBaseline = 'middle';
      const paint = (col: number) => `rgb(${col * 24 + 12},0,0)`;
      const consts = new Set<string>();
      CODE.forEach((line, row) => {
        const y = row * lineH + lineH / 2;
        ctx.fillStyle = paint(GUTTER);
        ctx.textAlign = 'right';
        ctx.font = `500 ${fontPx * 0.78}px "Geist Mono Variable", "Geist Mono", ui-monospace, monospace`;
        ctx.fillText(String(row + 1), gutter - fontPx, y);
        ctx.font = `500 ${fontPx}px "Geist Mono Variable", "Geist Mono", ui-monospace, monospace`;
        ctx.textAlign = 'left';
        for (const [text, col, colour] of tokens(line, consts)) {
          ctx.fillStyle = paint(colour);
          ctx.fillText(text, gutter + col * cw, y);
        }
      });
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      const step = W > 700 ? 1.25 : 1;
      for (let y = 0; y < c.height; y += step) {
        for (let x = 0; x < c.width; x += step) {
          const k = (Math.floor(y) * c.width + Math.floor(x)) * 4;
          if (d[k + 3] < 110) continue;
          pts.push(x, y, Math.min(EVRO.length - 1, Math.max(0, Math.round((d[k] - 12) / 24))));
        }
      }
    }

    const aB = this.attr('aB'), aE = this.attr('aE'), aK = this.attr('aK');
    const tint = (i: number, col: number) => { aK.set(EVRO_RGB[col], i * 3); };
    const chromeShare = Math.round(N * 0.1);
    const perim = rects.reduce((a, r) => a + r[2] * r[3], 0);
    let i = 0;
    // frame + dots
    for (const r of rects) {
      const n = Math.round((r[2] * r[3] / perim) * chromeShare * 0.88);
      for (let j = 0; j < n && i < N; j++, i++) {
        aB[i * 3] = r[0] + rnd() * r[2]; aB[i * 3 + 1] = r[1] + rnd() * r[3]; aB[i * 3 + 2] = 0;
        aE[i * 2] = 0; aE[i * 2 + 1] = 0;
        tint(i, FG);
      }
    }
    for (const [cx, cy, rr, col] of dots) {
      for (let j = 0; j < chromeShare * 0.04 && i < N; j++, i++) {
        const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * rr;
        aB[i * 3] = cx + Math.cos(a) * r; aB[i * 3 + 1] = cy + Math.sin(a) * r; aB[i * 3 + 2] = 0;
        aE[i * 2] = 1; aE[i * 2 + 1] = 0;
        tint(i, col);
      }
    }
    // glyphs: every lit pixel gets a grain before any gets two, so letters stay crisp
    const M = pts.length / 3;
    const order = Array.from({ length: M }, (_, k) => k);
    for (let k = M - 1; k > 0; k--) { const j = (rnd() * (k + 1)) | 0; [order[k], order[j]] = [order[j], order[k]]; }
    for (let k = 0; i < N; k++, i++) {
      const q = order[k % M] * 3;
      aB[i * 3] = pts[q] + (rnd() - 0.5) * 0.6;
      aB[i * 3 + 1] = pts[q + 1] + (rnd() - 0.5) * 0.6;
      aB[i * 3 + 2] = 0;
      aE[i * 2] = pts[q + 2] === GUTTER ? 0.5 : 1;
      aE[i * 2 + 1] = 1;
      tint(i, pts[q + 2]);
    }

    const u = this.material.uniforms;
    (u.uEdSize.value as THREE.Vector2).set(W, H);
    u.uEdTop.value = top + lineH * 0.2;
    u.uEdLineH.value = lineH;
    u.uEdContentH.value = contentH;
    u.uEdVisH.value = H - top - W * 0.03;
  }

  private attr(name: string) { return (this.geometry.getAttribute(name) as THREE.BufferAttribute).array as Float32Array; }

  /** a pressure wave from a world point */
  ripple(x: number, y: number, strength: number) {
    if (reduceMotion) return;
    const r = this.rip[this.ripIdx];
    r.set(x, y, this.engine.time, strength);
    this.ripIdx = (this.ripIdx + 1) % RIPPLES;
  }

  /** the click shockwave */
  drop(x: number, y: number, strength = 2.4) {
    this.ripple(x, y, strength);
  }

  assemble(duration = 1.8) {
    const u = this.material.uniforms.uAssemble;
    if (reduceMotion) { u.value = 1; return Promise.resolve(); }
    return new Promise<void>((res) => {
      const t0 = performance.now();
      const step = () => {
        const p = Math.min(1, (performance.now() - t0) / (duration * 1000));
        u.value = 1 - Math.pow(1 - p, 4);
        if (p < 1) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });
  }

  private tick(t: number, dt: number) {
    const u = this.material.uniforms;
    const k = 1 - Math.pow(0.0015, dt); // frame-rate independent smoothing
    for (let i = 0; i < 4; i++) this.w[i] += (this.target.w[i] - this.w[i]) * k;
    (u.uW.value as THREE.Vector4).set(...this.w);
    u.uExplode.value += (this.target.explode - u.uExplode.value) * k;
    u.uAlpha.value += (this.target.alpha - u.uAlpha.value) * k;
    u.uHeatBoost.value += (this.target.heat - u.uHeatBoost.value) * k;
    u.uEdTilt.value += (this.target.tilt - u.uEdTilt.value) * k;
    // the code scrolls on its own; scrolling the page speeds it up, smoothly, then it settles
    this.energy += (this.target.energy - this.energy) * (1 - Math.pow(0.02, dt));
    this.target.energy *= Math.pow(0.25, dt);
    u.uEdScroll.value += dt * u.uEdLineH.value * (0.45 + this.energy * 9);
    u.uTime.value = reduceMotion ? 4 : t;

    const e = this.engine;
    const p = u.uPointer.value as THREE.Vector2;
    const on = e.pointerActive && !reduceMotion ? 1 : 0;
    u.uPointerOn.value += (on - u.uPointerOn.value) * (1 - Math.pow(0.15, dt));
    const px = p.x, py = p.y;
    p.lerp(e.pointer, 1 - Math.pow(0.04, dt));
    // velocity of the smoothed cursor, itself smoothed so the wake never jerks
    const vel = u.uPointerVel.value as THREE.Vector2;
    if (dt > 0) vel.lerp(new THREE.Vector2((p.x - px) / dt, (p.y - py) / dt), 1 - Math.pow(0.02, dt));
    // monogram tilt: it turns toward the cursor (up to ~25°), settles back flat when the cursor leaves
    const mc = u.uMonoOffset.value as THREE.Vector2, tilt = u.uMonoTilt.value as THREE.Vector2;
    const tx = on ? THREE.MathUtils.clamp((e.pointer.x - mc.x) / (e.w * 0.5), -1, 1) * 0.45 : 0;
    const ty = on ? -THREE.MathUtils.clamp((e.pointer.y - mc.y) / (e.h * 0.5), -1, 1) * 0.35 : 0;
    const kt = 1 - Math.pow(0.03, dt);
    tilt.set(tilt.x + (tx - tilt.x) * kt, tilt.y + (ty - tilt.y) * kt);
    // letter decode: entering a letter makes it flicker through glyphs (~70ms each) for 0.55s
    const scr = u.uScr.value as number[];
    for (let i = 0; i < this.letters.length && i < scr.length; i++) {
      const Lt = this.letters[i];
      const inside = on > 0 && this.w[0] > 0.6 && e.pointer.x >= Lt.x0 && e.pointer.x <= Lt.x1 && e.pointer.y >= Lt.y0 && e.pointer.y <= Lt.y1;
      if (inside && !this.wasIn[i] && this.scr[i] < 0) { this.scr[i] = 0; this.scrNext[i] = 0; }
      this.wasIn[i] = inside;
      if (this.scr[i] < 0) { scr[i] = 0; continue; }
      this.scr[i] += dt;
      if (this.scr[i] >= 0.55) { this.scr[i] = -1; scr[i] = 0; continue; }
      if (this.scr[i] >= this.scrNext[i]) {
        this.scrNext[i] = this.scr[i] + 0.07;
        let g = 1 + ((Math.random() * 3) | 0);
        if (g === scr[i]) g = (g % 3) + 1;
        scr[i] = g;
      }
    }
    // caret: the visible code row under the cursor (approximate, ignores the slight tilt)
    const c = u.uEdC.value as THREE.Vector2, size = u.uEdSize.value as THREE.Vector2;
    const lx = e.pointer.x - c.x + size.x / 2, ly = c.y + size.y / 2 - u.uEdTop.value - e.pointer.y;
    // the code line currently scrolled under the cursor (the shader scrolls content y by uEdScroll, wrapping at uEdContentH)
    const H = u.uEdContentH.value, contentY = (((ly - u.uEdScroll.value) % H) + H) % H;
    u.uEdCaret.value = on && this.w[1] > 0.5 && lx > 0 && lx < size.x && ly > 0 && ly < u.uEdVisH.value ? Math.floor(contentY / u.uEdLineH.value) : -10;
  }
}
