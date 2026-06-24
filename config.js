// ===================================================
// FIREBASE CONFIG
// ===================================================
const firebaseConfig = {
  apiKey: "AIzaSyB25_RcCc7wt4-cyk-N6qvm_W008JSYLDs",
  authDomain: "time-bank-9fdff.firebaseapp.com",
  databaseURL: "https://time-bank-9fdff-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "time-bank-9fdff",
  storageBucket: "time-bank-9fdff.firebasestorage.app",
  messagingSenderId: "367990163075",
  appId: "1:367990163075:web:09995abc5dcfb885223db6",
  measurementId: "G-QFGK6BS0SQ"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.database();

// ===================================================
// WORK RULES — ดึงจาก Firebase settings
// ===================================================
const DEFAULT_SETTINGS = {
  weekday_start:   "08:00",
  weekday_end:     "17:00",
  saturday_start:  "08:30",
  saturday_end:    "17:30",
  off_saturdays:   [1, 3],
  lunch_minutes:   60,
  hours_per_day:   8,
  annual_leave:    10,
  sick_leave:      30,
  personal_leave:  3
};

// ===================================================
// UTILITY FUNCTIONS
// ===================================================

function getNthSaturdayOfMonth(date) {
  const d = new Date(date);
  return Math.ceil(d.getDate() / 7);
}

async function isWorkday(date, settings = DEFAULT_SETTINGS) {
  const d = new Date(date);
  const dow = d.getDay();
  if (dow === 0) return false;
  if (dow >= 1 && dow <= 5) return true;
  const nth = getNthSaturdayOfMonth(d);
  const offSats = settings.off_saturdays || [1, 3];
  return !offSats.includes(nth);
}

function calcWorkHours(checkIn, checkOut, lunchMinutes = 60) {
  if (!checkIn || !checkOut) return 0;
  const inMs  = new Date(`1970-01-01T${checkIn}:00`).getTime();
  const outMs = new Date(`1970-01-01T${checkOut}:00`).getTime();
  if (outMs <= inMs) return 0;
  const totalMins = (outMs - inMs) / 60000;
  return Math.max(0, (totalMins - lunchMinutes) / 60);
}

function formatHours(h) {
  const hrs  = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (mins === 0) return `${hrs} ชม.`;
  return `${hrs} ชม. ${mins} นาที`;
}

function formatDateTH(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

async function getSettings() {
  try {
    const snap = await db.ref("settings").once("value");
    return snap.exists() ? { ...DEFAULT_SETTINGS, ...snap.val() } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function currentUID() {
  return auth.currentUser ? auth.currentUser.uid : null;
}
