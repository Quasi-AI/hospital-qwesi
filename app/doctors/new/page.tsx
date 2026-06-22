'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
  ArrowLeft,
  UserPlus,
  Save,
  Phone,
  GraduationCap,
  Building,
  FileText,
  Award,
  Calendar,
  MapPin,
  Languages,
  Star
} from 'lucide-react';
import ProtectedRoute from '../../protected-route';
import SidebarLayout from '../../components/sidebar-layout';
import { useTranslations } from '../../hooks/useTranslations';

function NewDoctorSuspenseFallback() {
  const { t, translationsLoaded } = useTranslations();
  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      </ProtectedRoute>
    );
  }
  return (
    <ProtectedRoute>
      <SidebarLayout title={t('common.loading')} description={t('doctors.new.loadingDescription')} dense>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
            <p className="mt-4 text-gray-600">{t('common.loading')}</p>
          </div>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}

function NewDoctorForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { t, translationsLoaded } = useTranslations();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get role from query parameter or default to 'doctor'
  const roleParam = searchParams.get('role') as 'doctor' | 'admin' | 'staff' | null;
  const defaultRole = (roleParam && ['doctor', 'admin', 'staff'].includes(roleParam)) ? roleParam : 'doctor';
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: defaultRole as 'doctor' | 'admin' | 'staff',
    phone: '',
    specialization: '',
    department: '',
    licenseNumber: '',
    qualifications: [] as string[],
    languages: [] as string[],
    yearsOfExperience: '',
    rating: '',
    ratingCount: '',
    bio: '',
    address: '',
    dateOfBirth: '',
    gender: '' as 'male' | 'female' | 'other' | 'prefer-not-to-say' | ''
  });
  
  const [newQualification, setNewQualification] = useState('');
  const [newLanguage, setNewLanguage] = useState('');

  // Update role if query parameter changes
  useEffect(() => {
    if (roleParam && ['doctor', 'admin', 'staff'].includes(roleParam)) {
      setFormData(prev => ({ ...prev, role: roleParam as 'doctor' | 'admin' | 'staff' }));
    }
  }, [roleParam]);

  // Check if user is admin
  const isAdmin = session?.user?.role === 'admin';

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('common.loading')} description={t('doctors.new.loadingDescription')} dense>
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
              <p className="mt-4 text-gray-600">{t('common.loading')}</p>
            </div>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  const listHref =
    formData.role === 'admin' ? '/admins' : formData.role === 'staff' ? '/staff' : '/doctors';

  const pageTitle =
    formData.role === 'admin'
      ? t('doctors.new.titleAdmin')
      : formData.role === 'staff'
        ? t('doctors.new.titleStaff')
        : t('doctors.new.titleDoctor');

  const pageDescription =
    formData.role === 'admin'
      ? t('doctors.new.descAdmin')
      : formData.role === 'staff'
        ? t('doctors.new.descStaff')
        : t('doctors.new.descDoctor');

  const backLabel =
    formData.role === 'admin'
      ? t('doctors.new.backAdministrators')
      : formData.role === 'staff'
        ? t('doctors.new.backStaff')
        : t('doctors.new.backDoctors');

  const submitLabel = saving
    ? t('doctors.new.creating')
    : formData.role === 'admin'
      ? t('doctors.new.createAdmin')
      : formData.role === 'staff'
        ? t('doctors.new.createStaff')
        : t('doctors.new.createDoctor');

  const roleDisplayName =
    formData.role === 'admin'
      ? t('doctors.new.roleNameAdmin')
      : formData.role === 'staff'
        ? t('doctors.new.roleNameStaff')
        : t('doctors.new.roleNameDoctor');

  const roleDescription =
    formData.role === 'admin'
      ? t('doctors.new.roleDescAdmin')
      : formData.role === 'staff'
        ? t('doctors.new.roleDescStaff')
        : t('doctors.new.roleDescDoctor');

  if (!isAdmin) {
    router.push('/dashboard');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      const response = await fetch('/api/doctors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        // Redirect to appropriate page based on role
        if (formData.role === 'admin') {
          router.push('/admins');
        } else if (formData.role === 'staff') {
          router.push('/staff');
        } else {
          router.push('/doctors');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || t('doctors.new.errorCreateFailed'));
      }
    } catch (error) {
      console.error('Error creating doctor:', error);
      setError(t('doctors.new.errorCreateGeneric'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <SidebarLayout title={pageTitle} description={pageDescription} dense>
        <div className="mx-auto max-w-2xl">
          {/* Back Button */}
          <div className="mb-2">
            <Link
              href={listHref}
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{backLabel}</span>
            </Link>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Form Card */}
          <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
            <div className={`px-3 py-2.5 ${formData.role === 'admin' ? 'bg-gradient-to-r from-red-600 to-pink-600' : formData.role === 'staff' ? 'bg-gradient-to-r from-green-600 to-emerald-600' : 'bg-gradient-to-r from-blue-600 to-indigo-600'}`}>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/20">
                  <UserPlus className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-white">
                    {pageTitle}
                  </h2>
                  <p className="text-xs text-white/90">
                    {pageDescription}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 p-3">
              {/* Basic Information Section */}
              <div className="border-b border-gray-200 pb-2.5">
                <h3 className="mb-2 text-sm font-semibold text-gray-900">{t('doctors.new.sectionBasic')}</h3>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div>
                    <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
                      {t('doctors.new.fullName')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t('doctors.new.phFullName')}
                      className="w-full rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
                      {t('doctors.new.emailAddress')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder={t('doctors.new.phEmail')}
                      className="w-full rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">{t('doctors.new.emailLoginHint')}</p>
                  </div>

                  <div>
                    <label htmlFor="phone" className="mb-1 block text-sm font-medium text-gray-700">
                      {t('doctors.new.phoneNumber')}
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="tel"
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder={t('doctors.new.phPhone')}
                        className="w-full rounded-md border border-gray-300 py-1.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="dateOfBirth" className="mb-1 block text-sm font-medium text-gray-700">
                      {t('doctors.new.dateOfBirth')}
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="date"
                        id="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                        className="w-full rounded-md border border-gray-300 py-1.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="gender" className="mb-1 block text-sm font-medium text-gray-700">
                      {t('doctors.new.gender')}
                    </label>
                    <select
                      id="gender"
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                      className="w-full rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{t('doctors.new.genderSelect')}</option>
                      <option value="male">{t('doctors.new.genderMale')}</option>
                      <option value="female">{t('doctors.new.genderFemale')}</option>
                      <option value="other">{t('doctors.new.genderOther')}</option>
                      <option value="prefer-not-to-say">{t('doctors.new.genderPreferNot')}</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="address" className="mb-1 block text-sm font-medium text-gray-700">
                      {t('doctors.new.address')}
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder={t('doctors.new.phAddress')}
                        className="w-full rounded-md border border-gray-300 py-1.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Professional Information Section - Only for doctors */}
              {(formData.role === 'doctor' || formData.role === 'staff') && (
                <div className="border-b border-gray-200 pb-2.5">
                  <h3 className="mb-2 text-sm font-semibold text-gray-900">{t('doctors.new.sectionProfessional')}</h3>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <div>
                      <label htmlFor="specialization" className="mb-1 block text-sm font-medium text-gray-700">
                        {t('doctors.new.specialization')}
                      </label>
                      <div className="relative">
                        <GraduationCap className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          id="specialization"
                          value={formData.specialization}
                          onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                          placeholder={t('doctors.new.phSpecialization')}
                          className="w-full rounded-md border border-gray-300 py-1.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="department" className="mb-1 block text-sm font-medium text-gray-700">
                        {t('doctors.new.department')}
                      </label>
                      <div className="relative">
                        <Building className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          id="department"
                          value={formData.department}
                          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                          placeholder={t('doctors.new.phDepartment')}
                          className="w-full rounded-md border border-gray-300 py-1.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="licenseNumber" className="mb-1 block text-sm font-medium text-gray-700">
                        {t('doctors.new.licenseNumber')}
                      </label>
                      <div className="relative">
                        <FileText className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          id="licenseNumber"
                          value={formData.licenseNumber}
                          onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                          placeholder={t('doctors.new.phLicense')}
                          className="w-full rounded-md border border-gray-300 py-1.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="yearsOfExperience" className="mb-1 block text-sm font-medium text-gray-700">
                        {t('doctors.new.yearsOfExperience')}
                      </label>
                      <input
                        type="number"
                        id="yearsOfExperience"
                        min="0"
                        max="50"
                        value={formData.yearsOfExperience}
                        onChange={(e) => setFormData({ ...formData, yearsOfExperience: e.target.value })}
                        placeholder={t('doctors.new.phYearsExperience')}
                        className="w-full rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label htmlFor="qualifications" className="mb-1 block text-sm font-medium text-gray-700">
                        {t('doctors.new.qualifications')}
                      </label>
                      <div className="mb-2 flex gap-2">
                        <div className="relative flex-1">
                          <Award className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={newQualification}
                            onChange={(e) => setNewQualification(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (newQualification.trim()) {
                                  setFormData({
                                    ...formData,
                                    qualifications: [...formData.qualifications, newQualification.trim()]
                                  });
                                  setNewQualification('');
                                }
                              }
                            }}
                            placeholder={t('doctors.new.phQualification')}
                            className="w-full rounded-md border border-gray-300 py-1.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (newQualification.trim()) {
                              setFormData({
                                ...formData,
                                qualifications: [...formData.qualifications, newQualification.trim()]
                              });
                              setNewQualification('');
                            }
                          }}
                          className="rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200"
                        >
                          {t('doctors.new.addQualification')}
                        </button>
                      </div>
                      {formData.qualifications.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {formData.qualifications.map((qual, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs text-blue-800"
                            >
                              {qual}
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    qualifications: formData.qualifications.filter((_, i) => i !== index)
                                  });
                                }}
                                className="ml-2 text-blue-600 hover:text-blue-800"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label htmlFor="languages" className="mb-1 block text-sm font-medium text-gray-700">
                        Languages spoken
                      </label>
                      <div className="mb-2 flex gap-2">
                        <div className="relative flex-1">
                          <Languages className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={newLanguage}
                            onChange={(e) => setNewLanguage(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (newLanguage.trim()) {
                                  setFormData({
                                    ...formData,
                                    languages: [...formData.languages, newLanguage.trim()]
                                  });
                                  setNewLanguage('');
                                }
                              }
                            }}
                            placeholder="English, Twi, Ga..."
                            className="w-full rounded-md border border-gray-300 py-1.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (newLanguage.trim()) {
                              setFormData({
                                ...formData,
                                languages: [...formData.languages, newLanguage.trim()]
                              });
                              setNewLanguage('');
                            }
                          }}
                          className="rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200"
                        >
                          Add
                        </button>
                      </div>
                      {formData.languages.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {formData.languages.map((language, index) => (
                            <span
                              key={`${language}-${index}`}
                              className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs text-emerald-800"
                            >
                              {language}
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    languages: formData.languages.filter((_, i) => i !== index)
                                  });
                                }}
                                className="ml-2 text-emerald-600 hover:text-emerald-800"
                              >
                                x
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {formData.role === 'doctor' && (
                      <div className="grid gap-2 md:col-span-2 md:grid-cols-2">
                        <label htmlFor="rating" className="mb-1 block text-sm font-medium text-gray-700">
                          Doctor rating
                          <div className="relative mt-1">
                            <Star className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                              type="number"
                              id="rating"
                              min="0"
                              max="5"
                              step="0.1"
                              value={formData.rating}
                              onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                              placeholder="4.8"
                              className="w-full rounded-md border border-gray-300 py-1.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </label>
                        <label htmlFor="ratingCount" className="mb-1 block text-sm font-medium text-gray-700">
                          Rating count
                          <input
                            type="number"
                            id="ratingCount"
                            min="0"
                            value={formData.ratingCount}
                            onChange={(e) => setFormData({ ...formData, ratingCount: e.target.value })}
                            placeholder="12"
                            className="mt-1 w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                          />
                        </label>
                      </div>
                    )}

                    <div className="md:col-span-2">
                      <label htmlFor="bio" className="mb-1 block text-sm font-medium text-gray-700">
                        {t('doctors.new.biography')}
                      </label>
                      <textarea
                        id="bio"
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        placeholder={t('doctors.new.phBio')}
                        rows={3}
                        className="w-full rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Account Information Section */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-900">{t('doctors.new.sectionAccount')}</h3>
                <div className="space-y-2">
                  <div>
                    <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
                      Temporary password
                    </label>
                    <input
                      type="password"
                      id="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Leave blank to generate and email one"
                      minLength={6}
                      className="w-full rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      The login email will include this temporary password, or an auto-generated one if left blank.
                    </p>
                  </div>

                  {/* Role is automatically set based on the page, no need to show it */}
                  <input type="hidden" value={formData.role} />
                  <div className="rounded-md border border-gray-200 bg-gray-50 p-2">
                    <p className="text-xs text-gray-700">
                      <span className="font-medium">{t('doctors.new.roleLabel')}</span>{' '}
                      <span>{roleDisplayName}</span>
                      {' — '}
                      {roleDescription}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                <Link
                  href={listHref}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                >
                  {t('doctors.new.cancel')}
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{submitLabel}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}

export default function NewDoctorPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<NewDoctorSuspenseFallback />}>
        <NewDoctorForm />
      </Suspense>
    </ProtectedRoute>
  );
}
