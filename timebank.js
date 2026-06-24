// ===================================================
// TIMEBANK.JS — ชั่วโมงสะสม (Comp Time)
// ===================================================

requireAuth(async (user) => {
  const uid      = user.uid;
  const settings = await getSettings();
  const hpd      = settings.hours_per_day || 8;

  const lblBalance  = document.getElementById("lbl-balance");
  const lblDays     = document.getElementById("lbl-days");
  const inUseHours  = document.getElementById("use-hours");
  const inUseNote   = document.getElementById("use-note");
  const btnUse      = document.getElementById("btn-use");
  const tblBody     = document.getElementById("timebank-table-body");

  // โหลด balance แบบ real-time
  db.ref(`timebank_balance/${uid}`).on("value", snap => {
    const bal = snap.val() || 0;
    if (lblBalance) lblBalance.textContent = formatHours(bal);
    if (lblDays)    lblDays.textContent    = `≈ ${(bal / hpd).toFixed(1)} วัน`;
  });

  // ใช้ชั่วโมง
  if (btnUse) {
    btnUse.addEventListener("click", async () => {
      const hrs  = parseFloat(inUseHours?.value || 0);
      const note = inUseNote?.value.trim() || "ใช้ชั่วโมงสะสม";

      if (!hrs || hrs <= 0) { showToast("กรุณาระบุจำนวนชั่วโมง", "warning"); return; }

      const snap = await db.ref(`timebank_balance/${uid}`).once("value");
      const bal  = snap.val() || 0;
      if (hrs > bal) { showToast(`ชั่วโมงไม่พอ (มี ${formatHours(bal)})`, "danger"); return; }

      const today = todayStr();
      const key   = db.ref(`timebank/${uid}`).push().key;
      await db.ref(`timebank/${uid}/${key}`).set({
        date: today, hours: -hrs, note, type: "use", created_at: Date.now()
      });
      await db.ref(`timebank_balance/${uid}`).set(+(bal - hrs).toFixed(2));

      showToast(`ใช้ ${formatHours(hrs)} เรียบร้อย`, "success");
      if (inUseHours) inUseHours.value = "";
      if (inUseNote)  inUseNote.value  = "";
      await loadHistory(uid, tblBody);
    });
  }

  await loadHistory(uid, tblBody);
});

async function loadHistory(uid, tbody) {
  if (!tbody) return;
  const snap = await db.ref(`timebank/${uid}`).orderByChild("created_at").limitToLast(50).once("value");
  const rows = [];
  snap.forEach(c => rows.unshift({ id: c.key, ...c.val() }));

  tbody.innerHTML = rows.map(r => {
    const isEarn = r.type === "earn";
    const badge  = isEarn
      ? `<span class="badge bg-success">+${formatHours(r.hours)}</span>`
      : `<span class="badge bg-danger">${formatHours(r.hours)}</span>`;
    return `<tr>
      <td>${formatDateTH(r.date)}</td>
      <td>${r.note || "—"}</td>
      <td>${badge}</td>
    </tr>`;
  }).join("") || `<tr><td colspan="3" class="text-center text-muted">ไม่มีข้อมูล</td></tr>`;
}

function showToast(msg, type = "info") {
  const el = document.getElementById("toast-msg");
  if (!el) { alert(msg); return; }
  el.className = `alert alert-${type} position-fixed bottom-0 end-0 m-3`;
  el.textContent = msg;
  el.style.display = "block";
  setTimeout(() => el.style.display = "none", 3000);
}
