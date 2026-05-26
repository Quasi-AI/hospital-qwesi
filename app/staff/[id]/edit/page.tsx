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
  UserCheck
} from 'lucide-react';
import ProtectedRoute from '../../../protected-route';
import SidebarLayout from '../../../components/sidebar-layout';

function EditStaffForm() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newQualification, setNewQualification] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff' as 'doctor' | 'admin' | 'staff',
    phone: '',
    specialization: '',
    department: '',
    licenseNumber: '',
    qualifications: [] as string[],
    yearsOfExperience: '',
    bio: '',
    address: '',
    dateOfBirth: '',
    gender: '' as 'male' | 'female' | 'other' | 'prefer-not-to-say' | ''
  });

  // Check if user is admin
  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      router.push('/staff');
      return;
    }
    fetchStaff();
  }, [isAdmin, router, params.id]);

  const fetchStaff = async () => {
    try {
      const response = await fetch(`/api/staff?id=${params.id}`);
      if (response.ok) {
        const staff = await response.json();
        setFormData({
          name: staff.name || '',
          email: staff.email || '',
          password: '',
          role: staff.role || 'staff',
          phone: staff.phone || '',
          specialization: staff.specialization || '',
          department: staff.department || '',
          licenseNumber: staff.licenseNumber || '',
          qualifications: staff.qualifications || [],
          yearsOfExperience: staff.yearsOfExperience?.toString() || '',
          bio: staff.bio || '',
          address: staff.address || '',
          dateOfBirth: staff.dateOfBirth ? new Date(staff.dateOfBirth).toISOString().split('T')[0] : '',
          gender: staff.gender || ''
        });
      } else {
        setError('Staff member not found');
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
      setError('Failed to fetch staff data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/staff?id=${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push('/staff');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update staff member');
      }
    } catch (error) {
      console.error('Error updating staff:', error);
      setError('Error updating staff member. Please try again.');
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
              <p className="mt-3 text-sm text-gray-600">Loading staff data...</p>
            </div>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout title="Edit Staff Member" description="Update staff member information" dense>
        <div className="mx-auto max-w-4xl">
          <div className="mb-2">
            <Link
              href="/staff"
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 transition-colors hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Staff</span>
            </Link>
          </div>

          {error && (
            <div className="mb-2 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/20">
                  <UserCheck className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Edit Staff Member</h2>
                  <p className="text-xs text-white/90">Update staff member information and details</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 p-3">
              <div className="border-b border-gray-200 pb-2.5">
                <h3 className="mb-2 text-sm font-semibold text-gray-900">Basic Information</h3>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div>
                    <label htmlFor="name" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter full name"
                      className="w-full rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="staff@example.com"
                      className="w-full rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">This will be used for login</p>
                  </div>

                  <div>
                    <label htmlFor="phone" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
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
                        className="w-full rounded-md border border-gray-300 py-1.5 pl-9 pr-2.5 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="dateOfBirth" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                      Date of Birth
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="date"
                        id="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                        className="w-full rounded-md border border-gray-300 py-1.5 pl-9 pr-2.5 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="gender" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                      Gender
                    </label>
                    <select
                      id="gender"
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                      className="w-full rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer-not-to-say">Prefer not to say</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="address" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
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
                        className="w-full rounded-md border border-gray-300 py-1.5 pl-9 pr-2.5 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Professional Information Section */}
              <div className="border-b border-gray-200 pb-2.5">
                <h3 className="mb-2 text-sm font-semibold text-gray-900">Professional Information</h3>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div>
                    <label htmlFor="specialization" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                      Specialization
                    </label>
                    <div className="relative">
                      <GraduationCap className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        id="specialization"
                        value={formData.specialization}
                        onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                        placeholder="e.g., Reception, Administration"
                        className="w-full rounded-md border border-gray-300 py-1.5 pl-9 pr-2.5 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="department" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                      Department
                    </label>
                    <div className="relative">
                      <Building className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        id="department"
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        placeholder="e.g., Front Desk, Billing, Records"
                        className="w-full rounded-md border border-gray-300 py-1.5 pl-9 pr-2.5 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="licenseNumber" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                      Employee ID / License Number
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        id="licenseNumber"
                        value={formData.licenseNumber}
                        onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                        placeholder="Employee ID or license number"
                        className="w-full rounded-md border border-gray-300 py-1.5 pl-9 pr-2.5 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="yearsOfExperience" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
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
                      className="w-full rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="qualifications" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                      Qualifications / Certifications
                    </label>
                    <div className="mb-1.5 flex gap-2">
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
                          placeholder="e.g., CPR Certified, HIPAA Training (Press Enter to add)"
                          className="w-full rounded-md border border-gray-300 py-1.5 pl-9 pr-2.5 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500"
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
                        className="rounded-md bg-gray-100 px-2.5 py-1 text-sm text-gray-700 hover:bg-gray-200"
                      >
                        Add
                      </button>
                    </div>
                    {formData.qualifications.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {formData.qualifications.map((qual, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800"
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
                              className="ml-2 text-green-600 hover:text-green-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="bio" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                      Biography / Notes
                    </label>
                    <textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      placeholder="Brief biography or notes about this staff member..."
                      rows={3}
                      className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
              </div>

              {/* Account Information Section */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-900">Account Information</h3>
                <div className="space-y-2">
                  <div>
                    <label htmlFor="password" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                      New Password (leave blank to keep current)
                    </label>
                    <input
                      type="password"
                      id="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Enter new password (min. 6 characters)"
                      minLength={6}
                      className="w-full rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">Leave blank to keep current password</p>
                  </div>

                  {/* Role is read-only when editing */}
                  <div>
                    <label htmlFor="role" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                      Role
                    </label>
                    <div className="w-full rounded-md border border-gray-300 bg-gray-50 px-2.5 py-1 text-sm text-gray-600">
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
                  href="/staff"
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'Updating...' : 'Update Staff Member'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}

export default function EditStaffPage() {
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
        <EditStaffForm />
      </Suspense>
    </ProtectedRoute>
  );
}
