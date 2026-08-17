const API_URL = 'https://script.google.com/macros/s/AKfycbzPOx6alzSVmZ8NN87l4rToV7kY1r9ch0oHJM_42xzgAl-SP7AriEB5KYumwx0uscRD/exec';

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
  loadDashboard();
  checkAdminSession();
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
  const session = sessionStorage.getItem('adminSession');
  if (session === 'true') {
    isAdmin = true;
    showAdminUI();
  }
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
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...data })
    });
    const result = await response.json();
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
      <div class="stat-info"><h3>${s.totalBookings}</h3><p>การจองทั้งหมด</p></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon orange"><span class="material-icons-round">pending_actions</span></div>
      <div class="stat-info"><h3>${s.pendingBookings}</h3><p>รอดำเนินการ</p></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon green"><span class="material-icons-round">check_circle</span></div>
      <div class="stat-info"><h3>${s.completedBookings}</h3><p>นิเทศแล้ว</p></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon purple"><span class="material-icons-round">upload_file</span></div>
      <div class="stat-info"><h3>${s.totalFiles}</h3><p>ไฟล์งานทั้งหมด</p></div>
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

// ==================== SUPERVISION ====================

async function submitSupervision(e) {
  e.preventDefault();

  const data = {
    teacherName: document.getElementById('supTeacher').value.trim(),
    supervisionDate: document.getElementById('supDate').value,
    department: document.getElementById('supDepartment').value,
    subject: document.getElementById('supSubject').value.trim(),
    strengths: document.getElementById('supStrengths').value.trim(),
    improvements: document.getElementById('supImprovements').value.trim(),
    suggestions: document.getElementById('supSuggestions').value.trim(),
    qualityLevel: document.getElementById('supQuality').value
  };

  if (!data.teacherName || !data.supervisionDate || !data.department || !data.strengths || !data.improvements || !data.qualityLevel) {
    showToast('กรุณากรอกข้อมูลให้ครบถ้วน', 'warning');
    return;
  }

  const result = await apiCall('addSupervision', data);
  if (result.success) {
    showToast('บันทึกผลการประเมินสำเร็จ!', 'success');
    document.getElementById('supervisionForm').reset();
    loadRecentSupervisions();
  } else {
    showToast(result.message || 'ไม่สามารถบันทึกได้', 'error');
  }
}

async function loadRecentSupervisions() {
  const result = await apiCall('getSupervisions', {});
  const container = document.getElementById('recentSupervisionsTable');

  if (!result.success || result.data.length === 0) {
    container.innerHTML = '<p class="empty-state"><span class="material-icons-round">assessment</span>ยังไม่มีผลการประเมิน</p>';
    return;
  }

  allSupervisions = result.data;

  let html = '<div class="table-wrapper"><table><thead><tr><th>#</th><th>วันที่นิเทศ</th><th>ครู</th><th>กลุ่มสาระ</th><th>ระดับ</th><th></th></tr></thead><tbody>';
  result.data.forEach((s, i) => {
    html += `<tr>
      <td>${i + 1}</td>
      <td>${formatDate(s.supervisionDate)}</td>
      <td>${s.teacherName}</td>
      <td>${getDeptBadge(s.department)}</td>
      <td>${getStatusBadge(s.qualityLevel)}</td>
      <td><button class="btn btn-sm btn-primary" onclick="showSupervisionDetail(${i})"><span class="material-icons-round">visibility</span></button></td>
    </tr>`;
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function showSupervisionDetail(index) {
  const s = allSupervisions[index];
  if (!s) return;

  document.getElementById('supervisionDetailBody').innerHTML = `
    <div class="detail-grid">
      <div class="detail-item"><div class="label">ครูผู้สอน</div><div class="value">${s.teacherName}</div></div>
      <div class="detail-item"><div class="label">วันที่นิเทศ</div><div class="value">${formatDate(s.supervisionDate)}</div></div>
      <div class="detail-item"><div class="label">กลุ่มสาระ</div><div class="value">${s.department}</div></div>
      <div class="detail-item"><div class="label">รายวิชา</div><div class="value">${s.subject || '-'}</div></div>
      <div class="detail-item full"><div class="label">จุดเด่น</div><div class="value">${s.strengths}</div></div>
      <div class="detail-item full"><div class="label">จุดพัฒนา</div><div class="value">${s.improvements}</div></div>
      <div class="detail-item full"><div class="label">ข้อเสนอแนะ</div><div class="value">${s.suggestions || '-'}</div></div>
      <div class="detail-item"><div class="label">ระดับคุณภาพ</div><div class="value">${getStatusBadge(s.qualityLevel)}</div></div>
    </div>
  `;
  showModal('supervisionDetailModal');
}

// ==================== LOGIN ====================

function showLoginModal() {
  document.getElementById('loginPassword').value = '';
  document.getElementById('loginError').style.display = 'none';
  showModal('loginModal');
}

function closeLoginModal() {
  closeModal('loginModal');
}

async function doLogin() {
  const password = document.getElementById('loginPassword').value;
  const result = await apiCall('login', { password });

  if (result.success) {
    isAdmin = true;
    sessionStorage.setItem('adminSession', 'true');
    showAdminUI();
    closeLoginModal();
    showToast('เข้าสู่ระบบสำเร็จ', 'success');
    navigateTo('admin');
  } else {
    const err = document.getElementById('loginError');
    err.textContent = result.message || 'รหัสผ่านไม่ถูกต้อง';
    err.style.display = 'block';
  }
}

function logout() {
  isAdmin = false;
  sessionStorage.removeItem('adminSession');
  document.getElementById('loginBtn').style.display = 'flex';
  document.getElementById('userBadge').style.display = 'none';
  document.querySelector('.admin-only').style.display = 'none';
  navigateTo('dashboard');
  showToast('ออกจากระบบแล้ว', 'info');
}

function showAdminUI() {
  document.getElementById('loginBtn').style.display = 'none';
  document.getElementById('userBadge').style.display = 'flex';
  document.querySelector('.admin-only').style.display = 'flex';
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
        <div class="report-item"><span class="label">วันที่</span><span class="value">${formatDate(s.supervisionDate)}</span></div>
        <div class="report-item"><span class="label">ระดับ</span><span class="value">${getStatusBadge(s.qualityLevel)}</span></div>
        <div class="report-item"><span class="label">จุดเด่น</span><span class="value">${s.strengths}</span></div>
        <div class="report-item"><span class="label">จุดพัฒนา</span><span class="value">${s.improvements}</span></div>
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
