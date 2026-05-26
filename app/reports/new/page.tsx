'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  FileText, 
  ArrowLeft, 
  Save, 
  User,
  Stethoscope,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import ProtectedRoute from '../../protected-route';
import SidebarLayout from '../../components/sidebar-layout';

export default function NewReportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-48 items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      }
    >
      <NewReportPageContent />
    </Suspense>
  );
}

function NewReportPageContent() {
  const searchParams = useSearchParams();
  const patientIdFromUrl = searchParams.get('patientId');
  const [formData, setFormData] = useState({
    // Patient Information
    patientId: '',
    patientName: '',
    
    // Report Details
    reportType: '',
    findings: '',
    diagnosis: '',
    recommendations: '',
    status: 'pending',
    priority: 'medium',
    
    // Additional Information
    notes: '',
    attachments: [] as File[],
    
    // Doctor Information
    doctorName: '',
    department: ''
  });

  const [activeSection, setActiveSection] = useState('patient');
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await fetch('/api/patients');
        if (response.ok) {
          const data = await response.json();
          setPatients(data);
        }
      } catch (error) {
        console.error('Error fetching patients:', error);
        setError('Failed to fetch patients');
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  useEffect(() => {
    if (!patientIdFromUrl || !patients.length) return;
    const selected = patients.find((p) => p._id === patientIdFromUrl);
    if (!selected) return;
    setFormData((prev) => ({
      ...prev,
      patientId: selected._id,
      patientName: selected.name,
    }));
  }, [patientIdFromUrl, patients]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handlePatientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const patientId = e.target.value;
    const selectedPatient = patients.find(p => p._id === patientId);
    
    setFormData(prev => ({
      ...prev,
      patientId,
      patientName: selectedPatient ? selectedPatient.name : ''
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...files]
      }));
    }
  };

  const removeAttachment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    // Basic validation
    if (!formData.patientId || !formData.reportType || !formData.findings) {
      setError('Please fill in all required fields (Patient, Report Type, and Findings)');
      setSubmitting(false);
      return;
    }

    try {
      const reportData = {
        patientId: formData.patientId,
        patientName: formData.patientName,
        reportType: formData.reportType,
        reportDate: new Date().toISOString(), // Add report date
        findings: formData.findings,
        diagnosis: formData.diagnosis || 'Pending diagnosis',
        recommendations: formData.recommendations || 'Pending recommendations',
        status: formData.status === 'in progress' ? 'in-progress' : formData.status, // Fix status enum
        priority: formData.priority === 'normal' ? 'medium' : formData.priority, // Fix priority enum
        notes: formData.notes || '',
        doctorName: formData.doctorName || 'Dr. Demo User',
        doctorId: 'default-doctor-id' // Will be overridden by session in API if available
      };

      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData),
      });

      const responseData = await response.json();

      if (response.ok) {
        setSuccess('Report created successfully!');
        // Reset form
        setFormData({
          patientId: '',
          patientName: '',
          reportType: '',
          findings: '',
          diagnosis: '',
          recommendations: '',
          status: 'pending',
          priority: 'medium',
          notes: '',
          attachments: [],
          doctorName: '',
          department: ''
        });
        setActiveSection('patient');
      } else {
        // Show detailed error message
        const errorMessage = responseData.message || responseData.error || 'Failed to create report';
        const errorDetails = responseData.details ? ` Details: ${responseData.details.join(', ')}` : '';
        setError(errorMessage + errorDetails);
        console.error('Report creation error:', responseData);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Error creating report:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const sections = [
    { id: 'patient', label: 'Patient Info', icon: User },
    { id: 'report', label: 'Report Details', icon: FileText },
    { id: 'additional', label: 'Additional Info', icon: Stethoscope }
  ];

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
          title="Create New Report" 
          description="Add a new medical report to the system." dense>
          <div className="flex h-48 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-blue-600" />
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout 
        title="Create New Report" 
        description="Add a new medical report to the system." dense>
        <div className="mx-auto max-w-4xl space-y-3">
          {/* Header */}
          <div className="mb-1">
            <Link 
              href="/reports"
              className="mb-2 inline-flex items-center text-xs text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Back to Reports
            </Link>
            <h1 className="text-lg font-semibold text-gray-900">Create New Report</h1>
          </div>

          {/* Progress Steps */}
          <div className="mb-1">
            <div className="flex flex-wrap items-center gap-2">
              {sections.map((section, index) => (
                <div key={section.id} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                      activeSection === section.id
                        ? 'border-blue-300 bg-blue-50 text-blue-700'
                        : 'border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                    }`}
                  >
                    <section.icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{section.label}</span>
                  </button>
                  {index < sections.length - 1 && (
                    <div className="mx-1.5 hidden h-px w-6 bg-gray-200 sm:block" />
                  )}
                </div>
              ))}
            </div>
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Patient Information Section */}
            {activeSection === 'patient' && (
              <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">Patient Information</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="patientId" className="mb-1 block text-xs font-medium text-gray-700">
                      Select Patient *
                    </label>
                    <select
                      id="patientId"
                      name="patientId"
                      value={formData.patientId}
                      onChange={handlePatientChange}
                      required
                      className="h-8 w-full rounded-md border border-gray-300 px-2 py-0 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Choose a patient</option>
                      {patients.map((patient) => (
                        <option key={patient._id} value={patient._id}>
                          {patient.name} ({patient.patientId || patient._id}) - {patient.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="patientName" className="mb-1 block text-xs font-medium text-gray-700">
                      Patient Name
                    </label>
                    <input
                      type="text"
                      id="patientName"
                      name="patientName"
                      value={formData.patientName}
                      readOnly
                      className="h-8 w-full rounded-md border border-gray-300 bg-gray-50 px-2 text-xs"
                    />
                  </div>
                </div>
                
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveSection('report')}
                    disabled={!formData.patientId}
                    className="h-9 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next: Report Details
                  </button>
                </div>
              </div>
            )}

            {/* Report Details Section */}
            {activeSection === 'report' && (
              <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">Report Details</h3>
                <div className="space-y-4">
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
                        Status
                      </label>
                      <select
                        id="status"
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        className="h-9 w-full rounded-md border border-gray-300 px-3 py-0 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="pending">Pending</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="reviewed">Reviewed</option>
                      </select>
                    </div>
                  </div>

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
                </div>
                
                <div className="mt-4 flex justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveSection('patient')}
                    className="h-9 rounded-md border border-gray-300 px-4 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSection('additional')}
                    disabled={!formData.reportType || !formData.findings}
                    className="h-9 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next: Additional Info
                  </button>
                </div>
              </div>
            )}

            {/* Additional Information Section */}
            {activeSection === 'additional' && (
              <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">Additional Information</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
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

                  <div>
                    <label htmlFor="attachments" className="mb-1 block text-xs font-medium text-gray-700">
                      Attachments
                    </label>
                    <input
                      type="file"
                      id="attachments"
                      multiple
                      onChange={handleFileChange}
                      className="h-9 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-2 file:py-0.5 file:text-xs"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Supported formats: PDF, DOC, DOCX, JPG, PNG
                    </p>
                    
                    {formData.attachments.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {formData.attachments.map((file, index) => (
                          <div key={index} className="flex items-center justify-between rounded-md bg-gray-50 px-2 py-1.5">
                            <span className="text-xs text-gray-700">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => removeAttachment(index)}
                              className="text-xs text-red-600 hover:text-red-800"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-4 flex justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveSection('report')}
                    className="h-9 rounded-md border border-gray-300 px-4 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex h-9 items-center rounded-md bg-green-600 px-4 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <div className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-b-2 border-white" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Save className="mr-1.5 h-3.5 w-3.5" />
                        Create Report
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
