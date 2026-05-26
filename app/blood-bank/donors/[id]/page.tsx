'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../../../protected-route';
import SidebarLayout from '../../../components/sidebar-layout';
import { useTranslations } from '../../../hooks/useTranslations';
import { 
  User, 
  ArrowLeft, 
  Phone,
  Mail,
  MapPin,
  Calendar,
  Droplets,
  Heart,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface IBloodDonor {
  _id: string;
  donorId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
  weight: number;
  height?: number;
  hemoglobin?: number;
  bloodPressure?: {
    systolic: number;
    diastolic: number;
  };
  hasChronicDisease: boolean;
  chronicDiseases?: string[];
  hasTattoo: boolean;
  hasRecentSurgery: boolean;
  isOnMedication: boolean;
  currentMedications?: string[];
  hasAllergies: boolean;
  allergies?: string[];
  totalDonations: number;
  lastDonationDate?: string;
  nextEligibleDate?: string;
  donations: {
    donationDate: string;
    unitNumber: string;
    volume: number;
    component: string;
    location: string;
    notes?: string;
  }[];
  status: string;
  deferralReason?: string;
  deferralEndDate?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  consentGiven: boolean;
  consentDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function DonorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, translationsLoaded } = useTranslations();
  const router = useRouter();
  const [donor, setDonor] = useState<IBloodDonor | null>(null);
  const [loading, setLoading] = useState(true);
  const [donating, setDonating] = useState(false);
  const [showDonateModal, setShowDonateModal] = useState(false);

  useEffect(() => {
    fetchDonor();
  }, [id]);

  const fetchDonor = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/blood-bank/donors/${id}`);
      if (!response.ok) throw new Error('Failed to fetch donor');
      const data = await response.json();
      setDonor(data);
    } catch (error) {
      console.error('Error fetching donor:', error);
      toast.error(t('bloodBank.fetchError') || 'Failed to fetch donor details');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordDonation = async (donationData: any) => {
    try {
      setDonating(true);
      const response = await fetch(`/api/blood-bank/donors/${id}/donate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(donationData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to record donation');
      }

      toast.success('Donation recorded successfully');
      setShowDonateModal(false);
      fetchDonor();
    } catch (error: any) {
      console.error('Error recording donation:', error);
      toast.error(error.message || 'Failed to record donation');
    } finally {
      setDonating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'deferred': return 'bg-yellow-100 text-yellow-800';
      case 'permanently-deferred': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getBloodGroupColor = (group: string) => {
    const colors: Record<string, string> = {
      'A+': 'bg-red-100 text-red-700',
      'A-': 'bg-red-50 text-red-600',
      'B+': 'bg-blue-100 text-blue-700',
      'B-': 'bg-blue-50 text-blue-600',
      'AB+': 'bg-purple-100 text-purple-700',
      'AB-': 'bg-purple-50 text-purple-600',
      'O+': 'bg-green-100 text-green-700',
      'O-': 'bg-green-50 text-green-600',
    };
    return colors[group] || 'bg-gray-100 text-gray-700';
  };

  const isEligible = (donor: IBloodDonor) => {
    if (donor.status !== 'active') return false;
    if (!donor.nextEligibleDate) return true;
    return new Date(donor.nextEligibleDate) <= new Date();
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString();
  const formatDateTime = (dateStr: string) => new Date(dateStr).toLocaleString();

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('bloodBank.donors') || 'Blood Donors'} dense>
          <div className="flex h-48 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-red-600" />
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <SidebarLayout title={t('bloodBank.donorDetails') || 'Blood Donor'} dense>
          <div className="flex h-48 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-red-600" />
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  if (!donor) {
    return (
      <ProtectedRoute>
        <SidebarLayout title="Donor Not Found" description="" dense>
          <div className="text-center py-12">
            <p className="text-gray-600">Donor not found</p>
            <Link href="/blood-bank/donors" className="text-red-600 hover:text-red-700 mt-4 inline-block">
              Back to Donors
            </Link>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout 
        title={`${donor.firstName} ${donor.lastName}`} 
        description={t('bloodBank.donorDetails') || 'Blood Donor Details'} dense>
        <div className="max-w-4xl mx-auto">
          <Link
            href="/blood-bank/donors"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            {t('common.back') || 'Back to Donors'}
          </Link>

          {/* Header Card */}
          <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm mb-4">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-red-100">
                  <span className="text-base font-bold text-red-600">
                    {donor.firstName.charAt(0)}{donor.lastName.charAt(0)}
                  </span>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">{donor.firstName} {donor.lastName}</h2>
                  <p className="text-xs text-gray-600">{donor.donorId}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`rounded-md px-2.5 py-1 text-sm font-bold ${getBloodGroupColor(donor.bloodGroup)}`}>
                  {donor.bloodGroup}
                </span>
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium uppercase ${getStatusColor(donor.status)}`}>
                  {donor.status}
                </span>
              </div>
            </div>

            {/* Eligibility & Action */}
            <div className="mt-3 flex flex-col justify-between gap-2 border-t border-gray-100 pt-3 sm:flex-row sm:items-center">
              <div className="flex items-center text-sm">
                {isEligible(donor) ? (
                  <>
                    <CheckCircle className="mr-1.5 h-4 w-4 text-green-500" />
                    <span className="text-xs font-medium text-green-600">Eligible to Donate</span>
                  </>
                ) : donor.status !== 'active' ? (
                  <>
                    <XCircle className="mr-1.5 h-4 w-4 text-red-500" />
                    <span className="text-xs font-medium text-red-600">{donor.status}</span>
                  </>
                ) : (
                  <>
                    <Clock className="mr-1.5 h-4 w-4 text-yellow-500" />
                    <span className="text-xs font-medium text-yellow-600">
                      Eligible from: {donor.nextEligibleDate ? formatDate(donor.nextEligibleDate) : 'N/A'}
                    </span>
                  </>
                )}
              </div>
              {isEligible(donor) && (
                <button
                  type="button"
                  onClick={() => setShowDonateModal(true)}
                  className="inline-flex h-9 items-center rounded-md bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700"
                >
                  <Droplets className="mr-1.5 h-4 w-4" />
                  Record Donation
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Personal Information */}
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-900">
                <User className="mr-1.5 h-4 w-4 text-gray-500" />
                Personal Information
              </h3>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Date of Birth</dt>
                  <dd className="font-medium">{formatDate(donor.dateOfBirth)} ({calculateAge(donor.dateOfBirth)} years)</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Gender</dt>
                  <dd className="font-medium capitalize">{donor.gender}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Weight</dt>
                  <dd className="font-medium">{donor.weight} kg</dd>
                </div>
                {donor.height && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Height</dt>
                    <dd className="font-medium">{donor.height} cm</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Contact Information */}
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-900">
                <Phone className="mr-1.5 h-4 w-4 text-blue-500" />
                Contact Information
              </h3>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Phone</dt>
                  <dd className="font-medium">{donor.phone}</dd>
                </div>
                {donor.alternatePhone && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Alternate Phone</dt>
                    <dd className="font-medium">{donor.alternatePhone}</dd>
                  </div>
                )}
                {donor.email && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Email</dt>
                    <dd className="font-medium">{donor.email}</dd>
                  </div>
                )}
                {donor.address && (donor.address.city || donor.address.state) && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Address</dt>
                    <dd className="font-medium text-right">
                      {[donor.address.street, donor.address.city, donor.address.state].filter(Boolean).join(', ')}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Donation History */}
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-900">
                <Heart className="mr-1.5 h-4 w-4 text-red-500" />
                Donation Summary
              </h3>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Total Donations</dt>
                  <dd className="font-bold text-2xl text-red-600">{donor.totalDonations}</dd>
                </div>
                {donor.lastDonationDate && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Last Donation</dt>
                    <dd className="font-medium">{formatDate(donor.lastDonationDate)}</dd>
                  </div>
                )}
                {donor.nextEligibleDate && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Next Eligible Date</dt>
                    <dd className={`font-medium ${new Date(donor.nextEligibleDate) <= new Date() ? 'text-green-600' : 'text-yellow-600'}`}>
                      {formatDate(donor.nextEligibleDate)}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Health Information */}
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Health Screening</h3>
              <div className="space-y-2">
                {[
                  { label: 'Chronic Disease', value: donor.hasChronicDisease, details: donor.chronicDiseases },
                  { label: 'Tattoo', value: donor.hasTattoo },
                  { label: 'Recent Surgery', value: donor.hasRecentSurgery },
                  { label: 'On Medication', value: donor.isOnMedication, details: donor.currentMedications },
                  { label: 'Allergies', value: donor.hasAllergies, details: donor.allergies },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-gray-600">{item.label}</span>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded text-sm ${item.value ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                        {item.value ? 'Yes' : 'No'}
                      </span>
                      {item.value && item.details && item.details.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">{item.details.join(', ')}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Donation History List */}
          {donor.donations && donor.donations.length > 0 && (
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm mt-6">
              <h3 className="mb-3 text-sm font-semibold text-gray-900">Donation History</h3>
              <div className="space-y-2">
                {donor.donations.slice().reverse().map((donation, index) => (
                  <div key={index} className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50/80 p-2.5">
                    <div>
                      <p className="font-medium">{donation.unitNumber}</p>
                      <p className="text-sm text-gray-500">
                        {donation.component} • {donation.volume} mL • {donation.location}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatDate(donation.donationDate)}</p>
                      {donation.notes && (
                        <p className="text-xs text-gray-500">{donation.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Emergency Contact */}
          {donor.emergencyContact && (
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm mt-6">
              <h3 className="mb-2 text-sm font-semibold text-gray-900">Emergency Contact</h3>
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-gray-500">Name</dt>
                  <dd className="font-medium">{donor.emergencyContact.name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Relationship</dt>
                  <dd className="font-medium">{donor.emergencyContact.relationship}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Phone</dt>
                  <dd className="font-medium">{donor.emergencyContact.phone}</dd>
                </div>
              </dl>
            </div>
          )}

          {/* Notes */}
          {donor.notes && (
            <div className="mt-4 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <h3 className="mb-1.5 text-sm font-semibold text-gray-900">Notes</h3>
              <p className="text-sm text-gray-600">{donor.notes}</p>
            </div>
          )}
        </div>

        {/* Donation Modal */}
        {showDonateModal && (
          <DonationModal
            onClose={() => setShowDonateModal(false)}
            onSubmit={handleRecordDonation}
            loading={donating}
          />
        )}
      </SidebarLayout>
    </ProtectedRoute>
  );
}

function DonationModal({ onClose, onSubmit, loading }: { onClose: () => void; onSubmit: (data: any) => void; loading: boolean }) {
  const [formData, setFormData] = useState({
    component: 'whole-blood',
    volume: 450,
    storageLocation: 'Main Blood Bank',
    bagNumber: '',
    notes: '',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border border-gray-100 bg-white p-4 shadow-xl">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Record Donation</h3>

        <div className="space-y-2.5">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Component</label>
            <select
              value={formData.component}
              onChange={(e) => setFormData(prev => ({ ...prev, component: e.target.value }))}
              className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="whole-blood">Whole Blood</option>
              <option value="packed-rbc">Packed RBC</option>
              <option value="platelets">Platelets</option>
              <option value="plasma">Plasma</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Volume (mL)</label>
            <input
              type="number"
              value={formData.volume}
              onChange={(e) => setFormData(prev => ({ ...prev, volume: parseInt(e.target.value) }))}
              className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Bag Number</label>
            <input
              type="text"
              value={formData.bagNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, bagNumber: e.target.value }))}
              placeholder="Optional - will be auto-generated"
              className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Storage Location</label>
            <input
              type="text"
              value={formData.storageLocation}
              onChange={(e) => setFormData(prev => ({ ...prev, storageLocation: e.target.value }))}
              className="h-9 w-full rounded-md border border-gray-200 px-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
              className="w-full rounded-md border border-gray-200 px-2.5 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-md border border-gray-200 bg-gray-50 px-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit(formData)}
            disabled={loading}
            className="inline-flex h-9 items-center rounded-md bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading && <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            Record Donation
          </button>
        </div>
      </div>
    </div>
  );
}
