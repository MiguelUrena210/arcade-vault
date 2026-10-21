'use strict';

// Skins visuales. Cada skin: { name, colors[0..8], background|null, grid|null, drawBlock(ctx, px, py, size, color, alpha) }
// colors[i] = color de la pieza i (0 vacío, 8 = O3). background/grid null → usa el CSS del tema.

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const SKINS = {
  retro: {
    name: 'Retro',
    colors: [null, '#4dd0e1', '#ffd54f', '#ba68c8', '#81c784', '#e57373', '#90caf9', '#ffb74d', '#ff4081'],
    background: null,
    grid: null,
    drawBlock(ctx, px, py, size, color, alpha) {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(px + 1, py + 1, size - 2, 4);
      ctx.globalAlpha = 1;
    },
  },

  neon: {
    name: 'Neon',
    colors: [null, '#00ffff', '#ffff00', '#d500f9', '#39ff14', '#ff1744', '#2979ff', '#ff9100', '#ff00aa'],
    background: '#000',
    grid: 'rgba(0,255,255,0.12)',
    drawBlock(ctx, px, py, size, color, alpha) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha * 0.35;
      ctx.fillRect(px + 2, py + 2, size - 4, size - 4);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 3, py + 3, size - 6, size - 6);
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
      ctx.globalAlpha = 1;
    },
  },

  pastel: {
    name: 'Pastel',
    colors: [null, '#a8e6ef', '#fff1a8', '#d7b8f0', '#b8e6b8', '#f7b8b8', '#b8d4f7', '#ffd9a8', '#ffb8d4'],
    background: null,
    grid: null,
    drawBlock(ctx, px, py, size, color, alpha) {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      roundRectPath(ctx, px + 2, py + 2, size - 4, size - 4, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      roundRectPath(ctx, px + 6, py + 5, size - 14, 4, 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    },
  },

  pixel: {
    name: 'Pixel art',
    colors: [null, '#29b6f6', '#fdd835', '#ab47bc', '#66bb6a', '#ef5350', '#5c6bc0', '#ff9800', '#ec407a'],
    background: null,
    grid: null,
    drawBlock(ctx, px, py, size, color, alpha) {
      const n = 7, p = Math.floor((size - 2) / n), ox = px + 1, oy = py + 1;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.fillRect(ox, oy, p * n, p * n);
      // bevel: borde superior/izquierdo claro, inferior/derecho oscuro
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillRect(ox, oy, p * n, p);
      ctx.fillRect(ox, oy, p, p * n);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(ox, oy + p * (n - 1), p * n, p);
      ctx.fillRect(ox + p * (n - 1), oy, p, p * n);
      // textura: damero 2x2 interior
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(ox + p * 2, oy + p * 2, p, p);
      ctx.fillRect(ox + p * 3, oy + p * 3, p, p);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(ox + p * 3, oy + p * 2, p, p);
      ctx.fillRect(ox + p * 2, oy + p * 3, p, p);
      ctx.globalAlpha = 1;
    },
  },
};

const Skins = {
  active: SKINS.retro,
  // Aplica la skin (retro si el nombre es inválido) y devuelve el nombre efectivo.
  set(name) {
    const key = Object.prototype.hasOwnProperty.call(SKINS, name) ? name : 'retro';
    this.active = SKINS[key];
    return key;
  },
};
