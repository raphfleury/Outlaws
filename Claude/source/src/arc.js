// While a thrown weapon is aimed (right mouse button), its flight is drawn as a line of dots from the hand to where it will land,
// with a ring on the spot. A bomb's line follows its bounces, and its ring is as wide as its blast. The dots and the ring grow with
// distance, so that they stay visible far away; seen from behind, a flight runs almost along the line of sight, so the dots start
// from the hand, low and to the right, and join the true path within the first few metres.
// The flight is worked out with the same numbers and the same steps as the throw itself (see Shots and Weapon.launch).
import * as THREE from 'three';

const MAX = 260, STEP = 1 / 60, BLAST = 6.5, DOTS = 70;

export class Arc {
  constructor(game) {
    this.game = game;
    const g = new THREE.BufferGeometry(); this.pts = new Float32Array(MAX * 3);
    g.setAttribute('position', new THREE.BufferAttribute(this.pts, 3).setUsage(THREE.DynamicDrawUsage));
    this.lineMat = new THREE.LineDashedMaterial({ color: 0xf4ead4, dashSize: 0.35, gapSize: 0.2, transparent: true, opacity: 0.9, fog: false, depthTest: false });
    this.line = new THREE.Line(g, this.lineMat); this.line.frustumCulled = false; this.line.renderOrder = 20; this.line.visible = false;
    this.dots = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xf4ead4, transparent: true, opacity: 0.9, fog: false, depthTest: false }), DOTS);
    this.dots.frustumCulled = false; this.dots.renderOrder = 22; this._m = new THREE.Matrix4(); this._s = new THREE.Vector3(); this._p = new THREE.Vector3(); this._qi = new THREE.Quaternion();
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xf4ead4, transparent: true, opacity: 0.85, side: THREE.DoubleSide, fog: false, depthTest: false });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.4, 28), ringMat); this.ring.renderOrder = 21;
    this.dot = new THREE.Mesh(new THREE.CircleGeometry(0.08, 12), ringMat); this.dot.renderOrder = 21;
    const blastMat = new THREE.MeshBasicMaterial({ color: 0xe8502a, transparent: true, opacity: 0.35, side: THREE.DoubleSide, fog: false, depthTest: false });
    this.blast = new THREE.Mesh(new THREE.RingGeometry(BLAST - 0.12, BLAST, 64), blastMat); this.blast.renderOrder = 21;
    this.mark = new THREE.Group(); this.mark.add(this.ring, this.dot, this.blast);
    this.root = new THREE.Group(); this.root.add(this.line, this.dots, this.mark); this.root.visible = false;
    game.gfx.scene.add(this.root);
    this._o = new THREE.Vector3(); this._d = new THREE.Vector3(); this._n = new THREE.Vector3(); this._q = new THREE.Quaternion(); this._up = new THREE.Vector3(0, 0, 1);
    this.ro = { x: 0, y: 0, z: 0 }; this.rd = { x: 0, y: 0, z: 0 };
  }

  update() {
    const G = this.game, P = G.player, w = P.weapon, L = w && w.launch && w.launch();
    const show = !!L && G.state === 'play' && !P.dead && P.aim > 0.35 && w.loaded;
    this.root.visible = show;
    if (!show) return;
    const W = G.world, o = G.gfx.camera.getWorldPosition(this._o), d = P.forward(this._d), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
    let x = o.x + d.x * 0.5 + rx * 0.04, y = o.y + d.y * 0.5 - 0.07, z = o.z + d.z * 0.5 + rz * 0.04;      // where the throw leaves the hand
    let vx = d.x * L.speed, vy = (d.y + 0.012 + L.lift) * L.speed, vz = d.z * L.speed;
    const pts = this.pts; let n = 0, hit = null;
    const add = () => { if (n < MAX) { pts[n * 3] = x; pts[n * 3 + 1] = y; pts[n * 3 + 2] = z; n++; } };
    add();
    const tMax = L.bounce ? 2.4 : 4, ro = this.ro, rd = this.rd;
    for (let t = 0; t < tMax && n < MAX; t += STEP) {
      vy -= L.grav * STEP;
      const sp = Math.hypot(vx, vy, vz), len = sp * STEP;
      if (sp < 1e-4) break;
      ro.x = x; ro.y = y; ro.z = z; rd.x = vx / sp; rd.y = vy / sp; rd.z = vz / sp;
      let tHit = len, nrm = null;
      const wh = W.raycast(ro, rd, len + (L.bounce ? 0.06 : 0));
      if (wh) { tHit = Math.max(0, wh.t - (L.bounce ? 0.06 : 0)); nrm = wh; }
      if (!L.bounce) for (const e of G.enemies) { const h = e.rayHit(ro, rd, tHit); if (h) { tHit = h.t; nrm = { nx: -rd.x, ny: -rd.y, nz: -rd.z }; } }
      x += rd.x * tHit; y += rd.y * tHit; z += rd.z * tHit;
      if (nrm) {
        if (!L.bounce) { hit = nrm; add(); break; }
        const dn = vx * nrm.nx + vy * nrm.ny + vz * nrm.nz;             // a bomb bounces as Shots.bomb makes it bounce
        vx = (vx - 2 * dn * nrm.nx) * 0.4; vy = (vy - 2 * dn * nrm.ny) * 0.3; vz = (vz - 2 * dn * nrm.nz) * 0.4;
        if (nrm.ny > 0.6 && Math.hypot(vx, vy, vz) < 1.4) { hit = nrm; add(); break; }
      }
      const gy = W.groundAt(x, z, y);
      if (L.bounce && y < gy + 0.05) { y = gy + 0.05; if (vy < 0) vy = -vy * 0.3; vx *= 0.6; vz *= 0.6; if (Math.hypot(vx, vy, vz) < 1.4) { hit = { nx: 0, ny: 1, nz: 0 }; add(); break; } }
      add();
    }
    // the dots: about every 0.08 s of flight; near the start they are drawn from the hand, low and to the right
    const cam = G.gfx.camera, cp = this._o.copy(cam.position), hx = rx * 0.22, hz = rz * 0.22, every = Math.max(1, Math.round(n / DOTS + 0.49));
    let k = 0, along = 0;
    for (let i = 1; i < n && k < DOTS; i++) {
      along += Math.hypot(pts[i * 3] - pts[i * 3 - 3], pts[i * 3 + 1] - pts[i * 3 - 2], pts[i * 3 + 2] - pts[i * 3 - 1]);
      if (i % every) continue;
      const blend = Math.max(0, 1 - along / 6), px = pts[i * 3] + hx * blend, py = pts[i * 3 + 1] - 0.3 * blend, pz = pts[i * 3 + 2] + hz * blend;
      const dist = Math.hypot(px - cp.x, py - cp.y, pz - cp.z), r = Math.max(0.025, dist * 0.0055);
      this._m.compose(this._p.set(px, py, pz), this._qi, this._s.setScalar(r)); this.dots.setMatrixAt(k++, this._m);
    }
    this.dots.count = k; this.dots.instanceMatrix.needsUpdate = true;
    this.mark.visible = !!hit || !!L.bounce;
    if (this.mark.visible) {
      const nn = hit ? this._n.set(hit.nx, hit.ny, hit.nz) : this._n.set(0, 1, 0), far = Math.hypot(x - cp.x, y - cp.y, z - cp.z);
      this.mark.position.set(x + nn.x * 0.03, y + nn.y * 0.03, z + nn.z * 0.03);
      this.mark.quaternion.setFromUnitVectors(this._up, nn);
      this.ring.scale.setScalar(Math.max(1, far / 14)); this.dot.scale.setScalar(Math.max(1, far / 14));
      this.blast.visible = !!L.bounce;                                    // a bomb: the ring of its blast around the spot
    }
  }
}
