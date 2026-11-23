// Rendering pipeline: sky, sun + shadows, post-processing (bloom, light
// shafts, tone mapping, colour grading), particles, water and wind.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { damp } from './util.js';

const NOISE_GLSL = /* glsl */ `
float hash21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x), mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<5;i++){ s+=a*vnoise(p); p=p*2.03+vec2(17.1,3.7); a*=.5; } return s; }
float fbm3(vec2 p){ float a=.5, s=0.; for(int i=0;i<3;i++){ s+=a*vnoise(p); p=p*2.03+vec2(17.1,3.7); a*=.5; } return s/0.875; }
`;

// ---- sky dome -------------------------------------------------------------
const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.); gl_Position = p.xyww; }`;
const SKY_FRAG = /* glsl */ `
varying vec3 vDir;
uniform vec3 uTop, uHorizon, uGround, uSunDir, uSunColor, uCloudLit, uCloudShade, uMoonDir;
uniform float uTime, uCover, uCloudScale, uStars, uSunSize, uHaze, uAurora, uDetail;
${NOISE_GLSL}
void main(){
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = mix(uHorizon, uTop, pow(clamp(h,0.,1.), uHaze));
  col = mix(col, uGround, smoothstep(0.0, -0.25, h));
  float sd = max(dot(d, uSunDir), 0.);
  // a band of bright haze just over the horizon, warmer on the side of the sun when it is low
  vec2 hz = normalize(d.xz + 1e-5), sz = normalize(uSunDir.xz + 1e-5);
  float side = pow(max(dot(hz, sz), 0.), 3.), low = smoothstep(0.55, 0.0, uSunDir.y);
  col += mix(uHorizon, uSunColor, 0.35 * low * side) * exp(-abs(h) * 14.) * 0.22;
  col += uSunColor * side * low * exp(-max(h, 0.) * 6.) * 0.18;
  col = mix(col, col * 0.82, smoothstep(0.35, 1.0, h) * 0.5);           // the zenith a little deeper
  // glow around the sun, then the disc itself (far brighter than 1 => blooms)
  col += uSunColor * (pow(sd, 6.)*0.22 + pow(sd, 40.)*0.5 + pow(sd, 400.)*2.2);
  col += uSunColor * smoothstep(1.-uSunSize, 1.-uSunSize*0.5, sd) * 28.;
  if (uStars > 0.) {
    vec2 sp = d.xz/(abs(h)+0.35)*150.;
    float st = step(0.994, hash21(floor(sp))) * smoothstep(0.42, 0.1, length(fract(sp)-0.5)) * smoothstep(0.15,0.6,h);
    col += vec3(0.9,0.95,1.) * st * uStars * (0.6+0.4*sin(uTime*2.+hash21(floor(sp))*40.));
    float md = max(dot(d, uMoonDir), 0.);
    col += vec3(1.,0.97,0.88) * (smoothstep(0.9990,0.9993,md)*6. + pow(md,300.)*0.5) * uStars;
  }
  if (uAurora > 0. && h > 0.04) {             // northern lights: rippling curtains of green and violet
    vec2 ap = d.xz/(h+0.22);
    float band = fbm(vec2(ap.x*0.55 + uTime*0.012, ap.y*0.3 + 3.));
    float fold = 0.6 + 0.4*sin(ap.x*9. + fbm(ap*2.2 + uTime*0.04)*7.);
    float cur = smoothstep(0.36, 0.6, band) * fold * smoothstep(0.04, 0.3, h) * smoothstep(1.0, 0.55, h) * smoothstep(0.6, -0.3, d.z);
    col += (vec3(0.1, 1.0, 0.5) + vec3(0.55, 0.1, 0.95)*smoothstep(0.3, 0.8, h)) * cur * uAurora * 1.5;
  }
  if (h > 0.0 && uCover > 0.) {
    vec2 p = d.xz/(h+0.1) * uCloudScale + vec2(uTime*0.006, uTime*0.002);
    // the shapes are warped by a slower noise, so that they billow and tear instead of lying in blobs
    vec2 q = uDetail > 0.5 ? vec2(fbm3(p*0.55 + vec2(1.7, 9.2) + uTime*0.003), fbm3(p*0.55 + vec2(8.3, 2.8) - uTime*0.002)) - 0.5 : vec2(0.);
    vec2 pw = p + q * 1.3;
    float n = fbm(pw);
    float c = smoothstep(1.-uCover, 1.-uCover+0.3, n);
    // light: how much cloud lies between here and the sun (two short steps toward it)
    vec2 sdir = sz * 0.1;
    float dn = fbm3(pw + sdir) + (uDetail > 0.5 ? fbm3(pw + sdir * 2.4) : fbm3(pw + sdir));
    float lit = exp(-max(0., dn * 0.5 - (1. - uCover)) * 5.);
    vec3 cc = mix(uCloudShade, uCloudLit, clamp(lit * 1.15, 0., 1.));
    cc += uSunColor * (pow(sd, 7.) * (1. - c) * 1.4 + pow(sd, 2.) * 0.1 * lit);   // thin edges toward the sun shine through
    float fade = smoothstep(0.0, 0.16, h);
    cc = mix(uHorizon * 1.05, cc, smoothstep(0.0, 0.25, h));                       // far clouds melt into the haze
    if (uDetail > 0.5) {                     // high thin cirrus, combed by the wind
      vec2 pc = d.xz/(h+0.06) * uCloudScale * 0.32 + vec2(uTime*0.01, 0.);
      float ci = smoothstep(0.52, 0.86, fbm3(vec2(pc.x*0.5 + pc.y*0.2, pc.y*2.4))) * 0.3 * smoothstep(0.06, 0.4, h) * (1. - c);
      col = mix(col, mix(uCloudLit, uSunColor, 0.15 * pow(sd, 3.)), ci);
    }
    col = mix(col, cc, c * fade);
  }
  gl_FragColor = vec4(col, 1.);
}`;

// ---- final screen pass ----------------------------------------------------
const FINAL = {
  uniforms: {
    tDiffuse: { value: null }, uSun: { value: new THREE.Vector2(0.5, 0.5) }, uRays: { value: 0 },
    uRayThr: { value: 1.3 }, uTime: { value: 0 }, uExposure: { value: 1 }, uSat: { value: 1 },
    uContrast: { value: 1 }, uVig: { value: 0.35 }, uDamage: { value: 0 }, uHeal: { value: 0 },
    uGrain: { value: 0.035 }, uFade: { value: 1 }, uAspect: { value: 1.7 },
    uTintHi: { value: new THREE.Color(1, 1, 1) }, uTintLo: { value: new THREE.Color(1, 1, 1) },
  },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: /* glsl */ `
varying vec2 vUv;
uniform sampler2D tDiffuse; uniform vec2 uSun;
uniform float uRays,uRayThr,uTime,uExposure,uSat,uContrast,uVig,uDamage,uHeal,uGrain,uFade,uAspect;
uniform vec3 uTintHi,uTintLo;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.,1.); }
void main(){
  vec3 col = texture2D(tDiffuse, vUv).rgb;
  if (uRays > 0.001) {                       // light shafts: smear bright pixels away from the sun
    const int N = 36;
    vec2 dl = (uSun - vUv) / float(N) * 0.9;
    vec2 p = vUv + dl * hash(vUv*731.7 + fract(uTime));
    vec3 acc = vec3(0.); float w = 1.;
    for (int i=0;i<N;i++){
      vec3 s = min(texture2D(tDiffuse, clamp(p,0.,1.)).rgb, vec3(9.));
      float l = max(s.r, max(s.g, s.b));
      acc += s * smoothstep(uRayThr, uRayThr*2.2, l) * w;
      w *= 0.96; p += dl;
    }
    col += acc / float(N) * uRays;
  }
  col = aces(col * uExposure);
  float l = dot(col, vec3(.2126,.7152,.0722));
  col = mix(vec3(l), col, uSat);
  col = (col-0.5)*uContrast + 0.5;
  col *= mix(uTintLo, uTintHi, smoothstep(0.05, 0.85, l));
  vec2 q = vUv - 0.5;
  float r = length(q * vec2(1., 0.85));
  col *= mix(1., smoothstep(0.95, 0.25, r), uVig);
  col = mix(col, vec3(0.55,0.0,0.0), uDamage * smoothstep(0.18, 0.75, r));
  col += vec3(0.3,0.9,0.4) * uHeal * smoothstep(0.3, 0.8, r) * 0.35;
  col = pow(max(col, 0.), vec3(1./2.2));
  col += (hash(vUv*913. + fract(uTime)*71.) - 0.5) * uGrain;
  gl_FragColor = vec4(col * uFade, 1.);
}`,
};

// ---- particles ------------------------------------------------------------
const PT_VERT = /* glsl */ `
attribute vec4 aColor; attribute float aSize; varying vec4 vColor; varying float vFog;
uniform float uScale, uFogDensity;
void main(){ vColor = aColor; vec4 mv = modelViewMatrix*vec4(position,1.);
  gl_Position = projectionMatrix*mv; gl_PointSize = aSize * uScale / max(-mv.z, 0.1);
  vFog = 1. - exp(-uFogDensity*uFogDensity*mv.z*mv.z); }`;
const PT_FRAG = /* glsl */ `
varying vec4 vColor; varying float vFog; uniform vec3 uFogColor; uniform float uAdd;
void main(){ float d = length(gl_PointCoord-0.5); float a = smoothstep(0.5, 0.12, d);
  vec3 c = mix(vColor.rgb, uFogColor, vFog*(1.-uAdd));
  gl_FragColor = vec4(c, vColor.a * a * (1.-vFog*uAdd)); }`;

/** CPU-simulated burst particles (smoke, dust, sparks). */
export class Particles {
  constructor(shared, max, additive) {
    this.max = max; this.n = 0; this.cursor = 0;
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 4); this.size = new Float32Array(max);
    this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.maxLife = new Float32Array(max);
    this.s0 = new Float32Array(max); this.s1 = new Float32Array(max); this.a0 = new Float32Array(max);
    this.grav = new Float32Array(max); this.drag = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uScale: shared.uPtScale, uFogColor: shared.uFogColor, uFogDensity: shared.uFogDensity, uAdd: { value: additive ? 1 : 0 } },
      vertexShader: PT_VERT, fragmentShader: PT_FRAG, transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(g, mat);
    this.points.frustumCulled = false; this.points.renderOrder = 5;
  }
  /** o: {life, s0, s1, r,g,b,a, grav, drag} */
  spawn(x, y, z, vx, vy, vz, o) {
    const i = this.cursor; this.cursor = (i + 1) % this.max;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.life[i] = this.maxLife[i] = o.life; this.s0[i] = o.s0; this.s1[i] = o.s1 ?? o.s0;
    this.col[i * 4] = o.r; this.col[i * 4 + 1] = o.g; this.col[i * 4 + 2] = o.b; this.a0[i] = o.a ?? 1;
    this.grav[i] = o.grav ?? 0; this.drag[i] = o.drag ?? 0;
  }
  update(dt) {
    const { pos, vel, life, maxLife, col, size } = this;
    for (let i = 0; i < this.max; i++) {
      if (life[i] <= 0) { size[i] = 0; continue; }
      life[i] -= dt;
      const k = Math.max(0, 1 - this.drag[i] * dt);
      vel[i * 3] *= k; vel[i * 3 + 1] = vel[i * 3 + 1] * k - this.grav[i] * dt; vel[i * 3 + 2] *= k;
      pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      const t = 1 - Math.max(life[i], 0) / maxLife[i];
      size[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * t;
      col[i * 4 + 3] = this.a0[i] * (1 - t) * Math.min(1, t * 12);
    }
    const a = this.points.geometry.attributes;
    a.position.needsUpdate = a.aColor.needsUpdate = a.aSize.needsUpdate = true;
  }
  clear() { this.life.fill(0); }
}

/**
 * Weightless ambient particles (dust motes, petals, leaves, pollen, fireflies).
 * They cost nothing on the CPU: the shader computes each position from the
 * clock and wraps it into a box that always surrounds the camera.
 */
export function makeAmbient(shared, o) {
  const n = o.count, seed = new Float32Array(n * 3), rnd = new Float32Array(n);
  for (let i = 0; i < n; i++) { seed[i * 3] = Math.random(); seed[i * 3 + 1] = Math.random(); seed[i * 3 + 2] = Math.random(); rnd[i] = Math.random(); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(seed, 3));
  g.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: shared.uTime, uScale: shared.uPtScale, uCam: shared.uCam,
      uBox: { value: new THREE.Vector3(o.box || 40, o.boxY || 16, o.box || 40) },
      uWind: { value: new THREE.Vector3(...(o.wind || [0.6, 0, 0.2])) }, uFall: { value: o.fall ?? 0.3 },
      uFlutter: { value: o.flutter ?? 0.5 }, uSize: { value: o.size || 0.05 },
      uColA: { value: new THREE.Color(o.colorA || 0xffffff) }, uColB: { value: new THREE.Color(o.colorB || o.colorA || 0xffffff) },
      uBright: { value: o.bright ?? 1 }, uAlpha: { value: o.alpha ?? 0.8 }, uPetal: { value: o.petal ? 1 : 0 },
      uBlink: { value: o.blink ? 1 : 0 },
    },
    vertexShader: /* glsl */ `
attribute float aRnd; varying float vR; varying float vA; varying vec3 vCol;
uniform float uTime,uScale,uFall,uFlutter,uSize,uBlink; uniform vec3 uCam,uBox,uWind,uColA,uColB;
void main(){
  vec3 p = position * uBox;
  float t = uTime * (0.6 + aRnd*0.8);
  p += uWind * uTime * (0.5+aRnd) + vec3(sin(t*1.3+aRnd*40.), 0., cos(t*1.1+aRnd*23.)) * uFlutter;
  p.y -= uFall * uTime * (0.5 + aRnd);
  p = mod(p - uCam + uBox*0.5, uBox) - uBox*0.5 + uCam;
  vec3 rel = (p - uCam) / (uBox*0.5);
  float edge = 1. - smoothstep(0.7, 1., max(abs(rel.x), max(abs(rel.y), abs(rel.z))));
  vec4 mv = viewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * (0.5 + aRnd) * uScale / max(-mv.z, 0.1);
  vA = edge * smoothstep(0.4, 1.5, -mv.z);
  if (uBlink > 0.) vA *= smoothstep(0.2, 0.9, sin(uTime*(0.8+aRnd*1.4) + aRnd*60.));
  vR = aRnd*30. + uTime*(1.+aRnd*2.);
  vCol = mix(uColA, uColB, fract(aRnd*7.3));
}`,
    fragmentShader: /* glsl */ `
varying float vR; varying float vA; varying vec3 vCol; uniform float uBright,uAlpha,uPetal;
void main(){
  vec2 q = gl_PointCoord - 0.5;
  if (uPetal > 0.) { float c=cos(vR), s=sin(vR); q = vec2(c*q.x-s*q.y, s*q.x+c*q.y); q.y *= 1.6 + sin(vR*1.7); }
  float a = smoothstep(0.5, 0.5 - mix(0.38, 0.08, uPetal), length(q));
  gl_FragColor = vec4(vCol * uBright, a * vA * uAlpha);
}`,
    transparent: true, depthWrite: false, blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false; pts.renderOrder = 4;
  return pts;
}

/** Stylised water: animated ripples reflecting the sky gradient and the sun. */
export function makeWater(shared, o = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: shared.uTime, uSunDir: shared.uSunDir, uSunColor: shared.uSunColor, uTop: shared.uSkyTop,
      uHorizon: shared.uSkyHorizon, uFogColor: shared.uFogColor, uFogDensity: shared.uFogDensity,
      uDeep: { value: new THREE.Color(o.deep || 0x0c3a44) }, uScale: { value: o.scale || 1 },
      uFlow: { value: new THREE.Vector2(...(o.flow || [0.2, 0.1])) }, uAlpha: { value: o.alpha ?? 0.82 },
    },
    vertexShader: /* glsl */ `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */ `
varying vec3 vW;
uniform float uTime,uScale,uFogDensity,uAlpha; uniform vec2 uFlow;
uniform vec3 uSunDir,uSunColor,uTop,uHorizon,uFogColor,uDeep;
${NOISE_GLSL}
float H(vec2 p){ return vnoise(p*0.9 + uFlow*uTime) + 0.5*vnoise(p*2.3 - uFlow*uTime*1.7 + 9.) + 0.25*vnoise(p*5.1 + uTime*0.4); }
void main(){
  vec2 p = vW.xz * uScale;
  float e = 0.12;
  float h0 = H(p), hx = H(p+vec2(e,0.)), hz = H(p+vec2(0.,e));
  vec3 n = normalize(vec3((h0-hx)*0.55, 1., (h0-hz)*0.55));
  vec3 V = normalize(cameraPosition - vW);
  vec3 R = reflect(-V, n); R.y = abs(R.y);
  vec3 sky = mix(uHorizon, uTop, pow(clamp(R.y,0.,1.), 0.55));
  float sd = max(dot(R, uSunDir), 0.);
  sky += uSunColor * (pow(sd, 18.)*0.5 + pow(sd, 260.)*14.);
  float fres = 0.03 + 0.97*pow(1. - max(dot(n, V), 0.), 5.);
  vec3 col = mix(uDeep, sky, fres);
  float dist = length(cameraPosition - vW);
  float f = 1. - exp(-uFogDensity*uFogDensity*dist*dist);
  col = mix(col, uFogColor, f);
  gl_FragColor = vec4(col, mix(uAlpha, 1., fres));
}`,
    transparent: true, depthWrite: false,
  });
}

/** Make a material sway in the wind (stronger toward the top of the object). */
export function windify(mat, shared, amp = 0.3, hRef = 10, freq = 1.2) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = shared.uTime;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', /* glsl */ `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 wRoot = instanceMatrix[3].xyz;
      #else
        vec3 wRoot = modelMatrix[3].xyz;
      #endif
      float wK = pow(max(transformed.y, 0.) / ${hRef.toFixed(3)}, 2.0);
      float wPh = wRoot.x*0.31 + wRoot.z*0.27;
      transformed.x += (sin(uTime*${freq.toFixed(3)} + wPh) + 0.4*sin(uTime*${(freq * 2.7).toFixed(3)} + wPh*2.1)) * wK * ${amp.toFixed(3)};
      transformed.z += cos(uTime*${(freq * 0.8).toFixed(3)} + wPh*1.4) * wK * ${(amp * 0.6).toFixed(3)};`);
  };
  mat.customProgramCacheKey = () => `wind_${amp}_${hRef}_${freq}`;
  return mat;
}

// ---------------------------------------------------------------------------

/**
 * The picture at three prices. Measured at 3840 x 2160 on an integrated graphics chip, the resolution is nearly
 * the whole cost of a frame: three quarters of it doubles the frame rate, half of it almost quadruples it.
 * Anti-aliasing costs about a quarter, bloom a tenth, and the size of the shadow map nothing measurable.
 * `scale` multiplies the resolution, `detail` thins the grass and the far trees, `range` shortens the shadows.
 */
export const QUALITY = {
  high: { scale: 1, shadow: 4096, range: 1, msaa: 4, bloom: true, detail: 1 },
  medium: { scale: 0.75, shadow: 2048, range: 1, msaa: 2, bloom: true, detail: 1 },
  low: { scale: 0.5, shadow: 1024, range: 0.6, msaa: 2, bloom: false, detail: 0.5 },
};

export class Gfx {
  constructor(canvas) {
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' }));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    r.toneMapping = THREE.NoToneMapping;       // tone mapping is done in our final pass
    this.quality = 'high'; this.q = QUALITY.high;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    r.setPixelRatio(this.pixelRatio);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(72, 1, 0.06, 2500);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);
    this.root = new THREE.Group();             // everything belonging to the current level
    this.scene.add(this.root);

    this.shared = {
      uTime: { value: 0 }, uFogColor: { value: new THREE.Color() }, uFogDensity: { value: 0.004 },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunColor: { value: new THREE.Color() },
      uSkyTop: { value: new THREE.Color() }, uSkyHorizon: { value: new THREE.Color() },
      uPtScale: { value: 600 }, uCam: { value: new THREE.Vector3() },
    };

    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(1000, 32, 20),
      new THREE.ShaderMaterial({
        uniforms: {
          uTop: this.shared.uSkyTop, uHorizon: this.shared.uSkyHorizon, uGround: { value: new THREE.Color() },
          uSunDir: this.shared.uSunDir, uSunColor: this.shared.uSunColor, uTime: this.shared.uTime,
          uCloudLit: { value: new THREE.Color() }, uCloudShade: { value: new THREE.Color() },
          uCover: { value: 0.5 }, uCloudScale: { value: 0.6 }, uStars: { value: 0 }, uSunSize: { value: 0.0006 },
          uHaze: { value: 0.5 }, uMoonDir: { value: new THREE.Vector3(0, 1, 0) }, uAurora: { value: 0 }, uDetail: { value: 1 },
        },
        vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, fog: false,
      }),
    );
    this.sky.frustumCulled = false; this.sky.renderOrder = -10;
    this.scene.add(this.sky);

    this.sun = new THREE.DirectionalLight(0xffffff, 3);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.06;
    this.scene.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    this.scene.add(this.hemi);
    this.scene.fog = new THREE.FogExp2(0xffffff, 0.004);
    this.shadowRange = 80; this.shadowBase = 80;

    this.soft = new Particles(this.shared, 1400, false);
    this.glow = new Particles(this.shared, 700, true);
    this.scene.add(this.soft.points, this.glow.points);

    const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(r, rt);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.4, 0.6, 1.0);
    this.composer.addPass(this.bloom);
    this.final = new ShaderPass(FINAL);
    this.composer.addPass(this.final);
    this.fx = this.final.uniforms;
    this.damage = 0; this.heal = 0; this.fade = 0; this.fadeTarget = 1; this.raysBase = 0;
    this._v = new THREE.Vector3(); this._f = new THREE.Vector3();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(this.pixelRatio);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.fx.uAspect.value = w / h;
  }

  /** The square of ground around the camera that receives shadows: the chapter's range, shortened on low quality. */
  fitShadow() {
    const r = (this.shadowRange = this.shadowBase * this.q.range), c = this.sun.shadow.camera;
    c.left = -r; c.right = r; c.top = r; c.bottom = -r;
    c.near = 1; c.far = 500; c.updateProjectionMatrix();
  }

  /** Switch the picture to 'high', 'medium' or 'low'. Safe to call at any moment, also in the middle of a chapter. */
  setQuality(name) {
    const q = (this.q = QUALITY[name] || QUALITY.high), dpr = window.devicePixelRatio || 1;
    this.quality = QUALITY[name] ? name : 'high';
    this.pixelRatio = Math.min(dpr, 1.5) * q.scale;
    const sh = this.sun.shadow;
    if (sh.mapSize.x !== q.shadow) { sh.mapSize.set(q.shadow, q.shadow); if (sh.map) { sh.map.dispose(); sh.map = null; } }   // the renderer makes a new map of the new size
    this.fitShadow();
    for (const rt of [this.composer.renderTarget1, this.composer.renderTarget2]) if (rt.samples !== q.msaa) { rt.samples = q.msaa; rt.dispose(); }
    this.bloom.enabled = q.bloom;
    if (this.sky) this.sky.material.uniforms.uDetail.value = name === 'low' ? 0 : 1;      // the low setting draws simpler clouds
    this.applyDetail();
    this.resize();
  }

  /** Grass, flowers and far trees are drawn in shuffled order, so drawing only the first part of each list thins them evenly. */
  applyDetail() {
    this.root.traverse((o) => { if (o.isInstancedMesh && o.userData.thin) o.count = Math.max(1, Math.ceil(o.userData.full * this.q.detail)); });
  }

  /** Apply a level's mood: sun, sky, fog, clouds, grading. */
  setEnvironment(e) {
    const S = this.shared, sk = this.sky.material.uniforms;
    S.uSunDir.value.set(...e.sunDir).normalize();
    S.uSunColor.value.set(e.sunColor);
    S.uSkyTop.value.set(e.skyTop); S.uSkyHorizon.value.set(e.skyHorizon);
    sk.uGround.value.set(e.skyGround ?? e.fogColor);
    sk.uCloudLit.value.set(e.cloudLit ?? 0xffffff); sk.uCloudShade.value.set(e.cloudShade ?? 0x8090a0);
    sk.uCover.value = e.cloudCover ?? 0.5; sk.uCloudScale.value = e.cloudScale ?? 0.6;
    sk.uStars.value = e.stars ?? 0; sk.uSunSize.value = e.sunSize ?? 0.0006; sk.uHaze.value = e.haze ?? 0.5;
    if (e.moonDir) sk.uMoonDir.value.set(...e.moonDir).normalize();
    sk.uAurora.value = e.aurora ?? 0;
    S.uFogColor.value.set(e.fogColor); S.uFogDensity.value = e.fogDensity;
    this.scene.fog.color.set(e.fogColor); this.scene.fog.density = e.fogDensity;
    this.sun.color.set(e.sunLight ?? e.sunColor); this.sun.intensity = e.sunIntensity;
    this.hemi.color.set(e.hemiSky); this.hemi.groundColor.set(e.hemiGround); this.hemi.intensity = e.hemiIntensity;
    // the lamp that lights the scene may differ from the sun drawn in the sky (moonlight at dawn)
    this.lightDir = (this.lightDir || new THREE.Vector3()).set(...(e.lightDir || e.sunDir)).normalize();
    this.shadowBase = e.shadowRange ?? 80;
    this.fitShadow();
    this.bloom.strength = e.bloom ?? 0.4; this.bloom.radius = e.bloomRadius ?? 0.6; this.bloom.threshold = e.bloomThreshold ?? 1.0;
    this.fx.uExposure.value = e.exposure ?? 1; this.fx.uSat.value = e.saturation ?? 1.05;
    this.fx.uContrast.value = e.contrast ?? 1.05; this.fx.uVig.value = e.vignette ?? 0.4;
    this.fx.uTintHi.value.set(e.tintHi ?? 0xffffff); this.fx.uTintLo.value.set(e.tintLo ?? 0xffffff);
    this.fx.uRayThr.value = e.rayThreshold ?? 1.3;
    this.raysBase = e.rays ?? 0.5;

    // Bake the sky into a blurred environment map so every surface picks up
    // soft sky/ground light and metals have something to reflect.
    if (!this.pmrem) this.pmrem = new THREE.PMREMGenerator(this.renderer);
    const disc = sk.uSunSize.value; sk.uSunSize.value = 1e-7;
    const tmp = new THREE.Scene();
    tmp.add(this.sky); this.sky.position.set(0, 0, 0);
    if (this.envRT) this.envRT.dispose();
    this.envRT = this.pmrem.fromScene(tmp, 0.03, 0.1, 3000);
    this.scene.add(this.sky); sk.uSunSize.value = disc;
    this.scene.environment = this.envRT.texture;
    this.scene.environmentIntensity = e.envIntensity ?? 0.45;
  }

  clearLevel() {
    const tex = new Set();
    this.root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      for (const m of ms) { if (m.userData && m.userData.keep) continue; for (const k in m) if (m[k] && m[k].isTexture && m[k].userData.own) tex.add(m[k]); }
    });
    tex.forEach((t) => t.dispose());
    this.root.clear();
    this.soft.clear(); this.glow.clear();
  }

  update(dt, time) {
    const S = this.shared, cam = this.camera;
    S.uTime.value = time;
    cam.getWorldPosition(S.uCam.value);
    this.sky.position.copy(S.uCam.value);
    S.uPtScale.value = this.renderer.domElement.height * 0.5 / Math.tan((cam.fov * Math.PI) / 360);

    // the shadow map follows the camera (snapped, so shadows do not crawl)
    const fx = Math.round(S.uCam.value.x / 4) * 4, fz = Math.round(S.uCam.value.z / 4) * 4;
    this.sun.target.position.set(fx, 0, fz);
    this.sun.position.set(fx, 0, fz).addScaledVector(this.lightDir || S.uSunDir.value, 220);
    this.sun.target.updateMatrixWorld();

    // where is the sun on screen? (for the light shafts)
    cam.getWorldDirection(this._f);
    const facing = this._f.dot(S.uSunDir.value);
    this._v.copy(S.uCam.value).addScaledVector(S.uSunDir.value, 1000).project(cam);
    this.fx.uSun.value.set(this._v.x * 0.5 + 0.5, this._v.y * 0.5 + 0.5);
    const off = Math.max(Math.abs(this._v.x), Math.abs(this._v.y));
    const vis = facing > 0 ? Math.min(1, Math.max(0, (facing - 0.15) * 2.5)) * Math.min(1, Math.max(0, 1.9 - off)) : 0;
    this.fx.uRays.value = this.raysBase * vis;

    this.damage = Math.max(0, this.damage - dt * 1.4);
    this.heal = Math.max(0, this.heal - dt * 1.5);
    this.fade = damp(this.fade, this.fadeTarget, 5, dt);
    this.fx.uDamage.value = Math.min(1, this.damage); this.fx.uHeal.value = this.heal;
    this.fx.uFade.value = this.fade; this.fx.uTime.value = time;
    this.soft.update(dt); this.glow.update(dt);
  }

  render() { this.composer.render(); }
}
