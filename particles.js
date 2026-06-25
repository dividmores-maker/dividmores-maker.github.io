// ==========================================================
// particles.js - تأثيرات نجوم وجسيمات 3D متحركة في الخلفية
// ==========================================================

(function () {
  const canvas = document.createElement('canvas');
  canvas.id = 'bg-canvas';
  canvas.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    z-index: 0;
    pointer-events: none;
    opacity: 0.85;
  `;
  document.body.insertBefore(canvas, document.body.firstChild);

  // اخلي كل محتوى الصفحة فوق الكانفاس
  [...document.body.children].forEach(el => {
    if (el !== canvas) {
      el.style.position = el.style.position || 'relative';
      el.style.zIndex = el.style.zIndex || '1';
    }
  });

  const ctx = canvas.getContext('2d');
  let W, H, mouse = { x: -9999, y: -9999 };
  let animId;

  // ===== إعدادات الجسيمات =====
  const STAR_COUNT   = 160;  // نجوم صغيرة ثابتة نسبياً
  const PARTICLE_COUNT = 55; // جسيمات طائرة كبيرة
  const ORBS_COUNT   = 6;    // كرات ضوئية كبيرة في الخلفية

  let stars = [], particles = [], orbs = [];

  // ===== ألوان المشروع =====
  const COLORS = [
    '108, 92, 231',   // بنفسجي primary
    '0, 206, 201',    // سيان secondary
    '253, 203, 110',  // ذهبي
    '255, 255, 255',  // أبيض
    '180, 160, 255',  // بنفسجي فاتح
  ];

  function rand(min, max) { return Math.random() * (max - min) + min; }
  function randInt(min, max) { return Math.floor(rand(min, max)); }
  function randColor() { return COLORS[randInt(0, COLORS.length)]; }

  // ===== resize =====
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  // ===== إنشاء النجوم (نقاط صغيرة بتتلمع) =====
  function createStar() {
    return {
      x: rand(0, W),
      y: rand(0, H),
      z: rand(0.1, 1),        // عمق وهمي للـ 3D
      r: rand(0.4, 1.6),
      color: randColor(),
      twinkleSpeed: rand(0.005, 0.02),
      twinkleOffset: rand(0, Math.PI * 2),
      alpha: rand(0.4, 1),
    };
  }

  // ===== إنشاء جسيم طائر =====
  function createParticle() {
    const color = randColor();
    const size  = rand(1.5, 4.5);
    return {
      x: rand(0, W),
      y: rand(0, H),
      z: rand(0.2, 1),
      vx: rand(-0.4, 0.4),
      vy: rand(-0.6, -0.1),   // بيطير لفوق
      r: size,
      color,
      alpha: rand(0.5, 0.95),
      life: 1,
      decay: rand(0.0008, 0.003),
      // شكل: دايرة أو نجمة أو ماسة
      shape: ['circle', 'star', 'diamond'][randInt(0, 3)],
      rotation: rand(0, Math.PI * 2),
      rotSpeed: rand(-0.02, 0.02),
      pulse: rand(0, Math.PI * 2),
      pulseSpeed: rand(0.02, 0.06),
    };
  }

  // ===== إنشاء كرة ضوئية كبيرة =====
  function createOrb() {
    return {
      x: rand(0, W),
      y: rand(0, H),
      r: rand(80, 220),
      color: randColor(),
      alpha: rand(0.02, 0.07),
      vx: rand(-0.15, 0.15),
      vy: rand(-0.12, 0.12),
    };
  }

  // ===== رسم نجمة (شكل ✦) =====
  function drawStar5(ctx, cx, cy, r, points = 5) {
    const step = Math.PI / points;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const angle = i * step - Math.PI / 2;
      const dist  = i % 2 === 0 ? r : r * 0.42;
      if (i === 0) ctx.moveTo(cx + dist * Math.cos(angle), cy + dist * Math.sin(angle));
      else ctx.lineTo(cx + dist * Math.cos(angle), cy + dist * Math.sin(angle));
    }
    ctx.closePath();
  }

  // ===== رسم ماسة =====
  function drawDiamond(ctx, cx, cy, r) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r * 0.6, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r * 0.6, cy);
    ctx.closePath();
  }

  // ===== إعداد أولي =====
  function init() {
    resize();
    stars     = Array.from({ length: STAR_COUNT },    createStar);
    particles = Array.from({ length: PARTICLE_COUNT }, createParticle);
    orbs      = Array.from({ length: ORBS_COUNT },    createOrb);
  }

  // ===== حلقة الرسم =====
  function draw(t) {
    ctx.clearRect(0, 0, W, H);

    // --- الكرات الضوئية في الخلف ---
    orbs.forEach(o => {
      const grd = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
      grd.addColorStop(0,   `rgba(${o.color}, ${o.alpha})`);
      grd.addColorStop(0.5, `rgba(${o.color}, ${o.alpha * 0.4})`);
      grd.addColorStop(1,   `rgba(${o.color}, 0)`);
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
      ctx.fill();

      o.x += o.vx; o.y += o.vy;
      if (o.x < -o.r) o.x = W + o.r;
      if (o.x > W + o.r) o.x = -o.r;
      if (o.y < -o.r) o.y = H + o.r;
      if (o.y > H + o.r) o.y = -o.r;
    });

    // --- النجوم ---
    stars.forEach(s => {
      const twinkle = 0.5 + 0.5 * Math.sin(t * s.twinkleSpeed * 60 + s.twinkleOffset);
      const alpha   = s.alpha * twinkle;
      const scale   = s.z * (1 + twinkle * 0.3);

      ctx.save();
      ctx.globalAlpha = alpha;

      // توهج حول النجمة
      const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4 * scale);
      glow.addColorStop(0,   `rgba(${s.color}, 0.6)`);
      glow.addColorStop(1,   `rgba(${s.color}, 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 4 * scale, 0, Math.PI * 2);
      ctx.fill();

      // النجمة نفسها
      ctx.fillStyle = `rgba(${s.color}, 1)`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });

    // --- الجسيمات الطائرة ---
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= p.decay;

      if (p.life <= 0) {
        // أعد توليد الجسيم من الأسفل
        particles[i] = Object.assign(createParticle(), { x: rand(0, W), y: H + 10, life: 1 });
        continue;
      }

      p.x += p.vx + Math.sin(t * 0.001 + i) * 0.2;
      p.y += p.vy;
      p.rotation += p.rotSpeed;
      p.pulse += p.pulseSpeed;

      // تأثير الماوس: الجسيمات بتنجذب للماوس بخفة
      const dx = mouse.x - p.x, dy = mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 180) {
        p.x += dx * 0.003;
        p.y += dy * 0.003;
      }

      const alpha = p.alpha * p.life * (0.8 + 0.2 * Math.sin(p.pulse));
      const scale = p.z * (1 + 0.15 * Math.sin(p.pulse));
      const r     = p.r * scale;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      // توهج الجسيم
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 3.5);
      glow.addColorStop(0,   `rgba(${p.color}, 0.5)`);
      glow.addColorStop(1,   `rgba(${p.color}, 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, r * 3.5, 0, Math.PI * 2);
      ctx.fill();

      // شكل الجسيم
      ctx.fillStyle = `rgba(${p.color}, 1)`;
      ctx.shadowColor = `rgba(${p.color}, 0.8)`;
      ctx.shadowBlur  = 8;

      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'star') {
        drawStar5(ctx, 0, 0, r * 1.4);
        ctx.fill();
      } else {
        drawDiamond(ctx, 0, 0, r * 1.4);
        ctx.fill();
      }

      ctx.restore();
    }

    // --- خطوط الربط بين الجسيمات القريبة ---
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < 120) {
          ctx.save();
          ctx.globalAlpha = (1 - d / 120) * 0.12 * particles[i].life * particles[j].life;
          ctx.strokeStyle = `rgba(${particles[i].color}, 1)`;
          ctx.lineWidth   = 0.6;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    animId = requestAnimationFrame(draw);
  }

  // ===== تتبع الماوس =====
  window.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  window.addEventListener('mouseleave', () => {
    mouse.x = -9999; mouse.y = -9999;
  });

  // ===== تجاهل الحركة لو المستخدم فضّلها مخفضة =====
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReduced) {
    window.addEventListener('resize', () => { resize(); init(); });
    init();
    requestAnimationFrame(draw);
  }
})();
