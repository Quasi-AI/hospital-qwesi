'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Save, 
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import ProtectedRoute from '../../../protected-route';
import SidebarLayout from '../../../components/sidebar-layout';

export default function ReportEditPage() {
  const params = useParams();
  const router = useRouter();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    reportType: '',
    findings: '',
    diagnosis: '',
    recommendations: '',
    status: '',
    priority: '',
    notes: '',
    doctorName: '',
    department: ''
  });

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await fetch(`/api/reports/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setReport(data);
          setFormData({
            reportType: data.reportType || '',
            findings: data.findings || '',
            diagnosis: data.diagnosis || '',
            recommendations: data.recommendations || '',
            status: data.status || '',
            priority: data.priority || '',
            notes: data.notes || '',
            doctorName: data.doctorName || '',
            department: data.department || 'General Medicine'
          });
        } else {
          setError('Report not found');
        }
      } catch (error) {
        console.error('Error fetching report:', error);
        setError('Failed to fetch report data');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchReport();
    }
  }, [params.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/reports/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSuccess('Report updated successfully!');
        setTimeout(() => {
          router.push(`/reports/${params.id}`);
        }, 1500);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to update report');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Error updating report:', err);
    } finally {
      setSaving(false);
    }
  };

  const reportTypes = [
    { label: 'Laboratory', value: 'lab' },
    { label: 'Radiology', value: 'imaging' },
    { label: 'Cardiology', value: 'diagnostic' },
    { label: 'Pathology', value: 'diagnostic' },
    { label: 'Neurology', value: 'diagnostic' },
    { label: 'Orthopedics', value: 'diagnostic' },
    { label: 'General Medicine', value: 'diagnostic' },
    { label: 'Surgery', value: 'treatment' },
    { label: 'Emergency', value: 'treatment' },
    { label: 'Follow-up', value: 'follow-up' }
  ];

  const departments = [
    'General Medicine',
    'Cardiology',
    'Radiology',
    'Laboratory',
    'Pathology',
    'Neurology',
    'Orthopedics',
    'Surgery',
    'Emergency',
    'Pediatrics',
    'Gynecology',
    'Other'
  ];

  if (loading) {
    return (
      <ProtectedRoute>
        <SidebarLayout
          title="Edit Report"
          description="Edit medical report information" dense>
          <div className="flex h-48 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-blue-600" />
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  if (error || !report) {
    return (
      <ProtectedRoute>
        <SidebarLayout
          title="Report Not Found"
          description="The requested report could not be found" dense>
          <div className="py-8 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-red-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Report not found</h3>
            <p className="mt-1 text-xs text-gray-600">
              {error || 'The report you are looking for does not exist or has been removed.'}
            </p>
            <div className="mt-4">
              <Link
                href="/reports"
                className="inline-flex h-9 items-center rounded-md border border-transparent bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Back to Reports
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
        title="Edit Report"
        description="Edit medical report information" dense>
        <div className="mx-auto max-w-4xl space-y-3">
          {/* Header */}
          <div>
            <Link
              href={`/reports/${params.id}`}
              className="mb-2 inline-flex items-center text-xs text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Back to Report Details
            </Link>
            <h1 className="text-lg font-semibold text-gray-900">Edit Report</h1>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <span className="text-xs text-red-700">{error}</span>
              </div>
            </div>
          )}

          {success && (
            <div className="rounded-md border border-green-200 bg-green-50 p-3">
              <div className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                <span className="text-xs text-green-700">{success}</span>
              </div>
            </div>
          )}

          {/* Edit Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Report Information */}
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-gray-900">Report Information</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="reportType" className="mb-1 block text-xs font-medium text-gray-700">
                    Report Type *
                  </label>
                  <select
                    id="reportType"
                    name="reportType"
                    value={formData.reportType}
                    onChange={handleInputChange}
                    required
                    className="h-9 w-full rounded-md border border-gray-300 px-3 py-0 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select report type</option>
                    {reportTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="status" className="mb-1 block text-xs font-medium text-gray-700">
                    Status *
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    required
                    className="h-9 w-full rounded-md border border-gray-300 px-3 py-0 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select status</option>
                    <option value="pending">Pending</option>
                    <option value="in progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="priority" className="mb-1 block text-xs font-medium text-gray-700">
                    Priority
                  </label>
                  <select
                    id="priority"
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="h-9 w-full rounded-md border border-gray-300 px-3 py-0 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select priority</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="department" className="mb-1 block text-xs font-medium text-gray-700">
                    Department
                  </label>
                  <select
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    className="h-9 w-full rounded-md border border-gray-300 px-3 py-0 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select department</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Medical Information */}
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-gray-900">Medical Information</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="findings" className="mb-1 block text-xs font-medium text-gray-700">
                    Findings *
                  </label>
                  <textarea
                    id="findings"
                    name="findings"
                    value={formData.findings}
                    onChange={handleInputChange}
                    required
                    rows={4}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter the findings of the examination or test..."
                  />
                </div>

                <div>
                  <label htmlFor="diagnosis" className="mb-1 block text-xs font-medium text-gray-700">
                    Diagnosis
                  </label>
                  <textarea
                    id="diagnosis"
                    name="diagnosis"
                    value={formData.diagnosis}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter the diagnosis..."
                  />
                </div>

                <div>
                  <label htmlFor="recommendations" className="mb-1 block text-xs font-medium text-gray-700">
                    Recommendations
                  </label>
                  <textarea
                    id="recommendations"
                    name="recommendations"
                    value={formData.recommendations}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter treatment recommendations..."
                  />
                </div>

                <div>
                  <label htmlFor="notes" className="mb-1 block text-xs font-medium text-gray-700">
                    Additional Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    placeholder="Any additional notes or comments..."
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-2">
              <Link
                href={`/reports/${params.id}`}
                className="inline-flex h-9 items-center rounded-md border border-gray-300 px-4 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-9 items-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-b-2 border-white" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-1.5 h-3.5 w-3.5" />
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
