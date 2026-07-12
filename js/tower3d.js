/* ================= 3D TOWER =================
   Three.js scene: terracotta tower built from stacked tapered rings,
   9 pocket cups per ring + 5 crown spots, procedural low-poly plants.
   Drag to orbit, scroll to zoom, click a ring/pocket to select. */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildPlantModel } from './plants3d.js';

const C = {
  bg: 0xEDF1E4, ink: 0x25341F, terra: 0xC05F38, terraDeep: 0x96431F,
  terraLite: 0xD98B62, soil: 0x4A3628, soilLite: 0x6B5138, leaf: 0x4E7A3C,
  base: 0xA0522D, drawer: 0x3A2A1E, ground: 0xDDE4CE,
};

// tower proportions (matches the physical model: crown + 5 scalloped rings,
// see img.webp in the repo root)
const RING_COUNT = 5, POCKETS_PER_RING = 9, CROWN_SLOTS = 5;
const RING_H = 0.62, R0 = 0.50, DR = 0.055;         // core column radii
const CROWN_H = 0.30, BASE_H = 0.45;
const RINGS_TOP = BASE_H + RING_COUNT * RING_H;     // y of ring 1's top edge
const CROWN_Y = RINGS_TOP + CROWN_H;                // y of crown rim / soil surface
// the big flared pocket cups that give the tower its scalloped profile
const CUP_R = 0.17, CUP_TIP = 0.035, CUP_H = 0.42, CUP_TILT = 0.62;

const ringTopR = i => R0 + i * DR;                  // i = 0 (top ring) … 4 (bottom)
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

/* ---------- procedural plants (species builders live in plants3d.js) ---------- */

function buildPlant(plant, seed) {
  const rand = rng(seed);
  const g = buildPlantModel(plant, rand);
  // slight organic variation per pocket; directional models (vines, dangling
  // fruit) only get a little yaw jitter — the caller aims their +Z outward
  g.rotation.y = g.userData.directional ? (rand() - 0.5) * 0.5 : rand() * Math.PI * 2;
  g.scale.setScalar(0.9 + rand() * 0.25);
  return g;
}

/* ---------- static tower ---------- */

// world-space frame of pocket `slot` on ring `i`: cup-mouth center, outward
// direction, and the tilted cup axis
function pocketFrame(i, slot) {
  const offset = (i % 2) * (Math.PI / POCKETS_PER_RING); // stagger alternate rings
  const a = (slot / POCKETS_PER_RING) * Math.PI * 2 + offset;
  const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
  const up = out.clone().multiplyScalar(Math.sin(CUP_TILT)).add(new THREE.Vector3(0, Math.cos(CUP_TILT), 0)).normalize();
  const mouth = out.clone().multiplyScalar(ringTopR(i) + 0.09);
  mouth.y = ringTopY(i) - 0.15;
  return { mouth, out, up, a };
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
  const botR = ringBotR(RING_COUNT - 1);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(botR + 0.02, botR + 0.10, BASE_H, 36), mat(C.base));
  base.position.y = BASE_H / 2 + 0.05;
  scene.add(base);
  for (let i = 0; i < 4; i++) { // stubby feet, like the photo
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.10, 0.12), mat(C.terraDeep));
    foot.position.set(Math.cos(a) * (botR - 0.05), 0.05, Math.sin(a) * (botR - 0.05));
    scene.add(foot);
  }
  const drawer = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.12), mat(C.drawer));
  drawer.position.set(0, 0.22, botR + 0.06);
  scene.add(drawer);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.03), mat(0xC9B08A));
  handle.position.set(0, 0.22, botR + 0.125);
  scene.add(handle);

  /* five rings: a core band wearing 9 big flared pocket cups each —
     the scalloped profile of the real product */
  const cupGeo = new THREE.CylinderGeometry(CUP_R, CUP_TIP, CUP_H, 10, 1, true);
  const cupMatEmpty = new THREE.MeshStandardMaterial({ color: C.terraLite, roughness: 0.8, side: THREE.DoubleSide });
  const cupMatFilled = new THREE.MeshStandardMaterial({ color: C.terraDeep, roughness: 0.8, side: THREE.DoubleSide });
  const pocketCups = {}; // zone -> [cup meshes]
  for (let i = 0; i < RING_COUNT; i++) {
    const zone = 'r' + (i + 1);
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(ringTopR(i), ringBotR(i), RING_H, 36),
      new THREE.MeshStandardMaterial({ color: i % 2 ? C.terra : 0xC66540, roughness: 0.8 }));
    band.position.y = ringTopY(i) - RING_H / 2;
    band.userData = { zone };
    scene.add(band);
    pickables.push(band);
    ringBands[zone] = band;

    const lip = new THREE.Mesh(new THREE.TorusGeometry(ringTopR(i) + 0.005, 0.016, 6, 40), mat(C.terraDeep));
    lip.rotation.x = Math.PI / 2;
    lip.position.y = ringTopY(i);
    scene.add(lip);

    pocketCups[zone] = [];
    for (let s = 0; s < POCKETS_PER_RING; s++) {
      const { mouth, up } = pocketFrame(i, s);
      const cup = new THREE.Mesh(cupGeo, cupMatEmpty);
      cup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
      cup.position.copy(mouth).addScaledVector(up, -CUP_H / 2);
      cup.userData = { zone, slot: s };
      scene.add(cup);
      pickables.push(cup);
      pocketCups[zone].push(cup);

      const soil = new THREE.Mesh(new THREE.CircleGeometry(CUP_R * 0.86, 12), mat(C.soil));
      soil.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), up);
      soil.position.copy(mouth).addScaledVector(up, -0.03);
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
    const r = isCrown ? R0 + 0.10 : (ringTopR(i) + ringBotR(i)) / 2 + CUP_R + 0.16; // clear the cup scallops
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
    for (let i = 0; i < RING_COUNT; i++) {
      const zone = 'r' + (i + 1);
      state.pockets[zone].forEach((pid, s) => {
        pocketCups[zone][s].material = pid ? cupMatFilled : cupMatEmpty;
        if (!pid) return;
        const plant = plantById(pid);
        if (!plant) return;
        const { mouth, out } = pocketFrame(i, s);
        const p = buildPlant(plant, zone + s + pid);
        if (p.userData.directional) p.rotation.y += Math.atan2(out.x, out.z);
        // plants lean out less steeply than the cup itself
        const grow = out.clone().multiplyScalar(Math.sin(0.45)).add(new THREE.Vector3(0, Math.cos(0.45), 0)).normalize();
        p.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), grow));
        p.position.copy(mouth).addScaledVector(grow, 0.03);
        p.scale.multiplyScalar(6.0);
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
      // aim directional models outward from the crown's center
      if (p.userData.directional) p.rotation.y += Math.PI / 2 - (s < 4 ? (s / 4) * Math.PI * 2 + 0.5 : 0);
      p.position.copy(crownSpotPos(s));
      p.scale.multiplyScalar(9.2);
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
