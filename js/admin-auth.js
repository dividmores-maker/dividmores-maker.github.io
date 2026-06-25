// ==========================================================
// admin-auth.js - نظام دخول الأدمن المنفصل
// مش بيستخدم Firebase Authentication خالص، بيستخدم sessionStorage
// بعد التحقق من الـ username/password الثابتين في firebase-config.js
// ==========================================================

const ADMIN_SESSION_KEY = 'admin_logged_in';

// ----- معالجة فورم دخول الأدمن -----
function handleAdminLogin(e) {
  e.preventDefault();

  const username = document.getElementById('adminUsername').value.trim();
  const password = document.getElementById('adminPassword').value;
  const errorEl = document.getElementById('adminErrorMsg');

  errorEl.style.display = 'none';

  if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
    sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
    window.location.href = 'admin.html';
  } else {
    errorEl.textContent = 'اليوزرنيم أو الباسورد غلط';
    errorEl.style.display = 'block';
  }
}

// ----- حماية صفحة الأدمن (بدون Firebase Auth) -----
function requireAdminSession() {
  const isLoggedIn = sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';
  if (!isLoggedIn) {
    window.location.href = 'admin-login.html';
    return false;
  }
  return true;
}

// ----- تسجيل خروج الأدمن -----
function handleAdminLogout() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  window.location.href = 'admin-login.html';
}
