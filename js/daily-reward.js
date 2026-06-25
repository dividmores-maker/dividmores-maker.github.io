// ==========================================================
// daily-reward.js - نظام المكافأة اليومية (نقطة واحدة كل يوم)
// ==========================================================

const DAILY_KEY = 'daily_reward_v1';

function getTodayStr() {
  return new Date().toISOString().split('T')[0]; // "2026-06-22"
}

async function claimDailyReward(userId) {
  const today    = getTodayStr();
  const lastClaim = localStorage.getItem(DAILY_KEY + '_' + userId);

  if (lastClaim === today) return null; // خلص النهارده

  try {
    // ضيف نقطة واحدة
    const userRef = db.collection('users').doc(userId);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists) return;
      tx.update(userRef, { points: (snap.data().points || 0) + 1 });
    });

    localStorage.setItem(DAILY_KEY + '_' + userId, today);
    return true;
  } catch (err) {
    console.warn('فشل المكافأة اليومية:', err);
    return false;
  }
}

// عرض popup المكافأة اليومية
function showDailyRewardPopup(onClaim) {
  const old = document.getElementById('daily-reward-overlay');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'daily-reward-overlay';
  overlay.style.cssText = `
    position:fixed; inset:0;
    background:rgba(0,0,0,0.7);
    backdrop-filter:blur(6px);
    z-index:99998;
    display:flex; align-items:center; justify-content:center;
    animation: overlay-in 0.3s ease;
  `;

  overlay.innerHTML = `
    <div style="
      background: linear-gradient(135deg, #1A1925, #1e1c2e);
      border: 2px solid rgba(253,203,110,0.5);
      border-radius: 24px;
      padding: 44px 52px;
      text-align: center;
      max-width: 380px; width: 90%;
      box-shadow: 0 0 60px rgba(253,203,110,0.2), 0 30px 80px rgba(0,0,0,0.6);
      animation: card-3d-in 0.6s cubic-bezier(0.34,1.56,0.64,1);
      position: relative; overflow: hidden;
    ">
      <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 0%, rgba(253,203,110,0.1) 0%, transparent 65%);pointer-events:none;"></div>

      <div style="font-size:72px; margin-bottom:16px; animation: badge-bounce 0.8s 0.2s cubic-bezier(0.34,1.56,0.64,1) both;
        filter: drop-shadow(0 0 20px rgba(253,203,110,0.6));">🎁</div>

      <div style="font-size:13px; font-weight:800; letter-spacing:3px; color:#FDCB6E; margin-bottom:8px; opacity:0.85;">
        مكافأة يومية
      </div>

      <div style="font-size:28px; font-weight:900; background:linear-gradient(135deg,#fff,#FDCB6E);
        -webkit-background-clip:text; -webkit-text-fill-color:transparent; margin-bottom:8px;">
        دخلت النهارده! 🌟
      </div>

      <div style="font-size:15px; color:var(--text-secondary); margin-bottom:24px;">
        جمعت مكافأتك اليومية
      </div>

      <div style="background:rgba(253,203,110,0.12); border:1px solid rgba(253,203,110,0.4);
        border-radius:14px; padding:16px 20px; margin-bottom:28px;">
        <div style="font-size:13px; color:var(--text-secondary); margin-bottom:4px;">مكافأة اليوم</div>
        <div style="font-size:36px; font-weight:900; color:#FDCB6E;">+1 نقطة ⭐</div>
      </div>

      <button id="dailyClaimBtn" style="
        background:linear-gradient(90deg,#FDCB6E,#f0a500);
        color:#1a1a1a; border:none; border-radius:12px;
        padding:14px 40px; font-size:16px; font-weight:900;
        cursor:pointer; font-family:inherit; width:100%;
        transition:transform 0.2s, opacity 0.2s;
      " onmouseover="this.style.transform='translateY(-2px)'"
         onmouseout="this.style.transform=''">
        استلم المكافأة 🎉
      </button>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById('dailyClaimBtn').onclick = async () => {
    const btn = document.getElementById('dailyClaimBtn');
    btn.textContent = 'جاري الاستلام...';
    btn.disabled = true;

    const ok = await onClaim();

    if (ok) {
      // confetti
      if (typeof launchConfetti === 'function') launchConfetti(50);

      // حدّث النقاط في الـ topbar
      const pointsEl = document.getElementById('userPoints');
      if (pointsEl) {
        const current = parseInt(pointsEl.textContent || '0');
        pointsEl.textContent = current + 1;
        const badge = pointsEl.closest('.points-badge');
        if (badge) {
          badge.style.animation = 'none';
          void badge.offsetWidth;
          badge.style.animation = 'points-pop 0.45s cubic-bezier(0.34,1.56,0.64,1)';
        }
      }
    }

    overlay.style.animation = 'overlay-out 0.3s ease forwards';
    setTimeout(() => overlay.remove(), 280);
  };
}

// الدالة الرئيسية - بتتشغل بعد login
async function initDailyReward(userId) {
  const today    = getTodayStr();
  const lastClaim = localStorage.getItem(DAILY_KEY + '_' + userId);

  if (lastClaim === today) return; // خلص النهارده

  // استنى ثانية عشان الصفحة تتحمل
  setTimeout(() => {
    showDailyRewardPopup(() => claimDailyReward(userId));
  }, 1500);
}
