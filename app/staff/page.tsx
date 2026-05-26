'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Plus,
  Search,
  MoreVertical,
  UserCheck,
  Eye,
  Pencil,
} from 'lucide-react';
import ProtectedRoute from '../protected-route';
import SidebarLayout from '../components/sidebar-layout';
import { useTranslations } from '../hooks/useTranslations';

export default function StaffPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { t } = useTranslations();
  const [searchTerm, setSearchTerm] = useState('');
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      router.push('/dashboard');
      return;
    }
    fetchStaff();
  }, [isAdmin, router]);

  const fetchStaff = async () => {
    try {
      const response = await fetch('/api/staff');
      if (response.ok) {
        const data = await response.json();
        setStaff(data);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStaff = staff.filter((staffMember) => {
    const matchesSearch =
      staffMember.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staffMember.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleDeleteStaff = async (staffId: string, staffName: string) => {
    if (!confirm(t('staff.confirmDelete', { name: staffName }))) {
      return;
    }

    try {
      const response = await fetch(`/api/staff?id=${staffId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert(t('staff.deletedSuccess'));
        fetchStaff();
      } else {
        const errorData = await response.json();
        alert(
          t('staff.deleteFailed', {
            error: errorData.error || t('staff.unknownDeleteError'),
          })
        );
      }
    } catch (error) {
      console.error('Error deleting staff:', error);
      alert(t('staff.deleteError'));
    }
  };

  const toggleActionsMenu = (staffId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setShowActionsMenu(showActionsMenu === staffId ? null : staffId);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const menuElements = document.querySelectorAll('[data-menu-id]');
      let clickedInsideMenu = false;

      menuElements.forEach((menu) => {
        if (menu.contains(target)) {
          clickedInsideMenu = true;
        }
      });

      if (!clickedInsideMenu) {
        setShowActionsMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showActionsMenu]);

  if (!isAdmin) {
    return null;
  }

  return (
    <ProtectedRoute>
      <SidebarLayout title={t('staff.title')} description={t('staff.description')} dense>
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="relative min-w-[200px] max-w-md flex-1">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  placeholder={t('staff.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 w-full rounded-md border border-gray-300 py-0 pl-9 pr-3 text-sm focus:ring-2 focus:ring-blue-500"
                  autoComplete="off"
                />
              </div>
              <div className="flex h-9 items-center gap-1.5 text-xs text-gray-500 sm:text-sm">
                <span className="rounded-full bg-gray-100 px-2 py-1">
                  {filteredStaff.length}{' '}
                  {filteredStaff.length === 1 ? t('staff.staffMember') : t('staff.staffMembers')}
                </span>
              </div>
            </div>
            <Link
              href="/doctors/new?role=staff"
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              <span>{t('staff.addStaffMember')}</span>
            </Link>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex h-40 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
                </div>
              ) : filteredStaff.length === 0 ? (
                <div className="p-6 text-center">
                  <UserCheck className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                  <h3 className="mb-1 text-sm font-semibold text-gray-900">{t('staff.noStaff')}</h3>
                  <p className="mb-2 text-xs text-gray-500">
                    {searchTerm ? t('staff.trySearch') : t('staff.getStartedAdd')}
                  </p>
                  {!searchTerm && (
                    <Link
                      href="/doctors/new?role=staff"
                      className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4" />
                      <span>{t('staff.addStaffMember')}</span>
                    </Link>
                  )}
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-700 lg:px-4">
                        {t('staff.staffMemberColumn')}
                      </th>
                      <th className="hidden px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-700 sm:table-cell lg:px-4">
                        {t('staff.email')}
                      </th>
                      <th className="hidden px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-wide text-gray-700 md:table-cell lg:px-4">
                        {t('staff.created')}
                      </th>
                      <th className="px-3 py-1.5 text-right text-[11px] font-medium uppercase tracking-wide text-gray-700 lg:px-4">
                        {t('staff.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredStaff.map((staffMember) => (
                      <tr
                        key={staffMember._id}
                        role="button"
                        tabIndex={0}
                        onClick={() => router.push(`/staff/${staffMember._id}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            router.push(`/staff/${staffMember._id}`);
                          }
                        }}
                        className="cursor-pointer hover:bg-green-50/50"
                      >
                        <td className="px-3 py-2 lg:px-4">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100">
                              <UserCheck className="h-4 w-4 text-green-600" />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-xs font-medium text-gray-900 sm:text-sm">
                                {staffMember.name}
                              </div>
                              <div className="truncate text-xs text-gray-500 sm:hidden">{staffMember.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="hidden whitespace-nowrap px-3 py-2 sm:table-cell lg:px-4">
                          <div className="truncate text-xs text-gray-900 sm:text-sm">{staffMember.email}</div>
                        </td>
                        <td className="hidden whitespace-nowrap px-3 py-2 text-xs text-gray-900 md:table-cell lg:px-4">
                          {staffMember.createdAt
                            ? new Date(staffMember.createdAt).toLocaleDateString()
                            : t('staff.notAvailable')}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-xs sm:text-sm lg:px-4">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Link
                              href={`/staff/${staffMember._id}`}
                              className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-800 shadow-sm hover:bg-gray-50"
                            >
                              <Eye className="h-4 w-4 text-green-600" />
                              <span className="hidden sm:inline">{t('staff.details')}</span>
                            </Link>
                            <Link
                              href={`/staff/${staffMember._id}/edit`}
                              className="rounded-md px-1.5 py-1 text-xs font-medium text-green-600 hover:bg-green-50 hover:underline"
                            >
                              {t('staff.edit')}
                            </Link>
                            {staffMember.email !== session?.user?.email && (
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleActionsMenu(staffMember._id, e);
                                  }}
                                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                  aria-label={t('staff.actions')}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </button>

                                {showActionsMenu === staffMember._id && (
                                  <div
                                    data-menu-id={staffMember._id}
                                    className="absolute right-0 z-50 mt-1 w-44 rounded-md border border-gray-200 bg-white py-0.5 shadow-lg"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setShowActionsMenu(null);
                                        handleDeleteStaff(staffMember._id, staffMember.name);
                                      }}
                                      className="block w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50"
                                    >
                                      {t('staff.delete')}
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
