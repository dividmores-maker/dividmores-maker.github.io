# دوري التسلية 🏆 — النسخة الثانية (v2)

## إيه اللي اتغيّر عن النسخة الأولى؟

- **الأدمن بقى ليه نظام دخول منفصل تمامًا** عن نظام اليوزرز:
  - يوزرنيم: `admin`
  - باسورد: `mar2026`
  - (تقدر تغيّرهم من `js/firebase-config.js` في أول الملف، الجزء اللي اسمه `ADMIN_CREDENTIALS`)
  - الأدمن بيدخل من صفحة منفصلة `admin-login.html`، **مش** عن طريق عمل حساب بإيميل
- معالجة أخطاء أوضح في كل حتة، فلو حصلت مشكلة هتشوف رسالة توضح السبب بدل ما الصفحة تتقطع بصمت
- إصلاح مشكلة الـ `undefined` اللي كانت بتظهر لو بيانات اليوزر مش موجودة في قاعدة البيانات

---

## الخطوة 1: تأكد إن Firestore Database معمولة

1. روح [console.firebase.google.com](https://console.firebase.google.com) → مشروعك
2. **Build → Firestore Database** → لو لسه مفيش، دوس **Create database** → اختار **Production mode**

## الخطوة 2: فعّل Email/Password في Authentication (لليوزرز بس)

**Build → Authentication → Get Started → Email/Password → Enable**

> ملحوظة: الأدمن **مش محتاج** الخطوة دي، لأنه بيدخل بنظام منفصل تمامًا. الخطوة دي لليوزرز العاديين بس.

## الخطوة 3: حط قواعد الأمان (Firestore Rules)

1. **Firestore Database → Rules**
2. امسح القديم، الصق محتوى `firestore.rules` اللي جوه المشروع
3. دوس **Publish**

⚠️ **اقرأ التنويه في أول ملف `firestore.rules`** — فيه شرح للـ trade-off الأمني بسبب إن الأدمن مش بيستخدم Firebase Auth.

## الخطوة 4: بيانات Firebase Config

`js/firebase-config.js` فيها بياناتك بالفعل (apiKey, projectId، إلخ). لو محتاج تغيّرها أو تستخدمها في مشروع تاني، عدّل الجزء العلوي بس.

## الخطوة 5: غيّر بيانات دخول الأدمن (اختياري)

في `js/firebase-config.js`:
```js
const ADMIN_CREDENTIALS = {
  username: "admin",
  password: "mar2026"
};
```

---

## هيكل المشروع

```
sports-betting-league-v2/
├── index.html            ← تسجيل دخول/حساب اليوزرز العاديين
├── admin-login.html       ← دخول الأدمن (يوزرنيم/باسورد منفصل)
├── dashboard.html          ← الصفحة الرئيسية لليوزر
├── admin.html               ← لوحة تحكم الأدمن
├── firestore.rules            ← قواعد أمان قاعدة البيانات
├── css/
│   └── style.css
└── js/
    ├── firebase-config.js       ← بياناتك + بيانات الأدمن
    ├── auth.js                   ← تسجيل دخول/حساب اليوزرز
    ├── admin-auth.js               ← دخول/خروج الأدمن (sessionStorage)
    ├── matches.js                   ← منطق الماتشات والرهان لليوزر
    └── admin.js                      ← منطق لوحة الأدمن
```

---

## إزاي تدخل كأدمن؟

1. روح `admin-login.html` (فيه لينك ليها تحت في صفحة `index.html`)
2. يوزرنيم: `admin` / باسورد: `mar2026`
3. هتدخل `admin.html` مباشرة

## ملاحظة أمان مهمة ⚠️

بما إن الأدمن بيدخل بيوزرنيم/باسورد ثابتين **مكتوبين في كود الموقع نفسه**، أي حد يفتح أدوات المطور (View Source أو F12) يقدر يشوف الباسورد. ده مقبول لمشروع بسيط بين مجموعة أصحاب موثوقين، لكن متستخدمش الباسورد ده في حاجة حساسة تانية.

---

## تشخيص الأخطاء

لو حصلت أي مشكلة:
1. افتح **F12 → Console** وشوف لو فيه رسالة حمرا
2. لو رسالة `Missing or insufficient permissions` → الـ Firestore Rules مش متنشورة صح
3. لو رسالة عن بيانات اليوزر مش موجودة → جرب تعمل حساب جديد بإيميل مختلف
4. تأكد إنك بتفتح الموقع من رابط `https://` (GitHub Pages مثلاً) مش من `file:///` على جهازك مباشرة
