// A bounding volume hierarchy over the triangles of the chapter's merged meshes, to find the first triangle a ray meets.
// The game's colliders are simple boxes and cylinders; this makes shots and lines of sight stop at what is drawn (a roof, a
// rock, the side of a cart), not only at the colliders, and lets a body stand on the slope of a roof.
// The triangles are read from the meshes' own position arrays, so a piece that breaks (its vertices collapse to a point)
// stops blocking at once; the boxes of the tree are not refitted (they stay a little too large, which costs nothing).

const LEAF = 6;

export class TriBVH {
  /**
   * sources: [{ pos: Float32Array of a non-indexed triangle list, keep(tri) -> bool }]. Only the triangles kept go into the tree.
   */
  constructor(sources) {
    this.src = sources.map((s) => s.pos);
    let n = 0; const counts = sources.map((s) => { let k = 0; const T = s.pos.length / 9; for (let t = 0; t < T; t++) if (!s.keep || s.keep(t)) k++; n += k; return k; });
    this.n = n;
    const mesh = (this.mesh = new Uint8Array(n)), tri = (this.tri = new Uint32Array(n)), cen = new Float32Array(n * 3), box = new Float32Array(n * 6);
    let i = 0;
    sources.forEach((s, m) => {
      const p = s.pos, T = p.length / 9;
      for (let t = 0; t < T; t++) {
        if (s.keep && !s.keep(t)) continue;
        mesh[i] = m; tri[i] = t;
        const o = t * 9;
        for (let a = 0; a < 3; a++) {
          const v0 = p[o + a], v1 = p[o + 3 + a], v2 = p[o + 6 + a];
          const lo = Math.min(v0, v1, v2), hi = Math.max(v0, v1, v2);
          box[i * 6 + a] = lo; box[i * 6 + 3 + a] = hi; cen[i * 3 + a] = (lo + hi) / 2;
        }
        i++;
      }
    });
    void counts;
    // nodes: bounds (6 floats) and, for a leaf, [first, count]; for an inner node, [left child, 0] (right = left + 1)
    const maxNodes = Math.max(1, 2 * Math.ceil(n / LEAF) * 2);
    let nb = new Float32Array(maxNodes * 6), ni = new Int32Array(maxNodes * 2), used = 1;
    const order = (this.order = new Uint32Array(n)); for (let k = 0; k < n; k++) order[k] = k;
    const grow = () => { const b = new Float32Array(nb.length * 2); b.set(nb); nb = b; const c = new Int32Array(ni.length * 2); c.set(ni); ni = c; };
    const stack = [[0, 0, n]];
    while (stack.length) {
      const [node, start, count] = stack.pop();
      let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity, cx0 = Infinity, cy0 = Infinity, cz0 = Infinity, cx1 = -Infinity, cy1 = -Infinity, cz1 = -Infinity;
      for (let k = start; k < start + count; k++) {
        const q = order[k], b = q * 6, c = q * 3;
        if (box[b] < x0) x0 = box[b]; if (box[b + 1] < y0) y0 = box[b + 1]; if (box[b + 2] < z0) z0 = box[b + 2];
        if (box[b + 3] > x1) x1 = box[b + 3]; if (box[b + 4] > y1) y1 = box[b + 4]; if (box[b + 5] > z1) z1 = box[b + 5];
        if (cen[c] < cx0) cx0 = cen[c]; if (cen[c + 1] < cy0) cy0 = cen[c + 1]; if (cen[c + 2] < cz0) cz0 = cen[c + 2];
        if (cen[c] > cx1) cx1 = cen[c]; if (cen[c + 1] > cy1) cy1 = cen[c + 1]; if (cen[c + 2] > cz1) cz1 = cen[c + 2];
      }
      nb[node * 6] = x0; nb[node * 6 + 1] = y0; nb[node * 6 + 2] = z0; nb[node * 6 + 3] = x1; nb[node * 6 + 4] = y1; nb[node * 6 + 5] = z1;
      const ex = cx1 - cx0, ey = cy1 - cy0, ez = cz1 - cz0, axis = ex >= ey && ex >= ez ? 0 : ey >= ez ? 1 : 2, span = axis === 0 ? ex : axis === 1 ? ey : ez;
      if (count <= LEAF || span < 1e-4) { ni[node * 2] = start; ni[node * 2 + 1] = count; continue; }
      const mid = (axis === 0 ? cx0 : axis === 1 ? cy0 : cz0) + span / 2;
      let a = start, z = start + count - 1;                     // partition about the middle of the centres
      while (a <= z) { if (cen[order[a] * 3 + axis] < mid) a++; else { const t = order[a]; order[a] = order[z]; order[z] = t; z--; } }
      let left = a - start;
      if (left === 0 || left === count) left = count >> 1;       // all on one side: split in two halves
      while (used + 2 > nb.length / 6) grow();
      const l = used; used += 2;
      ni[node * 2] = l; ni[node * 2 + 1] = -1;                  // inner node
      stack.push([l, start, left], [l + 1, start + left, count - left]);
    }
    this.nb = nb; this.ni = ni; this.nodes = used;
  }

  /** The first triangle the ray o + t d (0 < t < max) meets: { t, nx, ny, nz, mesh, tri } (the normal faces the ray), or null. */
  raycast(o, d, max) {
    if (!this.n) return null;
    const nb = this.nb, ni = this.ni, ix = 1 / (d.x || 1e-12), iy = 1 / (d.y || 1e-12), iz = 1 / (d.z || 1e-12);
    let best = max, hitK = -1;
    const st = this._st || (this._st = new Int32Array(256)); let sp = 0; st[sp++] = 0;
    while (sp) {
      const node = st[--sp], b = node * 6;
      let t0 = (nb[b] - o.x) * ix, t1 = (nb[b + 3] - o.x) * ix; if (t0 > t1) { const t = t0; t0 = t1; t1 = t; }
      let u0 = (nb[b + 1] - o.y) * iy, u1 = (nb[b + 4] - o.y) * iy; if (u0 > u1) { const t = u0; u0 = u1; u1 = t; }
      if (u0 > t0) t0 = u0; if (u1 < t1) t1 = u1;
      let w0 = (nb[b + 2] - o.z) * iz, w1 = (nb[b + 5] - o.z) * iz; if (w0 > w1) { const t = w0; w0 = w1; w1 = t; }
      if (w0 > t0) t0 = w0; if (w1 < t1) t1 = w1;
      if (t1 < 0 || t0 > t1 || t0 > best) continue;
      const cnt = ni[node * 2 + 1];
      if (cnt < 0) { const l = ni[node * 2]; if (sp + 2 > st.length) continue; st[sp++] = l + 1; st[sp++] = l; continue; }
      for (let k = ni[node * 2], e = k + cnt; k < e; k++) {
        const q = this.order[k], p = this.src[this.mesh[q]], v = this.tri[q] * 9;
        const ax = p[v], ay = p[v + 1], az = p[v + 2];
        const e1x = p[v + 3] - ax, e1y = p[v + 4] - ay, e1z = p[v + 5] - az, e2x = p[v + 6] - ax, e2y = p[v + 7] - ay, e2z = p[v + 8] - az;
        const px = d.y * e2z - d.z * e2y, py = d.z * e2x - d.x * e2z, pz = d.x * e2y - d.y * e2x, det = e1x * px + e1y * py + e1z * pz;
        if (det > -1e-10 && det < 1e-10) continue;                   // seen edge on, or collapsed (a broken piece)
        const inv = 1 / det, sx = o.x - ax, sy = o.y - ay, sz = o.z - az, uu = (sx * px + sy * py + sz * pz) * inv;
        if (uu < 0 || uu > 1) continue;
        const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x, vv = (d.x * qx + d.y * qy + d.z * qz) * inv;
        if (vv < 0 || uu + vv > 1) continue;
        const t = (e2x * qx + e2y * qy + e2z * qz) * inv;
        if (t > 1e-4 && t < best) { best = t; hitK = q; }
      }
    }
    if (hitK < 0) return null;
    const p = this.src[this.mesh[hitK]], v = this.tri[hitK] * 9;
    const e1x = p[v + 3] - p[v], e1y = p[v + 4] - p[v + 1], e1z = p[v + 5] - p[v + 2], e2x = p[v + 6] - p[v], e2y = p[v + 7] - p[v + 1], e2z = p[v + 8] - p[v + 2];
    let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    if (nx * d.x + ny * d.y + nz * d.z > 0) { nx = -nx; ny = -ny; nz = -nz; }
    return { t: best, nx, ny, nz, mesh: this.mesh[hitK], tri: this.tri[hitK] };
  }
}
