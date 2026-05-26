// Imaging device profiles for major manufacturers
// Pre-configured profiles with modality, default settings, and device information

import { DicomModality } from '@/models/ImagingDevice';

export interface ImagingDeviceProfile {
  id: string;
  manufacturer: string;
  model: string;
  category: string;
  modality: DicomModality;
  supportedModalities: DicomModality[];
  description: string;
  defaultAeTitle?: string;
}

// CT Scanner Profiles
const ctScanners: ImagingDeviceProfile[] = [
  // GE Healthcare
  {
    id: 'ge-revolution-ct',
    manufacturer: 'GE Healthcare',
    model: 'Revolution CT',
    category: 'CT Scanner',
    modality: 'CT',
    supportedModalities: ['CT'],
    description: '256-slice CT scanner with advanced cardiac imaging',
  },
  {
    id: 'ge-optima-ct660',
    manufacturer: 'GE Healthcare',
    model: 'Optima CT660',
    category: 'CT Scanner',
    modality: 'CT',
    supportedModalities: ['CT'],
    description: '64-slice CT scanner for routine diagnostics',
  },
  {
    id: 'ge-brightspeed',
    manufacturer: 'GE Healthcare',
    model: 'BrightSpeed',
    category: 'CT Scanner',
    modality: 'CT',
    supportedModalities: ['CT'],
    description: '16-slice CT scanner',
  },
  // Siemens Healthineers
  {
    id: 'siemens-somatom-force',
    manufacturer: 'Siemens Healthineers',
    model: 'SOMATOM Force',
    category: 'CT Scanner',
    modality: 'CT',
    supportedModalities: ['CT'],
    description: 'Dual-source CT with high temporal resolution',
  },
  {
    id: 'siemens-somatom-go',
    manufacturer: 'Siemens Healthineers',
    model: 'SOMATOM go.',
    category: 'CT Scanner',
    modality: 'CT',
    supportedModalities: ['CT'],
    description: 'Compact CT scanner with tablet control',
  },
  {
    id: 'siemens-somatom-edge',
    manufacturer: 'Siemens Healthineers',
    model: 'SOMATOM Edge Plus',
    category: 'CT Scanner',
    modality: 'CT',
    supportedModalities: ['CT'],
    description: '128-slice single-source CT',
  },
  // Philips
  {
    id: 'philips-brilliance-ict',
    manufacturer: 'Philips',
    model: 'Brilliance iCT',
    category: 'CT Scanner',
    modality: 'CT',
    supportedModalities: ['CT'],
    description: '256-slice CT for cardiac and whole-body imaging',
  },
  {
    id: 'philips-incisive-ct',
    manufacturer: 'Philips',
    model: 'Incisive CT',
    category: 'CT Scanner',
    modality: 'CT',
    supportedModalities: ['CT'],
    description: 'AI-powered CT scanner',
  },
  // Canon/Toshiba
  {
    id: 'canon-aquilion-one',
    manufacturer: 'Canon Medical',
    model: 'Aquilion ONE',
    category: 'CT Scanner',
    modality: 'CT',
    supportedModalities: ['CT'],
    description: '320-row dynamic volume CT',
  },
  {
    id: 'canon-aquilion-prime',
    manufacturer: 'Canon Medical',
    model: 'Aquilion Prime SP',
    category: 'CT Scanner',
    modality: 'CT',
    supportedModalities: ['CT'],
    description: '80-row CT scanner',
  },
];

// MRI Profiles
const mriScanners: ImagingDeviceProfile[] = [
  // GE Healthcare
  {
    id: 'ge-signa-architect',
    manufacturer: 'GE Healthcare',
    model: 'SIGNA Architect',
    category: 'MRI',
    modality: 'MR',
    supportedModalities: ['MR'],
    description: '3.0T wide-bore MRI with AI applications',
  },
  {
    id: 'ge-optima-mr450w',
    manufacturer: 'GE Healthcare',
    model: 'Optima MR450w',
    category: 'MRI',
    modality: 'MR',
    supportedModalities: ['MR'],
    description: '1.5T wide-bore MRI',
  },
  // Siemens Healthineers
  {
    id: 'siemens-magnetom-vida',
    manufacturer: 'Siemens Healthineers',
    model: 'MAGNETOM Vida',
    category: 'MRI',
    modality: 'MR',
    supportedModalities: ['MR'],
    description: '3.0T MRI with BioMatrix technology',
  },
  {
    id: 'siemens-magnetom-sola',
    manufacturer: 'Siemens Healthineers',
    model: 'MAGNETOM Sola',
    category: 'MRI',
    modality: 'MR',
    supportedModalities: ['MR'],
    description: '1.5T MRI with 70cm bore',
  },
  {
    id: 'siemens-magnetom-lumina',
    manufacturer: 'Siemens Healthineers',
    model: 'MAGNETOM Lumina',
    category: 'MRI',
    modality: 'MR',
    supportedModalities: ['MR'],
    description: '3.0T MRI for clinical excellence',
  },
  // Philips
  {
    id: 'philips-ingenia-elition',
    manufacturer: 'Philips',
    model: 'Ingenia Elition',
    category: 'MRI',
    modality: 'MR',
    supportedModalities: ['MR'],
    description: '3.0T digital MRI with Compressed SENSE',
  },
  {
    id: 'philips-ingenia-ambition',
    manufacturer: 'Philips',
    model: 'Ingenia Ambition',
    category: 'MRI',
    modality: 'MR',
    supportedModalities: ['MR'],
    description: '1.5T helium-free MRI',
  },
  // Canon
  {
    id: 'canon-vantage-orian',
    manufacturer: 'Canon Medical',
    model: 'Vantage Orian',
    category: 'MRI',
    modality: 'MR',
    supportedModalities: ['MR'],
    description: '1.5T MRI with Advanced intelligent Clear-IQ Engine',
  },
  {
    id: 'canon-vantage-galan',
    manufacturer: 'Canon Medical',
    model: 'Vantage Galan 3T',
    category: 'MRI',
    modality: 'MR',
    supportedModalities: ['MR'],
    description: '3.0T MRI with wide 71cm bore',
  },
];

// Ultrasound Profiles
const ultrasoundDevices: ImagingDeviceProfile[] = [
  // GE Healthcare
  {
    id: 'ge-logiq-e10',
    manufacturer: 'GE Healthcare',
    model: 'LOGIQ E10',
    category: 'Ultrasound',
    modality: 'US',
    supportedModalities: ['US'],
    description: 'Premium ultrasound with cSound imaging',
  },
  {
    id: 'ge-voluson-e10',
    manufacturer: 'GE Healthcare',
    model: 'Voluson E10',
    category: 'Ultrasound',
    modality: 'US',
    supportedModalities: ['US'],
    description: 'Premium OB/GYN ultrasound',
  },
  {
    id: 'ge-vivid-e95',
    manufacturer: 'GE Healthcare',
    model: 'Vivid E95',
    category: 'Ultrasound',
    modality: 'US',
    supportedModalities: ['US'],
    description: 'Premium cardiac ultrasound',
  },
  // Siemens Healthineers
  {
    id: 'siemens-acuson-sequoia',
    manufacturer: 'Siemens Healthineers',
    model: 'ACUSON Sequoia',
    category: 'Ultrasound',
    modality: 'US',
    supportedModalities: ['US'],
    description: 'Premium ultrasound with BioAcoustic technology',
  },
  {
    id: 'siemens-acuson-redwood',
    manufacturer: 'Siemens Healthineers',
    model: 'ACUSON Redwood',
    category: 'Ultrasound',
    modality: 'US',
    supportedModalities: ['US'],
    description: 'Mid-range ultrasound system',
  },
  // Philips
  {
    id: 'philips-epiq-elite',
    manufacturer: 'Philips',
    model: 'EPIQ Elite',
    category: 'Ultrasound',
    modality: 'US',
    supportedModalities: ['US'],
    description: 'Premium ultrasound with nSIGHT Imaging',
  },
  {
    id: 'philips-affiniti',
    manufacturer: 'Philips',
    model: 'Affiniti',
    category: 'Ultrasound',
    modality: 'US',
    supportedModalities: ['US'],
    description: 'High-performance ultrasound',
  },
  // Canon
  {
    id: 'canon-aplio-i800',
    manufacturer: 'Canon Medical',
    model: 'Aplio i800',
    category: 'Ultrasound',
    modality: 'US',
    supportedModalities: ['US'],
    description: 'Premium ultrasound with iBeam Architecture',
  },
  // Samsung
  {
    id: 'samsung-rs85-prestige',
    manufacturer: 'Samsung',
    model: 'RS85 Prestige',
    category: 'Ultrasound',
    modality: 'US',
    supportedModalities: ['US'],
    description: 'Premium ultrasound with Crystal Architecture',
  },
  {
    id: 'samsung-hs70a',
    manufacturer: 'Samsung',
    model: 'HS70A',
    category: 'Ultrasound',
    modality: 'US',
    supportedModalities: ['US'],
    description: 'Mid-range general imaging ultrasound',
  },
  // Mindray
  {
    id: 'mindray-resona-7',
    manufacturer: 'Mindray',
    model: 'Resona 7',
    category: 'Ultrasound',
    modality: 'US',
    supportedModalities: ['US'],
    description: 'Premium ultrasound with ZST+ technology',
  },
  {
    id: 'mindray-dc-80',
    manufacturer: 'Mindray',
    model: 'DC-80',
    category: 'Ultrasound',
    modality: 'US',
    supportedModalities: ['US'],
    description: 'High-performance ultrasound',
  },
];

// X-Ray / Digital Radiography Profiles
const xrayDevices: ImagingDeviceProfile[] = [
  // GE Healthcare
  {
    id: 'ge-discovery-xr656',
    manufacturer: 'GE Healthcare',
    model: 'Discovery XR656 Plus',
    category: 'Digital X-Ray',
    modality: 'DX',
    supportedModalities: ['DX', 'CR'],
    description: 'Digital radiography system',
  },
  {
    id: 'ge-optima-xr240amx',
    manufacturer: 'GE Healthcare',
    model: 'Optima XR240amx',
    category: 'Mobile X-Ray',
    modality: 'DX',
    supportedModalities: ['DX'],
    description: 'Mobile digital X-ray',
  },
  // Siemens Healthineers
  {
    id: 'siemens-ysio-max',
    manufacturer: 'Siemens Healthineers',
    model: 'Ysio Max',
    category: 'Digital X-Ray',
    modality: 'DX',
    supportedModalities: ['DX'],
    description: 'Ceiling-mounted digital radiography',
  },
  {
    id: 'siemens-mobilett-elara-max',
    manufacturer: 'Siemens Healthineers',
    model: 'Mobilett Elara Max',
    category: 'Mobile X-Ray',
    modality: 'DX',
    supportedModalities: ['DX'],
    description: 'Premium mobile X-ray',
  },
  // Philips
  {
    id: 'philips-digitaldiagnost-c90',
    manufacturer: 'Philips',
    model: 'DigitalDiagnost C90',
    category: 'Digital X-Ray',
    modality: 'DX',
    supportedModalities: ['DX'],
    description: 'Ceiling-mounted digital radiography',
  },
  // Fujifilm
  {
    id: 'fujifilm-fdr-go-plus',
    manufacturer: 'Fujifilm',
    model: 'FDR Go PLUS',
    category: 'Mobile X-Ray',
    modality: 'DX',
    supportedModalities: ['DX', 'CR'],
    description: 'Mobile digital radiography',
  },
  {
    id: 'fujifilm-fdr-visionary-suite',
    manufacturer: 'Fujifilm',
    model: 'FDR Visionary Suite',
    category: 'Digital X-Ray',
    modality: 'DX',
    supportedModalities: ['DX'],
    description: 'Multi-purpose digital radiography room',
  },
  // Carestream
  {
    id: 'carestream-drx-evolution-plus',
    manufacturer: 'Carestream',
    model: 'DRX-Evolution Plus',
    category: 'Digital X-Ray',
    modality: 'DX',
    supportedModalities: ['DX', 'CR'],
    description: 'Premium digital radiography room',
  },
  {
    id: 'carestream-drx-revolution',
    manufacturer: 'Carestream',
    model: 'DRX-Revolution',
    category: 'Mobile X-Ray',
    modality: 'DX',
    supportedModalities: ['DX'],
    description: 'Mobile digital radiography',
  },
];

// Mammography Profiles
const mammographyDevices: ImagingDeviceProfile[] = [
  // GE Healthcare
  {
    id: 'ge-senographe-pristina',
    manufacturer: 'GE Healthcare',
    model: 'Senographe Pristina',
    category: 'Mammography',
    modality: 'MG',
    supportedModalities: ['MG'],
    description: 'Digital mammography with patient-assisted compression',
  },
  // Siemens Healthineers
  {
    id: 'siemens-mammomat-revelation',
    manufacturer: 'Siemens Healthineers',
    model: 'MAMMOMAT Revelation',
    category: 'Mammography',
    modality: 'MG',
    supportedModalities: ['MG'],
    description: 'Digital breast tomosynthesis',
  },
  // Hologic
  {
    id: 'hologic-selenia-dimensions',
    manufacturer: 'Hologic',
    model: 'Selenia Dimensions',
    category: 'Mammography',
    modality: 'MG',
    supportedModalities: ['MG'],
    description: '3D mammography with tomosynthesis',
  },
  {
    id: 'hologic-3dimensions',
    manufacturer: 'Hologic',
    model: '3Dimensions',
    category: 'Mammography',
    modality: 'MG',
    supportedModalities: ['MG'],
    description: 'Premium 3D mammography system',
  },
  // Fujifilm
  {
    id: 'fujifilm-aspire-cristalle',
    manufacturer: 'Fujifilm',
    model: 'ASPIRE Cristalle',
    category: 'Mammography',
    modality: 'MG',
    supportedModalities: ['MG'],
    description: 'Full-field digital mammography with tomosynthesis',
  },
];

// Fluoroscopy / C-Arm Profiles
const fluoroscopyDevices: ImagingDeviceProfile[] = [
  // GE Healthcare
  {
    id: 'ge-ogi-cf-1901',
    manufacturer: 'GE Healthcare',
    model: 'OEC 3D',
    category: 'C-Arm',
    modality: 'RF',
    supportedModalities: ['RF', 'XA'],
    description: '3D imaging C-arm for orthopedic surgery',
  },
  // Siemens Healthineers
  {
    id: 'siemens-cios-alpha',
    manufacturer: 'Siemens Healthineers',
    model: 'Cios Alpha',
    category: 'C-Arm',
    modality: 'RF',
    supportedModalities: ['RF', 'XA'],
    description: 'Mobile C-arm with flat detector',
  },
  {
    id: 'siemens-artis-icono',
    manufacturer: 'Siemens Healthineers',
    model: 'Artis icono',
    category: 'Angiography',
    modality: 'XA',
    supportedModalities: ['XA', 'RF'],
    description: 'Biplane angiography system',
  },
  // Philips
  {
    id: 'philips-zenition-70',
    manufacturer: 'Philips',
    model: 'Zenition 70',
    category: 'C-Arm',
    modality: 'RF',
    supportedModalities: ['RF', 'XA'],
    description: 'Premium mobile C-arm',
  },
  {
    id: 'philips-azurion',
    manufacturer: 'Philips',
    model: 'Azurion',
    category: 'Angiography',
    modality: 'XA',
    supportedModalities: ['XA', 'RF'],
    description: 'Image-guided therapy platform',
  },
];

// Nuclear Medicine / PET Profiles
const nuclearMedicineDevices: ImagingDeviceProfile[] = [
  // GE Healthcare
  {
    id: 'ge-discovery-mi',
    manufacturer: 'GE Healthcare',
    model: 'Discovery MI',
    category: 'PET/CT',
    modality: 'PT',
    supportedModalities: ['PT', 'CT', 'NM'],
    description: 'Digital PET/CT with SiPM technology',
  },
  {
    id: 'ge-nmct-870-dr',
    manufacturer: 'GE Healthcare',
    model: 'NM/CT 870 DR',
    category: 'SPECT/CT',
    modality: 'NM',
    supportedModalities: ['NM', 'CT'],
    description: 'Digital SPECT/CT',
  },
  // Siemens Healthineers
  {
    id: 'siemens-biograph-vision',
    manufacturer: 'Siemens Healthineers',
    model: 'Biograph Vision',
    category: 'PET/CT',
    modality: 'PT',
    supportedModalities: ['PT', 'CT'],
    description: 'Digital PET/CT with LSO crystals',
  },
  {
    id: 'siemens-symbia-intevo',
    manufacturer: 'Siemens Healthineers',
    model: 'Symbia Intevo',
    category: 'SPECT/CT',
    modality: 'NM',
    supportedModalities: ['NM', 'CT'],
    description: 'SPECT/CT with xSPECT technology',
  },
  // Philips
  {
    id: 'philips-vereos',
    manufacturer: 'Philips',
    model: 'Vereos',
    category: 'PET/CT',
    modality: 'PT',
    supportedModalities: ['PT', 'CT'],
    description: 'Digital PET/CT',
  },
];

// Combine all profiles
export const imagingDeviceProfiles: ImagingDeviceProfile[] = [
  ...ctScanners,
  ...mriScanners,
  ...ultrasoundDevices,
  ...xrayDevices,
  ...mammographyDevices,
  ...fluoroscopyDevices,
  ...nuclearMedicineDevices,
];

// Helper function to get profile by ID
export function getImagingProfile(profileId: string): ImagingDeviceProfile | undefined {
  return imagingDeviceProfiles.find(p => p.id === profileId);
}

// Helper function to get profiles by modality
export function getProfilesByModality(modality: DicomModality): ImagingDeviceProfile[] {
  return imagingDeviceProfiles.filter(p => 
    p.modality === modality || p.supportedModalities.includes(modality)
  );
}

// Helper function to get profiles by manufacturer
export function getProfilesByManufacturer(manufacturer: string): ImagingDeviceProfile[] {
  return imagingDeviceProfiles.filter(p => 
    p.manufacturer.toLowerCase().includes(manufacturer.toLowerCase())
  );
}

// Get unique manufacturers
export function getImagingManufacturers(): string[] {
  const manufacturers = new Set(imagingDeviceProfiles.map(p => p.manufacturer));
  return Array.from(manufacturers).sort();
}

// Get unique categories
export function getImagingCategories(): string[] {
  const categories = new Set(imagingDeviceProfiles.map(p => p.category));
  return Array.from(categories).sort();
}

// Get modality display name
export function getModalityName(modality: string): string {
  const modalityNames: Record<string, string> = {
    CR: 'Computed Radiography',
    CT: 'CT Scan',
    MR: 'MRI',
    US: 'Ultrasound',
    MG: 'Mammography',
    XA: 'X-Ray Angiography',
    DX: 'Digital X-Ray',
    NM: 'Nuclear Medicine',
    PT: 'PET Scan',
    RF: 'Fluoroscopy',
    OT: 'Other',
  };
  return modalityNames[modality] || modality;
}
