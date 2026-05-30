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
  if (!['doctor', 'staff'].includes(user.role || '')) {
    return user.approvalStatus || 'approved';
  }

  const hasPhoto = Boolean(user.image || user.hasImage);
  const hasCertificate = Boolean(user.licenseCertificate?.data || user.licenseCertificate?.fileName);
  const hasLicenseNumber = Boolean(user.licenseNumber?.trim());

  if (!hasPhoto || !hasCertificate || !hasLicenseNumber) {
    return 'pending_profile';
  }

  return user.approvalStatus || 'pending_verification';
}

export function isProviderApproved(user: ProviderLike): boolean {
  return getEffectiveProviderApprovalStatus(user) === 'approved';
}
