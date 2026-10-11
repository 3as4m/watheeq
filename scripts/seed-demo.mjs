// Fills the community with realistic demo content so it doesn't look empty.
//   npm run db:seed          add demo members, courses, posts, events
//   npm run db:seed -- --clean   remove everything this script added
// Demo accounts have no password and are banned, so nobody can sign in as them.
// Every row created here is recorded in private.demo_seed so --clean removes exactly that.
import 'dotenv/config'
import pg from 'pg'

const client = new pg.Client({
  host: `db.${process.env.SUPABASE_PROJECT_REF}.supabase.co`,
  port: 5432,
  user: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
})

const people = {
  salma: { name: 'د. سلمى الحربي', bio: 'مستشارة أسرية وتربوية، أرافق الأسر منذ خمسة عشر عامًا.', location: 'الدوحة', role: 'moderator', extra: 610 },
  noura: { name: 'نورة العتيبي', bio: 'أم لثلاثة أطفال، معلمة رياض أطفال سابقة.', location: 'الرياض', extra: 170 },
  khalid: { name: 'أبو عبدالله', bio: 'أب لولدين، أحاول أن أكون الأب الذي احتجته في صغري.', location: 'الكويت', extra: 82 },
  sara: { name: 'أم يوسف', bio: 'أم ليوسف (٧ سنوات) وليان (٣ سنوات).', location: 'جدة', extra: 60 },
  hind: { name: 'هند القحطاني', bio: 'أخصائية نفسية، مهتمة بنمو الطفل العاطفي.', location: 'الخبر', extra: 24 },
  mohammed: { name: 'محمد الشمري', bio: 'أب لمراهقة ومراهق، أتعلم كل يوم.', location: 'حائل', extra: 16 },
  abdulrahman: { name: 'عبدالرحمن السالم', bio: 'أب جديد لطفلة عمرها ستة أشهر.', location: 'الدوحة', extra: 4 },
  reem: { name: 'ريم الدوسري', bio: 'أم عاملة، أبحث عن توازن بين البيت والعمل.', location: 'الدمام', extra: 0 },
}

const courses = [
  {
    title: 'أساسيات التربية الواعية', level: 1,
    description: 'نقطة البداية لكل أسرة: ما معنى أن نربي بوعي، وكيف نفهم مراحل نمو أبنائنا، وكيف نكتب ميثاق بيتنا.',
    modules: [
      { title: 'لماذا نربي بوعي؟', lessons: [
        ['ما معنى التربية الواعية؟', 'التربية الواعية أن تتصرف مع طفلك عن فهم لا عن ردة فعل. أن تسأل نفسك قبل أن تغضب: ماذا يحتاج طفلي الآن؟ وماذا أريد أن يتعلم من هذا الموقف؟\n\nليست التربية الواعية تربية مثالية خالية من الأخطاء، بل تربية يراجع فيها الوالدان أنفسهما ويتعلمان من أخطائهما كما يتعلم الطفل من أخطائه.\n\nتمرين الأسبوع: اختر موقفًا واحدًا يتكرر في بيتك ويثير غضبك، واكتب ما الذي يحتاجه طفلك في تلك اللحظة.'],
        ['بين التربية بالخوف والتربية بالفهم', 'الخوف يصنع طاعة سريعة لكنها قصيرة العمر، تختفي حين يغيب الرقيب. أما الفهم فيصنع قناعة تبقى مع الطفل حين يكبر ويبتعد عنك.\n\nحين يفهم الطفل لماذا نطلب منه شيئًا، يصبح شريكًا في القرار لا منفذًا للأوامر. هذا لا يعني إلغاء الحدود، بل شرحها بلغة يفهمها.\n\nجرّب هذا الأسبوع أن تضيف كلمة «لأن» بعد كل طلب تطلبه من طفلك.'],
        ['ميثاق الأسرة: اكتب قيم بيتك', 'كل بيت تحكمه قيم، سواء كتبناها أم لم نكتبها. الفرق أن القيم المكتوبة نستطيع أن نعود إليها ونحاسب أنفسنا عليها.\n\nاجلس مع شريك حياتك واكتبا خمس قيم تريدان أن يكبر عليها أبناؤكما، مثل الصدق والرحمة والمسؤولية. ثم اكتبا تحت كل قيمة سلوكًا واحدًا يدل عليها في حياتكم اليومية.\n\nعلّقوا الميثاق في مكان يراه الجميع، وراجعوه معًا كل شهر.'],
      ] },
      { title: 'مراحل النمو', lessons: [
        ['من الولادة إلى ست سنوات: مرحلة الأمان', 'في هذه المرحلة يتعلم الطفل أهم درس في حياته: هل العالم مكان آمن؟ والجواب يأتي من طريقة استجابتك لبكائه وخوفه وحاجته إليك.\n\nالحضن والوقت واللعب ليست رفاهية في هذه المرحلة، بل هي الأساس الذي تبنى عليه كل مهارة لاحقة.'],
        ['من سبع إلى اثنتي عشرة سنة: مرحلة الكفاءة', 'يبدأ الطفل يسأل: هل أنا قادر؟ يحتاج أن يجرب وينجح ويخطئ ويحاول من جديد.\n\nامنحه مسؤوليات حقيقية تناسب عمره، وامدح جهده لا نتيجته فقط، فالمدح على الجهد يصنع طفلًا لا يخاف من المحاولة.'],
        ['المراهقة: الصديق قبل الموجّه', 'المراهق يبحث عن هويته، وكثيرًا ما يكون الابتعاد عن الوالدين جزءًا طبيعيًا من هذا البحث.\n\nالعلاقة التي بنيتها في السنوات السابقة هي رصيدك الآن. استمع أكثر مما تتكلم، واحترم خصوصيته، وكن الشخص الذي يعود إليه حين يخطئ.'],
      ] },
    ],
  },
  {
    title: 'فن الحوار مع الأبناء', level: 1,
    description: 'كيف تستمع لطفلك حتى يتكلم، وكيف تتكلم حتى يستمع. عبارات تبني وعبارات تهدم، وطريقة عملية لإدارة الخلاف.',
    modules: [
      { title: 'الاستماع أولًا', lessons: [
        ['الاستماع الفعّال', 'الاستماع الفعّال أن تنزل إلى مستوى عيني طفلك، وتترك ما في يدك، وتعيد عليه ما فهمته منه: «يبدو أنك حزين لأن صديقك لم يلعب معك».\n\nهذه الجملة البسيطة تقول له: أنا أراك وأفهمك. وغالبًا ما يهدأ الطفل بمجرد أن يشعر أنه مفهوم.'],
        ['تسمية المشاعر', 'الطفل الذي لا يعرف اسم ما يشعر به يعبر عنه بالصراخ أو الضرب. ساعده أن يسمي مشاعره: غضب، خيبة، غيرة، خوف.\n\nكلما اتسع قاموس طفلك العاطفي، قلّت نوبات غضبه.'],
      ] },
      { title: 'كلمات تبني', lessons: [
        ['عبارات تبني وعبارات تهدم', 'قارن بين «أنت دائمًا مهمل» و«لاحظت أن ألعابك ما زالت على الأرض، متى ستجمعها؟». الأولى تحكم على شخصه، والثانية تصف سلوكًا يمكن تغييره.\n\nاكتب ثلاث عبارات تكررها في بيتك وأعد صياغتها بحيث تصف السلوك لا الشخص.'],
        ['إدارة الخلاف بهدوء', 'حين يشتد الخلاف، الأولوية للتهدئة لا للحل. خذ نفسًا، واخفض صوتك، وقل: «سنتكلم حين نهدأ».\n\nبعد الهدوء اجلسا معًا: ما الذي حدث؟ ماذا شعر كل منا؟ ماذا نفعل في المرة القادمة؟'],
      ] },
    ],
  },
  {
    title: 'الاستقرار النفسي للطفل', level: 2,
    description: 'كيف نبني علاقة آمنة داخل البيت، ونتعامل مع القلق والخوف ونوبات الغضب، ونحمي أبناءنا من أثر الخلافات الأسرية.',
    modules: [
      { title: 'التعلق الآمن', lessons: [
        ['ما هو التعلق الآمن؟', 'التعلق الآمن هو شعور الطفل بأن والديه حاضران حين يحتاجهما. هذا الشعور يمنحه الشجاعة ليستكشف العالم وهو مطمئن أن له مكانًا يعود إليه.\n\nلا يحتاج التعلق الآمن إلى والدين مثاليين، بل إلى والدين يصلحان العلاقة بعد كل خلاف.'],
        ['إصلاح العلاقة بعد الخطأ', 'كلنا نغضب ونخطئ مع أبنائنا. المهم ما نفعله بعد ذلك. اعتذارك لطفلك لا ينقص من هيبتك، بل يعلمه أن الخطأ يُصلح وأن الحب لا يزول بالخلاف.'],
      ] },
      { title: 'المشاعر الصعبة', lessons: [
        ['نوبات الغضب: ماذا يحدث داخل الطفل؟', 'نوبة الغضب ليست عنادًا في أغلب الأحيان، بل جهاز عصبي لم ينضج بعد ولا يستطيع تنظيم مشاعر كبيرة.\n\nدورك أن تكون الهدوء الذي يستعيره طفلك حتى يتعلم أن يهدأ وحده.'],
        ['القلق والخوف عند الأطفال', 'لا تستهن بخوف طفلك ولا تضخمه. قل له: «أفهم أنك خائف، وأنا معك». ثم ساعده أن يواجه ما يخافه بخطوات صغيرة.'],
      ] },
    ],
  },
  {
    title: 'بناء العادات والانضباط', level: 2,
    description: 'روتين يومي يريح البيت، وعادات صحية في النوم والغذاء والشاشات، وانضباط يقوم على الاتفاق لا على العقاب.',
    modules: [
      { title: 'الروتين اليومي', lessons: [
        ['لماذا يحتاج الطفل إلى روتين؟', 'الروتين يمنح الطفل شعورًا بالأمان لأنه يعرف ماذا سيحدث بعد قليل. البيوت التي لها روتين واضح تقل فيها المعارك اليومية حول النوم والطعام.'],
        ['جدول الصباح والمساء', 'اصنع مع طفلك جدولًا مصورًا لخطوات الصباح والمساء، وعلّقه في غرفته. دع الجدول هو الذي يذكّره، لا صوتك.'],
      ] },
      { title: 'الشاشات والعادات الصحية', lessons: [
        ['اتفاقية الشاشات العائلية', 'بدل المنع المفاجئ، اكتبوا اتفاقية معًا: متى نستخدم الشاشات، وأين، وكم من الوقت. وليلتزم الكبار بها قبل الصغار.'],
        ['النوم أولًا', 'قلة النوم تظهر عند الأطفال في صورة عصبية وتشتت. اجعلوا الساعة الأخيرة قبل النوم بلا شاشات، بقصة وحديث هادئ.'],
      ] },
    ],
  },
  {
    title: 'مهارات القيادة لدى الأبناء', level: 3,
    description: 'كيف نربي أبناء يتحملون المسؤولية ويتخذون القرار ويؤثرون فيمن حولهم بقيمهم. تفتح هذه الدورة عند المستوى الثالث.',
    modules: [
      { title: 'المسؤولية', lessons: [
        ['مسؤوليات تناسب كل عمر', 'طفل الثالثة يستطيع أن يضع ملابسه في السلة، وطفل السابعة يستطيع أن يحضر حقيبته، والمراهق يستطيع أن يدير مصروفه. المسؤولية تبدأ صغيرة وتكبر مع الطفل.'],
        ['دع طفلك يقرر', 'امنح طفلك خيارات حقيقية: «تريد أن تذاكر قبل العشاء أم بعده؟». القرارات الصغيرة اليوم تدريب على القرارات الكبيرة غدًا.'],
      ] },
      { title: 'التأثير بالقيم', lessons: [
        ['القدوة قبل الكلام', 'أبناؤنا يتعلمون مما نفعل أكثر مما نقول. إن أردت ابنًا صادقًا فليرك صادقًا حتى في الأمور الصغيرة.'],
      ] },
    ],
  },
]

const day = 24 * 60 * 60 * 1000
const ago = (d, h = 0) => new Date(Date.now() - d * day - h * 3600_000)

const posts = [
  {
    by: 'salma', cat: 'عام', pinned: true, at: ago(14),
    title: 'أهلًا بكم في مجتمع وثيق: ابدأ من هنا',
    body: 'حياكم الله في مجتمع وثيق، ميثاق الأسرة الواعية.\n\nهذه مساحتكم لتسألوا وتشاركوا تجاربكم وتتعلموا معًا. نقترح عليكم أن تبدؤوا بثلاث خطوات:\n\n١. عرّفوا بأنفسكم في تعليق على هذا المنشور: من أنتم، وكم عمر أبنائكم.\n٢. ابدؤوا دورة «أساسيات التربية الواعية» في المكتبة.\n٣. سجلوا حضوركم في أقرب لقاء مباشر من صفحة اللقاءات.\n\nنتمنى لكم رحلة طيبة.',
    likes: ['noura', 'khalid', 'sara', 'hind', 'mohammed', 'abdulrahman', 'reem'],
    comments: [
      { by: 'noura', body: 'السلام عليكم، نورة من الرياض، أم لثلاثة: ١٠ و٧ وسنتين. سعيدة بوجودي معكم.', likes: ['salma', 'sara'] },
      { by: 'abdulrahman', body: 'عبدالرحمن من الدوحة، أب جديد لطفلة عمرها ستة أشهر. جئت أتعلم قبل أن تكبر المسؤولية!', likes: ['salma', 'khalid', 'noura'],
        replies: [{ by: 'salma', body: 'أهلًا عبدالرحمن، أجمل وقت للبدء هو الآن. دورة الأساسيات ستفيدك كثيرًا.' }] },
      { by: 'reem', body: 'ريم من الدمام، أم عاملة لولدين. أتمنى أجد هنا ما يعينني على التوازن.', likes: ['hind'] },
    ],
  },
  {
    by: 'sara', cat: 'أسئلة', at: ago(1, 3),
    title: 'ابني (٧ سنوات) يرفض أداء واجباته ويبكي كل مساء',
    body: 'كل يوم بعد العصر تبدأ نفس المعركة: أطلب منه يجلس للواجبات فيبكي ويقول إنه تعبان. جربت المكافآت وجربت أحرم الآيباد، ولكن الوضع يتكرر. هل من تجربة مشابهة؟',
    likes: ['noura', 'reem', 'hind'],
    comments: [
      { by: 'hind', body: 'أحيانًا يكون التعب حقيقيًا. جربي تعطينه نصف ساعة راحة ووجبة خفيفة بعد المدرسة قبل الواجبات، وقسمي الواجب على فترات قصيرة مع استراحات.', likes: ['sara', 'noura', 'salma'] },
      { by: 'salma', body: 'سؤال مهم: هل يبكي من صعوبة المادة نفسها أم من فكرة الجلوس؟ إذا كانت الصعوبة في القراءة مثلًا فقد يحتاج تقييمًا بسيطًا. وإذا كانت من الجلوس فالروتين الثابت يصنع فرقًا كبيرًا.', likes: ['sara', 'hind', 'khalid', 'reem'],
        replies: [{ by: 'sara', body: 'غالبًا من مادة الإملاء تحديدًا، ما انتبهت لهذا إلا الآن. جزاك الله خيرًا.' }] },
    ],
  },
  {
    by: 'khalid', cat: 'إنجازات', at: ago(2, 6),
    title: 'أول أسبوع بدون صراخ في البيت',
    body: 'بعد درس «إدارة الخلاف بهدوء» قررت أنا وزوجتي نجرب أسبوعًا كاملًا بدون رفع صوت. ما كان سهلًا، وفي يومين كدت أنفجر، ولكن الأولاد لاحظوا الفرق قبلنا. ابني الكبير قال لي أمس: «بابا صرت تسمعني أكثر». هذه الجملة كانت تكفيني.',
    likes: ['salma', 'noura', 'sara', 'hind', 'mohammed', 'reem', 'abdulrahman'],
    comments: [
      { by: 'noura', body: 'ما شاء الله، كلام ابنك أبكاني. الله يبارك لك فيهم.', likes: ['khalid'] },
      { by: 'mohammed', body: 'شجعتني، سأبدأ التجربة من الليلة.', likes: ['khalid', 'salma'] },
    ],
  },
  {
    by: 'salma', cat: 'نصائح', at: ago(3),
    title: 'خمس عبارات تقولها لطفلك كل يوم',
    body: '١. «أنا أحبك كما أنت.»\n٢. «أخطأت، وهذا طبيعي، المهم ماذا سنفعل الآن.»\n٣. «أنا فخور بمحاولتك.»\n٤. «أخبرني أكثر.»\n٥. «أنا هنا معك.»\n\nجربوها أسبوعًا وأخبروني بالنتيجة.',
    likes: ['noura', 'khalid', 'sara', 'hind', 'mohammed', 'abdulrahman', 'reem'],
    comments: [
      { by: 'reem', body: 'العبارة الرابعة غيرت طريقة حديث بنتي معي، صارت تحكي لي تفاصيل يومها.', likes: ['salma', 'noura'] },
    ],
  },
  {
    by: 'mohammed', cat: 'نقاشات', at: ago(4, 2),
    title: 'كيف تتعاملون مع جوال المراهق؟',
    body: 'بنتي عمرها ١٤ سنة وأخوها ١٢. أحس أن الجوال صار يأخذهم مني. المنع الكامل جربته ونتيجته عناد وكذب. ما الحل الوسط الذي نجح معكم؟',
    likes: ['khalid', 'hind', 'noura'],
    comments: [
      { by: 'noura', body: 'عندنا اتفاقية مكتوبة: لا جوالات على الطعام ولا في غرف النوم بعد العاشرة، والكبار يلتزمون مثل الصغار. أهم شيء أننا كتبناها معهم لا عليهم.', likes: ['mohammed', 'salma', 'khalid'] },
      { by: 'hind', body: 'أنصح بالحديث معهم عن المحتوى الذي يشاهدونه بفضول لا بتحقيق. اسأل: ما أكثر شيء أعجبك اليوم؟ ستتفاجأ بما يحكونه.', likes: ['mohammed'] },
      { by: 'salma', body: 'وتذكر أن المراهق يحتاج أن يشعر بالثقة. الرقابة الخفية إذا اكتُشفت تهدم ما بنيته في سنوات.', likes: ['mohammed', 'hind', 'khalid'] },
    ],
  },
  {
    by: 'noura', cat: 'نصائح', at: ago(6),
    title: 'جدول الصباح المصور أنقذ صباحاتنا',
    body: 'طبقت فكرة الجدول المصور من دورة العادات: صورت ابني الصغير وهو يغسل وجهه ويلبس ويأكل، وطبعتها ولصقتها على باب غرفته. صار يتبع الجدول بنفسه ويفرح وهو يضع علامة على كل خطوة. صباحاتنا صارت أهدأ بكثير.',
    likes: ['sara', 'reem', 'salma', 'abdulrahman'],
    comments: [
      { by: 'sara', body: 'فكرة رائعة، سأجربها مع ليان.', likes: ['noura'] },
    ],
  },
  {
    by: 'reem', cat: 'أسئلة', at: ago(8),
    title: 'شعور بالذنب لأني أم عاملة',
    body: 'أرجع من الدوام الساعة الرابعة وأحس أن الوقت المتبقي ما يكفي. كيف أعوض أولادي عن غيابي؟',
    likes: ['noura', 'sara', 'hind'],
    comments: [
      { by: 'hind', body: 'الأطفال لا يحتاجون وقتًا طويلًا بقدر ما يحتاجون وقتًا حاضرًا. عشرون دقيقة يوميًا لكل طفل، بلا جوال، يقود فيها هو اللعب، تصنع فرقًا لا تتخيلينه.', likes: ['reem', 'salma', 'noura', 'sara'] },
      { by: 'salma', body: 'والشعور بالذنب نفسه يسرق منك الحضور. سامحي نفسك، فأنتِ تعملين لأجلهم أيضًا.', likes: ['reem', 'hind'] },
    ],
  },
  {
    by: 'abdulrahman', cat: 'نقاشات', at: ago(10),
    title: 'ما الكتاب الذي غيّر نظرتك للتربية؟',
    body: 'أبحث عن كتب للبداية، خصوصًا للآباء الجدد. شاركونا الكتب التي أثرت فيكم.',
    likes: ['khalid', 'mohammed'],
    comments: [
      { by: 'khalid', body: 'أي كتاب يتحدث عن التعلق الآمن، فهمت منه لماذا يتعلق ابني بي بهذا الشكل.', likes: ['abdulrahman'] },
      { by: 'noura', body: 'أنصحك تبدأ بدورة الأساسيات هنا أولًا، ثم اختر الكتب على ضوء ما تحتاجه.', likes: ['abdulrahman', 'salma'] },
    ],
  },
]

const events = [
  { in: -9, hour: 20, mins: 60, title: 'لقاء التعارف الأول', description: 'لقاء مفتوح تعرفنا فيه على أعضاء المجتمع وتحدثنا عن أهم التحديات التي تواجه أسرنا.', rsvp: ['noura', 'khalid', 'sara', 'hind'] },
  { in: 3, hour: 20, mins: 75, title: 'لقاء مفتوح: نوبات الغضب عند الأطفال', description: 'تجيب د. سلمى الحربي عن أسئلتكم حول نوبات الغضب: لماذا تحدث، وكيف نتصرف أثناءها وبعدها. اكتبوا أسئلتكم مسبقًا في قسم الأسئلة.', rsvp: ['sara', 'noura', 'reem', 'abdulrahman', 'hind'] },
  { in: 10, hour: 19, mins: 90, title: 'ورشة: الشاشات في حياة أطفالنا', description: 'ورشة عملية نكتب فيها معًا اتفاقية الشاشات العائلية خطوة بخطوة. أحضروا ورقة وقلمًا.', rsvp: ['mohammed', 'khalid', 'noura'] },
  { in: 17, hour: 20, mins: 60, title: 'جلسة حوارية: كيف نتحدث مع المراهق؟', description: 'جلسة لأولياء أمور المراهقين، نتشارك فيها التجارب ونتعلم كيف نبقى قريبين من أبنائنا في هذه المرحلة.', rsvp: ['mohammed'] },
]

async function clean() {
  const has = (await client.query(`select to_regclass('private.demo_seed') as t`)).rows[0].t
  if (!has) { console.log('nothing to clean'); return }
  const rows = (await client.query('select kind, id from private.demo_seed')).rows
  const ids = (k) => rows.filter((r) => r.kind === k).map((r) => r.id)
  await client.query('delete from public.events where id = any($1::uuid[])', [ids('event')])
  await client.query('delete from public.courses where id = any($1::uuid[])', [ids('course')])
  // Deleting the users cascades to their profiles, memberships, posts, comments, likes and points.
  await client.query('delete from auth.users where id = any($1::uuid[])', [ids('user')])
  await client.query('drop table private.demo_seed')
  console.log(`removed ${ids('user').length} demo members, ${ids('course').length} courses, ${ids('event').length} events`)
}

async function seed() {
  await client.query('create table if not exists private.demo_seed (kind text not null, id uuid not null)')
  const already = (await client.query('select count(*)::int as n from private.demo_seed')).rows[0].n
  if (already) { console.log('demo content already present; run with --clean first'); return }
  const track = (kind, id) => client.query('insert into private.demo_seed values ($1, $2)', [kind, id])

  const cid = (await client.query('select id from public.communities order by created_at limit 1')).rows[0].id
  const cats = Object.fromEntries((await client.query('select name, id from public.categories where community_id = $1', [cid])).rows.map((r) => [r.name, r.id]))

  // Members: inserting into auth.users fires handle_new_user, which creates profile + membership.
  const uid = {}
  let i = 0
  for (const [key, p] of Object.entries(people)) {
    const joined = ago(40 - i * 3)
    const { rows } = await client.query(
      `insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, banned_until,
         raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
       values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', $1, '', now(), 'infinity',
         '{"provider":"email","providers":["email"]}', $2, $3, $3)
       returning id`,
      [`demo-${key}@watheeq.invalid`, { full_name: p.name, demo: true }, joined],
    )
    uid[key] = rows[0].id
    await track('user', uid[key])
    await client.query('update public.profiles set username = $2, bio = $3, location = $4, created_at = $5 where id = $1', [uid[key], `demo_${key}`, p.bio, p.location, joined])
    await client.query('update public.members set role = $3, joined_at = $4 where community_id = $1 and user_id = $2', [cid, uid[key], p.role ?? 'member', joined])
    i++
  }

  // Courses, modules, lessons
  for (const [ci, c] of courses.entries()) {
    const { rows } = await client.query(
      'insert into public.courses (community_id, title, description, position, published, min_level) values ($1, $2, $3, $4, true, $5) returning id',
      [cid, c.title, c.description, ci, c.level],
    )
    await track('course', rows[0].id)
    for (const [mi, m] of c.modules.entries()) {
      const mod = (await client.query('insert into public.modules (course_id, title, position) values ($1, $2, $3) returning id', [rows[0].id, m.title, mi])).rows[0].id
      for (const [li, [title, body]] of m.lessons.entries()) {
        await client.query('insert into public.lessons (module_id, title, body, position) values ($1, $2, $3, $4)', [mod, title, body, li])
      }
    }
  }

  // Posts, comments, likes. Like triggers keep counters and award points to authors.
  for (const p of posts) {
    const post = (await client.query(
      `insert into public.posts (community_id, author_id, category_id, title, body, pinned, created_at, updated_at, last_activity_at)
       values ($1, $2, $3, $4, $5, $6, $7, $7, $7) returning id`,
      [cid, uid[p.by], cats[p.cat] ?? null, p.title, p.body, !!p.pinned, p.at],
    )).rows[0].id
    for (const who of p.likes) await client.query('insert into public.post_likes (post_id, user_id, created_at) values ($1, $2, $3)', [post, uid[who], p.at])
    let t = p.at.getTime()
    let last = p.at
    const addComment = async (c, parent) => {
      t += (2 + Math.random() * 10) * 3600_000
      const at = new Date(Math.min(t, Date.now() - 60_000))
      const id = (await client.query(
        'insert into public.comments (post_id, author_id, parent_id, body, created_at) values ($1, $2, $3, $4, $5) returning id',
        [post, uid[c.by], parent, c.body, at],
      )).rows[0].id
      for (const who of c.likes ?? []) await client.query('insert into public.comment_likes (comment_id, user_id) values ($1, $2)', [id, uid[who]])
      last = at
      for (const r of c.replies ?? []) await addComment(r, id)
    }
    for (const c of p.comments) await addComment(c, null)
    // on_comment_change stamps last_activity_at with now(); restore the story's timeline.
    await client.query('update public.posts set last_activity_at = $2 where id = $1', [post, last])
  }
  // The like/comment triggers stamp activity with now(); put it back to the story's timeline.
  await client.query(`update public.point_log set created_at = now() - (random() * interval '14 days') where user_id = any($1::uuid[])`, [Object.values(uid)])

  // Extra history so levels and the leaderboard have a believable spread.
  for (const [key, p] of Object.entries(people)) {
    if (!p.extra) continue
    const chunks = 6
    for (let k = 0; k < chunks; k++) {
      const delta = Math.floor(p.extra / chunks) + (k === 0 ? p.extra % chunks : 0)
      if (delta) await client.query(`insert into public.point_log (community_id, user_id, delta, reason, created_at) values ($1, $2, $3, 'demo', $4)`, [cid, uid[key], delta, ago(5 + k * 9)])
    }
    await client.query('update public.members set points = points + $3 where community_id = $1 and user_id = $2', [cid, uid[key], p.extra])
  }

  // Events
  for (const e of events) {
    const start = new Date(Date.now() + e.in * day)
    start.setUTCHours(e.hour - 3, 0, 0, 0) // evening, Gulf time (UTC+3)
    const id = (await client.query(
      'insert into public.events (community_id, title, description, starts_at, ends_at, created_by) values ($1, $2, $3, $4, $5, $6) returning id',
      [cid, e.title, e.description, start, new Date(start.getTime() + e.mins * 60_000), uid.salma],
    )).rows[0].id
    await track('event', id)
    for (const who of e.rsvp) await client.query('insert into public.event_rsvps (event_id, user_id) values ($1, $2)', [id, uid[who]])
  }

  console.log(`added ${Object.keys(people).length} demo members, ${courses.length} courses, ${posts.length} posts, ${events.length} events`)
}

await client.connect()
try {
  await client.query('begin')
  if (process.argv.includes('--clean')) await clean()
  else await seed()
  await client.query('commit')
} catch (e) {
  await client.query('rollback')
  console.error('FAILED -', e.message)
  process.exitCode = 1
} finally {
  await client.end()
}
