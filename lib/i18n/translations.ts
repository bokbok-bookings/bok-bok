export type Language = 'en' | 'ar'

export interface TranslationDictionary {
  header: {
    consultations: string
    workshops: string
    webinars: string
    explore: string
    experts: string
    howItWorks: string
    login: string
    signup: string
    switchLanguage: string
  }
  footer: {
    tagline: string
    description: string
    verifiedBadge: string
    marketplaceFormats: string
    learnDiscover: string
    trustSupport: string
    privacy: string
    terms: string
    guidelines: string
    allRightsReserved: string
    specialistsTransfers: string
    mvpScope: string
    approvedTaxonomy: string
    applyAsExpert: string
    expertSignIn: string
  }
  home: {
    heroBadge: string
    heroTitleLine1: string
    heroTitleLine2: string
    heroSubtitle: string
    exploreAll: string
    consultations: string
    workshops: string
    webinars: string
    adminReviewed: string
    verifiedSpecialists: string
    categoriesHeading: string
    exploreAllCategories: string
    specializations: string
    exploreOfferings: string
    howItWorksHeading: string
    howItWorksSubtitle: string
    howItWorksLink: string
    featuredExpertsHeading: string
    viewAllExperts: string
    nextAvailable: string
    fromPrice: string
    viewProfile: string
    noExpertsFound: string
    becomeExpertTag: string
    becomeExpertHeading: string
    becomeExpertBtn: string
  }
  howItWorks: {
    heroBadge: string
    title: string
    subtitle: string
    forClients: string
    forExperts: string
    clientJourney: string
    expertFlow: string
    threeFormatsHeading: string
    threeFormatsSubtitle: string
    consultationTitle: string
    consultationDesc: string
    consultationCta: string
    workshopTitle: string
    workshopDesc: string
    workshopCta: string
    webinarTitle: string
    webinarDesc: string
    webinarCta: string
  }
  catalog: {
    searchPlaceholder: string
    allCategories: string
    allSubcategories: string
    verifiedMarketplace: string
    noOfferingsFound: string
    bookNow: string
    duration: string
    availableSlots: string
    liveCohort: string
    onlineSession: string
    inPersonSession: string
    consultationLabel: string
    workshopLabel: string
    webinarLabel: string
  }
  experts: {
    title: string
    subtitle: string
    searchPlaceholder: string
    allCategories: string
    viewProfile: string
    searchBtn: string
    nextAvailable: string
    startingFrom: string
    noExperts: string
    reviews: string
  }
}

export const translations: Record<Language, TranslationDictionary> = {
  en: {
    header: {
      consultations: 'Consultations',
      workshops: 'Workshops',
      webinars: 'Webinars',
      explore: 'Explore All',
      experts: 'Experts',
      howItWorks: 'How It Works',
      login: 'Log in',
      signup: 'Sign up',
      switchLanguage: 'العربية',
    },
    footer: {
      tagline: 'Expertise, made human.',
      description: 'Direct access to vetted specialists for 1-on-1 consultations, interactive workshops, and live webinars across 9 approved MVP fields.',
      verifiedBadge: 'Admin-reviewed MVP marketplace',
      marketplaceFormats: 'Marketplace Formats',
      learnDiscover: 'Learn & Discover',
      trustSupport: 'Trust & Support',
      privacy: 'Privacy Policy',
      terms: 'Terms of Service',
      guidelines: 'Platform Guidelines',
      allRightsReserved: 'All rights reserved.',
      specialistsTransfers: 'Verified InstaPay Transfers',
      mvpScope: 'Reduced-Risk MVP Scope',
      approvedTaxonomy: 'Approved MVP Taxonomy',
      applyAsExpert: 'Apply as an Expert',
      expertSignIn: 'Expert Sign In',
    },
    home: {
      heroBadge: 'Vetted Experts & Practical Guidance',
      heroTitleLine1: 'Lessons from their journey.',
      heroTitleLine2: 'Your shortcut forward.',
      heroSubtitle: 'You don’t have to learn everything the hard way. Connect with experts who turn lived experience into guidance for your journey.',
      exploreAll: 'Explore All',
      consultations: 'Consultations',
      workshops: 'Workshops',
      webinars: 'Webinars',
      adminReviewed: 'Admin-reviewed offers',
      verifiedSpecialists: 'Verified specialists',
      categoriesHeading: 'What can we help with?',
      exploreAllCategories: 'Explore all 9 categories',
      specializations: 'specializations',
      exploreOfferings: 'Explore offerings',
      howItWorksHeading: 'Good advice is only three steps away.',
      howItWorksSubtitle: 'Explore vetted practitioners, select a time that suits your agenda, and meet seamlessly via live video.',
      howItWorksLink: 'Learn how Bok Bok works',
      featuredExpertsHeading: 'Meet vetted specialists',
      viewAllExperts: 'View directory',
      nextAvailable: 'Next available',
      fromPrice: 'From',
      viewProfile: 'View profile',
      noExpertsFound: 'No experts found. Try another search.',
      becomeExpertTag: 'Your experience matters',
      becomeExpertHeading: 'Turn what you know into someone else’s next breakthrough.',
      becomeExpertBtn: 'Become an expert',
    },
    howItWorks: {
      heroBadge: 'Consultations • Workshops • Webinars',
      title: 'How Bok Bok Works',
      subtitle: 'Direct access to vetted specialists across 9 approved fields. Seamless live scheduling, verified InstaPay payments, and admin-reviewed quality.',
      forClients: 'For Clients & Businesses',
      forExperts: 'For Experts & Advisors',
      clientJourney: 'Client Journey',
      expertFlow: 'Expert Flow',
      threeFormatsHeading: 'Three Focused MVP Formats',
      threeFormatsSubtitle: 'Choose the format that fits your goals: private consultations, intensive workshops, or live webinars.',
      consultationTitle: '1-on-1 Consultations',
      consultationDesc: 'Focused advice, reviews (CV, code, portfolio, campaigns), and strategic mentoring customized to your specific challenges.',
      consultationCta: 'Browse Consultations',
      workshopTitle: 'Interactive Workshops',
      workshopDesc: 'Small-group intensive cohorts with practical exercises, peer feedback, and hands-on skill building.',
      workshopCta: 'Join Workshops',
      webinarTitle: 'Live Webinars',
      webinarDesc: 'Broadcast masterclasses and industry roundtables with live audience Q&A sessions.',
      webinarCta: 'Discover Webinars',
    },
    catalog: {
      searchPlaceholder: 'Search by topic, consultation, workshop, webinar, or expert...',
      allCategories: 'All Categories',
      allSubcategories: 'All Subcategories',
      verifiedMarketplace: 'Verified Marketplace',
      noOfferingsFound: 'No offerings found matching your criteria. Try adjusting your search or filters.',
      bookNow: 'Book',
      duration: 'min',
      availableSlots: 'Open Slots',
      liveCohort: 'Live Cohort',
      onlineSession: 'Online Remote',
      inPersonSession: 'In-Person',
      consultationLabel: '1-on-1 Consultation',
      workshopLabel: 'Workshop',
      webinarLabel: 'Webinar',
    },
    experts: {
      title: 'Vetted Specialists Directory',
      subtitle: 'Connect with experienced industry specialists for targeted consultations and practical mentorship.',
      searchPlaceholder: 'Search by specialist name, title, or skills...',
      allCategories: 'All Categories',
      viewProfile: 'View profile',
      searchBtn: 'Search',
      nextAvailable: 'Next slot',
      startingFrom: 'From',
      noExperts: 'No specialists found. Try adjusting your search or category filters.',
      reviews: 'reviews',
    },
  },
  ar: {
    header: {
      consultations: 'الاستشارات',
      workshops: 'ورش العمل',
      webinars: 'الندوات',
      explore: 'استكشف الكل',
      experts: 'الخبراء',
      howItWorks: 'كيف يعمل',
      login: 'تسجيل الدخول',
      signup: 'حساب جديد',
      switchLanguage: 'English',
    },
    footer: {
      tagline: 'الخبرة، بطابع إنساني موثوق.',
      description: 'وصول مباشر لخبراء ومختصين معتمدين لجلسات استشارية فردية، ورش عمل تفاعلية، وندوات مباشرة عبر 9 مجالات معتمدة.',
      verifiedBadge: 'منصة معتمدة ومراجعة بالكامل',
      marketplaceFormats: 'أنواع الجلسات والخدمات',
      learnDiscover: 'تعرف واكتشف',
      trustSupport: 'الموثوقية والدعم',
      privacy: 'سياسة الخصوصية',
      terms: 'شروط الاستخدام',
      guidelines: 'إرشادات المنصة',
      allRightsReserved: 'جميع الحقوق محفوظة.',
      specialistsTransfers: 'تحويلات مؤكدة عبر إنستاباي',
      mvpScope: 'نطاق موثوق ومحدد',
      approvedTaxonomy: 'المجالات والتصنيفات المعتمدة',
      applyAsExpert: 'انضم كخبير ومستشار',
      expertSignIn: 'دخول الخبراء',
    },
    home: {
      heroBadge: 'خبراء معتمدون وإرشاد عملي موجه',
      heroTitleLine1: 'دروس من تجاربهم.',
      heroTitleLine2: 'طريقك المختصر نحو الأمام.',
      heroSubtitle: 'ليس عليك أن تتعلم كل شيء بالطريقة الصعبة. تواصل مع خبراء يحولون خبراتهم الحقيقية إلى توجيه مباشر لرحلتك.',
      exploreAll: 'استكشف الكل',
      consultations: 'الاستشارات',
      workshops: 'ورش العمل',
      webinars: 'الندوات',
      adminReviewed: 'عروض معتمدة ومراجعة',
      verifiedSpecialists: 'مختصون موثوقون',
      categoriesHeading: 'كيف يمكننا مساعدتك؟',
      exploreAllCategories: 'استكشف جميع المجالات الـ 9',
      specializations: 'تخصصات',
      exploreOfferings: 'استكشف العروض',
      howItWorksHeading: 'المشورة الصحيحة على بعد ثلاث خطوات فقط.',
      howItWorksSubtitle: 'استكشف الخبراء المعتمدين، اختر الموعد المناسب لجدولك، والتقِ مباشرة عبر مكالمة فيديو آمنة.',
      howItWorksLink: 'تعرف على آلية عمل بوك بوك',
      featuredExpertsHeading: 'نخبة من المختصين المعتمدين',
      viewAllExperts: 'دليل الخبراء',
      nextAvailable: 'الموعد المتاح',
      fromPrice: 'تبدأ من',
      viewProfile: 'عرض الملف',
      noExpertsFound: 'لم يتم العثور على خبراء. جرب بحثاً آخر.',
      becomeExpertTag: 'خبرتك ذات قيمة كبيرة',
      becomeExpertHeading: 'حوّل ما تعرفه إلى نقطة تحول حقيقية في مسيرة شخص آخر.',
      becomeExpertBtn: 'انضم كخبير',
    },
    howItWorks: {
      heroBadge: 'استشارات • ورش عمل • ندوات مباشرة',
      title: 'كيف يعمل بوك بوك',
      subtitle: 'تواصل مباشر مع متخصصين موثوقين في 9 مجالات معتمدة. مواعيد حية مباشرة، دفع مؤكد عبر إنستاباي، وجودة مراجعة من الإدارة.',
      forClients: 'للعملاء والشركات',
      forExperts: 'للخبراء والمستشارين',
      clientJourney: 'رحلة المستفيد',
      expertFlow: 'مسار الخبير',
      threeFormatsHeading: 'ثلاثة نماذج رئيسية للجلسات',
      threeFormatsSubtitle: 'اختر النموذج الذي يناسب أهدافك: استشارات فردية مخصصة، ورش عمل تطبيقية مكثفة، أو ندوات تفاعلية مباشرة.',
      consultationTitle: 'استشارات فردية 1-على-1',
      consultationDesc: 'نصائح مركزة، مراجعات متخصصة (سيرة ذاتية، كود، أعمال، حملات تسويقية) وتوجيه استراتيجي مصمم لتحدياتك الخاصة.',
      consultationCta: 'تصفح الاستشارات',
      workshopTitle: 'ورش عمل تفاعلية',
      workshopDesc: 'مجموعات تدريبية صغيرة ومكثفة تركز على التمارين العملية، تقييم الأقران، وبناء المهارات التطبيقية.',
      workshopCta: 'انضم لورش العمل',
      webinarTitle: 'ندوات مباشرة',
      webinarDesc: 'محاضرات وجلسات حوارية شاملة تقدمها كفاءات وخبرات رائدة مع فقرة مخصصة لأسئلة وأجوبة الحضور.',
      webinarCta: 'اكتشف الندوات',
    },
    catalog: {
      searchPlaceholder: 'ابحث بالموضوع، الاستشارة، ورشة العمل، الندوة، أو اسم الخبير...',
      allCategories: 'جميع المجالات',
      allSubcategories: 'جميع التخصصات',
      verifiedMarketplace: 'منصة موثوقة ومعتمدة',
      noOfferingsFound: 'لم يتم العثور على عروض تطابق بحثك. يرجى تعديل البحث أو الفلاتر.',
      bookNow: 'حجز',
      duration: 'دقيقة',
      availableSlots: 'مواعيد متاحة',
      liveCohort: 'مجموعة تدريبية',
      onlineSession: 'عبر الإنترنت',
      inPersonSession: 'حضوري',
      consultationLabel: 'استشارة فردية',
      workshopLabel: 'ورشة عمل',
      webinarLabel: 'ندوة مباشرة',
    },
    experts: {
      title: 'دليل المختصين والخبراء',
      subtitle: 'تواصل مباشرة مع كفاءات مهنية معتمدة للاستفادة من استشارات متخصصة وإرشاد عملي موثوق.',
      searchPlaceholder: 'ابحث باسم الخبير، المسمى المهني، أو المهارات...',
      allCategories: 'جميع المجالات',
      viewProfile: 'عرض الملف',
      searchBtn: 'بحث',
      nextAvailable: 'أقرب موعد',
      startingFrom: 'تبدأ من',
      noExperts: 'لم يتم العثور على خبراء. يرجى تعديل معايير البحث أو اختيار مجال آخر.',
      reviews: 'تقييماً',
    },
  },
}

