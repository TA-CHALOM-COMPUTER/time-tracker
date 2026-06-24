// ===================================================
// SETTINGS.JS — บันทึก/โหลด settings จาก Firebase
// ===================================================

requireAuth(async () => {
  const settings = await getSettings();

  // โหลดค่าเดิม
  const fields = ["weekday_start","weekday_end","saturday_start","saturday_end",
                  "lunch_minutes","hours_per_day","annual_leave","sick_leave","personal_leave"];
  fields.forEach(f => {
    const el = document.getElementById(f);
    if (el && settings[f] !== undefined) el.value = settings[f];
  });

  // เสาร์หยุด
  (settings.off_saturdays || [1,3]).forEach(n => {
    const cb = document.getElementById(`sat${n}`);
    if (cb) cb.checked = true;
  });

  // บันทึก
  document.getElementById("btn-save").addEventListener("click", async () => {
    const off_saturdays = [1,2,3,4,5].filter(n => document.getElementById(`sat${n}`)?.checked);
    const data = {};
    fields.forEach(f => {
      const el = document.getElementById(f);
      if (el) data[f] = ["lunch_minutes","hours_per_day","annual_leave","sick_leave","personal_leave"]
        .includes(f) ? +el.value : el.value;
    });
    data.off_saturdays = off_saturdays;

    try {
      await db.ref("settings").set(data);
      showToast("บันทึกการตั้งค่าเรียบร้อย ✓", "success");
    } catch (err) {
      showToast("เกิดข้อผิดพลาด: " + err.message, "danger");
    }
  });
});

function showToast(msg, type = "info") {
  const el = document.getElementById("toast-msg");
  if (!el) { alert(msg); return; }
  el.className = `alert alert-${type} position-fixed bottom-0 end-0 m-3`;
  el.textContent = msg;
  el.style.display = "block";
  setTimeout(() => el.style.display = "none", 3000);
}
