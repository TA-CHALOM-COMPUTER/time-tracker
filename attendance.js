// ===================================================
// ATTENDANCE.JS — บันทึกเวลาเข้า-ออก + ชั่วโมงชดเชย
// ===================================================

requireAuth(async (user) => {
  const uid      = user.uid;
  const settings = await getSettings();
  const today    = todayStr();
  const workday  = await isWorkday(today, settings);
  const dow      = new Date().getDay();
  const isSat    = dow === 6;
  const nth      = isSat ? getNthSaturdayOfMonth(today) : null;

  // ---------- UI references ----------
  const btnIn      = document.getElementById("btn-checkin");
  const btnOut     = document.getElementById("btn-checkout");
  const lblStatus  = document.getElementById("lbl-status");
  const lblDate    = document.getElementById("lbl-date");
  const tblBody    = document.getElementById("attendance-table-body");
  const lblSatInfo = document.getElementById("lbl-sat-info");

  // แสดงวันที่
  if (lblDate) lblDate.textContent = formatDateTH(today);

  // แสดงข้อมูลเสาร์
  if (lblSatInfo && isSat) {
    if (!workday) {
      lblSatInfo.textContent = `เสาร์ที่ ${nth} ของเดือน — วันหยุด (ถ้าทำงานจะได้ชั่วโมงชดเชย)`;
      lblSatInfo.className = "badge bg-success";
    } else {
      lblSatInfo.textContent = `เสาร์ที่ ${nth} ของเดือน — วันทำงานปกติ`;
      lblSatInfo.className = "badge bg-primary";
    }
  }

  // โหลดข้อมูลวันนี้
  const ref = db.ref(`attendance/${uid}/${today}`);
  ref.on("value", snap => {
    const rec = snap.val() || {};
    updateUI(rec);
  });

  // ---------- Check-In ----------
  if (btnIn) {
    btnIn.addEventListener("click", async () => {
      const now = new Date().toTimeString().slice(0, 5); // HH:MM
      await ref.update({ check_in: now, date: today, uid });
      showToast("บันทึกเวลาเข้างานแล้ว", "success");
    });
  }

  // ---------- Check-Out ----------
  if (btnOut) {
    btnOut.addEventListener("click", async () => {
      const snap = await ref.once("value");
      const rec  = snap.val() || {};
      if (!rec.check_in) {
        showToast("กรุณา Check-In ก่อน", "warning");
        return;
      }
      const now   = new Date().toTimeString().slice(0, 5);
      const hours = calcWorkHours(rec.check_in, now, settings.lunch_minutes);

      const update = { check_out: now, hours_worked: +hours.toFixed(2) };

      // ถ้าเป็นเสาร์ที่หยุด → เก็บ comp time
      if (isSat && !workday) {
        update.comp_hours = +hours.toFixed(2);
        update.comp_note  = `ทำงานวันหยุดเสาร์ที่ ${nth}`;
        // บวก comp time ใน timebank
        await addCompTime(uid, today, hours, `ทำงานเสาร์ที่ ${nth} (${formatDateTH(today)})`);
        showToast(`บันทึกแล้ว! ได้ชั่วโมงชดเชย ${formatHours(hours)}`, "success");
      } else {
        showToast(`บันทึกแล้ว! ทำงาน ${formatHours(hours)}`, "success");
      }

      await ref.update(update);
    });
  }

  // โหลดตารางประวัติ 30 วันล่าสุด
  await loadHistory(uid, tblBody, settings);

  function updateUI(rec) {
    if (lblStatus) {
      if (rec.check_in && rec.check_out) {
        lblStatus.innerHTML = `<span class="text-success">✓ เข้า ${rec.check_in} — ออก ${rec.check_out} (${formatHours(rec.hours_worked)})</span>`;
        if (btnIn)  btnIn.disabled = true;
        if (btnOut) btnOut.disabled = true;
      } else if (rec.check_in) {
        lblStatus.innerHTML = `<span class="text-primary">⏱ เข้างาน ${rec.check_in} — รอ Check-Out</span>`;
        if (btnIn)  btnIn.disabled = true;
        if (btnOut) btnOut.disabled = false;
      } else {
        lblStatus.innerHTML = `<span class="text-secondary">ยังไม่ได้ Check-In</span>`;
        if (btnIn)  btnIn.disabled = false;
        if (btnOut) btnOut.disabled = true;
      }
    }
  }
});

async function loadHistory(uid, tbody, settings) {
  if (!tbody) return;
  const snap = await db.ref(`attendance/${uid}`).orderByKey().limitToLast(30).once("value");
  const rows = [];
  snap.forEach(child => rows.unshift({ date: child.key, ...child.val() }));

  tbody.innerHTML = rows.map(r => {
    const isComp  = r.comp_hours > 0;
    const badge   = isComp ? `<span class="badge bg-success">ชดเชย</span>` : "";
    return `<tr>
      <td>${formatDateTH(r.date)}</td>
      <td>${r.check_in || "—"}</td>
      <td>${r.check_out || "—"}</td>
      <td>${r.hours_worked ? formatHours(r.hours_worked) : "—"}</td>
      <td>${isComp ? formatHours(r.comp_hours) : "—"} ${badge}</td>
    </tr>`;
  }).join("") || `<tr><td colspan="5" class="text-center text-muted">ไม่มีข้อมูล</td></tr>`;
}

/** เพิ่ม comp time ใน timebank */
async function addCompTime(uid, date, hours, note) {
  const key = db.ref(`timebank/${uid}`).push().key;
  await db.ref(`timebank/${uid}/${key}`).set({
    date, hours: +hours.toFixed(2), note, type: "earn", created_at: Date.now()
  });
  // อัปเดต balance
  const snap = await db.ref(`timebank_balance/${uid}`).once("value");
  const bal  = (snap.val() || 0) + hours;
  await db.ref(`timebank_balance/${uid}`).set(+bal.toFixed(2));
}

function showToast(msg, type = "info") {
  const el = document.getElementById("toast-msg");
  if (!el) { alert(msg); return; }
  el.className = `alert alert-${type} position-fixed bottom-0 end-0 m-3`;
  el.textContent = msg;
  el.style.display = "block";
  setTimeout(() => { el.style.display = "none"; }, 3000);
}
