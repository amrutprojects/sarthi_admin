/* =========================================================
   AMRUT x SUMAGO - Public content layer
   Programme content, leadership, verticals, schemes and bilingual
   strings for the public-facing site.

   NOTE ON SOURCES
   Programme structure below follows the published AMRUT KALASH 2.0
   diploma structure (4 modules x 120 hours, 10 electives, eligibility,
   learning methodology, certification and application flow).
   The implementing-partner role is shown as SUMAGO INFOTECH PVT LTD
   All values are configuration, not contractual terms.
   ========================================================= */
(function () {
  'use strict';
  var AS = (window.AS = window.AS || {});
  var DB = AS.db;

  /* ---------------------------------------------------------
     BILINGUAL STRINGS (Marathi first, as on the AMRUT portal)
     --------------------------------------------------------- */
  var LANG_KEY = 'amrut_lang';
  var lang = 'mr';
  try { lang = localStorage.getItem(LANG_KEY) || 'mr'; } catch (e) { }

  var STR = {
    govt: { mr: 'महाराष्ट्र शासन', en: 'Government of Maharashtra' },
    orgShort: { mr: 'अमृत', en: 'AMRUT' },
    orgLine1: { mr: 'अमृत - महाराष्ट्र संशोधन, उन्नती व प्रशिक्षण प्रबोधिनी', en: 'AMRUT - Academy of Maharashtra Research, Upliftment and Training' },
    orgLine2: { mr: 'ACADEMY OF MAHARASHTRA RESEARCH, UPLIFTMENT AND TRAINING (AMRUT)', en: 'महाराष्ट्र संशोधन, उन्नती व प्रशिक्षण प्रबोधिनी (अमृत)' },
    partner: { mr: 'अंमलबजावणी भागीदार', en: 'Implementation Partner' },

    navHome: { mr: 'मुख्यपृष्ठ', en: 'Home' },
    navAbout: { mr: 'अमृत विषयी', en: 'About AMRUT' },
    navProgramme: { mr: 'अमृत कलश २.०', en: 'AMRUT Kalash 2.0' },
    navModules: { mr: 'मॉड्यूल्स', en: 'Modules' },
    navEligibility: { mr: 'पात्रता', en: 'Eligibility' },
    navApply: { mr: 'अर्ज कसा करावा', en: 'How to Apply' },
    navFaq: { mr: 'प्रश्नोत्तरे', en: 'FAQs' },
    navContact: { mr: 'संपर्क', en: 'Contact' },
    login: { mr: 'लॉगिन / नोंदणी करा', en: 'Login / Register' },
    applyNow: { mr: 'आता अर्ज करा', en: 'Apply / Register' },
    checkStatus: { mr: 'अर्जाची स्थिती पहा', en: 'Check Application Status' },
    verifyCert: { mr: 'प्रमाणपत्र पडताळणी', en: 'Verify Certificate' },
    readMore: { mr: 'अधिक जाणून घ्या', en: 'Learn more' },
    viewAll: { mr: 'सर्व पहा', en: 'View all' },

    dashTitle: { mr: 'कार्यक्रम प्रगती - थेट माहितीफलक', en: 'Programme Progress - Live Dashboard' },
    dashSub: {
      mr: 'अमृत कलश २.० अंतर्गत महाराष्ट्रातील ३६ जिल्ह्यांमधील प्रशिक्षण प्रगतीचा सार्वजनिक आढावा.',
      en: 'Public view of AMRUT Kalash 2.0 training progress across all 36 districts of Maharashtra.'
    },
    impact: { mr: 'अमृतचा प्रभाव', en: "AMRUT's Impact" },
    leadership: { mr: 'मान्यवर व संचालक मंडळ', en: 'Leadership & Governing Board' },
    verticals: { mr: 'अमृत प्रणाली', en: 'The AMRUT Ecosystem' },
    verticalsSub: { mr: 'अमृत अंतर्गत विविध विभाग व उपक्रम', en: 'Departments and initiatives under AMRUT' },
    schemes: { mr: 'अमृत योजना विभाग', en: 'AMRUT Schemes' },
    schemesSub: { mr: 'अमृत संस्थेद्वारे राबवल्या जाणाऱ्या विविध प्रशिक्षण व विकास योजना.', en: 'Training and development schemes implemented by AMRUT.' },
    aboutTitle: { mr: 'अमृत विषयी माहिती', en: 'About AMRUT' },
    missionTitle: { mr: 'आमचे ध्येय, दृष्टिकोन व मूल्ये', en: 'Our Mission, Vision and Values' },
    links: { mr: 'महत्वपूर्ण दुवे', en: 'Important Links' },
    contactInfo: { mr: 'संपर्क माहिती', en: 'Contact Information' },
    lastDate: { mr: 'अंतिम दिनांक', en: 'Last date' }
  };

  function t(key) {
    var s = STR[key];
    return s ? (s[lang] || s.en) : key;
  }
  function setLang(l) {
    lang = l;
    try { localStorage.setItem(LANG_KEY, l); } catch (e) { }
  }
  function getLang() { return lang; }
  /** pick a value from a {mr,en} pair */
  function bi(pair) { return pair && typeof pair === 'object' ? (pair[lang] || pair.en) : pair; }

  /* ---------------------------------------------------------
     LEADERSHIP / GOVERNING BOARD
     Designations are the stable, publicly documented offices.
     Names are placeholders - replace `name` with the current
     officeholder from AMRUT records before any external use.
     --------------------------------------------------------- */
  var leadership = [
    {
      id: 'L1', tier: 'state',
      office: { mr: 'मा. मुख्यमंत्री, महाराष्ट्र राज्य', en: "Hon'ble Chief Minister, Maharashtra" },
      name: null, note: { mr: 'नाव अमृत नोंदीनुसार भरावे', en: 'Name to be filled from AMRUT records' }
    },
    {
      id: 'L2', tier: 'state',
      office: { mr: 'मा. उपमुख्यमंत्री, महाराष्ट्र राज्य', en: "Hon'ble Deputy Chief Minister, Maharashtra" },
      name: null, note: { mr: 'नाव अमृत नोंदीनुसार भरावे', en: 'Name to be filled from AMRUT records' }
    },
    {
      id: 'L3', tier: 'dept',
      office: { mr: 'मा. मंत्री, इतर मागास बहुजन कल्याण विभाग', en: "Hon'ble Minister, Other Backward Bahujan Welfare Department" },
      name: null, note: { mr: 'नाव अमृत नोंदीनुसार भरावे', en: 'Name to be filled from AMRUT records' }
    },
    {
      id: 'L4', tier: 'board',
      office: { mr: 'मा. प्रधान सचिव, इतर मागास बहुजन कल्याण विभाग - अध्यक्ष, नियामक मंडळ (अमृत)', en: "Hon'ble Principal Secretary, OBC & Bahujan Welfare Dept. - Chairperson, AMRUT Governing Board" },
      name: null, note: { mr: 'अमृत नियामक मंडळाचे अध्यक्ष', en: 'Chairperson of the AMRUT Governing Board' }
    },
    {
      id: 'L5', tier: 'board',
      office: { mr: 'मा. व्यवस्थापकीय संचालक, अमृत', en: "Hon'ble Managing Director, AMRUT" },
      name: null, note: { mr: 'योजना कार्यान्वयनाचे प्रमुख', en: 'Heads scheme implementation' }
    },
    {
      id: 'L6', tier: 'partner',
      office: { mr: 'प्रकल्प संचालक, सुमागो इन्फोटेक प्रा. लि. (SUMAGO INFOTECH PVT LTD)', en: 'Project Director, SUMAGO INFOTECH PVT LTD' },
      name: 'Rajendra Sumago', note: { mr: 'अंमलबजावणी भागीदार', en: 'Implementation partner' }
    }
  ];

  /* ---------------------------------------------------------
     AMRUT ECOSYSTEM VERTICALS (as listed on the AMRUT portal)
     --------------------------------------------------------- */
  var verticals = [
    { n: { mr: 'अमृत विद्या', en: 'AMRUT Vidya' }, d: { mr: 'ज्ञानार्जनाचा परिपूर्ण मंच', en: 'A complete platform for learning' }, ico: 'teacher' },
    { n: { mr: 'अमृत पेठ', en: 'AMRUT Peth' }, d: { mr: 'दर्जेदार व किफायतशीर उत्पादनांसाठी', en: 'Quality and affordable products' }, ico: 'building' },
    { n: { mr: 'अमृत महाराष्ट्र', en: 'AMRUT Maharashtra' }, d: { mr: 'राज्य विकास उपक्रम', en: 'State development initiative' }, ico: 'map' },
    { n: { mr: 'अमृत मानसमित्र', en: 'AMRUT Manasmitra' }, d: { mr: 'मनातल्या प्रत्येक भावनेसाठी', en: 'For every emotion within' }, ico: 'users' },
    { n: { mr: 'अमृत पर्यटन', en: 'AMRUT Tourism' }, d: { mr: 'पाहा महाराष्ट्र.. अमृतच्या नजरेतून', en: 'See Maharashtra through AMRUT' }, ico: 'globe' },
    { n: { mr: 'अमृत वर्ग', en: 'AMRUT Varg' }, d: { mr: 'विशेष गट उपक्रम', en: 'Special group initiative' }, ico: 'layers' },
    { n: { mr: 'अमृत ड्रोन मिशन', en: 'AMRUT Drone Mission' }, d: { mr: 'भारतीय आकाशाला सशक्त करणे', en: 'Empowering Indian skies' }, ico: 'play' },
    { n: { mr: 'अमृत कलश २.०', en: 'AMRUT Kalash 2.0' }, d: { mr: 'कौशल्य विकास व रोजगारक्षमता', en: 'Skill development & employability' }, ico: 'award', active: true, link: '#/programme' }
  ];

  /* ---------------------------------------------------------
     AMRUT SCHEMES (illustrative, as listed on the AMRUT portal)
     --------------------------------------------------------- */
  var schemes = [
    {
      n: { mr: 'अमृत कलश २.० - कौशल्य प्रशिक्षण', en: 'AMRUT Kalash 2.0 - Skill Training' },
      d: {
        mr: 'महाराष्ट्रातील खुल्या प्रवर्गातील आर्थिकदृष्ट्या दुर्बल घटकातील युवकांना २१ व्या शतकातील रोजगारक्षम कौशल्ये, संगणक कौशल्ये व इंग्रजी संभाषण कौशल्ये यांचे प्रशिक्षण देऊन रोजगार व स्वयंरोजगारक्षम बनविणे.',
        en: "Equipping economically weaker youth from the open category with 21st-century job-readiness skills, digital skills and English communication skills for employment and self-employment."
      },
      last: '2027-03-31', link: '#/programme', featured: true
    },
    {
      n: { mr: 'मानसमित्र समुपदेशक प्रशिक्षण कार्यक्रम', en: 'Manasmitra Counsellor Training Programme' },
      d: { mr: 'समाजातील व्यक्तींना मूलभूत समुपदेशन कौशल्यांचे प्रशिक्षण देऊन मानसिक आरोग्याबाबत जागरूकता निर्माण करणे.', en: 'Building mental-health awareness by training individuals in basic counselling skills.' },
      last: '2026-06-29'
    },
    {
      n: { mr: 'लघुलेखन प्रशिक्षण योजना', en: 'Shorthand Training Scheme' },
      d: { mr: 'शासकीय ऑनलाईन लघुलेखन परीक्षेच्या माध्यमातून उमेदवारांना उद्योगाभिमुख स्वयंरोजगार व रोजगारक्षम बनविणे.', en: 'Making candidates employable through the government online shorthand examination.' },
      last: '2026-06-09'
    },
    {
      n: { mr: 'ड्रोन पायलट प्रशिक्षण योजना', en: 'Drone Pilot Training Scheme' },
      d: { mr: 'विशेषत: ग्रामीण क्षेत्रात स्वयंरोजगार व रोजगार निर्मिती करणारे प्रशिक्षण देणे.', en: 'Training that creates self-employment and jobs, especially in rural areas.' },
      last: '2026-06-30'
    },
    {
      n: { mr: 'AIIMS, IIT, IIM, IIIT विद्यार्थ्यांना अर्थसहाय्य योजना', en: 'Financial Assistance for AIIMS / IIT / IIM / IIIT Students' },
      d: { mr: 'अमृतच्या लक्षित गटातील विद्यार्थ्यांना दर्जेदार शिक्षण घेणे सोयीस्कर होण्यासाठी अर्थसहाय्य देणे.', en: "Financial assistance so students from AMRUT's target group can access quality education." },
      last: '2026-03-11'
    },
    {
      n: { mr: 'वैयक्तिक कर्ज व्याज परतावा योजना', en: 'Personal Loan Interest Subvention Scheme' },
      d: { mr: 'स्वत:चा उद्योग / व्यवसाय सुरु करू इच्छिणाऱ्या अमृतच्या लक्षित गटातील उमेदवारांसाठी.', en: "For candidates from AMRUT's target group wishing to start their own business." },
      last: '2030-12-31'
    }
  ];

  /* ---------------------------------------------------------
     AMRUT KALASH 2.0 - PROGRAMME DEFINITION
     --------------------------------------------------------- */
  var kalash = {
    title: { mr: 'अमृत कलश २.०', en: 'AMRUT KALASH 2.0' },
    expansion: {
      mr: 'अमृत - कौशल्य सुसंवादाद्वारे ज्ञानवृद्धी व शिकण्याची क्षमता',
      en: 'AMRUT - Knowledge Advancement and Learning Abilities through Skill Harmonization'
    },
    tagline: {
      mr: 'कौशल्यातील तफावत भरून काढून युवकांची रोजगारक्षमता व स्वयंरोजगारक्षमता वाढविणे.',
      en: 'Bridging the skill deficit to enhance employability and self-employability of youth.'
    },
    partner: 'SUMAGO INFOTECH PVT LTD',
    totalHours: 480,
    moduleHours: 120,
    trainingHours: 99,
    assessmentHours: 21,
    weeksPerModule: 6,
    daysPerWeek: 6,
    hoursPerDay: 3,
    weeklyAssessmentHours: 3.5,
    idealMonths: 6,
    validityMonths: 12,
    securityDeposit: 2000,
    applyLeadDays: 30,

    objectives: [
      { mr: 'आर्थिकदृष्ट्या दुर्बल युवकांमधील कौशल्यातील तफावत भरून काढणे', en: 'Bridge skill deficiencies among economically weaker youth' },
      { mr: 'रोजगार व स्वयंरोजगाराच्या संधी वाढविणे', en: 'Enhance employability and self-employment prospects' },
      { mr: '२१ व्या शतकातील रोजगारक्षमतेची कौशल्ये विकसित करणे', en: 'Develop 21st-century job-readiness competencies' },
      { mr: 'उत्पादकता, सर्जनशीलता व उद्योजकीय दृष्टिकोन रुजविणे', en: 'Foster productivity, creativity and an entrepreneurial mindset' },
      { mr: 'डिजिटल व गिग इकॉनॉमीतील संधींसाठी सज्ज करणे', en: 'Prepare candidates for digital and gig-economy opportunities' }
    ],

    modules: [
      {
        code: 'ECS', no: 1,
        n: { mr: 'इंग्रजी भाषा, संभाषण व सॉफ्ट स्किल्स', en: 'Certificate in English Language Skills, Communication Skills and Soft Skills' },
        d: { mr: 'इंग्रजी भाषा कौशल्ये, प्रभावी संभाषण आणि कार्यस्थळावरील सॉफ्ट स्किल्स.', en: 'English language ability, effective communication and workplace soft skills.' }
      },
      {
        code: 'ITS', no: 2,
        n: { mr: 'मूलभूत माहिती तंत्रज्ञान कौशल्ये (रोजगारक्षमता वृद्धीसाठी)', en: 'Certificate in Basic Information Technology Skills (For Employability Enhancement)' },
        d: { mr: 'संगणक हाताळणी, इंटरनेट, ई-सेवा व कार्यालयीन सॉफ्टवेअरची मूलभूत कौशल्ये.', en: 'Core computer, internet, e-services and office software skills.' }
      },
      {
        code: 'DS-BDS', no: 3,
        n: { mr: 'क्षेत्रनिहाय मूलभूत डिजिटल कौशल्ये', en: 'Certificate in Domain Specific Basic Digital Skills' },
        d: { mr: 'उमेदवार १० पैकी एक रोजगार क्षेत्र निवडतो व त्यातील मूलभूत डिजिटल कौशल्ये शिकतो.', en: 'The candidate selects one of 10 employment domains as an elective and learns its basic digital skills.' },
        elective: true
      },
      {
        code: 'DS-ADS', no: 4,
        n: { mr: 'क्षेत्रनिहाय प्रगत डिजिटल कौशल्ये', en: 'Certificate in Domain Specific Advanced Digital Skills' },
        d: { mr: 'निवडलेल्या क्षेत्रातील प्रगत कौशल्ये व सिम्युलेटेड कार्यानुभव.', en: 'Advanced skills in the chosen domain, with simulated work experience.' },
        elective: true
      }
    ],

    electives: [
      { no: 1, domain: { mr: 'डेटा एन्ट्री व डेटा व्यवस्थापन', en: 'Data Entry & Data Management' }, m3: 'Certificate in Data Management with Excel', m4: 'Certificate in Advanced Data Management with Excel' },
      { no: 2, domain: { mr: 'लेखाकाम', en: 'Accounting' }, m3: 'Certificate in Foundation of Financial Accounting (with Tally and Excel)', m4: 'Certificate in Applied Financial Accounting (with Tally and Excel)' },
      { no: 3, domain: { mr: 'प्रगत लेखाकाम व प्रगत एक्सेल', en: 'Advanced Financial Accounting and Advanced Excel' }, m3: 'Certificate in Advanced Accounting (with Tally and Excel)', m4: 'Certificate in Applied Advanced Accounting (with Tally and Excel)' },
      { no: 4, domain: { mr: 'डिझायनिंग', en: 'Designing' }, m3: 'Certificate in Desktop Publishing (DTP)', m4: 'Certificate in Advanced Desktop Publishing (DTP)' },
      { no: 5, domain: { mr: 'वेब डिझायनिंग', en: 'Web Designing' }, m3: 'Certificate in Web Designing', m4: 'Certificate in Advanced Web Designing' },
      { no: 6, domain: { mr: 'हार्डवेअर व नेटवर्किंग', en: 'Hardware & Networking' }, m3: 'Certificate in Hardware and Networking', m4: 'Certificate in Advanced Hardware and Networking' },
      { no: 7, domain: { mr: 'प्रोग्रामिंग', en: 'Programming' }, m3: 'Certificate in Mobile App Development', m4: 'Certificate in Advanced Mobile App Development' },
      { no: 8, domain: { mr: 'व्यवस्थापन', en: 'Management' }, m3: 'Certificate in Retail Management', m4: 'Certificate in Advanced Retail Management' },
      { no: 9, domain: { mr: 'बँकिंग, वित्तीय सेवा व विमा (BFSI)', en: 'Banking, Financial Services & Insurance (BFSI)' }, m3: 'Certificate in Banking, Financial Services and Insurance (BFSI)', m4: 'Certificate in Advanced Banking, Financial Services and Insurance (BFSI)' },
      { no: 10, domain: { mr: 'डिजिटल मार्केटिंग', en: 'Digital Marketing' }, m3: 'Certificate in Digital Marketing Essentials', m4: 'Certificate in Advanced Digital Marketing' }
    ],

    eligibility: [
      { l: { mr: 'वय', en: 'Age' }, v: { mr: '१८ ते ४५ वर्षे', en: '18 to 45 years' } },
      { l: { mr: 'शैक्षणिक पात्रता', en: 'Qualification' }, v: { mr: '१२ वी उत्तीर्ण किंवा ३ वर्षांचा पदविका (पॉलिटेक्निक) उत्तीर्ण', en: '12th Pass or 3-year Polytechnic Diploma' } },
      { l: { mr: 'लक्षित गट', en: 'Target group' }, v: { mr: 'खुल्या प्रवर्गातील आर्थिकदृष्ट्या दुर्बल घटक (अमृतचा लक्षित गट)', en: 'Economically Weaker Section from Open Category (AMRUT target group)' } },
      { l: { mr: 'कौटुंबिक उत्पन्न', en: 'Family income' }, v: { mr: 'सर्व स्रोतांतून वार्षिक उत्पन्न रु. ८ लाखांपेक्षा कमी', en: 'Annual family income from all sources less than Rs. 8 Lakhs' } },
      { l: { mr: 'अधिवास', en: 'Domicile' }, v: { mr: 'महाराष्ट्राचा अधिवास दाखला आवश्यक', en: 'Maharashtra Domicile Certificate required' } }
    ],

    documents: [
      { mr: 'आधार कार्ड', en: 'Aadhaar card' },
      { mr: 'महाराष्ट्र अधिवास दाखला', en: 'Maharashtra Domicile Certificate' },
      { mr: '१२ वी उत्तीर्ण / पदविका प्रमाणपत्र व गुणपत्रिका', en: '12th pass or Diploma certificate & marksheet' },
      { mr: 'जन्मतारीख व वयाचा पुरावा', en: 'Date of birth and age proof' },
      { mr: '१ वर्षाचा उत्पन्नाचा दाखला किंवा EWS प्रमाणपत्र', en: '1-year Income Certificate or EWS Certificate' },
      { mr: 'छायाचित्र व स्वाक्षरी', en: 'Photograph and signature' },
      { mr: 'जातीचा स्पष्ट उल्लेख असलेले शासकीय कागदपत्र', en: 'Government document clearly mentioning caste' }
    ],

    methodology: [
      { l: { mr: 'शिकण्याची पद्धत', en: 'Delivery mode' }, v: { mr: 'अधिकृत अध्ययन केंद्रांवर (ALC) इंटरनेट-सज्ज मल्टिमीडिया संगणक व हेडफोनसह ई-लर्निंग', en: 'eLearning at Authorized Learning Centres (ALCs) on internet-ready multimedia computers with headphones' } },
      { l: { mr: 'अध्यापन तत्त्व', en: 'Pedagogy' }, v: { mr: 'कृतीतून शिक्षण - कौशल्यप्रभुत्व, क्षमता व आत्मविश्वासासाठी', en: 'Learning by Doing, for skill mastery with competence and confidence' } },
      { l: { mr: 'शिकण्याचा मार्ग', en: 'Learning path' }, v: { mr: 'निश्चित-मार्ग ४०% + स्व-मार्ग ६०%, प्रत्येक तासाच्या सत्रात मूल्यमापन व उपचारात्मक मार्गदर्शन', en: 'Fixed-path 40% + self-path 60%, each one-hour session with assessment and remedial input' } },
      { l: { mr: 'आशय स्वरूप', en: 'Content' }, v: { mr: 'सुमागो LMS मधील उच्च-गुणवत्तेचा मल्टिमीडिया आशय व सविस्तर व्हॉइस-ओव्हर', en: 'High-definition multimedia content with rich voice-over in the SUMAGO LMS' } },
      { l: { mr: 'प्रतिमान', en: 'Paradigm' }, v: { mr: 'निश्चित-वेळ, परिवर्तनीय-कौशल्ये (fixed-time variable-skills)', en: 'Fixed-time, variable-skills' } }
    ],

    assessment: [
      { l: { mr: 'अंतर्गत अध्ययन प्रगती मूल्यमापन', en: 'Internal learning progression assessment' }, min: 10, max: 25 },
      { l: { mr: 'साप्ताहिक पर्यवेक्षित सलग ऑनलाइन मूल्यमापन', en: 'Weekly supervised continuous online assessment' }, min: 10, max: 25 },
      { l: { mr: 'अंतिम ऑनलाइन परीक्षा', en: 'Final online examination' }, min: 20, max: 50 }
    ],
    proctoring: { mr: 'स्वयंचलित व कृत्रिम बुद्धिमत्ता (AI) प्रॉक्टर्ड मूल्यमापन, वैयक्तिक विद्यार्थी लॉगिनद्वारे.', en: 'Automated and Artificial Intelligence (AI) proctored assessment through personalised student logins.' },

    applySteps: [
      { n: { mr: 'ऑनलाइन अर्ज', en: 'Online application' }, d: { mr: 'इच्छित बॅचसाठी अमृत कलश पोर्टलवर ऑनलाइन अर्ज करा व पात्रतेच्या कागदपत्रांच्या स्कॅन प्रती अपलोड करा. पसंतीचे केंद्र निवडा.', en: 'Apply online on the AMRUT Kalash portal for your desired batch, upload scanned proofs of eligibility and indicate your preferred centre.' } },
      { n: { mr: 'स्थानिक मदत (ऐच्छिक)', en: 'Local support (optional)' }, d: { mr: 'आवश्यक असल्यास जवळच्या अधिकृत अध्ययन केंद्राची (ALC) मदत घेता येईल.', en: 'Candidates may seek local support for the online application from a nearby Authorized Learning Centre (ALC).' } },
      { n: { mr: 'केंद्राकडून पडताळणी', en: 'Centre verification' }, d: { mr: 'निवडलेले ALC उमेदवाराची माहिती व कागदपत्रे तपासून पात्रतेची पुष्टी करते.', en: "The selected ALC verifies the candidate's data and supporting documents and confirms eligibility." } },
      { n: { mr: 'जिल्हा समन्वयक तपासणी', en: 'District coordinator review' }, d: { mr: 'संबंधित जिल्हा/क्लस्टर समन्वयक आपल्या लॉगिनमधून प्रत्येक उमेदवाराची माहिती पडताळतो.', en: 'The respective district / cluster coordinator verifies each candidate from their login.' } },
      { n: { mr: 'अमृतकडून अंतिम मान्यता', en: 'Final approval by AMRUT' }, d: { mr: 'अमृत प्राधिकरण आपल्या लॉगिनमधून उमेदवाराच्या तपशिलास अंतिम मान्यता देते.', en: 'AMRUT authorities give final approval to the candidate details from their login.' } },
      { n: { mr: 'अनामत रक्कम व प्रवेश', en: 'Security deposit & admission' }, d: { mr: 'मान्यताप्राप्त उमेदवार संबंधित ALC मार्फत रु. २,०००/- ची परतावा योग्य अनामत रक्कम भरतो; त्यानंतर पहिल्या मॉड्यूलसाठी लॉगिन क्रेडेन्शियल्स दिली जातात.', en: 'The approved candidate pays a refundable security deposit of Rs. 2,000/- through the ALC, after which login credentials are issued for Module 1.' } }
    ],

    certification: [
      { mr: 'प्रत्येक मॉड्यूल पूर्ण करून अंतिम परीक्षा उत्तीर्ण झाल्यावर मॉड्यूलनिहाय प्रमाणपत्र मिळते.', en: 'A module-wise certificate is issued on completing each module and passing its final examination.' },
      { mr: 'चारही मॉड्यूल्स उत्तीर्ण झाल्यावर "अमृत कलश डिप्लोमा" प्रमाणपत्र मिळते.', en: 'On passing all four modules, the AMRUT-KALASH Diploma certificate is awarded.' },
      { mr: 'सर्व प्रमाणपत्रे अमृत व सुमागो इन्फोटेक यांच्याकडून संयुक्तरीत्या दिली जातात.', en: 'All certificates are jointly issued by AMRUT and SUMAGO INFOTECH PVT LTD' },
      { mr: 'प्रत्येक प्रमाणपत्र QR कोडद्वारे सार्वजनिकरीत्या पडताळता येते.', en: 'Every certificate carries a QR code for public verification.' },
      { mr: 'चौथे मॉड्यूल पूर्ण झाल्यावर अनामत रक्कम परत केली जाते.', en: 'The security deposit is refunded after the fourth module is completed.' }
    ],

    faqs: [
      {
        q: { mr: 'अमृत कलश २.० म्हणजे काय?', en: 'What is AMRUT Kalash 2.0?' },
        a: { mr: 'अमृत व सुमागो इन्फोटेक यांच्या संयुक्त विद्यमाने राबविला जाणारा ४८० तासांचा, ४ मॉड्यूल्सचा कौशल्य विकास डिप्लोमा कार्यक्रम.', en: 'A 480-hour, four-module skill development diploma programme run by AMRUT in collaboration with SUMAGO INFOTECH PVT LTD' }
      },
      {
        q: { mr: 'कार्यक्रमाचा कालावधी किती आहे?', en: 'How long does the programme take?' },
        a: { mr: 'आदर्श कालावधी ६ महिने. प्रवेशित उमेदवाराच्या उमेदवारीची वैधता १२ महिने असते, त्यामुळे महाविद्यालयीन परीक्षा किंवा अन्य अडचणींमुळे विलंब झाल्यास अतिरिक्त महिने मिळू शकतात.', en: 'Ideally 6 months. The validity of an admitted candidature is 12 months, so candidates delayed by college exams or other exigencies get a reasonable number of extra months.' }
      },
      {
        q: { mr: 'शुल्क किती आहे?', en: 'What does it cost?' },
        a: { mr: 'प्रवेश निश्चित करण्यासाठी रु. २,०००/- ची परतावा योग्य अनामत रक्कम भरावी लागते. चौथे मॉड्यूल पूर्ण झाल्यावर ती परत केली जाते.', en: 'A refundable security deposit of Rs. 2,000/- confirms admission. It is refunded after the fourth module is completed.' }
      },
      {
        q: { mr: 'ऑफलाइन व ऑनलाइन प्रशिक्षणात काय फरक आहे?', en: 'What is the difference between offline and online training?' },
        a: { mr: 'ऑफलाइन प्रशिक्षण मान्यताप्राप्त केंद्रावर केंद्र व्यवस्थापकाच्या देखरेखीखाली होते. ऑनलाइन प्रशिक्षण सुमागो ऑनलाइन ट्रेनिंग मॅनेजमेंट टीमद्वारे केंद्रीयरीत्या चालविले जाते. उमेदवार यापैकी एकाच पद्धतीत नोंदविला जातो.', en: 'Offline training runs at an approved centre under a Centre Manager. Online training is run centrally by the SUMAGO Online Training Management Team. A candidate is enrolled in exactly one mode.' }
      },
      {
        q: { mr: 'किमान उपस्थिती किती आवश्यक आहे?', en: 'What is the minimum attendance?' },
        a: { mr: 'मूल्यमापनासाठी पात्र होण्याकरिता किमान ७५% उपस्थिती आवश्यक आहे (हे प्रमाण बदलण्यायोग्य आहे).', en: 'A minimum of 75% attendance is required to be eligible for assessment (this threshold is configurable).' }
      },
      {
        q: { mr: 'प्रमाणपत्राची पडताळणी कशी करावी?', en: 'How can a certificate be verified?' },
        a: { mr: 'प्रमाणपत्र क्रमांक टाकून किंवा QR कोड स्कॅन करून सार्वजनिक पडताळणी पृष्ठावर तपासता येते.', en: 'Through the public verification page, using the certificate number or by scanning its QR code.' }
      },
      {
        q: { mr: 'मॉड्यूल ३ मध्ये कोणते क्षेत्र निवडता येते?', en: 'Which domains can I choose in Module 3?' },
        a: { mr: 'डेटा व्यवस्थापन, लेखाकाम, प्रगत लेखाकाम, डिझायनिंग, वेब डिझायनिंग, हार्डवेअर व नेटवर्किंग, प्रोग्रामिंग, व्यवस्थापन, BFSI आणि डिजिटल मार्केटिंग - एकूण १० पर्याय.', en: 'Ten electives: Data Management, Accounting, Advanced Accounting, Designing, Web Designing, Hardware & Networking, Programming, Management, BFSI and Digital Marketing.' }
      }
    ]
  };

  /* ---------------------------------------------------------
     ANNOUNCEMENTS (hero carousel)
     --------------------------------------------------------- */
  var announcements = [
    {
      tag: { mr: 'प्रवेश सुरू', en: 'Admissions open' },
      t: { mr: 'अमृत कलश २.० - कौशल्य प्रशिक्षणासाठी ऑनलाइन अर्ज करा', en: 'AMRUT Kalash 2.0 - apply online for skill training' },
      d: { mr: 'खुल्या प्रवर्गातील आर्थिकदृष्ट्या दुर्बल घटकातील युवकांसाठी ४८० तासांचा डिप्लोमा कार्यक्रम.', en: 'A 480-hour diploma programme for economically weaker youth from the open category.' },
      cta: { mr: 'आता अर्ज करा', en: 'Apply now' }, link: '#/apply'
    },
    {
      tag: { mr: 'दोन प्रशिक्षण पद्धती', en: 'Two training modes' },
      t: { mr: 'ऑफलाइन केंद्र किंवा ऑनलाइन - तुमच्या सोयीनुसार निवडा', en: 'Offline centre or online - choose what suits you' },
      d: { mr: 'मान्यताप्राप्त प्रशिक्षण केंद्रावर किंवा सुमागो LMS द्वारे केंद्रीय ऑनलाइन पद्धतीने प्रशिक्षण.', en: 'Train at an approved centre, or centrally online through the SUMAGO LMS.' },
      cta: { mr: 'अधिक जाणून घ्या', en: 'Learn more' }, link: '#/programme'
    },
    {
      tag: { mr: 'प्रमाणपत्र पडताळणी', en: 'Certificate verification' },
      t: { mr: 'QR कोडद्वारे प्रमाणपत्राची त्वरित पडताळणी', en: 'Verify any certificate instantly by QR code' },
      d: { mr: 'नियोक्ते व संस्था प्रमाणपत्र क्रमांक टाकून सत्यता तपासू शकतात.', en: 'Employers and institutions can confirm authenticity using the certificate number.' },
      cta: { mr: 'पडताळणी करा', en: 'Verify now' }, link: '#/verify'
    }
  ];

  /* ---------------------------------------------------------
     ORGANISATION / CONTACT
     --------------------------------------------------------- */
  var org = {
    established: { mr: '२२ ऑगस्ट २०१९ च्या शासन निर्णयाद्वारे', en: 'By Government Resolution dated 22 August 2019' },
    registration: { mr: 'सोसायटी रजिस्ट्रेशन अ‍ॅक्ट १८६० व सार्वजनिक विश्वस्त व्यवस्था अधिनियम १९५० अंतर्गत नोंदणीकृत', en: 'Registered under the Society Registration Act 1860 and the Public Trusts Act 1950' },
    hq: { mr: 'मुख्यालय: पुणे', en: 'Headquarters: Pune' },
    about: {
      mr: 'राज्यातील खुल्या प्रवर्गातील आर्थिकदृष्ट्या दुर्बल घटकातील विद्यार्थी, युवक-युवती व इतर उमेदवारांचा विकास घडविण्यासाठी महाराष्ट्र शासनाने "अमृत" - महाराष्ट्र संशोधन, उन्नती व प्रशिक्षण प्रबोधिनी या स्वायत्त संस्थेची स्थापना केली आहे. अमृतच्या नियामक मंडळाचे अध्यक्ष मा. प्रधान सचिव, इतर मागास बहुजन कल्याण विभाग हे असून, मंडळाच्या मान्यतेने विविध योजना कार्यान्वित केल्या जातात.',
      en: 'AMRUT - the Academy of Maharashtra Research, Upliftment and Training - is an autonomous body established by the Government of Maharashtra to develop students, youth and other candidates from economically weaker sections of the open category. Its Governing Board is chaired by the Hon. Principal Secretary, Other Backward Bahujan Welfare Department, and schemes are implemented with the Board\'s approval.'
    },
    mission: {
      mr: 'राज्यातील प्रत्येक नागरिकाला संशोधन, प्रशिक्षण आणि विकासाच्या संधी उपलब्ध करून देणे तसेच युवकांना कौशल्य विकासाद्वारे सक्षम करणे.',
      en: 'To make research, training and development opportunities available to every citizen of the state, and to empower youth through skill development.'
    },
    vision: {
      mr: 'एक विकसित आणि सक्षम महाराष्ट्र घडविणे, जिथे प्रत्येक नागरिक शिक्षण, रोजगार आणि प्रगतीच्या समान संधींनी सुसज्ज असेल.',
      en: 'To build a developed and capable Maharashtra where every citizen has equal opportunity in education, employment and progress.'
    },
    values: {
      mr: 'पारदर्शकता, उत्तरदायित्व आणि नागरिक-प्रथम दृष्टिकोन.',
      en: 'Transparency, accountability and a citizen-first approach.'
    },
    email: 'info@mahaamrut.org.in',
    phone: '+91 97301 51450',
    website: 'https://mahaamrut.org.in/',
    address: {
      mr: '५ वा मजला, अमृत इमारत, भीमसेन जोशी सभागृहाजवळ, प्रभाग क्र. ८, पीएमआरडीए, औंध, पुणे, महाराष्ट्र ४११०६७.',
      en: '5th Floor, AMRUT Building, near Bhimsen Joshi Sabhagruh, Ward No. 8, PMRDA, Aundh, Pune, Maharashtra 411067.'
    },
    partnerName: 'SUMAGO INFOTECH PVT LTD',
    partnerRole: { mr: 'अंमलबजावणी व तंत्रज्ञान भागीदार', en: 'Implementation & technology partner' },
    partnerEmail: 'programme@sumago.demo',
    importantLinks: [
      { mr: 'ई-बुक', en: 'e-Book' }, { mr: 'परिपत्रक', en: 'Circulars' },
      { mr: 'अभिप्राय', en: 'Feedback' }, { mr: 'माहितीचा अधिकार', en: 'RTI' },
      { mr: 'शासन निर्णय', en: 'Government Resolutions' }
    ]
  };

  /* ---------------------------------------------------------
     LEARNER STAT PANEL — bilingual labels for "Your numbers"
     --------------------------------------------------------- */
  var learnerStats = {
    title: { mr: 'तुमची प्रगती', en: 'Your numbers' },
    sub: { mr: 'अमृत कलश २.० — चालू मॉड्यूल', en: 'AMRUT Kalash 2.0 — current module' },
    overall: { mr: 'एकूण प्रगती', en: 'Overall progress' },
    hours: { mr: 'शिकण्याचे तास', en: 'Learning hours' },
    topics: { mr: 'पूर्ण झालेले विषय', en: 'Topics done' },
    attendance: { mr: 'उपस्थिती', en: 'Attendance' },
    assignments: { mr: 'स्वाध्याय', en: 'Assignments' },
    mcqs: { mr: 'सराव प्रश्न', en: 'Practice questions' },
    assessments: { mr: 'मूल्यमापन', en: 'Assessments' },
    words: {
      mr: { g: 'प्रगतीपथावर', n: 'सुरू आहे', a: 'मागे', r: 'लक्ष द्या', done: 'पूर्ण' },
      en: { g: 'On track', n: 'In progress', a: 'Behind', r: 'Needs attention', done: 'Complete' }
    },
    foot: {
      mr: 'किमान ७५% उपस्थिती आवश्यक · आकडे दररोज अद्ययावत होतात',
      en: 'Minimum 75% attendance required · figures update daily'
    }
  };

  AS.content = {
    t: t, bi: bi, setLang: setLang, getLang: getLang, STR: STR,
    leadership: leadership, verticals: verticals, schemes: schemes,
    kalash: kalash, announcements: announcements, org: org, learnerStats: learnerStats
  };
})();
