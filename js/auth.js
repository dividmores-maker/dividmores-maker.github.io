// ==========================================================
// auth.js - تسجيل الدخول / إنشاء حساب (لليوزرز العاديين فقط)
// الأدمن له نظام دخول منفصل تمامًا في admin-login.html / admin-auth.js
// ==========================================================

function showError(elementId, message) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.style.display = 'block';
}

function hideError(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.style.display = 'none';
}

function translateError(code) {
  const map = {
    'auth/email-already-in-use': 'الإيميل ده مستخدم بالفعل، جرب تسجل دخول بدل ما تعمل حساب جديد',
    'auth/invalid-email': 'صيغة الإيميل غلط',
    'auth/weak-password': 'كلمة السر لازم تكون 6 حروف على الأقل',
    'auth/user-not-found': 'مفيش حساب بالإيميل ده',
    'auth/wrong-password': 'كلمة السر غلط',
    'auth/invalid-credential': 'بيانات الدخول غلط',
    'auth/too-many-requests': 'محاولات كتير غلط، حاول تاني بعد شوية',
    'auth/network-request-failed': 'مشكلة في الاتصال بالإنترنت، حاول تاني',
    'auth/configuration-not-found': 'إعدادات تسجيل الدخول بالإيميل مش مفعّلة في Firebase (Authentication > Sign-in method > Email/Password)'
  };
  return map[code] || ('حصل خطأ غير متوقع: ' + code);
}

// ----- إنشاء حساب جديد -----
async function handleSignup(e) {
  e.preventDefault();
  hideError('errorMsgSignup');

  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const btn = document.getElementById('signupBtn');

  if (!name || !email || !password) {
    showError('errorMsgSignup', 'من فضلك املا كل الخانات');
    return;
  }

  if (password.length < 6) {
    showError('errorMsgSignup', 'كلمة السر لازم تكون 6 حروف على الأقل');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'جاري إنشاء الحساب...';

  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    const uid = cred.user.uid;

    // إنشاء بروفايل اليوزر في Firestore برصيد البداية
    try {
      await db.collection('users').doc(uid).set({
        name: name,
        email: email,
        points: APP_CONFIG.startingPoints,
        wins: 0,
        losses: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (firestoreErr) {
      // حتى لو فشل Firestore، كمّل للداشبورد - matches.js هيعمل الـ document تلقائياً
      console.warn('فشل حفظ بيانات اليوزر في Firestore، هيتعمل تلقائياً في الداشبورد:', firestoreErr.message);
    }

    window.location.href = 'dashboard.html';
  } catch (err) {
    console.error('فشل إنشاء الحساب:', err);
    showError('errorMsgSignup', translateError(err.code));
    btn.disabled = false;
    btn.textContent = 'إنشاء حساب';
  }
}

// ----- تسجيل الدخول -----
async function handleLogin(e) {
  e.preventDefault();
  hideError('errorMsg');

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const btn = document.getElementById('loginBtn');

  if (!email || !password) {
    showError('errorMsg', 'من فضلك املا كل الخانات');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'جاري تسجيل الدخول...';

  try {
    await auth.signInWithEmailAndPassword(email, password);
    window.location.href = 'dashboard.html';
  } catch (err) {
    console.error('فشل تسجيل الدخول:', err);
    showError('errorMsg', translateError(err.code));
    btn.disabled = false;
    btn.textContent = 'دخول';
  }
}

// ----- تسجيل خروج (لليوزرز العاديين) -----
async function handleLogout() {
  await auth.signOut();
  window.location.href = 'index.html';
}

// ----- حماية الصفحات: لازم يكون مسجل دخول -----
function requireAuth(callback) {
  auth.onAuthStateChanged(user => {
    if (!user) {
      window.location.href = 'index.html';
    } else {
      callback(user);
    }
  });
}
