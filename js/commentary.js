// ==========================================================
// commentary.js - تعليق صوتي بصوت شوبير
// ==========================================================

const SOUND_KEY = 'commentary_enabled_v1';

function isSoundEnabled() {
  return localStorage.getItem(SOUND_KEY) !== 'false';
}

// ===== تشغيل صوت =====
let currentAudio = null;

function playSound(src) {
  if (!isSoundEnabled()) return;
  try {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
    currentAudio = new Audio(src);
    currentAudio.volume = 1;
    currentAudio.play().catch(err => console.warn('تعذر تشغيل الصوت:', err));
  } catch (err) {
    console.warn('خطأ في تشغيل الصوت:', err);
  }
}

// ===== التعليق على الكسب =====
function commentOnWin(playerName, points) {
  playSound('sounds/win.mp3');
  showCommentaryToast('🎙️ تعليق شوبير على كسبك! 🏆', 'win');
}

// ===== التعليق على الخسارة =====
function commentOnLoss(playerName) {
  playSound('sounds/loss.mp3');
  showCommentaryToast('🎙️ تعليق شوبير على الماتش 😔', 'loss');
}

// ===== التعليق على الرهان =====
function commentOnBet() {
  // مش محتاج صوت هنا
}

// ===== Toast التعليق =====
function showCommentaryToast(text, type = 'win') {
  const old = document.getElementById('commentary-toast');
  if (old) old.remove();

  const toast = document.createElement('div');
  toast.id = 'commentary-toast';
  toast.style.cssText = `
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    background: ${type === 'win'
      ? 'linear-gradient(135deg, rgba(46,204,113,0.95), rgba(39,174,96,0.95))'
      : 'linear-gradient(135deg, rgba(231,76,60,0.95), rgba(192,57,43,0.95))'};
    color: white;
    padding: 14px 28px;
    border-radius: 50px;
    font-size: 15px;
    font-weight: 700;
    font-family: Tajawal, sans-serif;
    direction: rtl;
    z-index: 99999;
    box-shadow: 0 8px 30px rgba(0,0,0,0.4);
    max-width: 90vw;
    text-align: center;
    opacity: 0;
    transition: all 0.4s cubic-bezier(0.34,1.56,0.64,1);
    display: flex;
    align-items: center;
    gap: 10px;
  `;

  const mic = document.createElement('span');
  mic.style.cssText = `font-size:20px; animation: mic-pulse 0.5s ease-in-out infinite alternate;`;
  mic.textContent = '🎙️';

  const msg = document.createElement('span');
  msg.textContent = text.replace('🎙️ ', '');

  const stopBtn = document.createElement('button');
  stopBtn.style.cssText = `
    background: rgba(255,255,255,0.25); border: none; border-radius: 50%;
    width: 28px; height: 28px; cursor: pointer; color: white;
    font-size: 14px; display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  `;
  stopBtn.textContent = '✕';
  stopBtn.onclick = () => {
    if (currentAudio) { currentAudio.pause(); currentAudio.currentTime = 0; }
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  };

  toast.appendChild(mic);
  toast.appendChild(msg);
  toast.appendChild(stopBtn);
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity   = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });

  setTimeout(() => {
    if (!document.getElementById('commentary-toast')) return;
    toast.style.opacity   = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
    setTimeout(() => toast.remove(), 400);
  }, 6000);
}

// ===== زرار تفعيل/إيقاف الصوت =====
function toggleSound() {
  const enabled = !isSoundEnabled();
  localStorage.setItem(SOUND_KEY, enabled ? 'true' : 'false');
  updateSoundBtn();
  if (!enabled && currentAudio) { currentAudio.pause(); currentAudio.currentTime = 0; }
  showCommentaryToast(enabled ? '🔊 صوت شوبير شغال!' : '🔇 الصوت متوقف', enabled ? 'win' : 'loss');
}

function updateSoundBtn() {
  const btn = document.getElementById('soundToggleBtn');
  if (!btn) return;
  const enabled = isSoundEnabled();
  btn.innerHTML     = enabled ? '🔊' : '🔇';
  btn.title         = enabled ? 'أوقف الصوت' : 'فعّل صوت شوبير';
  btn.style.background  = enabled ? 'rgba(46,204,113,0.15)' : 'rgba(164,161,181,0.15)';
  btn.style.borderColor = enabled ? 'rgba(46,204,113,0.4)'  : 'rgba(164,161,181,0.3)';
}

function renderSoundButton(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  // شيل القديم
  const old = document.getElementById('soundToggleBtn');
  if (old) old.remove();

  const btn = document.createElement('button');
  btn.id = 'soundToggleBtn';
  btn.style.cssText = `
    background: rgba(46,204,113,0.15);
    border: 1px solid rgba(46,204,113,0.4);
    color: var(--success);
    border-radius: 10px; padding: 8px 12px;
    font-size: 16px; cursor: pointer;
    font-family: inherit; transition: all 0.2s;
  `;
  btn.onclick = toggleSound;
  container.appendChild(btn);
  updateSoundBtn();
}

// CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes mic-pulse {
    from { transform: scale(1);    filter: brightness(1);   }
    to   { transform: scale(1.2);  filter: brightness(1.4); }
  }
`;
document.head.appendChild(style);
