// ==========================================================
// push-notifications.js - نظام إشعارات المتصفح
// ==========================================================

const PUSH_KEY = 'push_subscribed_v1';

// سجّل الـ Service Worker
async function registerSW() {
  if (!('serviceWorker' in navigator) || !('Notification' in window)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    return reg;
  } catch (err) {
    console.warn('SW registration failed:', err);
    return null;
  }
}

// اطلب إذن الإشعارات وفعّلها
async function requestPushPermission() {
  if (!('Notification' in window)) {
    showToast('متصفحك مش بيدعم الإشعارات', 'error');
    return false;
  }

  if (Notification.permission === 'granted') {
    showToast('الإشعارات مفعّلة بالفعل ✅');
    return true;
  }

  if (Notification.permission === 'denied') {
    showToast('الإشعارات محظورة - فعّلها من إعدادات المتصفح', 'error');
    return false;
  }

  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    localStorage.setItem(PUSH_KEY, 'true');
    showToast('تم تفعيل الإشعارات! 🔔');
    return true;
  }
  return false;
}

// إرسال إشعار محلي (بدون سيرفر)
function sendLocalNotification(title, body, url = '/dashboard.html') {
  if (Notification.permission !== 'granted') return;
  const notif = new Notification(title, {
    body,
    icon:  '/images/football.webp',
    dir:   'rtl',
    lang:  'ar',
    badge: '/images/football.webp',
  });
  notif.onclick = () => {
    window.focus();
    window.location.href = url;
    notif.close();
  };
  setTimeout(() => notif.close(), 6000);
}

// تحقق من الماتشات الجديدة كل 2 دقيقة وبعث إشعار
let lastMatchCount = null;
async function startMatchWatcher() {
  if (Notification.permission !== 'granted') return;

  async function check() {
    try {
      const snap = await db.collection('matches')
        .where('status', '==', 'open')
        .get();

      if (lastMatchCount !== null && snap.size > lastMatchCount) {
        const diff = snap.size - lastMatchCount;
        sendLocalNotification(
          'ماتش جديد! 🎮',
          `اتضاف ${diff > 1 ? diff + ' ماتشات جديدة' : 'ماتش جديد'} - راهن دلوقتي!`,
          '/dashboard.html'
        );
      }
      lastMatchCount = snap.size;
    } catch(e) {}
  }

  await check();
  setInterval(check, 2 * 60 * 1000); // كل دقيقتين
}

// زرار تفعيل الإشعارات
function renderPushButton(containerId) {
  const container = document.getElementById(containerId);
  if (!container || !('Notification' in window)) return;

  const isEnabled = Notification.permission === 'granted';
  const btn = document.createElement('button');
  btn.className = 'btn-push-notif';
  btn.innerHTML = isEnabled ? '🔔 الإشعارات مفعّلة' : '🔕 فعّل الإشعارات';
  btn.style.cssText = `
    background: ${isEnabled ? 'rgba(46,204,113,0.15)' : 'rgba(108,92,231,0.15)'};
    border: 1px solid ${isEnabled ? 'rgba(46,204,113,0.4)' : 'rgba(108,92,231,0.4)'};
    color: ${isEnabled ? 'var(--success)' : 'var(--primary)'};
    border-radius: 10px; padding: 8px 16px;
    font-size: 13px; font-weight: 700; cursor: pointer;
    font-family: inherit; transition: all 0.2s;
  `;
  btn.onclick = async () => {
    const ok = await requestPushPermission();
    if (ok) {
      btn.innerHTML = '🔔 الإشعارات مفعّلة';
      btn.style.background = 'rgba(46,204,113,0.15)';
      btn.style.borderColor = 'rgba(46,204,113,0.4)';
      btn.style.color = 'var(--success)';
      startMatchWatcher();
    }
  };
  container.appendChild(btn);
}

// شغّل كل حاجة
registerSW();
