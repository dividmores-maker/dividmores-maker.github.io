// ==========================================================
// notifications.js - نظام الإشعارات الكامل
// ==========================================================

const NOTIF_STORAGE_KEY = 'seen_notifications_v1';
let unsubscribeActivity = null;

function getSeenIds() {
  try { return new Set(JSON.parse(localStorage.getItem(NOTIF_STORAGE_KEY) || '[]')); }
  catch { return new Set(); }
}

function markSeen(ids) {
  const seen = getSeenIds();
  ids.forEach(id => seen.add(id));
  localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify([...seen]));
}

// ===== Realtime listener على النشاط =====
function startActivityListener(userId) {
  if (unsubscribeActivity) unsubscribeActivity();

  // استمع لآخر 20 نشاط
  unsubscribeActivity = db.collection('activity')
    .limit(20)
    .onSnapshot(snap => {
      if (snap.empty) return;

      const seen = getSeenIds();
      let newCount = 0;

      snap.forEach(doc => {
        const data = doc.data();
        // مش إشعاراتي أنا
        if (data.userId === userId) return;
        if (!seen.has(doc.id)) newCount++;
      });

      // حدّث عداد الإشعارات
      updateNotifBadge(newCount);
    }, err => console.warn('Activity listener error:', err));
}

function updateNotifBadge(count) {
  const badge = document.getElementById('notifBadge');
  if (!badge) return;
  badge.innerHTML = count > 0
    ? `<span class="notif-count-badge">${count > 99 ? '99+' : count}</span>`
    : '';
}

// ===== تحميل الإشعارات في التاب =====
async function loadNotifications(userId) {
  const container = document.getElementById('notificationsContainer');
  if (!container) return;
  container.innerHTML = '<div class="loading">جاري التحميل...</div>';

  const seen = getSeenIds();
  const allNotifs = [];

  try {
    // 1. نشاط الرهانات من اللاعبين التانيين
    const actSnap = await db.collection('activity')
      .limit(30)
      .get();

    actSnap.forEach(doc => {
      const data = doc.data();
      const isMe = data.userId === userId;
      allNotifs.push({
        id:    doc.id,
        type:  'bet_activity',
        icon:  isMe ? '✅' : '🎯',
        title: isMe
          ? `راهنت على ${data.matchLabel}`
          : `${data.userName} راهن على ${data.matchLabel}`,
        body:  `${isMe ? 'رهنت' : 'راهن'} بـ ${data.points} نقطة على ${data.betOn}`,
        time:  data.createdAt,
        isNew: !seen.has(doc.id),
      });
    });

    // 2. نتايج الرهانات الخاصة بيك
    const betsSnap = await db.collection('bets')
      .where('userId', '==', userId)
      .get();

    const betsByMatch = {};
    betsSnap.forEach(doc => { betsByMatch[doc.data().matchId] = { id: doc.id, ...doc.data() }; });

    if (Object.keys(betsByMatch).length > 0) {
      const matchIds = Object.keys(betsByMatch).slice(0, 10);
      const matchSnap = await db.collection('matches')
        .where(firebase.firestore.FieldPath.documentId(), 'in', matchIds)
        .get();

      matchSnap.forEach(doc => {
        const match = { id: doc.id, ...doc.data() };
        const bet   = betsByMatch[match.id];
        if (match.status !== 'finished' || !bet) return;

        const won     = bet.predictedWinner === match.winner;
        const notifId = `result_${match.id}_${userId}`;
        allNotifs.push({
          id:    notifId,
          type:  won ? 'win' : 'loss',
          icon:  won ? '🏆' : '💔',
          title: won ? `كسبت! +${bet.potentialWin} نقطة` : `خسرت -${bet.points} نقطة`,
          body:  `${match.player1} ضد ${match.player2} - الفايز: ${match.winner === 'draw' ? '🤝 تعادل' : match.winner}`,
          time:  match.finishedAt,
          isNew: !seen.has(notifId),
        });
      });
    }

    // 3. ماتشات جديدة
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const newMatchSnap = await db.collection('matches')
      .where('status', '==', 'open')
      .limit(5)
      .get();

    newMatchSnap.forEach(doc => {
      const match = { id: doc.id, ...doc.data() };
      if (!match.createdAt) return;
      if (match.createdAt.toDate() < yesterday) return;
      if (betsByMatch[match.id]) return;
      const notifId = `new_match_${match.id}`;
      allNotifs.push({
        id:    notifId,
        type:  'new_match',
        icon:  '🎮',
        title: 'ماتش جديد!',
        body:  `${match.player1} ضد ${match.player2} - ${match.game}`,
        time:  match.createdAt,
        isNew: !seen.has(notifId),
      });
    });

  } catch (err) {
    console.error('خطأ في الإشعارات:', err);
  }

  // رتّب: الجديد أول
  allNotifs.sort((a, b) => {
    if (a.isNew && !b.isNew) return -1;
    if (!a.isNew && b.isNew)  return 1;
    const ta = a.time?.toMillis?.() || 0;
    const tb = b.time?.toMillis?.() || 0;
    return tb - ta;
  });

  if (allNotifs.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="icon">🔔</div><p>مفيش إشعارات دلوقتي</p></div>`;
    return;
  }

  const colors = {
    win:          { bg: 'rgba(46,204,113,0.08)',  border: 'rgba(46,204,113,0.3)',  title: 'var(--success)' },
    loss:         { bg: 'rgba(231,76,60,0.08)',   border: 'rgba(231,76,60,0.3)',   title: 'var(--danger)'  },
    bet_activity: { bg: 'rgba(108,92,231,0.08)',  border: 'rgba(108,92,231,0.3)',  title: '#a78bfa'        },
    new_match:    { bg: 'rgba(0,206,201,0.08)',   border: 'rgba(0,206,201,0.3)',   title: 'var(--secondary)'},
  };

  let html = '<div style="display:flex;flex-direction:column;gap:10px;padding:4px 0;">';

  allNotifs.forEach(n => {
    const c = colors[n.type] || colors.new_match;
    const timeStr = n.time?.toDate
      ? n.time.toDate().toLocaleString('ar-EG', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })
      : '';

    html += `
      <div style="
        background:${c.bg}; border:1px solid ${c.border};
        border-radius:14px; padding:16px 20px;
        display:flex; align-items:flex-start; gap:14px;
        opacity:${n.isNew ? '1' : '0.6'};
        transition: opacity 0.2s;
      ">
        <div style="font-size:26px;flex-shrink:0;">${n.icon}</div>
        <div style="flex:1;">
          <div style="font-size:14px;font-weight:800;color:${c.title};margin-bottom:4px;">
            ${n.isNew ? '<span class="notification-dot"></span>' : ''}${n.title}
          </div>
          <div style="font-size:12px;color:var(--text-secondary);">${n.body}</div>
          ${timeStr ? `<div style="font-size:11px;color:rgba(164,161,181,0.5);margin-top:4px;">${timeStr}</div>` : ''}
        </div>
      </div>`;
  });

  html += '</div>';
  container.innerHTML = html;

  // اعمل كلهم مشوفين
  markSeen(allNotifs.map(n => n.id));
  setTimeout(() => updateNotifBadge(0), 300);
}

function initNotifications(userId) {
  startActivityListener(userId);

  // حمّل عدد الجديد في الخلفية
  getSeenIds(); // preload
  db.collection('activity')
    .limit(20)
    .get()
    .then(snap => {
      const seen = getSeenIds();
      let count  = 0;
      snap.forEach(doc => {
        if (doc.data().userId !== userId && !seen.has(doc.id)) count++;
      });
      updateNotifBadge(count);
    }).catch(() => {});
}
