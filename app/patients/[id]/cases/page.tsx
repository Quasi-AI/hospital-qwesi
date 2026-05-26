'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  Filter,
  Search,
  Calendar,
  User,
  Brain,
  Stethoscope,
  Pill
} from 'lucide-react';
import ProtectedRoute from '../../../protected-route';
import SidebarLayout from '../../../components/sidebar-layout';

export default function PatientCasesPage() {
  const params = useParams();
  const router = useRouter();
  const [patient, setPatient] = useState<any>(null);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    console.log('=== CASES PAGE LOADED ===');
    console.log('Params:', params);
    console.log('Patient ID:', params.id);
    
    const fetchData = async () => {
      try {
        console.log('Fetching patient data...');
        // Fetch patient data
        const patientResponse = await fetch(`/api/patients/${params.id}`);
        if (patientResponse.ok) {
          const patientData = await patientResponse.json();
          console.log('Patient data:', patientData);
          setPatient(patientData);
        }

        console.log('Fetching workflows...');
        // Fetch workflows for this patient
        const workflowsResponse = await fetch(`/api/workflows?patientId=${params.id}`);
        if (workflowsResponse.ok) {
          const workflowsData = await workflowsResponse.json();
          console.log('Workflows data:', workflowsData);
          console.log('Individual workflows:', workflowsData.workflows);
          setWorkflows(workflowsData.workflows || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchData();
    }
  }, [params.id]);

  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = workflow.workflowType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workflow.currentStep?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workflow.status?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || workflow.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStepIcon = (step: string) => {
    switch (step) {
      case 'symptoms':
        return <User className="w-4 h-4" />;
      case 'analysis':
        return <Brain className="w-4 h-4" />;
      case 'diagnosis':
        return <Stethoscope className="w-4 h-4" />;
      case 'treatment':
        return <Pill className="w-4 h-4" />;
      case 'prescription':
        return <FileText className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStepLabel = (step: string) => {
    switch (step) {
      case 'symptoms':
        return 'Patient Input';
      case 'analysis':
        return 'AI Analysis';
      case 'diagnosis':
        return 'Doctor Diagnosis';
      case 'treatment':
        return 'Treatment Plan';
      case 'prescription':
        return 'Prescription';
      default:
        return step;
    }
  };

  const handleResumeWorkflow = (workflowId: string) => {
    // Navigate to treatment recommendations page with workflow ID
    window.location.href = `/ai-treatment-recommendations?workflowId=${workflowId}`;
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    if (confirm('Are you sure you want to delete this workflow?')) {
      try {
        console.log('Deleting workflow with ID:', workflowId);
        
        if (!workflowId) {
          console.error('No workflow ID provided');
          alert('Error: No workflow ID provided');
          return;
        }
        
        const url = `/api/workflows/${workflowId}`;
        console.log('Delete URL:', url);
        
        const response = await fetch(url, {
          method: 'DELETE'
        });
        
        console.log('Delete response status:', response.status);
        
        if (response.ok) {
          const result = await response.json();
          console.log('Delete result:', result);
          setWorkflows(workflows.filter(w => w.id !== workflowId));
          alert('Workflow deleted successfully');
        } else {
          const errorData = await response.json();
          console.error('Delete failed:', errorData);
          alert(`Failed to delete workflow: ${errorData.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error deleting workflow:', error);
        alert('Error deleting workflow');
      }
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <SidebarLayout 
          title="Patient Cases" 
          description="View patient workflows and cases"
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
          title="Patient Cases" 
          description="View patient workflows and cases"
          dense
        >
          <div className="py-8 text-center">
            <AlertTriangle className="mx-auto mb-2 h-12 w-12 text-red-400" />
            <h3 className="mb-1 text-sm font-semibold text-gray-900">Error</h3>
            <p className="text-xs text-gray-600 sm:text-sm">{error || 'Patient not found'}</p>
            <Link
              href="/patients"
              className="mt-4 inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Patients
            </Link>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout 
        title="Patient Cases" 
        description={`Workflows and cases for ${patient.name}`}
        dense
      >
        <div className="mx-auto max-w-6xl space-y-3">
          {/* Header */}
          <div className="mb-2">
            <Link 
              href="/patients"
              className="mb-1 inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Patients
            </Link>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-lg font-bold text-gray-900 sm:text-xl">Cases for {patient.name}</h1>
                <p className="text-xs text-gray-600 sm:text-sm">View and manage patient workflows and medical cases</p>
              </div>
              <Link
                href={`/ai-treatment-recommendations?patientId=${patient._id}`}
                className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-blue-600 px-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                <FileText className="h-4 w-4" />
                <span>New Case</span>
              </Link>
            </div>
          </div>

          {/* Filters */}
          <div className="rounded-lg border border-gray-100 bg-white p-2.5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    placeholder="Search workflows..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-9 w-full rounded-md border border-gray-300 py-0 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 rounded-md border border-gray-300 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>
          </div>

          {/* Workflows List */}
          <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
            {filteredWorkflows.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {filteredWorkflows.map((workflow) => (
                  <div key={workflow.id} className="p-3 hover:bg-gray-50 sm:p-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="flex items-center space-x-2">
                            {getStepIcon(workflow.currentStep)}
                            <span className="text-sm font-medium text-gray-900">
                              {getStepLabel(workflow.currentStep)}
                            </span>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(workflow.status)}`}>
                            {workflow.status}
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-2">
                          <div className="flex items-center space-x-4">
                            <span className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>Created: {new Date(workflow.createdAt).toLocaleDateString()}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>Updated: {new Date(workflow.updatedAt).toLocaleDateString()}</span>
                            </span>
                          </div>
                        </div>

                        {/* Workflow Progress */}
                        <div className="text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <span>Progress:</span>
                            <div className="flex space-x-1">
                              {['symptoms', 'analysis', 'diagnosis', 'treatment', 'prescription'].map((step, index) => (
                                <div
                                  key={step}
                                  className={`w-2 h-2 rounded-full ${
                                    workflow.currentStep === step || 
                                    (workflow.currentStep === 'completed' && index <= 4) ||
                                    (workflow.currentStep === 'treatment' && index <= 3) ||
                                    (workflow.currentStep === 'diagnosis' && index <= 2) ||
                                    (workflow.currentStep === 'analysis' && index <= 1)
                                      ? 'bg-blue-500' 
                                      : 'bg-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleResumeWorkflow(workflow.id)}
                          className="inline-flex items-center space-x-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Resume</span>
                        </button>
                        <button
                          onClick={() => {
                            console.log('Delete button clicked for workflow:', workflow);
                            console.log('Workflow ID:', workflow.id);
                            handleDeleteWorkflow(workflow.id);
                          }}
                          className="inline-flex items-center space-x-1 px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <FileText className="mx-auto mb-2 h-10 w-10 text-gray-400" />
                <h3 className="mb-1 text-sm font-semibold text-gray-900">No Cases Found</h3>
                <p className="mb-4 text-xs text-gray-600 sm:text-sm">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'No workflows match your search criteria.' 
                    : 'This patient has no medical cases or workflows yet.'}
                </p>
                <Link
                  href={`/ai-treatment-recommendations?patientId=${patient._id}`}
                  className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  <FileText className="h-4 w-4" />
                  <span>Create First Case</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
