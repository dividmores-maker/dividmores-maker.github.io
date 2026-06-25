// ==========================================================
// matches.js - النسخة الكاملة مع كل التعديلات
// ==========================================================

let currentUser     = null;
let currentUserData = null;
let allMatches      = [];
let allUserBets     = {};
let activeGame      = null;
let unsubscribeUser = null;

const GAME_ICONS = {
  'كورة قدم':  '⚽',
  'بينج بونج': '🏓',
  'شطرنج':     '♟️',
  'بلايستيشن': '🎮',
  'دومينو':    '🎲',
};

const GAME_IMAGES = {
  'كورة قدم':  'images/football.webp',
  'بينج بونج': 'images/pingpong.jpg',
  'شطرنج':     'images/chess.jpg',
  'بلايستيشن': 'images/playstation.jpg',
  'دومينو':    'images/domino.jpg',
};

function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

async function loadUserHeader(user) {
  currentUser = user;
  let userDoc;
  try {
    userDoc = await db.collection('users').doc(user.uid).get();
  } catch (err) {
    alert('حصلت مشكلة في الاتصال: ' + err.message);
    return;
  }

  if (!userDoc.exists) {
    try {
      await db.collection('users').doc(user.uid).set({
        name: user.displayName || user.email.split('@')[0],
        email: user.email,
        points: APP_CONFIG.startingPoints,
        wins: 0, losses: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      userDoc = await db.collection('users').doc(user.uid).get();
    } catch (e) { alert('خطأ: ' + e.message); return; }
  }

  currentUserData = userDoc.data();
  document.getElementById('userName').textContent   = currentUserData.name   || '';
  // زرار الصوت
  if (typeof renderSoundButton !== 'undefined') renderSoundButton('soundBtnContainer');
  document.getElementById('userPoints').textContent = currentUserData.points ?? 0;

  if (typeof initDailyReward    !== 'undefined') initDailyReward(currentUser.uid);
  if (typeof initNotifications  !== 'undefined') initNotifications(currentUser.uid);
  if (typeof detectNewBadges    !== 'undefined') {
    const nb = detectNewBadges(buildStats(currentUserData));
    if (nb.length > 0) setTimeout(() => showNewBadgesSequentially(nb, db, currentUser.uid), 600);
  }

  // realtime نقاط فقط
  if (unsubscribeUser) unsubscribeUser();
  unsubscribeUser = db.collection('users').doc(currentUser.uid).onSnapshot(snap => {
    if (!snap.exists) return;
    const data = snap.data();
    const el   = document.getElementById('userPoints');
    if (!el) return;
    const old = parseInt(el.textContent || '0');
    const nw  = data.points || 0;
    if (old !== nw) {
      el.textContent = nw;
      const badge = el.closest('.points-badge');
      if (badge) { badge.style.animation='none'; void badge.offsetWidth; badge.style.animation='points-pop 0.45s cubic-bezier(0.34,1.56,0.64,1)'; }
      if (nw > old && old > 0) showToast('⭐ نقاطك: ' + nw, 'success');
    }
    currentUserData = { ...currentUserData, ...data };
  }, () => {});
}

window.addEventListener('beforeunload', () => { if (unsubscribeUser) unsubscribeUser(); });

async function loadMatches() {
  const container = document.getElementById('matchesContainer');
  container.innerHTML = '<div class="loading">جاري تحميل الماتشات...</div>';
  let snapshot;
  try {
    snapshot = await db.collection('matches').orderBy('createdAt', 'desc').get();
  } catch (err) {
    container.innerHTML = `<div class="empty-state">حصل خطأ: ${err.message}</div>`;
    return;
  }
  if (snapshot.empty) {
    container.innerHTML = '<div class="empty-state"><div class="icon">🎮</div><p>مفيش ماتشات دلوقتي</p></div>';
    return;
  }
  const betsSnap = await db.collection('bets').where('userId','==',currentUser.uid).get();
  allUserBets = {};
  betsSnap.forEach(doc => { allUserBets[doc.data().matchId] = doc.data(); });
  allMatches = [];
  snapshot.forEach(doc => allMatches.push({ id: doc.id, ...doc.data() }));
  renderGameCards();
}

function renderGameCards() {
  activeGame = null;
  const container = document.getElementById('matchesContainer');
  const gamesMap  = {};
  allMatches.forEach(m => {
    if (!gamesMap[m.game]) gamesMap[m.game] = { total:0 };
    gamesMap[m.game].total++;
  });
  if (!Object.keys(gamesMap).length) {
    container.innerHTML = '<div class="empty-state"><div class="icon">🎮</div><p>مفيش ماتشات دلوقتي</p></div>';
    return;
  }
  const grid = document.createElement('div');
  grid.className = 'games-grid';

  Object.keys(gamesMap).forEach(game => {
    const icon = GAME_ICONS[game]  || '🏆';
    const img  = GAME_IMAGES[game] || null;
    const card = document.createElement('div');
    card.className = 'game-card';

    if (img) {
      card.innerHTML = `
        <div class="game-card-img-wrap">
          <img class="game-card-img" src="${img}" alt="${game}">
        </div>
        <div class="game-card-overlay">
          <div class="game-card-name">${game}</div>
        </div>`;
    } else {
      card.innerHTML = `
        <div class="game-card-no-img">
          <div style="font-size:70px">${icon}</div>
          <div class="game-card-name">${game}</div>
        </div>`;
    }

    card.addEventListener('click', () => renderGameMatches(game));
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width  - 0.5) * 16;
      const y = ((e.clientY - r.top)  / r.height - 0.5) * 16;
      card.style.transform = `perspective(600px) rotateY(${x}deg) rotateX(${-y}deg) translateY(-6px) scale(1.03)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    grid.appendChild(card);
  });

  container.innerHTML = '';
  container.appendChild(grid);
}

function renderGameMatches(game) {
  activeGame = game;
  const container = document.getElementById('matchesContainer');
  const icon = GAME_ICONS[game] || '🏆';

  const back = document.createElement('div');
  back.className = 'back-to-games';
  back.innerHTML = '← رجوع للألعاب';
  back.addEventListener('click', renderGameCards);

  const title = document.createElement('div');
  title.className = 'game-section-title';
  title.innerHTML = `${icon} ${game}`;

  const grid = document.createElement('div');
  grid.className = 'matches-grid';
  allMatches.filter(m => m.game === game).forEach(m => grid.appendChild(renderMatchCard(m, allUserBets[m.id])));

  container.innerHTML = '';
  container.appendChild(back);
  container.appendChild(title);
  container.appendChild(grid);
}

function renderMatchCard(match, existingBet) {
  const card = document.createElement('div');
  card.className = 'match-card';
  const statusMap = {
    open:     { text: 'الرهان مفتوح', class: 'status-open'     },
    closed:   { text: 'الرهان مقفول', class: 'status-closed'   },
    finished: { text: 'انتهى',         class: 'status-finished' }
  };
  const si = statusMap[match.status] || statusMap.open;

  let html = `
    <span class="match-status ${si.class}">${si.text}</span>
    <span class="match-game-tag">${match.game}</span>
    <div class="match-players">
      <span>${match.player1}</span><span class="vs-text">ضد</span><span>${match.player2}</span>
    </div>
    <div class="match-meta">${match.notes || ''}</div>`;

  if (match.status === 'finished') {
    html += `<div class="match-result">🏆 الفايز: <strong>${match.winner}</strong>${match.finalScore ? '<br>📊 ' + match.finalScore : ''}</div>`;
    if (existingBet) {
      const won = existingBet.predictedWinner === match.winner;
      html += won
        ? `<div class="result-win">🏆 كسبت! <strong>+${existingBet.potentialWin} نقطة</strong> 🎉</div>`
        : `<div class="result-loss">💔 خسرت <strong>-${existingBet.points} نقطة</strong></div>`;
      if (won) {
        setTimeout(() => { if (typeof launchConfetti==='function') launchConfetti(70); }, 100);
        setTimeout(() => { if (typeof commentOnWin==='function' && isSoundEnabled()) commentOnWin(currentUserData?.name, existingBet.potentialWin); }, 500);
      } else {
        setTimeout(() => { if (typeof commentOnLoss==='function' && isSoundEnabled()) commentOnLoss(currentUserData?.name); }, 500);
      }
    }
  } else if (existingBet) {
    const betLabel = existingBet.predictedWinner === 'draw' ? '🤝 التعادل' : existingBet.predictedWinner;
    html += `<div class="match-result">✅ راهنت بـ <strong>${existingBet.points}</strong> نقطة على <strong>${betLabel}</strong></div>`;
  } else if (match.status === 'open') {
    html += renderBetForm(match);
  } else {
    html += `<div class="match-meta">الرهان مقفول</div>`;
  }

  card.innerHTML = html;
  if (match.status === 'open' && !existingBet) attachBetFormEvents(card, match);
  return card;
}

function renderBetForm(match) {
  const max = currentUserData?.points ?? 0;
  return `<div class="bet-form">
    <div class="bet-options">
      <div class="bet-option" data-player="${match.player1}">${match.player1} يكسب</div>
      <div class="bet-option" data-player="draw">🤝 تعادل</div>
      <div class="bet-option" data-player="${match.player2}">${match.player2} يكسب</div>
    </div>
    <div class="form-group"><input type="text" class="predicted-score" placeholder="توقع النتيجة (اختياري)"></div>
    <div class="bet-points-row">
      <input type="number" class="bet-points-input" placeholder="عدد النقاط" min="1" max="${max}">
      <button class="btn-primary btn-sm place-bet-btn" style="flex:0 0 auto;">راهن</button>
    </div>
    <div class="bet-potential" id="bet-potential-${match.id}" style="display:none;">
      🏆 لو كسبت هتاخد: <strong class="potential-pts">0</strong> نقطة
    </div>
  </div>`;
}

function attachBetFormEvents(card, match) {
  let selected = null;
  const potentialEl = card.querySelector('.bet-potential');
  const potentialPts = card.querySelector('.potential-pts');
  const ptsInput = card.querySelector('.bet-points-input');

  function updatePotential() {
    const pts = parseInt(ptsInput?.value || 0);
    if (selected && pts > 0) {
      const win = pts * 2;
      if (potentialEl)  potentialEl.style.display  = 'block';
      if (potentialPts) potentialPts.textContent    = win;
    } else {
      if (potentialEl) potentialEl.style.display = 'none';
    }
  }

  card.querySelectorAll('.bet-option').forEach(opt => {
    opt.addEventListener('click', () => {
      card.querySelectorAll('.bet-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      selected = opt.dataset.player;
      updatePotential();
    });
  });

  if (ptsInput) ptsInput.addEventListener('input', updatePotential);

  card.querySelector('.place-bet-btn').addEventListener('click', async () => {
    const pts = parseInt(card.querySelector('.bet-points-input').value);
    const sc  = card.querySelector('.predicted-score').value.trim();
    const btn = card.querySelector('.place-bet-btn');
    if (!selected)                               { showToast('اختار مين هيكسب', 'error'); return; }
    if (!pts || pts < 1)                         { showToast('اكتب عدد نقاط صحيح', 'error'); return; }
    if (pts > (currentUserData?.points ?? 0))    { showToast('معندكش نقاط كفاية', 'error'); return; }
    btn.disabled = true; btn.textContent = '...';
    try {
      await placeBet(match, selected, pts, sc);
      showToast('تم تسجيل رهانك! 🎯');

      // ابعت إشعار لكل اللاعبين
      try {
        const betLabel = selected === 'draw' ? '🤝 التعادل' : selected;
        await db.collection('activity').add({
          type:      'new_bet',
          userId:    currentUser.uid,
          userName:  currentUserData.name || 'لاعب',
          matchLabel: `${match.player1} ضد ${match.player2}`,
          betOn:     betLabel,
          points:    pts,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } catch(e) { console.warn('فشل إرسال الإشعار:', e); }
      setTimeout(() => { if (typeof commentOnBet==='function' && isSoundEnabled()) commentOnBet(); }, 300);
      await loadUserHeader(currentUser);
      await loadMatches();
      if (activeGame) renderGameMatches(activeGame);
    } catch (err) {
      showToast('حصل خطأ: ' + err.message, 'error');
      btn.disabled = false; btn.textContent = 'راهن';
    }
  });
}

async function placeBet(match, predictedWinner, points, predictedScore) {
  const userRef = db.collection('users').doc(currentUser.uid);
  await db.runTransaction(async tx => {
    const snap = await tx.get(userRef);
    const data = snap.data();
    if (!data || data.points < points) throw new Error('نقاط غير كافية');
    tx.update(userRef, { points: data.points - points });
    tx.set(db.collection('bets').doc(), {
      userId: currentUser.uid, userName: data.name,
      matchId: match.id, matchLabel: `${match.player1} ضد ${match.player2}`,
      predictedWinner, predictedScore: predictedScore || null,
      points, potentialWin: points * 2,
      status: 'pending',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  });
}

async function loadLeaderboard() {
  const container = document.getElementById('leaderboardContainer');
  container.innerHTML = '<div class="loading">جاري التحميل...</div>';
  try {
    const snap = await db.collection('users').orderBy('points','desc').limit(50).get();
    if (snap.empty) { container.innerHTML = '<div class="empty-state">مفيش لاعبين</div>'; return; }
    let html = '<table class="data-table"><thead><tr><th>#</th><th>الاسم</th><th>النقاط</th><th>فوز</th><th>خسارة</th></tr></thead><tbody>';
    let rank = 1;
    snap.forEach(doc => {
      const u = doc.data();
      const rc = rank <= 3 ? `rank-${rank}` : '';
      html += `<tr><td><span class="rank-badge ${rc}">${rank}</span></td><td>${u.name}${doc.id===currentUser.uid?' (انت)':''}</td><td><strong>${u.points}</strong></td><td>${u.wins||0}</td><td>${u.losses||0}</td></tr>`;
      rank++;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
  } catch (err) { container.innerHTML = `<div class="empty-state">خطأ: ${err.message}</div>`; }
}

function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
  document.getElementById(`tab-${tabName}`).classList.add('active');
  document.getElementById(`content-${tabName}`).classList.remove('hidden');
  if (tabName === 'leaderboard') loadLeaderboard();
  if (tabName === 'notifications' && typeof loadNotifications !== 'undefined') loadNotifications(currentUser.uid);
}

function buildStats(u) {
  const wins=u.wins||0, losses=u.losses||0, total=u.total||(wins+losses);
  return { points:u.points||0, wins, losses, total, winRate:total>0?Math.round((wins/total)*100):0 };
}

function launchConfetti(count=60) {
  const colors=['#6C5CE7','#00CEC9','#FDCB6E','#fff','#b4a0ff','#2ECC71'];
  for (let i=0;i<count;i++) {
    const el=document.createElement('div');
    el.className='confetti-piece';
    const s=Math.random()*8+5, c=colors[Math.floor(Math.random()*colors.length)];
    el.style.cssText=`left:${Math.random()*100}vw;width:${s}px;height:${s}px;background:${c};border-radius:${Math.random()>.5?'50%':'2px'};animation-duration:${Math.random()*1.5+1.2}s;animation-delay:${Math.random()*.8}s;`;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),3000);
  }
}

function flashLoss() {
  document.body.style.animation='loss-flash 0.6s ease';
  setTimeout(()=>{document.body.style.animation='';},700);
}

// ==========================================================
// سجل النقاط - يتفتح لما تضغط على النقاط في الـ topbar
// ==========================================================

async function showPointsHistory() {
  // شيل القديم لو موجود
  const old = document.getElementById('points-history-overlay');
  if (old) { old.remove(); return; }

  const overlay = document.createElement('div');
  overlay.id = 'points-history-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.75);
    backdrop-filter: blur(8px);
    z-index: 99990;
    display: flex; align-items: center; justify-content: center;
    animation: overlay-in 0.25s ease;
    padding: 16px;
  `;

  const modal = document.createElement('div');
  modal.style.cssText = `
    background: linear-gradient(135deg, #1A1925 0%, #1e1c2e 100%);
    border: 1px solid rgba(108,92,231,0.4);
    border-radius: 22px;
    padding: 28px 24px;
    width: 100%; max-width: 480px;
    max-height: 85vh;
    display: flex; flex-direction: column;
    box-shadow: 0 0 60px rgba(108,92,231,0.2), 0 30px 80px rgba(0,0,0,0.6);
    animation: card-3d-in 0.4s cubic-bezier(0.34,1.56,0.64,1);
    position: relative;
  `;

  modal.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; flex-shrink:0;">
      <div style="font-size:20px; font-weight:900; color:white;">⭐ سجل نقاطي</div>
      <button onclick="document.getElementById('points-history-overlay').remove()" style="
        background: rgba(255,255,255,0.08); border: none; border-radius: 50%;
        width:34px; height:34px; cursor:pointer; color:white; font-size:16px;
        display:flex; align-items:center; justify-content:center;
      ">✕</button>
    </div>

    <!-- ملخص سريع -->
    <div id="ph-summary" style="
      display:grid; grid-template-columns:1fr 1fr 1fr;
      gap:10px; margin-bottom:20px; flex-shrink:0;
    ">
      <div style="background:rgba(253,203,110,0.1); border:1px solid rgba(253,203,110,0.3); border-radius:14px; padding:12px; text-align:center;">
        <div style="font-size:20px; font-weight:900; color:#FDCB6E;" id="ph-current">...</div>
        <div style="font-size:11px; color:var(--text-secondary); margin-top:3px;">الرصيد الحالي</div>
      </div>
      <div style="background:rgba(46,204,113,0.08); border:1px solid rgba(46,204,113,0.25); border-radius:14px; padding:12px; text-align:center;">
        <div style="font-size:20px; font-weight:900; color:#2ECC71;" id="ph-earned">...</div>
        <div style="font-size:11px; color:var(--text-secondary); margin-top:3px;">مكسوب</div>
      </div>
      <div style="background:rgba(231,76,60,0.08); border:1px solid rgba(231,76,60,0.25); border-radius:14px; padding:12px; text-align:center;">
        <div style="font-size:20px; font-weight:900; color:#E74C3C;" id="ph-spent">...</div>
        <div style="font-size:11px; color:var(--text-secondary); margin-top:3px;">مصروف</div>
      </div>
    </div>

    <!-- قائمة السجل -->
    <div id="ph-list" style="overflow-y:auto; flex:1; direction:rtl;">
      <div style="text-align:center; padding:30px; color:var(--text-secondary);">⏳ جاري التحميل...</div>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  // حمّل البيانات
  await _loadPointsData();
}

async function _loadPointsData() {
  const listEl    = document.getElementById('ph-list');
  const currentEl = document.getElementById('ph-current');
  const earnedEl  = document.getElementById('ph-earned');
  const spentEl   = document.getElementById('ph-spent');

  try {
    // بيانات اليوزر
    const userDoc = await db.collection('users').doc(currentUser.uid).get();
    const userData = userDoc.data();
    const currentPts = userData.points || 0;

    // كل الرهانات
    const betsSnap = await db.collection('bets')
      .where('userId', '==', currentUser.uid)
      .get();

    const bets = betsSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));

    // احسب الأرقام
    let totalEarned = 0;
    let totalSpent  = 0;
    bets.forEach(b => {
      if (b.status === 'won')  totalEarned += (b.potentialWin || 0);
      if (b.status === 'lost') totalSpent  += (b.points || 0);
      if (b.status === 'pending') totalSpent += (b.points || 0); // محجوزة
    });

    // أضف نقاط البداية + المكافآت اليومية + الباجات (مش عندنا سجل منفصل ليها)
    // بنعرضهم من خلال الرهانات فقط

    currentEl.textContent = currentPts;
    earnedEl.textContent  = '+' + totalEarned;
    spentEl.textContent   = '-' + totalSpent;

    // ابني قائمة الأحداث
    const events = [];

    // رهانات
    bets.forEach(b => {
      const isWon     = b.status === 'won';
      const isLost    = b.status === 'lost';
      const isPending = b.status === 'pending';

      const date = b.createdAt?.toDate?.()?.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour:'2-digit', minute:'2-digit' }) || '';

      // حدث الرهان نفسه (حجز النقاط)
      events.push({
        icon:   isPending ? '⏳' : isWon ? '✅' : '❌',
        title:  `رهان على ${b.matchLabel || 'ماتش'}`,
        sub:    `راهنت على: ${b.predictedWinner === 'draw' ? '🤝 تعادل' : b.predictedWinner}`,
        pts:    isWon ? `+${b.potentialWin}` : isPending ? `-${b.points} (محجوز)` : `-${b.points}`,
        color:  isWon ? '#2ECC71' : isPending ? '#FDCB6E' : '#E74C3C',
        ts:     b.createdAt?.toMillis?.() || 0,
        date,
      });
    });

    // رتّب من الأحدث للأقدم
    events.sort((a, b) => b.ts - a.ts);

    if (events.length === 0) {
      listEl.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary);">
        <div style="font-size:40px;margin-bottom:10px;">🎮</div>
        <div>مفيش رهانات لسه</div>
        <div style="font-size:12px;margin-top:6px;">بدأت بـ ${APP_CONFIG.startingPoints} نقاط</div>
      </div>`;
      return;
    }

    let html = `
      <!-- نقاط البداية -->
      <div style="
        display:flex; align-items:center; gap:12px;
        padding:12px 14px; margin-bottom:8px;
        background:rgba(108,92,231,0.08); border:1px solid rgba(108,92,231,0.2);
        border-radius:12px;
      ">
        <div style="font-size:22px;flex-shrink:0;">🎮</div>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:700;color:white;">انضممت للدوري</div>
          <div style="font-size:11px;color:var(--text-secondary);">نقاط البداية</div>
        </div>
        <div style="font-size:14px;font-weight:900;color:#a78bfa;">+${APP_CONFIG.startingPoints}</div>
      </div>
    `;

    events.forEach(ev => {
      html += `
        <div style="
          display:flex; align-items:center; gap:12px;
          padding:12px 14px; margin-bottom:8px;
          background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07);
          border-radius:12px; transition:background 0.2s;
        " onmouseover="this.style.background='rgba(255,255,255,0.06)'"
           onmouseout="this.style.background='rgba(255,255,255,0.03)'">
          <div style="font-size:22px;flex-shrink:0;">${ev.icon}</div>
          <div style="flex:1; min-width:0;">
            <div style="font-size:13px;font-weight:700;color:white;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${ev.title}</div>
            <div style="font-size:11px;color:var(--text-secondary);">${ev.sub}</div>
            ${ev.date ? `<div style="font-size:10px;color:rgba(164,161,181,0.5);margin-top:2px;">${ev.date}</div>` : ''}
          </div>
          <div style="font-size:14px;font-weight:900;color:${ev.color};flex-shrink:0;">${ev.pts}</div>
        </div>
      `;
    });

    listEl.innerHTML = html;

  } catch (err) {
    listEl.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-secondary);">حصل خطأ: ${err.message}</div>`;
  }
}
