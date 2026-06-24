// ===================================================
// DASHBOARD.JS — สรุปภาพรวม
// ===================================================

requireAuth(async (user) => {
  const uid      = user.uid;
  const settings = await getSettings();
  const profile  = await getUserProfile(uid);

  // แสดงชื่อ
  const lblName = document.getElementById("lbl-username");
  if (lblName) lblName.textContent = profile?.name || user.email;

  // วันนี้
  const today  = todayStr();
  const rec    = await db.ref(`attendance/${uid}/${today}`).once("value").then(s => s.val() || {});
  const lblIn  = document.getElementById("lbl-checkin-today");
  const lblOut = document.getElementById("lbl-checkout-today");
  if (lblIn)  lblIn.textContent  = rec.check_in  || "—";
  if (lblOut) lblOut.textContent = rec.check_out || "—";

  // โควต้าลา
  const types = ["annual", "sick", "personal"];
  for (const t of types) {
    const key   = { annual: "annual_leave", sick: "sick_leave", personal: "personal_leave" }[t];
    const total = settings[key] || 0;
    const snap  = await db.ref(`leave_quotas/${uid}/${t}_used`).once("value");
    const used  = snap.val() || 0;
    const el    = document.getElementById(`lbl-${t}-quota`);
    if (el) el.textContent = `${total - used} / ${total} วัน`;
  }

  // Time bank
  const bal   = await db.ref(`timebank_balance/${uid}`).once("value").then(s => s.val() || 0);
  const hpd   = settings.hours_per_day || 8;
  const lblTB = document.getElementById("lbl-timebank");
  if (lblTB) lblTB.textContent = `${formatHours(bal)} (≈ ${(bal/hpd).toFixed(1)} วัน)`;

  // เดือนนี้ — จำนวนวันทำงาน
  await loadMonthSummary(uid, settings);
});

async function loadMonthSummary(uid, settings) {
  const now   = new Date();
  const y     = now.getFullYear();
  const m     = String(now.getMonth() + 1).padStart(2, "0");
  const snap  = await db.ref(`attendance/${uid}`).orderByKey()
    .startAt(`${y}-${m}-01`).endAt(`${y}-${m}-31`).once("value");

  let totalHours = 0, daysWorked = 0;
  snap.forEach(c => {
    const v = c.val();
    if (v.hours_worked) { totalHours += v.hours_worked; daysWorked++; }
  });

  const lblDays  = document.getElementById("lbl-days-worked");
  const lblHours = document.getElementById("lbl-hours-month");
  if (lblDays)  lblDays.textContent  = `${daysWorked} วัน`;
  if (lblHours) lblHours.textContent = formatHours(totalHours);
}
