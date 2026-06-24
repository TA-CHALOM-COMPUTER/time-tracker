// ===================================================
// LEAVE.JS — บันทึกการลา + หักโควต้าอัตโนมัติ
// ===================================================

const LEAVE_TYPES = {
  annual:   { label: "ลาพักร้อน",   quota_key: "annual_leave"   },
  sick:     { label: "ลาป่วย",       quota_key: "sick_leave"     },
  personal: { label: "ลากิจ",        quota_key: "personal_leave" },
  comp:     { label: "ใช้ชั่วโมงชดเชย", quota_key: null           }
};

requireAuth(async (user) => {
  const uid      = user.uid;
  const settings = await getSettings();

  const form       = document.getElementById("leave-form");
  const selType    = document.getElementById("leave-type");
  const inStart    = document.getElementById("leave-start");
  const inEnd      = document.getElementById("leave-end");
  const inReason   = document.getElementById("leave-reason");
  const lblQuota   = document.getElementById("lbl-quota");
  const tblHistory = document.getElementById("leave-history-body");

  // โหลดโควต้า
  await renderQuota(uid, settings);

  // เมื่อเปลี่ยนประเภทการลา
  if (selType) selType.addEventListener("change", () => renderQuota(uid, settings));

  // Submit
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const type    = selType.value;
      const start   = inStart.value;
      const end     = inEnd.value   || start;
      const reason  = inReason.value.trim();
      const days    = countWorkdays(start, end);

      if (days <= 0) {
        showToast("วันที่ไม่ถูกต้อง", "danger"); return;
      }

      // ตรวจโควต้า
      if (type !== "comp") {
        const quota = await getQuota(uid, type, settings);
        if (quota.remaining < days) {
          showToast(`โควต้าไม่พอ เหลือ ${quota.remaining} วัน แต่ขอ ${days} วัน`, "danger");
          return;
        }
        // หักโควต้า
        await db.ref(`leave_quotas/${uid}/${type}_used`).transaction(v => (v || 0) + days);
      } else {
        // ใช้ชั่วโมงชดเชย (1 วัน = 8 ชม.)
        const hoursNeeded = days * (settings.hours_per_day || 8);
        const snap = await db.ref(`timebank_balance/${uid}`).once("value");
        const bal  = snap.val() || 0;
        if (bal < hoursNeeded) {
          showToast(`ชั่วโมงชดเชยไม่พอ มี ${formatHours(bal)} ต้องการ ${formatHours(hoursNeeded)}`, "danger");
          return;
        }
        // หัก timebank
        await db.ref(`timebank_balance/${uid}`).set(+(bal - hoursNeeded).toFixed(2));
        const key = db.ref(`timebank/${uid}`).push().key;
        await db.ref(`timebank/${uid}/${key}`).set({
          date: start, hours: -hoursNeeded, note: `ใช้ชดเชยวันลา ${start}–${end}`,
          type: "use", created_at: Date.now()
        });
      }

      // บันทึก leave_request
      const key = db.ref(`leave_requests/${uid}`).push().key;
      await db.ref(`leave_requests/${uid}/${key}`).set({
        type, start, end, reason, days, status: "approved",
        created_at: Date.now()
      });

      showToast(`บันทึกการลา ${days} วันเรียบร้อย`, "success");
      form.reset();
      await renderQuota(uid, settings);
      await loadLeaveHistory(uid, tblHistory);
    });
  }

  await loadLeaveHistory(uid, tblHistory);

  // ---------- FUNCTIONS ----------

  async function renderQuota(uid, settings) {
    if (!lblQuota) return;
    const type = selType ? selType.value : "annual";
    if (type === "comp") {
      const snap = await db.ref(`timebank_balance/${uid}`).once("value");
      const bal  = snap.val() || 0;
      lblQuota.innerHTML = `<span class="badge bg-success fs-6">ชั่วโมงชดเชยคงเหลือ: ${formatHours(bal)}</span>`;
      return;
    }
    const q = await getQuota(uid, type, settings);
    lblQuota.innerHTML = `
      <span class="badge bg-primary fs-6">คงเหลือ: ${q.remaining} วัน</span>
      <small class="text-muted ms-2">(ใช้ไป ${q.used} / โควต้า ${q.total} วัน)</small>`;
  }

  async function getQuota(uid, type, settings) {
    const info  = LEAVE_TYPES[type];
    const total = settings[info.quota_key] || 0;
    const snap  = await db.ref(`leave_quotas/${uid}/${type}_used`).once("value");
    const used  = snap.val() || 0;
    return { total, used, remaining: Math.max(0, total - used) };
  }
});

async function loadLeaveHistory(uid, tbody) {
  if (!tbody) return;
  const snap = await db.ref(`leave_requests/${uid}`).orderByChild("created_at").limitToLast(50).once("value");
  const rows = [];
  snap.forEach(c => rows.unshift({ id: c.key, ...c.val() }));

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${LEAVE_TYPES[r.type]?.label || r.type}</td>
      <td>${formatDateTH(r.start)}</td>
      <td>${formatDateTH(r.end)}</td>
      <td>${r.days} วัน</td>
      <td>${r.reason || "—"}</td>
      <td><span class="badge bg-success">อนุมัติ</span></td>
    </tr>`).join("") || `<tr><td colspan="6" class="text-center text-muted">ไม่มีประวัติการลา</td></tr>`;
}

/** นับวันทำงาน (จันทร์–ศุกร์) ระหว่าง start–end */
function countWorkdays(start, end) {
  let count = 0;
  const s = new Date(start), e = new Date(end);
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow >= 1 && dow <= 5) count++;
  }
  return count;
}

function showToast(msg, type = "info") {
  const el = document.getElementById("toast-msg");
  if (!el) { alert(msg); return; }
  el.className = `alert alert-${type} position-fixed bottom-0 end-0 m-3`;
  el.textContent = msg;
  el.style.display = "block";
  setTimeout(() => el.style.display = "none", 3500);
}
