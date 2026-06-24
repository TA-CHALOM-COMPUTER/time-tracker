# ⏱ Time Tracker — Firebase + GitHub Pages

ระบบบันทึกเวลาและการลา สำหรับ Frontend บน **GitHub Pages** + Database บน **Firebase Realtime Database**

---

## 📁 โครงสร้างโปรเจกต์

```
time-tracker/
├── index.html          → redirect ไป login
├── login.html          → หน้าเข้าสู่ระบบ
├── dashboard.html      → ภาพรวม
├── attendance.html     → บันทึกเวลาเข้า-ออก
├── leave.html          → บันทึกการลา
├── timebank.html       → ชั่วโมงชดเชยสะสม
├── reports.html        → รายงานรายเดือน
├── settings.html       → ตั้งค่าระบบ
├── firebase-rules.json → Security Rules สำหรับ Firebase
├── assets/
│   ├── css/style.css
│   └── js/
│       ├── config.js     → Firebase config + utility functions
│       ├── auth.js       → login/logout/session
│       ├── dashboard.js
│       ├── attendance.js
│       ├── leave.js
│       ├── timebank.js
│       ├── settings.js
│       └── report.js
└── components/
    └── sidebar.html
```

---

## 🚀 วิธีติดตั้ง

### Step 1 — สร้าง Firebase Project

1. ไปที่ [console.firebase.google.com](https://console.firebase.google.com)
2. กด **"Add project"** → ตั้งชื่อ → Create
3. ไปที่ **Authentication** → Sign-in method → เปิด **Email/Password**
4. ไปที่ **Realtime Database** → Create database → เลือก **Asia (asia-southeast1)**
5. ไปที่ **Project Settings** → เลื่อนลงหา **"Your apps"** → กด `</>` (Web)
6. ลงทะเบียน app → คัดลอก `firebaseConfig`

### Step 2 — ใส่ Firebase Config

แก้ไขไฟล์ `assets/js/config.js` บรรทัดแรก:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123...:web:abc..."
};
```

### Step 3 — ตั้ง Firebase Security Rules

1. ไปที่ **Realtime Database** → **Rules**
2. Copy เนื้อหาจาก `firebase-rules.json` แล้ว Paste → **Publish**

### Step 4 — สร้าง User แรก

1. ไปที่ **Authentication** → **Users** → **Add user**
2. ใส่ Email + Password

### Step 5 — Push ขึ้น GitHub Pages

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<username>/time-tracker.git
git push -u origin main
```

จากนั้น:
- ไปที่ repo → **Settings** → **Pages**
- Branch: `main` → `/root` → **Save**
- รอ 1-2 นาที → เข้าที่ `https://<username>.github.io/time-tracker/`

---

## ✅ ฟีเจอร์ระบบ

| Module | รายละเอียด |
|--------|-----------|
| **Login** | Email + Password ผ่าน Firebase Auth |
| **Dashboard** | สรุปเวลาวันนี้, โควต้าลาคงเหลือ, Time Bank |
| **Attendance** | Check-In/Out, คำนวณชั่วโมง, เสาร์หยุดได้ชดเชยอัตโนมัติ |
| **Leave** | ลาพักร้อน/ป่วย/กิจ/ใช้ชดเชย, หักโควต้าอัตโนมัติ |
| **Time Bank** | แสดงชั่วโมงสะสม, ใช้ชั่วโมงได้ |
| **Reports** | รายงานรายเดือน (เวลา + การลา) |
| **Settings** | ตั้งเวลางาน, เสาร์หยุด 1/3, โควต้าลา |

---

## 📐 กติกาการทำงาน (ค่า Default)

- **จันทร์–ศุกร์**: 08:00–17:00
- **เสาร์ที่ 1, 3**: หยุด (ถ้าทำงาน → ได้ชั่วโมงชดเชย)
- **เสาร์ที่ 2, 4, 5**: ทำงาน 08:30–17:30
- **ลาพักร้อน**: 10 วัน/ปี
- **ลาป่วย**: 30 วัน/ปี
- **ลากิจ**: 3 วัน/ปี
- **8 ชั่วโมง** = 1 วันชดเชย

> แก้ไขได้ที่หน้า **Settings**
