export interface LocalizedLabel {
  en: string
  ar: string
}

export interface Subcategory {
  id: string
  slug: string
  title: LocalizedLabel
  isActive?: boolean
  sortOrder?: number
}

export interface Category {
  id: string
  slug: string
  title: LocalizedLabel
  description?: LocalizedLabel
  isActive?: boolean
  sortOrder?: number
  subcategories: Subcategory[]
}

/**
 * Resilient static fallback representing the 11 Bok Bok top-level categories.
 * Stored and synchronized with MongoDB database collections.
 */
export const CATEGORIES: Category[] = [
  {
    id: 'marketing',
    slug: 'marketing',
    title: { en: 'Marketing', ar: 'التسويق' },
    description: {
      en: 'Digital marketing, SEO, paid ads, branding, and growth strategies.',
      ar: 'التسويق الرقمي، تحسين محركات البحث، الإعلانات، وبناء العلامات التجارية.',
    },
    isActive: true,
    sortOrder: 1,
    subcategories: [
      { id: 'digital-marketing', slug: 'digital-marketing', title: { en: 'Digital Marketing', ar: 'التسويق الرقمي' } },
      { id: 'social-media-marketing', slug: 'social-media-marketing', title: { en: 'Social Media Marketing', ar: 'التسويق عبر وسائل التواصل الاجتماعي' } },
      { id: 'seo-search-engine-optimization', slug: 'seo-search-engine-optimization', title: { en: 'Search Engine Optimization (SEO)', ar: 'تحسين محركات البحث' } },
      { id: 'paid-advertising', slug: 'paid-advertising', title: { en: 'Paid Advertising', ar: 'الإعلانات المدفوعة' } },
      { id: 'content-marketing', slug: 'content-marketing', title: { en: 'Content Marketing', ar: 'التسويق بالمحتوى' } },
      { id: 'branding-positioning', slug: 'branding-positioning', title: { en: 'Branding & Positioning', ar: 'بناء العلامة التجارية وتحديد مكانتها' } },
      { id: 'email-marketing', slug: 'email-marketing', title: { en: 'Email Marketing', ar: 'التسويق عبر البريد الإلكتروني' } },
      { id: 'marketing-strategy', slug: 'marketing-strategy', title: { en: 'Marketing Strategy', ar: 'استراتيجيات التسويق' } },
      { id: 'public-relations', slug: 'public-relations', title: { en: 'Public Relations', ar: 'العلاقات العامة' } },
      { id: 'marketing-analytics', slug: 'marketing-analytics', title: { en: 'Marketing Analytics', ar: 'تحليل بيانات التسويق' } },
    ],
  },
  {
    id: 'business-entrepreneurship',
    slug: 'business-entrepreneurship',
    title: { en: 'Business & Entrepreneurship', ar: 'الأعمال وريادة الأعمال' },
    description: {
      en: 'Business strategy, startup founding, planning, sales, and operations.',
      ar: 'استراتيجيات الأعمال، تأسيس الشركات، المبيعات، وإدارة العمليات.',
    },
    isActive: true,
    sortOrder: 2,
    subcategories: [
      { id: 'business-strategy', slug: 'business-strategy', title: { en: 'Business Strategy', ar: 'استراتيجيات الأعمال' } },
      { id: 'starting-a-business', slug: 'starting-a-business', title: { en: 'Starting a Business', ar: 'تأسيس المشاريع' } },
      { id: 'business-planning', slug: 'business-planning', title: { en: 'Business Planning', ar: 'تخطيط الأعمال' } },
      { id: 'business-development', slug: 'business-development', title: { en: 'Business Development', ar: 'تطوير الأعمال' } },
      { id: 'sales-strategy', slug: 'sales-strategy', title: { en: 'Sales Strategy', ar: 'استراتيجيات المبيعات' } },
      { id: 'ecommerce', slug: 'ecommerce', title: { en: 'E-commerce', ar: 'التجارة الإلكترونية' } },
      { id: 'financial-planning-businesses', slug: 'financial-planning-businesses', title: { en: 'Financial Planning for Businesses', ar: 'التخطيط المالي للمشروعات' } },
      { id: 'operations-management', slug: 'operations-management', title: { en: 'Operations Management', ar: 'إدارة العمليات' } },
      { id: 'leadership-management', slug: 'leadership-management', title: { en: 'Leadership & Management', ar: 'القيادة والإدارة' } },
      { id: 'startup-growth', slug: 'startup-growth', title: { en: 'Startup Growth', ar: 'نمو الشركات الناشئة' } },
    ],
  },
  {
    id: 'technology-it',
    slug: 'technology-it',
    title: { en: 'Technology & IT', ar: 'التكنولوجيا وتقنية المعلومات' },
    description: {
      en: 'Web development, mobile apps, software engineering, AI, and cybersecurity.',
      ar: 'تطوير الويب والتطبيقات، هندسة البرمجيات، الذكاء الاصطناعي، والأمن السيبراني.',
    },
    isActive: true,
    sortOrder: 3,
    subcategories: [
      { id: 'web-development', slug: 'web-development', title: { en: 'Web Development', ar: 'تطوير الويب' } },
      { id: 'mobile-app-development', slug: 'mobile-app-development', title: { en: 'Mobile App Development', ar: 'تطوير تطبيقات الموبايل' } },
      { id: 'software-engineering', slug: 'software-engineering', title: { en: 'Software Engineering', ar: 'هندسة البرمجيات' } },
      { id: 'ai-machine-learning', slug: 'ai-machine-learning', title: { en: 'Artificial Intelligence & Machine Learning', ar: 'الذكاء الاصطناعي وتعلم الآلة' } },
      { id: 'data-analysis-data-science', slug: 'data-analysis-data-science', title: { en: 'Data Analysis & Data Science', ar: 'تحليل البيانات وعلم البيانات' } },
      { id: 'cybersecurity', slug: 'cybersecurity', title: { en: 'Cybersecurity', ar: 'الأمن السيبراني' } },
      { id: 'cloud-computing-devops', slug: 'cloud-computing-devops', title: { en: 'Cloud Computing & DevOps', ar: 'الحوسبة السحابية وDevOps' } },
      { id: 'tech-ui-ux-design', slug: 'tech-ui-ux-design', title: { en: 'UI/UX Design', ar: 'تصميم واجهات وتجربة المستخدم' } },
      { id: 'it-support', slug: 'it-support', title: { en: 'IT Support', ar: 'الدعم الفني' } },
      { id: 'no-code-automation', slug: 'no-code-automation', title: { en: 'No-Code & Automation', ar: 'البرمجة بدون كود والأتمتة' } },
    ],
  },
  {
    id: 'career-professional-development',
    slug: 'career-professional-development',
    title: { en: 'Career & Professional Development', ar: 'التطوير المهني والوظيفي' },
    description: {
      en: 'Resume writing, LinkedIn optimization, interview prep, and career strategy.',
      ar: 'كتابة السيرة الذاتية، تحسين لينكدإن، التحضير للمقابلات، والتوجيه الوظيفي.',
    },
    isActive: true,
    sortOrder: 4,
    subcategories: [
      { id: 'cv-resume-writing', slug: 'cv-resume-writing', title: { en: 'CV & Resume Writing', ar: 'كتابة السيرة الذاتية' } },
      { id: 'linkedin-profile-optimization', slug: 'linkedin-profile-optimization', title: { en: 'LinkedIn Profile Optimization', ar: 'تحسين حساب LinkedIn' } },
      { id: 'interview-preparation', slug: 'interview-preparation', title: { en: 'Interview Preparation', ar: 'التحضير للمقابلات الشخصية' } },
      { id: 'career-coaching', slug: 'career-coaching', title: { en: 'Career Coaching', ar: 'الإرشاد المهني' } },
      { id: 'job-search-strategy', slug: 'job-search-strategy', title: { en: 'Job Search Strategy', ar: 'استراتيجيات البحث عن عمل' } },
      { id: 'freelancing', slug: 'freelancing', title: { en: 'Freelancing', ar: 'العمل الحر' } },
      { id: 'salary-negotiation', slug: 'salary-negotiation', title: { en: 'Salary Negotiation', ar: 'التفاوض على الراتب' } },
      { id: 'portfolio-development', slug: 'portfolio-development', title: { en: 'Portfolio Development', ar: 'بناء ملف الأعمال' } },
      { id: 'personal-branding', slug: 'personal-branding', title: { en: 'Personal Branding', ar: 'بناء العلامة الشخصية' } },
      { id: 'professional-communication', slug: 'professional-communication', title: { en: 'Professional Communication', ar: 'التواصل المهني' } },
    ],
  },
  {
    id: 'education-learning',
    slug: 'education-learning',
    title: { en: 'Education & Learning', ar: 'التعليم والتعلم' },
    description: {
      en: 'Academic tutoring, STEM, languages, research, and exam preparation.',
      ar: 'الدروس الأكاديمية، العلوم والرياضيات، التحضير للامتحانات، والبحث العلمي.',
    },
    isActive: true,
    sortOrder: 5,
    subcategories: [
      { id: 'mathematics', slug: 'mathematics', title: { en: 'Mathematics', ar: 'الرياضيات' } },
      { id: 'science', slug: 'science', title: { en: 'Science', ar: 'العلوم' } },
      { id: 'programming-education', slug: 'programming-education', title: { en: 'Programming Education', ar: 'تعليم البرمجة' } },
      { id: 'business-management-education', slug: 'business-management-education', title: { en: 'Business & Management Education', ar: 'تعليم الأعمال والإدارة' } },
      { id: 'exam-preparation', slug: 'exam-preparation', title: { en: 'Exam Preparation', ar: 'التحضير للامتحانات' } },
      { id: 'academic-tutoring', slug: 'academic-tutoring', title: { en: 'Academic Tutoring', ar: 'الدروس والمساعدة الأكاديمية' } },
      { id: 'study-skills', slug: 'study-skills', title: { en: 'Study Skills', ar: 'مهارات المذاكرة' } },
      { id: 'research-academic-writing', slug: 'research-academic-writing', title: { en: 'Research & Academic Writing', ar: 'البحث والكتابة الأكاديمية' } },
      { id: 'online-teaching', slug: 'online-teaching', title: { en: 'Online Teaching', ar: 'التدريس عبر الإنترنت' } },
      { id: 'learning-strategies', slug: 'learning-strategies', title: { en: 'Learning Strategies', ar: 'استراتيجيات التعلم' } },
    ],
  },
  {
    id: 'design-creative',
    slug: 'design-creative',
    title: { en: 'Design & Creative', ar: 'التصميم والإبداع' },
    description: {
      en: 'Graphic design, UI/UX, interior design, branding, and video production.',
      ar: 'التصميم الجرافيكي، تصميم الواجهات، التصميم الداخلي، الهوية البصرية، والمونتاج.',
    },
    isActive: true,
    sortOrder: 6,
    subcategories: [
      { id: 'graphic-design', slug: 'graphic-design', title: { en: 'Graphic Design', ar: 'التصميم الجرافيكي' } },
      { id: 'creative-ui-ux-design', slug: 'creative-ui-ux-design', title: { en: 'UI/UX Design', ar: 'تصميم واجهات وتجربة المستخدم' } },
      { id: 'interior-design', slug: 'interior-design', title: { en: 'Interior Design', ar: 'التصميم الداخلي' } },
      { id: 'architecture', slug: 'architecture', title: { en: 'Architecture', ar: 'الهندسة المعمارية' } },
      { id: 'branding-visual-identity', slug: 'branding-visual-identity', title: { en: 'Branding & Visual Identity', ar: 'تصميم الهوية البصرية' } },
      { id: 'motion-graphics-animation', slug: 'motion-graphics-animation', title: { en: 'Motion Graphics & Animation', ar: 'الموشن جرافيك والرسوم المتحركة' } },
      { id: 'photography', slug: 'photography', title: { en: 'Photography', ar: 'التصوير الفوتوغرافي' } },
      { id: 'video-production-editing', slug: 'video-production-editing', title: { en: 'Video Production & Editing', ar: 'إنتاج ومونتاج الفيديو' } },
      { id: 'illustration-digital-art', slug: 'illustration-digital-art', title: { en: 'Illustration & Digital Art', ar: 'الرسم والتصميم الرقمي' } },
      { id: 'product-design', slug: 'product-design', title: { en: 'Product Design', ar: 'تصميم المنتجات' } },
    ],
  },
  {
    id: 'languages-communication',
    slug: 'languages-communication',
    title: { en: 'Languages & Communication', ar: 'اللغات والتواصل' },
    description: {
      en: 'Conversation practice, Business English, public speaking, and translation.',
      ar: 'ممارسة المحادثة، الإنجليزية للأعمال، التحدث أمام الجمهور، والترجمة.',
    },
    isActive: true,
    sortOrder: 7,
    subcategories: [
      { id: 'english-language', slug: 'english-language', title: { en: 'English Language', ar: 'اللغة الإنجليزية' } },
      { id: 'arabic-language', slug: 'arabic-language', title: { en: 'Arabic Language', ar: 'اللغة العربية' } },
      { id: 'other-languages', slug: 'other-languages', title: { en: 'Other Languages', ar: 'لغات أخرى' } },
      { id: 'conversation-practice', slug: 'conversation-practice', title: { en: 'Conversation Practice', ar: 'ممارسة المحادثة' } },
      { id: 'business-english', slug: 'business-english', title: { en: 'Business English', ar: 'الإنجليزية للأعمال' } },
      { id: 'public-speaking', slug: 'public-speaking', title: { en: 'Public Speaking', ar: 'التحدث أمام الجمهور' } },
      { id: 'presentation-skills', slug: 'presentation-skills', title: { en: 'Presentation Skills', ar: 'مهارات العرض والتقديم' } },
      { id: 'writing-editing', slug: 'writing-editing', title: { en: 'Writing & Editing', ar: 'الكتابة والتحرير' } },
      { id: 'translation', slug: 'translation', title: { en: 'Translation', ar: 'الترجمة' } },
      { id: 'communication-skills', slug: 'communication-skills', title: { en: 'Communication Skills', ar: 'مهارات التواصل' } },
    ],
  },
  {
    id: 'personal-skills-lifestyle',
    slug: 'personal-skills-lifestyle',
    title: { en: 'Personal Skills & Lifestyle', ar: 'المهارات الشخصية ونمط الحياة' },
    description: {
      en: 'Productivity, time management, goal setting, habits, and self-confidence.',
      ar: 'الإنتاجية، إدارة الوقت، تحديد الأهداف، التوازن الحياتي، وتطوير العادات.',
    },
    isActive: true,
    sortOrder: 8,
    subcategories: [
      { id: 'time-management', slug: 'time-management', title: { en: 'Time Management', ar: 'إدارة الوقت' } },
      { id: 'productivity', slug: 'productivity', title: { en: 'Productivity', ar: 'الإنتاجية' } },
      { id: 'goal-setting', slug: 'goal-setting', title: { en: 'Goal Setting', ar: 'تحديد الأهداف' } },
      { id: 'decision-making', slug: 'decision-making', title: { en: 'Decision Making', ar: 'اتخاذ القرارات' } },
      { id: 'personal-development', slug: 'personal-development', title: { en: 'Personal Development', ar: 'التطوير الشخصي' } },
      { id: 'confidence-self-expression', slug: 'confidence-self-expression', title: { en: 'Confidence & Self-Expression', ar: 'الثقة بالنفس والتعبير عن الذات' } },
      { id: 'work-life-balance', slug: 'work-life-balance', title: { en: 'Work-Life Balance', ar: 'التوازن بين العمل والحياة' } },
      { id: 'organization-skills', slug: 'organization-skills', title: { en: 'Organization Skills', ar: 'مهارات التنظيم' } },
      { id: 'creativity-problem-solving', slug: 'creativity-problem-solving', title: { en: 'Creativity & Problem Solving', ar: 'الإبداع وحل المشكلات' } },
      { id: 'habit-building', slug: 'habit-building', title: { en: 'Habit Building', ar: 'بناء العادات' } },
    ],
  },
  {
    id: 'fitness-wellness',
    slug: 'fitness-wellness',
    title: { en: 'Fitness & Wellness', ar: 'اللياقة والعافية' },
    description: {
      en: 'Personal fitness, yoga, mindfulness, and healthy habits. Not a substitute for licensed medical care.',
      ar: 'اللياقة البدنية، تخطيط التمارين، اليوجا، واليقظة الذهنية. استشارات غير طبية.',
    },
    isActive: true,
    sortOrder: 9,
    subcategories: [
      { id: 'personal-fitness-guidance', slug: 'personal-fitness-guidance', title: { en: 'Personal Fitness Guidance', ar: 'الإرشاد في اللياقة البدنية' } },
      { id: 'workout-planning', slug: 'workout-planning', title: { en: 'Workout Planning', ar: 'تخطيط التمارين' } },
      { id: 'yoga', slug: 'yoga', title: { en: 'Yoga', ar: 'اليوجا' } },
      { id: 'meditation-mindfulness', slug: 'meditation-mindfulness', title: { en: 'Meditation & Mindfulness', ar: 'التأمل واليقظة الذهنية' } },
      { id: 'general-wellness', slug: 'general-wellness', title: { en: 'General Wellness', ar: 'العافية العامة' } },
      { id: 'sports-coaching', slug: 'sports-coaching', title: { en: 'Sports Coaching', ar: 'التدريب الرياضي' } },
      { id: 'healthy-lifestyle-habits', slug: 'healthy-lifestyle-habits', title: { en: 'Healthy Lifestyle Habits', ar: 'عادات الحياة الصحية' } },
      { id: 'mobility-flexibility', slug: 'mobility-flexibility', title: { en: 'Mobility & Flexibility', ar: 'الحركة والمرونة' } },
    ],
  },
  {
    id: 'hobbies-skills',
    slug: 'hobbies-skills',
    title: { en: 'Hobbies & Skills', ar: 'الهوايات والمهارات' },
    description: {
      en: 'Music, cooking, handicrafts, painting, gardening, gaming, and creative arts.',
      ar: 'الموسيقى، الرسم، الطهي، الحرف اليدوية، البستنة، والألعاب.',
    },
    isActive: true,
    sortOrder: 10,
    subcategories: [
      { id: 'music', slug: 'music', title: { en: 'Music', ar: 'الموسيقى' } },
      { id: 'drawing-painting', slug: 'drawing-painting', title: { en: 'Drawing & Painting', ar: 'الرسم والتلوين' } },
      { id: 'cooking-baking', slug: 'cooking-baking', title: { en: 'Cooking & Baking', ar: 'الطهي والخبز' } },
      { id: 'handicrafts-diy', slug: 'handicrafts-diy', title: { en: 'Handicrafts & DIY', ar: 'الحرف اليدوية والأعمال الذاتية' } },
      { id: 'writing-creative-writing', slug: 'writing-creative-writing', title: { en: 'Writing & Creative Writing', ar: 'الكتابة والكتابة الإبداعية' } },
      { id: 'gaming', slug: 'gaming', title: { en: 'Gaming', ar: 'الألعاب' } },
      { id: 'gardening', slug: 'gardening', title: { en: 'Gardening', ar: 'البستنة' } },
      { id: 'crafts-handmade-products', slug: 'crafts-handmade-products', title: { en: 'Crafts & Handmade Products', ar: 'الحرف والمنتجات اليدوية' } },
      { id: 'public-speaking-practice', slug: 'public-speaking-practice', title: { en: 'Public Speaking Practice', ar: 'التدريب على التحدث أمام الجمهور' } },
      { id: 'creative-skills', slug: 'creative-skills', title: { en: 'Creative Skills', ar: 'المهارات الإبداعية' } },
    ],
  },
  {
    id: 'travel-tourism',
    slug: 'travel-tourism',
    title: { en: 'Travel & Tourism', ar: 'السفر والسياحة' },
    description: {
      en: 'Trip planning, destination guidance, itineraries, cultural tourism, and travel tips.',
      ar: 'تخطيط الرحلات، الإرشاد السياحي، السياحة الثقافية، ونصائح السفر.',
    },
    isActive: true,
    sortOrder: 11,
    subcategories: [
      { id: 'travel-planning', slug: 'travel-planning', title: { en: 'Travel Planning', ar: 'تخطيط الرحلات' } },
      { id: 'destination-guidance', slug: 'destination-guidance', title: { en: 'Destination Guidance', ar: 'الإرشاد حول الوجهات السياحية' } },
      { id: 'itinerary-planning', slug: 'itinerary-planning', title: { en: 'Itinerary Planning', ar: 'تخطيط برامج الرحلات' } },
      { id: 'budget-travel', slug: 'budget-travel', title: { en: 'Budget Travel', ar: 'السفر الاقتصادي' } },
      { id: 'luxury-travel', slug: 'luxury-travel', title: { en: 'Luxury Travel', ar: 'السفر الفاخر' } },
      { id: 'local-experiences', slug: 'local-experiences', title: { en: 'Local Experiences', ar: 'التجارب المحلية' } },
      { id: 'cultural-tourism', slug: 'cultural-tourism', title: { en: 'Cultural Tourism', ar: 'السياحة الثقافية' } },
      { id: 'adventure-travel', slug: 'adventure-travel', title: { en: 'Adventure Travel', ar: 'سياحة المغامرات' } },
      { id: 'travel-photography', slug: 'travel-photography', title: { en: 'Travel Photography', ar: 'التصوير أثناء السفر' } },
      { id: 'travel-tips-preparation', slug: 'travel-tips-preparation', title: { en: 'Travel Tips & Preparation', ar: 'نصائح السفر والاستعداد للرحلات' } },
    ],
  },
  {
    id: 'photography-videography',
    slug: 'photography-videography',
    title: { en: 'Photography & Videography', ar: 'التصوير الفوتوغرافي والفيديو' },
    description: {
      en: 'Professional portrait, wedding, event, and commercial photography & video shooting.',
      ar: 'تصوير البورتريه، الأفراح، المناسبات، وتصوير الفيديو والإعلانات التجارية.',
    },
    isActive: true,
    sortOrder: 12,
    subcategories: [
      { id: 'portrait-personal-photography', slug: 'portrait-personal-photography', title: { en: 'Portrait & Personal Photography', ar: 'تصوير البورتريه والتصوير الشخصي' } },
      { id: 'wedding-photography', slug: 'wedding-photography', title: { en: 'Wedding Photography', ar: 'تصوير حفلات الزفاف' } },
      { id: 'event-photography', slug: 'event-photography', title: { en: 'Event Photography', ar: 'تصوير المناسبات' } },
      { id: 'product-photography', slug: 'product-photography', title: { en: 'Product Photography', ar: 'تصوير المنتجات' } },
      { id: 'fashion-photography', slug: 'fashion-photography', title: { en: 'Fashion Photography', ar: 'تصوير الأزياء' } },
      { id: 'videography-video-shooting', slug: 'videography-video-shooting', title: { en: 'Videography & Video Shooting', ar: 'تصوير الفيديو' } },
      { id: 'commercial-photography', slug: 'commercial-photography', title: { en: 'Commercial Photography', ar: 'التصوير التجاري' } },
    ],
  },
  {
    id: 'beauty-personal-care',
    slug: 'beauty-personal-care',
    title: { en: 'Beauty & Personal Care', ar: 'الجمال والعناية الشخصية' },
    description: {
      en: 'Makeup, bridal styling, haircare, skincare, nail services, and personal grooming.',
      ar: 'خدمات المكياج، مكياج العرائس، العناية بالشعر والبشرة، وخدمات الأظافر والمظهر الشخصي.',
    },
    isActive: true,
    sortOrder: 13,
    subcategories: [
      { id: 'makeup-services', slug: 'makeup-services', title: { en: 'Makeup Services', ar: 'خدمات المكياج' } },
      { id: 'bridal-makeup', slug: 'bridal-makeup', title: { en: 'Bridal Makeup', ar: 'مكياج العرائس' } },
      { id: 'hairstyling', slug: 'hairstyling', title: { en: 'Hairstyling', ar: 'تصفيف الشعر' } },
      { id: 'hair-care', slug: 'hair-care', title: { en: 'Hair Care', ar: 'العناية بالشعر' } },
      { id: 'skincare-services', slug: 'skincare-services', title: { en: 'Skincare Services', ar: 'خدمات العناية بالبشرة' } },
      { id: 'nail-services', slug: 'nail-services', title: { en: 'Nail Services', ar: 'خدمات الأظافر' } },
      { id: 'personal-grooming', slug: 'personal-grooming', title: { en: 'Personal Grooming', ar: 'العناية بالمظهر الشخصي' } },
    ],
  },
]

export function getCategoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((cat) => cat.slug === slug || cat.id === slug)
}

export function getAllCategories(): Category[] {
  return CATEGORIES
}

