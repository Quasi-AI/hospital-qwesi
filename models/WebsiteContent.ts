import mongoose from 'mongoose';

const PairSchema = new mongoose.Schema(
  {
    title: { type: String, default: '' },
    description: { type: String, default: '' },
  },
  { _id: false }
);

const StatSchema = new mongoose.Schema(
  {
    label: { type: String, default: '' },
    value: { type: String, default: '' },
  },
  { _id: false }
);

const FooterColSchema = new mongoose.Schema(
  {
    title: { type: String, default: '' },
    lines: [{ type: String }],
  },
  { _id: false }
);

const VisitRowSchema = new mongoose.Schema(
  {
    label: { type: String, default: '' },
    value: { type: String, default: '' },
  },
  { _id: false }
);

const FaqItemSchema = new mongoose.Schema(
  {
    question: { type: String, default: '' },
    answer: { type: String, default: '' },
  },
  { _id: false }
);

const TestimonialSchema = new mongoose.Schema(
  {
    quote: { type: String, default: '' },
    author: { type: String, default: '' },
    role: { type: String, default: '' },
  },
  { _id: false }
);

const ProviderSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    role: { type: String, default: '' },
    bio: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
  },
  { _id: false }
);

const TrustPillarSchema = new mongoose.Schema(
  {
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
  },
  { _id: false }
);

const CareJourneyStepSchema = new mongoose.Schema(
  {
    title: { type: String, default: '' },
    body: { type: String, default: '' },
  },
  { _id: false }
);

const websiteContentSchema = new mongoose.Schema(
  {
    heroBadge: { type: String, default: '' },
    heroTitle: { type: String, default: '' },
    heroSubtitle: { type: String, default: '' },
    heroBullets: { type: [String], default: [] },
    heroImageUrl: { type: String, default: '' },
    heroCtaPrimary: { type: String, default: '' },
    heroCtaSecondary: { type: String, default: '' },
    heroStatChipEyebrow: { type: String, default: '' },
    heroNoImageBadge: { type: String, default: '' },
    aboutTitle: { type: String, default: '' },
    aboutBody: { type: String, default: '' },
    missionTitle: { type: String, default: '' },
    missionBody: { type: String, default: '' },
    valuesTitle: { type: String, default: '' },
    values: { type: [PairSchema], default: [] },

    announcementText: { type: String, default: '' },
    trustPillarsTitle: { type: String, default: '' },
    trustPillars: { type: [TrustPillarSchema], default: [] },

    highlightsEyebrow: { type: String, default: '' },
    highlightsTitle: { type: String, default: '' },
    highlightsSubtitle: { type: String, default: '' },
    highlights: { type: [PairSchema], default: [] },

    statsEyebrow: { type: String, default: '' },
    stats: { type: [StatSchema], default: [] },

    servicesEyebrow: { type: String, default: '' },
    servicesTitle: { type: String, default: '' },
    servicesSubtitle: { type: String, default: '' },
    services: { type: [PairSchema], default: [] },

    departmentsEyebrow: { type: String, default: '' },
    departmentsTitle: { type: String, default: '' },
    departmentsSubtitle: { type: String, default: '' },
    departments: { type: [PairSchema], default: [] },

    careJourneyEyebrow: { type: String, default: '' },
    careJourneyTitle: { type: String, default: '' },
    careJourneySubtitle: { type: String, default: '' },
    careJourneySteps: { type: [CareJourneyStepSchema], default: [] },

    visitEyebrow: { type: String, default: '' },
    visitTitle: { type: String, default: '' },
    visitSubtitle: { type: String, default: '' },
    visitRows: { type: [VisitRowSchema], default: [] },

    testimonialsEyebrow: { type: String, default: '' },
    testimonialsTitle: { type: String, default: '' },
    testimonials: { type: [TestimonialSchema], default: [] },

    providersEyebrow: { type: String, default: '' },
    providersTitle: { type: String, default: '' },
    providersSubtitle: { type: String, default: '' },
    providers: { type: [ProviderSchema], default: [] },

    faqEyebrow: { type: String, default: '' },
    faqTitle: { type: String, default: '' },
    faqSubtitle: { type: String, default: '' },
    faqItems: { type: [FaqItemSchema], default: [] },

    contactEyebrow: { type: String, default: '' },
    contactTitle: { type: String, default: '' },
    contactBody: { type: String, default: '' },

    mapEmbedUrl: { type: String, default: '' },

    appointmentRequestEnabled: { type: Boolean, default: true },
    appointmentSectionEyebrow: { type: String, default: '' },
    appointmentNavLabel: { type: String, default: '' },
    appointmentSectionTitle: { type: String, default: '' },
    appointmentSectionSubtitle: { type: String, default: '' },
    appointmentSectionButtonLabel: { type: String, default: '' },
    appointmentPlaceholderDoctorName: { type: String, default: '' },
    heroPrimaryLinksAppointment: { type: Boolean, default: false },
    requestAppointmentPageTitle: { type: String, default: '' },
    requestAppointmentPageSubtitle: { type: String, default: '' },
    requestAppointmentSuccessMessage: { type: String, default: '' },

    ctaTitle: { type: String, default: '' },
    ctaSubtitle: { type: String, default: '' },
    footerTagline: { type: String, default: '' },
    footerColumns: { type: [FooterColSchema], default: [] },
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
    landingChatbotEnabled: { type: Boolean, default: true },
    landingChatbotTitle: { type: String, default: '' },
    landingChatWelcome: { type: String, default: '' },
    useSettingsContact: { type: Boolean, default: true },
  },
  { timestamps: true }
);

websiteContentSchema.index({}, { unique: true });

export default mongoose.models.WebsiteContent ||
  mongoose.model('WebsiteContent', websiteContentSchema);
