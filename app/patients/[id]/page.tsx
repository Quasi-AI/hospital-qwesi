'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Edit, 
  Users, 
  Phone, 
  Mail, 
  Calendar,
  MapPin,
  Heart,
  User,
  Brain,
  Pill,
  Camera,
  Calendar as CalendarIcon,
  Shield,
  FileText,
  Clock,
  Eye,
  Trash2,
  Mic,
  CreditCard,
  FlaskConical,
  Radio,
  AlertCircle,
  ExternalLink,
  DollarSign,
  Plus,
  Receipt,
  FilePlus,
  Siren,
  Bed,
  Video,
  Truck
} from 'lucide-react';
import ProtectedRoute from '../../protected-route';
import SidebarLayout from '../../components/sidebar-layout';
import FormattedAIResult from '../../components/FormattedAIResult';
import { useFormatCurrency } from '../../hooks/useFormatCurrency';

export default function PatientViewPage() {
  const params = useParams();
  const router = useRouter();
  const { formatCurrency } = useFormatCurrency();
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiResults, setAiResults] = useState<any[]>([]);
  const [loadingAiResults, setLoadingAiResults] = useState(true);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'appointments' | 'billing' | 'lab-reports' | 'radiology' | 'treatment-plan' | 'prescription' | 'drug-interaction' | 'image-analysis' | 'appointment-optimizer' | 'risk-assessment' | 'voice-transcription'>('details');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [labTests, setLabTests] = useState<any[]>([]);
  const [loadingLabTests, setLoadingLabTests] = useState(true);
  const [radiologyStudies, setRadiologyStudies] = useState<any[]>([]);
  const [loadingRadiology, setLoadingRadiology] = useState(true);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [selectedSymptomAnalysis, setSelectedSymptomAnalysis] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [showSymptomModal, setShowSymptomModal] = useState(false);
  const [showTreatmentPlanModal, setShowTreatmentPlanModal] = useState(false);
  const [selectedTreatmentPlan, setSelectedTreatmentPlan] = useState<any>(null);
  const [selectedTreatmentPlanSymptom, setSelectedTreatmentPlanSymptom] = useState<any>(null);
  const [treatmentPlanModalTab, setTreatmentPlanModalTab] = useState<'symptoms' | 'treatment'>('symptoms');

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const response = await fetch(`/api/patients/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setPatient(data);
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

  // Fetch appointments for this patient
  useEffect(() => {
    const fetchAppointments = async () => {
      if (!params.id || !patient) return;
      
      try {
        setLoadingAppointments(true);
        const response = await fetch('/api/appointments');
        if (response.ok) {
          const data = await response.json();
          // Filter appointments for this patient by patientId or patientName
          const patientAppointments = data.filter((apt: any) => 
            apt.patientId === params.id || 
            apt.patientId === patient._id ||
            apt.patientName?.toLowerCase() === patient.name?.toLowerCase()
          );
          setAppointments(patientAppointments);
        }
      } catch (error) {
        console.error('Error fetching appointments:', error);
      } finally {
        setLoadingAppointments(false);
      }
    };

    if (params.id && patient) {
      fetchAppointments();
    }
  }, [params.id, patient]);

  // Fetch invoices for this patient
  useEffect(() => {
    const fetchInvoices = async () => {
      if (!params.id || !patient) return;
      
      try {
        setLoadingInvoices(true);
        // Try fetching by patientId (the custom patientId) or by MongoDB _id
        const response = await fetch(`/api/billing/invoices?patientId=${patient.patientId || params.id}`);
        if (response.ok) {
          const data = await response.json();
          setInvoices(data.invoices || []);
        }
      } catch (error) {
        console.error('Error fetching invoices:', error);
      } finally {
        setLoadingInvoices(false);
      }
    };

    if (params.id && patient) {
      fetchInvoices();
    }
  }, [params.id, patient]);

  // Fetch lab tests for this patient
  useEffect(() => {
    const fetchLabTests = async () => {
      if (!params.id) return;
      
      try {
        setLoadingLabTests(true);
        const response = await fetch(`/api/lab?patientId=${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setLabTests(data.labTests || []);
        }
      } catch (error) {
        console.error('Error fetching lab tests:', error);
      } finally {
        setLoadingLabTests(false);
      }
    };

    if (params.id) {
      fetchLabTests();
    }
  }, [params.id]);

  // Fetch radiology studies for this patient
  useEffect(() => {
    const fetchRadiologyStudies = async () => {
      if (!params.id) return;
      
      try {
        setLoadingRadiology(true);
        const response = await fetch(`/api/radiology?patientId=${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setRadiologyStudies(data || []);
        }
      } catch (error) {
        console.error('Error fetching radiology studies:', error);
      } finally {
        setLoadingRadiology(false);
      }
    };

    if (params.id) {
      fetchRadiologyStudies();
    }
  }, [params.id]);

  // Fetch AI results for this patient
  const fetchAIResults = async () => {
    if (!params.id) return;
    
    try {
      setLoadingAiResults(true);
      const patientId = String(params.id); // Ensure it's a string
      console.log('Fetching AI results for patient:', patientId, 'Type:', typeof patientId);
      
      // First, let's check what's in the database
      const debugResponse = await fetch(`/api/ai-results/debug?patientId=${patientId}`);
      if (debugResponse.ok) {
        const debugData = await debugResponse.json();
        console.log('=== DEBUG: All AI Results in DB ===');
        console.log('Total results:', debugData.total);
        console.log('Counts by type:', debugData.countsByType);
        console.log('All results:', debugData.allResults);
      }
      
      // Then fetch normally
      const response = await fetch(`/api/ai-results?patientId=${patientId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('AI results fetched:', data.results?.length || 0, 'results');
        console.log('Results:', data.results);
        setAiResults(data.results || []);
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch AI results:', errorData);
      }
    } catch (error) {
      console.error('Error fetching AI results:', error);
    } finally {
      setLoadingAiResults(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchAIResults();
    }
  }, [params.id]);

  // Delete AI result
  const handleDeleteResult = async (resultId: string, resultTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${resultTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/ai-results?id=${resultId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove from local state
        setAiResults(aiResults.filter(result => result._id !== resultId));
        alert('✅ AI result deleted successfully!');
        // Refresh the data to update counts
        await fetchAIResults();
      } else {
        const errorData = await response.json();
        alert(`❌ Failed to delete: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting AI result:', error);
      alert('❌ Error deleting AI result: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <SidebarLayout 
          title="Patient Details" 
          description="View patient information"
          dense
        >
          <div className="flex min-h-[280px] items-center justify-center">
            <div className="h-9 w-9 animate-spin rounded-full border-b-2 border-blue-600" />
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  if (error || !patient) {
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

  // Filter AI results by type
  const getAIResultsByType = (type: string) => {
    return aiResults.filter(result => result.type === type);
  };

  // Get status color for appointments
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Function to find related symptom analysis for a treatment plan
  const findRelatedSymptomAnalysis = (treatmentPlan: any) => {
    const symptomAnalyses = getAIResultsByType('symptom-analysis');
    if (symptomAnalyses.length === 0) return null;
    
    // Find the symptom analysis created before this treatment plan (closest one)
    const treatmentDate = new Date(treatmentPlan.createdAt);
    const relatedSymptoms = symptomAnalyses
      .filter((symptom: any) => new Date(symptom.createdAt) <= treatmentDate)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return relatedSymptoms.length > 0 ? relatedSymptoms[0] : null;
  };

  const tabs = [
    { id: 'details', label: 'Patient Details', icon: User },
    { id: 'appointments', label: 'Appointments', icon: Calendar, count: appointments.length },
    { id: 'billing', label: 'Billing & Invoices', icon: CreditCard, count: invoices.length },
    { id: 'lab-reports', label: 'Lab Reports', icon: FlaskConical, count: labTests.length },
    { id: 'radiology', label: 'Radiology', icon: Radio, count: radiologyStudies.length },
    { id: 'treatment-plan', label: 'Treatment Plans', icon: Pill, count: getAIResultsByType('treatment-plan').length },
    { id: 'prescription', label: 'Prescriptions', icon: FileText, count: getAIResultsByType('prescription').length },
    { id: 'drug-interaction', label: 'Drug Interactions', icon: Pill, count: getAIResultsByType('drug-interaction').length },
    { id: 'image-analysis', label: 'Image Analysis', icon: Camera, count: getAIResultsByType('image-analysis').length },
    { id: 'appointment-optimizer', label: 'Appointment Optimizer', icon: CalendarIcon, count: getAIResultsByType('appointment-optimizer').length },
    { id: 'risk-assessment', label: 'Risk Assessment', icon: Shield, count: getAIResultsByType('risk-assessment').length },
    { id: 'voice-transcription', label: 'Voice Transcriptions', icon: Mic, count: getAIResultsByType('voice-transcription').length },
  ];

  return (
    <ProtectedRoute>
      <SidebarLayout 
        title="Patient Details" 
        description="View and manage patient information"
        dense
      >
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-3">
            <Link 
              href="/patients"
              className="mb-2 inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Patients
            </Link>
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-bold text-gray-900 sm:text-xl">{patient.name}</h1>
              <Link
                href={`/patients/${patient._id}/edit`}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                <Edit className="h-4 w-4" />
                <span>Edit Patient</span>
              </Link>
            </div>

            {/* Quick create — stay in client context (prefills ?patientId= on each form) */}
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">
                Quick create for this patient
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Link
                  href={`/appointments/new?patientId=${patient._id}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50/80 sm:text-sm"
                >
                  <Plus className="h-4 w-4 text-blue-600 shrink-0" />
                  <Calendar className="h-4 w-4 text-blue-500 shrink-0" />
                  Appointment
                </Link>
                <Link
                  href={`/billing/invoices/new?patientId=${patient._id}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 shadow-sm transition-colors hover:bg-emerald-50/80 hover:border-emerald-300 sm:text-sm"
                >
                  <Plus className="h-4 w-4 text-emerald-600 shrink-0" />
                  <Receipt className="h-4 w-4 text-emerald-500 shrink-0" />
                  Invoice
                </Link>
                <Link
                  href={`/lab/new?patientId=${patient._id}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 shadow-sm transition-colors hover:bg-cyan-50/80 hover:border-cyan-300 sm:text-sm"
                >
                  <Plus className="h-4 w-4 text-cyan-600 shrink-0" />
                  <FlaskConical className="h-4 w-4 text-cyan-500 shrink-0" />
                  Lab order
                </Link>
                <Link
                  href={`/radiology/new?patientId=${patient._id}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 shadow-sm transition-colors hover:bg-indigo-50/80 hover:border-indigo-300 sm:text-sm"
                >
                  <Plus className="h-4 w-4 text-indigo-600 shrink-0" />
                  <Radio className="h-4 w-4 text-indigo-500 shrink-0" />
                  Radiology
                </Link>
                <Link
                  href={`/reports/new?patientId=${patient._id}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 shadow-sm transition-colors hover:bg-violet-50/80 hover:border-violet-300 sm:text-sm"
                >
                  <Plus className="h-4 w-4 text-violet-600 shrink-0" />
                  <FileText className="h-4 w-4 text-violet-500 shrink-0" />
                  Medical report
                </Link>
                <Link
                  href={`/documents/new?patientId=${patient._id}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 shadow-sm transition-colors hover:bg-amber-50/80 hover:border-amber-300 sm:text-sm"
                >
                  <Plus className="h-4 w-4 text-amber-600 shrink-0" />
                  <FilePlus className="h-4 w-4 text-amber-500 shrink-0" />
                  Document
                </Link>
                <Link
                  href={`/emergency/new?patientId=${patient._id}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 shadow-sm transition-colors hover:bg-red-50/80 hover:border-red-300 sm:text-sm"
                >
                  <Plus className="h-4 w-4 text-red-600 shrink-0" />
                  <Siren className="h-4 w-4 text-red-500 shrink-0" />
                  Emergency case
                </Link>
                <Link
                  href={`/inpatient/admissions/new?patientId=${patient._id}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 shadow-sm transition-colors hover:bg-purple-50/80 hover:border-purple-300 sm:text-sm"
                >
                  <Plus className="h-4 w-4 text-purple-600 shrink-0" />
                  <Bed className="h-4 w-4 text-purple-500 shrink-0" />
                  Admission
                </Link>
                <Link
                  href={`/telemedicine/sessions/new?patientId=${patient._id}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 shadow-sm transition-colors hover:bg-sky-50/80 hover:border-sky-300 sm:text-sm"
                >
                  <Plus className="h-4 w-4 text-sky-600 shrink-0" />
                  <Video className="h-4 w-4 text-sky-500 shrink-0" />
                  Telemedicine
                </Link>
                <Link
                  href={`/ambulance/bookings/new?patientId=${patient._id}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 shadow-sm transition-colors hover:bg-orange-50/80 hover:border-orange-300 sm:text-sm"
                >
                  <Plus className="h-4 w-4 text-orange-600 shrink-0" />
                  <Truck className="h-4 w-4 text-orange-500 shrink-0" />
                  Ambulance
                </Link>
              </div>
            </div>
          </div>

          {/* Main Content with Vertical Tabs */}
          <div className="flex gap-3">
            {/* Vertical Tab Navigation - Left Sidebar */}
            <div className="w-56 shrink-0">
              <div className="sticky top-3 rounded-lg border border-gray-100 bg-white shadow-sm">
                <nav className="p-1.5" aria-label="Tabs">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`mb-0.5 flex w-full items-center justify-between rounded-md px-2 py-2 text-xs font-medium transition-colors sm:text-sm ${
                          activeTab === tab.id
                            ? 'border-l-4 border-blue-600 bg-blue-50 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 shrink-0" />
                          <span>{tab.label}</span>
                        </div>
                        {tab.count !== undefined && tab.count > 0 && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            activeTab === tab.id
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            {tab.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* Tab Content - Right Side */}
            <div className="min-w-0 flex-1">
              <div className="rounded-lg border border-gray-100 bg-white shadow-sm">
            {/* Patient Details Tab */}
            {activeTab === 'details' && (
            <div className="p-3">
                <div className="space-y-3">
                  {/* Personal Information */}
                  <div>
                    <h2 className="mb-2 text-sm font-semibold text-gray-900">Personal Information</h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Full Name</p>
                      <p className="text-sm text-gray-900">{patient.name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Patient ID</p>
                      <p className="text-sm text-gray-900 font-mono">{patient.patientId || patient._id}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Email</p>
                      <p className="text-sm text-gray-900">{patient.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Phone</p>
                      <p className="text-sm text-gray-900">{patient.phone}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Date of Birth</p>
                      <p className="text-sm text-gray-900">
                        {patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : 'Not specified'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Address</p>
                      <p className="text-sm text-gray-900">{patient.address || 'Not specified'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Heart className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Blood Type</p>
                      <p className="text-sm text-gray-900">{patient.bloodType || 'Not specified'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Users className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Assigned Doctor</p>
                      <p className="text-sm text-gray-900">{patient.assignedDoctor || 'Not assigned'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Registration Date</p>
                      <p className="text-sm text-gray-900">
                        {patient.createdAt ? new Date(patient.createdAt).toLocaleDateString() : 'Not specified'}
                      </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          {patient.emergencyContact && (
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h2>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Name</p>
                    <p className="text-sm text-gray-900">{patient.emergencyContact.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Relationship</p>
                    <p className="text-sm text-gray-900">{patient.emergencyContact.relationship}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Phone</p>
                    <p className="text-sm text-gray-900">{patient.emergencyContact.phone}</p>
                </div>
              </div>
            </div>
          )}

          {/* Medical History */}
          {patient.medicalHistory && (
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">Medical History</h2>
                      <p className="text-sm text-gray-900">{patient.medicalHistory}</p>
                    </div>
                  )}

          {/* Patient-entered vitals */}
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900">Patient-entered Vitals</h2>
              {patient.vitalSigns?.length ? (
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                  {patient.vitalSigns.length} entries
                </span>
              ) : null}
            </div>
            {patient.vitalSigns?.length ? (
              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Date</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">BP</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Pulse</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Temp</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Resp.</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">SpO2</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {patient.vitalSigns
                      .slice()
                      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .slice(0, 10)
                      .map((vital: any, index: number) => (
                        <tr key={`${vital.timestamp}-${index}`} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                            {vital.timestamp ? new Date(vital.timestamp).toLocaleString() : 'N/A'}
                          </td>
                          <td className="px-3 py-2 text-gray-700">{vital.bloodPressure || '-'}</td>
                          <td className="px-3 py-2 text-gray-700">{vital.pulse ? `${vital.pulse} bpm` : '-'}</td>
                          <td className="px-3 py-2 text-gray-700">{vital.temperature ? `${vital.temperature} F` : '-'}</td>
                          <td className="px-3 py-2 text-gray-700">{vital.respiratoryRate ? `${vital.respiratoryRate}/min` : '-'}</td>
                          <td className="px-3 py-2 text-gray-700">{vital.oxygenSaturation ? `${vital.oxygenSaturation}%` : '-'}</td>
                          <td className="max-w-xs px-3 py-2 text-gray-600">{vital.notes || '-'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center">
                <Heart className="mx-auto h-8 w-8 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">No patient-entered vitals yet.</p>
              </div>
            )}
          </div>
                </div>
              </div>
            )}

            {/* Appointments Tab */}
            {activeTab === 'appointments' && (
              <div className="p-3">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Appointments</h2>
                {loadingAppointments ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : appointments.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">No appointments found for this patient</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {appointments.map((appointment) => (
                          <tr key={appointment._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {appointment.appointmentDate ? new Date(appointment.appointmentDate).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {appointment.appointmentTime || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {appointment.doctorName || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {appointment.appointmentType || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(appointment.status)}`}>
                                {appointment.status || 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <Link
                                href={`/appointments/${appointment._id}`}
                                className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                              >
                                <Eye className="h-4 w-4" />
                                <span>View</span>
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Billing Tab */}
            {activeTab === 'billing' && (
              <div className="p-3">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                    <CreditCard className="h-5 w-5" />
                    <span>Billing & Invoices</span>
                  </h2>
                  <Link
                    href="/billing"
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                  >
                    <span>View All</span>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
                {loadingInvoices ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : invoices.length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">No invoices found for this patient</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Summary Cards */}
                    <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-4 md:gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-5 w-5 text-blue-600" />
                          <span className="text-sm text-blue-600 font-medium">Total Billed</span>
                        </div>
                        <p className="mt-1 text-xl font-bold text-blue-900 sm:text-2xl">
                          {formatCurrency(invoices.reduce((sum, inv) => sum + (inv.total || 0), 0))}
                        </p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-5 w-5 text-green-600" />
                          <span className="text-sm text-green-600 font-medium">Paid</span>
                        </div>
                        <p className="mt-1 text-xl font-bold text-green-900 sm:text-2xl">
                          {formatCurrency(invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (inv.total || 0), 0))}
                        </p>
                      </div>
                      <div className="bg-yellow-50 rounded-lg p-4">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-5 w-5 text-yellow-600" />
                          <span className="text-sm text-yellow-600 font-medium">Pending</span>
                        </div>
                        <p className="mt-1 text-xl font-bold text-yellow-900 sm:text-2xl">
                          {formatCurrency(invoices.filter(inv => inv.status === 'pending').reduce((sum, inv) => sum + (inv.total || 0), 0))}
                        </p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-4">
                        <div className="flex items-center space-x-2">
                          <AlertCircle className="h-5 w-5 text-red-600" />
                          <span className="text-sm text-red-600 font-medium">Overdue</span>
                        </div>
                        <p className="mt-1 text-xl font-bold text-red-900 sm:text-2xl">
                          {invoices.filter(inv => inv.status === 'pending' && inv.dueDate && new Date(inv.dueDate) < new Date()).length}
                        </p>
                      </div>
                    </div>

                    {/* Invoices Table */}
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {invoices.map((invoice) => (
                            <tr key={invoice._id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{invoice.invoiceNumber}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {invoice.items?.length || 0} item(s)
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-semibold text-gray-900">{formatCurrency(Number(invoice.total) || 0)}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                                  invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  invoice.status === 'partial' ? 'bg-blue-100 text-blue-800' :
                                  invoice.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {invoice.status?.charAt(0).toUpperCase() + invoice.status?.slice(1) || 'N/A'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <Link
                                  href={`/billing/invoices/${invoice._id}`}
                                  className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                                >
                                  <Eye className="h-4 w-4" />
                                  <span>View</span>
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
            )}

            {/* Lab Reports Tab */}
            {activeTab === 'lab-reports' && (
              <div className="p-3">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                    <FlaskConical className="h-5 w-5" />
                    <span>Lab Reports</span>
                  </h2>
                  <Link
                    href="/lab"
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                  >
                    <span>View All</span>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
                {loadingLabTests ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : labTests.length === 0 ? (
                  <div className="text-center py-8">
                    <FlaskConical className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">No lab reports found for this patient</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test #</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {labTests.map((test) => (
                          <tr key={test._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                {test.isCritical && (
                                  <AlertCircle className="h-4 w-4 text-red-500" />
                                )}
                                <span className="text-sm font-medium text-gray-900">{test.testNumber}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {test.testType}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                                {test.testCategory?.charAt(0).toUpperCase() + test.testCategory?.slice(1) || 'Other'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {test.doctorName || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {test.createdAt ? new Date(test.createdAt).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                test.priority === 'stat' ? 'bg-red-100 text-red-800' :
                                test.priority === 'urgent' ? 'bg-orange-100 text-orange-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {test.priority?.toUpperCase() || 'ROUTINE'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                test.status === 'completed' ? 'bg-green-100 text-green-800' :
                                test.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                                test.status === 'sample-collected' ? 'bg-yellow-100 text-yellow-800' :
                                test.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {test.status?.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Pending'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <Link
                                href={`/lab/${test._id}`}
                                className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                              >
                                <Eye className="h-4 w-4" />
                                <span>View</span>
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Radiology Tab */}
            {activeTab === 'radiology' && (
              <div className="p-3">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                    <Radio className="h-5 w-5" />
                    <span>Radiology Studies</span>
                  </h2>
                  <Link
                    href="/radiology"
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                  >
                    <span>View All</span>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
                {loadingRadiology ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : radiologyStudies.length === 0 ? (
                  <div className="text-center py-8">
                    <Radio className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">No radiology studies found for this patient</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Study #</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Body Part</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Radiologist</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {radiologyStudies.map((study) => (
                          <tr key={study._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                {study.isCritical && (
                                  <AlertCircle className="h-4 w-4 text-red-500" />
                                )}
                                <span className="text-sm font-medium text-gray-900">{study.studyNumber}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                                {study.studyType?.toUpperCase().replace('-', ' ') || 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {study.bodyPart || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {study.radiologistName || 'Not assigned'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {study.performedDate ? new Date(study.performedDate).toLocaleDateString() : 
                               study.createdAt ? new Date(study.createdAt).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                study.priority === 'stat' ? 'bg-red-100 text-red-800' :
                                study.priority === 'urgent' ? 'bg-orange-100 text-orange-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {study.priority?.toUpperCase() || 'ROUTINE'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                study.status === 'verified' ? 'bg-green-100 text-green-800' :
                                study.status === 'reported' ? 'bg-teal-100 text-teal-800' :
                                study.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                study.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                                study.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {study.status?.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Ordered'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <Link
                                href={`/radiology/${study._id}`}
                                className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                              >
                                <Eye className="h-4 w-4" />
                                <span>View</span>
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Treatment Plans Tab - Shows both symptoms and treatments */}
            {activeTab === 'treatment-plan' && (
              <div className="p-3">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Pill className="h-5 w-5" />
                  <span>Treatment Plans</span>
                </h2>
                {loadingAiResults ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : getAIResultsByType('treatment-plan').length === 0 ? (
                  <div className="text-center py-8">
                    <Brain className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">No treatment plans available for this patient</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AI Model</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {getAIResultsByType('treatment-plan').map((result) => {
                          const relatedSymptom = findRelatedSymptomAnalysis(result);
                          return (
                            <tr key={result._id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-2">
                                  <div className="p-2 rounded-lg bg-blue-100 text-blue-800">
                                    <Pill className="h-5 w-5" />
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">{result.title}</div>
                                    {result.metadata && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        {result.metadata.diagnosis && (
                                          <span className="mr-2">Diagnosis: {result.metadata.diagnosis}</span>
                                        )}
                                        {result.metadata.symptoms && result.metadata.symptoms.length > 0 && (
                                          <span>Symptoms: {result.metadata.symptoms.length}</span>
                                        )}
                                      </div>
                                    )}
                                    {relatedSymptom && (
                                      <div className="text-xs text-indigo-600 mt-1 flex items-center space-x-1">
                                        <Brain className="h-3 w-3" />
                                        <span>Linked to symptom analysis</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {result.aiModel?.name || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <div className="flex items-center space-x-1">
                                  <Clock className="h-3 w-3 text-gray-400" />
                                  <span>{new Date(result.createdAt).toLocaleDateString()}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => {
                                      setSelectedTreatmentPlan(result);
                                      setSelectedTreatmentPlanSymptom(relatedSymptom || null);
                                      // Default to symptoms tab if available, otherwise treatment
                                      setTreatmentPlanModalTab(relatedSymptom ? 'symptoms' : 'treatment');
                                      setShowTreatmentPlanModal(true);
                                    }}
                                    className="text-blue-600 hover:text-blue-900 flex items-center space-x-1 px-2 py-1 border border-blue-300 rounded hover:bg-blue-50"
                                    title="View Treatment Plan"
                                  >
                                    <Eye className="h-4 w-4" />
                                    <span className="text-xs">View</span>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteResult(result._id, result.title)}
                                    className="text-red-600 hover:text-red-900 flex items-center space-x-1 px-2 py-1 border border-red-300 rounded hover:bg-red-50"
                                    title="Delete Treatment Plan"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="text-xs">Delete</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Prescription Tab */}
            {activeTab === 'prescription' && (
              <div className="p-3">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Prescriptions</span>
                </h2>
                {loadingAiResults ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : getAIResultsByType('prescription').length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">No prescriptions available for this patient</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AI Model</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {getAIResultsByType('prescription').map((result) => (
                          <tr key={result._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <div className="p-2 rounded-lg bg-teal-100 text-teal-800">
                                  <FileText className="h-5 w-5" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{result.title}</div>
                                  {result.metadata && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      {result.metadata.diagnosis && (
                                        <span className="mr-2">Diagnosis: {result.metadata.diagnosis}</span>
                                      )}
                                      {result.metadata.medications && result.metadata.medications.length > 0 && (
                                        <span>Medications: {result.metadata.medications.length}</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {result.aiModel?.name || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3 text-gray-400" />
                                <span>{new Date(result.createdAt).toLocaleDateString()}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => {
                                    setSelectedResult(result);
                                    setShowModal(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                                >
                                  <Eye className="h-4 w-4" />
                                  <span>View</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteResult(result._id, result.title)}
                                  className="text-red-600 hover:text-red-900 flex items-center space-x-1"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Other AI Analysis Tabs */}
            {['drug-interaction', 'image-analysis', 'appointment-optimizer', 'risk-assessment', 'voice-transcription'].includes(activeTab) && (
              <div className="p-3">
                {(() => {
                  const typeResults = getAIResultsByType(activeTab);
                  const getTypeLabel = () => {
                    switch (activeTab) {
                      case 'prescription': return 'Prescriptions';
                      case 'drug-interaction': return 'Drug Interactions';
                      case 'image-analysis': return 'Image Analysis';
                      case 'appointment-optimizer': return 'Appointment Optimizer';
                      case 'risk-assessment': return 'Risk Assessment';
                      case 'voice-transcription': return 'Voice Transcriptions';
                      default: return 'AI Analysis';
                    }
                  };

                  const getTypeIcon = () => {
                    switch (activeTab) {
                      case 'prescription': return <FileText className="h-5 w-5" />;
                      case 'drug-interaction': return <Pill className="h-5 w-5" />;
                      case 'image-analysis': return <Camera className="h-5 w-5" />;
                      case 'appointment-optimizer': return <CalendarIcon className="h-5 w-5" />;
                      case 'risk-assessment': return <Shield className="h-5 w-5" />;
                      case 'voice-transcription': return <Mic className="h-5 w-5" />;
                      default: return <Brain className="h-5 w-5" />;
                    }
                  };

                  const getTypeColor = () => {
                    switch (activeTab) {
                      case 'prescription': return 'bg-teal-100 text-teal-800';
                      case 'drug-interaction': return 'bg-red-100 text-red-800';
                      case 'image-analysis': return 'bg-purple-100 text-purple-800';
                      case 'appointment-optimizer': return 'bg-green-100 text-green-800';
                      case 'risk-assessment': return 'bg-orange-100 text-orange-800';
                      case 'voice-transcription': return 'bg-violet-100 text-violet-800';
                      default: return 'bg-gray-100 text-gray-800';
                    }
                  };

                  return (
                    <>
                      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                        {getTypeIcon()}
                        <span>{getTypeLabel()}</span>
                      </h2>
                      {loadingAiResults ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                      ) : typeResults.length === 0 ? (
                        <div className="text-center py-8">
                          <Brain className="mx-auto h-12 w-12 text-gray-400" />
                          <p className="mt-2 text-sm text-gray-500">No {getTypeLabel().toLowerCase()} available for this patient</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AI Model</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {typeResults.map((result) => (
                                <tr key={result._id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center space-x-2">
                                      <div className={`p-2 rounded-lg ${getTypeColor()}`}>
                                        {getTypeIcon()}
                                      </div>
                                      <div>
                                        {activeTab === 'image-analysis' ? (
                                          <div className="text-sm font-medium text-gray-900">
                                            {result.metadata?.imageType || 'Medical Image Analysis'}
                                          </div>
                                        ) : (
                                          <>
                                            <div className="text-sm font-medium text-gray-900">{result.title}</div>
                                            {result.metadata && (
                                              <div className="text-xs text-gray-500 mt-1">
                                                {result.metadata.diagnosis && (
                                                  <span className="mr-2">Diagnosis: {result.metadata.diagnosis}</span>
                                                )}
                                                {result.metadata.symptoms && result.metadata.symptoms.length > 0 && (
                                                  <span>Symptoms: {result.metadata.symptoms.length}</span>
                                                )}
                                              </div>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {result.aiModel?.name || 'N/A'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <div className="flex items-center space-x-1">
                                      <Clock className="h-3 w-3 text-gray-400" />
                                      <span>{new Date(result.createdAt).toLocaleDateString()}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <div className="flex items-center space-x-2">
                                      <button
                                        onClick={() => {
                                          setSelectedResult(result);
                                          setShowModal(true);
                                        }}
                                        className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                                      >
                                        <Eye className="h-4 w-4" />
                                        <span>View</span>
                                      </button>
                                      <button
                                        onClick={() => handleDeleteResult(result._id, result.title)}
                                        className="text-red-600 hover:text-red-900 flex items-center space-x-1"
                                        title="Delete"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        <span>Delete</span>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
              </div>
            </div>
          </div>
        </div>

        {/* Treatment Plan Modal */}
        {showModal && selectedResult && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={() => setShowModal(false)}>
            <div className={`relative top-20 mx-auto p-5 border shadow-lg rounded-md bg-white ${selectedResult.type === 'image-analysis' ? 'w-11/12 md:w-4/5 lg:w-3/4' : 'w-11/12 md:w-3/4 lg:w-1/2'}`} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  {selectedResult.type === 'image-analysis' ? (
                    <Camera className="h-5 w-5 text-purple-600" />
                  ) : selectedResult.type === 'voice-transcription' ? (
                    <Mic className="h-5 w-5 text-violet-600" />
                  ) : (
                    <Pill className="h-5 w-5 text-blue-600" />
                  )}
                  <span>{selectedResult.type === 'image-analysis' ? (selectedResult.metadata?.imageType || 'Medical Image Analysis') : selectedResult.title}</span>
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>
              <div className="mb-4 flex items-center space-x-4 text-sm text-gray-600">
                {selectedResult.aiModel && (
                  <span>AI Model: {selectedResult.aiModel.name}</span>
                )}
                <span className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{new Date(selectedResult.createdAt).toLocaleString()}</span>
                </span>
              </div>
              <div className={`bg-gray-50 rounded-lg p-6 ${selectedResult.type === 'image-analysis' ? 'max-h-[80vh]' : 'max-h-[600px]'} overflow-y-auto`}>
                {selectedResult.type === 'image-analysis' && selectedResult.rawData?.imageUrl && (
                  <div className="mb-6 flex justify-center bg-white p-4 rounded-lg shadow-inner">
                    <img 
                      src={selectedResult.rawData.imageUrl} 
                      alt="Medical Image" 
                      className="max-w-full h-auto rounded-lg shadow-lg"
                      style={{ maxHeight: '70vh', width: 'auto' }}
                    />
                  </div>
                )}
                <FormattedAIResult 
                  content={selectedResult.content} 
                  type={selectedResult.type}
                />
              </div>
              {selectedResult.metadata && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedResult.metadata.symptoms && selectedResult.metadata.symptoms.length > 0 && (
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                      Symptoms: {selectedResult.metadata.symptoms.join(', ')}
                    </span>
                  )}
                  {selectedResult.metadata.diagnosis && (
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">
                      Diagnosis: {selectedResult.metadata.diagnosis}
                    </span>
                  )}
                  {selectedResult.metadata.medications && selectedResult.metadata.medications.length > 0 && (
                    <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded">
                      Medications: {selectedResult.metadata.medications.length}
                    </span>
                  )}
                  {selectedResult.metadata.riskFactors && selectedResult.metadata.riskFactors.length > 0 && (
                    <span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded">
                      Risk Factors: {selectedResult.metadata.riskFactors.length}
                    </span>
                  )}
                </div>
              )}
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowModal(false)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Treatment Plan Modal with Tabs */}
        {showTreatmentPlanModal && selectedTreatmentPlan && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={() => setShowTreatmentPlanModal(false)}>
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <Pill className="h-5 w-5 text-blue-600" />
                  <span>{selectedTreatmentPlan.title}</span>
                </h3>
                <button
                  onClick={() => setShowTreatmentPlanModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>
              <div className="mb-4 flex items-center space-x-4 text-sm text-gray-600">
                {selectedTreatmentPlan.aiModel && (
                  <span>AI Model: {selectedTreatmentPlan.aiModel.name}</span>
                )}
                <span className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{new Date(selectedTreatmentPlan.createdAt).toLocaleString()}</span>
                </span>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200 mb-4">
                <nav className="flex space-x-8" aria-label="Tabs">
                  {selectedTreatmentPlanSymptom && (
                    <button
                      onClick={() => setTreatmentPlanModalTab('symptoms')}
                      className={`py-3 px-1 border-b-2 font-medium text-sm ${
                        treatmentPlanModalTab === 'symptoms'
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <Brain className="h-4 w-4" />
                        <span>Symptoms</span>
                      </div>
                    </button>
                  )}
                  <button
                    onClick={() => setTreatmentPlanModalTab('treatment')}
                    className={`py-3 px-1 border-b-2 font-medium text-sm ${
                      treatmentPlanModalTab === 'treatment'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Pill className="h-4 w-4" />
                      <span>Treatment</span>
                    </div>
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="bg-gray-50 rounded-lg p-6 max-h-[600px] overflow-y-auto">
                {treatmentPlanModalTab === 'symptoms' && selectedTreatmentPlanSymptom ? (
                  <div>
                    <div className="mb-4 flex items-center space-x-2">
                      <Brain className="h-5 w-5 text-indigo-600" />
                      <h4 className="text-md font-semibold text-gray-900">{selectedTreatmentPlanSymptom.title}</h4>
                    </div>
                    <div className="mb-4 flex items-center space-x-4 text-sm text-gray-600">
                      {selectedTreatmentPlanSymptom.aiModel && (
                        <span>AI Model: {selectedTreatmentPlanSymptom.aiModel.name}</span>
                      )}
                      <span className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{new Date(selectedTreatmentPlanSymptom.createdAt).toLocaleString()}</span>
                      </span>
                    </div>
                    <FormattedAIResult 
                      content={selectedTreatmentPlanSymptom.content} 
                      type={selectedTreatmentPlanSymptom.type}
                    />
                    {selectedTreatmentPlanSymptom.metadata && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {selectedTreatmentPlanSymptom.metadata.symptoms && selectedTreatmentPlanSymptom.metadata.symptoms.length > 0 && (
                          <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded">
                            Symptoms: {selectedTreatmentPlanSymptom.metadata.symptoms.join(', ')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <FormattedAIResult 
                      content={selectedTreatmentPlan.content} 
                      type={selectedTreatmentPlan.type}
                    />
                    {selectedTreatmentPlan.metadata && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {selectedTreatmentPlan.metadata.symptoms && selectedTreatmentPlan.metadata.symptoms.length > 0 && (
                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                            Symptoms: {selectedTreatmentPlan.metadata.symptoms.join(', ')}
                          </span>
                        )}
                        {selectedTreatmentPlan.metadata.diagnosis && (
                          <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">
                            Diagnosis: {selectedTreatmentPlan.metadata.diagnosis}
                          </span>
                        )}
                        {selectedTreatmentPlan.metadata.medications && selectedTreatmentPlan.metadata.medications.length > 0 && (
                          <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded">
                            Medications: {selectedTreatmentPlan.metadata.medications.length}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowTreatmentPlanModal(false)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Symptom Analysis Modal */}
        {showSymptomModal && selectedSymptomAnalysis && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={() => setShowSymptomModal(false)}>
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <Brain className="h-5 w-5 text-indigo-600" />
                  <span>{selectedSymptomAnalysis.title}</span>
                </h3>
                <button
                  onClick={() => setShowSymptomModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>
              <div className="mb-4 flex items-center space-x-4 text-sm text-gray-600">
                {selectedSymptomAnalysis.aiModel && (
                  <span>AI Model: {selectedSymptomAnalysis.aiModel.name}</span>
                )}
                <span className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{new Date(selectedSymptomAnalysis.createdAt).toLocaleString()}</span>
                </span>
              </div>
              <div className="bg-gray-50 rounded-lg p-6 max-h-[600px] overflow-y-auto">
                <FormattedAIResult 
                  content={selectedSymptomAnalysis.content} 
                  type={selectedSymptomAnalysis.type}
                />
              </div>
              {selectedSymptomAnalysis.metadata && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedSymptomAnalysis.metadata.symptoms && selectedSymptomAnalysis.metadata.symptoms.length > 0 && (
                    <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded">
                      Symptoms: {selectedSymptomAnalysis.metadata.symptoms.join(', ')}
                    </span>
                  )}
                </div>
              )}
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowSymptomModal(false)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </SidebarLayout>
    </ProtectedRoute>
  );
}
