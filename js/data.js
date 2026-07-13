/* ============================================================
   HSE Digital — البيانات المرجعية وقوالب النماذج
   (مطابقة لنماذج مشروع SCC – مصنع القهوة السعودية بجازان)
   ============================================================ */

const HSE = {

  project: {
    employerEn: 'Saudi Coffee Company',
    employerAr: 'الشركة السعودية للقهوة',
    engineerEn: 'ESCC',
    engineerSub: 'Engineering Services & Consultancy Centre',
    contractorEn: 'Al-Rajhi Building & Constructions',
    contractorAr: 'الراجحي للبناء والتعمير',
    siteAr: 'مصنع القهوة السعودية — جازان',
    codePrefix: 'SCC-RBC-ESCC',
  },

  buildings: ['B01', 'B02', 'B03', 'B04.01', 'B04.03', 'B09', 'B10', 'MOB-B10'],

  disciplines: [
    { en: 'Civil', ar: 'مدني' },
    { en: 'Electrical', ar: 'كهربائي' },
    { en: 'Mechanical', ar: 'ميكانيكي' },
  ],

  permitTypes: {
    G: {
      key: 'G', codeTag: 'PTW.G',
      en: 'General Work Permit', ar: 'تصريح عمل عام',
      checklist: [
        { en: 'Method Statement / Risk Assessment provided?', ar: 'توفر بيان طريقة العمل / تقييم المخاطر؟' },
        { en: 'Work area barricaded / isolated with proper signage?', ar: 'عزل منطقة العمل وتحديدها بالحواجز واللافتات المناسبة؟' },
        { en: 'All required PPEs in place?', ar: 'توفر جميع معدات الوقاية الشخصية المطلوبة؟' },
        { en: 'Is the lone worker prevented?', ar: 'منع العمل الفردي (لا يوجد عامل يعمل بمفرده)؟' },
        { en: 'Tool Box Talk conducted with employees before the start of activity?', ar: 'عقد اجتماع السلامة (Toolbox Talk) مع العمال قبل بدء النشاط؟' },
        { en: 'Chemicals to be used have MSDS / COSHH?', ar: 'توفر نشرات السلامة (MSDS/COSHH) للمواد الكيميائية المستخدمة؟' },
        { en: 'Weather conditions suitable to execute the work?', ar: 'ملاءمة الأحوال الجوية لتنفيذ العمل؟' },
        { en: 'Equipment to be used inspected, tested and tagged?', ar: 'فحص واختبار ووسم المعدات المستخدمة؟' },
        { en: 'Adequate access provided for pedestrian and utility services vehicles?', ar: 'توفر ممرات آمنة كافية للمشاة ومركبات الخدمات؟' },
        { en: 'Hand and power tools inspected, tagged and in good condition?', ar: 'فحص العدد اليدوية والكهربائية ووسمها وسلامة حالتها؟' },
      ],
    },
    H: {
      key: 'H', codeTag: 'PTW.H',
      en: 'Hot Work Permit', ar: 'تصريح أعمال ساخنة',
      checklist: [
        { en: 'Method Statement / Risk Assessment provided?', ar: 'توفر بيان طريقة العمل / تقييم المخاطر؟' },
        { en: 'The area below the work spot has been cleared from all combustible materials.', ar: 'إخلاء منطقة العمل وما تحتها من جميع المواد القابلة للاشتعال' },
        { en: 'Fire fighting equipment and water at welding area.', ar: 'توفر معدات مكافحة الحريق والماء في منطقة اللحام' },
        { en: 'Tin sheet and fire blanket to prevent sparks from spreading.', ar: 'ألواح صاج وبطانية حريق لمنع انتشار الشرر' },
        { en: 'Flash back arrester installed to the gas cylinder.', ar: 'تركيب مانع ارتداد اللهب على أسطوانة الغاز' },
        { en: 'Gas cylinder and fittings are free from cracks, grease etc.', ar: 'خلو أسطوانة الغاز وملحقاتها من الشقوق والشحوم' },
        { en: 'Gas cylinders are kept upright and secured.', ar: 'حفظ الأسطوانات بوضع قائم ومثبتة بأمان' },
        { en: 'Arc welding machine is in good working order.', ar: 'ماكينة لحام القوس الكهربائي بحالة تشغيلية جيدة' },
        { en: 'Welding machine earthing/return cable connected properly.', ar: 'توصيل كابل التأريض/الراجع لماكينة اللحام بشكل صحيح' },
        { en: 'Welding cables are in good working order.', ar: 'كابلات اللحام بحالة جيدة وخالية من التلف' },
        { en: 'Operators are in possession of the appropriate PPE specified for the job.', ar: 'امتلاك المشغلين معدات الوقاية المخصصة لهذا العمل' },
        { en: 'Stand-by fire watcher or fire marshal is present.', ar: 'وجود مراقب حريق متأهب طوال فترة العمل' },
      ],
    },
  },

  // سلسلة الموافقات — بترتيب النموذج المعتمد
  chain: [
    { key: 'siteManager', en: 'Site Manager', ar: 'مدير الموقع', name: 'Mostafa Mukhtar' },
    { key: 'hseSupervisor', en: 'HSE Supervisor', ar: 'مشرف السلامة HSE', name: 'Mohammed Naveed' },
    { key: 'consultantEngineer', en: 'Consultant Engineer', ar: 'مهندس الاستشاري', name: 'M. Hassan' },
    { key: 'hseConsultant', en: 'HSE Consultant', ar: 'استشاري السلامة HSE', name: 'Anwar Ali' },
  ],

  creator: { key: 'creator', en: 'Permit Originator', ar: 'منشئ التصريح (مشرف المقاول)', name: 'Sayed Moqeer' },

  companies: ['RBC', 'ESCC', 'SCC'],

  // أدوار الفريق — أول خمسة أدوار تشغيلية تظهر في مبدّل الدخول
  teamRoles: [
    { key: 'creator', ar: 'منشئ تصاريح (مشرف مقاول)', duty: true },
    { key: 'siteManager', ar: 'مدير الموقع', duty: true },
    { key: 'hseSupervisor', ar: 'مشرف السلامة HSE', duty: true },
    { key: 'consultantEngineer', ar: 'مهندس الاستشاري', duty: true },
    { key: 'hseConsultant', ar: 'استشاري السلامة HSE', duty: true },
    { key: 'inspector', ar: 'فاحص معدات', duty: false },
    { key: 'worker', ar: 'عامل تنفيذ', duty: false },
  ],

  equipmentTypes: {
    forklift: { ar: 'فوركلفت', en: 'Forklift', icon: 'truck',
      items: ['الفرامل وفرامل اليد', 'الإضاءة والمنبه الصوتي وإنذار الرجوع', 'الشوك والسلاسل الرافعة', 'عدم وجود تسريب هيدروليكي', 'الإطارات وحالتها', 'حزام الأمان ومقعد السائق', 'رخصة المشغل سارية', 'طفاية حريق داخل المعدة'] },
    loader: { ar: 'لودر', en: 'Loader', icon: 'truck',
      items: ['الفرامل والتوجيه', 'الإضاءة وإنذار الرجوع', 'الدلو وأذرع الرفع', 'عدم وجود تسريب زيوت', 'الإطارات', 'حزام الأمان والكابينة (ROPS)', 'رخصة المشغل سارية', 'طفاية حريق'] },
    dumper: { ar: 'قلاب', en: 'Dumper', icon: 'truck',
      items: ['الفرامل', 'الإضاءة وإنذار الرجوع', 'رافعة الصندوق (الهيدروليك)', 'الإطارات', 'المرايا والرؤية', 'حزام الأمان', 'رخصة السائق سارية', 'غطاء الحمولة'] },
    compactor: { ar: 'دكاكة', en: 'Compactor', icon: 'cog',
      items: ['الفرامل وجهاز الاهتزاز', 'عدم وجود تسريب وقود/زيت', 'الأسطوانة وحالتها', 'إنذار الرجوع', 'واقيات الأجزاء المتحركة', 'حالة المقابض (لليدوية)', 'رخصة المشغل'] },
    manlift: { ar: 'مانلفت', en: 'Manlift', icon: 'lift',
      items: ['فحص السلة والبوابة', 'أحزمة الأمان ونقاط التثبيت', 'الأذرع والمفاصل الهيدروليكية', 'أزرار الطوارئ والإنزال اليدوي', 'استواء الأرضية ومساند التثبيت', 'شهادة الفحص (Third Party) سارية', 'رخصة المشغل سارية', 'تحديد منطقة العمل بالحواجز'] },
    scaffold: { ar: 'سقالة', en: 'Scaffold', icon: 'grid',
      items: ['بطاقة السقالة (Tag) محدثة', 'قواعد الارتكاز والألواح السفلية', 'التربيط والتدعيم (Bracing)', 'الدرابزين العلوي والأوسط', 'ألواح المشي مكتملة ومثبتة', 'سلم الصعود وبوابة الوصول', 'التثبيت بالمبنى (Ties)', 'عدم تجاوز الحمولة المسموحة'] },
    fireExt: { ar: 'طفاية حريق', en: 'Fire Extinguisher', icon: 'flame',
      items: ['مؤشر الضغط في المنطقة الخضراء', 'مسمار الأمان والختم سليم', 'الخرطوم والفوهة بحالة جيدة', 'جسم الطفاية خالٍ من الصدأ والتلف', 'الوزن مطابق', 'سهولة الوصول وظهور العلامة', 'ملصق الفحص الشهري محدث'] },
  },

  // كود اللون الشهري (ملصق الفحص)
  monthColors: [
    { ar: 'أزرق', hex: '#2c5d9c' }, { ar: 'أخضر', hex: '#1d7a4c' }, { ar: 'أصفر', hex: '#e8c400' },
    { ar: 'أحمر', hex: '#bd3a2a' }, { ar: 'أزرق', hex: '#2c5d9c' }, { ar: 'أخضر', hex: '#1d7a4c' },
    { ar: 'أصفر', hex: '#e8c400' }, { ar: 'أحمر', hex: '#bd3a2a' }, { ar: 'أزرق', hex: '#2c5d9c' },
    { ar: 'أخضر', hex: '#1d7a4c' }, { ar: 'أصفر', hex: '#e8c400' }, { ar: 'أحمر', hex: '#bd3a2a' },
  ],

  // مكتبة المخاطر — تُبنى منها الاقتراحات الذكية
  riskLibrary: [
    {
      match: ['ردم', 'دك', 'backfill', 'compact', 'تسوية', 'grading'],
      activity: 'أعمال الردم والدك والتسوية',
      rows: [
        { hazard: 'دهس العمال من المعدات الثقيلة (لودر/قلاب/دكاكة)', control: 'مراقب حركة (Banksman) لكل معدة\nفصل مسارات المشاة عن المعدات\nإنذار رجوع فعال وسترات عاكسة', sev: 5, lik: 3 },
        { hazard: 'انبعاث الغبار والتأثير على الجهاز التنفسي', control: 'رش الماء بشكل دوري\nكمامات غبار N95 للعمال القريبين', sev: 2, lik: 4 },
        { hazard: 'انقلاب المعدات على الحواف والمنحدرات', control: 'تحديد مسافة آمنة من الحواف\nفحص ثبات التربة قبل العمل', sev: 4, lik: 2 },
        { hazard: 'الضوضاء والاهتزاز', control: 'سدادات أذن للمشغلين\nتناوب العمال على المعدات الاهتزازية', sev: 2, lik: 3 },
      ],
    },
    {
      match: ['حفر', 'excavat', 'trench', 'خندق'],
      activity: 'أعمال الحفر والخنادق',
      rows: [
        { hazard: 'انهيار جوانب الحفر على العمال', control: 'ميول آمنة أو تدعيم الجوانب (Shoring)\nمنع تخزين المواد على حافة الحفر\nفحص يومي بعد الأمطار', sev: 5, lik: 3 },
        { hazard: 'إصابة الخدمات المدفونة (كهرباء/ماء/اتصالات)', control: 'تصريح حفر ومسح للخدمات قبل البدء\nالحفر اليدوي بالقرب من الخدمات', sev: 5, lik: 2 },
        { hazard: 'سقوط الأشخاص أو المعدات داخل الحفر', control: 'حواجز صلبة وإضاءة ليلية\nسلالم وصول كل 7.5 متر', sev: 4, lik: 3 },
        { hazard: 'تجمع المياه أو الغازات داخل الحفر', control: 'مضخات لسحب المياه\nقياس الغازات للحفر العميقة قبل النزول', sev: 3, lik: 2 },
      ],
    },
    {
      match: ['لحام', 'قطع', 'weld', 'cut', 'grind', 'جلخ', 'ساخن', 'hot'],
      activity: 'الأعمال الساخنة (لحام / قطع / جلخ)',
      rows: [
        { hazard: 'نشوب حريق من الشرر المتطاير', control: 'تصريح أعمال ساخنة ساري\nإزالة المواد القابلة للاشتعال 11م\nمراقب حريق مع طفاية طوال العمل و30 دقيقة بعده', sev: 5, lik: 3 },
        { hazard: 'إصابة العين بوهج اللحام أو الشظايا', control: 'قناع لحام معتمد ونظارات للجلخ\nحواجز عزل لحماية الآخرين', sev: 3, lik: 4 },
        { hazard: 'استنشاق أدخنة اللحام', control: 'تهوية جيدة أو شفاطات موضعية\nكمامات مناسبة عند الحاجة', sev: 3, lik: 3 },
        { hazard: 'انفجار أو ارتداد لهب أسطوانات الغاز', control: 'مانع ارتداد اللهب\nفحص الخراطيم والوصلات\nتثبيت الأسطوانات قائمة', sev: 5, lik: 2 },
      ],
    },
    {
      match: ['صب', 'خرسان', 'concrete', 'pour', 'مضخة'],
      activity: 'أعمال صب الخرسانة',
      rows: [
        { hazard: 'حروق كيميائية من ملامسة الخرسانة للجلد', control: 'قفازات وأحذية مطاطية طويلة\nغسل الجلد فوراً عند الملامسة', sev: 2, lik: 4 },
        { hazard: 'اصطدام ذراع المضخة بالعمال أو المنشآت', control: 'مشغل معتمد للمضخة\nإبعاد العمال عن مدى حركة الذراع\nمراقب إشارات', sev: 4, lik: 2 },
        { hazard: 'حركة خلاطات الخرسانة داخل الموقع', control: 'مسار محدد ومراقب حركة\nممنوع المرور خلف الخلاطة أثناء الرجوع', sev: 4, lik: 3 },
        { hazard: 'انهيار الشدات أثناء الصب', control: 'اعتماد الشدات قبل الصب\nمراقبة الشدات أثناء الصب وإيقاف العمل عند أي تحرك', sev: 5, lik: 2 },
      ],
    },
    {
      match: ['رفع', 'رافعة', 'crane', 'lift', 'وينش'],
      activity: 'أعمال الرفع بالرافعات',
      rows: [
        { hazard: 'سقوط الحمولة على العمال', control: 'خطة رفع معتمدة ودراسة الأحمال\nحبال إرشاد (Tag lines)\nمنع الوقوف تحت الحمولة المعلقة', sev: 5, lik: 2 },
        { hazard: 'انقلاب الرافعة', control: 'فحص ثبات الأرضية وفرش المساند\nعدم تجاوز جدول الأحمال\nإيقاف الرفع عند رياح +32كم/س', sev: 5, lik: 2 },
        { hazard: 'فشل معدات الرفع (حبال/شراكل)', control: 'فحص معدات الرفع ووسمها بلون الشهر\nشهادات فحص سارية', sev: 4, lik: 2 },
        { hazard: 'ملامسة خطوط الكهرباء الهوائية', control: 'تحديد مسافات الأمان\nمراقب عند العمل قرب الخطوط', sev: 5, lik: 1 },
      ],
    },
    {
      match: ['ارتفاع', 'height', 'سقالة', 'scaffold', 'سطح', 'سلم'],
      activity: 'العمل على ارتفاع',
      rows: [
        { hazard: 'سقوط الأشخاص من الارتفاع', control: 'حزام أمان كامل مع نقطة تثبيت\nسقالات مكتملة بدرابزين\nمنع العمل على الحواف المكشوفة دون حماية', sev: 5, lik: 3 },
        { hazard: 'سقوط الأدوات والمواد على من بالأسفل', control: 'تحديد منطقة السقوط بالحواجز\nربط العدد اليدوية\nألواح إزاحة (Toe boards)', sev: 4, lik: 3 },
        { hazard: 'انهيار أو انقلاب السقالة', control: 'تركيب بواسطة مختص وبطاقة معتمدة\nفحص أسبوعي وبعد الرياح', sev: 5, lik: 2 },
      ],
    },
    {
      match: ['محصور', 'confined', 'خزان', 'منهول', 'tank', 'manhole'],
      activity: 'الدخول للأماكن المحصورة',
      rows: [
        { hazard: 'نقص الأكسجين أو وجود غازات سامة', control: 'قياس الغازات قبل وأثناء الدخول\nتهوية مستمرة\nتصريح دخول مكان محصور', sev: 5, lik: 3 },
        { hazard: 'صعوبة الإنقاذ في الطوارئ', control: 'مراقب خارجي دائم\nخطة إنقاذ وطاقم مدرب\nحبل إنقاذ وترايبود عند الحاجة', sev: 5, lik: 2 },
        { hazard: 'الغرق بتدفق مفاجئ للمياه أو المواد', control: 'عزل وقفل مصادر التدفق (LOTO)\nمراقبة الطقس', sev: 5, lik: 1 },
      ],
    },
    {
      match: ['كهرب', 'electric', 'كابل', 'لوحة', 'panel', 'توصيل'],
      activity: 'الأعمال الكهربائية',
      rows: [
        { hazard: 'الصعق الكهربائي', control: 'فصل وعزل المصدر (LOTO)\nالتحقق من انعدام الجهد قبل العمل\nكهربائي مرخص فقط', sev: 5, lik: 2 },
        { hazard: 'حريق ناتج عن قصر كهربائي', control: 'قواطع حماية (ELCB) للتوصيلات المؤقتة\nفحص الكابلات وعدم تمريرها في الممرات', sev: 4, lik: 2 },
        { hazard: 'استخدام عدد كهربائية تالفة', control: 'فحص ووسم العدد شهرياً بلون الشهر\nسحب أي عدة تالفة فوراً', sev: 3, lik: 3 },
      ],
    },
    {
      match: ['حديد', 'تسليح', 'rebar', 'steel', 'تركيب'],
      activity: 'أعمال حديد التسليح والتركيبات',
      rows: [
        { hazard: 'وخز أو جروح من أسياخ الحديد البارزة', control: 'أغطية حماية (Caps) على الأسياخ البارزة\nقفازات مقاومة للقطع', sev: 3, lik: 4 },
        { hazard: 'إصابات الظهر من الرفع اليدوي', control: 'الرفع الثنائي للأحمال الثقيلة\nتدريب على الرفع السليم\nاستخدام معدات للرفع فوق 25كجم', sev: 3, lik: 3 },
        { hazard: 'سقوط حزم الحديد أثناء المناولة', control: 'ربط الحزم بشكل سليم\nمنع المرور تحت الحمولة', sev: 4, lik: 2 },
      ],
    },
  ],
};

/* ============================================================
   البيانات التجريبية (Seed) — تُنشأ عند أول تشغيل فقط
   ============================================================ */

function seedEmployees() {
  return [
    { id: 'e1', name: 'Sayed Moqeer', role: 'creator', company: 'RBC', phone: '', active: true },
    { id: 'e2', name: 'Mostafa Mukhtar', role: 'siteManager', company: 'RBC', phone: '', active: true },
    { id: 'e3', name: 'Mohammed Naveed', role: 'hseSupervisor', company: 'RBC', phone: '', active: true },
    { id: 'e4', name: 'M. Hassan', role: 'consultantEngineer', company: 'ESCC', phone: '', active: true },
    { id: 'e5', name: 'Anwar Ali', role: 'hseConsultant', company: 'ESCC', phone: '', active: true },
    { id: 'e6', name: 'Khalid Rehman', role: 'inspector', company: 'RBC', phone: '', active: true },
    { id: 'e7', name: 'Mostafa Ahmed', role: 'worker', company: 'RBC', phone: '', active: true },
    { id: 'e8', name: 'Ahmed Khafagy', role: 'worker', company: 'RBC', phone: '', active: true },
    { id: 'e9', name: 'Mahmoud Reda', role: 'worker', company: 'RBC', phone: '', active: true },
    { id: 'e10', name: 'Amr Mohamed', role: 'worker', company: 'RBC', phone: '', active: true },
    { id: 'e11', name: 'Mohamed Amjad', role: 'worker', company: 'RBC', phone: '', active: true },
    { id: 'e12', name: 'Rahim Khan', role: 'worker', company: 'RBC', phone: '', active: true },
  ];
}

function hseSeed() {
  const now = new Date();
  const d = (offsetDays, h = 7, m = 0) => {
    const x = new Date(now); x.setDate(x.getDate() + offsetDays); x.setHours(h, m, 0, 0); return x.toISOString();
  };
  const day = (offsetDays) => d(offsetDays).slice(0, 10);

  // توقيع تجريبي مرسوم من الاسم
  const sig = (name) => {
    const c = document.createElement('canvas'); c.width = 320; c.height = 110;
    const ctx = c.getContext('2d');
    ctx.strokeStyle = '#1a2a55'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.font = 'italic 44px "Segoe Script", "Brush Script MT", cursive';
    ctx.fillStyle = '#1a2a55';
    ctx.save(); ctx.translate(18, 74); ctx.rotate(-0.05);
    ctx.fillText(name.split(' ')[0], 0, 0);
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(16, 88);
    ctx.bezierCurveTo(90, 78, 180, 98, 300, 84); ctx.stroke();
    return c.toDataURL('image/png');
  };

  const C = HSE.chain;
  const ap = (i, when) => ({ role: C[i].key, name: C[i].name, sig: sig(C[i].name), at: when });
  const fullCk = (n) => Array.from({ length: n }, (_, i) => (i === 5 ? 3 : 1)); // بند الكيماويات N/A غالباً

  const permits = [
    {
      id: 'p840', type: 'G', seq: 840, building: 'B02', discipline: 'Civil',
      desc: 'Backfilling work at (B02) between [Y18–Y14] under SOG',
      descAr: 'أعمال ردم في المبنى B02 بين المحاور Y18–Y14 تحت أرضية SOG',
      equipment: 'Loader, Dumper, Compactor',
      workers: ['Mostafa Ahmed', 'Sayed Moqeer'],
      dateFrom: day(-3), dateTo: day(-3), timeFrom: '06:30', timeTo: '16:00',
      checklist: fullCk(10), stage: 4,
      approvals: [ap(0, d(-3, 6, 40)), ap(1, d(-3, 6, 52)), ap(2, d(-3, 7, 5)), ap(3, d(-3, 7, 18))],
      rejection: null, extension: null,
      closeout: { date: day(-3), time: '15:45', note: 'All work completed and area has been cleared.', by: 'M. Hassan', sig: sig('M. Hassan'), at: d(-3, 15, 45) },
      createdBy: HSE.creator.name, createdAt: d(-3, 6, 30),
    },
    {
      id: 'p841', type: 'G', seq: 841, building: 'B02', discipline: 'Electrical',
      desc: 'Pour concrete foundation at B02 (Unloading Area)',
      descAr: 'صب قواعد خرسانية في المبنى B02 (منطقة التفريغ)',
      equipment: 'Concrete pump, Mixer trucks, Vibrator',
      workers: ['Mostafa Ahmed', 'Amr Mohamed', 'Mohamed Amjad'],
      dateFrom: day(-1), dateTo: day(0), timeFrom: '07:00', timeTo: '16:00',
      checklist: fullCk(10), stage: 4,
      approvals: [ap(0, d(-1, 6, 45)), ap(1, d(-1, 6, 58)), ap(2, d(-1, 7, 12)), ap(3, d(-1, 7, 30))],
      rejection: null,
      extension: { from: '16:00', to: '19:00', by: 'M. Hassan', sig: sig('M. Hassan'), at: d(0, 15, 20) },
      closeout: null,
      createdBy: HSE.creator.name, createdAt: d(-1, 6, 35),
    },
    {
      id: 'p842', type: 'G', seq: 842, building: 'B02', discipline: 'Mechanical',
      desc: 'Putting sleeves for mechanical works at B02 (50mm–200mm UPVC sleeve pipes)',
      descAr: 'تركيب أكمام (Sleeves) للأعمال الميكانيكية في B02 بأقطار 50–200مم UPVC',
      equipment: 'Hand tools, Power tools',
      workers: ['Ahmed Khafagy'],
      dateFrom: day(0), dateTo: day(0), timeFrom: '07:00', timeTo: '16:00',
      checklist: fullCk(10), stage: 2,
      approvals: [ap(0, d(0, 6, 50)), ap(1, d(0, 7, 8)), null, null],
      rejection: null, extension: null, closeout: null,
      createdBy: HSE.creator.name, createdAt: d(0, 6, 42),
    },
    {
      id: 'p843', type: 'G', seq: 843, building: 'B09', discipline: 'Civil',
      desc: 'Grading and compaction of soil replacement layer, north side of permanent fence (B09)',
      descAr: 'تسوية ودك طبقة الإحلال الترابي شمال السور الدائم (B09)',
      equipment: 'Bobcat, Compactor, Hand compactor',
      workers: ['Sayed Moqeer', 'Rahim Khan'],
      dateFrom: day(0), dateTo: day(1), timeFrom: '07:00', timeTo: '16:00',
      checklist: fullCk(10), stage: 0,
      approvals: [null, null, null, null],
      rejection: null, extension: null, closeout: null,
      createdBy: HSE.creator.name, createdAt: d(0, 7, 55),
    },
    {
      id: 'p844', type: 'G', seq: 844, building: 'B04.01', discipline: 'Civil',
      desc: 'Backfilling work for second layer at Security Room (B04.01)',
      descAr: 'أعمال ردم الطبقة الثانية عند غرفة الأمن (B04.01)',
      equipment: 'Loader, Dumper, Compactor',
      workers: ['Sayed Moqeer'],
      dateFrom: day(0), dateTo: day(0), timeFrom: '07:30', timeTo: '16:00',
      checklist: fullCk(10), stage: 1,
      approvals: [ap(0, d(0, 7, 20)), null, null, null],
      rejection: null, extension: null, closeout: null,
      createdBy: HSE.creator.name, createdAt: d(0, 7, 10),
    },
    {
      id: 'p214', type: 'H', seq: 214, building: 'B01', discipline: 'Civil',
      desc: 'Cutting the excess steel at B01 (grinding)',
      descAr: 'قص زوائد حديد التسليح في المبنى B01 (جلخ)',
      equipment: 'Grinder, Generator',
      workers: ['Mahmoud Reda'],
      dateFrom: day(0), dateTo: day(0), timeFrom: '07:00', timeTo: '16:00',
      checklist: fullCk(12), stage: 4,
      approvals: [ap(0, d(0, 6, 55)), ap(1, d(0, 7, 6)), ap(2, d(0, 7, 25)), ap(3, d(0, 7, 41))],
      rejection: null, extension: null, closeout: null,
      createdBy: HSE.creator.name, createdAt: d(0, 6, 48),
    },
    {
      id: 'p215', type: 'H', seq: 215, building: 'MOB-B10', discipline: 'Mechanical',
      desc: 'Relocate the temporary fence (welding – grinding)',
      descAr: 'نقل السور المؤقت (لحام وجلخ)',
      equipment: 'Welding machine, Grinder',
      workers: ['Mahmoud Reda', 'Ahmed Khafagy'],
      dateFrom: day(-1), dateTo: day(-1), timeFrom: '13:00', timeTo: '16:00',
      checklist: (() => { const a = fullCk(12); a[11] = 2; return a; })(), // لا يوجد مراقب حريق
      stage: 1,
      approvals: [ap(0, d(-1, 12, 30)), null, null, null],
      rejection: { by: 'Mohammed Naveed', role: 'hseSupervisor', note: 'لا يوجد مراقب حريق متفرغ في الموقع — يُعاد التقديم بعد تعيين Fire Watcher وتوفير بطانية حريق إضافية.', at: d(-1, 12, 50) },
      extension: null, closeout: null,
      createdBy: HSE.creator.name, createdAt: d(-1, 12, 20),
    },
  ];

  const equipment = [
    { id: 'eq1', code: 'EQ-001', type: 'forklift', model: 'Toyota 8FD45', plate: '7841 TKD', location: 'B02 — منطقة التفريغ',
      inspections: [
        { id: 'i1', date: day(-9), by: 'Mohammed Naveed', result: 'pass', notes: '', items: [1,1,1,1,1,1,1,1] },
        { id: 'i0', date: day(-40), by: 'Mohammed Naveed', result: 'pass', notes: '', items: [1,1,1,1,1,1,1,1] },
      ] },
    { id: 'eq2', code: 'EQ-002', type: 'loader', model: 'CAT 950GC', plate: '5512 HSA', location: 'B02',
      inspections: [
        { id: 'i2', date: day(-4), by: 'Khalid Rehman', result: 'pass', notes: '', items: [1,1,1,1,1,1,1,1] },
      ] },
    { id: 'eq3', code: 'EQ-003', type: 'dumper', model: 'Mercedes Actros', plate: '9034 RBD', location: 'B09',
      inspections: [
        { id: 'i3', date: day(-38), by: 'Mohammed Naveed', result: 'pass', notes: 'يُعاد الفحص الشهري', items: [1,1,1,1,1,1,1,1] },
      ] },
    { id: 'eq4', code: 'EQ-004', type: 'compactor', model: 'Bomag BW211', plate: '—', location: 'B09',
      inspections: [
        { id: 'i4', date: day(-2), by: 'Khalid Rehman', result: 'fail', notes: 'تسريب زيت هيدروليك من الجهة اليسرى — أوقفت عن العمل لحين الإصلاح.', items: [1,2,1,1,1,1,1] },
      ] },
    { id: 'eq5', code: 'EQ-005', type: 'manlift', model: 'JLG 450AJ', plate: '—', location: 'B01',
      inspections: [
        { id: 'i5', date: day(-6), by: 'Mohammed Naveed', result: 'pass', notes: '', items: [1,1,1,1,1,1,1,1] },
      ] },
    { id: 'eq6', code: 'EQ-006', type: 'scaffold', model: 'Cuplock — واجهة شمالية', plate: '—', location: 'B02',
      inspections: [
        { id: 'i6', date: day(-5), by: 'Khalid Rehman', result: 'pass', notes: '', items: [1,1,1,1,1,1,1,1] },
      ] },
    { id: 'eq7', code: 'EQ-007', type: 'fireExt', model: 'DCP 6kg', plate: 'FE-B02-12', location: 'B02 — البوابة الرئيسية',
      inspections: [
        { id: 'i7', date: day(-33), by: 'Mohammed Naveed', result: 'pass', notes: '', items: [1,1,1,1,1,1,1] },
      ] },
  ];

  const assessments = [
    {
      id: 'ra11', seq: 11, activity: 'أعمال الردم والدك في المبنى B02', location: 'B02', date: day(-3),
      by: HSE.creator.name,
      rows: HSE.riskLibrary[0].rows.map(r => ({ ...r })),
    },
    {
      id: 'ra12', seq: 12, activity: 'قص وجلخ زوائد الحديد في B01', location: 'B01', date: day(0),
      by: HSE.creator.name,
      rows: HSE.riskLibrary[2].rows.map(r => ({ ...r })),
    },
  ];

  return {
    v: 2,
    counters: { G: 845, H: 216, RA: 13, INS: 20, EMP: 13 },
    currentRole: 'creator',
    savedSignatures: {},
    employees: seedEmployees(),
    permits, equipment, assessments,
  };
}
