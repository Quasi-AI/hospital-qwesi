type ProviderRole = 'doctor' | 'staff' | 'nurse' | 'pharmacy';

export interface LicenseVerificationInput {
  name: string;
  email: string;
  role: ProviderRole;
  licenseNumber?: string;
  licenseCertificate?: {
    fileName?: string;
    fileType?: string;
    data?: string;
  };
}

export interface LicenseVerificationResult {
  autoApproved: boolean;
  status: 'verified' | 'failed' | 'manual_review';
  method?: 'official_api' | 'manual';
  message: string;
  reference?: string;
}

function hasCertificate(input: LicenseVerificationInput) {
  return Boolean(input.licenseCertificate?.data && input.licenseCertificate?.fileType);
}

export async function verifyProviderLicense(
  input: LicenseVerificationInput
): Promise<LicenseVerificationResult> {
  if (!input.licenseNumber?.trim()) {
    return {
      autoApproved: false,
      status: 'manual_review',
      method: 'manual',
      message: 'License number is required before verification.',
    };
  }

  if (!hasCertificate(input)) {
    return {
      autoApproved: false,
      status: 'manual_review',
      method: 'manual',
      message: 'License certificate is required before verification.',
    };
  }

  const endpoint = process.env.LICENSE_VERIFICATION_API_URL;
  if (!endpoint) {
    return {
      autoApproved: false,
      status: 'manual_review',
      method: 'manual',
      message: 'No official license verification API is configured. Manual review is required.',
    };
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.LICENSE_VERIFICATION_API_KEY
          ? { Authorization: `Bearer ${process.env.LICENSE_VERIFICATION_API_KEY}` }
          : {}),
      },
      body: JSON.stringify({
        name: input.name,
        email: input.email,
        role: input.role,
        licenseNumber: input.licenseNumber,
        certificateFileName: input.licenseCertificate?.fileName,
        certificateFileType: input.licenseCertificate?.fileType,
      }),
    });

    if (!response.ok) {
      return {
        autoApproved: false,
        status: 'manual_review',
        method: 'official_api',
        message: `Official registry check failed with status ${response.status}. Manual review is required.`,
      };
    }

    const data = await response.json();
    const verified =
      data.valid === true ||
      data.verified === true ||
      data.status === 'valid' ||
      data.status === 'verified' ||
      data.status === 'approved';

    return {
      autoApproved: verified,
      status: verified ? 'verified' : 'failed',
      method: 'official_api',
      message: verified
        ? 'License verified through the configured official registry API.'
        : data.message || 'Official registry did not confirm this license.',
      reference: data.reference || data.verificationId || data.id,
    };
  } catch (error) {
    return {
      autoApproved: false,
      status: 'manual_review',
      method: 'official_api',
      message:
        error instanceof Error
          ? `Official registry check failed: ${error.message}`
          : 'Official registry check failed. Manual review is required.',
    };
  }
}
