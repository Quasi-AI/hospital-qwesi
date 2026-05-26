// Pre-configured device profiles for major lab equipment manufacturers
// Each profile contains parameter mappings (device code → display name, unit, normal range)

export interface ParameterMapping {
  deviceCode: string;
  testName: string;
  unit: string;
  normalRange: string;
  criticalLow?: string;
  criticalHigh?: string;
}

export interface DeviceProfile {
  id: string;
  manufacturer: string;
  model: string;
  category: 'hematology' | 'biochemistry' | 'immunology' | 'urinalysis' | 'coagulation' | 'bloodgas' | 'electrolyte' | 'esr' | 'hba1c' | 'microbiology' | 'poc' | 'other';
  parameters: ParameterMapping[];
}

// Common CBC parameters used across hematology analyzers
const commonCBCParameters: ParameterMapping[] = [
  { deviceCode: 'WBC', testName: 'White Blood Cells', unit: '10³/µL', normalRange: '4.5-11.0', criticalLow: '2.0', criticalHigh: '30.0' },
  { deviceCode: 'RBC', testName: 'Red Blood Cells', unit: '10⁶/µL', normalRange: '4.5-5.5', criticalLow: '2.5', criticalHigh: '8.0' },
  { deviceCode: 'HGB', testName: 'Hemoglobin', unit: 'g/dL', normalRange: '12.0-17.5', criticalLow: '7.0', criticalHigh: '20.0' },
  { deviceCode: 'HCT', testName: 'Hematocrit', unit: '%', normalRange: '36-50', criticalLow: '20', criticalHigh: '60' },
  { deviceCode: 'MCV', testName: 'Mean Corpuscular Volume', unit: 'fL', normalRange: '80-100' },
  { deviceCode: 'MCH', testName: 'Mean Corpuscular Hemoglobin', unit: 'pg', normalRange: '27-33' },
  { deviceCode: 'MCHC', testName: 'Mean Corpuscular Hemoglobin Concentration', unit: 'g/dL', normalRange: '32-36' },
  { deviceCode: 'PLT', testName: 'Platelet Count', unit: '10³/µL', normalRange: '150-400', criticalLow: '50', criticalHigh: '1000' },
  { deviceCode: 'RDW', testName: 'Red Cell Distribution Width', unit: '%', normalRange: '11.5-14.5' },
  { deviceCode: 'MPV', testName: 'Mean Platelet Volume', unit: 'fL', normalRange: '7.5-11.5' },
  { deviceCode: 'PCT', testName: 'Plateletcrit', unit: '%', normalRange: '0.15-0.40' },
  { deviceCode: 'PDW', testName: 'Platelet Distribution Width', unit: 'fL', normalRange: '9.0-17.0' },
];

// 3-part differential parameters
const threePartDifferential: ParameterMapping[] = [
  { deviceCode: 'LYM', testName: 'Lymphocytes', unit: '%', normalRange: '20-40' },
  { deviceCode: 'LYM#', testName: 'Lymphocytes (Absolute)', unit: '10³/µL', normalRange: '1.0-4.0' },
  { deviceCode: 'MXD', testName: 'Mixed Cells', unit: '%', normalRange: '5-10' },
  { deviceCode: 'MXD#', testName: 'Mixed Cells (Absolute)', unit: '10³/µL', normalRange: '0.2-0.8' },
  { deviceCode: 'NEUT', testName: 'Neutrophils', unit: '%', normalRange: '40-70' },
  { deviceCode: 'NEUT#', testName: 'Neutrophils (Absolute)', unit: '10³/µL', normalRange: '2.0-7.0' },
];

// 5-part differential parameters
const fivePartDifferential: ParameterMapping[] = [
  { deviceCode: 'NEUT', testName: 'Neutrophils', unit: '%', normalRange: '40-70' },
  { deviceCode: 'NEUT#', testName: 'Neutrophils (Absolute)', unit: '10³/µL', normalRange: '2.0-7.0' },
  { deviceCode: 'LYMPH', testName: 'Lymphocytes', unit: '%', normalRange: '20-40' },
  { deviceCode: 'LYMPH#', testName: 'Lymphocytes (Absolute)', unit: '10³/µL', normalRange: '1.0-4.0' },
  { deviceCode: 'MONO', testName: 'Monocytes', unit: '%', normalRange: '2-8' },
  { deviceCode: 'MONO#', testName: 'Monocytes (Absolute)', unit: '10³/µL', normalRange: '0.2-0.8' },
  { deviceCode: 'EOS', testName: 'Eosinophils', unit: '%', normalRange: '1-4' },
  { deviceCode: 'EOS#', testName: 'Eosinophils (Absolute)', unit: '10³/µL', normalRange: '0.0-0.5' },
  { deviceCode: 'BASO', testName: 'Basophils', unit: '%', normalRange: '0-1' },
  { deviceCode: 'BASO#', testName: 'Basophils (Absolute)', unit: '10³/µL', normalRange: '0.0-0.1' },
];

// Common chemistry parameters
const commonChemistryParameters: ParameterMapping[] = [
  { deviceCode: 'GLU', testName: 'Glucose', unit: 'mg/dL', normalRange: '70-100', criticalLow: '40', criticalHigh: '500' },
  { deviceCode: 'BUN', testName: 'Blood Urea Nitrogen', unit: 'mg/dL', normalRange: '7-20', criticalHigh: '100' },
  { deviceCode: 'CREA', testName: 'Creatinine', unit: 'mg/dL', normalRange: '0.6-1.2', criticalHigh: '10.0' },
  { deviceCode: 'UA', testName: 'Uric Acid', unit: 'mg/dL', normalRange: '3.5-7.2' },
  { deviceCode: 'AST', testName: 'Aspartate Aminotransferase (SGOT)', unit: 'U/L', normalRange: '10-40' },
  { deviceCode: 'ALT', testName: 'Alanine Aminotransferase (SGPT)', unit: 'U/L', normalRange: '7-56' },
  { deviceCode: 'ALP', testName: 'Alkaline Phosphatase', unit: 'U/L', normalRange: '44-147' },
  { deviceCode: 'GGT', testName: 'Gamma-Glutamyl Transferase', unit: 'U/L', normalRange: '9-48' },
  { deviceCode: 'TBIL', testName: 'Total Bilirubin', unit: 'mg/dL', normalRange: '0.1-1.2', criticalHigh: '15.0' },
  { deviceCode: 'DBIL', testName: 'Direct Bilirubin', unit: 'mg/dL', normalRange: '0.0-0.3' },
  { deviceCode: 'TP', testName: 'Total Protein', unit: 'g/dL', normalRange: '6.0-8.3' },
  { deviceCode: 'ALB', testName: 'Albumin', unit: 'g/dL', normalRange: '3.5-5.0' },
  { deviceCode: 'CHOL', testName: 'Total Cholesterol', unit: 'mg/dL', normalRange: '<200' },
  { deviceCode: 'TG', testName: 'Triglycerides', unit: 'mg/dL', normalRange: '<150' },
  { deviceCode: 'HDL', testName: 'HDL Cholesterol', unit: 'mg/dL', normalRange: '>40' },
  { deviceCode: 'LDL', testName: 'LDL Cholesterol', unit: 'mg/dL', normalRange: '<100' },
  { deviceCode: 'NA', testName: 'Sodium', unit: 'mEq/L', normalRange: '136-145', criticalLow: '120', criticalHigh: '160' },
  { deviceCode: 'K', testName: 'Potassium', unit: 'mEq/L', normalRange: '3.5-5.0', criticalLow: '2.5', criticalHigh: '6.5' },
  { deviceCode: 'CL', testName: 'Chloride', unit: 'mEq/L', normalRange: '98-106' },
  { deviceCode: 'CO2', testName: 'Carbon Dioxide', unit: 'mEq/L', normalRange: '23-29' },
  { deviceCode: 'CA', testName: 'Calcium', unit: 'mg/dL', normalRange: '8.5-10.5', criticalLow: '6.0', criticalHigh: '13.0' },
  { deviceCode: 'PHOS', testName: 'Phosphorus', unit: 'mg/dL', normalRange: '2.5-4.5' },
  { deviceCode: 'MG', testName: 'Magnesium', unit: 'mg/dL', normalRange: '1.7-2.2' },
  { deviceCode: 'FE', testName: 'Iron', unit: 'µg/dL', normalRange: '60-170' },
  { deviceCode: 'TIBC', testName: 'Total Iron Binding Capacity', unit: 'µg/dL', normalRange: '250-370' },
  { deviceCode: 'LDH', testName: 'Lactate Dehydrogenase', unit: 'U/L', normalRange: '140-280' },
  { deviceCode: 'CK', testName: 'Creatine Kinase', unit: 'U/L', normalRange: '30-200' },
  { deviceCode: 'AMY', testName: 'Amylase', unit: 'U/L', normalRange: '28-100' },
  { deviceCode: 'LIP', testName: 'Lipase', unit: 'U/L', normalRange: '0-160' },
];

// Common coagulation parameters
const commonCoagulationParameters: ParameterMapping[] = [
  { deviceCode: 'PT', testName: 'Prothrombin Time', unit: 'sec', normalRange: '11-13.5', criticalHigh: '30' },
  { deviceCode: 'INR', testName: 'International Normalized Ratio', unit: '', normalRange: '0.8-1.2', criticalHigh: '5.0' },
  { deviceCode: 'APTT', testName: 'Activated Partial Thromboplastin Time', unit: 'sec', normalRange: '25-35', criticalHigh: '100' },
  { deviceCode: 'FIB', testName: 'Fibrinogen', unit: 'mg/dL', normalRange: '200-400', criticalLow: '100' },
  { deviceCode: 'DDIM', testName: 'D-Dimer', unit: 'ng/mL', normalRange: '<500' },
  { deviceCode: 'TT', testName: 'Thrombin Time', unit: 'sec', normalRange: '14-19' },
];

// Blood gas parameters
const commonBloodGasParameters: ParameterMapping[] = [
  { deviceCode: 'PH', testName: 'pH', unit: '', normalRange: '7.35-7.45', criticalLow: '7.20', criticalHigh: '7.60' },
  { deviceCode: 'PCO2', testName: 'Partial Pressure CO2', unit: 'mmHg', normalRange: '35-45', criticalLow: '20', criticalHigh: '70' },
  { deviceCode: 'PO2', testName: 'Partial Pressure O2', unit: 'mmHg', normalRange: '80-100', criticalLow: '40' },
  { deviceCode: 'HCO3', testName: 'Bicarbonate', unit: 'mEq/L', normalRange: '22-26', criticalLow: '10', criticalHigh: '40' },
  { deviceCode: 'BE', testName: 'Base Excess', unit: 'mEq/L', normalRange: '-2 to +2' },
  { deviceCode: 'SO2', testName: 'Oxygen Saturation', unit: '%', normalRange: '95-100', criticalLow: '80' },
  { deviceCode: 'LAC', testName: 'Lactate', unit: 'mmol/L', normalRange: '0.5-2.0', criticalHigh: '4.0' },
  { deviceCode: 'THBC', testName: 'Total Hemoglobin', unit: 'g/dL', normalRange: '12-17' },
  { deviceCode: 'METHB', testName: 'Methemoglobin', unit: '%', normalRange: '0-1.5' },
  { deviceCode: 'COHB', testName: 'Carboxyhemoglobin', unit: '%', normalRange: '0-2' },
];

// Urinalysis parameters
const commonUrinalysisParameters: ParameterMapping[] = [
  { deviceCode: 'UPH', testName: 'pH', unit: '', normalRange: '5.0-8.0' },
  { deviceCode: 'USG', testName: 'Specific Gravity', unit: '', normalRange: '1.005-1.030' },
  { deviceCode: 'UPRO', testName: 'Protein', unit: '', normalRange: 'Negative' },
  { deviceCode: 'UGLU', testName: 'Glucose', unit: '', normalRange: 'Negative' },
  { deviceCode: 'UKET', testName: 'Ketones', unit: '', normalRange: 'Negative' },
  { deviceCode: 'UBLD', testName: 'Blood', unit: '', normalRange: 'Negative' },
  { deviceCode: 'UBIL', testName: 'Bilirubin', unit: '', normalRange: 'Negative' },
  { deviceCode: 'UURO', testName: 'Urobilinogen', unit: 'EU/dL', normalRange: '0.2-1.0' },
  { deviceCode: 'UNIT', testName: 'Nitrite', unit: '', normalRange: 'Negative' },
  { deviceCode: 'ULEU', testName: 'Leukocyte Esterase', unit: '', normalRange: 'Negative' },
  { deviceCode: 'URBC', testName: 'RBC (Microscopic)', unit: '/HPF', normalRange: '0-2' },
  { deviceCode: 'UWBC', testName: 'WBC (Microscopic)', unit: '/HPF', normalRange: '0-5' },
  { deviceCode: 'UBAC', testName: 'Bacteria', unit: '', normalRange: 'None' },
  { deviceCode: 'UCAST', testName: 'Casts', unit: '/LPF', normalRange: '0-2' },
  { deviceCode: 'UCRYS', testName: 'Crystals', unit: '', normalRange: 'None' },
  { deviceCode: 'UEPI', testName: 'Epithelial Cells', unit: '/HPF', normalRange: '0-5' },
];

// ============================================================================
// DEVICE PROFILES
// ============================================================================

export const deviceProfiles: DeviceProfile[] = [
  // ============================================================================
  // HEMATOLOGY ANALYZERS
  // ============================================================================
  
  // Sysmex
  {
    id: 'sysmex-xp-100',
    manufacturer: 'Sysmex',
    model: 'XP-100',
    category: 'hematology',
    parameters: [...commonCBCParameters, ...threePartDifferential],
  },
  {
    id: 'sysmex-xn-series',
    manufacturer: 'Sysmex',
    model: 'XN-Series (XN-1000, XN-2000, XN-3000)',
    category: 'hematology',
    parameters: [...commonCBCParameters, ...fivePartDifferential],
  },
  {
    id: 'sysmex-xs-series',
    manufacturer: 'Sysmex',
    model: 'XS-Series (XS-500i, XS-800i, XS-1000i)',
    category: 'hematology',
    parameters: [...commonCBCParameters, ...fivePartDifferential],
  },
  {
    id: 'sysmex-kx-21n',
    manufacturer: 'Sysmex',
    model: 'KX-21N',
    category: 'hematology',
    parameters: [...commonCBCParameters, ...threePartDifferential],
  },
  {
    id: 'sysmex-xt-series',
    manufacturer: 'Sysmex',
    model: 'XT-Series (XT-1800i, XT-2000i)',
    category: 'hematology',
    parameters: [...commonCBCParameters, ...fivePartDifferential],
  },

  // Orphée / C2 Diagnostics
  {
    id: 'mythic-22-al',
    manufacturer: 'Orphée / C2 Diagnostics',
    model: 'Mythic 22 AL',
    category: 'hematology',
    parameters: [...commonCBCParameters, ...fivePartDifferential],
  },
  {
    id: 'mythic-18',
    manufacturer: 'Orphée / C2 Diagnostics',
    model: 'Mythic 18',
    category: 'hematology',
    parameters: [...commonCBCParameters, ...threePartDifferential],
  },
  {
    id: 'mythic-22',
    manufacturer: 'Orphée / C2 Diagnostics',
    model: 'Mythic 22',
    category: 'hematology',
    parameters: [...commonCBCParameters, ...fivePartDifferential],
  },

  // Mindray
  {
    id: 'mindray-bc-20',
    manufacturer: 'Mindray',
    model: 'BC-20',
    category: 'hematology',
    parameters: [...commonCBCParameters, ...threePartDifferential],
  },
  {
    id: 'mindray-bc-30s',
    manufacturer: 'Mindray',
    model: 'BC-30s',
    category: 'hematology',
    parameters: [...commonCBCParameters, ...threePartDifferential],
  },
  {
    id: 'mindray-bc-5000',
    manufacturer: 'Mindray',
    model: 'BC-5000',
    category: 'hematology',
    parameters: [...commonCBCParameters, ...fivePartDifferential],
  },
  {
    id: 'mindray-bc-5800',
    manufacturer: 'Mindray',
    model: 'BC-5800',
    category: 'hematology',
    parameters: [...commonCBCParameters, ...fivePartDifferential],
  },
  {
    id: 'mindray-bc-6800',
    manufacturer: 'Mindray',
    model: 'BC-6800',
    category: 'hematology',
    parameters: [...commonCBCParameters, ...fivePartDifferential],
  },

  // Beckman Coulter
  {
    id: 'beckman-dxh-500',
    manufacturer: 'Beckman Coulter',
    model: 'DxH 500',
    category: 'hematology',
    parameters: [...commonCBCParameters, ...fivePartDifferential],
  },
  {
    id: 'beckman-dxh-800',
    manufacturer: 'Beckman Coulter',
    model: 'DxH 800',
    category: 'hematology',
    parameters: [...commonCBCParameters, ...fivePartDifferential],
  },
  {
    id: 'beckman-act-5diff',
    manufacturer: 'Beckman Coulter',
    model: 'Ac·T 5diff',
    category: 'hematology',
    parameters: [...commonCBCParameters, ...fivePartDifferential],
  },
  {
    id: 'beckman-lh-750',
    manufacturer: 'Beckman Coulter',
    model: 'LH 750',
    category: 'hematology',
    parameters: [...commonCBCParameters, ...fivePartDifferential],
  },

  // Horiba
  {
    id: 'horiba-yumizen-h500',
    manufacturer: 'Horiba',
    model: 'Yumizen H500',
    category: 'hematology',
    parameters: [...commonCBCParameters, ...fivePartDifferential],
  },
  {
    id: 'horiba-pentra-60',
    manufacturer: 'Horiba',
    model: 'Pentra 60',
    category: 'hematology',
    parameters: [...commonCBCParameters, ...fivePartDifferential],
  },
  {
    id: 'horiba-pentra-es60',
    manufacturer: 'Horiba',
    model: 'Pentra ES 60',
    category: 'hematology',
    parameters: [...commonCBCParameters, ...fivePartDifferential],
  },

  // Abbott
  {
    id: 'abbott-celldyn-ruby',
    manufacturer: 'Abbott',
    model: 'CELL-DYN Ruby',
    category: 'hematology',
    parameters: [...commonCBCParameters, ...fivePartDifferential],
  },
  {
    id: 'abbott-celldyn-emerald',
    manufacturer: 'Abbott',
    model: 'CELL-DYN Emerald',
    category: 'hematology',
    parameters: [...commonCBCParameters, ...fivePartDifferential],
  },

  // Diatron
  {
    id: 'diatron-abacus-5',
    manufacturer: 'Diatron',
    model: 'Abacus 5',
    category: 'hematology',
    parameters: [...commonCBCParameters, ...fivePartDifferential],
  },

  // ERBA / Transasia
  {
    id: 'erba-h360',
    manufacturer: 'ERBA / Transasia',
    model: 'H360',
    category: 'hematology',
    parameters: [...commonCBCParameters, ...threePartDifferential],
  },
  {
    id: 'erba-h560',
    manufacturer: 'ERBA / Transasia',
    model: 'H560',
    category: 'hematology',
    parameters: [...commonCBCParameters, ...fivePartDifferential],
  },

  // Rayto
  {
    id: 'rayto-rt7600',
    manufacturer: 'Rayto',
    model: 'RT-7600',
    category: 'hematology',
    parameters: [...commonCBCParameters, ...threePartDifferential],
  },

  // Drew Scientific
  {
    id: 'drew-hemavet-950',
    manufacturer: 'Drew Scientific',
    model: 'Hemavet 950',
    category: 'hematology',
    parameters: [...commonCBCParameters, ...fivePartDifferential],
  },

  // ============================================================================
  // CHEMISTRY ANALYZERS
  // ============================================================================

  // Siemens
  {
    id: 'siemens-dimension-exl-200',
    manufacturer: 'Siemens',
    model: 'Dimension EXL 200',
    category: 'biochemistry',
    parameters: commonChemistryParameters,
  },
  {
    id: 'siemens-atellica-ch',
    manufacturer: 'Siemens',
    model: 'Atellica CH',
    category: 'biochemistry',
    parameters: commonChemistryParameters,
  },
  {
    id: 'siemens-advia-1800',
    manufacturer: 'Siemens',
    model: 'ADVIA 1800',
    category: 'biochemistry',
    parameters: commonChemistryParameters,
  },

  // Roche
  {
    id: 'roche-cobas-c111',
    manufacturer: 'Roche',
    model: 'Cobas c111',
    category: 'biochemistry',
    parameters: commonChemistryParameters,
  },
  {
    id: 'roche-cobas-c311',
    manufacturer: 'Roche',
    model: 'Cobas c311',
    category: 'biochemistry',
    parameters: commonChemistryParameters,
  },
  {
    id: 'roche-cobas-c501',
    manufacturer: 'Roche',
    model: 'Cobas c501',
    category: 'biochemistry',
    parameters: commonChemistryParameters,
  },

  // Beckman Coulter
  {
    id: 'beckman-au480',
    manufacturer: 'Beckman Coulter',
    model: 'AU480',
    category: 'biochemistry',
    parameters: commonChemistryParameters,
  },
  {
    id: 'beckman-au680',
    manufacturer: 'Beckman Coulter',
    model: 'AU680',
    category: 'biochemistry',
    parameters: commonChemistryParameters,
  },

  // Abbott
  {
    id: 'abbott-alinity-c',
    manufacturer: 'Abbott',
    model: 'Alinity c',
    category: 'biochemistry',
    parameters: commonChemistryParameters,
  },
  {
    id: 'abbott-architect-c4000',
    manufacturer: 'Abbott',
    model: 'Architect c4000',
    category: 'biochemistry',
    parameters: commonChemistryParameters,
  },

  // Mindray
  {
    id: 'mindray-bs-230',
    manufacturer: 'Mindray',
    model: 'BS-230',
    category: 'biochemistry',
    parameters: commonChemistryParameters,
  },
  {
    id: 'mindray-bs-480',
    manufacturer: 'Mindray',
    model: 'BS-480',
    category: 'biochemistry',
    parameters: commonChemistryParameters,
  },
  {
    id: 'mindray-bs-800',
    manufacturer: 'Mindray',
    model: 'BS-800',
    category: 'biochemistry',
    parameters: commonChemistryParameters,
  },

  // ERBA
  {
    id: 'erba-xl-200',
    manufacturer: 'ERBA / Transasia',
    model: 'XL-200',
    category: 'biochemistry',
    parameters: commonChemistryParameters,
  },

  // Dirui
  {
    id: 'dirui-cs-600',
    manufacturer: 'Dirui',
    model: 'CS-600',
    category: 'biochemistry',
    parameters: commonChemistryParameters,
  },

  // ============================================================================
  // COAGULATION ANALYZERS
  // ============================================================================

  // Sysmex
  {
    id: 'sysmex-cs-1600',
    manufacturer: 'Sysmex',
    model: 'CS-1600',
    category: 'coagulation',
    parameters: commonCoagulationParameters,
  },
  {
    id: 'sysmex-cs-5100',
    manufacturer: 'Sysmex',
    model: 'CS-5100',
    category: 'coagulation',
    parameters: commonCoagulationParameters,
  },
  {
    id: 'sysmex-ca-660',
    manufacturer: 'Sysmex',
    model: 'CA-660',
    category: 'coagulation',
    parameters: commonCoagulationParameters,
  },

  // Stago
  {
    id: 'stago-sta-compact',
    manufacturer: 'Stago',
    model: 'STA Compact',
    category: 'coagulation',
    parameters: commonCoagulationParameters,
  },
  {
    id: 'stago-sta-compact-max',
    manufacturer: 'Stago',
    model: 'STA Compact Max',
    category: 'coagulation',
    parameters: commonCoagulationParameters,
  },

  // Siemens
  {
    id: 'siemens-bcs-xp',
    manufacturer: 'Siemens',
    model: 'BCS XP',
    category: 'coagulation',
    parameters: commonCoagulationParameters,
  },

  // IL Werfen
  {
    id: 'werfen-acl-top-550',
    manufacturer: 'IL Werfen',
    model: 'ACL TOP 550',
    category: 'coagulation',
    parameters: commonCoagulationParameters,
  },

  // ============================================================================
  // BLOOD GAS ANALYZERS
  // ============================================================================

  // Radiometer
  {
    id: 'radiometer-abl90',
    manufacturer: 'Radiometer',
    model: 'ABL90 FLEX',
    category: 'bloodgas',
    parameters: commonBloodGasParameters,
  },
  {
    id: 'radiometer-abl800',
    manufacturer: 'Radiometer',
    model: 'ABL800 FLEX',
    category: 'bloodgas',
    parameters: commonBloodGasParameters,
  },

  // Siemens
  {
    id: 'siemens-rapidpoint-500',
    manufacturer: 'Siemens',
    model: 'RAPIDPoint 500',
    category: 'bloodgas',
    parameters: commonBloodGasParameters,
  },

  // Abbott
  {
    id: 'abbott-istat',
    manufacturer: 'Abbott',
    model: 'i-STAT',
    category: 'bloodgas',
    parameters: commonBloodGasParameters,
  },

  // IL Werfen
  {
    id: 'werfen-gem-premier-5000',
    manufacturer: 'IL Werfen',
    model: 'GEM Premier 5000',
    category: 'bloodgas',
    parameters: commonBloodGasParameters,
  },

  // ============================================================================
  // URINALYSIS ANALYZERS
  // ============================================================================

  // Sysmex
  {
    id: 'sysmex-uc-3500',
    manufacturer: 'Sysmex',
    model: 'UC-3500',
    category: 'urinalysis',
    parameters: commonUrinalysisParameters,
  },
  {
    id: 'sysmex-uf-5000',
    manufacturer: 'Sysmex',
    model: 'UF-5000',
    category: 'urinalysis',
    parameters: commonUrinalysisParameters,
  },

  // Roche
  {
    id: 'roche-cobas-u601',
    manufacturer: 'Roche',
    model: 'Cobas u601',
    category: 'urinalysis',
    parameters: commonUrinalysisParameters,
  },

  // Siemens
  {
    id: 'siemens-clinitek-novus',
    manufacturer: 'Siemens',
    model: 'CLINITEK Novus',
    category: 'urinalysis',
    parameters: commonUrinalysisParameters,
  },

  // Arkray
  {
    id: 'arkray-aution-max',
    manufacturer: 'Arkray',
    model: 'AUTION MAX AX-4030',
    category: 'urinalysis',
    parameters: commonUrinalysisParameters,
  },

  // ============================================================================
  // IMMUNOASSAY ANALYZERS
  // ============================================================================

  // Roche
  {
    id: 'roche-cobas-e411',
    manufacturer: 'Roche',
    model: 'Cobas e411',
    category: 'immunology',
    parameters: [
      { deviceCode: 'TSH', testName: 'Thyroid Stimulating Hormone', unit: 'µIU/mL', normalRange: '0.4-4.0' },
      { deviceCode: 'FT4', testName: 'Free T4', unit: 'ng/dL', normalRange: '0.8-1.8' },
      { deviceCode: 'FT3', testName: 'Free T3', unit: 'pg/mL', normalRange: '2.3-4.2' },
      { deviceCode: 'T4', testName: 'Total T4', unit: 'µg/dL', normalRange: '4.5-12.5' },
      { deviceCode: 'T3', testName: 'Total T3', unit: 'ng/dL', normalRange: '80-200' },
      { deviceCode: 'FERR', testName: 'Ferritin', unit: 'ng/mL', normalRange: '20-200' },
      { deviceCode: 'B12', testName: 'Vitamin B12', unit: 'pg/mL', normalRange: '200-900' },
      { deviceCode: 'FOLATE', testName: 'Folate', unit: 'ng/mL', normalRange: '3-17' },
      { deviceCode: 'HBA1C', testName: 'HbA1c', unit: '%', normalRange: '<5.7' },
      { deviceCode: 'INS', testName: 'Insulin', unit: 'µIU/mL', normalRange: '2.6-24.9' },
      { deviceCode: 'CORT', testName: 'Cortisol', unit: 'µg/dL', normalRange: '6-23 (AM)' },
      { deviceCode: 'PSA', testName: 'Prostate Specific Antigen', unit: 'ng/mL', normalRange: '<4.0' },
      { deviceCode: 'TROP', testName: 'Troponin I', unit: 'ng/mL', normalRange: '<0.04', criticalHigh: '0.1' },
      { deviceCode: 'BNP', testName: 'Brain Natriuretic Peptide', unit: 'pg/mL', normalRange: '<100' },
      { deviceCode: 'CRP', testName: 'C-Reactive Protein', unit: 'mg/L', normalRange: '<3.0' },
      { deviceCode: 'PCT', testName: 'Procalcitonin', unit: 'ng/mL', normalRange: '<0.1' },
    ],
  },
  {
    id: 'roche-cobas-e601',
    manufacturer: 'Roche',
    model: 'Cobas e601',
    category: 'immunology',
    parameters: [
      { deviceCode: 'TSH', testName: 'Thyroid Stimulating Hormone', unit: 'µIU/mL', normalRange: '0.4-4.0' },
      { deviceCode: 'FT4', testName: 'Free T4', unit: 'ng/dL', normalRange: '0.8-1.8' },
      { deviceCode: 'FT3', testName: 'Free T3', unit: 'pg/mL', normalRange: '2.3-4.2' },
      { deviceCode: 'FERR', testName: 'Ferritin', unit: 'ng/mL', normalRange: '20-200' },
      { deviceCode: 'B12', testName: 'Vitamin B12', unit: 'pg/mL', normalRange: '200-900' },
      { deviceCode: 'HBA1C', testName: 'HbA1c', unit: '%', normalRange: '<5.7' },
      { deviceCode: 'TROP', testName: 'Troponin I', unit: 'ng/mL', normalRange: '<0.04', criticalHigh: '0.1' },
      { deviceCode: 'BNP', testName: 'Brain Natriuretic Peptide', unit: 'pg/mL', normalRange: '<100' },
    ],
  },

  // Abbott
  {
    id: 'abbott-alinity-i',
    manufacturer: 'Abbott',
    model: 'Alinity i',
    category: 'immunology',
    parameters: [
      { deviceCode: 'TSH', testName: 'Thyroid Stimulating Hormone', unit: 'µIU/mL', normalRange: '0.4-4.0' },
      { deviceCode: 'FT4', testName: 'Free T4', unit: 'ng/dL', normalRange: '0.8-1.8' },
      { deviceCode: 'FT3', testName: 'Free T3', unit: 'pg/mL', normalRange: '2.3-4.2' },
      { deviceCode: 'FERR', testName: 'Ferritin', unit: 'ng/mL', normalRange: '20-200' },
      { deviceCode: 'B12', testName: 'Vitamin B12', unit: 'pg/mL', normalRange: '200-900' },
      { deviceCode: 'TROP', testName: 'Troponin I', unit: 'ng/mL', normalRange: '<0.04', criticalHigh: '0.1' },
    ],
  },

  // Siemens
  {
    id: 'siemens-atellica-im',
    manufacturer: 'Siemens',
    model: 'Atellica IM',
    category: 'immunology',
    parameters: [
      { deviceCode: 'TSH', testName: 'Thyroid Stimulating Hormone', unit: 'µIU/mL', normalRange: '0.4-4.0' },
      { deviceCode: 'FT4', testName: 'Free T4', unit: 'ng/dL', normalRange: '0.8-1.8' },
      { deviceCode: 'FT3', testName: 'Free T3', unit: 'pg/mL', normalRange: '2.3-4.2' },
      { deviceCode: 'FERR', testName: 'Ferritin', unit: 'ng/mL', normalRange: '20-200' },
      { deviceCode: 'B12', testName: 'Vitamin B12', unit: 'pg/mL', normalRange: '200-900' },
      { deviceCode: 'TROP', testName: 'Troponin I', unit: 'ng/mL', normalRange: '<0.04', criticalHigh: '0.1' },
    ],
  },

  // ============================================================================
  // ESR ANALYZERS
  // ============================================================================

  {
    id: 'alifax-test1',
    manufacturer: 'Alifax',
    model: 'Test 1',
    category: 'esr',
    parameters: [
      { deviceCode: 'ESR', testName: 'Erythrocyte Sedimentation Rate', unit: 'mm/hr', normalRange: '0-20 (M), 0-30 (F)' },
    ],
  },
  {
    id: 'alcor-ised',
    manufacturer: 'Alcor Scientific',
    model: 'iSED',
    category: 'esr',
    parameters: [
      { deviceCode: 'ESR', testName: 'Erythrocyte Sedimentation Rate', unit: 'mm/hr', normalRange: '0-20 (M), 0-30 (F)' },
    ],
  },

  // ============================================================================
  // HbA1c ANALYZERS
  // ============================================================================

  {
    id: 'biorad-d10',
    manufacturer: 'Bio-Rad',
    model: 'D-10',
    category: 'hba1c',
    parameters: [
      { deviceCode: 'HBA1C', testName: 'Hemoglobin A1c', unit: '%', normalRange: '<5.7' },
      { deviceCode: 'EHAG', testName: 'Estimated Average Glucose', unit: 'mg/dL', normalRange: '<117' },
    ],
  },
  {
    id: 'tosoh-g8',
    manufacturer: 'Tosoh',
    model: 'G8',
    category: 'hba1c',
    parameters: [
      { deviceCode: 'HBA1C', testName: 'Hemoglobin A1c', unit: '%', normalRange: '<5.7' },
    ],
  },
  {
    id: 'siemens-dca-vantage',
    manufacturer: 'Siemens',
    model: 'DCA Vantage',
    category: 'hba1c',
    parameters: [
      { deviceCode: 'HBA1C', testName: 'Hemoglobin A1c', unit: '%', normalRange: '<5.7' },
      { deviceCode: 'MALB', testName: 'Microalbumin', unit: 'mg/L', normalRange: '<30' },
      { deviceCode: 'ACR', testName: 'Albumin/Creatinine Ratio', unit: 'mg/g', normalRange: '<30' },
    ],
  },
];

// Helper function to get profile by ID
export function getDeviceProfile(profileId: string): DeviceProfile | undefined {
  return deviceProfiles.find(p => p.id === profileId);
}

// Helper function to get profiles by manufacturer
export function getProfilesByManufacturer(manufacturer: string): DeviceProfile[] {
  return deviceProfiles.filter(p => p.manufacturer.toLowerCase().includes(manufacturer.toLowerCase()));
}

// Helper function to get profiles by category
export function getProfilesByCategory(category: DeviceProfile['category']): DeviceProfile[] {
  return deviceProfiles.filter(p => p.category === category);
}

// Get all unique manufacturers
export function getManufacturers(): string[] {
  const manufacturers = new Set(deviceProfiles.map(p => p.manufacturer));
  return Array.from(manufacturers).sort();
}

// Get all unique categories
export function getCategories(): DeviceProfile['category'][] {
  return ['hematology', 'biochemistry', 'immunology', 'urinalysis', 'coagulation', 'bloodgas', 'electrolyte', 'esr', 'hba1c', 'microbiology', 'poc', 'other'];
}

// Category display names
export const categoryDisplayNames: Record<DeviceProfile['category'], string> = {
  hematology: 'Hematology',
  biochemistry: 'Biochemistry / Chemistry',
  immunology: 'Immunoassay',
  urinalysis: 'Urinalysis',
  coagulation: 'Coagulation',
  bloodgas: 'Blood Gas',
  electrolyte: 'Electrolyte',
  esr: 'ESR',
  hba1c: 'HbA1c / Glycated Hemoglobin',
  microbiology: 'Microbiology',
  poc: 'Point of Care',
  other: 'Other',
};
