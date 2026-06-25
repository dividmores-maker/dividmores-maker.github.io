// ==========================================================
// إعدادات Firebase - حط بياناتك هنا
// ==========================================================
// هتلاقي البيانات دي في: Firebase Console > Project Settings > General > Your apps > SDK setup and configuration

const firebaseConfig = {
  apiKey: "AIzaSyBvnRi54dRrfV3FW5HFrKXI1RDobSVCq1g",
  authDomain: "xbat-dabcd.firebaseapp.com",
  projectId: "xbat-dabcd",
  storageBucket: "xbat-dabcd.firebasestorage.app",
  messagingSenderId: "108773532038",
  appId: "1:108773532038:web:d9a5c115bb246a1d6c0c07"
};

// ==========================================================
// بيانات دخول الأدمن (ثابتة - منفصلة تمامًا عن نظام Firebase Auth)
// ==========================================================
// غيّرهم لأي قيم تانية لو عايز، بس سيبهم زي ما هما لو مش لاقي داعي
const ADMIN_CREDENTIALS = {
  username: "admin",
  password: "mar2026"
};

// ==========================================================
// إعدادات عامة للمنصة
// ==========================================================
const APP_CONFIG = {
  startingPoints: 10,           // عدد النقاط اللي كل يوزر يبدأ بيها
  appName: "دوري التسلية",
  games: ["كورة قدم", "بينج بونج", "شطرنج", "بلايستيشن", "دومينو"]
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);
const auth = (typeof firebase.auth === 'function') ? firebase.auth() : null;
const db = firebase.firestore();
