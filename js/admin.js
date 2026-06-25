// ==========================================================
// admin.js - منطق لوحة تحكم الأدمن
// ==========================================================

function showToastAdmin(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ----- تعبئة قائمة الألعاب -----
function populateGamesSelect() {
  const select = document.getElementById('matchGame');
  select.innerHTML = APP_CONFIG.games.map(g => `<option value="${g}">${g}</option>`).join('');
}

// ----- إضافة ماتش جديد -----
async function handleAddMatch(e) {
  e.preventDefault();

  const game = document.getElementById('matchGame').value;
  const player1 = document.getElementById('matchPlayer1').value.trim();
  const player2 = document.getElementById('matchPlayer2').value.trim();
  const notes = document.getElementById('matchNotes').value.trim();
  const btn = document.getElementById('addMatchBtn');

  if (!player1 || !player2) {
    showToastAdmin('اكتب اسم اللاعبين الاتنين', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'جاري الإضافة...';

  try {
    await db.collection('matches').add({
      game: game,
      player1: player1,
      player2: player2,
      notes: notes,
      status: 'open', // open | closed | finished
      winner: null,
      finalScore: null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    document.getElementById('addMatchForm').reset();
    showToastAdmin('تم إضافة الماتش بنجاح!');
    await loadAdminMatches();
  } catch (err) {
    console.error(err);
    showToastAdmin('حصل خطأ: ' + err.message, 'error');
  }

  btn.disabled = false;
  btn.textContent = 'إضافة الماتش';
}

// ----- تحميل كل الماتشات للأدمن -----
async function loadAdminMatches() {
  const container = document.getElementById('adminMatchesContainer');
  container.innerHTML = '<div class="loading">جاري التحميل...</div>';

  let snapshot;
  try {
    snapshot = await db.collection('matches').orderBy('createdAt', 'desc').get();
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="empty-state">حصل خطأ في تحميل الماتشات: ${err.message}</div>`;
    return;
  }

  if (snapshot.empty) {
    container.innerHTML = '<div class="empty-state">مفيش ماتشات لسه</div>';
    return;
  }

  container.innerHTML = '';
  snapshot.forEach(doc => {
    const match = { id: doc.id, ...doc.data() };
    container.appendChild(renderAdminMatchCard(match));
  });
}

// ----- رسم كارت الماتش في لوحة الأدمن -----
function renderAdminMatchCard(match) {
  const card = document.createElement('div');
  card.className = 'match-card';

  const statusMap = {
    open: { text: 'الرهان مفتوح', class: 'status-open' },
    closed: { text: 'الرهان مقفول', class: 'status-closed' },
    finished: { text: 'انتهى', class: 'status-finished' }
  };
  const statusInfo = statusMap[match.status] || statusMap.open;

  let actionsHtml = '';

  if (match.status === 'open') {
    actionsHtml = `
      <button class="btn-secondary btn-sm close-bet-btn">قفل الرهان</button>
      <button class="btn-danger btn-sm delete-match-btn">حذف</button>
    `;
  } else if (match.status === 'closed') {
    actionsHtml = `
      <div class="form-group" style="margin-top:12px;">
        <select class="winner-select">
          <option value="">اختار الفايز</option>
          <option value="${match.player1}">${match.player1}</option>
          <option value="draw">🤝 تعادل</option>
          <option value="${match.player2}">${match.player2}</option>
        </select>
      </div>
      <div class="form-group">
        <input type="text" class="final-score-input" placeholder="النتيجة بالظبط (اختياري)">
      </div>
      <button class="btn-success btn-sm submit-result-btn">تسجيل النتيجة وتوزيع النقاط</button>
    `;
  } else if (match.status === 'finished') {
    actionsHtml = `
      <div class="match-result">
        🏆 الفايز: <strong>${match.winner}</strong>
        ${match.finalScore ? `<br>📊 ${match.finalScore}` : ''}
      </div>
      <button class="btn-danger btn-sm delete-match-btn" style="margin-top:10px;">حذف</button>
    `;
  }

  card.innerHTML = `
    <span class="match-status ${statusInfo.class}">${statusInfo.text}</span>
    <span class="match-game-tag">${match.game}</span>
    <div class="match-players">
      <span>${match.player1}</span>
      <span class="vs-text">ضد</span>
      <span>${match.player2}</span>
    </div>
    <div class="match-meta">${match.notes || ''}</div>
    <div class="bet-form">${actionsHtml}</div>
  `;

  attachAdminMatchEvents(card, match);
  return card;
}

// ----- ربط أحداث الأدمن على كل كارت -----
function attachAdminMatchEvents(card, match) {
  const closeBtn = card.querySelector('.close-bet-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', async () => {
      if (!confirm('متأكد عايز تقفل الرهان على الماتش ده؟')) return;
      try {
        await db.collection('matches').doc(match.id).update({ status: 'closed' });
        showToastAdmin('تم قفل الرهان');
        await loadAdminMatches();
      } catch (err) {
        showToastAdmin('حصل خطأ: ' + err.message, 'error');
      }
    });
  }

  const deleteBtn = card.querySelector('.delete-match-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!confirm('متأكد عايز تحذف الماتش ده؟ هيتحذف كل الرهانات المرتبطة بيه')) return;
      try {
        await deleteMatchWithBets(match.id);
        showToastAdmin('تم حذف الماتش');
        await loadAdminMatches();
      } catch (err) {
        showToastAdmin('حصل خطأ: ' + err.message, 'error');
      }
    });
  }

  const submitBtn = card.querySelector('.submit-result-btn');
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const winnerSelect = card.querySelector('.winner-select');
      const scoreInput = card.querySelector('.final-score-input');
      const winner = winnerSelect.value;

      if (!winner) {
        showToastAdmin('اختار الفايز الأول', 'error');
        return;
      }

      if (!confirm(`متأكد إن ${winner} هو الفايز؟ النقاط هتتوزع تلقائيًا وميتعملش تراجع`)) return;

      submitBtn.disabled = true;
      submitBtn.textContent = 'جاري التوزيع...';

      try {
        await finalizeMatch(match.id, winner, scoreInput.value.trim());
        showToastAdmin('تم تسجيل النتيجة وتوزيع النقاط!');
        await loadAdminMatches();
      } catch (err) {
        console.error(err);
        showToastAdmin('حصل خطأ أثناء التوزيع: ' + err.message, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'تسجيل النتيجة وتوزيع النقاط';
      }
    });
  }
}

// ----- إنهاء الماتش وتوزيع النقاط على الفائزين -----
async function finalizeMatch(matchId, winner, finalScore) {
  const matchRef = db.collection('matches').doc(matchId);

  // هات كل الرهانات بتاعة الماتش ده
  const betsSnapshot = await db.collection('bets').where('matchId', '==', matchId).get();

  // حدّث حالة الماتش
  await matchRef.update({
    status: 'finished',
    winner: winner,
    finalScore: finalScore || null,
    finishedAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  // وزّع النقاط - كل رهان لوحده في transaction منفصلة عشان نتجنب تعارض على نفس اليوزر
  for (const betDoc of betsSnapshot.docs) {
    const bet = betDoc.data();
    const won = bet.predictedWinner === winner;

    await db.runTransaction(async (transaction) => {
      const userRef = db.collection('users').doc(bet.userId);
      const userDoc = await transaction.get(userRef);
      const userData = userDoc.data();
      if (!userData) return;

      if (won) {
        transaction.update(userRef, {
          points: userData.points + bet.potentialWin,
          wins: (userData.wins || 0) + 1
        });
      } else {
        transaction.update(userRef, {
          losses: (userData.losses || 0) + 1
        });
      }

      transaction.update(betDoc.ref, {
        status: won ? 'won' : 'lost'
      });
    });
  }
}

// ----- حذف ماتش وكل الرهانات المرتبطة بيه (مع رد النقاط لو لسه مفتوح) -----
async function deleteMatchWithBets(matchId) {
  const matchDoc = await db.collection('matches').doc(matchId).get();
  const match = matchDoc.data();

  const betsSnapshot = await db.collection('bets').where('matchId', '==', matchId).get();

  // لو الماتش لسه مش متخلص، رجّع النقاط لليوزرز اللي راهنوا
  if (match.status !== 'finished') {
    for (const betDoc of betsSnapshot.docs) {
      const bet = betDoc.data();
      await db.runTransaction(async (transaction) => {
        const userRef = db.collection('users').doc(bet.userId);
        const userDoc = await transaction.get(userRef);
        const userData = userDoc.data();
        if (!userData) return;
        transaction.update(userRef, { points: userData.points + bet.points });
      });
    }
  }

  // احذف كل الرهانات
  const batch = db.batch();
  betsSnapshot.forEach(doc => batch.delete(doc.ref));
  batch.delete(db.collection('matches').doc(matchId));
  await batch.commit();
}
