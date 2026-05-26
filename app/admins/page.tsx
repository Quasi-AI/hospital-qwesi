'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  Shield, 
  Plus, 
  Search, 
  MoreVertical,
  UserPlus
} from 'lucide-react';
import ProtectedRoute from '../protected-route';
import SidebarLayout from '../components/sidebar-layout';
import { useTranslations } from '../hooks/useTranslations';

export default function AdminsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { t } = useTranslations();
  const [searchTerm, setSearchTerm] = useState('');
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null);
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Check if user is admin
  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      router.push('/dashboard');
      return;
    }
    fetchAdmins();
  }, [isAdmin, router]);

  const fetchAdmins = async () => {
    try {
      const response = await fetch('/api/doctors');
      if (response.ok) {
        const data = await response.json();
        // Filter only admin users
        setAdmins(data.filter((user: any) => user.role === 'admin'));
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAdmins = admins.filter(admin => {
    const matchesSearch = admin.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         admin.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleDeleteAdmin = async (adminId: string, adminName: string) => {
    if (!confirm(`Are you sure you want to delete ${adminName}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/doctors?id=${adminId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Admin deleted successfully!');
        fetchAdmins();
      } else {
        const errorData = await response.json();
        alert(`Failed to delete: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting admin:', error);
      alert('Error deleting admin');
    }
  };

  const toggleActionsMenu = (adminId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setShowActionsMenu(showActionsMenu === adminId ? null : adminId);
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
      <SidebarLayout 
        title="Administrators" 
        description="Manage administrator accounts" dense>
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {filteredAdmins.length} {filteredAdmins.length === 1 ? 'administrator' : 'administrators'}
            </span>
          </div>
          <Link
            href="/doctors/new?role=admin"
            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Administrator</span>
          </Link>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search administrators by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Admins List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading...</p>
              </div>
            ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Administrator
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAdmins.map((admin) => (
                  <tr key={admin._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                          <Shield className="h-5 w-5 text-red-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{admin.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{admin.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {admin.email !== session?.user?.email && (
                        <div className="relative">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleActionsMenu(admin._id, e);
                            }}
                            className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          
                          {showActionsMenu === admin._id && (
                            <div 
                              data-menu-id={admin._id}
                              className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="py-1">
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setShowActionsMenu(null);
                                    handleDeleteAdmin(admin._id, admin.name);
                                  }}
                                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        </div>

        {/* Empty State */}
        {filteredAdmins.length === 0 && !loading && (
          <div className="text-center py-12">
            <Shield className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No administrators found</h3>
            <p className="mt-1 text-sm text-gray-700">
              {searchTerm 
                ? 'Try adjusting your search'
                : 'Get started by adding a new administrator'
              }
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <Link
                  href="/doctors/new?role=admin"
                  className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Administrator</span>
                </Link>
              </div>
            )}
          </div>
        )}
      </SidebarLayout>
    </ProtectedRoute>
  );
}
