type ProviderLike = {
  role?: string;
  image?: string;
  hasImage?: boolean;
  approvalStatus?: string;
  licenseNumber?: string;
  licenseCertificate?: {
    data?: string;
    fileName?: string;
  };
};

export function getEffectiveProviderApprovalStatus(user: ProviderLike): string {
  if (!['doctor', 'staff', 'nurse', 'pharmacy'].includes(user.role || '')) {
    return user.approvalStatus || 'approved';
  }

  // An administrator's approval always stands, even if no licence or photo was uploaded.
  if (user.approvalStatus === 'approved') return 'approved';

  // Only a licence (number or certificate) is needed; a profile photo is optional.
  const hasCertificate = Boolean(user.licenseCertificate?.data || user.licenseCertificate?.fileName);
  const hasLicenseNumber = Boolean(user.licenseNumber?.trim());

  if (!hasCertificate && !hasLicenseNumber) {
    return 'pending_profile';
  }

  return user.approvalStatus || 'pending_verification';
}

export function isProviderApproved(user: ProviderLike): boolean {
  return getEffectiveProviderApprovalStatus(user) === 'approved';
}
