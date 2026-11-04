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
 * Categories explicitly removed from active use in the reduced-risk MVP scope.
 * Historical bookings and transactions referencing these remain preserved,
 * while any offers under them are unpublished/deactivated and new offers are blocked.
 */
export const REMOVED_CATEGORY_SLUGS = [
  'education-learning',
  'fitness-wellness',
  'photography-videography',
  'beauty-personal-care',
  'travel-tourism',
] as const

/**
 * Allowed MVP taxonomy (9 top-level categories and 63 approved subcategories)
 * for Consultations, Workshops, and Webinars.
 */
export const CATEGORIES: Category[] = [
  {
    id: 'marketing',
    slug: 'marketing',
    title: { en: 'Marketing', ar: 'التسويق' },
    description: {
      en: 'Marketing strategy, content, social media, SEO, branding, and campaign reviews.',
      ar: 'استراتيجيات التسويق، التسويق بالمحتوى، وسائل التواصل الاجتماعي، تحسين محركات البحث، ومراجعة الحملات.',
    },
    isActive: true,
    sortOrder: 1,
    subcategories: [
      { id: 'marketing-strategy', slug: 'marketing-strategy', title: { en: 'Marketing Strategy', ar: 'استراتيجية التسويق' }, isActive: true, sortOrder: 1 },
      { id: 'content-marketing', slug: 'content-marketing', title: { en: 'Content Marketing', ar: 'التسويق بالمحتوى' }, isActive: true, sortOrder: 2 },
      { id: 'social-media-strategy', slug: 'social-media-strategy', title: { en: 'Social Media Strategy', ar: 'استراتيجية وسائل التواصل الاجتماعي' }, isActive: true, sortOrder: 3 },
      { id: 'seo', slug: 'seo', title: { en: 'SEO', ar: 'تحسين محركات البحث (SEO)' }, isActive: true, sortOrder: 4 },
      { id: 'email-marketing-strategy', slug: 'email-marketing-strategy', title: { en: 'Email Marketing Strategy', ar: 'استراتيجية التسويق عبر البريد الإلكتروني' }, isActive: true, sortOrder: 5 },
      { id: 'branding-brand-strategy', slug: 'branding-brand-strategy', title: { en: 'Branding & Brand Strategy', ar: 'بناء العلامة التجارية واستراتيجيتها' }, isActive: true, sortOrder: 6 },
      { id: 'personal-branding', slug: 'personal-branding', title: { en: 'Personal Branding', ar: 'بناء العلامة الشخصية' }, isActive: true, sortOrder: 7 },
      { id: 'campaign-review', slug: 'campaign-review', title: { en: 'Campaign Review', ar: 'مراجعة الحملات التسويقية' }, isActive: true, sortOrder: 8 },
    ],
  },
  {
    id: 'business-entrepreneurship',
    slug: 'business-entrepreneurship',
    title: { en: 'Business & Entrepreneurship', ar: 'الأعمال وريادة الأعمال' },
    description: {
      en: 'Business planning, startup mentoring, market research, pricing, sales, and small business management.',
      ar: 'تخطيط الأعمال، إرشاد الشركات الناشئة، أبحاث السوق، التسعير، المبيعات، وإدارة المشاريع الصغيرة.',
    },
    isActive: true,
    sortOrder: 2,
    subcategories: [
      { id: 'business-planning', slug: 'business-planning', title: { en: 'Business Planning', ar: 'تخطيط الأعمال' }, isActive: true, sortOrder: 1 },
      { id: 'business-model-development', slug: 'business-model-development', title: { en: 'Business Model Development', ar: 'تطوير نماذج الأعمال' }, isActive: true, sortOrder: 2 },
      { id: 'startup-mentoring', slug: 'startup-mentoring', title: { en: 'Startup Mentoring', ar: 'إرشاد الشركات الناشئة' }, isActive: true, sortOrder: 3 },
      { id: 'market-research', slug: 'market-research', title: { en: 'Market Research', ar: 'أبحاث السوق' }, isActive: true, sortOrder: 4 },
      { id: 'pricing-strategy', slug: 'pricing-strategy', title: { en: 'Pricing Strategy', ar: 'استراتيجيات التسعير' }, isActive: true, sortOrder: 5 },
      { id: 'sales-negotiation', slug: 'sales-negotiation', title: { en: 'Sales & Negotiation', ar: 'المبيعات والتفاوض' }, isActive: true, sortOrder: 6 },
      { id: 'ecommerce-strategy', slug: 'ecommerce-strategy', title: { en: 'E-commerce Strategy', ar: 'استراتيجيات التجارة الإلكترونية' }, isActive: true, sortOrder: 7 },
      { id: 'small-business-management', slug: 'small-business-management', title: { en: 'Small Business Management', ar: 'إدارة المشاريع الصغيرة' }, isActive: true, sortOrder: 8 },
    ],
  },
  {
    id: 'technology-it',
    slug: 'technology-it',
    title: { en: 'Technology & IT', ar: 'التكنولوجيا وتقنية المعلومات' },
    description: {
      en: 'Web and mobile development, software engineering, AI, data analysis, cloud/DevOps, code review, and tech careers.',
      ar: 'تطوير الويب والتطبيقات، هندسة البرمجيات، الذكاء الاصطناعي، تحليل البيانات، الحوسبة السحابية، ومراجعة الكود.',
    },
    isActive: true,
    sortOrder: 3,
    subcategories: [
      { id: 'web-development', slug: 'web-development', title: { en: 'Web Development', ar: 'تطوير الويب' }, isActive: true, sortOrder: 1 },
      { id: 'mobile-app-development', slug: 'mobile-app-development', title: { en: 'Mobile App Development', ar: 'تطوير تطبيقات الموبايل' }, isActive: true, sortOrder: 2 },
      { id: 'programming-software-engineering', slug: 'programming-software-engineering', title: { en: 'Programming & Software Engineering', ar: 'البرمجة وهندسة البرمجيات' }, isActive: true, sortOrder: 3 },
      { id: 'ai-machine-learning', slug: 'ai-machine-learning', title: { en: 'AI & Machine Learning', ar: 'الذكاء الاصطناعي وتعلم الآلة' }, isActive: true, sortOrder: 4 },
      { id: 'data-analysis', slug: 'data-analysis', title: { en: 'Data Analysis', ar: 'تحليل البيانات' }, isActive: true, sortOrder: 5 },
      { id: 'cloud-computing-devops', slug: 'cloud-computing-devops', title: { en: 'Cloud Computing & DevOps', ar: 'الحوسبة السحابية وDevOps' }, isActive: true, sortOrder: 6 },
      { id: 'software-architecture', slug: 'software-architecture', title: { en: 'Software Architecture', ar: 'معمارية البرمجيات' }, isActive: true, sortOrder: 7 },
      { id: 'code-review', slug: 'code-review', title: { en: 'Code Review', ar: 'مراجعة الكود البرمجي' }, isActive: true, sortOrder: 8 },
      { id: 'tech-career-guidance', slug: 'tech-career-guidance', title: { en: 'Tech Career Guidance', ar: 'التوجيه المهني التقني' }, isActive: true, sortOrder: 9 },
    ],
  },
  {
    id: 'career-professional-development',
    slug: 'career-professional-development',
    title: { en: 'Career & Professional Development', ar: 'التطوير المهني والوظيفي' },
    description: {
      en: 'CV & LinkedIn reviews, interview preparation, career planning, freelancing guidance, and workplace skills.',
      ar: 'مراجعة السيرة الذاتية وحساب لينكدإن، التحضير للمقابلات، التخطيط المهني، إرشاد العمل الحر، ومهارات العمل.',
    },
    isActive: true,
    sortOrder: 4,
    subcategories: [
      { id: 'cv-resume-review', slug: 'cv-resume-review', title: { en: 'CV & Resume Review', ar: 'مراجعة السيرة الذاتية' }, isActive: true, sortOrder: 1 },
      { id: 'linkedin-profile-review', slug: 'linkedin-profile-review', title: { en: 'LinkedIn Profile Review', ar: 'مراجعة حساب LinkedIn' }, isActive: true, sortOrder: 2 },
      { id: 'interview-preparation', slug: 'interview-preparation', title: { en: 'Interview Preparation', ar: 'التحضير للمقابلات الشخصية' }, isActive: true, sortOrder: 3 },
      { id: 'career-planning', slug: 'career-planning', title: { en: 'Career Planning', ar: 'التخطيط المهني' }, isActive: true, sortOrder: 4 },
      { id: 'career-change', slug: 'career-change', title: { en: 'Career Change', ar: 'تغيير المسار المهني' }, isActive: true, sortOrder: 5 },
      { id: 'freelancing-guidance', slug: 'freelancing-guidance', title: { en: 'Freelancing Guidance', ar: 'إرشاد العمل الحر' }, isActive: true, sortOrder: 6 },
      { id: 'personal-portfolio-review', slug: 'personal-portfolio-review', title: { en: 'Personal Portfolio Review', ar: 'مراجعة معرض الأعمال الشخصي' }, isActive: true, sortOrder: 7 },
      { id: 'salary-negotiation', slug: 'salary-negotiation', title: { en: 'Salary Negotiation', ar: 'التفاوض على الراتب' }, isActive: true, sortOrder: 8 },
      { id: 'leadership-workplace-skills', slug: 'leadership-workplace-skills', title: { en: 'Leadership & Workplace Skills', ar: 'القيادة ومهارات بيئة العمل' }, isActive: true, sortOrder: 9 },
    ],
  },
  {
    id: 'design-creative',
    slug: 'design-creative',
    title: { en: 'Design & Creative', ar: 'التصميم والإبداع' },
    description: {
      en: 'Graphic design, UI/UX, product design, visual identity, illustration, motion graphics, photo/video, and interior styling.',
      ar: 'التصميم الجرافيكي، واجهات وتجربة المستخدم، تصميم المنتجات الرقمية، الهوية البصرية، الموشن جرافيك، والتنسيق الداخلي.',
    },
    isActive: true,
    sortOrder: 5,
    subcategories: [
      { id: 'graphic-design', slug: 'graphic-design', title: { en: 'Graphic Design', ar: 'التصميم الجرافيكي' }, isActive: true, sortOrder: 1 },
      { id: 'ui-ux-design', slug: 'ui-ux-design', title: { en: 'UI/UX Design', ar: 'تصميم واجهات وتجربة المستخدم' }, isActive: true, sortOrder: 2 },
      { id: 'digital-product-design', slug: 'digital-product-design', title: { en: 'Digital Product Design', ar: 'تصميم المنتجات الرقمية' }, isActive: true, sortOrder: 3 },
      { id: 'branding-visual-identity', slug: 'branding-visual-identity', title: { en: 'Branding & Visual Identity', ar: 'العلامة التجارية والهوية البصرية' }, isActive: true, sortOrder: 4 },
      { id: 'illustration', slug: 'illustration', title: { en: 'Illustration', ar: 'الرسم التوضيحي (Illustration)' }, isActive: true, sortOrder: 5 },
      { id: 'motion-graphics', slug: 'motion-graphics', title: { en: 'Motion Graphics', ar: 'الموشن جرافيك' }, isActive: true, sortOrder: 6 },
      { id: 'photography', slug: 'photography', title: { en: 'Photography', ar: 'التصوير الفوتوغرافي' }, isActive: true, sortOrder: 7 },
      { id: 'videography', slug: 'videography', title: { en: 'Videography', ar: 'تصوير الفيديو' }, isActive: true, sortOrder: 8 },
      { id: 'video-editing', slug: 'video-editing', title: { en: 'Video Editing', ar: 'مونتاج وتحرير الفيديو' }, isActive: true, sortOrder: 9 },
      { id: 'interior-styling-home-decoration', slug: 'interior-styling-home-decoration', title: { en: 'Interior Styling & Home Decoration', ar: 'التنسيق الداخلي وديكور المنزل' }, isActive: true, sortOrder: 10 },
    ],
  },
  {
    id: 'languages-communication',
    slug: 'languages-communication',
    title: { en: 'Languages & Communication', ar: 'اللغات والتواصل' },
    description: {
      en: 'Conversation practice, business communication, presentation skills, pronunciation, and everyday language practice.',
      ar: 'ممارسة المحادثة، التواصل في العمل، مهارات العرض والتقديم، التدريب على النطق، وممارسة اللغة اليومية.',
    },
    isActive: true,
    sortOrder: 6,
    subcategories: [
      { id: 'conversation-practice', slug: 'conversation-practice', title: { en: 'Conversation Practice', ar: 'ممارسة المحادثة' }, isActive: true, sortOrder: 1 },
      { id: 'business-communication', slug: 'business-communication', title: { en: 'Business Communication', ar: 'التواصل في بيئة الأعمال' }, isActive: true, sortOrder: 2 },
      { id: 'presentation-skills', slug: 'presentation-skills', title: { en: 'Presentation Skills', ar: 'مهارات العرض والتقديم' }, isActive: true, sortOrder: 3 },
      { id: 'pronunciation-practice', slug: 'pronunciation-practice', title: { en: 'Pronunciation Practice', ar: 'التدريب على النطق' }, isActive: true, sortOrder: 4 },
      { id: 'everyday-language-practice', slug: 'everyday-language-practice', title: { en: 'Everyday Language Practice', ar: 'ممارسة اللغة اليومية' }, isActive: true, sortOrder: 5 },
    ],
  },
  {
    id: 'personal-skills-lifestyle',
    slug: 'personal-skills-lifestyle',
    title: { en: 'Personal Skills & Lifestyle', ar: 'المهارات الشخصية ونمط الحياة' },
    description: {
      en: 'Time management, productivity, goal setting, personal organization, and public speaking.',
      ar: 'إدارة الوقت، الإنتاجية، تحديد الأهداف، التنظيم الشخصي، والتحدث أمام الجمهور.',
    },
    isActive: true,
    sortOrder: 7,
    subcategories: [
      { id: 'time-management', slug: 'time-management', title: { en: 'Time Management', ar: 'إدارة الوقت' }, isActive: true, sortOrder: 1 },
      { id: 'productivity', slug: 'productivity', title: { en: 'Productivity', ar: 'الإنتاجية' }, isActive: true, sortOrder: 2 },
      { id: 'goal-setting', slug: 'goal-setting', title: { en: 'Goal Setting', ar: 'تحديد الأهداف' }, isActive: true, sortOrder: 3 },
      { id: 'personal-organization', slug: 'personal-organization', title: { en: 'Personal Organization', ar: 'التنظيم الشخصي' }, isActive: true, sortOrder: 4 },
      { id: 'public-speaking', slug: 'public-speaking', title: { en: 'Public Speaking', ar: 'التحدث أمام الجمهور' }, isActive: true, sortOrder: 5 },
    ],
  },
  {
    id: 'hobbies-skills',
    slug: 'hobbies-skills',
    title: { en: 'Hobbies & Skills', ar: 'الهوايات والمهارات' },
    description: {
      en: 'Drawing & painting, crafts, creative writing, music, hobby photography, and gardening basics.',
      ar: 'الرسم والتلوين، الحرف اليدوية، الكتابة الإبداعية، الموسيقى، التصوير كهواية، وأساسيات البستنة.',
    },
    isActive: true,
    sortOrder: 8,
    subcategories: [
      { id: 'drawing-painting', slug: 'drawing-painting', title: { en: 'Drawing & Painting', ar: 'الرسم والتلوين' }, isActive: true, sortOrder: 1 },
      { id: 'crafts', slug: 'crafts', title: { en: 'Crafts', ar: 'الحرف اليدوية' }, isActive: true, sortOrder: 2 },
      { id: 'creative-writing', slug: 'creative-writing', title: { en: 'Creative Writing', ar: 'الكتابة الإبداعية' }, isActive: true, sortOrder: 3 },
      { id: 'music', slug: 'music', title: { en: 'Music', ar: 'الموسيقى' }, isActive: true, sortOrder: 4 },
      { id: 'photography-as-a-hobby', slug: 'photography-as-a-hobby', title: { en: 'Photography as a Hobby', ar: 'التصوير الفوتوغرافي كهواية' }, isActive: true, sortOrder: 5 },
      { id: 'gardening-basics', slug: 'gardening-basics', title: { en: 'Gardening Basics', ar: 'أساسيات البستنة والعناية بالنباتات' }, isActive: true, sortOrder: 6 },
    ],
  },
  {
    id: 'travel',
    slug: 'travel',
    title: { en: 'Travel', ar: 'السفر' },
    description: {
      en: 'Destination information, general travel tips, and travel preparation guidance.',
      ar: 'معلومات الوجهات السياحية، نصائح السفر العامة، وإرشادات الاستعداد للسفر.',
    },
    isActive: true,
    sortOrder: 9,
    subcategories: [
      { id: 'destination-information', slug: 'destination-information', title: { en: 'Destination Information', ar: 'معلومات الوجهات السياحية' }, isActive: true, sortOrder: 1 },
      { id: 'general-travel-tips', slug: 'general-travel-tips', title: { en: 'General Travel Tips', ar: 'نصائح السفر العامة' }, isActive: true, sortOrder: 2 },
      { id: 'travel-preparation-guidance', slug: 'travel-preparation-guidance', title: { en: 'Travel Preparation Guidance', ar: 'إرشادات الاستعداد للسفر' }, isActive: true, sortOrder: 3 },
    ],
  },
]

export const ALLOWED_CATEGORY_SLUGS = new Set<string>(CATEGORIES.map((c) => c.slug))

export const ALLOWED_SUBCATEGORY_SLUGS_BY_CATEGORY: Record<string, Set<string>> = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, new Set(c.subcategories.map((s) => s.slug))]),
)

export const ALL_ALLOWED_SUBCATEGORY_SLUGS = new Set<string>(
  CATEGORIES.flatMap((c) => c.subcategories.map((s) => s.slug)),
)

export function isRemovedCategory(slug: string | undefined | null): boolean {
  if (!slug) return false
  return (REMOVED_CATEGORY_SLUGS as readonly string[]).includes(String(slug).trim().toLowerCase())
}

export function isAllowedMvpCategory(slug: string | undefined | null): boolean {
  if (!slug) return false
  return ALLOWED_CATEGORY_SLUGS.has(String(slug).trim().toLowerCase())
}

export function isAllowedMvpSubcategory(
  categorySlug: string | undefined | null,
  subcategorySlug: string | undefined | null,
): boolean {
  if (!categorySlug || !subcategorySlug) return false
  const catSet = ALLOWED_SUBCATEGORY_SLUGS_BY_CATEGORY[String(categorySlug).trim().toLowerCase()]
  if (!catSet) return false
  return catSet.has(String(subcategorySlug).trim().toLowerCase())
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((cat) => cat.slug === slug || cat.id === slug)
}

export function getSubcategoryBySlug(
  categorySlug: string | undefined,
  subcategorySlug: string | undefined,
): Subcategory | undefined {
  if (!subcategorySlug) return undefined
  if (categorySlug) {
    const cat = getCategoryBySlug(categorySlug)
    const found = cat?.subcategories.find((s) => s.slug === subcategorySlug || s.id === subcategorySlug)
    if (found) return found
  }
  for (const cat of CATEGORIES) {
    const found = cat.subcategories.find((s) => s.slug === subcategorySlug || s.id === subcategorySlug)
    if (found) return found
  }
  return undefined
}

export function getCategoryLabel(slug: string | undefined, locale: 'en' | 'ar' = 'en'): string {
  if (!slug) return ''
  const cat = getCategoryBySlug(slug)
  if (!cat) return slug
  return locale === 'ar' ? cat.title.ar : cat.title.en
}

export function getSubcategoryLabel(
  categorySlug: string | undefined,
  subcategorySlug: string | undefined,
  locale: 'en' | 'ar' = 'en',
): string {
  if (!subcategorySlug) return ''
  const sub = getSubcategoryBySlug(categorySlug, subcategorySlug)
  if (!sub) return subcategorySlug
  return locale === 'ar' ? sub.title.ar : sub.title.en
}

export function getAllCategories(): Category[] {
  return CATEGORIES
}
