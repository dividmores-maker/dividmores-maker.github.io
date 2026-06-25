// ==========================================================
// weekly-calendar.js - التقويم الأسبوعي للمكافآت
// ==========================================================

const WEEK_KEY = 'weekly_rewards_v1';

const DAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

// جيب بيانات الأسبوع المحفوظة
function getWeekData(userId) {
  try {
    const raw = localStorage.getItem(WEEK_KEY + '_' + userId);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

// احفظ يوم معين كمحصول
function markDayClaimed(userId, dayKey) {
  const data = getWeekData(userId);
  data[dayKey] = true;
  localStorage.setItem(WEEK_KEY + '_' + userId, JSON.stringify(data));
}

// جيب مفتاح اليوم (السنة-الأسبوع-اليوم)
function getDayKey(date) {
  const d    = date || new Date();
  const year = d.getFullYear();
  const week = getWeekNumber(d);
  const day  = d.getDay();
  return `${year}_w${week}_d${day}`;
}

// حساب رقم الأسبوع
function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

// جيب أيام الأسبوع الحالي (من الأحد للسبت)
function getCurrentWeekDays() {
  const today  = new Date();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay());

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return {
      date:    d,
      dayName: DAYS_AR[i],
      dayKey:  getDayKey(d),
      isToday: d.toDateString() === today.toDateString(),
      isPast:  d < today && d.toDateString() !== today.toDateString(),
    };
  });
}

// عرض الكارت الاحتفالي
function showDayRewardCard(dayName, onClaim) {
  const old = document.getElementById('day-reward-overlay');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'day-reward-overlay';
  overlay.style.cssText = `
    position:fixed; inset:0;
    background:rgba(0,0,0,0.75);
    backdrop-filter:blur(8px);
    z-index:99999;
    display:flex; align-items:center; justify-content:center;
    animation: overlay-in 0.3s ease;
  `;

  overlay.innerHTML = `
    <div style="
      background: linear-gradient(135deg, #1A1925 0%, #201d30 100%);
      border: 2px solid rgba(253,203,110,0.6);
      border-radius: 28px;
      padding: 48px 56px;
      text-align: center;
      max-width: 400px; width: 90%;
      position: relative; overflow: hidden;
      box-shadow: 0 0 80px rgba(253,203,110,0.2), 0 30px 80px rgba(0,0,0,0.6);
      animation: card-3d-in 0.6s cubic-bezier(0.34,1.56,0.64,1);
    ">
      <!-- خلفية متوهجة -->
      <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 0%,rgba(253,203,110,0.12) 0%,transparent 65%);pointer-events:none;"></div>

      <!-- أيقونة اليوم -->
      <div style="
        font-size:80px; margin-bottom:16px;
        animation: badge-bounce 0.8s 0.2s cubic-bezier(0.34,1.56,0.64,1) both;
        filter: drop-shadow(0 0 24px rgba(253,203,110,0.7));
        position:relative; z-index:1;
      ">📅</div>

      <!-- اليوم -->
      <div style="
        font-size:13px; font-weight:800; letter-spacing:3px;
        color:#FDCB6E; margin-bottom:8px; opacity:0.85;
        position:relative; z-index:1;
        animation: fade-up 0.5s 0.25s both;
      ">مكافأة يوم ${dayName}</div>

      <!-- العنوان -->
      <div style="
        font-size:28px; font-weight:900;
        background:linear-gradient(135deg,#fff,#FDCB6E);
        -webkit-background-clip:text; -webkit-text-fill-color:transparent;
        margin-bottom:8px;
        position:relative; z-index:1;
        animation: fade-up 0.5s 0.3s both;
      ">دخلت النهارده! 🌟</div>

      <div style="
        font-size:14px; color:var(--text-secondary);
        margin-bottom:24px;
        position:relative; z-index:1;
        animation: fade-up 0.5s 0.35s both;
      ">استلم مكافأة حضورك اليومية</div>

      <!-- النقطة -->
      <div style="
        background:rgba(253,203,110,0.12);
        border:1px solid rgba(253,203,110,0.45);
        border-radius:16px; padding:18px 24px; margin-bottom:28px;
        position:relative; z-index:1;
        animation: fade-up 0.5s 0.4s both;
      ">
        <div style="font-size:13px;color:var(--text-secondary);margin-bottom:6px;">مكافأة اليوم</div>
        <div style="font-size:40px;font-weight:900;color:#FDCB6E;line-height:1;">+1 نقطة ⭐</div>
      </div>

      <!-- زرار -->
      <button id="claimDayBtn" style="
        background:linear-gradient(90deg,#FDCB6E,#f0a500);
        color:#1a1a1a; border:none; border-radius:14px;
        padding:15px 40px; font-size:17px; font-weight:900;
        cursor:pointer; font-family:inherit; width:100%;
        transition:transform 0.2s, opacity 0.2s;
        position:relative; z-index:1;
        animation: fade-up 0.5s 0.45s both;
        box-shadow: 0 4px 20px rgba(253,203,110,0.4);
      " onmouseover="this.style.transform='translateY(-2px)'"
         onmouseout="this.style.transform=''">
        استلم المكافأة 🎉
      </button>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById('claimDayBtn').onclick = async () => {
    const btn = document.getElementById('claimDayBtn');
    btn.textContent = 'جاري الاستلام...';
    btn.disabled    = true;

    await onClaim();

    // confetti
    if (typeof launchConfetti === 'function') launchConfetti(60);

    // أغلق بعد ثانية
    setTimeout(() => {
      overlay.style.animation = 'overlay-out 0.3s ease forwards';
      setTimeout(() => overlay.remove(), 280);
    }, 800);
  };

  // اضغط بره للإغلاق
  overlay.addEventListener('click', e => {
    if (e.target === overlay) {
      overlay.style.animation = 'overlay-out 0.3s ease forwards';
      setTimeout(() => overlay.remove(), 280);
    }
  });
}

// ===== رسم التقويم =====
function renderWeeklyCalendar(userId, container) {
  const days    = getCurrentWeekDays();
  const claimed = getWeekData(userId);
  const today   = getDayKey();

  let html = `
    <div class="weekly-calendar">
      <div class="calendar-header">
        <span>📅 التقويم الأسبوعي</span>
        <span style="font-size:12px;color:var(--text-secondary);">اضغط على اليوم لتاخد نقطتك</span>
      </div>
      <div class="calendar-days">
  `;

  days.forEach(day => {
    const isClaimed = !!claimed[day.dayKey];
    const isToday   = day.isToday;
    const isPast    = day.isPast;
    const isFuture  = !isToday && !isPast;

    let cardClass = 'cal-day';
    if (isClaimed)   cardClass += ' claimed';
    else if (isToday) cardClass += ' today';
    else if (isPast)  cardClass += ' past';
    else              cardClass += ' future';

    const icon = isClaimed ? '✅' : isToday ? '🎁' : isPast ? '❌' : '🔒';
    const dateStr = `${day.date.getDate()}/${day.date.getMonth() + 1}`;

    html += `
      <div class="${cardClass}" data-day-key="${day.dayKey}" data-day-name="${day.dayName}" data-clickable="${isToday && !isClaimed}">
        <div class="cal-day-icon">${icon}</div>
        <div class="cal-day-name">${day.dayName}</div>
        <div class="cal-day-date">${dateStr}</div>
        ${isClaimed ? '<div class="cal-day-pts">+1 ⭐</div>' : ''}
        ${isToday && !isClaimed ? '<div class="cal-day-pts" style="color:#FDCB6E;">اضغط!</div>' : ''}
        ${isPast && !isClaimed ? '<div class="cal-day-pts" style="color:rgba(164,161,181,0.5);">فات</div>' : ''}
      </div>`;
  });

  html += `</div></div>`;
  container.innerHTML = html;

  // أحداث الضغط
  container.querySelectorAll('.cal-day[data-clickable="true"]').forEach(el => {
    el.addEventListener('click', () => {
      const dayName = el.dataset.dayName;
      const dayKey  = el.dataset.dayKey;

      showDayRewardCard(dayName, async () => {
        // ضيف نقطة في Firestore
        try {
          const userRef = db.collection('users').doc(userId);
          await db.runTransaction(async tx => {
            const snap = await tx.get(userRef);
            if (snap.exists) tx.update(userRef, { points: (snap.data().points || 0) + 1 });
          });
        } catch (err) { console.warn('فشل إضافة النقطة:', err); }

        markDayClaimed(userId, dayKey);

        // حدّث النقاط في الـ topbar
        const ptEl = document.getElementById('userPoints');
        if (ptEl) ptEl.textContent = parseInt(ptEl.textContent || '0') + 1;

        // أعد رسم التقويم
        renderWeeklyCalendar(userId, container);
      });
    });
  });
}

// دالة confetti محلية لو مش موجودة
if (typeof launchConfetti === 'undefined') {
  window.launchConfetti = function(count = 50) {
    const colors = ['#6C5CE7','#00CEC9','#FDCB6E','#fff','#2ECC71'];
    for (let i = 0; i < count; i++) {
      const el  = document.createElement('div');
      el.className = 'confetti-piece';
      const s   = Math.random() * 8 + 5;
      const c   = colors[Math.floor(Math.random() * colors.length)];
      el.style.cssText = `left:${Math.random()*100}vw;width:${s}px;height:${s}px;background:${c};border-radius:${Math.random()>.5?'50%':'2px'};animation-duration:${Math.random()*1.5+1.2}s;animation-delay:${Math.random()*.8}s;`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3000);
    }
  };
}
