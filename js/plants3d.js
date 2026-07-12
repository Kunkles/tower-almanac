/* ================= PROCEDURAL PLANT MODELS =================
   Per-species mature plant builders — recognizable silhouettes from
   primitives + ShapeGeometry leaves. No textures, no asset files.
   Model space: base at the soil surface (origin), +Y up,
   +Z faces outward from the tower (vines trail toward +Z / -Y). */

import * as THREE from 'three';

/* ---------- shared caches ---------- */
const matCache = new Map();
function mat(color, dbl) {
  const key = color + (dbl ? '|2' : '');
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({
    color, roughness: 0.85, metalness: 0, side: dbl ? THREE.DoubleSide : THREE.FrontSide }));
  return matCache.get(key);
}
const geoCache = new Map();
function cachedGeo(key, make) {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return geoCache.get(key);
}

/* ---------- leaves ----------
   kinds: 'ovate' (plain blade), same with waves>0 = ruffled edge,
   'lobed' (round squash/nasturtium-style outline). Leaf lies in the
   XY plane, base at origin, tip at +Y; bend curls the tip back. */

function leafOutline(L, W, waves, depth, fullness) {
  const pts = [], N = 14;
  const side = (t, phase) => {
    let r = (W / 2) * Math.pow(Math.sin(Math.PI * t), fullness);
    if (waves) r *= 1 + depth * Math.sin(waves * Math.PI * 2 * t + phase);
    return r;
  };
  for (let i = 0; i <= N; i++) pts.push(new THREE.Vector2(side(i / N, 1.3), L * i / N));
  for (let i = N - 1; i >= 1; i--) pts.push(new THREE.Vector2(-side(i / N, 2.9), L * i / N));
  return new THREE.Shape(pts);
}

function lobedOutline(R, lobes, depth) {
  const pts = [], N = 26;
  for (let i = 0; i < N; i++) {
    const th = (i / N) * Math.PI * 2;
    const r = R * (1 + depth * Math.cos(lobes * th));
    pts.push(new THREE.Vector2(r * Math.sin(th), R * (1 + depth) - r * Math.cos(th)));
  }
  return new THREE.Shape(pts);
}

function leaf(spec, color) {
  const { kind = 'ovate', L = 0.06, W = 0.04, bend = 0.5, waves = 0, depth = 0.15, fullness = 0.8, lobes = 5 } = spec;
  const key = ['leaf', kind, L, W, bend, waves, depth, fullness, lobes].join(',');
  const geo = cachedGeo(key, () => {
    const shape = kind === 'lobed' ? lobedOutline(L / 2, lobes, depth) : leafOutline(L, W, waves, depth, fullness);
    const g = new THREE.ShapeGeometry(shape);
    const p = g.attributes.position, k = bend / Math.max(L, 0.01);
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, -k * y * y); }
    g.computeVertexNormals();
    return g;
  });
  return new THREE.Mesh(geo, mat(color, true));
}

/* ---------- structural helpers ---------- */

function stem(r, h, color) {
  const m = new THREE.Mesh(cachedGeo('stem' + r + ',' + h, () => new THREE.CylinderGeometry(r * 0.55, r, h, 5)), mat(color));
  m.position.y = h / 2;
  return m;
}

// a stem with something at its tip, still pointing +Y
function shoot(petLen, petR, petColor, tip) {
  const g = new THREE.Group();
  if (petLen > 0) g.add(stem(petR, petLen, petColor));
  if (tip) { tip.position.y += petLen; g.add(tip); }
  return g;
}

// place content leaning out at azimuth `a`, tilted `tilt` rad from vertical
function sprout(a, tilt, content) {
  const g = new THREE.Group();
  g.rotation.y = a;
  const inner = new THREE.Group();
  inner.rotation.x = tilt;
  inner.add(content);
  g.add(inner);
  return g;
}

function berry(r, color, squash = 1) {
  const m = new THREE.Mesh(cachedGeo('sph' + r, () => new THREE.SphereGeometry(r, 8, 6)), mat(color));
  m.scale.y = squash;
  return m;
}

function pod(r, len, color) {
  return new THREE.Mesh(cachedGeo('cap' + r + ',' + len, () => new THREE.CapsuleGeometry(r, len, 2, 7)), mat(color));
}

// fan of small leaves radiating from one point (carrot fronds, strawberry trifoliate…)
function tuft(color, lf, n = 3) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const w = new THREE.Group();
    w.rotation.y = (i / n) * Math.PI * 2;
    const m = leaf(lf, color);
    m.rotation.x = 0.55;
    w.add(m);
    g.add(w);
  }
  return g;
}

/* ---------- growth-habit builders ---------- */

// ground rosette of leaves (lettuce, spinach, kale, chard, beet greens…)
function rosette(rand, o) {
  const { n = 8, tilt = 0.9, jit = 0.25, petLen = 0, petR = 0.005, petColor, color, leaf: lf } = o;
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (rand() - 0.5) * 0.5;
    const L = lf.L * (0.85 + 0.1 * Math.floor(rand() * 4)); // quantized so geometries stay cached
    const m = leaf({ ...lf, L }, color);
    g.add(sprout(a, tilt + (rand() - 0.5) * jit, shoot(petLen, petR, petColor || color, m)));
  }
  return g;
}

// branching herb/shrub: stems with leaf pairs, optional bloom/fruit at each tip
function bush(rand, o) {
  const { stems = 5, h = 0.09, tilt = 0.45, jit = 0.3, r = 0.004, stemColor, color, leaf: lf, pairs = 3, tip } = o;
  const g = new THREE.Group();
  for (let i = 0; i < stems; i++) {
    const a = (i / stems) * Math.PI * 2 + (rand() - 0.5) * 0.6;
    const hh = h * (0.8 + 0.1 * Math.floor(rand() * 5));
    const sh = new THREE.Group();
    sh.add(stem(r, hh, stemColor || color));
    for (let k = 1; k <= pairs; k++) {
      for (const s of [0, Math.PI]) {
        const w = new THREE.Group();
        w.rotation.y = s + rand() * 0.9;
        w.position.y = hh * (k / (pairs + 0.5));
        const m = leaf(lf, color);
        m.rotation.x = 1.0 + (rand() - 0.5) * 0.4;
        w.add(m);
        sh.add(w);
      }
    }
    if (tip) { const t = tip(rand); t.position.y = hh; sh.add(t); }
    g.add(sprout(a, tilt + (rand() - 0.5) * jit, sh));
  }
  return g;
}

// clump of upright blades (chives, green onion), optional tip ornament
function grass(rand, o) {
  const { n = 10, h = 0.13, r = 0.004, color, tilt = 0.25, jit = 0.35, tip } = o;
  const g = new THREE.Group();
  const bladeGeo = cachedGeo('blade' + r, () => new THREE.CylinderGeometry(r * 0.25, r, 1, 4));
  for (let i = 0; i < n; i++) {
    const hh = h * (0.7 + rand() * 0.5);
    const blade = new THREE.Mesh(bladeGeo, mat(color));
    blade.scale.set(1, hh, 1);
    blade.position.y = hh / 2;
    const sh = new THREE.Group();
    sh.add(blade);
    if (tip && rand() < 0.55) { const t = tip(rand); t.position.y = hh; sh.add(t); }
    g.add(sprout(rand() * Math.PI * 2, tilt + (rand() - 0.5) * jit, sh));
  }
  return g;
}

// scatter dangling fruit around a bush
function dangles(rand, g, n, maker, { rad = 0.045, y0 = 0.02, y1 = 0.06 } = {}) {
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2;
    const m = maker(i, rand);
    m.position.set(Math.sin(a) * rad, y0 + rand() * (y1 - y0), Math.cos(a) * rad);
    g.add(m);
  }
}

// trailing vine spilling outward (+Z) and down the tower side
function vinePlant(rand, o) {
  const { len = 0.5, color, leafMaker, nLeaves = 7, uprightLeaves = false, fruitMaker, nFruit = 0, fruitDy = -0.03, tendril = false } = o;
  const g = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.03, 0), new THREE.Vector3(0.03, 0.10, 0.10),
    new THREE.Vector3(-0.03, 0.01, 0.22), new THREE.Vector3(0.04, -len * 0.45, 0.33),
    new THREE.Vector3(-0.02, -len, 0.40),
  ]);
  g.add(new THREE.Mesh(cachedGeo('vine' + len, () => new THREE.TubeGeometry(curve, 24, 0.008, 5, false)), mat(color)));
  for (let i = 0; i < nLeaves; i++) {
    const m = leafMaker(rand);
    m.position.copy(curve.getPoint(0.08 + (i / nLeaves) * 0.88));
    if (uprightLeaves) m.rotation.y = rand() * Math.PI * 2;
    else m.rotation.set(rand() * 1.2 - 0.3, rand() * Math.PI * 2, 0);
    g.add(m);
  }
  for (let i = 0; i < nFruit; i++) {
    const f = fruitMaker(rand);
    f.position.copy(curve.getPoint(0.35 + (i / nFruit) * 0.6))
      .add(new THREE.Vector3((rand() - 0.5) * 0.04, fruitDy, 0.015));
    g.add(f);
  }
  if (tendril) {
    const tpts = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      tpts.push(new THREE.Vector3(Math.sin(t * 12) * 0.015, 0.06 + t * 0.05, 0.05 + Math.cos(t * 12) * 0.015));
    }
    g.add(new THREE.Mesh(cachedGeo('tendril', () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tpts), 24, 0.0015, 4)), mat(color)));
  }
  g.userData.directional = true; // +Z must keep facing away from the tower
  return g;
}

/* ---------- the 30 species ---------- */

const SPECIES = {
  lettuce: (p, r) => {
    const g = new THREE.Group();
    g.add(rosette(r, { n: 10, tilt: 0.85, color: p.foliage, leaf: { kind: 'ovate', L: 0.10, W: 0.075, bend: 0.55, waves: 5, depth: 0.15, fullness: 0.55 } }));
    g.add(rosette(r, { n: 5, tilt: 0.35, color: p.foliage, leaf: { kind: 'ovate', L: 0.07, W: 0.055, bend: 0.5, waves: 5, depth: 0.15, fullness: 0.55 } }));
    return g;
  },
  spinach: (p, r) => rosette(r, { n: 9, tilt: 0.75, color: p.foliage, petLen: 0.015, petR: 0.003,
    leaf: { L: 0.075, W: 0.05, bend: 0.45, fullness: 0.65 } }),
  kale: (p, r) => rosette(r, { n: 8, tilt: 0.5, jit: 0.3, color: p.foliage, petLen: 0.02, petR: 0.004, petColor: '#B9C7A6',
    leaf: { L: 0.15, W: 0.055, bend: 0.55, waves: 6, depth: 0.22, fullness: 0.6 } }),
  chard: (p, r) => rosette(r, { n: 7, tilt: 0.55, color: p.foliage, petLen: 0.035, petR: 0.007, petColor: p.accent,
    leaf: { L: 0.13, W: 0.07, bend: 0.5, waves: 3, depth: 0.07, fullness: 0.6 } }),
  cabbage: (p, r) => {
    const g = new THREE.Group();
    const head = berry(0.045, p.accent, 0.9); head.position.y = 0.045; g.add(head);
    g.add(rosette(r, { n: 7, tilt: 0.95, color: p.foliage, leaf: { L: 0.09, W: 0.085, bend: -0.45, fullness: 0.5 } }));
    return g;
  },
  broccoli: (p, r) => {
    const g = new THREE.Group();
    g.add(stem(0.012, 0.07, '#9DB88A'));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const b = berry(0.019, p.accent);
      b.position.set(Math.sin(a) * 0.02, 0.075, Math.cos(a) * 0.02);
      g.add(b);
    }
    const top = berry(0.022, p.accent); top.position.y = 0.09; g.add(top);
    g.add(rosette(r, { n: 5, tilt: 0.75, color: p.foliage, petLen: 0.02, petR: 0.005,
      leaf: { L: 0.11, W: 0.045, bend: 0.4, waves: 4, depth: 0.1, fullness: 0.6 } }));
    return g;
  },
  cauliflower: (p, r) => {
    const g = new THREE.Group();
    const head = berry(0.034, p.accent, 0.85); head.position.y = 0.04; g.add(head);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const b = berry(0.016, p.accent);
      b.position.set(Math.sin(a) * 0.024, 0.035, Math.cos(a) * 0.024);
      g.add(b);
    }
    g.add(rosette(r, { n: 7, tilt: 0.5, jit: 0.2, color: p.foliage, leaf: { L: 0.11, W: 0.05, bend: -0.35, fullness: 0.6 } }));
    return g;
  },
  kohlrabi: (p, r) => {
    const g = new THREE.Group();
    const bulb = berry(0.03, p.accent, 0.9); bulb.position.y = 0.028; g.add(bulb);
    const tops = rosette(r, { n: 6, tilt: 0.3, jit: 0.2, color: p.foliage, petLen: 0.03, petR: 0.004, petColor: p.accent,
      leaf: { L: 0.09, W: 0.04, bend: 0.3, fullness: 0.6 } });
    tops.position.y = 0.05;
    g.add(tops);
    return g;
  },
  radish: (p, r) => {
    const g = new THREE.Group();
    const sh = berry(0.02, p.accent, 0.85); sh.position.y = 0.01; g.add(sh);
    g.add(rosette(r, { n: 6, tilt: 0.6, color: p.foliage, petLen: 0.01, petR: 0.003,
      leaf: { L: 0.07, W: 0.035, bend: 0.35, waves: 4, depth: 0.12, fullness: 0.6 } }));
    return g;
  },
  beet: (p, r) => {
    const g = new THREE.Group();
    const sh = berry(0.022, p.accent, 0.85); sh.position.y = 0.01; g.add(sh);
    g.add(rosette(r, { n: 6, tilt: 0.55, color: p.foliage, petLen: 0.02, petR: 0.004, petColor: p.accent,
      leaf: { L: 0.09, W: 0.045, bend: 0.4, waves: 3, depth: 0.06, fullness: 0.65 } }));
    return g;
  },
  carrot: (p, r) => {
    const g = new THREE.Group();
    const sh = berry(0.013, p.accent, 0.6); sh.position.y = 0.004; g.add(sh);
    for (let i = 0; i < 8; i++) {
      g.add(sprout(r() * Math.PI * 2, 0.35 + r() * 0.4,
        shoot(0.05 + 0.01 * Math.floor(r() * 3), 0.0025, p.foliage,
          tuft(p.foliage, { L: 0.028, W: 0.007, bend: 0.35, fullness: 0.7 }, 4))));
    }
    return g;
  },
  greenonion: (p, r) => {
    const g = new THREE.Group();
    const base = new THREE.Mesh(cachedGeo('onionbase', () => new THREE.CylinderGeometry(0.007, 0.009, 0.025, 8)), mat('#EDE8DA'));
    base.position.y = 0.012;
    g.add(base);
    g.add(grass(r, { n: 8, h: 0.15, r: 0.005, color: p.foliage, tilt: 0.18 }));
    return g;
  },
  chives: (p, r) => grass(r, { n: 14, h: 0.12, r: 0.0035, color: p.foliage, tilt: 0.22,
    tip: () => berry(0.009, p.accent) }),
  celery: (p, r) => {
    const g = new THREE.Group();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + r() * 0.4;
      const hh = 0.10 + 0.01 * Math.floor(r() * 4);
      const sh = new THREE.Group();
      sh.add(stem(0.006, hh, '#A8C48A'));
      const t = tuft(p.foliage, { L: 0.03, W: 0.02, bend: 0.4, fullness: 0.6 }, 3);
      t.position.y = hh;
      sh.add(t);
      g.add(sprout(a, 0.15 + r() * 0.2, sh));
    }
    return g;
  },
  parsley: (p, r) => {
    const g = new THREE.Group();
    for (let i = 0; i < 8; i++) {
      g.add(sprout(r() * Math.PI * 2, 0.3 + r() * 0.35,
        shoot(0.055, 0.0025, p.foliage, tuft(p.foliage, { L: 0.025, W: 0.02, bend: 0.4, waves: 4, depth: 0.22, fullness: 0.5 }, 3))));
    }
    return g;
  },
  cilantro: (p, r) => {
    const g = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      g.add(sprout(r() * Math.PI * 2, 0.4 + r() * 0.35,
        shoot(0.05, 0.002, p.foliage, tuft(p.foliage, { L: 0.024, W: 0.022, bend: 0.3, waves: 3, depth: 0.12, fullness: 0.55 }, 3))));
    }
    return g;
  },
  basil: (p, r) => bush(r, { stems: 4, h: 0.10, tilt: 0.35, r: 0.005, color: p.foliage, pairs: 3,
    leaf: { L: 0.045, W: 0.03, bend: 0.5, fullness: 0.75 } }),
  mint: (p, r) => bush(r, { stems: 6, h: 0.09, tilt: 0.4, color: p.foliage, pairs: 3,
    leaf: { L: 0.032, W: 0.02, bend: 0.35, waves: 4, depth: 0.08, fullness: 0.7 } }),
  oregano: (p, r) => bush(r, { stems: 8, h: 0.07, tilt: 0.7, r: 0.003, color: p.foliage, pairs: 4,
    leaf: { L: 0.016, W: 0.013, bend: 0.25, fullness: 0.9 } }),
  thyme: (p, r) => bush(r, { stems: 9, h: 0.05, tilt: 0.95, r: 0.002, stemColor: '#8A7A5E', color: p.foliage, pairs: 4,
    leaf: { L: 0.011, W: 0.004, bend: 0.2, fullness: 0.8 } }),
  rosemary: (p, r) => bush(r, { stems: 6, h: 0.16, tilt: 0.25, jit: 0.2, r: 0.004, stemColor: '#6B5844', color: p.foliage, pairs: 6,
    leaf: { L: 0.02, W: 0.004, bend: 0.15, fullness: 0.8 } }),
  marigold: (p, r) => bush(r, { stems: 6, h: 0.08, tilt: 0.4, color: p.foliage, pairs: 2,
    leaf: { L: 0.03, W: 0.012, bend: 0.3, waves: 5, depth: 0.25, fullness: 0.5 },
    tip: () => {
      const f = new THREE.Group();
      const b = berry(0.013, p.accent, 0.75); f.add(b);
      const c = berry(0.007, '#C77618'); c.position.y = 0.008; f.add(c);
      return f;
    } }),
  tom_bush: (p, r) => {
    const g = bush(r, { stems: 5, h: 0.11, tilt: 0.4, r: 0.005, color: p.foliage, pairs: 3,
      leaf: { L: 0.05, W: 0.022, bend: 0.4, waves: 4, depth: 0.22, fullness: 0.6 } });
    dangles(r, g, 4, () => berry(0.016, p.accent), { rad: 0.05, y0: 0.03, y1: 0.08 });
    return g;
  },
  pepper: (p, r) => {
    const g = bush(r, { stems: 3, h: 0.12, tilt: 0.25, r: 0.005, color: p.foliage, pairs: 3,
      leaf: { L: 0.05, W: 0.025, bend: 0.35, fullness: 0.7 } });
    dangles(r, g, 3, i => pod(0.011, 0.02, i % 3 ? p.accent : '#5E8A3C'), { rad: 0.04, y0: 0.03, y1: 0.06 });
    return g;
  },
  beans: (p, r) => {
    const g = bush(r, { stems: 5, h: 0.10, tilt: 0.4, color: p.foliage, pairs: 2,
      leaf: { L: 0.05, W: 0.035, bend: 0.45, fullness: 0.7 } });
    dangles(r, g, 5, () => pod(0.004, 0.04, p.accent), { rad: 0.04, y0: 0.02, y1: 0.05 });
    return g;
  },
  strawberry: (p, r) => {
    const g = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      g.add(sprout((i / 6) * Math.PI * 2 + r() * 0.5, 0.8 + r() * 0.3,
        shoot(0.035, 0.003, p.foliage, tuft(p.foliage, { L: 0.03, W: 0.022, bend: 0.3, fullness: 0.7 }, 3))));
    }
    for (let i = 0; i < 2; i++) {
      const f = berry(0.006, '#F4F1E4');
      f.position.set((r() - 0.5) * 0.06, 0.05 + r() * 0.02, (r() - 0.5) * 0.06);
      g.add(f);
    }
    for (let i = 0; i < 3; i++) { // berries dangle outward, over the pocket lip
      const b = berry(0.011, p.accent, 1.25);
      b.position.set((r() - 0.5) * 0.07, 0.006, 0.045 + r() * 0.03);
      g.add(b);
    }
    g.userData.directional = true;
    return g;
  },
  tom_vine: (p, r) => vinePlant(r, { len: 0.55, color: p.foliage, nLeaves: 8,
    leafMaker: rr => tuft(p.foliage, { L: 0.04, W: 0.017, bend: 0.35, waves: 4, depth: 0.2, fullness: 0.6 }, 3),
    nFruit: 3,
    fruitMaker: rr => { // truss of three
      const tr = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const b = berry(0.012, p.accent);
        b.position.set((rr() - 0.5) * 0.02, -i * 0.018, (rr() - 0.5) * 0.02);
        tr.add(b);
      }
      return tr;
    } }),
  cucumber: (p, r) => vinePlant(r, { len: 0.5, color: p.foliage, nLeaves: 7, tendril: true,
    leafMaker: () => leaf({ kind: 'lobed', L: 0.06, depth: 0.13, lobes: 5, bend: 0.25 }, p.foliage),
    nFruit: 2, fruitMaker: () => pod(0.011, 0.045, '#2F5A26') }),
  zucchini: (p, r) => {
    const g = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      g.add(sprout((i / 6) * Math.PI * 2 + r() * 0.4, 0.55 + r() * 0.3,
        shoot(0.05, 0.006, '#5E8A4E', leaf({ kind: 'lobed', L: 0.10, depth: 0.15, lobes: 5, bend: 0.3 }, p.foliage))));
    }
    const fr = pod(0.014, 0.07, '#2F5A26');
    fr.rotation.x = 1.35;
    fr.position.set(0.02, 0.02, 0.05);
    g.add(fr);
    const bloom = new THREE.Mesh(cachedGeo('zbloom', () => new THREE.ConeGeometry(0.012, 0.03, 6)), mat('#E9B93B'));
    bloom.rotation.x = 1.1;
    bloom.position.set(-0.03, 0.04, 0.04);
    g.add(bloom);
    g.userData.directional = true;
    return g;
  },
  nasturtium: (p, r) => vinePlant(r, { len: 0.4, color: p.foliage, nLeaves: 7, uprightLeaves: true,
    leafMaker: () => { // peltate: round shield leaf balanced flat on its petiole
      const s = new THREE.Group();
      s.add(stem(0.0018, 0.025, p.foliage));
      const c = new THREE.Mesh(cachedGeo('shield', () => new THREE.CircleGeometry(0.021, 10)), mat(p.foliage, true));
      c.rotation.x = -Math.PI / 2 + 0.3;
      c.position.y = 0.027;
      s.add(c);
      return s;
    },
    nFruit: 3, fruitDy: 0.012, fruitMaker: () => berry(0.008, p.accent) }),
};

// unknown ids (future additions) get a plausible generic mound
function generic(p, r) {
  return bush(r, { stems: 5, h: 0.08, tilt: 0.5, color: p.foliage || '#4E7A3C', pairs: 3,
    leaf: { L: 0.03, W: 0.02, bend: 0.4, fullness: 0.7 } });
}

export function buildPlantModel(plant, rand) {
  return (SPECIES[plant.id] || generic)(plant, rand);
}
