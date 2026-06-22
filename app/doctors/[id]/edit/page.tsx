'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
  ArrowLeft,
  Save,
  Phone,
  GraduationCap,
  Building,
  FileText,
  Award,
  Calendar,
  MapPin,
  User,
  AlertCircle,
  Languages,
  Star
} from 'lucide-react';
import ProtectedRoute from '../../../protected-route';
import SidebarLayout from '../../../components/sidebar-layout';

function EditDoctorForm() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newQualification, setNewQualification] = useState('');
  const [newLanguage, setNewLanguage] = useState('');

  const SCHEDULE_DAYS = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ] as const;
  const [slotForm, setSlotForm] = useState({
    slotDurationMinutes: 30,
    websiteBookingEnabled: true,
    start: '09:00',
    end: '17:00',
    days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as string[],
  });
  const [scheduleLoaded, setScheduleLoaded] = useState(false);
  const [scheduleMsg, setScheduleMsg] = useState<string | null>(null);
  const [savingSchedule, setSavingSchedule] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'doctor' as 'doctor' | 'admin' | 'staff',
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

  // Check if user is admin
  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      router.push('/doctors');
      return;
    }
    fetchDoctor();
  }, [isAdmin, router, params.id]);

  useEffect(() => {
    if (!isAdmin) return;
    const id = typeof params.id === 'string' ? params.id : params.id?.[0];
    if (!id) return;
    fetch(`/api/doctors/${id}/schedule`)
      .then((r) => r.json())
      .then((data) => {
        const eff = data.effective;
        if (eff?.workingHours) {
          setSlotForm({
            slotDurationMinutes: eff.slotDurationMinutes ?? 30,
            websiteBookingEnabled: eff.websiteBookingEnabled !== false,
            start: eff.workingHours.start || '09:00',
            end: eff.workingHours.end || '17:00',
            days:
              Array.isArray(eff.workingHours.days) && eff.workingHours.days.length
                ? [...eff.workingHours.days]
                : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          });
        }
        setScheduleLoaded(true);
      })
      .catch(() => setScheduleLoaded(true));
  }, [isAdmin, params.id]);

  const saveDoctorSchedule = async () => {
    const id = typeof params.id === 'string' ? params.id : params.id?.[0];
    if (!id) return;
    setSavingSchedule(true);
    setScheduleMsg(null);
    try {
      const res = await fetch(`/api/doctors/${id}/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotDurationMinutes: slotForm.slotDurationMinutes,
          websiteBookingEnabled: slotForm.websiteBookingEnabled,
          workingHours: {
            start: slotForm.start,
            end: slotForm.end,
            days: slotForm.days,
          },
        }),
      });
      if (!res.ok) throw new Error();
      setScheduleMsg('Schedule saved');
    } catch {
      setScheduleMsg('Failed to save schedule');
    } finally {
      setSavingSchedule(false);
    }
  };

  const fetchDoctor = async () => {
    try {
      const response = await fetch(`/api/doctors?id=${params.id}`);
      if (response.ok) {
        const doctor = await response.json();
        setFormData({
          name: doctor.name || '',
          email: doctor.email || '',
          password: '',
          role: doctor.role || 'doctor',
          phone: doctor.phone || '',
          specialization: doctor.specialization || '',
          department: doctor.department || '',
          licenseNumber: doctor.licenseNumber || '',
          qualifications: doctor.qualifications || [],
          languages: doctor.languages || [],
          yearsOfExperience: doctor.yearsOfExperience?.toString() || '',
          rating: doctor.rating?.toString() || '',
          ratingCount: doctor.ratingCount?.toString() || '',
          bio: doctor.bio || '',
          address: doctor.address || '',
          dateOfBirth: doctor.dateOfBirth ? new Date(doctor.dateOfBirth).toISOString().split('T')[0] : '',
          gender: doctor.gender || ''
        });
      } else {
        setError('Doctor not found');
      }
    } catch (error) {
      console.error('Error fetching doctor:', error);
      setError('Failed to fetch doctor data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/doctors?id=${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push('/doctors');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update doctor');
      }
    } catch (error) {
      console.error('Error updating doctor:', error);
      setError('Error updating doctor. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <SidebarLayout title="Loading..." description="Please wait..." dense>
          <div className="flex min-h-[280px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-b-2 border-blue-600" />
              <p className="mt-3 text-sm text-gray-600">Loading doctor data...</p>
            </div>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout
        title="Edit Doctor"
        description="Update doctor information"
        dense
      >
        <div className="mx-auto max-w-4xl">
          {/* Back Button */}
          <div className="mb-2">
            <Link
              href="/doctors"
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Doctors</span>
            </Link>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-2 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Form Card */}
          <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/20">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Edit Doctor</h2>
                  <p className="text-xs text-white/90">Update doctor information and details</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 p-3">
              {/* Basic Information Section */}
              <div className="border-b border-gray-200 pb-2.5">
                <h3 className="mb-2 text-sm font-semibold text-gray-900">Basic Information</h3>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div>
                    <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter full name"
                      className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="doctor@example.com"
                      className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">This will be used for login</p>
                  </div>

                  <div>
                    <label htmlFor="phone" className="mb-1 block text-sm font-medium text-gray-700">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="tel"
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+1-555-0123"
                        className="w-full rounded-md border border-gray-300 py-1.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="dateOfBirth" className="mb-1 block text-sm font-medium text-gray-700">
                      Date of Birth
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
                      Gender
                    </label>
                    <select
                      id="gender"
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                      className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer-not-to-say">Prefer not to say</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="address" className="mb-1 block text-sm font-medium text-gray-700">
                      Address
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Street address, City, State"
                        className="w-full rounded-md border border-gray-300 py-1.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Professional Information Section - Only for doctors/staff */}
              {(formData.role === 'doctor' || formData.role === 'staff') && (
                <div className="border-b border-gray-200 pb-2.5">
                  <h3 className="mb-2 text-sm font-semibold text-gray-900">Professional Information</h3>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <div>
                      <label htmlFor="specialization" className="mb-1 block text-sm font-medium text-gray-700">
                        Specialization
                      </label>
                      <div className="relative">
                        <GraduationCap className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          id="specialization"
                          value={formData.specialization}
                          onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                          placeholder="e.g., Cardiology, Pediatrics, Surgery"
                          className="w-full rounded-md border border-gray-300 py-1.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="department" className="mb-1 block text-sm font-medium text-gray-700">
                        Department
                      </label>
                      <div className="relative">
                        <Building className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          id="department"
                          value={formData.department}
                          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                          placeholder="e.g., Emergency, ICU, Outpatient"
                          className="w-full rounded-md border border-gray-300 py-1.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="licenseNumber" className="mb-1 block text-sm font-medium text-gray-700">
                        License Number
                      </label>
                      <div className="relative">
                        <FileText className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          id="licenseNumber"
                          value={formData.licenseNumber}
                          onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                          placeholder="Medical license number"
                          className="w-full rounded-md border border-gray-300 py-1.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="yearsOfExperience" className="mb-1 block text-sm font-medium text-gray-700">
                        Years of Experience
                      </label>
                      <input
                        type="number"
                        id="yearsOfExperience"
                        min="0"
                        max="50"
                        value={formData.yearsOfExperience}
                        onChange={(e) => setFormData({ ...formData, yearsOfExperience: e.target.value })}
                        placeholder="0"
                        className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label htmlFor="qualifications" className="mb-1 block text-sm font-medium text-gray-700">
                        Qualifications
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
                            placeholder="e.g., MD, MBBS, PhD (Press Enter to add)"
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
                          Add
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
                            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                          />
                        </label>
                      </div>
                    )}

                    <div className="md:col-span-2">
                      <label htmlFor="bio" className="mb-1 block text-sm font-medium text-gray-700">
                        Biography
                      </label>
                      <textarea
                        id="bio"
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        placeholder="Brief professional biography..."
                        rows={3}
                        className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Appointment slots (admin) */}
              {formData.role === 'doctor' && scheduleLoaded && (
                <div className="rounded-lg border border-gray-100 bg-slate-50/80 p-2.5">
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 shrink-0 text-blue-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Appointment slots & online booking</h3>
                  </div>
                  <p className="mb-2 text-xs text-gray-600">
                    Defines time increments and which days appear on the public booking page and in the staff slot
                    view. Defaults match organisation working hours until you save custom values here.
                  </p>
                  <div className="mb-2 grid gap-2 md:grid-cols-2">
                    <div>
                      <label className="mb-0.5 block text-xs font-medium text-gray-700 sm:text-sm">Slot length (minutes)</label>
                      <input
                        type="number"
                        min={5}
                        max={180}
                        step={5}
                        value={slotForm.slotDurationMinutes}
                        onChange={(e) =>
                          setSlotForm((s) => ({
                            ...s,
                            slotDurationMinutes: parseInt(e.target.value, 10) || 30,
                          }))
                        }
                        className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm"
                      />
                    </div>
                    <label className="inline-flex items-center gap-2 text-xs text-gray-800 sm:text-sm md:col-span-2">
                      <input
                        type="checkbox"
                        checked={slotForm.websiteBookingEnabled}
                        onChange={(e) =>
                          setSlotForm((s) => ({ ...s, websiteBookingEnabled: e.target.checked }))
                        }
                        className="rounded border-gray-300"
                      />
                      Allow public website booking for this doctor
                    </label>
                    <div>
                      <label className="mb-0.5 block text-xs font-medium text-gray-700 sm:text-sm">Day start</label>
                      <input
                        type="time"
                        value={slotForm.start}
                        onChange={(e) => setSlotForm((s) => ({ ...s, start: e.target.value }))}
                        className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-xs font-medium text-gray-700 sm:text-sm">Day end</label>
                      <input
                        type="time"
                        value={slotForm.end}
                        onChange={(e) => setSlotForm((s) => ({ ...s, end: e.target.value }))}
                        className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                  <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-600 sm:text-xs">Working days</p>
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {SCHEDULE_DAYS.map((d) => (
                      <label key={d} className="inline-flex items-center gap-1.5 text-sm text-gray-700 capitalize">
                        <input
                          type="checkbox"
                          checked={slotForm.days.includes(d)}
                          onChange={() =>
                            setSlotForm((s) => ({
                              ...s,
                              days: s.days.includes(d) ? s.days.filter((x) => x !== d) : [...s.days, d],
                            }))
                          }
                          className="rounded border-gray-300"
                        />
                        {d.slice(0, 3)}
                      </label>
                    ))}
                  </div>
                  {scheduleMsg ? (
                    <p className={`mb-2 text-xs sm:text-sm ${scheduleMsg.includes('Failed') ? 'text-red-600' : 'text-green-700'}`}>
                      {scheduleMsg}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={saveDoctorSchedule}
                    disabled={savingSchedule}
                    className="rounded-md bg-gray-800 px-3 py-1.5 text-sm text-white hover:bg-gray-900 disabled:opacity-50"
                  >
                    {savingSchedule ? 'Saving…' : 'Save schedule'}
                  </button>
                </div>
              )}

              {/* Account Information Section */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-900">Account Information</h3>
                <div className="space-y-2">
                  <div>
                    <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
                      New Password (leave blank to keep current)
                    </label>
                    <input
                      type="password"
                      id="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Enter new password (min. 6 characters)"
                      minLength={6}
                      className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">Leave blank to keep current password</p>
                  </div>

                  {/* Role is read-only when editing */}
                  <div>
                    <label htmlFor="role" className="mb-1 block text-sm font-medium text-gray-700">
                      Role
                    </label>
                    <div className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-1.5 text-sm text-gray-600">
                      <span className="capitalize">{formData.role}</span>
                      <input
                        type="hidden"
                        id="role"
                        name="role"
                        value={formData.role}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Role cannot be changed after creation</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                <Link
                  href="/doctors"
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'Updating...' : 'Update Doctor'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}

export default function EditDoctorPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={
        <SidebarLayout title="Loading..." description="Please wait..." dense>
          <div className="flex min-h-[280px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-b-2 border-blue-600" />
              <p className="mt-3 text-sm text-gray-600">Loading...</p>
            </div>
          </div>
        </SidebarLayout>
      }>
        <EditDoctorForm />
      </Suspense>
    </ProtectedRoute>
  );
}
