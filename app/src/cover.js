// Neon Palms Studio — draws the multi-panel GTA-style cover on any canvas.
// A cover is: 3 photo panels (one of 3 layouts) + a colour grade + a big title,
// callouts with leader lines, a round seal and a billing block, all drawn by hand.

export const LAYOUTS = {
  split: 'Sunset Split',
  strip: 'Neon Strip',
  mosaic: 'Vice Mosaic',
};

export const GRADES = {
  sunset: { label: 'Sunset', top: '#ff7a3d', bottom: '#ff2e88', wash: 'rgba(255, 46, 136, 0.20)', title: '#ffffff', accent: '#ffb347' },
  neon: { label: 'Neon Nights', top: '#ff2ec4', bottom: '#00e5ff', wash: 'rgba(0, 229, 255, 0.14)', title: '#ffffff', accent: '#00e5ff' },
  golden: { label: 'Golden Hour', top: '#ffb347', bottom: '#ff5e3a', wash: 'rgba(255, 140, 0, 0.18)', title: '#fff7e6', accent: '#ffd166' },
  noir: { label: 'Vice Noir', top: '#7b2ff7', bottom: '#0f2a6b', wash: 'rgba(20, 20, 90, 0.30)', title: '#eaf6ff', accent: '#b388ff' },
};

export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

// The title band takes the bottom 16% of the cover; panels live above it.
export function titleBandTop(h) { return h * 0.84; }

// Panel rectangles (x, y, w, h) for a layout inside the panel zone.
export function panelRects(layout, w, h) {
  const zoneH = titleBandTop(h);
  const g = Math.max(6, Math.round(w * 0.012));
  if (layout === 'strip') {
    const cw = (w - g * 2) / 3;
    return [
      { x: 0, y: 0, w: cw, h: zoneH },
      { x: cw + g, y: 0, w: cw, h: zoneH },
      { x: (cw + g) * 2, y: 0, w: cw, h: zoneH },
    ];
  }
  if (layout === 'mosaic') {
    const leftW = w * 0.6;
    const rightX = leftW + g;
    const rightW = w - rightX;
    const halfH = (zoneH - g) / 2;
    return [
      { x: 0, y: 0, w: leftW, h: zoneH },
      { x: rightX, y: 0, w: rightW, h: halfH },
      { x: rightX, y: halfH + g, w: rightW, h: halfH },
    ];
  }
  // split (default): hero on top, two panels below.
  const heroH = zoneH * 0.58;
  const botY = heroH + g;
  const botH = zoneH - botY;
  const halfW = (w - g) / 2;
  return [
    { x: 0, y: 0, w, h: heroH },
    { x: 0, y: botY, w: halfW, h: botH },
    { x: halfW + g, y: botY, w: halfW, h: botH },
  ];
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawPhotoInto(ctx, img, rect, panel) {
  const { x, y, w, h } = rect;
  ctx.save();
  roundRectPath(ctx, x, y, w, h, Math.max(4, w * 0.008));
  ctx.clip();
  if (img) {
    const base = Math.max(w / img.naturalWidth, h / img.naturalHeight) * panel.zoom;
    const pw = img.naturalWidth * base;
    const ph = img.naturalHeight * base;
    const cx = x + w / 2 + panel.ox * w;
    const cy = y + h / 2 + panel.oy * h;
    ctx.translate(cx, cy);
    if (panel.flip) ctx.scale(-1, 1);
    ctx.drawImage(img, -pw / 2, -ph / 2, pw, ph);
  } else {
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, '#3a1b52');
    grad.addColorStop(1, '#12081c');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `700 ${Math.round(h * 0.06)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('DROP A PHOTO', x + w / 2, y + h / 2);
  }
  ctx.restore();
  ctx.save();
  roundRectPath(ctx, x, y, w, h, Math.max(4, w * 0.008));
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = Math.max(2, w * 0.003);
  ctx.stroke();
  ctx.restore();
}

function applyGrade(ctx, w, h, grade) {
  const grad = ctx.createLinearGradient(0, 0, w * 0.25, h);
  grad.addColorStop(0, grade.top);
  grad.addColorStop(1, grade.bottom);
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, titleBandTop(h));
  ctx.restore();
  ctx.save();
  ctx.fillStyle = grade.wash;
  ctx.fillRect(0, 0, w, titleBandTop(h));
  ctx.restore();
  // Vignette: darken the panel zone edges so the title pops.
  const vg = ctx.createRadialGradient(w / 2, titleBandTop(h) / 2, Math.min(w, h) * 0.35, w / 2, titleBandTop(h) / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(10,0,20,0.42)');
  ctx.save();
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, titleBandTop(h));
  ctx.restore();
}

function fitFont(ctx, text, maxWidth, startSize, weight = 900) {
  let size = startSize;
  ctx.font = `${weight} ${size}px "Arial Black", "Segoe UI", system-ui, sans-serif`;
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px "Arial Black", "Segoe UI", system-ui, sans-serif`;
  }
  return size;
}

function drawCallout(ctx, text, chipX, chipY, anchorX, anchorY, accent, scale) {
  if (!text) return;
  const pad = 14 * scale;
  const fs = 30 * scale;
  ctx.font = `800 ${fs}px "Segoe UI", system-ui, sans-serif`;
  const tw = ctx.measureText(text).width;
  const cw = tw + pad * 2;
  const ch = fs + pad * 1.5;
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(2, 3 * scale);
  ctx.beginPath();
  ctx.moveTo(chipX + cw / 2, chipY + ch);
  ctx.lineTo(anchorX, anchorY);
  ctx.stroke();
  ctx.fillStyle = 'rgba(10, 4, 18, 0.82)';
  roundRectPath(ctx, chipX, chipY, cw, ch, 8 * scale);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(1.5, 2 * scale);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, chipX + pad, chipY + ch / 2 + 1);
  ctx.restore();
}

function drawStar(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawSeal(ctx, cx, cy, r, sealText, accent) {
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(2, r * 0.05);
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = Math.max(1, r * 0.025);
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = accent;
  drawStar(ctx, cx, cy - r * 0.22, r * 0.3);
  // Seal wording sits straight under the star, never wrapped around the ring.
  const label = (sealText || '').trim().toUpperCase();
  if (label) {
    const fs = fitFont(ctx, label, r * 1.35, r * 0.3, 800);
    ctx.font = `800 ${fs}px "Segoe UI", system-ui, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy + r * 0.42);
  }
  ctx.restore();
}

/** Draws the whole cover onto `canvas` at its own pixel size. */
export function drawCover(canvas, images, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const scale = w / 1080;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const rects = panelRects(state.layout, w, h);

  // White gutters behind everything.
  ctx.fillStyle = '#fdf7f0';
  ctx.fillRect(0, 0, w, h);

  state.panels.forEach((panel, i) => {
    drawPhotoInto(ctx, images[panel.photo] || null, rects[i], panel);
  });
  applyGrade(ctx, w, h, grade);

  // Title band: deep dusk gradient with a hot horizon line.
  const bandY = titleBandTop(h);
  const band = ctx.createLinearGradient(0, bandY, 0, h);
  band.addColorStop(0, '#1a0b2e');
  band.addColorStop(1, '#0a0514');
  ctx.fillStyle = band;
  ctx.fillRect(0, bandY, w, h - bandY);
  ctx.fillStyle = grade.accent;
  ctx.fillRect(0, bandY, w, Math.max(3, 4 * scale));

  // Big title, left-aligned, with a hard offset shadow. It stops short of the
  // round seal, which sits at the title band's right end.
  const title = (state.title || '').trim().toUpperCase();
  const margin = w * 0.045;
  const sealR = (h - bandY) * 0.48;
  const titleSize = fitFont(ctx, title, w - margin * 2 - sealR * 2 - w * 0.03, h * 0.085);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const titleY = bandY + (h - bandY) * 0.52;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillText(title, margin + 5 * scale, titleY + 5 * scale);
  ctx.fillStyle = grade.title;
  ctx.fillText(title, margin, titleY);

  // Subtitle in accent colour under the title.
  const sub = (state.subtitle || '').trim().toUpperCase();
  if (sub) {
    const subSize = fitFont(ctx, sub, w - margin * 2, h * 0.026, 700);
    ctx.font = `700 ${subSize}px "Segoe UI", system-ui, sans-serif`;
    ctx.fillStyle = grade.accent;
    ctx.fillText(sub, margin, bandY + (h - bandY) * 0.82);
  }

  // Billing block, tiny caps at the very bottom.
  const billing = (state.billing || '').trim().toUpperCase();
  if (billing) {
    const bSize = fitFont(ctx, billing, w - margin * 2, Math.max(9, h * 0.011), 600);
    ctx.font = `600 ${bSize}px "Segoe UI", system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.62)';
    ctx.fillText(billing, margin, h - h * 0.018);
  }

  // Round seal overlapping the title band's right end.
  drawSeal(ctx, w - margin - sealR, bandY + (h - bandY) * 0.5, sealR, state.seal || '', grade.accent);

  // Callouts with leader lines pointing into the panels.
  const c1 = (state.callouts[0] || '').trim();
  const c2 = (state.callouts[1] || '').trim();
  const hero = rects[0];
  if (c1) {
    drawCallout(ctx, c1, w * 0.04, hero.y + hero.h * 0.08, hero.x + hero.w * 0.42, hero.y + hero.h * 0.42, grade.accent, scale);
  }
  if (c2) {
    const last = rects[rects.length - 1];
    const fs = 30 * scale;
    ctx.font = `800 ${fs}px "Segoe UI", system-ui, sans-serif`;
    const chipW = ctx.measureText(c2).width + 28 * scale;
    drawCallout(ctx, c2, last.x + last.w - chipW - w * 0.03, last.y + last.h * 0.1, last.x + last.w * 0.5, last.y + last.h * 0.55, grade.accent, scale);
  }
}
