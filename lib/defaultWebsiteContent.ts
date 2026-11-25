/**
 * Default copy for the public hospital website (merged with DB in getMergedWebsiteContent).
 */
export type WebsiteValue = { title: string; description: string };
export type WebsiteStat = { label: string; value: string };
export type WebsiteVisitRow = { label: string; value: string };
export type WebsiteFaqItem = { question: string; answer: string };
export type WebsiteTestimonial = { quote: string; author: string; role: string; rating?: number };
export type WebsiteProvider = { name: string; role: string; bio: string; imageUrl: string };
export type WebsiteSubscriptionPlan = { name: string; price: string; cadence: string; description: string; benefits: string[] };
/** Trust pillars band under announcement */
export type WebsiteTrustPillar = { title: string; subtitle: string };
/** Care journey steps (icons are assigned by order on the public site) */
export type WebsiteCareJourneyStep = { title: string; body: string };

export interface WebsiteContentData {
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  /** Short bullet points shown under the hero subtitle (editable in CMS) */
  heroBullets: string[];
  heroImageUrl: string;
  heroCtaPrimary: string;
  /** Outline button beside primary CTA; scrolls to Services (hidden when empty) */
  heroCtaSecondary: string;
  /** Small caps label on the floating stat chip over the hero image */
  heroStatChipEyebrow: string;
  /** Badge above the title when no hero image is set */
  heroNoImageBadge: string;
  aboutTitle: string;
  aboutBody: string;
  missionTitle: string;
  missionBody: string;
  valuesTitle: string;
  values: WebsiteValue[];

  /** Optional thin banner below the header (empty = hidden) */
  announcementText: string;

  trustPillarsTitle: string;
  trustPillars: WebsiteTrustPillar[];

  highlightsEyebrow: string;
  highlightsTitle: string;
  highlightsSubtitle: string;
  highlights: WebsiteValue[];

  statsEyebrow: string;
  stats: WebsiteStat[];

  servicesEyebrow: string;
  servicesTitle: string;
  servicesSubtitle: string;
  services: WebsiteValue[];

  departmentsEyebrow: string;
  departmentsTitle: string;
  departmentsSubtitle: string;
  departments: WebsiteValue[];

  careJourneyEyebrow: string;
  careJourneyTitle: string;
  careJourneySubtitle: string;
  careJourneySteps: WebsiteCareJourneyStep[];

  visitEyebrow: string;
  visitTitle: string;
  visitSubtitle: string;
  visitRows: WebsiteVisitRow[];

  testimonialsEyebrow: string;
  testimonialsTitle: string;
  testimonials: WebsiteTestimonial[];

  providersEyebrow: string;
  providersTitle: string;
  providersSubtitle: string;
  providers: WebsiteProvider[];

  /** Leadership / team members (CEO, CTO …) shown in the “Our team” section */
  teamEyebrow: string;
  teamTitle: string;
  teamSubtitle: string;
  team: WebsiteProvider[];

  subscriptionsEyebrow: string;
  subscriptionsTitle: string;
  subscriptionsSubtitle: string;
  subscriptions: WebsiteSubscriptionPlan[];

  faqEyebrow: string;
  faqTitle: string;
  faqSubtitle: string;
  faqItems: WebsiteFaqItem[];

  contactEyebrow: string;
  contactTitle: string;
  contactBody: string;

  mapEmbedUrl: string;

  appointmentRequestEnabled: boolean;
  appointmentSectionEyebrow: string;
  appointmentNavLabel: string;
  appointmentSectionTitle: string;
  appointmentSectionSubtitle: string;
  appointmentSectionButtonLabel: string;
  appointmentPlaceholderDoctorName: string;
  heroPrimaryLinksAppointment: boolean;
  requestAppointmentPageTitle: string;
  requestAppointmentPageSubtitle: string;
  requestAppointmentSuccessMessage: string;

  ctaTitle: string;
  ctaSubtitle: string;
  footerTagline: string;
  footerColumns: { title: string; lines: string[] }[];
  metaTitle: string;
  metaDescription: string;
  useSettingsContact: boolean;
  /** Floating assistant on the public landing page (uses active LLM in Admin → AI settings). */
  landingChatbotEnabled: boolean;
  landingChatbotTitle: string;
  landingChatWelcome: string;
}

export const defaultWebsiteContent: WebsiteContentData = {
  heroBadge: 'Virtual care for the world · pay only for the consult you book',
  heroTitle: 'See a doctor or herbalist today — from anywhere in the world',
  heroSubtitle:
    'Browse doctors and herbalists from around the world, compare their consultation fees up front, pick a time that suits you, and pay securely to confirm your video, audio or chat appointment.',
  heroBullets: [
    'Every doctor shows their own fee — no surprises at checkout',
    'Licence-verified doctors across general practice and specialties',
    'Pay securely by card or local payment method, then join from anywhere',
    'Prescriptions, lab requests and records live in your patient portal',
  ],
  heroImageUrl: '',
  heroCtaPrimary: 'Find a doctor',
  heroCtaSecondary: 'How it works',
  heroStatChipEyebrow: 'On the platform',
  heroNoImageBadge: 'Virtual care',
  aboutTitle: 'A hospital without the waiting room',
  aboutBody:
    'Qwesi is a fully virtual hospital. Doctors set their own consultation fee and availability; you choose who to see, pay to book, and meet them online.\n\nNo queues, no travel — just clear prices, verified clinicians and your health records in one place.',
  missionTitle: 'Our mission',
  missionBody: 'To make trusted medical advice affordable, transparent and one tap away for everyone.',
  valuesTitle: 'What we stand for',
  values: [
    { title: 'Transparent pricing', description: 'You see each doctor’s fee before you book.' },
    { title: 'Verified doctors', description: 'Licence numbers and certificates are reviewed before a doctor goes live.' },
    { title: 'Privacy first', description: 'Consultations and records stay between you and your doctor.' },
    { title: 'Care that follows you', description: 'Prescriptions, results and notes are kept in your portal.' },
  ],
  announcementText: '',
  trustPillarsTitle: 'Why people book here',
  trustPillars: [
    { title: 'Upfront fees', subtitle: 'Price shown on every doctor' },
    { title: 'Verified licences', subtitle: 'Reviewed before going live' },
    { title: 'Secure payment', subtitle: 'Cards & local payment methods via Paystack' },
    { title: 'Private by design', subtitle: 'Your data stays yours' },
  ],
  highlightsEyebrow: 'Why Qwesi',
  highlightsTitle: 'Choose your doctor, not a queue',
  highlightsSubtitle: 'Everything you need to go from “I should see someone” to “my appointment is confirmed” in minutes.',
  highlights: [
    { title: 'Compare doctors', description: 'Filter by specialty, language and budget, and read each doctor’s profile and experience.' },
    { title: 'Pay to confirm', description: 'Your slot is held and confirmed the moment your payment goes through.' },
    { title: 'Meet online', description: 'Video, audio or chat — join straight from your phone or laptop.' },
    { title: 'Keep your records', description: 'Prescriptions, lab requests and consultation notes in one patient portal.' },
  ],
  statsEyebrow: 'Qwesi at a glance',
  stats: [
    { label: 'Verified doctors', value: '50+' },
    { label: 'Specialties', value: '15+' },
    { label: 'Average booking time', value: '< 3 min' },
    { label: 'Open for booking', value: '24/7' },
  ],
  servicesEyebrow: 'Services',
  servicesTitle: 'What you can book online',
  servicesSubtitle: 'Virtual consultations for everyday and ongoing needs, with prescriptions and lab requests when your doctor recommends them.',
  services: [
    { title: 'General practitioner', description: 'Fevers, infections, aches, check-ups and general health advice.' },
    { title: 'Specialist consultation', description: 'Cardiology, dermatology, paediatrics, gynaecology and more.' },
    { title: 'Follow-up visits', description: 'Review results, adjust treatment and keep long-term conditions on track.' },
    { title: 'Mental health & counselling', description: 'Talk to a professional in a private, comfortable setting.' },
    { title: 'Prescriptions', description: 'E-prescriptions issued by your doctor after your consultation.' },
    { title: 'Lab requests', description: 'Your doctor can request tests and review results with you online.' },
    { title: 'Chronic care', description: 'Diabetes, hypertension and asthma follow-up with regular check-ins.' },
    { title: 'Second opinions', description: 'Share your records and get another doctor’s view.' },
  ],
  departmentsEyebrow: 'Specialties',
  departmentsTitle: 'Browse by specialty',
  departmentsSubtitle: 'Pick an area of care to see the doctors who practise it and what they charge.',
  departments: [
    { title: 'General Practice', description: 'Everyday health concerns' },
    { title: 'Cardiology', description: 'Heart and blood pressure' },
    { title: 'Dermatology', description: 'Skin, hair and nails' },
    { title: 'Paediatrics', description: 'Babies, children and teens' },
    { title: 'Gynaecology', description: 'Women’s health' },
    { title: 'Mental Health', description: 'Counselling and psychiatry' },
  ],
  careJourneyEyebrow: 'How it works',
  careJourneyTitle: 'Book a doctor in four steps',
  careJourneySubtitle: 'From search to consultation, everything happens online.',
  careJourneySteps: [
    { title: 'Find your doctor', body: 'Search by name or specialty and compare fees, experience, languages and ratings.' },
    { title: 'Pick a time', body: 'Choose an available slot from the doctor’s live calendar.' },
    { title: 'Pay to book', body: 'Pay the doctor’s consultation fee securely by card or local payment method.' },
    { title: 'Meet online', body: 'Join your video, audio or chat consultation, then find your notes and prescriptions in your portal.' },
  ],
  visitEyebrow: 'Working hours',
  visitTitle: 'When we are here to help',
  visitSubtitle: 'Doctors set their own availability, so you can book any time. Our support team keeps these hours.',
  visitRows: [
    { label: 'Monday – Friday', value: '8:00 AM – 8:00 PM' },
    { label: 'Saturday', value: '9:00 AM – 5:00 PM' },
    { label: 'Sunday', value: '10:00 AM – 2:00 PM' },
    { label: 'Online booking', value: 'Open 24/7' },
  ],
  testimonialsEyebrow: 'Patient voices',
  testimonialsTitle: 'What our customers say',
  testimonials: [
    { quote: 'I knew the price before I booked and was speaking to a doctor the same evening.', author: 'A. M.', role: 'Video consultation', rating: 5 },
    { quote: 'No travelling, no waiting room. My doctor sent my prescription straight to my portal.', author: 'R. K.', role: 'Follow-up visit', rating: 5 },
    { quote: 'Booking for my mother from abroad was simple, and the doctor was kind and thorough.', author: 'S. L.', role: 'Family booking', rating: 5 },
  ],
  providersEyebrow: 'Our doctors',
  providersTitle: 'Meet our doctors',
  providersSubtitle: 'Verified doctors with their consultation fee shown up front.',
  providers: [],
  teamEyebrow: 'Our team',
  teamTitle: 'The people behind Qwesi',
  teamSubtitle: 'Meet the leadership team building accessible, transparent virtual care.',
  team: [],
  subscriptionsEyebrow: 'Membership plans',
  subscriptionsTitle: 'Plans for regular care',
  subscriptionsSubtitle: 'Prefer a monthly plan? Subscribe for included virtual care, reminders and family coordination.',
  subscriptions: [
    { name: 'Basic Care', price: 'GHS 50', cadence: 'per month', description: 'Simple access and reminders.', benefits: ['AI health intake', 'Digital health record', 'Discounted consultations', 'Appointment reminders'] },
    { name: 'Family Care', price: 'GHS 150', cadence: 'per month', description: 'Coordinated care for the whole family.', benefits: ['Doctor access when needed', 'Family health updates', 'Medication follow-up', 'Health wallet savings'] },
    { name: 'Chronic Care Plus', price: 'GHS 300', cadence: 'per month', description: 'For long-term conditions.', benefits: ['Weekly check-ins', 'Vitals review', 'Lab coordination', 'Priority support'] },
  ],
  faqEyebrow: 'FAQ',
  faqTitle: 'Questions, answered',
  faqSubtitle: 'Quick answers about booking, paying and your consultation.',
  faqItems: [
    { question: 'How does booking work?', answer: 'Find a doctor, choose a free time slot, and pay the consultation fee shown on their profile. Your appointment is confirmed as soon as payment succeeds.' },
    { question: 'How much does a consultation cost?', answer: 'Each doctor sets their own fee, and it is shown on their card and profile before you book. There are no hidden charges.' },
    { question: 'What can I pay with?', answer: 'Cards and local payment methods (including mobile money where available) are supported through Paystack, in the currency each practitioner charges in. Payments are processed securely and we never see your card details.' },
    { question: 'How do I join my consultation?', answer: 'Open your patient portal at your appointment time and join the video, audio or chat room. You will also get a reminder.' },
    { question: 'Are your doctors licensed?', answer: 'Yes. Doctors upload their licence number and certificate, which are reviewed before their profile appears on the platform.' },
    { question: 'Is this for emergencies?', answer: 'No. If you think you are having a medical emergency, call your local emergency number or go to the nearest emergency facility immediately.' },
  ],
  contactEyebrow: 'Contact',
  contactTitle: 'Need help?',
  contactBody: 'Our support team can help with bookings, payments and accessing your portal.',
  mapEmbedUrl: '',
  appointmentRequestEnabled: true,
  appointmentSectionEyebrow: 'Book online',
  appointmentNavLabel: 'Book',
  appointmentSectionTitle: 'Ready to book?',
  appointmentSectionSubtitle: 'Browse doctors, compare fees and confirm your appointment by paying online.',
  appointmentSectionButtonLabel: 'Find a doctor',
  appointmentPlaceholderDoctorName: 'To be assigned — website request',
  heroPrimaryLinksAppointment: false,
  requestAppointmentPageTitle: 'Appointment request',
  requestAppointmentPageSubtitle: 'Complete the form below and our team will match you with a doctor.',
  requestAppointmentSuccessMessage: 'Thank you. Your request has been received. Our team will contact you shortly to confirm details.',
  ctaTitle: 'Feeling unwell? Talk to a doctor today.',
  ctaSubtitle: 'Not for emergencies. In a life-threatening situation, call your local emergency number immediately.',
  footerTagline: 'Verified doctors. Transparent fees. Care from anywhere.',
  footerColumns: [
    { title: 'Patients', lines: ['Find a doctor', 'How it works', 'Patient portal'] },
    { title: 'Doctors', lines: ['Join as a doctor', 'Set your own fee', 'Doctor login'] },
    { title: 'Resources', lines: ['Privacy', 'Terms', 'Support'] },
  ],
  metaTitle: 'Qwesi Virtual Hospital | Find a doctor & book online',
  metaDescription: 'Browse verified doctors, see consultation fees up front, and pay to book a video, audio or chat appointment.',
  useSettingsContact: true,
  landingChatbotEnabled: true,
  landingChatbotTitle: 'Ask Qwesi',
  landingChatWelcome: 'Hello! I can help you find the right type of doctor, explain how booking and payment work, or answer general questions. For emergencies, call your local emergency number right away.',
};
