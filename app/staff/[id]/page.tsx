'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
  ArrowLeft,
  Pencil,
  Phone,
  Mail,
  Calendar,
  MapPin,
  User,
  UserCheck,
  Building,
  GraduationCap,
  FileText,
  Award,
  Trash2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import ProtectedRoute from '../../protected-route';
import SidebarLayout from '../../components/sidebar-layout';

interface StaffMember {
  _id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: string;
  specialization?: string;
  department?: string;
  licenseNumber?: string;
  licenseCertificate?: { fileName?: string; fileType?: string; data?: string; uploadedAt?: string };
  approvalStatus?: string;
  licenseVerification?: { status?: string; method?: string; message?: string; checkedAt?: string };
  rejectionReason?: string;
  qualifications?: string[];
  yearsOfExperience?: number;
  bio?: string;
  createdAt?: string;
  updatedAt?: string;
}

function StaffDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      router.push('/dashboard');
      return;
    }
    fetchStaffDetails();
  }, [isAdmin, router, params.id]);

  const fetchStaffDetails = async () => {
    try {
      const response = await fetch(`/api/staff?id=${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setStaff(data);
      } else {
        setError('Staff member not found');
      }
    } catch (error) {
      console.error('Error fetching staff details:', error);
      setError('Failed to fetch staff details');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!staff) return;
    
    if (!confirm(`Are you sure you want to delete ${staff.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/staff?id=${staff._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Staff member deleted successfully!');
        router.push('/staff');
      } else {
        const errorData = await response.json();
        alert(`Failed to delete: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting staff:', error);
      alert('Error deleting staff member');
    }
  };

  const handleApproval = async (action: 'approve' | 'reject' | 'auto-verify') => {
    if (!staff) return;
    const reason = action === 'reject' ? prompt('Reason for rejection') || '' : '';
    const res = await fetch(`/api/users/${staff._id}/approval`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason }),
    });
    if (res.ok) {
      fetchStaffDetails();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to update approval status');
    }
  };

  const approvalBadgeClass = (status?: string) => {
    if (!status || status === 'approved') return 'bg-green-50 text-green-700 ring-green-200';
    if (status === 'rejected') return 'bg-red-50 text-red-700 ring-red-200';
    return 'bg-amber-50 text-amber-800 ring-amber-200';
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <SidebarLayout title="Loading..." description="Please wait..." dense>
          <div className="flex min-h-[280px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-b-2 border-blue-600" />
              <p className="mt-3 text-sm text-gray-600">Loading staff details...</p>
            </div>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  if (error || !staff) {
    return (
      <ProtectedRoute>
        <SidebarLayout title="Error" description="Unable to load staff details" dense>
          <div className="mx-auto max-w-4xl">
            <div className="mb-2">
              <Link
                href="/staff"
                className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Staff</span>
              </Link>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
              <p className="text-sm text-red-800">{error || 'Staff member not found'}</p>
            </div>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout title="Staff Details" description="View staff member information" dense>
        <div className="mx-auto max-w-4xl space-y-3">
          <div className="mb-2">
            <Link
              href="/staff"
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Staff</span>
            </Link>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-3 py-3 sm:px-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/20">
                    <UserCheck className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{staff.name}</h2>
                    <p className="text-xs capitalize text-white/90">{staff.role}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Link
                    href={`/staff/${staff._id}/edit`}
                    className="inline-flex items-center gap-1 rounded-md border border-white/30 bg-white/15 px-2.5 py-1 text-xs font-medium text-white hover:bg-white/25 sm:text-sm"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleApproval('auto-verify')}
                    className="inline-flex items-center gap-1 rounded-md border border-white/30 bg-white/15 px-2.5 py-1 text-xs font-medium text-white hover:bg-white/25 sm:text-sm"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>Auto-check</span>
                  </button>
                  {staff.approvalStatus !== 'approved' && (
                    <button
                      type="button"
                      onClick={() => handleApproval('approve')}
                      className="inline-flex items-center gap-1 rounded-md bg-green-500/90 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-500 sm:text-sm"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>Approve</span>
                    </button>
                  )}
                  {staff.approvalStatus !== 'rejected' && (
                    <button
                      type="button"
                      onClick={() => handleApproval('reject')}
                      className="inline-flex items-center gap-1 rounded-md bg-red-500/90 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-500 sm:text-sm"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      <span>Reject</span>
                    </button>
                  )}
                  {staff.email !== session?.user?.email && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="inline-flex items-center gap-1 rounded-md bg-red-500/90 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-500 sm:text-sm"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3 p-3">
              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                  <User className="h-4 w-4 text-gray-500" />
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div className="flex items-center gap-2 rounded-md border border-gray-100 bg-gray-50 p-2">
                    <Mail className="h-4 w-4 shrink-0 text-gray-400" />
                    <div className="min-w-0">
                      <p className="text-[11px] text-gray-500">Email</p>
                      <p className="truncate text-xs font-medium text-gray-900 sm:text-sm">{staff.email}</p>
                    </div>
                  </div>
                  {staff.phone && (
                    <div className="flex items-center gap-2 rounded-md border border-gray-100 bg-gray-50 p-2">
                      <Phone className="h-4 w-4 shrink-0 text-gray-400" />
                      <div className="min-w-0">
                        <p className="text-[11px] text-gray-500">Phone</p>
                        <p className="text-xs font-medium text-gray-900 sm:text-sm">{staff.phone}</p>
                      </div>
                    </div>
                  )}
                  {staff.address && (
                    <div className="flex items-start gap-2 rounded-md border border-gray-100 bg-gray-50 p-2 md:col-span-2">
                      <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
                      <div className="min-w-0">
                        <p className="text-[11px] text-gray-500">Address</p>
                        <p className="text-xs font-medium text-gray-900 sm:text-sm">{staff.address}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {(staff.dateOfBirth || staff.gender) && (
                <div className="border-t border-gray-100 pt-3">
                  <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {staff.dateOfBirth && (
                      <div className="flex items-center gap-2 rounded-md border border-gray-100 bg-gray-50 p-2">
                        <Calendar className="h-4 w-4 shrink-0 text-gray-400" />
                        <div>
                          <p className="text-[11px] text-gray-500">Date of Birth</p>
                          <p className="text-xs font-medium text-gray-900 sm:text-sm">
                            {new Date(staff.dateOfBirth).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    )}
                    {staff.gender && (
                      <div className="flex items-center gap-2 rounded-md border border-gray-100 bg-gray-50 p-2">
                        <User className="h-4 w-4 shrink-0 text-gray-400" />
                        <div>
                          <p className="text-[11px] text-gray-500">Gender</p>
                          <p className="text-xs font-medium capitalize text-gray-900 sm:text-sm">{staff.gender}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(staff.specialization ||
                staff.department ||
                staff.licenseNumber ||
                staff.licenseCertificate ||
                staff.approvalStatus ||
                staff.yearsOfExperience) && (
                <div className="border-t border-gray-100 pt-3">
                  <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                    <Building className="h-4 w-4 text-gray-500" />
                    Professional Information
                  </h3>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {staff.specialization && (
                      <div className="flex items-center gap-2 rounded-md border border-gray-100 bg-gray-50 p-2">
                        <GraduationCap className="h-4 w-4 shrink-0 text-gray-400" />
                        <div className="min-w-0">
                          <p className="text-[11px] text-gray-500">Specialization</p>
                          <p className="text-xs font-medium text-gray-900 sm:text-sm">{staff.specialization}</p>
                        </div>
                      </div>
                    )}
                    {staff.department && (
                      <div className="flex items-center gap-2 rounded-md border border-gray-100 bg-gray-50 p-2">
                        <Building className="h-4 w-4 shrink-0 text-gray-400" />
                        <div className="min-w-0">
                          <p className="text-[11px] text-gray-500">Department</p>
                          <p className="text-xs font-medium text-gray-900 sm:text-sm">{staff.department}</p>
                        </div>
                      </div>
                    )}
                    {staff.licenseNumber && (
                      <div className="flex items-center gap-2 rounded-md border border-gray-100 bg-gray-50 p-2">
                        <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                        <div className="min-w-0">
                          <p className="text-[11px] text-gray-500">License Number</p>
                          <p className="text-xs font-medium text-gray-900 sm:text-sm">{staff.licenseNumber}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 rounded-md border border-gray-100 bg-gray-50 p-2">
                      <CheckCircle className="h-4 w-4 shrink-0 text-gray-400" />
                      <div className="min-w-0">
                        <p className="text-[11px] text-gray-500">Approval</p>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ${approvalBadgeClass(staff.approvalStatus)}`}>
                          {(staff.approvalStatus || 'approved').replace(/_/g, ' ')}
                        </span>
                        {staff.licenseVerification?.message && (
                          <p className="mt-1 text-xs text-gray-600">{staff.licenseVerification.message}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-md border border-gray-100 bg-gray-50 p-2">
                      <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                      <div className="min-w-0">
                        <p className="text-[11px] text-gray-500">License Certificate</p>
                        {staff.licenseCertificate?.data ? (
                          <a
                            href={staff.licenseCertificate.data}
                            target="_blank"
                            rel="noreferrer"
                            className="truncate text-xs font-medium text-blue-700 hover:underline sm:text-sm"
                          >
                            {staff.licenseCertificate.fileName || 'View certificate'}
                          </a>
                        ) : (
                          <p className="text-xs text-gray-500">Not uploaded</p>
                        )}
                      </div>
                    </div>
                    {staff.yearsOfExperience !== undefined && (
                      <div className="flex items-center gap-2 rounded-md border border-gray-100 bg-gray-50 p-2">
                        <Award className="h-4 w-4 shrink-0 text-gray-400" />
                        <div>
                          <p className="text-[11px] text-gray-500">Years of Experience</p>
                          <p className="text-xs font-medium text-gray-900 sm:text-sm">
                            {staff.yearsOfExperience} years
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {staff.qualifications && staff.qualifications.length > 0 && (
                <div className="border-t border-gray-100 pt-3">
                  <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                    <Award className="h-4 w-4 text-gray-500" />
                    Qualifications
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {staff.qualifications.map((qual, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
                      >
                        {qual}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {staff.bio && (
                <div className="border-t border-gray-100 pt-3">
                  <h3 className="mb-1.5 text-sm font-semibold text-gray-900">Biography</h3>
                  <p className="whitespace-pre-wrap text-xs text-gray-700 sm:text-sm">{staff.bio}</p>
                </div>
              )}

              <div className="border-t border-gray-100 pt-3">
                <h3 className="mb-2 text-sm font-semibold text-gray-900">Account Information</h3>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {staff.createdAt && (
                    <div className="flex items-center gap-2 rounded-md border border-gray-100 bg-gray-50 p-2">
                      <Calendar className="h-4 w-4 shrink-0 text-gray-400" />
                      <div className="min-w-0">
                        <p className="text-[11px] text-gray-500">Created At</p>
                        <p className="text-xs font-medium text-gray-900 sm:text-sm">
                          {new Date(staff.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                  {staff.updatedAt && (
                    <div className="flex items-center gap-2 rounded-md border border-gray-100 bg-gray-50 p-2">
                      <Calendar className="h-4 w-4 shrink-0 text-gray-400" />
                      <div className="min-w-0">
                        <p className="text-[11px] text-gray-500">Last Updated</p>
                        <p className="text-xs font-medium text-gray-900 sm:text-sm">
                          {new Date(staff.updatedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}

export default function StaffDetailsPage() {
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
        <StaffDetailsContent />
      </Suspense>
    </ProtectedRoute>
  );
}
