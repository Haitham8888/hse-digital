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
    { key: 'admin', ar: 'مسؤول النظام (Admin)', duty: true },
    { key: 'creator', ar: 'منشئ تصاريح (مشرف مقاول)', duty: true },
    { key: 'siteManager', ar: 'مدير الموقع', duty: true },
    { key: 'hseSupervisor', ar: 'مشرف السلامة HSE', duty: true },
    { key: 'consultantEngineer', ar: 'مهندس الاستشاري', duty: true },
    { key: 'hseConsultant', ar: 'استشاري السلامة HSE', duty: true },
    { key: 'inspector', ar: 'فاحص معدات', duty: false },
    { key: 'worker', ar: 'عامل تنفيذ', duty: false },
  ],

  /* بنود أساس مشتركة لكل عائلة معدات — تُدمج مع بنود كل نوع */
  eqBase: {
    mobile: [
      { en: 'Brakes and parking brake operational', ar: 'الفرامل وفرامل الانتظار تعمل بكفاءة' },
      { en: 'Lights, horn and reverse alarm working', ar: 'الإضاءة والمنبه وإنذار الرجوع تعمل' },
      { en: 'Tires / tracks in good condition', ar: 'الإطارات / الجنازير بحالة جيدة' },
      { en: 'No hydraulic / oil / fuel leaks', ar: 'لا يوجد تسريب هيدروليك / زيت / وقود' },
      { en: 'Mirrors, cabin glass and wipers', ar: 'المرايا وزجاج الكابينة والمساحات سليمة' },
      { en: 'Seat belt and operator cabin (ROPS) in good condition', ar: 'حزام الأمان وكابينة المشغل (ROPS) سليمة' },
      { en: 'Fire extinguisher available in cabin', ar: 'طفاية حريق متوفرة داخل الكابينة' },
      { en: 'Operator license valid (SAG/Aramco equivalent)', ar: 'رخصة المشغل سارية' },
      { en: 'Third-party inspection certificate valid', ar: 'شهادة الفحص من طرف ثالث سارية' },
      { en: 'Monthly color code tag updated', ar: 'ملصق كود اللون الشهري محدث' },
    ],
    power: [
      { en: 'Body / casing free from damage', ar: 'جسم المعدة سليم بلا كسور أو تلف' },
      { en: 'Power cable and plug undamaged', ar: 'كابل الكهرباء والقابس بدون تلف أو وصلات مكشوفة' },
      { en: 'All guards in place and secured', ar: 'جميع الواقيات مركبة ومثبتة' },
      { en: 'ON/OFF switch and emergency stop working', ar: 'مفتاح التشغيل وزر الطوارئ يعملان' },
      { en: 'No abnormal noise or vibration', ar: 'لا يوجد صوت أو اهتزاز غير طبيعي' },
      { en: 'Monthly color code tag updated', ar: 'ملصق كود اللون الشهري محدث' },
      { en: 'Operator trained for this tool', ar: 'المشغل مدرب على هذه المعدة' },
    ],
    lifting: [
      { en: 'No cracks, deformation or corrosion', ar: 'لا توجد شقوق أو تشوه أو صدأ' },
      { en: 'SWL clearly marked and not exceeded', ar: 'حمولة العمل الآمنة (SWL) موضحة وغير متجاوزة' },
      { en: 'Third-party certificate valid', ar: 'شهادة الفحص من طرف ثالث سارية' },
      { en: 'Monthly color code tag updated', ar: 'ملصق كود اللون الشهري محدث' },
    ],
  },

  /* كتالوج المعدات — نموذج مستقل لكل نوع (مطابق لملفات مجلد Checklists في Drive) */
  equipmentTypes: {
    loader: { ar: 'لودر', en: 'Loader', icon: 'truck', family: 'mobile', extra: [
      { en: 'Bucket, boom arms and pins in good condition', ar: 'الدلو وأذرع الرفع والمسامير بحالة جيدة' },
      { en: 'Steering system operational', ar: 'نظام التوجيه يعمل بكفاءة' } ] },
    excavator: { ar: 'حفارة', en: 'Excavator', icon: 'truck', family: 'mobile', extra: [
      { en: 'Boom, arm, bucket and teeth condition', ar: 'الذراع والبوم والدلو والأسنان بحالة جيدة' },
      { en: 'Slew ring and swing operation smooth', ar: 'حلقة الدوران وحركة الالتفاف سلسة' },
      { en: 'Quick coupler locking pin secured', ar: 'قفل الوصلة السريعة مؤمَّن' } ] },
    bobcat: { ar: 'بوبكات', en: 'Bobcat (Skid Steer)', icon: 'truck', family: 'mobile', extra: [
      { en: 'Attachment locking pins engaged', ar: 'مسامير تثبيت الملحقات مقفلة' },
      { en: 'Lift arms and safety lock', ar: 'أذرع الرفع وقفل الأمان' } ] },
    jcb: { ar: 'جي سي بي (حفار لودر)', en: 'JCB (Backhoe Loader)', icon: 'truck', family: 'mobile', extra: [
      { en: 'Front bucket and rear backhoe condition', ar: 'الدلو الأمامي والحفار الخلفي بحالة جيدة' },
      { en: 'Stabilizer legs operational', ar: 'أرجل التثبيت تعمل' } ] },
    grader: { ar: 'قريدر', en: 'Grader', icon: 'truck', family: 'mobile', extra: [
      { en: 'Blade and circle drive condition', ar: 'الشفرة ومحرك الدوران بحالة جيدة' } ] },
    dumper: { ar: 'قلاب', en: 'Dumper', icon: 'truck', family: 'mobile', extra: [
      { en: 'Tipping body and hydraulic hoist', ar: 'صندوق القلب والرافع الهيدروليكي سليم' },
      { en: 'Load properly covered / secured', ar: 'الحمولة مغطاة ومؤمنة' } ] },
    trailer: { ar: 'تريلة', en: 'Trailer', icon: 'truck', family: 'mobile', extra: [
      { en: 'Kingpin / hitch and landing gear', ar: 'وصلة القطر وأرجل الارتكاز سليمة' },
      { en: 'Load binders and lashing points', ar: 'أربطة تثبيت الحمولة ونقاط الربط' } ] },
    waterTanker: { ar: 'وايت ماء', en: 'Water Tanker', icon: 'truck', family: 'mobile', extra: [
      { en: 'Tank mounting and valves — no leaks', ar: 'تثبيت الخزان والمحابس بدون تسريب' } ] },
    dieselTanker: { ar: 'وايت ديزل', en: 'Diesel Tanker', icon: 'truck', family: 'mobile', extra: [
      { en: 'Bonding/earthing cable and spill kit available', ar: 'كابل التأريض وعدة الانسكابات متوفرة' },
      { en: 'Hazard placards and fire extinguishers (2)', ar: 'لوحات الخطورة وطفايتا حريق' } ] },
    transitMixer: { ar: 'خلاطة ناقلة', en: 'Transit Mixer', icon: 'truck', family: 'mobile', extra: [
      { en: 'Drum, chute and ladder condition', ar: 'الحلة والمزلق وسلم الصعود بحالة جيدة' } ] },
    towerCrane: { ar: 'كرين برجي', en: 'Tower Crane', icon: 'lift', family: 'mobile', extra: [
      { en: 'Load moment indicator (LMI) functional', ar: 'مؤشر عزم الحمولة (LMI) يعمل' },
      { en: 'Hoist ropes and hook safety latch', ar: 'حبال الرفع ولسان أمان الخطاف' },
      { en: 'Limit switches operational', ar: 'مفاتيح الحد تعمل' },
      { en: 'Certified operator and rigger available', ar: 'مشغل ورقّاص معتمدان' } ] },
    mobileCrane: { ar: 'كرين متحرك', en: 'Mobile Crane', icon: 'lift', family: 'mobile', extra: [
      { en: 'Outriggers fully extended with mats', ar: 'المساند ممدودة بالكامل مع ألواح ارتكاز' },
      { en: 'Load chart available, LMI functional', ar: 'جدول الأحمال متوفر وLMI يعمل' },
      { en: 'Hook block and safety latch', ar: 'بكرة الخطاف ولسان الأمان سليمة' },
      { en: 'Boom sections and wire ropes condition', ar: 'أجزاء الذراع وحبال السلك بحالة جيدة' } ] },
    hydra: { ar: 'كرين هيدرا', en: 'Hydra Crane', icon: 'lift', family: 'mobile', extra: [
      { en: 'Boom, hook and safety latch condition', ar: 'الذراع والخطاف ولسان الأمان سليمة' },
      { en: 'Load chart displayed in cabin', ar: 'جدول الأحمال معروض في الكابينة' } ] },
    forklift: { ar: 'فوركلفت', en: 'Forklift', icon: 'truck', family: 'mobile', extra: [
      { en: 'Forks, carriage and mast chains', ar: 'الشوك والحامل وسلاسل الصاري سليمة' },
      { en: 'Overhead guard in place', ar: 'مظلة الحماية العلوية مركبة' } ] },
    /* مانلفت والمقص: البنود الـ12 الحرفية من نموذج Drive المعتمد */
    manlift: { ar: 'مانلفت', en: 'Manlift', icon: 'lift', family: null, extra: [
      { en: 'Wheels, tires & axles – condition/inflation; Hydraulic components – condition/leaks', ar: 'العجلات والإطارات والمحاور — الحالة والنفخ؛ ومكونات الهيدروليك — الحالة والتسريب' },
      { en: 'Engine – fluids/filters/belts/hoses', ar: 'المحرك — السوائل والفلاتر والسيور والخراطيم' },
      { en: 'Fuel tank/level & Hydraulic oil level', ar: 'خزان الوقود ومستواه ومستوى زيت الهيدروليك' },
      { en: 'Lights & strobes; Placards/labels/decals', ar: 'الإضاءة والومّاضات؛ اللوحات والملصقات الإرشادية' },
      { en: 'All controls – clearly marked / hold to run', ar: 'جميع أزرار التحكم موضحة وتعمل بنظام الضغط المستمر' },
      { en: 'Batteries – clean/dry/secure/caps-cables/level', ar: 'البطاريات — نظيفة وجافة ومثبتة وبأغطيتها وكابلاتها ومستواها' },
      { en: 'Weather-resistant storage compartment – appropriate manuals', ar: 'صندوق حفظ مقاوم للعوامل الجوية مع كتيبات التشغيل' },
      { en: 'Front & reverse horn', ar: 'المنبه الأمامي وإنذار الرجوع' },
      { en: 'Machine physically good & certified by competent authority', ar: 'المعدة سليمة ومعتمدة من جهة فحص مختصة' },
      { en: 'Fire extinguisher in operator cabin', ar: 'طفاية حريق في كابينة المشغل' },
      { en: 'First aid box in operator cabin', ar: 'صندوق إسعافات أولية في الكابينة' },
      { en: 'Operator has valid and suitable license', ar: 'المشغل يحمل رخصة سارية ومناسبة' } ] },
    scissorLift: { ar: 'مقص هيدروليكي', en: 'Scissor Lift', icon: 'lift', family: null, extra: 'SAME:manlift' },
    breaker: { ar: 'بريكر (كسارة)', en: 'Breaker', icon: 'cog', family: 'mobile', extra: [
      { en: 'Breaker attachment pins and hoses', ar: 'مسامير وخراطيم ملحق التكسير سليمة' } ] },
    compactor: { ar: 'دكاكة', en: 'Compactor (Roller)', icon: 'cog', family: 'mobile', extra: [
      { en: 'Drum condition and vibration system', ar: 'الأسطوانة ونظام الاهتزاز بحالة جيدة' } ] },
    /* الدكاكة اليدوية: البنود الـ16 الحرفية من نموذج Drive */
    smallCompactor: { ar: 'دكاكة يدوية', en: 'Small Compactor', icon: 'cog', family: null, extra: [
      { en: 'Check the external frame for any damage or cracks', ar: 'فحص الهيكل الخارجي من أي تلف أو شقوق' },
      { en: 'Ensure all bolts and screws are properly tightened', ar: 'التأكد من إحكام ربط جميع المسامير والبراغي' },
      { en: 'Clean the machine from accumulated dust and oil', ar: 'تنظيف المكينة من الغبار والزيوت المتراكمة' },
      { en: 'Check engine oil level', ar: 'فحص مستوى زيت المحرك' },
      { en: 'Check air filter condition', ar: 'فحص حالة فلتر الهواء' },
      { en: 'Verify fuel level', ar: 'التأكد من مستوى الوقود' },
      { en: 'Ensure there are no fuel or oil leaks', ar: 'التأكد من عدم وجود تسريب وقود أو زيت' },
      { en: 'Confirm engine sound is normal with no unusual noises', ar: 'صوت المحرك طبيعي بدون أصوات غريبة' },
      { en: 'Start and stop functions operate smoothly', ar: 'التشغيل والإيقاف يعملان بسلاسة' },
      { en: 'Check throttle / foot pedal moves freely', ar: 'دواسة الوقود تتحرك بحرية' },
      { en: 'Inspect electrical wiring and connections', ar: 'فحص الأسلاك والتوصيلات الكهربائية' },
      { en: 'Verify vibration level during operation is normal', ar: 'مستوى الاهتزاز أثناء التشغيل طبيعي' },
      { en: 'Check for cracks or damage in the compaction plate', ar: 'فحص لوح الدك من الشقوق أو التلف' },
      { en: 'Ensure the compaction plate is securely mounted', ar: 'لوح الدك مثبت بإحكام' },
      { en: 'Confirm compaction performance is effective', ar: 'أداء الدك فعال وضمن المعايير' },
      { en: 'Inspect safety features (guards, sensors)', ar: 'فحص وسائل الأمان (واقيات، حساسات)' } ] },
    /* مكينة دق الشيتات: البنود الـ15 الحرفية من نموذج Drive */
    sheetPiling: { ar: 'مكينة دق الشيتات', en: 'Sheet-Piling Machine', icon: 'cog', family: null, extra: [
      { en: 'Check machine cleanliness and ensure no damage', ar: 'نظافة المكينة والتأكد من عدم وجود تلف' },
      { en: 'Verify engine oil, coolant, and fuel levels', ar: 'فحص مستويات الزيت وسائل التبريد والوقود' },
      { en: 'Inspect hydraulic hoses for leaks', ar: 'فحص خراطيم الهيدروليك من التسريب' },
      { en: 'Test emergency brake and electrical systems', ar: 'اختبار فرامل الطوارئ والأنظمة الكهربائية' },
      { en: 'Ensure the leader/mast is straight and bolts are tight', ar: 'استقامة الصاري وإحكام مسامير التثبيت' },
      { en: 'Check cabin readiness (gauges, seat, seatbelt)', ar: 'جاهزية الكابينة (العدادات، المقعد، الحزام)' },
      { en: 'Assess ground stability and worksite conditions', ar: 'تقييم ثبات الأرضية وظروف الموقع' },
      { en: 'Monitor vibration, noise, and unusual movements', ar: 'مراقبة الاهتزاز والضوضاء وأي حركة غير طبيعية' },
      { en: 'Ensure sheet piles are driven vertically and aligned', ar: 'دق الشيتات عموديًا وباستقامة' },
      { en: 'Maintain communication with the signal man/ground crew', ar: 'التواصل المستمر مع المُشير وطاقم الأرض' },
      { en: 'Monitor hydraulic pressure', ar: 'مراقبة ضغط الهيدروليك' },
      { en: 'Lower the hammer/vibro to a safe resting position', ar: 'إنزال المطرقة لوضع آمن بعد العمل' },
      { en: 'Shut down the machine and apply parking brakes', ar: 'إطفاء المكينة وتفعيل فرامل الانتظار' },
      { en: 'Inspect for leaks or damage after work', ar: 'الفحص من التسريب أو التلف بعد العمل' },
      { en: 'Clean the machine and record any notes', ar: 'تنظيف المكينة وتسجيل الملاحظات' } ] },
    laserScreed: { ar: 'مكينة تسوية ليزر', en: 'Laser Screed Machine', icon: 'cog', family: 'mobile', extra: [
      { en: 'Laser transmitter/receiver calibrated', ar: 'جهاز الليزر معاير' },
      { en: 'Screed head and augers condition', ar: 'رأس التسوية والبريمات بحالة جيدة' } ] },
    boomPump: { ar: 'مضخة خرسانة (بوم)', en: 'Concrete Pump (Boom Placer)', icon: 'truck', family: 'mobile', extra: [
      { en: 'Boom sections, pipes and clamps secured', ar: 'أجزاء الذراع والمواسير والأربطة مؤمنة' },
      { en: 'Outriggers on mats, ground stable', ar: 'المساند على ألواح والأرضية ثابتة' },
      { en: 'End hose whip check in place', ar: 'رباط أمان الخرطوم الطرفي مركب' } ] },
    smallPump: { ar: 'مضخة خرسانة صغيرة', en: 'Small Concrete Pump', icon: 'cog', family: 'power', extra: [
      { en: 'Delivery pipes and couplings secured', ar: 'مواسير الضخ والوصلات مؤمنة' },
      { en: 'Grill guard over hopper in place', ar: 'شبكة الحماية على القادوس مركبة' } ] },
    weldingMachine: { ar: 'مكينة لحام', en: 'Welding Machine', icon: 'flame', family: 'power', extra: [
      { en: 'Earthing / return cable connected properly', ar: 'كابل التأريض/الراجع موصول بشكل صحيح' },
      { en: 'Welding cables and holder insulation intact', ar: 'عزل كابلات اللحام والماسك سليم' },
      { en: 'Welding PPE available (mask, gloves, apron)', ar: 'معدات وقاية اللحام متوفرة' } ] },
    portableGrinder: { ar: 'صاروخ (جلاخة يدوية)', en: 'Portable Grinder', icon: 'cog', family: 'power', extra: [
      { en: 'Disc correct type, undamaged, within expiry', ar: 'القرص من النوع الصحيح وغير تالف وضمن الصلاحية' },
      { en: 'Guard adjusted, handle fitted', ar: 'الواقي مضبوط والمقبض الجانبي مركب' },
      { en: 'Dead-man switch (no lock-on) working', ar: 'مفتاح الأمان اللحظي يعمل (بدون تثبيت)' } ] },
    pedestalGrinder: { ar: 'جلاخة ثابتة', en: 'Pedestal Grinder', icon: 'cog', family: 'power', extra: [
      { en: 'Tool rest gap ≤ 3mm, eye shield fitted', ar: 'مسند الشغل ≤ 3مم وواقي العين مركب' },
      { en: 'Wheel sound (ring test), correctly mounted', ar: 'الحجر سليم ومركب بشكل صحيح' } ] },
    generator: { ar: 'مولد كهرباء', en: 'Diesel Generator', icon: 'cog', family: 'power', extra: [
      { en: 'Earthing rod connected', ar: 'قضيب التأريض موصول' },
      { en: 'ELCB / breakers functional', ar: 'قواطع الحماية (ELCB) تعمل' },
      { en: 'Drip tray / bunding, no fuel leaks', ar: 'صينية التنقيط موجودة ولا تسريب وقود' },
      { en: 'Exhaust directed away, canopy closed', ar: 'العادم موجه بعيدًا والغطاء مغلق' } ] },
    airCompressor: { ar: 'ضاغط هواء', en: 'Air Compressor', icon: 'cog', family: 'power', extra: [
      { en: 'Pressure gauge and safety valve working', ar: 'ساعة الضغط وصمام الأمان يعملان' },
      { en: 'Hoses and whip-check connectors secured', ar: 'الخراطيم وأربطة الأمان مؤمنة' } ] },
    concreteMixer: { ar: 'خلاطة خرسانة', en: 'Concrete Mixer', icon: 'cog', family: 'power', extra: [
      { en: 'Drum gear and tipping mechanism', ar: 'ترس الحلة وآلية القلب سليمة' },
      { en: 'Drive guards over belts/gears', ar: 'واقيات السيور والتروس مركبة' } ] },
    vibrator: { ar: 'هزاز خرسانة', en: 'Concrete Vibrator', icon: 'cog', family: 'power', extra: [
      { en: 'Poker head and flexible shaft condition', ar: 'رأس الهزاز والعمود المرن بحالة جيدة' } ] },
    barBending: { ar: 'مكينة ثني حديد', en: 'Bar Bending Machine', icon: 'cog', family: 'power', extra: [
      { en: 'Foot pedal / controls functional', ar: 'دواسة القدم وأزرار التحكم تعمل' },
      { en: 'Bending rollers and pins condition', ar: 'بكرات ومسامير الثني بحالة جيدة' } ] },
    barCutting: { ar: 'مكينة قص حديد', en: 'Bar Cutting Machine', icon: 'cog', family: 'power', extra: [
      { en: 'Blade condition and guard in place', ar: 'الشفرة سليمة والواقي مركب' } ] },
    drill: { ar: 'دريل', en: 'Drill Machine', icon: 'cog', family: 'power', extra: [
      { en: 'Chuck and bits in good condition', ar: 'الظرف والريش بحالة جيدة' } ] },
    circularSaw: { ar: 'منشار دائري', en: 'Circular Saw', icon: 'cog', family: 'power', extra: [
      { en: 'Retractable blade guard operates freely', ar: 'واقي الشفرة المتحرك يعمل بحرية' },
      { en: 'Riving knife fitted, blade sharp', ar: 'سكين الفلق مركب والشفرة حادة' } ] },
    benchCutting: { ar: 'منشار طاولة', en: 'Bench Cutting Machine', icon: 'cog', family: 'power', extra: [
      { en: 'Blade guard and push stick available', ar: 'واقي الشفرة وعصا الدفع متوفران' } ] },
    gasCuttingSet: { ar: 'طقم قص بالغاز', en: 'Gas Cutting Set', icon: 'flame', family: 'power', extra: [
      { en: 'Flashback arresters on both cylinders', ar: 'مانعا ارتداد اللهب على الأسطوانتين' },
      { en: 'Hoses, gauges and torch — no leaks', ar: 'الخراطيم والساعات والشعلة بدون تسريب' },
      { en: 'Cylinders upright, secured, capped', ar: 'الأسطوانات قائمة ومثبتة ومغطاة' } ] },
    winch: { ar: 'ونش', en: 'Winch Machine', icon: 'lift', family: 'power', extra: [
      { en: 'Wire rope condition, drum anchored', ar: 'حبل السلك سليم والبكرة مثبتة' },
      { en: 'Brake and limit switch working', ar: 'الفرامل ومفتاح الحد يعملان' } ] },
    pumpMotor: { ar: 'مضخة/موتور كهربائي', en: 'Electrical Pump-Motor', icon: 'cog', family: 'power', extra: [
      { en: 'Connections via ELCB, no exposed wiring', ar: 'التوصيل عبر قاطع حماية وبدون أسلاك مكشوفة' } ] },
    powerPanel: { ar: 'لوحة كهرباء', en: 'Electrical Power Panel', icon: 'cog', family: 'power', extra: [
      { en: 'ELCB/RCD tested and functional', ar: 'قاطع التسريب الأرضي مختبر ويعمل' },
      { en: 'Panel door closed, danger sign posted', ar: 'باب اللوحة مغلق ولوحة تحذير مثبتة' },
      { en: 'Cable glands and covers in place', ar: 'جلود الكابلات والأغطية مركبة' } ] },
    floorGrinder: { ar: 'مكينة جلي أرضيات', en: 'Floor Grinding Machine', icon: 'cog', family: 'power', extra: [
      { en: 'Grinding discs secured, water feed works', ar: 'أقراص الجلي مثبتة وتغذية الماء تعمل' } ] },
    floorPolisher: { ar: 'مكينة تلميع خرسانة', en: 'Concrete Floor Polisher', icon: 'cog', family: 'power', extra: [
      { en: 'Polishing pads condition, splash guard', ar: 'أقراص التلميع سليمة وواقي الرذاذ مركب' } ] },
    vacuum: { ar: 'مكينة شفط', en: 'Vacuum Cleaner Machine', icon: 'cog', family: 'power', extra: [
      { en: 'Filter and collection tank clean', ar: 'الفلتر وخزان التجميع نظيفان' } ] },
    chainPulley: { ar: 'سلسلة رفع (بلوك)', en: 'Chain Pulley Block', icon: 'lift', family: 'lifting', extra: [
      { en: 'Chain links and hooks — no wear/stretch', ar: 'حلقات السلسلة والخطاطيف بدون تآكل أو استطالة' },
      { en: 'Brake holds load, safety latches work', ar: 'الفرامل تمسك الحمل وألسنة الأمان تعمل' } ] },
    liftingTools: { ar: 'عدد رفع (اسلنقات وشراكل)', en: 'Lifting Tools & Tackles', icon: 'lift', family: 'lifting', extra: [
      { en: 'Slings/webbing — no cuts or fraying', ar: 'الاسلنقات بدون قطوع أو تنسيل' },
      { en: 'Shackles with correct pins, not bent', ar: 'الشراكل بمساميرها الصحيحة وغير منحنية' } ] },
    scaffold: { ar: 'سقالة', en: 'Scaffolding', icon: 'grid', family: null, extra: [
      { en: 'Scaffold tag (green) valid and signed', ar: 'بطاقة السقالة (خضراء) سارية وموقعة' },
      { en: 'Base plates / sole boards on firm ground', ar: 'قواعد الارتكاز على أرضية ثابتة' },
      { en: 'Standards, ledgers and bracing complete', ar: 'القوائم والمدادات والتدعيم مكتملة' },
      { en: 'Guardrails, mid-rails and toe boards', ar: 'الدرابزين العلوي والأوسط وألواح الإزاحة' },
      { en: 'Platform fully boarded, boards secured', ar: 'منصة العمل مكتملة الألواح ومثبتة' },
      { en: 'Safe ladder access with gate', ar: 'سلم وصول آمن مع بوابة' },
      { en: 'Tied to structure as per design', ar: 'مربوطة بالمنشأ حسب التصميم' },
      { en: 'Not overloaded, materials stacked safely', ar: 'غير محملة فوق طاقتها والمواد مرتبة' },
      { en: 'Weekly inspection recorded', ar: 'الفحص الأسبوعي مسجل' } ] },
    fireExt: { ar: 'طفاية حريق', en: 'Fire Extinguisher', icon: 'flame', family: null, extra: [
      { en: 'Pressure gauge in green zone', ar: 'مؤشر الضغط في المنطقة الخضراء' },
      { en: 'Safety pin and tamper seal intact', ar: 'مسمار الأمان والختم سليمان' },
      { en: 'Hose and nozzle unobstructed', ar: 'الخرطوم والفوهة بحالة جيدة وغير مسدودة' },
      { en: 'Body free from rust/damage', ar: 'الجسم خالٍ من الصدأ والتلف' },
      { en: 'Weight/charge as per specification', ar: 'الوزن/الشحنة مطابقة للمواصفة' },
      { en: 'Accessible, visible, signage posted', ar: 'سهلة الوصول وظاهرة مع لوحة دلالة' },
      { en: 'Monthly inspection sticker updated', ar: 'ملصق الفحص الشهري محدث' } ] },
    confinedSpace: { ar: 'مكان محصور', en: 'Confined Space', icon: 'alert', family: null, extra: [
      { en: 'Entry permit issued and valid', ar: 'تصريح دخول صادر وساري' },
      { en: 'Gas test done (O2, LEL, H2S, CO)', ar: 'قياس الغازات تم (أكسجين، غازات قابلة للاشتعال، سامة)' },
      { en: 'Continuous ventilation provided', ar: 'تهوية مستمرة متوفرة' },
      { en: 'Stand-by man present with communication', ar: 'مراقب خارجي متواجد مع وسيلة اتصال' },
      { en: 'Rescue plan and equipment (tripod) ready', ar: 'خطة إنقاذ ومعداتها (ترايبود) جاهزة' },
      { en: 'Energy sources isolated (LOTO)', ar: 'مصادر الطاقة معزولة (LOTO)' },
      { en: 'Lighting 24V / intrinsically safe', ar: 'الإضاءة 24 فولت / آمنة جوهريًا' } ] },
  },

  ownership: [
    { key: 'own', en: 'Own', ar: 'ملك' },
    { key: 'hired', en: 'Hired', ar: 'مستأجرة' },
    { key: 'contractor', en: 'Contractor', ar: 'مقاول من الباطن' },
  ],

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

/* الطاقم الحقيقي — مستخرج من وثائق المشروع نفسها:
   الهيكل التنظيمي.docx، سجل التحضير Safety Inducted FO.xlsx،
   التقارير الأسبوعية/الشهرية 2024-2025، والتصاريح الموقعة (السابقة PTW).
   الترتيب مهم: أول نشط بالدور هو المعتمد الظاهر في سلسلة التواقيع. */
const REAL_ROSTER = [
  { id: 'e0', name: 'Admin', role: 'admin', company: 'SCC', phone: '', active: true },
  // منشئو التصاريح — مهندسو الموقع (سجل التحضير)
  { id: 'e1', name: 'Ahmed Ramdan', role: 'creator', company: 'RBC', phone: '', active: true },
  { id: 'e7', name: 'Mustafa Ahmed', role: 'creator', company: 'RBC', phone: '', active: true },
  // إدارة الموقع (الهيكل التنظيمي + توقيعات 2025)
  { id: 'e2', name: 'Mustafa Mukhtar', role: 'siteManager', company: 'RBC', phone: '', active: true },
  { id: 'e25', name: 'Samy Magdy', role: 'siteManager', company: 'RBC', phone: '', active: true },
  { id: 'e26', name: 'El-Bahrawy Gado', role: 'siteManager', company: 'RBC', phone: '966535823231', active: true },
  // مشرفو السلامة (الهيكل التنظيمي + توقيعات التصاريح)
  { id: 'e3', name: 'Mohammed Naveed', role: 'hseSupervisor', company: 'RBC', phone: '', active: true },
  { id: 'e13', name: 'Tanveer Ahmed', role: 'hseSupervisor', company: 'RBC', phone: '', active: true },
  { id: 'e14', name: 'Irfan Naveed', role: 'hseSupervisor', company: 'RBC', phone: '', active: true },
  { id: 'e15', name: 'Zahid', role: 'hseSupervisor', company: 'RBC', phone: '', active: true },
  // مهندسو الاستشاري ESCC (توقيعات التصاريح 2024-2025)
  { id: 'e4', name: 'Ahmed Salem', role: 'consultantEngineer', company: 'ESCC', phone: '', active: true },
  { id: 'e21', name: 'Ahmed Fadel', role: 'consultantEngineer', company: 'ESCC', phone: '', active: true },
  { id: 'e22', name: 'Karim Hesham', role: 'consultantEngineer', company: 'ESCC', phone: '', active: true },
  { id: 'e23', name: 'M. Hassan', role: 'consultantEngineer', company: 'ESCC', phone: '', active: true },
  // استشاريو السلامة ESCC
  { id: 'e5', name: 'Emad Sabbagh', role: 'hseConsultant', company: 'ESCC', phone: '', active: true },
  { id: 'e24', name: 'Anwar Ali', role: 'hseConsultant', company: 'ESCC', phone: '', active: true },
  // فاحصو المعدات — مهندسو ومسؤولو السلامة (سجل التحضير + التقارير)
  { id: 'e6', name: 'Khalid Rehman', role: 'inspector', company: 'RBC', phone: '', active: true },
  { id: 'e16', name: 'Feras Hatan', role: 'inspector', company: 'RBC', phone: '', active: true },
  { id: 'e17', name: 'Abdullah Al-Haqwi', role: 'inspector', company: 'RBC', phone: '', active: true },
  { id: 'e18', name: 'Abdulrahman Zain Al-Deen', role: 'inspector', company: 'RBC', phone: '966557437556', active: true },
  { id: 'e19', name: 'Fuad Allayl', role: 'inspector', company: 'RBC', phone: '', active: true },
  { id: 'e20', name: 'Abdullah Muaidi', role: 'inspector', company: 'RBC', phone: '', active: true },
  // المشرفون والعمال المنفذون (الهيكل التنظيمي + التصاريح + المخالفات)
  { id: 'e27', name: 'Abdulrahman Jamal', role: 'worker', company: 'RBC', phone: '', active: true },
  { id: 'e28', name: 'Sadky Kamel', role: 'worker', company: 'RBC', phone: '', active: true },
  { id: 'e29', name: 'Ahmed Rabie', role: 'worker', company: 'RBC', phone: '', active: true },
  { id: 'e30', name: 'Abdelaziz Tariq', role: 'worker', company: 'RBC', phone: '', active: true },
  { id: 'e31', name: 'Ibrahim Morsi', role: 'worker', company: 'RBC', phone: '', active: true },
  { id: 'e8', name: 'Ahmed Khafagy', role: 'worker', company: 'RBC', phone: '', active: true },
  { id: 'e9', name: 'Mahmoud Reda', role: 'worker', company: 'RBC', phone: '', active: true },
  { id: 'e10', name: 'Amr Mohamed', role: 'worker', company: 'RBC', phone: '', active: true },
  { id: 'e11', name: 'Mohamed Amjad', role: 'worker', company: 'RBC', phone: '', active: true },
  { id: 'e12', name: 'Rahim Khan', role: 'worker', company: 'RBC', phone: '', active: true },
  { id: 'e32', name: 'Ramy Abdelwahab', role: 'worker', company: 'SUB', phone: '', active: true },
  { id: 'e33', name: 'Farrag Omar Ali', role: 'worker', company: 'SUB', phone: '966546640956', active: true },
];

function seedEmployees() {
  return withEmail_(REAL_ROSTER.map(e => ({ ...e })));
}

/* تحديث سجل قائم بالطاقم الحقيقي — لا يلمس أي موظف عُدّل يدويًا */
function applyRealRoster(db) {
  const byId = new Map(db.employees.map(e => [e.id, e]));
  const changed = [];
  REAL_ROSTER.forEach(r => {
    const cur = byId.get(r.id);
    if (!cur) {
      const ne = { email: '', ...r };
      db.employees.push(ne); changed.push(ne.id);
    } else if (!cur.updatedAt) {
      // لم يُعدل يدويًا قط — حدّثه بالبيانات الموثقة
      Object.assign(cur, { name: r.name, role: r.role, company: r.company });
      if (r.phone && !cur.phone) cur.phone = r.phone;
      changed.push(cur.id);
    }
  });
  return changed;
}

function withEmail_(list) {
  return list.map(e => ({ email: '', ...e }));
}

/* تحويل صف من مكتبة المخاطر إلى صف تقييم بأعمدة النموذج المعتمد */
function raRowFromLib(r) {
  return {
    hazard: r.hazard, risks: '', consequence: '',
    control: r.control, p: r.lik, s: r.sev, resP: 1, resS: r.sev,
  };
}

/* تركيب بنود كل نموذج معدة: بنود العائلة + البنود الخاصة (أو نسخ نموذج آخر) */
(function buildEquipmentItems() {
  const T = HSE.equipmentTypes;
  Object.keys(T).forEach(k => {
    const t = T[k];
    if (typeof t.extra === 'string' && t.extra.indexOf('SAME:') === 0) {
      t.items = T[t.extra.slice(5)].extra.slice();
      return;
    }
    t.items = [...(HSE.eqBase[t.family] || []), ...(t.extra || [])];
  });
})();

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
        { id: 'i1', date: day(-9), by: 'Mohammed Naveed', result: 'fit', notes: '', items: [1,1,1,1,1,1,1,1] },
        { id: 'i0', date: day(-40), by: 'Mohammed Naveed', result: 'fit', notes: '', items: [1,1,1,1,1,1,1,1] },
      ] },
    { id: 'eq2', code: 'EQ-002', type: 'loader', model: 'CAT 950GC', plate: '5512 HSA', location: 'B02',
      inspections: [
        { id: 'i2', date: day(-4), by: 'Khalid Rehman', result: 'fit', notes: '', items: [1,1,1,1,1,1,1,1] },
      ] },
    { id: 'eq3', code: 'EQ-003', type: 'dumper', model: 'Mercedes Actros', plate: '9034 RBD', location: 'B09',
      inspections: [
        { id: 'i3', date: day(-38), by: 'Mohammed Naveed', result: 'fit', notes: 'يُعاد الفحص الشهري', items: [1,1,1,1,1,1,1,1] },
      ] },
    { id: 'eq4', code: 'EQ-004', type: 'compactor', model: 'Bomag BW211', plate: '—', location: 'B09',
      inspections: [
        { id: 'i4', date: day(-2), by: 'Khalid Rehman', result: 'unfit', notes: 'تسريب زيت هيدروليك من الجهة اليسرى — أوقفت عن العمل لحين الإصلاح.', items: [1,2,1,1,1,1,1] },
      ] },
    { id: 'eq5', code: 'EQ-005', type: 'manlift', model: 'JLG 450AJ', plate: '—', location: 'B01',
      inspections: [
        { id: 'i5', date: day(-6), by: 'Mohammed Naveed', result: 'fit', notes: '', items: [1,1,1,1,1,1,1,1] },
      ] },
    { id: 'eq6', code: 'EQ-006', type: 'scaffold', model: 'Cuplock — واجهة شمالية', plate: '—', location: 'B02',
      inspections: [
        { id: 'i6', date: day(-5), by: 'Khalid Rehman', result: 'fit', notes: '', items: [1,1,1,1,1,1,1,1] },
      ] },
    { id: 'eq7', code: 'EQ-007', type: 'fireExt', model: 'DCP 6kg', plate: 'FE-B02-12', location: 'B02 — البوابة الرئيسية',
      inspections: [
        { id: 'i7', date: day(-33), by: 'Mohammed Naveed', result: 'fit', notes: '', items: [1,1,1,1,1,1,1] },
      ] },
  ];

  const assessments = [
    {
      id: 'ra11', seq: 11, refNo: 'RBC-HSE-011', activity: 'أعمال الردم والدك في المبنى B02', location: 'B02',
      assessor: 'HSE Department', date: day(-3), by: HSE.creator.name,
      rows: HSE.riskLibrary[0].rows.map(raRowFromLib),
    },
    {
      id: 'ra12', seq: 12, refNo: 'RBC-HSE-012', activity: 'قص وجلخ زوائد الحديد في B01', location: 'B01',
      assessor: 'HSE Department', date: day(0), by: HSE.creator.name,
      rows: HSE.riskLibrary[2].rows.map(raRowFromLib),
    },
  ];

  return {
    v: 3,
    counters: { G: 845, H: 216, RA: 54, INS: 20, EMP: 13 },
    currentRole: 'creator',
    savedSignatures: {},
    settings: {},
    employees: seedEmployees(),
    permits, equipment, assessments,
  };
}
