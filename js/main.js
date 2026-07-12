import { ZONES, PLANTS, ZLABEL, ZSHORT } from './data.js';
import { createTower } from './tower3d.js';

const MONTH = new Date().getMonth(); // 0-11
const WARM = MONTH >= 3 && MONTH <= 8; // Apr–Sep (SoCal calendar)
const inSeason = p => p.season === 'all' || (WARM ? p.season === 'warm' : p.season === 'cool');
const plantById = id => PLANTS.find(p => p.id === id);

/* ================= STATE ================= */
const STORAGE_KEY = 'gt2-almanac';
let state = { pockets: {} };
ZONES.forEach(z => state.pockets[z.id] = Array(z.slots).fill(null));

let selZone = 'crown';
let pickingSlot = null;   // index of slot being planted
let viewingSlot = null;   // index of filled slot being viewed
let filter = 'best';      // best | season | all
let storageOK = false;
let hlPlant = null;       // plant id being spotlighted from search

function whereText(p){
  const best = p.best.map(z=>ZLABEL[z]).join(', ');
  const good = p.good.map(z=>ZLABEL[z]).join(', ');
  return `<b>Best: ${best}</b>${good?` · also fine: ${good}`:''}`;
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      const saved = JSON.parse(raw);
      // defensive merge: slice to current slot counts, pad with nulls
      ZONES.forEach(z=>{
        if(Array.isArray(saved.pockets?.[z.id])){
          state.pockets[z.id] = saved.pockets[z.id].slice(0,z.slots);
          while(state.pockets[z.id].length < z.slots) state.pockets[z.id].push(null);
        }
      });
    }
    storageOK = true;
  }catch(e){ storageOK = false; }
  if(!storageOK) document.getElementById('saveNote').textContent = 'Heads up: saving isn’t available here — plantings last for this session only.';
}
function saveState(){
  if(!storageOK) return;
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch(e){ console.error('save failed', e); }
}

/* ================= 3D TOWER ================= */
const tower = createTower(document.getElementById('towerStage'), (zone, slot) => {
  // click in the 3D view: ring band selects the zone; a pocket also opens that slot
  if (zone !== selZone) { selZone = zone; pickingSlot = null; viewingSlot = null; hlPlant = null; }
  if (slot !== null) {
    if (state.pockets[zone][slot]) { viewingSlot = (viewingSlot === slot ? null : slot); pickingSlot = null; }
    else { pickingSlot = (pickingSlot === slot ? null : slot); viewingSlot = null; }
  }
  render();
});

function render(){
  tower.refresh(state, selZone, hlPlant ? plantById(hlPlant) : null, plantById);
  renderZoneBtns();
  renderPanel();
}

/* ================= ZONE BUTTONS (a11y + quick nav) ================= */
function renderZoneBtns(){
  const el = document.getElementById('zoneBtns');
  el.innerHTML = ZONES.map(z=>{
    const n = state.pockets[z.id].filter(Boolean).length;
    return `<button class="zbtn ${selZone===z.id?'on':''}" data-zone="${z.id}" aria-pressed="${selZone===z.id}"
      aria-label="${z.name}, ${n} of ${z.slots} planted">${ZSHORT[z.id]}${n?` <span class="occ">·${n}</span>`:''}</button>`;
  }).join('');
  el.querySelectorAll('.zbtn').forEach(b=>b.addEventListener('click', ()=> selectZone(b.dataset.zone)));
}

/* ================= PANEL ================= */
function fitTag(p, zid){
  if(p.best.includes(zid)) return '<span class="tag best">BEST HERE</span>';
  if(p.good.includes(zid)) return '<span class="tag good">GOOD</span>';
  return '';
}
function seasonTag(p){
  return inSeason(p) ? '<span class="tag season">IN SEASON</span>'
    : `<span class="tag off">${p.season==='cool'?'OCT–MAR':'APR–SEP'}</span>`;
}

function plantsForZone(zid){
  let list = PLANTS.map(p=>({p, score:(p.best.includes(zid)?2 : p.good.includes(zid)?1 : 0) + (inSeason(p)?0.5:0)}));
  if(filter==='best') list = list.filter(x=>x.score>=1);
  if(filter==='season') list = list.filter(x=>inSeason(x.p));
  return list.sort((a,b)=>b.score-a.score).map(x=>x.p);
}

function renderPanel(){
  const z = ZONES.find(z=>z.id===selZone);
  const arr = state.pockets[z.id];
  const el = document.getElementById('zonePanel');

  let slotsHtml = arr.map((pid,i)=>{
    const p = plantById(pid);
    const cls = ['slot', p?'filled':'', pickingSlot===i?'picking':''].join(' ');
    const inner = p ? `<div class="dot"></div><div class="nm">${p.name.split(' ')[0]}</div>`
                    : `<div class="plus">+</div><div>${i+1}</div>`;
    return `<button class="${cls}" data-slot="${i}" aria-label="Pocket ${i+1}${p?', '+p.name:', empty'}">${inner}</button>`;
  }).join('');

  let detailHtml = '';
  if(viewingSlot!==null && arr[viewingSlot]){
    const p = plantById(arr[viewingSlot]);
    detailHtml = `<div class="detail">
      <h3>${p.name} <span class="mono" style="font-size:11px;color:var(--ink-soft)">pocket ${viewingSlot+1}</span></h3>
      <div class="meta">${fitTag(p,z.id)}${seasonTag(p)}</div>
      <p>${p.care}</p>
      <button class="rm" id="rmBtn">Pull this plant</button>
    </div>`;
  }

  let pickerHtml = '';
  if(pickingSlot!==null){
    const list = plantsForZone(z.id);
    pickerHtml = `
      <div class="sect">Choose for pocket ${pickingSlot+1} &nbsp;<button class="picker-close" id="cancelPick">cancel</button></div>
      <div class="filters">
        <button class="fbtn ${filter==='best'?'on':''}" data-f="best">Fits this row</button>
        <button class="fbtn ${filter==='season'?'on':''}" data-f="season">In season now</button>
        <button class="fbtn ${filter==='all'?'on':''}" data-f="all">Everything</button>
      </div>
      <div class="plist">${list.map(p=>`
        <button class="prow" data-plant="${p.id}">
          <span class="pname">${p.name}</span>
          <span class="pnote">${p.note}</span>
          ${fitTag(p,z.id)}${seasonTag(p)}
        </button>`).join('')}
        ${list.length===0?'<p style="color:var(--ink-soft);font-size:13px">Nothing matches this filter — try "Everything."</p>':''}
      </div>`;
  } else {
    const recs = PLANTS.filter(p=>p.best.includes(z.id)).sort((a,b)=>inSeason(b)-inSeason(a));
    pickerHtml = `
      <div class="sect">Best in this ${z.id==='crown'?'spot':'row'}</div>
      <div class="plist">${recs.map(p=>`
        <button class="prow" data-plant-info="${p.id}">
          <span class="pname">${p.name}</span>
          <span class="pnote">${p.note}</span>
          ${seasonTag(p)}
        </button>`).join('')}</div>`;
  }

  let hlNote = '';
  if(hlPlant){
    const hp = plantById(hlPlant);
    hlNote = `<div class="hl-note">▣ Showing where <b>&nbsp;${hp.name}&nbsp;</b> goes — solid halo = best, faint = fine. <button id="clearHl">clear</button></div>`;
  }

  el.innerHTML = `
    ${hlNote}
    <div class="zone-head"><span class="zone-num">${z.id==='crown'?'TOP':'ROW '+z.id.slice(1)} / ${z.slots} pockets</span><h2>${z.name}</h2></div>
    <p class="zone-desc">${z.desc}</p>
    <div class="env">
      <span class="chip sun">☀ <b>${z.sun}</b></span>
      <span class="chip water">◌ <b>${z.water}</b></span>
      <span class="chip nutri">✿ <b>${z.nutri}</b></span>
    </div>
    <div class="sect">Pockets — ${arr.filter(Boolean).length}/${z.slots} planted</div>
    <div class="slots">${slotsHtml}</div>
    ${detailHtml}
    ${pickerHtml}`;

  // wire up
  el.querySelectorAll('.slot').forEach(b=>b.addEventListener('click', ()=>{
    const i = +b.dataset.slot;
    if(state.pockets[z.id][i]){ viewingSlot = (viewingSlot===i? null : i); pickingSlot = null; }
    else { pickingSlot = (pickingSlot===i? null : i); viewingSlot = null; }
    render();
  }));
  el.querySelectorAll('[data-f]').forEach(b=>b.addEventListener('click', ()=>{ filter=b.dataset.f; renderPanel(); }));
  const cancel = el.querySelector('#cancelPick');
  if(cancel) cancel.addEventListener('click', ()=>{ pickingSlot=null; renderPanel(); });
  el.querySelectorAll('[data-plant]').forEach(b=>b.addEventListener('click', ()=>{
    state.pockets[z.id][pickingSlot] = b.dataset.plant;
    viewingSlot = pickingSlot; pickingSlot = null;
    saveState(); render();
  }));
  el.querySelectorAll('[data-plant-info]').forEach(b=>b.addEventListener('click', ()=>{
    // quick-plant: drop into the first empty pocket in this row
    const i = state.pockets[z.id].indexOf(null);
    if(i<0) return; // row is full
    state.pockets[z.id][i] = b.dataset.plantInfo;
    pickingSlot = null; viewingSlot = i;
    saveState(); render();
  }));
  const rm = el.querySelector('#rmBtn');
  if(rm) rm.addEventListener('click', ()=>{
    state.pockets[z.id][viewingSlot] = null; viewingSlot = null;
    saveState(); render();
  });
  const ch = el.querySelector('#clearHl');
  if(ch) ch.addEventListener('click', ()=>{ hlPlant = null; render(); });
}

/* ================= SEARCH ================= */
const sInput = document.getElementById('plantSearch');
const sBox = document.getElementById('sresults');

function renderSearch(){
  const q = sInput.value.trim().toLowerCase();
  if(!q){ sBox.hidden = true; sBox.innerHTML=''; return; }
  const hits = PLANTS.filter(p=>p.name.toLowerCase().includes(q)).slice(0,6);
  if(hits.length===0){
    sBox.innerHTML = `<div class="srow"><div class="sn none">No match for “${sInput.value.trim()}”</div><div class="sw">Try a broader word — e.g. “tomato” instead of a variety name.</div></div>`;
  } else {
    sBox.innerHTML = hits.map(p=>`
      <button class="srow" data-sp="${p.id}">
        <div class="sn">${p.name} ${inSeason(p)?'<span class="tag season">IN SEASON</span>':''}</div>
        <div class="sw">${whereText(p)}</div>
      </button>`).join('');
    sBox.querySelectorAll('[data-sp]').forEach(b=>b.addEventListener('click', ()=>{
      const p = plantById(b.dataset.sp);
      hlPlant = p.id;
      sBox.hidden = true; sInput.value = p.name;
      selectZone(p.best[0], true);
      document.getElementById('towerStage').scrollIntoView({behavior:'smooth', block:'nearest'});
    }));
  }
  sBox.hidden = false;
}
sInput.addEventListener('input', renderSearch);
sInput.addEventListener('focus', renderSearch);
document.addEventListener('click', e=>{
  if(!e.target.closest('.searchbar')) sBox.hidden = true;
});
sInput.addEventListener('keydown', e=>{ if(e.key==='Escape'){ sBox.hidden = true; sInput.blur(); } });

function selectZone(zid, keepHl){
  selZone = zid; pickingSlot = null; viewingSlot = null;
  if(!keepHl) hlPlant = null;
  render();
}

/* ================= BOOT ================= */
const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
document.getElementById('dateStamp').textContent = monthNames[MONTH] + ' · ' + (WARM?'warm season':'cool season');
document.getElementById('seasonCare').innerHTML = WARM
  ? 'It’s the <b>warm season</b> (Apr–Sep): tomatoes, peppers, basil, cucumbers, beans. Tuck lettuce low and shaded, or wait for fall.'
  : 'It’s the <b>cool season</b> (Oct–Mar): the brassica + greens window. Broccoli, cauliflower, lettuce, spinach, cilantro all shine now.';

loadState();
render();
