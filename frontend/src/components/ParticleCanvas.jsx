import { useEffect, useRef } from 'react';

/* ──────────────────────────────────────────────────────────────
   ParticleCanvas
   Draws an interactive network of nodes connected by glowing
   lines, with floating financial symbols — inspired by the VC
   login background reference image.
────────────────────────────────────────────────────────────── */

const SYMBOLS = ['$', '€', '£', '¥', '%', '₿', '◈'];
const COLORS  = ['#818cf8', '#6366f1', '#a5b4fc', '#c7d2fe', '#4f46e5'];

function hex(ctx, x, y, r, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth   = 1.2;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const px = x + r * Math.cos(angle);
    const py = y + r * Math.sin(angle);
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

export default function ParticleCanvas({ className }) {
  const canvasRef = useRef(null);
  const mouse     = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // ── resize ──────────────────────────────────────────────
    let W, H;
    const resize = () => {
      W = canvas.width  = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // ── mouse track ──────────────────────────────────────────
    const onMove = (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    canvas.addEventListener('mousemove', onMove);

    // ── node factory ────────────────────────────────────────
    const NODE_COUNT = 38;
    const SYMBOL_COUNT = 14;

    const nodes = Array.from({ length: NODE_COUNT }, (_, i) => ({
      x:  Math.random(),          // [0,1] normalised
      y:  Math.random(),
      vx: (Math.random() - 0.5) * 0.00012,
      vy: (Math.random() - 0.5) * 0.00012,
      r:  i < 8 ? 6 + Math.random() * 8 : 2.5 + Math.random() * 4,
      isHex: i > 5 && i < 14,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: 0.55 + Math.random() * 0.45,
    }));

    const symbols = Array.from({ length: SYMBOL_COUNT }, () => ({
      x:    Math.random(),
      y:    Math.random(),
      vx:   (Math.random() - 0.5) * 0.00008,
      vy:   (Math.random() - 0.5) * 0.00008,
      char: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      size: 11 + Math.random() * 9,
      alpha: 0.18 + Math.random() * 0.18,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    // ── wave paths ──────────────────────────────────────────
    let t = 0;

    const drawWave = (yBase, amp, freq, phase, alpha, color) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth   = 1;
      ctx.beginPath();
      for (let px = 0; px <= W; px += 2) {
        const py = yBase + amp * Math.sin(freq * px + phase + t * 0.7);
        px === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
    };

    // ── connection lines ─────────────────────────────────────
    const CONNECT_DIST_SQ = (0.28 * Math.min(800, 800)) ** 2; // normalised

    const drawConnections = () => {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const ax = nodes[i].x * W, ay = nodes[i].y * H;
          const bx = nodes[j].x * W, by = nodes[j].y * H;
          const dx = ax - bx, dy = ay - by;
          const distSq = dx * dx + dy * dy;
          const threshold = (0.32 * Math.min(W, H)) ** 2;
          if (distSq > threshold) continue;

          const factor = 1 - Math.sqrt(distSq) / (0.32 * Math.min(W, H));
          ctx.save();
          ctx.globalAlpha = factor * 0.35;
          const grad = ctx.createLinearGradient(ax, ay, bx, by);
          grad.addColorStop(0, nodes[i].color);
          grad.addColorStop(1, nodes[j].color);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();
          ctx.restore();
        }
      }
    };

    // ── glow pulse around big nodes ──────────────────────────
    const drawGlows = () => {
      nodes.slice(0, 6).forEach((n) => {
        const x = n.x * W, y = n.y * H;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, n.r * 4);
        grad.addColorStop(0, n.color + '55');
        grad.addColorStop(1, 'transparent');
        ctx.save();
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 1.5 + n.x * 10);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, n.r * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    };

    // ── mouse proximity highlight ────────────────────────────
    const drawMouseEffect = () => {
      const mx = mouse.current.x, my = mouse.current.y;
      nodes.forEach((n) => {
        const x = n.x * W, y = n.y * H;
        const dx = x - mx, dy = y - my;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < 120) {
          ctx.save();
          ctx.globalAlpha = (1 - d / 120) * 0.6;
          ctx.strokeStyle = '#c7d2fe';
          ctx.lineWidth   = 1;
          ctx.beginPath();
          ctx.moveTo(mx, my);
          ctx.lineTo(x, y);
          ctx.stroke();
          ctx.restore();
        }
      });
    };

    // ── main draw loop ───────────────────────────────────────
    let raf;
    const draw = () => {
      t += 0.008;

      // Background gradient
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0,   '#0a0e1a');
      bg.addColorStop(0.5, '#0f1628');
      bg.addColorStop(1,   '#0d1535');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Ambient glow blobs
      [[0.15, 0.3], [0.85, 0.7], [0.5, 0.5]].forEach(([nx, ny], i) => {
        const r = 0.35 * Math.min(W, H);
        const g = ctx.createRadialGradient(nx * W, ny * H, 0, nx * W, ny * H, r);
        const c = ['#3730a344', '#4f46e533', '#6366f122'][i];
        g.addColorStop(0, c);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      });

      // Wave lines (like the reference image)
      drawWave(H * 0.45, H * 0.12, 0.008, 0,    0.12, '#818cf8');
      drawWave(H * 0.50, H * 0.09, 0.010, 1.0,  0.10, '#6366f1');
      drawWave(H * 0.55, H * 0.11, 0.007, 2.5,  0.09, '#a5b4fc');

      drawConnections();
      drawGlows();

      // Draw nodes
      nodes.forEach((n, i) => {
        const x = n.x * W, y = n.y * H;

        if (n.isHex) {
          hex(ctx, x, y, n.r * 1.5, n.color, n.alpha * 0.85);
          // filled hexagon centre
          ctx.save();
          ctx.globalAlpha = n.alpha * 0.5;
          ctx.fillStyle   = n.color;
          ctx.beginPath();
          for (let k = 0; k < 6; k++) {
            const angle = (Math.PI / 3) * k - Math.PI / 6;
            const px = x + (n.r * 0.7) * Math.cos(angle);
            const py = y + (n.r * 0.7) * Math.sin(angle);
            k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        } else {
          ctx.save();
          ctx.globalAlpha = n.alpha;
          ctx.fillStyle   = n.color;
          ctx.beginPath();
          ctx.arc(x, y, n.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          // Outer ring for big nodes
          if (i < 6) {
            ctx.save();
            ctx.globalAlpha = 0.3;
            ctx.strokeStyle = n.color;
            ctx.lineWidth   = 1;
            ctx.beginPath();
            ctx.arc(x, y, n.r + 5 + 3 * Math.sin(t * 2 + i), 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
        }
      });

      // Floating financial symbols
      symbols.forEach((s) => {
        ctx.save();
        ctx.globalAlpha = s.alpha + 0.08 * Math.sin(t * 1.2 + s.x * 20);
        ctx.fillStyle   = s.color;
        ctx.font        = `${s.size}px "Inter", sans-serif`;
        ctx.fillText(s.char, s.x * W, s.y * H);
        ctx.restore();
      });

      // Bar chart icons (small)
      [[0.08, 0.35], [0.62, 0.18], [0.9, 0.6]].forEach(([nx, ny]) => {
        const bx = nx * W, by = ny * H;
        const heights = [8, 14, 10, 16, 12];
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.fillStyle   = '#818cf8';
        heights.forEach((h, i) => {
          ctx.fillRect(bx + i * 5, by - h, 3.5, h);
        });
        ctx.restore();
      });

      // Dotted line trails
      [0.3, 0.7].forEach((yFrac) => {
        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.strokeStyle = '#818cf8';
        ctx.lineWidth   = 1;
        ctx.setLineDash([2, 5]);
        ctx.beginPath();
        ctx.moveTo(0, yFrac * H + 20 * Math.sin(t * 0.5));
        ctx.lineTo(W, yFrac * H - 20 * Math.sin(t * 0.5));
        ctx.stroke();
        ctx.restore();
      });

      drawMouseEffect();

      // Move particles
      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > 1) n.vx *= -1;
        if (n.y < 0 || n.y > 1) n.vy *= -1;
      });
      symbols.forEach((s) => {
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < 0 || s.x > 1) s.vx *= -1;
        if (s.y < 0 || s.y > 1) s.vy *= -1;
      });

      raf = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('mousemove', onMove);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} style={{ display: 'block', width: '100%', height: '100%' }} />;
}
