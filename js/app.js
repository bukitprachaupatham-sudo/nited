const API_URL = 'https://script.google.com/macros/s/AKfycbwxDsmSQVG_LSr5Pasr1GxABVOIn4TYc6UM1rEzB6qSr1hrrw4AJwFkYZwx04zMvhg/exec';

let isAdmin = false;
let calendarMonth = new Date().getMonth();
let calendarYear = new Date().getFullYear();
let allBookings = [];
let allSupervisions = [];
let allTeachers = [];
let allFiles = [];

document.addEventListener('DOMContentLoaded', function () {
  setCurrentDate();
  initNavigation();
  setMinDate();
  initSupervisionForm();
  initAuth();
});

function setCurrentDate() {
  const now = new Date();
  const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
  document.getElementById('currentDate').textContent = now.toLocaleDateString('th-TH', options);
}

function setMinDate() {
  const today = new Date().toISOString().split('T')[0];
  const bookDate = document.getElementById('bookDate');
  if (bookDate) bookDate.min = today;
}

function checkAdminSession() {
  // replaced by initAuth()
}

function initNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function () {
      const page = this.dataset.page;
      navigateTo(page);
    });
  });
}

function navigateTo(page) {
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  document.querySelector(`.nav-item[data-page="${page}"]`).classList.add('active');

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');

  const titles = {
    dashboard: 'แดชบอร์ด',
    booking: 'จองวันนิเทศ',
    files: 'ส่งไฟล์งาน',
    supervision: 'ประเมินผล',
    admin: 'จัดการระบบ'
  };
  document.getElementById('pageTitle').textContent = titles[page] || page;

  if (page === 'dashboard') loadDashboard();
  else if (page === 'booking') loadMyBookings();
  else if (page === 'files') loadMyFiles();
  else if (page === 'supervision') loadRecentSupervisions();
  else if (page === 'admin') loadAdminBookings();

  const sidebar = document.getElementById('sidebar');
  if (window.innerWidth <= 768) sidebar.classList.remove('open');
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

async function apiCall(action, data = {}) {
  try {
    showLoading(true);
    const response = await fetch(API_URL, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...data })
    });
    const text = await response.text();
    const result = JSON.parse(text);
    showLoading(false);
    return result;
  } catch (error) {
    showLoading(false);
    showToast('เกิดข้อผิดพลาด: ' + error.message, 'error');
    return { success: false, message: error.toString() };
  }
}

function showLoading(show) {
  document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast ' + type + ' show';
  setTimeout(() => { toast.className = 'toast'; }, 3500);
}

function showModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function getStatusBadge(status) {
  const map = {
    'รอดำเนินการ': 'badge-pending',
    'ยืนยันแล้ว': 'badge-confirmed',
    'นิเทศแล้ว': 'badge-completed',
    'ปฏิเสธ': 'badge-rejected',
    'รอตรวจสอบ': 'badge-review',
    'ผ่าน': 'badge-approved',
    'ปรับปรุง': 'badge-revision',
    'ดีมาก': 'badge-excellent',
    'ดี': 'badge-good',
    'พอใช้': 'badge-fair'
  };
  return `<span class="badge ${map[status] || ''}">${status}</span>`;
}

function getDeptBadge(dept) {
  return `<span class="badge" style="background:#e8f0fe;color:#1a73e8;">${dept}</span>`;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ==================== DASHBOARD ====================

async function loadDashboard() {
  const result = await apiCall('getDashboard');
  if (!result.success) return;

  const s = result.data;
  document.getElementById('statsGrid').innerHTML = `
    <div class="stat-card">
      <div class="stat-icon blue"><span class="material-icons-round">event_available</span></div>
      <div class="stat-info"><h3>${s.totalBookings}</h3><p>จำนวนการจอง</p></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon green"><span class="material-icons-round">check_circle</span></div>
      <div class="stat-info"><h3>${s.completedBookings}</h3><p>นิเทศแล้ว</p></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon purple"><span class="material-icons-round">upload_file</span></div>
      <div class="stat-info"><h3>${s.totalFiles}</h3><p>ส่งไฟล์</p></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon orange"><span class="material-icons-round">pending_actions</span></div>
      <div class="stat-info"><h3>${s.pendingBookings}</h3><p>รอดำเนินการ</p></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon teal"><span class="material-icons-round">rate_review</span></div>
      <div class="stat-info"><h3>${s.totalSupervisions}</h3><p>ผลการประเมิน</p></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon red"><span class="material-icons-round">today</span></div>
      <div class="stat-info"><h3>${s.todayBookings}</h3><p>นิเทศวันนี้</p></div>
    </div>
  `;

  allBookings = s.calendarEvents || [];
  renderCalendar();

  renderRecentBookings(s.recentBookings);
  renderRecentFiles(s.recentFiles);
  renderSupervisionReport(s);
}

function renderSupervisionReport(stats) {
  const sumRow = document.getElementById('supSummaryRow');
  if (!sumRow) return;

  sumRow.innerHTML = `
    <div class="report-sum-box"><h4>${Number(stats.averageScore || 0).toFixed(1)}</h4><p>คะแนนเฉลี่ย (จาก 100)</p></div>
    <div class="report-sum-box"><h4>${stats.totalSupervisions}</h4><p>ครั้งที่ประเมินทั้งหมด</p></div>
    <div class="report-sum-box"><h4>${stats.thisMonthSupervisions}</h4><p>ประเมินเดือนนี้</p></div>
  `;

  const distOrder = ['ดีมาก เป็นตัวอย่างที่ดี', 'ดี', 'ค่อนข้างดี', 'ยอมรับได้ (ควรปรับปรุง)', 'ต้องปรับปรุง'];
  const barCls = { 'ดีมาก เป็นตัวอย่างที่ดี': 'qd-green', 'ดี': 'qd-blue', 'ค่อนข้างดี': 'qd-yellow', 'ยอมรับได้ (ควรปรับปรุง)': 'qd-orange', 'ต้องปรับปรุง': 'qd-red' };
  const qc = stats.qualityCounts || {};
  const maxCount = Math.max(1, ...Object.values(qc));

  let distHtml = '';
  distOrder.forEach(level => {
    if (qc[level]) {
      distHtml += `
        <div class="quality-dist-item">
          <div class="qd-label">${level}</div>
          <div class="qd-bar-wrap"><div class="qd-bar ${barCls[level]}" style="width:${Math.round(qc[level] / maxCount * 100)}%;"></div></div>
          <div class="qd-count">${qc[level]} ครั้ง</div>
        </div>`;
    }
  });
  document.getElementById('qualityDistContainer').innerHTML =
    distHtml || '<p class="empty-state">ยังไม่มีข้อมูลการประเมิน</p>';

  const recents = stats.recentSupervisions || [];
  const container = document.getElementById('recentSupDashboardTable');
  if (recents.length === 0) {
    container.innerHTML = '<p class="empty-state">ยังไม่มีผลการประเมิน</p>';
    return;
  }

  let html = '<div class="table-wrapper"><table><thead><tr><th>วันที่สอน</th><th>ครูผู้สอน</th><th>กลุ่มสาระ</th><th>เรื่องที่สอน</th><th>คะแนน</th><th>ระดับคุณภาพ</th></tr></thead><tbody>';
  recents.forEach(s => {
    html += `<tr>
      <td>${formatDate(s.teachingDate)}</td>
      <td>${s.teacherName}</td>
      <td>${getDeptBadge(s.department)}</td>
      <td>${s.topic || '-'}</td>
      <td><strong>${s.totalScore}</strong>/100</td>
      <td>${getQualityBadge(s.qualityLevel)}</td>
    </tr>`;
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function renderCalendar() {
  const container = document.getElementById('calendarContainer');
  const monthNames = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  document.getElementById('calendarMonth').textContent = `${monthNames[calendarMonth]} ${calendarYear + 543}`;

  const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const dayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
  let html = '<div class="cal-grid">';
  dayNames.forEach(d => { html += `<div class="cal-header-cell">${d}</div>`; });

  for (let i = 0; i < firstDay; i++) html += '<div class="cal-cell empty"></div>';

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;
    const dayBookings = allBookings.filter(b => b.date === dateStr);

    let classes = 'cal-cell';
    if (isToday) classes += ' today';
    if (dayBookings.length > 0) classes += ' has-booking';

    let dots = '';
    if (dayBookings.length > 0) {
      dots = '<div class="cal-dots">';
      const statusMap = {
        'รอดำเนินการ': 'pending',
        'ยืนยันแล้ว': 'confirmed',
        'นิเทศแล้ว': 'completed',
        'ปฏิเสธ': 'rejected'
      };
      dayBookings.forEach(b => {
        dots += `<div class="cal-dot ${statusMap[b.status] || 'pending'}" title="${b.title}"></div>`;
      });
      dots += '</div>';
    }

    let tooltip = '';
    if (dayBookings.length > 0) {
      tooltip = `<div class="cal-cell-tooltip">${dayBookings.length} การจอง</div>`;
    }

    html += `<div class="${classes}" ${dayBookings.length > 0 ? `onclick="showDayBookings('${dateStr}')"` : ''}>${tooltip}<span>${day}</span>${dots}</div>`;
  }

  html += '</div>';
  container.innerHTML = html;
}

function changeMonth(delta) {
  calendarMonth += delta;
  if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
  if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
  renderCalendar();
}

async function showDayBookings(dateStr) {
  const result = await apiCall('getBookings', { date: dateStr });
  if (!result.success || result.data.length === 0) {
    showToast('ไม่มีการจองในวันนี้', 'info');
    return;
  }

  let html = `<p style="margin-bottom:1rem;color:var(--text-secondary);">วันที่ ${formatDate(dateStr)}</p>`;
  result.data.forEach(b => {
    html += `
      <div class="detail-grid" style="margin-bottom:1rem;padding:0.75rem;background:var(--bg);border-radius:var(--radius-sm);">
        <div class="detail-item"><div class="label">ครู</div><div class="value">${b.teacherName}</div></div>
        <div class="detail-item"><div class="label">คาบ</div><div class="value">คาบที่ ${b.period}</div></div>
        <div class="detail-item"><div class="label">วิชา</div><div class="value">${b.subjectName}</div></div>
        <div class="detail-item"><div class="label">ห้อง</div><div class="value">${b.room}</div></div>
        <div class="detail-item full"><div class="label">สถานะ</div><div class="value">${getStatusBadge(b.status)}</div></div>
      </div>`;
  });

  document.getElementById('bookingDetailBody').innerHTML = html;
  showModal('bookingDetailModal');
}

function renderRecentBookings(bookings) {
  const container = document.getElementById('recentBookingsTable');
  if (!bookings || bookings.length === 0) {
    container.innerHTML = '<p class="empty-state">ยังไม่มีรายการจอง</p>';
    return;
  }

  let html = '<div class="table-wrapper"><table><thead><tr><th>วันที่</th><th>ครู</th><th>วิชา</th><th>ห้อง</th><th>สถานะ</th></tr></thead><tbody>';
  bookings.forEach(b => {
    html += `<tr><td>${formatDate(b.date)}</td><td>${b.teacherName}</td><td>${b.subjectName}</td><td>${b.room}</td><td>${getStatusBadge(b.status)}</td></tr>`;
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function renderRecentFiles(files) {
  const container = document.getElementById('recentFilesTable');
  if (!files || files.length === 0) {
    container.innerHTML = '<p class="empty-state">ยังไม่มีไฟล์งาน</p>';
    return;
  }

  let html = '<div class="table-wrapper"><table><thead><tr><th>วันที่</th><th>ครู</th><th>ประเภท</th><th>สถานะ</th></tr></thead><tbody>';
  files.forEach(f => {
    html += `<tr><td>${formatDateTime(f.timestamp)}</td><td>${f.teacherName}</td><td>${f.fileType}</td><td>${getStatusBadge(f.status)}</td></tr>`;
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

// ==================== BOOKING ====================

async function submitBooking(e) {
  e.preventDefault();

  const data = {
    date: document.getElementById('bookDate').value,
    time: document.getElementById('bookTime').value,
    period: document.getElementById('bookPeriod').value,
    teacherName: document.getElementById('bookTeacher').value.trim(),
    department: document.getElementById('bookDepartment').value,
    subjectName: document.getElementById('bookSubject').value.trim(),
    subjectCode: document.getElementById('bookSubjectCode').value.trim(),
    classLevel: document.getElementById('bookClassLevel').value,
    room: document.getElementById('bookRoom').value.trim()
  };

  if (!data.date || !data.time || !data.period || !data.teacherName || !data.department || !data.subjectName || !data.classLevel || !data.room) {
    showToast('กรุณากรอกข้อมูลให้ครบถ้วน', 'warning');
    return;
  }

  const result = await apiCall('addBooking', data);
  if (result.success) {
    showToast('จองวันนิเทศสำเร็จ!', 'success');
    document.getElementById('bookingForm').reset();
    setMinDate();
    loadMyBookings();
  } else {
    showToast(result.message || 'ไม่สามารถจองได้', 'error');
  }
}

async function loadMyBookings() {
  const filter = document.getElementById('myBookingFilter')?.value || '';
  const result = await apiCall('getBookings', filter ? { status: filter } : {});
  const container = document.getElementById('myBookingsTable');

  if (!result.success || result.data.length === 0) {
    container.innerHTML = '<p class="empty-state"><span class="material-icons-round">event_busy</span>ยังไม่มีรายการจอง</p>';
    return;
  }

  let html = '<div class="table-wrapper"><table><thead><tr><th>#</th><th>วันที่</th><th>เวลา</th><th>คาบ</th><th>วิชา</th><th>กลุ่มสาระ</th><th>ห้อง</th><th>สถานะ</th></tr></thead><tbody>';
  result.data.forEach((b, i) => {
    html += `<tr>
      <td>${i + 1}</td>
      <td>${formatDate(b.date)}</td>
      <td>${b.time}</td>
      <td>${b.period}</td>
      <td>${b.subjectName}</td>
      <td>${getDeptBadge(b.department)}</td>
      <td>${b.room}</td>
      <td>${getStatusBadge(b.status)}</td>
    </tr>`;
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

// ==================== FILES ====================

function updateFileHint() {
  const type = document.getElementById('fileType').value;
  const uploadGroup = document.getElementById('fileUploadGroup');
  const linkGroup = document.getElementById('fileLinkGroup');
  const fileInput = document.getElementById('fileInput');
  const hint = document.getElementById('fileHint');

  uploadGroup.style.display = 'none';
  linkGroup.style.display = 'none';

  if (type === 'คลิปวิดีโอ') {
    linkGroup.style.display = 'block';
    document.getElementById('fileLink').required = true;
    fileInput.required = false;
  } else if (type) {
    uploadGroup.style.display = 'block';
    fileInput.required = true;
    document.getElementById('fileLink').required = false;

    const hints = {
      'แผนการสอน': 'รองรับไฟล์ PDF, Word (.pdf, .doc, .docx)',
      'สื่อการสอน': 'รองรับไฟล์ รูปภาพ, PPT, PDF (.jpg, .png, .ppt, .pptx, .pdf)',
      'ภาพกิจกรรม': 'รองรับไฟล์ รูปภาพ (.jpg, .jpeg, .png, .gif)'
    };
    hint.textContent = hints[type] || '';

    const accepts = {
      'แผนการสอน': '.pdf,.doc,.docx',
      'สื่อการสอน': '.jpg,.jpeg,.png,.gif,.ppt,.pptx,.pdf',
      'ภาพกิจกรรม': '.jpg,.jpeg,.png,.gif'
    };
    fileInput.accept = accepts[type] || '';
  }
}

function resetFileForm() {
  document.getElementById('fileUploadGroup').style.display = 'none';
  document.getElementById('fileLinkGroup').style.display = 'none';
  document.getElementById('filePreview').style.display = 'none';
}

async function submitFile(e) {
  e.preventDefault();

  const teacherName = document.getElementById('fileTeacher').value.trim();
  const fileType = document.getElementById('fileType').value;
  const fileName = document.getElementById('fileName').value.trim();
  const fileLink = document.getElementById('fileLink')?.value;
  const fileInput = document.getElementById('fileInput');

  if (!teacherName || !fileType) {
    showToast('กรุณากรอกข้อมูลให้ครบถ้วน', 'warning');
    return;
  }

  let fileUrl = '';
  let driveFileId = '';

  if (fileType === 'คลิปวิดีโอ') {
    if (!fileLink) {
      showToast('กรุณากรอกลิงก์วิดีโอ', 'warning');
      return;
    }
    fileUrl = fileLink;
  } else {
    if (!fileInput.files[0]) {
      showToast('กรุณาเลือกไฟล์', 'warning');
      return;
    }

    const file = fileInput.files[0];
    if (file.size > 50 * 1024 * 1024) {
      showToast('ขนาดไฟล์เกิน 50 MB', 'warning');
      return;
    }

    try {
      showToast('กำลังอัพโหลดไฟล์...', 'info');
      const base64 = await fileToBase64(file);
      const uploadResult = await apiCall('uploadFileToDrive', {
        base64Data: base64.split(',')[1],
        fileName: file.name,
        fileType: fileType
      });

      if (uploadResult.success) {
        fileUrl = uploadResult.fileUrl;
        driveFileId = uploadResult.fileId;
      } else {
        showToast('ไม่สามารถอัพโหลดไฟล์ได้: ' + uploadResult.message, 'error');
        return;
      }
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการอัพโหลด: ' + err.message, 'error');
      return;
    }
  }

  const result = await apiCall('addFile', {
    teacherName,
    fileType,
    fileName: fileName || fileInput.files[0]?.name || fileLink,
    fileUrl,
    driveFileId
  });

  if (result.success) {
    showToast('ส่งไฟล์งานสำเร็จ!', 'success');
    document.getElementById('fileForm').reset();
    resetFileForm();
    loadMyFiles();
  } else {
    showToast(result.message || 'ไม่สามารถส่งไฟล์ได้', 'error');
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

async function loadMyFiles() {
  const filter = document.getElementById('myFileFilter')?.value || '';
  const result = await apiCall('getFiles', filter ? { status: filter } : {});
  const container = document.getElementById('myFilesTable');

  if (!result.success || result.data.length === 0) {
    container.innerHTML = '<p class="empty-state"><span class="material-icons-round">folder_off</span>ยังไม่มีไฟล์งาน</p>';
    return;
  }

  let html = '<div class="table-wrapper"><table><thead><tr><th>#</th><th>วันที่ส่ง</th><th>ประเภท</th><th>ชื่อไฟล์</th><th>สถานะ</th><th>หมายเหตุ</th></tr></thead><tbody>';
  result.data.forEach((f, i) => {
    const fileLink = f.fileUrl ? `<a href="${f.fileUrl}" target="_blank" style="color:var(--primary);text-decoration:none;">${f.fileName || 'ดูไฟล์'}</a>` : (f.fileName || '-');
    html += `<tr>
      <td>${i + 1}</td>
      <td>${formatDateTime(f.timestamp)}</td>
      <td>${f.fileType}</td>
      <td>${fileLink}</td>
      <td>${getStatusBadge(f.status)}</td>
      <td>${f.adminNote || '-'}</td>
    </tr>`;
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

// ==================== SUPERVISION (e-Inspection) ====================

const teachingTechniques = [
  'กระบวนการสืบค้น', 'การเรียนแบบค้นพบ', 'การเรียนแบบแก้ปัญหา',
  'การเรียนแบบสร้างแผนผัง', 'การตั้งคำถาม', 'เทคนิคคู่คิด',
  'การศึกษาเป็นรายบุคคล', 'การฝึกปฏิบัติ/ทดลอง', 'เกม',
  'การอภิปราย', 'กิจกรรมกลุ่ม', 'บูรณาการกลุ่มสาระอื่น'
];

const evaluationCriteria = [
  {
    category: 'ด้านการเตรียมการสอน',
    items: [
      '1. จัดทำแผนการเรียนรู้ครบองค์ประกอบ',
      '2. จัดเตรียมวัสดุ-อุปกรณ์ สื่อ นวัตกรรม กิจกรรมตามแผนฯ'
    ]
  },
  {
    category: 'ด้านการจัดกิจกรรมการเรียนรู้',
    items: [
      '3. มีวิธีการนำเข้าสู่บทเรียนที่น่าสนใจ แจ้งวัตถุประสงค์การเรียนรู้',
      '4. ใช้เทคนิคการสอนที่หลากหลาย เน้นผู้เรียนเป็นสำคัญ',
      '5. จัดกิจกรรมที่ส่งเสริมให้ค้นคว้าหาคำตอบด้วยตนเอง',
      '6. จัดกิจกรรมที่ตอบสนองความแตกต่างระหว่างบุคคล',
      '7. จัดกิจกรรมที่เน้นกระบวนการคิด (วิเคราะห์ สังเคราะห์ สร้างสรรค์)',
      '8. จัดกิจกรรมให้ผู้เรียนมีส่วนร่วมและแสดงความคิดเห็นเสรี',
      '9. มีการสอดแทรกคุณธรรม จริยธรรมและคุณลักษณะอันพึงประสงค์',
      '10. มีการเสริมแรงเมื่อนักเรียนปฏิบัติหรือตอบถูกต้อง',
      '11. มีการสรุปประเด็น สาระ เนื้อหาในกิจกรรมการเรียนรู้',
      '12. มอบหมายงานเหมาะสมตามศักยภาพผู้เรียนและเอาใจใส่ดูแล',
      '13. ใช้เวลาสอนเหมาะสมกับเวลาที่กำหนด'
    ]
  },
  {
    category: 'ด้านสื่อ นวัตกรรม แหล่งเรียนรู้',
    items: [
      '14. ใช้สื่อที่เหมาะสมกับกิจกรรมและศักยภาพของผู้เรียน',
      '15. ใช้สื่อ แหล่งการเรียนรู้อย่างหลากหลาย'
    ]
  },
  {
    category: 'ด้านการวัดและประเมินผล',
    items: [
      '16. สอดคล้องและครอบคลุมจุดประสงค์',
      '17. ประเมินผลอย่างหลากหลายและครบทั้ง 3 ด้าน (K.P.A.)'
    ]
  },
  {
    category: 'ด้านสภาพทั่วไป',
    items: [
      '18. การตรงต่อเวลา',
      '19. การควบคุมความเป็นระเบียบในชั้นเรียน',
      '20. การจัดบรรยากาศในชั้นเรียน (การจัดห้อง, ความสะอาด)'
    ]
  },
  {
    category: 'ด้านบุคลิกภาพ',
    items: [
      '21. แต่งกายสุภาพ สะอาดเรียบร้อย เหมาะสมกับกาลเทศะ',
      '22. ใช้ถ้อยคำสุภาพ ถูกต้อง ระดับเสียงดังชัดเจน',
      '23. ยิ้มแย้มแจ่มใส และควบคุมอารมณ์ในระหว่างสอนได้ดี',
      '24. เคลื่อนไหวและแสดงท่าทางในการสอนอย่างมีจุดหมาย',
      '25. แสดงความรัก ความเมตตา กรุณา เอื้ออาทรต่อศิษย์'
    ]
  }
];

function initSupervisionForm() {
  const techContainer = document.getElementById('techniquesContainer');
  if (!techContainer) return;

  techContainer.innerHTML = teachingTechniques.map(t =>
    `<label class="tech-item"><input type="checkbox" name="techniques" value="${t}">${t}</label>`
  ).join('');

  const evalBody = document.getElementById('evaluationBody');
  let html = '';
  let q = 1;

  evaluationCriteria.forEach(group => {
    html += `<tr class="eval-category-row"><td colspan="6" class="eval-category">${group.category}</td></tr>`;
    group.items.forEach(itemText => {
      let radioCells = '';
      for (let score = 0; score <= 4; score++) {
        radioCells += `<td class="score-cell"><input type="radio" name="q${q}" value="${score}" onchange="calculateScore()"></td>`;
      }
      html += `<tr><td class="eval-item">${itemText}</td>${radioCells}</tr>`;
      q++;
    });
  });

  evalBody.innerHTML = html;
}

function calculateScore() {
  let total = 0;
  let answeredCount = 0;

  for (let i = 1; i <= 25; i++) {
    const selected = document.querySelector(`input[name="q${i}"]:checked`);
    if (selected) {
      total += parseInt(selected.value);
      answeredCount++;
    }
  }

  document.getElementById('displayScore').textContent = total;
  document.getElementById('displayPercent').textContent = total.toFixed(1);

  const levelEl = document.getElementById('displayLevel');
  if (answeredCount === 0) {
    levelEl.textContent = '-';
    levelEl.className = 'score-level';
    return;
  }

  const q = getQualityLevel(total);
  levelEl.textContent = answeredCount < 25 ? `${q.level} (${answeredCount}/25 ข้อ)` : q.level;
  levelEl.className = 'score-level ' + q.cls;
}

function getQualityLevel(percent) {
  if (percent < 60) return { level: 'ต้องปรับปรุง', cls: 'lv-red' };
  if (percent < 70) return { level: 'ยอมรับได้ (ควรปรับปรุง)', cls: 'lv-orange' };
  if (percent < 80) return { level: 'ค่อนข้างดี', cls: 'lv-yellow' };
  if (percent < 90) return { level: 'ดี', cls: 'lv-green' };
  return { level: 'ดีมาก เป็นตัวอย่างที่ดี', cls: 'lv-green' };
}

function getQualityBadge(level) {
  const map = {
    'ต้องปรับปรุง': 'badge-rejected',
    'ยอมรับได้ (ควรปรับปรุง)': 'badge-pending',
    'ค่อนข้างดี': 'badge-review',
    'ดี': 'badge-good',
    'ดีมาก เป็นตัวอย่างที่ดี': 'badge-excellent'
  };
  return `<span class="badge ${map[level] || ''}">${level || '-'}</span>`;
}

async function submitSupervision(e) {
  e.preventDefault();

  const btn = document.getElementById('submitSupBtn');
  const originalBtn = btn.innerHTML;
  btn.disabled = true;

  const scores = [];
  for (let i = 1; i <= 25; i++) {
    const selected = document.querySelector(`input[name="q${i}"]:checked`);
    if (!selected) {
      showToast('กรุณาให้คะแนนครบทั้ง 25 ข้อก่อนบันทึก', 'warning');
      btn.disabled = false;
      document.querySelector('input[name="q' + i + '"]').closest('tr').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    scores.push(parseInt(selected.value));
  }

  const selectedTechs = Array.from(document.querySelectorAll('input[name="techniques"]:checked')).map(cb => cb.value);
  const otherTech = document.getElementById('otherTechnique').value.trim();
  if (otherTech) selectedTechs.push(otherTech);

  const totalScore = scores.reduce((a, b) => a + b, 0);
  const quality = getQualityLevel(totalScore);

  const data = {
    supervisionType: document.querySelector('input[name="supType"]:checked').value,
    supervisorName: document.getElementById('supervisorName').value.trim(),
    teacherName: document.getElementById('supTeacher').value.trim(),
    department: document.getElementById('supDepartment').value,
    gradeLevel: document.getElementById('supGradeLevel').value.trim(),
    period: document.getElementById('supPeriod').value,
    teachingDate: document.getElementById('supDate').value,
    topic: document.getElementById('supTopic').value.trim(),
    techniques: selectedTechs.join(', '),
    scores: scores,
    totalScore: totalScore,
    percent: Math.round(totalScore * 10) / 10,
    qualityLevel: quality.level,
    strengths: document.getElementById('supStrengths').value.trim(),
    improvements: document.getElementById('supImprovements').value.trim(),
    suggestions: document.getElementById('supSuggestions').value.trim()
  };

  const fileInput = document.getElementById('evidenceFile');
  if (fileInput.files[0]) {
    const file = fileInput.files[0];
    if (file.size > 50 * 1024 * 1024) {
      showToast('ขนาดไฟล์เกิน 50 MB', 'warning');
      btn.disabled = false;
      return;
    }
    btn.innerHTML = '<span class="material-icons-round">hourglass_top</span> กำลังอัปโหลดไฟล์...';
    try {
      const base64 = await fileToBase64(file);
      const uploadResult = await apiCall('uploadFileToDrive', {
        base64Data: base64.split(',')[1],
        fileName: file.name,
        fileType: 'ภาพกิจกรรม'
      });
      if (uploadResult.success) {
        data.evidenceUrl = uploadResult.fileUrl;
      } else {
        showToast('อัปโหลดไฟล์ไม่สำเร็จ: ' + uploadResult.message, 'error');
        btn.disabled = false;
        btn.innerHTML = originalBtn;
        return;
      }
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการอัปโหลด: ' + err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = originalBtn;
      return;
    }
  }

  btn.innerHTML = '<span class="material-icons-round">hourglass_top</span> กำลังบันทึก...';
  const result = await apiCall('addSupervision', data);

  btn.disabled = false;
  btn.innerHTML = originalBtn;

  if (result.success) {
    showToast('บันทึกผลการนิเทศสำเร็จ! (คะแนน ' + totalScore + '/100)', 'success');
    resetSupervisionForm();
    loadRecentSupervisions();
  } else {
    showToast(result.message || 'ไม่สามารถบันทึกได้', 'error');
  }
}

function resetSupervisionForm() {
  document.getElementById('supervisionForm').reset();
  calculateScore();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadRecentSupervisions() {
  const result = await apiCall('getSupervisions', {});
  const container = document.getElementById('recentSupervisionsTable');

  if (!result.success || result.data.length === 0) {
    container.innerHTML = '<p class="empty-state"><span class="material-icons-round">assessment</span>ยังไม่มีผลการประเมิน</p>';
    return;
  }

  allSupervisions = result.data;

  let html = '<div class="table-wrapper"><table><thead><tr><th>#</th><th>วันที่สอน</th><th>ครูผู้สอน</th><th>กลุ่มสาระ</th><th>เรื่องที่สอน</th><th>คะแนน</th><th>ระดับคุณภาพ</th><th></th></tr></thead><tbody>';
  result.data.forEach((s, i) => {
    html += `<tr>
      <td>${i + 1}</td>
      <td>${formatDate(s.teachingDate)}</td>
      <td>${s.teacherName}</td>
      <td>${getDeptBadge(s.department)}</td>
      <td>${s.topic || '-'}</td>
      <td><strong>${s.totalScore}</strong>/100</td>
      <td>${getQualityBadge(s.qualityLevel)}</td>
      <td><button class="btn btn-sm btn-primary" onclick="showSupervisionDetail(${i})"><span class="material-icons-round">visibility</span></button></td>
    </tr>`;
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function showSupervisionDetail(index) {
  const s = allSupervisions[index];
  if (!s) return;

  const evidenceLink = s.evidenceUrl
    ? `<a href="${s.evidenceUrl}" target="_blank" style="color:var(--primary);">ดูไฟล์หลักฐาน</a>`
    : '-';

  document.getElementById('supervisionDetailBody').innerHTML = `
    <div class="detail-grid">
      <div class="detail-item"><div class="label">ประเภทการนิเทศ</div><div class="value">${s.supervisionType || '-'}</div></div>
      <div class="detail-item"><div class="label">ผู้นิเทศ</div><div class="value">${s.supervisorName || '-'}</div></div>
      <div class="detail-item"><div class="label">ครูผู้สอน</div><div class="value">${s.teacherName}</div></div>
      <div class="detail-item"><div class="label">กลุ่มสาระ</div><div class="value">${s.department}</div></div>
      <div class="detail-item"><div class="label">ชั้น / คาบที่</div><div class="value">${s.gradeLevel || '-'} / ${s.period ? 'คาบที่ ' + s.period : '-'}</div></div>
      <div class="detail-item"><div class="label">วันที่สอน</div><div class="value">${formatDate(s.teachingDate)}</div></div>
      <div class="detail-item full"><div class="label">เรื่องที่สอน</div><div class="value">${s.topic || '-'}</div></div>
      <div class="detail-item full"><div class="label">เทคนิคการสอนที่ใช้</div><div class="value">${s.techniques || '-'}</div></div>
      <div class="detail-item"><div class="label">คะแนนรวม</div><div class="value"><strong>${s.totalScore}</strong>/100 (${Number(s.percent).toFixed(1)}%)</div></div>
      <div class="detail-item"><div class="label">ระดับคุณภาพ</div><div class="value">${getQualityBadge(s.qualityLevel)}</div></div>
      <div class="detail-item"><div class="label">ไฟล์หลักฐาน</div><div class="value">${evidenceLink}</div></div>
      <div class="detail-item full"><div class="label">จุดเด่น / คำชมเชย</div><div class="value">${s.strengths || '-'}</div></div>
      <div class="detail-item full"><div class="label">จุดที่ควรพัฒนา</div><div class="value">${s.improvements || '-'}</div></div>
      <div class="detail-item full"><div class="label">ข้อเสนอแนะอื่นๆ</div><div class="value">${s.suggestions || '-'}</div></div>
    </div>
  `;
  showModal('supervisionDetailModal');
}

// ==================== AUTH ====================

let currentUser = null;

function initAuth() {
  const saved = sessionStorage.getItem('currentUser');
  if (saved) {
    try {
      enterApp(JSON.parse(saved));
      return;
    } catch (e) { sessionStorage.removeItem('currentUser'); }
  }
  showLoginPage();
}

function showLoginPage() {
  document.getElementById('loginPage').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  document.getElementById('loginPassword').value = '';
  document.getElementById('loginError').style.display = 'none';
}

function togglePassword() {
  const input = document.getElementById('loginPassword');
  const icon = document.getElementById('togglePassIcon');
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  icon.textContent = show ? 'visibility' : 'visibility_off';
}

async function doLogin(e) {
  if (e) e.preventDefault();

  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  const btn = document.getElementById('loginSubmitBtn');

  if (!username || !password) {
    errEl.textContent = 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน';
    errEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  const originalBtn = btn.innerHTML;
  btn.innerHTML = '<span class="material-icons-round">hourglass_top</span> กำลังตรวจสอบ...';

  const result = await apiCall('login', { username, password });

  btn.disabled = false;
  btn.innerHTML = originalBtn;

  if (result.success) {
    sessionStorage.setItem('currentUser', JSON.stringify(result));
    enterApp(result);
    showToast('ยินดีต้อนรับ ' + (result.displayName || username), 'success');
  } else {
    errEl.textContent = result.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
    errEl.style.display = 'block';
    document.getElementById('loginPassword').value = '';
  }
}

function enterApp(user) {
  currentUser = user;
  isAdmin = user.role === 'admin';

  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('app').style.display = 'flex';

  const roleLabels = { admin: 'ผู้ดูแลระบบ', supervisor: 'หัวหน้ากลุ่มสาระ', teacher: 'ครูผู้สอน' };
  document.getElementById('userBadgeName').textContent =
    (user.displayName || user.username) + ' · ' + (roleLabels[user.role] || user.role);
  document.getElementById('userBadge').style.display = 'flex';

  const adminNav = document.querySelector('.admin-only');
  if (isAdmin) {
    sessionStorage.setItem('adminSession', 'true');
    adminNav.style.display = 'flex';
  } else {
    sessionStorage.removeItem('adminSession');
    adminNav.style.display = 'none';
  }

  loadDashboard();
}

function logout() {
  isAdmin = false;
  currentUser = null;
  sessionStorage.removeItem('currentUser');
  sessionStorage.removeItem('adminSession');
  document.querySelector('.admin-only').style.display = 'none';
  navigateTo('dashboard');
  showLoginPage();
  showToast('ออกจากระบบแล้ว', 'info');
}

// ==================== ADMIN ====================

function switchAdminTab(tabId) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

  document.getElementById(tabId).classList.add('active');
  event.target.closest('.tab-btn').classList.add('active');

  if (tabId === 'adminBooking') loadAdminBookings();
  else if (tabId === 'adminFiles') loadAdminFiles();
  else if (tabId === 'adminReports') loadReportData();
  else if (tabId === 'adminUsers') loadAdminUsers();
}

// ==================== USER MANAGEMENT ====================

async function loadAdminUsers() {
  const result = await apiCall('getUsers', {});
  const container = document.getElementById('adminUsersTable');

  if (!result.success || result.data.length === 0) {
    container.innerHTML = '<p class="empty-state"><span class="material-icons-round">people</span>ไม่มีผู้ใช้</p>';
    return;
  }

  const roleLabels = { admin: 'ผู้ดูแลระบบ', supervisor: 'หัวหน้ากลุ่มสาระ', teacher: 'ครูผู้สอน' };
  const roleBadges = { admin: 'badge-excellent', supervisor: 'badge-confirmed', teacher: 'badge-good' };

  let html = '<div class="table-wrapper"><table><thead><tr><th>#</th><th>ชื่อผู้ใช้</th><th>ชื่อที่แสดง</th><th>สิทธิ์</th><th>กลุ่มสาระ</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody>';
  result.data.forEach((u, i) => {
    const statusBadge = u.status === 'active'
      ? '<span class="badge badge-completed">ใช้งาน</span>'
      : '<span class="badge badge-rejected">ระงับ</span>';
    html += `<tr>
      <td>${i + 1}</td>
      <td>${u.username}</td>
      <td>${u.displayName}</td>
      <td><span class="badge ${roleBadges[u.role] || ''}">${roleLabels[u.role] || u.role}</span></td>
      <td>${u.department || '-'}</td>
      <td>${statusBadge}</td>
      <td class="btn-actions">
        <button class="btn btn-sm btn-primary" onclick="editUser(${u.id}, '${u.username}', '${u.displayName.replace(/'/g, "\\'")}', '${u.role}', '${u.department || ''}')" title="แก้ไข"><span class="material-icons-round">edit</span></button>
        ${u.username !== 'admin' ? `
          <button class="btn btn-sm ${u.status === 'active' ? 'btn-warning' : 'btn-success'}" onclick="toggleUserStatusAction(${u.id})" title="${u.status === 'active' ? 'ระงับ' : 'เปิดใช้งาน'}">
            <span class="material-icons-round">${u.status === 'active' ? 'block' : 'check_circle'}</span>
          </button>
          <button class="btn btn-sm btn-danger" onclick="confirmDeleteUser(${u.id})" title="ลบ"><span class="material-icons-round">delete</span></button>
        ` : ''}
      </td>
    </tr>`;
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function showAddUserModal() {
  document.getElementById('userModalTitle').innerHTML = '<span class="material-icons-round">person_add</span> เพิ่มผู้ใช้';
  document.getElementById('editUserRow').value = '';
  document.getElementById('userUsername').value = '';
  document.getElementById('userUsername').disabled = false;
  document.getElementById('userPassword').value = '';
  document.getElementById('userPassword').required = true;
  document.getElementById('passwordHint').textContent = '';
  document.getElementById('userDisplayName').value = '';
  document.getElementById('userRole').value = 'teacher';
  document.getElementById('userDepartment').value = '';
  showModal('userModal');
}

function editUser(id, username, displayName, role, department) {
  document.getElementById('userModalTitle').innerHTML = '<span class="material-icons-round">edit</span> แก้ไขผู้ใช้';
  document.getElementById('editUserRow').value = id;
  document.getElementById('userUsername').value = username;
  document.getElementById('userUsername').disabled = true;
  document.getElementById('userPassword').value = '';
  document.getElementById('userPassword').required = false;
  document.getElementById('passwordHint').textContent = 'ปล่อยว่างหากไม่ต้องการเปลี่ยน';
  document.getElementById('userDisplayName').value = displayName;
  document.getElementById('userRole').value = role;
  document.getElementById('userDepartment').value = department;
  showModal('userModal');
}

async function saveUser() {
  const editRow = document.getElementById('editUserRow').value;
  const username = document.getElementById('userUsername').value.trim();
  const password = document.getElementById('userPassword').value;
  const displayName = document.getElementById('userDisplayName').value.trim();
  const role = document.getElementById('userRole').value;
  const department = document.getElementById('userDepartment').value;

  if (!username || !displayName) {
    showToast('กรุณากรอกข้อมูลให้ครบถ้วน', 'warning');
    return;
  }

  if (editRow) {
    const result = await apiCall('updateUser', {
      rowNumber: parseInt(editRow),
      displayName, role, department, password: password || undefined
    });
    if (result.success) {
      showToast('อัพเดทผู้ใช้สำเร็จ', 'success');
      closeModal('userModal');
      loadAdminUsers();
    } else {
      showToast(result.message, 'error');
    }
  } else {
    if (!password) {
      showToast('กรุณากรอกรหัสผ่าน', 'warning');
      return;
    }
    const result = await apiCall('addUser', { username, password, displayName, role, department });
    if (result.success) {
      showToast('เพิ่มผู้ใช้สำเร็จ', 'success');
      closeModal('userModal');
      loadAdminUsers();
    } else {
      showToast(result.message, 'error');
    }
  }
}

async function toggleUserStatusAction(rowNumber) {
  const result = await apiCall('toggleUserStatus', { rowNumber });
  if (result.success) {
    showToast(result.message, 'success');
    loadAdminUsers();
  } else {
    showToast(result.message, 'error');
  }
}

async function confirmDeleteUser(rowNumber) {
  if (!confirm('ต้องการลบผู้ใช้นี้หรือไม่?')) return;
  const result = await apiCall('deleteUser', { rowNumber });
  if (result.success) {
    showToast('ลบผู้ใช้สำเร็จ', 'success');
    loadAdminUsers();
  } else {
    showToast(result.message, 'error');
  }
}

async function loadAdminBookings() {
  const status = document.getElementById('adminBookingStatus')?.value || '';
  const dept = document.getElementById('adminBookingDept')?.value || '';
  const result = await apiCall('getBookings', { status, department: dept });
  const container = document.getElementById('adminBookingsTable');

  if (!result.success || result.data.length === 0) {
    container.innerHTML = '<p class="empty-state"><span class="material-icons-round">event_busy</span>ไม่มีรายการ</p>';
    return;
  }

  let html = '<div class="table-wrapper"><table><thead><tr><th>#</th><th>วันที่</th><th>เวลา</th><th>คาบ</th><th>ครู</th><th>กลุ่มสาระ</th><th>วิชา</th><th>ห้อง</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody>';
  result.data.forEach((b, i) => {
    html += `<tr>
      <td>${i + 1}</td>
      <td>${formatDate(b.date)}</td>
      <td>${b.time}</td>
      <td>${b.period}</td>
      <td>${b.teacherName}</td>
      <td>${getDeptBadge(b.department)}</td>
      <td>${b.subjectName}</td>
      <td>${b.room}</td>
      <td>${getStatusBadge(b.status)}</td>
      <td class="btn-actions">
        ${b.status === 'รอดำเนินการ' ? `
          <button class="btn btn-sm btn-success" onclick="updateBookingStatus(${b.id}, 'ยืนยันแล้ว')" title="ยืนยัน"><span class="material-icons-round">check</span></button>
          <button class="btn btn-sm btn-danger" onclick="updateBookingStatus(${b.id}, 'ปฏิเสธ')" title="ปฏิเสธ"><span class="material-icons-round">close</span></button>
        ` : ''}
        ${b.status === 'ยืนยันแล้ว' ? `
          <button class="btn btn-sm btn-primary" onclick="updateBookingStatus(${b.id}, 'นิเทศแล้ว')" title="นิเทศแล้ว"><span class="material-icons-round">done_all</span></button>
        ` : ''}
        <button class="btn btn-sm btn-danger" onclick="confirmDeleteBooking(${b.id})" title="ลบ"><span class="material-icons-round">delete</span></button>
      </td>
    </tr>`;
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

async function updateBookingStatus(rowNumber, status) {
  const result = await apiCall('updateBookingStatus', { rowNumber, status });
  if (result.success) {
    showToast('อัพเดทสถานะสำเร็จ', 'success');
    loadAdminBookings();
  } else {
    showToast(result.message, 'error');
  }
}

async function confirmDeleteBooking(rowNumber) {
  if (!confirm('ต้องการลบรายการจองนี้หรือไม่?')) return;
  const result = await apiCall('deleteBooking', { rowNumber });
  if (result.success) {
    showToast('ลบรายการสำเร็จ', 'success');
    loadAdminBookings();
  } else {
    showToast(result.message, 'error');
  }
}

async function loadAdminFiles() {
  const status = document.getElementById('adminFileStatus')?.value || '';
  const result = await apiCall('getFiles', { status });
  const container = document.getElementById('adminFilesTable');

  if (!result.success || result.data.length === 0) {
    container.innerHTML = '<p class="empty-state"><span class="material-icons-round">folder_off</span>ไม่มีไฟล์งาน</p>';
    return;
  }

  let html = '<div class="table-wrapper"><table><thead><tr><th>#</th><th>วันที่ส่ง</th><th>ครู</th><th>ประเภท</th><th>ชื่อไฟล์</th><th>สถานะ</th><th>หมายเหตุ</th><th>จัดการ</th></tr></thead><tbody>';
  result.data.forEach((f, i) => {
    const fileLink = f.fileUrl ? `<a href="${f.fileUrl}" target="_blank" style="color:var(--primary);text-decoration:none;">ดูไฟล์</a>` : '-';
    html += `<tr>
      <td>${i + 1}</td>
      <td>${formatDateTime(f.timestamp)}</td>
      <td>${f.teacherName}</td>
      <td>${f.fileType}</td>
      <td>${fileLink}</td>
      <td>${getStatusBadge(f.status)}</td>
      <td>${f.adminNote || '-'}</td>
      <td class="btn-actions">
        ${f.status !== 'ผ่าน' ? `<button class="btn btn-sm btn-success" onclick="updateFileStatusAction(${f.id}, 'ผ่าน')" title="อนุมัติ"><span class="material-icons-round">check</span></button>` : ''}
        ${f.status !== 'ปรับปรุง' ? `<button class="btn btn-sm btn-warning" onclick="promptRevision(${f.id})" title="ขอแก้ไข"><span class="material-icons-round">edit</span></button>` : ''}
        <button class="btn btn-sm btn-danger" onclick="confirmDeleteFile(${f.id}, '${f.driveFileId || ''}')" title="ลบ"><span class="material-icons-round">delete</span></button>
      </td>
    </tr>`;
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

async function updateFileStatusAction(rowNumber, status) {
  const result = await apiCall('updateFileStatus', { rowNumber, status, adminNote: '' });
  if (result.success) {
    showToast('อัพเดทสถานะไฟล์สำเร็จ', 'success');
    loadAdminFiles();
  } else {
    showToast(result.message, 'error');
  }
}

function promptRevision(rowNumber) {
  const note = prompt('กรอกหมายเหตุ (ขอแก้ไข):');
  if (note !== null) {
    updateFileStatusWithNote(rowNumber, 'ปรับปรุง', note);
  }
}

async function updateFileStatusWithNote(rowNumber, status, adminNote) {
  const result = await apiCall('updateFileStatus', { rowNumber, status, adminNote });
  if (result.success) {
    showToast('อัพเดทสถานะไฟล์สำเร็จ', 'success');
    loadAdminFiles();
  } else {
    showToast(result.message, 'error');
  }
}

async function confirmDeleteFile(rowNumber, driveFileId) {
  if (!confirm('ต้องการลบไฟล์นี้หรือไม่?')) return;
  const result = await apiCall('deleteFile', { rowNumber, driveFileId });
  if (result.success) {
    showToast('ลบไฟล์สำเร็จ', 'success');
    loadAdminFiles();
  } else {
    showToast(result.message, 'error');
  }
}

// ==================== REPORTS ====================

async function loadReportData() {
  const teachers = await apiCall('getTeachers');
  if (teachers.success) {
    allTeachers = teachers.data;
    const sel = document.getElementById('reportTeacher');
    sel.innerHTML = '<option value="">-- ทั้งหมด --</option>';
    teachers.data.forEach(t => {
      sel.innerHTML += `<option value="${t}">${t}</option>`;
    });
  }

  const bookings = await apiCall('getBookings', {});
  if (bookings.success) {
    const depts = [...new Set(bookings.data.map(b => b.department))];
    const deptSel = document.getElementById('reportDept');
    deptSel.innerHTML = '<option value="">-- ทั้งหมด --</option>';
    depts.forEach(d => {
      deptSel.innerHTML += `<option value="${d}">${d}</option>`;
    });
  }
}

function updateReportFields() {
  const type = document.getElementById('reportType').value;
  document.getElementById('reportTeacherGroup').style.display = type === 'individual' ? 'block' : 'none';
  document.getElementById('reportDeptGroup').style.display = type === 'department' ? 'block' : 'none';
}

async function generateReport() {
  const type = document.getElementById('reportType').value;
  const container = document.getElementById('reportOutput');

  if (type === 'individual') {
    await generateIndividualReport(container);
  } else if (type === 'department') {
    await generateDepartmentReport(container);
  } else {
    await generateSummaryReport(container);
  }
}

async function generateIndividualReport(container) {
  const teacher = document.getElementById('reportTeacher').value;
  if (!teacher) {
    showToast('กรุณาเลือกครู', 'warning');
    return;
  }

  const [bookingsRes, filesRes, supsRes] = await Promise.all([
    apiCall('getBookings', { teacherName: teacher }),
    apiCall('getFiles', { teacherName: teacher }),
    apiCall('getSupervisions', { teacherName: teacher })
  ]);

  const bookings = bookingsRes.success ? bookingsRes.data : [];
  const files = filesRes.success ? filesRes.data : [];
  const sups = supsRes.success ? supsRes.data : [];

  let html = `<div class="report-section">
    <h4>รายงานรายบุคคล: ${teacher}</h4>
    <div class="report-item"><span class="label">จำนวนการจองทั้งหมด</span><span class="value">${bookings.length}</span></div>
    <div class="report-item"><span class="label">นิเทศแล้ว</span><span class="value">${bookings.filter(b => b.status === 'นิเทศแล้ว').length}</span></div>
    <div class="report-item"><span class="label">รอตรวจสอบ</span><span class="value">${bookings.filter(b => b.status === 'รอดำเนินการ').length}</span></div>
  </div>
  <div class="report-section">
    <h4>ไฟล์งาน</h4>
    <div class="report-item"><span class="label">ไฟล์ทั้งหมด</span><span class="value">${files.length}</span></div>
    <div class="report-item"><span class="label">ผ่าน</span><span class="value">${files.filter(f => f.status === 'ผ่าน').length}</span></div>
    <div class="report-item"><span class="label">รอตรวจสอบ</span><span class="value">${files.filter(f => f.status === 'รอตรวจสอบ').length}</span></div>
    <div class="report-item"><span class="label">ขอปรับปรุง</span><span class="value">${files.filter(f => f.status === 'ปรับปรุง').length}</span></div>
  </div>
  <div class="report-section">
    <h4>ผลการประเมิน (${sups.length} ครั้ง)</h4>`;

  sups.forEach((s, i) => {
    html += `
      <div style="padding:0.5rem;background:var(--bg);border-radius:var(--radius-sm);margin-bottom:0.5rem;">
        <div class="report-item"><span class="label">วันที่สอน</span><span class="value">${formatDate(s.teachingDate)}</span></div>
        <div class="report-item"><span class="label">เรื่องที่สอน</span><span class="value">${s.topic || '-'}</span></div>
        <div class="report-item"><span class="label">คะแนน</span><span class="value">${s.totalScore}/100</span></div>
        <div class="report-item"><span class="label">ระดับ</span><span class="value">${getQualityBadge(s.qualityLevel)}</span></div>
        <div class="report-item"><span class="label">จุดเด่น</span><span class="value">${s.strengths || '-'}</span></div>
        <div class="report-item"><span class="label">จุดพัฒนา</span><span class="value">${s.improvements || '-'}</span></div>
      </div>`;
  });

  html += '</div>';
  container.innerHTML = html;
}

async function generateDepartmentReport(container) {
  const dept = document.getElementById('reportDept').value;
  if (!dept) {
    showToast('กรุณาเลือกกลุ่มสาระ', 'warning');
    return;
  }

  const [bookingsRes, supsRes] = await Promise.all([
    apiCall('getBookings', { department: dept }),
    apiCall('getSupervisions', { department: dept })
  ]);

  const bookings = bookingsRes.success ? bookingsRes.data : [];
  const sups = supsRes.success ? supsRes.data : [];

  const teachersInDept = [...new Set(bookings.map(b => b.teacherName))];
  const qualityCounts = {};
  sups.forEach(s => {
    qualityCounts[s.qualityLevel] = (qualityCounts[s.qualityLevel] || 0) + 1;
  });

  let html = `<div class="report-section">
    <h4>รายงานกลุ่มสาระ: ${dept}</h4>
    <div class="report-item"><span class="label">จำนวนครูที่นิเทศ</span><span class="value">${teachersInDept.length} คน</span></div>
    <div class="report-item"><span class="label">จำนวนการจองทั้งหมด</span><span class="value">${bookings.length}</span></div>
    <div class="report-item"><span class="label">นิเทศแล้ว</span><span class="value">${bookings.filter(b => b.status === 'นิเทศแล้ว').length}</span></div>
  </div>
  <div class="report-section">
    <h4>ผลการประเมิน (${sups.length} ครั้ง)</h4>`;

  Object.keys(qualityCounts).forEach(q => {
    html += `<div class="report-item"><span class="label">${q}</span><span class="value">${qualityCounts[q]} ครั้ง</span></div>`;
  });

  html += `</div><div class="report-section"><h4>รายชื่อครู</h4>`;
  teachersInDept.forEach(t => {
    const teacherBookings = bookings.filter(b => b.teacherName === t);
    const teacherSups = sups.filter(s => s.teacherName === t);
    html += `<div class="report-item"><span class="label">${t}</span><span class="value">${teacherBookings.length} ครั้ง (${teacherSups.length} ประเมิน)</span></div>`;
  });

  html += '</div>';
  container.innerHTML = html;
}

async function generateSummaryReport(container) {
  const result = await apiCall('getDashboard');
  if (!result.success) return;

  const s = result.data;

  let html = `<div class="report-section">
    <h4>รายงานสรุปภาพรวม</h4>
    <div class="report-item"><span class="label">การจองทั้งหมด</span><span class="value">${s.totalBookings} ครั้ง</span></div>
    <div class="report-item"><span class="label">นิเทศแล้ว</span><span class="value">${s.completedBookings} ครั้ง</span></div>
    <div class="report-item"><span class="label">รอดำเนินการ</span><span class="value">${s.pendingBookings} ครั้ง</span></div>
    <div class="report-item"><span class="label">ปฏิเสธ</span><span class="value">${s.rejectedBookings} ครั้ง</span></div>
  </div>
  <div class="report-section">
    <h4>ไฟล์งาน</h4>
    <div class="report-item"><span class="label">ไฟล์ทั้งหมด</span><span class="value">${s.totalFiles} ไฟล์</span></div>
    <div class="report-item"><span class="label">ผ่าน</span><span class="value">${s.approvedFiles} ไฟล์</span></div>
    <div class="report-item"><span class="label">รอตรวจสอบ</span><span class="value">${s.pendingFiles} ไฟล์</span></div>
    <div class="report-item"><span class="label">ขอปรับปรุง</span><span class="value">${s.revisionFiles} ไฟล์</span></div>
  </div>
  <div class="report-section">
    <h4>ผลการประเมิน</h4>
    <div class="report-item"><span class="label">ทั้งหมด</span><span class="value">${s.totalSupervisions} ครั้ง</span></div>
    <div class="report-item"><span class="label">เดือนนี้</span><span class="value">${s.thisMonthSupervisions} ครั้ง</span></div>
  </div>
  <div class="report-section">
    <h4>สถิติกลุ่มสาระ</h4>`;

  Object.keys(s.departmentStats).forEach(dept => {
    html += `<div class="report-item"><span class="label">${dept}</span><span class="value">${s.departmentStats[dept]} ครั้ง</span></div>`;
  });

  html += '</div>';
  container.innerHTML = html;
}

function printReport() {
  window.print();
}
