/* ================= 3D TOWER =================
   Three.js scene: terracotta tower built from stacked tapered rings,
   9 pocket cups per ring + 5 crown spots, procedural low-poly plants.
   Drag to orbit, scroll to zoom, click a ring/pocket to select. */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const C = {
  bg: 0xEDF1E4, ink: 0x25341F, terra: 0xC05F38, terraDeep: 0x96431F,
  terraLite: 0xD98B62, soil: 0x4A3628, soilLite: 0x6B5138, leaf: 0x4E7A3C,
  base: 0xA0522D, drawer: 0x3A2A1E, ground: 0xDDE4CE,
};

// tower proportions (matches the physical model: crown + 6 rings widening downward)
const RING_H = 0.55, R0 = 0.60, DR = 0.065;
const CROWN_H = 0.30, BASE_H = 0.42;
const RINGS_TOP = BASE_H + 6 * RING_H;              // y of ring 1's top edge
const CROWN_Y = RINGS_TOP + CROWN_H;                // y of crown rim / soil surface
const POCKETS_PER_RING = 9, CROWN_SLOTS = 5;

const ringTopR = i => R0 + i * DR;                  // i = 0 (top ring) … 5 (bottom)
const ringBotR = i => R0 + (i + 1) * DR;
const ringTopY = i => RINGS_TOP - i * RING_H;

// deterministic per-pocket randomness so plants don't reshuffle on refresh
function rng(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const matCache = new Map();
function mat(color) {
  if (!matCache.has(color)) matCache.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0 }));
  return matCache.get(color);
}

/* ---------- procedural plants ---------- */

function leafBlade(color, r, len) {
  const g = new THREE.SphereGeometry(1, 6, 4);
  const m = new THREE.Mesh(g, mat(color));
  m.scale.set(r, len, r * 0.45);
  return m;
}

function buildPlant(plant, seed) {
  const rand = rng(seed);
  const g = new THREE.Group();
  const fol = new THREE.Color(plant.foliage || '#4E7A3C').getHex();
  const acc = plant.accent ? new THREE.Color(plant.accent).getHex() : null;
  const s = plant.small ? 0.72 : plant.tall ? 1.2 : 1;

  const scatter = (n, fn) => { for (let i = 0; i < n; i++) fn(i, rand); };

  switch (plant.form) {
    case 'leafy': { // rosette of blades fanning outward
      scatter(7, i => {
        const a = (i / 7) * Math.PI * 2 + rand() * 0.5;
        const tilt = 0.55 + rand() * 0.35;
        const leaf = leafBlade(fol, 0.055 * s, 0.16 * s);
        leaf.position.set(Math.cos(a) * 0.05, 0.10 * s, Math.sin(a) * 0.05);
        leaf.rotation.set(Math.sin(a) * tilt, 0, -Math.cos(a) * tilt);
        g.add(leaf);
      });
      break;
    }
    case 'herb': { // soft mound of little sphere puffs
      scatter(8, () => {
        const a = rand() * Math.PI * 2, r = rand() * 0.09 * s;
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.045 + rand() * 0.035, 6, 5), mat(fol));
        puff.position.set(Math.cos(a) * r, 0.05 + rand() * 0.13 * s, Math.sin(a) * r);
        g.add(puff);
      });
      break;
    }
    case 'spiky': { // upright thin blades (onion, chives, celery, rosemary, carrot tops)
      scatter(9, () => {
        const a = rand() * Math.PI * 2, r = rand() * 0.05;
        const h = (0.14 + rand() * 0.12) * s;
        const blade = new THREE.Mesh(new THREE.ConeGeometry(0.014, h, 5), mat(fol));
        blade.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
        blade.rotation.set((rand() - 0.5) * 0.5, 0, (rand() - 0.5) * 0.5);
        g.add(blade);
      });
      if (acc) { // e.g. chive blossoms / carrot shoulder
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), mat(acc));
        dot.position.set(0.03, 0.22 * s, 0.02);
        g.add(dot);
      }
      break;
    }
    case 'root': { // small leaf fan + colored shoulder peeking from the soil
      scatter(5, i => {
        const a = (i / 5) * Math.PI * 2 + rand() * 0.6;
        const leaf = leafBlade(fol, 0.04, 0.11);
        leaf.position.set(Math.cos(a) * 0.035, 0.08, Math.sin(a) * 0.035);
        leaf.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
        g.add(leaf);
      });
      if (acc) {
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), mat(acc));
        bulb.position.y = 0.015;
        g.add(bulb);
      }
      break;
    }
    case 'bush': { // broad leaves, generous spread
      scatter(6, i => {
        const a = (i / 6) * Math.PI * 2 + rand() * 0.5;
        const leaf = leafBlade(fol, 0.085, 0.15);
        leaf.position.set(Math.cos(a) * 0.08, 0.10, Math.sin(a) * 0.08);
        leaf.rotation.set(Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7);
        g.add(leaf);
      });
      break;
    }
    case 'fruit': { // leafy mound with dangling colored fruit
      scatter(6, () => {
        const a = rand() * Math.PI * 2, r = rand() * 0.07;
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.05 + rand() * 0.03, 6, 5), mat(fol));
        puff.position.set(Math.cos(a) * r, (plant.low ? 0.04 : 0.08) + rand() * 0.10, Math.sin(a) * r);
        g.add(puff);
      });
      scatter(3, () => {
        const a = rand() * Math.PI * 2;
        const fr = new THREE.Mesh(new THREE.SphereGeometry(plant.low ? 0.022 : 0.032, 8, 6), mat(acc || 0xD2452B));
        fr.position.set(Math.cos(a) * 0.09, 0.03 + rand() * 0.08, Math.sin(a) * 0.09);
        g.add(fr);
      });
      break;
    }
    case 'flower': { // green mound with bright blooms on top
      scatter(5, () => {
        const a = rand() * Math.PI * 2, r = rand() * 0.06;
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.045 + rand() * 0.025, 6, 5), mat(fol));
        puff.position.set(Math.cos(a) * r, 0.05 + rand() * 0.08, Math.sin(a) * r);
        g.add(puff);
      });
      scatter(4, () => {
        const a = rand() * Math.PI * 2, r = 0.03 + rand() * 0.06;
        const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.026, 6, 5), mat(acc || 0xDFA22F));
        bloom.position.set(Math.cos(a) * r, 0.12 + rand() * 0.07, Math.sin(a) * r);
        g.add(bloom);
      });
      break;
    }
    case 'ball': { // brassica: central head wrapped in leaves
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), mat(acc || fol));
      head.position.y = 0.07;
      g.add(head);
      scatter(6, i => {
        const a = (i / 6) * Math.PI * 2 + rand() * 0.4;
        const leaf = leafBlade(fol, 0.05, 0.12);
        leaf.position.set(Math.cos(a) * 0.06, 0.07, Math.sin(a) * 0.06);
        leaf.rotation.set(Math.sin(a) * 0.8, 0, -Math.cos(a) * 0.8);
        g.add(leaf);
      });
      break;
    }
    case 'vine': { // trailing stem that spills down the tower side
      const pts = [
        new THREE.Vector3(0, 0.02, 0),
        new THREE.Vector3(0.02, 0.10, 0.10),
        new THREE.Vector3(-0.03, -0.02, 0.24),
        new THREE.Vector3(0.04, -0.24, 0.34),
        new THREE.Vector3(-0.02, -0.48, 0.40),
      ];
      const curve = new THREE.CatmullRomCurve3(pts);
      const stem = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.012, 5, false), mat(fol));
      g.add(stem);
      scatter(6, i => {
        const p = curve.getPoint(0.15 + (i / 6) * 0.8);
        const leaf = leafBlade(fol, 0.05, 0.09);
        leaf.position.copy(p).add(new THREE.Vector3((rand() - 0.5) * 0.08, 0.02, (rand() - 0.5) * 0.08));
        leaf.rotation.set(rand() * 1.2, rand() * Math.PI, rand() * 1.2);
        g.add(leaf);
      });
      if (acc) scatter(3, i => {
        const p = curve.getPoint(0.4 + (i / 3) * 0.5);
        const fr = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), mat(acc));
        fr.position.copy(p).add(new THREE.Vector3(0, -0.035, 0.02));
        g.add(fr);
      });
      break;
    }
  }
  // slight organic variation
  g.rotation.y = rand() * Math.PI * 2;
  const jitter = 0.9 + rand() * 0.25;
  g.scale.setScalar(jitter);
  return g;
}

/* ---------- static tower ---------- */

// world-space position + grow direction (unit) of pocket `slot` on ring `i`
function pocketFrame(i, slot) {
  const offset = (i % 2) * (Math.PI / POCKETS_PER_RING); // stagger alternate rings
  const a = (slot / POCKETS_PER_RING) * Math.PI * 2 + offset;
  const y = ringTopY(i) - RING_H * 0.68;
  const t = 0.68; // fraction down the ring face
  const r = ringTopR(i) * (1 - t) + ringBotR(i) * t;
  const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
  const pos = out.clone().multiplyScalar(r + 0.02);
  pos.y = y;
  return { pos, out, a };
}

function crownSpotPos(slot) {
  if (slot === 4) return new THREE.Vector3(0, CROWN_Y, 0.02); // near center, in front of the worm column
  const a = (slot / 4) * Math.PI * 2 + 0.5;
  return new THREE.Vector3(Math.cos(a) * 0.33, CROWN_Y, Math.sin(a) * 0.33);
}

export function createTower(container, onPick) {
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
  camera.position.set(2.6, 3.4, 5.6);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, RINGS_TOP / 2 + 0.5, 0);
  controls.enablePan = false;
  controls.minDistance = 3.2;
  controls.maxDistance = 9;
  controls.minPolarAngle = 0.55;
  controls.maxPolarAngle = 1.52;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  controls.autoRotate = !reduceMotion;       // gentle idle spin — the real tower rotates too
  controls.autoRotateSpeed = 0.6;
  controls.addEventListener('start', () => { controls.autoRotate = false; });

  scene.add(new THREE.HemisphereLight(0xFFF7E6, 0x8A9070, 1.15));
  const sun = new THREE.DirectionalLight(0xFFF3DC, 1.6);
  sun.position.set(4, 8, 3);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xE8EEF2, 0.4);
  fill.position.set(-5, 3, -4);
  scene.add(fill);

  const pickables = [];   // meshes with userData {zone, slot?}
  const ringBands = {};   // zone id -> band mesh

  /* ground + soft fake shadow */
  const ground = new THREE.Mesh(new THREE.CircleGeometry(2.4, 40), new THREE.MeshStandardMaterial({ color: C.ground, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.35, 40),
    new THREE.MeshBasicMaterial({ color: 0x25341F, transparent: true, opacity: 0.12 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.005;
  scene.add(shadow);

  /* base + tea drawer */
  const base = new THREE.Mesh(new THREE.CylinderGeometry(ringBotR(5) + 0.02, ringBotR(5) + 0.14, BASE_H, 36), mat(C.base));
  base.position.y = BASE_H / 2;
  scene.add(base);
  const drawer = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.12), mat(C.drawer));
  drawer.position.set(0, 0.16, ringBotR(5) + 0.10);
  scene.add(drawer);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.03), mat(0xC9B08A));
  handle.position.set(0, 0.16, ringBotR(5) + 0.165);
  scene.add(handle);

  /* six tapered rings, each with 9 pocket cups */
  const pocketCups = {}; // zone -> [cup meshes]
  for (let i = 0; i < 6; i++) {
    const zone = 'r' + (i + 1);
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(ringTopR(i), ringBotR(i), RING_H, 36),
      new THREE.MeshStandardMaterial({ color: i % 2 ? C.terra : 0xC66540, roughness: 0.8 }));
    band.position.y = ringTopY(i) - RING_H / 2;
    band.userData = { zone };
    scene.add(band);
    pickables.push(band);
    ringBands[zone] = band;

    const lip = new THREE.Mesh(new THREE.TorusGeometry(ringTopR(i) + 0.005, 0.014, 6, 40), mat(C.terraDeep));
    lip.rotation.x = Math.PI / 2;
    lip.position.y = ringTopY(i);
    scene.add(lip);

    pocketCups[zone] = [];
    for (let s = 0; s < POCKETS_PER_RING; s++) {
      const { pos, out } = pocketFrame(i, s);
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.06, 0.17, 10, 1, true), mat(C.terraLite));
      // tilt the cup mouth up and outward, like the real pockets
      const up = out.clone().multiplyScalar(Math.sin(0.8)).add(new THREE.Vector3(0, Math.cos(0.8), 0)).normalize();
      cup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
      cup.position.copy(pos);
      cup.userData = { zone, slot: s };
      scene.add(cup);
      pickables.push(cup);
      pocketCups[zone].push(cup);

      const soil = new THREE.Mesh(new THREE.CircleGeometry(0.098, 10), mat(C.soil));
      soil.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), up);
      soil.position.copy(pos).add(up.clone().multiplyScalar(0.075));
      soil.userData = { zone, slot: s };
      scene.add(soil);
      pickables.push(soil);
    }
  }

  /* crown: rim + soil + 5 spots + worm column stub */
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(R0, R0 + 0.01, CROWN_H, 36), mat(C.terra));
  rim.position.y = RINGS_TOP + CROWN_H / 2;
  rim.userData = { zone: 'crown' };
  scene.add(rim);
  pickables.push(rim);
  ringBands.crown = rim;

  const crownSoil = new THREE.Mesh(new THREE.CircleGeometry(R0 - 0.05, 36), mat(C.soil));
  crownSoil.rotation.x = -Math.PI / 2;
  crownSoil.position.y = CROWN_Y - 0.02;
  crownSoil.userData = { zone: 'crown' };
  scene.add(crownSoil);
  pickables.push(crownSoil);

  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.10, 16), mat(C.drawer));
  column.position.set(-0.28, CROWN_Y + 0.03, -0.28);
  scene.add(column);

  const crownSpots = [];
  for (let s = 0; s < CROWN_SLOTS; s++) {
    const spot = new THREE.Mesh(new THREE.CircleGeometry(0.085, 12), mat(C.soilLite));
    spot.rotation.x = -Math.PI / 2;
    spot.position.copy(crownSpotPos(s));
    spot.position.y = CROWN_Y - 0.012;
    spot.userData = { zone: 'crown', slot: s };
    scene.add(spot);
    pickables.push(spot);
    crownSpots.push(spot);
  }

  /* dynamic layers: plants + selection/search highlight rings */
  const plantsGroup = new THREE.Group();
  scene.add(plantsGroup);
  const hlGroup = new THREE.Group();
  scene.add(hlGroup);

  function disposeGroup(group) {
    group.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    group.clear();
  }

  function haloAt(zone, color, opacity) {
    const isCrown = zone === 'crown';
    const i = isCrown ? -1 : +zone.slice(1) - 1;
    const r = (isCrown ? R0 : (ringTopR(i) + ringBotR(i)) / 2) + 0.10;
    const y = isCrown ? RINGS_TOP + CROWN_H / 2 : ringTopY(i) - RING_H / 2;
    const halo = new THREE.Mesh(new THREE.TorusGeometry(r, 0.022, 8, 48),
      new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity }));
    halo.rotation.x = Math.PI / 2;
    halo.position.y = y;
    return halo;
  }

  // refresh(state, selZone, hlPlant) — redraws plants + highlights from app state
  function refresh(state, selZone, hlPlant, plantById) {
    disposeGroup(plantsGroup);
    disposeGroup(hlGroup);

    // plants in ring pockets
    for (let i = 0; i < 6; i++) {
      const zone = 'r' + (i + 1);
      state.pockets[zone].forEach((pid, s) => {
        pocketCups[zone][s].material = mat(pid ? C.terraDeep : C.terraLite);
        if (!pid) return;
        const plant = plantById(pid);
        if (!plant) return;
        const { pos, out } = pocketFrame(i, s);
        const p = buildPlant(plant, zone + s + pid);
        const up = out.clone().multiplyScalar(Math.sin(0.45)).add(new THREE.Vector3(0, Math.cos(0.45), 0)).normalize();
        p.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), up));
        p.position.copy(pos).add(up.clone().multiplyScalar(0.08));
        p.scale.multiplyScalar(0.85);
        plantsGroup.add(p);
      });
    }
    // crown plants (bigger, straight up)
    state.pockets.crown.forEach((pid, s) => {
      crownSpots[s].visible = !pid;
      if (!pid) return;
      const plant = plantById(pid);
      if (!plant) return;
      const p = buildPlant(plant, 'crown' + s + pid);
      p.position.copy(crownSpotPos(s));
      p.scale.multiplyScalar(1.35);
      plantsGroup.add(p);
    });

    // selection halo (ink) + search halos (leaf: solid = best, faded = good)
    if (selZone) hlGroup.add(haloAt(selZone, C.ink, 1));
    if (hlPlant) {
      hlPlant.best.forEach(z => { if (z !== selZone) hlGroup.add(haloAt(z, C.leaf, 1)); });
      hlPlant.good.forEach(z => { if (z !== selZone) hlGroup.add(haloAt(z, C.leaf, 0.4)); });
      if (hlPlant.best.includes(selZone) || hlPlant.good.includes(selZone))
        hlGroup.add(haloAt(selZone, C.leaf, hlPlant.best.includes(selZone) ? 1 : 0.4).translateY(0.06));
    }
  }

  /* click vs drag: only raycast if the pointer barely moved */
  const ray = new THREE.Raycaster();
  let downAt = null;
  renderer.domElement.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', e => {
    if (!downAt) return;
    const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]);
    downAt = null;
    if (moved > 6) return;
    const rect = renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pickables, false)[0];
    if (hit) onPick(hit.object.userData.zone, hit.object.userData.slot ?? null);
  });

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  new ResizeObserver(resize).observe(container);
  resize();

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });

  return { refresh };
}
