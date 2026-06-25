/* ==========================================================
   Lightning Background - إضافه في أول الـ <body>:
   <canvas id="lightning-canvas"></canvas>
   <script src="lightning-bg.js"></script>
   ========================================================== */

(function () {
  const canvas = document.getElementById('lightning-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // ألوان البرق
  const COLORS = ['#00f0ff', '#b5179e', '#39ff14', '#ffffff'];

  // رسم شعبة برق واحدة بالـ recursive
  function drawBolt(x1, y1, x2, y2, depth, color, alpha) {
    if (depth === 0 || alpha < 0.02) return;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * Math.sqrt(dx*dx+dy*dy) * 0.4;
    const my = (y1 + y2) / 2 + (Math.random() - 0.5) * Math.sqrt(dx*dx+dy*dy) * 0.4;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(mx, my);
    ctx.strokeStyle = color.replace(')', `, ${alpha})`).replace('rgb', 'rgba').replace('#', 'rgba(').replace('rgba(', 'rgba(');

    // تحويل hex لـ rgba
    const r = parseInt(color.slice(1,3),16);
    const g = parseInt(color.slice(3,5),16);
    const b = parseInt(color.slice(5,7),16);
    ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.lineWidth = depth * 0.6;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.lineWidth = depth * 0.6;
    ctx.stroke();

    drawBolt(x1, y1, mx, my, depth - 1, color, alpha * 0.85);
    drawBolt(mx, my, x2, y2, depth - 1, color, alpha * 0.85);

    // فروع جانبية عشوائية
    if (Math.random() < 0.4 && depth > 1) {
      const bx = mx + (Math.random() - 0.5) * 200;
      const by = my + Math.random() * 150;
      drawBolt(mx, my, bx, by, depth - 2, color, alpha * 0.5);
    }
  }

  // حالة كل برقة
  const bolts = [];

  function spawnBolt() {
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    // نقطة البداية: من أي حافة
    const side = Math.floor(Math.random() * 3); // 0=top, 1=left, 2=right
    let x1, y1, x2, y2;

    if (side === 0) {
      x1 = Math.random() * canvas.width;
      y1 = 0;
      x2 = x1 + (Math.random() - 0.5) * 300;
      y2 = Math.random() * canvas.height * 0.7 + canvas.height * 0.1;
    } else if (side === 1) {
      x1 = 0;
      y1 = Math.random() * canvas.height;
      x2 = Math.random() * canvas.width * 0.6;
      y2 = y1 + (Math.random() - 0.5) * 300;
    } else {
      x1 = canvas.width;
      y1 = Math.random() * canvas.height;
      x2 = canvas.width - Math.random() * canvas.width * 0.6;
      y2 = y1 + (Math.random() - 0.5) * 300;
    }

    bolts.push({
      x1, y1, x2, y2,
      color,
      alpha: 0.5 + Math.random() * 0.4,
      depth: 4 + Math.floor(Math.random() * 3),
      life: 0,
      maxLife: 6 + Math.floor(Math.random() * 8), // frames تعيش فيها
      flicker: Math.random() < 0.5
    });
  }

  let frame = 0;

  function animate() {
    requestAnimationFrame(animate);
    frame++;

    // امسح الـ canvas بشفافية عشان trail خفيف
    ctx.fillStyle = 'rgba(6, 6, 16, 0.18)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // spawn برقة جديدة كل فترة عشوائية
    if (Math.random() < 0.06) spawnBolt();

    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i];
      b.life++;

      // flicker effect: بعض البرق يومض
      const visible = b.flicker ? (b.life % 2 === 0) : true;
      const fadeAlpha = b.alpha * (1 - b.life / b.maxLife);

      if (visible && fadeAlpha > 0.01) {
        drawBolt(b.x1, b.y1, b.x2, b.y2, b.depth, b.color, fadeAlpha);
      }

      if (b.life >= b.maxLife) bolts.splice(i, 1);
    }

    // وميض خلفي عشوائي (ambient glow)
    if (Math.random() < 0.03) {
      const gx = Math.random() * canvas.width;
      const gy = Math.random() * canvas.height;
      const gr = ctx.createRadialGradient(gx, gy, 0, gx, gy, 80 + Math.random() * 120);
      const c = COLORS[Math.floor(Math.random() * COLORS.length)];
      const r = parseInt(c.slice(1,3),16);
      const g2 = parseInt(c.slice(3,5),16);
      const b2 = parseInt(c.slice(5,7),16);
      gr.addColorStop(0, `rgba(${r},${g2},${b2},0.04)`);
      gr.addColorStop(1, `rgba(${r},${g2},${b2},0)`);
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  // ابدأ بـ 3 برق عشان مش تبان فاضية
  for (let i = 0; i < 3; i++) spawnBolt();
  animate();
})();
