/* =========================================================
   SARTHI - reference data (window.AS.db)
   Only fixed reference data: the programme's name, the candidate status
   labels and Maharashtra's 36 districts (schematic map positions, region,
   talukas). The former sample dataset (invented candidates, centres,
   trainers, batches, tasks, payments, audit entries, figures and dates) was
   retired on 24 Nov 2026: screens show live data from the API or an empty
   state, never sample values.
   ========================================================= */
(function () {
  'use strict';
  var AS = (window.AS = window.AS || {});

  var config = {
    projectName: 'SARTHI Skill Development Programme',
    shortName: 'SARTHI',
    implementingAgency: 'SUMAGO INFOTECH PVT LTD',
    state: 'Maharashtra'
  };

  /* ---------- candidate statuses (labels and order) ---------- */
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

  /* ---------- talukas of each district ---------- */
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

  var districts = D.map(function (row) {
    var code = row[1];
    return { id: code, code: code, name: row[0], col: row[2], row: row[3], region: row[4], talukas: TALUKAS[code] || [] };
  });
  var districtBy = {};
  districts.forEach(function (d) { districtBy[d.code] = d; });

  AS.db = {
    config: config,
    STATUS: STATUS,
    STATUS_MAP: STATUS_MAP,
    districts: districts,
    districtBy: districtBy
  };
})();
