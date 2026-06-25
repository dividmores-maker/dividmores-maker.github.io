// ==========================================================
// ad-reward.js - نظام مشاهدة الإعلان وكسب النقاط
// ==========================================================

const AD_REWARD_KEY = 'ad_reward_v1';
const AD_MAX_DAILY  = 3;
const AD_POINTS     = 2;
const AD_SMARTLINK  = 'https://www.effectivecpmnetwork.com/ftunjxpgjh?key=bb019de7cf3e40a2d2d8e0eafff2c489';
const AD_WATCH_SECS = 10;

function getAdWatchData(userId) {
  try {
    const raw = localStorage.getItem(AD_REWARD_KEY + '_' + userId);
    return raw ? JSON.parse(raw) : { date: '', count: 0 };
  } catch { return { date: '', count: 0 }; }
}

function saveAdWatchData(userId, data) {
  localStorage.setItem(AD_REWARD_KEY + '_' + userId, JSON.stringify(data));
}

function getTodayStrAd() {
  return new Date().toISOString().split('T')[0];
}

function getAdWatchesLeft(userId) {
  const data  = getAdWatchData(userId);
  const today = getTodayStrAd();
  if (data.date !== today) return AD_MAX_DAILY;
  return Math.max(0, AD_MAX_DAILY - data.count);
}

// ===== ارسم الزرار جوه النقاط =====
function renderAdRewardButton(containerId, userId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const old = document.getElementById('ad-reward-btn-wrap');
  if (old) old.remove();
  const wrap = document.createElement('div');
  wrap.id = 'ad-reward-btn-wrap';
  updateAdRewardButton(wrap, userId);
  container.appendChild(wrap);
}

function updateAdRewardButton(wrap, userId) {
  const left = getAdWatchesLeft(userId);
  const done = AD_MAX_DAILY - left;

  wrap.innerHTML = `
    <button id="adRewardBtn"
      onclick="handleWatchAd('${userId}')"
      ${left === 0 ? 'disabled' : ''}
      style="
        display:inline-flex; align-items:center; gap:6px;
        background:${left > 0
          ? 'linear-gradient(135deg,#6C5CE7,#8474f0)'
          : 'rgba(80,80,100,0.3)'};
        border:none; border-radius:20px;
        padding:6px 14px; font-size:13px; font-weight:800;
        color:${left > 0 ? 'white' : '#666'};
        cursor:${left > 0 ? 'pointer' : 'not-allowed'};
        font-family:inherit; transition:all 0.2s;
        position:relative;
      "
      ${left > 0
        ? `onmouseover="this.style.transform='scale(1.05)'"
           onmouseout="this.style.transform=''"` : ''}
    >
      🎬
      ${left > 0 ? `+${AD_POINTS}⭐` : '✅'}
      <span style="
        background:rgba(255,255,255,0.2);
        border-radius:10px; padding:1px 6px; font-size:11px;
      ">${done}/${AD_MAX_DAILY}</span>
    </button>
  `;
}

// ===== لما يدوس =====
async function handleWatchAd(userId) {
  const left = getAdWatchesLeft(userId);
  if (left === 0) return;
  showAdModal(userId);
}

// ===== مودال الإعلان =====
function showAdModal(userId) {
  const old = document.getElementById('ad-modal-overlay');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'ad-modal-overlay';
  overlay.style.cssText = `
    position:fixed; inset:0;
    background:rgba(0,0,0,0.88);
    backdrop-filter:blur(8px);
    z-index:999999;
    display:flex; align-items:center; justify-content:center;
    animation:overlay-in 0.3s ease;
    padding:16px;
  `;

  let secondsLeft = AD_WATCH_SECS;
  let adFinished  = false;
  let timerInt;

  overlay.innerHTML = `
    <div style="
      background:linear-gradient(135deg,#1A1925,#1e1c2e);
      border:1px solid rgba(108,92,231,0.5);
      border-radius:22px; padding:28px 24px;
      width:100%; max-width:420px;
      text-align:center; position:relative;
      box-shadow:0 0 60px rgba(108,92,231,0.2);
      animation:card-3d-in 0.4s cubic-bezier(0.34,1.56,0.64,1);
    ">
      <!-- عنوان -->
      <div style="font-size:15px;font-weight:900;color:white;margin-bottom:6px;">
        🎬 اتفرج واكسب <span style="color:#FDCB6E">+${AD_POINTS} نقطة</span>
      </div>
      <div style="font-size:12px;color:var(--text-secondary);margin-bottom:18px;">
        افتح الإعلان واستنى ${AD_WATCH_SECS} ثواني
      </div>

      <!-- زرار فتح الإعلان -->
      <a id="open-ad-link" href="${AD_SMARTLINK}" target="_blank"
        onclick="startAdTimer('${userId}')"
        style="
          display:inline-flex; align-items:center; gap:10px;
          background:linear-gradient(135deg,#6C5CE7,#8474f0);
          color:white; text-decoration:none;
          border-radius:14px; padding:16px 32px;
          font-size:16px; font-weight:900; font-family:inherit;
          margin-bottom:20px; transition:all 0.2s;
          box-shadow:0 8px 24px rgba(108,92,231,0.4);
        "
        onmouseover="this.style.transform='translateY(-2px)'"
        onmouseout="this.style.transform=''">
        ▶️ افتح الإعلان
      </a>

      <!-- تايمر (مخفي في البداية) -->
      <div id="ad-timer-section" style="display:none; margin-bottom:16px;">
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;">
          استنى ${AD_WATCH_SECS} ثانية...
        </div>
        <div style="
          background:rgba(255,255,255,0.06);
          border-radius:20px; height:10px; overflow:hidden; margin-bottom:10px;
        ">
          <div id="ad-prog" style="
            height:100%; width:0%;
            background:linear-gradient(90deg,#6C5CE7,#00CEC9);
            transition:width 1s linear; border-radius:20px;
          "></div>
        </div>
        <div id="ad-secs" style="font-size:28px;font-weight:900;color:#a78bfa;">
          ${AD_WATCH_SECS}
        </div>
      </div>

      <!-- زرار الاستلام (مخفي) -->
      <button id="claim-ad-btn" onclick="claimAdReward('${userId}')" style="
        display:none;
        background:linear-gradient(135deg,#2ECC71,#27ae60);
        color:white; border:none; border-radius:14px;
        padding:16px 40px; font-size:17px; font-weight:900;
        cursor:pointer; font-family:inherit; width:100%;
        margin-bottom:10px;
        animation:badge-bounce 0.6s cubic-bezier(0.34,1.56,0.64,1);
        box-shadow:0 8px 24px rgba(46,204,113,0.4);
      ">
        🎉 استلم +${AD_POINTS} نقطة!
      </button>

      <!-- إغلاق -->
      <button onclick="closeAdModal()" style="
        background:rgba(255,255,255,0.06);
        border:1px solid rgba(255,255,255,0.1);
        color:#888; border-radius:10px;
        padding:8px 20px; font-size:12px;
        cursor:pointer; font-family:inherit;
        margin-top:4px;
      ">إغلاق بدون نقاط</button>
    </div>
  `;

  document.body.appendChild(overlay);
}

// ===== ابدأ التايمر بعد ما يفتح الإعلان =====
function startAdTimer(userId) {
  const timerSection = document.getElementById('ad-timer-section');
  const openLink     = document.getElementById('open-ad-link');
  const secsEl       = document.getElementById('ad-secs');
  const progEl       = document.getElementById('ad-prog');
  const claimBtn     = document.getElementById('claim-ad-btn');

  if (!timerSection) return;

  // اخفي زرار الفتح واظهر التايمر
  if (openLink)     openLink.style.display = 'none';
  timerSection.style.display = 'block';

  let secondsLeft = AD_WATCH_SECS;

  const timerInt = setInterval(() => {
    secondsLeft--;
    if (secsEl) secsEl.textContent = secondsLeft;
    if (progEl) progEl.style.width = ((AD_WATCH_SECS - secondsLeft) / AD_WATCH_SECS * 100) + '%';

    if (secondsLeft <= 0) {
      clearInterval(timerInt);
      // اظهر زرار الاستلام
      if (secsEl)   secsEl.textContent = '✅';
      if (claimBtn) claimBtn.style.display = 'block';
      if (timerSection) {
        const label = timerSection.querySelector('div');
        if (label) label.textContent = 'يلا استلم نقاطك! 🎉';
      }
    }
  }, 1000);
}

// ===== استلام النقاط =====
async function claimAdReward(userId) {
  const claimBtn = document.getElementById('claim-ad-btn');
  if (claimBtn) { claimBtn.disabled = true; claimBtn.textContent = '⏳ جاري الإضافة...'; }

  try {
    await db.runTransaction(async (tx) => {
      const ref  = db.collection('users').doc(userId);
      const snap = await tx.get(ref);
      if (!snap.exists) return;
      tx.update(ref, { points: (snap.data().points || 0) + AD_POINTS });
    });

    // احفظ محلياً
    const today = getTodayStrAd();
    const data  = getAdWatchData(userId);
    saveAdWatchData(userId, {
      date:  today,
      count: (data.date === today ? data.count : 0) + 1,
    });

    // حدّث النقاط في الـ topbar
    const pointsEl = document.getElementById('userPoints');
    if (pointsEl) {
      pointsEl.textContent = parseInt(pointsEl.textContent || '0') + AD_POINTS;
      const badge = pointsEl.closest('.points-badge');
      if (badge) {
        badge.style.animation = 'none';
        void badge.offsetWidth;
        badge.style.animation = 'points-pop 0.45s cubic-bezier(0.34,1.56,0.64,1)';
      }
    }

    if (typeof launchConfetti === 'function') launchConfetti(60);
    showToast(`⭐ كسبت ${AD_POINTS} نقطة!`, 'success');

    if (claimBtn) {
      claimBtn.textContent = `✅ تم إضافة ${AD_POINTS} نقطة!`;
      claimBtn.style.background = 'rgba(46,204,113,0.3)';
    }

    setTimeout(() => {
      closeAdModal();
      const wrap = document.getElementById('ad-reward-btn-wrap');
      if (wrap) updateAdRewardButton(wrap, userId);
    }, 1500);

  } catch (err) {
    if (claimBtn) { claimBtn.disabled = false; claimBtn.textContent = `🎉 استلم +${AD_POINTS} نقطة!`; }
    showToast('حصل خطأ، حاول تاني', 'error');
  }
}

function closeAdModal() {
  const overlay = document.getElementById('ad-modal-overlay');
  if (!overlay) return;
  overlay.style.animation = 'overlay-out 0.3s ease forwards';
  setTimeout(() => overlay.remove(), 280);
}
