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
