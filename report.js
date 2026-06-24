// ===================================================
// REPORT.JS — รายงานรายเดือน
// ===================================================

requireAuth(async (user) => {
  const uid  = user.uid;
  const now  = new Date();
  const selMonth = document.getElementById("sel-month");
  const btnGen   = document.getElementById("btn-generate");
  const divReport = document.getElementById("report-content");

  // ตั้งค่า default เดือนปัจจุบัน
  const curYM = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  if (selMonth) selMonth.value = curYM;

  if (btnGen) {
    btnGen.addEventListener("click", () => generateReport(uid, selMonth?.value || curYM, divReport));
  }

  // auto-generate
  await generateReport(uid, curYM, divReport);
});

async function generateReport(uid, ym, container) {
  if (!container) return;
  container.innerHTML = `<div class="text-center py-4"><div class="spinner-border text-primary"></div></div>`;

  const settings = await getSettings();
  const [y, m]   = ym.split("-");

  // Attendance
  const attSnap = await db.ref(`attendance/${uid}`)
    .orderByKey().startAt(`${ym}-01`).endAt(`${ym}-31`).once("value");
  const attRows = [];
  attSnap.forEach(c => attRows.push({ date: c.key, ...c.val() }));

  const totalHours = attRows.reduce((s, r) => s + (r.hours_worked || 0), 0);
  const compEarned = attRows.reduce((s, r) => s + (r.comp_hours || 0), 0);

  // Leave requests
  const leaveSnap = await db.ref(`leave_requests/${uid}`).orderByChild("start")
    .startAt(`${ym}-01`).endAt(`${ym}-31`).once("value");
  const leaveRows = [];
  leaveSnap.forEach(c => leaveRows.push({ id: c.key, ...c.val() }));
  const totalLeaveDays = leaveRows.reduce((s, r) => s + (r.days || 0), 0);

  // Render
  container.innerHTML = `
    <div class="row g-3 mb-4">
      <div class="col-md-3">
        <div class="card text-center border-primary">
          <div class="card-body">
            <div class="fs-2 fw-bold text-primary">${attRows.filter(r=>r.hours_worked).length}</div>
            <div class="text-muted">วันที่ทำงาน</div>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card text-center border-success">
          <div class="card-body">
            <div class="fs-2 fw-bold text-success">${formatHours(totalHours)}</div>
            <div class="text-muted">ชั่วโมงรวม</div>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card text-center border-warning">
          <div class="card-body">
            <div class="fs-2 fw-bold text-warning">${totalLeaveDays} วัน</div>
            <div class="text-muted">วันลา</div>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card text-center border-info">
          <div class="card-body">
            <div class="fs-2 fw-bold text-info">${formatHours(compEarned)}</div>
            <div class="text-muted">ชั่วโมงชดเชยได้รับ</div>
          </div>
        </div>
      </div>
    </div>

    <h6 class="fw-bold mb-2">บันทึกเวลารายวัน</h6>
    <div class="table-responsive">
      <table class="table table-sm table-striped">
        <thead><tr><th>วันที่</th><th>เข้า</th><th>ออก</th><th>ชั่วโมง</th><th>ชดเชย</th></tr></thead>
        <tbody>
          ${attRows.length ? attRows.map(r => `
            <tr>
              <td>${formatDateTH(r.date)}</td>
              <td>${r.check_in||"—"}</td>
              <td>${r.check_out||"—"}</td>
              <td>${r.hours_worked ? formatHours(r.hours_worked) : "—"}</td>
              <td>${r.comp_hours ? `<span class="badge bg-success">+${formatHours(r.comp_hours)}</span>` : "—"}</td>
            </tr>`).join("") : `<tr><td colspan="5" class="text-center text-muted">ไม่มีข้อมูล</td></tr>`}
        </tbody>
      </table>
    </div>

    <h6 class="fw-bold mb-2 mt-3">ประวัติการลา</h6>
    <div class="table-responsive">
      <table class="table table-sm table-striped">
        <thead><tr><th>ประเภท</th><th>วันเริ่ม</th><th>วันสิ้นสุด</th><th>จำนวน</th><th>เหตุผล</th></tr></thead>
        <tbody>
          ${leaveRows.length ? leaveRows.map(r => `
            <tr>
              <td>${{annual:"ลาพักร้อน",sick:"ลาป่วย",personal:"ลากิจ",comp:"ใช้ชดเชย"}[r.type]||r.type}</td>
              <td>${formatDateTH(r.start)}</td>
              <td>${formatDateTH(r.end)}</td>
              <td>${r.days} วัน</td>
              <td>${r.reason||"—"}</td>
            </tr>`).join("") : `<tr><td colspan="5" class="text-center text-muted">ไม่มีการลา</td></tr>`}
        </tbody>
      </table>
    </div>`;
}
