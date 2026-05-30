'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  User, 
  Mail, 
  Lock, 
  Save, 
  Eye, 
  EyeOff,
  ArrowLeft,
  Camera,
  FileText,
  ShieldCheck
} from 'lucide-react';
import ProtectedRoute from '../protected-route';
import SidebarLayout from '../components/sidebar-layout';
import Link from 'next/link';
import { useTranslations } from '../hooks/useTranslations';

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const { t } = useTranslations();
  const [loading, setLoading] = useState(false);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    image: '',
    licenseNumber: '',
    licenseCertificate: '',
    licenseCertificateFileName: '',
    licenseCertificateFileType: '',
    approvalStatus: 'approved',
    licenseVerificationMessage: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (session?.user) {
      setFormData(prev => ({
        ...prev,
        name: session.user.name || '',
        email: session.user.email || '',
        image: session.user.image || '',
        approvalStatus: session.user.approvalStatus || 'approved',
      }));
    }
  }, [session]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setVerificationRequired(params.get('verificationRequired') === '1' || params.get('photoRequired') === '1');
    setApprovalRequired(params.get('approvalRequired') === '1');
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadProfile = async () => {
      try {
        const response = await fetch('/api/profile');
        if (!response.ok || cancelled) return;
        const data = await response.json();
        if (data.user) {
          setFormData((prev) => ({
            ...prev,
            name: data.user.name || prev.name,
            email: data.user.email || prev.email,
            image: data.user.image || '',
            licenseNumber: data.user.licenseNumber || '',
            licenseCertificate: data.user.licenseCertificate?.data || '',
            licenseCertificateFileName: data.user.licenseCertificate?.fileName || '',
            licenseCertificateFileType: data.user.licenseCertificate?.fileType || '',
            approvalStatus: data.user.approvalStatus || 'approved',
            licenseVerificationMessage: data.user.licenseVerification?.message || '',
          }));
        }
      } catch {
        /* session data is enough as fallback */
      }
    };
    loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMessage({ type: 'error', text: 'Please upload a JPG, PNG, or WEBP photo.' });
      return;
    }
    if (file.size > 1024 * 1024) {
      setMessage({ type: 'error', text: 'Photo is too large. Please upload an image under 1 MB.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, image: String(reader.result || '') }));
      setMessage(null);
    };
    reader.readAsDataURL(file);
  };

  const handleCertificateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMessage({ type: 'error', text: 'Please upload a PDF, JPG, PNG, or WEBP license certificate.' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Certificate is too large. Please upload a file under 2 MB.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        licenseCertificate: String(reader.result || ''),
        licenseCertificateFileName: file.name,
        licenseCertificateFileType: file.type,
      }));
      setMessage(null);
    };
    reader.readAsDataURL(file);
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          image: formData.image,
          licenseNumber: formData.licenseNumber,
          licenseCertificate: formData.licenseCertificate,
          licenseCertificateFileName: formData.licenseCertificateFileName,
          licenseCertificateFileType: formData.licenseCertificateFileType,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: t('profile.profileUpdated') });
        const updatedApprovalStatus = data.user?.approvalStatus || formData.approvalStatus;
        setFormData((prev) => ({
          ...prev,
          approvalStatus: updatedApprovalStatus,
          licenseVerificationMessage: data.user?.licenseVerification?.message || prev.licenseVerificationMessage,
        }));
        // Update the session
        await update({
          ...session,
          user: {
            ...session?.user,
            name: formData.name,
            email: formData.email,
            image: '',
            hasImage: Boolean(formData.image),
            hasLicenseCertificate: Boolean(formData.licenseCertificate),
            approvalStatus: updatedApprovalStatus,
          }
        });
      } else {
        setMessage({ type: 'error', text: data.error || t('profile.profileUpdateError') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('profile.profileUpdateError') });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (formData.newPassword !== formData.confirmPassword) {
      setMessage({ type: 'error', text: t('profile.passwordsNotMatch') });
      setLoading(false);
      return;
    }

    if (formData.newPassword.length < 6) {
      setMessage({ type: 'error', text: t('profile.passwordTooShort') });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: t('profile.passwordUpdated') });
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      } else {
        setMessage({ type: 'error', text: data.error || t('profile.passwordUpdateError') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('profile.passwordUpdateError') });
    } finally {
      setLoading(false);
    }
  };

  const isProvider = ['doctor', 'staff'].includes(session?.user?.role || '');
  const approvalLabel = formData.approvalStatus.replace(/_/g, ' ');
  const approvalClasses =
    formData.approvalStatus === 'approved'
      ? 'border-green-200 bg-green-50 text-green-800'
      : formData.approvalStatus === 'rejected'
        ? 'border-red-200 bg-red-50 text-red-800'
        : 'border-amber-200 bg-amber-50 text-amber-900';

  return (
    <ProtectedRoute>
      <SidebarLayout 
        title={t('profile.title')} 
        description={t('profile.description')} dense>
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Back Button */}
          <div className="mb-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{t('profile.backToDashboard')}</span>
            </Link>
          </div>

          {/* Message */}
          {message && (
            <div className={`p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          {verificationRequired && isProvider && (!formData.image || !formData.licenseCertificate) && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Please upload your profile photo and license certificate before continuing. Your account will go to approval after submission.
            </div>
          )}

          {approvalRequired && isProvider && formData.approvalStatus !== 'approved' && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              Your profile is waiting for approval. You can update your details here while an admin reviews your certificate.
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Profile Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{t('profile.profileInformation')}</h3>
                  <p className="text-sm text-gray-600">{t('profile.profileInformationDesc')}</p>
                </div>
              </div>

              <form onSubmit={handleProfileUpdate} className="space-y-4">
                {isProvider && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Profile photo <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-4">
                      {formData.image ? (
                        <img
                          src={formData.image}
                          alt={formData.name || 'Doctor profile'}
                          className="h-20 w-20 rounded-lg object-cover ring-1 ring-gray-200"
                        />
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                          <Camera className="h-7 w-7" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <input
                          id="doctorImage"
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleImageChange}
                          className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                        />
                        <p className="mt-1 text-xs text-gray-500">JPG, PNG, or WEBP. Max 1 MB.</p>
                      </div>
                    </div>
                  </div>
                )}

                {isProvider && (
                  <>
                    <div>
                      <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700 mb-1">
                        License number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <ShieldCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          id="licenseNumber"
                          name="licenseNumber"
                          value={formData.licenseNumber}
                          onChange={handleInputChange}
                          className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        License certificate <span className="text-red-500">*</span>
                      </label>
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <div className="mb-3 flex items-center gap-2 text-sm text-gray-700">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="truncate">
                            {formData.licenseCertificateFileName || (formData.licenseCertificate ? 'Certificate uploaded' : 'No certificate uploaded')}
                          </span>
                        </div>
                        <input
                          id="licenseCertificate"
                          type="file"
                          accept="application/pdf,image/png,image/jpeg,image/webp"
                          onChange={handleCertificateChange}
                          className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                        />
                        <p className="mt-1 text-xs text-gray-500">PDF, JPG, PNG, or WEBP. Max 2 MB.</p>
                      </div>
                    </div>

                    <div className={`rounded-lg border p-3 text-sm capitalize ${approvalClasses}`}>
                      Approval status: {approvalLabel}
                      {formData.licenseVerificationMessage && (
                        <p className="mt-1 text-xs normal-case">{formData.licenseVerificationMessage}</p>
                      )}
                    </div>
                  </>
                )}

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('profile.fullName')}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('profile.emailAddress')}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Save className="h-4 w-4" />
                    <span>{loading ? t('profile.updating') : t('profile.updateProfile')}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Password Change */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Lock className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{t('profile.changePassword')}</h3>
                  <p className="text-sm text-gray-600">{t('profile.changePasswordDesc')}</p>
                </div>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('profile.currentPassword')}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      id="currentPassword"
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('profile.newPassword')}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      id="newPassword"
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('profile.confirmNewPassword')}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Lock className="h-4 w-4" />
                    <span>{loading ? t('profile.updating') : t('profile.changePasswordBtn')}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Account Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('profile.accountInformation')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('profile.role')}</label>
                <p className="mt-1 text-sm text-gray-900 capitalize">{session?.user?.role || t('auth.doctor')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('profile.accountStatus')}</label>
                <p className="mt-1 text-sm text-green-600">{t('profile.active')}</p>
              </div>
            </div>
          </div>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
