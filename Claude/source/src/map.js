// The map of the chapter: a mini-map in the corner (turning with the player), the whole map on Tab, and the places marked
// with the middle mouse button, shown on both maps and as pins standing in the world.
// The map is drawn once per chapter from the world itself: the terrain (shaded by its slopes, water in blue) and, from above,
// every solid wall, house, fence and rock. Enemies appear on it while they move about; one who stands still or creeps up
// unseen does not (in a duel the same holds for the other player, who sneaks with X).
import * as THREE from 'three';
import { clamp } from './util.js';

const N = 512, MAX_MARKS = 9;

export class MapView {
  constructor(game) {
    this.game = game; this.base = document.createElement('canvas'); this.base.width = this.base.height = N;
    this.mini = document.getElementById('minimap'); this.big = document.getElementById('bigmap'); this.pins = document.getElementById('pins');
    this.range = 55;              // metres from the centre to the rim of the mini-map
    this.marks = []; this._v = new THREE.Vector3(); this.open = false;
  }

  /** Draw the chapter's map (after the level is built). */
  build() {
    const G = this.game, W = G.world, B = W.bounds || { r: 150 };
    const ext = B.r ? { x0: (B.x || 0) - B.r, x1: (B.x || 0) + B.r, z0: (B.z || 0) - B.r, z1: (B.z || 0) + B.r } : B;
    const size = Math.max(ext.x1 - ext.x0, ext.z1 - ext.z0) + 8;
    this.x0 = (ext.x0 + ext.x1) / 2 - size / 2; this.z0 = (ext.z0 + ext.z1) / 2 - size / 2; this.k = N / size;
    const ctx = this.base.getContext('2d'), img = ctx.createImageData(N, N), d = img.data, k = this.k, e = 1 / k;
    const dust = G.level.dust || [0.6, 0.5, 0.4], land = [dust[0] * 0.75 + 0.12, dust[1] * 0.75 + 0.12, dust[2] * 0.75 + 0.1];
    let lo = Infinity, hi = -Infinity;
    const H = new Float32Array(N * N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const h = W.height(this.x0 + (i + 0.5) * e, this.z0 + (j + 0.5) * e); H[j * N + i] = h; if (h > W.waterY) { lo = Math.min(lo, h); hi = Math.max(hi, h); } }
    const span = Math.max(1, hi - lo);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const q = j * N + i, h = H[q], o = q * 4;
      if (h < W.waterY) { const deep = clamp((W.waterY - h) / 6, 0, 1); d[o] = 40 - deep * 14; d[o + 1] = 70 - deep * 20; d[o + 2] = 92 - deep * 18; d[o + 3] = 255; continue; }
      const hx = H[j * N + Math.min(N - 1, i + 1)] - H[j * N + Math.max(0, i - 1)], hz = H[Math.min(N - 1, j + 1) * N + i] - H[Math.max(0, j - 1) * N + i];
      const shade = clamp(0.86 - (hx + hz) * k * 0.35, 0.45, 1.25), up = 0.85 + 0.3 * (h - lo) / span;   // light from the north-west, higher ground paler
      d[o] = clamp(land[0] * shade * up * 255, 0, 255); d[o + 1] = clamp(land[1] * shade * up * 255, 0, 255); d[o + 2] = clamp(land[2] * shade * up * 255, 0, 255); d[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    // what stands on it, seen from above: low things first, walls and houses darker
    const boxes = W.boxes.filter((b) => !b.piece && b.hw * b.hd > 0.04).map((b) => ({ b, top: b.y1 - W.height(b.x, b.z) })).filter((o) => o.top > 0.35).sort((a, b) => a.top - b.top);
    for (const { b, top } of boxes) {
      ctx.setTransform(k * b.c, -k * b.s, k * b.s, k * b.c, (b.x - this.x0) * k, (b.z - this.z0) * k);
      ctx.fillStyle = top > 1.6 ? 'rgba(42,32,24,0.86)' : 'rgba(60,48,36,0.5)';
      ctx.fillRect(-b.hw, -b.hd, b.hw * 2, b.hd * 2);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(30,40,26,0.55)';
    for (const c of W.cyls) { if (c.piece || c.y1 - W.height(c.x, c.z) < 0.8) continue; ctx.beginPath(); ctx.arc((c.x - this.x0) * k, (c.z - this.z0) * k, Math.max(1.1, c.r * k), 0, 6.283); ctx.fill(); }
    this.accent = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#e0a040';
    this.clearMarks();
  }

  // ---- the places marked -----------------------------------------------------------
  clearMarks() { for (const m of this.marks) { m.mesh.removeFromParent(); m.el.remove(); } this.marks = []; }
  /** The middle button: mark the place the crosshair points at, or take away the mark it points at. */
  toggleMark() {
    const G = this.game, P = G.player, cam = G.gfx.camera, o = cam.getWorldPosition(new THREE.Vector3()), dir = P.forward(new THREE.Vector3());
    const hit = G.world.raycast(o, dir, 600), t = hit ? hit.t : 140;
    const x = o.x + dir.x * t, z = o.z + dir.z * t, y = hit ? o.y + dir.y * t : G.world.groundAt(x, z, o.y);
    for (const m of this.marks) {                                  // pointing at a mark: it goes
      const dx = m.x - o.x, dy = m.y + 1.5 - o.y, dz = m.z - o.z, l = Math.hypot(dx, dy, dz);
      if ((dx * dir.x + dy * dir.y + dz * dir.z) / l > 0.9985 || Math.hypot(m.x - x, m.z - z) < 2.5) { this.remove(m); G.sound.mark(false); return; }
    }
    if (this.marks.length >= MAX_MARKS) this.remove(this.marks[0]);
    let n = 1; while (this.marks.some((m) => m.n === n)) n++;
    const col = new THREE.Color(this.accent || '#e0a040');
    const mat = new THREE.MeshBasicMaterial({ color: col, fog: false, transparent: true, opacity: 0.9 });
    const mesh = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.6, 6), mat); pole.position.y = 1.3;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), mat); head.position.y = 2.75;
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.5, 20), mat); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; ring.material = mat.clone(); ring.material.side = THREE.DoubleSide;
    mesh.add(pole, head, ring); mesh.position.set(x, y, z); G.gfx.root.add(mesh);
    const el = document.createElement('div'); el.className = 'pin'; this.pins.appendChild(el);
    this.marks.push({ n, x, y, z, mesh, el, mat });
    G.sound.mark(true); G.say('Place ' + n + ' marked — middle button on it again to remove');
  }
  remove(m) { m.mesh.removeFromParent(); m.el.remove(); this.marks.splice(this.marks.indexOf(m), 1); }

  /** Who shows on the map: enemies on the move (not standing still, not creeping up unseen), and in a duel the other player likewise. */
  seen(e) {
    if (!e.alive || e.state === 'hidden') return false;
    if (e.remote) return !!e.net && e.moving > 0.2 && !(e.net.f & 16);
    return e.moving > 0.2 && !e.sneaking;
  }

  // ---- drawing, every frame -------------------------------------------------------
  update(dt, input) {
    const G = this.game, P = G.player;
    this.open = G.state === 'play' && input.keys.has('Tab');
    this.big.classList.toggle('on', this.open);
    this.drawMini(P);
    if (this.open) this.drawBig(P);
    // pins: the number and the distance, over the pin, seen through walls
    const cam = G.gfx.camera, w = innerWidth, h = innerHeight;
    for (const m of this.marks) {
      const v = this._v.set(m.x, m.y + 3.15, m.z).project(cam), dist = Math.hypot(m.x - P.pos.x, m.z - P.pos.z);
      m.mesh.children[1].scale.setScalar(1 + Math.min(4, dist / 40));      // the pin's head stays visible from afar
      if (v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) { m.el.style.display = 'none'; continue; }
      m.el.style.display = 'block'; m.el.style.left = (v.x * 0.5 + 0.5) * w + 'px'; m.el.style.top = (-v.y * 0.5 + 0.5) * h + 'px';
      const txt = m.n + ' · ' + Math.round(dist) + ' m'; if (m.el.textContent !== txt) m.el.textContent = txt;
    }
  }
  setPinsVisible(on) { this.pins.style.display = on ? 'block' : 'none'; }

  drawMini(P) {
    const c = this.mini, S = c.width, R = S / 2, ctx = c.getContext('2d'), ppm = R / this.range, yaw = P.yaw, cs = Math.cos(yaw), sn = Math.sin(yaw);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, S, S);
    ctx.save(); ctx.beginPath(); ctx.arc(R, R, R - 1, 0, 6.283); ctx.clip();
    ctx.fillStyle = '#14100c'; ctx.fillRect(0, 0, S, S);
    ctx.translate(R, R); ctx.rotate(yaw); ctx.scale(ppm / this.k, ppm / this.k); ctx.translate(-(P.pos.x - this.x0) * this.k, -(P.pos.z - this.z0) * this.k);
    ctx.drawImage(this.base, 0, 0);
    ctx.restore();
    const at = (x, z) => { const dx = (x - P.pos.x) * ppm, dz = (z - P.pos.z) * ppm; return [R + dx * cs - dz * sn, R + dx * sn + dz * cs]; };
    const dpr = S / 200;
    for (const e of this.game.enemies) {
      if (!this.seen(e)) continue;
      const [x, y] = at(e.pos.x, e.pos.z); if (Math.hypot(x - R, y - R) > R - 4 * dpr) continue;
      dot(ctx, x, y, (e.remote || e.cfg.boss ? 5 : 3.6) * dpr, e.remote ? '#ffffff' : '#d83a2a', e.remote || e.cfg.boss ? '#d83a2a' : 'rgba(0,0,0,.7)');
    }
    for (const m of this.marks) {                     // a mark beyond the rim sits on the rim, in its direction
      let [x, y] = at(m.x, m.z); const dx = x - R, dy = y - R, l = Math.hypot(dx, dy), lim = R - 9 * dpr;
      if (l > lim) { x = R + dx / l * lim; y = R + dy / l * lim; }
      pinDot(ctx, x, y, m.n, dpr, this.accent);
    }
    // the player in the middle, always looking up; N on the rim
    arrow(ctx, R, R, 0, 7 * dpr);
    const nx = R + sn * (R - 9 * dpr), ny = R - cs * (R - 9 * dpr);
    ctx.font = `bold ${11 * dpr}px Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#f4ead4'; ctx.fillText('N', nx, ny);
    ctx.beginPath(); ctx.arc(R, R, R - 1, 0, 6.283); ctx.lineWidth = 2 * dpr; ctx.strokeStyle = 'rgba(244,234,212,.45)'; ctx.stroke();
  }

  drawBig(P) {
    const c = this.big, S = c.width, ctx = c.getContext('2d'), f = S / N, k = this.k * f;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, S, S);
    ctx.drawImage(this.base, 0, 0, S, S);
    const at = (x, z) => [(x - this.x0) * k, (z - this.z0) * k], dpr = S / 700;
    for (const e of this.game.enemies) { if (!this.seen(e)) continue; const [x, y] = at(e.pos.x, e.pos.z); dot(ctx, x, y, (e.remote || e.cfg.boss ? 6 : 4.5) * dpr, e.remote ? '#ffffff' : '#d83a2a', e.remote || e.cfg.boss ? '#d83a2a' : 'rgba(0,0,0,.7)'); }
    for (const m of this.marks) { const [x, y] = at(m.x, m.z); pinDot(ctx, x, y, m.n, dpr * 1.2, this.accent); }
    const [px, py] = at(P.pos.x, P.pos.z); arrow(ctx, px, py, -P.yaw, 10 * dpr);
    ctx.font = `${15 * dpr}px Georgia, serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = 'rgba(244,234,212,.85)';
    ctx.fillText('N ↑   ·   middle mouse button: mark a place   ·   release Tab to close', 14 * dpr, 12 * dpr);
  }

  /** Size the canvases to the screen (sharp on high-density displays). */
  resize() {
    const r = Math.min(2, devicePixelRatio || 1);
    this.mini.width = this.mini.height = Math.round(200 * r);
    const side = Math.round(Math.min(innerWidth, innerHeight) * 0.86);
    this.big.style.width = this.big.style.height = side + 'px'; this.big.width = this.big.height = Math.round(side * r);
  }
}

function dot(ctx, x, y, r, fill, ring) { ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = Math.max(1, r * 0.35); ctx.strokeStyle = ring; ctx.stroke(); }
function arrow(ctx, x, y, a, s) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.beginPath(); ctx.moveTo(0, -s * 1.3); ctx.lineTo(s * 0.85, s); ctx.lineTo(0, s * 0.45); ctx.lineTo(-s * 0.85, s); ctx.closePath();
  ctx.fillStyle = '#f4ead4'; ctx.fill(); ctx.lineWidth = s * 0.22; ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.stroke(); ctx.restore();
}
function pinDot(ctx, x, y, n, dpr, accent) {
  ctx.beginPath(); ctx.arc(x, y, 7.5 * dpr, 0, 6.283); ctx.fillStyle = accent; ctx.fill(); ctx.lineWidth = 1.5 * dpr; ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.stroke();
  ctx.font = `bold ${10 * dpr}px Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#140e08'; ctx.fillText(String(n), x, y + 0.5 * dpr);
}
