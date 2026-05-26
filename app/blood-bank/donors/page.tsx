'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProtectedRoute from '../../protected-route';
import SidebarLayout from '../../components/sidebar-layout';
import { useTranslations } from '../../hooks/useTranslations';
import { 
  Users,
  Plus,
  Search,
  Eye,
  Phone,
  Mail,
  Droplets,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

interface IBloodDonor {
  _id: string;
  donorId: string;
  firstName: string;
  lastName: string;
  bloodGroup: string;
  phone: string;
  email?: string;
  gender: string;
  dateOfBirth: string;
  status: string;
  totalDonations: number;
  lastDonationDate?: string;
  nextEligibleDate?: string;
}

export default function BloodDonorsPage() {
  const { t, translationsLoaded } = useTranslations();
  const [donors, setDonors] = useState<IBloodDonor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [bloodGroupFilter, setBloodGroupFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [eligibleOnly, setEligibleOnly] = useState(false);

  useEffect(() => {
    fetchDonors();
  }, [bloodGroupFilter, statusFilter, eligibleOnly]);

  const fetchDonors = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (bloodGroupFilter !== 'all') params.append('bloodGroup', bloodGroupFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (eligibleOnly) params.append('eligibleOnly', 'true');
      
      const response = await fetch(`/api/blood-bank/donors?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch donors');
      const data = await response.json();
      setDonors(data);
    } catch (error) {
      console.error('Error fetching donors:', error);
      toast.error(t('bloodBank.fetchError') || 'Failed to fetch donors');
    } finally {
      setLoading(false);
    }
  };

  const filteredDonors = donors.filter(donor => {
    const fullName = `${donor.firstName} ${donor.lastName}`.toLowerCase();
    const matchesSearch = 
      fullName.includes(searchTerm.toLowerCase()) ||
      donor.donorId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      donor.phone.includes(searchTerm);
    return matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'deferred':
        return 'bg-yellow-100 text-yellow-800';
      case 'permanently-deferred':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  // Stats
  const totalDonors = donors.length;
  const activeDonors = donors.filter(d => d.status === 'active').length;
  const eligibleDonors = donors.filter(d => isEligible(d)).length;

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

  return (
    <ProtectedRoute>
      <SidebarLayout 
        title={t('bloodBank.donors') || 'Blood Donors'} 
        description={t('bloodBank.donorsDescription') || 'Manage blood donor information'} dense>
        {/* Stats Cards */}
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-blue-200 bg-blue-50/80 p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-blue-600">{t('bloodBank.totalDonors') || 'Total Donors'}</p>
                <p className="text-lg font-semibold tabular-nums text-blue-700">{totalDonors}</p>
              </div>
              <Users className="h-8 w-8 shrink-0 text-blue-500" />
            </div>
          </div>
          <div className="rounded-lg border border-green-200 bg-green-50/80 p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-green-600">{t('bloodBank.activeDonors') || 'Active Donors'}</p>
                <p className="text-lg font-semibold tabular-nums text-green-700">{activeDonors}</p>
              </div>
              <CheckCircle className="h-8 w-8 shrink-0 text-green-500" />
            </div>
          </div>
          <div className="rounded-lg border border-purple-200 bg-purple-50/80 p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-purple-600">{t('bloodBank.eligibleNow') || 'Eligible to Donate'}</p>
                <p className="text-lg font-semibold tabular-nums text-purple-700">{eligibleDonors}</p>
              </div>
              <Droplets className="h-8 w-8 shrink-0 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
          <div className="flex flex-col items-stretch justify-between gap-3 md:flex-row md:items-center">
            <div className="relative w-full flex-1 md:max-w-md">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t('bloodBank.searchDonors') || 'Search by name, ID, phone...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 w-full rounded-md border border-gray-200 py-1.5 pl-9 pr-3 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={eligibleOnly}
                  onChange={(e) => setEligibleOnly(e.target.checked)}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span>{t('bloodBank.eligibleOnly') || 'Eligible Only'}</span>
              </label>

              <select
                value={bloodGroupFilter}
                onChange={(e) => setBloodGroupFilter(e.target.value)}
                className="h-9 rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="all">{t('bloodBank.allGroups') || 'All Blood Groups'}</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(group => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-gray-200 bg-white px-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="all">{t('bloodBank.allStatuses') || 'All Statuses'}</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="deferred">Deferred</option>
              </select>

              <Link
                href="/blood-bank/donors/new"
                className="inline-flex h-9 items-center rounded-md bg-red-600 px-3 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                {t('bloodBank.addDonor') || 'Add Donor'}
              </Link>
            </div>
          </div>
        </div>

        {/* Donors List */}
        <div>
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-red-600" />
            </div>
          ) : filteredDonors.length === 0 ? (
            <div className="rounded-lg border border-gray-100 bg-white py-10 text-center shadow-sm">
              <Users className="mx-auto h-9 w-9 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">
                {t('bloodBank.noDonors') || 'No donors found'}
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                {t('bloodBank.noDonorsDesc') || 'Register a new donor to get started.'}
              </p>
              <div className="mt-4">
                <Link
                  href="/blood-bank/donors/new"
                  className="inline-flex h-9 items-center rounded-md bg-red-600 px-3 text-sm font-medium text-white transition-colors hover:bg-red-700"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  {t('bloodBank.addDonor') || 'Add Donor'}
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-gray-500">
                        {t('bloodBank.donor') || 'Donor'}
                      </th>
                      <th className="px-4 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-gray-500">
                        {t('bloodBank.bloodGroup') || 'Blood Group'}
                      </th>
                      <th className="px-4 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-gray-500">
                        {t('bloodBank.contact') || 'Contact'}
                      </th>
                      <th className="px-4 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-gray-500">
                        {t('bloodBank.donations') || 'Donations'}
                      </th>
                      <th className="px-4 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-gray-500">
                        {t('bloodBank.eligibility') || 'Eligibility'}
                      </th>
                      <th className="px-4 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-gray-500">
                        {t('bloodBank.status') || 'Status'}
                      </th>
                      <th className="px-4 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-gray-500">
                        {t('common.actions') || 'Actions'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredDonors.map((donor) => (
                      <tr key={donor._id} className="hover:bg-gray-50/80">
                        <td className="whitespace-nowrap px-4 py-2.5">
                          <div className="flex items-center">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-red-100">
                              <span className="text-xs font-medium text-red-600">
                                {donor.firstName.charAt(0)}{donor.lastName.charAt(0)}
                              </span>
                            </div>
                            <div className="ml-3 min-w-0">
                              <p className="text-sm font-medium text-gray-900">
                                {donor.firstName} {donor.lastName}
                              </p>
                              <p className="text-xs text-gray-500">{donor.donorId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5">
                          <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-bold ${getBloodGroupColor(donor.bloodGroup)}`}>
                            {donor.bloodGroup}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5">
                          <div className="text-sm">
                            <p className="flex items-center text-gray-900">
                              <Phone className="mr-1 h-3 w-3" />
                              {donor.phone}
                            </p>
                            {donor.email && (
                              <p className="flex items-center text-xs text-gray-500">
                                <Mail className="mr-1 h-3 w-3" />
                                {donor.email}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5">
                          <div className="text-sm">
                            <p className="font-medium text-gray-900">{donor.totalDonations} total</p>
                            {donor.lastDonationDate && (
                              <p className="text-xs text-gray-500">
                                Last: {formatDate(donor.lastDonationDate)}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5">
                          {isEligible(donor) ? (
                            <div className="flex items-center text-green-600">
                              <CheckCircle className="mr-1 h-4 w-4" />
                              <span className="text-xs">{t('bloodBank.eligible') || 'Eligible'}</span>
                            </div>
                          ) : donor.status !== 'active' ? (
                            <div className="flex items-center text-red-600">
                              <XCircle className="mr-1 h-4 w-4" />
                              <span className="text-xs">{donor.status}</span>
                            </div>
                          ) : (
                            <div className="flex items-center text-yellow-600">
                              <Clock className="mr-1 h-4 w-4" />
                              <span className="text-xs">
                                {donor.nextEligibleDate ? formatDate(donor.nextEligibleDate) : 'N/A'}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5">
                          <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-medium ${getStatusColor(donor.status)}`}>
                            {donor.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right text-sm font-medium">
                          <Link
                            href={`/blood-bank/donors/${donor._id}`}
                            className="inline-flex items-center text-blue-600 hover:text-blue-900"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
