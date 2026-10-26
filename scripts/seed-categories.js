/**
 * Database Seeding Script: Categories & Subcategories (Arabic & English)
 *
 * Requirements:
 * - Idempotent: safe to run multiple times without creating duplicates.
 * - Matches records by unique slug.
 * - New records inserted with isActive: true and defined sortOrder.
 * - Does NOT overwrite administrator-customized names, descriptions, or activation statuses.
 * - Safely updates missing translations if any.
 * - Migrates any legacy category/subcategory slugs on existing services/experts for backward compatibility.
 * - Provides comprehensive logging (created, updated, skipped, failed).
 *
 * Usage:
 *   node scripts/seed-categories.js
 */

const { MongoClient, ObjectId } = require('mongodb')
const fs = require('fs')
const path = require('path')

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      process.env[match[1].trim()] = match[2].trim()
    }
  })
}

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error('❌ Error: MONGODB_URI is not defined in environment or .env.local')
  process.exit(1)
}

const SEED_CATEGORIES = [
  {
    slug: 'marketing',
    legacySlugs: ['marketing-growth'],
    name: {
      en: 'Marketing',
      ar: 'التسويق',
    },
    description: {
      en: 'Digital marketing, SEO, paid ads, branding, and growth strategies.',
      ar: 'التسويق الرقمي، تحسين محركات البحث، الإعلانات، وبناء العلامات التجارية.',
    },
    sortOrder: 1,
    subcategories: [
      { slug: 'digital-marketing', legacySlugs: ['digital-marketing-strategy'], name: { en: 'Digital Marketing', ar: 'التسويق الرقمي' }, sortOrder: 1 },
      { slug: 'social-media-marketing', legacySlugs: ['social-media-management'], name: { en: 'Social Media Marketing', ar: 'التسويق عبر وسائل التواصل الاجتماعي' }, sortOrder: 2 },
      { slug: 'seo-search-engine-optimization', legacySlugs: ['seo-search-visibility'], name: { en: 'Search Engine Optimization (SEO)', ar: 'تحسين محركات البحث' }, sortOrder: 3 },
      { slug: 'paid-advertising', legacySlugs: ['paid-ads-performance'], name: { en: 'Paid Advertising', ar: 'الإعلانات المدفوعة' }, sortOrder: 4 },
      { slug: 'content-marketing', legacySlugs: ['content-marketing-copywriting'], name: { en: 'Content Marketing', ar: 'التسويق بالمحتوى' }, sortOrder: 5 },
      { slug: 'branding-positioning', name: { en: 'Branding & Positioning', ar: 'بناء العلامة التجارية وتحديد مكانتها' }, sortOrder: 6 },
      { slug: 'email-marketing', name: { en: 'Email Marketing', ar: 'التسويق عبر البريد الإلكتروني' }, sortOrder: 7 },
      { slug: 'marketing-strategy', name: { en: 'Marketing Strategy', ar: 'استراتيجيات التسويق' }, sortOrder: 8 },
      { slug: 'public-relations', legacySlugs: ['influencer-marketing'], name: { en: 'Public Relations', ar: 'العلاقات العامة' }, sortOrder: 9 },
      { slug: 'marketing-analytics', name: { en: 'Marketing Analytics', ar: 'تحليل بيانات التسويق' }, sortOrder: 10 },
    ],
  },
  {
    slug: 'business-entrepreneurship',
    name: {
      en: 'Business & Entrepreneurship',
      ar: 'الأعمال وريادة الأعمال',
    },
    description: {
      en: 'Business strategy, startup founding, planning, sales, and operations.',
      ar: 'استراتيجيات الأعمال، تأسيس الشركات، المبيعات، وإدارة العمليات.',
    },
    sortOrder: 2,
    subcategories: [
      { slug: 'business-strategy', legacySlugs: ['business-strategy-planning'], name: { en: 'Business Strategy', ar: 'استراتيجيات الأعمال' }, sortOrder: 1 },
      { slug: 'starting-a-business', name: { en: 'Starting a Business', ar: 'تأسيس المشاريع' }, sortOrder: 2 },
      { slug: 'business-planning', name: { en: 'Business Planning', ar: 'تخطيط الأعمال' }, sortOrder: 3 },
      { slug: 'business-development', name: { en: 'Business Development', ar: 'تطوير الأعمال' }, sortOrder: 4 },
      { slug: 'sales-strategy', legacySlugs: ['sales-negotiation'], name: { en: 'Sales Strategy', ar: 'استراتيجيات المبيعات' }, sortOrder: 5 },
      { slug: 'ecommerce', legacySlugs: ['ecommerce-online-stores'], name: { en: 'E-commerce', ar: 'التجارة الإلكترونية' }, sortOrder: 6 },
      { slug: 'financial-planning-businesses', legacySlugs: ['accounting-financial-planning'], name: { en: 'Financial Planning for Businesses', ar: 'التخطيط المالي للمشروعات' }, sortOrder: 7 },
      { slug: 'operations-management', name: { en: 'Operations Management', ar: 'إدارة العمليات' }, sortOrder: 8 },
      { slug: 'leadership-management', name: { en: 'Leadership & Management', ar: 'القيادة والإدارة' }, sortOrder: 9 },
      { slug: 'startup-growth', name: { en: 'Startup Growth', ar: 'نمو الشركات الناشئة' }, sortOrder: 10 },
    ],
  },
  {
    slug: 'technology-it',
    legacySlugs: ['technology-coding'],
    name: {
      en: 'Technology & IT',
      ar: 'التكنولوجيا وتقنية المعلومات',
    },
    description: {
      en: 'Web development, mobile apps, software engineering, AI, and cybersecurity.',
      ar: 'تطوير الويب والتطبيقات، هندسة البرمجيات، الذكاء الاصطناعي، والأمن السيبراني.',
    },
    sortOrder: 3,
    subcategories: [
      { slug: 'web-development', name: { en: 'Web Development', ar: 'تطوير الويب' }, sortOrder: 1 },
      { slug: 'mobile-app-development', name: { en: 'Mobile App Development', ar: 'تطوير تطبيقات الموبايل' }, sortOrder: 2 },
      { slug: 'software-engineering', legacySlugs: ['software-architecture-devops'], name: { en: 'Software Engineering', ar: 'هندسة البرمجيات' }, sortOrder: 3 },
      { slug: 'ai-machine-learning', legacySlugs: ['ai-automation'], name: { en: 'Artificial Intelligence & Machine Learning', ar: 'الذكاء الاصطناعي وتعلم الآلة' }, sortOrder: 4 },
      { slug: 'data-analysis-data-science', legacySlugs: ['data-analytics-data-science'], name: { en: 'Data Analysis & Data Science', ar: 'تحليل البيانات وعلم البيانات' }, sortOrder: 5 },
      { slug: 'cybersecurity', name: { en: 'Cybersecurity', ar: 'الأمن السيبراني' }, sortOrder: 6 },
      { slug: 'cloud-computing-devops', name: { en: 'Cloud Computing & DevOps', ar: 'الحوسبة السحابية وDevOps' }, sortOrder: 7 },
      { slug: 'tech-ui-ux-design', name: { en: 'UI/UX Design', ar: 'تصميم واجهات وتجربة المستخدم' }, sortOrder: 8 },
      { slug: 'it-support', name: { en: 'IT Support', ar: 'الدعم الفني' }, sortOrder: 9 },
      { slug: 'no-code-automation', legacySlugs: ['no-code-low-code'], name: { en: 'No-Code & Automation', ar: 'البرمجة بدون كود والأتمتة' }, sortOrder: 10 },
    ],
  },
  {
    slug: 'career-professional-development',
    legacySlugs: ['career-development'],
    name: {
      en: 'Career & Professional Development',
      ar: 'التطوير المهني والوظيفي',
    },
    description: {
      en: 'Resume building, LinkedIn optimization, interview prep, and career strategy.',
      ar: 'كتابة السيرة الذاتية، تحسين لينكدإن، التحضير للمقابلات، والتوجيه الوظيفي.',
    },
    sortOrder: 4,
    subcategories: [
      { slug: 'cv-resume-writing', legacySlugs: ['cv-linkedin-optimization'], name: { en: 'CV & Resume Writing', ar: 'كتابة السيرة الذاتية' }, sortOrder: 1 },
      { slug: 'linkedin-profile-optimization', name: { en: 'LinkedIn Profile Optimization', ar: 'تحسين حساب LinkedIn' }, sortOrder: 2 },
      { slug: 'interview-preparation', name: { en: 'Interview Preparation', ar: 'التحضير للمقابلات الشخصية' }, sortOrder: 3 },
      { slug: 'career-coaching', legacySlugs: ['career-guidance-planning'], name: { en: 'Career Coaching', ar: 'الإرشاد المهني' }, sortOrder: 4 },
      { slug: 'job-search-strategy', name: { en: 'Job Search Strategy', ar: 'استراتيجيات البحث عن عمل' }, sortOrder: 5 },
      { slug: 'freelancing', legacySlugs: ['freelancing-personal-branding'], name: { en: 'Freelancing', ar: 'العمل الحر' }, sortOrder: 6 },
      { slug: 'salary-negotiation', name: { en: 'Salary Negotiation', ar: 'التفاوض على الراتب' }, sortOrder: 7 },
      { slug: 'portfolio-development', legacySlugs: ['portfolio-reviews'], name: { en: 'Portfolio Development', ar: 'بناء ملف الأعمال' }, sortOrder: 8 },
      { slug: 'personal-branding', name: { en: 'Personal Branding', ar: 'بناء العلامة الشخصية' }, sortOrder: 9 },
      { slug: 'professional-communication', name: { en: 'Professional Communication', ar: 'التواصل المهني' }, sortOrder: 10 },
    ],
  },
  {
    slug: 'education-learning',
    name: {
      en: 'Education & Learning',
      ar: 'التعليم والتعلم',
    },
    description: {
      en: 'Academic tutoring, STEM, languages, research, and exam preparation.',
      ar: 'الدروس الأكاديمية، العلوم والرياضيات، التحضير للامتحانات، والبحث العلمي.',
    },
    sortOrder: 5,
    subcategories: [
      { slug: 'mathematics', name: { en: 'Mathematics', ar: 'الرياضيات' }, sortOrder: 1 },
      { slug: 'science', name: { en: 'Science', ar: 'العلوم' }, sortOrder: 2 },
      { slug: 'programming-education', name: { en: 'Programming Education', ar: 'تعليم البرمجة' }, sortOrder: 3 },
      { slug: 'business-management-education', name: { en: 'Business & Management Education', ar: 'تعليم الأعمال والإدارة' }, sortOrder: 4 },
      { slug: 'exam-preparation', name: { en: 'Exam Preparation', ar: 'التحضير للامتحانات' }, sortOrder: 5 },
      { slug: 'academic-tutoring', name: { en: 'Academic Tutoring', ar: 'الدروس والمساعدة الأكاديمية' }, sortOrder: 6 },
      { slug: 'study-skills', name: { en: 'Study Skills', ar: 'مهارات المذاكرة' }, sortOrder: 7 },
      { slug: 'research-academic-writing', legacySlugs: ['research-writing'], name: { en: 'Research & Academic Writing', ar: 'البحث والكتابة الأكاديمية' }, sortOrder: 8 },
      { slug: 'online-teaching', legacySlugs: ['teaching-methods'], name: { en: 'Online Teaching', ar: 'التدريس عبر الإنترنت' }, sortOrder: 9 },
      { slug: 'learning-strategies', name: { en: 'Learning Strategies', ar: 'استراتيجيات التعلم' }, sortOrder: 10 },
    ],
  },
  {
    slug: 'design-creative',
    name: {
      en: 'Design & Creative',
      ar: 'التصميم والإبداع',
    },
    description: {
      en: 'Graphic design, UI/UX, interior design, branding, and video production.',
      ar: 'التصميم الجرافيكي، تصميم الواجهات، التصميم الداخلي، الهوية البصرية، والمونتاج.',
    },
    sortOrder: 6,
    subcategories: [
      { slug: 'graphic-design', name: { en: 'Graphic Design', ar: 'التصميم الجرافيكي' }, sortOrder: 1 },
      { slug: 'creative-ui-ux-design', legacySlugs: ['ui-ux-product-design'], name: { en: 'UI/UX Design', ar: 'تصميم واجهات وتجربة المستخدم' }, sortOrder: 2 },
      { slug: 'interior-design', legacySlugs: ['interior-space-planning'], name: { en: 'Interior Design', ar: 'التصميم الداخلي' }, sortOrder: 3 },
      { slug: 'architecture', legacySlugs: ['architecture-renovation'], name: { en: 'Architecture', ar: 'الهندسة المعمارية' }, sortOrder: 4 },
      { slug: 'branding-visual-identity', legacySlugs: ['brand-identity-logo'], name: { en: 'Branding & Visual Identity', ar: 'تصميم الهوية البصرية' }, sortOrder: 5 },
      { slug: 'motion-graphics-animation', name: { en: 'Motion Graphics & Animation', ar: 'الموشن جرافيك والرسوم المتحركة' }, sortOrder: 6 },
      { slug: 'photography', legacySlugs: ['photography-videography'], name: { en: 'Photography', ar: 'التصوير الفوتوغرافي' }, sortOrder: 7 },
      { slug: 'video-production-editing', legacySlugs: ['video-editing-motion'], name: { en: 'Video Production & Editing', ar: 'إنتاج ومونتاج الفيديو' }, sortOrder: 8 },
      { slug: 'illustration-digital-art', name: { en: 'Illustration & Digital Art', ar: 'الرسم والتصميم الرقمي' }, sortOrder: 9 },
      { slug: 'product-design', name: { en: 'Product Design', ar: 'تصميم المنتجات' }, sortOrder: 10 },
    ],
  },
  {
    slug: 'languages-communication',
    name: {
      en: 'Languages & Communication',
      ar: 'اللغات والتواصل',
    },
    description: {
      en: 'Conversation practice, Business English, public speaking, and translation.',
      ar: 'ممارسة المحادثة، الإنجليزية للأعمال، التحدث أمام الجمهور، والترجمة.',
    },
    sortOrder: 7,
    subcategories: [
      { slug: 'english-language', legacySlugs: ['english-conversation'], name: { en: 'English Language', ar: 'اللغة الإنجليزية' }, sortOrder: 1 },
      { slug: 'arabic-language', name: { en: 'Arabic Language', ar: 'اللغة العربية' }, sortOrder: 2 },
      { slug: 'other-languages', legacySlugs: ['french-other-languages'], name: { en: 'Other Languages', ar: 'لغات أخرى' }, sortOrder: 3 },
      { slug: 'conversation-practice', name: { en: 'Conversation Practice', ar: 'ممارسة المحادثة' }, sortOrder: 4 },
      { slug: 'business-english', name: { en: 'Business English', ar: 'الإنجليزية للأعمال' }, sortOrder: 5 },
      { slug: 'public-speaking', name: { en: 'Public Speaking', ar: 'التحدث أمام الجمهور' }, sortOrder: 6 },
      { slug: 'presentation-skills', name: { en: 'Presentation Skills', ar: 'مهارات العرض والتقديم' }, sortOrder: 7 },
      { slug: 'writing-editing', name: { en: 'Writing & Editing', ar: 'الكتابة والتحرير' }, sortOrder: 8 },
      { slug: 'translation', legacySlugs: ['translation-localization'], name: { en: 'Translation', ar: 'الترجمة' }, sortOrder: 9 },
      { slug: 'communication-skills', name: { en: 'Communication Skills', ar: 'مهارات التواصل' }, sortOrder: 10 },
    ],
  },
  {
    slug: 'personal-skills-lifestyle',
    legacySlugs: ['personal-development'],
    name: {
      en: 'Personal Skills & Lifestyle',
      ar: 'المهارات الشخصية ونمط الحياة',
    },
    description: {
      en: 'Productivity, time management, goal setting, habits, and self-confidence.',
      ar: 'الإنتاجية، إدارة الوقت، تحديد الأهداف، التوازن الحياتي، وتطوير العادات.',
    },
    sortOrder: 8,
    subcategories: [
      { slug: 'time-management', name: { en: 'Time Management', ar: 'إدارة الوقت' }, sortOrder: 1 },
      { slug: 'productivity', legacySlugs: ['productivity-time-management'], name: { en: 'Productivity', ar: 'الإنتاجية' }, sortOrder: 2 },
      { slug: 'goal-setting', legacySlugs: ['goal-setting-accountability'], name: { en: 'Goal Setting', ar: 'تحديد الأهداف' }, sortOrder: 3 },
      { slug: 'decision-making', name: { en: 'Decision Making', ar: 'اتخاذ القرارات' }, sortOrder: 4 },
      { slug: 'personal-development', legacySlugs: ['confidence-self-development'], name: { en: 'Personal Development', ar: 'التطوير الشخصي' }, sortOrder: 5 },
      { slug: 'confidence-self-expression', name: { en: 'Confidence & Self-Expression', ar: 'الثقة بالنفس والتعبير عن الذات' }, sortOrder: 6 },
      { slug: 'work-life-balance', name: { en: 'Work-Life Balance', ar: 'التوازن بين العمل والحياة' }, sortOrder: 7 },
      { slug: 'organization-skills', name: { en: 'Organization Skills', ar: 'مهارات التنظيم' }, sortOrder: 8 },
      { slug: 'creativity-problem-solving', name: { en: 'Creativity & Problem Solving', ar: 'الإبداع وحل المشكلات' }, sortOrder: 9 },
      { slug: 'habit-building', name: { en: 'Habit Building', ar: 'بناء العادات' }, sortOrder: 10 },
    ],
  },
  {
    slug: 'fitness-wellness',
    name: {
      en: 'Fitness & Wellness',
      ar: 'اللياقة والعافية',
    },
    description: {
      en: 'Personal fitness, yoga, mindfulness, and healthy habits. Not a substitute for licensed medical care.',
      ar: 'اللياقة البدنية، تخطيط التمارين، اليوجا، واليقظة الذهنية. استشارات غير طبية.',
    },
    sortOrder: 9,
    subcategories: [
      { slug: 'personal-fitness-guidance', legacySlugs: ['personal-training-plans', 'strength-training'], name: { en: 'Personal Fitness Guidance', ar: 'الإرشاد في اللياقة البدنية' }, sortOrder: 1 },
      { slug: 'workout-planning', name: { en: 'Workout Planning', ar: 'تخطيط التمارين' }, sortOrder: 2 },
      { slug: 'yoga', legacySlugs: ['yoga-pilates'], name: { en: 'Yoga', ar: 'اليوجا' }, sortOrder: 3 },
      { slug: 'meditation-mindfulness', legacySlugs: ['stress-management'], name: { en: 'Meditation & Mindfulness', ar: 'التأمل واليقظة الذهنية' }, sortOrder: 4 },
      { slug: 'general-wellness', name: { en: 'General Wellness', ar: 'العافية العامة' }, sortOrder: 5 },
      { slug: 'sports-coaching', legacySlugs: ['sports-performance'], name: { en: 'Sports Coaching', ar: 'التدريب الرياضي' }, sortOrder: 6 },
      { slug: 'healthy-lifestyle-habits', legacySlugs: ['healthy-habits-lifestyle', 'general-nutrition-education'], name: { en: 'Healthy Lifestyle Habits', ar: 'عادات الحياة الصحية' }, sortOrder: 7 },
      { slug: 'mobility-flexibility', name: { en: 'Mobility & Flexibility', ar: 'الحركة والمرونة' }, sortOrder: 8 },
    ],
  },
  {
    slug: 'hobbies-skills',
    legacySlugs: ['hobbies-practical-skills'],
    name: {
      en: 'Hobbies & Skills',
      ar: 'الهوايات والمهارات',
    },
    description: {
      en: 'Music, cooking, handicrafts, painting, gardening, gaming, and creative arts.',
      ar: 'الموسيقى، الرسم، الطهي، الحرف اليدوية، البستنة، والألعاب.',
    },
    sortOrder: 10,
    subcategories: [
      { slug: 'music', legacySlugs: ['music-instruments'], name: { en: 'Music', ar: 'الموسيقى' }, sortOrder: 1 },
      { slug: 'drawing-painting', legacySlugs: ['arts-crafts'], name: { en: 'Drawing & Painting', ar: 'الرسم والتلوين' }, sortOrder: 2 },
      { slug: 'cooking-baking', name: { en: 'Cooking & Baking', ar: 'الطهي والخبز' }, sortOrder: 3 },
      { slug: 'handicrafts-diy', legacySlugs: ['diy-home-improvement'], name: { en: 'Handicrafts & DIY', ar: 'الحرف اليدوية والأعمال الذاتية' }, sortOrder: 4 },
      { slug: 'writing-creative-writing', name: { en: 'Writing & Creative Writing', ar: 'الكتابة والكتابة الإبداعية' }, sortOrder: 5 },
      { slug: 'gaming', name: { en: 'Gaming', ar: 'الألعاب' }, sortOrder: 6 },
      { slug: 'gardening', legacySlugs: ['gardening-plant-care'], name: { en: 'Gardening', ar: 'البستنة' }, sortOrder: 7 },
      { slug: 'crafts-handmade-products', legacySlugs: ['pottery-handmade'], name: { en: 'Crafts & Handmade Products', ar: 'الحرف والمنتجات اليدوية' }, sortOrder: 8 },
      { slug: 'public-speaking-practice', name: { en: 'Public Speaking Practice', ar: 'التدريب على التحدث أمام الجمهور' }, sortOrder: 9 },
      { slug: 'creative-skills', legacySlugs: ['makeup-beauty-skills'], name: { en: 'Creative Skills', ar: 'المهارات الإبداعية' }, sortOrder: 10 },
    ],
  },
  {
    slug: 'travel-tourism',
    name: {
      en: 'Travel & Tourism',
      ar: 'السفر والسياحة',
    },
    description: {
      en: 'Trip planning, destination guidance, itineraries, cultural tourism, and travel tips.',
      ar: 'تخطيط الرحلات، الإرشاد السياحي، السياحة الثقافية، ونصائح السفر.',
    },
    sortOrder: 11,
    subcategories: [
      { slug: 'travel-planning', name: { en: 'Travel Planning', ar: 'تخطيط الرحلات' }, sortOrder: 1 },
      { slug: 'destination-guidance', name: { en: 'Destination Guidance', ar: 'الإرشاد حول الوجهات السياحية' }, sortOrder: 2 },
      { slug: 'itinerary-planning', name: { en: 'Itinerary Planning', ar: 'تخطيط برامج الرحلات' }, sortOrder: 3 },
      { slug: 'budget-travel', name: { en: 'Budget Travel', ar: 'السفر الاقتصادي' }, sortOrder: 4 },
      { slug: 'luxury-travel', name: { en: 'Luxury Travel', ar: 'السفر الفاخر' }, sortOrder: 5 },
      { slug: 'local-experiences', name: { en: 'Local Experiences', ar: 'التجارب المحلية' }, sortOrder: 6 },
      { slug: 'cultural-tourism', name: { en: 'Cultural Tourism', ar: 'السياحة الثقافية' }, sortOrder: 7 },
      { slug: 'adventure-travel', name: { en: 'Adventure Travel', ar: 'سياحة المغامرات' }, sortOrder: 8 },
      { slug: 'travel-photography', name: { en: 'Travel Photography', ar: 'التصوير أثناء السفر' }, sortOrder: 9 },
      { slug: 'travel-tips-preparation', name: { en: 'Travel Tips & Preparation', ar: 'نصائح السفر والاستعداد للرحلات' }, sortOrder: 10 },
    ],
  },
  {
    slug: 'photography-videography',
    name: {
      en: 'Photography & Videography',
      ar: 'التصوير الفوتوغرافي والفيديو',
    },
    description: {
      en: 'Professional portrait, wedding, event, and commercial photography & video shooting.',
      ar: 'تصوير البورتريه، الأفراح، المناسبات، وتصوير الفيديو والإعلانات التجارية.',
    },
    sortOrder: 12,
    subcategories: [
      { slug: 'portrait-personal-photography', name: { en: 'Portrait & Personal Photography', ar: 'تصوير البورتريه والتصوير الشخصي' }, sortOrder: 1 },
      { slug: 'wedding-photography', name: { en: 'Wedding Photography', ar: 'تصوير حفلات الزفاف' }, sortOrder: 2 },
      { slug: 'event-photography', name: { en: 'Event Photography', ar: 'تصوير المناسبات' }, sortOrder: 3 },
      { slug: 'product-photography', name: { en: 'Product Photography', ar: 'تصوير المنتجات' }, sortOrder: 4 },
      { slug: 'fashion-photography', name: { en: 'Fashion Photography', ar: 'تصوير الأزياء' }, sortOrder: 5 },
      { slug: 'videography-video-shooting', name: { en: 'Videography & Video Shooting', ar: 'تصوير الفيديو' }, sortOrder: 6 },
      { slug: 'commercial-photography', name: { en: 'Commercial Photography', ar: 'التصوير التجاري' }, sortOrder: 7 },
    ],
  },
  {
    slug: 'beauty-personal-care',
    name: {
      en: 'Beauty & Personal Care',
      ar: 'الجمال والعناية الشخصية',
    },
    description: {
      en: 'Makeup, bridal styling, haircare, skincare, nail services, and personal grooming.',
      ar: 'خدمات المكياج، مكياج العرائس، العناية بالشعر والبشرة، وخدمات الأظافر والمظهر الشخصي.',
    },
    sortOrder: 13,
    subcategories: [
      { slug: 'makeup-services', name: { en: 'Makeup Services', ar: 'خدمات المكياج' }, sortOrder: 1 },
      { slug: 'bridal-makeup', name: { en: 'Bridal Makeup', ar: 'مكياج العرائس' }, sortOrder: 2 },
      { slug: 'hairstyling', name: { en: 'Hairstyling', ar: 'تصفيف الشعر' }, sortOrder: 3 },
      { slug: 'hair-care', name: { en: 'Hair Care', ar: 'العناية بالشعر' }, sortOrder: 4 },
      { slug: 'skincare-services', name: { en: 'Skincare Services', ar: 'خدمات العناية بالبشرة' }, sortOrder: 5 },
      { slug: 'nail-services', name: { en: 'Nail Services', ar: 'خدمات الأظافر' }, sortOrder: 6 },
      { slug: 'personal-grooming', name: { en: 'Personal Grooming', ar: 'العناية بالمظهر الشخصي' }, sortOrder: 7 },
    ],
  },
]

async function seedCategories() {
  const client = new MongoClient(uri)
  const stats = {
    categoriesCreated: 0,
    categoriesUpdated: 0,
    categoriesSkipped: 0,
    subcategoriesCreated: 0,
    subcategoriesUpdated: 0,
    subcategoriesSkipped: 0,
    servicesMigrated: 0,
    errors: [],
  }

  try {
    await client.connect()
    console.log('🔌 Connected to MongoDB Atlas...')
    const db = client.db('bok_bok')

    const categoriesCol = db.collection('categories')
    const subcategoriesCol = db.collection('subcategories')
    const servicesCol = db.collection('services')
    const expertsCol = db.collection('experts')

    // 1. Ensure required indexes
    console.log('📌 Ensuring indexes on categories & subcategories collections...')
    await categoriesCol.createIndex({ slug: 1 }, { unique: true })
    await categoriesCol.createIndex({ isActive: 1, sortOrder: 1 })
    await subcategoriesCol.createIndex({ categoryId: 1, slug: 1 }, { unique: true })
    await subcategoriesCol.createIndex({ categoryId: 1, isActive: 1, sortOrder: 1 })
    await subcategoriesCol.createIndex({ slug: 1 })
    await subcategoriesCol.createIndex({ isActive: 1 })

    console.log(`\n🌱 Starting Categories seeding (${SEED_CATEGORIES.length} top-level categories)...\n`)

    for (const catSeed of SEED_CATEGORIES) {
      try {
        // Check for existing category by slug or legacy slug
        const matchSlugs = [catSeed.slug, ...(catSeed.legacySlugs || [])]
        let categoryDoc = await categoriesCol.findOne({ slug: { $in: matchSlugs } })

        if (!categoryDoc) {
          const newCatId = new ObjectId()
          categoryDoc = {
            _id: newCatId,
            name: catSeed.name,
            slug: catSeed.slug,
            description: catSeed.description,
            isActive: true,
            sortOrder: catSeed.sortOrder,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
          await categoriesCol.insertOne(categoryDoc)
          stats.categoriesCreated++
          console.log(`  ➕ [Created Category] ${catSeed.name.en} / ${catSeed.name.ar} (slug: ${catSeed.slug})`)
        } else {
          // Idempotency: Do not overwrite admin modifications.
          // Only fill in missing Arabic or English translations if empty.
          const updates = {}
          if (!categoryDoc.name?.ar && catSeed.name.ar) {
            updates['name.ar'] = catSeed.name.ar
          }
          if (!categoryDoc.name?.en && catSeed.name.en) {
            updates['name.en'] = catSeed.name.en
          }
          if (!categoryDoc.description?.ar && catSeed.description?.ar) {
            updates['description.ar'] = catSeed.description.ar
          }
          if (!categoryDoc.description?.en && catSeed.description?.en) {
            updates['description.en'] = catSeed.description.en
          }

          if (Object.keys(updates).length > 0) {
            updates.updatedAt = new Date()
            await categoriesCol.updateOne({ _id: categoryDoc._id }, { $set: updates })
            stats.categoriesUpdated++
            console.log(`  🔄 [Updated Category] ${catSeed.name.en} (filled missing translations)`)
          } else {
            stats.categoriesSkipped++
            console.log(`  ⏭️  [Skipped Category] ${categoryDoc.name?.en || catSeed.name.en} (already exists, custom values preserved)`)
          }
        }

        const categoryId = categoryDoc._id

        // Process subcategories for this category
        for (const subSeed of catSeed.subcategories) {
          const subMatchSlugs = [subSeed.slug, ...(subSeed.legacySlugs || [])]
          let subDoc = await subcategoriesCol.findOne({
            categoryId: categoryId,
            slug: { $in: subMatchSlugs },
          })

          if (!subDoc) {
            const newSubId = new ObjectId()
            await subcategoriesCol.insertOne({
              _id: newSubId,
              categoryId: categoryId,
              name: subSeed.name,
              slug: subSeed.slug,
              description: { en: '', ar: '' },
              isActive: true,
              sortOrder: subSeed.sortOrder,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            stats.subcategoriesCreated++
            console.log(`     ↳ ➕ [Created Subcategory] ${subSeed.name.en} / ${subSeed.name.ar} (${subSeed.slug})`)
          } else {
            // Idempotency: safely update missing translations only
            const subUpdates = {}
            if (!subDoc.name?.ar && subSeed.name.ar) subUpdates['name.ar'] = subSeed.name.ar
            if (!subDoc.name?.en && subSeed.name.en) subUpdates['name.en'] = subSeed.name.en

            if (Object.keys(subUpdates).length > 0) {
              subUpdates.updatedAt = new Date()
              await subcategoriesCol.updateOne({ _id: subDoc._id }, { $set: subUpdates })
              stats.subcategoriesUpdated++
              console.log(`     ↳ 🔄 [Updated Subcategory] ${subSeed.name.en} (filled missing translations)`)
            } else {
              stats.subcategoriesSkipped++
            }
          }
        }
      } catch (catErr) {
        stats.errors.push(`Category ${catSeed.slug}: ${catErr.message}`)
        console.error(`  ❌ Error processing ${catSeed.slug}:`, catErr.message)
      }
    }

    // 2. Safe Migration of Legacy Slugs in Services and Experts (Backward Compatibility)
    console.log('\n🔄 Checking existing services and experts for legacy category references...')
    const legacyCategoryMap = {
      'marketing-growth': 'marketing',
      'technology-coding': 'technology-it',
      'career-development': 'career-professional-development',
      'personal-development': 'personal-skills-lifestyle',
      'hobbies-practical-skills': 'hobbies-skills',
    }

    const legacySubcategoryMap = {
      'digital-marketing-strategy': 'digital-marketing',
      'social-media-management': 'social-media-marketing',
      'seo-search-visibility': 'seo-search-engine-optimization',
      'paid-ads-performance': 'paid-advertising',
      'content-marketing-copywriting': 'content-marketing',
      'influencer-marketing': 'public-relations',
      'cv-linkedin-optimization': 'cv-resume-writing',
      'career-guidance-planning': 'career-coaching',
      'freelancing-personal-branding': 'freelancing',
      'portfolio-reviews': 'portfolio-development',
      'ai-automation': 'ai-machine-learning',
      'no-code-low-code': 'no-code-automation',
    }

    for (const [oldSlug, newSlug] of Object.entries(legacyCategoryMap)) {
      const res = await servicesCol.updateMany(
        { categorySlug: oldSlug },
        { $set: { categorySlug: newSlug, updatedAt: new Date() } }
      )
      if (res.modifiedCount > 0) {
        stats.servicesMigrated += res.modifiedCount
        console.log(`  ✓ Migrated ${res.modifiedCount} services: category ${oldSlug} ➔ ${newSlug}`)
      }

      await expertsCol.updateMany(
        { categorySlug: oldSlug },
        { $set: { categorySlug: newSlug, updatedAt: new Date() } }
      )
    }

    for (const [oldSub, newSub] of Object.entries(legacySubcategoryMap)) {
      const res = await servicesCol.updateMany(
        { subcategorySlug: oldSub },
        { $set: { subcategorySlug: newSub, updatedAt: new Date() } }
      )
      if (res.modifiedCount > 0) {
        console.log(`  ✓ Migrated ${res.modifiedCount} services: subcategory ${oldSub} ➔ ${newSub}`)
      }

      await expertsCol.updateMany(
        { subcategorySlug: oldSub },
        { $set: { subcategorySlug: newSub, updatedAt: new Date() } }
      )
    }

    // 3. Final Summary Report
    console.log('\n=========================================')
    console.log('🎉 SEEDING & MIGRATION SUMMARY REPORT')
    console.log('=========================================')
    console.log(`Categories Created:    ${stats.categoriesCreated}`)
    console.log(`Categories Updated:    ${stats.categoriesUpdated}`)
    console.log(`Categories Skipped:    ${stats.categoriesSkipped}`)
    console.log(`Subcategories Created: ${stats.subcategoriesCreated}`)
    console.log(`Subcategories Updated: ${stats.subcategoriesUpdated}`)
    console.log(`Subcategories Skipped: ${stats.subcategoriesSkipped}`)
    console.log(`Services Migrated:     ${stats.servicesMigrated}`)
    console.log(`Errors Encountered:    ${stats.errors.length}`)
    if (stats.errors.length > 0) {
      console.log('Errors Detail:', stats.errors)
    }
    console.log('=========================================\n')
  } finally {
    await client.close()
  }
}

seedCategories().catch((err) => {
  console.error('Fatal error during category seeding:', err)
  process.exit(1)
})
