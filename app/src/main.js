// Neon Palms Studio — wires the editor: uploads, panel editing, layouts, grades,
// live preview and PNG export. A `?shot=` query sets up a fixed scene for screenshots.
import { drawCover, panelRects, SIZES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const panelName = document.getElementById('panelName');
const sliders = {
  zoom: document.getElementById('zoom'),
  ox: document.getElementById('ox'),
  oy: document.getElementById('oy'),
};
const outs = {
  zoom: document.getElementById('zoomOut'),
  ox: document.getElementById('oxOut'),
  oy: document.getElementById('oyOut'),
};

export const state = {
  layout: 'split',
  grade: 'sunset',
  size: '1920x1080',
  title: 'NEON PALMS',
  subtitle: 'A VICE SUNSET HEIST',
  callouts: ['Palm Beach Nights', 'Turbo Getaway'],
  seal: 'EST. 2026',
  billing: 'A NEON PALMS PRODUCTION · SUNSET PICTURES',
  selected: 0,
  panels: [
    { photo: 'beach', zoom: 1, ox: 0, oy: 0, flip: false },
    { photo: 'city', zoom: 1, ox: 0, oy: 0, flip: false },
    { photo: 'beach', zoom: 1.15, ox: 0, oy: 0, flip: true },
  ],
};

// Loaded images by id: 'beach' and 'city' are the bundled samples, the rest are uploads.
export const images = {};
const uploadNames = [];
let uploadCount = 0;

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export async function loadSamples() {
  if (!images.beach) images.beach = await loadImage('./assets/beach.jpg');
  if (!images.city) images.city = await loadImage('./assets/city.jpg');
}

function currentSize() {
  return SIZES[state.size] || SIZES['1920x1080'];
}

export function redraw() {
  const [w, h] = currentSize();
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  drawCover(canvas, images, state);
}

function syncPanelControls() {
  const p = state.panels[state.selected];
  panelName.textContent = `Panel ${state.selected + 1}`;
  sliders.zoom.value = p.zoom;
  sliders.ox.value = p.ox;
  sliders.oy.value = p.oy;
  outs.zoom.textContent = `${Number(p.zoom).toFixed(2)}×`;
  outs.ox.textContent = Number(p.ox).toFixed(2);
  outs.oy.textContent = Number(p.oy).toFixed(2);
  document.querySelectorAll('#samples .thumb').forEach((t) => {
    t.classList.toggle('active', t.dataset.photo === p.photo);
  });
}

function selectPanel(i) {
  state.selected = i;
  syncPanelControls();
  redraw();
}

function assignPhoto(id) {
  state.panels[state.selected].photo = id;
  syncPanelControls();
  redraw();
}

function bindText(id, apply) {
  document.getElementById(id).addEventListener('input', (e) => {
    apply(e.target.value);
    redraw();
  });
}

bindText('title', (v) => { state.title = v; });
bindText('subtitle', (v) => { state.subtitle = v; });
bindText('callout1', (v) => { state.callouts[0] = v; });
bindText('callout2', (v) => { state.callouts[1] = v; });
bindText('seal', (v) => { state.seal = v; });
bindText('billing', (v) => { state.billing = v; });

document.getElementById('layouts').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-layout]');
  if (!btn) return;
  state.layout = btn.dataset.layout;
  document.querySelectorAll('#layouts .choice').forEach((c) => c.classList.toggle('active', c === btn));
  redraw();
});

document.getElementById('grades').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-grade]');
  if (!btn) return;
  state.grade = btn.dataset.grade;
  document.querySelectorAll('#grades .choice').forEach((c) => c.classList.toggle('active', c === btn));
  redraw();
});

document.getElementById('size').addEventListener('change', (e) => {
  state.size = e.target.value;
  redraw();
});

sliders.zoom.addEventListener('input', () => {
  state.panels[state.selected].zoom = Number(sliders.zoom.value);
  outs.zoom.textContent = `${Number(sliders.zoom.value).toFixed(2)}×`;
  redraw();
});
sliders.ox.addEventListener('input', () => {
  state.panels[state.selected].ox = Number(sliders.ox.value);
  outs.ox.textContent = Number(sliders.ox.value).toFixed(2);
  redraw();
});
sliders.oy.addEventListener('input', () => {
  state.panels[state.selected].oy = Number(sliders.oy.value);
  outs.oy.textContent = Number(sliders.oy.value).toFixed(2);
  redraw();
});

document.getElementById('flip').addEventListener('click', () => {
  const p = state.panels[state.selected];
  p.flip = !p.flip;
  redraw();
});

document.getElementById('resetPanel').addEventListener('click', () => {
  const p = state.panels[state.selected];
  p.zoom = 1; p.ox = 0; p.oy = 0; p.flip = false;
  syncPanelControls();
  redraw();
});

document.getElementById('samples').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-photo]');
  if (btn) assignPhoto(btn.dataset.photo);
});

// Uploads: file picker + drag and drop. Photos are read locally, never uploaded.
async function addUploadFiles(files) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const id = `upload${++uploadCount}`;
    const url = URL.createObjectURL(file);
    images[id] = await loadImage(url);
    uploadNames.push({ id, name: file.name });
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'thumb uploaded';
    btn.dataset.photo = id;
    const img = document.createElement('img');
    img.src = url;
    img.alt = `Uploaded photo: ${file.name}`;
    const span = document.createElement('span');
    span.textContent = file.name.length > 18 ? `${file.name.slice(0, 15)}…` : file.name;
    btn.append(img, span);
    document.getElementById('samples').appendChild(btn);
    assignPhoto(id);
  }
  statusEl.textContent = `${uploadNames.length} photo${uploadNames.length === 1 ? '' : 's'} loaded — stored only in this browser tab.`;
}

const dropzone = document.getElementById('dropzone');
const uploadInput = document.getElementById('upload');
dropzone.addEventListener('click', () => uploadInput.click());
dropzone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') uploadInput.click(); });
uploadInput.addEventListener('change', (e) => addUploadFiles([...e.target.files]));
['dragenter', 'dragover'].forEach((ev) => dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add('over'); }));
['dragleave', 'drop'].forEach((ev) => dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove('over'); }));
dropzone.addEventListener('drop', (e) => addUploadFiles([...e.dataTransfer.files]));

// Preview interaction: click selects a panel, drag pans its photo, wheel zooms it.
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  const [w, h] = currentSize();
  return { x: ((e.clientX - r.left) / r.width) * w, y: ((e.clientY - r.top) / r.height) * h };
}
let dragging = null;
canvas.addEventListener('pointerdown', (e) => {
  const pt = canvasPoint(e);
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  const hit = rects.findIndex((rc) => pt.x >= rc.x && pt.x <= rc.x + rc.w && pt.y >= rc.y && pt.y <= rc.y + rc.h);
  if (hit < 0) return;
  selectPanel(hit);
  dragging = { x: pt.x, y: pt.y, ox: state.panels[hit].ox, oy: state.panels[hit].oy };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const pt = canvasPoint(e);
  const p = state.panels[state.selected];
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  const rc = rects[state.selected];
  p.ox = Math.max(-0.5, Math.min(0.5, dragging.ox + (pt.x - dragging.x) / rc.w));
  p.oy = Math.max(-0.5, Math.min(0.5, dragging.oy + (pt.y - dragging.y) / rc.h));
  syncPanelControls();
  redraw();
});
canvas.addEventListener('pointerup', () => { dragging = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const p = state.panels[state.selected];
  p.zoom = Math.max(0.8, Math.min(2.6, p.zoom - Math.sign(e.deltaY) * 0.08));
  syncPanelControls();
  redraw();
}, { passive: false });

// Export: render the cover at full size and download it as a PNG.
document.getElementById('export').addEventListener('click', () => {
  const [w, h] = currentSize();
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off, images, state);
  off.toBlob((blob) => {
    if (!blob) { statusEl.textContent = 'Export failed — try again.'; return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-palms-cover-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    statusEl.textContent = `Saved neon-palms-cover-${w}x${h}.png — ${state.layout} layout, ${state.grade} grade.`;
  }, 'image/png');
});

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), { loadSamples, assignPhoto, selectPanel, redraw, state, syncPanelControls, images });
} else {
  loadSamples().then(() => { syncPanelControls(); redraw(); });
}
