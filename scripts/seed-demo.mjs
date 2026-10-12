// Fills the community with realistic demo content so it doesn't look empty.
//   npm run db:seed          add demo members, courses, posts, events
//   npm run db:seed -- --extras  add demo quizzes, quiz attempts and attendance (on top of an existing seed)
//   npm run db:seed -- --clean   remove everything this script added
// Demo accounts have no password and are banned, so nobody can sign in as them.
// Every row created here is recorded in private.demo_seed so --clean removes exactly that.
import 'dotenv/config'
import { dbClient } from './db.mjs'

const client = dbClient()

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

const mainCommunity = async () => (await client.query(`select id from public.communities where slug = 'watheeq'`)).rows[0].id

// Quizzes hang off lessons by title. kind defaults to single choice; `a` is the index (or indexes) of the right options.
const quizzes = [
  { lesson: 'بين التربية بالخوف والتربية بالفهم', title: 'اختبار: الخوف أم الفهم؟', questions: [
    { q: 'ما الذي تصنعه التربية بالخوف غالبًا؟', o: ['قناعة تبقى مع الطفل حين يكبر', 'طاعة سريعة تختفي حين يغيب الرقيب', 'ثقة أكبر بالنفس', 'حوارًا أعمق بين الطفل ووالديه'], a: 1,
      e: 'الخوف يصنع طاعة قصيرة العمر، أما الفهم فيصنع قناعة تبقى.' },
    { q: 'شرح سبب الطلب للطفل يعني إلغاء الحدود.', o: ['صحيح', 'خطأ'], a: 1, e: 'الفهم لا يلغي الحدود، بل يشرحها بلغة يفهمها الطفل.' },
    { q: 'أي العبارات تعبّر عن التربية بالفهم؟', kind: 'multiple', o: ['«افعل هذا لأنني قلت ذلك»', '«نطفئ الشاشة الآن لأن عينيك تحتاجان إلى راحة»', '«سأشرح لك لماذا نرتب الغرفة»', '«إن لم تفعل فستُعاقب»'], a: [1, 2] },
  ] },
  { lesson: 'ميثاق الأسرة: اكتب قيم بيتك', title: 'اختبار: ميثاق الأسرة', questions: [
    { q: 'ما فائدة كتابة قيم البيت؟', o: ['تزيين الجدار', 'نستطيع أن نعود إليها ونحاسب أنفسنا عليها', 'إلزام الأطفال وحدهم بها', 'لا فائدة منها'], a: 1 },
    { q: 'كم مرة يُقترح مراجعة الميثاق مع العائلة؟', o: ['كل يوم', 'كل شهر', 'مرة في السنة', 'عند حدوث مشكلة فقط'], a: 1 },
    { q: 'اكتب قيمتين تريد أن يكبر عليهما أبناؤك، وسلوكًا يوميًا يدل على كل منهما.', kind: 'text' },
  ] },
  { lesson: 'المراهقة: الصديق قبل الموجّه', title: 'اختبار: مرحلة المراهقة', questions: [
    { q: 'ابتعاد المراهق عن والديه أحيانًا هو:', o: ['علامة على فشل التربية', 'جزء طبيعي من بحثه عن هويته', 'سبب لفرض رقابة أشد', 'أمر يجب معاقبته عليه'], a: 1 },
    { q: 'ما الذي ينصح به الدرس مع المراهق؟', kind: 'multiple', o: ['أن تستمع أكثر مما تتكلم', 'أن تحترم خصوصيته', 'أن تقرأ رسائله دون علمه', 'أن تكون من يعود إليه حين يخطئ'], a: [0, 1, 3] },
  ] },
  { lesson: 'تسمية المشاعر', title: 'اختبار: قاموس المشاعر', questions: [
    { q: 'لماذا يصرخ الطفل أو يضرب أحيانًا؟', o: ['لأنه عنيد بطبعه', 'لأنه لا يعرف اسم ما يشعر به', 'لأنه يريد لفت الانتباه فقط', 'لأنه لا يحب والديه'], a: 1 },
    { q: 'كلما اتسع قاموس الطفل العاطفي:', o: ['زادت نوبات غضبه', 'قلّت نوبات غضبه', 'لا يتغير شيء', 'أصبح أكثر خجلًا'], a: 1 },
    { q: 'صف موقفًا حديثًا ساعدت فيه طفلك على تسمية شعوره، وماذا حدث بعدها؟', kind: 'text' },
  ] },
  { lesson: 'إدارة الخلاف بهدوء', title: 'اختبار: الخلاف الهادئ', questions: [
    { q: 'حين يشتد الخلاف، ما الأولوية؟', o: ['الوصول إلى حل فورًا', 'التهدئة', 'إثبات من المخطئ', 'رفع الصوت لإنهاء النقاش'], a: 1 },
    { q: 'رتّب الحوار بعد الهدوء: ما أول سؤال؟', o: ['ماذا نفعل في المرة القادمة؟', 'ما الذي حدث؟', 'من بدأ؟', 'لماذا لا تسمع الكلام؟'], a: 1 },
  ] },
  { lesson: 'إصلاح العلاقة بعد الخطأ', title: 'اختبار: إصلاح العلاقة', questions: [
    { q: 'اعتذار الوالد لطفله بعد الخطأ:', o: ['ينقص من هيبته', 'يعلّم الطفل أن الخطأ يُصلح', 'يجعل الطفل يتمادى', 'غير ضروري'], a: 1, e: 'الاعتذار يعلّم الطفل أن الحب لا يزول بالخلاف.' },
    { q: 'التعلق الآمن يحتاج إلى والدين مثاليين لا يخطئان.', o: ['صحيح', 'خطأ'], a: 1 },
  ] },
]

const reflections = [
  'الصدق: نقول الحقيقة حتى لو كانت صعبة. والرحمة: نساعد أخانا الصغير في واجباته دون أن يطلب.',
  'المسؤولية: كل واحد يرتب سريره صباحًا. والاحترام: لا نقاطع من يتكلم على مائدة العشاء.',
  'ابني غضب لأن أخته أخذت لعبته، قلت له: يبدو أنك غاضب لأنها أخذتها دون إذن. هدأ بسرعة وطلبها منها بنفسه.',
  'ابنتي كانت تبكي قبل المدرسة، سألتها هل تشعرين بالخوف؟ قالت نعم من الاختبار، فتكلمنا عنه وذهبت أهدأ.',
  'الامتنان: نذكر كل ليلة شيئًا جميلًا حدث اليوم. والتعاون: الكل يشارك في تجهيز السفرة.',
]

const pastEvents = [
  { in: -23, hour: 20, mins: 60, title: 'لقاء: الروتين اليومي للأطفال', description: 'تحدثنا عن بناء روتين صباحي ومسائي يخفف التوتر في البيت.', rsvp: ['noura', 'sara', 'reem', 'hind', 'khalid'] },
  { in: -16, hour: 20, mins: 75, title: 'ورشة: لغة التشجيع', description: 'تدربنا فيها على مدح الجهد بدل النتيجة، مع أمثلة من بيوت الأعضاء.', rsvp: ['noura', 'sara', 'abdulrahman', 'mohammed', 'hind', 'reem'] },
]

// Deterministic-ish randomness so reruns look similar.
let seedN = 7
const rand = () => { seedN = (seedN * 16807) % 2147483647; return seedN / 2147483647 }

async function extras() {
  await client.query('create table if not exists private.demo_seed (kind text not null, id uuid not null)')
  if ((await client.query(`select count(*)::int n from private.demo_seed where kind = 'quiz'`)).rows[0].n) { console.log('demo quizzes already present'); return }
  const track = (kind, id) => client.query('insert into private.demo_seed values ($1, $2)', [kind, id])
  const cid = await mainCommunity()
  const demo = (await client.query(`select u.id, u.email from auth.users u join private.demo_seed d on d.id = u.id and d.kind = 'user'`)).rows
  const uid = Object.fromEntries(demo.map((r) => [r.email.replace(/^demo-|@watheeq\.invalid$/g, ''), r.id]))
  const skill = { salma: 0.95, noura: 0.85, sara: 0.8, reem: 0.7, hind: 0.75, khalid: 0.6, mohammed: 0.55, abdulrahman: 0.5 }

  let quizCount = 0, attemptCount = 0
  for (const z of quizzes) {
    const lesson = (await client.query(
      `select l.id from public.lessons l join public.modules m on m.id = l.module_id join public.courses c on c.id = m.course_id
        where c.community_id = $1 and l.title = $2 limit 1`, [cid, z.lesson])).rows[0]
    if (!lesson) continue
    const qs = z.questions.map((x) => {
      const kind = x.kind ?? 'single'
      const options = kind === 'text' ? [] : x.o.map((t, i) => ({ id: String.fromCharCode(97 + i), text: t }))
      const correct = kind === 'text' ? [] : [x.a].flat().map((i) => String.fromCharCode(97 + i))
      return { kind, prompt: x.q, options, correct, explanation: x.e ?? '' }
    })
    // save_quiz checks is_admin(), so run it under a platform admin's JWT claims.
    const admin = (await client.query('select user_id from public.platform_admins limit 1')).rows[0].user_id
    await client.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: admin, role: 'authenticated' })])
    const quizId = (await client.query('select public.save_quiz($1) id', [JSON.stringify({ lesson_id: lesson.id, title: z.title, pass_score: 60, points: 5, questions: qs })])).rows[0].id
    await track('quiz', quizId)
    quizCount++
    const stored = (await client.query('select id, kind, options from public.quiz_questions where quiz_id = $1 order by position', [quizId])).rows
    const keys = new Map((await client.query('select question_id, correct from public.quiz_answer_keys where question_id = any($1)', [stored.map((x) => x.id)])).rows.map((k) => [k.question_id, k.correct]))

    for (const [who, id] of Object.entries(uid)) {
      if (rand() < 0.3) continue // not everyone takes every quiz
      const tries = rand() < 0.3 ? 2 : 1
      for (let t = 0; t < tries; t++) {
        const p = Math.min(0.98, (skill[who] ?? 0.6) + t * 0.2)
        const answers = {}
        for (const q of stored) {
          if (q.kind === 'text') { answers[q.id] = reflections[Math.floor(rand() * reflections.length)]; continue }
          const right = keys.get(q.id)
          if (rand() < p) answers[q.id] = right
          else { const wrong = q.options.map((o) => o.id).filter((o) => !right.includes(o)); answers[q.id] = [wrong[Math.floor(rand() * wrong.length)]] }
        }
        await client.query('savepoint a')
        try {
          await client.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: id, role: 'authenticated' })])
          await client.query('select public.submit_quiz($1, $2)', [quizId, JSON.stringify(answers)])
          await client.query('release savepoint a')
          attemptCount++
        } catch { await client.query('rollback to savepoint a') } // e.g. course still locked for this member's level
      }
    }
  }
  await client.query(`select set_config('request.jwt.claims', '', true)`)
  // Spread attempts over the last three weeks, keeping each member's retake after the first try.
  await client.query(`
    with r as (select a.id, row_number() over (partition by a.user_id, a.quiz_id order by a.created_at) n, random() x
                 from public.quiz_attempts a join public.quizzes q on q.id = a.quiz_id
                where q.id in (select id from private.demo_seed where kind = 'quiz'))
    update public.quiz_attempts a set created_at = now() - interval '21 days' * r.x + (r.n - 1) * interval '2 days'
      from r where r.id = a.id`)
  await client.query(`update public.point_log set created_at = now() - random() * interval '20 days' where reason = 'quiz_pass' and user_id = any($1::uuid[])`, [Object.values(uid)])

  // Two more past meetups, then attendance for every past demo event.
  for (const e of pastEvents) {
    const start = new Date(Date.now() + e.in * day)
    start.setUTCHours(e.hour - 3, 0, 0, 0)
    const id = (await client.query(
      'insert into public.events (community_id, title, description, starts_at, ends_at, created_by) values ($1, $2, $3, $4, $5, $6) returning id',
      [cid, e.title, e.description, start, new Date(start.getTime() + e.mins * 60_000), uid.salma])).rows[0].id
    await track('event', id)
    for (const who of e.rsvp) await client.query('insert into public.event_rsvps (event_id, user_id) values ($1, $2)', [id, uid[who]])
  }
  const past = (await client.query(
    `select e.id, e.starts_at, array(select user_id from public.event_rsvps r where r.event_id = e.id) rsvps
       from public.events e join private.demo_seed d on d.id = e.id and d.kind = 'event' where e.starts_at < now()`)).rows
  let marks = 0
  for (const e of past) {
    for (const [who, id] of Object.entries(uid)) {
      const said = e.rsvps.includes(id)
      const x = rand()
      const status = said ? (x < 0.72 ? 'present' : x < 0.86 ? 'late' : x < 0.94 ? 'absent' : 'excused') : (x < 0.25 ? 'present' : x < 0.4 ? 'absent' : null)
      if (!status) continue
      await client.query(`insert into public.event_attendance (event_id, user_id, status, method, marked_by, marked_at) values ($1, $2, $3, $4, $5, $6)`,
        [e.id, id, status, said && x < 0.4 ? 'self' : 'staff', uid.salma, new Date(new Date(e.starts_at).getTime() + 30 * 60_000)])
      marks++
    }
  }
  await client.query(`update public.point_log set created_at = now() - random() * interval '20 days' where reason = 'attendance' and user_id = any($1::uuid[])`, [Object.values(uid)])
  console.log(`added ${quizCount} quizzes, ${attemptCount} quiz attempts, ${pastEvents.length} past events, ${marks} attendance marks`)
}

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

  const cid = await mainCommunity()
  const cats = Object.fromEntries((await client.query('select name, id from public.categories where community_id = $1', [cid])).rows.map((r) => [r.name, r.id]))

  // Members: inserting into auth.users fires handle_new_user, which creates the profile; membership is explicit.
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
    await client.query(`insert into public.members (community_id, user_id, role, joined_at) values ($1, $2, $3, $4)
       on conflict (community_id, user_id) do update set role = excluded.role, joined_at = excluded.joined_at`, [cid, uid[key], p.role ?? 'member', joined])
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
  await extras()
}

await client.connect()
try {
  await client.query('begin')
  if (process.argv.includes('--clean')) await clean()
  else if (process.argv.includes('--extras')) await extras()
  else await seed()
  await client.query('commit')
} catch (e) {
  await client.query('rollback')
  console.error('FAILED -', e.message)
  process.exitCode = 1
} finally {
  await client.end()
}
