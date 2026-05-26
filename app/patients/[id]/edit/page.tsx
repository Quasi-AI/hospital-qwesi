'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Save, 
  Users, 
  Phone, 
  Mail, 
  Calendar,
  MapPin,
  Heart,
  User,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import ProtectedRoute from '../../../protected-route';
import SidebarLayout from '../../../components/sidebar-layout';

export default function PatientEditPage() {
  const params = useParams();
  const router = useRouter();
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    bloodType: '',
    assignedDoctor: '',
    medicalHistory: '',
    emergencyContact: {
      name: '',
      relationship: '',
      phone: ''
    }
  });

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const response = await fetch(`/api/patients/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setPatient(data);
          const mh = data.medicalHistory;
          const medicalHistoryStr = Array.isArray(mh)
            ? mh.join('\n')
            : typeof mh === 'string'
              ? mh
              : '';
          setFormData({
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            dateOfBirth: data.dateOfBirth ? data.dateOfBirth.split('T')[0] : '',
            gender: data.gender || '',
            address: data.address || '',
            bloodType: data.bloodType || '',
            assignedDoctor: data.assignedDoctor || '',
            medicalHistory: medicalHistoryStr,
            emergencyContact: {
              name: data.emergencyContact?.name || '',
              relationship: data.emergencyContact?.relationship || '',
              phone: data.emergencyContact?.phone || ''
            }
          });
        } else {
          setError('Patient not found');
        }
      } catch (error) {
        console.error('Error fetching patient:', error);
        setError('Failed to fetch patient data');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchPatient();
    }
  }, [params.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/patients/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSuccess('Patient updated successfully!');
        setTimeout(() => {
          router.push(`/patients/${params.id}`);
        }, 1500);
      } else {
        const errorData = (await response.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
          details?: string | string[];
        };
        const detailStr = errorData.details
          ? Array.isArray(errorData.details)
            ? errorData.details.join(' ')
            : String(errorData.details)
          : '';
        setError(
          [errorData.error || errorData.message || 'Failed to update patient', detailStr]
            .filter(Boolean)
            .join(': ')
        );
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Error updating patient:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <SidebarLayout 
          title="Edit Patient" 
          description="Modify patient information"
          dense
        >
          <div className="flex min-h-[280px] items-center justify-center">
            <div className="h-9 w-9 animate-spin rounded-full border-b-2 border-blue-600" />
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  if (error && !patient) {
    return (
      <ProtectedRoute>
        <SidebarLayout 
          title="Patient Not Found" 
          description="The requested patient could not be found"
          dense
        >
          <div className="py-8 text-center">
            <Users className="mx-auto h-10 w-10 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Patient not found</h3>
            <p className="mt-1 text-xs text-gray-700 sm:text-sm">
              The patient you're looking for doesn't exist or has been removed.
            </p>
            <div className="mt-4">
              <Link
                href="/patients"
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-700"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Patients</span>
              </Link>
            </div>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout 
        title="Edit Patient" 
        description="Modify patient information"
        dense
      >
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-2">
            <Link 
              href={`/patients/${params.id}`}
              className="mb-1 inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Patient Details
            </Link>
            <h1 className="text-lg font-bold text-gray-900">Edit Patient: {patient?.name}</h1>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-2 rounded-md border border-red-200 bg-red-50 p-2.5">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-2 rounded-md border border-green-200 bg-green-50 p-2.5">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                <span className="text-sm text-green-700">{success}</span>
              </div>
            </div>
          )}

          {/* Edit Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Personal Information */}
            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold text-gray-900">Personal Information</h3>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-3">
                <div>
                  <label htmlFor="name" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="phone" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="dateOfBirth" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    id="dateOfBirth"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="gender" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    Gender *
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
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
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="bloodType" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    Blood Type
                  </label>
                  <select
                    id="bloodType"
                    name="bloodType"
                    value={formData.bloodType}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select blood type</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold text-gray-900">Emergency Contact</h3>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-3">
                <div>
                  <label htmlFor="emergencyContact.name" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    id="emergencyContact.name"
                    name="emergencyContact.name"
                    value={formData.emergencyContact.name}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="emergencyContact.relationship" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    Relationship
                  </label>
                  <input
                    type="text"
                    id="emergencyContact.relationship"
                    name="emergencyContact.relationship"
                    value={formData.emergencyContact.relationship}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="emergencyContact.phone" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    id="emergencyContact.phone"
                    name="emergencyContact.phone"
                    value={formData.emergencyContact.phone}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold text-gray-900">Additional Information</h3>
              <div className="space-y-2">
                <div>
                  <label htmlFor="assignedDoctor" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    Assigned Doctor
                  </label>
                  <input
                    type="text"
                    id="assignedDoctor"
                    name="assignedDoctor"
                    value={formData.assignedDoctor}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Dr. Smith"
                  />
                </div>
                
                <div>
                  <label htmlFor="medicalHistory" className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">
                    Medical History
                  </label>
                  <textarea
                    id="medicalHistory"
                    name="medicalHistory"
                    value={formData.medicalHistory}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter any relevant medical history..."
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-2 pt-1">
              <Link
                href={`/patients/${params.id}`}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
