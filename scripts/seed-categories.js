/**
 * Database Seeding & MVP Taxonomy Migration Script: Categories, Subcategories, Services & Experts
 *
 * Reduced-risk MVP scope (Consultations, Workshops, and Webinars only):
 * - Enforces the 8 allowed MVP categories and 60 subcategories with bilingual English & Arabic labels.
 * - Deactivates removed categories (`education-learning`, `fitness-wellness`, `travel-tourism`,
 *   `travel`, `photography-videography`, `beauty-personal-care`) and all non-MVP subcategories without deleting history.
 * - Maps existing offers only where their actual scope clearly matches an allowed MVP subcategory;
 *   otherwise unpublishes them (`isActive: false`, `approvalStatus: 'pending'`) for admin review while
 *   preserving all historical bookings and transaction records untouched.
 *
 * Usage:
 *   node --env-file=.env.local scripts/seed-categories.js
 */

const dns = require('dns')
dns.setDefaultResultOrder('ipv4first')

const { MongoClient, ObjectId } = require('mongodb')
const fs = require('fs')
const path = require('path')

// Load .env.local if not already loaded
const envPath = path.join(__dirname, '..', '.env.local')
if (!process.env.MONGODB_URI && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^([^=#]+)=(.*)$/)
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
    name: { en: 'Marketing', ar: 'التسويق' },
    description: {
      en: 'Marketing strategy, content, social media, SEO, email marketing, branding, and campaign reviews.',
      ar: 'استراتيجية التسويق، التسويق بالمحتوى، وسائل التواصل الاجتماعي، تحسين محركات البحث، العلامة التجارية، ومراجعة الحملات.',
    },
    sortOrder: 1,
    subcategories: [
      { slug: 'marketing-strategy', name: { en: 'Marketing Strategy', ar: 'استراتيجية التسويق' }, sortOrder: 1 },
      { slug: 'content-marketing', name: { en: 'Content Marketing', ar: 'التسويق بالمحتوى' }, sortOrder: 2 },
      { slug: 'social-media-strategy', name: { en: 'Social Media Strategy', ar: 'استراتيجية وسائل التواصل الاجتماعي' }, sortOrder: 3 },
      { slug: 'seo', name: { en: 'SEO', ar: 'تحسين محركات البحث (SEO)' }, sortOrder: 4 },
      { slug: 'email-marketing-strategy', name: { en: 'Email Marketing Strategy', ar: 'استراتيجية التسويق عبر البريد الإلكتروني' }, sortOrder: 5 },
      { slug: 'branding-brand-strategy', name: { en: 'Branding & Brand Strategy', ar: 'بناء العلامة التجارية واستراتيجيتها' }, sortOrder: 6 },
      { slug: 'personal-branding', name: { en: 'Personal Branding', ar: 'بناء العلامة الشخصية' }, sortOrder: 7 },
      { slug: 'campaign-review', name: { en: 'Campaign Review', ar: 'مراجعة الحملات التسويقية' }, sortOrder: 8 },
    ],
  },
  {
    slug: 'business-entrepreneurship',
    name: { en: 'Business & Entrepreneurship', ar: 'الأعمال وريادة الأعمال' },
    description: {
      en: 'Business planning, business models, startup mentoring, market research, pricing, sales, and e-commerce.',
      ar: 'تخطيط الأعمال، تطوير نماذج الأعمال، إرشاد الشركات الناشئة، أبحاث السوق، التسعير، والمبيعات.',
    },
    sortOrder: 2,
    subcategories: [
      { slug: 'business-planning', name: { en: 'Business Planning', ar: 'تخطيط الأعمال' }, sortOrder: 1 },
      { slug: 'business-model-development', name: { en: 'Business Model Development', ar: 'تطوير نموذج العمل' }, sortOrder: 2 },
      { slug: 'startup-mentoring', name: { en: 'Startup Mentoring', ar: 'إرشاد الشركات الناشئة' }, sortOrder: 3 },
      { slug: 'market-research', name: { en: 'Market Research', ar: 'أبحاث السوق' }, sortOrder: 4 },
      { slug: 'pricing-strategy', name: { en: 'Pricing Strategy', ar: 'استراتيجية التسعير' }, sortOrder: 5 },
      { slug: 'sales-negotiation', name: { en: 'Sales & Negotiation', ar: 'المبيعات والتفاوض' }, sortOrder: 6 },
      { slug: 'ecommerce-strategy', name: { en: 'E-commerce Strategy', ar: 'استراتيجية التجارة الإلكترونية' }, sortOrder: 7 },
      { slug: 'small-business-management', name: { en: 'Small Business Management', ar: 'إدارة المشاريع الصغيرة' }, sortOrder: 8 },
    ],
  },
  {
    slug: 'technology-it',
    name: { en: 'Technology & IT', ar: 'التكنولوجيا وتقنية المعلومات' },
    description: {
      en: 'Web and mobile development, software engineering, AI, data analysis, cloud & DevOps, architecture, and code review.',
      ar: 'تطوير الويب والموبايل، هندسة البرمجيات، الذكاء الاصطناعي، تحليل البيانات، الحوسبة السحابية، ومراجعة الكود.',
    },
    sortOrder: 3,
    subcategories: [
      { slug: 'web-development', name: { en: 'Web Development', ar: 'تطوير الويب' }, sortOrder: 1 },
      { slug: 'mobile-app-development', name: { en: 'Mobile App Development', ar: 'تطوير تطبيقات الموبايل' }, sortOrder: 2 },
      { slug: 'programming-software-engineering', name: { en: 'Programming & Software Engineering', ar: 'البرمجة وهندسة البرمجيات' }, sortOrder: 3 },
      { slug: 'ai-machine-learning', name: { en: 'AI & Machine Learning', ar: 'الذكاء الاصطناعي وتعلم الآلة' }, sortOrder: 4 },
      { slug: 'data-analysis', name: { en: 'Data Analysis', ar: 'تحليل البيانات' }, sortOrder: 5 },
      { slug: 'cloud-computing-devops', name: { en: 'Cloud Computing & DevOps', ar: 'الحوسبة السحابية وDevOps' }, sortOrder: 6 },
      { slug: 'software-architecture', name: { en: 'Software Architecture', ar: 'معمارية البرمجيات' }, sortOrder: 7 },
      { slug: 'code-review', name: { en: 'Code Review', ar: 'مراجعة الكود البرمجي' }, sortOrder: 8 },
      { slug: 'tech-career-guidance', name: { en: 'Tech Career Guidance', ar: 'التوجيه المهني في قطاع التكنولوجيا' }, sortOrder: 9 },
    ],
  },
  {
    slug: 'career-professional-development',
    name: { en: 'Career & Professional Development', ar: 'التطوير المهني والوظيفي' },
    description: {
      en: 'CV & LinkedIn reviews, interview preparation, career planning, freelancing guidance, salary negotiation, and leadership.',
      ar: 'مراجعة السيرة الذاتية ولينكدإن، التحضير للمقابلات، التخطيط المهني، العمل الحر، التفاوض على الراتب، والمهارات القيادية.',
    },
    sortOrder: 4,
    subcategories: [
      { slug: 'cv-resume-review', name: { en: 'CV & Resume Review', ar: 'مراجعة السيرة الذاتية' }, sortOrder: 1 },
      { slug: 'linkedin-profile-review', name: { en: 'LinkedIn Profile Review', ar: 'مراجعة حساب LinkedIn' }, sortOrder: 2 },
      { slug: 'interview-preparation', name: { en: 'Interview Preparation', ar: 'التحضير للمقابلات الشخصية' }, sortOrder: 3 },
      { slug: 'career-planning', name: { en: 'Career Planning', ar: 'التخطيط المهني' }, sortOrder: 4 },
      { slug: 'career-change', name: { en: 'Career Change', ar: 'تغيير المسار المهني' }, sortOrder: 5 },
      { slug: 'freelancing-guidance', name: { en: 'Freelancing Guidance', ar: 'إرشادات العمل الحر' }, sortOrder: 6 },
      { slug: 'personal-portfolio-review', name: { en: 'Personal Portfolio Review', ar: 'مراجعة معرض الأعمال الشخصي' }, sortOrder: 7 },
      { slug: 'salary-negotiation', name: { en: 'Salary Negotiation', ar: 'التفاوض على الراتب' }, sortOrder: 8 },
      { slug: 'leadership-workplace-skills', name: { en: 'Leadership & Workplace Skills', ar: 'القيادة ومهارات بيئة العمل' }, sortOrder: 9 },
    ],
  },
  {
    slug: 'design-creative',
    name: { en: 'Design & Creative', ar: 'التصميم والإبداع' },
    description: {
      en: 'Graphic design, UI/UX, digital product design, branding, illustration, motion graphics, photography, video, and interior styling.',
      ar: 'التصميم الجرافيكي، واجهات وتجربة المستخدم، تصميم المنتجات الرقمية، الهوية البصرية، التصوير، الفيديو، وتنسيق الديكور.',
    },
    sortOrder: 5,
    subcategories: [
      { slug: 'graphic-design', name: { en: 'Graphic Design', ar: 'التصميم الجرافيكي' }, sortOrder: 1 },
      { slug: 'ui-ux-design', name: { en: 'UI/UX Design', ar: 'تصميم واجهات وتجربة المستخدم (UI/UX)' }, sortOrder: 2 },
      { slug: 'digital-product-design', name: { en: 'Digital Product Design', ar: 'تصميم المنتجات الرقمية' }, sortOrder: 3 },
      { slug: 'branding-visual-identity', name: { en: 'Branding & Visual Identity', ar: 'العلامة التجارية والهوية البصرية' }, sortOrder: 4 },
      { slug: 'illustration', name: { en: 'Illustration', ar: 'الرسم التوضيحي (Illustration)' }, sortOrder: 5 },
      { slug: 'motion-graphics', name: { en: 'Motion Graphics', ar: 'الموشن جرافيك' }, sortOrder: 6 },
      { slug: 'photography', name: { en: 'Photography', ar: 'التصوير الفوتوغرافي' }, sortOrder: 7 },
      { slug: 'videography', name: { en: 'Videography', ar: 'تصوير الفيديو' }, sortOrder: 8 },
      { slug: 'video-editing', name: { en: 'Video Editing', ar: 'مونتاج وتحرير الفيديو' }, sortOrder: 9 },
      { slug: 'interior-styling-home-decoration', name: { en: 'Interior Styling & Home Decoration', ar: 'تنسيق الديكور الداخلي وتزيين المنزل' }, sortOrder: 10 },
    ],
  },
  {
    slug: 'languages-communication',
    name: { en: 'Languages & Communication', ar: 'اللغات والتواصل' },
    description: {
      en: 'Conversation practice, business communication, presentation skills, pronunciation, and everyday language practice.',
      ar: 'ممارسة المحادثة، التواصل في بيئة الأعمال، مهارات العرض والتقديم، تحسين النطق، وممارسة اللغة اليومية.',
    },
    sortOrder: 6,
    subcategories: [
      { slug: 'conversation-practice', name: { en: 'Conversation Practice', ar: 'ممارسة المحادثة' }, sortOrder: 1 },
      { slug: 'business-communication', name: { en: 'Business Communication', ar: 'التواصل في بيئة الأعمال' }, sortOrder: 2 },
      { slug: 'presentation-skills', name: { en: 'Presentation Skills', ar: 'مهارات العرض والتقديم' }, sortOrder: 3 },
      { slug: 'pronunciation-practice', name: { en: 'Pronunciation Practice', ar: 'ممارسة وتحسين النطق' }, sortOrder: 4 },
      { slug: 'everyday-language-practice', name: { en: 'Everyday Language Practice', ar: 'ممارسة اللغة للحياة اليومية' }, sortOrder: 5 },
    ],
  },
  {
    slug: 'personal-skills-lifestyle',
    name: { en: 'Personal Skills & Lifestyle', ar: 'المهارات الشخصية ونمط الحياة' },
    description: {
      en: 'Time management, productivity, goal setting, personal organization, and public speaking.',
      ar: 'إدارة الوقت، الإنتاجية، تحديد الأهداف، التنظيم الشخصي، والتحدث أمام الجمهور.',
    },
    sortOrder: 7,
    subcategories: [
      { slug: 'time-management', name: { en: 'Time Management', ar: 'إدارة الوقت' }, sortOrder: 1 },
      { slug: 'productivity', name: { en: 'Productivity', ar: 'الإنتاجية' }, sortOrder: 2 },
      { slug: 'goal-setting', name: { en: 'Goal Setting', ar: 'تحديد الأهداف' }, sortOrder: 3 },
      { slug: 'personal-organization', name: { en: 'Personal Organization', ar: 'التنظيم الشخصي' }, sortOrder: 4 },
      { slug: 'public-speaking', name: { en: 'Public Speaking', ar: 'التحدث أمام الجمهور' }, sortOrder: 5 },
    ],
  },
  {
    slug: 'hobbies-skills',
    name: { en: 'Hobbies & Skills', ar: 'الهوايات والمهارات' },
    description: {
      en: 'Drawing & painting, crafts, creative writing, music, photography as a hobby, and gardening basics.',
      ar: 'الرسم والتلوين، الحرف اليدوية، الكتابة الإبداعية، الموسيقى، التصوير كهواية، وأساسيات البستنة.',
    },
    sortOrder: 8,
    subcategories: [
      { slug: 'drawing-painting', name: { en: 'Drawing & Painting', ar: 'الرسم والتلوين' }, sortOrder: 1 },
      { slug: 'crafts', name: { en: 'Crafts', ar: 'الحرف اليدوية' }, sortOrder: 2 },
      { slug: 'creative-writing', name: { en: 'Creative Writing', ar: 'الكتابة الإبداعية' }, sortOrder: 3 },
      { slug: 'music', name: { en: 'Music', ar: 'الموسيقى' }, sortOrder: 4 },
      { slug: 'photography-as-a-hobby', name: { en: 'Photography as a Hobby', ar: 'التصوير كهواية' }, sortOrder: 5 },
      { slug: 'gardening-basics', name: { en: 'Gardening Basics', ar: 'أساسيات البستنة والعناية بالنباتات' }, sortOrder: 6 },
    ],
  },
]

const ALLOWED_CATEGORY_SLUGS = new Set(SEED_CATEGORIES.map((c) => c.slug))
const ALLOWED_SUBCATEGORIES_BY_CATEGORY = new Map(
  SEED_CATEGORIES.map((c) => [c.slug, new Set(c.subcategories.map((s) => s.slug))])
)

async function seedCategories() {
  const client = new MongoClient(uri)
  const stats = {
    categoriesCreated: 0,
    categoriesUpdated: 0,
    categoriesDeactivated: 0,
    subcategoriesCreated: 0,
    subcategoriesUpdated: 0,
    subcategoriesDeactivated: 0,
    servicesMapped: 0,
    servicesUnpublishedForReview: 0,
    expertsUpdated: 0,
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
    const bookingsCol = db.collection('bookings')

    // 1. Ensure indexes
    await categoriesCol.createIndex({ slug: 1 }, { unique: true })
    await categoriesCol.createIndex({ isActive: 1, sortOrder: 1 })
    await subcategoriesCol.createIndex({ categoryId: 1, slug: 1 }, { unique: true })
    await subcategoriesCol.createIndex({ categoryId: 1, isActive: 1, sortOrder: 1 })
    await subcategoriesCol.createIndex({ slug: 1 })
    await subcategoriesCol.createIndex({ isActive: 1 })

    console.log(`\n🌱 Syncing MVP Taxonomy (${SEED_CATEGORIES.length} allowed categories, 60 subcategories)...\n`)

    const activeCategoryIds = new Map()

    for (const catSeed of SEED_CATEGORIES) {
      let categoryDoc = await categoriesCol.findOne({ slug: catSeed.slug })
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
        console.log(`  ➕ [Created MVP Category] ${catSeed.name.en} / ${catSeed.name.ar} (${catSeed.slug})`)
      } else {
        await categoriesCol.updateOne(
          { _id: categoryDoc._id },
          {
            $set: {
              name: catSeed.name,
              description: catSeed.description,
              isActive: true,
              sortOrder: catSeed.sortOrder,
              updatedAt: new Date(),
            },
          }
        )
        stats.categoriesUpdated++
        console.log(`  🔄 [Synced MVP Category] ${catSeed.name.en} / ${catSeed.name.ar} (${catSeed.slug})`)
      }

      const categoryId = categoryDoc._id
      activeCategoryIds.set(catSeed.slug, categoryId)
      const allowedSubSlugsForCat = []

      for (const subSeed of catSeed.subcategories) {
        allowedSubSlugsForCat.push(subSeed.slug)
        let subDoc = await subcategoriesCol.findOne({
          categoryId: categoryId,
          slug: subSeed.slug,
        })

        if (!subDoc) {
          await subcategoriesCol.insertOne({
            _id: new ObjectId(),
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
          await subcategoriesCol.updateOne(
            { _id: subDoc._id },
            {
              $set: {
                name: subSeed.name,
                isActive: true,
                sortOrder: subSeed.sortOrder,
                updatedAt: new Date(),
              },
            }
          )
          stats.subcategoriesUpdated++
        }
      }

      // Deactivate any legacy subcategories under this allowed category that are not in the MVP list
      const deactSubRes = await subcategoriesCol.updateMany(
        {
          categoryId: categoryId,
          slug: { $nin: allowedSubSlugsForCat },
          isActive: { $ne: false },
        },
        {
          $set: {
            isActive: false,
            deactivatedReason: 'Outside MVP subcategory taxonomy',
            updatedAt: new Date(),
          },
        }
      )
      stats.subcategoriesDeactivated += deactSubRes.modifiedCount
    }

    // 2. Deactivate removed/non-MVP categories and ALL their subcategories without deleting history
    const nonMvpCategories = await categoriesCol
      .find({ slug: { $nin: Array.from(ALLOWED_CATEGORY_SLUGS) } })
      .toArray()

    for (const nonMvpCat of nonMvpCategories) {
      if (nonMvpCat.isActive !== false) {
        await categoriesCol.updateOne(
          { _id: nonMvpCat._id },
          {
            $set: {
              isActive: false,
              deactivatedReason: 'Removed from active use for MVP scope',
              updatedAt: new Date(),
            },
          }
        )
        stats.categoriesDeactivated++
        console.log(`  🚫 [Deactivated Removed Category] ${nonMvpCat.name?.en || nonMvpCat.slug} (${nonMvpCat.slug})`)
      }

      const deactRes = await subcategoriesCol.updateMany(
        { categoryId: nonMvpCat._id, isActive: { $ne: false } },
        {
          $set: {
            isActive: false,
            deactivatedReason: `Parent category ${nonMvpCat.slug} removed from MVP`,
            updatedAt: new Date(),
          },
        }
      )
      stats.subcategoriesDeactivated += deactRes.modifiedCount
    }

    // 3. Audit, Map, or Unpublish Existing Services
    console.log('\n🔍 Auditing existing offers against MVP taxonomy and offer-level controls...')
    const allServices = await servicesCol.find({}).toArray()

    // Explicit scope-verified mapping for existing offers where actual scope clearly matches an allowed subcategory
    const EXPLICIT_SERVICE_ACTIONS = {
      'growth-acquisition-marketing-audit': {
        action: 'map',
        categorySlug: 'marketing',
        subcategorySlug: 'campaign-review',
        intendedAudience: {
          en: 'Startup founders, growth leads, and performance marketers seeking a campaign and funnel review.',
          ar: 'مؤسسو الشركات الناشئة ومسؤولو النمو والتسويق الراغبون في مراجعة الحملات التسويقية.',
        },
      },
      'brand-positioning-message-testing': {
        action: 'map',
        categorySlug: 'marketing',
        subcategorySlug: 'branding-brand-strategy',
        intendedAudience: {
          en: 'Founders, brand managers, and marketing teams refining their brand positioning and messaging.',
          ar: 'المؤسسون ومديرو العلامات التجارية وفرق التسويق الراغبون في تطوير استراتيجية العلامة التجارية.',
        },
      },
      'leadership-1-on-1-executive-coaching': {
        action: 'map',
        categorySlug: 'career-professional-development',
        subcategorySlug: 'leadership-workplace-skills',
        intendedAudience: {
          en: 'Team leads, managers, and executives developing workplace leadership and communication skills.',
          ar: 'قادة الفرق والمديرون والتنفيذيون الراغبون في تطوير مهارات القيادة وبيئة العمل.',
        },
      },
      'career-transition-salary-strategy': {
        action: 'map',
        categorySlug: 'career-professional-development',
        subcategorySlug: 'salary-negotiation',
        intendedAudience: {
          en: 'Professionals preparing for salary negotiations or evaluating career compensation packages.',
          ar: 'المهنيون المستعدون للتفاوض على الراتب أو تقييم العروض الوظيفية.',
        },
      },
      'full-website-performance-seo-audit': {
        action: 'map',
        categorySlug: 'technology-it',
        subcategorySlug: 'web-development',
        intendedAudience: {
          en: 'Website owners, developers, and product teams seeking a technical web performance and architecture review.',
          ar: 'أصحاب المواقع والمطورون وفرق المنتجات الراغبون في مراجعة الأداء التقني وتطوير الويب.',
        },
      },
      'product-strategy-roadmap-deep-dive': {
        action: 'unpublish',
        adminReviewNote:
          'Unpublished for admin review: previously categorized under removed subcategory marketing/digital-marketing; actual scope ("Build a clear, prioritized 6-month product roadmap aligned with business KPIs and user needs") spans product strategy and business planning rather than marketing and requires admin confirmation before re-mapping.',
      },
      'user-research-discovery-audit': {
        action: 'unpublish',
        adminReviewNote:
          'Unpublished for admin review: previously categorized under marketing/branding-positioning, which does not match its UX/user research scope ("Review your user interview scripts, personas, and product discovery workflows"); requires admin review before mapping.',
      },
    }

    for (const srv of allServices) {
      const explicit = EXPLICIT_SERVICE_ACTIONS[srv.slug]

      if (explicit && explicit.action === 'map') {
        await servicesCol.updateOne(
          { _id: srv._id },
          {
            $set: {
              categorySlug: explicit.categorySlug,
              subcategorySlug: explicit.subcategorySlug,
              bookingType: srv.bookingType || 'APPOINTMENT',
              serviceKind: 'CONSULTATION',
              intendedAudience: explicit.intendedAudience,
              adultsOnly: true,
              minimumAge: 18,
              isActive: true,
              approvalStatus: 'approved',
              isStructuredVocationalProgramme: false,
              requiresLicensingReview: false,
              licensingReviewStatus: 'not_required',
              accreditationClaimVerified: false,
              updatedAt: new Date(),
            },
          }
        )
        stats.servicesMapped++
        console.log(
          `  ✅ [Mapped Offer] "${srv.title?.en || srv.slug}" ➔ ${explicit.categorySlug} / ${explicit.subcategorySlug}`
        )
        continue
      }

      if (explicit && explicit.action === 'unpublish') {
        await servicesCol.updateOne(
          { _id: srv._id },
          {
            $set: {
              isActive: false,
              approvalStatus: 'pending',
              adultsOnly: true,
              minimumAge: 18,
              adminReviewNote: explicit.adminReviewNote,
              unpublishedReason: explicit.adminReviewNote,
              unpublishedAt: new Date(),
              updatedAt: new Date(),
            },
          }
        )
        stats.servicesUnpublishedForReview++
        console.log(`  ⚠️  [Unpublished Offer for Admin Review] "${srv.title?.en || srv.slug}" (${srv.slug})`)
        continue
      }

      // General fallback check for any other service in DB
      const catAllowed = ALLOWED_CATEGORY_SLUGS.has(srv.categorySlug)
      const allowedSubs = ALLOWED_SUBCATEGORIES_BY_CATEGORY.get(srv.categorySlug)
      const subAllowed = Boolean(catAllowed && allowedSubs && srv.subcategorySlug && allowedSubs.has(srv.subcategorySlug))
      const isGeneralService = srv.serviceKind === 'GENERAL_SERVICE'

      if (!catAllowed || !subAllowed || isGeneralService) {
        const reason = isGeneralService
          ? 'Unpublished for admin review: Professional Services (GENERAL_SERVICE) are outside the MVP scope.'
          : `Unpublished for admin review: Category/subcategory (${srv.categorySlug || 'none'}/${srv.subcategorySlug || 'none'}) is outside the approved MVP taxonomy.`
        await servicesCol.updateOne(
          { _id: srv._id },
          {
            $set: {
              isActive: false,
              approvalStatus: 'pending',
              adultsOnly: true,
              minimumAge: 18,
              adminReviewNote: reason,
              unpublishedReason: reason,
              unpublishedAt: new Date(),
              updatedAt: new Date(),
            },
          }
        )
        stats.servicesUnpublishedForReview++
        console.log(`  ⚠️  [Unpublished Offer for Admin Review] "${srv.title?.en || srv.slug}" — ${reason}`)
      }
    }

    // 4. Sync Expert category/subcategory references to valid MVP slugs
    console.log('\n👤 Auditing expert profile taxonomy references...')
    const allExperts = await expertsCol.find({}).toArray()
    const expertSubcategoryRemap = {
      'branding-positioning': 'branding-brand-strategy',
      'paid-advertising': 'campaign-review',
      'leadership-management': 'leadership-workplace-skills',
      'digital-marketing': 'marketing-strategy',
    }

    for (const exp of allExperts) {
      const updates = {}
      if (exp.subcategorySlug && expertSubcategoryRemap[exp.subcategorySlug]) {
        updates.subcategorySlug = expertSubcategoryRemap[exp.subcategorySlug]
      }
      if (exp.categorySlug && !ALLOWED_CATEGORY_SLUGS.has(exp.categorySlug)) {
        updates.categorySlug = 'business-entrepreneurship'
      }
      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date()
        await expertsCol.updateOne({ _id: exp._id }, { $set: updates })
        stats.expertsUpdated++
        console.log(`  ✓ Updated expert "${exp.name}" taxonomy fields:`, updates)
      }
    }

    const totalBookingsPreserved = await bookingsCol.countDocuments({})

    console.log('\n======================================================')
    console.log('🎉 MVP TAXONOMY & OFFER GOVERNANCE MIGRATION SUMMARY')
    console.log('======================================================')
    console.log(`MVP Categories Created:            ${stats.categoriesCreated}`)
    console.log(`MVP Categories Synced:             ${stats.categoriesUpdated}`)
    console.log(`Removed Categories Deactivated:    ${stats.categoriesDeactivated}`)
    console.log(`MVP Subcategories Created:         ${stats.subcategoriesCreated}`)
    console.log(`MVP Subcategories Synced:          ${stats.subcategoriesUpdated}`)
    console.log(`Legacy Subcategories Deactivated:  ${stats.subcategoriesDeactivated}`)
    console.log(`Existing Offers Mapped (Active):   ${stats.servicesMapped}`)
    console.log(`Existing Offers Unpublished:       ${stats.servicesUnpublishedForReview}`)
    console.log(`Experts Taxonomy Synced:           ${stats.expertsUpdated}`)
    console.log(`Historical Bookings Preserved:     ${totalBookingsPreserved}`)
    console.log('======================================================\n')
  } finally {
    await client.close()
  }
}

seedCategories().catch((err) => {
  console.error('Fatal error during MVP category seeding:', err)
  process.exit(1)
})
