/**
 * Default copy for the public hospital website (merged with DB in getMergedWebsiteContent).
 */
export type WebsiteValue = { title: string; description: string };
export type WebsiteStat = { label: string; value: string };
export type WebsiteVisitRow = { label: string; value: string };
export type WebsiteFaqItem = { question: string; answer: string };
export type WebsiteTestimonial = { quote: string; author: string; role: string };
export type WebsiteProvider = { name: string; role: string; bio: string; imageUrl: string };
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
  heroBadge: 'Excellence in care',
  heroTitle: 'Compassionate healthcare for every patient',
  heroSubtitle:
    'From emergency care to planned surgery and ongoing outpatient support, our teams combine evidence-based medicine with respect for every patient and family—here when you need us, close to home.',
  heroBullets: [
    'Emergency department, wards, theatres, and clinics on one connected campus',
    'Consultants and specialist nursing across medicine, surgery, women’s & children’s health, and major centres',
    'On-site laboratory, imaging, and day-case pathways to shorten waits and keep your care coordinated',
    'Interpreter access, privacy safeguards, and discharge planning that includes you and your carers',
  ],
  heroImageUrl: '',
  heroCtaPrimary: 'Contact us',
  heroCtaSecondary: 'Our services',
  heroStatChipEyebrow: 'At a glance',
  heroNoImageBadge: 'Integrated care',
  aboutTitle: 'About our hospital',
  aboutBody:
    'We combine evidence-based medicine with a human touch. Our multidisciplinary teams work across inpatient, outpatient, emergency, and diagnostic services to deliver coordinated care.\n\nClinical governance, infection prevention, and continuous quality improvement underpin everything we do—so you can focus on getting better.',
  missionTitle: 'Our mission',
  missionBody:
    'To improve the health of the communities we serve through accessible, safe, and high-quality care.',
  valuesTitle: 'What we stand for',
  values: [
    { title: 'Patient first', description: 'Decisions start with what is best for patients and families.' },
    { title: 'Safety', description: 'Rigorous protocols and continuous learning at every step.' },
    { title: 'Respect', description: 'Dignity, privacy, and cultural sensitivity for everyone.' },
    { title: 'Innovation', description: 'Modern tools and workflows that support better outcomes.' },
  ],
  announcementText: '',
  trustPillarsTitle: 'Commitment to patients & families',
  trustPillars: [
    { title: '24/7 emergency access', subtitle: 'Urgent care when minutes matter' },
    { title: 'Clinical safety', subtitle: 'Protocols, audits & governance' },
    { title: 'Privacy & confidentiality', subtitle: 'Your information protected' },
    { title: 'Evidence-based care', subtitle: 'Guidelines-informed practice' },
  ],
  highlightsEyebrow: 'Why us',
  highlightsTitle: 'Why patients choose us',
  highlightsSubtitle:
    'Safety, dignity, and clear communication at every step—from your first call to follow-up after you go home.',
  highlights: [
    {
      title: 'Multidisciplinary teams',
      description: 'Consultants, nurses, therapists, and pharmacists meet regularly so your plan stays coordinated and up to date.',
    },
    {
      title: 'Same-campus diagnostics',
      description: 'Laboratory, imaging, and cardiology support on site to shorten waits and avoid unnecessary transfers.',
    },
    {
      title: 'Infection prevention & cleanliness',
      description: 'Rigorous hand hygiene, isolation when needed, and environmental standards aligned with national guidance.',
    },
    {
      title: 'Respect for privacy',
      description: 'Confidential care, clear consent, and support for cultural and language needs wherever possible.',
    },
  ],
  statsEyebrow: 'Our hospital at a glance',
  stats: [
    { label: 'Beds', value: '120+' },
    { label: 'Specialists', value: '80+' },
    { label: 'Emergency visits / year', value: '45k+' },
    { label: 'Years of service', value: '25+' },
  ],
  servicesEyebrow: 'Services',
  servicesTitle: 'Clinical services',
  servicesSubtitle:
    'Inpatient and outpatient pathways across acute care, surgery, medicine, women’s and children’s health, diagnostics, and recovery—supported by pharmacy, therapy, and social support where needed.',
  services: [
    { title: 'Emergency & critical care', description: '24/7 emergency department, resuscitation, and intensive care with rapid access to diagnostics and specialists.' },
    { title: 'Surgery', description: 'Planned and urgent procedures with modern operating suites, anaesthesia, and perioperative safety checks.' },
    { title: 'Internal medicine', description: 'Diagnosis and long-term management of complex chronic conditions, including cardiology, respiratory, and metabolic care.' },
    { title: 'Women & children', description: 'Maternity, neonatal support, paediatric clinics, and family-centred antenatal and postnatal care.' },
    { title: 'Diagnostics', description: 'On-site laboratory, imaging (X-ray, CT, MRI, ultrasound), cardiology testing, and structured results reporting.' },
    { title: 'Rehabilitation', description: 'Physiotherapy, occupational therapy, and recovery programmes to restore mobility, function, and independence.' },
    { title: 'Mental health & counselling', description: 'Assessment, brief therapy, and liaison with specialist mental health services when appropriate.' },
    { title: 'Chronic disease programmes', description: 'Structured follow-up for diabetes, heart failure, COPD, and other long-term conditions.' },
  ],
  departmentsEyebrow: 'Specialties',
  departmentsTitle: 'Centres of excellence',
  departmentsSubtitle:
    'Focused clinical programmes led by consultants, specialist nurses, and allied health professionals—working as one team around your diagnosis and treatment plan.',
  departments: [
    { title: 'Heart & vascular', description: 'Prevention, coronary care, intervention, heart failure, and structured cardiac rehabilitation.' },
    { title: 'Oncology', description: 'Multidisciplinary tumour boards, chemotherapy support, survivorship, and palliative care liaison.' },
    { title: 'Neurosciences', description: 'Stroke pathways, epilepsy, movement disorders, and neuro-rehabilitation with therapy teams.' },
    { title: 'Orthopaedics', description: 'Joint replacement, sports injuries, fracture care, and day-case orthopaedic procedures.' },
    { title: 'Digestive & liver', description: 'Endoscopy, hepatology, and inflammatory bowel disease alongside surgical colleagues.' },
    { title: 'Respiratory & sleep', description: 'Lung function, COPD and asthma programmes, and sleep-disordered breathing assessment.' },
  ],
  careJourneyEyebrow: 'Patient experience',
  careJourneyTitle: 'Your care journey',
  careJourneySubtitle:
    'A clear path from first contact to follow-up—whether you arrive as an emergency, a day-case, or a long-term outpatient.',
  careJourneySteps: [
    {
      title: 'Request your visit',
      body: 'Book online, call reception, or arrive via emergency. We prioritise urgent symptoms and guide you to the right service.',
    },
    {
      title: 'Prepare & check in',
      body: 'Bring ID, insurance details, and a list of medications. Staff explain what to expect, fasting, and consent.',
    },
    {
      title: 'Assessment & treatment',
      body: 'Doctors, nurses, and therapists work as a team—on the ward, in theatre, or in clinic—with clear updates for you and your family.',
    },
    {
      title: 'Recovery & follow-up',
      body: 'Discharge planning, prescriptions, referrals, and follow-up appointments—plus advice on when to seek help again.',
    },
  ],
  visitEyebrow: 'Plan your visit',
  visitTitle: 'Visiting & hours',
  visitSubtitle: 'Planning a visit or supporting a loved one? Here are the essentials.',
  visitRows: [
    { label: 'Main reception', value: 'Mon–Fri 7:00–20:00 · Sat 8:00–14:00' },
    { label: 'Emergency department', value: 'Open 24 hours, 7 days a week' },
    { label: 'Outpatient clinics', value: 'By appointment · typical slots 8:00–17:00' },
    { label: 'Parking & access', value: 'Patient parking on site · step-free entrances at main lobby' },
  ],
  testimonialsEyebrow: 'Patient voices',
  testimonialsTitle: 'What our community says',
  testimonials: [
    {
      quote: 'The team explained every step clearly. I felt listened to and cared for.',
      author: 'A. M.',
      role: 'Outpatient surgery',
    },
    {
      quote: 'Professional staff and short wait times in the clinic. Very grateful.',
      author: 'R. K.',
      role: 'Family member',
    },
    {
      quote: 'Clean facilities and kind nurses throughout my stay.',
      author: 'S. L.',
      role: 'Inpatient care',
    },
  ],
  providersEyebrow: 'Care team',
  providersTitle: 'Meet our providers',
  providersSubtitle:
    'Highlight the clinicians and care leaders patients may meet across your services. Edit names, photos, and bios from Admin settings.',
  providers: [
    {
      name: 'Dr. Ama Mensah',
      role: 'Consultant Physician',
      bio: 'Leads coordinated care for adult medicine patients with a focus on clear communication and continuity after discharge.',
      imageUrl: '',
    },
    {
      name: 'Dr. Kojo Owusu',
      role: 'Family Medicine',
      bio: 'Supports preventive care, chronic disease follow-up, and timely referrals for patients and families.',
      imageUrl: '',
    },
    {
      name: 'Nurse Lead Efua Boateng',
      role: 'Senior Nursing Lead',
      bio: 'Coordinates nursing standards, patient education, and compassionate ward care across clinical teams.',
      imageUrl: '',
    },
  ],
  faqEyebrow: 'FAQ',
  faqTitle: 'Frequently asked questions',
  faqSubtitle: 'Quick answers about appointments, visiting, and emergencies.',
  faqItems: [
    {
      question: 'How do I book or change an appointment?',
      answer:
        'Call main reception or use your patient portal if your provider has enabled online booking. For urgent changes, phone the department directly.',
    },
    {
      question: 'Can I visit a patient on the ward?',
      answer:
        'Visiting hours vary by unit. Please check with reception or nursing staff for the latest policy, including any health-screening requirements.',
    },
    {
      question: 'What should I bring for a day procedure?',
      answer:
        'Bring photo ID, insurance details, a list of medications, and comfortable clothing. Staff will tell you if fasting or other preparation is required.',
    },
    {
      question: 'What counts as an emergency?',
      answer:
        'Chest pain, severe bleeding, difficulty breathing, sudden weakness, or major trauma need emergency care. For life-threatening situations, call your local emergency number immediately.',
    },
    {
      question: 'Can I request an appointment online?',
      answer:
        'If your hospital has enabled online requests, use the “Book appointment” or “Request an appointment” link on this website. You may verify your mobile number by SMS if you are a returning patient. For urgent symptoms, contact your clinician or emergency services instead of waiting for a routine slot.',
    },
    {
      question: 'How do I get copies of my records or test results?',
      answer:
        'Contact medical records or the department that ordered your tests. Some results are available through a patient portal if your provider has activated it. Allow time for reports to be reviewed and released.',
    },
  ],
  contactEyebrow: 'Contact',
  contactTitle: 'Visit & contact',
  contactBody: 'Reach our main reception for appointments, directions, and general enquiries.',
  mapEmbedUrl: '',
  appointmentRequestEnabled: true,
  appointmentSectionEyebrow: 'Book online',
  appointmentNavLabel: 'Appointment',
  appointmentSectionTitle: 'Request an appointment',
  appointmentSectionSubtitle:
    'Tell us how we can help. Our scheduling team will follow up to confirm date and time, or you can call reception for urgent needs.',
  appointmentSectionButtonLabel: 'Start appointment request',
  appointmentPlaceholderDoctorName: 'To be assigned — website request',
  heroPrimaryLinksAppointment: false,
  requestAppointmentPageTitle: 'Appointment request',
  requestAppointmentPageSubtitle:
    'Complete the form below. We will contact you to confirm your visit. For emergencies, use your local emergency number or go to the emergency department.',
  requestAppointmentSuccessMessage:
    'Thank you. Your request has been received. Our team will contact you shortly to confirm details.',
  ctaTitle: 'Need urgent help?',
  ctaSubtitle: 'In a life-threatening emergency, call your local emergency number immediately.',
  footerTagline: 'Trusted care. Transparent communication. Always here when you need us.',
  footerColumns: [
    {
      title: 'Patients',
      lines: ['Appointments', 'Patient information', 'Billing & insurance'],
    },
    {
      title: 'Professionals',
      lines: ['Referrals', 'Careers', 'Medical staff office'],
    },
    {
      title: 'Resources',
      lines: ['Privacy', 'Accessibility', 'Complaints & feedback'],
    },
  ],
  metaTitle: 'Hospital | Compassionate healthcare',
  metaDescription:
    'Official hospital website: emergency care 24/7, surgery, internal medicine, women’s and children’s services, specialist centres, diagnostics, and appointment information.',
  useSettingsContact: true,
  landingChatbotEnabled: true,
  landingChatbotTitle: 'Ask us',
  landingChatWelcome:
    'Hello — I can help with general questions about our services, visiting hours, and contact options based on this website. For emergencies, use your local emergency number right away.',
};
