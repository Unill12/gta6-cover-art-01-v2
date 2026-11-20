// Fixed scenes for screenshots: ?shot=editor shows the editor with sample photos
// loaded; ?shot=cover shows a cover the app itself drew, alone on the page.
// Params: layout, grade, size (1080x1080 | 1080x1350 | 1920x1080), title,
// subtitle, callout1, callout2. window.__shotReady is set once painted.
import { drawCover, SIZES } from './cover.js';

function applyParams(query, state) {
  const layout = query.get('layout');
  if (layout) state.layout = layout;
  const grade = query.get('grade');
  if (grade) state.grade = grade;
  const size = query.get('size');
  if (size && SIZES[size]) state.size = size;
  const title = query.get('title');
  if (title !== null) { state.title = title; document.getElementById('title').value = title; }
  const subtitle = query.get('subtitle');
  if (subtitle !== null) { state.subtitle = subtitle; document.getElementById('subtitle').value = subtitle; }
  const c1 = query.get('callout1');
  if (c1 !== null) { state.callouts[0] = c1; document.getElementById('callout1').value = c1; }
  const c2 = query.get('callout2');
  if (c2 !== null) { state.callouts[1] = c2; document.getElementById('callout2').value = c2; }
  document.querySelectorAll('#layouts .choice').forEach((c) => c.classList.toggle('active', c.dataset.layout === state.layout));
  document.querySelectorAll('#grades .choice').forEach((c) => c.classList.toggle('active', c.dataset.grade === state.grade));
  const sizeSel = document.getElementById('size');
  if (sizeSel) sizeSel.value = state.size;
}

function ready() {
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

export async function runShot(shot, query, api) {
  const { loadSamples, state, syncPanelControls, images } = api;
  await loadSamples();
  applyParams(query, state);
  // A cover shot shows the three panels filled with both samples.
  state.panels[0].photo = 'beach';
  state.panels[1].photo = 'city';
  state.panels[2].photo = 'beach';
  state.panels[2].flip = true;
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const [w, h] = SIZES[state.size] || SIZES['1920x1080'];
    // The gate caps a screenshot's long side at 1280: draw the cover itself
    // at that capped size instead of scaling a bigger image down.
    const s = Math.min(1, 1280 / Math.max(w, h));
    const canvas = document.getElementById('cover');
    canvas.width = Math.round(w * s);
    canvas.height = Math.round(h * s);
    drawCover(canvas, images, state);
  } else {
    syncPanelControls();
    api.redraw();
  }
  ready();
}
