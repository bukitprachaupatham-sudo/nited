const SPREADSHEET_ID = '1Q00PEcLzyskePGoVSCkTPnsYxo9zRssUU8njE-T9xc8';
const DRIVE_FOLDER_ID = '1KRh9lgDCTCTkiuRxioVJn1hVGqhNf2bJ';
const ADMIN_PASSWORD = 'bukit2569';

function doGet(e) {
  const html = HtmlService.createHtmlOutput(
    '<div style="font-family:sans-serif;text-align:center;padding:4rem;">' +
    '<h2>ระบบนิเทศภายในโรงเรียนบูกิตประชาอุปถัมภ์</h2>' +
    '<p>ย้ายไปใช้งานที่หน้าเว็บหลักแล้ว</p>' +
    '<p style="margin-top:1rem;"><a href="https://bukitprachaupatham-sudo.github.io/nited/" ' +
    'target="_blank" style="font-size:1.1rem;color:#1a73e8;">คลิกเพื่อเปิดระบบนิเทศฯ</a></p>' +
    '</div>'
  );
  return html
    .setTitle('ระบบนิเทศภายในโรงเรียนบูกิตประชาอุปถัมภ์')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;

  switch (action) {
    case 'addBooking': return jsonResponse(addBooking(data));
    case 'getBookings': return jsonResponse(getBookings(data));
    case 'updateBookingStatus': return jsonResponse(updateBookingStatus(data));
    case 'deleteBooking': return jsonResponse(deleteBooking(data));
    case 'addFile': return jsonResponse(addFile(data));
    case 'getFiles': return jsonResponse(getFiles(data));
    case 'updateFileStatus': return jsonResponse(updateFileStatus(data));
    case 'deleteFile': return jsonResponse(deleteFile(data));
    case 'addSupervision': return jsonResponse(addSupervision(data));
    case 'getSupervisions': return jsonResponse(getSupervisions(data));
    case 'deleteSupervision': return jsonResponse(deleteSupervision(data));
    case 'getDashboard': return jsonResponse(getDashboard());
    case 'login': return jsonResponse(login(data));
    case 'getTeachers': return jsonResponse(getTeachers());
    case 'getUsers': return jsonResponse(getUsers(data));
    case 'addUser': return jsonResponse(addUser(data));
    case 'updateUser': return jsonResponse(updateUser(data));
    case 'deleteUser': return jsonResponse(deleteUser(data));
    case 'toggleUserStatus': return jsonResponse(toggleUserStatus(data));
    default: return jsonResponse({ success: false, message: 'Unknown action' });
  }
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(name);

  if (name === 'Supervision' && sheet &&
      String(sheet.getRange(1, 2).getValue()) !== 'Supervision Type') {
    const suffix = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd_HHmmss');
    sheet.setName('Supervision_Old_' + suffix);
    sheet = null;
  }

  if (!sheet) {
    if (name === 'Booking') {
      sheet = ss.insertSheet('Booking');
      sheet.appendRow([
        'Timestamp', 'Date', 'Time', 'Teacher Name', 'Department',
        'Period', 'Subject Name', 'Subject Code', 'Class Level', 'Room', 'Status'
      ]);
      sheet.getRange('A1:K1').setFontWeight('bold').setBackground('#1a73e8').setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    } else if (name === 'Files') {
      sheet = ss.insertSheet('Files');
      sheet.appendRow([
        'Timestamp', 'Teacher Name', 'Booking ID', 'File Type', 'File Name',
        'File URL', 'Drive File ID', 'Status', 'Admin Note'
      ]);
      sheet.getRange('A1:I1').setFontWeight('bold').setBackground('#1a73e8').setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    } else if (name === 'Supervision') {
      sheet = createSupervisionSheet(ss);
    } else if (name === 'Users') {
      sheet = ss.insertSheet('Users');
      sheet.appendRow([
        'Timestamp', 'Username', 'Password', 'DisplayName', 'Role', 'Department', 'Status'
      ]);
      sheet.getRange('A1:G1').setFontWeight('bold').setBackground('#1a73e8').setFontColor('#ffffff');
      sheet.setFrozenRows(1);
      sheet.appendRow([
        Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss'),
        'admin', 'bukit2569', 'ผู้ดูแลระบบ', 'admin', '-', 'active'
      ]);
    }
  }
  return sheet;
}

function createSupervisionSheet(ss) {
  const sheet = ss.insertSheet('Supervision');
  sheet.appendRow([
    'Timestamp', 'Supervision Type', 'Supervisor Name', 'Teacher Name', 'Department',
    'Grade Level', 'Period', 'Teaching Date', 'Topic', 'Techniques',
    'Scores', 'Total Score', 'Percent', 'Quality Level',
    'Strengths', 'Improvements', 'Suggestions', 'Evidence URL'
  ]);
  sheet.getRange('A1:R1').setFontWeight('bold').setBackground('#1a73e8').setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  return sheet;
}

function getDriveFolder() {
  const mainFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const folders = {};
  const subFolderNames = ['Plans', 'Media', 'Photos', 'Clips'];
  subFolderNames.forEach(name => {
    const it = mainFolder.getFoldersByName(name);
    folders[name] = it.hasNext() ? it.next() : mainFolder.createFolder(name);
  });
  return folders;
}

function createBookingId() {
  return 'BK-' + new Date().getTime();
}

function toDateString(value) {
  if (value === null || value === undefined || value === '') return '';
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(value, 'Asia/Bangkok', 'yyyy-MM-dd');
  }
  return String(value);
}

function login(data) {
  try {
    const sheet = getSheet('Users');
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][1] === data.username && rows[i][2] === data.password) {
        if (rows[i][6] !== 'active') {
          return { success: false, message: 'บัญชีนี้ถูกระงับการใช้งาน' };
        }
        return {
          success: true,
          role: rows[i][4],
          displayName: rows[i][3],
          department: rows[i][5],
          username: rows[i][1]
        };
      }
    }
    if (data.password === ADMIN_PASSWORD && !data.username) {
      return { success: true, role: 'admin', displayName: 'ผู้ดูแลระบบ', username: 'admin' };
    }
    return { success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
  } catch (error) {
    if (data.password === ADMIN_PASSWORD && !data.username) {
      return { success: true, role: 'admin', displayName: 'ผู้ดูแลระบบ', username: 'admin' };
    }
    return { success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
  }
}

function getUsers(data) {
  try {
    const sheet = getSheet('Users');
    const rows = sheet.getDataRange().getValues();
    let users = [];
    for (let i = 1; i < rows.length; i++) {
      const user = {
        id: i + 1,
        timestamp: rows[i][0],
        username: rows[i][1],
        displayName: rows[i][3],
        role: rows[i][4],
        department: rows[i][5],
        status: rows[i][6]
      };
      if (data) {
        if (data.role && user.role !== data.role) continue;
        if (data.status && user.status !== data.status) continue;
      }
      users.push(user);
    }
    users.reverse();
    return { success: true, data: users };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function addUser(data) {
  try {
    const sheet = getSheet('Users');
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][1] === data.username) {
        return { success: false, message: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' };
      }
    }
    const timestamp = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');
    sheet.appendRow([
      timestamp, data.username, data.password, data.displayName,
      data.role || 'teacher', data.department || '', 'active'
    ]);
    return { success: true, message: 'เพิ่มผู้ใช้สำเร็จ' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function updateUser(data) {
  try {
    const sheet = getSheet('Users');
    const row = data.rowNumber;
    if (data.displayName !== undefined) sheet.getRange(row, 4).setValue(data.displayName);
    if (data.role !== undefined) sheet.getRange(row, 5).setValue(data.role);
    if (data.department !== undefined) sheet.getRange(row, 6).setValue(data.department);
    if (data.password !== undefined && data.password !== '') {
      sheet.getRange(row, 3).setValue(data.password);
    }
    return { success: true, message: 'อัพเดทผู้ใช้สำเร็จ' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function deleteUser(data) {
  try {
    const sheet = getSheet('Users');
    const rows = sheet.getDataRange().getValues();
    if (rows[data.rowNumber - 1] && rows[data.rowNumber - 1][4] === 'admin') {
      const adminCount = rows.filter((r, i) => i > 0 && r[4] === 'admin').length;
      if (adminCount <= 1) {
        return { success: false, message: 'ไม่สามารถลบผู้ดูแลระบบคนสุดท้ายได้' };
      }
    }
    sheet.deleteRow(data.rowNumber);
    return { success: true, message: 'ลบผู้ใช้สำเร็จ' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function toggleUserStatus(data) {
  try {
    const sheet = getSheet('Users');
    const rows = sheet.getDataRange().getValues();
    const currentStatus = rows[data.rowNumber - 1] ? rows[data.rowNumber - 1][6] : '';
    if (rows[data.rowNumber - 1] && rows[data.rowNumber - 1][4] === 'admin') {
      const adminCount = rows.filter((r, i) => i > 0 && r[4] === 'admin' && r[6] === 'active').length;
      if (currentStatus === 'active' && adminCount <= 1) {
        return { success: false, message: 'ไม่สามารถระงับผู้ดูแลระบบคนสุดท้ายได้' };
      }
    }
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    sheet.getRange(data.rowNumber, 7).setValue(newStatus);
    return { success: true, message: newStatus === 'active' ? 'เปิดใช้งานแล้ว' : 'ระงับการใช้งานแล้ว' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function addBooking(data) {
  try {
    const sheet = getSheet('Booking');
    const bookingId = createBookingId();
    const timestamp = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');

    const conflicts = sheet.getDataRange().getValues().filter((row, i) => {
      if (i === 0) return false;
      return toDateString(row[1]) === data.date &&
             row[2] === data.time &&
             row[5] === data.period &&
             row[9] === data.room &&
             row[10] !== 'ปฏิเสธ';
    });

    if (conflicts.length > 0) {
      return { success: false, message: 'วัน เวลา คาบ และห้องเรียนนี้มีการจองแล้ว' };
    }

    sheet.appendRow([
      timestamp, data.date, data.time, data.teacherName, data.department,
      data.period, data.subjectName, data.subjectCode, data.classLevel, data.room, 'รอดำเนินการ'
    ]);

    return { success: true, message: 'จองวันนิเทศสำเร็จ', bookingId: bookingId };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function getBookings(data) {
  try {
    const sheet = getSheet('Booking');
    const rows = sheet.getDataRange().getValues();
    let bookings = [];

    for (let i = 1; i < rows.length; i++) {
      const booking = {
        id: i + 1,
        timestamp: rows[i][0],
        date: toDateString(rows[i][1]),
        time: rows[i][2],
        teacherName: rows[i][3],
        department: rows[i][4],
        period: rows[i][5],
        subjectName: rows[i][6],
        subjectCode: rows[i][7],
        classLevel: rows[i][8],
        room: rows[i][9],
        status: rows[i][10]
      };

      if (data) {
        if (data.teacherName && booking.teacherName !== data.teacherName) continue;
        if (data.status && booking.status !== data.status) continue;
        if (data.department && booking.department !== data.department) continue;
        if (data.date && booking.date !== data.date) continue;
        if (data.month && !booking.date.startsWith(data.month)) continue;
      }
      bookings.push(booking);
    }

    bookings.reverse();
    return { success: true, data: bookings };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function updateBookingStatus(data) {
  try {
    const sheet = getSheet('Booking');
    const row = sheet.getRange(data.rowNumber, 11);
    row.setValue(data.status);
    return { success: true, message: 'อัพเดทสถานะสำเร็จ' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function deleteBooking(data) {
  try {
    const sheet = getSheet('Booking');
    sheet.deleteRow(data.rowNumber);
    return { success: true, message: 'ลบการจองสำเร็จ' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function addFile(data) {
  try {
    const sheet = getSheet('Files');
    const timestamp = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');

    sheet.appendRow([
      timestamp, data.teacherName, data.bookingId || '',
      data.fileType, data.fileName, data.fileUrl,
      data.driveFileId || '', 'รอตรวจสอบ', data.adminNote || ''
    ]);

    return { success: true, message: 'บันทึกไฟล์สำเร็จ' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function uploadFileToDrive(base64Data, fileName, fileType) {
  try {
    const folders = getDriveFolder();
    let folder;
    switch (fileType) {
      case 'แผนการสอน': folder = folders.Plans; break;
      case 'สื่อการสอน': folder = folders.Media; break;
      case 'ภาพกิจกรรม': folder = folders.Photos; break;
      case 'คลิปวิดีโอ': folder = folders.Clips; break;
      default: folder = folders.Plans;
    }

    const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), getMimeType(fileName), fileName);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return {
      success: true,
      fileId: file.getId(),
      fileUrl: file.getUrl(),
      fileName: file.getName()
    };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function getMimeType(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  const mimeTypes = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
    'gif': 'image/gif', 'mp4': 'video/mp4'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

function getFiles(data) {
  try {
    const sheet = getSheet('Files');
    const rows = sheet.getDataRange().getValues();
    let files = [];

    for (let i = 1; i < rows.length; i++) {
      const file = {
        id: i + 1,
        timestamp: rows[i][0],
        teacherName: rows[i][1],
        bookingId: rows[i][2],
        fileType: rows[i][3],
        fileName: rows[i][4],
        fileUrl: rows[i][5],
        driveFileId: rows[i][6],
        status: rows[i][7],
        adminNote: rows[i][8]
      };

      if (data) {
        if (data.teacherName && file.teacherName !== data.teacherName) continue;
        if (data.status && file.status !== data.status) continue;
        if (data.fileType && file.fileType !== data.fileType) continue;
      }

      files.push(file);
    }

    files.reverse();
    return { success: true, data: files };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function updateFileStatus(data) {
  try {
    const sheet = getSheet('Files');
    sheet.getRange(data.rowNumber, 8).setValue(data.status);
    if (data.adminNote !== undefined) {
      sheet.getRange(data.rowNumber, 9).setValue(data.adminNote);
    }
    return { success: true, message: 'อัพเดทสถานะไฟล์สำเร็จ' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function deleteFile(data) {
  try {
    const sheet = getSheet('Files');
    if (data.driveFileId) {
      try { DriveApp.getFileById(data.driveFileId).setTrashed(true); } catch (e) {}
    }
    sheet.deleteRow(data.rowNumber);
    return { success: true, message: 'ลบไฟล์สำเร็จ' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function addSupervision(data) {
  try {
    const sheet = getSheet('Supervision');
    const timestamp = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');
    const scoresStr = Array.isArray(data.scores) ? data.scores.join(',') : String(data.scores || '');

    sheet.appendRow([
      timestamp, data.supervisionType || '', data.supervisorName || '', data.teacherName,
      data.department, data.gradeLevel || '', data.period || '', data.teachingDate,
      data.topic || '', data.techniques || '', scoresStr,
      data.totalScore || 0, data.percent !== undefined ? data.percent : (data.totalScore || 0),
      data.qualityLevel || '',
      data.strengths || '', data.improvements || '', data.suggestions || '',
      data.evidenceUrl || ''
    ]);

    return { success: true, message: 'บันทึกผลการประเมินสำเร็จ' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function getSupervisions(data) {
  try {
    const sheet = getSheet('Supervision');
    const rows = sheet.getDataRange().getValues();
    let supervisions = [];

    for (let i = 1; i < rows.length; i++) {
      const sup = {
        id: i + 1,
        timestamp: rows[i][0],
        supervisionType: rows[i][1],
        supervisorName: rows[i][2],
        teacherName: rows[i][3],
        department: rows[i][4],
        gradeLevel: rows[i][5],
        period: rows[i][6],
        teachingDate: toDateString(rows[i][7]),
        topic: rows[i][8],
        techniques: rows[i][9],
        scores: rows[i][10],
        totalScore: Number(rows[i][11]) || 0,
        percent: Number(rows[i][12]) || 0,
        qualityLevel: rows[i][13],
        strengths: rows[i][14],
        improvements: rows[i][15],
        suggestions: rows[i][16],
        evidenceUrl: rows[i][17]
      };

      if (data) {
        if (data.teacherName && sup.teacherName !== data.teacherName) continue;
        if (data.department && sup.department !== data.department) continue;
        if (data.month && !String(sup.teachingDate).startsWith(data.month)) continue;
      }

      supervisions.push(sup);
    }

    supervisions.reverse();
    return { success: true, data: supervisions };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function deleteSupervision(data) {
  try {
    const sheet = getSheet('Supervision');
    sheet.deleteRow(data.rowNumber);
    return { success: true, message: 'ลบผลการประเมินสำเร็จ' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function getTeachers() {
  try {
    const sheet = getSheet('Booking');
    const rows = sheet.getDataRange().getValues();
    const teachers = new Set();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][3]) teachers.add(rows[i][3]);
    }
    return { success: true, data: Array.from(teachers).sort() };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function getDashboard() {
  try {
    const bookingSheet = getSheet('Booking');
    const fileSheet = getSheet('Files');
    const supSheet = getSheet('Supervision');

    const bookingRows = bookingSheet.getDataRange().getValues();
    const fileRows = fileSheet.getDataRange().getValues();
    const supRows = supSheet.getDataRange().getValues();

    const today = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
    const thisMonth = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM');

    let stats = {
      totalBookings: 0,
      pendingBookings: 0,
      confirmedBookings: 0,
      completedBookings: 0,
      rejectedBookings: 0,
      todayBookings: 0,
      totalFiles: 0,
      pendingFiles: 0,
      approvedFiles: 0,
      revisionFiles: 0,
      totalSupervisions: 0,
      thisMonthSupervisions: 0,
      monthlyStats: {},
      departmentStats: {},
      averageScore: 0,
      qualityCounts: {},
      recentSupervisions: [],
      recentBookings: [],
      recentFiles: [],
      calendarEvents: []
    };

    for (let i = 1; i < bookingRows.length; i++) {
      const status = bookingRows[i][10];
      const date = toDateString(bookingRows[i][1]);
      const dept = bookingRows[i][4];

      stats.totalBookings++;
      if (status === 'รอดำเนินการ') stats.pendingBookings++;
      else if (status === 'ยืนยันแล้ว') stats.confirmedBookings++;
      else if (status === 'นิเทศแล้ว') stats.completedBookings++;
      else if (status === 'ปฏิเสธ') stats.rejectedBookings++;
      if (date === today) stats.todayBookings++;

      const month = date.substring(0, 7);
      stats.monthlyStats[month] = (stats.monthlyStats[month] || 0) + 1;
      stats.departmentStats[dept] = (stats.departmentStats[dept] || 0) + 1;

      stats.calendarEvents.push({
        date: date,
        title: bookingRows[i][3] + ' - ' + bookingRows[i][6],
        status: status,
        department: dept
      });

      if (stats.recentBookings.length < 5) {
        stats.recentBookings.push({
          id: i + 1,
          date: date,
          time: bookingRows[i][2],
          teacherName: bookingRows[i][3],
          department: bookingRows[i][4],
          subjectName: bookingRows[i][6],
          room: bookingRows[i][9],
          status: status
        });
      }
    }

    for (let i = 1; i < fileRows.length; i++) {
      const status = fileRows[i][7];
      stats.totalFiles++;
      if (status === 'รอตรวจสอบ') stats.pendingFiles++;
      else if (status === 'ผ่าน') stats.approvedFiles++;
      else if (status === 'ปรับปรุง') stats.revisionFiles++;

      if (stats.recentFiles.length < 5) {
        stats.recentFiles.push({
          id: i + 1,
          timestamp: fileRows[i][0],
          teacherName: fileRows[i][1],
          fileType: fileRows[i][3],
          fileName: fileRows[i][4],
          status: status
        });
      }
    }

    let supScoreSum = 0;
    let supScoreCount = 0;

    for (let i = 1; i < supRows.length; i++) {
      const teachingDate = toDateString(supRows[i][7]);
      stats.totalSupervisions++;
      if (teachingDate.startsWith(thisMonth)) stats.thisMonthSupervisions++;

      const scoreVal = supRows[i][11];
      if (scoreVal !== '' && scoreVal !== undefined && scoreVal !== null) {
        const score = Number(scoreVal) || 0;
        supScoreSum += score;
        supScoreCount++;
        const level = String(supRows[i][13] || 'ไม่ระบุ');
        stats.qualityCounts[level] = (stats.qualityCounts[level] || 0) + 1;
      }

      if (stats.recentSupervisions.length < 5) {
        stats.recentSupervisions.push({
          id: i + 1,
          teachingDate: teachingDate,
          teacherName: supRows[i][3],
          department: supRows[i][4],
          topic: supRows[i][8],
          totalScore: Number(scoreVal) || 0,
          qualityLevel: String(supRows[i][13] || '')
        });
      }
    }

    stats.averageScore = supScoreCount > 0 ? Math.round((supScoreSum / supScoreCount) * 10) / 10 : 0;

    stats.calendarEvents.reverse();
    stats.recentBookings.reverse();
    stats.recentFiles.reverse();
    stats.recentSupervisions.reverse();

    return { success: true, data: stats };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function setupSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheets = ['Booking', 'Files', 'Supervision', 'Users'];
  sheets.forEach(name => getSheet(name));

  const existingSheets = ss.getSheets().map(s => s.getName());
  existingSheets.forEach(name => {
    if (name === 'Sheet1' && sheets.includes('Booking')) {
      try { ss.deleteSheet(ss.getSheetByName('Sheet1')); } catch(e) {}
    }
  });
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('ระบบนิเทศ')
    .addItem('ตั้งค่าชีท', 'setupSheets')
    .addToUi();
}
