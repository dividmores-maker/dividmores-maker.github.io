// ==========================================================
// badges.js - نظام الألقاب والباجات
// ==========================================================

const BADGES = [
  // باجات الانضمام
  {
    id: 'welcome',
    icon: '🎮',
    name: 'لاعب جديد',
    desc: 'انضممت للدوري',
    condition: (stats) => true,
    rarity: 'common'
  },
  // باجات الرهانات
  {
    id: 'first_bet',
    icon: '🎯',
    name: 'أول رهان',
    desc: 'سجّلت أول رهان',
    condition: (stats) => stats.total >= 1,
    rarity: 'common'
  },
  {
    id: 'bet5',
    icon: '🔥',
    name: 'متحمس',
    desc: 'راهنت 5 مرات',
    condition: (stats) => stats.total >= 5,
    rarity: 'common'
  },
  {
    id: 'bet10',
    icon: '💪',
    name: 'مراهن محترف',
    desc: 'راهنت 10 مرات',
    condition: (stats) => stats.total >= 10,
    rarity: 'rare'
  },
  {
    id: 'bet25',
    icon: '🚀',
    name: 'لاعب نخبة',
    desc: 'راهنت 25 مرة',
    condition: (stats) => stats.total >= 25,
    rarity: 'epic'
  },
  // باجات الكسب
  {
    id: 'first_win',
    icon: '✅',
    name: 'أول فوز',
    desc: 'كسبت أول رهان',
    condition: (stats) => stats.wins >= 1,
    rarity: 'common'
  },
  {
    id: 'win5',
    icon: '🏆',
    name: 'فائز متكرر',
    desc: 'كسبت 5 رهانات',
    condition: (stats) => stats.wins >= 5,
    rarity: 'rare'
  },
  {
    id: 'win10',
    icon: '👑',
    name: 'ملك الرهانات',
    desc: 'كسبت 10 رهانات',
    condition: (stats) => stats.wins >= 10,
    rarity: 'epic'
  },
  // باجات نسبة الكسب
  {
    id: 'winrate50',
    icon: '📊',
    name: 'محلل بارع',
    desc: 'نسبة كسبك فوق 50%',
    condition: (stats) => stats.total >= 3 && stats.winRate >= 50,
    rarity: 'rare'
  },
  {
    id: 'winrate70',
    icon: '🎓',
    name: 'عبقري الرهانات',
    desc: 'نسبة كسبك فوق 70%',
    condition: (stats) => stats.total >= 5 && stats.winRate >= 70,
    rarity: 'epic'
  },
  {
    id: 'winrate100',
    icon: '💎',
    name: 'أسطورة',
    desc: 'كسبت كل رهاناتك (3+)',
    condition: (stats) => stats.total >= 3 && stats.winRate === 100,
    rarity: 'legendary'
  },
  // باجات النقاط
  {
    id: 'points50',
    icon: '💰',
    name: 'ثري',
    desc: 'وصلت لـ 50 نقطة',
    condition: (stats) => stats.points >= 50,
    rarity: 'rare'
  },
  {
    id: 'points100',
    icon: '🤑',
    name: 'مليونير الدوري',
    desc: 'وصلت لـ 100 نقطة',
    condition: (stats) => stats.points >= 100,
    rarity: 'epic'
  },
];

const RARITY_COLORS = {
  common:    { bg: 'rgba(164,161,181,0.15)', border: 'rgba(164,161,181,0.4)', text: '#a4a1b5', label: 'عادي' },
  rare:      { bg: 'rgba(0,206,201,0.12)',   border: 'rgba(0,206,201,0.4)',   text: '#00CEC9', label: 'نادر' },
  epic:      { bg: 'rgba(108,92,231,0.15)',  border: 'rgba(108,92,231,0.5)',  text: '#a78bfa', label: 'ملحمي' },
  legendary: { bg: 'rgba(253,203,110,0.15)', border: 'rgba(253,203,110,0.5)', text: '#FDCB6E', label: 'أسطوري ✨' },
};

// احسب الباجات اللي اتفتحت للاعب
function getEarnedBadges(stats) {
  return BADGES.filter(b => b.condition(stats));
}

// ارسم باجة واحدة
function renderBadge(badge, earned = true) {
  const rarity = RARITY_COLORS[badge.rarity];
  const div = document.createElement('div');
  div.className = 'badge-item' + (earned ? ' earned' : ' locked');
  div.style.cssText = `
    background: ${earned ? rarity.bg : 'rgba(20,19,30,0.6)'};
    border: 1px solid ${earned ? rarity.border : 'rgba(60,58,80,0.5)'};
    border-radius: 14px;
    padding: 14px;
    text-align: center;
    transition: transform 0.2s, box-shadow 0.2s;
    cursor: default;
    opacity: ${earned ? '1' : '0.4'};
    filter: ${earned ? 'none' : 'grayscale(1)'};
  `;
  div.innerHTML = `
    <div style="font-size:28px; margin-bottom:6px;">${badge.icon}</div>
    <div style="font-size:13px; font-weight:800; color:${earned ? rarity.text : '#555'}; margin-bottom:4px;">${badge.name}</div>
    <div style="font-size:11px; color:var(--text-secondary);">${badge.desc}</div>
    <div style="font-size:10px; margin-top:6px; color:${rarity.text}; font-weight:700;">${rarity.label}</div>
  `;
  if (earned) {
    div.addEventListener('mouseenter', () => {
      div.style.transform = 'translateY(-3px) scale(1.04)';
      div.style.boxShadow = `0 8px 24px ${rarity.border}`;
    });
    div.addEventListener('mouseleave', () => {
      div.style.transform = '';
      div.style.boxShadow = '';
    });
  }
  return div;
}

// ارسم كل الباجات (مفتوحة + مقفولة)
function renderAllBadges(stats, container) {
  container.innerHTML = '';
  const earned = new Set(getEarnedBadges(stats).map(b => b.id));
  BADGES.forEach(badge => {
    container.appendChild(renderBadge(badge, earned.has(badge.id)));
  });
}

// ارسم الباجات المكتسبة بس (للـ topbar أو البروفايل الصغير)
function renderEarnedBadgesRow(stats, container) {
  container.innerHTML = '';
  const earned = getEarnedBadges(stats);
  if (earned.length === 0) return;
  earned.slice(0, 5).forEach(badge => {
    const rarity = RARITY_COLORS[badge.rarity];
    const span = document.createElement('span');
    span.title = badge.name + ' - ' + badge.desc;
    span.style.cssText = `
      display:inline-flex; align-items:center; justify-content:center;
      width:28px; height:28px; border-radius:50%;
      background:${rarity.bg}; border:1px solid ${rarity.border};
      font-size:14px; cursor:default;
    `;
    span.textContent = badge.icon;
    container.appendChild(span);
  });
  if (earned.length > 5) {
    const more = document.createElement('span');
    more.style.cssText = 'font-size:12px; color:var(--text-secondary); margin-right:4px;';
    more.textContent = `+${earned.length - 5}`;
    container.appendChild(more);
  }
}

// ==========================================================
// نظام كشف الباجات الجديدة وعرض الـ popup
// ==========================================================

const EARNED_BADGES_KEY = 'earned_badges_v1';

function getSavedBadges() {
  try { return new Set(JSON.parse(localStorage.getItem(EARNED_BADGES_KEY) || '[]')); }
  catch { return new Set(); }
}

function saveBadges(ids) {
  localStorage.setItem(EARNED_BADGES_KEY, JSON.stringify([...ids]));
}

// قارن الباجات القديمة بالجديدة وارجع اللي اتفتحت حديثاً
function detectNewBadges(stats) {
  const saved   = getSavedBadges();
  const current = new Set(getEarnedBadges(stats).map(b => b.id));
  const newOnes = [...current].filter(id => !saved.has(id));
  // احفظ الكل
  saveBadges(current);
  return newOnes.map(id => BADGES.find(b => b.id === id)).filter(Boolean);
}

// ===== عرض الـ popup الـ 3D =====
function showBadgePopup(badge, bonusPoints = 5) {
  // شيل أي popup قديم
  const old = document.getElementById('badge-popup-overlay');
  if (old) old.remove();

  const rarity = RARITY_COLORS[badge.rarity];

  const overlay = document.createElement('div');
  overlay.id = 'badge-popup-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.75);
    backdrop-filter: blur(6px);
    z-index: 99999;
    display: flex; align-items: center; justify-content: center;
    animation: overlay-in 0.3s ease;
  `;

  const card = document.createElement('div');
  card.style.cssText = `
    background: linear-gradient(135deg, #1A1925 0%, #1e1c2e 60%, #141320 100%);
    border: 2px solid ${rarity.border};
    border-radius: 24px;
    padding: 48px 56px;
    text-align: center;
    max-width: 420px;
    width: 90%;
    position: relative;
    overflow: hidden;
    box-shadow:
      0 0 60px ${rarity.border},
      0 30px 80px rgba(0,0,0,0.6),
      inset 0 1px 0 rgba(255,255,255,0.07);
    animation: card-3d-in 0.6s cubic-bezier(0.34,1.56,0.64,1);
    transform-style: preserve-3d;
  `;

  // خلفية متوهجة
  card.innerHTML = `
    <div style="
      position:absolute; inset:0; pointer-events:none;
      background: radial-gradient(ellipse at 50% 0%, ${rarity.bg.replace('0.15','0.25')} 0%, transparent 65%);
    "></div>

    <!-- أيقونة الباجة -->
    <div style="
      font-size: 80px;
      margin-bottom: 16px;
      display: inline-block;
      animation: badge-bounce 0.8s 0.3s cubic-bezier(0.34,1.56,0.64,1) both;
      filter: drop-shadow(0 0 20px ${rarity.border});
    ">${badge.icon}</div>

    <!-- مبروك -->
    <div style="
      font-size: 14px; font-weight: 800; letter-spacing: 3px;
      color: ${rarity.text}; margin-bottom: 8px;
      text-transform: uppercase; opacity: 0.85;
      animation: fade-up 0.5s 0.2s both;
    ">🎉 مبروك! فتحت لقب جديد</div>

    <!-- اسم الباجة -->
    <div style="
      font-size: 32px; font-weight: 900;
      background: linear-gradient(135deg, #fff, ${rarity.text});
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      margin-bottom: 8px;
      animation: fade-up 0.5s 0.3s both;
    ">${badge.name}</div>

    <!-- وصف الباجة -->
    <div style="
      font-size: 15px; color: var(--text-secondary);
      margin-bottom: 20px;
      animation: fade-up 0.5s 0.35s both;
    ">${badge.desc}</div>

    <!-- شارة الندرة -->
    <div style="
      display: inline-block;
      background: ${rarity.bg}; border: 1px solid ${rarity.border};
      color: ${rarity.text}; font-size: 12px; font-weight: 800;
      padding: 5px 14px; border-radius: 20px; margin-bottom: 24px;
      animation: fade-up 0.5s 0.4s both;
    ">${rarity.label}</div>

    <!-- مكافأة النقاط -->
    <div style="
      background: rgba(253,203,110,0.12);
      border: 1px solid rgba(253,203,110,0.4);
      border-radius: 14px; padding: 14px 20px;
      margin-bottom: 28px;
      animation: fade-up 0.5s 0.45s both;
    ">
      <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 4px;">مكافأة</div>
      <div style="font-size: 28px; font-weight: 900; color: #FDCB6E;">+${bonusPoints} نقطة ⭐</div>
    </div>

    <!-- زرار إغلاق -->
    <button onclick="closeBadgePopup()" style="
      background: linear-gradient(90deg, var(--primary), #8474f0);
      color: white; border: none; border-radius: 12px;
      padding: 14px 40px; font-size: 16px; font-weight: 800;
      cursor: pointer; font-family: inherit;
      transition: transform 0.2s, opacity 0.2s;
      animation: fade-up 0.5s 0.5s both;
      width: 100%;
    " onmouseover="this.style.transform='translateY(-2px)'"
       onmouseout="this.style.transform=''">
      رائع! 🚀
    </button>
  `;

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  // اضغط خارج الكارت للإغلاق
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeBadgePopup();
  });

  // confetti تلقائي
  if (typeof launchConfetti === 'function') {
    setTimeout(() => launchConfetti(80), 200);
  }
}

function closeBadgePopup() {
  const overlay = document.getElementById('badge-popup-overlay');
  if (!overlay) return;
  overlay.style.animation = 'overlay-out 0.3s ease forwards';
  setTimeout(() => overlay.remove(), 280);
}

// عرض الباجات الجديدة بالتسلسل (لو اتفتح أكتر من واحدة)
async function showNewBadgesSequentially(newBadges, db, userId) {
  for (let i = 0; i < newBadges.length; i++) {
    const badge = newBadges[i];

    // ضيف 5 نقاط مكافأة للاعب
    try {
      await db.runTransaction(async (tx) => {
        const ref  = db.collection('users').doc(userId);
        const snap = await tx.get(ref);
        if (snap.exists) {
          tx.update(ref, { points: (snap.data().points || 0) + 5 });
        }
      });
      // حدّث عداد النقاط في الـ topbar
      const pointsEl = document.getElementById('userPoints');
      if (pointsEl) pointsEl.textContent = parseInt(pointsEl.textContent || '0') + 5;
    } catch (err) {
      console.warn('فشل إضافة نقاط الباجة:', err);
    }

    // استنى لو في popup قبله
    if (i > 0) await new Promise(r => setTimeout(r, 500));

    showBadgePopup(badge, 5);

    // استنى لما اليوزر يضغط "رائع" قبل ما يعرض الباجة الجاية
    await new Promise(resolve => {
      const check = setInterval(() => {
        if (!document.getElementById('badge-popup-overlay')) {
          clearInterval(check);
          resolve();
        }
      }, 300);
    });
  }
}

// ===== CSS الأنيميشن =====
(function injectBadgeCSS() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes overlay-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes overlay-out {
      from { opacity: 1; }
      to   { opacity: 0; }
    }
    @keyframes card-3d-in {
      from { opacity: 0; transform: perspective(800px) rotateX(25deg) scale(0.7); }
      to   { opacity: 1; transform: perspective(800px) rotateX(0deg) scale(1); }
    }
    @keyframes badge-bounce {
      from { transform: scale(0) rotate(-20deg); opacity: 0; }
      to   { transform: scale(1) rotate(0deg);   opacity: 1; }
    }
    @keyframes fade-up {
      from { opacity: 0; transform: translateY(14px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
})();
