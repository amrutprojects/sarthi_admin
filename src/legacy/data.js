/* =========================================================
   AMRUT x SUMAGO - Mock data service layer
   Deterministic, seeded, internally consistent demo dataset.
   Replaceable 1:1 by a real REST/GraphQL layer (AS.db.* readers).
   ========================================================= */
(function () {
  'use strict';
  var AS = (window.AS = window.AS || {});

  /* ---------- seeded RNG ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var R = mulberry32(20260907);
  function ri(a, b) { return Math.floor(R() * (b - a + 1)) + a; }
  function pick(a) { return a[Math.floor(R() * a.length)]; }
  function chance(p) { return R() < p; }

  /* ---------- configurable project parameters ---------- */
  var config = {
    projectName: 'AMRUT x SUMAGO Skill Development Programme',
    shortName: 'AMRUT x SUMAGO',
    implementingAgency: 'SUMAGO INFOTECH PVT LTD',
    state: 'Maharashtra',
    target: 1000,
    batchSize: 40,
    plannedBatches: 25,
    plannedCentres: 10,
    trainerPool: 12,
    coordinators: 5,
    perStudentValue: 18000,
    coepChargePercent: 3,
    trainingWeeks: 12,
    sessionsPerBatch: 60,
    minAttendancePct: 75,
    passMarkPct: 50,
    projectStart: '2026-04-01',
    projectEnd: '2027-03-31',
    asOf: '2026-09-07',
    mapProvider: 'Built-in schematic vector map (no API key required)',
    lmsName: 'SUMAGO LMS',
    appName: 'SUMAGO Student App',
    demoMode: true
  };

  /* ---------- candidate status engine ---------- */
  var STATUS = [
    { k: 'LEAD', l: 'Lead', tone: 'grey', stage: 1 },
    { k: 'ENQUIRY', l: 'Enquiry', tone: 'grey', stage: 2 },
    { k: 'APPLICATION_STARTED', l: 'Application Started', tone: 'grey', stage: 3 },
    { k: 'APPLICATION_SUBMITTED', l: 'Application Submitted', tone: 'blue', stage: 4 },
    { k: 'DOCUMENTS_PENDING', l: 'Documents Pending', tone: 'amber', stage: 5 },
    { k: 'DOCUMENTS_SUBMITTED', l: 'Documents Submitted', tone: 'blue', stage: 6 },
    { k: 'UNDER_VERIFICATION', l: 'Under Verification', tone: 'amber', stage: 7 },
    { k: 'ELIGIBILITY_VERIFIED', l: 'Eligibility Verified', tone: 'blue', stage: 8 },
    { k: 'ELIGIBLE', l: 'Eligible', tone: 'green', stage: 9 },
    { k: 'NOT_ELIGIBLE', l: 'Not Eligible', tone: 'red', stage: 9 },
    { k: 'APPROVED', l: 'Approved', tone: 'green', stage: 10 },
    { k: 'ENROLLED', l: 'Enrolled', tone: 'green', stage: 11 },
    { k: 'BATCH_ALLOCATED', l: 'Batch Allocated', tone: 'blue', stage: 12 },
    { k: 'TRAINING_STARTED', l: 'Training Started', tone: 'blue', stage: 13 },
    { k: 'TRAINING_ACTIVE', l: 'Training Active', tone: 'blue', stage: 14 },
    { k: 'TRAINING_COMPLETED', l: 'Training Completed', tone: 'green', stage: 15 },
    { k: 'ASSESSMENT_PENDING', l: 'Assessment Pending', tone: 'amber', stage: 16 },
    { k: 'ASSESSMENT_ATTEMPTED', l: 'Assessment Attempted', tone: 'blue', stage: 17 },
    { k: 'PASSED', l: 'Passed', tone: 'green', stage: 18 },
    { k: 'FAILED', l: 'Failed', tone: 'red', stage: 18 },
    { k: 'CERTIFICATE_GENERATED', l: 'Certificate Generated', tone: 'blue', stage: 19 },
    { k: 'CERTIFIED', l: 'Certified', tone: 'green', stage: 20 },
    { k: 'DROPPED', l: 'Dropped', tone: 'red', stage: 0 },
    { k: 'WITHDRAWN', l: 'Withdrawn', tone: 'grey', stage: 0 }
  ];
  var STATUS_MAP = {};
  STATUS.forEach(function (s) { STATUS_MAP[s.k] = s; });

  /* ---------- roles ---------- */
  var ROLES = [
    { k: 'SUPER_ADMIN', l: 'Super Admin', scope: 'Full system access', perms: ['all'] },
    { k: 'AMRUT_ADMIN', l: 'AMRUT Admin', scope: 'State-level oversight, read + approve', perms: ['view.all', 'approve.centre', 'reports.all'] },
    { k: 'PROJECT_DIRECTOR', l: 'SUMAGO Project Director', scope: 'Full programme, finance visible', perms: ['view.all', 'finance.view', 'reports.all', 'admin.config'] },
    { k: 'PMO', l: 'SUMAGO PMO', scope: 'State-level operations', perms: ['view.all', 'tasks.manage', 'batch.manage'] },
    { k: 'DISTRICT_COORD', l: 'District Coordinator', scope: 'Assigned districts and their centres', perms: ['view.district', 'tasks.manage', 'attendance.view'] },
    { k: 'CENTRE_MANAGER', l: 'Centre Manager', scope: 'Own centre, batches, students', perms: ['view.centre', 'attendance.mark', 'batch.manage'] },
    { k: 'TRAINER', l: 'Trainer', scope: 'Assigned batches only', perms: ['view.batch', 'attendance.mark', 'session.close'] },
    { k: 'ONLINE_MANAGER', l: 'Online Training Manager', scope: 'Online mode, LMS, online batches', perms: ['view.online', 'lms.manage', 'batch.manage'] },
    { k: 'MIS_MANAGER', l: 'MIS Manager', scope: 'Reports, exports, data quality', perms: ['view.all', 'reports.all', 'export.all'] },
    { k: 'QA_MANAGER', l: 'QA Manager', scope: 'Inspections, centre scoring', perms: ['view.all', 'qa.manage'] },
    { k: 'FINANCE_USER', l: 'Finance User', scope: 'Finance and payment milestones', perms: ['finance.view', 'finance.manage'] },
    { k: 'MARKETING_USER', l: 'Marketing User', scope: 'Campaigns, leads, content', perms: ['marketing.manage', 'view.mobilization'] },
    { k: 'HELPDESK', l: 'Helpdesk', scope: 'Candidate support, communications', perms: ['view.candidate', 'comms.send'] },
    { k: 'VIEWER', l: 'Read-only Viewer', scope: 'Read-only dashboards', perms: ['view.all'] }
  ];

  /* ---------- 36 districts (schematic map coordinates) ---------- */
  var D = [
    ['Nandurbar', 'NDB', 3, 0, 'Khandesh'], ['Dhule', 'DHU', 4, 0, 'Khandesh'],
    ['Jalgaon', 'JAL', 5, 0, 'Khandesh'], ['Buldhana', 'BUL', 6, 0, 'Vidarbha'],
    ['Akola', 'AKO', 7, 0, 'Vidarbha'], ['Amravati', 'AMR', 8, 0, 'Vidarbha'],
    ['Nagpur', 'NAG', 10, 0, 'Vidarbha'], ['Bhandara', 'BHA', 11, 0, 'Vidarbha'],
    ['Gondia', 'GON', 12, 0, 'Vidarbha'],
    ['Palghar', 'PAL', 2, 1, 'Konkan'], ['Nashik', 'NAS', 4, 1, 'North Maharashtra'],
    ['Washim', 'WAS', 7, 1, 'Vidarbha'], ['Yavatmal', 'YAV', 8, 1, 'Vidarbha'],
    ['Wardha', 'WAR', 9, 1, 'Vidarbha'], ['Chandrapur', 'CHA', 11, 1, 'Vidarbha'],
    ['Gadchiroli', 'GAD', 12, 1, 'Vidarbha'],
    ['Mumbai Suburban', 'MUS', 1, 2, 'Konkan'], ['Thane', 'THA', 2, 2, 'Konkan'],
    ['Chhatrapati Sambhajinagar', 'CSN', 5, 2, 'Marathwada'], ['Jalna', 'JLN', 6, 2, 'Marathwada'],
    ['Hingoli', 'HIN', 7, 2, 'Marathwada'], ['Parbhani', 'PAR', 8, 2, 'Marathwada'],
    ['Nanded', 'NAN', 9, 2, 'Marathwada'],
    ['Mumbai City', 'MUC', 1, 3, 'Konkan'], ['Raigad', 'RAI', 2, 3, 'Konkan'],
    ['Pune', 'PUN', 3, 3, 'Western Maharashtra'], ['Ahilyanagar', 'AHL', 4, 3, 'Western Maharashtra'],
    ['Beed', 'BEE', 5, 3, 'Marathwada'], ['Latur', 'LAT', 7, 3, 'Marathwada'],
    ['Dharashiv', 'DHA', 8, 3, 'Marathwada'],
    ['Ratnagiri', 'RAT', 2, 4, 'Konkan'], ['Satara', 'SAT', 3, 4, 'Western Maharashtra'],
    ['Solapur', 'SOL', 5, 4, 'Western Maharashtra'],
    ['Sindhudurg', 'SIN', 2, 5, 'Konkan'], ['Kolhapur', 'KOL', 3, 5, 'Western Maharashtra'],
    ['Sangli', 'SAN', 4, 5, 'Western Maharashtra']
  ];

  var TALUKAS = {
    PUN: ['Haveli', 'Baramati', 'Maval', 'Shirur', 'Junnar', 'Mulshi'],
    NAS: ['Nashik', 'Malegaon', 'Sinnar', 'Niphad', 'Dindori', 'Igatpuri'],
    THA: ['Thane', 'Kalyan', 'Bhiwandi', 'Ambernath', 'Murbad', 'Shahapur'],
    AHL: ['Nagar', 'Sangamner', 'Shrirampur', 'Rahuri', 'Parner', 'Karjat'],
    BEE: ['Beed', 'Georai', 'Majalgaon', 'Ambajogai', 'Parli', 'Ashti'],
    SAT: ['Satara', 'Karad', 'Wai', 'Phaltan', 'Koregaon', 'Patan'],
    CSN: ['Chh. Sambhajinagar', 'Paithan', 'Vaijapur', 'Gangapur', 'Sillod', 'Kannad'],
    NAN: ['Nanded', 'Deglur', 'Kinwat', 'Hadgaon', 'Mukhed', 'Biloli'],
    JAL: ['Jalgaon', 'Bhusawal', 'Chalisgaon', 'Amalner', 'Pachora', 'Raver'],
    KOL: ['Karvir', 'Hatkanangle', 'Shirol', 'Panhala', 'Gadhinglaj', 'Kagal'],
    MUC: ['Colaba', 'Byculla', 'Dadar', 'Worli'],
    MUS: ['Andheri', 'Borivali', 'Kurla', 'Bandra'],
    PAL: ['Palghar', 'Vasai', 'Dahanu', 'Wada'],
    RAI: ['Alibag', 'Panvel', 'Pen', 'Mahad'],
    RAT: ['Ratnagiri', 'Chiplun', 'Dapoli', 'Rajapur'],
    SIN: ['Kudal', 'Sawantwadi', 'Kankavli', 'Vengurla'],
    SAN: ['Miraj', 'Tasgaon', 'Walwa', 'Jat'],
    SOL: ['Solapur North', 'Pandharpur', 'Barshi', 'Akkalkot'],
    DHA: ['Dharashiv', 'Tuljapur', 'Bhum', 'Paranda'],
    LAT: ['Latur', 'Ausa', 'Nilanga', 'Udgir'],
    PAR: ['Parbhani', 'Gangakhed', 'Jintur', 'Selu'],
    HIN: ['Hingoli', 'Basmath', 'Kalamnuri', 'Sengaon'],
    JLN: ['Jalna', 'Ambad', 'Bhokardan', 'Partur'],
    DHU: ['Dhule', 'Sakri', 'Shirpur', 'Sindkheda'],
    NDB: ['Nandurbar', 'Shahada', 'Taloda', 'Navapur'],
    BUL: ['Buldhana', 'Khamgaon', 'Malkapur', 'Chikhli'],
    AKO: ['Akola', 'Akot', 'Balapur', 'Murtijapur'],
    WAS: ['Washim', 'Risod', 'Malegaon (Washim)', 'Karanja'],
    AMR: ['Amravati', 'Achalpur', 'Daryapur', 'Morshi'],
    YAV: ['Yavatmal', 'Pusad', 'Wani', 'Darwha'],
    WAR: ['Wardha', 'Hinganghat', 'Arvi', 'Deoli'],
    NAG: ['Nagpur', 'Katol', 'Ramtek', 'Umred'],
    BHA: ['Bhandara', 'Tumsar', 'Pauni', 'Sakoli'],
    GON: ['Gondia', 'Tirora', 'Arjuni Morgaon', 'Deori'],
    GAD: ['Gadchiroli', 'Chamorshi', 'Aheri', 'Armori'],
    CHA: ['Chandrapur', 'Ballarpur', 'Warora', 'Rajura']
  };

  /* Districts hosting an approved offline centre (indicative demo allocation) */
  var CENTRE_DISTRICTS = ['PUN', 'NAS', 'THA', 'AHL', 'BEE', 'SAT', 'CSN', 'NAN', 'JAL', 'KOL'];

  /* ---------- names ---------- */
  var FIRST_M = ['Aarav', 'Aditya', 'Akash', 'Amol', 'Aniket', 'Atharva', 'Chetan', 'Darshan', 'Dnyaneshwar', 'Ganesh', 'Harshal', 'Kunal', 'Mahesh', 'Nilesh', 'Omkar', 'Pratik', 'Prashant', 'Rahul', 'Rohit', 'Sagar', 'Sandeep', 'Shubham', 'Suraj', 'Swapnil', 'Tejas', 'Vaibhav', 'Vishal', 'Yash', 'Nikhil', 'Sarthak', 'Rushikesh', 'Abhijit'];
  var FIRST_F = ['Aditi', 'Aishwarya', 'Ananya', 'Apurva', 'Bhakti', 'Chaitali', 'Dhanashree', 'Gauri', 'Isha', 'Janhavi', 'Ketaki', 'Komal', 'Madhuri', 'Manasi', 'Neha', 'Nikita', 'Pallavi', 'Pooja', 'Prachi', 'Priyanka', 'Rutuja', 'Sakshi', 'Samruddhi', 'Sanika', 'Shraddha', 'Snehal', 'Sonali', 'Tanvi', 'Trupti', 'Vaishnavi', 'Yogita', 'Shivani'];
  var LAST = ['Patil', 'Deshmukh', 'Jadhav', 'Shinde', 'Pawar', 'Kulkarni', 'Joshi', 'More', 'Kadam', 'Chavan', 'Sawant', 'Bhosale', 'Gaikwad', 'Salunkhe', 'Thorat', 'Wagh', 'Mane', 'Nikam', 'Shelke', 'Bansode', 'Kale', 'Ingle', 'Rathod', 'Gadhave', 'Bhoir', 'Khandagale', 'Sutar', 'Dhumal', 'Landge', 'Waghmare'];

  var COURSES = [
    { id: 'CRS-01', name: 'Digital Skills & Computer Applications', hours: 240, mode: 'BOTH' },
    { id: 'CRS-02', name: 'Entrepreneurship & Self-Employment', hours: 180, mode: 'BOTH' },
    { id: 'CRS-03', name: 'IT Support & Hardware Networking', hours: 240, mode: 'OFFLINE' },
    { id: 'CRS-04', name: 'Data Entry & Office Automation', hours: 200, mode: 'BOTH' },
    { id: 'CRS-05', name: 'Digital Marketing Essentials', hours: 180, mode: 'ONLINE' }
  ];

  /* ---------- helpers ---------- */
  function pad(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }
  function dstr(d) { return d.toISOString().slice(0, 10); }
  function addDays(iso, n) { var d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return dstr(d); }
  function daysBetween(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }

  /* =========================================================
     DISTRICTS
     ========================================================= */
  var districts = D.map(function (row, i) {
    var code = row[1];
    var hasCentre = CENTRE_DISTRICTS.indexOf(code) >= 0;
    return {
      id: code, code: code, name: row[0], col: row[2], row: row[3], region: row[4],
      talukas: TALUKAS[code] || ['Taluka 1', 'Taluka 2', 'Taluka 3'],
      hasCentre: hasCentre,
      target: 0, coordinatorId: null, status: 'NOT_STARTED',
      lat: 0, lng: 0
    };
  });
  var districtBy = {};
  districts.forEach(function (d) { districtBy[d.code] = d; });

  /* target distribution: centre districts 80 each = 800; remaining 200 across 26 districts */
  districts.forEach(function (d) { d.target = d.hasCentre ? 80 : 0; });
  (function () {
    var rest = districts.filter(function (d) { return !d.hasCentre; });
    var base = Math.floor(200 / rest.length); // 7
    var left = 200 - base * rest.length;      // 18
    rest.forEach(function (d, i) { d.target = base + (i < left ? 1 : 0); });
  })();

  /* =========================================================
     COORDINATORS (5)
     ========================================================= */
  var coordinators = [
    { id: 'DC-01', name: 'Rajesh Kulkarni', phone: '+91 98XXX 41201', email: 'dc.west@sumago.demo', districts: ['PUN', 'SAT', 'KOL', 'SAN', 'SOL', 'RAT', 'SIN'] },
    { id: 'DC-02', name: 'Sneha Deshmukh', phone: '+91 98XXX 41202', email: 'dc.north@sumago.demo', districts: ['NAS', 'AHL', 'JAL', 'DHU', 'NDB', 'PAL'] },
    { id: 'DC-03', name: 'Amit Jadhav', phone: '+91 98XXX 41203', email: 'dc.konkan@sumago.demo', districts: ['THA', 'MUC', 'MUS', 'RAI'] },
    { id: 'DC-04', name: 'Priya Shinde', phone: '+91 98XXX 41204', email: 'dc.marathwada@sumago.demo', districts: ['CSN', 'BEE', 'JLN', 'LAT', 'DHA', 'PAR', 'HIN', 'NAN'] },
    { id: 'DC-05', name: 'Vikas Thorat', phone: '+91 98XXX 41205', email: 'dc.vidarbha@sumago.demo', districts: ['NAG', 'AMR', 'AKO', 'BUL', 'WAS', 'YAV', 'WAR', 'BHA', 'GON', 'GAD', 'CHA'] }
  ];
  coordinators.forEach(function (c) {
    c.districts.forEach(function (dc) { if (districtBy[dc]) districtBy[dc].coordinatorId = c.id; });
  });

  /* =========================================================
     TRAINING CENTRES (10 offline + 1 central online unit)
     ========================================================= */
  var CENTRE_NAMES = {
    PUN: 'Haveli Skill Development Centre',
    NAS: 'Nashik Institute of Technical Training',
    THA: 'Kalyan Vocational Training Centre',
    AHL: 'Sangamner Rural Skill Centre',
    BEE: 'Ambajogai Skill Academy',
    SAT: 'Karad Technical Training Institute',
    CSN: 'Paithan Skill Development Institute',
    NAN: 'Nanded Digital Skills Centre',
    JAL: 'Bhusawal Industrial Training Centre',
    KOL: 'Karvir Skill Excellence Centre'
  };
  var MANAGERS = ['Sunil Pawar', 'Manisha Joshi', 'Ravindra More', 'Kavita Chavan', 'Ganesh Sawant', 'Deepak Bhosale', 'Anjali Gaikwad', 'Prakash Salunkhe', 'Nitin Wagh', 'Rekha Mane'];

  var centres = CENTRE_DISTRICTS.map(function (dc, i) {
    var d = districtBy[dc];
    var score = [88, 84, 79, 72, 64, 86, 81, 58, 76, 90][i];
    var st = score >= 80 ? 'ACTIVE' : score >= 70 ? 'ACTIVE' : score >= 60 ? 'NEEDS_IMPROVEMENT' : 'NEEDS_IMPROVEMENT';
    return {
      id: 'AMRUT-' + dc + '-C' + pad(i + 1, 2),
      name: CENTRE_NAMES[dc],
      districtId: dc,
      taluka: d.talukas[0],
      mode: 'OFFLINE',
      manager: MANAGERS[i],
      managerPhone: '+91 98XXX 5' + pad(1200 + i, 4),
      email: dc.toLowerCase() + '.centre@amrut-sumago.demo',
      address: d.talukas[0] + ', ' + d.name + ', Maharashtra',
      capacity: 80,
      approvedOn: ['2026-04-14', '2026-04-18', '2026-04-21', '2026-05-04', '2026-05-11', '2026-04-25', '2026-05-02', '2026-05-19', '2026-05-06', '2026-04-16'][i],
      score: score,
      status: st,
      scorecard: {
        'Computer Infrastructure': [25, 22, 21, 18, 15, 24, 22, 12, 19, 25][i],
        'Classroom': [14, 13, 12, 11, 9, 14, 13, 8, 12, 15][i],
        'Working PCs': [14, 13, 12, 11, 8, 14, 12, 9, 11, 14][i],
        'Trainer Availability': [13, 13, 12, 11, 10, 14, 12, 9, 12, 14][i],
        'Internet / Power': [9, 9, 8, 7, 7, 8, 8, 6, 8, 9][i],
        'Accessibility': [5, 4, 4, 4, 4, 4, 4, 3, 4, 5][i],
        'Experience': [3, 4, 4, 4, 4, 4, 4, 4, 4, 4][i],
        'Documentation': [3, 3, 3, 3, 3, 2, 3, 4, 3, 2][i],
        'Institutional Capability': [2, 3, 3, 3, 4, 2, 3, 3, 3, 2][i]
      },
      infra: {
        computers: [32, 28, 26, 22, 16, 30, 26, 14, 24, 34][i],
        classrooms: [3, 2, 2, 2, 1, 3, 2, 1, 2, 3][i],
        internet: ['100 Mbps FTTH', '60 Mbps FTTH', '50 Mbps FTTH', '40 Mbps FTTH', '20 Mbps (unstable)', '100 Mbps FTTH', '60 Mbps FTTH', '15 Mbps (unstable)', '50 Mbps FTTH', '100 Mbps FTTH'][i],
        power: ['DG + UPS', 'UPS', 'UPS', 'UPS', 'None', 'DG + UPS', 'UPS', 'None', 'UPS', 'DG + UPS'][i],
        biometric: i % 3 !== 2
      },
      lat: 0, lng: 0
    };
  });
  var onlineUnit = {
    id: 'AMRUT-ONL-HQ01',
    name: 'SUMAGO Online Training Management Unit',
    districtId: 'NAS', taluka: 'Nashik', mode: 'ONLINE',
    manager: 'Dr. Shweta Kulkarni', managerPhone: '+91 98XXX 50001',
    email: 'online.training@sumago.demo',
    address: 'Central Online Training Cell, Nashik, Maharashtra',
    capacity: 400, approvedOn: '2026-04-10', score: 92, status: 'ACTIVE',
    scorecard: {}, infra: { computers: 40, classrooms: 0, internet: '1 Gbps leased line', power: 'DG + UPS', biometric: false }
  };
  var centreBy = {};
  centres.concat([onlineUnit]).forEach(function (c) { centreBy[c.id] = c; });

  /* =========================================================
     TRAINERS (12)
     ========================================================= */
  var TRAINER_SEED = [
    ['Mahesh Kulkarni', 'M.Sc. Computer Science', 9, 'Digital Skills, Office Automation', 'OFFLINE', 'PUN'],
    ['Pallavi Deshpande', 'MCA', 7, 'Computer Applications', 'OFFLINE', 'NAS'],
    ['Sachin Bhoir', 'B.E. IT', 6, 'Hardware & Networking', 'OFFLINE', 'THA'],
    ['Vaishali Thorat', 'MBA', 8, 'Entrepreneurship', 'OFFLINE', 'AHL'],
    ['Ramesh Shelke', 'B.Sc. IT', 5, 'Data Entry, MS Office', 'OFFLINE', 'BEE'],
    ['Anita Nikam', 'M.C.M.', 10, 'Digital Skills', 'OFFLINE', 'SAT'],
    ['Nilesh Kale', 'B.E. Computer', 6, 'IT Support', 'OFFLINE', 'CSN'],
    ['Sadhana Ingle', 'M.Com, DCA', 4, 'Office Automation', 'OFFLINE', 'NAN'],
    ['Prashant Rathod', 'B.C.A.', 7, 'Computer Applications', 'OFFLINE', 'JAL'],
    ['Sujata Sutar', 'M.Sc. IT', 11, 'Digital Skills, Practical Lab', 'OFFLINE', 'KOL'],
    ['Dr. Amol Kadam', 'Ph.D. Management', 14, 'Entrepreneurship, Expert Talks', 'ONLINE', null],
    ['Snehal Landge', 'MCA', 8, 'Digital Marketing, LMS Delivery', 'ONLINE', null]
  ];
  var trainers = TRAINER_SEED.map(function (t, i) {
    var centre = t[5] ? centres.filter(function (c) { return c.districtId === t[5]; })[0] : onlineUnit;
    var totStatus = i < 9 ? 'CERTIFIED' : i < 11 ? 'COMPLETED' : 'REGISTERED';
    return {
      id: 'TRN-' + pad(i + 1, 3), name: t[0], qualification: t[1], experience: t[2],
      specialization: t[3], mode: t[4], centreId: centre.id, districtId: centre.districtId,
      phone: '+91 98XXX 6' + pad(3100 + i, 4), email: t[0].split(' ').pop().toLowerCase() + '.trainer@sumago.demo',
      totStatus: totStatus,
      totDay1: i < 11, totDay2: i < 10,
      availability: i === 7 ? 'INACTIVE' : i === 4 ? 'BACKUP' : 'ACTIVE',
      sessionsDelivered: [96, 84, 78, 71, 42, 92, 74, 18, 80, 101, 58, 66][i],
      feedback: [4.6, 4.4, 4.2, 4.5, 3.6, 4.7, 4.3, 3.2, 4.1, 4.8, 4.6, 4.4][i],
      score: [92, 88, 84, 87, 66, 94, 85, 58, 82, 96, 90, 86][i],
      batchIds: []
    };
  });
  var trainerBy = {};
  trainers.forEach(function (t) { trainerBy[t.id] = t; });

  /* =========================================================
     BATCHES (25 = 20 offline + 5 online), 40 seats each
     ========================================================= */
  var batches = [];
  (function () {
    var bnum = 0;
    // 20 offline: 2 per centre
    centres.forEach(function (c, ci) {
      for (var k = 1; k <= 2; k++) {
        bnum++;
        var idx = batches.length;
        var start = ['2026-05-04', '2026-05-18', '2026-06-01', '2026-06-15', '2026-06-29', '2026-07-06', '2026-07-13', '2026-07-20'][idx % 8];
        var weeks = config.trainingWeeks;
        var end = addDays(start, weeks * 7);
        var completedBatch = idx < 5;
        batches.push({
          id: 'AMRUT-' + c.districtId + '-C' + pad(ci + 1, 2) + '-B' + pad(bnum, 3),
          mode: 'OFFLINE', centreId: c.id, districtId: c.districtId, taluka: c.taluka,
          courseId: k === 1 ? 'CRS-01' : (ci % 2 === 0 ? 'CRS-03' : 'CRS-04'),
          trainerId: trainers[ci].id,
          seats: config.batchSize, start: start, end: end,
          status: completedBatch ? 'COMPLETED' : (idx === 19 ? 'DELAYED' : (idx >= 17 ? 'UPCOMING' : 'ACTIVE')),
          sessionsPlanned: config.sessionsPerBatch,
          candidateIds: []
        });
        trainers[ci].batchIds.push(batches[batches.length - 1].id);
      }
    });
    // 5 online
    for (var j = 1; j <= 5; j++) {
      bnum++;
      var start2 = ['2026-05-11', '2026-06-08', '2026-06-22', '2026-07-13', '2026-08-03'][j - 1];
      batches.push({
        id: 'AMRUT-ONL-B' + pad(bnum, 3),
        mode: 'ONLINE', centreId: onlineUnit.id, districtId: null, taluka: null,
        courseId: j % 2 === 0 ? 'CRS-05' : 'CRS-02',
        trainerId: trainers[10 + (j % 2)].id,
        seats: config.batchSize, start: start2, end: addDays(start2, config.trainingWeeks * 7),
        status: j <= 1 ? 'COMPLETED' : (j === 5 ? 'UPCOMING' : 'ACTIVE'),
        sessionsPlanned: config.sessionsPerBatch,
        candidateIds: []
      });
      trainers[10 + (j % 2)].batchIds.push(batches[batches.length - 1].id);
    }
  })();
  var batchBy = {};
  batches.forEach(function (b) { batchBy[b.id] = b; });

  /* =========================================================
     CANDIDATES
     Registrations 1245 -> Eligible 1080 -> Enrolled 1000
     Enrolled: TrainingActive 760 + Completed 240
     Completed: AssessmentPending 60 + Assessed 180
     Assessed: Passed 165 + Failed 15
     Passed: Certified 150 + CertificateGenerated 15
     ========================================================= */
  var SOURCES = ['Website', 'Facebook', 'Instagram', 'WhatsApp', 'Events', 'College Outreach', 'Referral', 'Other'];
  var candidates = [];
  var enrolledIdx = 0;

  function makeName() {
    var female = chance(0.44);
    var fn = female ? pick(FIRST_F) : pick(FIRST_M);
    return { name: fn + ' ' + pick(LAST), gender: female ? 'Female' : 'Male' };
  }

  /* --- 1000 enrolled candidates, seat-mapped to batches --- */
  var statusPlan = [];
  function push(n, s) { for (var i = 0; i < n; i++) statusPlan.push(s); }
  push(120, 'BATCH_ALLOCATED');
  push(640, 'TRAINING_ACTIVE');
  push(60, 'ASSESSMENT_PENDING');
  push(15, 'FAILED');
  push(15, 'CERTIFICATE_GENERATED');
  push(150, 'CERTIFIED');
  // total 1000

  /* Seat allocation order.
     Batches are grouped by lifecycle stage so that completed statuses land only in
     completed batches, and within each group seats are interleaved so every batch in
     the group receives a representative mix of outcomes (rather than the first batches
     taking all the certified students). */
  var seatOrder = [];
  (function () {
    var rank = { COMPLETED: 0, ACTIVE: 1, DELAYED: 2, UPCOMING: 3 };
    [0, 1, 2, 3].forEach(function (r) {
      var group = batches.filter(function (b) { return rank[b.status] === r; });
      if (!group.length) return;
      var maxSeats = Math.max.apply(null, group.map(function (b) { return b.seats; }));
      for (var s = 0; s < maxSeats; s++) {
        group.forEach(function (b) { if (s < b.seats) seatOrder.push(b); });
      }
    });
  })();
  /* completed statuses first so they land in COMPLETED batches */
  var ordered = []
    .concat(statusPlan.filter(function (s) { return s === 'CERTIFIED'; }))
    .concat(statusPlan.filter(function (s) { return s === 'CERTIFICATE_GENERATED'; }))
    .concat(statusPlan.filter(function (s) { return s === 'FAILED'; }))
    .concat(statusPlan.filter(function (s) { return s === 'ASSESSMENT_PENDING'; }))
    .concat(statusPlan.filter(function (s) { return s === 'TRAINING_ACTIVE'; }))
    .concat(statusPlan.filter(function (s) { return s === 'BATCH_ALLOCATED'; }));

  /* Online learners are open to every district, so they are allocated against the
     remaining (non-centre) district targets rather than by round-robin. A fixed
     performance factor per district produces a realistic, deterministic spread of
     achievement across the state instead of every district landing on exactly 100%. */
  var onlineQueue = [];
  (function () {
    var factors = [1.25, 1.00, 0.50, 1.00, 1.375, 0.75, 1.125, 1.00, 0.375, 1.25, 0.875, 1.00, 0.625,
      1.125, 1.00, 0.75, 1.25, 0.50, 1.00, 1.125, 0.875, 1.00, 0.625, 1.25, 1.00, 0.75];
    var rest = districts.filter(function (d) { return !d.hasCentre; });
    var alloc = rest.map(function (d, i) { return Math.max(1, Math.round(d.target * factors[i % factors.length])); });
    var diff = 200 - alloc.reduce(function (a, x) { return a + x; }, 0), j = 0;
    while (diff !== 0 && j < 1000) {              // settle to exactly 200 online seats
      var idx = j % alloc.length;
      if (diff > 0) { alloc[idx]++; diff--; }
      else if (alloc[idx] > 1) { alloc[idx]--; diff++; }
      j++;
    }
    rest.forEach(function (d, i) { for (var n = 0; n < alloc[i]; n++) onlineQueue.push(d.code); });
  })();
  var onlinePtr = 0;

  ordered.forEach(function (st, i) {
    var b = seatOrder[i];
    var isOnline = b.mode === 'ONLINE';
    var dc = isOnline ? onlineQueue[onlinePtr++ % onlineQueue.length] : b.districtId;
    var d = districtBy[dc];
    var nm = makeName();
    enrolledIdx++;
    var att = st === 'CERTIFIED' ? ri(80, 98)
      : st === 'CERTIFICATE_GENERATED' ? ri(78, 95)
        : st === 'FAILED' ? ri(58, 76)
          : st === 'ASSESSMENT_PENDING' ? ri(70, 92)
            : st === 'BATCH_ALLOCATED' ? 0
              : ri(52, 99);
    var prog = st === 'BATCH_ALLOCATED' ? 0
      : st === 'TRAINING_ACTIVE' ? ri(18, 92)
        : 100;
    var c = {
      id: 'AMRUT-' + dc + '-' + pad(enrolledIdx, 4),
      name: nm.name, gender: nm.gender, age: ri(18, 34),
      phone: '+91 9' + ri(1, 9) + 'XXX ' + pad(ri(10000, 99999), 5),
      email: nm.name.toLowerCase().replace(/[^a-z]/g, '.') + '@mail.demo',
      districtId: dc, taluka: pick(d.talukas),
      mode: b.mode, centreId: b.centreId, batchId: b.id, courseId: b.courseId,
      status: st, source: pick(SOURCES),
      appliedOn: addDays(b.start, -ri(18, 46)),
      enrolledOn: addDays(b.start, -ri(2, 12)),
      attendance: att, progress: prog,
      qualification: pick(['12th Pass', 'Diploma', 'Graduate', 'ITI', 'Post Graduate']),
      docs: { aadhaar: true, photo: true, education: true, income: chance(0.9), bank: chance(0.94) },
      score: null, certificateNo: null, lastActivity: null, risks: []
    };
    b.candidateIds.push(c.id);
    candidates.push(c);
  });

  /* --- 245 non-enrolled registrations --- */
  var nonEnrolled = []
    .concat(new Array(165).fill('NOT_ELIGIBLE'))
    .concat(new Array(32).fill('DOCUMENTS_PENDING'))
    .concat(new Array(28).fill('UNDER_VERIFICATION'))
    .concat(new Array(20).fill('ELIGIBLE'));
  nonEnrolled.forEach(function (st, i) {
    var d = districts[(i * 7) % districts.length];
    var nm = makeName();
    var c = {
      id: 'AMRUT-' + d.code + '-A' + pad(i + 1, 4),
      name: nm.name, gender: nm.gender, age: ri(18, 36),
      phone: '+91 9' + ri(1, 9) + 'XXX ' + pad(ri(10000, 99999), 5),
      email: nm.name.toLowerCase().replace(/[^a-z]/g, '.') + '@mail.demo',
      districtId: d.code, taluka: pick(d.talukas),
      mode: chance(0.7) ? 'OFFLINE' : 'ONLINE', centreId: null, batchId: null, courseId: null,
      status: st, source: pick(SOURCES),
      appliedOn: addDays('2026-06-01', ri(0, 92)), enrolledOn: null,
      attendance: 0, progress: 0,
      qualification: pick(['12th Pass', 'Diploma', 'Graduate', 'ITI', '10th Pass']),
      docs: {
        aadhaar: st !== 'DOCUMENTS_PENDING', photo: true,
        education: st !== 'DOCUMENTS_PENDING', income: st === 'ELIGIBLE', bank: st === 'ELIGIBLE'
      },
      score: null, certificateNo: null, lastActivity: null, risks: []
    };
    if (st === 'NOT_ELIGIBLE') c.rejectReason = pick(['Age above programme limit', 'Minimum qualification not met', 'Duplicate application', 'Outside programme district', 'Documents not valid']);
    candidates.push(c);
  });

  /* --- derived per-candidate values --- */
  var certNo = 0;
  candidates.forEach(function (c) {
    var s = c.status;
    if (s === 'CERTIFIED' || s === 'CERTIFICATE_GENERATED' || s === 'FAILED' || s === 'ASSESSMENT_ATTEMPTED') {
      c.score = s === 'FAILED' ? ri(28, 48) : ri(52, 96);
    }
    if (s === 'CERTIFIED' || s === 'CERTIFICATE_GENERATED') {
      certNo++;
      c.certificateNo = 'AMRUT/SUM/2026/' + pad(certNo, 5);
    }
    c.lastActivity = s === 'BATCH_ALLOCATED' ? addDays(config.asOf, -ri(1, 9))
      : s === 'TRAINING_ACTIVE' ? addDays(config.asOf, -ri(0, 14))
        : addDays(config.asOf, -ri(1, 40));
    // risk engine
    if (c.status === 'TRAINING_ACTIVE') {
      if (c.attendance < 65) c.risks.push({ k: 'ATTENDANCE', l: 'Attendance below 65%', tone: 'red' });
      else if (c.attendance < 75) c.risks.push({ k: 'ATTENDANCE', l: 'Attendance below programme minimum (75%)', tone: 'amber' });
      if (c.mode === 'ONLINE' && daysBetween(c.lastActivity, config.asOf) > 9) c.risks.push({ k: 'INACTIVE', l: 'No LMS activity for ' + daysBetween(c.lastActivity, config.asOf) + ' days', tone: 'amber' });
      if (c.progress < 30 && c.attendance > 0) c.risks.push({ k: 'PROGRESS', l: 'Curriculum progress behind schedule', tone: 'amber' });
    }
    if (c.status === 'ASSESSMENT_PENDING' && daysBetween(c.lastActivity, config.asOf) > 20) c.risks.push({ k: 'ASSESSMENT', l: 'Assessment not scheduled for 20+ days', tone: 'amber' });
    if (c.status === 'DOCUMENTS_PENDING') c.risks.push({ k: 'DOCS', l: 'Mandatory documents pending', tone: 'amber' });
  });

  var candidateBy = {};
  candidates.forEach(function (c) { candidateBy[c.id] = c; });

  /* =========================================================
     DERIVED AGGREGATES (single source of truth for all KPIs)
     ========================================================= */
  var ENROLLED_STATUSES = ['BATCH_ALLOCATED', 'TRAINING_STARTED', 'TRAINING_ACTIVE', 'TRAINING_COMPLETED', 'ASSESSMENT_PENDING', 'ASSESSMENT_ATTEMPTED', 'PASSED', 'FAILED', 'CERTIFICATE_GENERATED', 'CERTIFIED'];
  var ACTIVE_STATUSES = ['BATCH_ALLOCATED', 'TRAINING_STARTED', 'TRAINING_ACTIVE'];
  var COMPLETED_STATUSES = ['TRAINING_COMPLETED', 'ASSESSMENT_PENDING', 'ASSESSMENT_ATTEMPTED', 'PASSED', 'FAILED', 'CERTIFICATE_GENERATED', 'CERTIFIED'];
  var ASSESSED_STATUSES = ['ASSESSMENT_ATTEMPTED', 'PASSED', 'FAILED', 'CERTIFICATE_GENERATED', 'CERTIFIED'];
  var PASSED_STATUSES = ['PASSED', 'CERTIFICATE_GENERATED', 'CERTIFIED'];
  var CERTIFIED_STATUSES = ['CERTIFICATE_GENERATED', 'CERTIFIED'];
  var NOT_ELIGIBLE = ['NOT_ELIGIBLE'];

  function inSet(set, s) { return set.indexOf(s) >= 0; }

  /**
   * Compute the full KPI set for any candidate subset.
   * All dashboards use this so numbers can never disagree.
   */
  function kpis(rows, target) {
    var k = {
      target: target || 0,
      applications: rows.length,
      eligible: 0, notEligible: 0, underVerification: 0, docsPending: 0,
      enrolled: 0, trainingActive: 0, completed: 0, assessed: 0,
      passed: 0, failed: 0, certified: 0, certificatesGenerated: 0,
      offline: 0, online: 0, offlineActive: 0, onlineActive: 0,
      atRisk: 0, attendanceSum: 0, attendanceN: 0, progressSum: 0, progressN: 0
    };
    rows.forEach(function (c) {
      var s = c.status;
      if (inSet(NOT_ELIGIBLE, s)) k.notEligible++; else k.eligible++;
      if (s === 'UNDER_VERIFICATION') k.underVerification++;
      if (s === 'DOCUMENTS_PENDING') k.docsPending++;
      if (inSet(ENROLLED_STATUSES, s)) {
        k.enrolled++;
        if (c.mode === 'OFFLINE') k.offline++; else k.online++;
      }
      if (inSet(ACTIVE_STATUSES, s)) {
        k.trainingActive++;
        if (c.mode === 'OFFLINE') k.offlineActive++; else k.onlineActive++;
        k.progressSum += c.progress; k.progressN++;
        if (c.attendance > 0) { k.attendanceSum += c.attendance; k.attendanceN++; }
      }
      if (inSet(COMPLETED_STATUSES, s)) {
        k.completed++;
        if (c.attendance > 0) { k.attendanceSum += c.attendance; k.attendanceN++; }
      }
      if (inSet(ASSESSED_STATUSES, s)) k.assessed++;
      if (inSet(PASSED_STATUSES, s)) k.passed++;
      if (s === 'FAILED') k.failed++;
      if (inSet(CERTIFIED_STATUSES, s)) k.certified++;
      if (s === 'CERTIFICATE_GENERATED') k.certificatesGenerated++;
      if (c.risks && c.risks.length) k.atRisk++;
    });
    k.attendance = k.attendanceN ? Math.round(k.attendanceSum / k.attendanceN) : 0;
    k.avgProgress = k.progressN ? Math.round(k.progressSum / k.progressN) : 0;
    k.achievementPct = k.target ? Math.round((k.enrolled / k.target) * 100) : 0;
    k.completionPct = k.enrolled ? Math.round((k.completed / k.enrolled) * 100) : 0;
    k.certificationPct = k.enrolled ? Math.round((k.certified / k.enrolled) * 100) : 0;
    k.passRate = k.assessed ? Math.round((k.passed / k.assessed) * 100) : 0;
    return k;
  }

  function byDistrict(dc) { return candidates.filter(function (c) { return c.districtId === dc; }); }
  function byCentre(cid) { return candidates.filter(function (c) { return c.centreId === cid; }); }
  function byBatch(bid) { return candidates.filter(function (c) { return c.batchId === bid; }); }
  function byTaluka(dc, t) { return candidates.filter(function (c) { return c.districtId === dc && c.taluka === t; }); }

  /* district status derived from achievement + activity */
  districts.forEach(function (d) {
    var k = kpis(byDistrict(d.code), d.target);
    d._k = k;
    if (k.enrolled === 0) d.status = 'NOT_STARTED';
    else if (k.achievementPct >= 90) d.status = 'TRAINING_ACTIVE';
    else if (k.achievementPct >= 70) d.status = 'MOBILIZATION';
    else if (k.achievementPct >= 40) d.status = 'CENTRE_SELECTION';
    else d.status = 'CRITICAL';
  });
  /* a small number of demo overrides so the map shows a realistic RAG spread */
  ['BEE', 'NAN'].forEach(function (c) { districtBy[c].status = 'CRITICAL'; });
  ['JAL', 'AHL', 'CSN'].forEach(function (c) { districtBy[c].status = 'MOBILIZATION'; });
  districtBy['GAD'].status = 'ON_HOLD';

  var DISTRICT_STATUS = {
    NOT_STARTED: { l: 'Not Started', tone: 'grey', rag: 'GREY', color: '#94A3B8' },
    PLANNING: { l: 'Planning', tone: 'grey', rag: 'GREY', color: '#94A3B8' },
    CENTRE_SELECTION: { l: 'Centre Selection', tone: 'amber', rag: 'AMBER', color: '#F59E0B' },
    MOBILIZATION: { l: 'Mobilization', tone: 'amber', rag: 'AMBER', color: '#F59E0B' },
    TRAINING_ACTIVE: { l: 'Training Active', tone: 'green', rag: 'GREEN', color: '#16A34A' },
    COMPLETED: { l: 'Completed', tone: 'green', rag: 'GREEN', color: '#15803D' },
    ON_HOLD: { l: 'On Hold', tone: 'grey', rag: 'GREY', color: '#64748B' },
    CRITICAL: { l: 'Critical', tone: 'red', rag: 'RED', color: '#DC2626' }
  };

  /* centre + batch derived stats */
  centres.concat([onlineUnit]).forEach(function (c) {
    var rows = byCentre(c.id);
    c._k = kpis(rows, c.capacity);
    c.batches = batches.filter(function (b) { return b.centreId === c.id; });
    c.activeBatches = c.batches.filter(function (b) { return b.status === 'ACTIVE'; }).length;
    c.students = rows.length;
    c.attendance = c._k.attendance;
  });
  batches.forEach(function (b) {
    var rows = byBatch(b.id);
    b._k = kpis(rows, b.seats);
    b.students = rows.length;
    b.attendance = b._k.attendance;
    b.progress = b.status === 'COMPLETED' ? 100 : b.status === 'UPCOMING' ? 0 : b._k.avgProgress;
    b.sessionsDone = Math.round((b.progress / 100) * b.sessionsPlanned);
  });
  trainers.forEach(function (t) {
    var bs = batches.filter(function (b) { return b.trainerId === t.id; });
    t.batches = bs;
    t.students = bs.reduce(function (a, b) { return a + b.students; }, 0);
    t.attendance = bs.length ? Math.round(bs.reduce(function (a, b) { return a + b.attendance; }, 0) / bs.length) : 0;
  });

  var stateKpis = kpis(candidates, config.target);

  /* =========================================================
     PROGRAMME HEALTH SCORE (system-generated indicator)
     ========================================================= */
  function healthScore() {
    var f = [
      { k: 'Enrollment vs Target', v: Math.min(100, stateKpis.achievementPct), w: 0.20 },
      { k: 'Training Progress', v: stateKpis.avgProgress, w: 0.15 },
      { k: 'Attendance', v: stateKpis.attendance, w: 0.15 },
      { k: 'Completion', v: Math.min(100, Math.round(stateKpis.completed / (config.target * 0.30) * 100)), w: 0.12 },
      { k: 'Certification', v: Math.min(100, Math.round(stateKpis.certified / (config.target * 0.20) * 100)), w: 0.10 },
      { k: 'Centre Performance', v: Math.round(centres.reduce(function (a, c) { return a + c.score; }, 0) / centres.length), w: 0.12 },
      { k: 'Trainer Availability', v: Math.round(trainers.filter(function (t) { return t.availability === 'ACTIVE'; }).length / trainers.length * 100), w: 0.08 },
      { k: 'District Performance', v: Math.round(districts.filter(function (d) { return DISTRICT_STATUS[d.status].rag === 'GREEN'; }).length / districts.length * 100), w: 0.08 }
    ];
    var total = Math.round(f.reduce(function (a, x) { return a + x.v * x.w; }, 0));
    return { score: total, factors: f, status: total >= 80 ? 'Healthy' : total >= 60 ? 'Needs Attention' : 'Critical' };
  }

  /* =========================================================
     MOBILIZATION + MARKETING
     ========================================================= */
  var mobilization = {
    awareness: 186000, reach: 142000, engagement: 38400, websiteVisits: 24800,
    enquiries: 6420, leads: 4180, registrations: candidates.length,
    documents: candidates.filter(function (c) { return c.status !== 'DOCUMENTS_PENDING' && c.status !== 'APPLICATION_SUBMITTED'; }).length,
    verified: stateKpis.eligible, eligible: stateKpis.eligible, enrolled: stateKpis.enrolled
  };
  var leadSources = [
    { s: 'Website', leads: 1080, reg: 402, enr: 331 },
    { s: 'Facebook', leads: 762, reg: 244, enr: 190 },
    { s: 'Instagram', leads: 648, reg: 191, enr: 152 },
    { s: 'WhatsApp', leads: 520, reg: 158, enr: 128 },
    { s: 'College Outreach', leads: 468, reg: 118, enr: 96 },
    { s: 'Events', leads: 340, reg: 66, enr: 51 },
    { s: 'Referral', leads: 248, reg: 44, enr: 36 },
    { s: 'Other', leads: 114, reg: 22, enr: 16 }
  ];
  var campaigns = [
    { id: 'CMP-001', name: 'AMRUT Skill Mission - Launch', platform: 'Facebook', status: 'COMPLETED', spend: 145000, reach: 412000, clicks: 18600, leads: 1240, reg: 402, start: '2026-04-05', end: '2026-05-20' },
    { id: 'CMP-002', name: 'Free Digital Skills Training - Reels', platform: 'Instagram', status: 'ACTIVE', spend: 98000, reach: 286000, clicks: 15200, leads: 962, reg: 291, start: '2026-05-01', end: '2026-10-31' },
    { id: 'CMP-003', name: 'District Outreach - Marathwada', platform: 'Events', status: 'ACTIVE', spend: 210000, reach: 42000, clicks: 0, leads: 486, reg: 172, start: '2026-05-15', end: '2026-11-30' },
    { id: 'CMP-004', name: 'Google Search - Skill Training', platform: 'Paid Ads', status: 'ACTIVE', spend: 132000, reach: 168000, clicks: 21400, leads: 812, reg: 246, start: '2026-04-20', end: '2026-12-31' },
    { id: 'CMP-005', name: 'College Campus Drive', platform: 'College Outreach', status: 'ACTIVE', spend: 86000, reach: 58000, clicks: 0, leads: 604, reg: 178, start: '2026-06-01', end: '2026-11-15' },
    { id: 'CMP-006', name: 'WhatsApp Broadcast - Enrollment', platform: 'WhatsApp', status: 'ACTIVE', spend: 24000, reach: 96000, clicks: 9800, leads: 520, reg: 158, start: '2026-06-10', end: '2026-12-31' },
    { id: 'CMP-007', name: 'Success Stories Series', platform: 'Instagram', status: 'ACTIVE', spend: 42000, reach: 124000, clicks: 6400, leads: 246, reg: 74, start: '2026-07-01', end: '2027-01-31' },
    { id: 'CMP-008', name: 'SEO - Programme Landing Pages', platform: 'SEO', status: 'ACTIVE', spend: 56000, reach: 78000, clicks: 12600, leads: 310, reg: 96, start: '2026-04-01', end: '2027-03-31' }
  ];
  campaigns.forEach(function (c) {
    c.conversion = c.leads ? Math.round((c.reg / c.leads) * 1000) / 10 : 0;
    c.cpl = c.leads ? Math.round(c.spend / c.leads) : 0;
  });

  /* =========================================================
     ALERTS / TASKS
     ========================================================= */
  var lowAttStudents = candidates.filter(function (c) { return c.status === 'TRAINING_ACTIVE' && c.attendance < 75; });
  var tasks = [
    { id: 'TSK-001', title: 'Attendance below 75% for ' + lowAttStudents.length + ' active students', type: 'ATTENDANCE', priority: 'HIGH', owner: 'DC-01', ownerName: 'Rajesh Kulkarni', due: '2026-09-12', status: 'IN_PROGRESS', ref: '#/at-risk', district: null, desc: 'Counselling calls and guardian communication to be completed for all flagged students.' },
    { id: 'TSK-002', title: 'Infrastructure verification pending - Nanded Digital Skills Centre', type: 'CENTRE', priority: 'HIGH', owner: 'QA-01', ownerName: 'Meera Patil', due: '2026-09-10', status: 'OPEN', ref: '#/centres/AMRUT-NAN-C08', district: 'NAN', desc: 'Working PC count and power backup below approved benchmark. Re-inspection required.' },
    { id: 'TSK-003', title: 'Trainer unavailable - Ambajogai Skill Academy', type: 'TRAINER', priority: 'HIGH', owner: 'DC-04', ownerName: 'Priya Shinde', due: '2026-09-09', status: 'OPEN', ref: '#/trainers/TRN-005', district: 'BEE', desc: 'Primary trainer on backup status. Allocate replacement before next session block.' },
    { id: 'TSK-004', title: 'Beed district behind monthly enrollment target', type: 'DISTRICT', priority: 'HIGH', owner: 'DC-04', ownerName: 'Priya Shinde', due: '2026-09-20', status: 'IN_PROGRESS', ref: '#/districts/BEE', district: 'BEE', desc: 'Mobilization drive to be intensified in Ambajogai and Parli talukas.' },
    { id: 'TSK-005', title: '32 candidates with documents pending beyond 15 days', type: 'DOCUMENTS', priority: 'MEDIUM', owner: 'HD-01', ownerName: 'Helpdesk Team', due: '2026-09-15', status: 'IN_PROGRESS', ref: '#/candidates?status=DOCUMENTS_PENDING', district: null, desc: 'SMS + WhatsApp reminder campaign to be triggered from Communication Centre.' },
    { id: 'TSK-006', title: '60 candidates awaiting assessment scheduling', type: 'ASSESSMENT', priority: 'MEDIUM', owner: 'PMO-02', ownerName: 'Anand Kulkarni', due: '2026-09-18', status: 'OPEN', ref: '#/assessments', district: null, desc: 'Publish assessment calendar for completed batches.' },
    { id: 'TSK-007', title: '15 certificates ready for generation', type: 'CERTIFICATION', priority: 'MEDIUM', owner: 'MIS-01', ownerName: 'Sagar Deshpande', due: '2026-09-11', status: 'OPEN', ref: '#/certification', district: null, desc: 'Passed candidates pending certificate issuance and QR registration.' },
    { id: 'TSK-008', title: 'Batch AMRUT-KOL-C10-B020 marked delayed', type: 'BATCH', priority: 'HIGH', owner: 'DC-01', ownerName: 'Rajesh Kulkarni', due: '2026-09-14', status: 'OPEN', ref: '#/batches', district: 'KOL', desc: 'Start date slipped by 12 days. Revised schedule to be uploaded.' },
    { id: 'TSK-009', title: 'MoU renewal - Paithan Skill Development Institute', type: 'DOCUMENTS', priority: 'LOW', owner: 'PMO-01', ownerName: 'Nitin Rane', due: '2026-10-05', status: 'OPEN', ref: '#/documents', district: 'CSN', desc: 'Agreement validity ends 31 Oct 2026.' },
    { id: 'TSK-010', title: 'LMS sync discrepancy - 6 online candidates', type: 'LMS', priority: 'MEDIUM', owner: 'MIS-01', ownerName: 'Sagar Deshpande', due: '2026-09-09', status: 'RESOLVED', ref: '#/lms', district: null, desc: 'Progress records did not sync in last nightly job. Re-run completed.' },
    { id: 'TSK-011', title: 'Quarterly QA inspection - Western cluster', type: 'QA', priority: 'MEDIUM', owner: 'QA-01', ownerName: 'Meera Patil', due: '2026-09-25', status: 'IN_PROGRESS', ref: '#/qa', district: 'PUN', desc: 'Level 3 central QA inspection for Pune, Satara, Kolhapur centres.' },
    { id: 'TSK-012', title: 'Gadchiroli district on hold - centre identification', type: 'DISTRICT', priority: 'LOW', owner: 'DC-05', ownerName: 'Vikas Thorat', due: '2026-10-15', status: 'OPEN', ref: '#/districts/GAD', district: 'GAD', desc: 'No eligible institutional partner identified yet. Online mode being promoted.' },
    { id: 'TSK-013', title: 'Student feedback score below benchmark - Nanded', type: 'CENTRE', priority: 'MEDIUM', owner: 'QA-01', ownerName: 'Meera Patil', due: '2026-09-22', status: 'OPEN', ref: '#/centres/AMRUT-NAN-C08', district: 'NAN', desc: 'Average feedback 3.2/5 against benchmark of 4.0.' },
    { id: 'TSK-014', title: 'September centre payment milestone verification', type: 'FINANCE', priority: 'MEDIUM', owner: 'FIN-01', ownerName: 'Rupali Kadam', due: '2026-09-30', status: 'OPEN', ref: '#/finance', district: null, desc: 'Verify attendance-linked milestone data before releasing tranche.' },
    { id: 'TSK-015', title: 'Update certificate template for 2026-27 cycle', type: 'CERTIFICATION', priority: 'LOW', owner: 'MIS-01', ownerName: 'Sagar Deshpande', due: '2026-10-10', status: 'CLOSED', ref: '#/settings', district: null, desc: 'Approved template applied in system settings.' }
  ];

  var notifications = [
    { id: 'N1', t: lowAttStudents.length + ' students have attendance below 75%', s: 'Attendance monitor - action required', when: '18 min ago', tone: 'amber', link: '#/at-risk' },
    { id: 'N2', t: 'Batch AMRUT-PUN-C01-B001 is nearing completion', s: '92% curriculum delivered', when: '1 hour ago', tone: 'blue', link: '#/batches/AMRUT-PUN-C01-B001' },
    { id: 'N3', t: 'Nanded Digital Skills Centre has pending infrastructure verification', s: 'Centre score 58/100 - below benchmark', when: '3 hours ago', tone: 'red', link: '#/centres/AMRUT-NAN-C08' },
    { id: 'N4', t: '2 districts are behind monthly enrollment target', s: 'Beed, Nanded', when: '5 hours ago', tone: 'amber', link: '#/districts' },
    { id: 'N5', t: '15 certificates are ready for generation', s: 'Passed candidates awaiting issuance', when: 'Yesterday', tone: 'green', link: '#/certification' },
    { id: 'N6', t: 'LMS nightly sync completed', s: '1,000 learner records reconciled', when: 'Yesterday', tone: 'blue', link: '#/lms' },
    { id: 'N7', t: 'New QA inspection scheduled - Western cluster', s: 'Level 3 central QA, 25 Sep 2026', when: '2 days ago', tone: 'blue', link: '#/qa' },
    { id: 'N8', t: '60 candidates awaiting assessment scheduling', s: 'Completed batches pending calendar', when: '2 days ago', tone: 'amber', link: '#/assessments' }
  ];

  /* =========================================================
     DOCUMENTS / AUDIT / INSPECTIONS / PAYMENTS
     ========================================================= */
  var documents = [];
  (function () {
    var cats = [
      ['Student Documents', 'Aadhaar / Photo / Education proof', 'PDF'],
      ['Centre Documents', 'Registration, infrastructure evidence', 'PDF'],
      ['Trainer Documents', 'Qualification, ToT certificate', 'PDF'],
      ['MoU / Agreements', 'Centre agreement', 'PDF'],
      ['Assessment Documents', 'Question bank, result sheets', 'XLSX'],
      ['Reports', 'Monthly progress report', 'PDF'],
      ['Certificates', 'Issued certificates', 'PDF']
    ];
    var owners = centres.map(function (c) { return c.name; }).concat(['Central PMO', 'Online Training Unit']);
    for (var i = 0; i < 46; i++) {
      var c = cats[i % cats.length];
      documents.push({
        id: 'DOC-' + pad(i + 1, 4),
        name: c[0].replace(' Documents', '') + ' - ' + c[1].split(',')[0] + ' ' + (i + 1),
        category: c[0], type: c[2],
        owner: owners[i % owners.length],
        districtId: i % 3 === 0 ? CENTRE_DISTRICTS[i % CENTRE_DISTRICTS.length] : null,
        size: (0.2 + (i % 12) * 0.35).toFixed(1) + ' MB',
        uploaded: addDays('2026-04-15', i * 3),
        status: i % 9 === 0 ? 'REJECTED' : i % 4 === 0 ? 'PENDING' : 'VERIFIED',
        by: pick(['Sagar Deshpande', 'Meera Patil', 'Nitin Rane', 'Rupali Kadam'])
      });
    }
  })();

  var auditLog = [];
  (function () {
    var acts = [
      ['Candidate status changed', 'Candidates', 'TRAINING_ACTIVE', 'TRAINING_COMPLETED'],
      ['Batch created', 'Batches', '-', 'AMRUT-ONL-B025'],
      ['Attendance modified', 'Attendance', 'Absent', 'Excused'],
      ['Certificate generated', 'Certification', '-', 'AMRUT/SUM/2026/00151'],
      ['Centre approved', 'Training Centres', 'PENDING', 'ACTIVE'],
      ['Project target updated', 'Administration', '950', '1000'],
      ['User role assigned', 'User Management', 'VIEWER', 'DISTRICT_COORD'],
      ['Trainer allocated to batch', 'Trainers', '-', 'TRN-006'],
      ['LMS sync executed', 'LMS Integration', '-', 'SUCCESS'],
      ['Campaign budget updated', 'Marketing', 'INR 80,000', 'INR 98,000'],
      ['Document verified', 'Documents', 'PENDING', 'VERIFIED'],
      ['Assessment result uploaded', 'Assessments', '-', '38 records']
    ];
    var users = [['Sagar Deshpande', 'MIS_MANAGER'], ['Nitin Rane', 'PMO'], ['Meera Patil', 'QA_MANAGER'], ['Priya Shinde', 'DISTRICT_COORD'], ['Sunil Pawar', 'CENTRE_MANAGER'], ['Dr. Shweta Kulkarni', 'ONLINE_MANAGER'], ['System', 'SUPER_ADMIN']];
    for (var i = 0; i < 60; i++) {
      var a = acts[i % acts.length], u = users[i % users.length];
      auditLog.push({
        id: 'LOG-' + pad(9000 - i, 5),
        user: u[0], role: u[1], action: a[0], module: a[1],
        oldValue: a[2], newValue: a[3],
        date: addDays('2026-09-07', -Math.floor(i / 3)),
        time: pad(9 + (i % 9), 2) + ':' + pad((i * 7) % 60, 2),
        ip: '10.24.' + (10 + (i % 12)) + '.' + (20 + (i % 40)),
        device: i % 3 === 0 ? 'Windows / Chrome' : i % 3 === 1 ? 'Android / App' : 'Windows / Edge'
      });
    }
  })();

  var inspections = centres.map(function (c, i) {
    var types = ['Pre-Batch', 'During First Batch', 'Random / Surprise', 'Pre-Closure'];
    return {
      id: 'INS-' + pad(i + 1, 3), centreId: c.id, centreName: c.name, districtId: c.districtId,
      level: i % 3 === 0 ? 'LEVEL_3' : i % 3 === 1 ? 'LEVEL_2' : 'LEVEL_1',
      type: types[i % 4],
      scheduled: addDays('2026-09-01', i * 4),
      inspector: ['Meera Patil', 'Ravi Bhosale', 'Anjali Kale'][i % 3],
      status: i < 6 ? 'COMPLETED' : i === 6 ? 'IN_PROGRESS' : 'SCHEDULED',
      score: i < 6 ? c.score : null
    };
  });

  var payments = centres.map(function (c, i) {
    var enrolled = c._k.enrolled, completed = c._k.completed, certified = c._k.certified;
    var rate = config.perStudentValue;
    var m1 = Math.round(enrolled * rate * 0.30);
    var m2 = Math.round(c._k.trainingActive * rate * 0.40);
    var m3 = Math.round(certified * rate * 0.30);
    return {
      id: 'PAY-' + pad(i + 1, 3), centreId: c.id, centreName: c.name, districtId: c.districtId,
      enrolled: enrolled, completed: completed, certified: certified,
      m1: m1, m2: m2, m3: m3,
      committed: m1 + m2 + m3,
      paid: Math.round((m1 + m2) * (i < 6 ? 1 : 0.5)),
      status: i < 6 ? 'PARTIALLY_PAID' : 'PENDING'
    };
  });

  /* =========================================================
     TIME SERIES
     ========================================================= */
  var months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
  var monthly = [
    { m: 'Apr', applications: 96, enrolled: 42, completed: 0, certified: 0, attendance: 0 },
    { m: 'May', applications: 218, enrolled: 186, completed: 0, certified: 0, attendance: 84 },
    { m: 'Jun', applications: 286, enrolled: 232, completed: 0, certified: 0, attendance: 82 },
    { m: 'Jul', applications: 271, enrolled: 224, completed: 62, certified: 0, attendance: 80 },
    { m: 'Aug', applications: 244, enrolled: 196, completed: 108, certified: 74, attendance: 79 },
    { m: 'Sep', applications: 130, enrolled: 120, completed: 70, certified: 91, attendance: 81 }
  ];
  var attendanceTrend = [];
  (function () {
    for (var i = 27; i >= 0; i--) {
      var day = addDays(config.asOf, -i);
      var dow = new Date(day + 'T00:00:00').getDay();
      attendanceTrend.push({ d: day, v: dow === 0 ? 0 : 72 + ((i * 13) % 18), dow: dow });
    }
  })();

  /* =========================================================
     LIVE SESSIONS (today)
     ========================================================= */
  var TOPICS = ['MS Excel - Formulas & Functions', 'Computer Fundamentals & OS', 'Internet, Email & Digital Payments', 'Hardware Assembly - Practical', 'Networking Basics - LAN Setup', 'Business Plan Canvas', 'Digital Marketing - SEO Basics', 'Data Entry Speed Practical', 'Government e-Services & DigiLocker'];
  var liveSessions = batches.filter(function (b) { return b.status === 'ACTIVE'; }).map(function (b, i) {
    var present = Math.max(0, Math.round(b.students * (b.attendance / 100)));
    return {
      id: 'SES-' + pad(i + 1, 3), batchId: b.id, mode: b.mode,
      centreId: b.centreId, districtId: b.districtId,
      trainerId: b.trainerId, topic: TOPICS[i % TOPICS.length],
      start: ['09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00'][i % 7],
      expected: b.students, present: present,
      status: i % 7 === 6 ? 'SCHEDULED' : i % 5 === 4 ? 'COMPLETED' : 'LIVE'
    };
  });

  /* =========================================================
     PMO TEAM
     ========================================================= */
  var pmoTeam = [
    { role: 'Project Director', name: 'Rajendra Sumago', email: 'pd@sumago.demo', tasks: 4, focus: 'Overall delivery, AMRUT liaison' },
    { role: 'Project Manager', name: 'Nitin Rane', email: 'pm@sumago.demo', tasks: 9, focus: 'Districts, centres, batch calendar' },
    { role: 'Academic Manager', name: 'Dr. Shweta Kulkarni', email: 'academic@sumago.demo', tasks: 6, focus: 'Curriculum, ToT, online delivery' },
    { role: 'Operations Manager', name: 'Anand Kulkarni', email: 'ops@sumago.demo', tasks: 11, focus: 'Centre operations, attendance' },
    { role: 'MIS / Technology Manager', name: 'Sagar Deshpande', email: 'mis@sumago.demo', tasks: 7, focus: 'Portal, LMS, app, reporting' },
    { role: 'QA Manager', name: 'Meera Patil', email: 'qa@sumago.demo', tasks: 5, focus: 'Inspections, centre scorecards' },
    { role: 'Finance / Admin', name: 'Rupali Kadam', email: 'finance@sumago.demo', tasks: 3, focus: 'Milestones, payments, compliance' },
    { role: 'Helpdesk / Mobilization', name: 'Helpdesk Team', email: 'helpdesk@sumago.demo', tasks: 14, focus: 'Candidate support, lead follow-up' }
  ];

  /* =========================================================
     DEMO USERS
     ========================================================= */
  var users = [
    { id: 'U01', name: 'Rajendra Sumago', email: 'director@sumago.demo', role: 'PROJECT_DIRECTOR', scopeLabel: 'State - all districts', status: 'ACTIVE' },
    { id: 'U02', name: 'System Administrator', email: 'admin@amrut-sumago.demo', role: 'SUPER_ADMIN', scopeLabel: 'Full system', status: 'ACTIVE' },
    { id: 'U03', name: 'AMRUT Programme Officer', email: 'officer@amrut.demo', role: 'AMRUT_ADMIN', scopeLabel: 'State oversight', status: 'ACTIVE' },
    { id: 'U04', name: 'Nitin Rane', email: 'pm@sumago.demo', role: 'PMO', scopeLabel: 'State - operations', status: 'ACTIVE' },
    { id: 'U05', name: 'Priya Shinde', email: 'dc.marathwada@sumago.demo', role: 'DISTRICT_COORD', scopeLabel: '8 districts (Marathwada)', status: 'ACTIVE' },
    { id: 'U06', name: 'Sunil Pawar', email: 'pun.centre@amrut-sumago.demo', role: 'CENTRE_MANAGER', scopeLabel: 'Haveli Skill Development Centre', status: 'ACTIVE' },
    { id: 'U07', name: 'Mahesh Kulkarni', email: 'kulkarni.trainer@sumago.demo', role: 'TRAINER', scopeLabel: '2 assigned batches', status: 'ACTIVE' },
    { id: 'U08', name: 'Dr. Shweta Kulkarni', email: 'online.training@sumago.demo', role: 'ONLINE_MANAGER', scopeLabel: 'Online mode - 5 batches', status: 'ACTIVE' },
    { id: 'U09', name: 'Sagar Deshpande', email: 'mis@sumago.demo', role: 'MIS_MANAGER', scopeLabel: 'Reports & exports', status: 'ACTIVE' },
    { id: 'U10', name: 'Meera Patil', email: 'qa@sumago.demo', role: 'QA_MANAGER', scopeLabel: 'Quality assurance', status: 'ACTIVE' },
    { id: 'U11', name: 'Rupali Kadam', email: 'finance@sumago.demo', role: 'FINANCE_USER', scopeLabel: 'Finance module', status: 'ACTIVE' },
    { id: 'U12', name: 'Kiran Salunkhe', email: 'marketing@sumago.demo', role: 'MARKETING_USER', scopeLabel: 'Campaigns & leads', status: 'ACTIVE' },
    { id: 'U13', name: 'Helpdesk Team', email: 'helpdesk@sumago.demo', role: 'HELPDESK', scopeLabel: 'Candidate support', status: 'ACTIVE' },
    { id: 'U14', name: 'Audit Viewer', email: 'viewer@amrut.demo', role: 'VIEWER', scopeLabel: 'Read-only', status: 'INACTIVE' }
  ];
  var demoLogins = ['U02', 'U01', 'U04', 'U05', 'U06', 'U07', 'U08'];

  /* =========================================================
     COMMUNICATIONS
     ========================================================= */
  var communications = [
    { id: 'CM-001', name: 'Batch start reminder - September intake', channel: 'SMS', audience: 'Batch allocated candidates', recipients: 62, sent: 62, delivered: 60, read: 0, status: 'SENT', when: '2026-09-05 09:00' },
    { id: 'CM-002', name: 'Low attendance advisory', channel: 'WhatsApp', audience: 'Attendance < 75%', recipients: lowAttStudents.length, sent: lowAttStudents.length, delivered: Math.round(lowAttStudents.length * 0.96), read: Math.round(lowAttStudents.length * 0.71), status: 'SENT', when: '2026-09-06 18:30' },
    { id: 'CM-003', name: 'Document submission reminder', channel: 'SMS', audience: 'Documents pending', recipients: 32, sent: 32, delivered: 31, read: 0, status: 'SENT', when: '2026-09-04 11:15' },
    { id: 'CM-004', name: 'Certificate issued notification', channel: 'Email', audience: 'Certified candidates', recipients: 150, sent: 150, delivered: 147, read: 108, status: 'SENT', when: '2026-09-02 16:45' },
    { id: 'CM-005', name: 'Expert talk - Entrepreneurship (Online)', channel: 'In-App', audience: 'Online mode learners', recipients: 200, sent: 200, delivered: 200, read: 164, status: 'SENT', when: '2026-09-06 10:00' },
    { id: 'CM-006', name: 'Assessment schedule announcement', channel: 'WhatsApp', audience: 'Assessment pending', recipients: 60, sent: 0, delivered: 0, read: 0, status: 'SCHEDULED', when: '2026-09-10 09:30' },
    { id: 'CM-007', name: 'Weekly progress digest - Centre Managers', channel: 'Email', audience: 'Centre managers', recipients: 10, sent: 10, delivered: 10, read: 9, status: 'SENT', when: '2026-09-01 08:00' },
    { id: 'CM-008', name: 'New batch enrollment open - Vidarbha', channel: 'SMS', audience: 'Leads - Vidarbha districts', recipients: 480, sent: 0, delivered: 0, read: 0, status: 'DRAFT', when: '-' }
  ];

  /* =========================================================
     LMS + APP
     ========================================================= */
  var onlineCount = stateKpis.online;
  var lms = {
    status: 'MOCK_CONNECTED', endpoint: 'Endpoint not configured',
    lastSync: '2026-09-07 06:00', nextSync: '2026-09-08 06:00',
    studentsSynced: onlineCount, coursesSynced: 5, modules: 42,
    assignmentsSubmitted: 1486, mcqsCompleted: 3820, assessmentsSynced: 180,
    activeUsers7d: Math.round(onlineCount * 0.78), avgSessionMin: 38,
    logs: [
      { t: '2026-09-07 06:00', s: 'SUCCESS', m: 'Nightly sync complete - 200 learners, 5 courses, 42 modules' },
      { t: '2026-09-06 06:00', s: 'SUCCESS', m: 'Nightly sync complete - 200 learners' },
      { t: '2026-09-05 06:00', s: 'PARTIAL', m: '6 learner progress records failed validation - retried at 06:14 (OK)' },
      { t: '2026-09-04 06:00', s: 'SUCCESS', m: 'Nightly sync complete' },
      { t: '2026-09-03 21:12', s: 'INFO', m: 'Course CRS-05 module set updated (4 new modules)' },
      { t: '2026-09-03 06:00', s: 'SUCCESS', m: 'Nightly sync complete' }
    ]
  };
  var studentApp = {
    registered: stateKpis.enrolled, active30d: Math.round(stateKpis.enrolled * 0.82),
    dau: Math.round(stateKpis.enrolled * 0.41), materialViews: 14820,
    mcqCompletion: 76, notificationsSent: 24, assignmentsSubmitted: 1486,
    androidVersion: '1.4.2', iosVersion: '1.4.0', crashFree: 99.2,
    todayMaterial: 'Module 8 - Spreadsheet formulas: SUM, AVERAGE, IF',
    todayMcq: 'Daily quiz - MS Excel basics (10 questions)',
    upcoming: 'Live doubt-clearing session, 5:00 PM (Online mode)'
  };

  /* =========================================================
     PUBLIC API
     ========================================================= */
  AS.db = {
    config: config,
    STATUS: STATUS, STATUS_MAP: STATUS_MAP, ROLES: ROLES,
    DISTRICT_STATUS: DISTRICT_STATUS,
    ENROLLED_STATUSES: ENROLLED_STATUSES, ACTIVE_STATUSES: ACTIVE_STATUSES,
    COMPLETED_STATUSES: COMPLETED_STATUSES, ASSESSED_STATUSES: ASSESSED_STATUSES,
    PASSED_STATUSES: PASSED_STATUSES, CERTIFIED_STATUSES: CERTIFIED_STATUSES,
    districts: districts, districtBy: districtBy,
    centres: centres, onlineUnit: onlineUnit, allCentres: centres.concat([onlineUnit]), centreBy: centreBy,
    trainers: trainers, trainerBy: trainerBy,
    batches: batches, batchBy: batchBy,
    candidates: candidates, candidateBy: candidateBy,
    courses: COURSES, coordinators: coordinators,
    campaigns: campaigns, leadSources: leadSources, mobilization: mobilization,
    tasks: tasks, notifications: notifications, documents: documents,
    auditLog: auditLog, inspections: inspections, payments: payments,
    monthly: monthly, months: months, attendanceTrend: attendanceTrend,
    liveSessions: liveSessions, pmoTeam: pmoTeam, users: users, demoLogins: demoLogins,
    communications: communications, lms: lms, studentApp: studentApp,
    stateKpis: stateKpis, sources: SOURCES,
    /* readers */
    kpis: kpis, byDistrict: byDistrict, byCentre: byCentre, byBatch: byBatch, byTaluka: byTaluka,
    healthScore: healthScore, addDays: addDays, daysBetween: daysBetween, pad: pad,
    inSet: inSet,
    atRiskCandidates: function () { return candidates.filter(function (c) { return c.risks.length > 0; }); },
    talukaRollup: function (dc) {
      var d = districtBy[dc]; if (!d) return [];
      return d.talukas.map(function (t) {
        var rows = byTaluka(dc, t);
        return { taluka: t, districtId: dc, rows: rows, k: kpis(rows, Math.round(d.target / d.talukas.length)) };
      });
    },
    search: function (q) {
      q = (q || '').trim().toLowerCase();
      if (q.length < 2) return [];
      var out = [], lim = 6;
      function add(type, id, title, sub, link) { out.push({ type: type, id: id, title: title, sub: sub, link: link }); }
      candidates.filter(function (c) {
        return c.id.toLowerCase().indexOf(q) >= 0 || c.name.toLowerCase().indexOf(q) >= 0 || c.phone.toLowerCase().indexOf(q) >= 0;
      }).slice(0, lim).forEach(function (c) { add('Candidate', c.id, c.name, c.id + ' - ' + districtBy[c.districtId].name, '#/candidates/' + c.id); });
      centres.concat([onlineUnit]).filter(function (c) {
        return c.id.toLowerCase().indexOf(q) >= 0 || c.name.toLowerCase().indexOf(q) >= 0;
      }).slice(0, lim).forEach(function (c) { add('Training Centre', c.id, c.name, c.id, '#/centres/' + c.id); });
      batches.filter(function (b) { return b.id.toLowerCase().indexOf(q) >= 0; })
        .slice(0, lim).forEach(function (b) { add('Batch', b.id, b.id, (b.mode === 'ONLINE' ? 'Online' : districtBy[b.districtId].name) + ' - ' + b.students + ' students', '#/batches/' + b.id); });
      trainers.filter(function (t) { return t.name.toLowerCase().indexOf(q) >= 0 || t.id.toLowerCase().indexOf(q) >= 0; })
        .slice(0, lim).forEach(function (t) { add('Trainer', t.id, t.name, t.id + ' - ' + t.specialization, '#/trainers/' + t.id); });
      districts.filter(function (d) { return d.name.toLowerCase().indexOf(q) >= 0 || d.code.toLowerCase().indexOf(q) >= 0; })
        .slice(0, lim).forEach(function (d) { add('District', d.code, d.name, 'Target ' + d.target + ' - ' + DISTRICT_STATUS[d.status].l, '#/districts/' + d.code); });
      candidates.filter(function (c) { return c.certificateNo && c.certificateNo.toLowerCase().indexOf(q) >= 0; })
        .slice(0, lim).forEach(function (c) { add('Certificate', c.certificateNo, c.certificateNo, c.name, '#/verify?no=' + encodeURIComponent(c.certificateNo)); });
      return out;
    }
  };
})();
