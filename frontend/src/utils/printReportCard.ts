interface PrintData {
  schoolName: string;
  schoolMotto: string;
  studentName: string;
  admissionNumber: string;
  gender: string;
  grade: string;
  level: string;
  term: number;
  academicYear: number;
  subjects: { name: string; score: string; level: number; grade: string; remarks: string }[];
  attendance: { total: number; present: number; absent: number; late: number; excused: number };
  teacherComments: string;
  headTeacherComments: string;
  nextTermDate: string;
  schoolPhone: string;
  schoolEmail: string;
}

export function printReportCard(data: PrintData, bulk = false) {
  const win = window.open("", "_blank");
  if (!win) return;

  const avgScore = data.subjects.length > 0
    ? Math.round(data.subjects.reduce((s, sub) => s + (parseFloat(sub.score) || 0), 0) / data.subjects.length)
    : 0;
  const attendanceRate = data.attendance.total > 0
    ? Math.round((data.attendance.present / data.attendance.total) * 100)
    : 0;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Report Card - ${data.studentName} - Term ${data.term} ${data.academicYear}</title>
  <style>
    @page { margin: 15mm 20mm; size: A4; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', 'Inter', Arial, sans-serif; color: #1a1510; font-size: 11pt; line-height: 1.4; }
    .page { max-width: 210mm; margin: 0 auto; padding: 5mm 0; }

    /* Header */
    .header { text-align: center; padding-bottom: 4mm; border-bottom: 3px solid #a9320b; margin-bottom: 5mm; }
    .header h1 { font-size: 18pt; color: #a9320b; letter-spacing: 1px; text-transform: uppercase; }
    .header .motto { font-size: 9pt; color: #7a654d; font-style: italic; margin-top: 1mm; }
    .header .sub { font-size: 8pt; color: #9a8065; margin-top: 0.5mm; }

    /* Student Info */
    .student-info { width: 100%; border-collapse: collapse; margin-bottom: 4mm; font-size: 10pt; }
    .student-info td { padding: 2mm 3mm; border: 1px solid #ded6cc; }
    .student-info .label { font-weight: 600; color: #463a2e; width: 30%; background: #faf8f6; }

    /* Title */
    .report-title { text-align: center; margin: 4mm 0; }
    .report-title h2 { font-size: 14pt; color: #a9320b; text-transform: uppercase; letter-spacing: 2px; }
    .report-title p { font-size: 9pt; color: #7a654d; }

    /* Subjects Table */
    table.subjects { width: 100%; border-collapse: collapse; margin-bottom: 4mm; font-size: 9.5pt; }
    table.subjects th { background: #a9320b; color: white; padding: 2.5mm 3mm; text-align: left; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.5px; }
    table.subjects td { padding: 2mm 3mm; border-bottom: 1px solid #e8e2d9; }
    table.subjects tr:nth-child(even) { background: #faf8f6; }
    table.subjects tr:last-child td { border-bottom: 2px solid #a9320b; }
    .score-col { text-align: center; }
    .grade-col { text-align: center; font-weight: 600; }
    .grade-EE { color: #059669; } .grade-ME { color: #2563eb; } .grade-AP { color: #d97706; } .grade-BE { color: #dc2626; }

    /* Summary */
    .summary-grid { display: flex; gap: 4mm; margin-bottom: 4mm; }
    .summary-box { flex: 1; border: 1px solid #ded6cc; border-radius: 3px; padding: 3mm; text-align: center; }
    .summary-box .value { font-size: 16pt; font-weight: 700; }
    .summary-box .label { font-size: 7pt; color: #7a654d; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 0.5mm; }

    /* Competencies & Values */
    .grid-2 { display: flex; gap: 4mm; margin-bottom: 4mm; }
    .grid-2 > div { flex: 1; border: 1px solid #ded6cc; border-radius: 3px; padding: 3mm; }
    .grid-2 h4 { font-size: 9pt; color: #a9320b; margin-bottom: 2mm; text-transform: uppercase; letter-spacing: 0.5px; }
    .pill { display: inline-block; padding: 1mm 2.5mm; border-radius: 10px; font-size: 8pt; font-weight: 600; margin: 0.5mm; }
    .pill-EE { background: #d1fae5; color: #047857; }
    .pill-ME { background: #dbeafe; color: #1d4ed8; }
    .pill-AP { background: #fef3c7; color: #b45309; }
    .pill-BE { background: #fee2e2; color: #b91c1c; }

    /* Comments */
    .comments { margin-bottom: 4mm; }
    .comments .box { border: 1px solid #ded6cc; border-radius: 3px; padding: 3mm; margin-bottom: 2mm; }
    .comments .box h5 { font-size: 8pt; color: #a9320b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 1mm; }
    .comments .box p { font-size: 9pt; color: #463a2e; line-height: 1.6; }

    /* Signatures */
    .signatures { display: flex; justify-content: space-between; margin-top: 6mm; padding-top: 3mm; border-top: 2px solid #a9320b; }
    .signatures .sig { text-align: center; width: 30%; }
    .signatures .line { border-top: 1px solid #463a2e; margin-top: 12mm; padding-top: 1mm; font-size: 8pt; color: #7a654d; }

    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <div class="header">
    <h1>${data.schoolName}</h1>
    <p class="motto">${data.schoolMotto || "Striving for Excellence"}</p>
    <p class="sub">P.O. Box · ${data.schoolPhone || ""} · ${data.schoolEmail || ""}</p>
  </div>

  <div class="report-title">
    <h2>Learner's Progress Report</h2>
    <p>Competency Based Curriculum (CBC) · Term ${data.term} ${data.academicYear}</p>
  </div>

  <!-- Student Info -->
  <table class="student-info">
    <tr><td class="label">Learner's Name</td><td>${data.studentName}</td><td class="label">Admission No.</td><td>${data.admissionNumber || "—"}</td></tr>
    <tr><td class="label">Grade</td><td>${data.grade}</td><td class="label">Gender</td><td>${data.gender || "—"}</td></tr>
    <tr><td class="label">School Level</td><td>${data.level || "Primary"}</td><td class="label">Term</td><td>${data.term} of ${data.academicYear}</td></tr>
  </table>

  <!-- Subjects -->
  <table class="subjects">
    <thead>
      <tr><th style="width:40%">Learning Area</th><th class="score-col" style="width:15%">Score (%)</th><th class="grade-col" style="width:15%">Grade</th><th style="width:15%">Descriptor</th><th style="width:15%">Teacher's Comment</th></tr>
    </thead>
    <tbody>
      ${data.subjects.map((s) => {
        const desc = s.level >= 4 ? "Exceeding Expectations" : s.level >= 3 ? "Meeting Expectations" : s.level >= 2 ? "Approaching Expectations" : "Below Expectations";
        const cls = s.level >= 4 ? "grade-EE" : s.level >= 3 ? "grade-ME" : s.level >= 2 ? "grade-AP" : "grade-BE";
        return `<tr><td>${s.name}</td><td class="score-col">${s.score || "—"}</td><td class="grade-col ${cls}">${s.grade}</td><td class="grade-col ${cls}" style="font-size:8pt;font-weight:400">${desc}</td><td style="font-size:8pt;color:#7a654d">${s.remarks || "—"}</td></tr>`;
      }).join("")}
    </tbody>
  </table>

  <!-- Summary -->
  <div class="summary-grid">
    <div class="summary-box"><div class="value" style="color:#059669">${avgScore}%</div><div class="label">Average Score</div></div>
    <div class="summary-box"><div class="value" style="color:#a9320b">${data.subjects.length}</div><div class="label">Subjects Taken</div></div>
    <div class="summary-box"><div class="value" style="color:${attendanceRate >= 90 ? '#059669' : attendanceRate >= 75 ? '#d97706' : '#dc2626'}">${attendanceRate}%</div><div class="label">Attendance Rate</div></div>
    <div class="summary-box"><div class="value" style="color:#7a654d">${data.attendance.total}</div><div class="label">School Days</div></div>
  </div>

  <!-- Key Competencies -->
  <div class="grid-2">
    <div>
      <h4>Key Competencies</h4>
      <p style="font-size:8.5pt;color:#463a2e;line-height:1.8">
        <span class="pill pill-EE">Communication</span>
        <span class="pill pill-ME">Collaboration</span>
        <span class="pill pill-ME">Critical Thinking</span>
        <span class="pill pill-EE">Creativity</span>
        <span class="pill pill-ME">Citizenship</span>
        <span class="pill pill-AP">Digital Literacy</span>
        <span class="pill pill-EE">Self-Efficacy</span>
      </p>
    </div>
    <div>
      <h4>Core Values</h4>
      <p style="font-size:8.5pt;color:#463a2e;line-height:1.8">
        <span class="pill pill-EE">Love</span>
        <span class="pill pill-EE">Responsibility</span>
        <span class="pill pill-ME">Respect</span>
        <span class="pill pill-ME">Unity</span>
        <span class="pill pill-EE">Honesty</span>
        <span class="pill pill-ME">Tolerance</span>
        <span class="pill pill-AP">Patriotism</span>
      </p>
    </div>
  </div>

  <!-- Comments -->
  <div class="comments">
    <div class="box">
      <h5>Class Teacher's Remarks</h5>
      <p>${data.teacherComments || "A diligent learner. Keep up the good work."}</p>
    </div>
    <div class="box">
      <h5>Head Teacher's Remarks</h5>
      <p>${data.headTeacherComments || "Progress is commendable. Continue striving for excellence."}</p>
    </div>
  </div>

  <!-- Signatures -->
  <div class="signatures">
    <div class="sig"><div class="line">Class Teacher</div></div>
    <div class="sig"><div class="line">Head Teacher</div></div>
    <div class="sig"><div class="line">Parent / Guardian</div></div>
  </div>

  <p style="text-align:center;font-size:7pt;color:#b5a38c;margin-top:4mm;">
    Generated on ${new Date().toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
    ${bulk ? "· Bulk Print" : ""}
  </p>
</div>
${!bulk ? "<script>window.print();window.close();</script>" : ""}
</body>
</html>`;

  win.document.write(html);
  win.document.close();
}
