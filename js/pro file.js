// ==========================================================
// profile.js - منطق صفحة الملف الشخصي
// ==========================================================

async function loadProfile(user) {
  try {
    // جيب بيانات اليوزر
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (!userDoc.exists) {
      window.location.href = 'index.html';
      return;
    }
    const userData = userDoc.data();

    // جيب رهاناته - بدون orderBy عشان مش محتاج index
    let bets = [];
    try {
      const betsSnap = await db.collection('bets')
        .where('userId', '==', user.uid)
        .get();
      bets = betsSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          // رتّب محلياً من الأحدث للأقدم
          const ta = a.createdAt ? a.createdAt.toMillis() : 0;
          const tb = b.createdAt ? b.createdAt.toMillis() : 0;
          return tb - ta;
        });
    } catch (betsErr) {
      console.warn('فشل تحميل الرهانات:', betsErr);
    }

    // احسب الإحصائيات
    const wins    = bets.filter(b => b.status === 'won').length;
    const losses  = bets.filter(b => b.status === 'lost').length;
    const total   = bets.length;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    const totalWon  = bets.filter(b => b.status === 'won').reduce((s, b) => s + (b.potentialWin || 0), 0);
    const totalLost = bets.filter(b => b.status === 'lost').reduce((s, b) => s + (b.points || 0), 0);
    const profit    = totalWon - totalLost;

    const stats = {
      points: userData.points || 0,
      wins, losses, total, winRate, profit,
    };

    // جيب ترتيبه في الدوري
    const allUsersSnap = await db.collection('users').orderBy('points', 'desc').get();
    let rank = 1;
    allUsersSnap.forEach(doc => {
      if (doc.id === user.uid) return;
      if ((doc.data().points || 0) > (userData.points || 0)) rank++;
    });
    const totalPlayers = allUsersSnap.size;

    // ===== ارسم البيانات =====
    const name = userData.name || 'لاعب';
    document.getElementById('profileAvatar').textContent = name.charAt(0).toUpperCase();
    document.getElementById('profileName').textContent   = name;
    document.getElementById('profileEmail').textContent  = userData.email || '';
    document.getElementById('userPoints').textContent    = userData.points || 0;

    // تاريخ الانضمام
    if (userData.createdAt) {
      const date      = userData.createdAt.toDate();
      const formatted = date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
      document.getElementById('profileSince').textContent = 'انضممت في ' + formatted;
    }

    // الترتيب مع ميداليات أول 5
    const rankEl  = document.getElementById('profileRank');
    const medals  = { 1: '🥇', 2: '🥈', 3: '🥉', 4: '🏅', 5: '🏅' };
    const medal   = medals[rank] || '';
    rankEl.textContent = (medal ? medal + ' ' : '') + '#' + rank;
    document.querySelector('.rank-label').textContent = `من ${totalPlayers} لاعب`;

    // الإحصائيات
    document.getElementById('statPoints').textContent   = stats.points;
    document.getElementById('statWins').textContent     = stats.wins;
    document.getElementById('statLosses').textContent   = stats.losses;
    document.getElementById('statWinRate').textContent  = stats.winRate + '%';
    document.getElementById('statTotal').textContent    = stats.total;
    document.getElementById('statProfit').textContent   = (profit >= 0 ? '+' : '') + profit;
    document.getElementById('statProfit').style.color   = profit >= 0 ? 'var(--success)' : 'var(--danger)';

    // شريط نسبة الكسب
    document.getElementById('barWins').textContent   = wins;
    document.getElementById('barLosses').textContent = losses;
    setTimeout(() => {
      document.getElementById('winBarFill').style.width = winRate + '%';
    }, 300);

    // الباجات
    renderEarnedBadgesRow(stats, document.getElementById('profileBadges'));
    renderAllBadges(stats, document.getElementById('allBadgesContainer'));

    // الرسوم البيانية
    renderCharts(stats, bets);

    // سجل الرهانات
    renderBetsHistory(bets);

    // افحص الباجات الجديدة وأضف 5 نقاط لكل باجة جديدة
    await checkBadgesOnProfile(stats, user);

    // ضيف زرار المشاركة
    addShareButton(user.uid);

  } catch (err) {
    console.error('خطأ في تحميل البروفايل:', err);
    alert('حصل خطأ في تحميل البروفايل: ' + err.message);
  }
}

// ===== سجل الرهانات =====
function renderBetsHistory(bets) {
  const container = document.getElementById('betsHistoryContainer');

  if (bets.length === 0) {
    container.innerHTML = '<div class="empty-state">مفيش رهانات لسه 🎮</div>';
    return;
  }

  const statusMap = {
    won:     { icon: '✅', text: 'كسبت',  color: 'var(--success)' },
    lost:    { icon: '❌', text: 'خسرت',  color: 'var(--danger)'  },
    pending: { icon: '⏳', text: 'منتظر', color: 'var(--gold)'    },
  };

  let html = '<div class="bets-history-list">';

  bets.forEach(bet => {
    const s = statusMap[bet.status] || statusMap.pending;
    const profitText = bet.status === 'won'
      ? `+${bet.potentialWin} نقطة`
      : bet.status === 'lost'
        ? `-${bet.points} نقطة`
        : `${bet.points} في الانتظار`;
    const profitColor = bet.status === 'won'
      ? 'var(--success)'
      : bet.status === 'lost'
        ? 'var(--danger)'
        : 'var(--gold)';

    const date = bet.createdAt
      ? bet.createdAt.toDate().toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })
      : '';

    html += `
      <div class="bet-history-row">
        <div class="bet-history-status" style="color:${s.color}">${s.icon} ${s.text}</div>
        <div class="bet-history-match">${bet.matchLabel || '-'}</div>
        <div class="bet-history-pick">راهنت على: <strong>${bet.predictedWinner}</strong></div>
        <div class="bet-history-profit" style="color:${profitColor}">${profitText}</div>
        <div class="bet-history-date">${date}</div>
      </div>`;
  });

  html += '</div>';
  container.innerHTML = html;
}

// ===== افحص الباجات الجديدة لما تفتح البروفايل =====
async function checkBadgesOnProfile(stats, user) {
  if (typeof detectNewBadges === 'undefined') return;
  const newBadges = detectNewBadges(stats);
  if (newBadges.length > 0) {
    setTimeout(() => showNewBadgesSequentially(newBadges, db, user.uid), 800);
  }
}

// ===== مشاركة البروفايل =====
function addShareButton(userId) {
  const container = document.querySelector('.profile-hero .profile-info');
  if (!container) return;

  const shareUrl = `${window.location.origin}${window.location.pathname.replace('profile.html','player.html')}?uid=${userId}`;

  const btn = document.createElement('button');
  btn.style.cssText = `
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(0,206,201,0.12); border: 1px solid rgba(0,206,201,0.35);
    color: var(--secondary); border-radius: 10px;
    padding: 8px 16px; font-size: 13px; font-weight: 700;
    cursor: pointer; font-family: inherit; margin-top: 10px;
    transition: all 0.2s;
  `;
  btn.innerHTML = '🔗 شارك بروفايلك';
  btn.onclick = () => {
    if (navigator.share) {
      navigator.share({ title: 'بروفايلي في دوري التسلية 🏆', url: shareUrl });
    } else {
      navigator.clipboard.writeText(shareUrl).then(() => {
        btn.innerHTML = '✅ تم نسخ الرابط!';
        setTimeout(() => btn.innerHTML = '🔗 شارك بروفايلك', 2000);
      });
    }
  };
  container.appendChild(btn);
}

// ==========================================================
// الرسوم البيانية في البروفايل
// ==========================================================
function renderCharts(stats, bets) {
  const section = document.getElementById('chartsSection');
  if (!section) return;

  // 1. دونات شارت - كسب vs خسارة
  const total = stats.wins + stats.losses;
  const winPct  = total > 0 ? Math.round((stats.wins / total) * 100) : 0;
  const lossPct = 100 - winPct;

  // حساب stroke-dasharray للدونات
  const r = 54, circ = 2 * Math.PI * r;
  const winDash  = (winPct  / 100) * circ;
  const lossDash = (lossPct / 100) * circ;

  // 2. بار شارت - آخر 5 رهانات
  const last5 = bets.slice(0, 5);
  const barColors = { won: '#2ECC71', lost: '#E74C3C', pending: '#FDCB6E' };
  const maxPts = Math.max(...last5.map(b => b.points || 1), 1);

  section.innerHTML = `
    <div class="charts-section">

      <!-- دونات شارت -->
      <div class="chart-card">
        <div class="chart-title">📊 نسبة الكسب والخسارة</div>
        ${total === 0 ? '<div style="text-align:center;color:var(--text-secondary);padding:20px;">مفيش رهانات لسه</div>' : `
        <div class="donut-wrap">
          <svg class="donut-svg" width="130" height="130" viewBox="0 0 130 130">
            <!-- خلفية -->
            <circle cx="65" cy="65" r="${r}" fill="none"
              stroke="rgba(255,255,255,0.06)" stroke-width="14"/>
            <!-- خسارة -->
            <circle cx="65" cy="65" r="${r}" fill="none"
              stroke="#E74C3C" stroke-width="14"
              stroke-dasharray="${circ}" stroke-dashoffset="0"
              stroke-linecap="round"
              transform="rotate(-90 65 65)"/>
            <!-- كسب -->
            <circle cx="65" cy="65" r="${r}" fill="none"
              stroke="#2ECC71" stroke-width="14"
              stroke-dasharray="${winDash} ${circ - winDash}"
              stroke-dashoffset="0"
              stroke-linecap="round"
              transform="rotate(-90 65 65)"
              style="transition: stroke-dasharray 1s ease;"/>
            <!-- النص في النص -->
            <text x="65" y="60" text-anchor="middle"
              fill="white" font-size="20" font-weight="900"
              font-family="Tajawal,sans-serif">${winPct}%</text>
            <text x="65" y="78" text-anchor="middle"
              fill="#a4a1b5" font-size="10"
              font-family="Tajawal,sans-serif">نسبة الكسب</text>
          </svg>
          <div class="donut-legend">
            <div class="donut-legend-item">
              <div class="donut-dot" style="background:#2ECC71"></div>
              <span style="color:#2ECC71; font-weight:700;">كسب ${stats.wins}</span>
            </div>
            <div class="donut-legend-item">
              <div class="donut-dot" style="background:#E74C3C"></div>
              <span style="color:#E74C3C; font-weight:700;">خسارة ${stats.losses}</span>
            </div>
            <div class="donut-legend-item">
              <div class="donut-dot" style="background:#FDCB6E"></div>
              <span style="color:#FDCB6E; font-weight:700;">منتظر ${bets.filter(b=>b.status==='pending').length}</span>
            </div>
          </div>
        </div>`}
      </div>

      <!-- بار شارت آخر 5 رهانات -->
      <div class="chart-card">
        <div class="chart-title">🎯 آخر ${last5.length} رهانات</div>
        ${last5.length === 0
          ? '<div style="text-align:center;color:var(--text-secondary);padding:20px;">مفيش رهانات لسه</div>'
          : `<div class="bar-chart">
            ${last5.map((b, i) => {
              const pct = Math.round(((b.points||0) / maxPts) * 100);
              const color = barColors[b.status] || barColors.pending;
              const icon  = b.status === 'won' ? '✅' : b.status === 'lost' ? '❌' : '⏳';
              const label = (b.predictedWinner || '').substring(0, 8);
              return `<div class="bar-row">
                <div class="bar-label">${icon} ${label}</div>
                <div class="bar-track">
                  <div class="bar-fill" style="width:0%; background:${color};"
                    data-width="${pct}%"></div>
                </div>
                <div class="bar-val">${b.points}</div>
              </div>`;
            }).join('')}
          </div>`
        }
      </div>

    </div>
  `;

  // أنيميت الـ bars بعد ثانية
  setTimeout(() => {
    section.querySelectorAll('.bar-fill').forEach(el => {
      el.style.width = el.dataset.width;
    });
  }, 300);
}
