// ===================================================
// AUTH.JS — Login / Logout / Session Guard
// ===================================================

/** Guard: redirect ไป login.html ถ้ายังไม่ได้ login */
function requireAuth(callback) {
  auth.onAuthStateChanged(user => {
    if (!user) {
      window.location.href = "login.html";
    } else {
      if (callback) callback(user);
    }
  });
}

/** Guard: ถ้า login แล้วให้ redirect ออกจาก login page */
function redirectIfLoggedIn() {
  auth.onAuthStateChanged(user => {
    if (user) window.location.href = "dashboard.html";
  });
}

/** Login ด้วย Email + Password */
async function login(email, password) {
  const cred = await auth.signInWithEmailAndPassword(email, password);
  return cred.user;
}

/** Logout */
async function logout() {
  await auth.signOut();
  window.location.href = "login.html";
}

/** ดึงข้อมูล profile ของ user จาก Firebase */
async function getUserProfile(uid) {
  const snap = await db.ref(`users/${uid}`).once("value");
  return snap.val();
}

/** อัปเดต profile */
async function updateUserProfile(uid, data) {
  await db.ref(`users/${uid}`).update(data);
}
